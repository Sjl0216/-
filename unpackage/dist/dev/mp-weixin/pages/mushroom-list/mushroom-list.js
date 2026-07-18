"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_api = require("../../utils/api.js");
const _sfc_main = {
  data() {
    return {
      filterType: "all",
      // all, poisonous, safe
      page: 1,
      size: 50,
      allMushrooms: [],
      list: [],
      noMore: false,
      isLoading: false,
      isRefreshing: false,
      defaultImg: "https://img.yzcdn.cn/vant/cat.jpeg"
    };
  },
  onLoad() {
    this.fetchAllData();
  },
  onReachBottom() {
    this.loadMore();
  },
  onPullDownRefresh() {
    this.onRefresh();
  },
  methods: {
    // 过滤
    applyFilter(list) {
      if (this.filterType === "poisonous")
        return list.filter((x) => x.isPoisonous === 1);
      if (this.filterType === "safe")
        return list.filter((x) => x.isPoisonous === 0 || x.isPoisonous === 2);
      return list;
    },
    // 切换筛选
    changeFilter(type) {
      this.filterType = type;
      this.page = 1;
      this.list = [];
      this.noMore = false;
      this.loadPagedData();
    },
    // 核心方法：一次性加载全量数据
    async fetchAllData() {
      if (this.isLoading)
        return;
      this.isLoading = true;
      try {
        common_vendor.index.__f__("log", "at pages/mushroom-list/mushroom-list.vue:142", "开始加载菌类全量数据...");
        const data = await utils_api.mushroomListAll({});
        common_vendor.index.__f__("log", "at pages/mushroom-list/mushroom-list.vue:146", "后端返回数据:", data);
        let mushroomList = [];
        if (data.code === 0 && data.data) {
          mushroomList = Array.isArray(data.data) ? data.data : [];
        } else if (Array.isArray(data)) {
          mushroomList = data;
        }
        if (mushroomList.length > 0) {
          common_vendor.index.__f__("log", "at pages/mushroom-list/mushroom-list.vue:160", "第一条菌类数据:", mushroomList[0]);
        }
        this.allMushrooms = mushroomList;
        common_vendor.index.__f__("log", "at pages/mushroom-list/mushroom-list.vue:164", "全量数据加载完成，总数:", this.allMushrooms.length);
        this.page = 1;
        this.list = [];
        this.noMore = false;
        this.loadPagedData();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/mushroom-list/mushroom-list.vue:173", "加载失败:", error);
        common_vendor.index.showToast({
          title: error.message || "加载失败",
          icon: "none",
          duration: 2e3
        });
      } finally {
        this.isLoading = false;
        common_vendor.index.stopPullDownRefresh();
      }
    },
    // 分页加载：从全量数据中截取当前页
    loadPagedData() {
      if (this.noMore)
        return;
      common_vendor.index.__f__("log", "at pages/mushroom-list/mushroom-list.vue:189", `加载第 ${this.page} 页数据...`);
      const filteredData = this.applyFilter(this.allMushrooms);
      const startIndex = (this.page - 1) * this.size;
      const endIndex = this.page * this.size;
      const pageData = filteredData.slice(startIndex, endIndex);
      common_vendor.index.__f__("log", "at pages/mushroom-list/mushroom-list.vue:199", `过滤后总数: ${filteredData.length}, 当前页: ${startIndex}-${endIndex}, 当前页数据量: ${pageData.length}`);
      if (this.page === 1) {
        this.list = pageData;
      } else {
        this.list = [...this.list, ...pageData];
      }
      common_vendor.index.__f__("log", "at pages/mushroom-list/mushroom-list.vue:208", "页面列表更新完成，当前显示数量:", this.list.length);
      common_vendor.index.__f__("log", "at pages/mushroom-list/mushroom-list.vue:209", " 当前显示的数据示例:", this.list.slice(0, 3));
      if (endIndex >= filteredData.length) {
        this.noMore = true;
        common_vendor.index.__f__("log", "at pages/mushroom-list/mushroom-list.vue:214", "所有数据已加载完毕");
      } else {
        this.page++;
      }
    },
    // 加载更多（触底加载）
    loadMore() {
      if (!this.noMore && !this.isLoading) {
        this.loadPagedData();
      }
    },
    // 下拉刷新
    onRefresh() {
      this.isRefreshing = true;
      this.page = 1;
      this.list = [];
      this.allMushrooms = [];
      this.noMore = false;
      this.fetchAllData().finally(() => {
        this.isRefreshing = false;
      });
    },
    // 跳转详情
    goDetail(mushroomId) {
      common_vendor.index.navigateTo({
        url: `/pages/mushroom-detail/mushroom-detail?mushroomId=${mushroomId}`
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.filterType === "all" ? 1 : "",
    b: common_vendor.o(($event) => $options.changeFilter("all")),
    c: $data.filterType === "poisonous" ? 1 : "",
    d: common_vendor.o(($event) => $options.changeFilter("poisonous")),
    e: $data.filterType === "safe" ? 1 : "",
    f: common_vendor.o(($event) => $options.changeFilter("safe")),
    g: common_vendor.f($data.list, (item, k0, i0) => {
      return common_vendor.e({
        a: item.standardImageUrl || $data.defaultImg,
        b: common_vendor.t(item.chineseName),
        c: item.mushroomId && item.mushroomId > 0 && item.chineseName !== "未知菌类"
      }, item.mushroomId && item.mushroomId > 0 && item.chineseName !== "未知菌类" ? {
        d: common_vendor.t(item.isPoisonous === 1 ? "有毒" : "无毒"),
        e: common_vendor.n(item.isPoisonous === 1 ? "poison-tag" : "safe-tag")
      } : {}, {
        f: common_vendor.t(item.category || "-"),
        g: common_vendor.t(item.latinName || "-"),
        h: item.mushroomId,
        i: common_vendor.o(($event) => $options.goDetail(item.mushroomId), item.mushroomId)
      });
    }),
    h: $data.list.length > 0
  }, $data.list.length > 0 ? common_vendor.e({
    i: !$data.noMore && !$data.isLoading
  }, !$data.noMore && !$data.isLoading ? {
    j: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args))
  } : $data.isLoading ? {} : $data.noMore ? {} : {}, {
    k: $data.isLoading,
    l: $data.noMore
  }) : {}, {
    m: $data.list.length === 0 && !$data.isLoading
  }, $data.list.length === 0 && !$data.isLoading ? {} : {}, {
    n: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args)),
    o: $data.isRefreshing,
    p: common_vendor.o((...args) => $options.onRefresh && $options.onRefresh(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-77879c17"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/mushroom-list/mushroom-list.js.map
