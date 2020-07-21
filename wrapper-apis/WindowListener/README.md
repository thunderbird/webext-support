# Using the WindowListener API

## Part 1

In this first part we are still using Thunderbird 68 while updating the add-on. 

### chrome.manifest

First we need to check the content of chrome.manifest. The following entries may remain for now:

* content
* locale
* overlay
* style

Entries like category, interfaces, component and contract have to go. The [update guide](https://developer.thunderbird.net/add-ons/updating/tb78#replacing-chrome-manifest) contains information on how to get rid of these. The following entries should be replaced by `content` entries:

* skin
* resource

make sure your add-on is still working after this first step in Thunderbird 68.

### manifest.json

Copy the `api` folder from this repository into your add-on and define its location by adding an `experiment_apis` entry to your manifest:

```
  "experiment_apis": {
    "WindowListener": {
      "schema": "api/WindowListener/schema.json",
      "parent": {
        "scopes": [
          "addon_parent"
        ],
        "paths": [
          [
            "WindowListener"
          ]
        ],
        "script": "api/WindowListener/implementation.js"
      }
    }
  }
```

Add an empty `background.js` file to your add-on and define its location by adding a `background` entry to your manifest.

```
  "background": {
    "scripts": [
      "background.js"
    ]
  },
  ```
  
Remove the `legacy` entry from your manifest. Your `chrome.manifest` file is now ignored and your add-on is not doing anything anymore. 

### background.js

Register the `content` and `locale` entries from your `chrome.manifest` via a call to `registerChromeUrl()` in your background script (example is taken from the QuickFolders add-on):

```
messenger.WindowListener.registerChromeUrl([ 
  ["content", "quickfolders", "chrome/content/"],
  ["locale",   "quickfolders", "en-US",  "chrome/locale/en-US/"],
  ["locale",   "quickfolders", "ca",     "chrome/locale/ca/"],
  ["locale",   "quickfolders", "de",     "chrome/locale/de/"],
  ["locale",   "quickfolders", "es-MX",  "chrome/locale/es-MX/"],
  ["locale",   "quickfolders", "es",     "chrome/locale/es/"],
  ["locale",   "quickfolders", "fr",     "chrome/locale/fr/"],
  ["locale",   "quickfolders", "hu-HU",  "chrome/locale/hu-HU/"],
  ["locale",   "quickfolders", "it",     "chrome/locale/it/"],
  ["locale",   "quickfolders", "ja-JP",  "chrome/locale/ja-JP/"],
  ["locale",   "quickfolders", "nl",     "chrome/locale/nl/"],
  ["locale",   "quickfolders", "pl",     "chrome/locale/pl/"],
  ["locale",   "quickfolders", "pt-BR",  "chrome/locale/pt-BR/"],
  ["locale",   "quickfolders", "ru",     "chrome/locale/ru/"],
  ["locale",   "quickfolders", "sl-SI",  "chrome/locale/sl-SI/"],
  ["locale",   "quickfolders", "sr",     "chrome/locale/sr/"],
  ["locale",   "quickfolders", "sv-SE",  "chrome/locale/sv-SE/"],
  ["locale",   "quickfolders", "vi",     "chrome/locale/vi/"],
  ["locale",   "quickfolders", "zh-CN",  "chrome/locale/zh-CN/"],
  ["locale",   "quickfolders", "zh-CHS", "chrome/locale/zh-CN/"],
  ["locale",   "quickfolders", "zh",     "chrome/locale/zh/"],
  ["locale",   "quickfolders", "zh-CHT", "chrome/locale/zh/"],
  ["locale",   "quickfolders", "zh-TW",  "chrome/locale/zh/"]
]);
```

For each `style` or `overlay` entry add a call to `registerWindow()` to your `background.js` (example is taken from QuickFolders):

```
messenger.WindowListener.registerWindow(
	"chrome://messenger/content/messenger.xul", 
	"chrome://quickfolders/content/scripts/messenger.js");
```

Each window/URL may be only defined once and for each window only one JavaScript file may be registered. If you had multiple overlays and/or styles for the same window, you have to trigger those things from that single JavaScript file (we will get there soon).

So instead of overlaying, this will register a JavaScript file, which will be loaded into the given windows. The WindowListener API expects that these JavaScript files define the functions `onLoad()` and `onUnload()` and calls these when the window is opened (or the add-on is activated while the window is already open) and while the window is closed (or while the add-on is deactivated, while the window is open). An complex but useful example:

```

```