"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      userInfo: {}
    };
  },
  onShow() {
    this.loadUserInfo();
  },
  methods: {
    // 加载用户信息
    loadUserInfo() {
      const userInfo = common_vendor.index.getStorageSync("userInfo");
      if (userInfo) {
        this.userInfo = userInfo;
      }
    },
    // 清除缓存
    handleClearCache() {
      common_vendor.index.showModal({
        title: "清除缓存",
        content: "确定要清除所有缓存数据吗？",
        success: (res) => {
          if (res.confirm) {
            try {
              const token = common_vendor.index.getStorageSync("token");
              const userInfo = common_vendor.index.getStorageSync("userInfo");
              common_vendor.index.clearStorageSync();
              common_vendor.index.setStorageSync("token", token);
              common_vendor.index.setStorageSync("userInfo", userInfo);
              common_vendor.index.showToast({
                title: "缓存已清除",
                icon: "success"
              });
            } catch (error) {
              common_vendor.index.__f__("error", "at pages/settings/settings.vue:89", "清除缓存失败:", error);
              common_vendor.index.showToast({
                title: "清除失败",
                icon: "none"
              });
            }
          }
        }
      });
    },
    // 退出登录
    handleLogout() {
      common_vendor.index.showModal({
        title: "退出登录",
        content: "确定要退出登录吗？",
        success: (res) => {
          if (res.confirm) {
            common_vendor.index.removeStorageSync("token");
            common_vendor.index.removeStorageSync("userInfo");
            common_vendor.index.showToast({
              title: "已退出登录",
              icon: "success"
            });
            setTimeout(() => {
              common_vendor.index.reLaunch({
                url: "/pages/login/login"
              });
            }, 1500);
          }
        }
      });
    },
    // 页面跳转
    navigateTo(url) {
      const app = getApp();
      if (app && app.safeNavigateTo) {
        app.safeNavigateTo(url);
      } else {
        common_vendor.index.__f__("warn", "at pages/settings/settings.vue:135", "安全跳转方法不可用，使用普通跳转");
        common_vendor.index.navigateTo({ url });
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: $data.userInfo.avatar || "/static/logo.png",
    b: common_vendor.t($data.userInfo.nickname || "游客"),
    c: common_vendor.t($data.userInfo.userId || "-"),
    d: common_vendor.o(($event) => $options.navigateTo("/pages/user-profile/user-profile")),
    e: common_vendor.o((...args) => $options.handleClearCache && $options.handleClearCache(...args)),
    f: common_vendor.o(($event) => $options.navigateTo("/pages/feedback-list/feedback-list")),
    g: common_vendor.o(($event) => $options.navigateTo("/pages/feedback-result/feedback-result")),
    h: common_vendor.o((...args) => $options.handleLogout && $options.handleLogout(...args))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-7fad0a1c"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/settings/settings.js.map
