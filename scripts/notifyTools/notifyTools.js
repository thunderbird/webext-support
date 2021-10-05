// Set this to the ID of your add-on, or call notifyTools.setAddonID().
var ADDON_ID = "";

/*
 * This file is provided by the addon-developer-support repository at
 * https://github.com/thundernest/addon-developer-support
 *
 * For usage descriptions, please check:
 * https://github.com/thundernest/addon-developer-support/tree/master/scripts/notifyTools
 *
 * Version: 1.4
 * - auto enable/disable
 *
 * Version: 1.3
 * - registered listeners for notifyExperiment can return a value
 * - remove WindowListener from name of observer
 *
 * Author: John Bieling (john@thunderbird.net)
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var notifyTools = {
  registeredCallbacks: {},
  registeredCallbacksNextId: 1,
  addOnId: ADDON_ID,

  setAddonId: function (addOnId) {
    this.addOnId = addOnId;
  },

  onNotifyExperimentObserver: {
    observe: async function (aSubject, aTopic, aData) {
      if (this.addOnId == "") {
        throw new Error("notifyTools: ADDON_ID is empty!");
      }
      if (aData != this.addOnId) {
        return;
      }
      let payload = aSubject.wrappedJSObject;
      if (payload.resolve) {
        let observerTrackerPromises = [];
        // Push listener into promise array, so they can run in parallel
        for (let registeredCallback of Object.values(
          notifyTools.registeredCallbacks
        )) {
          observerTrackerPromises.push(registeredCallback(payload.data));
        }
        // We still have to await all of them but wait time is just the time needed
        // for the slowest one.
        let results = [];
        for (let observerTrackerPromise of observerTrackerPromises) {
          let rv = await observerTrackerPromise;
          if (rv != null) results.push(rv);
        }
        if (results.length == 0) {
          payload.resolve();
        } else {
          if (results.length > 1) {
            console.warn(
              "Received multiple results from onNotifyExperiment listeners. Using the first one, which can lead to inconsistent behavior.",
              results
            );
          }
          payload.resolve(results[0]);
        }
      } else {
        // Just call the listener.
        for (let registeredCallback of Object.values(
          notifyTools.registeredCallbacks
        )) {
          registeredCallback(payload.data);
        }
      }
    },
  },

  registerListener: function (listener) {
    if (Object.values(this.registeredCallbacks).length == 0) {
      Services.obs.addObserver(
        this.onNotifyExperimentObserver,
        "NotifyExperimentObserver",
        false
      );      
    }
    
    let id = this.registeredCallbacksNextId++;
    this.registeredCallbacks[id] = listener;
    return id;
  },

  removeListener: function (id) {
    delete this.registeredCallbacks[id];
    if (Object.values(this.registeredCallbacks).length == 0) {
      Services.obs.removeObserver(
        this.onNotifyExperimentObserver,
        "NotifyExperimentObserver"
      );  
    }
  },

  cleanUp: function () {
    if (Object.values(this.registeredCallbacks).length != 0) {
      Services.obs.removeObserver(
        this.onNotifyExperimentObserver,
        "NotifyExperimentObserver"
      );  
    }
    this.registeredCallbacks = {};
  },  

  notifyBackground: function (data) {
    if (this.addOnId == "") {
      throw new Error("notifyTools: ADDON_ID is empty!");
    }
    return new Promise((resolve) => {
      Services.obs.notifyObservers(
        { data, resolve },
        "NotifyBackgroundObserver",
        this.addOnId
      );
    });
  },

  enable: function () {
    console.log("Manually calling enable() is no longer needed.");
  },

  disable: function () {
    console.log("Manually calling disable() is no longer needed.");
  },
};

if (typeof window != "undefined" && window) {
  window.addEventListener(
    "unload",
    function (event) {
      notifyTools.cleanUp();
    },
    false
  );
}