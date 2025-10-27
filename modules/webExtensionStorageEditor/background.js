import * as webExtensionStorageEditor from './modules/webExtensionStorageEditor.mjs'
browser.browserAction.onClicked.addListener(async () => {
    webExtensionStorageEditor.open({type:"popup"});
});
