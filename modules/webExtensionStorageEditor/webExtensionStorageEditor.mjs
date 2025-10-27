/**
 * Opens a Storage Viewer for the given browser.storage area.
 *
 * This function creates a storage viewer in a new tab or popup, displaying all
 * entries in the specified storage area. Boolean values can be toggled inline,
 * other values can be edited in a textarea with save/cancel controls.
 * 
 * Usage example:
 * 
 * ```js
 * import * as webExtensionStorageEditor from './modules/webExtensionStorageEditor.mjs';
 * webExtensionStorageEditor.open({
 *     storageArea: 'local',   // 'local', 'sync', or 'session'
 *     type: 'popup',          // 'tab' or 'popup'
 *     filter: 'myKeyPrefix'   // optional filter string; field will be readonly if provided
 * });
 * ```
 *
 * Notes:
 * 1. This function relies on a **single HTML blob** created via a `Blob` and
 *    `URL.createObjectURL`. This approach allows the module to be self-contained
 *    without requiring separate HTML, CSS, or JS files.
 * 2. Because the blob contains a `<script type="module">` inline in the HTML,
 *    the CSP setting in the `manifest.json` needs to be configured accordingly.
 *    For example:
 *
 *    ```json
 *    "content_security_policy": "script-src 'self' 'sha256-AxVIrOAVi+Ub31l6kPlBGZ4S1R6XoMuO457P0vcAc7U=';"
 *    ```
 *
 *    The SHA256 hash corresponds to the inline module script in the blob.
 *
 * 3. The function supports an optional filter string. If provided, the filter
 *    input field will be hidden.
 *
 * @param {Object} [options] - Configuration options.
 * @param {'local'|'sync'|'session'} [options.storageArea='local'] - The storage area to display.
 * @param {'tab'|'popup'} [options.type='tab'] - How to open the viewer.
 * @param {string} [options.filter=''] - Optional key filter.
 * 
 * @returns {Promise<void>} Resolves when the tab or popup is created.
 */

export async function open(options = {}) {
    const storageArea = options?.storageArea || "local";
    const type = options?.type || "tab";
    const filter = options?.filter || "";

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
    input.filter[readonly] {
        background: #e0e0e0;
        /* light gray */
        cursor: not-allowed;
        color: #555;
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
        display: none;
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
  <input class="filter" placeholder="Filter keys..." value="${filter}" ${filter ? 'readonly style="display:none"' : ''}>
</header>

<table>
  <thead><tr><th>Key</th><th>Value</th><th></th></tr></thead>
  <tbody id="entries"></tbody>
</table>

<footer>
<p>Click ✎ to edit values. Press ✓ to save or ESC to cancel. Boolean values can be toggled directly.</p>
</footer>

<script type="module">
  const storage = browser.storage["${storageArea}"];
  let currentFilter = document.querySelector('.filter').value.trim();
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
    return getType(v) == "object" ? JSON.stringify(v) : String(v);
  }
  function formatEditorValue(v) {
    return getType(v) == "object" ? JSON.stringify(v, null, 2) : String(v);
  }    
  function getRowId(key,value) {
    return \`\${key}.\${getType(value)}\`;
  } 

  async function loadEntries() {
    const all = await storage.get(null);
    const visibleKeys = [];

    // helper to create a new row for a key/value
    function createRow(key, value) {
      const tr = document.createElement("tr");
      const tdKey = document.createElement("td");
      const tdVal = document.createElement("td");
      const tdCtrl = document.createElement("td");
      const displayValue = formatDisplayValue(value);
      const editorValue = formatEditorValue(value);

      tdKey.className = "key";
      tdCtrl.className = "controls";
      tdKey.textContent = key;

      // Element to display the cells content.
      const displayArea = document.createElement("div");
      displayArea.className = "displayArea";
      displayArea.textContent = displayValue;

      // Element to edit the cells content.
      const editArea = document.createElement("div");
      editArea.className = "editArea";
      editArea.style.display = "none";

      // choose an input for simple values, textarea for objects
      const rowType = getType(value);  
      let editorEl;
      if (rowType == "object") {
        editorEl = document.createElement("textarea");
        editorEl.size = 5;
      } else {
        editorEl = document.createElement("input");
        editorEl.type = "text"; // TODO: consider type="number" for numbers
      }

      editorEl.value = "";
      editArea.appendChild(editorEl);

      const errorBox = document.createElement("div");
      errorBox.className = "error";

      const editBtn = document.createElement("button");
      editBtn.className = "editBtn";

      tdVal.append(displayArea, editArea, errorBox);
      tdCtrl.appendChild(editBtn);
      tr.append(tdKey, tdVal, tdCtrl);

      // store current value in data attribute for change detection
      tr.dataset.displayValue = displayValue;
      tr.dataset.editorValue = editorValue;

      // ensure row is focusable to receive keyboard events
      tr.tabIndex = 0;

      const rowId = getRowId(key, value);
      tr.dataset.rowId = rowId;
      tbody.appendChild(tr);
      attachEditHandler(tr, key, rowType);
    }

    for (const [key, value] of Object.entries(all)) {
      if (!key.includes(currentFilter)) continue;

      const rowId = getRowId(key, value);
      visibleKeys.push(rowId);

      const displayValue = formatDisplayValue(value);
      const editorValue = formatEditorValue(value);
      const tr = document.querySelector(\`tr[data-row-id="\${rowId}"]\`);
      if (tr) {
        if (tr.dataset.displayValue !== displayValue) {
          // update existing row
          tr.dataset.displayValue = displayValue;
          tr.dataset.editorValue = editorValue

          const displayArea = tr.querySelector(".displayArea");
          displayArea.textContent = displayValue;
          const editArea = tr.querySelector(".editArea");
          const editorEl = editArea.querySelector("textarea, input");
          editorEl.value = "";
        }
        // appending again moves to end of tbody, keeping the actual sorting
        tbody.appendChild(tr);
      } else {
        // create new row
        createRow(key, value);
      }
    }

    // remove any rows that are no longer present / visible
    const visibleRows = Array.from(document.querySelectorAll(\`tr[data-row-id\`));
    for (const visibleRow of visibleRows) {
      const existingKey = visibleRow.dataset.rowId;
      if (!visibleKeys.includes(existingKey)) {
        visibleRow.remove();
      }
    }
  }

  function attachEditHandler(tr, key, type) {
    // obtain elements inside row
    let editBtn = tr.querySelector(".editBtn");
    const displayArea = tr.querySelector(".displayArea");
    const editArea = tr.querySelector(".editArea");
    const errorBox = tr.querySelector(".error");
    
    async function setValue(key, newValue) {
      await storage.set({ [key]: newValue });
      const displayValue = formatDisplayValue(newValue);
      const editorValue = formatEditorValue(newValue);
      displayArea.textContent = displayValue;
      tr.dataset.displayValue = displayValue;
      tr.dataset.editorValue = editorValue;
    }

    const editorEl = editArea.querySelector("textarea, input");

    // remove prior listeners by replacing the button node, then re-query the new node
    //const newBtn = editBtn.cloneNode(true);
    //editBtn.replaceWith(newBtn);
    //editBtn = tr.querySelector(".editBtn");

    // keyboard handling at row level (ESC to cancel)
    tr.onkeydown = (ev) => {
      if (ev.key === "Escape" && tr.classList.contains("row-editing")) {
        exitEdit(true);
      }
    };

    if (type == "boolean"){
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

    // non-boolean: editing flow
    editBtn.textContent = "✎";
    editBtn.title = "Edit";

    function enterEdit() {
      tr.classList.add('row-editing');
      // force last saved value into editor
      editorEl.value = tr.dataset.editorValue;
      displayArea.style.display = "none";
      editArea.style.display = "";
      errorBox.style.display = "none";
      editBtn.textContent = "✓";
      editorEl.focus();
      //try { editorEl.select(); } catch(e) {}

      // add keydown listener once
      if (!editorEl._hasKeydown) {
        editorEl.addEventListener('keydown', (ev) => {
          if (ev.key === "Escape") {
            ev.preventDefault();
            exitEdit(true);
          } else if (ev.key === "Enter") {
            ev.preventDefault();
            saveEdit();
          }
        });
        editorEl._hasKeydown = true;
      }
    }

    function exitEdit(cancel = false) {
      tr.classList.remove('row-editing');
      displayArea.style.display = "";
      editArea.style.display = "none";
      errorBox.style.display = "none";
      editBtn.textContent = "✎";
    }

    async function saveEdit() {
      try {
        // if this is an object, parse the value first
        let newVal = type == "object" ? JSON.parse(editorEl.value) : editorEl.value;
        await setValue(key, newVal);
        exitEdit();
      } catch (err) {
        errorBox.textContent = "Save failed: " + err;
        errorBox.style.display = "";
      }
    }

    editBtn.addEventListener('click', () => {
      if (!tr.classList.contains('row-editing')) {
        enterEdit();
      } else {
        saveEdit();
      }
    });
  }

  document.querySelector(".filter").addEventListener("input", (e) => {
    currentFilter = e.target.value.trim();
    loadEntries();
  });

  // auto-refresh when storage changes in the same area and affected keys match current filter
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "${storageArea}") return;
    const changedKeys = Object.keys(changes || {});
    // if filter is empty it matches all keys (includes('') === true)
    if (changedKeys.some(k => k.includes(currentFilter))) {
      loadEntries();
    }
  });

   loadEntries();
</script>
</body>
</html>
`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);

    if (type === "popup") {
        await browser.windows.create({ url, type: "popup", width: 700, height: 500 });
    } else {
        await browser.tabs.create({ url });
    }
}
