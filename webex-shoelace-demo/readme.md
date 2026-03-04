Using Shoelace in a Thunderbird MailExtension
This example shows how to integrate Shoelace Web Components specifically into a Thunderbird MailExtension to implement a dialog-based user interface.
The example add-on adds a folder pane context menu item that scans a selected folder and opens a dialog displaying results in a tabular view.
The purpose of this example is to show:
 How to vendor and load Shoelace components in a MailExtension
 How to build a dialog UI using <sl-dialog>
 How to render and style tabular results inside the dialog


This project is intended as a UI integration example, not a full duplicate-removal add-on.

Note: Shoelace must be vendored locally rather than loaded from a CDN because Thunderbird extensions enforce a Content Security Policy (CSP)

Repository Structure
The repository contains the following files:
Core extension files
background.js
 Handles the main extension logic.
 Creates the folder pane menu item, scans the selected folder and opens the results dialog.


dialog.html
 Defines the UI for the dialog window and loads Shoelace components.


dialog.js
 Renders the table data and handles sorting and filtering behaviour.


manifest.json
 Defines the extension configuration and permissions.



UI library
Shoelace is vendored locally in the following directory:
vendor/shoelace/
Vendoring is required because Thunderbird extensions cannot load scripts from external CDNs due to Content Security Policy restrictions.


### 1. Add Shoelace to the Extension
Copy the Shoelace distribution into the extension project.
Example structure:
vendor/
 shoelace/
   components/
   themes/
   shoelace.js
In this example project the files are located at:
vendor/shoelace/

### 2. Import Shoelace in Your Dialog HTML
In the HTML file used for the extension UI (for example dialog.html), load the Shoelace theme and components.
<link rel="stylesheet" href="./vendor/shoelace/themes/light.css">

<script type="module" src="./vendor/shoelace/components/dialog/dialog.js"></script>
<script type="module" src="./vendor/shoelace/components/button/button.js"></script>
Scripts must be loaded with type="module".
All files must be referenced locally within the extension.

### 3. Use Shoelace Components

Once imported, Shoelace components can be used directly in the HTML.
Example dialog:
<sl-dialog label="Duplicate Scan Results" style="--width: 820px;">
 <p id="meta"></p>

 <table>
   <thead>
     <tr>
       <th>Subject</th>
       <th>Count</th>
     </tr>
   </thead>
   <tbody id="results"></tbody>
 </table>

 <sl-button slot="footer">Close</sl-button>
</sl-dialog>

### 4. Style the Table
The example table uses simple CSS for layout and readability.
Example:
table {
 width: 100%;
 border-collapse: collapse;
}

th, td {
 padding: 10px;
 border-bottom: 1px solid rgba(0,0,0,.12);
 border-right: 1px solid rgba(0,0,0,.12);
}
The header row can also be made sticky:
table thead th {
 position: sticky;
 top: 0;
 background: #f3f3f3;
}

### 5. Column Separators
Column separators are created by the border-right rule.
To remove them, delete or override the rule:
th, td {
 border-right: none;
}
The following rule may also be removed:
th:last-child,
td:last-child {
 border-right: none;
}
This will render the table without vertical column lines.

### Notes
Shoelace must be bundled with the extension due to Thunderbird CSP restrictions.


Components must be loaded with type="module".


Only the components you use need to be imported.

