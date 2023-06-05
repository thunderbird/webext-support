/*
 * This file is provided by the addon-developer-support repository at
 * https://github.com/thundernest/addon-developer-support
 *
 * Version 1.4
 * - fix bug in waitForLoad()
 * 
 * Version 1.3
 * - allow injecting into nested browsers (needed for Thunderbird Supernova,
 *   which loads about:3pane and about:message into nested browsers)
 * - adjusted to Thunderbird Supernova (Services is now in globalThis)
 *
 * Version 1.2
 * - fix multiple context not overwriting class members
 *
 * Version 1.1
 * - initial release
 *
 * Author:
 * - John Bieling (john@thunderbird.net)
 * - Arnd Issler (email@arndissler.net)
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

(function (exports) {

  // Import some things we need.
  var { ExtensionCommon } = ChromeUtils.import(
    "resource://gre/modules/ExtensionCommon.jsm"
  );
  var { ExtensionSupport } = ChromeUtils.import(
    "resource:///modules/ExtensionSupport.jsm"
  );
  var { ExtensionUtils } = ChromeUtils.import(
    "resource://gre/modules/ExtensionUtils.jsm"
  );
  var { ExtensionError } = ExtensionUtils;
  
  var Services = globalThis.Services || 
    ChromeUtils.import("resource://gre/modules/Services.jsm").Services;

  async function waitForLoad(window) {
    for (let i = 0; i < 20; i++) {
      await new Promise(r => window.setTimeout(r, 50));
      if (
        window &&
        window.location.href != "about:blank" &&
        window.document.readyState == "complete"
      ) {
        return;
      }
    }
    throw new Error("Window ignored");
  }

  var tracker;

  class Tracker {
    constructor(extension) {
      this.cssInjectionTracker = new WeakMap();
      this.windowOpenListener = new ExtensionCommon.EventEmitter();
      this.chromeHandle = null;
      this.resourceData = [];
      this.extension = extension;
    }

    get hasRegisteredChromeUrl() {
      return this.chromeHandle || this.resourceData.length > 0
    }

    get instanceId() {
      return `${this.extension.uuid}_${this.extension.instanceId}`;
    }

    get windowListenerId() {
      return `windowListener_${this.instanceId}`;
    }

    addOnOpenedListener(callback) {
      this.windowOpenListener.on("window-opened", callback);
    }

    removeOnOpenedListener(callback) {
      this.windowOpenListener.off("window-opened", callback);
    }

    tabMonitor = {
      onTabTitleChanged(aTab) { },
      onTabClosing(aTab) { },
      onTabPersist(aTab) { },
      onTabRestored(aTab) { },
      onTabSwitched(aNewTab, aOldTab) {
      },
      async onTabOpened(aTab) {
        if (aTab.browser) {
          if (!aTab.pageLoaded) {
            // await a location change if browser is not loaded yet
            await new Promise((resolve) => {
              let reporterListener = {
                QueryInterface: ChromeUtils.generateQI([
                  "nsIWebProgressListener",
                  "nsISupportsWeakReference",
                ]),
                onStateChange() { },
                onProgressChange() { },
                onLocationChange(
                  /* in nsIWebProgress*/ aWebProgress,
                  /* in nsIRequest*/ aRequest,
                  /* in nsIURI*/ aLocation
                ) {
                  aTab.browser.removeProgressListener(reporterListener);
                  resolve();
                },
                onStatusChange() { },
                onSecurityChange() { },
                onContentBlockingEvent() { },
              };
              aTab.browser.addProgressListener(reporterListener);
            });
          }
          this.notifyOnOpenedListener(aTab.browser.contentWindow);
        }

        if (aTab.chromeBrowser) {
          this.notifyOnOpenedListener(aTab.chromeBrowser.contentWindow);
        }
      },
    }

    async notifyOnOpenedListener(window) {
      // Wait till window is fully loaded.
      try {
        await waitForLoad(window);
      } catch (ex) {
        return;
      };

      // Special action if this is the main messenger window.
      if (window.location.href == "chrome://messenger/content/messenger.xhtml") {
        // Add a tab monitor. The tabMonitor checks newly opened tabs and injects us.
        window.gTabmail.registerTabMonitor(this.tabMonitor);
      }

      // Notify WebExtension.
      this.windowOpenListener.emit("window-opened", window.location.href);

      // Scan for nested browsers.
      let browsers = [];
      browsers = browsers.concat(...window.document.getElementsByTagName("browser"));
      browsers = browsers.concat(...window.document.getElementsByTagName("xul:browser"));
      browsers.map(browser => this.notifyOnOpenedListener(browser.contentWindow));
    }

    trackCssFile(window, cssFile) {
      let cssFiles = this.cssInjectionTracker.get(window) || [];
      cssFiles.push(cssFile);
      this.cssInjectionTracker.set(window, cssFiles);
    }

    hasCssFile(window, cssFile) {
      let cssFiles = this.cssInjectionTracker.get(window) || [];
      return cssFiles.includes(cssFile);
    }

    untrackAllCssFiles(window) {
      this.cssInjectionTracker.delete(window);
    }
  }

  class LegacyCSS extends ExtensionCommon.ExtensionAPI {
    // Alternative to defining a constructor here in order to init the class, is
    // to use the onStartup event. However, this causes the API to be instantiated
    // directly after the add-on has been loaded, not when the API is first used.
    constructor(...args) {
      // The only parameter is extension, but it could change in the future.
      // super() will add the extension as a member of this.
      super(...args);
      tracker = new Tracker(this.extension);
      
      ExtensionSupport.registerWindowListener(
        tracker.windowListenerId,
        {
          onLoadWindow(window) {
            tracker.notifyOnOpenedListener(window);
          },
          onUnloadWindow(window) {
            tracker.untrackAllCssFiles(window);
          }
        }
      );
    }

    // The API implementation.
    getAPI(context) {
      return {
        LegacyCSS: {
          onWindowOpened: new ExtensionCommon.EventManager({
            context,
            name: "LegacyCSS.onWindowOpened",
            register: (fire) => {
              function listener(event, url) {
                fire.sync(url);
              } 
              tracker.addOnOpenedListener(listener);
              return () => {
                tracker.removeOnOpenedListener(listener);
              };
            },
          }).api(),

          async inject(url, cssFile) {
            let path = context.extension.rootURI.resolve(cssFile);
            const injectIntoWindow = async window => {
              // Wait till window is fully loaded.
              try {
                await waitForLoad(window);
              } catch (ex) {
                return;
              };
              
              // Inject CSS if window is a match.
              if (window.location.href === url && !tracker.hasCssFile(window, path)) {
                let element = window.document.createElement("link");
                element.dataset.cssInjected = tracker.instanceId;
                element.setAttribute("rel", "stylesheet");
                element.setAttribute("href", path);
                window.document.documentElement.appendChild(element);
                tracker.trackCssFile(window, path);
              }

              // Scan for nested browsers.
              let browsers = [];
              browsers = browsers.concat(...window.document.getElementsByTagName("browser"));
              browsers = browsers.concat(...window.document.getElementsByTagName("xul:browser"));
              return Promise.all(browsers.map(browser => injectIntoWindow(browser.contentWindow)));
            }
            Array.from(Services.wm.getEnumerator(null), injectIntoWindow);
          },

          registerChromeUrl(data) {
            if (tracker.hasRegisteredChromeUrl) {
              throw new ExtensionError(`Cannot call registerChromeUrl more than once.`);
            }

            const aomStartup = Cc[
              "@mozilla.org/addons/addon-manager-startup;1"
            ].getService(Ci.amIAddonManagerStartup);
            const resProto = Cc[
              "@mozilla.org/network/protocol;1?name=resource"
            ].getService(Ci.nsISubstitutingProtocolHandler);
            const manifestURI = Services.io.newURI(
              "manifest.json",
              null,
              context.extension.rootURI
            );

            let chromeData = data.filter(entry => entry[0] != "resource");
            if (chromeData.length > 0) {
              tracker.chromeHandle = aomStartup.registerChrome(manifestURI, chromeData);
            }

            tracker.resourceData = data.filter(entry => entry[0] == "resource");
            tracker.resourceData.map(res => {
              // [ "resource", "shortname" , "path" ]
              let uri = Services.io.newURI(
                res[2],
                null,
                context.extension.rootURI
              );
              resProto.setSubstitutionWithFlags(
                res[1],
                uri,
                resProto.ALLOW_CONTENT_ACCESS
              );
            })
          }
        }
      };
    }

    onShutdown(isAppShutdown) {
      if (isAppShutdown) {
        return; // the application gets unloaded anyway
      }

      ExtensionSupport.unregisterWindowListener(
        tracker.windowListenerId,
      );

      const removeFromWindow = window => {
        Array.from(
          window.document.querySelectorAll(
            `[data-css-injected="${tracker.instanceId}"]`
          ),
          element => element.remove()
        );
      }
      
      // Remove all injected CSS.
      for (let window of Services.wm.getEnumerator(null)) {
        removeFromWindow(window);
        
        // Scan for nested browsers.
        let browsers = [];
        browsers = browsers.concat(...window.document.getElementsByTagName("browser"));
        browsers = browsers.concat(...window.document.getElementsByTagName("xul:browser"));
        browsers.map(browser => removeFromWindow(browser.contentWindow));
      }

      // Flush all caches
      Services.obs.notifyObservers(null, "startupcache-invalidate");

      const resProto = Cc[
        "@mozilla.org/network/protocol;1?name=resource"
      ].getService(Ci.nsISubstitutingProtocolHandler);

      tracker.resourceData.map(res => {
        // [ "resource", "shortname" , "path" ]
        resProto.setSubstitution(res[1], null);
      });

      if (tracker.chromeHandle) {
        tracker.chromeHandle.destruct();
        tracker.chromeHandle = null;
      }
    }
  }

  exports.LegacyCSS = LegacyCSS;
})(this);
