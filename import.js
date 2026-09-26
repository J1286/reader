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

    for (
      let pageNumber = 1;
      pageNumber <= pdf.numPages;
      pageNumber++
    ) {
      const page = await pdf.getPage(pageNumber);

      const textContent =
        await page.getTextContent();

      const items = textContent.items
        .filter(item => item.str && item.str.trim())
        .map(item => ({
          text: item.str.trim(),
          x: item.transform[4],
          y: item.transform[5]
        }));

      const lines = [];

      for (const item of items) {
        let line = lines.find(
          existing =>
            Math.abs(existing.y - item.y) < 3
        );

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

      const pageLines = lines.map(line => {
        line.items.sort((a, b) => a.x - b.x);

        return line.items
          .map(item => item.text)
          .join(" ");
      });

      pages.push(pageLines.join("\n"));
    }

    const text = pages.join("\n\n");

    await loadImportedText(text, file.name);

  } catch (error) {
    console.error("Could not import PDF:", error);

    showStatus(
      "The PDF could not be imported."
    );
  }
}

async function importFile(file) {
  if (!file) {
    return;
  }

  if (!isSupportedFile(file)) {
    showStatus(
      "Please choose a TXT, Markdown, Word or PDF file."
    );

    return;
  }

  const filename =
    file.name.toLowerCase();

  if (filename.endsWith(".docx")) {
    await importWordFile(file);
    return;
  }

  if (filename.endsWith(".pdf")) {
    await importPdfFile(file);
    return;
  }

  await importTextFile(file);
}

browseFileButton.addEventListener(
  "click",
  () => {
    fileInput.click();
  }
);


fileInput.addEventListener(
  "change",
  async () => {
    const file =
      fileInput.files[0];

    if (file) {
      await importFile(file);
    }

    fileInput.value = "";
   }
 );

/* =================================================
   DRAG AND DROP
================================================= */

function isSupportedFile(file) {
  const filename =
    file.name.toLowerCase();

  return (
    filename.endsWith(".txt") ||
    filename.endsWith(".md") ||
    filename.endsWith(".text") ||
    filename.endsWith(".docx") || 
    filename.endsWith(".pdf")
  );
}


async function importTextFile(file) {
  try {
    const text =
      await file.text();

    await loadImportedText(
      text,
      file.name
    );
  } catch (error) {
    console.error(
      "Could not read text file:",
      error
    );

    showStatus(
      "Could not read that text file."
    );
  }
}


async function importWordFile(file) {
  if (!window.mammoth) {
    showStatus(
      "Word import library unavailable."
    );

    console.error(
      "Mammoth.js was not loaded."
    );

    return;
  }

  try {
    showStatus(
      "Reading Word document..."
    );

    const arrayBuffer =
      await file.arrayBuffer();

    const result =
      await window.mammoth.extractRawText({
        arrayBuffer
      });

    const text =
      result.value;

    if (
      result.messages &&
      result.messages.length
    ) {
      console.info(
        "Word import messages:",
        result.messages
      );
    }

    await loadImportedText(
      text,
      file.name
    );
  } catch (error) {
    console.error(
      "Could not read Word document:",
      error
    );

    showStatus(
      "Could not read that Word document."
    );
  }
}


/* =================================================
   DRAG EVENTS
================================================= */

[
  "dragenter",
  "dragover",
  "dragleave",
  "drop"
].forEach((eventName) => {
  dropZone.addEventListener(
    eventName,
    (event) => {
      event.preventDefault();
      event.stopPropagation();
    }
  );
});


dropZone.addEventListener(
  "dragenter",
  () => {
    dragCounter++;

    dropZone.classList.add(
      "drag-over"
    );
  }
);


dropZone.addEventListener(
  "dragover",
  (event) => {
    event.dataTransfer.dropEffect =
      "copy";
  }
);


dropZone.addEventListener(
  "dragleave",
  () => {
    dragCounter--;

    if (dragCounter <= 0) {
      dragCounter = 0;

      dropZone.classList.remove(
        "drag-over"
      );
    }
  }
);


dropZone.addEventListener(
  "drop",
  async (event) => {
    dragCounter = 0;

    dropZone.classList.remove(
      "drag-over"
    );

    const files =
      Array.from(
        event.dataTransfer.files
      );

    if (files.length > 0) {
      await importFile(files[0]);

      return;
    }

    const text =
      event.dataTransfer.getData(
        "text/plain"
      );

    if (text && text.trim()) {
      await loadImportedText(
        text,
        "Dragged text"
      );

      return;
    }

    showStatus(
      "Nothing usable was dropped."
    );
  }
);
