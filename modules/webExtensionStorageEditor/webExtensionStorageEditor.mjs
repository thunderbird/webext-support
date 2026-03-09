/**
 * A simple storage editor, either opened in a new tab or popup, displaying all
 * entries in the specified storage area. Boolean values can be toggled inline,
 * other values can be edited with save/cancel controls.
 * 
 * This file acts both as the module loaded by the consumer (for example a background
 * page) and as the script loaded by the editor popup (query param `viewer=1`).
 * 
 * Usage example:
 *
 * ```js
 * import * as webExtensionStorageEditor from './modules/webExtensionStorageEditor.mjs';
 * webExtensionStorageEditor.open({
 *     storageArea: 'local',
 *     baseFilter: 'myKeyPrefix',
 *     type: 'popup',
 * });
 * ```
 */

/**
 * Open a storage editor showing entries in a browser.storage area.
 * 
 * @param {Object} [options] Options for opening the viewer.
 * @param {'local'|'sync'|'session'} [options.storageArea='local'] - storage area to inspect.
 * @param {'tab'|'popup'} [options.type='tab'] - open as a tab or popup window.
 * @param {string} [options.baseFilter=''] - optional base filter string, limiting the shown entries
 * @param {string} [options.footerText] - optional footer text to display in the viewer,
 *    when omitted a sensible default is used.
 * @returns {Promise<void>} Resolves after the tab or popup has been created.
 */
export async function open(options = {}) {
  const storageArea = options?.storageArea || "local";
  const type = options?.type || "tab";
  const baseFilter = options?.baseFilter || "";
  const footerText = options?.footerText || "Click ✎ to edit values. Press ✓ to save or ESC to cancel. Boolean values can be toggled.";

  // small helper to avoid injecting raw HTML from callers
  const escapeHtml = (s) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const safeFooter = escapeHtml(footerText);

  // use the same module file as the page script (?viewer=1)
  const moduleUrlWithParams = `${import.meta.url}?viewer=1&storageArea=${encodeURIComponent(storageArea)}&baseFilter=${encodeURIComponent(baseFilter)}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Storage Viewer</title>
<style>
    body {
        font-family: system-ui, sans-serif;
        font-size: 13px;
        margin: 0;
        padding: 0;
        background: #f9f9fb;
        color: #222;
    }
    header,
        footer {
        padding: 6px 10px;
        background: #eee;
    }
    header {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    input.filter {
        flex: 1;
        padding: 2px 4px;
        font-family: monospace;
    }
    button {
        cursor: pointer;
        padding: 2px 6px;
        font-size: 13px;
    }
    table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 6px;
    }
    th,
    td {
        padding: 6px 8px;
        border-bottom: 1px solid #ddd;
        vertical-align: top;
    }
    th {
        background: #f0f0f0;
        position: sticky;
        top: 0;
        text-align: left;
    }
    tr:hover {
        background: #f5f5ff;
    }
    .key {
        font-family: monospace;
    }
    .type {
        font-family: monospace;
        width: 8em;
        text-align: left;
    }
    .controls {
        text-align: right;
        white-space: nowrap;
    }
    .editBtn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 14px;
        line-height: 1;
    }
    .row-editing {
        background: #e8f0fe !important;
    }
    .error {
        color: red;
        font-size: 11px;
    }
    textarea,
    input {
        width: 100%;
        font-family: monospace;
        box-sizing: border-box;
    }
</style>
</head>
<body>
<header>
  <input class="filter" placeholder="Filter keys..." value="">
</header>

<table>
  <thead><tr><th>Key</th><th>Type</th><th>Value</th><th></th></tr></thead>
  <tbody id="entries"></tbody>
</table>

<footer>
<p>${safeFooter}</p>
</footer>

<!-- load this same module as the page script; it will detect viewer=1 and run the UI code -->
<script type="module" src="${moduleUrlWithParams}"></script>
</body>
</html>
`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  if (type === "popup") {
    await browser.windows.create({ url, type: "popup", width: 800, height: 500 });
  } else {
    await browser.tabs.create({ url });
  }

  // revoke the blob url after a short delay to avoid leaking object URLs
  setTimeout(() => URL.revokeObjectURL(url), 15_000);
}

function init() {
  const params = new URL(import.meta.url).searchParams;
  const storageArea = params.get('storageArea') || 'local';
  const baseFilter = params.get('baseFilter') || '';
  let userFilter = (document.querySelector('.filter') && document.querySelector('.filter').value) ? document.querySelector('.filter').value.trim() : '';

  const storage = browser.storage[storageArea];
  const tbody = document.getElementById("entries");

  function getType(v) {
    if (v !== null && typeof v === "object") {
      return "object";
    }
    if (v === true || v === false) {
      return "boolean";
    }
    if (typeof v === "number") {
      return "number";
    }
    return "string";
  }
  function formatDisplayValue(v) {
    return getType(v) === "object" ? JSON.stringify(v) : String(v);
  }
  function formatEditorValue(v) {
    return getType(v) === "object" ? JSON.stringify(v, null, 2) : String(v);
  }
  function getRowId(key, value) {
    return `${key}.${getType(value)}`;
  }

  async function loadEntries() {
    const all = await storage.get(null);
    const visibleKeys = [];

    function createRow(key, value) {
      const tr = document.createElement("tr");
      const tdKey = document.createElement("td");
      const tdType = document.createElement("td");
      const tdVal = document.createElement("td");
      const tdCtrl = document.createElement("td");
      const displayValue = formatDisplayValue(value);
      const editorValue = formatEditorValue(value);

      tdKey.className = "key";
      tdType.className = "type";
      tdCtrl.className = "controls";
      tdKey.textContent = key;
      tdType.textContent = getType(value);

      const displayArea = document.createElement("div");
      displayArea.className = "displayArea";
      displayArea.textContent = displayValue;

      const editArea = document.createElement("div");
      editArea.className = "editArea";
      editArea.style.display = "none";

      const rowType = getType(value);
      let editorEl;
      if (rowType === "object") {
        editorEl = document.createElement("textarea");
        editorEl.rows = 5;
      } else {
        editorEl = document.createElement("input");
        editorEl.type = "text";
      }
      // force editor content to the last saved value
      editorEl.value = editorValue;
      editArea.appendChild(editorEl);

      const errorBox = document.createElement("div");
      errorBox.className = "error";

      const editBtn = document.createElement("button");
      editBtn.className = "editBtn";

      tdVal.append(displayArea, editArea, errorBox);
      tdCtrl.appendChild(editBtn);
      tr.append(tdKey, tdType, tdVal, tdCtrl);

      // store current value in data attributes for change detection
      tr.dataset.displayValue = displayValue;
      tr.dataset.editorValue = editorValue;

      tr.tabIndex = 0;

      const rowId = getRowId(key, value);
      tr.dataset.rowId = rowId;
      tbody.appendChild(tr);
      attachEditHandler(tr, key, rowType);
    }

    for (const [key, value] of Object.entries(all)) {
      if (!(key.includes(baseFilter) && key.includes(userFilter))) {
        continue
      }

      const rowId = getRowId(key, value);
      visibleKeys.push(rowId);

      const displayValue = formatDisplayValue(value);
      const editorValue = formatEditorValue(value);
      const tr = document.querySelector(`tr[data-row-id="${rowId}"]`);
      if (tr) {
        if (tr.dataset.displayValue !== displayValue) {
          tr.dataset.displayValue = displayValue;
          tr.dataset.editorValue = editorValue;

          const displayArea = tr.querySelector(".displayArea");
          if (displayArea) displayArea.textContent = displayValue;
          const editArea = tr.querySelector(".editArea");
          const editorEl = editArea.querySelector("textarea, input");
          editorEl.value = editorValue;
        }
        tbody.appendChild(tr);
      } else {
        createRow(key, value);
      }
    }

    // remove any rows that are no longer present / visible
    const visibleRows = Array.from(document.querySelectorAll('tr[data-row-id]'));
    for (const visibleRow of visibleRows) {
      const existingKey = visibleRow.dataset.rowId;
      if (!visibleKeys.includes(existingKey)) {
        visibleRow.remove();
      }
    }
  }

  function attachEditHandler(tr, key, type) {
    const editBtn = tr.querySelector(".editBtn");
    const displayArea = tr.querySelector(".displayArea");
    const editArea = tr.querySelector(".editArea");
    const errorBox = tr.querySelector(".error");

    async function setValue(keyInner, newValue) {
      await storage.set({ [keyInner]: newValue });
      const displayValue = formatDisplayValue(newValue);
      const editorValue = formatEditorValue(newValue);
      displayArea.textContent = displayValue;
      tr.dataset.displayValue = displayValue;
      tr.dataset.editorValue = editorValue;
    }

    const editorEl = editArea.querySelector("textarea, input");

    if (type === "boolean") {
      editBtn.textContent = "⇄";
      editBtn.title = "Toggle";
      editBtn.addEventListener('click', async () => {
        errorBox.style.display = "none";
        try {
          await setValue(key, tr.dataset.displayValue === "true" ? false : true);
          tr.classList.add('row-editing');
          setTimeout(() => tr.classList.remove('row-editing'), 300);
        } catch (err) {
          errorBox.textContent = "Toggle failed: " + err;
          errorBox.style.display = "";
        }
      });
      return;
    }

    editBtn.textContent = "✎";
    editBtn.title = "Edit";

    tr.addEventListener('keydown', (ev) => {
      if (ev.key === "Escape" && tr.classList.contains("row-editing")) {
        cancelEdit();
      }
    });

    editorEl.addEventListener('keydown', (ev) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        cancelEdit();
        return;
      }

      // object types are edited as multiline, Enter cannot be used to save
      if (type !== "object" && ev.key === "Enter") {
        ev.preventDefault();
        saveEdit();
        return
      }

      // use Ctrl/Cmd+S for object save instead
      if (type == "object" && (ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') {
        ev.preventDefault();
        saveEdit();
        return;
      }
    });

    editBtn.addEventListener('click', () => {
      if (!tr.classList.contains('row-editing')) {
        enterEdit();
      } else {
        saveEdit();
      }
    });

    function enterEdit() {
      tr.classList.add('row-editing');
      editorEl.value = tr.dataset.editorValue;
      displayArea.style.display = "none";
      editArea.style.display = "";
      errorBox.style.display = "none";
      editBtn.textContent = "✓";
      editorEl.focus();
      //try { editorEl.select(); } catch (e) { }
    }

    function cancelEdit() {
      tr.classList.remove('row-editing');
      displayArea.style.display = "";
      editArea.style.display = "none";
      errorBox.style.display = "none";
      editBtn.textContent = "✎";
    }

    async function saveEdit() {
      try {
        let newVal;
        if (type === "object") {
          newVal = JSON.parse(editorEl.value);
        } else if (type === "number") {
          newVal = Number(editorEl.value);
          if (!Number.isFinite(newVal)) throw new Error("Value is not a number");
        } else {
          newVal = editorEl.value;
        }
        await setValue(key, newVal);
        cancelEdit();
      } catch (err) {
        errorBox.textContent = "Save failed: " + err;
        errorBox.style.display = "";
      }
    }
  }

  const filterInput = document.querySelector(".filter");
  filterInput.addEventListener("input", (e) => {
    userFilter = e.target.value.trim();
    loadEntries();
  });

  // auto-refresh when storage changes in the same area and affected keys match current filters
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== storageArea) return;
    const changedKeys = Object.keys(changes || {});
    if (changedKeys.some(k => k.includes(baseFilter) && k.includes(userFilter))) {
      loadEntries();
    }
  });

  loadEntries();
}

/**
 * If the module is loaded as a page module with ?viewer=1, execute the viewer init code.
 */
const moduleParams = new URL(import.meta.url).searchParams;
if (moduleParams.has('viewer')) {
  init();
}
