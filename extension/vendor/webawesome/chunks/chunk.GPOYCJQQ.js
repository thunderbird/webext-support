/*! Copyright 2026 Fonticons, Inc. - https://webawesome.com/license */
import {
  o,
  require_react
} from "./chunk.B32RACHV.js";
import {
  WaDrawer
} from "./chunk.RIWG3BWH.js";
import {
  __toESM
} from "./chunk.AIIMJL75.js";

// src/react/drawer/index.ts
var React = __toESM(require_react(), 1);
var tagName = "wa-drawer";
var reactWrapper = o({
  tagName,
  elementClass: WaDrawer,
  react: React,
  events: {
    onWaShow: "wa-show",
    onWaAfterShow: "wa-after-show",
    onWaHide: "wa-hide",
    onWaAfterHide: "wa-after-hide"
  },
  displayName: "WaDrawer"
});
var drawer_default = reactWrapper;

export {
  drawer_default
};
