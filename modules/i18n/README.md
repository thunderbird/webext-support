## About

JavaScript module for string localization in HTML WebExtension pages, such as option pages or browser action pages. Import the `i18n` object from the `i18n.mjs` module file and execute its `updateDocument()` function on page load.

## Usage

Historically, escaped localization keys of the form `__MSG_*__` inserted in the document markup (or as attribute values in certain cases) have been used for localized string substitutions.  The downside of this approach is that the escaped keys may be momentarily displayed prior to substitution once the document has loaded.

In order to prevent this, an alternative is suggested through the use of the `data-i18n-textContent` attribute in conjunction with `i18n.mjs`.  The value of this attribute corresponds to an escaped or unescaped localization key.

The attribute-based substitution approach is generalized so that other element properties/attributes resulting in visible text (such as document title or textbox placholder) can be localized using `data-i18n-*` patterned attributes (`data-i18n-text`, `data-i18n-placeholder`).

This version of the `i18n` module is backwards-compatible with the original approach.

main.js
```javascript
import { i18n } from "i18n.mjs"

document.addEventListener('DOMContentLoaded', () => {
  i18n.updateDocument();
}, { once: true });
```

## Examples

Sample English-language localization file:

_locales/en/messages.json
```json
{
  "extensionName": { "message": "My Extension" },
  "goodDay" : { "message": "Have a good day!" },
  "textPrompt": { "message": "Enter some text" }
}
```

Using the `data-i18n-*` attribute approach:

main.html 
```html
<html>
<head>
  <title data-i18n-text="extensionName"></title>
</head>
<body>

  <!-- using unescaped keys -->
  <div data-i18n-textContent="goodDay"></div>
  <input type="text" data-i18n-placeholder="textPrompt" />

  <!-- using escaped keys -->
  <div data-i18n-textContent="__MSG_goodDay__"></div>
  <input type="text" data-i18n-placeholder="__MSG_textPrompt__" />

</body>
</html>
```

Using the legacy approach:

main.html 
```html
<html>
<head>
  <title>__MSG_extensionName__</title>
</head>
<body>

  <div>__MSG_goodDay__</div>
  <input placeholder="__MSG_textPrompt__" />

</body>
</html>
```