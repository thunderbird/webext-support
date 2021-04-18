/*
 * This file is provided by the addon-developer-support repository at
 * https://github.com/thundernest/addon-developer-support
 *
  * Author: The Thunderbird Team
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
var { MsgHdrToMimeMessage } = ChromeUtils.import(
  "resource:///modules/gloda/MimeMessage.jsm"
);
var { NetUtil } = ChromeUtils.import("resource://gre/modules/NetUtil.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

Cu.importGlobalProperties(["fetch", "File"]);

var BackportsMessages = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    function convertAttachment(attachment) {
      return {
        contentType: attachment.contentType,
        name: attachment.name,
        size: attachment.size,
        partName: attachment.partName,
      };
    }
    
    return {
      Backports: {
        messages: {
          async listAttachments(messageId) {
            let msgHdr = context.extension.messageManager.get(messageId);
            if (!msgHdr) {
              throw new ExtensionError(`Message not found: ${messageId}.`);
            }

            return new Promise(resolve => {
              MsgHdrToMimeMessage(
                msgHdr,
                null,
                (_msgHdr, mimeMsg) => {
                  resolve(mimeMsg.allAttachments.map(convertAttachment));
                },
                true,
                { examineEncryptedParts: true, partsOnDemand: true }
              );
            });
          },
          async getAttachmentFile(messageId, partName) {
            let msgHdr = context.extension.messageManager.get(messageId);
            if (!msgHdr) {
              throw new ExtensionError(`Message not found: ${messageId}.`);
            }

            // It's not ideal to have to call MsgHdrToMimeMessage here but we
            // need the name of the attached file, plus this also gives us the
            // URI without having to jump through a lot of hoops.
            let attachment = await new Promise(resolve => {
              MsgHdrToMimeMessage(
                msgHdr,
                null,
                (_msgHdr, mimeMsg) => {
                  resolve(
                    mimeMsg.allAttachments.find(a => a.partName == partName)
                  );
                },
                true,
                { examineEncryptedParts: true, partsOnDemand: true }
              );
            });

            if (!attachment) {
              throw new ExtensionError(
                `Part ${partName} not found in message ${messageId}.`
              );
            }
            console.log(attachment.url);
            
            // This does not seem to work in TB78, duno why.
            /* let channel = Services.io.newChannelFromURI(
              Services.io.newURI(attachment.url),
              null,
              Services.scriptSecurityManager.getSystemPrincipal(),
              null,
              Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_SEC_CONTEXT_IS_NULL,
              Ci.nsIContentPolicy.TYPE_OTHER
            );*/
            let channel = NetUtil.newChannel({
              uri: Services.io.newURI(attachment.url),
              loadUsingSystemPrincipal: true,
            });
            
            let byteArray = await new Promise(resolve => {
              let listener = Cc[
                "@mozilla.org/network/stream-loader;1"
              ].createInstance(Ci.nsIStreamLoader);
              listener.init({
                onStreamComplete(loader, context, status, resultLength, result) {
                  resolve(Uint8Array.from(result));
                },
              });
              channel.asyncOpen(listener);
            });

            return new File([byteArray], attachment.name, {
              type: attachment.contentType,
            });
          },        
        }
      }
    };
  }
};
