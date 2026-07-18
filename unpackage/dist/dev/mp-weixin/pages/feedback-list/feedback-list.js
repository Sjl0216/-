"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_api = require("../../utils/api.js");
const utils_auth = require("../../utils/auth.js");
const _sfc_main = {
  data() {
    return {
      userId: utils_auth.getUserIdOrDefault(),
      filterStatus: "all",
      // all, pending, replied
      feedbackList: [],
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
    this.loadFeedbackList();
  },
  methods: {
    // 加载用户反馈列表（支持分页、筛选和下拉加载更多）
    // 核心逻辑：防并发请求 + 多响应格式兼容 + 分页数据合并
    async loadFeedbackList() {
      if (this.isLoading || this.noMore)
        return;
      this.isLoading = true;
      try {
        const params = {
          userId: this.userId,
          // 当前登录用户 ID，用于过滤个人反馈
          page: this.page,
          // 当前页码（从 1 开始）
          size: this.size
          // 每页条数（默认 10 条）
        };
        if (this.filterStatus === "pending") {
          params.status = 0;
        } else if (this.filterStatus === "replied") {
          params.status = 1;
        }
        common_vendor.index.__f__("log", "at pages/feedback-list/feedback-list.vue:157", "加载反馈列表:", params);
        const response = await utils_api.feedbackList(params);
        common_vendor.index.__f__("log", "at pages/feedback-list/feedback-list.vue:163", "反馈列表响应:", response);
        let data = [];
        let total = 0;
        if (response.list && Array.isArray(response.list)) {
          data = response.list;
          total = response.total || 0;
          common_vendor.index.__f__("log", "at pages/feedback-list/feedback-list.vue:174", "解析分页格式，数据总数:", total, "当前页数据:", data.length);
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
          this.feedbackList = data;
        } else {
          this.feedbackList = [...this.feedbackList, ...data];
        }
        if (this.feedbackList.length >= this.total) {
          this.noMore = true;
          common_vendor.index.__f__("log", "at pages/feedback-list/feedback-list.vue:215", "没有更多数据了，已加载:", this.feedbackList.length, "/", this.total);
        } else {
          common_vendor.index.__f__("log", "at pages/feedback-list/feedback-list.vue:217", "还有更多数据，已加载:", this.feedbackList.length, "/", this.total);
        }
        common_vendor.index.__f__("log", "at pages/feedback-list/feedback-list.vue:220", "反馈列表加载完成，当前总数:", this.feedbackList.length);
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/feedback-list/feedback-list.vue:225", "加载反馈列表失败:", error);
        common_vendor.index.showToast({
          title: "加载失败",
          icon: "none"
        });
      } finally {
        this.isLoading = false;
        this.isRefreshing = false;
      }
    },
    // 切换筛选
    changeFilter(status) {
      this.filterStatus = status;
      this.page = 1;
      this.noMore = false;
      this.feedbackList = [];
      this.loadFeedbackList();
    },
    // 下拉刷新
    onRefresh() {
      this.isRefreshing = true;
      this.page = 1;
      this.noMore = false;
      this.feedbackList = [];
      this.loadFeedbackList();
    },
    // 加载更多
    loadMore() {
      if (!this.noMore && !this.isLoading) {
        this.page++;
        this.loadFeedbackList();
      }
    },
    // 查看详情
    viewDetail(feedbackId) {
      common_vendor.index.navigateTo({
        url: `/pages/feedback-detail/feedback-detail?feedbackId=${feedbackId}`
      });
    },
    // 图片加载失败
    handleImageError(e) {
      common_vendor.index.__f__("log", "at pages/feedback-list/feedback-list.vue:273", "图片加载失败:", e);
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
        const now = /* @__PURE__ */ new Date();
        const isToday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
        if (isToday) {
          const hours = d.getHours().toString().padStart(2, "0");
          const minutes = d.getMinutes().toString().padStart(2, "0");
          return `今天 ${hours}:${minutes}`;
        }
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = d.getFullYear() === yesterday.getFullYear() && d.getMonth() === yesterday.getMonth() && d.getDate() === yesterday.getDate();
        if (isYesterday) {
          const hours = d.getHours().toString().padStart(2, "0");
          const minutes = d.getMinutes().toString().padStart(2, "0");
          return `昨天 ${hours}:${minutes}`;
        }
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, "0");
        const day = d.getDate().toString().padStart(2, "0");
        return `${year}-${month}-${day}`;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/feedback-list/feedback-list.vue:350", "时间格式化失败:", timeStr, error);
        return String(timeStr);
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.filterStatus === "all" ? 1 : "",
    b: common_vendor.o(($event) => $options.changeFilter("all")),
    c: $data.filterStatus === "pending" ? 1 : "",
    d: common_vendor.o(($event) => $options.changeFilter("pending")),
    e: $data.filterStatus === "replied" ? 1 : "",
    f: common_vendor.o(($event) => $options.changeFilter("replied")),
    g: common_vendor.f($data.feedbackList, (item, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t($options.getTypeText(item.feedbackType)),
        b: common_vendor.n($options.getTypeClass(item.feedbackType)),
        c: common_vendor.t(item.status === 0 ? "待处理" : "已回复"),
        d: common_vendor.n(item.status === 0 ? "status-pending" : "status-replied"),
        e: common_vendor.t(item.content),
        f: common_vendor.t($options.formatTime(item.createTime)),
        g: item.imageUrl
      }, item.imageUrl ? {
        h: item.imageUrl,
        i: common_vendor.o((...args) => $options.handleImageError && $options.handleImageError(...args), item.feedbackId)
      } : {}, {
        j: item.feedbackId,
        k: common_vendor.o(($event) => $options.viewDetail(item.feedbackId), item.feedbackId)
      });
    }),
    h: $data.feedbackList.length === 0 && !$data.isLoading
  }, $data.feedbackList.length === 0 && !$data.isLoading ? {} : {}, {
    i: $data.isLoading
  }, $data.isLoading ? {} : {}, {
    j: $data.noMore && $data.feedbackList.length > 0
  }, $data.noMore && $data.feedbackList.length > 0 ? {} : {}, {
    k: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args)),
    l: $data.isRefreshing,
    m: common_vendor.o((...args) => $options.onRefresh && $options.onRefresh(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-7336ae1c"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/feedback-list/feedback-list.js.map
