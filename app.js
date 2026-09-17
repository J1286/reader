/* =================================================
   APP MODES
================================================= */

let currentMode = appState.mode || "library";

async function setMode(mode) {
  appState.mode = mode;
  currentMode = mode;

  modeButtons.forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.mode === mode
    );
  });

  libraryView.classList.toggle(
    "hidden",
    mode !== "library"
  );

  readerView.classList.toggle(
    "hidden",
    mode !== "reader"
  );

  formatterView.classList.toggle(
    "hidden",
    mode !== "formatter"
  );

  if (mode === "library") {
    await syncLibraryState();
    await renderLibrary();
  }

  if (mode === "reader") {
    renderReader();
  }

  if (mode === "formatter") {
    renderCurrentView();
  }

  stateChanged();
}


modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setMode(button.dataset.mode);
  });
});


/* =================================================
FORMATTER VIEW RENDERING
================================================= */

function renderCurrentView() {
  const book = getCurrentBook();

  const text = book?.text || "";

  prepareChapters(text);
  renderPreview(text);
}

/* =================================================
DOCUMENT SYNCHRONIZATION
================================================= */

function syncBookFromInput() {
  const text = inputText.value;

  if (currentBook) {
    currentBook.text = text;
  }

  const book = getCurrentBook();

  if (book) {
    updateCurrentBookText(text);
  }
}


/* =================================================
LIVE PREVIEW + BOOK PERSISTENCE
================================================= */

let bookSaveTimer = null;

inputText.addEventListener("input", () => {
  syncBookFromInput();

  renderCurrentView();

  if (currentMode === "reader") {
    renderReader();
  }

  stateChanged();

  clearTimeout(bookSaveTimer);

  bookSaveTimer = setTimeout(async () => {
    const book = getCurrentBook();

    if (!book?.id) {
      return;
    }

    try {
      await saveBook(book);
    } catch (error) {
      console.error(
        "Could not save edited book:",
        error
      );

      showStatus(
        "Could not save your latest edit."
      );
    }
  }, 500);
});


/* =================================================
STATS
================================================= */

  function updateStats() {
    const book = getCurrentBook();

    const text = book?.text || currentBook?.text || "";

    const characters = [...text].length;

    const words = text.trim()
    ? text.trim().split(/\s+/).length: 0;

    const width = parseFloat(lineWidth.value) || 40;

    const paragraphs = formatDocument(text, width);

    const lines = paragraphs.reduce(
(total, paragraph) => total + paragraph.length, 0);

    stats.textContent =
      `${characters} characters · ` +
      `${words} words · ` +
      `${lines} lines`;
  }


/* =================================================
STATUS
================================================= */

  let statusTimer = null;

  function showStatus(message) {
    status.textContent = message;

    clearTimeout(statusTimer);

    statusTimer = setTimeout(() => {
      status.textContent = "";
    }, 2000);
  }

/* =================================================
READER THEMES
================================================= */

  function setReaderTheme(theme) {
    appState.reader.theme = theme;

    document.body.dataset.theme = theme;

    readerThemeButtons.forEach((button) => {
      button.classList.toggle("active",
button.dataset.readerTheme === theme);
      });

    stateChanged();
  }

  readerThemeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setReaderTheme(button.dataset.readerTheme);
    });
  });


/* =================================================
MANUAL SETTINGS → CUSTOM
================================================= */

[
  lineWidth,
  fontSize,
  lineSpacing,
  paragraphSpacing,
  previewWidth
].forEach((control) => {
  control.addEventListener("input", () => {
    if (presetSelect) {
      presetSelect.value = "custom";
    }

    preview.classList.remove(
      "preset-book",
      "preset-ereader",
      "preset-web",
      "preset-manuscript"
    );

    preview.classList.add(
      "preset-custom"
    );

    appState.formatter.lineWidth =
      parseFloat(lineWidth.value) || 40;

    appState.formatter.fontSize =
      parseFloat(fontSize.value) || 18;

    appState.formatter.lineSpacing =
      parseFloat(lineSpacing.value) || 1.6;

    appState.formatter.paragraphSpacing =
      parseInt(
        paragraphSpacing.value,
        10
      ) || 0;

    appState.formatter.previewWidth =
      parseInt(
        previewWidth.value,
        10
      ) || 800;

    appState.formatter.preset =
      "custom";

    renderCurrentView();

    stateChanged();
  });
});


/* =================================================
FORMAT OPTIONS TOGGLE
================================================= */

formatToggle?.addEventListener("click", () => {
  const isOpen = formatToggle.getAttribute("aria-expanded") === "true";
  const nextOpen = !isOpen;

  formatToggle.setAttribute("aria-expanded", String(nextOpen));
  formatOptions?.classList.toggle("hidden", !nextOpen);

  const icon = formatToggle.querySelector(".toggle-icon");
  if (icon) {
    icon.textContent = nextOpen ? "▾" : "▸";
  }
});


/* =================================================
THEMES
================================================= */

  const themeButtons = document.querySelectorAll(
".theme-button");

  function setTheme(theme) {
    appState.formatter.theme = theme;

    document.body.dataset.theme = theme;

    themeButtons.forEach((button) => {
      button.classList.toggle("active",
button.dataset.theme === theme);
    });

    readerThemeButtons.forEach((button) => {
      button.classList.toggle("active",
button.dataset.readerTheme === theme);
    });

    appState.reader.theme = theme;

    stateChanged();
  }

  themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
    setTheme(button.dataset.theme);
    });
  });


/* =================================================
RESTORE SAVED THEME
================================================= */

  const savedTheme = appState.formatter.theme ||
appState.reader.theme || "light";

  setTheme(savedTheme);
  restoreFormatterSettings();

/* =================================================
LIBRARY INITIALIZATION
================================================= */

  addBookButton.addEventListener("click", () => {
    fileInput.click();
  });

  refreshLibraryButton.addEventListener(
    "click",
    renderLibrary
  );

  openLibraryDB()
    .then(() => renderLibrary())
    .catch((error) => {
      console.error(
      "Could not open the book library:",
      error
    );

  showStatus(
    "Could not open the book library."
  );
 });


/* =================================================
INITIAL STATE
================================================= */

const isStandalone =
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

setMode(isStandalone ? "library" : (appState.mode || "library"));
