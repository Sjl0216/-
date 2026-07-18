"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_api = require("../../utils/api.js");
const utils_auth = require("../../utils/auth.js");
const _sfc_main = {
  data() {
    return {
      userId: utils_auth.getUserIdOrDefault(),
      resultList: [],
      page: 1,
      size: 10,
      total: 0,
      // 总数据数
      isLoading: false,
      isRefreshing: false,
      noMore: false
    };
  },
  onLoad() {
    this.loadResultList();
  },
  methods: {
    // 加载反馈结果（显示所有反馈）
    async loadResultList() {
      if (this.isLoading || this.noMore)
        return;
      this.isLoading = true;
      try {
        const params = {
          userId: this.userId,
          // 不限制 status，显示所有反馈
          page: this.page,
          size: this.size
        };
        common_vendor.index.__f__("log", "at pages/feedback-result/feedback-result.vue:128", "加载反馈结果:", params);
        const response = await utils_api.feedbackList(params);
        common_vendor.index.__f__("log", "at pages/feedback-result/feedback-result.vue:132", "反馈结果响应:", response);
        let data = [];
        let total = 0;
        if (response.list && Array.isArray(response.list)) {
          data = response.list;
          total = response.total || 0;
          common_vendor.index.__f__("log", "at pages/feedback-result/feedback-result.vue:142", "解析分页格式，数据总数:", total, "当前页数据:", data.length);
        } else if (response.code === 0 && response.data) {
          if (response.data.list && Array.isArray(response.data.list)) {
            data = response.data.list;
            total = response.data.total || 0;
          } else if (Array.isArray(response.data)) {
            data = response.data;
            total = data.length;
          }
        } else if (Array.isArray(response)) {
          data = response;
          total = data.length;
        }
        this.total = total;
        if (this.page === 1) {
          this.resultList = data;
        } else {
          this.resultList = [...this.resultList, ...data];
        }
        if (this.resultList.length >= this.total) {
          this.noMore = true;
          common_vendor.index.__f__("log", "at pages/feedback-result/feedback-result.vue:173", " 没有更多数据了，已加载:", this.resultList.length, "/", this.total);
        } else {
          common_vendor.index.__f__("log", "at pages/feedback-result/feedback-result.vue:175", "还有更多数据，已加载:", this.resultList.length, "/", this.total);
        }
        common_vendor.index.__f__("log", "at pages/feedback-result/feedback-result.vue:178", "反馈结果加载完成，当前总数:", this.resultList.length);
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/feedback-result/feedback-result.vue:181", "加载反馈结果失败:", error);
        common_vendor.index.showToast({
          title: "加载失败",
          icon: "none"
        });
      } finally {
        this.isLoading = false;
        this.isRefreshing = false;
      }
    },
    // 下拉刷新
    onRefresh() {
      this.isRefreshing = true;
      this.page = 1;
      this.noMore = false;
      this.resultList = [];
      this.loadResultList();
    },
    // 加载更多
    loadMore() {
      if (!this.noMore && !this.isLoading) {
        this.page++;
        this.loadResultList();
      }
    },
    // 获取类型文本
    getTypeText(type) {
      const typeMap = {
        1: "识别错误",
        2: "图片问题",
        3: "系统问题",
        4: "其他"
      };
      return typeMap[type] || "未知";
    },
    // 获取类型样式类
    getTypeClass(type) {
      const classMap = {
        1: "type-error",
        2: "type-image",
        3: "type-bug",
        4: "type-other"
      };
      return classMap[type] || "type-other";
    },
    // 格式化时间
    formatTime(timeStr) {
      if (!timeStr)
        return "";
      try {
        let d;
        if (timeStr.includes("T")) {
          d = new Date(timeStr);
        } else {
          d = new Date(timeStr.replace(/-/g, "/"));
        }
        if (isNaN(d.getTime())) {
          return String(timeStr);
        }
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, "0");
        const day = d.getDate().toString().padStart(2, "0");
        const hour = d.getHours().toString().padStart(2, "0");
        const minute = d.getMinutes().toString().padStart(2, "0");
        return `${year}-${month}-${day} ${hour}:${minute}`;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/feedback-result/feedback-result.vue:259", "时间格式化失败:", timeStr, error);
        return String(timeStr);
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.f($data.resultList, (item, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t($options.getTypeText(item.feedbackType)),
        b: common_vendor.n($options.getTypeClass(item.feedbackType)),
        c: common_vendor.t(item.status === 0 ? "待处理" : "已回复"),
        d: common_vendor.n(item.status === 0 ? "status-pending" : "status-replied"),
        e: common_vendor.t(item.content),
        f: item.status === 0
      }, item.status === 0 ? {} : common_vendor.e({
        g: common_vendor.t(item.reply || "暂无回复内容"),
        h: item.handleTime
      }, item.handleTime ? {
        i: common_vendor.t($options.formatTime(item.handleTime))
      } : {}), {
        j: common_vendor.t($options.formatTime(item.createTime)),
        k: item.feedbackId
      });
    }),
    b: $data.resultList.length === 0 && !$data.isLoading
  }, $data.resultList.length === 0 && !$data.isLoading ? {} : {}, {
    c: $data.isLoading
  }, $data.isLoading ? {} : {}, {
    d: $data.noMore && $data.resultList.length > 0
  }, $data.noMore && $data.resultList.length > 0 ? {} : {}, {
    e: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args)),
    f: $data.isRefreshing,
    g: common_vendor.o((...args) => $options.onRefresh && $options.onRefresh(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-8f6e3676"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/feedback-result/feedback-result.js.map
