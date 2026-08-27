const API_BASE = "http://localhost:8001";
const WS_BASE = "ws://localhost:8001";

const backendStatusEl = document.getElementById("backendStatus");
const wsStatusEl = document.getElementById("wsStatus");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const errorBox = document.getElementById("errorBox");

const liveBadge = document.getElementById("liveBadge");
const livePrediction = document.getElementById("livePrediction");
const liveConfidence = document.getElementById("liveConfidence");
const liveTimestamp = document.getElementById("liveTimestamp");
const liveDuration = document.getElementById("liveDuration");
const liveVolume = document.getElementById("liveVolume");
const liveSeverity = document.getElementById("liveSeverity");
const liveExercise = document.getElementById("liveExercise");
const severityRow = document.getElementById("severityRow");

const summaryText = document.getElementById("summaryText");
const finalLabel = document.getElementById("finalLabel");
const finalBadge = document.getElementById("finalBadge");
const sessionExerciseEl = document.getElementById("sessionExercise");
const historyTable = document.getElementById("historyTable");
const audioFileInput = document.getElementById("audioFileInput");
const predictBtn = document.getElementById("predictBtn");
const uploadPrediction = document.getElementById("uploadPrediction");
const uploadMeta = document.getElementById("uploadMeta");
const uploadExercise = document.getElementById("uploadExercise");

let ws = null;
let wantsSocket = false;
let reconnectTimer = null;
let historyItems = [];

function setBackendStatus(online) {
  backendStatusEl.textContent = online ? "BACKEND: ONLINE" : "BACKEND: OFFLINE";
  backendStatusEl.style.background = online ? "#e8f6ef" : "#fff3e7";
  backendStatusEl.style.color = online ? "#1e6f4f" : "#8b4f3c";
}

function setWsStatus(connected) {
  wsStatusEl.textContent = connected ? "WEBSOCKET: CONNECTED" : "WEBSOCKET: DISCONNECTED";
  wsStatusEl.style.background = connected ? "#e8f6ef" : "#fff3e7";
  wsStatusEl.style.color = connected ? "#1e6f4f" : "#8b4f3c";
}

function showError(message) {
  errorBox.textContent = message || "";
}

async function fetchStatus() {
  try {
    const response = await fetch(`${API_BASE}/session/status`);
    if (!response.ok) {
      throw new Error("Backend status not available");
    }
    const data = await response.json();
    setBackendStatus(true);
    summaryText.textContent = data.summary || "No detections recorded";
    finalLabel.textContent = data.final_classification || "--";
    finalBadge.textContent = data.final_classification ? "Complete" : "Not finished";
    // show session-level suggested exercise if available
    if (data.suggested_exercise) {
      sessionExerciseEl.textContent = data.suggested_exercise;
    } else if (data.recommended_exercises && data.recommended_exercises.length) {
      sessionExerciseEl.textContent = data.recommended_exercises[0];
    } else {
      sessionExerciseEl.textContent = "--";
    }
    if (data.last_error) {
      showError(data.last_error);
    }
    if (data.running && !wantsSocket) {
      wantsSocket = true;
      connectWebSocket();
    }
  } catch (err) {
    setBackendStatus(false);
  }
}

function updateLiveResult(event) {
  const prediction = event.prediction || "--";
  livePrediction.textContent = prediction;
  liveConfidence.textContent = `${event.confidence.toFixed(2)}%`;
  liveTimestamp.textContent = event.timestamp;
  liveDuration.textContent = `${event.duration_sec.toFixed(2)}s`;
  liveVolume.textContent = event.volume.toFixed(4);
  liveBadge.textContent = prediction;
  liveBadge.className = prediction === "Normal" ? "badge pill-normal" : "badge pill-disorder";

  if (prediction === "Stuttering_Disorder") {
    severityRow.style.display = "grid";
    liveSeverity.textContent = event.severity || "--";
    liveExercise.textContent = event.exercise_suggestion || "--";
  } else {
    severityRow.style.display = "none";
  }
}

function renderHistory() {
  if (historyItems.length === 0) {
    historyTable.innerHTML = '<tr><td colspan="6" class="empty-row">No detections yet</td></tr>';
    return;
  }
  historyTable.innerHTML = historyItems
    .map((item) => {
      const predClass = item.prediction === "Normal" ? "pill-normal" : "pill-disorder";
      return `
        <tr>
          <td>${item.timestamp}</td>
          <td><span class="${predClass}">${item.prediction}</span></td>
          <td>${item.confidence.toFixed(2)}%</td>
          <td>${item.severity || "--"}</td>
          <td>${item.duration_sec.toFixed(2)}s</td>
          <td>${item.volume.toFixed(4)}</td>
        </tr>
      `;
    })
    .join("");
}

function handleEvent(event) {
  updateLiveResult(event);
  historyItems.unshift(event);
  historyItems = historyItems.slice(0, 20);
  renderHistory();
}

function connectWebSocket() {
  if (!wantsSocket) {
    return;
  }
  if (ws) {
    ws.close();
  }
  ws = new WebSocket(`${WS_BASE}/ws/detections`);

  ws.onopen = () => {
    setWsStatus(true);
    showError("");
  };

  ws.onmessage = (msg) => {
    try {
      const event = JSON.parse(msg.data);
      console.debug('WS event received:', event);

      // If stuttering detected but no exercise provided, request therapy suggestion
      // treat null/undefined/empty as missing
      const hasExercise = event.exercise_suggestion !== undefined && event.exercise_suggestion !== null && String(event.exercise_suggestion).trim() !== '';
      if (event.prediction === 'Stuttering_Disorder' && !hasExercise) {
        (async () => {
          try {
            const resp = await fetch(`${API_BASE}/therapy`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ severity: event.severity, confidence: event.confidence })
            });
            if (resp.ok) {
              const data = await resp.json();
              if (data && data.suggestion) {
                event.exercise_suggestion = data.suggestion;
              } else if (data && data.recommended_exercises && data.recommended_exercises.length) {
                event.exercise_suggestion = data.recommended_exercises[0];
              }
            }
          } catch (e) {
            // ignore errors and continue with event as-is
          } finally {
            handleEvent(event);
          }
        })();
        return;
      }

      handleEvent(event);
    } catch (err) {
      showError("Invalid event payload received");
    }
  };

  ws.onclose = () => {
    setWsStatus(false);
    if (wantsSocket) {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      reconnectTimer = setTimeout(connectWebSocket, 2000);
    }
  };

  ws.onerror = () => {
    setWsStatus(false);
  };
}

startBtn.addEventListener("click", async () => {
  showError("");
  try {
    const response = await fetch(`${API_BASE}/session/start`, { method: "POST" });
    const data = await response.json();
    wantsSocket = true;
    connectWebSocket();
    if (data.message) {
      showError(data.message);
    }
    await fetchStatus();
  } catch (err) {
    showError("Failed to start session");
  }
});

stopBtn.addEventListener("click", async () => {
  showError("");
  try {
    await fetch(`${API_BASE}/session/stop`, { method: "POST" });
    wantsSocket = false;
    if (ws) {
      ws.close();
    }
    await fetchStatus();
  } catch (err) {
    showError("Failed to stop session");
  }
});

severityRow.style.display = "none";
fetchStatus();
setInterval(fetchStatus, 5000);

predictBtn.addEventListener("click", async () => {
  showError("");
  const file = audioFileInput.files[0];
  if (!file) {
    showError("Please choose an audio file.");
    return;
  }
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${API_BASE}/predict/file`, {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    if (data.error) {
      showError(data.error);
      return;
    }
    uploadPrediction.textContent = data.prediction;
    const meta = `Confidence: ${data.confidence.toFixed(2)}% | Audio: ${data.duration_sec.toFixed(
      2
    )}s | Volume: ${data.volume.toFixed(4)}`;
    uploadMeta.textContent = meta;
    if (data.prediction === "Stuttering_Disorder") {
      uploadExercise.textContent = `Severity: ${data.severity} | Exercise: ${data.exercise_suggestion}`;
    } else {
      uploadExercise.textContent = "Normal speech detected";
    }
  } catch (err) {
    showError("File prediction failed.");
  }
});
