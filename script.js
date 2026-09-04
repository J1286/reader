/* =================================================
   TEXT FORMATTER
================================================= */

/* ELEMENTS */

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

/* CJK */

function isCJK(char) {
  if (!char) {
    return false;
  }

  const code = char.codePointAt(0);

  return (
    (code >= 0x3000 && code <= 0x303f) ||
    (code >= 0x3040 && code <= 0x30ff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0xac00 && code <= 0xd7af)
  );
}

/* CHARACTER WIDTH */

function characterWidth(char) {
  if (isCJK(char)) {
    return 1;
  }

  if (
    char === " " ||
    char === "." ||
    char === "," ||
    char === "'" ||
    char === '"' ||
    char === "!" ||
    char === "i" ||
    char === "l"
  ) {
    return 0.35;
  }

  if (char === "m" || char === "w" || char === "M" || char === "W") {
    return 0.85;
  }

  if (/[A-Z]/.test(char)) {
    return 0.7;
  }

  if (/[0-9]/.test(char)) {
    return 0.6;
  }

  return 0.55;
}

function textWidth(text) {
  let width = 0;

  for (const char of text) {
    width += characterWidth(char);
  }

  return width;
}

/* TOKENIZATION */

function tokenize(text) {
  const tokens = [];

  let current = "";

  for (const char of text) {
    if (isCJK(char)) {
      if (current) {
        tokens.push(current);

        current = "";
      }

      tokens.push(char);

      continue;
    }

    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);

        current = "";
      }

      continue;
    }

    current += char;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

/* WRAPPING */

function wrapParagraph(paragraph, maxWidth) {
  const tokens = tokenize(paragraph.trim());

  const lines = [];

  let currentLine = "";

  let currentWidth = 0;

  for (const token of tokens) {
    const tokenWidth = textWidth(token);

    if (token.length === 1 && isCJK(token)) {
      if (currentLine && currentWidth + tokenWidth > maxWidth) {
        lines.push(currentLine);

        currentLine = "";

        currentWidth = 0;
      }

      currentLine += token;

      currentWidth += tokenWidth;

      continue;
    }

    const spaceWidth = currentLine ? characterWidth(" ") : 0;

    const proposedWidth = currentWidth + spaceWidth + tokenWidth;

    if (currentLine && proposedWidth > maxWidth) {
      lines.push(currentLine);

      currentLine = token;

      currentWidth = tokenWidth;
    } else {
      if (currentLine) {
        currentLine += " ";

        currentWidth += spaceWidth;
      }

      currentLine += token;

      currentWidth += tokenWidth;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function formatDocument(text, maxWidth) {
  const paragraphs = text.split(/\n\s*\n/);

  return paragraphs

    .filter((paragraph) => paragraph.trim())

    .map((paragraph) => wrapParagraph(paragraph, maxWidth));
}

/* CLEANUP */

function cleanSpacing(text) {
  let result = text;

  result = result.replace(/[ \t]{2,}/g, " ");

  result = result.replace(/[ \t]+([，。！？：；,.!?])/g, "$1");

  result = result.replace(/「\s+/g, "「");

  result = result.replace(/\s+」/g, "」");

  return result;
}

function isLikelyHeading(line) {
  if (line.length <= 40 && /^第.{1,20}[章節部篇]/.test(line)) {
    return true;
  }

  if (line.length <= 60 && /^(chapter|part|section)\s+\d+/i.test(line)) {
    return true;
  }

  if (line.length <= 40 && /^[A-Z0-9][A-Z0-9 \-:]{3,}$/.test(line)) {
    return true;
  }

  return false;
}

function joinBrokenLines(text) {
  const lines = text.split(/\r?\n/);

  const result = [];

  let paragraph = "";

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      if (paragraph) {
        result.push(paragraph);

        paragraph = "";
      }

      result.push("");

      continue;
    }

    if (isLikelyHeading(line)) {
      if (paragraph) {
        result.push(paragraph);

        paragraph = "";
      }

      result.push(line);

      result.push("");

      continue;
    }

    if (!paragraph) {
      paragraph = line;

      continue;
    }

    if (isCJK(paragraph.at(-1)) || isCJK(line[0])) {
      paragraph += line;
    } else {
      paragraph += " " + line;
    }
  }

  if (paragraph) {
    result.push(paragraph);
  }

  return result.join("\n");
}

/* Conservative paragraph detection */

function detectParagraphBreaks(text) {
  const lines = text.split(/\r?\n/);

  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const current = lines[i].trim();

    if (!current) {
      result.push("");

      continue;
    }

    result.push(current);

    const next = lines[i + 1] ? lines[i + 1].trim() : "";

    if (!next) {
      continue;
    }

    const endsChineseSentence = /[。！？]$/.test(current);

    const endsEnglishSentence = /[.!?]["')\]]?$/.test(current);

    const nextStartsDialogue = /^[「『“"]/.test(next);

    if ((endsChineseSentence || endsEnglishSentence) && nextStartsDialogue) {
      result.push("");
    }
  }

  return result.join("\n");
}

function analyzeText() {
  const original = inputText.value;

  if (!original.trim()) {
    showStatus("Paste some text first.");

    return;
  }

  let cleaned = original;

  if (cleanSpaces.checked) {
    cleaned = cleanSpacing(cleaned);
  }

  if (joinBrokenLinesCheckbox.checked) {
    cleaned = joinBrokenLines(cleaned);
  }

  if (detectParagraphs.checked) {
    cleaned = detectParagraphBreaks(cleaned);
  }

  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  cleaned = cleaned.trim();

  cleanedText.value = cleaned;

  cleanupResult.classList.remove("hidden");

  applyButton.disabled = false;

  if (original === cleaned) {
    changeCount.textContent = "No changes detected.";
  } else {
    const difference = Math.abs(
      cleaned.split(/\r?\n/).length - original.split(/\r?\n/).length
    );

    changeCount.textContent = `${difference} line structure change${
      difference === 1 ? "" : "s"
    }`;
  }

  showStatus("Text analyzed.");
}

function applyCleanup() {
  if (!cleanedText.value.trim()) {
    return;
  }

  inputText.value = cleanedText.value;

  prepareChapters(inputText.value);

  renderPreview();

  showStatus("Cleaned text applied.");
}

/* CHAPTER DETECTION */

const chapterPatterns = [
  /^chapter\s+\d+[\s:.\-]*(.*)$/i,

  /^chapter\s+[ivxlcdm]+[\s:.\-]*(.*)$/i,

  /^part\s+\d+[\s:.\-]*(.*)$/i,

  /^section\s+\d+[\s:.\-]*(.*)$/i,

  /^第\s*[一二三四五六七八九十百千万\d]+\s*[章節部篇][\s:：.\-]*(.*)$/,

  /^第\s*\d+\s*[章節部篇][\s:：.\-]*(.*)$/
];

function detectChapters(text) {
  const lines = text.split(/\r?\n/);

  const chapters = [];

  lines.forEach((line, index) => {
    const clean = line.trim();

    if (!clean) {
      return;
    }

    for (const pattern of chapterPatterns) {
      if (pattern.test(clean)) {
        chapters.push({
          title: clean,

          lineIndex: index
        });

        break;
      }
    }
  });

  return chapters;
}

let detectedChapters = [];

function prepareChapters(text) {
  const chapters = detectChapters(text);

  detectedChapters = chapters.map((chapter, index) => ({
    ...chapter,

    id: `chapter-${index + 1}`
  }));

  renderChapterNavigation(detectedChapters);
}

function renderChapterNavigation(chapters) {
  chapterPanel.innerHTML = "";

  if (chapters.length === 0) {
    const empty = document.createElement("div");

    empty.className = "chapter-empty";

    empty.textContent = "No chapters detected yet.";

    chapterPanel.appendChild(empty);

    return;
  }

  chapters.forEach((chapter, index) => {
    const button = document.createElement("button");

    button.className = "chapter-item";

    const number = document.createElement("span");

    number.className = "chapter-number";

    number.textContent = `${index + 1}.`;

    const title = document.createElement("span");

    title.textContent = chapter.title;

    button.appendChild(number);

    button.appendChild(title);

    button.addEventListener("click", () => {
      const target = document.getElementById(chapter.id);

      if (target) {
        target.scrollIntoView({
          behavior: "smooth",

          block: "start"
        });
      }
    });

    chapterPanel.appendChild(button);
  });
}

/* READING PRESETS */

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
    button.classList.toggle("active", button.dataset.preset === presetName);
  });

  renderPreview();
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

      return;
    }

    activatePreset(preset);
  });
});

/* PREVIEW */

function renderPreview() {
  const width = parseFloat(lineWidth.value) || 40;

  const paragraphs = formatDocument(inputText.value, width);

  preview.style.fontSize = (parseFloat(fontSize.value) || 18) + "px";

  preview.style.lineHeight = parseFloat(lineSpacing.value) || 1.6;

  const pageWidth = parseInt(previewWidth.value, 10) || 800;

  preview.style.width = pageWidth + "px";

  widthValue.textContent = pageWidth + "px";

  preview.innerHTML = "";

  const rawChapters = detectChapters(inputText.value);

  let chapterCounter = 0;

  paragraphs.forEach((lines, index) => {
    const paragraph = document.createElement("div");

    paragraph.className = "preview-paragraph";

    paragraph.style.marginBottom =
      (parseInt(paragraphSpacing.value, 10) || 0) + "px";

    paragraph.style.textIndent = indent.checked && index > 0 ? "2em" : "0";

    const fullText = lines.join("\n");

    const chapter = rawChapters.find((item) => fullText.startsWith(item.title));

    if (chapter && detectedChapters[chapterCounter]) {
      const chapterInfo = detectedChapters[chapterCounter];

      paragraph.id = chapterInfo.id;

      paragraph.classList.add("preview-chapter");

      paragraph.style.textIndent = "0";

      const title = document.createElement("div");

      title.className = "preview-chapter-title";

      title.textContent = chapter.title;

      paragraph.appendChild(title);

      const remainder = fullText.slice(chapter.title.length).trim();

      if (remainder) {
        const body = document.createElement("div");

        body.textContent = remainder;

        paragraph.appendChild(body);
      }

      chapterCounter++;
    } else {
      paragraph.textContent = fullText;
    }

    preview.appendChild(paragraph);
  });

  updateStats();
}

/* STATS */

function updateStats() {
  const text = inputText.value;

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

/* DOWNLOAD */

function download(blob, filename) {
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  link.download = filename;

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);
}

/* COPY */

document.getElementById("copyButton").addEventListener("click", async () => {
  const text = getFormattedText();

  if (!text) {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);

    showStatus("Copied to clipboard.");
  } catch {
    showStatus("Could not copy.");
  }
});

/* FORMATTED TEXT */

function getFormattedText() {
  const width = parseFloat(lineWidth.value) || 40;

  const paragraphs = formatDocument(inputText.value, width);

  return paragraphs.map((paragraph) => paragraph.join("\n")).join("\n\n");
}

document.getElementById("txtButton").addEventListener("click", () => {
  const text = getFormattedText();

  if (!text) {
    return;
  }

  const blob = new Blob([text], {
    type: "text/plain;charset=utf-8"
  });

  download(blob, "formatted-text.txt");

  showStatus("TXT downloaded.");
});

document.getElementById("pdfButton").addEventListener("click", () => {
  window.print();
});

document.getElementById("wordButton").addEventListener("click", async () => {
  const text = getFormattedText();

  if (!text) {
    return;
  }

  if (!window.docx) {
    showStatus("Word library unavailable.");

    return;
  }

  try {
    const { Document, Packer, Paragraph, TextRun } = window.docx;

    const paragraphs = text.split("\n\n");

    const children = [];

    paragraphs.forEach((paragraph) => {
      const lines = paragraph.split("\n");

      const runs = [];

      lines.forEach((line, index) => {
        runs.push(
          new TextRun({
            text: line,

            break: index === 0 ? 0 : 1
          })
        );
      });

      children.push(
        new Paragraph({
          children: runs,

          spacing: {
            after: (parseInt(paragraphSpacing.value, 10) || 16) * 10
          },

          indent: indent.checked
            ? {
                firstLine: 720
              }
            : undefined
        })
      );
    });

    const document = new Document({
      sections: [
        {
          properties: {},

          children
        }
      ]
    });

    const blob = await Packer.toBlob(document);

    download(blob, "formatted-text.docx");

    showStatus("Word document downloaded.");
  } catch (error) {
    console.error(error);

    showStatus("Could not create Word file.");
  }
});

/* CLEANUP EVENTS */

analyzeButton.addEventListener("click", analyzeText);
applyButton.addEventListener("click", applyCleanup);

/* CHAPTER EVENT */

detectChaptersButton.addEventListener("click", () => {
  prepareChapters(inputText.value);

  renderPreview();

  if (detectedChapters.length) {
    showStatus(
      `${detectedChapters.length} chapter${
        detectedChapters.length === 1 ? "" : "s"
      } detected.`
    );
  } else {
    showStatus("No obvious chapter headings found.");
  }
});

/* LIVE PREVIEW */

inputText.addEventListener("input", () => {
  prepareChapters(inputText.value);

  renderPreview();
});

const liveControls = [
  lineWidth,
  fontSize,
  lineSpacing,
  paragraphSpacing,
  previewWidth
];

liveControls.forEach((control) => {
  control.addEventListener("input", () => {
    renderPreview();
  });
});

/* DRAG AND DROP */

const dropZone = document.getElementById("dropZone");

const browseFileButton = document.getElementById("browseFileButton");

const fileInput = document.getElementById("fileInput");

let dragCounter = 0;

function isSupportedFile(file) {
  const filename = file.name.toLowerCase();

  return (
    filename.endsWith(".txt") ||
    filename.endsWith(".md") ||
    filename.endsWith(".text") ||
    filename.endsWith(".docx")
  );
}

/* IMPORT TEXT INTO APP */

function loadImportedText(text, filename) {
  if (!text || !text.trim()) {
    showStatus("The file appears to be empty.");

    return;
  }

  inputText.value = text;

  inputText.dispatchEvent(
    new Event("input", {
      bubbles: true
    })
  );

  showStatus(`Imported ${filename}.`);
}

async function importTextFile(file) {
  try {
    const text = await file.text();

    loadImportedText(text, file.name);
  } catch (error) {
    console.error("Could not read text file:", error);

    showStatus("Could not read that text file.");
  }
}

async function importWordFile(file) {
  if (!window.mammoth) {
    showStatus("Word import library unavailable.");

    console.error("Mammoth.js was not loaded.");

    return;
  }

  try {
    showStatus("Reading Word document...");

    const arrayBuffer = await file.arrayBuffer();

    const result = await window.mammoth.extractRawText({
      arrayBuffer
    });

    const text = result.value;

    if (result.messages && result.messages.length) {
      console.info("Word import messages:", result.messages);
    }

    loadImportedText(text, file.name);
  } catch (error) {
    console.error("Could not read Word document:", error);

    showStatus("Could not read that Word document.");
  }
}

async function importFile(file) {
  if (!file) {
    return;
  }

  if (!isSupportedFile(file)) {
    showStatus("Please choose a TXT, Markdown or Word file.");

    return;
  }

  const filename = file.name.toLowerCase();

  if (filename.endsWith(".docx")) {
    await importWordFile(file);

    return;
  }

  await importTextFile(file);
}

browseFileButton.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];

  if (file) {
    await importFile(file);
  }

  fileInput.value = "";
});

/* DRAG EVENTS */

["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
});

dropZone.addEventListener("dragenter", () => {
  dragCounter++;

  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragover", (event) => {
  event.dataTransfer.dropEffect = "copy";
});

dropZone.addEventListener("dragleave", () => {
  dragCounter--;

  if (dragCounter <= 0) {
    dragCounter = 0;

    dropZone.classList.remove("drag-over");
  }
});

dropZone.addEventListener("drop", async (event) => {
  dragCounter = 0;

  dropZone.classList.remove("drag-over");

  const files = Array.from(event.dataTransfer.files);

  if (files.length > 0) {
    await importFile(files[0]);

    return;
  }

  const text = event.dataTransfer.getData("text/plain");

  if (text && text.trim()) {
    loadImportedText(text, "Dragged text");

    return;
  }

  showStatus("Nothing usable was dropped.");
});

/* MANUAL SETTINGS → CUSTOM */

[
  lineWidth,
  fontSize,
  lineSpacing,
  paragraphSpacing,
  previewWidth,
  indent
].forEach((control) => {
  control.addEventListener("change", () => {
    const customButton = document.querySelector('[data-preset="custom"]');

    presetButtons.forEach((button) => {
      button.classList.toggle("active", button === customButton);
    });

    preview.classList.remove(
      "preset-book",
      "preset-ereader",
      "preset-web",
      "preset-manuscript"
    );

    preview.classList.add("preset-custom");
  });
});

/* STATUS */

function showStatus(message) {
  status.textContent = message;

  setTimeout(() => {
    status.textContent = "";
  }, 2000);
}

/* THEMES */

const themeButtons = document.querySelectorAll(".theme-button");

function setTheme(theme) {
  document.body.dataset.theme = theme;

  themeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.theme === theme);
  });

  localStorage.setItem("textFormatterTheme", theme);
}

themeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setTheme(button.dataset.theme);
  });
});

/* Restore saved theme */

const savedTheme = localStorage.getItem("textFormatterTheme");

if (savedTheme) {
  setTheme(savedTheme);
}

/* INITIAL STATE */

prepareChapters(inputText.value);

renderPreview();
