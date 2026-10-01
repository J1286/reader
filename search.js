const searchInput =
  document.getElementById("searchInput");

const searchButton =
  document.getElementById("searchButton");

const searchResults =
  document.getElementById("searchResults");


async function performLibrarySearch() {

  const query =
    searchInput.value.trim();

  searchResults.innerHTML = "";

  if (!query) {
    return;
  }

  const books =
    await getAllBooks();

  const searchTerm =
    query.toLocaleLowerCase();

  const matches = [];

  books.forEach((book) => {

    const title =
      book.title || "Untitled";

    const text =
      book.text || "";

    const titleMatch =
      title
        .toLocaleLowerCase()
        .includes(searchTerm);

    const textLower =
      text.toLocaleLowerCase();

    const textIndex =
      textLower.indexOf(searchTerm);

    if (!titleMatch && textIndex === -1) {
      return;
    }

    let snippet = "";

    if (textIndex !== -1) {

      const start =
        Math.max(0, textIndex - 80);

      const end =
        Math.min(
          text.length,
          textIndex + query.length + 120
        );

      snippet =
        text
          .slice(start, end)
          .replace(/\s+/g, " ")
          .trim();

      if (start > 0) {
        snippet = "…" + snippet;
      }

      if (end < text.length) {
        snippet += "…";
      }

    } else {

      snippet =
        "Match found in book title.";

    }

    matches.push({
      book,
      snippet
    });

  });

  if (!matches.length) {

    searchResults.textContent =
      "No results found.";

    return;
  }

  matches.forEach(({ book, snippet }) => {

    const result =
      document.createElement("button");

    result.type = "button";
    result.className = "search-result";

    const title =
      document.createElement("strong");

    title.textContent =
      book.title || "Untitled";

    const preview =
      document.createElement("span");

    preview.textContent =
      snippet;

    result.appendChild(title);
    result.appendChild(preview);

    result.addEventListener(
      "click",
      () => {
        openBook(book.id);
      }
    );

    searchResults.appendChild(result);
  });
}

searchButton?.addEventListener(
  "click",
  performLibrarySearch
);

searchInput?.addEventListener(
  "keydown",
  (event) => {

    if (event.key === "Enter") {
      performLibrarySearch();
    }
  }
);
