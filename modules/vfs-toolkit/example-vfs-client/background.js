import * as vfs from "./vendor/vfs-client/vfs-client.mjs";

await vfs.enableSupportExternalProviders({ 
  configStorageKey: "vfs-toolkit-config-data"
});


browser.tabs.create({ url: "/page/page.html" });