/* =================================================
   DOM ELEMENTS
================================================= */

/* ---------- Formatter / Input ---------- */

const inputText = document.getElementById("inputText");
const cleanedText = document.getElementById("cleanedText");
const cleanupResult = document.getElementById("cleanupResult");
const changeCount = document.getElementById("changeCount");

const analyzeButton = document.getElementById("analyzeButton");
const applyButton = document.getElementById("applyButton");

const cleanSpaces = document.getElementById("cleanSpaces");
const detectParagraphs = document.getElementById("detectParagraphs");
const joinBrokenLinesCheckbox = document.getElementById("joinBrokenLines");

const lineWidth = document.getElementById("lineWidth");
const fontSize = document.getElementById("fontSize");
const lineSpacing = document.getElementById("lineSpacing");
const paragraphSpacing = document.getElementById("paragraphSpacing");
const previewWidth = document.getElementById("previewWidth");
const widthValue = document.getElementById("widthValue");
const indent = document.getElementById("indent");

const preview = document.getElementById("preview");
const stats = document.getElementById("stats");
const status = document.getElementById("status");

const chapterPanel = document.getElementById("chapterPanel");
const detectChaptersButton = document.getElementById("detectChaptersButton");

const presetButtons = document.querySelectorAll(".preset-button");
const clearButton = document.getElementById("clearButton");


/* =================================================
   DOCUMENT STATE
================================================= */

let currentBook = createEmptyBook();

function createEmptyBook() {
  return {
    id: null,
    title: "",
    fileName: "",
    text: "",
    position: 0,
    progress: 0
  };
}

/* ---------- Reader ---------- */

const readerView = document.getElementById("readerView");
const readerContent = document.getElementById("readerContent");

const readerTitle = document.getElementById("readerTitle");
const readerMeta = document.getElementById("readerMeta");

const readerProgressBar = document.getElementById("readerProgressBar");
const readerProgressText = document.getElementById("readerProgressText");

const readerFontDecrease = document.getElementById("readerFontDecrease");
const readerFontIncrease = document.getElementById("readerFontIncrease");
const readerFontSize = document.getElementById("readerFontSize");

const readerSpacingDecrease = document.getElementById(
  "readerSpacingDecrease"
);

const readerSpacingIncrease = document.getElementById(
  "readerSpacingIncrease"
);

const readerSpacing = document.getElementById("readerSpacing");
const readerResetButton = document.getElementById("readerResetButton");

const readerThemeButtons = document.querySelectorAll(
  ".reader-theme-button"
);

const readerPreviousChapter = document.getElementById(
  "readerPreviousChapter"
);

const readerNextChapter = document.getElementById(
  "readerNextChapter"
);

const readerChapterIndicator = document.getElementById(
  "readerChapterIndicator"
);


/* ---------- Library ---------- */

const libraryView = document.getElementById("libraryView");
const libraryPanel = document.getElementById("libraryPanel");

const addBookButton = document.getElementById("addBookButton");
const refreshLibraryButton = document.getElementById(
  "refreshLibraryButton"
);

const browseFileButton = document.getElementById(
  "browseFileButton"
);

const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");


/* ---------- Application Navigation ---------- */

const modeButtons = document.querySelectorAll(".mode-button");

const formatterView = document.getElementById(
  "formatterView"
);


/* =================================================
   APPLICATION CONSTANTS
================================================= */

const APP_STORAGE_KEY = "myReaderAppState";
const APP_VERSION = 1;

const DEFAULT_READER_SETTINGS = {
  fontSize: 18,
  lineSpacing: 1.6,
  theme: "light",
  contentWidth: 720
};

const DEFAULT_FORMATTER_SETTINGS = {
  preset: "book",
  theme: "light",
  lineWidth: 40,
  fontSize: 18,
  lineSpacing: 1.6,
  paragraphSpacing: 16,
  previewWidth: 800,
  indent: true
};

const DEFAULT_CLEANUP_SETTINGS = {
  cleanSpaces: true,
  detectParagraphs: true,
  joinBrokenLines: true
};


/* =================================================
   APPLICATION STATE
================================================= */

const appState = {
  version: APP_VERSION,

  mode: "library",

  library: [],

  currentBookId: null,

  formatter: {
    ...DEFAULT_FORMATTER_SETTINGS
  },

  cleanup: {
    ...DEFAULT_CLEANUP_SETTINGS
  },

  reader: {
    ...DEFAULT_READER_SETTINGS,

    currentChapterIndex: 0,

    scrollTop: 0,

    progress: 0
  }
};


/* =================================================
   STATE HELPERS
================================================= */

function createBookId() {
  return (
    "book-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 8)
  );
}


function getCurrentBook() {
  if (!appState.currentBookId) {
    return null;
  }

  return (
    appState.library.find(
      (book) => book.id === appState.currentBookId
    ) || null
  );
}


function getBookById(bookId) {
  if (!bookId) {
    return null;
  }

  return (
    appState.library.find(
      (book) => book.id === bookId
    ) || null
  );
}


function setCurrentBook(bookId) {
  const book = getBookById(bookId);

  if (!book) {
    appState.currentBookId = null;
    return null;
  }

  appState.currentBookId = book.id;

  return book;
}


function createBook({
  title = "Untitled",
  text = "",
  type = "txt",
  sourceName = ""
} = {}) {
  const now = new Date().toISOString();

  return {
    id: createBookId(),

    title: title || "Untitled",

    type: type || "txt",

    sourceName: sourceName || "",

    text: text || "",

    chapters: [],

    createdAt: now,

    updatedAt: now,

    reader: {
      chapterIndex: 0,
      scrollTop: 0,
      progress: 0
    }
  };
}


function addBookToLibrary(book) {
  if (!book || !book.id) {
    return null;
  }

  appState.library.push(book);

  appState.currentBookId = book.id;

  return book;
}


function removeBookFromLibrary(bookId) {
  const index = appState.library.findIndex(
    (book) => book.id === bookId
  );

  if (index === -1) {
    return false;
  }

  appState.library.splice(index, 1);

  if (appState.currentBookId === bookId) {
    appState.currentBookId = null;

    appState.reader.currentChapterIndex = 0;
    appState.reader.scrollTop = 0;
    appState.reader.progress = 0;
  }

  return true;
}


function updateBook(bookId, updates = {}) {
  const book = getBookById(bookId);

  if (!book) {
    return null;
  }

  Object.assign(book, updates);

  book.updatedAt = new Date().toISOString();

  return book;
}


function updateCurrentBookChapters(chapters) {
  const book = getCurrentBook();

  if (!book) {
    return null;
  }

  book.chapters = Array.isArray(chapters)
    ? chapters
    : [];

  book.updatedAt = new Date().toISOString();

  return book;
}


/* =================================================
   READER STATE
================================================= */

function loadCurrentBookReaderState() {
  const book = getCurrentBook();

  if (!book) {
    appState.reader.currentChapterIndex = 0;
    appState.reader.scrollTop = 0;
    appState.reader.progress = 0;
    return;
  }

  const savedReader = book.reader || {};

  appState.reader.currentChapterIndex =
    Number.isFinite(savedReader.chapterIndex)
      ? savedReader.chapterIndex
      : 0;

  appState.reader.scrollTop =
    Number.isFinite(savedReader.scrollTop)
      ? savedReader.scrollTop
      : 0;

  appState.reader.progress =
    Number.isFinite(savedReader.progress)
      ? savedReader.progress
      : 0;
}


function saveCurrentBookReaderState() {
  const book = getCurrentBook();

  if (!book) {
    return;
  }

  book.reader = {
    chapterIndex: appState.reader.currentChapterIndex,
    scrollTop: appState.reader.scrollTop,
    progress: appState.reader.progress
  };

  book.updatedAt = new Date().toISOString();
}


function resetCurrentBookReaderState() {
  appState.reader.currentChapterIndex = 0;
  appState.reader.scrollTop = 0;
  appState.reader.progress = 0;

  saveCurrentBookReaderState();
}


/* =================================================
   PERSISTENCE
================================================= */

function saveAppState() {
  try {
    const serialized = JSON.stringify(appState);

    localStorage.setItem(
      APP_STORAGE_KEY,
      serialized
    );

    return true;
  } catch (error) {
    console.error(
      "Failed to save application state:",
      error
    );

    return false;
  }
}


function loadAppState() {
  try {
    const serialized = localStorage.getItem(
      APP_STORAGE_KEY
    );

    if (!serialized) {
      return false;
    }

    const savedState = JSON.parse(serialized);

    if (!savedState || typeof savedState !== "object") {
      return false;
    }

    appState.version =
      savedState.version || APP_VERSION;

    appState.mode =
      savedState.mode || "library";

    appState.library =
      Array.isArray(savedState.library)
        ? savedState.library
        : [];

    appState.currentBookId =
      savedState.currentBookId || null;

    appState.formatter = {
      ...DEFAULT_FORMATTER_SETTINGS,
      ...(savedState.formatter || {})
    };

    appState.cleanup = {
      ...DEFAULT_CLEANUP_SETTINGS,
      ...(savedState.cleanup || {})
    };

    appState.reader = {
      ...DEFAULT_READER_SETTINGS,
      ...(savedState.reader || {})
    };

    appState.library = appState.library.map((book) => ({
      ...book,

      id: book.id || createBookId(),

      title: book.title || "Untitled",

      text: book.text || "",

      type: book.type || "txt",

      sourceName: book.sourceName || "",

      chapters: Array.isArray(book.chapters)
        ? book.chapters
        : [],

      reader: {
        chapterIndex: 0,
        scrollTop: 0,
        progress: 0,
        ...(book.reader || {})
      },

      createdAt:
        book.createdAt ||
        new Date().toISOString(),

      updatedAt:
        book.updatedAt ||
        new Date().toISOString()
    }));

    if (
      appState.currentBookId &&
      !getBookById(appState.currentBookId)
    ) {
      appState.currentBookId = null;
    }

    return true;
  } catch (error) {
    console.error(
      "Failed to load application state:",
      error
    );

    return false;
  }
}


function clearSavedAppState() {
  try {
    localStorage.removeItem(APP_STORAGE_KEY);

    return true;
  } catch (error) {
    console.error(
      "Failed to clear saved application state:",
      error
    );

    return false;
  }
}


/* =================================================
   GENERIC STATE UPDATE
================================================= */

function stateChanged() {
  saveAppState();
}


/* =================================================
   INITIALIZATION
================================================= */

loadAppState();