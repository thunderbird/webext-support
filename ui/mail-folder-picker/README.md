## Objective

Extensions sometimes need to ask the user to select or pick a mail folder. The mail-folder-picker custom element aims to be the default UI element add-on developers can use for this purpose.

This folder contains an example extension, which creates a new tab and loads a page displaying the mail-folder-picker custom element, after it has been installed / reloaded. The implementation of the custom element is in `/ui/mail-folder-picker/modules/mail-folder-picker.mjs`.

<p align="center">
  <img src="https://github.com/user-attachments/assets/36a411e4-b188-4808-ba11-01b43fa1e6bc">
</p>

**Note:** This is still in a very early development state.

## Running the code as a temporary add-on

This folder of the repository can be used directly as a "temporary add-on", to either try out the current implementation or actively develop the mail-folder-picker custom element. Follow these steps to run the code as a temporary add-on:

1. Clone this repository ([zip-file](https://github.com/thunderbird/webext-support/archive/refs/heads/master.zip), [git-link](https://github.com/thunderbird/webext-support.git)).
2. Open Thunderbird.
3. Open the Add-on Manager within Thunderbird.
4. Click on the gear icon of the Add-on Manager and select "Debug Add-ons".
5. In the new "Debugging" tab click on the "Load Temporary Add-on..." button.
6. In the file picker select the `manifest.json` file in the `/ui/mail-folder-picker/` folder of the cloned repository.

Once the add-on has been loaded, it will create a new tab and load a page displaying the mail-folder-picker custom element.

**Development workflow:** Closing the tab with the example page will return to the "Debugging" tab, which now has an entry for the `Mail Folder Picker Example` add-on. Clicking on its `Reload` button, will reload the add-on and re-open the example page using the most recent implementation of the mail-folder-picker custom element.

<p align="center">
  <img src="https://github.com/user-attachments/assets/9a3964bc-5666-4b99-b548-5c45ca77794d">
</p>

## Usage in your own add-on

### HTML

The HTML page needs to include a core stylesheet for the color definitions:

```
<link rel="stylesheet" href="chrome://global/skin/design-system/tokens-shared.css" />
```

The custom element is added to the HTML page as follows:

```
<div style="border:1px solid grey; padding:2em; margin: 2em; width:450px">
  <mail-folder-picker id="mail_folder_picker" aria-placeholder="Select a folder ..." />
</div>
```

### JavaScript

The custom element needs to be registered through JavaScript:

```
import { registerMailFolderPicker } from "../modules/mail-folder-picker.mjs";

async function init() {
    registerMailFolderPicker();
}

window.addEventListener('load', init);
```

