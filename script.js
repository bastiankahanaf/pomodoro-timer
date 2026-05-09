const CIRCUMFERENCE = 2 * Math.PI * 90;

const state = {
  mode: "focus",
  running: false,
  timeLeft: 25 * 60,
  totalTime: 25 * 60,
  interval: null,
  session: 0,
  notifGranted: false,
};

const modeConfig = {
  focus: {
    label: "Focus Time",
    tagline: "Take a breath — you're right on time.",
    ringColor: "#e8673a",
  },
  short: {
    label: "Short Break",
    tagline: "Stretch, hydrate, rest your eyes.",
    ringColor: "#3de8a0",
  },
  long: {
    label: "Long Break",
    tagline: "Great work! Take a longer rest.",
    ringColor: "#5b9cf6",
  },
};

// ── Elements ──────────────────────────────────────────────
const timerDisplay = document.getElementById("timerDisplay");
const sessionLabel = document.getElementById("sessionLabel");
const tagline = document.getElementById("tagline");
const ringProgress = document.getElementById("ringProgress");
const pomoCard = document.getElementById("pomoCard");
const startPauseBtn = document.getElementById("startPauseBtn");
const startPauseLabel = document.getElementById("startPauseLabel");
const playIcon = document.getElementById("playIcon");
const sessionCounterLabel = document.getElementById("sessionCounterLabel");
const notifBtn = document.getElementById("notifBtn");
const notifLabel = document.getElementById("notifLabel");

const modeBtns = {
  focus: document.getElementById("modeFocus"),
  short: document.getElementById("modeShort"),
  long: document.getElementById("modeLong"),
};

// ── Audio (Web Audio API — no file needed) ────────────────
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx)
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playDing() {
  try {
    const ctx = getAudioCtx();
    // Three gentle chime notes
    [
      [523.25, 0],
      [659.25, 0.18],
      [783.99, 0.36],
    ].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + delay + 1.2,
      );
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 1.2);
    });
  } catch (e) {
    console.warn("Audio playback failed:", e);
  }
}

// ── Helpers ───────────────────────────────────────────────
function getMinutes() {
  return {
    focus: parseInt(document.getElementById("inputFocus").value) || 25,
    short: parseInt(document.getElementById("inputShort").value) || 5,
    long: parseInt(document.getElementById("inputLong").value) || 15,
  };
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Render ────────────────────────────────────────────────
function updateDisplay() {
  const cfg = modeConfig[state.mode];

  timerDisplay.textContent = formatTime(state.timeLeft);

  const ratio = state.totalTime > 0 ? state.timeLeft / state.totalTime : 1;
  const offset = CIRCUMFERENCE * (1 - ratio);
  ringProgress.style.strokeDashoffset = offset;
  ringProgress.style.stroke = cfg.ringColor;

  sessionLabel.textContent = cfg.label;
  tagline.textContent = cfg.tagline;

  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById("dot" + i);
    dot.classList.remove("filled", "current");
    if (i < state.session) dot.classList.add("filled");
    else if (i === state.session && state.mode === "focus")
      dot.classList.add("current");
  }
  sessionCounterLabel.textContent = `Session ${Math.min(state.session + 1, 4)} of 4`;

  pomoCard.classList.toggle("running", state.running);

  playIcon.className = state.running
    ? "ti ti-player-pause"
    : "ti ti-player-play";
  startPauseLabel.textContent = state.running ? "Pause" : "Start";
  startPauseBtn.classList.remove("mode-short", "mode-long");
  if (state.mode === "short") startPauseBtn.classList.add("mode-short");
  if (state.mode === "long") startPauseBtn.classList.add("mode-long");

  Object.entries(modeBtns).forEach(([key, btn]) =>
    btn.classList.toggle("active", key === state.mode),
  );

  document.title = `${formatTime(state.timeLeft)} — Pomodoro`;
}

// ── Timer ─────────────────────────────────────────────────
function toggleTimer() {
  // Unlock AudioContext on first user interaction
  if (!state.running) getAudioCtx();

  if (state.running) {
    clearInterval(state.interval);
    state.running = false;
  } else {
    state.running = true;
    state.interval = setInterval(tick, 1000);
  }
  updateDisplay();
}

function tick() {
  if (state.timeLeft > 0) {
    state.timeLeft--;
    updateDisplay();
  } else {
    clearInterval(state.interval);
    state.running = false;
    onSessionEnd();
  }
}

function onSessionEnd() {
  playDing();

  const wasMode = state.mode;
  let title, body;

  if (wasMode === "focus") {
    state.session = (state.session + 1) % 4;
    if (state.session === 0) {
      title = "🎉 4 sessions done!";
      body = "Time for a long break — you earned it.";
      switchMode("long", false);
    } else {
      title = "🎯 Focus session complete!";
      body = "Time for a short break.";
      switchMode("short", false);
    }
  } else {
    title = wasMode === "short" ? "☕ Break over!" : "⚡ Long break done!";
    body = "Back to focus. You've got this.";
    switchMode("focus", false);
  }

  sendNotification(title, body);
  updateDisplay();
}

function resetTimer() {
  clearInterval(state.interval);
  state.running = false;
  const mins = getMinutes();
  state.totalTime = mins[state.mode] * 60;
  state.timeLeft = state.totalTime;
  updateDisplay();
}

function switchMode(mode, doReset = true) {
  state.mode = mode;
  clearInterval(state.interval);
  if (doReset) state.running = false;
  const mins = getMinutes();
  state.totalTime = mins[mode] * 60;
  state.timeLeft = state.totalTime;
  updateDisplay();
}

function skipMode() {
  clearInterval(state.interval);
  state.running = false;
  switchMode(state.mode === "focus" ? "short" : "focus");
}

// ── Notifications ─────────────────────────────────────────
async function requestNotif() {
  if (!("Notification" in window)) {
    notifLabel.textContent = "Not supported";
    return;
  }
  if (Notification.permission === "granted") {
    state.notifGranted = true;
    updateNotifUI();
    return;
  }
  const permission = await Notification.requestPermission();
  state.notifGranted = permission === "granted";
  updateNotifUI();
}

function updateNotifUI() {
  if (state.notifGranted) {
    notifBtn.classList.add("granted");
    notifLabel.textContent = "Notifications on";
  } else {
    notifBtn.classList.remove("granted");
    notifLabel.textContent =
      Notification.permission === "denied"
        ? "Blocked by browser"
        : "Enable Notifications";
  }
}

function sendNotification(title, body) {
  // Browser notification (desktop / Android Chrome)
  if (state.notifGranted && Notification.permission === "granted") {
    new Notification(title, { body });
  }
  // In-app toast (works on all platforms including iOS)
  showToast(title, body);
}

function showToast(title, body) {
  const toast = document.createElement("div");
  toast.className = "pomo-toast";
  toast.innerHTML = `<strong>${title}</strong><span>${body}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

// ── Event Listeners ───────────────────────────────────────
startPauseBtn.addEventListener("click", toggleTimer);
document.getElementById("resetBtn").addEventListener("click", resetTimer);
document.getElementById("skipBtn").addEventListener("click", skipMode);
notifBtn.addEventListener("click", requestNotif);

modeBtns.focus.addEventListener("click", () => switchMode("focus"));
modeBtns.short.addEventListener("click", () => switchMode("short"));
modeBtns.long.addEventListener("click", () => switchMode("long"));

["inputFocus", "inputShort", "inputLong"].forEach((id) => {
  document.getElementById(id).addEventListener("change", () => {
    if (!state.running) {
      const mins = getMinutes();
      state.totalTime = mins[state.mode] * 60;
      state.timeLeft = state.totalTime;
      updateDisplay();
    }
  });
});

// Auto-detect if already granted
if ("Notification" in window && Notification.permission === "granted") {
  state.notifGranted = true;
  updateNotifUI();
}

updateDisplay();

// TEST — hapus setelah konfirmasi toast muncul
setTimeout(() => showToast("🎯 Test!", "Toast is working"), 1000);
