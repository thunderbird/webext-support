/*! Copyright 2026 Fonticons, Inc. - https://webawesome.com/license */
import {
  o,
  require_react
} from "./chunk.B32RACHV.js";
import {
  WaAnimation
} from "./chunk.3YYMF6GR.js";
import {
  __toESM
} from "./chunk.AIIMJL75.js";

// src/react/animation/index.ts
var React = __toESM(require_react(), 1);
var tagName = "wa-animation";
var reactWrapper = o({
  tagName,
  elementClass: WaAnimation,
  react: React,
  events: {
    onWaCancel: "wa-cancel",
    onWaFinish: "wa-finish",
    onWaStart: "wa-start"
  },
  displayName: "WaAnimation"
});
var animation_default = reactWrapper;

export {
  animation_default
};
