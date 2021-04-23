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
var { ExtensionUtils } = ChromeUtils.import(
  "resource://gre/modules/ExtensionUtils.jsm"
);
var { ExtensionError } = ExtensionUtils;

// Needed in TB78 to get the profile folder. In TB90 we can use
// PathUtils to get the profile folder.
var { FileUtils } = ChromeUtils.import("resource://gre/modules/FileUtils.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var FileSystem = class extends ExtensionCommon.ExtensionAPI { 
  getAPI(context) {
    context.callOnClose(this);
    
    this.context = context;
    let self = this;

    return {
      FileSystem: {

        readFile(filename) {
          let win = Services.wm.getMostRecentWindow("mail:3pane", true);
          let fileObj = FileUtils.getFile("ProfD", ["FileSystemAPI", context.extension.id, filename]);
          if (fileObj.exists()) {
            return win.IOUtils.readUTF8(fileObj.path)
          }
          throw new ExtensionError(`File at "${fileObj.path}" does not exist`)
        },

        writeFile(filename, data) {
          let win = Services.wm.getMostRecentWindow("mail:3pane", true);
          let fileObj = FileUtils.getFile("ProfD", ["FileSystemAPI", context.extension.id, filename]);
          return win.IOUtils.writeUTF8(fileObj.path, data)
        },
        
      }
    };
  }
  
  close() {
  }
};
