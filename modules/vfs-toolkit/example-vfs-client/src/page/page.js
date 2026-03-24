import * as vfs from "/vendor/vfs-client/vfs-client.mjs";

async function logEntries(entries) {
  console.log(entries);
  if (!entries || entries.length == 0) {
    console.log("[VFS] No file selected.");
    return;
  }
  for (let entry of entries) {
    console.log("[VFS] Selected path:", entry.path);
    if (entry.kind == "file") {
      const file = await vfs.readFile(entry);
      const text = await file.text();
      console.log("[VFS] File contents:", text);
    }
  }
}

const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>My DOM File</title>
    </head>
    <body>
      <h1>Hello from File()</h1>
    </body>
    </html>
    `;
// Create file with filename
const savefile = new File(
  [htmlContent], // file content
  "test-page.html", // filename
  { type: "text/html" } // MIME type
);

document.addEventListener("DOMContentLoaded", () => {

  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[href]");
    if (link?.href.startsWith("https://addons.thunderbird.net/")) {
      e.preventDefault();
      browser.tabs.create({ url: link.href });
    }
  });

  document.getElementById("show-openFile-picker").addEventListener("click", async () => {
    const entries = await vfs.showSelectFilePicker({
      multiple: true,
      id: "Example",
      opfsStorageName: "Example Storage",
      excludeAcceptAllOption: false,
      types: [
        {
          description: "Images",
          accept: { "image/*": [".png", ".jpg"] }
        }
      ]
    });
    await logEntries(entries);
  });

  document.getElementById("show-saveFile-picker").addEventListener("click", async () => {
    const result = await vfs.showSaveFilePicker({
      id: "Example",
      opfsStorageName: "Example Storage",
      suggestedName: "test-page.html"
    });
    console.log({ result });
    if (result) {
      await vfs.writeFile(result, savefile);
      const entry = await vfs.readFile(result);
      await logEntries([entry]);
    }
  });

  document.getElementById("show-directory-picker").addEventListener("click", async () => {
    const entry = await vfs.showDirectoryPicker({
      multiple: true,
      id: "Example",
      opfsStorageName: "Example Storage",
      types: [
        {
          description: "Images",
          accept: { "image/*": [".png", ".jpg"] }
        }
      ]
    });
    await logEntries([entry]);
  });

  vfs.onStorageChanged.addListener(entries => {
    console.log(entries);
    for (const { kind, action, target, source } of entries) {
      const loc = target.storageRef ? `provider ${target.storageRef.providerId}` : 'OPFS';
      const src = source ? ` (from ${source.path})` : '';
      console.log(`storage changed: ${action} ${kind} ${target.path}${src} on ${loc}`);
    }
  });

});
