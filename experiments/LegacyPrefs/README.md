## Objective

Use this API to access Thunderbird's system preferences or to migrate your own preferences from the Thunderbird preference system to the local storage of your MailExtension.

## Usage

Add the [LegacyPrefs API](https://github.com/thunderbird/webext-support/tree/master/experiments/LegacyPrefs) to your add-on. Your `manifest.json` needs an entry like this:

```json
  "experiment_apis": {
    "LegacyPrefs": {
      "schema": "api/LegacyPrefs/schema.json",
      "parent": {
        "scopes": ["addon_parent"],
        "paths": [["LegacyPrefs"]],
        "script": "api/LegacyPrefs/implementation.js"
      }
    }
  },
```

## API Functions

This API provides the following functions:

### async getPref(aName, [aFallback])

Returns the value for the ``aName`` preference. If it is not defined or has no default value assigned, ``aFallback`` will be returned (which defaults to ``null``).

### async getUserPref(aName)

Returns the user defined value for the ``aName`` preference. This will ignore any defined default value and will only return an explicitly set value, which differs from the default. Otherwise it will return ``null``.

### clearUserPref(aName)

Clears the user defined value for preference ``aName``. Subsequent calls to ``getUserPref(aName)`` will return ``null``.

### async setPref(aName, aValue)

Set the ``aName`` preference to the given value. Will return false and log an error to the console, if the type of ``aValue`` does not match the type of the preference.

## API Events

This API provides the following events:

### onChanged.addListener(listener, branch)

Register a listener which is notified each time a value in the specified branch is changed. The listener returns the name and the new value of the changed preference.

Example:

```javascript
browser.LegacyPrefs.onChanged.addListener(async (name, value) => {
  console.log(`Changed value in "mailnews.": ${name} = ${value}`);
}, "mailnews.");
```

## Accessing local storage from inside an Experiment

Once the settings have been migrated, code which used to read them through `Services.prefs` cannot reach them anymore. If that code lives in an Experiment, the migration suddenly requires rewriting it to take its settings as parameters, or to receive them through some other channel.

The helper below is a way to avoid that work for now. It returns a Promise based `storage.local`, backed by the extension's own API surface, reading the very same values your background script sees:

```javascript
/**
 * Get a Promise based `storage.local` for use inside an Experiment.
 *
 * @param {BaseContext} context - the context passed into getAPI()
 * @returns {object} an object with get(), set(), remove() and clear()
 */
function getLocalStorage(context) {
  // An Experiment runs in the parent process, where the local storage only
  // exposes callMethodInParentProcess(). The familiar get/set/remove/clear
  // belong to the child process implementation.
  const storage = context.apiCan.findAPIPath("storage");
  const call = method => (...args) =>
    storage.local.callMethodInParentProcess(method, args);

  return {
    get: call("get"),
    set: call("set"),
    remove: call("remove"),
    clear: call("clear"),
  };
}
```

Copy it into your implementation file and hand it the `context` your `getAPI(context)` already receives. A setting which used to be read from a preference is then read like this:

```javascript
const localStorage = getLocalStorage(context);
const { debugLevel = 0 } = await localStorage.get("debugLevel");
```

Note that your add-on needs the `storage` permission, otherwise your background script cannot access those values.

Please consider this a temporary solution. An Experiment should be state-less and should get everything it needs from its caller, which keeps the settings in one place and makes the Experiment testable on its own. Reading the local storage directly ties it to a storage layout it does not own.
