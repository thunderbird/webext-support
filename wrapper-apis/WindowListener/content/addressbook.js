var { myModule } = ChromeUtils.import(this.extension.rootURI.resolve("content/modules/myModule.jsm"));

const restartTime = "now";

function restart(e) {
	let document = e.target.ownerDocument;
	let window = document.defaultView;
	window.alert("I (" + this.extension.id + ") should restart: " + restartTime);
}

function onLoad(window, wasAlreadyOpen) {	
	myModule.incValue();
	console.log("onLoad from the ADDRBOOK script has been called by <"+this.extension.id+">");
	console.log("onLoad() has been called for already open window: " + wasAlreadyOpen);
	console.log("onLoad() for: " + window.location.href);
	console.log("onLoad() sees myModule value : " + myModule.getValue());

	// create a UI element via JavaScript (copied from Geoffs restart example)
	let myItem = window.document.createXULElement("menuitem");
	myItem.id = "myRestartEntry";
	myItem.setAttribute("label", this.extension.localeData.localizeMessage("restartLabel"));
	myItem.setAttribute("accesskey", "R");
	myItem.addEventListener("command", restart.bind(this));
	
	// add the new UI element
	let refItem = window.document.getElementById("menu_close");
	refItem.parentNode.insertBefore(myItem, refItem);
}

function onUnload(window, isAddOnShutDown) {
	myModule.incValue();
	console.log("onUnload() from the ADDRBOOK script has been called by <"+this.extension.id+">");
	console.log("onUnload() has been called because of global add-on shutdown: " + isAddOnShutDown);
	console.log("onUnload() for: " + window.location.href);
	console.log("onUnload() sees myModule value : " + myModule.getValue());
	
	// remove any added elements
	let me = window.document.getElementById("myRestartEntry");
	me.remove();	
}
