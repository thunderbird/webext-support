## Objective

This script is a wrapper for your MailExtensions storage to set and get
your add-on preferences.

## Usage

This script provides the following public methods:

### async preferences.init([defaults]);

The main difference between the MailExtensions local storage and the
legacy `nsIPrefBranch`: the storage API to access the data works asynchronously.

This function will asynchronously load the current values from the storage
into a local object and sets up a listener for storage changes, which will
update the local object. The other public methods than access the local
object synchronously, which minimizes the required code changes.

This script also stores default values in the MailExtensions storage, so they
can be accessed wherever the actual values are accessed, without the need to
communicate with the background script to get the default values.

Use the optional `defaults` parameter to set the default values. You probably
want to do that once in your background script:

```
let defaultPrefs = {
  "counter": 0,
  "settingsFolder": "",
  "defaultImport": "",
  "menuCollapse": true,
  "toolbar": true,
  "popup": false,
  "keywordKey": "Tab",
  "shortcutModifier": "alt",
  "shortcutTypeAdv": false,
  "collapseState": ""
};

(async function(){
  await preferences.init(defaultPrefs);
})()

```
If the `defaults` parameter is not given, this function will pull the default values
from the local storage. Setting default values multiple times will propagate them
to all instances of this script as well.


### preferences.getPref(aName, [aFallback]);

Gets the value for preference `aName`. Returns the default value if no user value has been defined. If not even a default value has been set, the value of the optional parameter `aFallback`  is returned (or `null`).


### preferences.setPref(aName, aValue);

Updates the stored user value for preference `aName`. Subsequent calls to `getPref` will return the new value. The update is also propagated to the MailExtensions storage and all other instances of this script will get the new value as well. This script is not waiting for the MailExtensions storage to complete the change.


### preferences.clearPref(aName);

Clears the stored user value for preference `aName`. Subsequent calls to `getPref` will return the default value. The clearing is also propagated to the MailExtensions storage and all other instances of this script will clear the preference as well. This script is not waiting for the MailExtensions storage to complete the change.

### async preferences.loadPreferences(window);

This will search the given `window` for elements with a `preference` attribute (containing the name of a preference) and will load the appropriate values. Any user changes to these elements values will instantly update the linked preferences. This behaviour can be changed by adding the `instantApply` attribute to the element and setting it to `false`. Also supported is the `delayprefsave` attribute, which causes to defer the preference updates by 1s.

If a linked preference is modified elsewhere, the element's value in the given window will be automatically updated to new new value.

### preferences.savePreferences();

This will search the `window` provided by a previous call to `preferences.loadPreferences` for elements with a `preference` attribute (containing the name of a preference) and will update those preferences with the current values of the linked elements.
