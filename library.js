/* =================================================
   BOOK LIBRARY
================================================= */

const DB_NAME = "textFormatterLibrary";
const DB_VERSION = 1;
const STORE_NAME = "books";

let currentLibraryFolderId = null;
let libraryDB = null;

function createLibraryFolder() {
  const name = prompt("Folder Name:");

  if (name === null) {
    return;
  }

  const folderName = name.trim();

  if (!folderName) {
    return;
  }

  const folder = {
    id:
      "folder-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 8),

    name: folderName
  };

  appState.librarySettings.folders.push(folder);

  saveAppState();
  renderLibrary();
}

async function moveBookToFolder(bookId, folderId) {
  try {
    const book = await getBook(bookId);

    if (!book) {
      showStatus("Book could not be found.");
      return false;
    }

    book.folderId = folderId || null;
    book.updatedAt = new Date().toISOString();

    await saveBook(book);

    await syncLibraryState();
    await renderLibrary();

    showStatus(
      folderId
        ? `Moved "${book.title}" to folder.`
        : `Moved "${book.title}" to My Library.`
    );

    return true;
  } catch (error) {
    console.error("Could not move book:", error);
    showStatus("Could not move that book.");
    return false;
  }
}

/* =================================================
   DATABASE
================================================= */

function openLibraryDB() {
  return new Promise((resolve, reject) => {
    if (libraryDB) {
      resolve(libraryDB);
      return;
    }

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

  const savedReader = book.readerState || book.reader || {};

  const normalized = {
    ...book,

    id: book.id,

    title: book.title || "Untitled",

    text: book.text || "",

    type: book.type || "txt",

    sourceName: book.sourceName || "",

    chapters: Array.isArray(book.chapters) ? book.chapters : [],

    createdAt: book.createdAt || new Date().toISOString(),

    updatedAt: book.updatedAt || new Date().toISOString(),

    readerState: {
      chapterIndex: Number.isFinite(Number(savedReader.chapterIndex))
        ? Number(savedReader.chapterIndex)
        : 0,

      scrollTop: Number.isFinite(Number(savedReader.scrollTop))
        ? Math.max(0, Number(savedReader.scrollTop))
        : 0,

      progress: Number.isFinite(Number(savedReader.progress))
        ? Math.max(0, Math.min(1, Number(savedReader.progress)))
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
    const transaction = libraryDB.transaction(STORE_NAME, "readwrite");

    const store = transaction.objectStore(STORE_NAME);

    store.put(book);

    transaction.oncomplete = () => {
      resolve(true);
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };

    transaction.onabort = () => {
      reject(transaction.error || new Error("IndexedDB transaction aborted."));
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
    const transaction = libraryDB.transaction(STORE_NAME, "readonly");

    const store = transaction.objectStore(STORE_NAME);

    const request = store.getAll();

    request.onsuccess = () => {
      const books = request.result.map(normalizeStoredBook).filter(Boolean);

      resolve(books);
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.onerror = () => {
      reject(transaction.error || new Error("Could not read library."));
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
    const transaction = libraryDB.transaction(STORE_NAME, "readonly");

    const store = transaction.objectStore(STORE_NAME);

    const request = store.get(bookId);

    request.onsuccess = () => {
      resolve(normalizeStoredBook(request.result));
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.onerror = () => {
      reject(transaction.error || new Error("Could not read the book."));
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
    const transaction = libraryDB.transaction(STORE_NAME, "readwrite");

    const store = transaction.objectStore(STORE_NAME);

    store.delete(bookId);

    transaction.oncomplete = () => {
      resolve(true);
    };

    transaction.onerror = () => {
      reject(transaction.error || new Error("Could not delete book."));
    };

    transaction.onabort = () => {
      reject(transaction.error || new Error("Delete transaction aborted."));
    };
  });
}

/* =================================================
   LIBRARY → APPLICATION STATE
================================================= */

async function syncLibraryState() {
  const books = await getAllBooks();

  appState.library = books;

  if (appState.currentBookId && !getBookById(appState.currentBookId)) {
    appState.currentBookId = null;
  }

  currentBook = getCurrentBook() || createEmptyBook();

  return books;
}

/* =================================================
   LIBRARY RENDERING
================================================= */

async function renderLibrary() {
  const libraryBackground =
    appState.appearance?.background === "cozy-winter"
      ? "cozy-winter"
      : "bookshelf";

  libraryView.dataset.background = libraryBackground;

  const libraryFolders = document.getElementById("libraryFolders");

  if (libraryFolders) {
    libraryFolders.innerHTML = "";

    const librarySection = document.getElementById("librarySection");

    if (currentLibraryFolderId !== null && librarySection) {
      const folder = appState.librarySettings.folders.find(
        (item) => item.id === currentLibraryFolderId
      );

      if (folder) {
        librarySection.dataset.folderName = folder.name;
      }
    }

    const folders = appState.librarySettings?.folders || [];

    folders.forEach((folder) => {
      const folderElement = document.createElement("div");

      folderElement.className = "library-folder";

      folderElement.dataset.folderId = folder.id;

      folderElement.addEventListener("click", () => {
        currentLibraryFolderId = folder.id;

        renderLibrary();
      });

      const icon = document.createElement("i");

      icon.className = "bi bi-folder-fill library-folder-icon";

      const name = document.createElement("span");

      name.className = "library-folder-name";

      name.textContent = folder.name;

      const count = document.createElement("span");

      count.className = "library-folder-count";

      const bookCount = appState.library.filter(
        (book) => book.folderId === folder.id
      ).length;

      count.textContent = bookCount;

      folderElement.appendChild(icon);
      folderElement.appendChild(name);
      folderElement.appendChild(count);

      libraryFolders.appendChild(folderElement);
    });
  }

  try {
    const books = await getAllBooks();

    const booksPerRow = appState.librarySettings?.booksPerRow || 2;

    libraryPanel.style.setProperty("--library-columns", booksPerRow);

    appState.library = books;

    if (appState.currentBookId && !getBookById(appState.currentBookId)) {
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

    const sortMode = appState.librarySettings?.sort || "recent";

    books.sort((a, b) => {
      if (sortMode === "title") {
        return (a.title || "").localeCompare(b.title || "", undefined, {
          sensitivity: "base"
        });
      }

      if (sortMode === "progress") {
        return (b.progress || 0) - (a.progress || 0);
      }

      return (b.lastOpened || 0) - (a.lastOpened || 0);
    });

    const visibleBooks =
      currentLibraryFolderId === null
        ? books.filter((book) => !book.folderId)
        : books.filter((book) => book.folderId === currentLibraryFolderId);

    visibleBooks.forEach((book) => {
      const card = document.createElement("article");
      card.className = "book-card";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `Open ${book.title || "Untitled"}`);

      /* ---------- Cover ---------- */
      const cover = document.createElement("div");
      cover.className = "book-cover";

      // Use a shared vintage cover until a book has its own cover image.
      const coverImage = book.coverImage || "./assets/default-book-cover.png";
      cover.style.backgroundImage = `url(${JSON.stringify(coverImage)})`;
      cover.classList.add("has-cover-image");

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
      deleteButton.setAttribute(
        "aria-label",
        `Delete ${book.title || "Untitled"}`
      );
      deleteButton.title = "Delete book";
      deleteButton.textContent = "×";

      deleteButton.addEventListener("click", async (event) => {
        event.stopPropagation();

        const confirmed = confirm(`Delete "${book.title}" from your library?`);

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

      const moveButton = document.createElement("button");

      moveButton.type = "button";
      moveButton.className = "book-move-button";
      moveButton.style.zIndex = "4";

      moveButton.setAttribute("aria-label", `Move ${book.title || "Untitled"}`);

      moveButton.title = "Move book";
      moveButton.innerHTML = '<i class="bi bi-folder"></i>';

      moveButton.addEventListener("click", (event) => {
        event.stopPropagation();

        const folders =
          appState.librarySettings?.folders || [];

        const options = [
       {
         id: null,
         name: "My Library"
       },
       ...folders
        ];

        const folderNames = options
          .map((folder, index) =>
          `${index + 1}. ${folder.name}`
          )
          .join("\n");

        const choice = prompt(
          `Move "${book.title}" to:\n\n${folderNames}\n\nEnter the number:`
        );

        if (choice === null) {
          return;
        }

        const index = Number(choice) - 1;

        if (
          !Number.isInteger(index) ||
          index < 0 ||
          index >= options.length
          ) {
          showStatus("Invalid folder selection.");
            return;
          }

        moveBookToFolder(
          book.id,
          options[index].id
        );
      });

      card.appendChild(moveButton);

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

const createFolderButton = document.getElementById("createFolderButton");

createFolderButton?.addEventListener("click", createLibraryFolder);

function getBookCoverHue(value) {
  const text = String(value || "book");
  let hash = 0;

  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash) % 360;
}

/* =================================================
   OPEN BOOK
================================================= */

async function openBook(bookId, searchPosition = null) {
  try {
    const storedBook = await getBook(bookId);

    if (!storedBook) {
      showStatus("Book could not be found.");

      return;
    }

    const existingBook = getBookById(bookId);

    if (existingBook) {
      Object.assign(existingBook, storedBook);
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

    prepareChapters(book.text || "");

    book.lastOpened = Date.now();

    book.updatedAt = new Date().toISOString();

    inputText.value = book.text || "";

    await saveBook(book);

    stateChanged();

    await renderLibrary();

    pendingSearchPosition = searchPosition;

    setMode("reader");

    showStatus(`Opened "${book.title}".`);
  } catch (error) {
    console.error("Could not open book:", error);

    showStatus("Could not open that book.");
  }
}

/* =================================================
   CURRENT BOOK TEXT
================================================= */

async function updateCurrentBookText(text, persist = false) {
  const book = getCurrentBook();

  if (!book) {
    return null;
  }

  book.text = text || "";

  book.updatedAt = new Date().toISOString();

  currentBook = book;

  inputText.value = book.text;

  stateChanged();

  if (persist) {
    try {
      await saveBook(book);
    } catch (error) {
      console.error("Could not save book text:", error);

      showStatus("Could not save the book.");
    }
  }

  return book;
}
