/*
 * This file is provided by the addon-developer-support repository at
 * https://github.com/thundernest/addon-developer-support
 *
 * Version 1.0
 * - initial release
 *
 * Authors:
 * - John Bieling (john@thunderbird.net)
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");

async function setFolder(nativeTabInfo, folder, restorePreviousSelection) {
   let about3Pane = nativeTabInfo.chromeBrowser.contentWindow;
   if (!nativeTabInfo.folder || nativeTabInfo.folder.URI != folder.URI) {
      await new Promise(resolve => {
         let listener = event => {
            if (event.detail == folder.URI) {
               about3Pane.removeEventListener("folderURIChanged", listener);
               resolve();
            }
         };
         about3Pane.addEventListener("folderURIChanged", listener);
         if (restorePreviousSelection) {
            about3Pane.restoreState({
               folderURI: folder.URI,
            });
         } else {
            about3Pane.threadPane.forgetSelection(folder.URI);
            nativeTabInfo.folder = folder;
         }
      });
   }
}

var UnifiedFolders = class extends ExtensionCommon.ExtensionAPI {
   getAPI(context) {
      return {
         UnifiedFolders: {
            async enabled(tabId) {
               // We assume the tabId is a valid mailTab, no error checking.
               let tab = context.extension.tabManager.get(tabId);
               let about3Pane = tab.nativeTab.chromeBrowser.contentWindow;
               return about3Pane.folderPane.activeModes.includes("smart");
            },
            async selectInbox(tabId, mode) {
               // We assume the tabId is a valid mailTab, no error checking.
               let tab = context.extension.tabManager.get(tabId);
               let about3Pane = tab.nativeTab.chromeBrowser.contentWindow;
               if (!about3Pane.folderPane.activeModes.includes("smart")) {
                  return;
               }
               let smartServer = about3Pane.folderPane._modes.smart._smartServer;
               if (!smartServer) {
                  return;
               }
               let smartFolders = MailServices.folderLookup.getFolderForURL(smartServer.rootFolder.URI);
               let inboxFolder = smartFolders.descendants.find(folder => folder.flags & Ci.nsMsgFolderFlags.Inbox);

               // Select the folder, if mode is "folder", restore the last known selection.
               await setFolder(tab.nativeTab, inboxFolder, mode == "folder");

               // If mode is not "folder", we need to select the appropriate message.
               if (mode != "folder") {
                  let msgIndex = null;
                  // Loop over all displayed messages.
                  for (var m = 0; m < about3Pane.threadTree.view.rowCount; m++) {
                     let msgHdr = about3Pane.threadTree.view.getMsgHdrAt(m);
                     msgIndex = m;
                     if (mode == "first-unread" && msgHdr.isRead == false) {
                        break;
                     }
                  }
                  if (msgIndex != null) {
                     about3Pane.threadTree.selectedIndices = [msgIndex];
                  }
               }
            },
         },
      };
   }
};
