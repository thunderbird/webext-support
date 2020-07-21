var { myModule } = ChromeUtils.import(this.extension.rootURI.resolve("content/modules/myModule.jsm"));

myModule.incValue();
console.log("Shutdown script sees myModule value: " + myModule.getValue());

Cu.unload(this.extension.rootURI.resolve("content/modules/myModule.jsm"));
console.log("Shutdown script has finished");
