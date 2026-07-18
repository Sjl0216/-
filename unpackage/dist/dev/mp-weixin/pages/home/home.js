"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_mushroomMeta = require("../../utils/mushroom-meta.js");
const utils_auth = require("../../utils/auth.js");
const utils_request = require("../../utils/request.js");
const utils_modelLoader = require("../../utils/model-loader.js");
const utils_modelCache = require("../../utils/model-cache.js");
(function() {
  const keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  common_vendor.wx$1.atob = global.atob = function(input) {
    let output = "";
    let chr1, chr2, chr3;
    let enc1, enc2, enc3, enc4;
    let i = 0;
    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
    while (i < input.length) {
      enc1 = keyStr.indexOf(input.charAt(i++));
      enc2 = keyStr.indexOf(input.charAt(i++));
      enc3 = keyStr.indexOf(input.charAt(i++));
      enc4 = keyStr.indexOf(input.charAt(i++));
      chr1 = enc1 << 2 | enc2 >> 4;
      chr2 = (enc2 & 15) << 4 | enc3 >> 2;
      chr3 = (enc3 & 3) << 6 | enc4;
      output = output + String.fromCharCode(chr1);
      if (enc3 !== 64)
        output = output + String.fromCharCode(chr2);
      if (enc4 !== 64)
        output = output + String.fromCharCode(chr3);
    }
    return output;
  };
  common_vendor.wx$1.btoa = global.btoa = function(input) {
    let output = "";
    let chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    let i = 0;
    input = unescape(encodeURIComponent(input));
    while (i < input.length) {
      chr1 = input.charCodeAt(i++);
      chr2 = input.charCodeAt(i++);
      chr3 = input.charCodeAt(i++);
      enc1 = chr1 >> 2;
      enc2 = (chr1 & 3) << 4 | chr2 >> 4;
      enc3 = (chr2 & 15) << 2 | chr3 >> 6;
      enc4 = chr3 & 63;
      if (isNaN(chr2))
        enc3 = enc4 = 64;
      else if (isNaN(chr3))
        enc4 = 64;
      output = output + keyStr.charAt(enc1) + keyStr.charAt(enc2) + keyStr.charAt(enc3) + keyStr.charAt(enc4);
    }
    return output;
  };
})();
const MODEL_KEY = "yolo_int8_v1";
const OSS_MODEL_JSON_URL = "https://java-springboot-yunnanmushroom.oss-cn-beijing.aliyuncs.com/model/model.json";
let yolov8Model = null;
function iou(a, b) {
  const x1 = Math.max(a.x1, b.x1);
  const y1 = Math.max(a.y1, b.y1);
  const x2 = Math.min(a.x2, b.x2);
  const y2 = Math.min(a.y2, b.y2);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = (a.x2 - a.x1) * (a.y2 - a.y1);
  const areaB = (b.x2 - b.x1) * (b.y2 - b.y1);
  return inter / (areaA + areaB - inter + 1e-9);
}
function nms(boxes, iouThresh = 0.45) {
  boxes.sort((a, b) => b.score - a.score);
  const kept = [];
  for (const box of boxes) {
    let ok = true;
    for (const k of kept) {
      if (iou(box, k) > iouThresh) {
        ok = false;
        break;
      }
    }
    if (ok)
      kept.push(box);
  }
  return kept;
}
function decodeYoloV8(outputData, shape, confThresh = 0.4) {
  const C = shape[1];
  const N = shape[2];
  const numClasses = C - 4;
  const boxes = [];
  for (let i = 0; i < N; i++) {
    const cx = outputData[0 * N + i];
    const cy = outputData[1 * N + i];
    const w = outputData[2 * N + i];
    const h = outputData[3 * N + i];
    let bestScore = 0;
    let bestClass = -1;
    for (let c = 0; c < numClasses; c++) {
      const score = outputData[(4 + c) * N + i];
      if (score > bestScore) {
        bestScore = score;
        bestClass = c;
      }
    }
    if (bestScore > confThresh) {
      boxes.push({
        x1: cx - w / 2,
        y1: cy - h / 2,
        x2: cx + w / 2,
        y2: cy + h / 2,
        score: bestScore,
        class: bestClass
      });
    }
  }
  return boxes;
}
let tfInitialized = false;
async function initTensorFlow() {
  if (tfInitialized)
    return true;
  try {
    await common_vendor.setBackend("cpu");
    await common_vendor.ready();
    common_vendor.index.__f__("log", "at pages/home/home.vue:227", "TFJS 2.8.6 初始化成功 后端:", common_vendor.getBackend());
    tfInitialized = true;
    return true;
  } catch (e) {
    common_vendor.index.__f__("error", "at pages/home/home.vue:231", "TFJS 初始化失败:", e);
    return false;
  }
}
const _sfc_main = {
  data() {
    return {
      imgUrl: "",
      imgWidth: 0,
      imgHeight: 0,
      isModelLoaded: false,
      results: [],
      userId: utils_auth.getUserIdOrDefault(),
      // 认证状态相关
      authBanner: "",
      bannerType: ""
    };
  },
  // 页面加载生命周期：初始化 TensorFlow 并加载 YOLOv8 AI 模型
  // 策略：优先本地缓存，支持离线使用；网络异常时自动降级处理
  async onLoad() {
    common_vendor.index.showLoading({ title: "加载模型中..." });
    try {
      await initTensorFlow();
      const online = await utils_modelLoader.checkNetworkStatus();
      const ready = utils_modelCache.isLocalModelReady(MODEL_KEY);
      const dir = utils_modelCache.getLocalModelDir(MODEL_KEY);
      common_vendor.index.__f__("log", "at pages/home/home.vue:263", "网络状态:", online);
      common_vendor.index.__f__("log", "at pages/home/home.vue:264", "本地模型就绪:", ready);
      common_vendor.index.__f__("log", "at pages/home/home.vue:265", "本地模型目录:", dir);
      if (!ready) {
        if (!online) {
          common_vendor.index.__f__("log", "at pages/home/home.vue:272", "离线模式且无本地模型，仅支持图片显示");
          this.isModelLoaded = false;
          common_vendor.index.hideLoading();
          common_vendor.index.showToast({ title: "离线模式：仅支持图片显示", icon: "none", duration: 3e3 });
          return;
        }
        common_vendor.index.__f__("log", "at pages/home/home.vue:280", "开始缓存模型...");
        await utils_modelCache.cacheTfjsGraphModelFromOss({
          modelJsonUrl: OSS_MODEL_JSON_URL,
          // 模型 JSON 结构文件的 OSS 地址
          modelKey: MODEL_KEY
          // 模型唯一标识符，用于本地存储索引
        });
        common_vendor.index.__f__("log", "at pages/home/home.vue:285", "模型缓存完成");
      }
      common_vendor.index.__f__("log", "at pages/home/home.vue:290", "开始加载本地模型...");
      try {
        yolov8Model = await utils_modelLoader.loadLocalTfjsModel(MODEL_KEY);
        common_vendor.index.__f__("log", "at pages/home/home.vue:295", "本地模型加载成功");
        this.isModelLoaded = true;
        common_vendor.index.showToast({ title: "模型加载成功", icon: "success" });
      } catch (modelError) {
        common_vendor.index.__f__("error", "at pages/home/home.vue:300", "本地模型加载失败:", modelError);
        this.isModelLoaded = false;
        common_vendor.index.showToast({ title: "模型加载失败，仅支持图片显示", icon: "none", duration: 3e3 });
      }
      common_vendor.index.hideLoading();
      common_vendor.index.__f__("log", "at pages/home/home.vue:308", "页面加载完成");
    } catch (e) {
      common_vendor.index.hideLoading();
      this.isModelLoaded = false;
      common_vendor.index.__f__("error", "at pages/home/home.vue:314", "完整错误信息:", e);
      common_vendor.index.__f__("error", "at pages/home/home.vue:315", "错误堆栈:", e.stack);
      common_vendor.index.showToast({ title: "初始化失败，仅支持图片显示", icon: "none", duration: 3e3 });
    }
  },
  async onShow() {
    this.updateAuthBanner();
    common_vendor.index.__f__("log", "at pages/home/home.vue:326", "首页 onShow - 检查待同步队列");
    this.syncQueue();
  },
  onUnload() {
    try {
      if (yolov8Model == null ? void 0 : yolov8Model.dispose) {
        yolov8Model.dispose();
        yolov8Model = null;
      }
      if (common_vendor.disposeVariables)
        common_vendor.disposeVariables();
    } catch (e) {
      common_vendor.index.__f__("warn", "at pages/home/home.vue:340", "onUnload cleanup error:", e);
    }
  },
  methods: {
    async downloadModel() {
      try {
        common_vendor.index.showLoading({ title: "下载模型中..." });
        const online = await utils_modelLoader.checkNetworkStatus();
        if (!online) {
          common_vendor.index.showToast({ title: "请连接网络后重试", icon: "none" });
          return;
        }
        common_vendor.index.__f__("log", "at pages/home/home.vue:354", "开始下载AI模型...");
        await utils_modelCache.cacheTfjsGraphModelFromOss({
          modelJsonUrl: OSS_MODEL_JSON_URL,
          modelKey: MODEL_KEY
        });
        common_vendor.index.__f__("log", "at pages/home/home.vue:361", "模型下载完成，尝试加载...");
        try {
          yolov8Model = await utils_modelLoader.loadLocalTfjsModel(MODEL_KEY);
          this.isModelLoaded = true;
          common_vendor.index.hideLoading();
          common_vendor.index.showToast({ title: "模型下载并加载成功！", icon: "success" });
          common_vendor.index.__f__("log", "at pages/home/home.vue:367", "模型准备就绪");
        } catch (loadModelError) {
          common_vendor.index.__f__("error", "at pages/home/home.vue:369", "模型加载失败，但仍可使用基础功能:", loadModelError);
          this.isModelLoaded = false;
          common_vendor.index.hideLoading();
          common_vendor.index.showToast({
            title: "模型下载完成，但加载失败。可使用图片功能",
            icon: "none",
            duration: 3e3
          });
        }
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/home/home.vue:381", "模型下载失败:", error);
        common_vendor.index.showToast({ title: "模型下载失败：" + error.message, icon: "none" });
      }
    },
    async chooseImage() {
      this.results = [];
      common_vendor.index.chooseImage({
        count: 1,
        sizeType: ["original"],
        sourceType: ["album", "camera"],
        success: async (res) => {
          const tempFilePath = res.tempFilePaths[0];
          this.imgUrl = tempFilePath;
          const network = await utils_request.checkNetwork();
          if (network.isGood) {
            common_vendor.index.__f__("log", "at pages/home/home.vue:403", "网络良好，调用云端推理");
            await this.cloudPredict(tempFilePath);
          } else {
            common_vendor.index.__f__("log", "at pages/home/home.vue:407", "网络不佳，使用本地模型");
            await this.getImageInfo();
            await this.drawImage();
            if (this.isModelLoaded) {
              await this.localPredict();
            } else {
              common_vendor.index.showToast({ title: "模型未加载，仅显示图片", icon: "none", duration: 2e3 });
            }
          }
        }
      });
    },
    getImageInfo() {
      return new Promise((resolve) => {
        common_vendor.index.getImageInfo({
          src: this.imgUrl,
          success: (info) => {
            const sys = common_vendor.index.getSystemInfoSync();
            const displayW = sys.windowWidth - 40;
            const ratio = info.width / displayW;
            this.imgWidth = displayW;
            this.imgHeight = info.height / ratio;
            common_vendor.index.__f__("log", "at pages/home/home.vue:434", "图片原始尺寸:", info.width, "x", info.height);
            common_vendor.index.__f__("log", "at pages/home/home.vue:435", "计算后尺寸:", this.imgWidth, "x", this.imgHeight);
            resolve();
          }
        });
      });
    },
    drawImage() {
      return new Promise((resolve) => {
        const canvasCtx = common_vendor.wx$1.createCanvasContext("detectCanvas");
        canvasCtx.drawImage(this.imgUrl, 0, 0, this.imgWidth, this.imgHeight);
        canvasCtx.draw(false, () => {
          setTimeout(resolve, 200);
        });
      });
    },
    // 云端识别：将图片上传至服务器进行 AI 推理
    // 流程：上传图片 -> 后端处理 -> 返回识别结果 -> 本地缓存 -> 绘制显示
    async cloudPredict(tempFilePath) {
      common_vendor.index.showLoading({ title: "云端识别中..." });
      return new Promise((resolve, reject) => {
        common_vendor.index.uploadFile({
          url: utils_request.BASE_URL + "/api/recognition/predict",
          // 后端识别 API 端点
          filePath: tempFilePath,
          // 本地图片临时路径
          name: "image",
          // 表单字段名
          formData: {
            userId: this.userId,
            // 用户 ID，用于关联记录
            inferModel: 1,
            // 1 = 云端推理模式
            deviceInfo: common_vendor.index.getSystemInfoSync().model || "unknown"
            // 设备型号信息
          },
          success: async (res) => {
            common_vendor.index.hideLoading();
            try {
              const response = JSON.parse(res.data);
              if (response.code === 0 && response.data) {
                const record = response.data;
                common_vendor.index.__f__("log", "at pages/home/home.vue:475", "云端识别成功:", record);
                this.displayCloudResult(record);
                this.saveCloudResultToCache(record);
                await this.getImageInfo();
                await this.drawImage();
                common_vendor.index.showToast({ title: "识别完成", icon: "success" });
                resolve(record);
              } else {
                throw new Error(response.msg || "识别失败");
              }
            } catch (e) {
              common_vendor.index.__f__("error", "at pages/home/home.vue:493", "云端识别失败:", e);
              common_vendor.index.showToast({ title: e.message || "识别异常", icon: "none" });
              reject(e);
            }
          },
          fail: (err) => {
            common_vendor.index.hideLoading();
            common_vendor.index.__f__("error", "at pages/home/home.vue:500", "上传失败:", err);
            common_vendor.index.showToast({ title: "网络请求失败", icon: "none" });
            reject(err);
          }
        });
      });
    },
    // 本地识别：使用 TensorFlow.js 模型在设备端进行 AI 推理
    // 流程：OffscreenCanvas 预处理 -> 张量转换 -> 模型推理 -> NMS 后处理 -> 坐标映射 -> 缓存同步
    async localPredict() {
      common_vendor.index.showLoading({ title: "正在识别..." });
      try {
        const canvas = common_vendor.wx$1.createOffscreenCanvas({ type: "2d" });
        const ctx = canvas.getContext("2d");
        const img = canvas.createImage();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = this.imgUrl;
        });
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const inputTensor = common_vendor.tidy(() => {
          const rgba = common_vendor.tensor3d(new Uint8Array(data), [height, width, 4], "int32");
          return rgba.slice([0, 0, 0], [height, width, 3]).resizeBilinear([640, 640]).expandDims(0).toFloat().div(255);
        });
        common_vendor.index.__f__("log", "at pages/home/home.vue:546", "执行推理...");
        const predictResult = await yolov8Model.executeAsync(inputTensor);
        const outputTensor = Array.isArray(predictResult) ? predictResult[0] : predictResult;
        const rawData = await outputTensor.data();
        const shape = outputTensor.shape;
        common_vendor.index.__f__("log", "at pages/home/home.vue:553", "原始数据形态:", shape);
        let boxes = decodeYoloV8(rawData, shape, 0.4);
        boxes = nms(boxes, 0.45);
        common_vendor.index.__f__("log", "at pages/home/home.vue:561", "本地识别到", boxes.length, "个目标");
        const finalBoxes = boxes.map((b) => {
          const classId = b.class;
          const meta = utils_mushroomMeta.MUSHROOM_META[String(classId)];
          const isInvalid = !meta || !meta.id || meta.id === -1;
          const mushroomId = isInvalid ? 0 : meta.id;
          const className = isInvalid ? "未知菌类" : meta.name;
          const isPoisonous = isInvalid ? 2 : meta.isPoisonous;
          return {
            x: (b.x1 + (b.x2 - b.x1) / 2) * (this.imgWidth / 640),
            // 中心点 X
            y: (b.y1 + (b.y2 - b.y1) / 2) * (this.imgHeight / 640),
            // 中心点 Y
            w: (b.x2 - b.x1) * (this.imgWidth / 640),
            // 宽度
            h: (b.y2 - b.y1) * (this.imgHeight / 640),
            // 高度
            score: (b.score * 100).toFixed(1) + "%",
            // 置信度百分比
            className,
            // 菌类名称
            classIndex: classId,
            // 类别索引
            isPoisonous,
            // 毒性标识（0=无毒，1=有毒，2=未知）
            mushroomId
            // 业务数据库 ID
          };
        });
        this.results = finalBoxes;
        this.drawDetectBoxes(finalBoxes);
        if (finalBoxes.length > 0) {
          const best = [...finalBoxes].sort((a, b) => parseFloat(b.score) - parseFloat(a.score))[0];
          await this.saveLocalRecordToCache({
            imgTempPath: this.imgUrl,
            // 图片临时路径
            best,
            // 最佳检测结果
            allResults: finalBoxes
            // 全部检测结果
          });
          this.syncQueue();
        }
        inputTensor.dispose();
        if (Array.isArray(predictResult)) {
          predictResult.forEach((t) => t.dispose());
        } else {
          predictResult.dispose();
        }
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: `检测到 ${finalBoxes.length} 个目标`, icon: "success" });
        common_vendor.index.__f__("log", "at pages/home/home.vue:620", `推理完成，找到 ${finalBoxes.length} 个结果`);
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/home/home.vue:623", "识别失败:", error);
        common_vendor.index.showToast({ title: "识别异常", icon: "none" });
      }
    },
    // 显示云端识别结果
    displayCloudResult(record) {
      const displayItem = {
        className: record.mushroomName || "未知菌类",
        score: `${record.confidence}%`,
        isPoisonous: record.isPoisonous,
        mushroomId: record.mushroomId,
        recordId: record.recordId,
        // 保存 recordId 用于跳转
        imageUrl: record.imageUrl,
        // 保存图片 URL
        isCloudResult: true
        // 标记为云端识别结果
      };
      this.results = [displayItem];
      if (record.imageUrl) {
        this.imgUrl = record.imageUrl;
        common_vendor.index.__f__("log", "at pages/home/home.vue:646", "设置云端图片URL:", this.imgUrl);
      }
      common_vendor.index.setStorageSync(`last_result_${this.userId}`, {
        ...record,
        displayTime: Date.now()
      });
    },
    // 云端结果写入本地缓存
    saveCloudResultToCache(record) {
      const cacheKey = `mushroom_records_${this.userId}`;
      const records = common_vendor.index.getStorageSync(cacheKey) || [];
      const cacheItem = {
        rid: `cloud_${record.recordId}`,
        recordId: record.recordId,
        userId: this.userId,
        imageUrl: record.imageUrl,
        mushroomId: record.mushroomId,
        mushroomName: record.mushroomName,
        confidence: record.confidence,
        isPoisonous: record.isPoisonous,
        recognizeTime: Date.now(),
        source: "cloud"
      };
      records.unshift(cacheItem);
      common_vendor.index.setStorageSync(cacheKey, records.slice(0, 200));
      common_vendor.index.__f__("log", "at pages/home/home.vue:677", "云端记录已写入缓存");
    },
    // 绘制识别框
    drawDetectBoxes(boxes) {
      const ctx = common_vendor.wx$1.createCanvasContext("detectCanvas");
      ctx.clearRect(0, 0, this.imgWidth, this.imgHeight);
      boxes.forEach((box) => {
        const left = box.x - box.w / 2;
        const top = box.y - box.h / 2;
        ctx.setStrokeStyle("#ff0000");
        ctx.setLineWidth(2);
        ctx.strokeRect(left, top, box.w, box.h);
        ctx.setFillStyle("#ff0000");
        ctx.fillRect(left, top - 20, 160, 20);
        ctx.setFillStyle("#ffffff");
        ctx.setFontSize(12);
        ctx.fillText(`${box.className} ${box.score}`, left + 5, top - 5);
      });
      ctx.draw(false);
    },
    //  本地识别结果写入缓存 + 入队
    async saveLocalRecordToCache({ imgTempPath, best, allResults }) {
      const now = Date.now();
      const rid = `${now}_${Math.random().toString(16).slice(2)}`;
      let savedPath = imgTempPath;
      try {
        const saveRes = await new Promise((resolve, reject) => {
          common_vendor.wx$1.saveFile({
            tempFilePath: imgTempPath,
            success: resolve,
            fail: reject
          });
        });
        savedPath = saveRes.savedFilePath;
      } catch (e) {
        common_vendor.index.__f__("warn", "at pages/home/home.vue:718", "图片持久化失败:", e);
      }
      const isUnknown = !best.mushroomId || best.mushroomId <= 0 || best.className === "未知菌类";
      const safeMushroomId = isUnknown ? 0 : best.mushroomId;
      const safePoison = isUnknown ? 2 : best.isPoisonous;
      const safeName = isUnknown ? "未知菌类" : best.className;
      const safeConfidence = Number(parseFloat(best.score).toFixed(2));
      const record = {
        rid,
        recordId: null,
        userId: this.userId,
        imageUrl: savedPath,
        mushroomId: safeMushroomId,
        // 强制业务 ID 兜底
        mushroomName: safeName,
        confidence: safeConfidence,
        isPoisonous: safePoison,
        recognizeTime: now,
        createTime: now,
        results: allResults,
        source: "local_history"
      };
      const cacheKey = `mushroom_records_${this.userId}`;
      const records = common_vendor.index.getStorageSync(cacheKey) || [];
      records.unshift(record);
      common_vendor.index.setStorageSync(cacheKey, records.slice(0, 200));
      this.enqueueLocalRecord(record);
      common_vendor.index.setStorageSync(`last_result_${this.userId}`, {
        ...record,
        displayTime: Date.now()
      });
      common_vendor.index.__f__("log", "at pages/home/home.vue:762", "本地记录已写入缓存+队列, 安全ID:", safeMushroomId);
    },
    //  本地记录入队（仅本地推理）
    enqueueLocalRecord(record) {
      const key = `pending_queue_${this.userId}`;
      const queue = common_vendor.index.getStorageSync(key) || [];
      const syncItem = {
        localId: record.rid,
        userId: this.userId,
        mushroomId: record.mushroomId,
        mushroomName: record.mushroomName,
        // 新增：保留识别名称，用于无感显示
        confidence: record.confidence,
        isPoisonous: record.isPoisonous,
        deviceInfo: common_vendor.index.getSystemInfoSync().model || "",
        imagePath: record.imageUrl,
        createTime: record.createTime,
        tryCount: 0
      };
      queue.push(syncItem);
      common_vendor.index.setStorageSync(key, queue);
      common_vendor.index.__f__("log", "at pages/home/home.vue:786", "记录已入同步队列");
    },
    // 尝试同步队列
    async syncQueue() {
      const network = await utils_request.checkNetwork();
      if (!network.isGood) {
        common_vendor.index.__f__("log", "at pages/home/home.vue:792", "当前网络环境不佳，跳过自动同步");
        return;
      }
      common_vendor.index.__f__("log", "at pages/home/home.vue:795", "网络环境良好，开始同步队列...");
      await this.uploadQueue(this.userId);
    },
    // 执行队列上传
    async uploadQueue(userId) {
      const key = `pending_queue_${userId}`;
      const list = common_vendor.index.getStorageSync(key) || [];
      if (!list.length)
        return;
      const remain = [];
      for (const item of list) {
        try {
          await this.uploadLocalRecord(item);
          common_vendor.index.__f__("log", "at pages/home/home.vue:808", "同步成功:", item.localId);
        } catch (e) {
          common_vendor.index.__f__("error", "at pages/home/home.vue:810", "同步失败:", item.localId, e);
          item.tryCount = (item.tryCount || 0) + 1;
          if (item.tryCount < 3)
            remain.push(item);
        }
      }
      common_vendor.index.setStorageSync(key, remain);
      common_vendor.index.__f__("log", "at pages/home/home.vue:816", "同步完成，剩余待同步记录:", remain.length);
    },
    // 上传单条本地记录到服务器（同步接口）
    uploadLocalRecord(item) {
      return new Promise((resolve, reject) => {
        const pureConfidence = typeof item.confidence === "string" ? parseFloat(item.confidence.replace("%", "")) : item.confidence;
        common_vendor.index.uploadFile({
          url: utils_request.BASE_URL + "/api/recognition/report",
          // 上报本地识别结果 
          filePath: item.imagePath,
          name: "image",
          formData: {
            userId: item.userId,
            mushroomId: item.mushroomId,
            //  关键：把前端锁定的 ID 0 传回后端
            confidence: pureConfidence,
            //  关键：把前端的置信度传回后端
            isPoisonous: item.isPoisonous,
            inferModel: 0,
            deviceInfo: item.deviceInfo || "offline_sync"
          },
          success: (res) => {
            common_vendor.index.__f__("log", "at pages/home/home.vue:839", "同步接口原始返回:", res.data);
            try {
              const data = JSON.parse(res.data);
              const isSuccess = data.code === 0 || data.recordId || data.id || data.success === true;
              if (isSuccess) {
                resolve(data.data || data);
              } else {
                reject(new Error(data.msg || "后端业务报错"));
              }
            } catch (e) {
              if (res.statusCode === 200 && res.data && res.data.length < 500) {
                resolve(res.data);
              } else {
                reject(new Error(`服务器响应异常(${res.statusCode})`));
              }
            }
          },
          fail: (err) => {
            common_vendor.index.__f__("error", "at pages/home/home.vue:860", "上传网络失败:", err);
            reject(err);
          }
        });
      });
    },
    // 跳转到识别记录详情页面
    goToDetail(item) {
      common_vendor.index.__f__("log", "at pages/home/home.vue:868", "点击跳转，数据:", item);
      const app = getApp();
      if (app && app.safeNavigateTo) {
        if (item.isCloudResult && item.recordId) {
          const url = `/pages/record-detail/record-detail?recordId=${item.recordId}`;
          common_vendor.index.__f__("log", "at pages/home/home.vue:877", "云端识别，跳转到记录详情页:", url);
          app.safeNavigateTo(url);
        } else {
          const url = `/pages/mushroom-detail/mushroom-detail?mushroomName=${encodeURIComponent(item.className)}&classId=${item.classIndex}&imgUrl=${encodeURIComponent(this.imgUrl)}`;
          common_vendor.index.__f__("log", "at pages/home/home.vue:882", "本地识别，跳转到菌类详情页:", url);
          app.safeNavigateTo(url);
        }
      } else {
        common_vendor.index.__f__("warn", "at pages/home/home.vue:887", "安全跳转方法不可用，使用普通跳转");
        this.performNavigation(item);
      }
    },
    // 执行实际跳转（降级处理）
    performNavigation(item) {
      if (item.isCloudResult && item.recordId) {
        const url = `/pages/record-detail/record-detail?recordId=${item.recordId}`;
        common_vendor.index.__f__("log", "at pages/home/home.vue:898", "云端识别，跳转到记录详情页:", url);
        common_vendor.index.navigateTo({
          url,
          fail: (err) => {
            common_vendor.index.__f__("error", "at pages/home/home.vue:903", "跳转失败:", err);
            common_vendor.index.showToast({ title: "无法打开详情页", icon: "none" });
          }
        });
      } else {
        const url = `/pages/mushroom-detail/mushroom-detail?mushroomName=${encodeURIComponent(item.className)}&classId=${item.classIndex}&imgUrl=${encodeURIComponent(this.imgUrl)}`;
        common_vendor.index.__f__("log", "at pages/home/home.vue:910", " 本地识别，跳转到菌类详科页:", url);
        common_vendor.index.navigateTo({
          url,
          fail: (err) => {
            common_vendor.index.__f__("error", "at pages/home/home.vue:915", "跳转失败:", err);
            common_vendor.index.showToast({ title: "无法打开详情页", icon: "none" });
          }
        });
      }
    },
    // 图片加载失败处理
    onImageError(e) {
      common_vendor.index.__f__("error", "at pages/home/home.vue:924", "图片加载失败:", this.imgUrl, e);
      common_vendor.index.showToast({
        title: "图片加载失败",
        icon: "none"
      });
    },
    // 图片加载成功处理
    onImageLoad() {
      common_vendor.index.__f__("log", "at pages/home/home.vue:933", "图片加载成功");
    },
    // 更新认证状态横幅
    updateAuthBanner() {
      const app = getApp();
      const state = app.globalData.authState;
      const pendingCount = (common_vendor.index.getStorageSync("pendingQueue") || []).length;
      switch (state) {
        case "OFFLINE_CACHED":
          this.authBanner = `离线可用：待同步 ${pendingCount} 条`;
          this.bannerType = "info";
          break;
        case "OFFLINE_GUEST":
          this.authBanner = "离线游客模式：联网后可登录同步";
          this.bannerType = "warning";
          break;
        case "ONLINE_NEED_LOGIN":
          this.authBanner = "登录失败：可先离线识别，稍后重试";
          this.bannerType = "error";
          break;
        default:
          this.authBanner = "";
          this.bannerType = "";
      }
    },
    // 手动重试登录
    async retryLogin() {
      const app = getApp();
      await onNetworkBack(app);
      this.updateAuthBanner();
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.authBanner
  }, $data.authBanner ? {
    b: common_vendor.t($data.authBanner),
    c: common_vendor.n($data.bannerType)
  } : {}, {
    d: $data.imgUrl
  }, $data.imgUrl ? {
    e: $data.imgUrl,
    f: $data.imgWidth + "px",
    g: $data.imgHeight + "px",
    h: common_vendor.o((...args) => $options.onImageError && $options.onImageError(...args)),
    i: common_vendor.o((...args) => $options.onImageLoad && $options.onImageLoad(...args)),
    j: $data.imgWidth + "px",
    k: $data.imgHeight + "px"
  } : {}, {
    l: $data.results.length > 0
  }, $data.results.length > 0 ? {
    m: common_vendor.t($data.results.length),
    n: common_vendor.f($data.results, (item, index, i0) => {
      return {
        a: common_vendor.t(item.className),
        b: common_vendor.t(item.isPoisonous === 1 ? "有毒" : item.isPoisonous === 2 ? "需谨慎" : "可食用"),
        c: common_vendor.n(item.isPoisonous === 1 ? "tag-danger" : item.isPoisonous === 2 ? "tag-warning" : "tag-safe"),
        d: common_vendor.t(item.score),
        e: index,
        f: common_vendor.o(($event) => $options.goToDetail(item), index)
      };
    })
  } : {}, {
    o: $data.isModelLoaded
  }, $data.isModelLoaded ? {
    p: common_vendor.o((...args) => $options.chooseImage && $options.chooseImage(...args))
  } : {
    q: common_vendor.o((...args) => $options.downloadModel && $options.downloadModel(...args))
  }, {
    r: !$data.isModelLoaded
  }, !$data.isModelLoaded ? {} : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-07e72d3c"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/home/home.js.map
