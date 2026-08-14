# FileSystem Experiment (removed)

> [!IMPORTANT]
> **This Experiment API has been removed. Use the [VFS Toolkit](https://github.com/thunderbird/webext-support/tree/master/modules/vfs-toolkit) instead.**

The `FileSystem` Experiment was an interim solution which gave add-ons read/write
access to a single folder inside the user's profile folder. That approach is obsolete.

## Use the VFS Toolkit instead

The [VFS Toolkit](https://github.com/thunderbird/webext-support/tree/master/modules/vfs-toolkit)
is part of this repository and is the recommended way for add-ons to read and write
user files. It is a plain JavaScript module - **no Experiment API needed**.

The core idea is the **Virtual File System (VFS)** concept: your add-on works with plain
absolute paths and never has to care *where* the files actually live. **The user decides
that**, by installing and configuring the storage provider that suits their needs - which
may well be their local home folder, if they choose to install that provider.

Storage backends currently available to the user:

| Storage backend | Description |
| --------------- | ----------- |
| [OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system) | Built into the VFS Toolkit. A virtual file system stored inside the user's profile, isolated per add-on. This is the closest equivalent to what the `FileSystem` Experiment used to provide. |
| [Local Home Folder](https://addons.thunderbird.net/addon/vfs-home-folder-access/) | Access files in the user's **local home folder** (via Native Messaging). |
| [WebDAV](https://addons.thunderbird.net/addon/vfs-provider-webdav/) | Access files directly on a WebDAV server, for example Nextcloud or ownCloud. |
| [OneDrive](https://addons.thunderbird.net/addon/vfs-provider-onedrive/) | Access files stored in the user's Microsoft OneDrive account. |

More providers (for example Nextcloud and Seafile) are on the way, and third parties can
add their own through the
[Provider API](https://github.com/thunderbird/webext-support/tree/master/modules/vfs-toolkit/vfs-provider).
Your add-on does not need to be changed to support any of them.

On top of that, the VFS Toolkit ships a **file picker UI**, something Mozilla does not
provide for `OPFS`.

## Examples

Vendor the
[`vfs-client`](https://github.com/thunderbird/webext-support/tree/master/modules/vfs-toolkit/vfs-client)
module into your add-on and import it:

```js
import * as vfs from '/vendor/vfs-toolkit/vfs-client/vfs-client.mjs';

// once, in your background script
vfs.init({
  enableExternalProviders: true,
  configStorageKey: "vfs-toolkit-config-data",
});
```

Reading and writing a file:

```js
const file = await vfs.readFile({ path: "/notes.txt" });
const text = await file.text();

await vfs.writeFile(
  { path: "/notes.txt" },
  new Blob([text], { type: "text/plain" }),
  { overwrite: true }
);
```

Omitting `storageRef` (as above) targets the built-in `OPFS` backend. To let the user pick
a location on *any* of their configured storages, use one of the pickers:

```js
const [entry] = await vfs.showSelectFilePicker();
if (entry) {
  const file = await vfs.readFile(entry);
}
```

## Documentation and examples

* [VFS Toolkit overview](https://github.com/thunderbird/webext-support/tree/master/modules/vfs-toolkit)
* [Client API reference](https://github.com/thunderbird/webext-support/tree/master/modules/vfs-toolkit/vfs-client) - all read/write/copy/move/delete methods, pickers, events and types
* [Provider API reference](https://github.com/thunderbird/webext-support/tree/master/modules/vfs-toolkit/vfs-provider) - for implementing your own storage backend
* [Example client add-on](https://github.com/thunderbird/webext-support/tree/master/modules/vfs-toolkit/example-vfs-client)
* [Example provider add-on](https://github.com/thunderbird/webext-support/tree/master/modules/vfs-toolkit/example-vfs-provider)
