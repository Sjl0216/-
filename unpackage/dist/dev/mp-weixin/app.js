"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const common_vendor = require("./common/vendor.js");
const utils_offlineAuth = require("./utils/offline-auth.js");
if (!Math) {
  "./pages/login/login.js";
  "./pages/home/home.js";
  "./pages/record-list/record-list.js";
  "./pages/mushroom-list/mushroom-list.js";
  "./pages/settings/settings.js";
  "./pages/result/result.js";
  "./pages/record-detail/record-detail.js";
  "./pages/mushroom-detail/mushroom-detail.js";
  "./pages/feedback/feedback.js";
  "./pages/feedback-list/feedback-list.js";
  "./pages/feedback-result/feedback-result.js";
  "./pages/user-profile/user-profile.js";
  "./pages/index/index.js";
}
const _sfc_main = {
  globalData: {
    authState: "OFFLINE_GUEST",
    userId: null,
    token: null,
    userProfile: null,
    networkOnline: false,
    appReady: false,
    pageTransitionLock: false
    // 添加页面跳转锁
  },
  onLaunch: function() {
    common_vendor.index.__f__("log", "at App.vue:16", "App Launch");
    this.initAuth();
    this.bindGlobalNetworkListener();
    this.globalData.pageTransitionLock = false;
  },
  onShow: function() {
    common_vendor.index.__f__("log", "at App.vue:26", "App Show");
    this.globalData.pageTransitionLock = false;
  },
  onHide: function() {
    common_vendor.index.__f__("log", "at App.vue:32", "App Hide");
  },
  methods: {
    // 初始化认证系统
    async initAuth() {
      try {
        await utils_offlineAuth.bootstrapAuth(this);
        common_vendor.index.__f__("log", "at App.vue:40", "认证初始化完成，当前状态:", this.globalData.authState);
        this.globalData.appReady = true;
        this.globalData.pageTransitionLock = false;
      } catch (error) {
        common_vendor.index.__f__("error", "at App.vue:46", "认证初始化失败:", error);
        this.globalData.authState = "OFFLINE_GUEST";
        this.globalData.appReady = true;
        this.globalData.pageTransitionLock = false;
      }
    },
    // 绑定全局网络监听
    bindGlobalNetworkListener() {
      common_vendor.index.onNetworkStatusChange(async (res) => {
        this.globalData.networkOnline = res.isConnected;
        if (res.isConnected) {
          common_vendor.index.__f__("log", "at App.vue:59", "网络已连接，尝试自动补登");
          await utils_offlineAuth.onNetworkBack(this);
        }
      });
    },
    // 安全的页面跳转方法
    safeNavigateTo(url, successCallback, failCallback) {
      if (!this.globalData.appReady) {
        common_vendor.index.__f__("warn", "at App.vue:69", "应用未准备就绪，延迟跳转:", url);
        setTimeout(() => {
          this.safeNavigateTo(url, successCallback, failCallback);
        }, 200);
        return;
      }
      if (this.globalData.pageTransitionLock) {
        common_vendor.index.__f__("warn", "at App.vue:78", "页面跳转被锁定，延迟执行:", url);
        setTimeout(() => {
          this.safeNavigateTo(url, successCallback, failCallback);
        }, 100);
        return;
      }
      this.globalData.pageTransitionLock = true;
      common_vendor.index.navigateTo({
        url,
        success: (res) => {
          common_vendor.index.__f__("log", "at App.vue:91", "页面跳转成功:", url);
          setTimeout(() => {
            this.globalData.pageTransitionLock = false;
          }, 300);
          if (successCallback)
            successCallback(res);
        },
        fail: (err) => {
          common_vendor.index.__f__("error", "at App.vue:99", "页面跳转失败:", url, err);
          this.globalData.pageTransitionLock = false;
          if (failCallback)
            failCallback(err);
          else {
            common_vendor.index.showToast({
              title: "页面跳转失败",
              icon: "none"
            });
          }
        }
      });
    }
  }
};
function createApp() {
  const app = common_vendor.createSSRApp(_sfc_main);
  return {
    app
  };
}
createApp().app.mount("#app");
exports.createApp = createApp;
//# sourceMappingURL=../.sourcemap/mp-weixin/app.js.map
