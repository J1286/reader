/* =================================================
   DOWNLOAD
================================================= */

function download(blob, filename) {
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);
}

/* =================================================
   DOWNLOAD BUTTONS
================================================= */

document.getElementById("txtButton").addEventListener("click", () => {
  const text = getFormattedText();

  if (!text) {
    return;
  }

  const blob = new Blob([text], {
    type: "text/plain;charset=utf-8"
  });

  download(blob, "formatted-text.txt");

  showStatus("TXT downloaded.");
});

document.getElementById("pdfButton").addEventListener("click", () => {
  window.print();
});

document.getElementById("wordButton").addEventListener("click", async () => {
  const text = getFormattedText();

  if (!text) {
    return;
  }

  if (!window.docx) {
    showStatus("Word library unavailable.");

    return;
  }

  try {
    const { Document, Packer, Paragraph, TextRun } = window.docx;

    const paragraphs = text.split("\n\n");

    const children = [];

    paragraphs.forEach((paragraph) => {
      const lines = paragraph.split("\n");

      const runs = [];

      lines.forEach((line, index) => {
        runs.push(
          new TextRun({
            text: line,
            break: index === 0 ? 0 : 1
          })
        );
      });

      children.push(
        new Paragraph({
          children: runs,

          spacing: {
            after: (parseInt(paragraphSpacing.value, 10) || 16) * 10
          },

          indent: indent.checked
            ? {
                firstLine: 720
              }
            : undefined
        })
      );
    });

    const document = new Document({
      sections: [
        {
          properties: {},
          children
        }
      ]
    });

    const blob = await Packer.toBlob(document);

    download(blob, "formatted-text.docx");

    showStatus("Word document downloaded.");
  } catch (error) {
    console.error(error);

    showStatus("Could not create Word file.");
  }
});

/* =================================================
   COPY
================================================= */

document.getElementById("copyButton").addEventListener("click", async () => {
  const text = getFormattedText();

  if (!text) {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);

    showStatus("Copied to clipboard.");
  } catch {
    showStatus("Could not copy.");
  }
});
