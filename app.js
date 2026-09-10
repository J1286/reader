/* =================================================
APP MODES
================================================= */

let currentMode = appState.mode || "library";

function setMode(mode) {
currentMode = mode;
appState.mode = mode;

libraryView.classList.toggle("hidden", mode !== "library");
readerView.classList.toggle("hidden", mode !== "reader");
formatterView.classList.toggle("hidden", mode !== "formatter");

modeButtons.forEach((button) => {
button.classList.toggle("active", button.dataset.mode === mode);
});

stateChanged();

if (mode === "reader") {
renderReader();
}

if (mode === "formatter") {
renderCurrentView();
}
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

/*
Keep the legacy currentBook object synchronized for
modules that still use it during this transition.
*/
if (currentBook) {
currentBook.text = text;
}

/*
Update the shared application state when a current
library book exists.
*/
const book = getCurrentBook();

if (book) {
updateCurrentBookText(text);
}
}

/* =================================================
LIVE PREVIEW
================================================= */

inputText.addEventListener("input", () => {
syncBookFromInput();

renderCurrentView();

if (currentMode === "reader") {
renderReader();
}

stateChanged();
});

/* =================================================
STATS
================================================= */

function updateStats() {
const book = getCurrentBook();

const text =
book?.text ||
currentBook?.text ||
"";

const characters = [...text].length;

const words = text.trim()
? text.trim().split(/\s+/).length
: 0;

const width =
parseFloat(lineWidth.value) || 40;

const paragraphs =
formatDocument(text, width);

const lines = paragraphs.reduce(
(total, paragraph) =>
total + paragraph.length,
0
);

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
button.classList.toggle(
"active",
button.dataset.readerTheme === theme
);
});

stateChanged();
}

readerThemeButtons.forEach((button) => {
button.addEventListener("click", () => {
setReaderTheme(
button.dataset.readerTheme
);
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
previewWidth,
indent
].forEach((control) => {
control.addEventListener("change", () => {
const customButton =
document.querySelector(
'[data-preset="custom"]'
);

presetButtons.forEach((button) => {
  button.classList.toggle(
    "active",
    button === customButton
  );
});

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

appState.formatter.indent =
  indent.checked;

appState.formatter.preset =
  "custom";

stateChanged();


});
});

/* =================================================
THEMES
================================================= */

const themeButtons =
document.querySelectorAll(
".theme-button"
);

function setTheme(theme) {
appState.formatter.theme = theme;

document.body.dataset.theme = theme;

themeButtons.forEach((button) => {
button.classList.toggle(
"active",
button.dataset.theme === theme
);
});

readerThemeButtons.forEach((button) => {
button.classList.toggle(
"active",
button.dataset.readerTheme === theme
);
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

const savedTheme =
appState.formatter.theme ||
appState.reader.theme ||
"light";

setTheme(savedTheme);

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

setMode(appState.mode || "library");