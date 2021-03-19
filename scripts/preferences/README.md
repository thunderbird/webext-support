## Objective

This script delegates preference handling to the WebExtension background
page, so it is independent of the used preference storage backend.

This script provides an automated preference load/save support as formaly
provided by the preferencesBindings.js script.

This file is intended to be used in WebExtension HTML pages (popups,
options, content, windows) as well as in WindowListener legacy scripts. The
script communicates with the WebExtension background page either via
runtime messaging (if run in WebExtension pages) or via WindowListener
notifyTools.js (if run in legacy scripts).

The script provides 3 main preference functions:
* setPref(aName, aValue)
* getPref(aName, a Fallback)
* clearPref(aName)

This script also provides an initCache() function which can be called during page load to setup
a local preference cache. The 3 main preference functions will then work synchronously with this
local cache instead of making asynchronous calls to the WebExtention background page.
 
The automated preference load/save support is enabled by calling the load(window)
function during page load.
 
## Usage

This script provides the following public methods:

### async preferences.initCache();

This function will asynchronously requests all preferences from the WebExtension background
page to set up a local cache. It also sets up a listener to be notified by the background
page, after a preference has been changed elsewhere so it can update its local cache.
After the cache has been set up, the 3 main preference functions access the local cache
synchronously.


### preferences.getPref(aName, [aFallback]);

Gets the value for preference `aName`. Returns either a Promise for a value received
from the WebExtension background page or a direct value from the local cache - see initCache().

If no user value and also no default value has been defined, the fallback value will be
returned (or `null`).


### preferences.setPref(aName, aValue);

Sends an update request for the preference `aName` to the WebExtension background page and
updates the local cache (if used). 

### preferences.clearPref(aName);

Sends a request to delete the user value for the preference `aName` to the WebExtension
background page and updates the local cache (if used). Subsequent calls to `getPref` will return
the default value. 

### async preferences.load(window);

This will search the given `window` for elements with a `preference` attribute (containing the name of a preference) and will load the appropriate values. Any user changes to these elements values will instantly update the linked preferences. This behaviour can be changed by adding the `instantApply` attribute to the element and setting it to `false`. 

If a linked preference is modified elsewhere, the element's value in the given window will be automatically updated to new new value.

**Note:** _Also supported is the `delayprefsave` attribute, which causes to defer the preference updates by 1s. This requires to add the `alarms` permission to the `manifest.json` file._

### preferences.saves();

This will search the `window` provided by a previous call to `preferences.loadPreferences` for elements with a `preference` attribute (containing the name of a preference) and will update those preferences with the current values of the linked elements.
