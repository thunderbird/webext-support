# VFS-Toolkit

The `vfs-toolkit` lets WebExtensions work with files without having to care *where* those files actually are. The user decides that, by choosing the storage backend that suits their needs.

The core of `vfs-toolkit` is its client API, built around the [Origin Private File System](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system) (`OPFS`). On top of that, it adds two major capabilities the native Mozilla implementation does not provide:

- **File picker UI** - Mozilla has no native file picker for `OPFS`, but `vfs-toolkit` ships one.
- **Extensible storage backends** - through its provider API add-ons can supply support for alternative storage backends.

The following storage backends are currently available:

- **OPFS** (built-in) - virtual files stored within the browser profile
- **Local Filesystem** - real files on disk, accessed via Native Messaging, no Experiments required ([Local Home Folder Access Provider](https://github.com/jobisoft/Local-Home-Folder-Access-Provider))

We will see more storage backends being made available, soon, for example **Nextcloud** and **Seafile**.

<p align="center">
  <img src="https://raw.githubusercontent.com/thunderbird/webext-support/refs/heads/master/modules/vfs-toolkit/vfs-toolkit-filepicker.png" alt="VFS Toolkit File Picker" width="600"><br>
  <em>Example of a VFS Toolkit file picker using the "Local Home Folder Access" provider.</em>
</p>

## Client API

The client API offers multiple read/write methods to access files stored in the WebExtension’s `OPFS`. Since the storage is bound to the WebExtension origin, each add-on automatically receives its own isolated virtual file system.

Unlike the native `OPFS` API, `vfs-toolkit` does not expose file access through [FileSystemFileHandle](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle). Instead, it uses standard file paths for all read and write operations. This path-based design is familiar to developers and enables support for extensible storage backends.

## Provider API: Extensible Storage Backends

While `vfs-toolkit` includes built-in support for the `OPFS` storage backend, it is designed to support additional storage providers.

Through its provider API, third-party extensions can implement storage providers that integrate with `vfs-toolkit` through a standardized communication mechanism.

In practice, this allows WebExtensions using `vfs-toolkit` to access files stored outside the local `OPFS`, for example on cloud storage services such as Dropbox, Google Drive, or WebDAV-based systems.
