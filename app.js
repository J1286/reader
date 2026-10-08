/* =================================================
   APP MODES
================================================= */

let currentMode = appState.mode || "library";

async function setMode(mode) {
  appState.mode = mode;
  currentMode = mode;

  const appTitle = document.getElementById("appTitle");
  if (appTitle) {
    const titles = {
      library: {
        text: "𝔐𝔶 𝔏𝔦𝔟𝔯𝔞𝔯𝔶",
        aria: "My Library",
        className: "library-title"
      },
      reader: { text: "Reader", aria: "Reader", className: "" },
      formatter: { text: "Tools", aria: "Tools", className: "" },
      settings: { text: "Settings", aria: "Settings", className: "" }
    };

    const title = titles[mode] || titles.library;
    appTitle.textContent = title.text;
    appTitle.setAttribute("aria-label", title.aria);
    appTitle.classList.toggle(
      "library-title",
      title.className === "library-title"
    );
  }

  modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });

  libraryView.classList.toggle("hidden", mode !== "library");

  readerView.classList.toggle("hidden", mode !== "reader");

  formatterView.classList.toggle("hidden", mode !== "formatter");

  settingsView.classList.toggle("hidden", mode !== "settings");

  if (mode === "library") {
    currentLibraryFolderId = null;

    await syncLibraryState();
    await renderLibrary();
  }

  if (mode === "reader") {
    renderReader();
  }

  if (mode === "formatter") {
    renderCurrentView();
  }

  if (mode === "settings") {
    settingsDefaultStyle.value = appState.formatter.preset || "book";

    settingsBackground.value = appState.appearance?.background || "bookshelf";

    settingsFontSize.value = appState.formatter.fontSize;

    settingsLineSpacing.value = appState.formatter.lineSpacing;

    settingsParagraphSpacing.value = appState.formatter.paragraphSpacing;

    settingsReadingWidth.value = appState.formatter.previewWidth;
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

  const text = book?.text || currentBook?.text || "";

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
      console.error("Could not save edited book:", error);

      showStatus("Could not save your latest edit.");
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

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  const width = parseFloat(lineWidth.value) || 40;

  const paragraphs = formatDocument(text, width);

  const lines = paragraphs.reduce(
    (total, paragraph) => total + paragraph.length,
    0
  );

  stats.textContent =
    `${characters} characters · ` + `${words} words · ` + `${lines} lines`;
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
    button.classList.toggle("active", button.dataset.readerTheme === theme);
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

[lineWidth, fontSize, lineSpacing, paragraphSpacing, previewWidth].forEach(
  (control) => {
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

      preview.classList.add("preset-custom");

      appState.formatter.lineWidth = parseFloat(lineWidth.value) || 40;

      appState.formatter.fontSize = parseFloat(fontSize.value) || 18;

      appState.formatter.lineSpacing = parseFloat(lineSpacing.value) || 1.6;

      appState.formatter.paragraphSpacing =
        parseInt(paragraphSpacing.value, 10) || 0;

      appState.formatter.previewWidth = parseInt(previewWidth.value, 10) || 800;

      appState.formatter.preset = "custom";

      renderCurrentView();

      stateChanged();
    });
  }
);

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

const themeButtons = document.querySelectorAll(".theme-button");

function setTheme(theme) {
  appState.formatter.theme = theme;

  document.body.dataset.theme = theme;

  themeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.theme === theme);
  });

  readerThemeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.readerTheme === theme);
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

const savedTheme = appState.formatter.theme || appState.reader.theme || "light";

setTheme(savedTheme);
restoreFormatterSettings();

/* =================================================
LIBRARY INITIALIZATION
================================================= */

addBookButton.addEventListener("click", () => {
  fileInput.click();
});

refreshLibraryButton.addEventListener("click", renderLibrary);

openLibraryDB()
  .then(() => renderLibrary())
  .catch((error) => {
    console.error("Could not open the book library:", error);

    showStatus("Could not open the book library.");
  });

/* =================================================
INITIAL STATE
================================================= */

const isStandalone =
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

setMode(isStandalone ? "library" : appState.mode || "library");

/* =================================================
FORMAT STEPPERS + HELP
================================================= */

document.querySelectorAll(".step-button").forEach((button) => {
  button.addEventListener("click", () => {
    const target = document.getElementById(button.dataset.stepTarget);
    if (!target) return;

    const step = parseFloat(button.dataset.step) || 1;
    const current = parseFloat(target.value) || 0;
    const min = parseFloat(target.min);
    const max = parseFloat(target.max);
    const decimals = (target.step || "1").includes(".")
      ? (target.step.split(".")[1] || "").length
      : 0;

    let next = current + step;
    if (!Number.isNaN(min)) next = Math.max(min, next);
    if (!Number.isNaN(max)) next = Math.min(max, next);

    target.value = Number(next.toFixed(decimals));
    target.dispatchEvent(new Event("input", { bubbles: true }));
  });
});

const formatHelpButton = document.getElementById("formatHelpButton");
const formatHelp = document.getElementById("formatHelp");

formatHelpButton?.addEventListener("click", () => {
  const isOpen = formatHelpButton.getAttribute("aria-expanded") === "true";
  const nextOpen = !isOpen;

  formatHelpButton.setAttribute("aria-expanded", String(nextOpen));
  formatHelp?.classList.toggle("hidden", !nextOpen);
  formatHelp?.setAttribute("aria-hidden", String(!nextOpen));
});

const cleanupHelpButton = document.getElementById("cleanupHelpButton");

const cleanupHelp = document.getElementById("cleanupHelp");

const cleanupToggle =
  document.getElementById("cleanupToggle");

const cleanupOptions =
  document.getElementById("cleanupOptions");

const cleanupToggleIcon =
  document.getElementById("cleanupToggleIcon");

cleanupToggle.addEventListener("click", () => {
  const isOpen =
    cleanupToggle.getAttribute("aria-expanded") === "true";

  const nextOpen = !isOpen;

  cleanupToggle.setAttribute(
    "aria-expanded",
    String(nextOpen)
  );

  cleanupOptions.classList.toggle(
    "hidden",
    !nextOpen
  );

  cleanupToggleIcon.textContent =
    nextOpen ? "▾" : "▸";
});

/* =================================================
   SETTINGS → BACKUP & RESTORE
================================================= */

const settingsBackupButton = document.getElementById("settingsBackupButton");

const settingsRestoreButton = document.getElementById("settingsRestoreButton");

settingsBackupButton?.addEventListener("click", () => {
  backupLibraryButton?.click();
});

settingsRestoreButton?.addEventListener("click", () => {
  restoreLibraryButton?.click();
});

settingsApplyLibrary?.addEventListener("click", () => {
  appState.librarySettings.sort = settingsLibrarySort.value;

  appState.librarySettings.booksPerRow = Number(settingsBooksPerRow.value);

  saveAppState();

  renderLibrary();

  settingsApplyLibrary.textContent = "Applied";

  setTimeout(() => {
    settingsApplyLibrary.textContent = "Apply";
  }, 1200);
});

settingsCheckUpdate?.addEventListener("click", () => {
  checkUpdateButton?.click();
});

settingsDefaultStyle?.addEventListener("change", () => {
  const preset = presetSettings[settingsDefaultStyle.value];

  if (!preset) {
    return;
  }

  settingsFontSize.value = preset.fontSize;

  settingsLineSpacing.value = preset.lineSpacing;

  settingsParagraphSpacing.value = preset.paragraphSpacing;

  settingsReadingWidth.value = preset.previewWidth;
});

const readerSearchButton = document.getElementById("readerSearchButton");

const readerSearchBar = document.getElementById("readerSearchBar");

const readerSearchInput = document.getElementById("readerSearchInput");

const readerSearchClose = document.getElementById("readerSearchClose");

readerSearchButton?.addEventListener("click", () => {
  readerSearchBar?.classList.toggle("hidden");

  if (!readerSearchBar?.classList.contains("hidden")) {
    readerSearchInput?.focus();
  }
});

readerSearchClose?.addEventListener("click", () => {
  readerSearchBar?.classList.add("hidden");
  readerSearchInput.value = "";

  readerSearchQuery = "";
  readerSearchMatches = [];
  readerSearchIndex = -1;
  pendingSearchPosition = null;

  renderReader();
});

readerSearchInput?.addEventListener("input", () => {
  if (readerSearchInput.value.trim() !== "") {
    return;
  }

  readerSearchQuery = "";
  readerSearchMatches = [];
  readerSearchIndex = -1;
  pendingSearchPosition = null;

  renderReader();
});

readerSearchInput?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();

  searchCurrentBook(readerSearchInput.value.trim());
});

/* Settings → Reading Defaults */

settingsResetDefaults?.addEventListener("click", () => {
  settingsDefaultStyle.value = "book";
  settingsDefaultFont.value = "system";
  settingsBackground.value = "bookshelf";

  settingsFontSize.value = 18;
  settingsLineSpacing.value = 1.6;
  settingsParagraphSpacing.value = 16;
  settingsReadingWidth.value = 800;

  settingsResetDefaults.textContent = "Reset";

  setTimeout(() => {
    settingsResetDefaults.textContent = "Reset to Default";
  }, 1200);
});

settingsApplyDefaults?.addEventListener("click", () => {
  const fontSizeValue = Number(settingsFontSize.value);

  const lineSpacingValue = Number(settingsLineSpacing.value);

  const paragraphSpacingValue = Number(settingsParagraphSpacing.value);

  const readingWidthValue = Number(settingsReadingWidth.value);

  appState.formatter.preset = settingsDefaultStyle.value;

  appState.appearance.background = settingsBackground.value;

  appState.reader.fontFamily = settingsDefaultFont.value;

  appState.formatter.fontSize = fontSizeValue;

  appState.formatter.lineSpacing = lineSpacingValue;

  appState.formatter.paragraphSpacing = paragraphSpacingValue;

  appState.formatter.previewWidth = readingWidthValue;

  /* Keep Formatter controls in sync */
  fontSize.value = fontSizeValue;

  lineSpacing.value = lineSpacingValue;

  paragraphSpacing.value = paragraphSpacingValue;

  previewWidth.value = readingWidthValue;

  /* Apply the same defaults to Reader */
  appState.reader.fontSize = fontSizeValue;

  appState.reader.lineSpacing = lineSpacingValue;

  appState.reader.contentWidth = readingWidthValue;

  appState.formatter.indent =
    settingsDefaultStyle.value === "book" ||
    settingsDefaultStyle.value === "ereader";

  saveAppState();

  if (appState.mode === "library") {
    renderLibrary();
  }   

  if (currentMode === "reader") {
    renderReader();
  }

  settingsApplyDefaults.textContent = "Applied";

  setTimeout(() => {
    settingsApplyDefaults.textContent = "Apply";
  }, 1200);
});
