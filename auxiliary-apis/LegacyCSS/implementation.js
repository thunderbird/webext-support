/*
 * This file is provided by the addon-developer-support repository at
 * https://github.com/thundernest/addon-developer-support
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
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var LegacyCSS = class extends ExtensionCommon.ExtensionAPI {

  // These functions are "private" helper function and cannot be reached from outside.
  trackWindow(window) {
    if (!this.windowTracker.includes(window))
      this.windowTracker.push(window);
  }

  untrackWindow(window) {
    this.windowTracker = this.windowTracker.filter(w => w != window);
  }

  getWindows(url) {
    return this.windowTracker.filter(w => w.location.href == url);
  }



  // The API implementation.
  getAPI(context) {
    context.callOnClose(this);

    this.context = context;
    this.windowTracker = [];
    this.windowOpenListener = {};
    this.windowOpenListenerNext = 0;
    this.uniqueRandomID = context.extension.uuid + "_" + context.extension.instanceId;

    let self = this;

    ExtensionSupport.registerWindowListener(
      "windowListener_" + this.uniqueRandomID,
      {
        async onLoadWindow(window) {
          self.trackWindow(window);
          for (let listener of Object.values(self.windowOpenListener)) {
            listener(window.location.href);
          }
        },
        onUnloadWindow(window) {
          self.untrackWindow(window);
        }
      }
    );

    return {
      LegacyCSS: {
        onWindowOpened: new ExtensionCommon.EventManager({
          context,
          name: "LegacyCSS.onWindowOpened",
          register: (fire) => {
            let listenerId = self.windowOpenListenerNext++;
            self.windowOpenListener[listenerId] = fire.sync;
            return () => {
              delete self.windowOpenListener[listenerId];
            };
          },
        }).api(),

        async inject(url, cssFile) {
          let windows = self.getWindows(url);
          if (windows.length == 0) {
            // We have not seen this window, scan all open windows.
            for (let w of Services.wm.getEnumerator(null)) {
              self.trackWindow(w);
            }
            windows = self.getWindows(url);
          }

          // If the window is still not know, return false
          if (windows.length == 0) {
            return false;
          }

          let path = context.extension.rootURI.resolve(cssFile);
          for (let window of windows) {
            let element = window.document.createElement("link");
            element.setAttribute("css_injected", self.uniqueRandomID);
            element.setAttribute("rel", "stylesheet");
            element.setAttribute("href", path);
            window.document.documentElement.appendChild(element);
          }
        }

      }
    };
  }

  close() {
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
  }
};
