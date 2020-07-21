async function main() {
 /* 
  * The registerBootstrapScript() function used below can use relative URLs from
  * the root of the extensions folder structure to specify the location of the
  * JavaScript files. Internally these URLs will be automatically converted to
  * file://* URLs.
  *
  * If you need to specify additional paths inside the registered script, you can
  * generate the needed file://* URL via the extensions object available to your
  * script:
  *
  *	  this.extension.rootURI.resolve(relativePath)
  *
  * If these file://* URLs do not work (e.g. with new ChromeWorker()), register a 
  * chrome://* URL and use that. The registerBootstrapScript() function used below
  * can also be used with chrome://* URLs.
  */
  await messenger.LegacyBootstrap.registerChromeUrl([
   // Array of array-entries with the same "syntax" and number of elements as used
   // in the former chrome.manifest, like "content" and "locale" entries.
   ["content", "addon_name", "content/"]
  ]);
 
  await messenger.LegacyBootstrap.registerBootstrapScript("content/scripts/bootstrap.js");  
}

main();
