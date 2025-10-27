## About

A self-contained Storage Editor for WebExtensions, inspired by the `about:config` UI. It lets add-ons expose advanced options without requiring a custom interface. Developers can expose *all* storage entries or limit the view to a subset matching a provided filter.

Supports viewing and editing entries from `browser.storage.local`, `sync`, or `session` in either a `tab` or a `popup`.

## Usage

Import the ES6 module and call `open()`:

```javascript
import * as webExtensionStorageEditor from './modules/webExtensionStorageEditor.mjs'

// Open a popup showing local storage, with an optional filter
webExtensionStorageEditor.open({
    storageArea: 'local', // 'local', 'sync', or 'session'
    type: 'popup', // 'tab' or 'popup'
    filter: 'myKeyPrefix' // optional, readonly if provided
});
```

## Notes

The user can toggle boolean values directly by clicking the ⇄ button. This allows quick changes without entering an edit mode. Non-boolean values can be edited via the ✎ button, which opens a textarea containing the current value. The user can modify the content and then save the changes by clicking ✓, or cancel the edit by pressing the ESC key.

When a filter string is provided, the filter input field becomes read-only. Only entries that match the filter are displayed. This enables the developer to expose only a specific subset of keys.

## Content Security Policy

Because the module generates an inline blob containing a `<script type="module">`, the `manifest.json` needs a CSP allowing the specific SHA256 hash:

```json
"content_security_policy": "script-src 'self' 'sha256-pSeZqbIND286+J0FQz+c0m4YoKTRwH/II6GyU3ZM6As=';"
```

## Examples

Open a tab showing all `sync` storage entries:

```javascript
webExtensionStorageEditor.open({ storageArea: 'sync', type: 'tab' });
```

Open a popup showing only keys from the `local` storage starting with `config.`:

```javascript
webExtensionStorageEditor.open({ storageArea: 'local', type: 'popup', filter: 'config.' });
```