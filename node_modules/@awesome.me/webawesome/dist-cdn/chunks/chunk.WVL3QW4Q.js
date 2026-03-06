/*! Copyright 2026 Fonticons, Inc. - https://webawesome.com/license */
import {
  button_group_styles_default
} from "./chunk.GUXG4CKE.js";
import {
  e as e2
} from "./chunk.KWDPKKFO.js";
import {
  WebAwesomeElement,
  e,
  n,
  r,
  t
} from "./chunk.7V5IXQH7.js";
import {
  x
} from "./chunk.BKE5EYM3.js";
import {
  __decorateClass
} from "./chunk.AIIMJL75.js";

// src/components/button-group/button-group.ts
var WaButtonGroup = class extends WebAwesomeElement {
  constructor() {
    super(...arguments);
    this.disableRole = false;
    this.hasOutlined = false;
    this.label = "";
    this.orientation = "horizontal";
  }
  updated(changedProperties) {
    super.updated(changedProperties);
    if (changedProperties.has("orientation")) {
      this.setAttribute("aria-orientation", this.orientation);
      this.updateClassNames();
    }
  }
  handleFocus(event) {
    const button = findButton(event.target);
    button?.classList.add("button-focus");
  }
  handleBlur(event) {
    const button = findButton(event.target);
    button?.classList.remove("button-focus");
  }
  handleMouseOver(event) {
    const button = findButton(event.target);
    button?.classList.add("button-hover");
  }
  handleMouseOut(event) {
    const button = findButton(event.target);
    button?.classList.remove("button-hover");
  }
  handleSlotChange() {
    this.updateClassNames();
  }
  updateClassNames() {
    const slottedElements = [...this.defaultSlot.assignedElements({ flatten: true })];
    this.hasOutlined = false;
    slottedElements.forEach((el) => {
      const index = slottedElements.indexOf(el);
      const button = findButton(el);
      if (button) {
        if (button.appearance === "outlined") this.hasOutlined = true;
        button.classList.add("wa-button-group__button");
        button.classList.toggle("wa-button-group__horizontal", this.orientation === "horizontal");
        button.classList.toggle("wa-button-group__vertical", this.orientation === "vertical");
        button.classList.toggle("wa-button-group__button-first", index === 0);
        button.classList.toggle("wa-button-group__button-inner", index > 0 && index < slottedElements.length - 1);
        button.classList.toggle("wa-button-group__button-last", index === slottedElements.length - 1);
        button.classList.toggle("wa-button-group__button-radio", button.tagName.toLowerCase() === "wa-radio-button");
      }
    });
  }
  render() {
    return x`
      <slot
        part="base"
        class=${e2({
      "button-group": true,
      "has-outlined": this.hasOutlined
    })}
        role="${this.disableRole ? "presentation" : "group"}"
        aria-label=${this.label}
        aria-orientation=${this.orientation}
        @focusout=${this.handleBlur}
        @focusin=${this.handleFocus}
        @mouseover=${this.handleMouseOver}
        @mouseout=${this.handleMouseOut}
        @slotchange=${this.handleSlotChange}
      ></slot>
    `;
  }
};
WaButtonGroup.css = [button_group_styles_default];
__decorateClass([
  e("slot")
], WaButtonGroup.prototype, "defaultSlot", 2);
__decorateClass([
  r()
], WaButtonGroup.prototype, "disableRole", 2);
__decorateClass([
  r()
], WaButtonGroup.prototype, "hasOutlined", 2);
__decorateClass([
  n()
], WaButtonGroup.prototype, "label", 2);
__decorateClass([
  n({ reflect: true })
], WaButtonGroup.prototype, "orientation", 2);
WaButtonGroup = __decorateClass([
  t("wa-button-group")
], WaButtonGroup);
function findButton(el) {
  const selector = "wa-button, wa-radio-button";
  return el.closest(selector) ?? el.querySelector(selector);
}

export {
  WaButtonGroup
};
