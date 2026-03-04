console.log("RemoveDupes background loaded");
// Menu Item
browser.menus.create({
  id: "log-duplicates",
  title: "Scan for dupes (show table)",
  contexts: ["folder_pane"]
});

// Disable menu item on parent/root items
browser.menus.onShown.addListener(async (info, tab) => {
  if (!info.contexts || !info.contexts.includes("folder_pane")) return;

  const folder = (info.selectedFolders && info.selectedFolders[0]) || info.selectedFolder;
  const shouldDisable = !folder || folder.isRoot === true;

  await browser.menus.update("log-duplicates", {
    enabled: !shouldDisable,
    visible: true
  });

  browser.menus.refresh();
});

// Message retrieval with pagination
async function getAllMessages(folder) {
  let results = await browser.messages.list(folder);
  let allMessages = [...results.messages];

  while (results.id) {
    results = await browser.messages.continueList(results.id);
    allMessages.push(...results.messages);
  }

  return allMessages;
}

// In-memory cache for dialog window 
let lastScanResults = null;

// Dialog window requests results through runtime messaging
browser.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "get-last-scan-results") {
    return Promise.resolve(lastScanResults);
  }
});

// Menu option click and scan
browser.menus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "log-duplicates") return;

  const folder = info.selectedFolder;
  console.log("Scanning folder:", folder.name);

  const allMessages = await getAllMessages(folder);
  console.log(`Total messages scanned: ${allMessages.length}`);

  // Subject counts 
  const subjectCounts = {};
  for (const message of allMessages) {
    const subject = message.subject || "(no subject)";
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
    rows
  };

  // Open popup window 
  await browser.windows.create({
    url: browser.runtime.getURL("dialog.html"),
    type: "popup",
    width: 900,
    height: 650
  });
});