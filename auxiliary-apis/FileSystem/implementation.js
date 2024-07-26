/*
 * This file is provided by the addon-developer-support repository at
 * https://github.com/thunderbird/addon-developer-support
 *
 * Version 1.3
 * - adjusted to TB128 (no longer loading Services and ExtensionCommon)
 * - use ChromeUtils.importESModule()
 * 
 * Version 1.2
 * - adjusted to properly work with TB115 and TB102
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
var { ExtensionUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionUtils.sys.mjs"
);
var { ExtensionError } = ExtensionUtils;

Cu.importGlobalProperties(["IOUtils", "PathUtils"]);

var FileSystem = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      FileSystem: {

        readFile(filename) {
          let filePath = PathUtils.join(PathUtils.profileDir, "FileSystemAPI", context.extension.id, filename);
          if (IOUtils.exists(filePath)) {
            return IOUtils.readUTF8(filePath)
          }
          throw new ExtensionError(`File at "${filePath}" does not exist`)
        },

        writeFile(filename, data) {
          let filePath = PathUtils.join(PathUtils.profileDir, "FileSystemAPI", context.extension.id, filename);
          return IOUtils.writeUTF8(filePath, data)
        },

      }
    };
  }
};
