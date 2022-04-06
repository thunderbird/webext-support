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

var LegacyCSS = class extends ExtensionCommon.ExtensionAPI {
  // Alternative to defining a constructor to init the class, is to use the
  // onStartup event. However, this causes the API to be instantiated after the
  // add-on has been loaded, not when the API is first used.
  constructor(...args) {
    // The only parameter is extension, but it could change in the future.
    // super() will add the extension as a member of this.
    super(...args);
    let extensionApi = this;

    this.windowTracker = new Map();
    this.windowOpenListener = new Set();
    this.uniqueRandomID = this.extension.uuid + "_" + this.extension.instanceId;

    this.chromeData = null;
    this.resourceData = null;

    ExtensionSupport.registerWindowListener(
      "windowListener_" + this.uniqueRandomID,
      {
        onLoadWindow(window) {
          for (let listener of extensionApi.windowOpenListener.values()) {
            listener(window.location.href);
          }
        },
        onUnloadWindow(window) {
          extensionApi.untrackAllCssFiles(window);
        }
      }
    );
  }

  // These functions are "private" helper function and cannot be reached from outside.
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

  // The API implementation.
  getAPI(context) {
    let extensionApi = this;
    return {
      LegacyCSS: {
        onWindowOpened: new ExtensionCommon.EventManager({
          context,
          name: "LegacyCSS.onWindowOpened",
          register: (fire) => {
            extensionApi.windowOpenListener.add(fire.sync);
            return () => {
              extensionApi.windowOpenListener.delete(fire.sync);
            };
          },
        }).api(),

        async inject(url, cssFile) {
          let path = extensionApi.extension.rootURI.resolve(cssFile);
          let injected = false;

          for (let window of Services.wm.getEnumerator(null)) {
            if (
              window.location.href != url ||
              extensionApi.hasCssFile(window, path)
            ) {
              continue;
            }

            let element = window.document.createElement("link");
            element.setAttribute("css_injected", extensionApi.uniqueRandomID);
            element.setAttribute("rel", "stylesheet");
            element.setAttribute("href", path);
            window.document.documentElement.appendChild(element);

            extensionApi.trackCssFile(window, path);
            injected = true;
          }
          return injected;
        },

        registerChromeUrl(data) {
          if (extensionApi.chromeData || extensionApi.resourceData) {
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
              extensionApi.extension.rootURI
            );
            extensionApi.chromeHandle = aomStartup.registerChrome(manifestURI, chromeData);
          }

          for (let res of resourceData) {
            // [ "resource", "shortname" , "path" ]
            let uri = Services.io.newURI(
              res[2],
              null,
              extensionApi.extension.rootURI
            );
            resProto.setSubstitutionWithFlags(
              res[1],
              uri,
              resProto.ALLOW_CONTENT_ACCESS
            );
          }

          extensionApi.chromeData = chromeData;
          extensionApi.resourceData = resourceData;
        }

      }
    };
  }

  onShutdown(isAppShutdown) {
    if (isAppShutdown) {
      return; // the application gets unloaded anyway
    }

    ExtensionSupport.unregisterWindowListener(
      "windowListener_" + this.uniqueRandomID,
    );

    // Remove all injected CSS.
    for (let window of Services.wm.getEnumerator(null)) {
      let elements = Array.from(
        window.document.querySelectorAll(
          '[css_injected="' + this.uniqueRandomID + '"]'
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
