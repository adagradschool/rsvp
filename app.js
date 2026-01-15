const textInput = document.querySelector("#textInput");
const wpmInput = document.querySelector("#wpm");
const fontSizeInput = document.querySelector("#fontSize");
const wpmReadout = document.querySelector("#wpmReadout");
const wordDisplay = document.querySelector("#wordDisplay");
const viewer = document.querySelector(".viewer");
const measure = document.querySelector("#measure");
const measureLead = document.querySelector("#measureLead");
const measureOrp = document.querySelector("#measureOrp");
const measureTail = document.querySelector("#measureTail");
const playPause = document.querySelector("#playPause");
const rewindBtn = document.querySelector("#rewind");
const forwardBtn = document.querySelector("#forward");
const progress = document.querySelector("#progress");
const currentTime = document.querySelector("#currentTime");
const totalTime = document.querySelector("#totalTime");
const loadTextBtn = document.querySelector("#loadText");
const fullscreenBtn = document.querySelector("#fullscreen");
const urlInput = document.querySelector("#urlInput");
const summarizeUrlBtn = document.querySelector("#summarizeUrl");
const summaryStatus = document.querySelector("#summaryStatus");
const toast = document.querySelector("#toast");

let words = [];
let index = 0;
let playing = false;
let timer = null;
let msPerWord = 0;
let toastTimer = null;

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const setStatus = (message) => {
  summaryStatus.textContent = message;
};

const clampWpm = (value) => {
  const min = Number(wpmInput.min);
  const max = Number(wpmInput.max);
  if (!Number.isFinite(value)) return null;
  return Math.min(Math.max(value, min), max);
};

const getInitialWpm = () => {
  const urlValue = clampWpm(Number(new URLSearchParams(window.location.search).get("wpm")));
  if (urlValue) return urlValue;
  const stored = clampWpm(Number(localStorage.getItem("rsvpWpm")));
  if (stored) return stored;
  return 300;
};

const applyWpm = (value) => {
  msPerWord = 60000 / value;
  wpmReadout.textContent = value.toString();
};

const showToast = (message) => {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 900);
};

const adjustWpm = (delta) => {
  const current = Number(wpmInput.value);
  const next = clampWpm(current + delta);
  if (!next || next === current) return;
  wpmInput.value = next.toString();
  applyWpm(next);
  localStorage.setItem("rsvpWpm", next.toString());
  updateTimes();
  showToast(`${next} wpm`);
};

const computeOrpIndex = (word) => {
  const length = word.length;
  if (length <= 1) return 0;
  if (length <= 5) return 1;
  if (length <= 9) return 2;
  if (length <= 13) return 3;
  if (length <= 17) return 4;
  return 5;
};

const stripWord = (word) => word.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");

const getDelayMultiplier = (word) => {
  if (/[.?!]$/.test(word)) return 1.6;
  if (/[,;:]$/.test(word)) return 1.2;
  if (/[-–—]$/.test(word)) return 1.1;
  return 1;
};

const updateTimes = () => {
  const totalSeconds = (words.length * msPerWord) / 1000;
  const currentSeconds = (index * msPerWord) / 1000;
  totalTime.textContent = formatTime(totalSeconds);
  currentTime.textContent = formatTime(currentSeconds);
};

const updateProgress = () => {
  progress.max = Math.max(words.length - 1, 0);
  progress.value = index;
  updateTimes();
};

const setWord = (word) => {
  const trimmed = stripWord(word);
  if (!trimmed) {
    wordDisplay.textContent = word;
    wordDisplay.style.setProperty("--shift", "0px");
    wordDisplay.classList.remove("show");
    requestAnimationFrame(() => wordDisplay.classList.add("show"));
    return;
  }
  const orpIndex = Math.min(computeOrpIndex(trimmed), trimmed.length - 1);
  const start = trimmed.slice(0, orpIndex);
  const orp = trimmed.slice(orpIndex, orpIndex + 1);
  const end = trimmed.slice(orpIndex + 1);
  const leading = word.slice(0, word.indexOf(trimmed));
  const trailing = word.slice(word.indexOf(trimmed) + trimmed.length);

  wordDisplay.innerHTML = `${leading}${start}<span class="orp">${orp}</span>${end}${trailing}`;
  const wordStyles = getComputedStyle(wordDisplay);
  measure.style.fontSize = wordStyles.fontSize;
  measure.style.letterSpacing = wordStyles.letterSpacing;
  measure.style.fontFamily = wordStyles.fontFamily;
  measureLead.textContent = `${leading}${start}`;
  measureOrp.textContent = orp;
  measureTail.textContent = `${end}${trailing}`;

  const leadWidth = measureLead.getBoundingClientRect().width;
  const orpWidth = measureOrp.getBoundingClientRect().width;
  const tailWidth = measureTail.getBoundingClientRect().width;
  const totalWidth = leadWidth + orpWidth + tailWidth;
  const shift = totalWidth / 2 - leadWidth - orpWidth / 2;
  wordDisplay.style.setProperty("--shift", `${shift}px`);

  wordDisplay.classList.remove("show");
  requestAnimationFrame(() => wordDisplay.classList.add("show"));
};

const step = (delta) => {
  index = Math.min(Math.max(index + delta, 0), Math.max(words.length - 1, 0));
  if (words.length) {
    setWord(words[index]);
  }
  updateProgress();
};

const scheduleNext = () => {
  if (!playing || !words.length) return;
  setWord(words[index]);
  updateProgress();

  const multiplier = getDelayMultiplier(words[index]);
  const delay = msPerWord * multiplier;

  timer = setTimeout(() => {
    index += 1;
    if (index >= words.length) {
      playing = false;
      playPause.textContent = "Play";
      return;
    }
    scheduleNext();
  }, delay);
};

const togglePlayback = () => {
  if (!words.length) return;
  playing = !playing;
  playPause.textContent = playing ? "Pause" : "Play";
  clearTimeout(timer);
  if (playing) {
    scheduleNext();
  }
};

const getFullscreenElement = () =>
  document.fullscreenElement || document.webkitFullscreenElement;

const requestFullscreen = () => {
  const element = viewer || document.documentElement;
  const request =
    element.requestFullscreen ||
    element.webkitRequestFullscreen ||
    element.msRequestFullscreen;
  if (!request) return Promise.reject(new Error("Fullscreen not supported."));
  return request.call(element);
};

const exitFullscreen = () => {
  const exit =
    document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
  if (!exit) return Promise.resolve();
  return exit.call(document);
};

const toggleFullscreen = async () => {
  try {
    if (getFullscreenElement()) {
      await exitFullscreen();
    } else {
      await requestFullscreen();
    }
  } catch (error) {
    setStatus(error.message);
  }
};

const loadWords = () => {
  const raw = textInput.value.trim();
  words = raw ? raw.split(/\s+/) : [];
  index = 0;
  updateProgress();
  if (words.length) {
    setWord(words[0]);
  } else {
    wordDisplay.textContent = "Ready";
    wordDisplay.classList.add("show");
  }
};

wpmInput.addEventListener("input", (event) => {
  const value = Number(event.target.value);
  applyWpm(value);
  localStorage.setItem("rsvpWpm", value.toString());
  updateTimes();
});

fontSizeInput.addEventListener("input", (event) => {
  wordDisplay.style.fontSize = `${event.target.value}px`;
  if (words.length) {
    setWord(words[index]);
  }
});

playPause.addEventListener("click", togglePlayback);
rewindBtn.addEventListener("click", () => step(-10));
forwardBtn.addEventListener("click", () => step(10));
loadTextBtn.addEventListener("click", () => {
  playing = false;
  playPause.textContent = "Play";
  clearTimeout(timer);
  loadWords();
});
fullscreenBtn.addEventListener("click", toggleFullscreen);

progress.addEventListener("input", (event) => {
  index = Number(event.target.value);
  if (words.length) {
    setWord(words[index]);
  }
  updateProgress();
});

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    togglePlayback();
  }
  if (getFullscreenElement() && event.shiftKey && (event.key === ">" || event.key === "<")) {
    event.preventDefault();
    adjustWpm(event.key === ">" ? 10 : -10);
  }
  if (event.key === "f" || event.key === "F") {
    toggleFullscreen();
  }
  if (event.code === "ArrowRight") {
    step(1);
  }
  if (event.code === "ArrowLeft") {
    step(-1);
  }
  if (event.code === "Escape") {
    playing = false;
    playPause.textContent = "Play";
    clearTimeout(timer);
    index = 0;
    if (words.length) {
      setWord(words[0]);
    }
    updateProgress();
  }
});

const updateFullscreenLabel = () => {
  fullscreenBtn.textContent = getFullscreenElement() ? "Exit full" : "Fullscreen";
};

document.addEventListener("fullscreenchange", updateFullscreenLabel);
document.addEventListener("webkitfullscreenchange", updateFullscreenLabel);

window.addEventListener("resize", () => {
  if (words.length) {
    setWord(words[index]);
  }
});

loadWords();
const initialWpm = getInitialWpm();
wpmInput.value = initialWpm.toString();
applyWpm(initialWpm);
wordDisplay.style.fontSize = `${fontSizeInput.value}px`;
updateTimes();
updateFullscreenLabel();

const fullscreenAvailable = Boolean(
  document.documentElement.requestFullscreen ||
    document.documentElement.webkitRequestFullscreen ||
    document.documentElement.msRequestFullscreen
);
if (!fullscreenAvailable) {
  fullscreenBtn.disabled = true;
  fullscreenBtn.textContent = "No fullscreen";
}

const summarizeUrl = async () => {
  const url = urlInput.value.trim();
  if (!url) {
    setStatus("Add a URL to summarize.");
    return;
  }

  setStatus("Summarizing...");
  summarizeUrlBtn.disabled = true;
  summarizeUrlBtn.textContent = "Working";

  try {
    const response = await fetch("/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Summarize failed.");
    }

    const data = await response.json();
    textInput.value = data.summary;
    loadWords();
    setStatus("Summary loaded.");
  } catch (error) {
    setStatus(error.message);
  } finally {
    summarizeUrlBtn.disabled = false;
    summarizeUrlBtn.textContent = "Summarize URL";
  }
};

summarizeUrlBtn.addEventListener("click", summarizeUrl);
urlInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    summarizeUrl();
  }
});

const urlFromQuery = new URLSearchParams(window.location.search).get("url");
if (urlFromQuery) {
  urlInput.value = urlFromQuery;
}
