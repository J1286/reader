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
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id"
        });

        store.createIndex("title", "title", {
          unique: false
        });
      }
    };

    request.onsuccess = () => {
      libraryDB = request.result;
      resolve(libraryDB);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}


/* =================================================
   SAVE BOOK
================================================= */

async function saveBook(book) {
  if (!book || !book.id) {
    return;
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

    const request = store.put(book);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
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
    const transaction = libraryDB.transaction(
      STORE_NAME,
      "readonly"
    );

    const store = transaction.objectStore(STORE_NAME);

    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}


/* =================================================
   GET BOOK
================================================= */

async function getBook(bookId) {
  if (!libraryDB) {
    await openLibraryDB();
  }

  return new Promise((resolve, reject) => {
    const transaction = libraryDB.transaction(
      STORE_NAME,
      "readonly"
    );

    const store = transaction.objectStore(STORE_NAME);

    const request = store.get(bookId);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}


/* =================================================
   DELETE BOOK
================================================= */

async function deleteBook(bookId) {
  if (!libraryDB) {
    await openLibraryDB();
  }

  return new Promise((resolve, reject) => {
    const transaction = libraryDB.transaction(
      STORE_NAME,
      "readwrite"
    );

    const store = transaction.objectStore(STORE_NAME);

    const request = store.delete(bookId);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}


/* =================================================
   LIBRARY RENDERING
================================================= */

async function renderLibrary() {
  const books = await getAllBooks();

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

    const icon = document.createElement("div");

    icon.className = "book-icon";

    icon.textContent =
      book.type === "docx"
        ? "📘"
        : "📖";

    const title = document.createElement("div");

    title.className = "book-title";

    title.textContent =
      book.title || "Untitled";

    const meta = document.createElement("div");

    meta.className = "book-meta";

    meta.textContent =
      book.sourceName ||
      "Text document";

    const type = document.createElement("span");

    type.className = "book-type";

    type.textContent =
      book.type || "text";

    const progress = document.createElement("div");

    progress.className = "book-progress";

    const progressBar = document.createElement("div");

    progressBar.className = "book-progress-bar";

    const progressValue =
      book.reader?.progress || 0;

    progressBar.style.width =
      `${Math.round(progressValue * 100)}%`;

    progress.appendChild(progressBar);

    const actions = document.createElement("div");

    actions.className = "book-card-actions";


    /* ---------- Open ---------- */

    const openButton = document.createElement("button");

    openButton.textContent = "Open";

    openButton.addEventListener("click", (event) => {
      event.stopPropagation();

      openBook(book.id);
    });


    /* ---------- Delete ---------- */

    const deleteButton = document.createElement("button");

    deleteButton.className = "secondary";

    deleteButton.textContent = "Delete";

    deleteButton.addEventListener(
      "click",
      async (event) => {
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

          if (
            appState.currentBookId === null
          ) {
            inputText.value = "";

            detectedChapters = [];

            renderCurrentView();
          }

          await renderLibrary();

          showStatus("Book deleted.");
        } catch (error) {
          console.error(
            "Could not delete book:",
            error
          );

          showStatus(
            "Could not delete that book."
          );
        }
      }
    );


    actions.appendChild(openButton);
    actions.appendChild(deleteButton);

    card.appendChild(icon);
    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(type);
    card.appendChild(progress);
    card.appendChild(actions);

    card.addEventListener("click", () => {
      openBook(book.id);
    });

    libraryPanel.appendChild(card);
  });
}


/* =================================================
   OPEN BOOK
================================================= */

async function openBook(bookId) {
  try {
    const storedBook = await getBook(bookId);

    if (!storedBook) {
      showStatus("Book could not be found.");
      return;
    }

    /*
       Put the IndexedDB version into the shared
       application state.
    */

    const existingBook =
      getBookById(bookId);

    if (existingBook) {
      Object.assign(
        existingBook,
        storedBook
      );
    } else {
      appState.library.push(storedBook);
    }

    setCurrentBook(bookId);

    loadCurrentBookReaderState();

    const book = getCurrentBook();

    if (!book) {
      showStatus("Book could not be opened.");
      return;
    }

    book.lastOpened = Date.now();

    inputText.value = book.text || "";

    renderCurrentView();

    stateChanged();

    await saveBook(book);

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
  const book = getCurrentBook();

  if (!book) {
    return null;
  }

  book.text = text || "";

  book.updatedAt =
    new Date().toISOString();

  inputText.value = book.text;

  stateChanged();

  if (persist) {
    try {
      await saveBook(book);
    } catch (error) {
      console.error(
        "Could not save book text:",
        error
      );
    }
  }

  return book;
}