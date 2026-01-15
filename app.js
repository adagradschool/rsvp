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
const gutenbergStatus = document.querySelector("#gutenbergStatus");
const gutenbergList = document.querySelector("#gutenbergList");
const gutenbergLoadMore = document.querySelector("#gutenbergLoadMore");

let words = [];
let index = 0;
let playing = false;
let timer = null;
let msPerWord = 0;
let toastTimer = null;
let controlsTimer = null;
let gutenbergNextUrl = "https://gutendex.com/books/";
let gutenbergLoading = false;

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const setStatus = (message) => {
  summaryStatus.textContent = message;
};

const setGutenbergStatus = (message) => {
  if (!gutenbergStatus) return;
  gutenbergStatus.textContent = message;
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

const showControls = () => {
  document.body.classList.add("show-controls");
  clearTimeout(controlsTimer);
  controlsTimer = setTimeout(() => {
    document.body.classList.remove("show-controls");
  }, 2500);
};

const adjustWpm = (delta) => {
  const current = Number(wpmInput.value);
  const next = clampWpm(current + delta);
  if (!next || next === current) return;
  wpmInput.value = next.toString();
  applyWpm(next);
  updateTimes();
  showToast(`${next} wpm`);
};

const computeOrpIndex = (word) => {
  return word.length < 2 ? 0 : 1;
};

const stripWord = (word) => word.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");

const parseWords = (text) => {
  const wordsList = [];
  const ranges = [];
  const regex = /\S+/g;
  let match;
  while ((match = regex.exec(text))) {
    wordsList.push(match[0]);
    ranges.push([match.index, match.index + match[0].length]);
  }
  return { words: wordsList, ranges };
};

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

const lockLandscape = async () => {
  if (!screen.orientation || !screen.orientation.lock) return;
  try {
    await screen.orientation.lock("landscape");
  } catch (error) {
    setStatus(error.message);
  }
};

const unlockOrientation = () => {
  if (!screen.orientation || !screen.orientation.unlock) return;
  screen.orientation.unlock();
};

const toggleFullscreen = async () => {
  try {
    if (getFullscreenElement()) {
      await exitFullscreen();
      unlockOrientation();
    } else {
      await requestFullscreen();
      await lockLandscape();
    }
  } catch (error) {
    setStatus(error.message);
  }
};

const loadWords = () => {
  const { words: parsedWords } = parseWords(textInput.value);
  words = parsedWords;
  index = 0;
  updateProgress();
  if (words.length) {
    setWord(words[0]);
  } else {
    wordDisplay.textContent = "Ready";
    wordDisplay.classList.add("show");
  }
};

const syncReaderToCaret = () => {
  const { words: parsedWords, ranges } = parseWords(textInput.value);
  words = parsedWords;
  if (playing) {
    playing = false;
    playPause.textContent = "Play";
    clearTimeout(timer);
  }

  if (!words.length) {
    index = 0;
    wordDisplay.textContent = "Ready";
    wordDisplay.classList.add("show");
    updateProgress();
    return;
  }

  const caret = Number.isFinite(textInput.selectionStart) ? textInput.selectionStart : 0;
  let nextIndex = 0;
  for (let i = 0; i < ranges.length; i += 1) {
    const [start, end] = ranges[i];
    if (caret <= start) {
      nextIndex = Math.max(i - 1, 0);
      break;
    }
    if (caret <= end) {
      nextIndex = i;
      break;
    }
    nextIndex = i;
  }
  index = Math.min(Math.max(nextIndex, 0), Math.max(words.length - 1, 0));
  setWord(words[index]);
  updateProgress();
};

const getPlainTextFormat = (formats = {}) => {
  const entries = Object.entries(formats);
  for (const [format, url] of entries) {
    if (format.startsWith("text/plain") && !/\.zip$/i.test(url)) {
      return url;
    }
  }
  return null;
};

const stripGutenbergText = (text) => {
  const normalized = text.replace(/\r\n/g, "\n");
  const startRegex = /\*\*\* START OF (?:THIS|THE) PROJECT GUTENBERG EBOOK[\s\S]*?\*\*\*/i;
  const endRegex = /\*\*\* END OF (?:THIS|THE) PROJECT GUTENBERG EBOOK[\s\S]*?\*\*\*/i;
  let trimmed = normalized;
  const startMatch = trimmed.match(startRegex);
  if (startMatch) {
    trimmed = trimmed.slice(startMatch.index + startMatch[0].length);
  }
  const endMatch = trimmed.match(endRegex);
  if (endMatch) {
    trimmed = trimmed.slice(0, endMatch.index);
  }
  return trimmed.trim();
};

const setReaderText = (text) => {
  textInput.value = text;
  playing = false;
  playPause.textContent = "Play";
  clearTimeout(timer);
  loadWords();
};

const renderGutenbergBooks = (books, append) => {
  if (!append) {
    gutenbergList.innerHTML = "";
  }

  if (!books.length && !append) {
    const empty = document.createElement("div");
    empty.className = "gutenberg-card";
    empty.textContent = "No books found.";
    gutenbergList.appendChild(empty);
    return;
  }

  books.forEach((book) => {
    const card = document.createElement("div");
    card.className = "gutenberg-card";

    const title = document.createElement("div");
    title.className = "gutenberg-title";
    title.textContent = book.title || "Untitled";

    const meta = document.createElement("div");
    meta.className = "gutenberg-meta";
    const authorList = (book.authors || []).map((author) => author.name).slice(0, 2).join(", ");
    if (authorList) {
      const author = document.createElement("span");
      author.textContent = authorList;
      meta.appendChild(author);
    }
    if (book.download_count) {
      const downloads = document.createElement("span");
      downloads.textContent = `${book.download_count.toLocaleString()} downloads`;
      meta.appendChild(downloads);
    }
    if (book.languages && book.languages.length) {
      const language = document.createElement("span");
      language.textContent = book.languages.join(", ").toUpperCase();
      meta.appendChild(language);
    }

    const actions = document.createElement("div");
    actions.className = "gutenberg-actions";
    const readButton = document.createElement("button");
    readButton.type = "button";
    readButton.textContent = "Read";
    readButton.addEventListener("click", () => loadGutenbergBook(book, readButton));
    actions.appendChild(readButton);

    card.appendChild(title);
    if (meta.children.length) {
      card.appendChild(meta);
    }
    card.appendChild(actions);
    gutenbergList.appendChild(card);
  });
};

const updateGutenbergLoadMore = () => {
  if (!gutenbergLoadMore) return;
  if (!gutenbergNextUrl) {
    gutenbergLoadMore.setAttribute("hidden", "true");
    return;
  }
  gutenbergLoadMore.removeAttribute("hidden");
  gutenbergLoadMore.disabled = gutenbergLoading;
};

const loadGutenbergBooks = async ({ reset = false } = {}) => {
  if (!gutenbergList || gutenbergLoading || !gutenbergNextUrl) return;
  gutenbergLoading = true;
  updateGutenbergLoadMore();
  setGutenbergStatus("Loading books...");
  try {
    const response = await fetch(gutenbergNextUrl);
    if (!response.ok) {
      throw new Error("Failed to load books.");
    }
    const data = await response.json();
    gutenbergNextUrl = data.next;
    renderGutenbergBooks(data.results || [], !reset);
    setGutenbergStatus("Select a book to load it into the reader.");
  } catch (error) {
    setGutenbergStatus(error.message);
  } finally {
    gutenbergLoading = false;
    updateGutenbergLoadMore();
  }
};

const loadGutenbergBook = async (book, button) => {
  const formatUrl = getPlainTextFormat(book.formats);
  if (!formatUrl) {
    setGutenbergStatus("No plain text format available for that book.");
    return;
  }

  const safeUrl = formatUrl.replace(/^http:\/\//, "https://");
  const gutenbergPath =
    document.body.dataset.summarize === "cli"
      ? "/gutenberg"
      : document.body.dataset.summarize === "api"
        ? "/api/gutenberg"
        : window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
          ? "/gutenberg"
          : "/api/gutenberg";
  const proxyUrl = `${gutenbergPath}?url=${encodeURIComponent(safeUrl)}`;
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = "Loading";
  setGutenbergStatus(`Loading "${book.title}"...`);

  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch book text.");
    }
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let rawText = "";
    let lastFlush = 0;

    if (reader) {
      setGutenbergStatus(`Streaming "${book.title}"...`);
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        rawText += decoder.decode(value, { stream: true });
        const now = Date.now();
        if (now - lastFlush > 200) {
          textInput.value = rawText;
          lastFlush = now;
        }
      }
      rawText += decoder.decode();
    } else {
      rawText = await response.text();
    }

    const cleaned = stripGutenbergText(rawText);
    if (!cleaned) {
      throw new Error("Book text is empty.");
    }
    setReaderText(cleaned);
    showToast("Book loaded");
    setGutenbergStatus(`Loaded "${book.title}".`);
  } catch (error) {
    setGutenbergStatus(error.message);
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
};

wpmInput.addEventListener("input", (event) => {
  const value = Number(event.target.value);
  applyWpm(value);
  updateTimes();
});

fontSizeInput.addEventListener("input", (event) => {
  wordDisplay.style.fontSize = `${event.target.value}px`;
  if (words.length) {
    setWord(words[index]);
  }
});

textInput.addEventListener("input", syncReaderToCaret);
textInput.addEventListener("click", syncReaderToCaret);
document.addEventListener("selectionchange", () => {
  if (document.activeElement !== textInput) return;
  syncReaderToCaret();
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
  if (event.key === "<" || event.key === ">") {
    event.preventDefault();
    adjustWpm(event.key === ">" ? 10 : -10);
  }
  const isShiftComma = event.shiftKey && event.code === "Comma";
  const isShiftPeriod = event.shiftKey && event.code === "Period";
  if (getFullscreenElement() && (isShiftComma || isShiftPeriod)) {
    event.preventDefault();
    adjustWpm(isShiftPeriod ? 10 : -10);
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

let lastTap = 0;
viewer.addEventListener("touchend", () => {
  const now = Date.now();
  if (now - lastTap < 300) {
    showControls();
  }
  lastTap = now;
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

const resetWpm = () => {
  const initialWpm = getInitialWpm();
  wpmInput.value = initialWpm.toString();
  wpmInput.defaultValue = initialWpm.toString();
  applyWpm(initialWpm);
  updateTimes();
};

resetWpm();
loadWords();
wordDisplay.style.fontSize = `${fontSizeInput.value}px`;
updateFullscreenLabel();

window.addEventListener("pageshow", () => {
  resetWpm();
  setTimeout(resetWpm, 0);
});

window.addEventListener("load", () => {
  setTimeout(resetWpm, 0);
});

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
    const summarizeMode = document.body.dataset.summarize;
    const summarizePath =
      summarizeMode === "cli"
        ? "/summarize"
        : summarizeMode === "api"
          ? "/api/summarize"
          : window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
            ? "/summarize"
            : "/api/summarize";
    const response = await fetch(summarizePath, {
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

if (gutenbergLoadMore) {
  gutenbergLoadMore.addEventListener("click", () => loadGutenbergBooks({ reset: false }));
}

updateGutenbergLoadMore();
loadGutenbergBooks({ reset: true });
