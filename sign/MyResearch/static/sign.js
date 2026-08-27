/* =========================
   ELEMENT REFERENCES
========================= */

const inputEl = document.getElementById("sign-input");
const predictBtn = document.getElementById("predict-btn");
const labelsBtn = document.getElementById("labels-btn");
const clearBtn = document.getElementById("clear-btn");
const readLastStoryBtn = document.getElementById("read-last-story-btn");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const resultCountEl = document.getElementById("result-count");
const labelsEl = document.getElementById("labels");
const filterEl = document.getElementById("label-filter");

// Story elements
const storyPanel = document.getElementById("story-panel");
const storyTextEl = document.getElementById("story-text");
const storyMoodEl = document.getElementById("story-mood");
const playStoryBtn = document.getElementById("play-story-btn");

const playerCanvas = document.getElementById("player-canvas");
const nowPlayingEl = document.getElementById("now-playing");
const playerLogEl = document.getElementById("player-log");
const terminalLogEl = document.getElementById("terminal-log");

const playBtn = document.getElementById("play-btn");
const pauseBtn = document.getElementById("pause-btn");
const restartBtn = document.getElementById("restart-btn");
const nextBtn = document.getElementById("next-btn");
const stopBtn = document.getElementById("stop-btn");

const speedRange = document.getElementById("speed-range");
const smoothRange = document.getElementById("smooth-range");
const blendRange = document.getElementById("blend-range");

const speedValueEl = document.getElementById("speed-value");
const smoothValueEl = document.getElementById("smooth-value");
const blendValueEl = document.getElementById("blend-value");

/* =========================
   GLOBAL STATE
========================= */

let allLabels = [];
let sequence = [];
let inputTokens = [];

let signIndex = 0;
let frameCursor = 0;

let paused = false;
let playing = false;
let singleMode = false;

let animTimer = null;
let previewTimers = [];

let inTransition = false;
let transitionCursor = 0;

const canvasStates = new WeakMap();

const PLAYER_TICK_MS = 16;

let frameAdvance = 0.38;
let baseSmoothness = 0.74;
let transitionSteps = 12;

/* =========================
   UI HELPERS
========================= */

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#a22020" : "";
}

function appendTerminalLog(message) {
  const time = new Date().toLocaleTimeString();
  terminalLogEl.textContent += `\n[${time}] ${message}`;
  terminalLogEl.scrollTop = terminalLogEl.scrollHeight;
}

function resetTerminalLog() {
  terminalLogEl.textContent = "Terminal log ready.";
}

/* =========================
   TEXT PROCESSING
========================= */

function normalizeForSign(text) {
  // Split by newlines to keep phrases separate, then clean each phrase
  const phrases = text.split(/\n+/);
  const cleanedPhrases = phrases.map(phrase => 
    phrase
      .replace(/\r/g, "")  // Remove carriage returns
      .replace(/\n/g, "")  // Remove newlines within phrases
      .trim()               // Clean whitespace
  ).filter(phrase => phrase.length > 0); // Remove empty phrases
  
  // Join phrases with commas for the API
  return cleanedPhrases.join(", ");
}

function parseInputTokens(text) {
  return text
    .replace(/\r/g, "")
    .replace(/\n/g, ",")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

/* =========================
   RESULTS UI
========================= */

function renderResults(items) {

  for (const t of previewTimers) clearInterval(t);
  previewTimers = [];

  resultsEl.innerHTML = "";
  resultCountEl.textContent = String(items.length);

  if (!items.length) {
    resultsEl.innerHTML = "<p>No predictions yet.</p>";
    return;
  }

  for (const item of items) {

    const card = document.createElement("article");
    card.className = "card";

    const label = item.resolved_label || item.predicted_label || "Unknown";
    const confidence = typeof item.confidence === "number"
      ? item.confidence.toFixed(4)
      : "0.0000";

    const canvasId = `sign-canvas-${Math.random().toString(36).slice(2)}`;

    card.innerHTML = `
      <div><strong>Input:</strong> ${item.input || ""}</div>
      <div><strong>Resolved Label:</strong> ${label}</div>

      <div class="meta">
        <span class="pill">Confidence: ${confidence}</span>
        <span class="pill">Frames: ${item.frame_count || 0}</span>
      </div>

      ${item.animation_frames && item.animation_frames.length
        ? `<canvas id="${canvasId}" class="sign-canvas" width="460" height="220"></canvas>`
        : "<p>No animation data.</p>"}
    `;

    resultsEl.appendChild(card);

    if (item.animation_frames && item.animation_frames.length) {
      const canvas = card.querySelector(`#${canvasId}`);
      startPreviewAnimation(canvas, item.animation_frames);
    }
  }
}

/* =========================
   SMOOTHING + NORMALIZATION
========================= */

function adaptiveSmoothPoints(prev, curr, minAlpha = 0.5, maxAlpha = 0.9, cap = 18) {

  if (!prev || prev.length !== curr.length) return curr;

  return curr.map((p, i) => {

    const dx = p[0] - prev[i][0];
    const dy = p[1] - prev[i][1];

    const speed = Math.hypot(dx, dy);
    const w = Math.min(speed / cap, 1);

    const alpha = maxAlpha - w * (maxAlpha - minAlpha);

    return [
      prev[i][0] * alpha + p[0] * (1 - alpha),
      prev[i][1] * alpha + p[1] * (1 - alpha)
    ];
  });
}

function normalizeAndSmoothFrame(canvas, frame) {

  const w = canvas.width;
  const h = canvas.height;

  const scale = (p) => p ? [p[0] * w, p[1] * h] : null;

  const pose = (frame.pose || []).map(scale);
  const left = (frame.left || []).map(scale);
  const right = (frame.right || []).map(scale);

  const prev = canvasStates.get(canvas);

  const smooth = {
    pose: adaptiveSmoothPoints(prev?.pose, pose),
    left: adaptiveSmoothPoints(prev?.left, left),
    right: adaptiveSmoothPoints(prev?.right, right)
  };

  canvasStates.set(canvas, smooth);

  return smooth;
}

/* =========================
   INTERPOLATION
========================= */

function interpolatePoint(a, b, t) {

  if (!a && !b) return null;
  if (!a) return b;
  if (!b) return a;

  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t
  ];
}

function interpolateFrame(a, b, t) {

  const mix = (A, B) => {

    const max = Math.max(A.length, B.length);
    const out = [];

    for (let i = 0; i < max; i++) {
      out.push(interpolatePoint(A[i], B[i], t));
    }

    return out;
  };

  return {
    pose: mix(a?.pose || [], b?.pose || []),
    left: mix(a?.left || [], b?.left || []),
    right: mix(a?.right || [], b?.right || [])
  };
}

/* =========================
   AVATAR DRAWING
========================= */

function bone(ctx, p1, p2, w, col) {

  if (!p1 || !p2) return;

  ctx.lineWidth = w;
  ctx.strokeStyle = col;

  ctx.beginPath();
  ctx.moveTo(p1[0], p1[1]);
  ctx.lineTo(p2[0], p2[1]);
  ctx.stroke();

  ctx.fillStyle = col;

  ctx.beginPath();
  ctx.arc(p1[0], p1[1], w * 1.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(p2[0], p2[1], w * 1.2, 0, Math.PI * 2);
  ctx.fill();
}

/* IK ARM SOLVER */

function solveIK(shoulder, wrist, upper, lower, bend = 1) {

  if (!shoulder || !wrist) return null;

  const dx = wrist[0] - shoulder[0];
  const dy = wrist[1] - shoulder[1];

  const dist = Math.hypot(dx, dy);

  const d = Math.max(
    Math.abs(upper - lower) + 1,
    Math.min(dist, upper + lower - 1)
  );

  const a = Math.acos(
    (upper * upper + d * d - lower * lower) /
    (2 * upper * d)
  );

  const base = Math.atan2(dy, dx);
  const ang = base + bend * a;

  return [
    shoulder[0] + Math.cos(ang) * upper,
    shoulder[1] + Math.sin(ang) * upper
  ];
}

/* HAND */

function drawHand(ctx, hand) {

  if (!hand || hand.length < 21) return;

  const fingers = [
    [0,1,2,3,4],
    [0,5,6,7,8],
    [0,9,10,11,12],
    [0,13,14,15,16],
    [0,17,18,19,20]
  ];

  for (const f of fingers) {

    for (let i = 0; i < f.length - 1; i++) {

      bone(ctx, hand[f[i]], hand[f[i+1]], 4, "#e6b7a3");
    }
  }
}

/* TORSO */

function drawTorso(ctx, pose) {

  const ls = pose[11];
  const rs = pose[12];
  const lh = pose[23];
  const rh = pose[24];

  if (!ls || !rs || !lh || !rh) return;

  ctx.fillStyle = "#3c77d8";

  ctx.beginPath();
  ctx.moveTo(ls[0]-10, ls[1]+5);
  ctx.lineTo(rs[0]+10, rs[1]+5);
  ctx.lineTo(rh[0]-15, rh[1]);
  ctx.lineTo(lh[0]+15, lh[1]);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ebc2a6";

  ctx.beginPath();
  ctx.arc(ls[0], ls[1], 14, 0, Math.PI*2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(rs[0], rs[1], 14, 0, Math.PI*2);
  ctx.fill();
}

/* HEAD */

function drawHead(ctx, pose) {

  const nose = pose[0];
  const ls = pose[11];
  const rs = pose[12];

  if (!nose || !ls || !rs) return;

  const dist = Math.hypot(ls[0]-rs[0], ls[1]-rs[1]);

  const r = Math.max(10, dist * 0.22);

  ctx.fillStyle = "#ebc2a6";

  ctx.beginPath();
  ctx.arc(nose[0], nose[1], r, 0, Math.PI*2);
  ctx.fill();
}

/* =========================
   MAIN DRAW FUNCTION
========================= */

function drawFrameToCanvas(canvas, frame) {

  if (!canvas || !frame) return;

  const ctx = canvas.getContext("2d");

  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0,0,w,h);

  ctx.fillStyle = "#0e0f14";
  ctx.fillRect(0,0,w,h);

  const norm = normalizeAndSmoothFrame(canvas, frame);

  const pose = norm.pose;

  drawTorso(ctx, pose);
  drawHead(ctx, pose);

  const ls = pose[11];
  const rs = pose[12];
  const lw = pose[15];
  const rw = pose[16];

  const upper = 70;
  const lower = 60;

  const le = solveIK(ls, lw, upper, lower, 1);
  const re = solveIK(rs, rw, upper, lower, -1);

  bone(ctx, ls, le, 9, "#e5b7a3");
  bone(ctx, le, lw, 7, "#e5b7a3");

  bone(ctx, rs, re, 9, "#e5b7a3");
  bone(ctx, re, rw, 7, "#e5b7a3");

  const pants = "#2d3a7a";

  bone(ctx, pose[23], pose[25], 10, pants);
  bone(ctx, pose[25], pose[27], 8, pants);

  bone(ctx, pose[24], pose[26], 10, pants);
  bone(ctx, pose[26], pose[28], 8, pants);

  drawHand(ctx, norm.left);
  drawHand(ctx, norm.right);
}

/* =========================
   PREVIEW ANIMATION
========================= */

function startPreviewAnimation(canvas, frames) {

  if (!canvas || !frames.length) return;

  let c = 0;

  drawFrameToCanvas(canvas, frames[0]);

  const timer = setInterval(() => {

    const i0 = Math.floor(c) % frames.length;
    const i1 = (i0 + 1) % frames.length;

    const t = c - Math.floor(c);

    drawFrameToCanvas(
      canvas,
      interpolateFrame(frames[i0], frames[i1], t)
    );

    c += frameAdvance;

    if (c >= frames.length) c = 0;

  }, PLAYER_TICK_MS);

  previewTimers.push(timer);
}

/* =========================
   PLAYER SYSTEM
========================= */

function updatePlayerBadge() {

  if (!sequence.length) {
    nowPlayingEl.textContent = "Idle";
    return;
  }

  const current = sequence[signIndex];

  const label =
    current.resolved_label ||
    current.predicted_label ||
    current.input;

  nowPlayingEl.textContent = `Animating '${label}'`;
}

function stopPlayer() {

  playing = false;
  paused = false;

  if (animTimer) clearInterval(animTimer);

  animTimer = null;

  canvasStates.delete(playerCanvas);

  nowPlayingEl.textContent = "Idle";

  playerLogEl.textContent = "Playback stopped.";

  appendTerminalLog("Stopped playback.");
}

function advanceToNextSign() {

  if (!sequence.length) return;

  signIndex = (signIndex + 1) % sequence.length;

  frameCursor = 0;

  inTransition = false;
  transitionCursor = 0;

  updatePlayerBadge();
}

/* =========================
   PLAYER LOOP
========================= */

function tickPlayer() {

  if (!playing || paused || !sequence.length) return;

  const current = sequence[signIndex];

  const frames = current.animation_frames || [];

  if (!frames.length) {
    advanceToNextSign();
    return;
  }

  const i0 = Math.floor(frameCursor);
  const i1 = Math.min(i0 + 1, frames.length - 1);

  const t = frameCursor - i0;

  drawFrameToCanvas(
    playerCanvas,
    interpolateFrame(frames[i0], frames[i1], t)
  );

  frameCursor += frameAdvance;

  if (frameCursor >= frames.length - 1) {
    frameCursor = 0;
  }
}

function startPlayer() {

  if (!sequence.length) return;

  if (animTimer) clearInterval(animTimer);

  canvasStates.delete(playerCanvas);

  playing = true;
  paused = false;

  updatePlayerBadge();

  animTimer = setInterval(tickPlayer, PLAYER_TICK_MS);
}

/* =========================
   LABELS
========================= */

function renderLabels(labels) {

  labelsEl.innerHTML = "";

  for (const label of labels) {

    const chip = document.createElement("span");

    chip.className = "label-chip";

    chip.textContent = label;

    labelsEl.appendChild(chip);
  }
}

/* =========================
   LOAD LABELS
========================= */

async function loadLabels() {

  setStatus("Loading labels...");

  try {

    const res = await fetch("/api/sign/labels");
    const data = await res.json();

    allLabels = data.labels || [];

    renderLabels(allLabels);

    setStatus(`Loaded ${allLabels.length} labels.`);

  } catch (err) {

    setStatus("Could not load labels.", true);
  }
}

/* =========================
   PREDICT
========================= */

async function predictSigns() {

  const rawText = inputEl.value.trim();

  if (!rawText) {
    setStatus("Enter text first.", true);
    return;
  }

  const text = normalizeForSign(rawText);

  inputEl.value = text;

  inputTokens = parseInputTokens(text);

  singleMode = inputTokens.length <= 1;

  stopPlayer();

  try {

    const res = await fetch("/api/sign/predict", {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({ text })
    });

    const data = await res.json();

    const results = data.results || [];

    renderResults(results);

    sequence = results.filter(
      (x) => x.animation_frames && x.animation_frames.length
    );

    signIndex = 0;
    frameCursor = 0;

    if (sequence.length) {

      drawFrameToCanvas(
        playerCanvas,
        sequence[0].animation_frames[0]
      );
    }

    setStatus("Prediction complete.");

  } catch (err) {

    setStatus("Prediction failed.", true);
  }
}

/* =========================
   CONTROLS
========================= */

predictBtn.addEventListener("click", predictSigns);
labelsBtn.addEventListener("click", loadLabels);
clearBtn.addEventListener("click", () => {
  inputEl.value = "";
  resultsEl.innerHTML = "";
  resultCountEl.textContent = "0";
  sequence = [];
  inputTokens = [];
  stopPlayer();
  setStatus("Cleared.");
});

// Read Last Story functionality
if (readLastStoryBtn) {
  readLastStoryBtn.addEventListener("click", () => {
    loadStoryFromSimulate();
    setStatus("Last story loaded from memory!");
  });
}

playBtn.addEventListener("click", startPlayer);

pauseBtn.addEventListener("click", () => {

  if (!playing) return;

  paused = !paused;

  playerLogEl.textContent = paused ? "Paused." : "Resumed.";
});

restartBtn.addEventListener("click", () => {

  frameCursor = 0;

  canvasStates.delete(playerCanvas);
});

nextBtn.addEventListener("click", advanceToNextSign);

stopBtn.addEventListener("click", stopPlayer);

/* =========================
   SPEED / SMOOTH SETTINGS
========================= */

speedRange.addEventListener("input", () => {

  frameAdvance = parseFloat(speedRange.value);

  speedValueEl.textContent = frameAdvance.toFixed(2);
});

smoothRange.addEventListener("input", () => {

  baseSmoothness = parseFloat(smoothRange.value);

  canvasStates.delete(playerCanvas);

  smoothValueEl.textContent = baseSmoothness.toFixed(2);
});

blendRange.addEventListener("input", () => {

  transitionSteps = parseInt(blendRange.value);

  blendValueEl.textContent = transitionSteps;
});

/* =========================
   STORY LOADING FROM SIMULATE
========================= */

function loadStoryFromSimulate() {
  const lastStory = localStorage.getItem("lastStory");
  const lastMood = localStorage.getItem("lastMood");
  const lastSignSequence = localStorage.getItem("lastSignSequence");
  
  // Debug logging
  console.log("Loading story from simulate:", { lastStory, lastMood, lastSignSequence });
  
  if (lastStory) {
    // Show story panel even if mood is missing
    storyPanel.style.display = "block";
    storyTextEl.textContent = lastStory;
    
    if (lastMood) {
      storyMoodEl.textContent = lastMood.charAt(0).toUpperCase() + lastMood.slice(1);
      storyMoodEl.className = "badge";
    } else {
      storyMoodEl.textContent = "Unknown";
      storyMoodEl.className = "badge";
    }
    
    // Try to parse sign sequence
    try {
      const signSequence = JSON.parse(lastSignSequence || "[]");
      if (signSequence.length > 0) {
        // Load signs into the input and predict
        inputEl.value = lastStory;
        setStatus("Story loaded! Click 'Play Signs for Story' to start.");
        
        // Auto-predict signs for the story
        setTimeout(() => {
          predictSigns();
        }, 1000);
      } else {
        setStatus("Story loaded. Ready to predict signs.");
      }
    } catch (e) {
      console.error("Error parsing sign sequence:", e);
      setStatus("Story loaded. Ready to predict signs.");
    }
  } else {
    setStatus("No story found. Please go to mood detection first.");
    console.log("No story found in localStorage");
  }
}

function playStorySigns() {
  const signs = document.querySelectorAll(".prediction-card");
  if (signs.length > 0) {
    // Load first sign into player
    const firstSign = signs[0];
    loadSignIntoPlayer(firstSign);
    
    // Start playing
    startPlayer();
    setStatus(`Playing signs for story: ${storyTextEl.textContent.substring(0, 50)}...`);
  } else {
    setStatus("No signs to play. Please click 'Predict Signs' first.");
  }
}

// Add event listener for play story button
if (playStoryBtn) {
  playStoryBtn.addEventListener("click", playStorySigns);
}

/* =========================
   INIT
========================= */

renderResults([]);
resetTerminalLog();

// Load story on page load
document.addEventListener("DOMContentLoaded", () => {
  loadStoryFromSimulate();
});