/*
 * This file is provided by the addon-developer-support repository at
 * https://github.com/thunderbird/addon-developer-support
 *
 * Version 1.2
 * - adjusted to TB128 (no longer loading Services and ExtensionCommon)
 * - use ChromeUtils.importESModule()
 * 
 * Version 1.1
 * - adjusted to Thunderbird 115 (Services is now in globalThis)
 *
 * Version 1.0
 * - initial release
 *
 * Author: John Bieling (john@thunderbird.net)
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* global Services, ExtensionCommon */

"use strict";

// Import some things we need.
var { ExtensionSupport } = ChromeUtils.importESModule(
  "resource:///modules/ExtensionSupport.sys.mjs"
);
var { ExtensionUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionUtils.sys.mjs"
);
var { ExtensionError } = ExtensionUtils;

var ImapTools = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
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
