/*! Copyright 2026 Fonticons, Inc. - https://webawesome.com/license */
import {
  o,
  require_react
} from "./chunk.B32RACHV.js";
import {
  WaSelect
} from "./chunk.2RF2MKWI.js";
import {
  __toESM
} from "./chunk.AIIMJL75.js";

// src/react/select/index.ts
var React = __toESM(require_react(), 1);
var tagName = "wa-select";
var reactWrapper = o({
  tagName,
  elementClass: WaSelect,
  react: React,
  events: {
    onWaClear: "wa-clear",
    onWaShow: "wa-show",
    onWaAfterShow: "wa-after-show",
    onWaHide: "wa-hide",
    onWaAfterHide: "wa-after-hide",
    onWaInvalid: "wa-invalid"
  },
  displayName: "WaSelect"
});
var select_default = reactWrapper;

export {
  select_default
};
