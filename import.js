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

  /*
     Compatibility bridge:
     reader.js, cleanup.js and some older code still use
     the legacy currentBook object while the application
     state migration is in progress.
  */
  currentBook = {
    ...book,

    fileName: book.sourceName || "",
    position: book.reader?.scrollTop || 0,
    progress: book.reader?.progress || 0
  };

  try {
    await saveBook(book);
  } catch (error) {
    console.error("Could not save imported book:", error);
    showStatus("The book was imported but could not be saved.");
    return;
  }

  inputText.value = book.text;

  loadCurrentBookReaderState();

  /*
     Keep the compatibility object synchronized with the
     reader state loaded from appState.
  */
  currentBook.position =
    appState.reader.scrollTop || 0;

  currentBook.progress =
    appState.reader.progress || 0;

  renderCurrentView();
  setMode("reader");

  await renderLibrary();

  stateChanged();

  showStatus(`Added "${book.title}" to your library.`);
}

/* =================================================
   FILE IMPORT
================================================= */

async function importFile(file) {
  if (!file) {
    return;
  }

  if (!isSupportedFile(file)) {
    showStatus(
      "Please choose a TXT, Markdown or Word file."
    );

    return;
  }

  const filename =
    file.name.toLowerCase();

  if (filename.endsWith(".docx")) {
    await importWordFile(file);

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
    filename.endsWith(".docx")
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