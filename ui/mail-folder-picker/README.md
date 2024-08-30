## Objective

Extensions sometimes need to ask the user to select or pick a mail folder. The mail-folder-picker custom element aims to be the default UI element add-on developers can use for this purpose.

This folder contains an example extension, which displays the mail-folder-picker in its options page.

<p align="center">
  <img src="https://github.com/user-attachments/assets/2fad7f25-ed6e-407f-9ce6-620d7105f8e4">
</p>

**Note:** This is still in a very early development state.

## Usage

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
