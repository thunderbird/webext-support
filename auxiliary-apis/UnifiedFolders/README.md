## Objective

Use this API to interact with the unified folder mode. It is a very basic API to merely show how this can be done in Thunderbird Supernova.

## Example

This API is used in the "Start with Inbox" add-on: https://addons.thunderbird.net/addon/start-with-inbox/

## Usage

Add the [UnifiedFolders API](https://github.com/thundernest/addon-developer-support/tree/master/auxiliary-apis/UnifiedFolders) to your add-on. Your `manifest.json` needs an entry like this:

```
  "experiment_apis": {
    "UnifiedFolders": {
      "schema": "api/UnifiedFolders/schema.json",
      "parent": {
        "scopes": ["addon_parent"],
        "paths": [["UnifiedFolders"]],
        "script": "api/UnifiedFolders/implementation.js"
      }
    }
  },
```

A background script could look like the following:

```
if (browser.UnifiedFolders.enabled(mailTab.id)) {
  await browser.UnifiedFolders.selectInbox(mailTab.id, "first-unread");
}
```
