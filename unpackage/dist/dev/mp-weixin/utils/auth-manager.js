"use strict";
const common_vendor = require("../common/vendor.js");
const K_TOKEN = "AUTH_TOKEN";
const K_USER = "AUTH_USER";
const K_LAST = "AUTH_LAST_LOGIN_AT";
const K_OFF = "AUTH_OFFLINE_ENABLED";
const OFFLINE_TTL_MS = 30 * 24 * 3600 * 1e3;
function getCachedUser() {
  try {
    const userData = common_vendor.index.getStorageSync(K_USER);
    return userData ? JSON.parse(userData) : null;
  } catch (e) {
    common_vendor.index.__f__("error", "at utils/auth-manager.js:24", "getCachedUser error:", e);
    return null;
  }
}
function isOfflineSessionValid() {
  try {
    const enabled = common_vendor.index.getStorageSync(K_OFF) === true;
    const lastLogin = common_vendor.index.getStorageSync(K_LAST);
    if (!enabled || !lastLogin) {
      return false;
    }
    const timeDiff = Date.now() - parseInt(lastLogin);
    return timeDiff < OFFLINE_TTL_MS;
  } catch (e) {
    common_vendor.index.__f__("error", "at utils/auth-manager.js:45", "isOfflineSessionValid error:", e);
    return false;
  }
}
function saveLoginSession({ token, user }) {
  try {
    if (token) {
      common_vendor.index.setStorageSync(K_TOKEN, token);
    }
    common_vendor.index.setStorageSync(K_USER, JSON.stringify(user));
    common_vendor.index.setStorageSync(K_LAST, Date.now().toString());
    common_vendor.index.setStorageSync(K_OFF, true);
    common_vendor.index.__f__("log", "at utils/auth-manager.js:67", "登录会话保存成功:", {
      hasToken: !!token,
      userId: user == null ? void 0 : user.userId,
      nickname: user == null ? void 0 : user.nickname
    });
  } catch (e) {
    common_vendor.index.__f__("error", "at utils/auth-manager.js:73", "saveLoginSession error:", e);
  }
}
exports.getCachedUser = getCachedUser;
exports.isOfflineSessionValid = isOfflineSessionValid;
exports.saveLoginSession = saveLoginSession;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/auth-manager.js.map
