## Usage

### i18n.updateDocument([options]);

Calling this function, for example in a `DOMContentLoaded` event listener, will search the loaded document and replace all WebExtension locale strings (`__MSG_<message-name>*_)` with the corresponding i18n message.

The optional `options` object can be used to override standard behavior:
* `keyPrefix` : specifies the prefix for the WebExtension locale strings, defaults to `__MSG_`
* `getMessage`: specifies the function used to lookup i18n messages, defaults to `messener.i18n.getMessage`

Overriding the standard message-lookup-function is needed, if this script is used in a legacy context, as `messenger` is not defined there. Using one of our wrapper APIs gives access to the `extension` object in legacy context, which can be passed as a parameter into newly opened windows. That extension object provides access to `extension.localeData.localizeMessage`, which can be used to lookup i18n messages.

```
i18n.updateDocument({
  getMessage: extension.localeData.localizeMessage,
});
```

More details on using this script together with the WindowListener API or the BootstrapLoader API, can be found in the corresponding tutorial.