/*
 * This file is provided by the webext-support repository at
 * https://github.com/thunderbird/webext-support
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

(function (exports) {

  var { ExtensionUtils } = ChromeUtils.importESModule(
    "resource://gre/modules/ExtensionUtils.sys.mjs"
  );
  var { MailServices } = ChromeUtils.importESModule(
    "resource:///modules/MailServices.sys.mjs"
  );

  var { ExtensionError } = ExtensionUtils;
  
  class PromiseUrlListener {
    #deferred;
    #wrapped;

    constructor(aWrapped) {
      this.#wrapped = aWrapped;
      this.#deferred = Promise.withResolvers();
      this.QueryInterface = ChromeUtils.generateQI(["nsIUrlListener"]);
    }
  
    OnStartRunningUrl(aUrl) {
      if (this.#wrapped && this.#wrapped.OnStartRunningUrl) {
        this.#wrapped.OnStartRunningUrl(aUrl);
      }
    }

    OnStopRunningUrl(aUrl, aExitCode) {
      if (this.#wrapped && this.#wrapped.OnStopRunningUrl) {
        this.#wrapped.OnStopRunningUrl(aUrl, aExitCode);
      }
      if (aExitCode == Cr.NS_OK) {
        this.#deferred.resolve();
      } else {
        this.#deferred.reject(aExitCode);
      }
    }

    get promise() {
      return this.#deferred.promise;
    }
  };

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
          async forceServerUpdate(accountId, path) {
            const server = MailServices.accounts.getAccount(accountId).incomingServer;
            if (server.type != "imap") {
              console.log("Not an IMAP folder")
              return;
            }

            const folder = context.extension.folderManager.get(
              accountId,
              path
            ).QueryInterface(Ci.nsIMsgImapMailFolder);

            const updateListener = new PromiseUrlListener();
            folder.updateFolderWithListener(null, updateListener);
            await updateListener.promise;
    
            // ...and download for offline use.
            const downloadListener = new PromiseUrlListener();
            folder.downloadAllForOffline(downloadListener, null);
            await downloadListener.promise;
          }
        }
      };
    }
  };

  
  exports.ImapTools = ImapTools;
})(this);
