## Objective

The Thunderbird team is adding new APIs to Thunderbird Daily and Beta. But not all of them can be backported to the current ESR, because the code base has diverted too much. Specifically the tests for each new feature are problematic. However, we can provide some of the new features as drop-in Experiments, so they can be used before the new ESR has been released.

Currently the following backports are available:

* messenger.messages.listAttachment()
* messenger.messages.getAttachmentFile()

## Usage

To include a backport, add the following to your `manifest.json` :

```
  "experiment_apis": {
    "BackportsMessages": {
      "schema": "messages/schema.json",
      "parent": {
        "scopes": [
          "addon_parent"
        ],
        "script": "messages/implementation.js",
        "paths": [
          [
            "Backports",
            "messages"
          ]
        ]
      }
    }
  }
```

This will map the `BackportsMessages API` to the `messenger.Backports.messages.*` namespace. If further backports are released, they can be mapped to the `messenger.Backports.*` namespace as well.

This is a simple background script to use the backported API:

```
messenger.messageDisplay.onMessageDisplayed.addListener(async (tab, message) => {
    let attachments = await messenger.Backports.messages.listAttachments(message.id);
    for (let att of attachments) {
        console.log(att);
        let file = await messenger.Backports.messages.getAttachmentFile(
          message.id,
          att.partName
        );
        console.log(file);
        let content = await file.text();
        console.log(content);
    }
});
```
