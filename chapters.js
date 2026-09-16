/* =================================================
   CHAPTER DETECTION
================================================= */

const chapterPatterns = [
  /^chapter\s+\d+\b[\s:.\-]*(.*)$/i,
  /^chapter\s+[ivxlcdm]+\b[\s:.\-]*(.*)$/i,
  /^chapter\s+[a-z]+\b[\s:.\-]*(.*)$/i,

  /^part\s+\d+\b[\s:.\-]*(.*)$/i,
  /^part\s+[ivxlcdm]+\b[\s:.\-]*(.*)$/i,
  /^section\s+\d+\b[\s:.\-]*(.*)$/i,

  /^第\s*[一二三四五六七八九十百千万亿两\d]+\s*[章節部篇回卷][\s:：、.\-]*(.*)$/,
  /^第\s*\d+\s*[章節部篇回卷][\s:：、.\-]*(.*)$/
];

let detectedChapters = [];


/* =================================================
   CHAPTER DETECTION
================================================= */

function detectChapters(text) {
  const lines = text.split(/\r?\n/);

  const chapters = [];

  lines.forEach((line, index) => {
    const clean = line.trim();

    if (!clean) {
      return;
    }

    const matched = chapterPatterns.some((pattern) => pattern.test(clean));

    if (matched) {
      chapters.push({
        title: clean,
        lineIndex: index
      });
    }
  });

  return chapters;
}

function prepareChapters(text, persist = true) {
  const detected = detectChapters(text);

  detectedChapters = detected.map((chapter, index) => ({
    ...chapter,
    id: `chapter-${index + 1}`
  }));

  const book = getCurrentBook();

  if (book && persist) {
    book.chapters = detectedChapters.map((chapter) => ({
      title: chapter.title,
      lineIndex: chapter.lineIndex,
      id: chapter.id
    }));
  }

  renderChapterNavigation(detectedChapters);
}

/* =================================================
   CHAPTER PANEL
================================================= */

function renderChapterNavigation(chapters) {
  chapterPanel.innerHTML = "";

  if (!chapters.length) {
    const empty = document.createElement("div");

    empty.className = "chapter-empty";
    empty.textContent = "No chapters detected yet.";

    chapterPanel.appendChild(empty);

    return;
  }

  chapters.forEach((chapter, index) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "chapter-item";

    const number = document.createElement("span");

    number.className = "chapter-number";
    number.textContent = `${index + 1}.`;

    const title = document.createElement("span");

    title.textContent = chapter.title;

    button.append(number, title);

    button.addEventListener("click", () => {
      goToReaderChapter(index);
    });

    chapterPanel.appendChild(button);
  });

  updateChapterListSelection();
}

/* =================================================
   CHAPTER LIST SELECTION
================================================= */

function updateChapterListSelection() {
  if (!chapterPanel || !detectedChapters.length) {
    return;
  }

  const currentIndex = Number.isFinite(appState.reader.currentChapterIndex)
    ? appState.reader.currentChapterIndex
    : 0;

  const chapterButtons = chapterPanel.querySelectorAll(".chapter-item");

  chapterButtons.forEach((button, index) => {
    const isActive = index === currentIndex;

    button.classList.toggle("active", isActive);

    button.setAttribute("aria-current", isActive ? "true" : "false");
  });

  const activeButton = chapterButtons[currentIndex];

  if (activeButton) {
    activeButton.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  }
}

/* =================================================
   CHAPTER BUTTON
================================================= */

detectChaptersButton.addEventListener("click", () => {
  prepareChapters(inputText.value);

  if (detectedChapters.length) {
    showStatus(
      `${detectedChapters.length} chapter` +
        `${detectedChapters.length === 1 ? "" : "s"} detected.`
    );
  } else {
    showStatus("No obvious chapter headings found.");
  }
});


/* =================================================
   READER CHAPTER NAVIGATION
================================================= */

const readerChapterSelect =
  document.getElementById("readerChapterSelect");


function getCurrentReaderChapterIndex() {
  if (!detectedChapters.length) {
    return 0;
  }

  const scrollTop = readerContent.scrollTop;
  const threshold = 40;

  let currentIndex = 0;

  for (let index = 0; index < detectedChapters.length; index++) {
    const chapter = detectedChapters[index];

    const element = document.getElementById(
      `reader-${chapter.id}`
    );

    if (!element) {
      continue;
    }

    if (element.offsetTop <= scrollTop + threshold) {
      currentIndex = index;
    } else {
      break;
    }
  }

  return currentIndex;
}


function updateReaderChapterNavigation() {

  if (!detectedChapters.length) {

    readerChapterSelect.innerHTML = "";

    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No chapters";

    readerChapterSelect.appendChild(option);

    readerChapterSelect.disabled = true;

    readerPreviousChapter.disabled = true;
    readerNextChapter.disabled = true;

    appState.reader.currentChapterIndex = 0;

    return;
  }

  const currentIndex =
    getCurrentReaderChapterIndex();

  appState.reader.currentChapterIndex =
    currentIndex;

  readerChapterSelect.innerHTML = "";

  detectedChapters.forEach((chapter, index) => {

    const option = document.createElement("option");

    option.value = String(index);

    option.textContent =
      `${index + 1}. ${chapter.title}`;

    readerChapterSelect.appendChild(option);

  });

  readerChapterSelect.disabled = false;

  readerChapterSelect.value =
    String(currentIndex);

  readerPreviousChapter.disabled =
    currentIndex === 0;

  readerNextChapter.disabled =
    currentIndex === detectedChapters.length - 1;

}


/* =================================================
   GO TO CHAPTER
================================================= */

function goToReaderChapter(index) {

  if (
    index < 0 ||
    index >= detectedChapters.length
  ) {
    return;
  }

  const chapter = detectedChapters[index];

  const target = document.getElementById(
    `reader-${chapter.id}`
  );

  if (!target) {
    return;
  }

  appState.reader.currentChapterIndex = index;

  stateChanged();

  const readerRect =
    readerContent.getBoundingClientRect();

  const targetRect =
    target.getBoundingClientRect();

  const topPadding = 32;

  const scrollAmount =
    targetRect.top -
    readerRect.top -
    topPadding;

  readerContent.scrollBy({
    top: scrollAmount,
    behavior: "smooth"
  });
}


/* =================================================
   CHAPTER LIST
================================================= */

function goToReaderChapterFromList(index) {
  goToReaderChapter(index);
}


/* =================================================
   PREVIOUS / NEXT
================================================= */

readerPreviousChapter.addEventListener(
  "click",
  () => {
    const currentIndex =
      Number.isFinite(appState.reader.currentChapterIndex)
        ? appState.reader.currentChapterIndex
        : 0;

    goToReaderChapter(currentIndex - 1);
  }
);


readerNextChapter.addEventListener(
  "click",
  () => {
    const currentIndex =
      Number.isFinite(appState.reader.currentChapterIndex)
        ? appState.reader.currentChapterIndex
        : 0;

    goToReaderChapter(currentIndex + 1);
  }
);


readerChapterSelect.addEventListener(
  "change",
  () => {

    const index =
      parseInt(readerChapterSelect.value, 10);

    if (Number.isNaN(index)) {
      return;
    }

    goToReaderChapter(index);

  }
);


/* =================================================
   READER CONTROLS
================================================= */

function updateReaderControls() {
  const size = parseFloat(appState.reader.fontSize) || 18;

  const spacing = parseFloat(appState.reader.lineSpacing) || 1.6;

  readerFontSize.textContent = `${size}px`;

  readerSpacing.textContent = spacing.toFixed(1);

  readerContent.style.fontSize = `${size}px`;

  readerContent.style.lineHeight = spacing;
}


/* =================================================
   READER FONT SIZE
================================================= */

readerFontDecrease.addEventListener("click", () => {
  const current = parseFloat(appState.reader.fontSize) || 18;

  appState.reader.fontSize = Math.max(8, current - 1);

  stateChanged();

  renderReader();
});

readerFontIncrease.addEventListener("click", () => {
  const current = parseFloat(appState.reader.fontSize) || 18;

  appState.reader.fontSize = Math.min(48, current + 1);

  stateChanged();

  renderReader();
});

/* =================================================
   READER LINE SPACING
================================================= */

readerSpacingDecrease.addEventListener("click", () => {
  const current = parseFloat(appState.reader.lineSpacing) || 1.6;

  appState.reader.lineSpacing = Math.max(0.8, current - 0.1);

  appState.reader.lineSpacing = Number(appState.reader.lineSpacing.toFixed(1));

  stateChanged();

  renderReader();
});

readerSpacingIncrease.addEventListener("click", () => {
  const current = parseFloat(appState.reader.lineSpacing) || 1.6;

  appState.reader.lineSpacing = Math.min(3, current + 0.1);

  appState.reader.lineSpacing = Number(appState.reader.lineSpacing.toFixed(1));

  stateChanged();

  renderReader();
});

/* =================================================
   READER RESET
================================================= */

readerResetButton.addEventListener("click", () => {
  appState.reader.fontSize = DEFAULT_READER_SETTINGS.fontSize;

  appState.reader.lineSpacing = DEFAULT_READER_SETTINGS.lineSpacing;

  stateChanged();

  renderReader();

  showStatus("Reader settings reset.");
});
