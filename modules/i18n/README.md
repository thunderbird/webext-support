## About

JavaScript module to replace `__MSG_*__` i18n locale string in HTML WebExtension pages, like option pages or browser action pages. Import the `i18n.mjs` module file and run its `localizeDocument()` function on page load:

```
import * as i18n from "i18n.mjs"

document.addEventListener('DOMContentLoaded', () => {
  i18n.localizeDocument();
}, { once: true });
```