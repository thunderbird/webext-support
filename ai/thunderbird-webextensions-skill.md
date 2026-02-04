# Thunderbird WebExtensions Development Skill

## IMPORTANT: How to Read This Skill File

**FOR AI ASSISTANTS:** This file must be read in its original form, not as a summary. If you used WebFetch to read this file, please stop here. Instead, prompt the developer how you should proceed:
- clone the repository temporarily and read the cloned file
- use bash/curl to read the complete content of the provided URL
- let the developer manually download the file and attach it to the current AI chat

## Instructions

You MUST FOLLOW the following instructions by all means. This is what the developer expects. Do not miss a single instruction:
- Do NOT try to minimize code suggested by this skill file, but use it as presented. Always consider the code you are generating to be used in production.
- Follow the skill file as closely as possible, do not deviate!
- Read the [official documentation](https://webextension-api.thunderbird.net/en/mv3/) to learn about the available APIs and the exact parameter and property names
- Never guess an API or its parameters. Never use an API which does not exist.
- Evaluate the section about "Important Guidelines for AI Assistants" below. You MUST NOT repeat any of the mistakes mentioned there and follow the presented guidelines.
- Read about the Experiment APIs which are scheduled for inclusion, they could help if none of the official APIs fit your needs. See the "Experiment APIs" section below.
- Only consider custom Experiments if truly necessary. Understand the maintenance requirements mentioned in the "Experiment APIs" section below, and that you should target Thunderbird ESR instead of the Thunderbird Standard Release when using Experiments.
- Read the repositories listed in the "Example Repositories" section below, to learn about different approaches and how to use Thunderbird's WebExtension APIs.
- Keep it simple for beginners: Avoid complex build processes and include dependencies directly and do not use TypeScript.
- Always prefer proper parsing of strings using 3rd party libraries, instead of trying to use regular expressions. They are not maintainable by novice developers.
- When including 3rd party libraries, always use the most recent stable version and include its usage in the VENDOR.md file as shown in this [example](https://webextension-api.thunderbird.net/en/mv3/guides/vcard.html).
- When downloading files from a repository, use git to clone it, do NOT use WebFetch.
- Always prefer ES6 modules over UMD modules, and always use a background of type "module" to be able to use the `import` directive.
- Always analyze ES6 modules, to learn if they need a named import or a default import.
- Make sure the created add-on fulfills all requirements listed in the "Add-on Review Requirements" section.
- Never hardcode user-facing strings, but use the i18n API to localize the add-on as shown in this [i18n API example](https://github.com/thunderbird/webext-examples/tree/master/manifest_v3/i18n), which uses the [i18n.mjs](https://github.com/thunderbird/webext-support/tree/master/modules/i18n) to localize html files.
- Whenever the developer asks a question or reports something is not working, re-read this skill file to search for solutions presented directly in this file, or in any of its linked resources, before moving on to search the web.

## Important Guidelines for AI Assistants

### 1. Manifest Version 3 does not support the "applications" manifest entry

The `applications` manifest entry is deprecated and is no longer supported in Manifest Version 3. New code should always use `browser_specific_settings`, regardless of being Manifest Version 2 or 3. Example:

```javascript
{
    "manifest_version": 2,
    "name": "Hello World Example",
    "description": "A basic Hello World example extension!",
    "version": "1.0",
    "author": "Thunderbird Team",
    "browser_specific_settings": {
        "gecko": {
            "id": "helloworld@yoursite.com",
            "strict_min_version": "128.0"
        }
    },
    "browser_action": {
        "default_popup": "mainPopup/popup.html",
        "default_title": "Hello World",
        "default_icon": "images/internet-32px.png"
    },
    "icons": {
        "64": "images/internet.png",
        "32": "images/internet-32px.png",
        "16": "images/internet-16px.png"
    }
}
```

### 2. Do not guess APIs by using Try-Catch
A widespread antipattern has emerged in AI-generated Thunderbird extensions:
```javascript
// WRONG - Never do this!
try {
  await browser.someApi.method({ guessedParam: value });
} catch (e) {
  try {
    await browser.someApi.method({ differentGuess: value });
  } catch (e2) {
    // Giving up silently, this makes debugging impossible
  }
}
```

**Why this is harmful:**
- Makes code unmaintainable
- Hides real errors from developers
- Spreads bad patterns when other developers copy the code
- Makes debugging extremely difficult
- Indicates the developer didn't consult actual API documentation

**The correct approach:**
1. Read the API schema/documentation FIRST
2. Use the exact parameter names and types specified
3. Only use try-catch for expected error conditions with proper handling
4. Never suppress errors without logging or handling them

### 3. Do not use Experiments unnecessarily
```javascript
// WRONG - Using Experiment when standard API exists
// Don't use Experiment just because you found example code using it

// RIGHT - Check if standard API can do it first
const folders = await browser.folders.query({ name: "Inbox" });
```

### 4. Handle file storage correctly
```javascript
// WRONG - Trying to use raw filesystem APIs
const fs = require('fs'); // Not available!

// RIGHT - Use storage.local with File objects
const file = new File([content], "data.txt", { type: "text/plain" });
await browser.storage.local.set({ file });
```

### 5. Understand lifecycle of Manifest Version 3 extensions
- background is automatically executed on install and on disable/enable
- background is NOT automatically executed on startup unless a `browser.runtime.onStartup` listener is registered. Note: The listener function runs in addition to the background's file scope code. 

```javascript
// WRONG
async function init() {
  ...
};
// Trigger init() on startup()
browser.runtime.onStartup.addListener(() => {
  init();
})
// Trigger init() on disable/enable and install.
init();

// RIGHT - Do not trigger init() twice:
async function init() {
  ...
};
// Trigger NOOP listener on startup() to cause background to be executed on startup,
// could include **additional** code which should be executed **only** on startup.
browser.runtime.onStartup.addListener(() => {});
// Always trigger init().
init();
```

There is still an edge case, as any other event will also re-execute the background:

```javascript
// WRONG
async function init() {
  ...
};
// Trigger NOOP listener on startup() to cause background to be executed on startup,
// could include **additional** code which should be executed **only** on startup.
browser.runtime.onStartup.addListener(() => {});
// Always trigger init().
init();

browser.runtime.onMessage.addListener((data, sender) => {
  if (data.type === "handle_me") {
    return Promise.resolve("done");
  }
  return false;
});
```

To protect against re-execution of the `init()` function, we can use a flag in the session storage:

```javascript
// RIGHT - only execute init() once!
async function init() {
  const { initialized } = await browser.storage.session.get({ initialized: false });
  if (initialized) return;
  await browser.storage.session.set({ initialized: true });
  ...
};
// Trigger NOOP listener on startup() to cause background to be executed on startup,
// could include **additional** code which should be executed **only** on startup.
browser.runtime.onStartup.addListener(() => {});
// Always trigger init().
init();

browser.runtime.onMessage.addListener((data, sender) => {
  if (data.type === "handle_me") {
    return Promise.resolve("done");
  }
  return false;
});
```

### 6. Do not use async listeners for the runtime.onMessage listener

See https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage

### 7. Parse vCard, vTodo, vEvent and iCal strings using 3rd party library

Follow https://webextension-api.thunderbird.net/en/mv3/guides/vcard.html to parse vCard, vEvent and vTodo strings.

### 8. Parse Mailbox Strings using messengerUtilities

Extract email addresses from mailbox strings like "John Doe <john@example.com>"

```javascript
const parsed = await browser.messengerUtilities.parseMailboxString(
  "John Doe <john@example.com>, Jane <jane@example.com>"
);

// Result:
// [
//   { name: "John Doe", email: "john@example.com" },
//   { name: "Jane", email: "jane@example.com" }
// ]

// Extract just emails:
const emails = parsed.map(p => p.email);
```

**Documentation:** https://webextension-api.thunderbird.net/en/mv3/messengerUtilities.html

**Options:**
- `preserveGroups`: Keep grouped hierarchies
- `expandMailingLists`: Expand Thunderbird mailing lists (requires `addressBook` permission)

### 9. Set correct strict_min_version entry

Make sure the `manifest.json` file has a `strict_min_version` entry matching the used functions. If for example a function added in Thunderbird 137 is used, it must be set to 137.0 or higher.

### 10. Always use background type "module"

Always use `type: "module"` for background scripts. This is actually the simpler approach because:
- You can still include multiple scripts in the `scripts` array
- You can also use `import` to load ES6 modules
- It provides better code organization and explicit dependencies

```json
// WRONG - Do not omit type or use non-module backgrounds
"background": {
  "scripts": ["background.js"]
}

// RIGHT - Always use type: "module"
"background": {
  "scripts": ["background.js"],
  "type": "module"
}
```

Then in your background.js, import libraries explicitly:
```javascript
// Import ES6 module with default export
import ICAL from "./lib/ical.js";

// Import ES6 module with named exports
import { someFunction, someConstant } from "./lib/somemodule.js";
```

**Important:** Never revert to non-module backgrounds just because a library seems difficult to import. Instead, find the ES6 module version of the library or load it via the `scripts` array in the manifest.

### 11. Verify API return types - do not assume array access

Many Thunderbird APIs return wrapped objects, not direct arrays. Always verify the return type in the documentation before accessing the data.

**Common pitfall - MessageList:**
```javascript
// WRONG - getDisplayedMessages() returns MessageList, not an array
const [message] = await browser.messageDisplay.getDisplayedMessages(tabId);

// RIGHT - MessageList has a .messages array property
const { messages: [message] } = await browser.messageDisplay.getDisplayedMessages(tabId);
```

**Common pitfall - HeadersDictionary:**
```javascript
// WRONG - headers might not exist or might not be an array
let returnPath = headers["Return-Path"];

// RIGHT - keys are lowercase, values are always arrays
const returnPathArray = headers["return-path"];
const returnPath = returnPathArray?.[0] ?? null;
```

**APIs that return wrapped objects (NOT direct arrays):**
| API | Returns | Access Pattern |
|-----|---------|----------------|
| `messageDisplay.getDisplayedMessages()` | `MessageList` | `result.messages[0]` |
| `messages.list()` | `MessageList` | `result.messages[0]` |
| `messages.query()` | `MessageList` | `result.messages[0]` |
| `messages.getHeaders()` | `HeadersDictionary` | `result["header-name"][0]` |
| `messages.getFull()` | `MessagePart` | `result.headers["header-name"][0]` |

**APIs that return direct arrays:**
| API | Returns | Access Pattern |
|-----|---------|----------------|
| `tabs.query()` | `array of Tab` | `result[0]` |
| `mailTabs.query()` | `array of MailTab` | `result[0]` |
| `addressBooks.list()` | `array of AddressBookNode` | `result[0]` |
| `contacts.list()` | `array of ContactNode` | `result[0]` |
| `folders.query()` | `array of MailFolder` | `result[0]` |

**Also note the MV2 → MV3 API changes:**
| MV2 (old) | MV3 (new) | Return Type Change |
|-----------|-----------|-------------------|
| `getDisplayedMessage()` | `getDisplayedMessages()` | `MessageHeader` → `MessageList` |
| `onMessageDisplayed` | `onMessagesDisplayed` | `(tab, message)` → `(tab, messageList)` |


## Understanding Thunderbird Release Channels

### Standard Release Channel (Monthly)
- Update cadence: ~4 weeks
- A new major version with each release (`147.0`, `148.0`, ...) 
- Gets new features and APIs (and bug fixes & security fixes)

### ESR Channel (Extended Support Release)
- Update cadence: 1 major update per year, with lots of versions "missing" in between (`115.*`, `128.*`, `140.*`, `153.*`, ...)
- Receives bug fixes & security fixes on regular basis alongside the major monthly releases, but as minor releases (`140.1`, `140.2`, ...)
- No new features or APIs

### For Developers
- Target the Release channel for most add-ons.
- Target the ESR channel for add-ons relying on Experiment APIs. Targeting the Release channel here is acceptable *only* when the developer can guarantee the required monthly updates; otherwise, the add-on will cease functioning and negatively impact users.

## Official API Documentation

**Primary resource:** https://webextension-api.thunderbird.net/en/mv3/

Documentation exists for different channels:
- **Release (mv3)**: https://webextension-api.thunderbird.net/en/mv3/
- **Release (mv2)**: https://webextension-api.thunderbird.net/en/mv2/
- **ESR (esr-mv3)**: https://webextension-api.thunderbird.net/en/esr-mv3/
- **ESR (esr-mv2)**: https://webextension-api.thunderbird.net/en/esr-mv2/

**Key feature:** Search functionality and cross-references between types and functions.

## Experiment APIs

### What Are Experiment APIs?
Experiment APIs allow add-ons to access Thunderbird's core internals directly, similar to legacy extensions. They have full access to modify everything in Thunderbird.

### Critical Rules for Experiments

**1. Avoid Experiments Unless Absolutely Necessary**
- Standard WebExtension APIs should always be your first choice
- Only use Experiments when standard APIs genuinely cannot accomplish your goal
- Accept limitations rather than adding Experiments

**2. Experiments Require Updates for Each Major Version**
- This was manageable with ESR (1x/year)
- Became unsustainable with monthly Release channel (12x/year)
- Causes developer burnout and user frustration

**3. When Suggesting Experiments**
- Only if standard APIs cannot accomplish the core goal
- Developer must explicitly understand the maintenance burden
- **Target ESR channel specifically**
- Reference `esr-mv2` or `esr-mv3` documentation

### Available semi-official Experiment APIs

These Experiment APIs are well maintained and are on track to be included in Thunderbird, but they are not yet official APIs:

#### Calendar Experiment API

To reduce developer burden, always use this Experiment API instead of creating a custom Experiment for interacting with the calendar.

**Use cases:**
- ✅ Reading existing event/task items from Thunderbird's calendar
- ✅ Listening for item updates
- ✅ Creating/updating/deleting items
- ✅ Syncing with external calendar services (requires provider APIs)

**Setup requirements:**
1. Temporarily clone the [webext-experiments](https://github.com/thunderbird/webext-experiments/) repository.
2. Add all `experiment_apis` entries found in the cloned manifest.json file at `calendar/manifest.json` to the project's `manifest.json`.
3. Copy the `calendar/experiments/calendar/` directory from the cloned repository into the project as `experiments/calendar/` (this path matches the entries from the cloned `manifest.json`). Do not modify these files.

**Note:**
The calendar API defaults to the jCal format, but tasks are currently only supporting the iCal format. Therefore: Always request iCal format:

```javascript
// Always consult schema first, if this example is still correct
browser.calendar.items.onCreated.addListener(
  async (calendarItem) => {
    if (calendarItem.type === "task") {
      // calendarItem already contains the data in requested format
      // calendarItem.item contains the iCal string
      // calendarItem.format tells us the format
      console.log("Task in iCal format:", calendarItem.item);
    }
  },
  { returnFormat: "ical" } // extraParameters to specify format
);
```

**Key points from schema:**
- `returnFormat` is specified in `extraParameters` (second argument to addListener)

### Other Experiment Repositories

**Additional resources (use with caution):**
- https://github.com/thunderbird/webext-support - Helper APIs and modules (not on track for inclusion)
- https://github.com/thunderbird/webext-examples - Example extensions (includes some Experiments)

## Native File System Access

### Current Limitations
- native filesystem access is NOT available
- Google implemented native filesystem access for Chrome, but Mozilla decided to not follow their approach for Firefox or Thunderbird

### Recommended Approach

**For data persistence:**
```javascript
// Use storage.local for data
await browser.storage.local.set({ myData: someValue });
const data = await browser.storage.local.get("myData");
```

**For user file input:**
```javascript
// Use standard file input prompts
const file = new File([content], "filename.txt", { type: "text/plain" });

// Store File object directly in storage
await browser.storage.local.set({ file });

// Retrieve later
const data = await browser.storage.local.get("file");
console.log(data.file.name); // Access file properties
```

**Important:** File objects can be stored directly in `browser.storage.local` without serialization!


## Add-on Review Requirements

**Review policy:** https://thunderbird.github.io/atn-review-policy/

### Key Requirements

**1. For Beginners: Avoid Build Tools**
- Include 3rd party libraries directly (don't use webpack, rollup, etc.)
- Include a `VENDOR.md` file that documents all 3rd party libraries used, and has links to the exact versions used. Do not use generic links that point to the "latest" versions, which are not stable over time. An example for such a vendor file is shown here: https://webextension-api.thunderbird.net/en/mv3/guides/vcard.html

**2. For Advanced developers: Source Code Submission**
- Note: The source code submission process is really only for advanced developers. Propose this only if the user insists on using TypeScript or a Node.js driven build process.
- Follow source code submission guidelines in review policy
- Developer must upload source code archive during the submission process
- Developer needs to include build instructions (use a `DEVELOPER.md` file in the root of the source archive), that explain how to build the extension (for example: `npm ci; npm run build`)
- Source archive must not include any build artifacts or modules which are downloaded by the build process
- Keep it as minimal as possible
- The generated file must exactly match the uploaded XPI


## Manifest Versions

### Manifest V2 (Legacy)
- Older version
- Supports persistent background pages (the default)
- Being phased out

### Manifest V3 (Current)
- Newer version, driven by Google Chrome
- No persistent background pages
- Goole Chrome uses service workers, but Thunderbird still supports non-persistent background pages (a.k.a event pages)
- Event pages will be stopped if idle, and will be restarted whenever one of its registered events is triggered
- Always use event pages in Manifest V3, unless the developer explicitly requests to use service workers. Event pages allow to import non-ES6 javascript files in the `scripts` array of the `background` manifest entry, while also supporting a module background and importing ES6 modules in the background via the `import` directive:

```json
"background": {
  "scripts": ["lib/some-non-ES6-lib.js", "background.js"]
  "type": "module"
}
```

**Default to Manifest V3** for all new extensions.


## Permission Requirements

### Common Permissions

```json
{
  "permissions": [
    "messagesRead",      // Read email messages
    "accountsRead",      // See mail accounts and folders
    "addressBooks",      // Access address books
    "storage"            // Use storage.local
  ]
}
```

**Important:** Only request permissions you actually need. Unnecessary permissions may cause rejection during ATN review. Examples are the `tabs` permission and the `activeTab` permission, which are only needed to get host permission for the active tab or all tabs, in order to inject content scripts. This is almost never used in Thunderbird (see compose scripts or message display scripts). The two permissions are also needed to read the icon or URL of a tab, which is as well rarely needed.


## Example Repositories

### Well-Structured Examples
- https://github.com/thunderbird/webext-examples - Official example extensions
- https://github.com/thunderbird/webext-support - Support libraries and helpers

**Use these to:**
- See proper code structure
- Learn common patterns
- Understand best practices
- **BUT:** Be cautious of Experiment usage in examples


## Troubleshooting

### "Not working"
1. Perform a 3rd party library audit, as exlained in step #4 of the "Workflow: How to Use This Skill" section.
2. Perform an API audit, as explained in step #5 of the "Workflow: How to Use This Skill" section.

### "Experiment not loading"
1. Check manifest.json has correct `experiment_apis` entry
2. Ensure schema and implementation files are included
3. Verify file paths are correct

### "File access not working"
1. You cannot use raw or native filesystem APIs
2. Use storage.local for data persistence
3. Use File input prompts for user files
4. Store File objects directly in storage.local

## Getting Help

### Official Channels
- **Developer documentation:** https://developer.thunderbird.net/
- **Support forum:** https://thunderbird.topicbox.com/groups/addons
- **Matrix chat:** #tb-addon-developers:mozilla.org

### When Asking for Help
1. Specify which Thunderbird version you're targeting
2. Mention if you're using Experiments
3. Include relevant code snippets
4. Reference which API documentation you consulted
5. Describe what you've already tried

## Review Process Tips

### Before Submitting
- [ ] Test on target Thunderbird version and on most recent ESR

### After Submitting
- [ ] Add a detailed description and screenshots to the add-on's listing page, to inform users about the purpose of this add-on, and how it can be used
- [ ] If the add-on is localized, the add-on's listing page should also be localized

### During Review
- Respond promptly to reviewer feedback
- Be open to suggestions
- Explain your architectural decisions if asked
- Be willing to remove unnecessary Experiments

---

## Workflow: How to Use This Skill

When a developer asks about Thunderbird WebExtensions:

1. **First:** If creating a new extension, prompt for developer information:
   - Developer name (for the `author` field in the manifest).
   - Developer handle (to be used in the extension ID like `myextension@handle.thunderbird.local`).
2. **Then:** Determine if this is a standard API or an Experiment add-on:
   - [ ] Fetch and read the [official API documentation](https://webextension-api.thunderbird.net/en/mv3/). List all available API namespaces (e.g., accounts, addressBooks, compose, folders, messages, tabs, windows, etc.) to confirm you have parsed the documentation.
   - [ ] Based on the requested add-on functionality, identify which of those API namespaces and specific methods could be used.
   - [ ] Determine if the requested add-on can be implemented with the official APIs.
   - [ ] If the official APIs are not sufficient, check if the APIs available in the [webext-experiments](https://github.com/thunderbird/webext-experiments/) repository can help.
   - [ ] If you still have not found APIs to implement the requested add-on, elaborate alternative approaches with the developer. Creating a custom Experiment should be avoided at all costs.
3. **Generate code:**
   Before providing code to the developer, verify ALL of these:
    - [ ] Consulted official API documentation - do NOT guess methods or parameters.
    - [ ] NO try-catch blocks for guessing API parameters.
    - [ ] Used 3rd party libraries or API methods for parsing - MINIMIZE manual string parsing or regex.
    - [ ] Used 3rd party libraries are the most recent stable version.
    - [ ] Event listeners registered at file scope (NOT inside init function).
    - [ ] VENDOR.md includes ALL dependencies with exact version (!) URLs (not to "main", "master" or the most recent one).
    - [ ] Used `browser_specific_settings` (NOT deprecated "applications").
    - [ ] Included proper error handling.
    - [ ] Has comments explaining the approach.
    - [ ] Add-on is not using hardcoded user-facing strings, but is localized through the i18n API.
    - [ ] Make sure that if a `_locales` folder was added to the project, that there is a `default_locale` manifest entry, as shown in the [i18n API example](https://github.com/thunderbird/webext-examples/tree/master/manifest_v3/i18n).
    - [ ] Add-on fulfills all the requirements listed in the "Add-on Review Requirements" section.
    - [ ] All the guidelines introduced in the "Important Guidelines for AI Assistants" section are followed to the letter.
    - [ ] All instructions given in the "Instructions" section are followed to the letter.
    - [ ] Make sure that the ID used in the manifest is unique, either use a `{UUID}`-styled ID, or `<something>@<developer-handle>.thunderbird.local`.
    - [ ] Make sure that the manifest is using a `strict_max_version` entry to limit the add-on to the current ESR (fetch https://webextension-api.thunderbird.net/en/esr-mv3/ to get the major version, then use format `"<major>.*"`), if it uses any Experiments.
    If ANY checkbox is unchecked, DO NOT provide the code. Fix it first.
4. **Mandatory 3rd Party Library Audit (MUST be performed for each included library)**
    For EACH 3rd party library included in the project:
    - [ ] Inspect the actual file to determine the export type:
          - **ES6 default export:** Look for `export default` or `export { something as default }` at the end of the file → use `import LibName from "./lib/file.js"`
          - **ES6 named exports:** Look for `export { name1, name2 }` or `export const/function` → use `import { name1, name2 } from "./lib/file.js"`
          - **UMD/IIFE (no ES6 exports):** Look for `(function(root, factory)` or assignments to `window`/`globalThis` → try to find ES6 version or load via scripts tag in `manifest.json`.
    - [ ] Always prefer the minified module version.
    - [ ] Output a library audit table:
          | Library | File | Module Type | Import Statement |
          |---------|------|-------------|------------------|
          | ical.js | lib/ical.js | ES6 default | `import ICAL from "./lib/ical.js"` |
          | somelib | lib/somelib.mjs | ES6 named | `import { parse } from "./lib/somelib.mjs"` |
    - [ ] Update VENDOR.md with the correct file path and version URL.
5. **Mandatory API Audit (MUST be performed before finalizing the project)**
    - [ ] List all used API methods (including APIs like storage, i18n, runtime, accounts, messages).
    - [ ] For EACH API method, fetch its direct documentation page via `https://webextension-api.thunderbird.net/en/mv3/<api-name>.html` - or parse the [base page](https://webextension-api.thunderbird.net/en/mv3/) for the correct API link.
    - [ ] For EACH API method, verify:
          - **Parameters:** Correct parameter names and types
          - **Return type:** The actual type returned by the Promise (not just "Promise")
          - **Access pattern:** How to extract data from the return value (especially for wrapped types)
          - **Required permission:** What permission is needed in manifest.json
    - [ ] Output an API audit table showing:
          | API Method | Returns | Access Pattern | Required Permission |
          |------------|---------|----------------|---------------------|
          | browser.messageDisplay.getDisplayedMessages() | MessageList | `result.messages[0]` | messagesRead |
          | browser.messages.getHeaders() | HeadersDictionary | `result["header-name"][0]` | messagesRead |
          | browser.messages.getFull() | MessagePart | `result.headers["header-name"][0]` | messagesRead |
          | browser.mailTabs.query() | array of MailTab | `result[0]` | (none) |
          | browser.tabs.query() | array of Tab | `result[0]` | (none) |
          | browser.storage.session.get | object | `result.keyName` | storage |
          | browser.i18n.getMessage | string | direct | (none) |
    - [ ] Pay special attention to APIs that return **wrapped objects** vs **direct arrays**:
          - `MessageList` has a `.messages` array property - do NOT destructure directly
          - `HeadersDictionary` uses lowercase keys and array values - access via `headers["header-name"][0]`
    - [ ] Only after completing this table, update the permissions entry in manifest.json to include ALL required permissions.
6. **Provide guidance:**
   - Inform developer about the next steps mentioned in the "Review Process Tips" section.

**Remember:** The goal is maintainable, reviewable code that other developers can learn from!
