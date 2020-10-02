/*
 * This file is provided by the addon-developer-support repository at
 * https://github.com/thundernest/addon-developer-support
 *
 * This file is intended to be used in the WebExtension background page,
 * in popup pages, option pages, content pages as well as in legacy chrome
 * windows (together with the WindowListener API).
 * The preferences will be loaded asynchronously from the WebExtension
 * storage and stored in a local pref obj, so all further access can be done
 * synchronously.
 * If preferences are changed elsewhere, the local pref obj will be updated.
 * 
 * Version: 1.0
 *
 * Author: John Bieling (john@thunderbird.net)
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// Define a prefix for the userPref and defaultPref "branch" in the
// WebExtension storage. The defaults are also stored there, so all
// instances of this script have access to the defaults. 
// A call to preferences.init(defaults) will either set the defaults,
// or load the defaults from the storage, if no defaults obj is given.
const userPrefPrefix = "pref.value.";
const defaultPrefPrefix = "pref.defaults.";

// Set the storage area of userPrefs either to "local" or "sync". Setting it to
// "sync" is a hack to keep preferences stored even after the add-on has been
// removed and installed again (storage.local is cleared upon add-on removal).
// Even though Thunderbird does not actually have a sync backend, storage.sync
// is not cleared on add-on removal to mimic syncing stored values.
// Hint: Reloading/Updating an add-on does not clear storage.local.
const userPrefStorageArea = "local"; // or "sync";

var preferences = {
  
  _isInit: false,
  _prefElements: [],
  _preferencesLoaded: false,
  _prefs: {},  
   
  // Get pref value from local pref obj.
  getPref: function(aName, aFallback = null) {
    // Get defaultPref.
    let defaultPref = this._prefs.hasOwnProperty(defaultPrefPrefix + aName)
      ? this._prefs[defaultPrefPrefix + aName]
      : aFallback;
    
    // Check if userPref type is defaultPref type and return default if no match.
    if (this._prefs.hasOwnProperty(userPrefPrefix + aName)) {
      let userPref = this._prefs[userPrefPrefix + aName];
      if (typeof defaultPref == typeof userPref) {
        return userPref;
      }      
      console.log("Type of defaultPref <" + defaultPref + ":" + typeof defaultPref + "> does not match type of userPref <" + userPref + ":" + typeof userPref + ">. Fallback to defaultPref.")
    }
    
    // Fallback to default value.
    return defaultPref;
  },

  // Set pref value by updating local pref obj and updating storage.
  setPref: function(aName, aValue) {
    this._prefs[userPrefPrefix + aName] = aValue;
    messenger.storage[userPrefStorageArea].set({ [userPrefPrefix + aName] : aValue });
  },

  // Remove a preference (calls to getPref will return default value)
  clearPref: function(aName) {
    delete this._prefs[userPrefPrefix + aName];
    messenger.storage[userPrefStorageArea].remove(userPrefPrefix + aName);    
  },
  
  // Listener for storage changes.
  storageChanged: function (changes, area) {
    let changedItems = Object.keys(changes);
    for (let item of changedItems) {
      if ((area == userPrefStorageArea && item.startsWith(userPrefPrefix)) || (area == "local" && item.startsWith(defaultPrefPrefix))) {
               
        if (typeof changes[item].newValue === 'undefined') {
          if (preferences._prefs.hasOwnProperty(item)) {
            delete preferences._prefs[item];
          }
        } else {
          preferences._prefs[item] = changes[item].newValue;
        }
        
        // Update the content of the element (if any) as well.
        if (item.startsWith(userPrefPrefix)) {
          preferences._updateElements(item.substring(userPrefPrefix.length));
        }        
        
      }
    }
  },

  // Initialize the local pref obj by loading userPrefs and defaultPrefs from
  // WebExtension storage. If a defaults obj is given, the defaults in storage
  // are updated/set.
  init: async function(defaults = null) {
    this._prefs = {};
    
    // Run through storage and put all userPrefs into the local prefs obj.
    let userPrefStorage = await messenger.storage[userPrefStorageArea].get();
    for (let key of Object.keys(userPrefStorage)) {
      if (key.startsWith(userPrefPrefix)) {
        this._prefs[key] = userPrefStorage[key];
      }
    }
    
    // If defaults are given, push them into storage.local, if not, get them
    // from storage.local.
    if (defaults) {
      // Remove all defaults from storage.local for which we do not have an
      // entry in the provided defaults obj.
      let defaultPrefStorage = await messenger.storage.local.get();
      for (let key of Object.keys(defaultPrefStorage)) {
        if (key.startsWith(defaultPrefPrefix)) {
          let prefName = key.split(defaultPrefPrefix).slice(1).join(defaultPrefPrefix);
          if (!defaults.hasOwnProperty(prefName)) {
            await messenger.storage.local.remove(key);
          }
        }
      }      
      // Push new defaults into storage.local.
      for (let key of Object.keys(defaults)) {
        browser.storage.local.set({ [defaultPrefPrefix + key] : defaults[key] });
        this._prefs[ defaultPrefPrefix + key] = defaults[key];
      }
      
    } else {
      // As no defaults are given, load them from storage.local.
      let defaultPrefStorage = await messenger.storage.local.get();
      for (let key of Object.keys(defaultPrefStorage)) {
        if (key.startsWith(defaultPrefPrefix)) {
          this._prefs[key] = defaultPrefStorage[key];
        }
      }
    }
    
    // Add storage change listener.
    await messenger.storage.onChanged.addListener(this.storageChanged);    
    this._isInit = true;
  },
  
  
  
  // The following code is partially taken from
  // M-C preferencesBindings.js.
  
  // Get current values from preference elements and update preferences.
  savePreferences: async function () {
    if (!this._preferencesLoaded)
      return;
    
    const elements = this._getElementsByAttribute("preference");
    for (const element of elements) {
      this._userChangedValue(element, /* instant */ true);
    }
  },

  // Load preferences into elements.
  loadPreferences: async function (window) {
    if (!this._isInit) {
      await this.init();
    }
    this.window = window;
    
    // Gather all preference elements in this document and load their values.
    const elements = this._getElementsByAttribute("preference");
    for (const element of elements) {
      const prefName = element.getAttribute("preference");
      if (!this._prefElements.includes(prefName)) {
        this._prefElements.push(prefName);
      }
      this._updateElements(prefName);
    }
    
    this.window.addEventListener("change", preferences);
    this.window.addEventListener("command", preferences);
    this.window.addEventListener("input", preferences);
    this.window.addEventListener("select", preferences);
    
    this._preferencesLoaded = true;
  },
  
  _getElementsByAttribute: function(name, value) {
    // If we needed to defend against arbitrary values, we would escape
    // double quotes (") and escape characters (\) in them, i.e.:
    //   ${value.replace(/["\\]/g, '\\$&')}
    return value
      ? this.window.document.querySelectorAll(`[${name}="${value}"]`)
      : this.window.document.querySelectorAll(`[${name}]`);
  },
  
  _updateElements: function(prefName) {
    if (!this._prefElements.includes(prefName)) {
      return;
    }
    const elements = this._getElementsByAttribute("preference", prefName);
    for (const element of elements) {
      this._setElementValue(element);
    }
  },

  _isElementEditable: function(aElement) {
    switch (aElement.localName) {
      case "checkbox":
      case "input":
      case "radiogroup":
      case "textarea":
      case "menulist":
        return true;
    }
    return false;
  },
    
  /**
   * Initialize a UI element property with a value. Handles the case
   * where an element has not yet had a XBL binding attached for it and
   * the property setter does not yet exist by setting the same attribute
   * on the XUL element using DOM apis and assuming the element's
   * constructor or property getters appropriately handle this state.
   */
  _setValue: function(element, attribute, value) {
    if (attribute in element) {
      element[attribute] = value;
    } else if (attribute === "checked") {
      // The "checked" attribute can't simply be set to the specified value;
      // it has to be set if the value is true and removed if the value
      // is false in order to be interpreted correctly by the element.
      if (value) {
        // In theory we can set it to anything; however xbl implementation
        // of `checkbox` only works with "true".
        element.setAttribute(attribute, "true");
      } else {
        element.removeAttribute(attribute);
      }
    } else {
      element.setAttribute(attribute, value);
    }
  },

  _setElementValue: function(aElement) {
    if (aElement.hasAttribute("preference")) {
      if (!this._isElementEditable(aElement)) {
        return;
      }

      const val = this.getPref(aElement.getAttribute("preference"));    
      if (aElement.localName == "checkbox") {
        this._setValue(aElement, "checked", val);
      } else {
        this._setValue(aElement, "value", val);
      }
    }
  },

  /**
   * Read the value of an attribute from an element, assuming the
   * attribute is a property on the element's node API. If the property
   * is not present in the API, then assume its value is contained in
   * an attribute, as is the case before a binding has been attached.
   */
  _getValue: function(element, attribute) {
    if (attribute in element) {
      return element[attribute];
    }
    return element.getAttribute(attribute);
  },

  _getElementValue: function (aElement) {
    let value;
    if (aElement.hasAttribute("preference")) {
      if (aElement.localName == "checkbox") {
        value = this._getValue(aElement, "checked");
      } else {
        value = this._getValue(aElement, "value");
      }

      // Convert the value into the required type.
      switch (typeof this.getPref(aElement.getAttribute("preference"))) {
        case "number":
          return parseInt(value, 10) || 0;
        case "boolean":
          return typeof value == "boolean" ? value : value == "true";
      }
    }
    return value;
  },
  
  
  
  // Take care of instant apply.
  handleEvent: function(event) {
    switch (event.type) {
      case "change":
      case "select":
        return this._onChange(event);
      case "command":
        return this._onCommand(event);
      case "input":
        return this._onInput(event);
      default:
        return undefined;
    }
  },

  _getPreferenceElement: function(aStartElement) {
    let temp = aStartElement;
    while (
      temp &&
      temp.nodeType == Node.ELEMENT_NODE &&
      !temp.hasAttribute("preference")
    ) {
      temp = temp.parentNode;
    }
    return temp && temp.nodeType == Node.ELEMENT_NODE ? temp : aStartElement;
  },

  
  _userChangedValue: function(aElement, instant) {
    const element = this._getPreferenceElement(aElement);
    if (element.hasAttribute("instantApply") &&  element.getAttribute("instantApply").toLowerCase() == "false")
      return;
    
    if (!element.hasAttribute("preference") || this.getPref(element.getAttribute("preference")) == this._getElementValue(element))
      return;
    
    if (instant || element.getAttribute("delayprefsave") != "true") {
      // Update value directly.
      this.setPref(element.getAttribute("preference"), this._getElementValue(element));
    } else {
      if (element._deferredValueUpdateTimout) {
        this.window.clearTimeout(element._deferredValueUpdateTimout);
      }
      element._deferredValueUpdateTimout = this.window.setTimeout(this.setPref.bind(this), 1000, element.getAttribute("preference"), this._getElementValue(element));
    }
  },

  _onCommand: function(event) {
    // This "command" event handler tracks changes made to preferences by
    // the user in this window.
    if (event.sourceEvent) {
      event = event.sourceEvent;
    }
    this._userChangedValue(event.target);
  },

  _onChange: function(event) {
    // This "change" event handler tracks changes made to preferences by
    // the user in this window.
    this._userChangedValue(event.target);
  },

  _onInput: function(event) {
    // This "input" event handler tracks changes made to preferences by
    // the user in this window.
    this._userChangedValue(event.target);
  },
  
}