"use strict";
const common_vendor = require("../common/vendor.js");
const AUTH_STATES = {
  ONLINE_OK: "ONLINE_OK",
  // 在线且登录成功
  OFFLINE_CACHED: "OFFLINE_CACHED",
  // 离线但有缓存
  OFFLINE_GUEST: "OFFLINE_GUEST",
  // 离线游客模式
  ONLINE_NEED_LOGIN: "ONLINE_NEED_LOGIN"
  // 在线但登录失败
};
function getUserIdOrThrow() {
  const raw = common_vendor.index.getStorageSync("userId");
  const userId = Number(raw);
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new Error(`userId 无效：${raw}`);
  }
  return userId;
}
function getUserIdOrDefault(defaultValue = 1) {
  try {
    return getUserIdOrThrow();
  } catch (error) {
    common_vendor.index.__f__("warn", "at utils/auth.js:36", "获取用户ID失败，使用默认值:", defaultValue);
    return defaultValue;
  }
}
exports.AUTH_STATES = AUTH_STATES;
exports.getUserIdOrDefault = getUserIdOrDefault;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/auth.js.map
