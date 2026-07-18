"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_api = require("../../utils/api.js");
const utils_auth = require("../../utils/auth.js");
const _sfc_main = {
  data() {
    return {
      userId: utils_auth.getUserIdOrDefault(),
      userProfile: {},
      showNicknameInput: false,
      showGenderPicker: false,
      newNickname: "",
      newGender: null
    };
  },
  onLoad() {
    this.loadUserProfile();
  },
  onShow() {
    this.loadUserProfile();
  },
  methods: {
    // 加载用户资料
    async loadUserProfile() {
      try {
        const localUserInfo = common_vendor.index.getStorageSync("userInfo");
        if (localUserInfo) {
          common_vendor.index.__f__("log", "at pages/user-profile/user-profile.vue:119", "从本地缓存加载用户信息:", localUserInfo);
          const avatar = localUserInfo.avatar || localUserInfo.avatarUrl || localUserInfo.avatar_url || "/static/logo.png";
          this.userProfile = {
            userId: localUserInfo.userId,
            nickname: localUserInfo.nickname || "微信用户",
            avatar,
            gender: localUserInfo.gender !== void 0 ? localUserInfo.gender : null
          };
          common_vendor.index.__f__("log", "at pages/user-profile/user-profile.vue:128", "本地用户资料加载完成:", this.userProfile);
        }
        try {
          common_vendor.index.__f__("log", "at pages/user-profile/user-profile.vue:133", "尝试从后端加载用户资料:", this.userId);
          const response = await utils_api.getUserProfile(this.userId);
          if (response.code === 0 && response.data) {
            const avatar = response.data.avatarUrl || response.data.avatar || response.data.avatar_url || this.userProfile.avatar;
            this.userProfile = {
              userId: response.data.userId || this.userProfile.userId,
              nickname: response.data.nickname || this.userProfile.nickname,
              avatar,
              gender: response.data.gender !== void 0 ? response.data.gender : this.userProfile.gender
            };
            common_vendor.index.__f__("log", "at pages/user-profile/user-profile.vue:149", "后端用户资料更新成功:", this.userProfile);
          }
        } catch (apiError) {
          common_vendor.index.__f__("warn", "at pages/user-profile/user-profile.vue:153", "后端接口调用失败，使用本地数据:", apiError.message);
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/user-profile/user-profile.vue:157", "加载用户资料失败:", error);
        this.userProfile = {
          userId: this.userId,
          nickname: "微信用户",
          avatar: "/static/logo.png",
          gender: null
        };
      }
    },
    // 选择头像
    chooseAvatar() {
      common_vendor.index.chooseImage({
        count: 1,
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
        success: (res) => {
          const tempFilePath = res.tempFilePaths[0];
          this.uploadAvatar(tempFilePath);
        }
      });
    },
    // 上传头像
    async uploadAvatar(filePath) {
      common_vendor.index.showLoading({ title: "上传中..." });
      try {
        common_vendor.index.__f__("log", "at pages/user-profile/user-profile.vue:186", "上传头像:", filePath, "userId:", this.userId);
        const response = await utils_api.updateAvatar(filePath, this.userId);
        common_vendor.index.__f__("log", "at pages/user-profile/user-profile.vue:190", "上传头像响应:", response);
        common_vendor.index.hideLoading();
        let avatarUrl = "";
        if (typeof response === "string" && response.startsWith("http")) {
          avatarUrl = response;
        } else if (response.code === 0 && response.data) {
          avatarUrl = response.data;
        } else if (response.data) {
          avatarUrl = response.data;
        }
        if (avatarUrl) {
          common_vendor.index.showToast({
            title: "头像更新成功",
            icon: "success"
          });
          common_vendor.index.__f__("log", "at pages/user-profile/user-profile.vue:214", "头像更新成功:", avatarUrl);
          this.userProfile.avatar = avatarUrl;
          const userInfo = common_vendor.index.getStorageSync("userInfo") || {};
          userInfo.avatar = avatarUrl;
          common_vendor.index.setStorageSync("userInfo", userInfo);
          common_vendor.index.__f__("log", "at pages/user-profile/user-profile.vue:224", "本地缓存已更新");
        } else {
          throw new Error("上传失败，未返回头像 URL");
        }
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/user-profile/user-profile.vue:231", "上传头像失败:", error);
        common_vendor.index.showToast({
          title: error.message || "上传失败",
          icon: "none"
        });
      }
    },
    // 显示修改昵称弹窗
    showNicknameModal() {
      this.newNickname = this.userProfile.nickname || "";
      this.showNicknameInput = true;
    },
    // 关闭昵称弹窗
    closeNicknameModal() {
      this.showNicknameInput = false;
      this.newNickname = "";
    },
    // 更新昵称
    async handleUpdateNickname() {
      const nickname = this.newNickname.trim();
      if (!nickname) {
        common_vendor.index.showToast({
          title: "请输入昵称",
          icon: "none"
        });
        return;
      }
      if (nickname === this.userProfile.nickname) {
        this.closeNicknameModal();
        return;
      }
      common_vendor.index.showLoading({ title: "保存中..." });
      try {
        common_vendor.index.__f__("log", "at pages/user-profile/user-profile.vue:271", "更新昵称:", { userId: this.userId, nickname });
        const response = await utils_api.updateNickname({
          userId: this.userId,
          nickname
        });
        common_vendor.index.__f__("log", "at pages/user-profile/user-profile.vue:278", "更新昵称响应:", response);
        common_vendor.index.hideLoading();
        if (response.code === 0 || response.success) {
          common_vendor.index.showToast({
            title: "昵称更新成功",
            icon: "success"
          });
          this.userProfile.nickname = nickname;
          const userInfo = common_vendor.index.getStorageSync("userInfo") || {};
          userInfo.nickname = nickname;
          common_vendor.index.setStorageSync("userInfo", userInfo);
          this.closeNicknameModal();
        } else {
          throw new Error(response.message || "更新失败");
        }
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/user-profile/user-profile.vue:304", "更新昵称失败:", error);
        common_vendor.index.showToast({
          title: error.message || "更新失败",
          icon: "none"
        });
      }
    },
    // 显示性别选择弹窗
    showGenderModal() {
      this.newGender = this.userProfile.gender !== void 0 ? this.userProfile.gender : null;
      this.showGenderPicker = true;
    },
    // 关闭性别弹窗
    closeGenderModal() {
      this.showGenderPicker = false;
      this.newGender = null;
    },
    // 选择性别
    selectGender(gender) {
      this.newGender = gender;
    },
    // 更新性别
    async handleUpdateGender() {
      if (this.newGender === null) {
        common_vendor.index.showToast({
          title: "请选择性别",
          icon: "none"
        });
        return;
      }
      if (this.newGender === this.userProfile.gender) {
        this.closeGenderModal();
        return;
      }
      common_vendor.index.showLoading({ title: "保存中..." });
      try {
        common_vendor.index.__f__("log", "at pages/user-profile/user-profile.vue:347", "更新性别:", { userId: this.userId, gender: this.newGender });
        const response = await utils_api.updateGender({
          userId: this.userId,
          gender: this.newGender
        });
        common_vendor.index.__f__("log", "at pages/user-profile/user-profile.vue:354", "更新性别响应:", response);
        common_vendor.index.hideLoading();
        if (response.code === 0 || response.success) {
          common_vendor.index.showToast({
            title: "性别更新成功",
            icon: "success"
          });
          this.userProfile.gender = this.newGender;
          const userInfo = common_vendor.index.getStorageSync("userInfo") || {};
          userInfo.gender = this.newGender;
          common_vendor.index.setStorageSync("userInfo", userInfo);
          this.closeGenderModal();
        } else {
          throw new Error(response.message || "更新失败");
        }
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/user-profile/user-profile.vue:380", "更新性别失败:", error);
        common_vendor.index.showToast({
          title: error.message || "更新失败",
          icon: "none"
        });
      }
    },
    // 获取性别文本
    getGenderText(gender) {
      if (gender === 0)
        return "男";
      if (gender === 1)
        return "女";
      return "未设置";
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.userProfile.avatar || "/static/logo.png",
    b: common_vendor.o((...args) => $options.chooseAvatar && $options.chooseAvatar(...args)),
    c: common_vendor.t($data.userProfile.nickname || "未设置"),
    d: common_vendor.o((...args) => $options.showNicknameModal && $options.showNicknameModal(...args)),
    e: common_vendor.t($options.getGenderText($data.userProfile.gender)),
    f: common_vendor.o((...args) => $options.showGenderModal && $options.showGenderModal(...args)),
    g: $data.showNicknameInput
  }, $data.showNicknameInput ? {
    h: $data.showNicknameInput,
    i: $data.newNickname,
    j: common_vendor.o(($event) => $data.newNickname = $event.detail.value),
    k: common_vendor.o((...args) => $options.closeNicknameModal && $options.closeNicknameModal(...args)),
    l: common_vendor.o((...args) => $options.handleUpdateNickname && $options.handleUpdateNickname(...args)),
    m: common_vendor.o(() => {
    }),
    n: common_vendor.o((...args) => $options.closeNicknameModal && $options.closeNicknameModal(...args))
  } : {}, {
    o: $data.showGenderPicker
  }, $data.showGenderPicker ? {
    p: $data.newGender === 0 ? 1 : "",
    q: common_vendor.o(($event) => $options.selectGender(0)),
    r: $data.newGender === 1 ? 1 : "",
    s: common_vendor.o(($event) => $options.selectGender(1)),
    t: common_vendor.o((...args) => $options.closeGenderModal && $options.closeGenderModal(...args)),
    v: common_vendor.o((...args) => $options.handleUpdateGender && $options.handleUpdateGender(...args)),
    w: common_vendor.o(() => {
    }),
    x: common_vendor.o((...args) => $options.closeGenderModal && $options.closeGenderModal(...args))
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-ef78d882"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/user-profile/user-profile.js.map
