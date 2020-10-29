## Introduction

With TB78 a few Thunderbird toolbar-menu-buttons have been reduced to toolbar-buttons. Add-ons had the freedom to change the UI in the past but messing with these buttons will probably lead to broken Thunderbird UI if multiple add-ons are doing it. So it may be beneficial to publish a common mechanism for MailExtension Experiments to add menuitems to these toolbar-buttons and automatically upgrade them to toolbar-menu-buttons. The provided methods will also downgrade the toolbar-menu-button back to a toolbar-button, if all menuitems have been removed.

As this is messing with custom elements, please be aware that it can break at any time. I urge you to think about different ways to give your users the same choices. One option is to use a browser_action popup or a compose_action popup which provides the different options. This implementation would even require the same number of mouse clicks.

## Usage

### hackToolbarbutton.addMenuitem(window, buttonId, menuitemId, attributes);

Adds a menuitem to the button identified by the ID `buttonId`. If the button is not yet a menu-button it will be converted beforehand.
The ID of the new menuitem will be set to the provided `menuitemId` and all attributes provided in the `attributes` object will be set as well.

```
hackToolbarbutton.addMenuitem(
  window,
  "button-newmsg",
  "my-custom-menuitem1",
  {
    label: "testbutton1",
    value: "testvalue1"
  });
```

The function will return the popup element (!) to which the menuitems have been added. This allows to add custom event handlers like `popupshowing`.

### hackToolbarbutton.removeMenuitem(window, buttonId, menuitemId);

Removes the menuitem with the given ID of `menuitemId` from the button. If this was the last menuitem, the menu-button will be converted back to a normal button.

```
hackToolbarbutton.removeMenuitem(
  window,
  "button-newmsg",
  "my-custom-menuitem1");
```

