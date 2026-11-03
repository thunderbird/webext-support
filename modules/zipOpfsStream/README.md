## About

Read and write ZIP archives of any size without loading them into memory. A 9 GB archive can be created
and read with only a fraction of that amount of RAM.

* **Writing:** every entry is streamed through the native `CompressionStream` into a temporary file in the
  Origin Private File System (OPFS). Only the entry currently being written is held in memory.
* **Reading:** only the central directory (the list of entries) is read when an archive is opened. Each entry
  is then sliced out of the `File` and inflated on demand, so the archive itself is never loaded.

A mail export or import of several GB no longer needs several GB of RAM.

The writer runs on the calling thread and writes with `createWritable()`, so it needs no worker and no
extra file.

## Usage

```javascript
import { ZipWriter, openZip } from "zipOpfsStream.mjs"

// Write.
const zip = new ZipWriter();
try {
    for await (const message of messages) {
        const raw = await messenger.messages.getRaw(message.id, { data_format: "File" });
        await zip.addFile(`export/${message.id}.eml`, raw);   // a File is a Blob and is streamed
    }
    const file = await zip.finish();                          // a File, backed by the OPFS
    const id = await messenger.downloads.download({
        url: URL.createObjectURL(file),
        filename: "export.zip",
        saveAs: true,
    });
    // Remove the temporary file after the download has finished.
    messenger.downloads.onChanged.addListener(async function listener(delta) {
        if (delta.id == id && delta.state && delta.state.current != "in_progress") {
            messenger.downloads.onChanged.removeListener(listener);
            await zip.dispose();
        }
    });
} catch (ex) {
    await zip.dispose();
    throw ex;
}

// Read, one entry at a time.
const archive = await openZip(fileFromInputElement);
for (const entry of archive.entries) {
    if (entry.isDirectory) continue;
    const text = await entry.text();   // or entry.blob(), entry.bytes(), entry.stream()
}
```

To use the module in a background script, load it as a module (`"background": { "scripts": ["background.js"], "type": "module" }`)
and add `"unlimitedStorage"` to the permissions.

## Memory use

Measured in Thunderbird 159 on Linux with mails of 200 KB each. Memory use of the whole Thunderbird process
tree stays flat, no matter how big the archive is:

| Mail data | ZIP size | Memory while writing | Time to write | Time to read every entry back |
|---|---|---|---|---|
| 3 GB | 2.6 GB | 410 MB before, 614 MB peak | 129 s | 49 s |
| 6 GB | 5.3 GB | 468 MB before, 627 MB peak | 256 s | 101 s |
| 9 GB | 7.9 GB | 459 MB before, 621 MB peak | 388 s | 164 s |

"Read back" opens the finished archive with `openZip()` and reads and verifies every entry.

## API

### `new ZipWriter(options)`

Creates a ZIP archive in a temporary file in the OPFS, one entry at a time. Await every call before
making the next one.

| Method | Description |
|---|---|
| `addFile(path, data, options)` | Adds a file. `data` can be a `string`, `Blob`, `ArrayBuffer` or typed array. A `Blob` is streamed and never loaded as a whole. Options: `compress` (default `true`), `lastModified` (`Date`). |
| `addDirectory(path, options)` | Adds a directory entry. |
| `finish()` | Writes the central directory and returns the archive as a `File`, which is backed by the temporary file in the OPFS. |
| `dispose()` | Removes the temporary file. Safe to call more than once and before `finish()`. Call it when the archive has been downloaded, or when the export failed. |

Constructor option `createParentDirectories` (default `true`) adds directory entries for the parent
folders of every entry, as most ZIP tools do.

### `openZip(blob, options)`

Opens an archive **without loading it into memory**. Only the central directory is read, every entry is
sliced out of the `Blob` and inflated when it is requested. Pass a `File` which is backed by a file on
disk (picked by the user with `<input type="file">`, or taken from the OPFS), and archives far larger
than the available RAM can be read. Options: `onProgress(fraction)` while the central directory is read,
`verify` (default `true`) to check size and CRC32 of every entry.

Returns `{ entries }`. Each entry has `name`, `isDirectory`, `size`, `compressedSize`, `crc32`,
`lastModified` and the async methods `stream()`, `blob()`, `bytes()` and `text()`.

### `isSupported()` and `removeStaleTempFiles()`

`isSupported()` checks that the required APIs exist. `removeStaleTempFiles()` removes temporary files
which a crashed session left behind, call it once when the add-on starts.

## Limits

* Archives are always written as ZIP64 (readable by current versions of all common tools, but so far only checked with Python's `zipfile` and Info-ZIP `unzip`).
* Compression is `deflate-raw` (via the native `CompressionStream`) or none. The reader supports the same two methods, no encryption.
* There is no native ZIP API in the browser, only the compression streams. The ZIP structure and the CRC32 are implemented in this module.
* The module needs permission to store a large amount of data: request the `unlimitedStorage` permission for big archives.
* File names which are not flagged as UTF-8 are read as Latin-1.
