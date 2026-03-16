# Example VFS Toolkit Client
An example client add-on  using the VFS Toolkit. When enabled, it loads a page with buttons to open the different flavours of file pickers provided by the VFS Toolkit.

## Build

Set the desired version in `package.json`, then run:

```
npm run build
```

This will:
- Copy the latest `vfs-client` library into `src/vendor/vfs-client/`
- Sync the version from `package.json` into `src/manifest.json`
- Create `dist/extension.xpi` — the installable add-on
