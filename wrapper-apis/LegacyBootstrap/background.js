async function main() {
  await messenger.BootstrapLoader.registerChromeUrl([
   ["content", "addon_name", "content/"]
  ]);
 
  await messenger.BootstrapLoader.registerBootstrapScript("bootstrap.js");
}

main();
