/*
 * This file is provided by the addon-developer-support repository at
 * https://github.com/thundernest/addon-developer-support
 *
 * Version: 1.1
 *
 * Author: John Bieling (john@thunderbird.net)
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
  
var LegacyPrefs = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {    
    
    return {
      LegacyPrefs: {

        // get may only return something, if a value is set
        getUserPref: async function(aName) {         
          let prefType = Services.prefs.getPrefType(aName);
          if (prefType == Services.prefs.PREF_INVALID) {
            return null;
          }
          
          let value = null;
          if (Services.prefs.prefHasUserValue(aName)) {
            switch (prefType) {
              case Services.prefs.PREF_STRING:
                  value = Services.prefs.getCharPref(aName, null);
                  break;

              case Services.prefs.PREF_INT:
                  value = Services.prefs.getIntPref(aName, null);
                  break;
              
              case Services.prefs.PREF_BOOL:
                  value = Services.prefs.getBoolPref(aName, null);
                  break;
                
              default:
                console.error(`Legacy preference <${aName}> has an unknown type of <${prefType}>.  Migration skipped.`);
            }
          }          
          return value;
        },

        clearUserPref: function(aName) {
          Services.prefs.clearUserPref(aName);
        }

      }
    };
  }
};
