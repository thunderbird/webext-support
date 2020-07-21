# Using the WindowListener API

## Part 1

In this first part we are still using Thunderbird 68 while updating the add-on. 

### chrome.manifest

First we need to check the content of chrome.manifest. The following entries may remain for now:

* content
* locale
* overlay
* style

Entries like `category`, `interfaces`, `component` and `contract` have to go. The [update guide](https://developer.thunderbird.net/add-ons/updating/tb78#replacing-chrome-manifest) contains information on how to get rid of these. The following entries should be replaced by `content` entries:

* skin
* resource

Make sure your add-on is still working after this first step in Thunderbird 68.

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

For each `style` or `overlay` entry add a call to `registerWindow()` to your `background.js` (example is taken from the QuickFolders add-on):

```
messenger.WindowListener.registerWindow(
    "chrome://messenger/content/messenger.xul", 
    "chrome://quickfolders/content/scripts/messenger.js");
```

Each window (or better URL) may be only registered once and for each window only one JavaScript file may be registered. If you had multiple overlays and/or styles for the same window, you have to trigger those things from that single JavaScript file now (will be explained below).

So instead of overlaying, this will register a JavaScript file, which will be loaded into the given windows and it will be executed in the old "legacy" privileged scope. The WindowListener API expects that these JavaScript files define the functions `onLoad()` and `onUnload()` and calls these when the window is opened (or the add-on is activated while the window is already open) and while the window is closed (or while the add-on is deactivated, while the window is open).

A complex but useful example for a JavaScript file injected into `messenger.xul` (again taken from QuickFolders add-on):

```
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

// this is a polyfill for the old build-in pref function
function pref(aName, aDefault) {
  let defaults = Services.prefs.getDefaultBranch("");
  switch (typeof aDefault) {
    case "string":
        return defaults.setCharPref(aName, aDefault);

    case "number":
        return defaults.setIntPref(aName, aDefault);
    
    case "boolean":
        return defaults.setBoolPref(aName, aDefault);
      
    default:
      throw new Error("Preference <" + aName + "> has an unsupported type <" + typeof aDefault + ">. Allowed are string, number and boolean.");
  }
}

// called on open window or on add-on activation while window is open
function onLoad(window, wasAlreadyOpen) {
    // make window and document available in this "sandbox"
    this.window = window;
    this.document = window.document;

    // load old pref default file, you may have to move it into your content folder
    Services.scriptloader.loadSubScript("chrome://quickfolders/content/defaults/quickfoldersDefaults.js", this, "UTF-8");
    
    // Load all JS directly (formally done via script tags in the overlay file)
    Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders.js", this, "UTF-8");
    
    // append to MailToolbarPalette
    let toolbarpalette = window.MozXULElement.parseXULToFragment(`
        <toolbarbutton id="QuickFolders-skipfolder"
            class="qfElement toolbarbutton-1 chromeclass-toolbar-additional"
            label="&quickfolders.toolbar.skip;" 
            tooltiptext="&qf.tooltip.skipUnreadFolder;" 
            oncommand="window.QF.QuickFolders.Interface.onSkipFolder(null);"
        />
`, 
    ["chrome://quickfolders/locale/overlay.dtd"]);
    // Add the parsed fragment to the UI.
    window.document.getElementById("MailToolbarPalette").appendChild(toolbarpalette);


    // add CSS
    let styles = window.MozXULElement.parseXULToFragment(`	
    <html:link class="qfElement" rel="stylesheet" href="chrome://quickfolders/content/style.css"/>);
    // Add the parsed fragment to the UI.
    window.document.documentElement.appendChild(styles);
}

function onUnload(window, isAddOnShutDown) {
    // Remove all our added elements which we tagged with a UNIQUE classname
    let elements = Array.from(window.document.getElementsByClassName("qfElement"));
    console.log(elements);
    for (let element of elements) {
        element.remove();
    }
}
```

As this file is loaded into `messenger.xul`, we can do a few startup operations, like loading our default prefs. It includes a `pref()` function which does basically what the old internal function was doing. It is used by loading the old defaults file.

In the `onLoad()` function we load all other needed JavaScript files and inject the old XUL content. We need to chunk that up into pieces and manually add it to the document using the built-in `window.MozXULElement.parseXULToFragment()` function. Its first parameter is the XUL string, the second parameter is an array of DTD locale files, which should be used when parsing the XUL string.

To load CSS files, add a `<html:link rel="stylesheet" href="...">` element to `window.document.documentElement`.

You should either keep track of the ids of added elements or attach a unique class to all added elements, as you must clean up after yourself now: You have to remove all added elements when `onUnload()` is called.