/* =================================================
   CHAPTER DETECTION
================================================= */

const chapterPatterns = [
  /^chapter\s+\d+[\s:.\-]*(.*)$/i,
  /^chapter\s+[ivxlcdm]+[\s:.\-]*(.*)$/i,
  /^part\s+\d+[\s:.\-]*(.*)$/i,
  /^section\s+\d+[\s:.\-]*(.*)$/i,

  /^第\s*[一二三四五六七八九十百千万\d]+\s*[章節部篇][\s:：.\-]*(.*)$/,

  /^第\s*\d+\s*[章節部篇][\s:：.\-]*(.*)$/
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

    const matched = chapterPatterns.some((pattern) =>
      pattern.test(clean)
    );

    if (matched) {
      chapters.push({
        title: clean,
        lineIndex: index
      });
    }
  });

  return chapters;
}


function prepareChapters(text) {
  const detected = detectChapters(text);

  detectedChapters = detected.map((chapter, index) => ({
    ...chapter,
    id: `chapter-${index + 1}`
  }));

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
      const target = document.getElementById(
        `reader-${chapter.id}`
      );

      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

        appState.reader.currentChapterIndex = index;

        stateChanged();
      }
    });

    chapterPanel.appendChild(button);
  });
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

function getCurrentReaderChapterIndex() {
  if (!detectedChapters.length) {
    return 0;
  }

  const scrollTop = readerContent.scrollTop;

  let currentIndex = 0;

  detectedChapters.forEach((chapter, index) => {
    const element = document.getElementById(
      `reader-${chapter.id}`
    );

    if (
      element &&
      element.offsetTop <= scrollTop + 120
    ) {
      currentIndex = index;
    }
  });

  return currentIndex;
}


function updateReaderChapterNavigation() {
  if (!detectedChapters.length) {
    readerChapterIndicator.textContent = "No chapters";

    readerPreviousChapter.disabled = true;
    readerNextChapter.disabled = true;

    appState.reader.currentChapterIndex = 0;

    return;
  }

  const currentIndex =
    getCurrentReaderChapterIndex();

  appState.reader.currentChapterIndex =
    currentIndex;

  readerChapterIndicator.textContent =
    `Chapter ${currentIndex + 1} of ${detectedChapters.length}`;

  readerPreviousChapter.disabled =
    currentIndex === 0;

  readerNextChapter.disabled =
    currentIndex === detectedChapters.length - 1;
}


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

  readerContent.scrollTo({
    top: target.offsetTop,
    behavior: "smooth"
  });
}


readerPreviousChapter.addEventListener(
  "click",
  () => {
    goToReaderChapter(
      getCurrentReaderChapterIndex() - 1
    );
  }
);


readerNextChapter.addEventListener(
  "click",
  () => {
    goToReaderChapter(
      getCurrentReaderChapterIndex() + 1
    );
  }
);


/* =================================================
   READER CONTROLS
================================================= */

function updateReaderControls() {
  const size =
    parseFloat(appState.reader.fontSize) || 21;

  const spacing =
    parseFloat(appState.reader.lineSpacing) || 1.9;

  readerFontSize.textContent =
    `${size}px`;

  readerSpacing.textContent =
    spacing.toFixed(1);

  readerContent.style.fontSize =
    `${size}px`;

  readerContent.style.lineHeight =
    spacing;
}


/* =================================================
   READER FONT SIZE
================================================= */

readerFontDecrease.addEventListener(
  "click",
  () => {
    const current =
      parseFloat(appState.reader.fontSize) || 21;

    appState.reader.fontSize =
      Math.max(8, current - 1);

    stateChanged();

    renderReader();
  }
);


readerFontIncrease.addEventListener(
  "click",
  () => {
    const current =
      parseFloat(appState.reader.fontSize) || 21;

    appState.reader.fontSize =
      Math.min(48, current + 1);

    stateChanged();

    renderReader();
  }
);


/* =================================================
   READER LINE SPACING
================================================= */

readerSpacingDecrease.addEventListener(
  "click",
  () => {
    const current =
      parseFloat(appState.reader.lineSpacing) || 1.9;

    appState.reader.lineSpacing =
      Math.max(
        0.8,
        current - 0.1
      );

    appState.reader.lineSpacing =
      Number(
        appState.reader.lineSpacing.toFixed(1)
      );

    stateChanged();

    renderReader();
  }
);


readerSpacingIncrease.addEventListener(
  "click",
  () => {
    const current =
      parseFloat(appState.reader.lineSpacing) || 1.9;

    appState.reader.lineSpacing =
      Math.min(
        3,
        current + 0.1
      );

    appState.reader.lineSpacing =
      Number(
        appState.reader.lineSpacing.toFixed(1)
      );

    stateChanged();

    renderReader();
  }
);


/* =================================================
   READER RESET
================================================= */

readerResetButton.addEventListener(
  "click",
  () => {
    appState.reader.fontSize =
      DEFAULT_READER_SETTINGS.fontSize;

    appState.reader.lineSpacing =
      DEFAULT_READER_SETTINGS.lineSpacing;

    stateChanged();

    renderReader();

    showStatus(
      "Reader settings reset."
    );
  }
);