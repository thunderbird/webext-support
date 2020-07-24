var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

function startup(data, reason) {
  console.log("startup");  
  console.log(data);
  console.log(reason);
}

function shutdown(data, reason) {
  console.log("shutdown");  
  console.log(data);
  console.log(reason);
}
