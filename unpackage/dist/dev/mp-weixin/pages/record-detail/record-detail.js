"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_api = require("../../utils/api.js");
const utils_auth = require("../../utils/auth.js");
const utils_request = require("../../utils/request.js");
const _sfc_main = {
  data() {
    return {
      recordId: null,
      userId: utils_auth.getUserIdOrDefault(),
      // 识别记录详情
      detail: {
        mushroomName: "",
        confidence: 0,
        isPoisonous: 2,
        imageUrl: "",
        recognizeTime: "",
        deviceInfo: "",
        inferModel: 1
      },
      // 菌类百科详情（可能为空）
      mushroom: {
        scientificName: "",
        category: "",
        description: "",
        edibleTips: "",
        toxicityLevel: ""
      },
      poisonText: "",
      poisonTagClass: ""
    };
  },
  computed: {
    // 是否有菌类详情（mushroomId 不为 null/0）
    hasMushroomDetail() {
      const result = this.detail.mushroomId && this.detail.mushroomId > 0;
      common_vendor.index.__f__("log", "at pages/record-detail/record-detail.vue:131", "hasMushroomDetail 计算:", {
        mushroomId: this.detail.mushroomId,
        result
      });
      return result;
    }
  },
  onLoad(options) {
    this.recordId = options.recordId;
    if (!this.recordId) {
      common_vendor.index.showToast({ title: "缺少记录ID", icon: "none" });
      setTimeout(() => common_vendor.index.navigateBack(), 1500);
      return;
    }
    const isLocalRecord = String(this.recordId).includes("_") || isNaN(Number(this.recordId));
    if (isLocalRecord) {
      common_vendor.index.__f__("log", "at pages/record-detail/record-detail.vue:151", "本地记录，从缓存加载:", this.recordId);
      this.loadLocalRecord();
    } else {
      common_vendor.index.__f__("log", "at pages/record-detail/record-detail.vue:155", "云端记录，调用接口:", this.recordId);
      this.loadRecordDetail();
    }
  },
  methods: {
    // 图片加载失败处理
    onImageError(e) {
      common_vendor.index.__f__("error", "at pages/record-detail/record-detail.vue:162", "图片加载失败:", this.detail.imageUrl, e);
    },
    // 从本地缓存加载未同步的识别记录详情
    // 应用场景：用户查看本地暂存、待同步的识别记录时调用此方法
    async loadLocalRecord() {
      try {
        const historyKey = `mushroom_records_${this.userId}`;
        const records = common_vendor.index.getStorageSync(historyKey) || common_vendor.index.getStorageSync("records") || [];
        const record = records.find((r) => r.rid === this.recordId);
        if (!record) {
          common_vendor.index.showToast({ title: "本地记录不存在", icon: "none" });
          setTimeout(() => common_vendor.index.navigateBack(), 1500);
          return;
        }
        this.detail = {
          recordId: null,
          // 本地记录无服务端 ID，置为 null
          mushroomId: record.mushroomId || 0,
          // 菌类业务 ID，缺失时兜底为 0
          mushroomName: record.mushroomName || record.className || "未知菌类",
          // 菌类名称，多字段容错
          confidence: record.confidence || (record.score ? parseFloat(record.score) : 0),
          // 置信度，兼容 score 字段（字符串转浮点数）
          isPoisonous: record.isPoisonous,
          // 毒性标识（0=无毒，1=有毒，2=未知）
          imageUrl: record.imageUrl,
          // 图片路径（本地临时路径或云端 URL）
          recognizeTime: record.recognizeTime || record.createTime,
          // 识别时间，多字段兼容
          deviceInfo: record.deviceInfo || "未知设备",
          // 识别设备型号，缺失时默认值
          inferModel: record.inferModel || 0
          // 推理模式：0=本地推理，1=云端推理
        };
        this.setPoisonInfo();
        common_vendor.index.__f__("log", "at pages/record-detail/record-detail.vue:202", "本地记录加载成功:", this.detail);
        if (this.detail.mushroomId && this.detail.mushroomId > 0) {
          common_vendor.index.__f__("log", "at pages/record-detail/record-detail.vue:207", "有 mushroomId，加载菌类百科详情:", this.detail.mushroomId);
          await this.loadMushroomDetail(this.detail.mushroomId);
        } else {
          this.mushroom = {};
          common_vendor.index.__f__("log", "at pages/record-detail/record-detail.vue:213", "未知菌类，无百科详情");
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/record-detail/record-detail.vue:219", "加载本地记录失败:", error);
        common_vendor.index.showToast({ title: "加载失败", icon: "none" });
        setTimeout(() => common_vendor.index.navigateBack(), 1500);
      }
    },
    // 新增：加载菌类百科详情（通过 mushroomId 查询）
    async loadMushroomDetail(mushroomId) {
      try {
        common_vendor.index.__f__("log", "at pages/record-detail/record-detail.vue:229", "开始加载菌类百科:", mushroomId);
        const response = await utils_api.mushroomDetail({
          mushroomId
        });
        common_vendor.index.__f__("log", "at pages/record-detail/record-detail.vue:235", "百科接口响应:", response);
        let data = null;
        if (response.code === 0 && response.data) {
          data = response.data;
        } else if (response.mushroomId) {
          data = response;
        }
        if (data) {
          this.mushroom = {
            scientificName: data.latinName || data.scientificName || "",
            category: data.category || "",
            description: data.description || "",
            edibleTips: data.edibleTips || "",
            toxicityLevel: data.toxicityLevel || ""
          };
          common_vendor.index.__f__("log", "at pages/record-detail/record-detail.vue:253", "百科详情加载成功:", this.mushroom);
          common_vendor.index.__f__("log", "at pages/record-detail/record-detail.vue:254", "百科字段检查:", {
            scientificName: this.mushroom.scientificName,
            category: this.mushroom.category,
            description: this.mushroom.description ? `有内容(${this.mushroom.description.length}字)` : "空",
            edibleTips: this.mushroom.edibleTips ? `有内容(${this.mushroom.edibleTips.length}字)` : "空",
            toxicityLevel: this.mushroom.toxicityLevel
          });
        } else {
          common_vendor.index.__f__("warn", "at pages/record-detail/record-detail.vue:262", "百科接口返回为空");
          this.mushroom = {};
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/record-detail/record-detail.vue:266", "加载菌类百科失败:", error);
        this.mushroom = {};
      }
    },
    // 核心方法：通过 recordId + userId 查询详情（仅用于云端记录）
    async loadRecordDetail() {
      common_vendor.index.showLoading({ title: "加载中..." });
      try {
        common_vendor.index.__f__("log", "at pages/record-detail/record-detail.vue:276", "开始请求详情:", { recordId: this.recordId, userId: this.userId });
        const response = await utils_api.recordDetail({
          recordId: this.recordId,
          userId: this.userId
        });
        common_vendor.index.__f__("log", "at pages/record-detail/record-detail.vue:283", "原始响应:", response);
        let data = null;
        if (response.code === 0 && response.data) {
          data = response.data;
          common_vendor.index.__f__("log", "at pages/record-detail/record-detail.vue:293", "标准响应格式");
        } else if (response.recordId) {
          data = response;
          common_vendor.index.__f__("log", "at pages/record-detail/record-detail.vue:297", "直接数据响应格式");
        }
        if (data) {
          common_vendor.index.__f__("log", "at pages/record-detail/record-detail.vue:301", "后端返回数据:", data);
          common_vendor.index.__f__("log", "at pages/record-detail/record-detail.vue:302", "检查关键字段:", {
            mushroomId: data.mushroomId,
            latinName: data.latinName,
            scientificName: data.scientificName,
            category: data.category,
            description: data.description ? "存在" : "不存在",
            edibleTips: data.edibleTips ? "存在" : "不存在",
            toxicityLevel: data.toxicityLevel
          });
          this.detail = {
            recordId: data.recordId,
            mushroomId: data.mushroomId,
            mushroomName: data.mushroomName || "未知菌类",
            confidence: data.confidence,
            isPoisonous: data.isPoisonous,
            imageUrl: this.normalizeImageUrl(data.imageUrl),
            recognizeTime: data.recognizeTime,
            deviceInfo: data.deviceInfo,
            inferModel: data.inferModel
          };
          common_vendor.index.__f__("log", "at pages/record-detail/record-detail.vue:325", "detail 已赋值:", this.detail);
          if (data.mushroomId && data.mushroomId > 0) {
            this.mushroom = {
              scientificName: data.latinName || data.scientificName || "",
              category: data.category || "",
              description: data.description || "",
              edibleTips: data.edibleTips || "",
              toxicityLevel: data.toxicityLevel || ""
            };
            common_vendor.index.__f__("log", "at pages/record-detail/record-detail.vue:337", "百科详情:", this.mushroom);
            common_vendor.index.__f__("log", "at pages/record-detail/record-detail.vue:338", "百科字段检查:", {
              scientificName: this.mushroom.scientificName,
              category: this.mushroom.category,
              description: this.mushroom.description ? `有内容(${this.mushroom.description.length}字)` : "空",
              edibleTips: this.mushroom.edibleTips ? `有内容(${this.mushroom.edibleTips.length}字)` : "空",
              toxicityLevel: this.mushroom.toxicityLevel
            });
          } else {
            this.mushroom = {};
            common_vendor.index.__f__("log", "at pages/record-detail/record-detail.vue:348", "未知菌类，无百科详情");
          }
          this.setPoisonInfo();
          common_vendor.index.__f__("log", "at pages/record-detail/record-detail.vue:354", "详情加载成功:", this.detail);
          common_vendor.index.__f__("log", "at pages/record-detail/record-detail.vue:355", "hasMushroomDetail:", this.hasMushroomDetail);
          common_vendor.index.hideLoading();
          common_vendor.index.showToast({ title: "加载成功", icon: "success", duration: 1e3 });
        } else {
          common_vendor.index.hideLoading();
          common_vendor.index.__f__("error", "at pages/record-detail/record-detail.vue:361", "接口返回错误:", response);
          common_vendor.index.showToast({ title: response.msg || "加载失败", icon: "none" });
          setTimeout(() => common_vendor.index.navigateBack(), 1500);
        }
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/record-detail/record-detail.vue:367", "加载记录详情失败:", error);
        common_vendor.index.showToast({ title: "加载失败，请重试", icon: "none" });
        setTimeout(() => common_vendor.index.navigateBack(), 1500);
      }
    },
    // 标准化图片 URL
    normalizeImageUrl(url) {
      if (!url)
        return "";
      if (url.startsWith("http") || url.startsWith("https") || url.startsWith("wxfile://")) {
        return url;
      }
      return utils_request.BASE_URL + url;
    },
    // 设置毒性标签
    setPoisonInfo() {
      switch (this.detail.isPoisonous) {
        case 0:
          this.poisonText = "可食用";
          this.poisonTagClass = "safe";
          break;
        case 1:
          this.poisonText = "有毒";
          this.poisonTagClass = "danger";
          break;
        case 2:
          this.poisonText = "需谨慎";
          this.poisonTagClass = "warning";
          break;
        default:
          this.poisonText = "未知";
          this.poisonTagClass = "unknown";
      }
    },
    // 格式化时间
    formatTime(timeStr) {
      if (!timeStr)
        return "";
      try {
        let d;
        if (typeof timeStr === "number") {
          d = new Date(timeStr);
        } else if (timeStr.includes("T")) {
          d = new Date(timeStr);
        } else {
          d = new Date(timeStr.replace(/-/g, "/"));
        }
        if (isNaN(d.getTime())) {
          common_vendor.index.__f__("error", "at pages/record-detail/record-detail.vue:426", "无效的时间格式:", timeStr);
          return String(timeStr);
        }
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, "0");
        const day = d.getDate().toString().padStart(2, "0");
        const hour = d.getHours().toString().padStart(2, "0");
        const minute = d.getMinutes().toString().padStart(2, "0");
        return `${year}-${month}-${day} ${hour}:${minute}`;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/record-detail/record-detail.vue:438", "时间格式化失败:", timeStr, error);
        return String(timeStr);
      }
    },
    // 格式化置信度
    formatConfidence(confidence) {
      common_vendor.index.__f__("log", "at pages/record-detail/record-detail.vue:445", "格式化置信度输入:", confidence, "类型:", typeof confidence);
      if (confidence === void 0 || confidence === null)
        return "0%";
      if (typeof confidence === "string" && confidence.includes("%"))
        return confidence;
      let numericConfidence = parseFloat(confidence);
      common_vendor.index.__f__("log", "at pages/record-detail/record-detail.vue:451", "转换为数值:", numericConfidence);
      if (numericConfidence < 1 && numericConfidence > 0) {
        common_vendor.index.__f__("log", "at pages/record-detail/record-detail.vue:455", "检测到小数形式的百分比，转换为标准百分比");
        numericConfidence = numericConfidence * 100;
      }
      const result = numericConfidence.toFixed(1) + "%";
      common_vendor.index.__f__("log", "at pages/record-detail/record-detail.vue:460", "格式化置信度输出:", result);
      return result;
    },
    // 跳转到反馈页面
    goToFeedback() {
      const params = {
        recordId: this.recordId || "",
        mushroomName: this.detail.mushroomName || "",
        confidence: this.detail.confidence || 0,
        imageUrl: encodeURIComponent(this.detail.imageUrl || "")
      };
      const query = Object.keys(params).map((key) => `${key}=${params[key]}`).join("&");
      common_vendor.index.__f__("log", "at pages/record-detail/record-detail.vue:478", "跳转到反馈页面:", params);
      common_vendor.index.navigateTo({
        url: `/pages/feedback/feedback?${query}`
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.detail.imageUrl
  }, $data.detail.imageUrl ? {
    b: $data.detail.imageUrl,
    c: common_vendor.o((...args) => $options.onImageError && $options.onImageError(...args))
  } : {}, {
    d: common_vendor.t($data.detail.mushroomName || "未知菌类"),
    e: $data.poisonText
  }, $data.poisonText ? {
    f: common_vendor.t($data.poisonText),
    g: common_vendor.n($data.poisonTagClass)
  } : {}, {
    h: common_vendor.t($options.formatConfidence($data.detail.confidence)),
    i: $data.detail.recognizeTime
  }, $data.detail.recognizeTime ? {
    j: common_vendor.t($options.formatTime($data.detail.recognizeTime))
  } : {}, {
    k: $data.detail.deviceInfo
  }, $data.detail.deviceInfo ? {
    l: common_vendor.t($data.detail.deviceInfo)
  } : {}, {
    m: common_vendor.t($data.detail.inferModel === 0 ? "本地模型" : "云端推理"),
    n: common_vendor.o((...args) => $options.goToFeedback && $options.goToFeedback(...args)),
    o: $options.hasMushroomDetail
  }, $options.hasMushroomDetail ? common_vendor.e({
    p: $data.mushroom.scientificName
  }, $data.mushroom.scientificName ? {
    q: common_vendor.t($data.mushroom.scientificName)
  } : {}, {
    r: $data.mushroom.category
  }, $data.mushroom.category ? {
    s: common_vendor.t($data.mushroom.category)
  } : {}, {
    t: $data.mushroom.description
  }, $data.mushroom.description ? {
    v: common_vendor.t($data.mushroom.description)
  } : {}, {
    w: $data.mushroom.edibleTips
  }, $data.mushroom.edibleTips ? {
    x: common_vendor.t($data.mushroom.edibleTips)
  } : {}, {
    y: $data.mushroom.toxicityLevel
  }, $data.mushroom.toxicityLevel ? {
    z: common_vendor.t($data.mushroom.toxicityLevel)
  } : {}) : $data.detail.mushroomName ? {} : {}, {
    A: $data.detail.mushroomName
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-3aa3bc74"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/record-detail/record-detail.js.map
