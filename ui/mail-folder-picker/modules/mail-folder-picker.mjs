/*
 * This file is provided by the webext-support repository at
 * https://github.com/thunderbird/webext-support
 *
 * For usage descriptions, please check:
 * https://github.com/thunderbird/webext-support/
 *
 * Version 1.0
 *
 */

class MailFolderPicker extends HTMLElement {
    #selectedFolderId = "";
    #selectedFolderElement = "";

    constructor() {
        super();
    }

    get selectedFolderId() {
        return this.#selectedFolderId
    }
    get selectedFolderInfo() {
        return this.#selectedFolderElement.dataset
    }
    set selectedFolderId(value) {
        this.#selectedFolderId = value;
        this.panel.querySelectorAll("[aria-selected='true']").forEach(
            element => element.setAttribute("aria-selected", "false")
        );
        let element = this.panel.querySelector(`[data-folder-id='${value}']`);
        if (element) {
            element.setAttribute("aria-selected", "true");
            this.#selectedFolderElement = element;
        }
    }

    togglePanel() {
        if (this.panel.style.display == "block") {
            this.panel.style.display = "none";
            this.icon.textContent = "▼";
        } else {
            this.panel.style.display = "block";
            this.icon.textContent = "▲";
        }
    }

    get icon() {
        return this.shadowRoot.querySelector(".icon")
    }
    get panel() {
        return this.shadowRoot.querySelector(".panel")
    }
    get wrapper() {
        return this.shadowRoot.querySelector(".wrapper")
    }
    get placeholder() {
        return this.shadowRoot.querySelector(".placeholder")
    }

    handleClick(e) {
        this.togglePanel();
        this.selectedFolderId = e.target.dataset.folderId;
        this.placeholder.textContent = e.target.dataset.path
        this.dispatchEvent(new CustomEvent("change"));
    }

    connectedCallback() {
        this.#selectedFolderId = this.getAttribute("selectedFolderId");

        // Create a shadow root
        const shadow = this.attachShadow({ mode: "open" });

        const wrapper = document.createElement("div");
        wrapper.setAttribute("class", "wrapper");

        const placeholder = document.createElement("div");
        placeholder.setAttribute("class", "placeholder");
        placeholder.textContent = this.getAttribute("aria-placeholder");
        placeholder.addEventListener("click", this.togglePanel.bind(this) )

        const icon = document.createElement("div");
        icon.setAttribute("class", "icon");
        icon.textContent = "▼";
        icon.addEventListener("click", this.togglePanel.bind(this) )

        const panel = document.createElement("div");
        panel.setAttribute("class", "panel");
        const ul = document.createElement("ul");

        const style = document.createElement("style");
        style.textContent = `
            @media (prefers-color-scheme: dark) {
               :host {
                    --border-color: grey;
                    --selected-color: #A3AABE;
                    --hover-color: silver;
                    --background-color: lightgrey;
                }
            }
            @media (prefers-color-scheme: light) {
                :host {
                    --border-color: grey;
                    --selected-color: #A3AABE;
                    --hover-color: silver;
                    --background-color: lightgrey;
                }
            }

            .wrapper {
                border: 1px solid var(--border-color);
                border-radius: 5px;
                padding: 5px;
                display: flex;
                flex-direction: row;
                align-items: center;
                width: 100%;
                position: relative;
                background-color: var(--background-color);
            }
            .placeholder {
                user-select: none;
                flex: 1
            }
            .icon {
                user-select: none;
                color: var(--border-color);
            }
            .panel {
                font-size: 0.8rem;
                width: 100%;
                max-height: 400px;
                border: 1px solid var(--border-color);
                border-radius: 5px;
                padding: 5px;
                position: absolute;
                top: 100%;
                left: 0px;
                display: none;
                background-color: var(--background-color);
                user-select: none;
                overflow: auto;
            }
            
            .panel ul {
                list-style-type: none;
                margin: 0;
                padding: 0;
                user-select: none;
            }
            .panel li {
                user-select: none;
                padding: 5px;
            }
            .panel li:hover {
                background-color: var(--hover-color);
            }
            .panel li[aria-selected='true'] {
                background-color: var(--selected-color);
            }
        `;

        // Attach the created elements to the shadow dom
        shadow.appendChild(style);
        shadow.appendChild(wrapper);
        wrapper.appendChild(placeholder);
        wrapper.appendChild(icon);
        wrapper.appendChild(panel);
        panel.appendChild(ul);
        
        
        const addFolderLevel = async (parent, folderId, path = [], level = 0) => {
            let entries;
            if (folderId) {
                let folders = await browser.folders.getSubFolders(folderId, false);
                entries = folders.map(folder => ({
                    folderId: folder.id,
                    name: folder.name
                }))
            } else {
                let accounts = await browser.accounts.list(false);
                entries = accounts.map(account => ({
                    folderId: account.rootFolder.id,
                    name: account.name
                }))
            }
            if (entries.length == 0) {
                return
            }

            for (let entry of entries) {
                const li = document.createElement("li");
                const currentPath = [...path, entry.name];
                li.textContent = entry.name;
                li.dataset.folderId = entry.folderId;
                li.dataset.name = entry.name;
                li.dataset.path = currentPath.join(" / ");
                li.dataset.level = level;
                li.addEventListener("click", this.handleClick.bind(this));
                li.style.paddingLeft = `${5+level*10}px`
                if (level == 0) {
                    li.style.fontWeight = "bold";
                }
                parent.appendChild(li);
                await addFolderLevel(parent, entry.folderId, currentPath, level+1)
            }
        }
        addFolderLevel(ul)
    }

    disconnectedCallback() {
    }

    adoptedCallback() {
    }

    attributeChangedCallback(name, oldValue, newValue) {
    }
}

export function registerMailFolderPicker() {
    if (!customElements.get("mail-folder-picker")) {
        customElements.define("mail-folder-picker", MailFolderPicker);
    }
}