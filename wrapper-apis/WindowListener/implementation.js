// Import some things we need. 
var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var WindowListener = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {

    // track if this is the background/main context
    this.isBackgroundContext = (context.viewType == "background");
    if (this.isBackgroundContext) {
      context.callOnClose(this);      
    }

    this.registeredWindows = {};
    this.pathToShutdownScript = null;
    this.pathToOptionsPage = null;
    this.chromeHandle = null;
    this.openWindows = [];

    const aomStartup = Cc["@mozilla.org/addons/addon-manager-startup;1"].getService(Ci.amIAddonManagerStartup);

    let self = this;

    return {
      WindowListener: {
        
        registerOptionsPage(optionsUrl) {
          self.pathToOptionsPage = optionsUrl.startsWith("chrome://") 
            ? optionsUrl 
            : context.extension.rootURI.resolve(optionsUrl);
        },
        
        registerDefaultPrefs(defaultUrl) {
          let url = context.extension.rootURI.resolve(defaultUrl);
          let prefsObj = {};
          prefsObj.Services = ChromeUtils.import("resource://gre/modules/Services.jsm").Services;
          prefsObj.pref = function(aName, aDefault) {
            let defaults = Services.prefs.getDefaultBranch("");
            switch (typeof aDefault) {
              case "string":
                  return defaults.setCharPref(aName, aDefault);

              case "number":
                  return defaults.setIntPref(aName, aDefault);
              
              case "boolean":
                  return defaults.setBoolPref(aName, aDefault);
                
              default:
                throw new Error("Preference <" + aName + "> has an unsupported type <" + typeof aDefault + ">. Allowed are string, number and boolean.");            
            }
          }          
          Services.scriptloader.loadSubScript(url, prefsObj, "UTF-8");
        },
        
        registerChromeUrl(chromeData) {
          if (!self.isBackgroundContext) 
            throw new Error("The WindowListener API may only be called from the background page.");

          const manifestURI = Services.io.newURI(
            "manifest.json",
            null,
            context.extension.rootURI
          );
          self.chromeHandle = aomStartup.registerChrome(manifestURI, chromeData);          
        },

        registerWindow(windowHref, jsFile) {
          if (!self.isBackgroundContext) 
            throw new Error("The WindowListener API may only be called from the background page.");

          if (!self.registeredWindows.hasOwnProperty(windowHref)) {
            // path to JS file can either be chrome:// URL or a relative URL
            let path = jsFile.startsWith("chrome://") 
              ? jsFile 
              : context.extension.rootURI.resolve(jsFile)
            self.registeredWindows[windowHref] = path;
          } else {
            console.error("Window <" +windowHref + "> has already been registered");
          }
        },

        registerShutdownScript(aPath) {
          if (!self.isBackgroundContext) 
            throw new Error("The WindowListener API may only be called from the background page.");

          self.pathToShutdownScript = aPath.startsWith("chrome://") 
            ? aPath
            : context.extension.rootURI.resolve(aPath);
        },
        
        startListening() {
          if (!self.isBackgroundContext) 
            throw new Error("The WindowListener API may only be called from the background page.");

          let urls = Object.keys(self.registeredWindows);
          if (urls.length > 0) {
            // Before registering the window listener, check which windows are already open
            self.openWindows = [];
            for (let window of Services.wm.getEnumerator(null)) {
              self.openWindows.push(window);
            }
            
            
            // Register window listener for all pre-registered windows
            ExtensionSupport.registerWindowListener("injectListener", {
              // React on all windows, and manually reduce to registered windows,
              // so we can also inject the revived add-on-options menu if the messenger
              // window is opened.
              //chromeURLs: Object.keys(self.registeredWindows),
              onLoadWindow(window) {
                // inject add-on-options menu if it is messenger
                if (
                  self.pathToOptionsPage && 
                  (window.location.href == "chrome://messenger/content/messenger.xul" ||
                  window.location.href == "chrome://messenger/content/messenger.xhtml")) {
                  
                  // add the add-on options menu if needed
                  if (!window.document.getElementById("addonsManager_prefs_revived")) {
                    let addonprefs = window.MozXULElement.parseXULToFragment(`
    <menu id="addonsManager_prefs_revived" label="&addonPrefs.label;">
      <menupopup id="addonPrefs_revived">
      </menupopup>
    </menu>                    
  `, 
    ["chrome://messenger/locale/messenger.dtd"]);
                  let addonsManagerNode = window.document.getElementById("addonsManager");
                  addonsManagerNode.parentNode.insertBefore(addonprefs, addonsManagerNode.nextSibling);	
                  }
                  
                  // add the options entry
                  let addonPrefs_revived = window.document.getElementById("addonPrefs_revived");
                  let id = "addonsManager_prefs_revived_" + self.extension.id;
                  let icon = self.extension.manifest.icons[16];
                  let name = self.extension.manifest.name;
                  let entry = window.MozXULElement.parseXULToFragment(
                    `<menuitem class="menuitem-iconic" id="${id}" image="${icon}" label="${name}" />`);
                  addonPrefs_revived.appendChild(entry);
                  window.document.getElementById(id).addEventListener("command", function() {window.openDialog(self.pathToOptionsPage, "AddonOptions")});
                }
                                
                if (Object.keys(self.registeredWindows).includes(window.location.href)) {
                  try {
                    // Create add-on specific namespace
                    let namespace = "AddOnNS" + self.extension.instanceId;
                    window[namespace] = {};
                    // Make extension object available in loaded JavaScript
                    window[namespace].extension = self.extension;
                    // Add messenger obj
                    window[namespace].messenger = Array.from(self.extension.views).find(
                      view => view.viewType === "background").xulBrowser.contentWindow
                      .wrappedJSObject.browser;                  
                    // Load script into add-on specific namespace
                    Services.scriptloader.loadSubScript(self.registeredWindows[window.location.href], window[namespace], "UTF-8");
                    // Call onLoad(window, wasAlreadyOpen)
                    window[namespace].onLoad(window, self.openWindows.includes(window), namespace);
                  } catch (e) {
                    Components.utils.reportError(e)
                  }
                }
              },
              onUnloadWindow(window) {
                if (Object.keys(self.registeredWindows).includes(window.location.href)) {
                  //  Remove this window from the list of open windows
                  self.openWindows = self.openWindows.filter(e => (e != window));    
                  
                  try {
                    // Call onUnload()
                    let namespace = "AddOnNS" + self.extension.instanceId;
                    window[namespace].onUnload(window, false, namespace);
                  } catch (e) {
                    Components.utils.reportError(e)
                  }
                }
              }
            });
          } else {
            console.error("Failed to start listening, no windows registered");
          }
        },
        
      }
    };
  }

  close() {
    console.log("WindowListener API is shutting down");
  
    // Unload from all still open windows
    let urls = Object.keys(this.registeredWindows);
    if (urls.length > 0) {          
      for (let window of Services.wm.getEnumerator(null)) {

        //remove our entry in the add-on options menu
        if (
          this.pathToOptionsPage && 
          (window.location.href == "chrome://messenger/content/messenger.xul" ||
          window.location.href == "chrome://messenger/content/messenger.xhtml")) {            
          let id = "addonsManager_prefs_revived_" + this.extension.id;
          window.document.getElementById(id).remove();
          
          //do we have to remove the entire add-on options menu?
          let addonPrefs_revived = window.document.getElementById("addonPrefs_revived");
          if (addonPrefs_revived.children.length == 0) {
            window.document.getElementById("addonsManager_prefs_revived").remove();
          }
        }
          
        if (this.registeredWindows.hasOwnProperty(window.location.href)) {
          try {
            // Call onUnload()
            let namespace = "AddOnNS" + this.extension.instanceId;
            window[namespace].onUnload(window, true, namespace);
          } catch (e) {
            Components.utils.reportError(e)
          }
        }
      }
      // Stop listening for new windows.
      ExtensionSupport.unregisterWindowListener("injectListener");
    }
    
    // Load registered shutdown script
    let shutdownJS = {};
    shutdownJS.extension = this.extension;
    try {
      if (this.pathToShutdownScript) Services.scriptloader.loadSubScript(this.pathToShutdownScript, shutdownJS, "UTF-8");
    } catch (e) {
      Components.utils.reportError(e)
    }
    
    // Flush all caches
    Services.obs.notifyObservers(null, "startupcache-invalidate");
    this.registeredWindows = {};
    
    if (this.chromeHandle) {
      this.chromeHandle.destruct();
      this.chromeHandle = null;
    }    
  }
};
