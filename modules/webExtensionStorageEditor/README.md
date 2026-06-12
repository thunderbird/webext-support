## About

A self-contained storage editor for WebExtensions, inspired by the `about:config` UI. It lets add-ons expose advanced options without requiring a custom interface. Developers can expose *all* storage entries or limit the view to a subset matching a provided filter.

Supports viewing and editing entries from `browser.storage.local`, `sync`, or `session` in either a `tab` or a `popup`.

<div align="center">
  <img width="839" height="590" alt="image" src="https://github.com/user-attachments/assets/e5daac53-6317-4fe8-9e56-6ab5b6fafd10" />
</div>

## Usage

Import the ES6 module and call `open()`:

```javascript
import * as webExtensionStorageEditor from './modules/webExtensionStorageEditor.mjs'

// Open a popup showing local storage, with an optional filter
webExtensionStorageEditor.open({
    storageArea: 'local',
    baseFilter: 'config.',
    type: 'popup',
});
```

The user can toggle boolean values directly by clicking the ⇄ button. This allows quick changes without entering the edit mode. Non-boolean values can be edited via the ✎ button, which opens an editable field containing the current value. The user can modify the content and then save the changes by clicking ✓, or cancel the edit by pressing the `ESC` key.

When a `baseFilter` is provided, only entries that match the given filter are displayed. This enables the developer to expose only a specific subset of keys. The user can apply an additional filter in the filter input element.

## Grouped settings

Settings do not have to be stored as flat top-level keys. An entry whose value is an object is automatically flattened into individual dotted leaf entries. For example, a single storage key `debug` holding

```json
{
    "something": true,
    "other": false
}
```

is displayed and edited as the two entries `debug.something` and `debug.other`, exactly as if they had been stored as flat dotted keys. Editing or toggling a leaf patches its parent object in place, leaving sibling entries untouched. Nested objects are flattened recursively; arrays and empty objects are kept as a single JSON-editable entry.

Any change made outside the editor (including to a grouped object) is reflected immediately, as the view re-renders on every `storage.onChanged` event for the inspected area.

## Examples

Open a tab showing all `sync` storage entries:

```javascript
webExtensionStorageEditor.open({ storageArea: 'sync', type: 'tab' });
```

Open a popup showing only keys from the `local` storage starting with `config.`:

```javascript
webExtensionStorageEditor.open({ storageArea: 'local', type: 'popup', baseFilter: 'config.' });
```
