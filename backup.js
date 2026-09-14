/* =================================================
   DOM ELEMENTS
================================================= */

const backupLibraryButton =
  document.getElementById(
    "backupLibraryButton"
  );

const restoreLibraryButton =
  document.getElementById(
    "restoreLibraryButton"
  );

const restoreLibraryInput =
  document.getElementById(
    "restoreLibraryInput"
  );


/* =================================================
   BACKUP FORMAT
================================================= */

const BACKUP_VERSION = 1;


/* =================================================
   CREATE BACKUP
================================================= */

async function createLibraryBackup() {
  try {

    const books =
      await getAllBooks();

    const backup = {
      backupVersion:
        BACKUP_VERSION,

      createdAt:
        new Date().toISOString(),

      appVersion:
        APP_VERSION,

      currentBookId:
        appState.currentBookId,

      formatter: {
        ...appState.formatter
      },

      cleanup: {
        ...appState.cleanup
      },

      reader: {
        ...appState.reader
      },

      books: books.map((book) => ({
        ...book,

        reader: {
          ...(book.reader || {
            chapterIndex: 0,
            scrollTop: 0,
            progress: 0
          })
        }
      }))
    };

    return backup;

  } catch (error) {
    console.error(
      "Could not create library backup:",
      error
    );

    throw error;
  }
}


/* =================================================
   DOWNLOAD BACKUP
================================================= */

async function backupLibrary() {
  try {
    const backup =
      await createLibraryBackup();

    const json =
      JSON.stringify(
        backup,
        null,
        2
      );

    const blob =
      new Blob(
        [json],
        {
          type:
            "application/json"
        }
      );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement(
        "a"
      );

    const date =
      new Date()
        .toISOString()
        .slice(0, 10);

    link.href = url;

    link.download =
      `my-reader-backup-${date}.json`;

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

    showStatus(
      `Library backup created (${backup.books.length} book${
        backup.books.length === 1
          ? ""
          : "s"
      }).`
    );

  } catch (error) {
    console.error(
      "Could not create backup:",
      error
    );

    showStatus(
      "Could not create library backup."
    );
  }
}


/* =================================================
   VALIDATE BACKUP
================================================= */

function validateLibraryBackup(data) {
  if (
    !data ||
    typeof data !== "object"
  ) {
    return {
      valid: false,
      message:
        "The selected file is not a valid backup."
    };
  }

  if (
    !Array.isArray(data.books)
  ) {
    return {
      valid: false,
      message:
        "The backup does not contain a book library."
    };
  }

  if (
    data.backupVersion !==
    BACKUP_VERSION
  ) {
    return {
      valid: false,
      message:
        "This backup format is not supported."
    };
  }

  return {
    valid: true
  };
}


/* =================================================
   NORMALIZE RESTORED BOOK
================================================= */

function normalizeRestoredBook(book) {
  if (
    !book ||
    typeof book !== "object"
  ) {
    return null;
  }

  if (!book.id) {
    return null;
  }

  const reader =
    book.reader ||
    book.readerState ||
    {};

  return {
    ...book,

    id:
      String(book.id),

    title:
      book.title ||
      "Untitled",

    text:
      book.text ||
      "",

    type:
      book.type ||
      "txt",

    sourceName:
      book.sourceName ||
      "",

    chapters:
      Array.isArray(book.chapters)
        ? book.chapters
        : [],

    createdAt:
      book.createdAt ||
      new Date().toISOString(),

    updatedAt:
      book.updatedAt ||
      new Date().toISOString(),

    reader: {
      chapterIndex:
        Number.isFinite(
          Number(reader.chapterIndex)
        )
          ? Math.max(
              0,
              Number(reader.chapterIndex)
            )
          : 0,

      scrollTop:
        Number.isFinite(
          Number(reader.scrollTop)
        )
          ? Math.max(
              0,
              Number(reader.scrollTop)
            )
          : 0,

      progress:
        Number.isFinite(
          Number(reader.progress)
        )
          ? Math.max(
              0,
              Math.min(
                1,
                Number(reader.progress)
              )
            )
          : 0
    }
  };
}


/* =================================================
   RESTORE LIBRARY
================================================= */

async function restoreLibrary(file) {
  if (!file) {
    return;
  }

  try {
    const text =
      await file.text();

    let backup;

    try {
      backup =
        JSON.parse(text);
    } catch (error) {
      showStatus(
        "The selected file is not valid JSON."
      );

      return;
    }

    const validation =
      validateLibraryBackup(
        backup
      );

    if (!validation.valid) {
      showStatus(
        validation.message
      );

      return;
    }

    const restoredBooks =
      backup.books
        .map(
          normalizeRestoredBook
        )
        .filter(Boolean);

    if (!restoredBooks.length) {
      showStatus(
        "The backup does not contain any valid books."
      );

      return;
    }

    const confirmed =
      confirm(
        `Restore ${restoredBooks.length} book${
          restoredBooks.length === 1
            ? ""
            : "s"
        } from this backup?\n\n` +
        "Books with the same ID will be replaced."
      );

    if (!confirmed) {
      return;
    }

    /*
       Save every restored book to IndexedDB.
    */
    for (
      const book of restoredBooks
    ) {
      await saveBook(book);
    }

    if (
      backup.formatter &&
      typeof backup.formatter ===
        "object"
    ) {
      appState.formatter = {
        ...DEFAULT_FORMATTER_SETTINGS,
        ...backup.formatter
      };
    }

    if (
      backup.cleanup &&
      typeof backup.cleanup ===
        "object"
    ) {
      appState.cleanup = {
        ...DEFAULT_CLEANUP_SETTINGS,
        ...backup.cleanup
      };
    }

    if (
      backup.reader &&
      typeof backup.reader ===
        "object"
    ) {
      appState.reader = {
        ...DEFAULT_READER_SETTINGS,
        ...backup.reader
      };
    }

    await syncLibraryState();

    if (
      backup.currentBookId &&
      getBookById(
        backup.currentBookId
      )
    ) {
      setCurrentBook(
        backup.currentBookId
      );
    }

    stateChanged();

    await renderLibrary();

    renderCurrentView();

    showStatus(
      `Restored ${restoredBooks.length} book${
        restoredBooks.length === 1
          ? ""
          : "s"
      } successfully.`
    );

  } catch (error) {
    console.error(
      "Could not restore library:",
      error
    );

    showStatus(
      "Could not restore the library backup."
    );
  }
}


/* =================================================
   EVENTS
================================================= */

backupLibraryButton.addEventListener(
  "click",
  () => {
    backupLibrary();
  }
);


restoreLibraryButton.addEventListener(
  "click",
  () => {
    restoreLibraryInput.value = "";
    restoreLibraryInput.click();
  }
);


restoreLibraryInput.addEventListener(
  "change",
  () => {
    const file =
      restoreLibraryInput.files?.[0];

    if (file) {
      restoreLibrary(file);
    }
  }
);
