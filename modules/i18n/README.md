## About

JavaScript module for string localization in HTML WebExtension pages, such as option pages or browser action pages.  
Import the `i18n` object from the `i18n.mjs` module file and execute its `localizeDocument()` function on page load.

## Usage

The recommended approach is to use `data-i18n-*` attributes to localize visible text and attribute values, such as span content, document titles or input placeholders, ensuring that localization keys are never exposed to users.

Supported attributes are:

* `data-i18n-content`: Sets the `textContent` of the element to the localized string of the specified key or escaped key (`__MSG_*__`). This works for any element, including the document's `title` element.  
* `data-i18n-{attribute}`: Sets the named HTML attribute to the localized string of the specified key or escaped key (`__MSG_*__`). For example, `data-i18n-placeholder` sets an input's `placeholder` attribute.

## Examples

The following examples assume this localization `messages.json` file:

```JSON
{
  "extensionName": { "message": "My Extension" },
  "goodDay" : { "message": "Have a good day!" },
  "textPrompt": { "message": "Enter some text" }
}
```

To localize a document, load a JavaScript file via the following:

```HTML
<head>
  <meta charset="utf-8" />
  <script type="module" src="popup.js" type="application/javascript"></script>
</head>
```

The example JavaScript file `popup.js` should include the following:

```JavaScript
import * as i18n from "./i18n.mjs";
i18n.localizeDocument();
```

The markup of the document needs to include references to the localization keys, as shown in the following.

### Using data-i18n-* attributes

```HTML
<html>
<head>
  <title data-i18n-content="extensionName"></title>
</head>
<body>
  <div data-i18n-content="goodDay"></div>
  <input type="text" data-i18n-placeholder="textPrompt" />
</body>
</html>
```

### Using escaped keys in data-i18n-* attributes

```HTML
<html>
<head>
  <title data-i18n-content="__MSG_extensionName__"></title>
</head>
<body>
  <div data-i18n-content="__MSG_goodDay__"></div>
  <input type="text" data-i18n-placeholder="__MSG_textPrompt__" />
</body>
</html>
```

### Using escaped keys anywhere in the document's markup

```HTML
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

Note: Placing localization keys directly in the content may cause them to appear briefly before being replaced once the document loads.

## Implementation Notes

The `localizeDocument()` function performs three types of replacements:

* `data-i18n-content` — replaces element text content.  
* `data-i18n-{attr}` — replaces element attributes.  
* `__MSG_*__` placeholders — replaces inline text or attribute values containing escaped localization keys.  

The `localizeDocument()` function supports optional parameters:

* `options.extension` — an optional extension object (used for Thunderbird experiments).  
* `options.keyPrefix` — overrides the default key prefix __MSG___.  
* `sourceDocument` — an optional document object to localize instead of the current page.  

## Security Considerations

Only safe attributes (e.g., `title`, `alt`, `placeholder`) are intended for localization. Avoid using i18n substitutions for event handler or URL-bearing attributes such as `onclick`, `srcdoc`, `href`, or `src` unless explicitly verified as safe.
