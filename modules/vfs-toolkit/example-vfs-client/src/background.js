import * as vfs from "./vendor/vfs-client/vfs-client.mjs";

vfs.init({
  enableExternalProviders: true,
  configStorageKey: "vfs-toolkit-config-data"
});

vfs.parseManifest({
  vfs_action: {
    default_label: "Run Tests",
    default_title: "Open the VFS test suite",
    default_icon: browser.runtime.getURL("icons/run-tests.svg"),
  }
});

vfs.action.onClicked.addListener((storageRef) => {
  const url = '/test/test.html' + (storageRef ? '?storageRef=' + encodeURIComponent(JSON.stringify(storageRef)) : '');
  browser.tabs.create({ url });
});

browser.tabs.create({ url: "/page/page.html" });