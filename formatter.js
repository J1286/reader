/* =================================================
    CHARACTER / CJK HELPERS
 ================================================= */

function restoreFormatterSettings() {
  fontSize.value = appState.formatter.fontSize;

  lineSpacing.value = appState.formatter.lineSpacing;

  paragraphSpacing.value = appState.formatter.paragraphSpacing;

  previewWidth.value = appState.formatter.previewWidth;

  widthValue.textContent = previewWidth.value;
}

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

/* =================================================
   TOKENIZATION / WRAPPING
================================================= */

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

/* =================================================
   DOCUMENT HELPERS
================================================= */

function getBookText() {
  const book = getCurrentBook();

  if (book) {
    return book.text || "";
  }

  return inputText.value || "";
}

function getBookParagraphs(text = getBookText()) {
  const lines = text.split(/\r?\n/);

  const paragraphs = [];
  let currentParagraph = [];

  lines.forEach((line) => {
    const clean = line.trim();

    if (!clean) {
      if (currentParagraph.length) {
        paragraphs.push(currentParagraph.join("\n").trim());

        currentParagraph = [];
      }

      return;
    }

    const isChapterHeading = chapterPatterns.some((pattern) =>
      pattern.test(clean)
    );

    if (isChapterHeading && currentParagraph.length) {
      paragraphs.push(currentParagraph.join("\n").trim());

      currentParagraph = [];
    }

    currentParagraph.push(clean);
  });

  if (currentParagraph.length) {
    paragraphs.push(currentParagraph.join("\n").trim());
  }

  return paragraphs.filter(Boolean);
}

function getFormattedText() {
  const width = parseFloat(lineWidth.value) || 40;

  const text = getBookText();

  const paragraphs = formatDocument(text, width);

  return paragraphs.map((paragraph) => paragraph.join("\n")).join("\n\n");
}

/* =================================================
   PREVIEW
================================================= */

function renderPreview(text = getBookText()) {
  preview.innerHTML = "";

  const test = document.createElement("div");

  test.className = "preview-paragraph";

  test.textContent =
    text.slice(0, 10000);

  preview.appendChild(test);

  updateStats();
}
