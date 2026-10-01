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

    let searchPosition = 0;
    let foundTextMatch = false;

    while (true) {

      const textIndex =
        textLower.indexOf(
          searchTerm,
          searchPosition
        );

      if (textIndex === -1) {
        break;
      }

      foundTextMatch = true;

      const start =
        Math.max(0, textIndex - 80);

      const end =
        Math.min(
          text.length,
          textIndex + query.length + 120
        );

      let snippet =
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

      matches.push({
        book,
        snippet,
        searchPosition: textIndex
      });

      searchPosition =
        textIndex + Math.max(query.length, 1);
    }

    if (
      titleMatch &&
      !foundTextMatch
    ) {

      matches.push({
        book,
        snippet:
          "Match found in book title.",
        searchPosition: null
      });

    }

  });


  if (!matches.length) {

    searchResults.textContent =
      "No results found.";

    return;
  }


  matches.forEach(
    ({
      book,
      snippet,
      searchPosition
    }) => {

      const result =
        document.createElement("button");

      result.type = "button";
      result.className =
        "search-result";


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

          openBook(
            book.id,
            searchPosition
          );

        }
      );


      searchResults.appendChild(result);

    }
  );

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
