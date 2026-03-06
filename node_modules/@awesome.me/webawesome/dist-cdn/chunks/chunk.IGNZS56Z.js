/*! Copyright 2026 Fonticons, Inc. - https://webawesome.com/license */
import {
  o,
  require_react
} from "./chunk.B32RACHV.js";
import {
  WaPopover
} from "./chunk.37LBVLGM.js";
import {
  __toESM
} from "./chunk.AIIMJL75.js";

// src/react/popover/index.ts
var React = __toESM(require_react(), 1);
var tagName = "wa-popover";
var reactWrapper = o({
  tagName,
  elementClass: WaPopover,
  react: React,
  events: {
    onWaShow: "wa-show",
    onWaAfterShow: "wa-after-show",
    onWaHide: "wa-hide",
    onWaAfterHide: "wa-after-hide"
  },
  displayName: "WaPopover"
});
var popover_default = reactWrapper;

export {
  popover_default
};
