/* =================================================
   READING PRESETS
================================================= */

const presetSettings = {
  book: {
    fontSize: 19,
    lineSpacing: 1.8,
    paragraphSpacing: 22,
    previewWidth: 760,
    indent: true
  },

  ereader: {
    fontSize: 21,
    lineSpacing: 1.85,
    paragraphSpacing: 26,
    previewWidth: 680,
    indent: true
  },

  web: {
    fontSize: 17,
    lineSpacing: 1.65,
    paragraphSpacing: 18,
    previewWidth: 900,
    indent: false
  },

  manuscript: {
    fontSize: 15,
    lineSpacing: 2,
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
  `${parseFloat(appState.reader.fontSize) || 21}px`;

  readerContent.style.lineHeight =
  parseFloat(appState.reader.lineSpacing) || 1.9;

  readerContent.style.maxWidth =
    `${parseInt(previewWidth.value, 10) || 800}px`;

    readerTitle.textContent =
    book?.title || "Untitled";

  readerMeta.textContent =
    book?.sourceName || "Text document";

  readerContent.innerHTML = "";

  if (!text.trim()) {
    const empty = document.createElement("p");

    empty.textContent = "No book is currently open.";

    readerContent.appendChild(empty);

    updateReaderProgress();
    updateReaderControls();
    updateReaderChapterNavigation();

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

    paragraph.style.textIndent =
      indent.checked && index > 0 ? "2em" : "0";

    const chapter = detectedChapters[chapterCounter];

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

  // Restore saved reading position after the content has been rendered.
    readerContent.scrollTop = Math.min(
    appState.reader.scrollTop || 0,
    Math.max(
      0,
      readerContent.scrollHeight - readerContent.clientHeight
    )
  );

  updateReaderProgress();
  updateReaderControls();
  updateReaderChapterNavigation();
}

/* =================================================
   READER PROGRESS
================================================= */

function updateReaderProgress() {
  if (!readerContent) {
    return;
  }

  const maxScroll =
    readerContent.scrollHeight -
    readerContent.clientHeight;

  const scrollTop = readerContent.scrollTop;

  let progress = 0;

  if (maxScroll > 0) {
    progress = scrollTop / maxScroll;
  }

  progress = Math.max(0, Math.min(1, progress));

  appState.reader.scrollTop = scrollTop;
  appState.reader.progress = progress;

  saveCurrentBookReaderState();

  const percentage = Math.round(progress * 100);

  readerProgressBar.style.width = `${percentage}%`;

  readerProgressText.textContent = `${percentage}%`;
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