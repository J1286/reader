/* =================================================
   IMPORT ELEMENTS
================================================= */

let dragCounter = 0;

/* =================================================
   IMPORT
================================================= */

async function loadImportedText(text, filename) {
  if (!text || !text.trim()) {
    showStatus("The file appears to be empty.");
    return;
  }

  const extension = filename.split(".").pop().toLowerCase();

  const book = createBook({
    title: filename.replace(/\.[^/.]+$/, ""),
    text,
    type: extension === "docx" ? "docx" : "text",
    sourceName: filename
  });

  addBookToLibrary(book);
  setCurrentBook(book.id);

  try {
    await saveBook(book);
  } catch (error) {
    console.error("Could not save imported book:", error);
    showStatus("The book was imported but could not be saved.");
    return;
  }

  inputText.value = book.text;

  loadCurrentBookReaderState();

  renderCurrentView();
  setMode("reader");

  await renderLibrary();

  stateChanged();

  showStatus(`Added "${book.title}" to your library.`);
}

/* =================================================
   FILE IMPORT
================================================= */

async function importPdfFile(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();

    const pdf = await window.pdfjsLib.getDocument({
      data: arrayBuffer
    }).promise;

    const pages = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);

      const textContent = await page.getTextContent();

      const items = textContent.items
        .filter((item) => item.str && item.str.trim())
        .map((item) => ({
          text: item.str.trim(),
          x: item.transform[4],
          y: item.transform[5]
        }));

      const lines = [];

      for (const item of items) {
        let line = lines.find((existing) => Math.abs(existing.y - item.y) < 3);

        if (!line) {
          line = {
            y: item.y,
            items: []
          };

          lines.push(line);
        }

        line.items.push(item);
      }

      lines.sort((a, b) => b.y - a.y);

      const pageLines = lines.map((line) => {
        line.items.sort((a, b) => a.x - b.x);

        return line.items.map((item) => item.text).join(" ");
      });

      pages.push(pageLines.join("\n"));
    }

    const text = pages.join("\n\n");

    await loadImportedText(text, file.name);
  } catch (error) {
    console.error("Could not import PDF:", error);

    showStatus("The PDF could not be imported.");
  }
}

async function importFile(file) {
  if (!file) {
    return;
  }

  if (!isSupportedFile(file)) {
    showStatus("Please choose a TXT, Markdown, HTML, Word or PDF file.");

    return;
  }

  const filename = file.name.toLowerCase();

  if (filename.endsWith(".docx")) {
    await importWordFile(file);
    return;
  }

  if (filename.endsWith(".pdf")) {
    await importPdfFile(file);
    return;
  }

  if (filename.endsWith(".htm") || filename.endsWith(".html")) {
    await importHtmlFile(file);
    return;
  }

  await importTextFile(file);
}

browseFileButton.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", async () => {
  const files = Array.from(fileInput.files || []);

  if (!files.length) {
    return;
  }

  for (const file of files) {
    await importFile(file);
  }

  fileInput.value = "";
});

/* =================================================
   DRAG AND DROP
================================================= */

function isSupportedFile(file) {
  const filename = file.name.toLowerCase();

  return (
    filename.endsWith(".txt") ||
    filename.endsWith(".md") ||
    filename.endsWith(".text") ||
    filename.endsWith(".htm") ||
    filename.endsWith(".html") ||
    filename.endsWith(".docx") ||
    filename.endsWith(".pdf")
  );
}

async function importHtmlFile(file) {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Read the beginning of the file using an ASCII-compatible encoding
    // so we can look for a declared charset.
    const header = new TextDecoder("windows-1252").decode(bytes.slice(0, 8192));

    const charsetMatch = header.match(
      /charset\s*=\s*["']?\s*([a-zA-Z0-9._-]+)/i
    );

    let encoding = charsetMatch?.[1]?.toLowerCase() || null;

    // Common names for CP950.
    if (encoding === "cp950" || encoding === "950") {
      encoding = "windows-950";
    }

    let html;

    if (encoding) {
      try {
        html = new TextDecoder(encoding).decode(bytes);
      } catch {
        // If the declared encoding isn't supported,
        // fall back to UTF-8.
        html = new TextDecoder("utf-8").decode(bytes);
      }
    } else {
      // Try UTF-8 first.
      try {
        html = new TextDecoder("utf-8", {
          fatal: true
        }).decode(bytes);
      } catch {
        // Older Chinese HTML files are often Big5 / CP950.
        try {
          html = new TextDecoder("windows-950").decode(bytes);
        } catch {
          html = new TextDecoder("big5").decode(bytes);
        }
      }
    }

    const parser = new DOMParser();

    const document = parser.parseFromString(html, "text/html");

    // Remove things that shouldn't become book text.
    document.querySelectorAll("script, style, noscript").forEach((element) => {
      element.remove();
    });

    // Preserve formatting when the HTML uses <pre>,
    // which is common in older online novels.
    const pre = document.body?.querySelector("pre");

    const text = pre
      ? pre.textContent || ""
      : document.body?.innerText || document.body?.textContent || "";

    await loadImportedText(text, file.name);
  } catch (error) {
    console.error("Could not read HTML file:", error);

    showStatus("Could not read that HTML file.");
  }
}

async function importTextFile(file) {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    let text;

    // 1. Detect UTF-16 from its byte-order mark.
    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
      text = new TextDecoder("utf-16le").decode(bytes);
    } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
      text = new TextDecoder("utf-16be").decode(bytes);
    } else {
      // 2. Prefer UTF-8 when the entire file is valid UTF-8.
      try {
        text = new TextDecoder("utf-8", {
          fatal: true
        }).decode(bytes);
      } catch {
        // 3. Legacy Chinese encodings need a best-effort choice.
        const big5Text = new TextDecoder("big5").decode(bytes);
        const gbText = new TextDecoder("gb18030").decode(bytes);

        // Compare common Simplified vs. Traditional Chinese characters.
        const simplifiedHints =
          "这来为发后里国说时对过还会们个长经实当开现从动关与无见学问应点体进将两种还没让给听话头东车书爱亲妈爷边风气数写请该处战军门间";
        const traditionalHints =
          "這來為發後裡國說時對過還會們個長經實當開現從動關與無見學問應點體進將兩種還沒讓給聽話頭東車書愛親媽爺邊風氣數寫請該處戰軍門間";

        function scoreCharacters(sample, characters) {
          let score = 0;
          for (const char of sample) {
            if (characters.includes(char)) score++;
          }
          return score;
        }

        // Sample the beginning and middle to avoid scanning every character.
        function getSample(value) {
          const middle = Math.floor(value.length / 2);
          return (
            value.slice(0, 12000) +
            value.slice(middle, middle + 12000)
          );
        }

        const big5Sample = getSample(big5Text);
        const gbSample = getSample(gbText);

        const big5Score =
          scoreCharacters(big5Sample, traditionalHints) -
          scoreCharacters(big5Sample, simplifiedHints);

        const gbScore =
          scoreCharacters(gbSample, simplifiedHints) -
          scoreCharacters(gbSample, traditionalHints);

        // Prefer GB18030 only when its Simplified Chinese signal is stronger.
        // Otherwise retain the app's Traditional Chinese-friendly default.
        text = gbScore > big5Score ? gbText : big5Text;
      }
    }

    await loadImportedText(text, file.name);
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

    await loadImportedText(text, file.name);
  } catch (error) {
    console.error("Could not read Word document:", error);

    showStatus("Could not read that Word document.");
  }
}

/* =================================================
   DRAG EVENTS
================================================= */

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
    await loadImportedText(text, "Dragged text");

    return;
  }

  showStatus("Nothing usable was dropped.");
});
