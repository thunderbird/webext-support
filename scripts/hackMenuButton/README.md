## Introduction

With TB78 a few Thunderbird toolbar buttons which formaly have been menu buttons have been reduced to simple buttons. Add-ons had the freedom to change the UI in the past but messing with these buttons will probably lead to broken Thunderbird UI if multiple add-ons are doing it. So I think it is beneficial to publish a common mechanism for MailExtension Experiments to add menuitems to these buttons and automatically upgrade them to menu buttons. The provided methods will also downgrade the button back to a simple button, if all menuitems have been removed.

## Usage

### hackMenuButton.addMenuitem(window, buttonId, menuitemId, attributes);

Adds a menuitem to the button identified by the ID `buttonId`. If the button is not yet a menu-button it will be converted beforehand.
The ID of the new menuitem will be set to the provided `menuitemId` and all attributes provided in the `attributes` object will be set as well.

```
hackMenuButton.addMenuitem(
  window,
  "button-newmsg",
  "my-custom-menuitem1",
  {
    label: "testbutton1",
    value: "testvalue1"
  });
```

The function will return the popup element (!) to which the menuitems have been added. This allows to add custom event handlers like `popupshowing`.

### hackMenuButton.removeMenuitem(window, buttonId, menuitemId);

Removes the menuitem with the given ID of `menuitemId` fro the button. If this was the last menuitem, the menu-button will be converted back to a normal button.

```
hackMenuButton.removeMenuitem(
  window,
  "button-newmsg",
  "my-custom-menuitem1");
```

