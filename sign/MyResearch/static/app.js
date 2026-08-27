const inputEl = document.getElementById("story-input");
const analyzeBtn = document.getElementById("analyze-btn");
const clearBtn = document.getElementById("clear-btn");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const countPillEl = document.getElementById("count-pill");

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#a12626" : "";
}

function renderResults(items) {
  resultsEl.innerHTML = "";
  countPillEl.textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;

  if (!items.length) {
    resultsEl.innerHTML = "<p>No results yet.</p>";
    return;
  }

  for (const item of items) {
    const card = document.createElement("article");
    card.className = "result-card";

    const safeSentence = item.sentence ?? "";
    const safeEmotion = item.emotion ?? "Unknown";
    const score = typeof item.score === "number" ? item.score.toFixed(2) : "N/A";
    const audioUrl = item.tts_audio_url || "";

    card.innerHTML = `
      <div><strong>Sentence:</strong> ${safeSentence}</div>
      <div class="meta">
        <span class="tag">Emotion: ${safeEmotion}</span>
        <span class="tag">Score: ${score}</span>
      </div>
      ${audioUrl ? `<audio controls src="${audioUrl}"></audio>` : "<em>No audio file returned.</em>"}
    `;

    resultsEl.appendChild(card);
  }
}

async function analyzeText() {
  const raw = inputEl.value.trim();
  if (!raw) {
    setStatus("Enter at least one sentence.", true);
    renderResults([]);
    return;
  }

  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const payload = lines.length === 1 ? { sentence: lines[0] } : { story: lines };

  analyzeBtn.disabled = true;
  setStatus("Processing...");

  try {
    const response = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Request failed.");
    }

    renderResults(data.results || []);
    setStatus("Done.");
  } catch (error) {
    renderResults([]);
    setStatus(error.message || "Something went wrong.", true);
  } finally {
    analyzeBtn.disabled = false;
  }
}

analyzeBtn.addEventListener("click", analyzeText);
clearBtn.addEventListener("click", () => {
  inputEl.value = "";
  renderResults([]);
  setStatus("Cleared.");
});

renderResults([]);
