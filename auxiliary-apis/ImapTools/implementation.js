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

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var ImapTools = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    this.context = context;

    return {
      ImapTools: {
        getImapUID(aID) {
          let msgHdr = context.extension.messageManager.get(aID);
          if (msgHdr.folder.server.type == "imap") {
            return msgHdr.messageKey;
          }
          throw new ExtensionError(
            `Message with id ${aID} is not an IMAP message.`
          );
        },
      }
    };
  }
};
