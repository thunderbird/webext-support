# Using Webawesome in a Thunderbird MailExtension
This example shows how to integrate Webawesome Web Components specifically into a Thunderbird MailExtension to implement a dialog-based user interface.
The example add-on adds a folder pane context menu item that scans a selected folder and opens a dialog displaying results in a tabular view.
The purpose of this example is to show:
 - How to vendor and load Webawesome components in a MailExtension
 - How to build a dialog UI using ```html <sl-dialog>```
 - How to render and style tabular results inside the dialog


This project is intended as a UI integration example, not a full duplicate-removal add-on.


### Repository Structure
The repository contains the following files:
Core extension files
### `background.js`
 Handles the main extension logic.
 Creates the folder pane menu item, scans the selected folder and opens the results dialog.


### `dialog.html`
 Defines the UI for the dialog window and loads Shoelace components.


### `dialog.js`
 Renders the table data and handles sorting and filtering behaviour.


### `manifest.json`
 Defines the extension configuration and permissions.



### UI library
Webawesome for UI components

### 1. Build step to implement Webawesome

This example uses a simple build script to prepare the extension directory.

The build process performs the following steps:

- Deletes the previous extension output directory
- Copies the src directory into the extension output directory
- Copies vendored UI library files from node_modules into the extension
- Produces a clean folder ready to be loaded as a Thunderbird add-on

Example commands:

- npm ci
- npm run build

The build script ensures that only the required files are included in the extension directory, preventing unnecessary dependencies (such as the entire node_modules folder) from being packaged in the extension.


### 2. Import Webawesome in Your Dialog HTML
In the HTML file used for the extension UI (for example dialog.html), load the Shoelace theme and components.
```html 
        <link rel="stylesheet" href="./vendor/webawesome/styles/webawesome.css">
        <link rel="stylesheet" href="./vendor/webawesome/styles/native.css">
        <link rel="stylesheet" href="./vendor/webawesome/styles/themes/shoelace.css">

        <script type="module" src="./vendor/webawesome/components/dialog/dialog.js"></script>
        <script type="module" src="./vendor/webawesome/components/button/button.js"></script>
```
Scripts must be loaded with ```html type="module". ```
All files must be referenced locally within the extension.

### 3. Use Webawesome Components

Once imported, Webawesome components can be used directly in the HTML.
Example dialog:
```html
 <wa-dialog label="Duplicate Scan Results" class="dialog" style="--width: 820px;">
    <p class="meta" id="meta"></p>
    <div class="table-wrap">
      <table>
        <thead>
         <tr>
            <th id="th-subject">
              <wa-button variant="text" size="small" id="sort-subject">
                Subject
              </wa-button>
            </th>
            <th id="th-count" class="count" aria-sort="none">
              <wa-button variant="text" size="small" id="sort-count">
                Count
              </wa-button>
            </th>
          </tr>
        </thead>
        <tbody id="rows"></tbody>
      </table>
    </div>

    <wa-button slot="footer" variant="primary" id="close">Close</wa-button>
  </wa-dialog>
```

### 4. Style the Table
The example table uses simple CSS for layout and readability.
Example:
```html 
  <style>
    body { margin: 0; font: message-box; }
    .meta { margin: 0 0 12px 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td {padding: 10px; border-bottom: 1px solid rgba(0,0,0,.20); border-right: 1px solid rgba(0,0,0,.20);vertical-align: top;}
    th { text-align: left; white-space: nowrap; }
    th:last-child,
    td:last-child {border-right: none;}
    .subject { word-break: break-word; }
    .count { text-align: right; width: 120px; }
    table thead th {position: sticky; top: 0; z-index: 2; background: #e9eef6; font-weight: 600; border-bottom: 2px solid rgba(0,0,0,.20);}
    .table-wrap {max-height: 60vh; overflow: auto;}
    tbody tr:hover {background: rgba(0,0,0,.04);}
    wa-button[variant="primary"]::part(base) {background: #0a84ff; border-color: #0a84ff; color: white;}
    wa-button[variant="primary"]::part(base):hover {background: #006fe0; border-color: #006fe0; color: white;}
    wa-button[variant="text"]::part(base) {color: #0a84ff; background: transparent; border: none;}
    wa-button[variant="text"]::part(base):hover {color: #006fe0; background: transparent;}
  </style>
  ```

### 5. Column Separators
Column separators are created by the border-right rule.
To remove them, delete or override the rule:
```html 
th, td {
 border-right: none;
}
The following rule may also be removed:
th:last-child,
td:last-child {
 border-right: none;
}
```
This will render the table without vertical column lines.

### Notes
Shoelace must be bundled with the extension due to Thunderbird CSP restrictions.


Components must be loaded with type="module".


Only the components you use need to be imported.

