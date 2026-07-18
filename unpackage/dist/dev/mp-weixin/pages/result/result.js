"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_api = require("../../utils/api.js");
const utils_request = require("../../utils/request.js");
const _sfc_main = {
  data() {
    return {
      recordId: "",
      mushroomId: "",
      mushroomName: "",
      scientificName: "",
      alias: "",
      confidence: 0,
      poisonous: false,
      mushroomImage: "",
      recognizeTime: "",
      imageLoadError: false,
      // 备用图片URL列表
      backupImages: [
        "https://picsum.photos/400/400?random=1",
        "https://picsum.photos/400/400?random=2",
        "https://picsum.photos/400/400?random=3"
      ],
      currentImageIndex: 0
    };
  },
  computed: {
    confidenceLevel() {
      if (this.confidence >= 80)
        return "high";
      if (this.confidence >= 60)
        return "medium";
      return "low";
    }
  },
  onLoad(options) {
    common_vendor.index.__f__("log", "at pages/result/result.vue:111", "页面加载参数:", options);
    if (options.recordId) {
      this.recordId = options.recordId;
      this.loadRecordDetail();
    } else {
      common_vendor.index.__f__("log", "at pages/result/result.vue:117", "无recordId参数，加载测试数据");
      this.loadRecordDetail();
    }
  },
  methods: {
    async loadRecordDetail() {
      try {
        common_vendor.index.__f__("log", "at pages/result/result.vue:124", "加载识别记录:", this.recordId);
        if (!this.recordId) {
          common_vendor.index.__f__("log", "at pages/result/result.vue:128", "无recordId，使用测试数据");
          this.mushroomName = "见手青";
          this.scientificName = "Boletus edulis";
          this.alias = "牛肝菌、白牛肝菌";
          this.confidence = 97.35;
          this.poisonous = true;
          this.mushroomImage = "https://picsum.photos/400/400?random=1";
          this.recognizeTime = (/* @__PURE__ */ new Date()).toLocaleString("zh-CN");
          this.imageLoadError = false;
          return;
        }
        common_vendor.index.showLoading({ title: "加载中..." });
        const response = await utils_api.recordDetail({
          recordId: this.recordId
        });
        common_vendor.index.__f__("log", "at pages/result/result.vue:147", "API响应:", response);
        let data = null;
        if (response.code === 0 && response.data) {
          data = response.data;
        } else if (response.recordId) {
          data = response;
        }
        if (data) {
          this.mushroomName = data.mushroomName || "未知菌类";
          this.scientificName = data.scientificName || "";
          this.alias = data.alias || "";
          this.confidence = data.confidence || 0;
          this.poisonous = data.isPoisonous === 1;
          this.mushroomImage = this.normalizeImageUrl(data.imageUrl);
          this.recognizeTime = data.recognizeTime || data.createTime || (/* @__PURE__ */ new Date()).toLocaleString("zh-CN");
          this.mushroomId = data.mushroomId || "";
          this.imageLoadError = false;
          common_vendor.index.__f__("log", "at pages/result/result.vue:169", "数据加载成功:", {
            name: this.mushroomName,
            image: this.mushroomImage,
            confidence: this.confidence
          });
          common_vendor.index.hideLoading();
          common_vendor.index.showToast({ title: "加载成功", icon: "success", duration: 1e3 });
        } else {
          throw new Error("数据格式错误");
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/result/result.vue:182", "加载详情失败:", error);
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: "加载失败: " + (error.message || "未知错误"),
          icon: "none"
        });
        this.mushroomName = "加载失败";
        this.scientificName = "";
        this.alias = "";
        this.confidence = 0;
        this.poisonous = false;
        this.mushroomImage = "";
        this.recognizeTime = (/* @__PURE__ */ new Date()).toLocaleString("zh-CN");
        this.imageLoadError = true;
      }
    },
    // 图片加载错误处理
    onImageError(e) {
      this.imageLoadError = true;
      common_vendor.index.__f__("error", "at pages/result/result.vue:204", "图片加载失败:", e);
      common_vendor.index.__f__("log", "at pages/result/result.vue:205", "当前图片URL:", this.mushroomImage);
      if (this.currentImageIndex < this.backupImages.length - 1) {
        this.currentImageIndex++;
        this.mushroomImage = this.backupImages[this.currentImageIndex];
        this.imageLoadError = false;
        common_vendor.index.__f__("log", "at pages/result/result.vue:212", "切换到备用图片:", this.mushroomImage);
      } else {
        common_vendor.index.showToast({
          title: "图片加载失败",
          icon: "none"
        });
      }
    },
    // 图片加载成功处理
    onImageLoad() {
      this.imageLoadError = false;
      common_vendor.index.__f__("log", "at pages/result/result.vue:224", "图片加载成功");
    },
    // 标准化图片URL（参考record-detail页面）
    normalizeImageUrl(url) {
      if (!url)
        return "";
      if (url.startsWith("http") || url.startsWith("https") || url.startsWith("wxfile://")) {
        return url;
      }
      return utils_request.BASE_URL + url;
    },
    // 查看科普详情
    viewDetail() {
      if (!this.mushroomId) {
        common_vendor.index.showToast({
          title: "暂无详情信息",
          icon: "none"
        });
        return;
      }
      common_vendor.index.navigateTo({
        url: `/pages/mushroom-detail/mushroom-detail?mushroomId=${this.mushroomId}`
      });
    },
    // 提交反馈
    submitFeedback() {
      if (!this.recordId) {
        common_vendor.index.showToast({
          title: "无法提交反馈",
          icon: "none"
        });
        return;
      }
      common_vendor.index.navigateTo({
        url: `/pages/feedback/feedback?recordId=${this.recordId}`
      });
    },
    // 返回首页
    backToHome() {
      common_vendor.index.switchTab({
        url: "/pages/home/home"
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.mushroomImage,
    b: common_vendor.o((...args) => $options.onImageError && $options.onImageError(...args)),
    c: common_vendor.o((...args) => $options.onImageLoad && $options.onImageLoad(...args)),
    d: !$data.mushroomImage || $data.imageLoadError
  }, !$data.mushroomImage || $data.imageLoadError ? {} : {}, {
    e: common_vendor.t($data.mushroomName || "识别中..."),
    f: common_vendor.t($data.confidence),
    g: common_vendor.n($options.confidenceLevel),
    h: $data.poisonous ? 1 : "",
    i: !$data.poisonous ? 1 : "",
    j: common_vendor.t($data.poisonous ? "该菌类有毒，请勿食用！" : "该菌类可以安全食用"),
    k: $data.poisonous ? 1 : "",
    l: !$data.poisonous ? 1 : "",
    m: common_vendor.t($data.scientificName || "-"),
    n: common_vendor.t($data.alias || "-"),
    o: common_vendor.t($data.recognizeTime),
    p: common_vendor.o((...args) => $options.viewDetail && $options.viewDetail(...args)),
    q: common_vendor.o((...args) => $options.submitFeedback && $options.submitFeedback(...args)),
    r: common_vendor.o((...args) => $options.backToHome && $options.backToHome(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-b615976f"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/result/result.js.map
