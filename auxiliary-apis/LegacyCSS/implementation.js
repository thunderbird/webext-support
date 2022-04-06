/*
 * This file is provided by the addon-developer-support repository at
 * https://github.com/thundernest/addon-developer-support
 *
 * Version 1.2
 * - fix multiple context not overwriting class members
 * 
 * Version: 1.1
 * - initial release
 *
 * Author: John Bieling (john@thunderbird.net)
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
  var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
  var { ExtensionError } = ExtensionUtils;

  var tracker;
  
  class Tracker {
    constructor(extension) {
      this.windowTracker = new Map();
      this.windowOpenListener = new Set();
      this.chromeData = null;
      this.resourceData = null;
      this.uniqueRandomID = extension.uuid + "_" + extension.instanceId;
    }

    trackCssFile(window, cssFile) {
      let cssFiles = this.windowTracker.get(window) || [];
      cssFiles.push(cssFile)
      this.windowTracker.set(window, cssFiles);
    }

    hasCssFile(window, cssFile) {
      let cssFiles = this.windowTracker.get(window) || [];
      return cssFiles.includes(cssFile);
    }

    untrackAllCssFiles(window) {
      this.windowTracker.delete(window);
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
        "windowListener_" + tracker.uniqueRandomID,
        {
          onLoadWindow(window) {
            for (let listener of tracker.windowOpenListener.values()) {
              listener(window.location.href);
            }
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
              tracker.windowOpenListener.add(fire.sync);
              return () => {
                tracker.windowOpenListener.delete(fire.sync);
              };
            },
          }).api(),

          async inject(url, cssFile) {
            let path = context.extension.rootURI.resolve(cssFile);
            let injected = false;

            for (let window of Services.wm.getEnumerator(null)) {
              if (
                window.location.href != url ||
                tracker.hasCssFile(window, path)
              ) {
                continue;
              }

              let element = window.document.createElement("link");
              element.setAttribute("css_injected", tracker.uniqueRandomID);
              element.setAttribute("rel", "stylesheet");
              element.setAttribute("href", path);
              window.document.documentElement.appendChild(element);

              tracker.trackCssFile(window, path);
              injected = true;
            }
            return injected;
          },

          registerChromeUrl(data) {
            if (tracker.chromeData || tracker.resourceData) {
              throw new ExtensionError(`Cannot call registerChromeUrl more than once.`);
            }

            const aomStartup = Cc[
              "@mozilla.org/addons/addon-manager-startup;1"
            ].getService(Ci.amIAddonManagerStartup);
            const resProto = Cc[
              "@mozilla.org/network/protocol;1?name=resource"
            ].getService(Ci.nsISubstitutingProtocolHandler);

            let chromeData = [];
            let resourceData = [];
            for (let entry of data) {
              if (entry[0] == "resource") resourceData.push(entry);
              else chromeData.push(entry)
            }

            if (chromeData.length > 0) {
              const manifestURI = Services.io.newURI(
                "manifest.json",
                null,
                context.extension.rootURI
              );
              tracker.chromeHandle = aomStartup.registerChrome(manifestURI, chromeData);
            }

            for (let res of resourceData) {
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
            }

            tracker.chromeData = chromeData;
            tracker.resourceData = resourceData;
          }

        }
      };
    }

    onShutdown(isAppShutdown) {
      if (isAppShutdown) {
        return; // the application gets unloaded anyway
      }

      ExtensionSupport.unregisterWindowListener(
        "windowListener_" + tracker.uniqueRandomID,
      );

      // Remove all injected CSS.
      for (let window of Services.wm.getEnumerator(null)) {
        let elements = Array.from(
          window.document.querySelectorAll(
            '[css_injected="' + tracker.uniqueRandomID + '"]'
          )
        );
        for (let element of elements) {
          element.remove();
        }
      }

      // Flush all caches
      Services.obs.notifyObservers(null, "startupcache-invalidate");
      this.registeredWindows = {};

      if (this.resourceData) {
        const resProto = Cc[
          "@mozilla.org/network/protocol;1?name=resource"
        ].getService(Ci.nsISubstitutingProtocolHandler);
        for (let res of this.resourceData) {
          // [ "resource", "shortname" , "path" ]
          resProto.setSubstitution(res[1], null);
        }
      }

      if (this.chromeHandle) {
        this.chromeHandle.destruct();
        this.chromeHandle = null;
      }
    }
  };

  exports.LegacyCSS = LegacyCSS;

})(this)
