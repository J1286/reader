/* =================================================
   READING PRESETS
================================================= */

const presetSettings = {
  book: {
    fontSize: 14,
    lineSpacing: 1.55,
    paragraphSpacing: 14,
    previewWidth: 760,
    indent: true
  },

  ereader: {
    fontSize: 16,
    lineSpacing: 1.55,
    paragraphSpacing: 12,
    previewWidth: 680,
    indent: true
  },

  web: {
    fontSize: 15,
    lineSpacing: 1.5,
    paragraphSpacing: 16,
    previewWidth: 900,
    indent: false
  },

  manuscript: {
    fontSize: 14,
    lineSpacing: 1.7,
    paragraphSpacing: 12,
    previewWidth: 800,
    indent: false
  }
};

function activatePreset(presetName) {
  const settings = presetSettings[presetName];

  if (!settings) {
    return;
  }

  fontSize.value = settings.fontSize;
  lineSpacing.value = settings.lineSpacing;
  paragraphSpacing.value = settings.paragraphSpacing;
  previewWidth.value = settings.previewWidth;
  indent.checked = settings.indent;

  preview.classList.remove(
    "preset-book",
    "preset-ereader",
    "preset-web",
    "preset-manuscript",
    "preset-custom"
  );

  preview.classList.add(`preset-${presetName}`);

  presetButtons.forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.preset === presetName
    );
  });

  renderCurrentView();
}

presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const preset = button.dataset.preset;

    if (preset === "custom") {
      preview.classList.remove(
        "preset-book",
        "preset-ereader",
        "preset-web",
        "preset-manuscript"
      );

      preview.classList.add("preset-custom");

      presetButtons.forEach((item) => {
        item.classList.toggle("active", item === button);
      });

      renderCurrentView();

      return;
    }

    activatePreset(preset);
  });
});

/* =================================================
   READER RENDERING
================================================= */

function renderReader() {
  const book = getCurrentBook();

  const text = book?.text || "";

  readerContent.style.fontSize =
  `${parseFloat(appState.reader.fontSize) || 18}px`;

  readerContent.style.lineHeight =
  parseFloat(appState.reader.lineSpacing) || 1.6;

  readerContent.style.maxWidth =
  `${parseInt(
    appState.reader.contentWidth,
    10
  ) || 720}px`;

    readerTitle.textContent =
    book?.title || "Untitled";

  readerMeta.textContent =
    book?.sourceName || "Text document";

  readerContent.innerHTML = "";

  if (!text.trim()) {
    const empty = document.createElement("p");

    empty.textContent = "No book is currently open.";

    readerContent.appendChild(empty);

    requestAnimationFrame(() => {
      updateReaderProgress();
      updateReaderControls();
      updateReaderChapterNavigation();
    });

    return;
  }

  const paragraphs = getBookParagraphs(text);

  let chapterCounter = 0;

  paragraphs.forEach((textParagraph, index) => {
    const paragraph = document.createElement("div");

    paragraph.className = "preview-paragraph";

paragraph.style.marginBottom = `${
  parseInt(paragraphSpacing.value, 10) || 0
}px`;

const chapter = detectedChapters[chapterCounter];

const previousParagraph =
  paragraphs[index - 1] || "";

const previousWasChapter =
  detectedChapters.some((chapterItem) =>
    previousParagraph.startsWith(chapterItem.title)
  );

const isChapter =
  chapter &&
  textParagraph.startsWith(chapter.title);

paragraph.style.textIndent =
  indent.checked &&
  index > 0 &&
  !isChapter &&
  !previousWasChapter
    ? "2em"
    : "0";

    if (
      chapter &&
      textParagraph.startsWith(chapter.title)
    ) {
      paragraph.id = `reader-${chapter.id}`;

      paragraph.classList.add("preview-chapter");

      paragraph.style.textIndent = "0";

      const title = document.createElement("div");

      title.className = "preview-chapter-title";

      title.textContent = chapter.title;

      paragraph.appendChild(title);

      const remainder = textParagraph
        .slice(chapter.title.length)
        .trim();

      if (remainder) {
        const body = document.createElement("div");

        body.textContent = remainder;

        paragraph.appendChild(body);
      }

      chapterCounter++;
    } else {
      paragraph.textContent = textParagraph;
    }

    readerContent.appendChild(paragraph);
  });

    const savedScrollTop =
  book?.readerState?.scrollTop || 0;

requestAnimationFrame(() => {
  readerContent.scrollTop = Math.min(
    savedScrollTop,
    Math.max(
      0,
      readerContent.scrollHeight -
        readerContent.clientHeight
    )
  );

  updateReaderProgress();
  updateReaderControls();
  updateReaderChapterNavigation();
 });
}

/* =================================================
   READER POSITION SAVING
================================================= */

function saveCurrentBookReaderState() {
  const book = getCurrentBook();

  if (!book) {
    return;
  }

  if (!book.readerState) {
    book.readerState = {};
  }

  book.readerState.scrollTop =
    readerContent.scrollTop;

  book.readerState.progress =
    appState.reader.progress || 0;
}

/* =================================================
   READER PROGRESS
================================================= */

function updateReaderProgress() {
  if (!readerContent) {
    return;
  }

  const scrollTop =
    readerContent.scrollTop;

  const scrollHeight =
    readerContent.scrollHeight;

  const clientHeight =
    readerContent.clientHeight;

  const maxScroll = Math.max(
    0,
    scrollHeight - clientHeight
  );

  const progress =
    maxScroll > 0
      ? scrollTop / maxScroll
      : 0;

  const percentage = Math.round(
    Math.max(0, Math.min(1, progress)) * 100
  );

  appState.reader.scrollTop =
    scrollTop;

  appState.reader.progress =
    progress;

  readerProgressBar.style.width =
    `${percentage}%`;

  readerProgressText.textContent =
    `${percentage}%`;
}

/* =================================================
   READER POSITION SAVING
================================================= */

let readerSaveTimer = null;

readerContent.addEventListener("scroll", () => {
  updateReaderProgress();
  updateReaderChapterNavigation();

  clearTimeout(readerSaveTimer);

  readerSaveTimer = setTimeout(async () => {
  const book = getCurrentBook();

  if (!book?.id) {
    return;
  }

  try {
    saveCurrentBookReaderState();

    await saveBook(book);
  } catch (error) {
    console.error(
      "Could not save reading position:",
      error
    );
  }
}, 500);
});