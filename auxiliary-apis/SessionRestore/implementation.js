/*
 * This file is provided by the addon-developer-support repository at
 * https://github.com/thundernest/addon-developer-support
 *
 * Version 1.1
 *  - updated implementation to not assign this to self anymore
 *
 * Version 1.0
 *  - initial release
 *
 * Author: John Bieling (john@thunderbird.net)
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

(function (exports) {

  // Get various parts of the WebExtension framework that we need.
  var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
  var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

  var onStartupSessionRestoreListener = new Set();

  class SessionRestore extends ExtensionCommon.ExtensionAPI {
    getAPI(context) {
      return {
        SessionRestore: {
          onStartupSessionRestore: new ExtensionCommon.EventManager({
            context,
            name: "SessionRestore.onStartupSessionRestore",
            register: (fire) => {
              onStartupSessionRestoreListener.add(fire.sync);
              return () => {
                onStartupSessionRestoreListener.delete(fire.sync);
              };
            },
          }).api(),
        }
      };
    }

    onStartup() {
      this.sessionRestoreObserver = (aSubject, aTopic, aData) => {
        if (onStartupSessionRestoreListener.size > 0) {
          for (let listener of onStartupSessionRestoreListener.values()) {
            let windowId = this.extension.windowManager.convert(aSubject);
            listener(windowId);
          }
        }
      }

      Services.obs.addObserver(
        this.sessionRestoreObserver,
        "mail-tabs-session-restored",
        false
      );
    }

    onShutdown(isAppShutdown) {
      if (isAppShutdown) {
        return; // the application gets unloaded anyway
      }

      Services.obs.removeObserver(
        this.sessionRestoreObserver,
        "mail-tabs-session-restored"
      );

      // Flush all caches
      Services.obs.notifyObservers(null, "startupcache-invalidate");
    }
  };

  exports.SessionRestore = SessionRestore;

})(this)
