## Usage

### i18n.updateDocument([options]);

To replace i18n locale string in HTML WebExtension pages, like option pages or browser action pages, include the `i18n.js` script via an HTML `<script>` tag and execute `i18n.updateDocument()` in a `DOMContentLoaded` event listener. It will search the loaded document and replace all i18n locale strings (`__MSG_<message-name>__)` with their corresponding i18n message:

```
document.addEventListener('DOMContentLoaded', () => {
  i18n.updateDocument();
}, { once: true });
```

The optional `options` object can be used to override standard behavior:
* `keyPrefix` : Specifies the prefix for the i18n locale strings, defaults to `__MSG_`
