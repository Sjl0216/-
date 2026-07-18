"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_request = require("../../utils/request.js");
const utils_networkDetector = require("../../utils/network-detector.js");
const utils_authManager = require("../../utils/auth-manager.js");
const common_assets = require("../../common/assets.js");
const _sfc_main = {
  data() {
    return {
      isLoading: false,
      isOnline: true
    };
  },
  async onLoad() {
    this.checkNetworkStatus();
  },
  methods: {
    // 检测网络状态
    async checkNetworkStatus() {
      this.isOnline = await utils_networkDetector.getNetworkOnline();
      common_vendor.index.__f__("log", "at pages/login/login.vue:68", "登录页网络状态:", this.isOnline ? "在线" : "离线");
    },
    // 离线模式进入
    async enterOfflineMode() {
      try {
        const user = utils_authManager.getCachedUser();
        if (user && utils_authManager.isOfflineSessionValid()) {
          common_vendor.index.showToast({
            title: "离线模式进入",
            icon: "success"
          });
          setTimeout(() => {
            common_vendor.index.reLaunch({ url: "/pages/home/home?offline=1" });
          }, 1e3);
        } else {
          common_vendor.index.showToast({
            title: "离线访客模式（无法同步）",
            icon: "none",
            duration: 2e3
          });
          setTimeout(() => {
            common_vendor.index.reLaunch({ url: "/pages/home/home?offline=1&guest=1" });
          }, 2e3);
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/login/login.vue:97", "进入离线模式失败:", error);
        common_vendor.index.showToast({
          title: "进入离线模式失败",
          icon: "none"
        });
      }
    },
    async handleLogin() {
      this.isLoading = true;
      try {
        const online = await utils_networkDetector.getNetworkOnline();
        if (!online) {
          common_vendor.index.showToast({
            title: "网络不可用，请检查网络连接",
            icon: "none"
          });
          return;
        }
        await this.wechatLogin();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/login/login.vue:131", "登录失败:", error);
        common_vendor.index.showToast({
          title: error.message || "登录失败，请重试",
          icon: "none"
        });
      } finally {
        this.isLoading = false;
      }
    },
    // 微信真实登录
    async wechatLogin() {
      try {
        common_vendor.index.__f__("log", "at pages/login/login.vue:144", " 开始微信登录...");
        const loginRes = await common_vendor.index.login({ provider: "weixin" });
        if (!loginRes.code)
          throw new Error("获取微信 code 失败");
        common_vendor.index.__f__("log", "at pages/login/login.vue:149", "获取 code 成功:", loginRes.code);
        const response = await common_vendor.index.request({
          url: `${utils_request.BASE_URL}/api/user/login`,
          method: "POST",
          header: { "content-type": "application/json" },
          data: { code: loginRes.code }
        });
        common_vendor.index.__f__("log", "at pages/login/login.vue:158", "后端响应:", response);
        common_vendor.index.__f__("log", "at pages/login/login.vue:159", "响应数据 data:", response.data);
        common_vendor.index.__f__("log", "at pages/login/login.vue:160", "响应数据 data.data:", response.data.data);
        if (response.statusCode !== 200)
          throw new Error(`HTTP ${response.statusCode}`);
        const result = response.data;
        if (result.code !== 0)
          throw new Error(result.msg || "登录失败");
        let token = null;
        let userInfo = null;
        if (result.data) {
          if (result.data.token && result.data.userInfo) {
            token = result.data.token;
            userInfo = result.data.userInfo;
          } else if (result.data.userId || result.data.user_id || result.data.openid) {
            userInfo = result.data;
            token = result.data.openid || "temp_token_" + Date.now();
          }
        }
        if (!userInfo)
          throw new Error("后端未返回用户信息");
        const userId = userInfo.userId || userInfo.user_id || userInfo.openid;
        if (!userId)
          throw new Error("后端未返回 userId");
        common_vendor.index.__f__("log", "at pages/login/login.vue:192", "登录成功, userId:", userId);
        common_vendor.index.__f__("log", "at pages/login/login.vue:193", "用户信息:", userInfo);
        utils_authManager.saveLoginSession({
          token,
          user: {
            userId,
            nickname: userInfo.nickname || "微信用户",
            avatarUrl: userInfo.avatarUrl || userInfo.avatar_url || userInfo.avatar || "/static/logo.png",
            gender: userInfo.gender !== void 0 ? userInfo.gender : null,
            openid: userInfo.openid
          }
        });
        common_vendor.index.showToast({ title: "登录成功", icon: "success" });
        setTimeout(() => common_vendor.index.reLaunch({ url: "/pages/home/home" }), 1500);
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/login/login.vue:210", "微信登录失败:", error);
        throw error;
      }
    },
    // 模拟登录（开发环境使用）
    async mockLogin() {
      try {
        common_vendor.index.__f__("log", "at pages/login/login.vue:218", "开发环境：使用模拟登录");
        const mockCode = "mock_code_" + Date.now();
        const mockResponse = {
          token: "mock_token_" + Date.now(),
          userInfo: {
            userId: "mock_user_001",
            nickname: "测试用户",
            avatar: "/static/logo.png"
          }
        };
        common_vendor.index.setStorageSync("token", mockResponse.token);
        common_vendor.index.setStorageSync("userInfo", mockResponse.userInfo);
        common_vendor.index.showToast({
          title: "登录成功（开发模式）",
          icon: "success",
          duration: 1500
        });
        setTimeout(() => {
          common_vendor.index.switchTab({
            url: "/pages/home/home"
          });
        }, 1500);
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/login/login.vue:255", "模拟登录失败:", error);
        throw error;
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_assets._imports_0,
    b: common_vendor.t($data.isLoading ? "登录中..." : "微信登录"),
    c: common_vendor.o((...args) => $options.handleLogin && $options.handleLogin(...args)),
    d: $data.isLoading,
    e: !$data.isOnline,
    f: !$data.isOnline
  }, !$data.isOnline ? {
    g: common_vendor.o((...args) => $options.enterOfflineMode && $options.enterOfflineMode(...args))
  } : {}, {
    h: common_vendor.t($data.isOnline ? "网络正常" : "网络不可用 - 可选择离线模式"),
    i: !$data.isOnline ? 1 : ""
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-e4e4508d"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/login/login.js.map
