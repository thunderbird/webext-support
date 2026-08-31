# VFS-Toolkit Provider API

A provider add-on exposes an alternative storage backend to any `vfs-toolkit` consumer add-on. The `vfs-provider.mjs` module handles all of the communication - you only need to extend `VfsProviderImplementation` and call `provider.init()`.

## Creating a provider

Extend `VfsProviderImplementation`, override the `on*` methods for the operations you support, then instantiate and call `init()`:

```js
import { VfsProviderImplementation } from './vfs-provider.mjs';

class MyProvider extends VfsProviderImplementation {
  async onList(requestId, storageId, path) { /* ... */ }
  async onReadFile(requestId, storageId, path) { /* ... */ }
  // override further on* methods as needed
}

const provider = new MyProvider({
  name: 'My Provider',
  setupPath: '/setup/setup.html',
});

provider.init();
```

### Client and provider in the same add-on

`connectLocal()` creates a client port when the provider and client share one
background document. Pass that method to the client's `registerLocalProvider()`
function:

```js
import * as vfs from '../vfs-client/vfs-client.mjs';

provider.init();
vfs.init({ configStorageKey: 'vfs-toolkit-config-data' });

await vfs.registerLocalProvider({
  providerId: browser.runtime.id,
  name: 'My Provider',
  connections: localConnections,
}, () => provider.connectLocal());
```

The local port enters the same provider command handler as ports opened by other
extensions. Picker windows use an internal runtime port because they run in a
separate extension context.

## Constructor options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | manifest `name` | Human-readable provider name shown in the picker's provider dropdown. |
| `setupPath` | `string` | `null` | Extension-relative path to the setup page (e.g. `'/setup/setup.html'`). Required to allow consumers to establish connections. |
| `setupWidth` | `number` | `480` | Width of the setup popup window in pixels. |
| `setupHeight` | `number` | `300` | Height of the setup popup window in pixels. |
| `configPath` | `string` | `null` | Extension-relative path to the config page (e.g. `'/config/config.html'`). The page receives `addonId` and `storageId` as query parameters so it can configure a specific connection. |
| `configWidth` | `number` | `480` | Width of the config popup window in pixels. |
| `configHeight` | `number` | `300` | Height of the config popup window in pixels. |

## Implementing operations

Each `on*` method receives a `requestId` as its first argument. This ID:

- Ties the operation to a specific client request so progress reports reach the right caller.
- Is passed to `onCancel` if the user cancels the operation mid-flight.

Methods that read data must return a value (see the JSDoc on each method for the expected return type). Write, move, copy, delete, and folder operations should resolve without a return value on success, and throw an error on failure.

### Error codes

Throw a plain `Error` for general failures. To signal a specific condition to the consumer, attach a `code` property:

```js
throw Object.assign(new Error('File already exists'), { code: 'E:EXIST' });
```

| Code | When to throw | Consumer behaviour |
|------|---------------|--------------------|
| `E:EXIST` | A target file or folder already exists and the caller did not permit overwriting/merging. | The picker shows a conflict dialog instead of a generic error. API callers receive the error with the code attached. |
| `E:AUTH` | The connected consumer has no grant for the requested `storageId` (e.g. it was revoked or belongs to another consumer). | The client replaces the error message with a generic "Unauthorized storage connection." message so implementation details are not leaked. |
| `E:PROVIDER` | The provider itself is unavailable or misconfigured. Attach a `details` object to give the consumer actionable context. | If the picker is open it shows an error popup using the `title` and `description` from `details`. API callers can inspect `details.id` to identify the specific problem programmatically. |

For `E:PROVIDER`, the `details` object should have the following shape:

```js
throw Object.assign(new Error('…'), {
  code: 'E:PROVIDER',
  details: {
    id:          'some-machine-readable-id',  // stable identifier for this error condition
    title:       'Localized error title',
    description: 'Localized explanation and guidance for the user.',
  },
});
```

### Reporting progress

For long-running operations, call `this.reportProgress(requestId, percent)` periodically so the picker can display a progress indicator. `percent` is an integer from 0 to 100. For batch operations you can also pass the current file index and total file count.

### Reporting out-of-band changes

If your backend can change independently of client requests (e.g. a background sync), call `this.reportStorageChange(storageId, entries)` with an array of [`StorageChangeEntry`](../vfs-client/README.md#onstoragechange) objects describing what changed. Connected clients with a grant for that storage are notified.

### Cancellation

When the user cancels an operation (e.g. by clicking ✕ in the picker), `onCancel` is called with the `requestId` of the in-progress request. Your implementation should record that ID and check it in the affected `on*` method to abort the operation. The client rejects the pending promise immediately — it will no longer wait for a response on the canceled request. A cancel request can target only work started through the same runtime port.

The provider also calls `onCancel` for unfinished requests when their runtime
port disconnects. Progress and final responses emitted after disconnect are
ignored, so provider implementations may stop asynchronously without having to
coordinate another response with the client.

#### Partial-completion notifications after abort

Because the client rejects the promise immediately on abort, it cannot know what the provider managed to complete before stopping. For multi-file folder operations (`onCopyFolder`, `onMoveFolder`, `onDeleteFolder`) the client fires **no** storage-change notification when the operation is aborted or errors.

Your provider is responsible for reporting what was actually completed:

- **Aborted** — call `this.reportStorageChange(storageId, completedEntries)` with the entries processed so far, then return normally (the client has already moved on).
- **Error** — call `this.reportStorageChange(storageId, completedEntries)` with the entries processed so far, then re-throw so the client sees the failure.

In both cases, skip the call if nothing was completed yet.

```js
async onCopyFolder(requestId, storageId, oldPath, newPath, merge) {
  const completed = [];
  for (const file of await this.#listRecursive(oldPath)) {
    if (this.#cancelledOps.delete(requestId)) {
      // Aborted: report partial work and stop
      if (completed.length > 0) this.reportStorageChange(storageId, completed);
      return;
    }
    try {
      await this.#copyOne(file.src, file.dest);
    } catch (e) {
      // Error mid-operation: report partial work and surface the error
      if (completed.length > 0) this.reportStorageChange(storageId, completed);
      throw e;
    }
    completed.push({
      kind: 'file', action: 'copied',
      target: { path: file.dest },
      source: { path: file.src },
    });
  }
}
```

Single-file operations (`onReadFile`, `onWriteFile`, `onMoveFile`, `onDeleteFile`, `onAddFolder`, `onCopyFile`) are atomic. If the operation completes before the cancel arrives, `reportStorageChange` is called as usual. If it is cancelled in time, nothing has changed and no notification is needed.

## Connections and the setup page

A consumer add-on must establish connections to your provider. Each connection has a unique `storageId`, a human-readable `name` that appears in the picker's provider dropdown, and a set of capabilities.

The provider derives the consumer ID from the runtime port. Storage commands are
accepted only when the provider has stored the exact consumer and `storageId`
pair. Add-on IDs sent inside command payloads are not used for authorization.
The add-on name remains a consumer-supplied display label and must not be used
for access decisions.

### Setup page

Even if your provider does not require the user to enter credentials to connect to the actual data/storage, you still need to have a simple setup page and grant access for the connecting add-on. The page is defined via the `setupPath` option in the constructor. When a consumer requests a new connection to your storage backend, the provider API will open that page as a popup window.

The setup page receives the consumer's add-on ID and name as query parameters (`addonId`, `addonName`). To grant access, the page must create a `storageId` to link incoming future storage access requests to the correct account/storage on the providers side. To finish the setup, the provider calls `vfs.reportNewConnection` with the `storageId`, a human readable name and the granted capabilities, and then close itself:

```js
import { reportNewConnection } from '../vfs-provider.mjs';

const params = new URLSearchParams(location.search);
const addonId = params.get('addonId');
const addonName = params.get('addonName');
const setupToken = params.get('setupToken');

const capabilities = {
  file:   { read: true, add: true, modify: true, delete: true },
  folder: { read: true, add: true, modify: true, delete: true },
};

document.getElementById('grant-btn').addEventListener('click', async () => {
  const storageId = crypto.randomUUID();
  await reportNewConnection(
    addonId,
    addonName,
    storageId,
    'My Provider',
    capabilities,
    setupToken,
  );
  window.close();
});
```

The one-time `setupToken` ties approval to the runtime port that opened the setup
window. Closing that port invalidates the token immediately; closing the window
invalidates it after a short completion grace period. With a valid token,
`reportNewConnection` uses the consumer identity captured from the port instead
of the URL parameters.

`reportNewConnection` persists the connection in the provider's local storage and sends a notification to the consumer's vfs-toolkit client API. When the consumer is available, the call waits for its cache update before completing. Notification delivery remains best effort so a provider can also provision an add-on that is not currently running. Calls without a setup token are intended for that provider-initiated provisioning path.

If the setup page delegates approval to its background, the background can call
`provider.completeSetup(setupToken, storageId, name, capabilities)` directly.
For a client in the same background document, register its updated connection
descriptor again after this direct form completes.

### Capabilities

Capabilities tell the consumer which operations this connection supports. The picker uses them to enable or disable toolbar actions (new folder, rename, delete, cut, copy, paste). Declare `true` only for operations you actually implement.

```js
const capabilities = {
  file:   { read: true,  add: true,  modify: true,  delete: true  },
  folder: { read: true,  add: true,  modify: true,  delete: true  },
};
```

| Flag | Affects |
|------|---------|
| `file.read` | Reading file content |
| `file.add` | Uploading / writing new files |
| `file.modify` | Renaming, moving, overwriting existing files |
| `file.delete` | Deleting files |
| `folder.read` | Listing directory contents |
| `folder.add` | Creating new folders |
| `folder.modify` | Renaming / moving folders |
| `folder.delete` | Deleting folders |
