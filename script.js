const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const emojiEl = document.getElementById('emoji');
const labelEl = document.getElementById('label');
const modelStatusEl = document.getElementById('model-status');
const fpsEl = document.getElementById('fps');
const smoothingInput = document.getElementById('smoothing');
const minConfidenceInput = document.getElementById('minConfidence');
const updateMsInput = document.getElementById('updateMs');

// Pre-hosted models (GitHub Pages) for quick start
// Source is widely used in tutorials; for production, self-host under ./models
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

const EMOJI_MAP = {
  neutral: '😐',
  happy: '😀',
  sad: '😢',
  angry: '😠',
  fearful: '😨',
  disgusted: '🤢',
  surprised: '😮',
};

let lastTime = performance.now();
let frameCount = 0;
let fps = 0;

// Exponential moving average for smoothing scores
let emaScores = {
  neutral: 0,
  happy: 0,
  sad: 0,
  angry: 0,
  fearful: 0,
  disgusted: 0,
  surprised: 0,
};

function updateFPS() {
  const now = performance.now();
  frameCount++;
  if (now - lastTime >= 1000) {
    fps = Math.round((frameCount * 1000) / (now - lastTime));
    fpsEl.textContent = `FPS: ${fps}`;
    frameCount = 0;
    lastTime = now;
  }
}

async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
  video.srcObject = stream;
  await new Promise((res) => (video.onloadedmetadata = res));
  video.play();

  // Match canvas size to video
  overlay.width = video.videoWidth;
  overlay.height = video.videoHeight;
}

async function loadModels() {
  modelStatusEl.textContent = 'Loading models...';
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
  modelStatusEl.textContent = 'Models loaded';
}

function drawBoxAndLabel(detection, bestExpression, alpha) {
  const ctx = overlay.getContext('2d');
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  const { x, y, width, height } = detection.box;

  ctx.strokeStyle = 'rgba(110,168,254,0.9)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);

  const label = `${bestExpression.name} (${bestExpression.score.toFixed(2)})`;
  ctx.font = '14px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  const textWidth = ctx.measureText(label).width;
  const padding = 4;
  ctx.fillStyle = 'rgba(17,20,26,0.8)';
  ctx.strokeStyle = 'rgba(42,49,69,1)';
  ctx.lineWidth = 1;
  ctx.fillRect(x, Math.max(0, y - 22), textWidth + padding * 2, 20);
  ctx.strokeRect(x, Math.max(0, y - 22), textWidth + padding * 2, 20);
  ctx.fillStyle = '#c8d0e0';
  ctx.fillText(label, x + padding, Math.max(12, y - 8));

  // UI badges
  emojiEl.textContent = EMOJI_MAP[bestExpression.name] || '😐';
  labelEl.textContent = label;
  labelEl.style.opacity = alpha.toFixed(2);
}

function pickLargestFace(detections) {
  if (!detections || detections.length === 0) return null;
  let best = detections[0];
  let maxArea = best.detection.box.width * best.detection.box.height;
  for (const d of detections) {
    const area = d.detection.box.width * d.detection.box.height;
    if (area > maxArea) {
      best = d;
      maxArea = area;
    }
  }
  return best;
}

function updateEMAScores(expressions, alpha) {
  const keys = Object.keys(emaScores);
  for (const k of keys) {
    const val = expressions[k] ?? 0;
    emaScores[k] = alpha * emaScores[k] + (1 - alpha) * val;
  }
}

function getBestExpression() {
  let best = { name: 'neutral', score: 0 };
  for (const [name, score] of Object.entries(emaScores)) {
    if (score > best.score) best = { name, score };
  }
  return best;
}

async function run() {
  try {
    await setupCamera();
  } catch (err) {
    modelStatusEl.textContent = 'Camera error. Allow camera permissions and refresh.';
    console.error(err);
    return;
  }

  try {
    await loadModels();
  } catch (err) {
    modelStatusEl.textContent = 'Model load failed. Check network or self-host models under ./models';
    console.error(err);
    return;
  }

  const getOptions = () => new faceapi.TinyFaceDetectorOptions({
    inputSize: 224,
    scoreThreshold: Number(minConfidenceInput.value)
  });

  let lastUpdate = 0;

  const loop = async (t) => {
    updateFPS();

    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const interval = Math.max(30, Number(updateMsInput.value) || 100);
    if (t - lastUpdate >= interval) {
      try {
        const results = await faceapi
          .detectAllFaces(video, getOptions())
          .withFaceExpressions();

        const bestFace = pickLargestFace(results);
        if (bestFace) {
          const alpha = Number(smoothingInput.value);
          updateEMAScores(bestFace.expressions, alpha);
          const best = getBestExpression();
          drawBoxAndLabel(bestFace.detection, best, 1 - alpha);
        } else {
          // decay towards neutral when no face
          const alpha = Number(smoothingInput.value);
          updateEMAScores({ neutral: 1 }, alpha);
          const best = getBestExpression();
          emojiEl.textContent = EMOJI_MAP[best.name] || '😐';
          labelEl.textContent = `${best.name} (${best.score.toFixed(2)})`;
        }
      } catch (err) {
        console.error('Detection error', err);
      }
      lastUpdate = t;
    }

    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);
}

window.addEventListener('DOMContentLoaded', run);
