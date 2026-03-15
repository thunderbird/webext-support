# VFS-Toolkit

`vfs-toolkit` provides a virtual file system toolkit for WebExtensions.

The core component of `vfs-toolkit` is its client API, an ES module wrapper around the [Origin Private File System](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system) (`OPFS`). The API is designed for WebExtensions and provides easy-to-use file picker UI components.

These pickers fill an important gap: Firefox currently does not implement any native file picker UI for `OPFS`.

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
