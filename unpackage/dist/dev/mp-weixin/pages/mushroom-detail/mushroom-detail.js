"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_api = require("../../utils/api.js");
const utils_request = require("../../utils/request.js");
const _sfc_main = {
  data() {
    return {
      mushroomId: null,
      mushroom: {},
      poisonText: "",
      poisonTagClass: "",
      poisonValueClass: "",
      isLoading: false
    };
  },
  onLoad(options) {
    this.mushroomId = options.mushroomId;
    if (!this.mushroomId) {
      common_vendor.index.showToast({ title: "缺少菌类ID", icon: "none" });
      setTimeout(() => common_vendor.index.navigateBack(), 1500);
      return;
    }
    common_vendor.index.__f__("log", "at pages/mushroom-detail/mushroom-detail.vue:89", "加载菌类详情, mushroomId:", this.mushroomId);
    this.loadMushroomDetail();
  },
  methods: {
    // 图片加载失败处理
    onImageError(e) {
      common_vendor.index.__f__("error", "at pages/mushroom-detail/mushroom-detail.vue:95", "图片加载失败:", this.mushroom.standardImageUrl, e);
    },
    // 核心方法：从后端加载菌类详情
    async loadMushroomDetail() {
      this.isLoading = true;
      common_vendor.index.showLoading({ title: "加载中..." });
      try {
        common_vendor.index.__f__("log", "at pages/mushroom-detail/mushroom-detail.vue:104", "开始请求菌类详情, mushroomId:", this.mushroomId);
        const response = await utils_api.mushroomDetail({
          mushroomId: this.mushroomId
        });
        common_vendor.index.__f__("log", "at pages/mushroom-detail/mushroom-detail.vue:110", "原始响应:", response);
        let data = null;
        if (response.code === 0 && response.data) {
          data = response.data;
          common_vendor.index.__f__("log", "at pages/mushroom-detail/mushroom-detail.vue:118", "标准响应格式");
        } else if (response.mushroomId) {
          data = response;
          common_vendor.index.__f__("log", "at pages/mushroom-detail/mushroom-detail.vue:122", "直接数据响应格式");
        } else {
          throw new Error("接口返回数据格式错误");
        }
        if (!data) {
          throw new Error("未找到菌类信息");
        }
        this.mushroom = {
          mushroomId: data.mushroomId,
          chineseName: data.chineseName || "未知菌类",
          latinName: data.latinName || "",
          category: data.category || "",
          description: data.description || "",
          edibleTips: data.edibleTips || "",
          toxicityLevel: data.toxicityLevel || "",
          isPoisonous: data.isPoisonous,
          standardImageUrl: data.standardImageUrl || ""
        };
        if (this.mushroom.standardImageUrl && !this.mushroom.standardImageUrl.startsWith("http")) {
          this.mushroom.standardImageUrl = utils_request.BASE_URL + this.mushroom.standardImageUrl;
        }
        this.setPoisonInfo();
        common_vendor.index.__f__("log", "at pages/mushroom-detail/mushroom-detail.vue:152", "菌类详情加载成功:", this.mushroom);
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/mushroom-detail/mushroom-detail.vue:155", "加载菌类详情失败:", error);
        common_vendor.index.showToast({
          title: error.message || "加载失败",
          icon: "none"
        });
        setTimeout(() => common_vendor.index.navigateBack(), 1500);
      } finally {
        this.isLoading = false;
        common_vendor.index.hideLoading();
      }
    },
    // 设置毒性信息
    setPoisonInfo() {
      switch (this.mushroom.isPoisonous) {
        case 0:
          this.poisonText = "无毒可食用";
          this.poisonTagClass = "safe";
          this.poisonValueClass = "safe-text";
          break;
        case 1:
          this.poisonText = "有毒不可食用";
          this.poisonTagClass = "danger";
          this.poisonValueClass = "danger-text";
          break;
        case 2:
          this.poisonText = "需谨慎";
          this.poisonTagClass = "warning";
          this.poisonValueClass = "warning-text";
          break;
        default:
          this.poisonText = "未知";
          this.poisonTagClass = "unknown";
          this.poisonValueClass = "unknown-text";
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.mushroom.standardImageUrl
  }, $data.mushroom.standardImageUrl ? {
    b: $data.mushroom.standardImageUrl,
    c: common_vendor.o((...args) => $options.onImageError && $options.onImageError(...args))
  } : {}, {
    d: $data.isLoading
  }, $data.isLoading ? {} : common_vendor.e({
    e: common_vendor.t($data.mushroom.chineseName || "加载中..."),
    f: $data.poisonText
  }, $data.poisonText ? {
    g: common_vendor.t($data.poisonText),
    h: common_vendor.n($data.poisonTagClass)
  } : {}, {
    i: $data.mushroom.description
  }, $data.mushroom.description ? {
    j: common_vendor.t($data.mushroom.description)
  } : {}, {
    k: $data.mushroom.latinName
  }, $data.mushroom.latinName ? {
    l: common_vendor.t($data.mushroom.latinName)
  } : {}, {
    m: $data.mushroom.category
  }, $data.mushroom.category ? {
    n: common_vendor.t($data.mushroom.category)
  } : {}, {
    o: common_vendor.t($data.poisonText),
    p: common_vendor.n($data.poisonValueClass),
    q: $data.mushroom.edibleTips
  }, $data.mushroom.edibleTips ? {
    r: common_vendor.t($data.mushroom.edibleTips)
  } : {}, {
    s: $data.mushroom.toxicityLevel
  }, $data.mushroom.toxicityLevel ? {
    t: common_vendor.t($data.mushroom.toxicityLevel)
  } : {}));
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-e06fa85b"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/mushroom-detail/mushroom-detail.js.map
