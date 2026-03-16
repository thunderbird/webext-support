# Example VFS Toolkit Storage Provider
An example provider add-on for WebExtensions using the VFS Toolkit, that allows WebExtensions to access a pseudo in-memmory-only storage, with a setup page and a config page.

## Build

Set the desired version in `package.json`, then run:

```
npm run build
```

This will:
- Copy the latest `vfs-provider` library into `src/vendor/vfs-provider/`
- Sync the version from `package.json` into `src/manifest.json`
- Create `dist/extension.xpi` — the installable add-on
