## Objective

Use this API to add CSS files to Thunderbird windows. Before using this, please check out if the built-in theme_experiments API is already providing the needed flexibility.

## Usage

In order to inject a CSS file into a window, wait for its `onWindowOpened` event and use the `inject` method. The `inject` method can also be used to inject into already open windows (it will not do anything, if the window is not open).

A background script could look like the following:

```
// Define all CSS files for core windows.
let files = {
	"chrome://messenger/content/activity.xhtml": "style.css"
}

// Inject CSS into all open windows during add-on start (if any).
for (let [url, file] of Object.entries(files) ) {
	messenger.LegacyCSS.inject(url, file);
}

// Listen for opened windows and inject CSS.
messenger.LegacyCSS.onWindowOpened.addListener((url) => {
	console.log(url);	
	if (files.hasOwnProperty(url)) {
		messenger.LegacyCSS.inject(url, files[url]);
	}
});

```

