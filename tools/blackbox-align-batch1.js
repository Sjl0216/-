#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const tf = require('@tensorflow/tfjs-core');
require('@tensorflow/tfjs-backend-cpu');
const tfl = require('@tensorflow/tfjs-converter');

const {
  DEFAULT_LOCAL_INFER_CONFIG,
  compareBoxesIoU,
  normalizeLocalInferConfig,
  postprocessTfjsYoloDetections,
  runTfjsModelForward
} = require('../utils/local-infer-core.js');

const MODEL_URL = 'https://java-springboot-yunnanmushroom.oss-cn-beijing.aliyuncs.com/model/model.json';
const PYTHON_TEACHER_URL = 'http://127.0.0.1:8000/predict';
const READ_IMAGE_HELPER = path.resolve(__dirname, 'read_image_rgb.py');
const OUTPUT_DIR = path.resolve(__dirname, '..', 'tmp');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'blackbox-align-batch1.json');
const OUTPUT_CSV = path.join(OUTPUT_DIR, 'blackbox-align-batch1.csv');
const OUTPUT_GROUP_CSV = path.join(OUTPUT_DIR, 'blackbox-align-batch1-groups.csv');

const BATCH1_SAMPLES = [
  'D:\\python\\YOLOV8\\yunnan_mushroom\\dataset\\images\\test\\amanita_muscaria\\amanita_muscaria_0049.jpg',
  'D:\\python\\YOLOV8\\yunnan_mushroom\\dataset\\images\\test\\amanita_bisulcata\\amanita_bisulcata_0039.jpg',
  'D:\\python\\YOLOV8\\yunnan_mushroom\\dataset\\images\\test\\omphalotus_olearius\\omphalotus_olearius_0011.jpeg',
  'D:\\python\\YOLOV8\\yunnan_mushroom\\dataset\\images\\test\\chanterelle\\chanterelle_0023.jpg',
  'D:\\python\\YOLOV8\\yunnan_mushroom\\dataset\\images\\test\\amanita_phalloides\\amanita_phalloides_0020.jpg',
  'D:\\python\\YOLOV8\\yunnan_mushroom\\dataset\\images\\test\\coral_mushroom_mix\\coral_mushroom_mix_0002.jpg',
  'D:\\python\\YOLOV8\\yunnan_mushroom\\dataset\\images\\test\\russula_green\\russula_green_0048.jpg',
  'D:\\python\\YOLOV8\\yunnan_mushroom\\dataset\\images\\test\\chlorophyllum_molybdites\\chlorophyllum_molybdites_0043.jpg',
  'D:\\python\\YOLOV8\\yunnan_mushroom\\dataset\\images\\test\\black_tiger_mushroom\\black_tiger_mushroom_0113.jpg',
  'D:\\python\\YOLOV8\\yunnan_mushroom\\dataset\\images\\test\\truffle\\truffle_0019.png',
  'D:\\python\\YOLOV8\\yunnan_mushroom\\dataset\\images\\test\\termitomyces\\termitomyces_0041.jpg',
  'D:\\python\\YOLOV8\\yunnan_mushroom\\dataset\\images\\test\\russula_emetica\\russula_emetica_0056.jpg',
  'D:\\python\\YOLOV8\\yunnan_mushroom\\dataset\\images\\test\\entoloma_sinuatum\\entoloma_sinuatum_0049.jpg',
  'D:\\python\\YOLOV8\\yunnan_mushroom\\dataset\\images\\test\\matsutake\\matsutake_0038.jpg',
  'D:\\python\\YOLOV8\\yunnan_mushroom\\dataset\\images\\test\\bolete_bluebury\\bolete_bluebury_0042.jpg',
  'D:\\python\\YOLOV8\\yunnan_mushroom\\dataset\\images\\test\\ganba_mushroom\\ganba_mushroom_0026.jpg',
  'D:\\python\\YOLOV8\\yunnan_mushroom\\dataset\\images\\test\\gyromitra_esculenta\\gyromitra_esculenta_0003.jpg',
  'D:\\python\\YOLOV8\\yunnan_mushroom\\dataset\\images\\test\\cereal_mushroom\\cereal_mushroom_0002.png',
  'D:\\python\\YOLOV8\\yunnan_mushroom\\dataset\\images\\test\\puffball\\puffball_0004.jpg',
  'D:\\python\\YOLOV8\\yunnan_mushroom\\dataset\\images\\test\\amanita_exitialis\\amanita_exitialis_0050.jpg'
];

function roundNumber(value, digits = 6) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return value;
  }
  return Number(value.toFixed(digits));
}

function average(values) {
  const valid = values.filter((item) => typeof item === 'number' && Number.isFinite(item));
  if (!valid.length) {
    return null;
  }
  return valid.reduce((sum, item) => sum + item, 0) / valid.length;
}

function percentage(part, whole) {
  if (!whole) return null;
  return part / whole;
}

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function configToId(configInput) {
  const config = normalizeLocalInferConfig(configInput);
  return [
    `pre=${config.preprocessMode}`,
    `conf=${config.confThreshold}`,
    `iou=${config.iouThreshold}`,
    `nms=${config.nmsMode}`,
    `fb=${config.enableFallback ? config.fallbackConfThreshold : 'off'}`
  ].join('|');
}

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function writeCsv(filePath, headers, rows) {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsv(row[header])).join(','));
  }
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}

function toTop1(detections) {
  if (!Array.isArray(detections) || !detections.length) {
    return null;
  }
  return detections.slice().sort((a, b) => b.score - a.score)[0];
}

function normalizeTeacherDetections(payload) {
  const detections = Array.isArray(payload && payload.detections) ? payload.detections : [];
  return detections.map((item) => ({
    classId: Number(item.classId),
    score: Number(item.score),
    box: Array.isArray(item.box) ? item.box.map(Number) : [],
    boxFormat: 'xyxy'
  })).filter((item) => item.box.length === 4);
}

async function loadModel() {
  await tf.setBackend('cpu');
  await tf.ready();
  return tfl.loadGraphModel(MODEL_URL);
}

function readImageRgb(imagePath) {
  const result = spawnSync(
    'py',
    ['-3', READ_IMAGE_HELPER, imagePath],
    {
      encoding: 'utf8',
      maxBuffer: 128 * 1024 * 1024
    }
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `Failed to read image: ${imagePath}`);
  }

  const payload = JSON.parse(result.stdout);
  return {
    path: payload.path,
    width: payload.width,
    height: payload.height,
    rgbData: Buffer.from(payload.rgbBase64, 'base64')
  };
}

async function callPythonTeacher(imagePath) {
  const fileBuffer = fs.readFileSync(imagePath);
  const formData = new FormData();
  formData.append('image', new Blob([fileBuffer]), path.basename(imagePath));

  const response = await fetch(PYTHON_TEACHER_URL, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Teacher API failed (${response.status}): ${await response.text()}`);
  }

  const payload = await response.json();
  return {
    model: payload.model || null,
    elapsedMs: Number(payload.elapsedMs) || null,
    detections: normalizeTeacherDetections(payload),
    raw: payload
  };
}

function buildSampleComparison({
  imagePath,
  expectedClassName,
  pythonResult,
  frontendResult,
  scenarioId
}) {
  const pythonTop1 = toTop1(pythonResult.detections);
  const frontendTop1 = toTop1(frontendResult.detections);
  const pythonDetected = pythonResult.detections.length > 0;
  const frontendDetected = frontendResult.detections.length > 0;
  const top1IoU = (pythonTop1 && frontendTop1)
    ? compareBoxesIoU(pythonTop1.box, frontendTop1, 'xyxy')
    : null;
  const top1ScoreGapAbs = (pythonTop1 && frontendTop1)
    ? Math.abs(pythonTop1.score - frontendTop1.score)
    : null;

  return {
    scenarioId,
    inputImagePath: imagePath,
    expectedClassName,
    boxFormat: 'xyxy',
    pythonDetected,
    frontendDetected,
    pythonTop1ClassId: pythonTop1 ? pythonTop1.classId : null,
    frontendTop1ClassId: frontendTop1 ? frontendTop1.classId : null,
    top1ClassMatch: Boolean(pythonTop1 && frontendTop1 && pythonTop1.classId === frontendTop1.classId),
    top1IoU: top1IoU === null ? null : roundNumber(top1IoU, 6),
    top1ScoreGapAbs: top1ScoreGapAbs === null ? null : roundNumber(top1ScoreGapAbs, 6),
    pythonDetCount: pythonResult.detections.length,
    frontendDetCount: frontendResult.detections.length,
    detCountGapAbs: Math.abs(pythonResult.detections.length - frontendResult.detections.length),
    pythonElapsedMs: pythonResult.elapsedMs,
    frontendElapsedMs: frontendResult.elapsedMs,
    frontendConfigId: scenarioId,
    frontendInputShape: JSON.stringify(frontendResult.inputShape || []),
    frontendOutputShape: JSON.stringify(frontendResult.outputShape || []),
    frontendRawCandidateCount: frontendResult.rawCandidateCount,
    frontendThresholdCandidateCount: frontendResult.thresholdCandidateCount,
    frontendNmsCount: frontendResult.nmsCount,
    frontendThresholdUsed: frontendResult.thresholdUsed,
    frontendFallbackUsed: frontendResult.fallbackUsed,
    pythonTop1Score: pythonTop1 ? roundNumber(pythonTop1.score, 6) : null,
    frontendTop1Score: frontendTop1 ? roundNumber(frontendTop1.score, 6) : null,
    pythonTop1Box: pythonTop1 ? JSON.stringify(pythonTop1.box) : '',
    frontendTop1Box: frontendTop1 ? JSON.stringify([
      roundNumber(frontendTop1.x1, 3),
      roundNumber(frontendTop1.y1, 3),
      roundNumber(frontendTop1.x2, 3),
      roundNumber(frontendTop1.y2, 3)
    ]) : '',
    pythonRaw: pythonResult.raw,
    frontendRaw: frontendResult
  };
}

function computeMetrics(records) {
  const pythonDetectedRecords = records.filter((item) => item.pythonDetected);
  const bothDetectedRecords = records.filter((item) => item.pythonDetected && item.frontendDetected);
  const frontendFalsePositiveCount = records.filter((item) => !item.pythonDetected && item.frontendDetected).length;
  const failureSamples = records.filter((item) => (
    (item.pythonDetected && !item.frontendDetected) ||
    (item.pythonDetected && item.frontendDetected && !item.top1ClassMatch) ||
    (typeof item.top1IoU === 'number' && item.top1IoU < 0.3)
  )).map((item) => ({
    inputImagePath: item.inputImagePath,
    expectedClassName: item.expectedClassName,
    pythonDetected: item.pythonDetected,
    frontendDetected: item.frontendDetected,
    pythonTop1ClassId: item.pythonTop1ClassId,
    frontendTop1ClassId: item.frontendTop1ClassId,
    top1IoU: item.top1IoU
  }));

  const overall = {
    sampleCount: records.length,
    pythonDetectedCount: pythonDetectedRecords.length,
    frontendDetectedCount: records.filter((item) => item.frontendDetected).length,
    frontendDetectionRateOnPythonDetected: roundNumber(
      percentage(
        pythonDetectedRecords.filter((item) => item.frontendDetected).length,
        pythonDetectedRecords.length
      ),
      6
    ),
    top1ClassMatchRateOnPythonDetected: roundNumber(
      percentage(
        pythonDetectedRecords.filter((item) => item.top1ClassMatch).length,
        pythonDetectedRecords.length
      ),
      6
    ),
    meanTop1IoU: roundNumber(average(bothDetectedRecords.map((item) => item.top1IoU)), 6),
    meanTop1ScoreGapAbs: roundNumber(average(bothDetectedRecords.map((item) => item.top1ScoreGapAbs)), 6),
    avgDetectionCountGapAbs: roundNumber(average(records.map((item) => item.detCountGapAbs)), 6),
    avgFrontendElapsedMs: roundNumber(average(records.map((item) => item.frontendElapsedMs)), 6),
    frontendFalsePositiveCount,
    failureSampleCount: failureSamples.length
  };

  const byExpectedClassName = {};
  const grouped = new Map();
  for (const record of records) {
    if (!grouped.has(record.expectedClassName)) {
      grouped.set(record.expectedClassName, []);
    }
    grouped.get(record.expectedClassName).push(record);
  }

  for (const [className, classRecords] of grouped.entries()) {
    const classPythonDetected = classRecords.filter((item) => item.pythonDetected);
    const classBothDetected = classRecords.filter((item) => item.pythonDetected && item.frontendDetected);
    byExpectedClassName[className] = {
      sampleCount: classRecords.length,
      pythonDetectedCount: classPythonDetected.length,
      frontendDetectedCount: classRecords.filter((item) => item.frontendDetected).length,
      frontendDetectionRateOnPythonDetected: roundNumber(
        percentage(
          classPythonDetected.filter((item) => item.frontendDetected).length,
          classPythonDetected.length
        ),
        6
      ),
      top1ClassMatchRateOnPythonDetected: roundNumber(
        percentage(
          classPythonDetected.filter((item) => item.top1ClassMatch).length,
          classPythonDetected.length
        ),
        6
      ),
      meanTop1IoU: roundNumber(average(classBothDetected.map((item) => item.top1IoU)), 6),
      meanTop1ScoreGapAbs: roundNumber(average(classBothDetected.map((item) => item.top1ScoreGapAbs)), 6),
      failureSamples: classRecords
        .filter((item) => (
          (item.pythonDetected && !item.frontendDetected) ||
          (item.pythonDetected && item.frontendDetected && !item.top1ClassMatch) ||
          (typeof item.top1IoU === 'number' && item.top1IoU < 0.3)
        ))
        .map((item) => item.inputImagePath)
    };
  }

  return {
    overall,
    byExpectedClassName,
    failureSamples
  };
}

function compareScenarioMetrics(a, b) {
  const keys = [
    ['frontendDetectionRateOnPythonDetected', 'desc'],
    ['top1ClassMatchRateOnPythonDetected', 'desc'],
    ['meanTop1IoU', 'desc'],
    ['meanTop1ScoreGapAbs', 'asc'],
    ['frontendFalsePositiveCount', 'asc']
  ];

  for (const [key, direction] of keys) {
    const aValue = a.metrics.overall[key];
    const bValue = b.metrics.overall[key];
    const normA = aValue === null ? (direction === 'asc' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY) : aValue;
    const normB = bValue === null ? (direction === 'asc' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY) : bValue;
    if (normA === normB) {
      continue;
    }
    if (direction === 'desc') {
      return normB - normA;
    }
    return normA - normB;
  }

  return 0;
}

function isSmallImprovement(previousScenario, nextScenario) {
  if (!previousScenario || !nextScenario) {
    return false;
  }

  const prev = previousScenario.metrics.overall;
  const next = nextScenario.metrics.overall;

  const detectionDelta = (next.frontendDetectionRateOnPythonDetected || 0) - (prev.frontendDetectionRateOnPythonDetected || 0);
  const classMatchDelta = (next.top1ClassMatchRateOnPythonDetected || 0) - (prev.top1ClassMatchRateOnPythonDetected || 0);
  const iouDelta = (next.meanTop1IoU || 0) - (prev.meanTop1IoU || 0);

  return detectionDelta < 0.02 && classMatchDelta < 0.02 && iouDelta < 0.03;
}

function isHardDecodeReview(metrics) {
  const overall = metrics.overall;
  return (
    (overall.frontendDetectionRateOnPythonDetected !== null && overall.frontendDetectionRateOnPythonDetected < 0.7) ||
    (overall.top1ClassMatchRateOnPythonDetected !== null && overall.top1ClassMatchRateOnPythonDetected < 0.6) ||
    (overall.meanTop1IoU !== null && overall.meanTop1IoU < 0.3)
  );
}

async function evaluateScenario({
  stage,
  config,
  teacherResultsByImage,
  model,
  scenarioCache,
  imageCache,
  forwardCache
}) {
  const normalizedConfig = normalizeLocalInferConfig(config);
  const scenarioId = configToId(normalizedConfig);

  if (scenarioCache.has(scenarioId)) {
    return scenarioCache.get(scenarioId);
  }

  const sampleComparisons = [];
  for (const imagePath of BATCH1_SAMPLES) {
    let imagePayload = imageCache.get(imagePath);
    if (!imagePayload) {
      imagePayload = readImageRgb(imagePath);
      imageCache.set(imagePath, imagePayload);
    }

    const forwardCacheKey = `${normalizedConfig.preprocessMode}::${imagePath}`;
    let forwardResult = forwardCache.get(forwardCacheKey);
    if (!forwardResult) {
      forwardResult = await runTfjsModelForward({
        tf,
        model,
        rgbData: imagePayload.rgbData,
        imageWidth: imagePayload.width,
        imageHeight: imagePayload.height,
        config: Object.assign({}, normalizedConfig, {
          confThreshold: DEFAULT_LOCAL_INFER_CONFIG.confThreshold,
          iouThreshold: DEFAULT_LOCAL_INFER_CONFIG.iouThreshold,
          nmsMode: DEFAULT_LOCAL_INFER_CONFIG.nmsMode,
          enableFallback: false
        })
      });
      forwardCache.set(forwardCacheKey, forwardResult);
    }

    const frontendResult = postprocessTfjsYoloDetections(forwardResult, normalizedConfig);
    const teacherResult = teacherResultsByImage.get(imagePath);
    sampleComparisons.push(buildSampleComparison({
      imagePath,
      expectedClassName: path.basename(path.dirname(imagePath)),
      pythonResult: teacherResult,
      frontendResult,
      scenarioId
    }));
  }

  const scenario = {
    id: scenarioId,
    stage,
    config: normalizedConfig,
    samples: sampleComparisons,
    metrics: computeMetrics(sampleComparisons)
  };

  scenarioCache.set(scenarioId, scenario);
  return scenario;
}

async function collectTeacherResults() {
  const results = new Map();
  for (const imagePath of BATCH1_SAMPLES) {
    results.set(imagePath, await callPythonTeacher(imagePath));
  }
  return results;
}

function scenarioCandidatesForStage(stage, bestConfig) {
  if (stage === 'baseline') {
    return [
      Object.assign({}, DEFAULT_LOCAL_INFER_CONFIG, {
        preprocessMode: 'direct_resize',
        confThreshold: 0.25,
        iouThreshold: 0.65,
        nmsMode: 'global',
        enableFallback: false
      })
    ];
  }

  if (stage === 'preprocess') {
    return [
      bestConfig,
      Object.assign({}, bestConfig, { preprocessMode: 'letterbox' })
    ];
  }

  if (stage === 'conf') {
    return [
      bestConfig,
      Object.assign({}, bestConfig, { confThreshold: 0.20 }),
      Object.assign({}, bestConfig, { confThreshold: 0.15 })
    ];
  }

  if (stage === 'iou') {
    return [
      bestConfig,
      Object.assign({}, bestConfig, { iouThreshold: 0.60 }),
      Object.assign({}, bestConfig, { iouThreshold: 0.70 })
    ];
  }

  if (stage === 'nms') {
    return [
      bestConfig,
      Object.assign({}, bestConfig, { nmsMode: 'class_wise' })
    ];
  }

  if (stage === 'fallback') {
    return [
      bestConfig,
      Object.assign({}, bestConfig, {
        enableFallback: true,
        fallbackConfThreshold: 0.15
      })
    ];
  }

  return [bestConfig];
}

async function main() {
  ensureOutputDir();

  console.log('[blackbox-align] loading teacher results...');
  const teacherResultsByImage = await collectTeacherResults();

  console.log('[blackbox-align] loading tfjs model...');
  const model = await loadModel();

  const scenarioCache = new Map();
  const imageCache = new Map();
  const forwardCache = new Map();
  const evaluatedScenarios = [];
  const selectionTrace = [];
  const stages = ['baseline', 'preprocess', 'conf', 'iou', 'nms', 'fallback'];

  let bestScenario = null;
  let smallImprovementStreak = 0;
  let stopReason = null;
  let needsDecodeReview = false;

  try {
    for (const stage of stages) {
      const candidates = scenarioCandidatesForStage(stage, bestScenario ? bestScenario.config : null);
      const scenarios = [];

      for (const candidate of candidates) {
        console.log(`[blackbox-align] evaluating stage=${stage} config=${configToId(candidate)}`);
        const scenario = await evaluateScenario({
          stage,
          config: candidate,
          teacherResultsByImage,
          model,
          scenarioCache,
          imageCache,
          forwardCache
        });
        scenarios.push(scenario);
        if (!evaluatedScenarios.find((item) => item.id === scenario.id)) {
          evaluatedScenarios.push(scenario);
        }
      }

      scenarios.sort(compareScenarioMetrics);
      const stageBest = scenarios[0];
      const previousBest = bestScenario;
      bestScenario = stageBest;

      const smallImprovement = previousBest ? isSmallImprovement(previousBest, stageBest) : false;
      smallImprovementStreak = smallImprovement ? (smallImprovementStreak + 1) : 0;

      selectionTrace.push({
        stage,
        candidates: scenarios.map((item) => item.id),
        selectedScenarioId: stageBest.id,
        selectedMetrics: stageBest.metrics.overall,
        smallImprovement,
        smallImprovementStreak
      });

      const obviousRegression =
        previousBest &&
        stageBest.metrics.overall.top1ClassMatchRateOnPythonDetected !== null &&
        previousBest.metrics.overall.top1ClassMatchRateOnPythonDetected !== null &&
        (previousBest.metrics.overall.top1ClassMatchRateOnPythonDetected - stageBest.metrics.overall.top1ClassMatchRateOnPythonDetected) > 0.03 &&
        stageBest.metrics.overall.frontendFalsePositiveCount > previousBest.metrics.overall.frontendFalsePositiveCount;

      if (obviousRegression) {
        stopReason = `stop_after_${stage}_regression`;
        needsDecodeReview = true;
        break;
      }

      if (smallImprovementStreak >= 2) {
        stopReason = `stop_after_${stage}_small_improvement`;
        needsDecodeReview = true;
        break;
      }
    }

    if (!stopReason && bestScenario && isHardDecodeReview(bestScenario.metrics)) {
      stopReason = 'stop_hard_decode_review_threshold';
      needsDecodeReview = true;
    }

    const report = {
      generatedAt: new Date().toISOString(),
      teacherEndpoint: PYTHON_TEACHER_URL,
      modelUrl: MODEL_URL,
      boxFormat: 'xyxy',
      batchSamples: BATCH1_SAMPLES.map((item) => ({
        inputImagePath: item,
        expectedClassName: path.basename(path.dirname(item))
      })),
      scenarios: evaluatedScenarios,
      selectionTrace,
      finalRecommendation: {
        bestScenarioId: bestScenario ? bestScenario.id : null,
        bestScenarioConfig: bestScenario ? bestScenario.config : null,
        bestScenarioMetrics: bestScenario ? bestScenario.metrics.overall : null,
        needsDecodeReview,
        stopReason
      }
    };

    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(report, null, 2), 'utf8');

    const csvRows = evaluatedScenarios.flatMap((scenario) => scenario.samples.map((sample) => ({
      scenarioId: scenario.id,
      stage: scenario.stage,
      inputImagePath: sample.inputImagePath,
      expectedClassName: sample.expectedClassName,
      pythonDetected: sample.pythonDetected,
      frontendDetected: sample.frontendDetected,
      pythonTop1ClassId: sample.pythonTop1ClassId,
      frontendTop1ClassId: sample.frontendTop1ClassId,
      top1ClassMatch: sample.top1ClassMatch,
      top1IoU: sample.top1IoU,
      top1ScoreGapAbs: sample.top1ScoreGapAbs,
      pythonDetCount: sample.pythonDetCount,
      frontendDetCount: sample.frontendDetCount,
      frontendConfigId: sample.frontendConfigId,
      boxFormat: sample.boxFormat,
      frontendElapsedMs: sample.frontendElapsedMs,
      frontendRawCandidateCount: sample.frontendRawCandidateCount,
      frontendThresholdCandidateCount: sample.frontendThresholdCandidateCount,
      frontendNmsCount: sample.frontendNmsCount,
      frontendThresholdUsed: sample.frontendThresholdUsed,
      frontendFallbackUsed: sample.frontendFallbackUsed
    })));

    writeCsv(OUTPUT_CSV, [
      'scenarioId',
      'stage',
      'inputImagePath',
      'expectedClassName',
      'pythonDetected',
      'frontendDetected',
      'pythonTop1ClassId',
      'frontendTop1ClassId',
      'top1ClassMatch',
      'top1IoU',
      'top1ScoreGapAbs',
      'pythonDetCount',
      'frontendDetCount',
      'frontendConfigId',
      'boxFormat',
      'frontendElapsedMs',
      'frontendRawCandidateCount',
      'frontendThresholdCandidateCount',
      'frontendNmsCount',
      'frontendThresholdUsed',
      'frontendFallbackUsed'
    ], csvRows);

    const groupRows = [];
    for (const scenario of evaluatedScenarios) {
      for (const [expectedClassName, metrics] of Object.entries(scenario.metrics.byExpectedClassName)) {
        groupRows.push({
          scenarioId: scenario.id,
          stage: scenario.stage,
          expectedClassName,
          sampleCount: metrics.sampleCount,
          pythonDetectedCount: metrics.pythonDetectedCount,
          frontendDetectedCount: metrics.frontendDetectedCount,
          frontendDetectionRateOnPythonDetected: metrics.frontendDetectionRateOnPythonDetected,
          top1ClassMatchRateOnPythonDetected: metrics.top1ClassMatchRateOnPythonDetected,
          meanTop1IoU: metrics.meanTop1IoU,
          meanTop1ScoreGapAbs: metrics.meanTop1ScoreGapAbs,
          failureSamples: metrics.failureSamples.join('; ')
        });
      }
    }

    writeCsv(OUTPUT_GROUP_CSV, [
      'scenarioId',
      'stage',
      'expectedClassName',
      'sampleCount',
      'pythonDetectedCount',
      'frontendDetectedCount',
      'frontendDetectionRateOnPythonDetected',
      'top1ClassMatchRateOnPythonDetected',
      'meanTop1IoU',
      'meanTop1ScoreGapAbs',
      'failureSamples'
    ], groupRows);

    console.log('[blackbox-align] done');
    console.log(`[blackbox-align] json=${OUTPUT_JSON}`);
    console.log(`[blackbox-align] csv=${OUTPUT_CSV}`);
    console.log(`[blackbox-align] groupCsv=${OUTPUT_GROUP_CSV}`);
    if (bestScenario) {
      console.log(`[blackbox-align] best=${bestScenario.id}`);
    }
    if (stopReason) {
      console.log(`[blackbox-align] stopReason=${stopReason}`);
    }
  } finally {
    if (model && model.dispose) {
      model.dispose();
    }
  }
}

main().catch((error) => {
  console.error('[blackbox-align] failed');
  console.error(error);
  process.exitCode = 1;
});
