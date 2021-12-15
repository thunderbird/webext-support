## Objective

Use this API to extract the IMAP UID from a message.


## Usage

To use the ImapTools API, add the two API files (`schema.json` and `implementation.js`) to your add-on and specify their location by adding and adjusting the following to your `manifest.json` file:

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
