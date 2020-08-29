// Import some things we need.
var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { AddonManager } = ChromeUtils.import("resource://gre/modules/AddonManager.jsm");

var ReplacementAddonNotification = class extends ExtensionCommon.ExtensionAPI { 
  getAPI(context) {
    this.id = context.extension.instanceId;
    this.prefix = "AddOnRedirect_"+ this.id + "_";
    this.details = null;
    
    context.callOnClose(this);
    let self = this;
    
    return {
      ReplacementAddonNotification: {
        set(details) {
          self.details = details;

          ExtensionSupport.registerWindowListener(self.prefix + "Listener", {
            chromeURLs: [
              "chrome://messenger/content/messenger.xhtml",
              "chrome://messenger/content/messenger.xul",
            ],
            onLoadWindow(window) {
              function disableAddon() {
                AddonManager.getAddonByID(context.extension.id).then((addon) => {
                  addon.disable();
                });
              }
              
              function openUrl() {                
                let tabmail = window.document.getElementById("tabmail");
                window.focus();
                tabmail.openTab("contentTab", {
                  contentPage: details.path
                });
                disableAddon();
              };

              let notificationBoxContainer = window.document.getElementById(self.prefix +"Container");
              if (!notificationBoxContainer) {
                let box = window.document.createXULElement("vbox");
                box.id = self.prefix +"Container";
                window.document.documentElement.append(box);
                
                let RedirectNotification = {};
                XPCOMUtils.defineLazyGetter(RedirectNotification, self.prefix +"NotificationBox", () => {
                    return new window.MozElements.NotificationBox(element => {
                        element.setAttribute("flex", "1");
                        window.document.getElementById(self.prefix +"Container").append(element);
                    });
                });              

                let buttons = [];
                buttons.push({
                    isDefault: true,
                    accessKey: null,
                    label: details.label,
                    callback: openUrl,
                    type: "",
                    popup: null
                });
                
                let icons = context.extension.manifest.icons;
                let notificationBox = RedirectNotification[self.prefix +"NotificationBox"];
                notificationBox.appendNotification(
                  details.description,
                  self.prefix +"notification",
                  icons[16] ||icons[32] || icons[64], 
                  notificationBox.PRIORITY_WARNING_HIGH, buttons,
                  disableAddon
                ); 
              }
            },
          });
        },
      },
    };
  }

  close() {
    for (let window of Services.wm.getEnumerator("mail:3pane")) {
      let container = window.document.getElementById(this.prefix +"Container");
      if (container) container.remove();
    }
    ExtensionSupport.unregisterWindowListener(this.prefix + "Listener");
  }
};
