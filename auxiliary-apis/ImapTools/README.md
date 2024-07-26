## Objective

Use this API to extract the IMAP UID from a message.

## Usage

Add the [ImapTools API](https://github.com/thunderbird/addon-developer-support/tree/master/auxiliary-apis/ImapTools) to your add-on. Your `manifest.json` needs an entry like this:

```
  "experiment_apis": {
    "ImapTools": {
      "schema": "api/ImapTools/schema.json",
      "parent": {
        "scopes": ["addon_parent"],
        "paths": [["ImapTools"]],
        "script": "api/ImapTools/implementation.js"
      }
    }
  },
```

The API provides a simple function to get the IMAP UID:

### async getImapUID(messageID)

Returns a Promise for the IMAP UID of the message with the WebExtension ID specified in `messageID`.
