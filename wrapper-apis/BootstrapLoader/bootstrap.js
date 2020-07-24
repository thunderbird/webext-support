var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

console.log(extension);
console.log(addon.id);
console.log(addon.version);
console.log(messenger);


function startup(data, reason) {
  console.log("startup");  
  if (reason == APP_STARTUP) {
      console.log("APP_STARTUP")
  } else if (reason == ADDON_ENABLE) {
      console.log("ADDON_ENABLE")
  } else {
    console.log(reason);
  }  
}

function shutdown(data, reason) {
  console.log("shutdown");  
  if (reason == APP_SHUTDOWN) {
      console.log("APP_SHUTDOWN")
  } else if (reason == ADDON_DISABLE) {
      console.log("ADDON_DISABLE")
  } else {
    console.log(reason);
  }  
}
