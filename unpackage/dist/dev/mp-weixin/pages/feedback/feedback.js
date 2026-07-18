"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_auth = require("../../utils/auth.js");
const utils_api = require("../../utils/api.js");
const _sfc_main = {
  data() {
    return {
      userId: utils_auth.getUserIdOrDefault(),
      recordId: "",
      recordInfo: {
        mushroomName: "",
        confidence: 0,
        imageUrl: ""
      },
      type: null,
      // 1=识别错误, 2=功能建议, 3=Bug报告, 4=其他问题
      content: "",
      // 反馈内容（必填）
      imageUrl: "",
      // 反馈图片 URL（可选）
      isSubmitting: false
    };
  },
  computed: {
    canSubmit() {
      return this.type !== null && this.content.trim().length > 0;
    }
  },
  onLoad(options) {
    common_vendor.index.__f__("log", "at pages/feedback/feedback.vue:114", " 反馈页面 onLoad:", options);
    if (options.recordId) {
      this.recordId = options.recordId;
    }
    if (options.mushroomName) {
      this.recordInfo.mushroomName = decodeURIComponent(options.mushroomName);
    }
    if (options.confidence) {
      this.recordInfo.confidence = parseFloat(options.confidence);
    }
    if (options.imageUrl) {
      this.recordInfo.imageUrl = decodeURIComponent(options.imageUrl);
    }
    common_vendor.index.__f__("log", "at pages/feedback/feedback.vue:131", "识别记录信息:", this.recordInfo);
  },
  methods: {
    // 格式化置信度
    formatConfidence(confidence) {
      if (confidence === void 0 || confidence === null)
        return "0%";
      if (typeof confidence === "string" && confidence.includes("%"))
        return confidence;
      let numericConfidence = parseFloat(confidence);
      if (numericConfidence < 1 && numericConfidence > 0) {
        numericConfidence = numericConfidence * 100;
      }
      return numericConfidence.toFixed(1) + "%";
    },
    // 图片加载失败
    onImageError(e) {
      common_vendor.index.__f__("error", "at pages/feedback/feedback.vue:152", "图片加载失败:", this.recordInfo.imageUrl, e);
    },
    // 提交反馈
    async handleSubmit() {
      if (!this.canSubmit) {
        common_vendor.index.showToast({
          title: "请填写反馈类型和内容",
          icon: "none"
        });
        return;
      }
      this.isSubmitting = true;
      common_vendor.index.showLoading({ title: "提交中..." });
      try {
        const payload = {
          userId: this.userId,
          recordId: this.recordId ? Number(this.recordId) : null,
          // 识别记录ID
          feedbackType: this.type,
          // 反馈类型：1=识别错误, 2=图片问题, 3=系统问题, 4=其他
          content: this.content.trim(),
          // 反馈内容
          imageUrl: this.imageUrl || this.recordInfo.imageUrl || null
          // 优先用户上传，否则用识别图片
        };
        common_vendor.index.__f__("log", "at pages/feedback/feedback.vue:178", "提交反馈数据:", payload);
        const response = await utils_api.feedbackSubmit(payload);
        common_vendor.index.__f__("log", "at pages/feedback/feedback.vue:182", "后端原始响应:", response);
        let feedbackId = null;
        let isSuccess = false;
        if (response.code === 0 && response.data) {
          feedbackId = response.data.feedbackId;
          isSuccess = true;
          common_vendor.index.__f__("log", "at pages/feedback/feedback.vue:192", "标准格式响应，反馈提交成功, feedbackId:", feedbackId);
        } else if (response.feedbackId) {
          feedbackId = response.feedbackId;
          isSuccess = true;
          common_vendor.index.__f__("log", "at pages/feedback/feedback.vue:197", "直接数据响应，反馈提交成功, feedbackId:", feedbackId);
        }
        if (isSuccess) {
          common_vendor.index.hideLoading();
          common_vendor.index.showToast({
            title: "提交成功",
            icon: "success",
            duration: 1500
          });
          setTimeout(() => {
            common_vendor.index.navigateBack();
          }, 1500);
        } else {
          common_vendor.index.hideLoading();
          common_vendor.index.showToast({
            title: response.msg || "提交失败",
            icon: "none"
          });
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/feedback/feedback.vue:220", "提交反馈失败:", error);
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: "提交失败，请重试",
          icon: "none"
        });
      } finally {
        this.isSubmitting = false;
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.recordInfo.mushroomName
  }, $data.recordInfo.mushroomName ? {
    b: $data.recordInfo.imageUrl,
    c: common_vendor.o((...args) => $options.onImageError && $options.onImageError(...args)),
    d: common_vendor.t($data.recordInfo.mushroomName),
    e: common_vendor.t($options.formatConfidence($data.recordInfo.confidence))
  } : {}, {
    f: $data.type === 1 ? 1 : "",
    g: common_vendor.o(($event) => $data.type = 1),
    h: $data.type === 2 ? 1 : "",
    i: common_vendor.o(($event) => $data.type = 2),
    j: $data.type === 3 ? 1 : "",
    k: common_vendor.o(($event) => $data.type = 3),
    l: $data.type === 4 ? 1 : "",
    m: common_vendor.o(($event) => $data.type = 4),
    n: $data.content,
    o: common_vendor.o(($event) => $data.content = $event.detail.value),
    p: common_vendor.t($data.isSubmitting ? "提交中..." : "提交反馈"),
    q: common_vendor.o((...args) => $options.handleSubmit && $options.handleSubmit(...args)),
    r: !$options.canSubmit,
    s: $data.isSubmitting
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-a24b82f2"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/feedback/feedback.js.map
