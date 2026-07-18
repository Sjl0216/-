"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_api = require("../../utils/api.js");
const utils_auth = require("../../utils/auth.js");
const utils_request = require("../../utils/request.js");
const _sfc_main = {
  data() {
    return {
      filterType: "all",
      // all, edible, poisonous, warning
      allRecords: [],
      // 全量数据（从后端一次性获取）
      recordList: [],
      // 当前显示的数据
      page: 1,
      size: 30,
      // 每次加载 30 条
      isLoading: false,
      isRefreshing: false,
      noMore: false,
      userId: utils_auth.getUserIdOrDefault(),
      // 从本地存储获取 userId
      networkStatus: null
      // 网络状态
    };
  },
  onLoad() {
    common_vendor.index.__f__("log", "at pages/record-list/record-list.vue:132", "记录页面 onLoad");
    this.loadRecordList();
  },
  onShow() {
    common_vendor.index.__f__("log", "at pages/record-list/record-list.vue:136", "记录页面 onShow - 刷新数据");
    this.page = 1;
    this.recordList = [];
    this.noMore = false;
    this.loadRecordList();
  },
  methods: {
    // 判断是否 http(s) 或本地微信文件
    isHttpUrl(url) {
      if (!url)
        return false;
      const sUrl = String(url);
      return sUrl.startsWith("http") || sUrl.startsWith("https") || sUrl.startsWith("wxfile://");
    },
    // 后端记录 -> 统一结构
    normalizeServerRecord(r) {
      let finalUrl = r.imageUrl;
      if (finalUrl && !this.isHttpUrl(finalUrl)) {
        finalUrl = utils_request.BASE_URL + finalUrl;
      }
      if (finalUrl && finalUrl.startsWith("http")) {
        finalUrl = finalUrl.replace(/ /g, "%20");
      }
      return {
        source: "server",
        recordId: r.recordId,
        rid: null,
        mushroomName: r.mushroomName || "未知",
        confidence: r.confidence,
        isPoisonous: r.isPoisonous,
        imageUrl: finalUrl,
        timeMs: r.recognizeTime ? new Date(r.recognizeTime.replace(/-/g, "/")).getTime() : Date.now()
      };
    },
    // 图片加载失败处理
    onImageError(item) {
      common_vendor.index.__f__("error", "at pages/record-list/record-list.vue:176", "图片加载失败:", item.imageUrl);
    },
    // pending 队列 -> 统一结构（未同步）
    normalizePendingRecord(p) {
      return {
        source: "local_pending",
        recordId: null,
        rid: p.localId,
        mushroomName: p.mushroomName || "识别中...",
        confidence: p.confidence,
        isPoisonous: p.isPoisonous,
        inferModel: 0,
        imageUrl: p.imagePath,
        // tempFilePath 可直接显示
        timeMs: p.createTime || Date.now()
      };
    },
    // 过滤
    applyFilter(list) {
      if (this.filterType === "edible")
        return list.filter((x) => x.isPoisonous === 0);
      if (this.filterType === "poisonous")
        return list.filter((x) => x.isPoisonous === 1);
      if (this.filterType === "warning")
        return list.filter((x) => x.isPoisonous === 2);
      return list;
    },
    // 切换筛选
    changeFilter(type) {
      this.filterType = type;
      this.page = 1;
      this.recordList = [];
      this.noMore = false;
      this.loadPagedRecords();
    },
    // 核心方法：加载全量数据（仅调用一次）
    async loadRecordList() {
      if (this.isLoading)
        return;
      this.isLoading = true;
      try {
        common_vendor.index.__f__("log", "at pages/record-list/record-list.vue:219", "开始加载全量数据...");
        let serverRecords = [];
        try {
          const resp = await utils_api.recordListAll({
            userId: this.userId
          });
          let serverList = [];
          if (resp.code === 0 && resp.data) {
            serverList = Array.isArray(resp.data) ? resp.data : [];
          } else if (Array.isArray(resp)) {
            serverList = resp;
          }
          serverRecords = serverList.map(this.normalizeServerRecord.bind(this));
          common_vendor.index.__f__("log", "at pages/record-list/record-list.vue:239", "服务器记录数量:", serverRecords.length);
        } catch (e) {
          common_vendor.index.__f__("warn", "at pages/record-list/record-list.vue:241", "服务器记录拉取失败:", e);
        }
        let localRecords = [];
        common_vendor.index.__f__("log", "at pages/record-list/record-list.vue:246", "--- 开始读取本地历史 ---");
        const historyKey = `mushroom_records_${this.userId}`;
        const history = common_vendor.index.getStorageSync(historyKey) || common_vendor.index.getStorageSync("records") || common_vendor.index.getStorageSync("mushroom_records") || [];
        common_vendor.index.__f__("log", "at pages/record-list/record-list.vue:250", "读取使用的 Key:", historyKey);
        common_vendor.index.__f__("log", "at pages/record-list/record-list.vue:251", "本地记录条数:", history.length);
        const historyNormalized = history.map((h) => ({
          source: "local_history",
          recordId: null,
          rid: h.rid || h.id || Date.now(),
          mushroomName: h.mushroomName || h.className || "本地识别",
          confidence: h.confidence || (h.score ? parseFloat(h.score) : 0),
          isPoisonous: h.isPoisonous,
          imageUrl: h.imageUrl,
          timeMs: h.createTime || h.recognizeTime || Date.now()
        }));
        const pendingKey = `pending_queue_${this.userId}`;
        const pending = common_vendor.index.getStorageSync(pendingKey) || [];
        const pendingNormalized = pending.map(this.normalizePendingRecord.bind(this));
        localRecords = [...pendingNormalized, ...historyNormalized];
        let merged = [...localRecords, ...serverRecords];
        common_vendor.index.__f__("log", "at pages/record-list/record-list.vue:272", "合并后记录总数:", merged.length);
        merged.sort((a, b) => (b.timeMs || 0) - (a.timeMs || 0));
        const seen = /* @__PURE__ */ new Set();
        this.allRecords = merged.filter((item) => {
          const id = item.recordId || item.rid;
          if (seen.has(id))
            return false;
          seen.add(id);
          return true;
        });
        common_vendor.index.__f__("log", "at pages/record-list/record-list.vue:286", "全量数据加载完成，总数:", this.allRecords.length);
        this.page = 1;
        this.loadPagedRecords();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/record-list/record-list.vue:293", "读取记录失败:", error);
      } finally {
        this.isLoading = false;
        this.isRefreshing = false;
      }
    },
    // 分页加载：从全量数据中截取当前页
    loadPagedRecords() {
      if (this.noMore)
        return;
      common_vendor.index.__f__("log", "at pages/record-list/record-list.vue:304", `加载第 ${this.page} 页数据...`);
      const filtered = this.applyFilter(this.allRecords);
      const startIndex = (this.page - 1) * this.size;
      const endIndex = this.page * this.size;
      const pageData = filtered.slice(startIndex, endIndex);
      common_vendor.index.__f__("log", "at pages/record-list/record-list.vue:314", `筛选后总数: ${filtered.length}, 当前页: ${startIndex}-${endIndex}, 当前页数据量: ${pageData.length}`);
      if (this.page === 1) {
        this.recordList = pageData;
      } else {
        this.recordList = [...this.recordList, ...pageData];
      }
      if (endIndex >= filtered.length) {
        this.noMore = true;
        common_vendor.index.__f__("log", "at pages/record-list/record-list.vue:326", "所有数据已加载完毕");
      } else {
        this.page++;
      }
    },
    // 下拉刷新
    onRefresh() {
      this.isRefreshing = true;
      this.page = 1;
      this.noMore = false;
      this.recordList = [];
      this.allRecords = [];
      this.loadRecordList();
    },
    // 加载更多（触底加载）
    loadMore() {
      if (!this.noMore && !this.isLoading) {
        this.loadPagedRecords();
      }
    },
    // 查看详情
    viewDetail(idOrRid) {
      if (!idOrRid)
        return;
      common_vendor.index.navigateTo({
        url: `/pages/record-detail/record-detail?recordId=${idOrRid}`
      });
    },
    // 格式化时间
    formatTime(timeMs) {
      if (!timeMs)
        return "";
      const d = new Date(timeMs);
      const now = /* @__PURE__ */ new Date();
      if (d.toDateString() === now.toDateString()) {
        return `今天 ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
      }
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, "0");
      const day = d.getDate().toString().padStart(2, "0");
      return `${year}-${month}-${day}`;
    },
    // 格式化置信度
    formatConfidence(confidence) {
      if (confidence === void 0 || confidence === null)
        return "0%";
      if (typeof confidence === "string") {
        if (confidence.includes("%"))
          return confidence;
        return parseFloat(confidence).toFixed(1) + "%";
      }
      return parseFloat(confidence).toFixed(1) + "%";
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.filterType === "all" ? 1 : "",
    b: common_vendor.o(($event) => $options.changeFilter("all")),
    c: $data.filterType === "edible" ? 1 : "",
    d: common_vendor.o(($event) => $options.changeFilter("edible")),
    e: $data.filterType === "poisonous" ? 1 : "",
    f: common_vendor.o(($event) => $options.changeFilter("poisonous")),
    g: $data.filterType === "warning" ? 1 : "",
    h: common_vendor.o(($event) => $options.changeFilter("warning")),
    i: common_vendor.f($data.recordList, (item, k0, i0) => {
      return common_vendor.e({
        a: item.imageUrl
      }, item.imageUrl ? {
        b: item.imageUrl,
        c: common_vendor.o(($event) => $options.onImageError(item), item.recordId || item.rid)
      } : {}, {
        d: common_vendor.t(item.mushroomName),
        e: item.isPoisonous === 1
      }, item.isPoisonous === 1 ? {} : item.isPoisonous === 2 ? {} : item.isPoisonous === 0 ? {} : {}, {
        f: item.isPoisonous === 2,
        g: item.isPoisonous === 0,
        h: common_vendor.t($options.formatConfidence(item.confidence)),
        i: item.source === "local_history"
      }, item.source === "local_history" ? {} : {}, {
        j: common_vendor.t($options.formatTime(item.timeMs)),
        k: item.recordId || item.rid,
        l: common_vendor.o(($event) => $options.viewDetail(item.recordId || item.rid), item.recordId || item.rid)
      });
    }),
    j: $data.recordList.length > 0
  }, $data.recordList.length > 0 ? common_vendor.e({
    k: $data.isLoading
  }, $data.isLoading ? {} : $data.noMore ? {} : {}, {
    l: $data.noMore
  }) : {}, {
    m: $data.recordList.length === 0 && !$data.isLoading
  }, $data.recordList.length === 0 && !$data.isLoading ? {} : {}, {
    n: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args)),
    o: $data.isRefreshing,
    p: common_vendor.o((...args) => $options.onRefresh && $options.onRefresh(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-9eb3f798"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/record-list/record-list.js.map
