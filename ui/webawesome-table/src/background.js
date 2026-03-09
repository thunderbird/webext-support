// background.js
console.log("RemoveDupes background loaded");

// Menu item
browser.menus.create({
  id: "log-duplicates",
  title: "Scan for dupes (show table)",
  contexts: ["folder_pane"],
});

// Disable menu item on parent items
browser.menus.onShown.addListener(async (info) => {
  if (!info.contexts || !info.contexts.includes("folder_pane")) return;

  const folder =
    (info.selectedFolders && info.selectedFolders[0]) || info.selectedFolder;

  const shouldDisable = !folder || folder.isRoot === true;

  await browser.menus.update("log-duplicates", {
    enabled: !shouldDisable,
    visible: true,
  });

  browser.menus.refresh();
});


async function getAllMessages(folder) {
  let results = await browser.messages.list(folder);
  const allMessages = [...results.messages];

  while (results.id) {
    results = await browser.messages.continueList(results.id);
    allMessages.push(...results.messages);
  }

  return allMessages;
}

// Async per entry processing
const ENTRY_CONCURRENCY = 8;

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await mapper(items[i], i);
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

function normalizeSubject(subject) {
  return String(subject || "(no subject)")
    .trim()
    .replace(/^(re|fw|fwd):\s*/i, "") 
    .toLowerCase();
}

async function getNormalizedSubjectAsync(message) {
  const hdr = await browser.messages.get(message.id);
  return normalizeSubject(hdr.subject);
}

// Cache for dialog window
let lastScanResults = null;
let scanInProgress = false;
let lastScanError = null;
let currentScanFolderName = null;

browser.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "get-last-scan-results") {
    return Promise.resolve(lastScanResults);
  }

  if (msg && msg.type === "get-scan-status") {
  return Promise.resolve({
    inProgress: scanInProgress,
    hasResults: !!lastScanResults,
    error: lastScanError,
    folderName: currentScanFolderName,
  });
}

  return false;
});

// Menu option 
browser.menus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== "log-duplicates") return;

  const folder =
    (info.selectedFolders && info.selectedFolders[0]) || info.selectedFolder;

  if (!folder) return;
  currentScanFolderName = folder.name; 

  // reset scan state
  scanInProgress = true;
  lastScanResults = null;
  lastScanError = null;

  // open popup window immediately
  await browser.windows.create({
    url: browser.runtime.getURL("dialog.html"),
    type: "popup",
    width: 900,
    height: 650,
  });

  try {
    console.log("Scanning folder:", folder.name);

    const allMessages = await getAllMessages(folder);

  // Asynchronous entry processing
  const subjects = await mapWithConcurrency(
    allMessages,
    ENTRY_CONCURRENCY,
    async (message) => {
      try {
        return await getNormalizedSubjectAsync(message);
      } catch (e) {
        console.warn("Failed to process message", message.id, e);
        return "(error)";
      }
    }
  );

  // Subject counts
  const subjectCounts = {};
  for (const subject of subjects) {
    if (subject === "(error)") continue;
    subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
  }

  // Convert to rows with only dupes
  const rows = Object.entries(subjectCounts)
    .filter(([, count]) => count > 1)
    .map(([subject, count]) => ({ subject, count }))
    .sort((a, b) => b.count - a.count);

  // Cache results for the dialog.js popup
    lastScanResults = {
      folderName: folder.name,
      scannedCount: allMessages.length,
      duplicateGroupCount: rows.length,
      rows,
    };
  } catch (err) {
    console.error("Scan failed:", err);
    lastScanError = String(err);
  } finally {
    scanInProgress = false;
    currentScanFolderName = null;
  }
});