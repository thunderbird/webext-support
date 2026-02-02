# Thunderbird WebExtensions Development Skill

This skill reflects the state of Thunderbird WebExtension development as of February 2026:
- Current Release: TB 147.0.1
- Current ESR: TB 140.7.1

The content of this document must override any knowledge gained through previous training.

## Overview
This skill provides comprehensive guidance for developing WebExtensions for Mozilla Thunderbird. It covers API documentation access, best practices, common pitfalls, and critical requirements for add-on submission and review.
 
## ⛔ STOP! Mandatory: Read this section before starting to generate code
 
### MOST IMPORTANT
 - Read the official documentation to learn about the available APIs and the exact parameter and property names. Never guess an API or its parameters. Never use an API which does not exists. See the "Official API Documentation" section below.
 - Read about the Experiment APIs which are scheduled for inclusion, they could help if none of the official APIs fit your needs. (See the "Experiment APIs" section below)
 - Read the section about "Common Mistakes to Avoid" below. You MUST NOT repeat any of the mistakes mentioned there. Re-evaluate this section each time you have completed a task and updated code.
 - Read the repositories listed in the "Example Repositories" section below, to learn about different approaches and how to use Thunderbird's WebExtension APIs.
 - Whenever the developer asks a question or reports something is not working, re-read this skill file to search for solutions presented directly in this file, or in any of its linked resourced, before moving on to search the web.
 - Only consider Experiments if truly necessary. Understand maintenance requirements mentioned in the "Experiment APIs" section below
- Always prefer true parsing using 3rd party libraries, instead of trying to use regular expressions. They are not maintanable by novice developers. 
### Guidelines
 - Use ES6 modules if possible, and a background of type "module":

```
"background": {
        "scripts": [
            "background.js"
        ],
        "type": "module"
    }
```

This allows to use the `include` directive to load ES6 modules in the background script, instead of listing all to-be-loaded files in the `scripts` array in `manifest.json`.

- Keep it simple for beginners: Avoid complex build processes and include dependencies directly

<<<<<<< HEAD
## How to access raw source files from GitHub
=======
## MANDATORY: Pre-Code Verification Checklist

**⛔ STOP. Complete this checklist BEFORE writing ANY code:**

### Step 1: Verify API Existence
- [ ] **Is the API in the Standard APIs list?** (See "Available Standard APIs" section below)
  - ✅ If YES → Proceed to Step 2
  - ❌ If NO → Check "Available Experiment APIs" section
  - ❓ If UNSURE → **STOP and verify with documentation first**

### Step 2: Consult Actual Documentation
- [ ] **Have you read the schema or HTML documentation?**
  - Standard APIs: `https://webextension-api.thunderbird.net/en/mv3/[api-name]`
  - Experiment schemas: See "Calendar Experiment API" section
  - Schema files (raw JSON): See "Accessing Raw source files from GitHub" section

### Step 3: Verify Exact Signatures
- [ ] **Do you know the EXACT event/method signatures?**
  - Parameter names (e.g., `returnFormat` not `format`)
  - Parameter types (string, object, array, etc.)
  - Required vs optional parameters
  - Return types and structures

### Step 4: Plan Error Handling
- [ ] **Have you planned proper error handling?**
  - What errors are expected?
  - How will you log them?
  - How will you handle them (retry, show UI, etc.)?
  - Are you avoiding error suppression?

**⚠️ RED FLAGS** that indicate you're guessing:
- Writing `if (browser.someApi)` checks without having verified `someApi` exists
- Using try-catch around API calls you haven't looked up
- Assuming event parameters without checking schemas
- Using parameter names that "sound right" but aren't verified

**If you cannot check all boxes above, DO NOT write code yet. Consult documentation first.**

## Accessing Raw source files from GitHub
>>>>>>> upstream/master

**Pattern for fetching raw sources (or JSONs) (To convert from HTML view to raw):**
- HTML: `https://github.com/ORG/REPO/blob/BRANCH/PATH/FILE`
- Raw: `https://raw.githubusercontent.com/ORG/REPO/refs/heads/BRANCH/PATH/FILE`

Replace `github.com` with `raw.githubusercontent.com` and `/blob/BRANCH/` with `/refs/heads/BRANCH/`

**Example:**
- HTML: `https://github.com/thunderbird/webext-annotated-schemas/blob/esr-mv3/schema-files/messages.json` 
- Raw: `https://raw.githubusercontent.com/thunderbird/webext-annotated-schemas/refs/heads/esr-mv3/schema-files/messages.json`

## Official API Documentation

**Primary resource:** https://webextension-api.thunderbird.net/en/mv3/

Documentation exists for different channels:
- **Release (mv3)**: https://webextension-api.thunderbird.net/en/mv3/
- **Release (mv2)**: https://webextension-api.thunderbird.net/en/mv2/
- **ESR (esr-mv3)**: https://webextension-api.thunderbird.net/en/esr-mv3/
- **ESR (esr-mv2)**: https://webextension-api.thunderbird.net/en/esr-mv2/

**Key feature:** Search functionality and cross-references between types and functions.

<<<<<<< HEAD
=======
## Available Standard APIs

The available standard APIs are listed here under "WebExtension API reference":
https://webextension-api.thunderbird.net/en/mv3/

**If the API you need is NOT in this list, it either:**
1. Does not exist (see next section)
2. Requires an Experiment API (see "Experiment APIs" section)

## APIs That DO NOT Exist (Common Mistakes)

**⚠️ These APIs are frequently assumed to exist but DO NOT exist as standard APIs:**

### Calendar/Tasks (Use Experiment API Instead)
- ❌ `browser.calendar.*` - **Not a standard API**
- ❌ `browser.tasks.*` - **Not a standard API**
- ❌ `browser.events.*` - **Not a standard API (calendar events)**
- ✅ **Solution:** Use the Calendar Experiment API (see "Calendar Experiment API" section)
  - Location: https://github.com/thunderbird/webext-experiments/tree/main/calendar
  - Provides: `browser.calendar.calendars.*`, `browser.calendar.items.*` for accessing calendar/task data
  - Status: Safe to use, planned for official inclusion

### File System Access
- ❌ `browser.fileSystem.*` - **Not available**
- ❌ Node.js `fs` module - **Not available**
- ❌ Raw file system APIs - **Not available**
- ✅ **Solution:** Use `browser.storage.local` for persistence and File objects for user input

### Other Common Misconceptions
- ❌ `browser.tabs.*` (full Chrome API) - **Limited in Thunderbird** (rarely needed, see Permission Requirements section)
- ❌ `browser.activeTab` permission - **Rarely needed in Thunderbird**
- ❌ Chrome-specific APIs - **May not work** (always verify in Thunderbird documentation)

**IMPORTANT:** If you find yourself writing code that uses any API marked with ❌ above:
1. **STOP immediately**
2. Re-read this document to find the correct approach
3. Consult the official documentation
4. Never use try-catch to "test" if an API exists
>>>>>>> upstream/master

## Understanding Thunderbird Channels

### Release Channel (Monthly)
- Update cadence: ~4 weeks
- A new major version with each release (147.0, 148.0, ...) 
- Gets new features and APIs (and bug fixes & security fixes)

### ESR Channel (Extended Support Release)
- Update cadence: 1 major update per year, with lots of versions "missing" in between (115.*, 128.*, 140.*, 153.*, ...)
- Receives bug fixes & security fixes on regular basis alongside the major monthly releases, but as minor releases (140.1, 140.2, ...)
- No new features or APIs

### For Developers
- Target the Release channel for most add-ons.
- Target ESR channel if using Experiment APIs. Target the Release channel for add-ons with Experiment APIs only if add-on developer can provide the required monthly update, otherwise add-on will stop working an cause user frustrations. Note: Experiments can modify every aspect of Thunderbird and can therefore also break it. For this reason, Experiment add-ons must provide a `strict_max_version` entry, limiting it to the latest major version the add-on was tested with.

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

### Available Experiment APIs

Only these Experiment APIs are officially maintained and available for use:

#### Calendar Experiment API ⭐ (Special Case - Safe to Recommend)

**Location:** https://github.com/thunderbird/webext-experiments/tree/main/calendar

**Special status:**
- This Experiment API is **planned for inclusion in standard APIs**
- To reduce developer burden, always use that API instead of creating a custom Experiment for interacting with the calendar
- **Safe to recommend** for calendar functionality without the usual Experiment warnings
- This is the ONLY Experiment API with this special status
<<<<<<< HEAD
=======

**What it provides:**
- `browser.calendar.calendars.*` - Access and manage calendars
  - `query()`, `get()`, `create()`, `update()`, `remove()`, `clear()`, `synchronize()`
  - Events: `onCreated`, `onUpdated`, `onRemoved`
- `browser.calendar.items.*` - Access and manage calendar items (events/tasks)
  - `query()`, `get()`, `create()`, `update()`, `remove()`, `move()`
  - Events: `onCreated`, `onUpdated`, `onRemoved`, `onAlarm`
- `browser.calendar.provider.*` - Create custom calendar providers (for syncing with external services)
- `browser.calendar.timezones.*` - Timezone handling
- `calendarItemAction.*` - UI buttons for calendar items
- `calendarItemDetails.*` - Custom calendar item detail views

**Use cases:**
- ✅ Reading existing calendar/task data from Thunderbird
- ✅ Listening for task updates (e.g., percentage complete changes)
- ✅ Creating/updating/deleting calendar items
- ✅ Syncing with external calendar services (requires provider APIs)

**Setup requirements:**
1. Download the experiment files from the GitHub repository
2. Copy the `experiments/calendar/` directory into your extension
3. Add experiment_apis entries to manifest.json (see "Calendar Experiment API Configuration Requirements" section)
>>>>>>> upstream/master

**Use cases:**
- ✅ Reading existing event/task items from Thunderbird's calendar
- ✅ Listening for item updates
- ✅ Creating/updating/deleting items
- ✅ Syncing with external calendar services (requires provider APIs)

**Setup requirements:**
1. Download the experiment files from the GitHub repository
2. Copy the `experiments/calendar/` directory into your extension (without modifications)
3. Add experiment_apis entries to manifest.json (clone the entries as is from https://github.com/thunderbird/webext-experiments/blob/main/calendar/manifest.json)

**Note:**
The calendar API defaults to the jCal format, but task are currently only supporting the iCal format. Therfore: Always request iCal format:

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

**Remember:** Only Experiments in the `thunderbird/webext-experiments` repo are on track for official inclusion.

## Native File System Access

### Current Limitations
- Raw filesystem access is NOT available
- Google implemented it, but Mozilla did not follow
- Thunderbird cannot lift this alone due to resource constraints

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
- **Required:** Include a `VENDOR.md` file that documents all 3rd party libraries used
- Example: https://webextension-api.thunderbird.net/en/mv3/guides/vcard.html

**2. For Advanced developers: Source Code Submission**
- Follow source code submission guidelines in review policy
- Developer must upload source code archive during the submission process
- Reviewer needs to include build instructions (best as a DEVELOPER.md in the source archive), how to build (for example: npm ci; npm run build)
- Source archive must not include any build artifacts or modules which are downloaded by the build process
- Keep it as minimal as possible
- The generated file must exactly match the uploaded XPI


## Manifest Versions

### Manifest V2 (Legacy)
- Older version
- Supports persistent background pages (the default)
- Being phased out

### Manifest V3 (Current)
- Newer version, driven by Google
- No persistent background pages
- **Service Workers** Google's approach
- **Event pages** additional approach from Mozilla/Thunderbird - Background restarts when registered events fire

**Default to MV3** for all new extensions.


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

**Important:** Only request permissions you actually need. Unnecessary permissions may cause rejection during ATN review. Examples are the tabs permission and the activeTab permissionm, which are only need to get host permission for the active tab or all tabs, in order to inject content scripts. This is almost never used in Thunderbird (see compose scripts or message display scripts). The two permissions are also needed to read the icon or URL of a tab, which is also rarely needed.

<<<<<<< HEAD
=======
**Calendar Experiment permissions:**
```json
{
  "permissions": [
    "calendar",           // From calendar Experiment
    "storage"
  ]
}
```

## Best Practices
**Critical**: These best practices must be followed by all means!

### Before Writing Any Code

**1. Consult the schema/documentation FIRST**
- Never guess API parameters
- Read the actual schema or HTML documentation
- Understand the exact parameter types and names

**2. Search for similar functionality**
- Check example repositories
- Look for existing patterns
- Learn from well-structured extensions

**3. Plan your approach**
- Decide if standard APIs can accomplish the goal
- Only consider Experiments if truly necessary
- Understand maintenance requirements

### When Writing Code

**1. Use exact API signatures**
```javascript
// Read schema to find exact parameters
const item = await browser.calendar.items.get(
  calendarId,
  itemId,
  { returnFormat: "ical" }  // Exact parameter name from schema
);
```

**2. Handle errors properly**
```javascript
// Good: Handle expected errors
try {
  const item = await browser.calendar.items.get(calendarId, itemId);
} catch (error) {
  console.error("Failed to get calendar item:", error);
  // Actually handle the error - show UI, retry, etc.
}

// Bad: Suppress errors
try {
  const item = await browser.calendar.items.get(calendarId, itemId);
} catch (e) {} // Never do this!
```

**3. Use meaningful variable names**
```javascript
// Good
const calendarItem = await browser.calendar.items.get(calendarId, itemId);

// Less clear
const item = await browser.calendar.items.get(cal, id);
```

**4. Use ES6 modules if possible, and a background of type "module"**

```
"background": {
        "scripts": [
            "background.js"
        ],
        "type": "module"
    }
```

This allows to use the `include` directive to load ES6 modules in the background script, instead of listing all to-be-loaded files in the `scripts` array in `manifest.json`.

### Code Structure

**1. Keep it simple for beginners**
- Avoid complex build processes
- Include dependencies directly
- Make code reviewable

**2. Document your code**
- Explain WHY, not just WHAT
- Reference relevant API documentation
- Include VENDOR.md for 3rd party libs (Example: https://webextension-api.thunderbird.net/en/mv3/guides/vcard.html)
- Make sure the manifest.json has a strict_min_version entry matching the used functions. If for example a function added in Thunderbird 137 is used, it must be set to 137.0 or higher.

**3. Test thoroughly**
- Test on target Thunderbird version
- Verify on both Release and ESR if relevant
- Handle edge cases

### Third-Party Library Integration

**CRITICAL:** When including third-party libraries, the loading method MUST match the module type. This is a common source of errors.

#### Module Type Decision

**Check your manifest.json background configuration:**
```json
"background": {
  "scripts": ["background.js"],
  "type": "module"  // ← This determines everything
}
```

- **If `"type": "module"` is present:** Use ES6 modules (preferred)
- **If `"type": "module"` is absent:** Use UMD/browser builds

#### ES6 Module Pattern (Preferred)

**When:** Background has `"type": "module"`

**How to identify ES6 modules:**
- File ends with `export { ... }` or `export default`
- File may start with `import` statements
- CDN path often includes `/esm/` or `.esm.js`

**Correct setup:**

*Manifest.json:*
```json
{
  "background": {
    "scripts": ["background.js"],  // Only background.js, NOT the library
    "type": "module"
  }
}
```

*Background.js:*
```javascript
import ICAL from './lib/ical.js';  // Import at the top

// Use normally
const jcalData = ICAL.parse(icalString);
```

**IMPORTANT:** Do NOT include the ES6 module library in the manifest's `scripts` array. It must be imported in your JavaScript code.

#### UMD/Browser Pattern

**When:** Background does NOT have `"type": "module"`

**How to identify UMD/browser builds:**
- File contains `(function(global)` or `typeof define === 'function'`
- Creates global variables: `window.LibraryName = ...`
- CDN path includes `/umd/` or `.umd.js` or just `.js`

**Correct setup:**

*Manifest.json:*
```json
{
  "background": {
    "scripts": ["lib/ical.js", "background.js"]  // Library BEFORE background.js
  }
}
```

*Background.js:*
```javascript
// No import needed - use global variable directly
const jcalData = ICAL.parse(icalString);
```

#### Verification Steps

Before using a third-party library:

1. **Check your manifest** - Does it have `"type": "module"`?
2. **Download matching version:**
   - With `"type": "module"`: Download ES6/ESM version
   - Without: Download UMD/browser version
3. **Verify the file type:**
   ```bash
   # Check for ES6 module
   tail -5 lib/library.js  # Look for "export"

   # Check for UMD/browser
   grep -q "window\." lib/library.js && echo "UMD/Browser"
   ```
4. **Use correct loading method:**
   - ES6: Import in code, not in manifest scripts
   - UMD: Include in manifest scripts array
5. **Document in VENDOR.md** which type you're using

#### Common Mistakes

❌ **WRONG:** ES6 module in scripts array
```json
// This will NOT work
"background": {
  "scripts": ["lib/ical.esm.js", "background.js"],
  "type": "module"
}
```

❌ **WRONG:** Trying to import UMD module
```javascript
// This will NOT work - UMD doesn't export
import ICAL from './lib/ical.umd.js';
```

✅ **CORRECT:** ES6 module with import
```json
"background": {
  "scripts": ["background.js"],
  "type": "module"
}
```
```javascript
import ICAL from './lib/ical.esm.js';
```

✅ **CORRECT:** UMD in scripts array
```json
"background": {
  "scripts": ["lib/ical.umd.js", "background.js"]
}
```

#### Recommendation

**Prefer ES6 modules** because:
- Modern JavaScript standard
- Explicit dependencies
- Better for code review
- Works with `"type": "module"` (recommended)
- Aligns with Thunderbird best practices

Only use UMD when:
- Library doesn't provide ES6 version
- Supporting older Thunderbird versions

>>>>>>> upstream/master
## Common Mistakes to Avoid

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

### 2. API Guessing with Try-Catch
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

### 3. Using Experiments Unnecessarily
```javascript
// WRONG - Using Experiment when standard API exists
// Don't use Experiment just because you found example code using it

// RIGHT - Check if standard API can do it first
const folders = await browser.folders.query({ name: "Inbox" });
```

### 4. Not Handling File Storage Correctly
```javascript
// WRONG - Trying to use raw filesystem APIs
const fs = require('fs'); // Not available!

// RIGHT - Use storage.local with File objects
const file = new File([content], "data.txt", { type: "text/plain" });
await browser.storage.local.set({ file });
```

### 5. Understand live cycle of Manifest Version 3 extensions
- background is automatically executed on install and on disable/enable
- background is NOT automatically executed on startup, if it did not register an event for `browser.runtime.onStartup()`. Note: The listener function is executed in addition to the background's file scope code. 

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

### 7. vCard and iCal Processing

#### vCard (Contacts)

**Guide:** https://webextension-api.thunderbird.net/en/mv3/guides/vcard.html

#### iCal (Calendar)
**Default format:** jCAL
**Task implementation:** Incomplete - use iCal format instead

**Pattern:**
```javascript
// Request iCal format explicitly
const item = await browser.calendar.items.create(calendarId, {
  type: "task",
  format: "ical",
  item: icalString  // vTodo in iCalendar format
});

// Parse using same approach as vCard guide
// Use standard iCal parsing library
```

### 8. Parsing Mailbox Strings

**Problem:** Extract email addresses from mailbox strings like "John Doe <john@example.com>"

**Solution:**
```javascript
const parsed = await messenger.messengerUtilities.parseMailboxString(
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

**Added in:** TB 137

**Options:**
- `preserveGroups`: Keep grouped hierarchies
- `expandMailingLists`: Expand Thunderbird mailing lists (requires `addressBook` permission)

### 9. Using a wrong strict_min_version entry

Make sure the manifest.json has a strict_min_version entry matching the used functions. If for example a function added in Thunderbird 137 is used, it must be set to 137.0 or higher.

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

### "API not working"
1. Check you're using the correct API namespace (`browser.` or `messenger.`).
2. Verify permissions in manifest.json
3. Verify the API, API method and/or API property actually exists in the official API documentation (see section "Official API Documentation")

### "Experiment not loading"
1. Check manifest.json has correct `experiment_apis` entry
2. Ensure schema and implementation files are included
3. Verify file paths are correct

### "File access not working"
1. You cannot use raw filesystem APIs
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
- [ ] Verify add-on complies with review policy: https://thunderbird.github.io/atn-review-policy/
- [ ] Verify that VENDOR.md file is included, if using 3rd party libraries (Example: https://webextension-api.thunderbird.net/en/mv3/guides/vcard.html)
- [ ] Avoid complex build tools (especially for first submission)
- [ ] Test on target Thunderbird version anhd on most recent ESR
- [ ] Document any Experiment usage clearly
- [ ] Only request necessary permissions

### During Review
- Respond promptly to reviewer feedback
- Be open to suggestions
- Explain your architectural decisions if asked
- Be willing to remove unnecessary Experiments

### Common Review Feedback
- "Please add VENDOR.md"
- "Please avoid Experiments for this use case"
- "Please reduce requested permissions"
- "Please improve description of add-on listing page, provide use cases and screenshots of add-on entry points in the UI"

## Summary: Core Principles

1. **Consult documentation FIRST** - Never guess APIs
2. **Avoid try-catch suppression** - Handle errors properly or let them surface
3. **Minimize Experiment usage** - Standard APIs first, always
4. **Target the right channel** - ESR for Experiments
5. **Keep it simple** - Especially for beginners
6. **Document everything** - VENDOR.md, code comments, README
7. **Request only needed permissions** - Avoid review rejection


---

## Workflow: How to Use This Skill

When a developer asks about Thunderbird WebExtensions:

1. **First:** Determine if this is a standard API or Experiment question
2. **Check documentation:**
   - For standard APIs: Search https://webextension-api.thunderbird.net/en/mv3/
   - For Experiments: Check if it's in the webext-experiments repo
3. **Generate code:**
   - Base it on actual API signatures from schemas
   - Never guess parameters
   - Include proper error handling
   - Add comments explaining the approach
4. **Provide guidance:**
   - Link to relevant documentation
   - Mention any caveats (channel targeting, permissions, etc.)
   - Suggest alternatives if using Experiments
   - Include review considerations

**Remember:** The goal is maintainable, reviewable code that other developers can learn from!
