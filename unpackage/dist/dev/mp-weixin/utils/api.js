"use strict";
const utils_request = require("./request.js");
const api = {
  // 用户相关
  userLogin: (code) => utils_request.request("/api/user/login", "POST", { code }),
  getUserInfo: (userId) => utils_request.request("/api/user/info", "GET", { userId }),
  updateUserInfo: (data) => utils_request.request("/api/user/update", "PUT", data),
  // 用户个人信息相关
  getUserProfile: (userId) => utils_request.request("/api/user/profile", "GET", { userId }),
  updateNickname: (data) => utils_request.request("/api/user/update/nickname", "POST", data),
  updateGender: (data) => utils_request.request("/api/user/update/gender", "POST", data),
  updateAvatar: (filePath, userId) => utils_request.upload("/api/user/update/avatar", filePath, "avatar", { userId }),
  // 科普相关
  mushroomList: (params) => utils_request.request("/api/mushroom/list", "GET", params),
  mushroomListAll: (params) => utils_request.request("/api/mushroom/app/list", "GET", params),
  mushroomDetail: (params) => utils_request.request("/api/mushroom/detail", "GET", params),
  searchMushroom: (keyword) => utils_request.request("/api/mushroom/search", "GET", { keyword }),
  // 识别相关
  predict: (filePath, formData) => utils_request.upload("/api/recognition/predict", filePath, "image", formData),
  predictCloud: (filePath, userId, inferModel = 1, deviceInfo = "") => utils_request.upload("/api/recognition/predict", filePath, "image", { userId, inferModel, deviceInfo }),
  report: (filePath, formData) => utils_request.upload("/api/recognition/report", filePath, "image", formData),
  rePredict: (recordId) => utils_request.request("/api/recognition/rePredict", "POST", { recordId }),
  // 记录相关
  recordList: (params) => utils_request.request("/api/record/list", "GET", params),
  recordListAll: (params) => utils_request.request("/api/record/listAll", "GET", params),
  recordDetail: (params) => utils_request.request("/api/record/detail", "GET", params),
  deleteRecord: (recordId) => utils_request.request("/api/record/delete", "DELETE", { recordId }),
  // 反馈相关
  feedbackSubmit: (payload) => utils_request.request("/api/feedback/submit", "POST", payload),
  feedbackList: (params) => utils_request.request("/api/feedback/my", "GET", params),
  // 统计相关
  getUserStatistics: (userId) => utils_request.request("/api/statistics/user", "GET", { userId })
};
const {
  userLogin,
  getUserInfo,
  updateUserInfo,
  getUserProfile,
  updateNickname,
  updateGender,
  updateAvatar,
  mushroomList,
  mushroomListAll,
  mushroomDetail,
  searchMushroom,
  predict,
  predictCloud,
  report,
  rePredict,
  recordList,
  recordListAll,
  recordDetail,
  deleteRecord,
  feedbackSubmit,
  feedbackList,
  getUserStatistics
} = api;
exports.feedbackList = feedbackList;
exports.feedbackSubmit = feedbackSubmit;
exports.getUserProfile = getUserProfile;
exports.mushroomDetail = mushroomDetail;
exports.mushroomListAll = mushroomListAll;
exports.recordDetail = recordDetail;
exports.recordListAll = recordListAll;
exports.updateAvatar = updateAvatar;
exports.updateGender = updateGender;
exports.updateNickname = updateNickname;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/api.js.map
