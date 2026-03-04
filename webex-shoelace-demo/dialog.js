let data = null;

// default sort: highest count first
let sort = { key: "count", dir: "desc" };

let renderToken = 0;

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function renderRowsChunked(tbody, rows, chunkSize = 1, token) {
  tbody.textContent = ""; 
  let i = 0;

  function appendChunk() {
    if (token !== renderToken) return;
    const end = Math.min(i + chunkSize, rows.length);
    let html = "";

    for (; i < end; i++) {
      const r = rows[i];
      html += `<tr>
        <td class="subject">${escapeHtml(r.subject)}</td>
        <td class="count">${Number(r.count) || 0}</td>
      </tr>`;
    }

    tbody.insertAdjacentHTML("beforeend", html);

    if (i < rows.length) {
      setTimeout(() => requestAnimationFrame(appendChunk), 200);
    }
  }

  console.log("rows.length =", rows.length);
  requestAnimationFrame(appendChunk);

}

function compareRows(a, b, key, dir) {
  let cmp = 0;

  if (key === "count") {
    cmp = (Number(a.count) || 0) - (Number(b.count) || 0);
  } else if (key === "subject") {
    cmp = String(a.subject || "").localeCompare(String(b.subject || ""), undefined, {
      sensitivity: "base",
    });
  }

  return dir === "asc" ? cmp : -cmp;
}

function toggleSort(key) {
  if (sort.key === key) {
    sort.dir = sort.dir === "asc" ? "desc" : "asc";
  } else {
    sort.key = key;
    sort.dir = key === "count" ? "desc" : "asc";
  }

  render();
}

function updateHeaderLabels() {
  const subjectBtn = document.getElementById("sort-subject");
  const countBtn = document.getElementById("sort-count");

  if (subjectBtn) {
    subjectBtn.textContent =
      "Subject" + (sort.key === "subject" ? (sort.dir === "asc" ? " ▲" : " ▼") : "");
  }

  if (countBtn) {
    countBtn.textContent =
      "Count" + (sort.key === "count" ? (sort.dir === "asc" ? " ▲" : " ▼") : "");
  }
}

function render() {
  const meta = document.getElementById("meta");
  const tbody = document.getElementById("rows");

  if (!meta || !tbody) return;

  if (!data) {
    meta.textContent = "Loading…";
    tbody.innerHTML = "";
    return;
  }

  meta.textContent = `Folder: ${data.folderName} • Scanned: ${data.scannedCount} • Duplicate groups: ${data.duplicateGroupCount}`;

  const rows = [...(data.rows || [])].sort((a, b) => compareRows(a, b, sort.key, sort.dir));

  updateHeaderLabels();

  renderToken++;
  const token = renderToken;
  renderRowsChunked(tbody, rows, 1, token);
}

async function init() {
  // cached results from background script
  data = await browser.runtime.sendMessage({ type: "get-last-scan-results" });

  // sort buttons
  const subjectBtn = document.getElementById("sort-subject");
  const countBtn = document.getElementById("sort-count");

  if (subjectBtn) subjectBtn.addEventListener("click", () => toggleSort("subject"));
  if (countBtn) countBtn.addEventListener("click", () => toggleSort("count"));

  render();

  // show shoelace UI dialog
  const dlg = document.querySelector("sl-dialog");
  if (dlg && typeof dlg.show === "function") {
    await dlg.show();
  }

  // close dialog box handling
  const closeBtn = document.getElementById("close");
  if (closeBtn) {
    closeBtn.addEventListener("click", async () => {
      if (dlg && typeof dlg.hide === "function") {
        await dlg.hide();
      }
      window.close();
    });
  }
}

init().catch((err) => {
  console.error(err);
  const meta = document.getElementById("meta");
  if (meta) meta.textContent = `Error: ${err?.message || err}`;
});