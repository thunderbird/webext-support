/**
 * Opens a Storage Viewer for the given browser.storage area.
 *
 * This function creates a full-featured storage viewer in a new tab or popup,
 * displaying all entries in the specified storage area. Boolean values can be
 * toggled inline, other values can be edited in a textarea with save/cancel controls.
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
 *    you must configure your `manifest.json` CSP accordingly. For example:
 *
 *    ```json
 *    "content_security_policy": "script-src 'self' 'sha256-pSeZqbIND286+J0FQz+c0m4YoKTRwH/II6GyU3ZM6As=';"
 *    ```
 *
 *    The SHA256 hash corresponds to the inline module script in the blob.
 *
 * 3. The function supports an optional filter string. If provided, the filter
 *    input field will be **readonly** and only matching keys will be displayed.
 *
 * @param {Object} [options] - Configuration options.
 * @param {'local'|'sync'|'session'} [options.storageArea='local'] - The storage area to display.
 * @param {'tab'|'popup'} [options.type='tab'] - How to open the viewer.
 * @param {string} [options.filter=''] - Optional key filter. Read-only if provided.
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
  <button id="refreshBtn">🔄 Refresh</button>
  <input class="filter" placeholder="Filter keys..." value="${filter}" ${filter ? 'readonly' : ''}>
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

async function loadEntries() {
  const all = await storage.get(null);
  const tbody = document.getElementById("entries");
  tbody.innerHTML = "";

  for (const [key,value] of Object.entries(all)) {
    if (!key.includes(currentFilter)) continue;
    const tr = document.createElement("tr");
    const tdKey = document.createElement("td");
    const tdVal = document.createElement("td");
    const tdCtrl = document.createElement("td");

    tdKey.className = "key";
    tdCtrl.className = "controls";
    tdKey.textContent = key;

    const displayArea = document.createElement("div");
    displayArea.className = "displayArea";
    displayArea.textContent = typeof value==="object"?JSON.stringify(value):String(value);

    const editArea = document.createElement("div");
    editArea.className="editArea";
    editArea.style.display="none";

    const errorBox = document.createElement("div");
    errorBox.className="error";

    const editBtn = document.createElement("button");
    editBtn.className="editBtn";

    tdVal.append(displayArea,editArea,errorBox);
    tdCtrl.appendChild(editBtn);
    tr.append(tdKey,tdVal,tdCtrl);
    tbody.appendChild(tr);

    attachEditHandler(tr,key,value);
  }
}

function attachEditHandler(tr,key,value){
  const editBtn = tr.querySelector(".editBtn");
  const displayArea = tr.querySelector(".displayArea");
  const editArea = tr.querySelector(".editArea");
  const errorBox = tr.querySelector(".error");

  const isBoolean = value===true||value===false;
  if(isBoolean){
    editBtn.textContent="⇄";
    editBtn.title="Toggle";
    editBtn.addEventListener('click',async()=>{
      try{
        const newVal = !value;
        await storage.set({[key]:newVal});
        displayArea.textContent=newVal?"true":"false";
        tr.classList.add('row-editing');
        setTimeout(()=>tr.classList.remove('row-editing'),300);
        value=newVal;
      }catch(err){
        errorBox.textContent="Toggle failed: "+err;
        errorBox.style.display="";
      }
    });
    return;
  }

  editBtn.textContent="✎";
  editBtn.title="Edit";

  editBtn.addEventListener('click',()=>{if(!tr.classList.contains('row-editing')) enterEdit(); else saveEdit();});
  tr.addEventListener('keydown',ev=>{if(ev.key==="Escape" && tr.classList.contains("row-editing")) exitEdit(true);});
  editArea.addEventListener('keydown',ev=>{if(ev.key==="Escape") exitEdit(true); if(ev.key==="Enter") saveEdit();});

  function enterEdit(){
    tr.classList.add('row-editing');
    const raw = typeof value==="object"?JSON.stringify(value,null,2):String(value);
    const ta = document.createElement("textarea");
    ta.value=raw;
    editArea.innerHTML="";
    editArea.appendChild(ta);
    displayArea.style.display="none";
    editArea.style.display="";
    errorBox.style.display="none";
    editBtn.textContent="✓";
  }

  function exitEdit(cancel=false){
    tr.classList.remove('row-editing');
    displayArea.style.display="";
    editArea.style.display="none";
    errorBox.style.display="none";
    editBtn.textContent="✎";
  }

  async function saveEdit(){
    try{
      const ta = editArea.querySelector("textarea");
      const newText = ta.value;
      let newVal;
      try{newVal=JSON.parse(newText);}catch{newVal=newText;}
      await storage.set({[key]:newVal});
      value=newVal;
      displayArea.textContent=typeof newVal==="object"?JSON.stringify(newVal):String(newVal);
      exitEdit();
    }catch(err){
      errorBox.textContent="Save failed: "+err;
      errorBox.style.display="";
    }
  }
}

document.querySelector(".filter").addEventListener("input",(e)=>{
  currentFilter=e.target.value.trim();
  loadEntries();
});
document.getElementById("refreshBtn").addEventListener("click",loadEntries);

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
