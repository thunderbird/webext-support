## About

Convenient wrapper function for handling `MessageLists` and the pagination mechanism, simplifying the process of looping over messages:

```javascript
import { getMessageIterator } from "messageLists.mjs"

let messageIterator = getMessageIterator(messenger.messages.list(folder));
for await (let message of messageIterator) {
    // Do something with the message.
    let full = await messenger.messages.getFull(message.id);
}
```


