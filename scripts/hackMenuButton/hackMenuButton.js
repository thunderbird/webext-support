var hackMenuButton = {
  
  addMenuitem(window, buttonId, menuitemId, attributes = null) {
    let button = window.document.getElementById(buttonId);
    
    // check if we need to convert the button
    if (!(button.hasAttribute("type") && button.getAttribute("type") == "menu")) {
    button.setAttribute("type", "menu");
    button.setAttribute("wantdropmarker", "true");
    button.appendChild(window.MozXULElement.parseXULToFragment(
      `<dropmarker type="menu" class="toolbarbutton-menu-dropmarker"/>`));    
    }
    
    // check if we need to add popup
    let popup = button.querySelector("menupopup");
    if (!popup) {
      popup = window.document.createXULElement("menupopup");
      popup.setAttribute("id", `${buttonId}-popup`);
      button.appendChild(popup);
    }

    // add menuitem
    let menuitem = window.document.createXULElement("menuitem");
    menuitem.id = menuitemId;
    if (attributes) {
      for (let [attribute, value] of Object.entries(attributes)) {
        menuitem.setAttribute(attribute, value);
      }
    }  
    popup.appendChild(menuitem);
    return popup;
  },

  removeMenuitem(window, buttonId, menuitemId) {
    let menuitem = window.document.getElementById(menuitemId);
    if (menuitem) {
    menuitem.remove();
    }

    //check if the button still contains menuitems and downgrade the button if that ois not the case anymore
    let button = window.document.getElementById(buttonId);
    let popup = button.querySelector("menupopup");
    if (button && popup) {
      let menuitems = popup.querySelectorAll("menuitem");
      if (menuitems.length == 0) {
        popup.remove();
        button.removeAttribute("type");
        button.removeAttribute("wantdropmarker");
        let dropmarker = button.querySelector("dropmarker");
        if (dropmarker) {
          dropmarker.remove();
        }
      }
    }
  },

}