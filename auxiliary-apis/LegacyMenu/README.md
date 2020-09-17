## Objective

Use this API to add menu entries to the Thunderbird UI, as long as it is not yet possible with built-in APIs (like the menus API).

## Usage

In order to add a menu to a window, you first need to get the handle to that window. The most simple way is to request all open windows
and listen to newly opend windows and pass the received window handles to a method, which adds the menu entries (if needed). A background script could look like the following:

```
(async function() {
  const windows = await messenger.windows.getAll();
  for (let window of windows) {
    manipulateWindow(window);
  }

  messenger.windows.onCreated.addListener((window) => {
    manipulateWindow(window);
  });
})()

function manipulateWindow(window) {
    // Skip in case it is not the window we want to manipulate.
    // https://thunderbird-webextensions.readthedocs.io/en/latest/windows.html#windowtype
    // * normal
    // * popup
    // * panel
    // * app
    // * devtools
    // * addressBook
    // * messageCompose 
    // * messageDisplay
    
    if (`${window.type}` !== "normal") {
      return;
    }

    const id = `${window.id}`;
    messenger.LegacyMenu.add(id, {
      "id": "menu_TestItem",
      "type": "menu-label",
      "reference": "activityManager",
      "position": "before",
      "label": "Test2",
      "accesskey": "T"
    });    
}

```

The `position` property supports the following values:
* before
* after
* child

Depending on its value, the new menu entry will be inserted `before` or `after` the element identified by the id specified in the `reference` property.
If the position is set to `child`, the new menu entry will be appended to the reference element.