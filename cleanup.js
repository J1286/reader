/* =================================================
   CLEANUP EVENTS
================================================= */

analyzeButton.addEventListener("click", analyzeText);

applyButton.addEventListener("click", applyCleanup);

clearButton.addEventListener("click", clearDocument);


/* =================================================
   CLEANUP HELPERS
================================================= */

/**
 * Remove unnecessary spaces while preserving meaningful
 * whitespace and line structure.
 */
function cleanSpacing(text) {
  let result = text;

  // Collapse repeated spaces/tabs.
  result = result.replace(/[ \t]{2,}/g, " ");

  // Remove spaces before punctuation.
  result = result.replace(
    /[ \t]+([，。！？：；,.!?])/g,
    "$1"
  );

  // Remove spaces immediately inside Chinese quotation marks.
  result = result.replace(/「\s+/g, "「");
  result = result.replace(/\s+」/g, "」");

  return result;
}


/**
 * Determine whether a line looks like a chapter/section heading.
 */
function isLikelyHeading(line) {
  if (
    line.length <= 40 &&
    /^第.{1,20}[章節部篇]/.test(line)
  ) {
    return true;
  }

  if (
    line.length <= 60 &&
    /^(chapter|part|section)\s+\d+/i.test(line)
  ) {
    return true;
  }

  if (
    line.length <= 40 &&
    /^[A-Z0-9][A-Z0-9 \-:]{3,}$/.test(line)
  ) {
    return true;
  }

  return false;
}


/**
 * Join lines that appear to be wrapped versions of the
 * same paragraph.
 */
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

    /*
       CJK text normally does not need a space between
       wrapped lines.

       Latin text generally does.
    */
    if (
      isCJK(paragraph.at(-1)) ||
      isCJK(line[0])
    ) {
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


/**
 * Insert paragraph breaks where the text strongly suggests
 * a new paragraph has started.
 */
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

    const next = lines[i + 1]
      ? lines[i + 1].trim()
      : "";

    if (!next) {
      continue;
    }

    const endsChineseSentence =
      /[。！？]$/.test(current);

    const endsEnglishSentence =
      /[.!?]["')\]]?$/.test(current);

    const nextStartsDialogue =
      /^[「『“"]/.test(next);

    if (
      (endsChineseSentence || endsEnglishSentence) &&
      nextStartsDialogue
    ) {
      result.push("");
    }
  }

  return result.join("\n");
}


/* =================================================
   ANALYZE
================================================= */

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

  /*
     Prevent cleanup from creating excessive blank lines.
  */
  cleaned = cleaned
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  cleanedText.value = cleaned;

  cleanupResult.classList.remove("hidden");

  /*
     There is always something available to apply once
     analysis has completed, even when no changes were made.
  */
  applyButton.disabled = false;

  if (original === cleaned) {
    changeCount.textContent =
      "No changes detected.";
  } else {
    const originalLines =
      original.split(/\r?\n/).length;

    const cleanedLines =
      cleaned.split(/\r?\n/).length;

    const difference = Math.abs(
      cleanedLines - originalLines
    );

    if (difference === 0) {
      changeCount.textContent =
        "Text spacing or punctuation changed.";
    } else {
      changeCount.textContent =
        `${difference} line structure change` +
        `${difference === 1 ? "" : "s"}`;
    }
  }

  showStatus("Text analyzed.");
}

/* =================================================
   APPLY CLEANUP
================================================= */

async function applyCleanup() {
  const cleaned = cleanedText.value;

  if (!cleaned.trim()) {
    return;
  }

  const book = getCurrentBook();

  if (!book) {
    showStatus(
      "Open or import a book before applying cleanup."
    );

    return;
  }

  await updateCurrentBookText(
    cleaned,
    true
  );

  renderCurrentView();

  if (currentMode === "reader") {
    renderReader();
  }

  showStatus(
    "Cleaned text applied."
  );
}


/* =================================================
   CLEAR DOCUMENT
================================================= */

function clearDocument() {
  if (
    !inputText.value.trim() &&
    !cleanedText.value.trim()
  ) {
    return;
  }

  /*
     Clear the editor state without deleting the
     book from the library.

     Deleting a library book remains the responsibility
     of the Delete button in the Library.
  */

  appState.currentBookId = null;

  appState.reader.currentChapterIndex = 0;
  appState.reader.scrollTop = 0;
  appState.reader.progress = 0;

  inputText.value = "";
  cleanedText.value = "";

  cleanupResult.classList.add(
    "hidden"
  );

  applyButton.disabled = true;

  changeCount.textContent =
    "No changes yet";

  detectedChapters = [];

  stateChanged();

  renderCurrentView();

  if (currentMode === "reader") {
    renderReader();
  }

  showStatus(
    "Document cleared."
  );
}