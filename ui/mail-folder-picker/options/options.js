
import { registerMailFolderPicker } from "../modules/mail-folder-picker.mjs";

async function init() {
    registerMailFolderPicker();
}

window.addEventListener('load', init);
