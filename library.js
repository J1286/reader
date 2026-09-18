/* =================================================
   BOOK LIBRARY
================================================= */

const DB_NAME = "textFormatterLibrary";
const DB_VERSION = 1;
const STORE_NAME = "books";

let libraryDB = null;


/* =================================================
   DATABASE
================================================= */

function openLibraryDB() {
  return new Promise((resolve, reject) => {

    if (libraryDB) {
      resolve(libraryDB);
      return;
    }

    const request =
      indexedDB.open(
        DB_NAME,
        DB_VERSION
      );

    request.onupgradeneeded = (event) => {
      const db =
        event.target.result;

      if (
        !db.objectStoreNames.contains(
          STORE_NAME
        )
      ) {
        const store =
          db.createObjectStore(
            STORE_NAME,
            {
              keyPath: "id"
            }
          );

        store.createIndex(
          "title",
          "title",
          {
            unique: false
          }
        );
      }
    };

    request.onsuccess = () => {
      libraryDB =
        request.result;

      libraryDB.onversionchange = () => {
        libraryDB.close();
        libraryDB = null;
      };

      resolve(libraryDB);
    };

    request.onerror = () => {
      reject(request.error);
    };

    request.onblocked = () => {
      console.warn(
        "Library database upgrade is blocked by another connection."
      );
    };
  });
}


/* =================================================
   BOOK NORMALIZATION
================================================= */

function normalizeStoredBook(book) {
  if (!book || !book.id) {
    return null;
  }

  const savedReader =
    book.readerState ||
    book.reader ||
    {};

  const normalized = {
    ...book,

    id: book.id,

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

    readerState: {
      chapterIndex:
        Number.isFinite(
          Number(savedReader.chapterIndex)
        )
          ? Number(savedReader.chapterIndex)
          : 0,

      scrollTop:
        Number.isFinite(
          Number(savedReader.scrollTop)
        )
          ? Math.max(
              0,
              Number(savedReader.scrollTop)
            )
          : 0,

      progress:
        Number.isFinite(
          Number(savedReader.progress)
        )
          ? Math.max(
              0,
              Math.min(
                1,
                Number(savedReader.progress)
              )
            )
          : 0
    }
  };

  return normalized;
}


/* =================================================
   SAVE BOOK
================================================= */

async function saveBook(book) {
  if (!book || !book.id) {
    return false;
  }

  if (!libraryDB) {
    await openLibraryDB();
  }

  return new Promise((resolve, reject) => {
    const transaction = libraryDB.transaction(
      STORE_NAME,
      "readwrite"
    );

    const store = transaction.objectStore(STORE_NAME);

    store.put(book);

    transaction.oncomplete = () => {
      resolve(true);
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };

    transaction.onabort = () => {
      reject(
        transaction.error ||
        new Error("IndexedDB transaction aborted.")
      );
    };
  });
}


/* =================================================
   GET ALL BOOKS
================================================= */

async function getAllBooks() {
  if (!libraryDB) {
    await openLibraryDB();
  }

  return new Promise((resolve, reject) => {
    const transaction =
      libraryDB.transaction(
        STORE_NAME,
        "readonly"
      );

    const store =
      transaction.objectStore(
        STORE_NAME
      );

    const request =
      store.getAll();

    request.onsuccess = () => {
      const books =
        request.result
          .map(normalizeStoredBook)
          .filter(Boolean);

      resolve(books);
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.onerror = () => {
      reject(
        transaction.error ||
        new Error(
          "Could not read library."
        )
      );
    };
  });
}


/* =================================================
   GET BOOK
================================================= */

async function getBook(bookId) {
  if (!bookId) {
    return null;
  }

  if (!libraryDB) {
    await openLibraryDB();
  }

  return new Promise((resolve, reject) => {
    const transaction =
      libraryDB.transaction(
        STORE_NAME,
        "readonly"
      );

    const store =
      transaction.objectStore(
        STORE_NAME
      );

    const request =
      store.get(bookId);

    request.onsuccess = () => {
      resolve(
        normalizeStoredBook(
          request.result
        )
      );
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.onerror = () => {
      reject(
        transaction.error ||
        new Error(
          "Could not read the book."
        )
      );
    };
  });
}


/* =================================================
   DELETE BOOK
================================================= */

async function deleteBook(bookId) {
  if (!bookId) {
    return false;
  }

  if (!libraryDB) {
    await openLibraryDB();
  }

  return new Promise((resolve, reject) => {
    const transaction =
      libraryDB.transaction(
        STORE_NAME,
        "readwrite"
      );

    const store =
      transaction.objectStore(
        STORE_NAME
      );

    store.delete(bookId);

    transaction.oncomplete = () => {
      resolve(true);
    };

    transaction.onerror = () => {
      reject(
        transaction.error ||
        new Error(
          "Could not delete book."
        )
      );
    };

    transaction.onabort = () => {
      reject(
        transaction.error ||
        new Error(
          "Delete transaction aborted."
        )
      );
    };
  });
}


/* =================================================
   LIBRARY → APPLICATION STATE
================================================= */

async function syncLibraryState() {
  const books =
    await getAllBooks();

  appState.library = books;

  if (
    appState.currentBookId &&
    !getBookById(
      appState.currentBookId
    )
  ) {
    appState.currentBookId = null;
  }

  currentBook =
    getCurrentBook() ||
    createEmptyBook();

  return books;
}


/* =================================================
   LIBRARY RENDERING
================================================= */

async function renderLibrary() {
  try {
    const books = await getAllBooks();

    appState.library = books;

    if (
      appState.currentBookId &&
      !getBookById(appState.currentBookId)
    ) {
      appState.currentBookId = null;
      currentBook = createEmptyBook();
    }

    libraryPanel.innerHTML = "";

    if (!books.length) {
      const empty = document.createElement("div");
      empty.className = "library-empty";
      empty.textContent = "No books in your library yet.";
      libraryPanel.appendChild(empty);
      return;
    }

    books.sort((a, b) => {
      return (b.lastOpened || 0) - (a.lastOpened || 0);
    });

    books.forEach((book) => {
      const card = document.createElement("article");
      card.className = "book-card";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `Open ${book.title || "Untitled"}`);

      /* ---------- Cover ---------- */
      const cover = document.createElement("div");
      cover.className = "book-cover";

      if (book.coverImage) {
        cover.style.backgroundImage = `url(${JSON.stringify(book.coverImage)})`;
        cover.classList.add("has-cover-image");
      } else {
        const hue = getBookCoverHue(book.title || book.id);
        cover.style.setProperty("--cover-hue", hue);
      }

      const coverOverlay = document.createElement("div");
      coverOverlay.className = "book-cover-overlay";

      const title = document.createElement("div");
      title.className = "book-title";
      title.textContent = book.title || "Untitled";

      const progress = document.createElement("div");
      progress.className = "book-progress";

      const progressTrack = document.createElement("div");
      progressTrack.className = "book-progress-track";

      const progressBar = document.createElement("div");
      progressBar.className = "book-progress-bar";

      const progressValue = Math.max(
        0,
        Math.min(1, Number(book.reader?.progress) || 0)
      );
      const progressPercent = Math.round(progressValue * 100);
      progressBar.style.width = `${progressPercent}%`;

      progressTrack.appendChild(progressBar);

      const progressText = document.createElement("span");
      progressText.className = "book-progress-text";
      progressText.textContent = `${progressPercent}%`;

      progress.appendChild(progressTrack);
      progress.appendChild(progressText);

      coverOverlay.appendChild(title);
      coverOverlay.appendChild(progress);
      cover.appendChild(coverOverlay);

      /* ---------- Delete ---------- */
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "book-delete-button";
      deleteButton.setAttribute("aria-label", `Delete ${book.title || "Untitled"}`);
      deleteButton.title = "Delete book";
      deleteButton.textContent = "×";

      deleteButton.addEventListener("click", async (event) => {
        event.stopPropagation();

        const confirmed = confirm(
          `Delete "${book.title}" from your library?`
        );

        if (!confirmed) {
          return;
        }

        try {
          await deleteBook(book.id);
          removeBookFromLibrary(book.id);
          stateChanged();

          if (appState.currentBookId === null) {
            inputText.value = "";
            detectedChapters = [];
            renderCurrentView();
          }

          await renderLibrary();
          showStatus("Book deleted.");
        } catch (error) {
          console.error("Could not delete book:", error);
          showStatus("Could not delete that book.");
        }
      });

      card.appendChild(cover);
      card.appendChild(deleteButton);

      const open = () => openBook(book.id);
      card.addEventListener("click", open);
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });

      libraryPanel.appendChild(card);
    });
  } catch (error) {
    console.error("Could not render library:", error);

    libraryPanel.innerHTML = "";

    const empty = document.createElement("div");
    empty.className = "library-empty";
    empty.textContent = "Could not load your library.";
    libraryPanel.appendChild(empty);

    showStatus("Could not load your library.");
  }
}


function getBookCoverHue(value) {
  const text = String(value || "book");
  let hash = 0;

  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash) % 360;
}

/* =================================================
   OPEN BOOK
================================================= */

async function openBook(bookId) {
  try {
    const storedBook =
      await getBook(bookId);

    if (!storedBook) {
      showStatus(
        "Book could not be found."
      );

      return;
    }

    const existingBook =
      getBookById(bookId);

    if (existingBook) {
      Object.assign(
        existingBook,
        storedBook
      );
    } else {
      appState.library.push(
        storedBook
      );
    }

    setCurrentBook(
      bookId
    );

    loadCurrentBookReaderState();

    const book =
      getCurrentBook();

    if (!book) {
      showStatus(
        "Book could not be opened."
      );

      return;
    }

	prepareChapters(book.text || "");

    book.lastOpened =
      Date.now();

    book.updatedAt =
      new Date().toISOString();

    inputText.value =
      book.text || "";

    await saveBook(book);

    stateChanged();

    await renderLibrary();

    setMode("reader");

    showStatus(
      `Opened "${book.title}".`
    );
  } catch (error) {
    console.error(
      "Could not open book:",
      error
    );

    showStatus(
      "Could not open that book."
    );
  }
}


/* =================================================
   CURRENT BOOK TEXT
================================================= */

async function updateCurrentBookText(
  text,
  persist = false
) {
  const book =
    getCurrentBook();

  if (!book) {
    return null;
  }

  book.text =
    text || "";

  book.updatedAt =
    new Date().toISOString();

  currentBook =
    book;

  inputText.value =
    book.text;

  stateChanged();

  if (persist) {
    try {
      await saveBook(book);
    } catch (error) {
      console.error(
        "Could not save book text:",
        error
      );

      showStatus(
        "Could not save the book."
      );
    }
  }

  return book;
}
