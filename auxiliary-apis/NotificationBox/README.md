# Objective

The NotificationBox Experiment allows to show notifications inside of Thunderbird.

# Usage

Add the NotificationBox Experiment to your add-on. Your `manifest.json` needs an entry like this:

```
"experiment_apis": {
    "NotificationBox": {
      "schema": "NotificationBox/schema.json",
      "parent": {
        "scopes": [
          "addon_parent"
        ],
        "paths": [
          [
            "NotificationBox"
          ]
        ],
        "script": "NotificationBox/implementation.js"
      }
    }
  }
```

## Simple example

The `NotificationBox.create()` method supports multiple options, see the [schema definition](https://github.com/thunderbird/addon-developer-support/blob/master/auxiliary-apis/NotificationBox/NotificationBox/schema.json) of the `NotificationProperties` type for details:

```
  await messenger.NotificationBox.create({
    windowId: tab.windowId,
    tabId: tab.id,
    priority: 9,
    label: "Custom NOTIFICATION",
    icon: "icon.png",
    placement: "bottom",
    style: {
      "color": "blue",
      "font-weight": "bold",
      "font-style": "italic",
      "background-color": "green",
    },
    buttons: [
      {
        id: "button1",
        label: "Button 1"
      }
    ]
  });
```

