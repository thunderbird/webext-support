async function main() {
  await messenger.LegacyBootstrap.registerChromeUrl([
   ["content", "addon_name", "content/"]
  ]);
 
  await messenger.LegacyBootstrap.registerBootstrapScript("bootstrap.js");
}

main();
