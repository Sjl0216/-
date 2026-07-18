# 微信小程序项目说明文档
本系统选用轻量化目标检测模型YOLOv8系列算法作为主要识别算法，并据此 设计了云端识别、本地识别相结合的识别方法：在网络条件良好时程序用服务器端模型做图像推理，网络条件不好 时则采用本地模型保证识别流程的连续性，提高了系统在不同使用场景下的可用性。本从功能上实现了用户端野生 菌拍照识别、识别结果展示等多个功能，本系统还设计了管理端用来处理野生菌信息维护、识别记录管理、用户管 理多种业务。

## 1. 项目简介

本项目为“基于微信小程序的野生菌智能识别系统”的用户端，采用 uni-app 构建，面向普通用户提供微信小程序端使用入口。

结合当前代码实现，小程序的核心用途主要包括：

- 拍照或从相册选择野生菌图片；
- 根据网络状态执行云端识别或本地识别；
- 展示识别结果、毒性提示和菌类名称；
- 查看野生菌科普信息；
- 查看识别历史记录；
- 提交识别错误或使用问题反馈；
- 维护用户基础信息，并支持一定程度的离线使用。

从页面结构与业务代码看，本项目定位为普通用户使用的前端识别与查询终端，不包含后端管理功能。

## 2. 技术栈

根据 `package.json`、`manifest.json`、页面代码与工具模块，项目实际使用的主要技术如下：

- `uni-app`
- `Vue`（`manifest.json` 中配置为 `vueVersion: "3"`，`main.js` 同时保留了 Vue2/Vue3 条件启动代码）
- 微信小程序原生能力：
  - `uni.chooseImage`
  - `uni.request`
  - `uni.uploadFile`
  - `uni.getImageInfo`
  - `wx.createCanvasContext`
  - `wx.createOffscreenCanvas`
  - `wx.getFileSystemManager`
  - `uni.login`
  - `uni.onNetworkStatusChange`
- 本地存储与缓存：
  - `uni.setStorageSync`
  - `uni.getStorageSync`
  - `wx.saveFile`
- TensorFlow.js 本地推理：
  - `@tensorflow/tfjs-core`
  - `@tensorflow/tfjs-backend-cpu`
  - `@tensorflow/tfjs-converter`
  - 页面中本地模型推理逻辑主要位于 `pages/home/home.vue`
  - 推理后处理核心位于 `utils/local-infer-core.js`
- 图像预处理与绘制：
  - 使用离屏 Canvas 读取像素、生成 RGB 数据
  - 使用普通 Canvas 叠加绘制检测框
- 网络状态与离线认证：
  - `utils/network-detector.js`
  - `utils/offline-auth.js`
  - `utils/auth-manager.js`

补充说明：

- 当前主流程中的本地识别模型不是直接从代码仓库内现成模型文件加载，而是优先检查本地缓存，不存在时从 OSS 下载并缓存到小程序本地文件系统。
- `pkg-ai/pages/recognize/home.vue`、`utils/package-loader.js`、`utils/makePackageFetch.js` 显示项目曾保留“分包内模型加载”方案；但当前 `pages.json` 未注册该页面，且 `pkg-ai/models/yolov8n_int8/` 目录下未发现实际模型文件，因此该方案是否仍在使用，需人工确认。

## 3. 项目目录结构

以下为结合当前仓库整理后的核心目录与关键文件说明：

```text
uni-app-mushroom-weichat/
├─ pages/                           小程序主页面目录
│  ├─ login/login.vue               登录页，支持微信登录与离线进入
│  ├─ home/home.vue                 首页，图片选择、云端/本地识别、本地缓存与同步主流程
│  ├─ record-list/record-list.vue   识别记录列表页
│  ├─ record-detail/record-detail.vue 识别记录详情页，兼容本地记录与云端记录
│  ├─ mushroom-list/mushroom-list.vue 野生菌科普列表页
│  ├─ mushroom-detail/mushroom-detail.vue 野生菌科普详情页
│  ├─ feedback/feedback.vue         反馈提交页
│  ├─ feedback-list/feedback-list.vue 反馈记录页
│  ├─ feedback-result/feedback-result.vue 反馈处理结果页
│  ├─ settings/settings.vue         设置页
│  ├─ user-profile/user-profile.vue 个人信息页
│  └─ result/result.vue             独立结果页，当前主流程未见直接跳转，需人工确认
├─ utils/                           公共工具与业务封装
│  ├─ api.js                        前端接口统一封装
│  ├─ request.js                    请求与上传封装、基础地址、网络检测
│  ├─ offline-auth.js               离线认证、自动补登、待同步队列
│  ├─ auth.js                       认证状态与 userId 获取工具
│  ├─ auth-manager.js               登录会话缓存工具
│  ├─ network-detector.js           网络状态检测
│  ├─ local-infer-core.js           本地推理后处理、NMS、坐标映射
│  ├─ model-cache.js                模型下载与本地缓存
│  ├─ model-loader.js               本地缓存模型加载
│  ├─ mushroom-meta.js              模型类别与野生菌业务信息映射
│  └─ local-cache.js                本地记录缓存辅助方法
├─ static/                          静态资源
│  ├─ logo.png                      项目 Logo
│  └─ tabbar/                       底部导航图标资源
├─ tools/                           辅助脚本
│  ├─ blackbox-align-batch1.js      本地模型与外部教师接口对齐分析脚本
│  └─ read_image_rgb.py             图像 RGB 读取辅助脚本
├─ App.vue                          全局入口，初始化认证与网络监听
├─ main.js                          uni-app 启动文件
├─ pages.json                       页面路由与 tabBar 配置
├─ manifest.json                    小程序与 uni-app 平台配置
├─ project.config.json              微信开发者工具项目配置
└─ package.json                     npm 依赖与脚本配置
```

说明：

- 仓库中还存在 `backup_*`、`.restore-backups`、`unpackage/`、若干过程文档等目录/文件，属于备份、构建产物或开发记录，本文不作为核心业务目录展开。
- `pages/index/index.vue` 为 uni-app 初始化示例页，当前业务上未见实际入口使用。

## 4. 核心功能模块

### 4.1 首页 / 拍照识别

**功能说明**

首页是识别主入口，用于选择图片、展示识别结果、显示离线/登录状态横幅，并承载模型加载与结果跳转逻辑。

**主要实现方式**

- 页面加载时先初始化 TensorFlow.js，再检查网络与本地模型状态；
- 若本地模型不存在且网络可用，则从 OSS 下载模型到本地；
- 若模型已加载，首页显示“选择图片 / 拍照识别”按钮；
- 识别结果直接展示在首页下方列表中，并按毒性显示标签；
- 点击结果后，根据数据来源跳转到记录详情或菌类详情。

**涉及页面 / 文件**

- `pages/home/home.vue`
- `App.vue`
- `utils/model-cache.js`
- `utils/model-loader.js`
- `utils/mushroom-meta.js`

### 4.2 相册选择 / 图片预览

**功能说明**

用户可从相册选择图片或直接拍照，识别前先在页面中进行图片预览。

**主要实现方式**

- 使用 `uni.chooseImage`，配置 `sourceType: ['album', 'camera']`；
- 使用 `uni.getImageInfo` 获取图片尺寸；
- 根据屏幕宽度计算显示尺寸；
- 使用 `<image>` 进行预览，并在同一区域叠加 `<canvas>` 绘制识别框。

**涉及页面 / 文件**

- `pages/home/home.vue`
- `pages/user-profile/user-profile.vue`（头像选择同样使用图片选择能力）

### 4.3 云端识别与本地识别流程

**功能说明**

项目实际代码中存在“云端识别 + 本地识别”双模式，首页会根据网络情况自动分流。

**主要实现方式**

- 入口方法：`pages/home/home.vue` 中的 `chooseImage()`；
- 网络判断调用 `utils/request.js` 中的 `checkNetwork()`；
- 当网络类型为 `wifi`、`4g`、`5g` 时，优先走云端识别；
- 网络较差或离线时，尝试走本地识别；
- 本地识别要求本地模型已缓存并加载成功；
- 云端识别通过 `uni.uploadFile` 上传图片到 `/api/recognition/predict`；
- 本地识别通过 `wx.createOffscreenCanvas` 获取像素，再调用 TensorFlow.js 模型和 `runTfjsYoloDetection()` 完成推理与后处理。

**涉及页面 / 文件**

- `pages/home/home.vue`
- `utils/request.js`
- `utils/local-infer-core.js`
- `utils/model-cache.js`
- `utils/model-loader.js`

### 4.4 识别结果展示

**功能说明**

识别结果当前主要在首页直接展示；项目中还保留了一个独立的 `pages/result/result.vue` 页面。

**主要实现方式**

- 云端识别结果通过 `displayCloudResult(record)` 转换为前端展示结构；
- 本地识别结果根据 `MUSHROOM_META` 映射出中文名、毒性、业务菌类 ID；
- 结果列表显示菌类名称、毒性标签、置信度；
- 对本地识别结果还会在 Canvas 上绘制检测框和标签；
- 当前主流程下，结果点击后通常直接跳转，不依赖独立结果页。

**涉及页面 / 文件**

- `pages/home/home.vue`
- `pages/result/result.vue`（保留页，当前主流程是否使用，需人工确认）
- `utils/mushroom-meta.js`

### 4.5 野生菌科普信息展示

**功能说明**

用户可浏览菌类科普列表，并查看单个野生菌的详细信息。

**主要实现方式**

- 科普列表页启动时一次性请求全量数据，再在前端进行分页与筛选；
- 支持按“全部 / 有毒 / 安全”进行简单过滤；
- 点击条目后跳转详情页；
- 详情页根据 `mushroomId` 调用详情接口，并展示中文名、拉丁名、分类、描述、食用提示、毒性等级、标准图片等信息。

**涉及页面 / 文件**

- `pages/mushroom-list/mushroom-list.vue`
- `pages/mushroom-detail/mushroom-detail.vue`
- `utils/api.js`
- `utils/request.js`

### 4.6 历史记录

**功能说明**

用户可查看已识别记录，列表页兼容展示云端记录、本地缓存记录和待同步记录。

**主要实现方式**

- 记录列表页优先从后端拉取全量记录；
- 同时读取本地缓存 `mushroom_records_${userId}` 与待同步队列 `pending_queue_${userId}`；
- 三类数据合并后按时间倒序排序，并以前端方式去重、分页与筛选；
- 点击记录进入详情页；
- 详情页会根据 `recordId` 是否为本地临时 ID，自动决定读本地缓存或调用后端接口；
- 若记录已包含 `mushroomId`，详情页还会进一步加载菌类百科信息。

**涉及页面 / 文件**

- `pages/record-list/record-list.vue`
- `pages/record-detail/record-detail.vue`
- `utils/local-cache.js`
- `utils/api.js`

### 4.7 用户反馈 / 识别错误反馈

**功能说明**

项目支持用户针对识别结果提交反馈，并查看反馈记录与反馈处理结果。

**主要实现方式**

- 反馈提交页从记录详情页接收 `recordId`、菌名、置信度、图片地址等参数；
- 提交时构造 `FeedbackSubmitDTO` 风格数据，调用 `feedbackSubmit` 接口；
- 反馈记录页支持分页、状态筛选、下拉刷新、触底加载；
- 反馈结果页同样调用反馈列表接口，用于展示反馈处理情况。

**涉及页面 / 文件**

- `pages/feedback/feedback.vue`
- `pages/feedback-list/feedback-list.vue`
- `pages/feedback-result/feedback-result.vue`
- `utils/api.js`

补充说明：

- `pages/feedback-list/feedback-list.vue` 中存在跳转 `/pages/feedback-detail/feedback-detail` 的代码，但当前项目目录与 `pages.json` 中未发现对应页面，需人工确认该详情页是否已删除、待补充或改为其他页面。

### 4.8 登录或用户身份处理

**功能说明**

项目具备微信登录、离线缓存登录、离线访客模式与联网自动补登能力。

**主要实现方式**

- `App.vue` 启动时执行 `bootstrapAuth(this)` 初始化认证；
- 登录页支持在线微信登录，也支持在离线情况下进入离线模式；
- 登录成功后会缓存 token、用户信息、离线会话时间；
- 全局监听网络变化，网络恢复后调用 `onNetworkBack(this)` 尝试自动补登；
- 首页会根据当前认证状态显示横幅，如“离线可用”“离线游客模式”“登录失败可先离线识别”等。

**涉及页面 / 文件**

- `pages/login/login.vue`
- `App.vue`
- `utils/offline-auth.js`
- `utils/auth.js`
- `utils/auth-manager.js`
- `utils/network-detector.js`

### 4.9 网络状态判断、弱网适配、缓存逻辑

**功能说明**

项目中已实现较明显的网络判断、弱网分流、模型缓存、记录缓存与待同步处理逻辑。

**主要实现方式**

- `utils/request.js` 的 `checkNetwork()` 将 `wifi / 4g / 5g` 视为较好网络；
- 首页在 `chooseImage()` 中按网络好坏决定走云端还是本地识别；
- 本地模型下载后缓存到 `wx.env.USER_DATA_PATH/models/${modelKey}`；
- 本地识别结果写入 `mushroom_records_${userId}`；
- 待同步记录写入 `pending_queue_${userId}`，联网条件满足时自动调用 `/api/recognition/report` 上报；
- 认证模块中还存在 `authCache`、`pendingQueue` 的离线认证缓存与通用待同步队列。

**涉及页面 / 文件**

- `pages/home/home.vue`
- `utils/request.js`
- `utils/model-cache.js`
- `utils/offline-auth.js`
- `utils/local-cache.js`

## 5. 业务流程说明

结合当前实际代码，小程序端主业务流程可整理如下。

### 5.1 首次进入与模型准备

1. 小程序启动后，`App.vue` 初始化认证状态并监听网络变化。
2. 首页 `pages/home/home.vue` 加载时初始化 TensorFlow.js CPU 后端。
3. 检查本地模型是否已缓存：
   - 已缓存：直接从本地文件系统加载；
   - 未缓存且在线：从 OSS 下载 `model.json` 和权重分片到本地缓存目录；
   - 未缓存且离线：本地识别不可用。

### 5.2 用户拍照 / 选图

1. 用户点击首页识别按钮；
2. 通过 `uni.chooseImage` 选择相册图片或拍照；
3. 保存临时图片路径；
4. 获取图片尺寸并准备预览区域。

### 5.3 识别模式分流

#### 1. 云端识别流程

触发条件：网络状态较好（`wifi / 4g / 5g`）。

流程如下：

1. 调用 `uni.uploadFile` 上传图片到 `/api/recognition/predict`；
2. 上传参数中包含 `userId`、`inferModel: 1`、`deviceInfo`；
3. 后端返回识别记录对象；
4. 前端将记录转为展示数据；
5. 同时写入本地缓存 `mushroom_records_${userId}`；
6. 用户点击结果后可进入记录详情页。

#### 2. 本地识别流程

触发条件：网络较差或离线，且本地模型已准备好。

流程如下：

1. 使用 `wx.createOffscreenCanvas` 读取原图像素；
2. 提取 RGB 数据；
3. 将图像转换为 TensorFlow.js 输入张量；
4. 调用本地 YOLO 模型推理；
5. 通过 `utils/local-infer-core.js` 完成解码、NMS、坐标映射与类别映射；
6. 将最佳结果与全部结果写入本地记录缓存；
7. 同步写入待同步队列 `pending_queue_${userId}`；
8. 后续当网络条件允许时，再调用 `/api/recognition/report` 完成补传。

### 5.4 识别结果展示与详情查看

1. 首页显示识别结果列表；
2. 云端结果优先跳转记录详情页；
3. 本地结果优先跳转菌类详情页；
4. 记录详情页如检测到有效 `mushroomId`，还会联动查询百科详情。

### 5.5 历史记录保存

1. 云端识别结果直接缓存到 `mushroom_records_${userId}`；
2. 本地识别结果会先尝试将临时图片 `saveFile` 固化；
3. 缓存记录包含识别结果、图片地址、时间、毒性、来源等信息；
4. 列表页展示时会把服务端记录、本地缓存记录、待同步记录统一合并。

### 5.6 用户提交反馈

1. 用户从记录详情页进入反馈页；
2. 反馈页携带记录 ID、菌类名称、图片等信息；
3. 用户选择反馈类型并填写内容；
4. 前端提交 `/api/feedback/submit`；
5. 用户可在反馈记录页与反馈结果页查看处理状态。

## 6. 接口调用说明

以下内容仅整理当前页面代码中已确认调用的主要接口。

### 6.1 用户与登录相关

| 接口用途 | 路径 | 方式 | 主要参数 | 说明 |
|---|---|---|---|---|
| 微信登录 | `/api/user/login` | `POST` | `{ code }` | 登录页与离线认证模块均有调用 |
| 获取用户资料 | `/api/user/profile` | `GET` | `{ userId }` | 个人信息页调用 |
| 修改昵称 | `/api/user/update/nickname` | `POST` | `{ userId, nickname }` | 个人信息页调用 |
| 修改性别 | `/api/user/update/gender` | `POST` | `{ userId, gender }` | 个人信息页调用 |
| 更新头像 | `/api/user/update/avatar` | `uploadFile` | 文件字段 `avatar`，表单含 `userId` | 个人信息页调用 |

### 6.2 野生菌科普相关

| 接口用途 | 路径 | 方式 | 主要参数 | 说明 |
|---|---|---|---|---|
| 获取菌类全量列表 | `/api/mushroom/app/list` | `GET` | 当前代码中传空对象 `{}` | 科普列表页调用 |
| 获取菌类详情 | `/api/mushroom/detail` | `GET` | `{ mushroomId }` | 科普详情页、记录详情页调用 |

### 6.3 识别与记录相关

| 接口用途 | 路径 | 方式 | 主要参数 | 说明 |
|---|---|---|---|---|
| 云端识别 | `/api/recognition/predict` | `uploadFile` | 图片字段 `image`，表单含 `userId`、`inferModel: 1`、`deviceInfo` | 首页云端识别 |
| 本地识别结果补传 | `/api/recognition/report` | `uploadFile` | 图片字段 `image`，表单含 `userId`、`mushroomId`、`confidence`、`isPoisonous`、`inferModel: 0`、`deviceInfo` | 首页待同步队列上传 |
| 识别记录全量列表 | `/api/record/listAll` | `GET` | `{ userId }` | 记录列表页调用 |
| 识别记录详情 | `/api/record/detail` | `GET` | 代码中出现 `{ recordId }` 和 `{ recordId, userId }` 两种传法 | `result.vue` 与 `record-detail.vue` 均有调用 |

### 6.4 反馈相关

| 接口用途 | 路径 | 方式 | 主要参数 | 说明 |
|---|---|---|---|---|
| 提交反馈 | `/api/feedback/submit` | `POST` | `{ userId, recordId, feedbackType, content, imageUrl }` | 反馈提交页调用 |
| 获取我的反馈 | `/api/feedback/my` | `GET` | `{ userId, page, size, status? }` | 反馈记录页、反馈结果页调用 |

### 6.5 接口封装与返回处理规则

- 公共封装位于 `utils/request.js` 与 `utils/api.js`；
- 默认请求头为 `Content-Type: application/json`；
- 若本地存在 `token`，会自动附加 `Authorization: Bearer ${token}`；
- 代码约定后端返回 `code === 0` 表示成功；
- 若返回 `code === 401`，前端会清理本地登录信息并回到登录页；
- 部分页面对接口返回做了多种格式兼容，例如：
  - 直接对象；
  - `{ code: 0, data: ... }`；
  - 分页对象 `{ list, total, page, size }`。

## 7. 关键配置说明

### 7.1 小程序 AppID 配置位置

- `manifest.json` → `mp-weixin.appid`
- `project.config.json` → `appid`

当前代码中显示的 AppID 为：

- `wx11f9e0578d0a225d`

### 7.2 接口基础地址配置位置

主业务请求当前以 `utils/request.js` 为准：

```js
export const BASE_URL = 'http://192.168.5.23:8080'
```

说明：

- 当前配置显然用于局域网真机调试；
- 若更换开发电脑、后端地址或部署环境，需要同步修改；
- 仓库中另有 `utils/upload.js` 使用 `http://localhost:8080`，但当前主业务 API 封装未以其为主，是否保留为旧方案，需人工确认。

### 7.3 OSS / 静态资源 / 模型地址

首页当前使用的模型 OSS 地址常量位于 `pages/home/home.vue`：

```js
const OSS_MODEL_JSON_URL = 'https://java-springboot-yunnanmushroom.oss-cn-beijing.aliyuncs.com/model/model.json'
```

说明：

- 本地模型首次使用时会从该地址下载 `model.json` 及权重分片；
- 科普图片与记录图片也可能由后端返回 URL 或相对路径，前端会在必要时拼接 `BASE_URL`。

### 7.4 模型缓存目录与版本标识

模型缓存实现位于 `utils/model-cache.js`，主要规则如下：

- 本地缓存目录：`wx.env.USER_DATA_PATH/models/${modelKey}`
- 当前模型键值：`yolo_int8_v1`
- 本地存储标识：
  - `localModelReady:${modelKey}`
  - `localModelDir:${modelKey}`
  - `localModelCachedAt:${modelKey}`

从现有代码看，模型版本控制主要依赖 `modelKey` 与本地缓存标记；未看到更细的哈希校验或远端版本比对机制。

### 7.5 页面路由与 tabBar

页面路由由 `pages.json` 管理，底部 tabBar 包括：

- 首页：`pages/home/home`
- 记录：`pages/record-list/record-list`
- 科普：`pages/mushroom-list/mushroom-list`
- 设置：`pages/settings/settings`

补充说明：

- 当前 `pages.json` 未配置 `subPackages`；
- `pkg-ai/pages/recognize/home.vue` 未在路由中注册；
- `manifest.json` 中虽然配置了将 `pkg-ai/models/` 复制到小程序输出目录，但当前仓库中该模型目录未见实际模型文件。

### 7.6 权限声明、上传大小限制等

- `manifest.json` 未见微信小程序专门的权限声明字段；
- 相机/相册使用依赖 `uni.chooseImage`，实际授权由微信客户端弹窗控制；
- 前端代码中未看到显式的上传大小限制或图片压缩上限配置；
- 微信基础库版本在 `project.config.json` 中配置为 `3.13.0`。

### 7.7 本地缓存键

根据实际代码，常见缓存键包括：

- 登录与认证：
  - `token`
  - `userInfo`
  - `authCache`
  - `AUTH_TOKEN`
  - `AUTH_USER`
  - `AUTH_LAST_LOGIN_AT`
  - `AUTH_OFFLINE_ENABLED`
- 识别与同步：
  - `mushroom_records_${userId}`
  - `pending_queue_${userId}`
  - `last_result_${userId}`
  - `pendingQueue`
- 模型：
  - `localModelReady:${modelKey}`
  - `localModelDir:${modelKey}`
  - `localModelCachedAt:${modelKey}`

由于认证和离线同步存在两套缓存命名方式并存的情况，其最终线上使用哪套为主，需人工确认。

## 8. 运行与调试说明

### 8.1 开发环境要求

结合仓库现状，建议开发环境包括：

- HBuilderX（用于 uni-app 项目运行与发行）
- 微信开发者工具
- Node.js 与 npm
- 微信小程序测试账号或真实开发者账号

### 8.2 是否需要 `npm install`

- 当前仓库中已经存在 `node_modules/`；
- 但若在新环境重新拉取代码，仍建议执行 `npm install`；
- 主要依赖包括 TensorFlow.js 与 `fetch-wechat`。

### 8.3 HBuilderX / 微信开发者工具运行方式

可按以下方式运行：

1. 使用 HBuilderX 打开项目根目录；
2. 选择运行到“微信开发者工具”或先编译为微信小程序；
3. 微信开发者工具导入项目目录；
4. 确认 `project.config.json` 中 AppID 与本机开发环境一致。

如果采用命令行方式，`package.json` 中已提供脚本：

- `npm run dev:mp-weixin`
- `npm run build:mp-weixin`

但脚本依赖 `uni` 命令可用；当前仓库中未看到完整 CLI 依赖配置，是否完全依赖 HBuilderX 环境，需人工确认。

### 8.4 打包到微信小程序

可采用两种方式：

- HBuilderX 中发行到微信小程序；
- 或执行 `npm run build:mp-weixin` 后，再用微信开发者工具打开构建结果。

### 8.5 真机调试注意事项

- 当前 `BASE_URL` 为局域网地址 `http://192.168.5.23:8080`，真机必须能够访问该地址；
- 首次使用本地识别前，需要联网下载模型；
- 若模型尚未缓存成功，离线环境下本地识别无法正常启动；
- 若使用云端识别，还需保证真机可访问后端接口与 OSS 模型地址。

### 8.6 常见报错及排查建议

根据当前代码特征，常见问题可从以下方向排查：

1. 后端接口不可达  
   检查 `utils/request.js` 中 `BASE_URL` 是否与当前后端地址一致，真机与服务端是否在同一网络环境。

2. 模型下载失败或模型加载失败  
   检查 OSS 地址是否可访问，本地缓存目录是否成功写入，`model.json` 与分片文件是否完整。

3. 本地模型类别数不匹配  
   首页包含 `LOCAL_MODEL_OUTPUT_MISMATCH` 处理逻辑，若弹出“本地模型类别异常”，需检查模型输出通道数与 `utils/local-infer-core.js` 中 26 类映射是否一致。

4. 识别记录或反馈列表为空  
   需要同时检查后端接口返回、用户 ID 获取逻辑以及本地缓存键是否存在数据。

5. 路由跳转失败  
   需检查页面是否已在 `pages.json` 注册；例如反馈详情页在代码中有跳转语句，但当前项目未发现对应页面文件。

## 9. 与后端系统的关系

从小程序前端视角看，当前项目与后端系统的关系如下：

- 小程序通过 `utils/request.js` 中的 `BASE_URL` 与业务后端进行 HTTP 通信；
- 用户登录、用户资料、菌类科普、识别记录、反馈等业务数据均依赖后端接口；
- 云端识别通过 `/api/recognition/predict` 与 `/api/recognition/report` 完成，前端只负责上传图片和展示结果；
- 本地识别模型文件通过 OSS 地址下载，小程序端负责缓存和推理；
- 后端是否在内部再调用独立 AI 推理服务，前端代码不可见，需人工确认；
- 根据项目题目与接口组织方式，本小程序设计上可与 SpringBoot 后端协同工作，但后端实现细节不在本仓库内，需以后端项目为准。

## 10. 已实现功能总结

结合当前代码，项目已完成的主要功能包括：

- 微信登录、离线模式进入、网络恢复后自动补登；
- 首页图片选择、拍照识别与结果展示；
- 基于网络状态的云端识别 / 本地识别双模式分流；
- TensorFlow.js 本地模型加载、缓存与设备端推理；
- 识别结果毒性标记与详情跳转；
- 野生菌科普列表与详情展示；
- 本地识别记录缓存、待同步队列与自动补传；
- 识别历史记录列表、详情查看；
- 用户反馈提交、反馈记录查询、反馈结果查看；
- 用户昵称、性别、头像等个人信息维护；
- 底部 tabBar 导航与基础设置功能。
