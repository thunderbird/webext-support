/*! Copyright 2026 Fonticons, Inc. - https://webawesome.com/license */
import {
  o,
  require_react
} from "./chunk.B32RACHV.js";
import {
  WaInclude
} from "./chunk.3ZKWV7KX.js";
import {
  __toESM
} from "./chunk.AIIMJL75.js";

// src/react/include/index.ts
var React = __toESM(require_react(), 1);
var tagName = "wa-include";
var reactWrapper = o({
  tagName,
  elementClass: WaInclude,
  react: React,
  events: {
    onWaLoad: "wa-load",
    onWaIncludeError: "wa-include-error"
  },
  displayName: "WaInclude"
});
var include_default = reactWrapper;

export {
  include_default
};
