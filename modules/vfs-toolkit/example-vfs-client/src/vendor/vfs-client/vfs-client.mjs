/**
 * vfs-client.mjs - for documentation see README.md.
 */

import * as opfsProvider from './opfs-provider.mjs';

const API_VERSION = "1.0.1";

// ── Internal state ────────────────────────────────────────────────────────────

/** Map<sessionId, { resolve, reject, defaultValue }> */
const pendingPickers = new Map();

// ── External provider port management ────────────────────────────────────────

// Module-level port cache: providerId → { port, pending: Map<id, {resolve,reject}> }
const _providerPorts = new Map();

let _isBackground = false;
let _configStorageKey = null;

// Module-level progress callback map: operationId → onProgress function
const _progressCallbacks = new Map();

// Module-level storage-changed listeners (for same-page provider push notifications)
const _storageChangedListeners = new Set();

// ── Async queue ───────────────────────────────────────────────────────────────

/**
 * Serializes async read-modify-write operations on session storage, preventing
 * race conditions when multiple concurrent callers update the provider list.
 *
 * Operations are executed one at a time in FIFO order. Each call to `push()`
 * either runs immediately (if the queue is idle) or waits until all previously
 * queued operations have completed.
 */
class StorageActivityQueue {
  #queue = [];
  #running = false;

  /**
   * Enqueues an async operation and returns a promise that resolves (or rejects)
   * with the operation's result once it has been executed.
   *
   * @template T
   * @param {() => Promise<T>} fn - The async operation to serialize.
   * @returns {Promise<T>}
   */
  push(fn) {
    return new Promise((resolve, reject) => {
      this.#queue.push(async () => {
        try { resolve(await fn()); }
        catch (e) { reject(e); }
      });
      if (!this.#running) this.#drain();
    });
  }

  /** @returns {Promise<void>} */
  async #drain() {
    this.#running = true;
    while (this.#queue.length > 0) {
      await this.#queue.shift()();
    }
    this.#running = false;
  }
}

const _storageActivityQueue = new StorageActivityQueue();

// Fire local listeners when background broadcasts a storage-changed notification.
browser.runtime.onMessage.addListener(msg => {
  if (msg?.type === 'vfs-storage-changed' && _storageChangedListeners.size > 0) {
    for (const fn of _storageChangedListeners) fn(msg.entries || []);
  }
});

// ── Provider discovery ────────────────────────────────────────────────────────

// These functions are gated by their callers to be only called from within the
// background script. Other pages will be routed through runtime messaging.


// Session storage holds: [{ providerId, name, icon, connections: [{ storageId, name, capabilities }] }]

async function _readProviderList() {
  try {
    return browser.storage.session.get({ [_configStorageKey]: [] })
      .then(rv => rv[_configStorageKey]);
  } catch {
    return [];
  }
}

async function _saveProviderList(list) {
  return browser.storage.session.set({ [_configStorageKey]: list });
}

async function _updateProvider(providerId, name, connections = [], icon = null, hasConfig = false) {
  return _storageActivityQueue.push(async () => {
    const list = await _readProviderList();
    const idx = list.findIndex(p => p.providerId === providerId);
    if (idx >= 0) list[idx] = { providerId, name, connections, icon, hasConfig };
    else list.push({ providerId, name, connections, icon, hasConfig });
    await _saveProviderList(list);
    browser.runtime.sendMessage({ type: 'vfs-provider-updated', providerId, name }).catch(() => { });
  });
}

async function _removeProvider(id) {
  return _storageActivityQueue.push(async () => {
    const list = await _readProviderList();
    await _saveProviderList(list.filter(p => p.providerId !== id));
    browser.runtime.sendMessage({ type: 'vfs-provider-removed', providerId: id }).catch(() => { });
  });
}

async function _removeConnection(providerId, storageId) {
  return _storageActivityQueue.push(async () => {
    const list = await _readProviderList();
    const provider = list.find(p => p.providerId === providerId);
    if (!provider) return;
    provider.connections = provider.connections.filter(c => c.storageId !== storageId);
    await _saveProviderList(list);
    browser.runtime.sendMessage({ type: 'vfs-provider-updated', providerId, name: provider.name }).catch(() => { });
  });
}

async function _addConnection(providerId, storageId, name, capabilities) {
  return _storageActivityQueue.push(async () => {
    const list = await _readProviderList();
    const provider = list.find(p => p.providerId === providerId);
    if (!provider) return;
    const idx = provider.connections.findIndex(c => c.storageId === storageId);
    const conn = { storageId, name, capabilities };
    if (idx >= 0) provider.connections[idx] = conn;
    else provider.connections.push(conn);
    await _saveProviderList(list);
  });
}

async function _probeExtension(id) {
  if (id === browser.runtime.id) return;
  try {
    const response = await browser.runtime.sendMessage(id, { type: 'vfs-toolkit-discover' });
    if (response.API_VERSION) {
      if (response.API_VERSION != API_VERSION) {
        console.warn(`[vfs-toolkit] Provider <${id}> uses API_VERSION ${response.API_VERSION} but this client uses API_VERSION ${API_VERSION}. Make sure all extensions use the most recent version of the VFS Toolkit: https://github.com/thunderbird/webext-support/tree/master/modules/vfs-toolkit`);
      } else if (response?.name) {
        await _updateProvider(id, response.name, response.connections ?? [], response.icon ?? null, response.hasConfig ?? false);
      }
    }
  } catch {
    await _removeProvider(id);
  }
}

/**
 * Enables external storage backend provider support for vfs-toolkit. Call once from
 * your background script.
 *
 * - Probes all currently enabled extensions for `vfs-toolkit` provider, needs the
 *   `management` permission.
 * - Keeps the list in sync as extensions are installed, uninstalled, enabled,
 *   or disabled.
 * - Persists results in session storage, using the provided configStorageKey,
 *   needs the `storage` permission.
 * - Manages communications between providers and clients.
 *
 */
export function enableSupportExternalProviders(options = {}) {
  const bg = browser.extension.getBackgroundPage();
  if (!bg || bg !== window) {
    throw new Error('[vfs-toolkit] enableSupportExternalProviders() must be called from the background script');
  }
  _isBackground = true;

  _configStorageKey = options?.configStorageKey ?? null;
  if (!_configStorageKey) {
    throw new Error("[vfs-toolkit] The client API must be initialized with a configStorageKey.");
  }
  if (typeof browser.management === 'undefined') {
    throw new Error("[vfs-toolkit] The client API needs the management permission to support external providers.");
  };
  browser.management.getAll().then(extensions => {
    for (const ext of extensions) {
      if (ext.enabled) _probeExtension(ext.id);
    }
  });

  browser.management.onInstalled.addListener(ext => _probeExtension(ext.id));
  browser.management.onEnabled.addListener(ext => _probeExtension(ext.id));
  browser.management.onDisabled.addListener(ext => _removeProvider(ext.id));
  browser.management.onUninstalled.addListener(ext => _removeProvider(ext.id));

  browser.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'vfs-toolkit-get-connections') {
      _readProviderList().then(list =>
        sendResponse(list.map(p => ({
          providerId: p.providerId,
          name: p.name,
          icon: p.icon ?? null,
          hasConfig: p.hasConfig ?? false,
          connections: (p.connections ?? []).map(c => ({
            storageRef: { providerId: p.providerId, storageId: c.storageId },
            name: c.name,
            capabilities: c.capabilities,
          })),
        })))
      );
      return true;
    }
    // Relay vfs-storage-changed notifications to all clients.
    if (msg?.type === 'vfs-notify-background-storage-changed') {
      browser.runtime.sendMessage({ type: 'vfs-storage-changed', entries: msg.entries }).catch(() => { });
    }
  });

  // Listen for providers reporting new or removed connections.
  browser.runtime.onMessageExternal.addListener((msg, sender) => {
    if (msg?.type === 'vfs-toolkit-add-connection' || msg?.type === 'vfs-toolkit-remove-connection') {
      // Only accept messages from known providers.
      _readProviderList().then(list => {
        if (!list.some(p => p.providerId === sender.id)) return;
        switch (msg.type) {
          case 'vfs-toolkit-add-connection':
            // New connections are picked up automatically when the user next opens the
            // provider dropdown - no broadcast needed.
            _addConnection(sender.id, msg.storageId, msg.name, msg.capabilities);
            break;
          case 'vfs-toolkit-remove-connection':
            // Removed connections must be broadcast immediately so that any picker
            // currently showing the removed connection can switch away from it.
            _removeConnection(sender.id, msg.storageId).then(() => {
              browser.runtime.sendMessage({ type: 'vfs-remove-connection', providerId: sender.id, storageId: msg.storageId }).catch(() => { });
            });
            break;
        }
      });
    }
  });
}

/**
 * Fetches all known providers and their established connections.
 * Reads session storage directly when called from the background script,
 * sends a runtime message to the background otherwise.
 *
 * @returns {Promise<Array<{providerId: string, name: string, connections: Array<{storageRef: StorageRef, name: string, capabilities: object}>}>>}
 */
export async function fetchProviderConnections() {
  if (_isBackground) {
    return _readProviderList().then(list =>
      list.map(p => ({
        providerId: p.providerId,
        name: p.name,
        icon: p.icon ?? null,
        hasConfig: p.hasConfig ?? false,
        connections: (p.connections ?? []).map(c => ({
          storageRef: { providerId: p.providerId, storageId: c.storageId },
          name: c.name,
          capabilities: c.capabilities,
        })),
      }))
    );
  }
  try {
    return await browser.runtime.sendMessage({ type: 'vfs-toolkit-get-connections' }) ?? [];
  } catch {
    return [];
  }
}

/**
 * Asks the provider to open its setup page as a popup window.
 * Returns immediately, connection is established asynchronously via reportNewConnection().
 *
 * @param {string} providerId
 * @param {string} [addonName]
 */
export async function openProviderSetup(providerId, addonName = '') {
  const addonId = browser.runtime.id;
  return _providerSend(providerId, 'openSetup', { addonId, addonName });
}

/**
 * Asks the provider to open its config page as a popup window.
 *
 * @param {string} providerId
 */
export async function openProviderConfig(providerId) {
  return _providerSend(providerId, 'openConfig', {});
}

/**
 * Asks the provider to delete a connection, then removes it from the client's
 * session storage on success.
 *
 * @param {StorageRef} storageRef
 */
export async function deleteProviderConnection(storageRef) {
  const { providerId, storageId } = storageRef;
  const addonId = browser.runtime.id;
  await _providerSend(providerId, 'deleteConnection', { storageId, addonId });
}

/**
 * Subscribe to storage-changed notifications pushed by an external provider.
 * Called in the same execution context as the port, so `browser.runtime.sendMessage`
 * would not loop back to the same page - this callback is the reliable alternative.
 *
 * @param {function(string[]): void} fn - Receives the array of affected paths.
 * @returns {function} Unsubscribe function.
 */
export function onStorageChanged(fn) {
  _storageChangedListeners.add(fn);
  return () => _storageChangedListeners.delete(fn);
}

function _getProviderPort(providerId) {
  if (_providerPorts.has(providerId)) return _providerPorts.get(providerId);
  const port = browser.runtime.connect(providerId, { name: 'vfs-toolkit' });
  const pending = new Map();
  port.onMessage.addListener(msg => {
    if (msg.type === 'vfs-progress') {
      _progressCallbacks.get(msg.requestId)?.({
        percent: msg.percent,
        currentFile: msg.currentFile,
        totalFiles: msg.totalFiles,
      });
    } else if (msg.requestId && pending.has(msg.requestId)) {
      const { resolve, reject } = pending.get(msg.requestId);
      pending.delete(msg.requestId);
      _progressCallbacks.delete(msg.requestId);
      if (msg.ok) {
        resolve(msg.result);
      } else {
        const e = new Error(
          msg.errorCode === 'E:AUTH'
          ? 'Unauthorized storage connection.' 
          : msg.error
        );
        if (msg.errorCode) e.code = msg.errorCode;
        if (msg.errorDetails) e.details = msg.errorDetails;
        reject(e);
      }
    } else if (msg.type === 'vfs-storage-changed') {
      // We got a storage changed notification from a provider. Relay the message
      // back to the background and have it beeing broadcasted to all active clients.
      const entries = (msg.paths || []).map(path => ({ path, storageRef: { providerId, storageId: msg.storageId ?? null } }));
      browser.runtime.sendMessage({ type: 'vfs-notify-background-storage-changed', entries }).catch(() => { });
    }
  });
  port.onDisconnect.addListener(() => {
    _providerPorts.delete(providerId);
    for (const { reject } of pending.values()) {
      reject(new Error('Provider disconnected'));
    }
    pending.clear();
  });
  const entry = { port, pending };
  _providerPorts.set(providerId, entry);
  return entry;
}

async function _providerSend(providerId, cmd, args = {}, onProgress) {
  const { port, pending } = _getProviderPort(providerId);
  const requestId = crypto.randomUUID();
  if (onProgress) _progressCallbacks.set(requestId, onProgress);
  return new Promise((resolve, reject) => {
    pending.set(requestId, { resolve, reject });
    port.postMessage({ requestId, cmd, ...args });
  });
}

/**
 * Cancels all pending operations for an external provider.
 * Rejects their promises immediately with AbortError and sends a cancel
 * notification to the provider so it can abort early.
 * Has no effect for the built-in OPFS provider (use _cancelRequested instead).
 *
 * @param {StorageRef} storageRef
 */
export function abort(storageRef) {
  if (!storageRef) return;
  const { providerId } = storageRef;
  const entry = _providerPorts.get(providerId);
  if (!entry) return;
  const { port, pending } = entry;
  for (const [requestId, { reject }] of pending) {
    port.postMessage({ cmd: 'cancel', canceledRequestId: requestId });
    _progressCallbacks.delete(requestId);
    reject(new DOMException('Cancelled', 'AbortError'));
  }
  pending.clear();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * @typedef {null|{providerId: string, storageId: string}} StorageRef
 * Identifies a storage connection. `null` refers to the built-in OPFS backend.
 */

/**
 * @typedef {object} Entry
 * @property {string} path - Absolute path, e.g. "/documents/notes.txt"
 * @property {StorageRef} [storageRef] - null = built-in OPFS, otherwise identifies the external provider and storage slot.
 */

/**
 * Lists the contents of a directory.
 *
 * @param {Entry} [entry={path:'/'}]
 * @returns {Promise<Entry[]>} - Each item includes `name`, `kind`, `storageRef`, and (for files) `size` and `lastModified`.
 */
export async function list(entry = {}, options = {}) {
  const { path = '/', storageRef = null } = entry;
  const { providerId, storageId } = storageRef ?? {};
  const { onProgress } = options;
  const items = storageRef
    ? await _providerSend(providerId, 'list', { path, storageId }, onProgress)
    : await opfsProvider.list(path, onProgress);
  return items.map(item => ({ ...item, storageRef }));
}

/**
 * Reads a file and returns a File object.
 *
 * @param {Entry} entry
 * @param {object} [options={}]
 * @param {Function} [options.onProgress]
 * @returns {Promise<File>}
 */
export async function readFile(entry, options = {}) {
  const { path, storageRef = null } = entry;
  const { providerId, storageId } = storageRef ?? {};
  const { onProgress } = options;
  if (!storageRef) {
    return opfsProvider.readFile(path, onProgress);
  }
  return _providerSend(providerId, 'readFile', { path, storageId }, onProgress);
}

/**
 * Writes a File or Blob to the given path.
 * Creates intermediate directories as needed.
 *
 * @param {Entry} entry
 * @param {File|Blob} fileOrBlob
 * @param {object} [options={}]
 * @param {Function} [options.onProgress]
 * @param {boolean} [options.overwrite=false] - When `true`, silently overwrites an existing file.
 * @returns {Promise<void>}
 */
export async function writeFile(entry, fileOrBlob, options = {}) {
  const { path, storageRef = null } = entry;
  const { providerId, storageId } = storageRef ?? {};
  const { onProgress, overwrite = false } = options;
  if (!storageRef) {
    await opfsProvider.writeFile(path, fileOrBlob, onProgress, { overwrite });
  } else {
    await _providerSend(providerId, 'writeFile', { path, file: fileOrBlob, overwrite, storageId }, onProgress);
  }
  _notifyStorageChanged({ path, storageRef });
}

/**
 * Moves (or renames) a file. Throws if the target already exists.
 *
 * @param {Entry} from - Source entry
 * @param {string} toPath - Absolute destination path (same provider as `from`)
 * @param {object} [options={}]
 * @param {Function} [options.onProgress]
 * @returns {Promise<void>}
 */
export async function moveFile(from, toPath, options = {}) {
  const { path: oldPath, storageRef = null } = from;
  const { providerId, storageId } = storageRef ?? {};
  const { onProgress, overwrite = false } = options;
  if (!storageRef) {
    await opfsProvider.moveFile(oldPath, toPath, onProgress, { overwrite });
  } else {
    await _providerSend(providerId, 'moveFile', { oldPath, newPath: toPath, overwrite, storageId }, onProgress);
  }
  _notifyStorageChanged({ path: oldPath, storageRef }, { path: toPath, storageRef });
}

/**
 * Deletes a file. Silent (no error) if the file does not exist.
 *
 * @param {Entry} entry
 * @param {object} [options={}]
 * @param {Function} [options.onProgress]
 * @returns {Promise<void>}
 */
export async function deleteFile(entry, options = {}) {
  const { path, storageRef = null } = entry;
  const { providerId, storageId } = storageRef ?? {};
  const { onProgress } = options;
  if (!storageRef) {
    await opfsProvider.deleteEntry(path, onProgress);
  } else {
    await _providerSend(providerId, 'deleteFile', { path, storageId }, onProgress);
  }
  _notifyStorageChanged({ path, storageRef });
}

/**
 * Creates a folder and all intermediate folders.
 * **Throws** an `E:EXIST` error if the folder already exists.
 *
 * @param {Entry} entry
 * @returns {Promise<void>}
 */
export async function addFolder(entry, options = {}) {
  const { path, storageRef = null } = entry;
  const { providerId, storageId } = storageRef ?? {};
  const { onProgress } = options;
  if (!storageRef) {
    await opfsProvider.addFolder(path, onProgress);
  } else {
    await _providerSend(providerId, 'addFolder', { path, storageId }, onProgress);
  }
  _notifyStorageChanged({ path, storageRef });
}

/**
 * Moves (or renames) a folder to an exact new path.
 * Throws if the target already exists.
 *
 * @param {Entry} from - Source entry
 * @param {string} toPath - Absolute destination path (same provider as `from`)
 * @param {object} [options={}]
 * @param {Function} [options.onProgress]
 * @returns {Promise<void>}
 */
export async function moveFolder(from, toPath, options = {}) {
  const { path, storageRef = null } = from;
  const { providerId, storageId } = storageRef ?? {};
  const { onProgress, merge = false } = options;
  if (!storageRef) {
    await opfsProvider.moveFolder(path, toPath, onProgress, { merge });
  } else {
    await _providerSend(providerId, 'moveFolder', { oldPath: path, newPath: toPath, merge, storageId }, onProgress);
  }
  _notifyStorageChanged({ path, storageRef }, { path: toPath, storageRef });
}

/**
 * Deletes a folder and all its contents recursively. Silent if not found.
 *
 * @param {Entry} entry
 * @param {object} [options={}]
 * @param {Function} [options.onProgress]
 * @returns {Promise<void>}
 */
export async function deleteFolder(entry, options = {}) {
  const { path, storageRef = null } = entry;
  const { providerId, storageId } = storageRef ?? {};
  const { onProgress } = options;
  if (!storageRef) {
    await opfsProvider.deleteEntry(path, onProgress);
  } else {
    await _providerSend(providerId, 'deleteFolder', { path, storageId }, onProgress);
  }
  _notifyStorageChanged({ path, storageRef });
}

/**
 * Copies a file to an exact destination path. Throws if the destination already exists.
 *
 * @param {Entry} from
 * @param {string} toPath - Absolute destination path (same provider as `from`)
 * @param {object} [options={}]
 * @param {Function} [options.onProgress]
 * @returns {Promise<void>}
 */
export async function copyFile(from, toPath, options = {}) {
  const { path, storageRef = null } = from;
  const { providerId, storageId } = storageRef ?? {};
  const { onProgress, overwrite = false } = options;
  if (!storageRef) {
    await opfsProvider.copyFile(path, toPath, onProgress, { overwrite });
  } else {
    await _providerSend(providerId, 'copyFile', { oldPath: path, newPath: toPath, overwrite, storageId }, onProgress);
  }
  _notifyStorageChanged({ path: toPath, storageRef });
}

/**
 * Recursively copies a folder to an exact destination path. Throws if the destination already exists.
 *
 * @param {Entry} from
 * @param {string} toPath - Absolute destination path (same provider as `from`)
 * @param {object} [options={}]
 * @param {Function} [options.onProgress]
 * @returns {Promise<void>}
 */
export async function copyFolder(from, toPath, options = {}) {
  const { path, storageRef = null } = from;
  const { providerId, storageId } = storageRef ?? {};
  const { onProgress, merge = false } = options;
  if (!storageRef) {
    await opfsProvider.copyDir(path, toPath, onProgress, { merge });
  } else {
    await _providerSend(providerId, 'copyFolder', { oldPath: path, newPath: toPath, merge, storageId }, onProgress);
  }
  _notifyStorageChanged({ path: toPath, storageRef });
}

/**
 * Returns the capabilities of the provider connection, or no capabilities if
 * the connection is not known.
 *
 * @param {StorageRef} [storageRef=null]
 * @returns {Promise<{file: {read,add,modify,delete}, folder: {read,add,modify,delete}}>}
 */
export async function getCapabilities(storageRef = null) {
  if (!storageRef) return opfsProvider.capabilities;
  const { providerId, storageId } = storageRef;
  const providers = await fetchProviderConnections();
  const conn = providers.flatMap(p => p.connections).find(c => c.storageRef?.providerId === providerId && c.storageRef?.storageId === storageId);
  return conn?.capabilities ?? { file: {}, folder: {} };
}

/**
 * Returns current storage usage for the active backend.
 * Providers that do not track usage should return `{ usage: null, quota: null }`.
 *
 * @param {StorageRef} [storageRef=null]
 * @returns {Promise<{usage: number|null, quota: number|null}>}
 */
export async function getStorageUsage(storageRef = null) {
  if (!storageRef) {
    if (!navigator.storage?.estimate) return { usage: null, quota: null };
    try {
      const { usage, quota } = await navigator.storage.estimate();
      return { usage: usage ?? null, quota: quota ?? null };
    } catch {
      return { usage: null, quota: null };
    }
  }
  const { providerId, storageId } = storageRef;
  return _providerSend(providerId, 'storageUsage', { storageId });
}

/**
 * Opens a file picker UI.
 *
 * In a WebExtension context (browser.windows available), opens a popup window.
 * In a plain web context, injects an inline modal overlay into the current page.
 *
 * @param {object} [options]
 * @param {Array<{description?: string, accept: Object<string, string[]>}>} [options.types]
 *   File type filter entries. Each entry has an optional `description` label and
 *   an `accept` map of MIME type → array of extensions (e.g. `{ "image/*": [".png", ".jpg"] }`).
 * @param {boolean} [options.excludeAcceptAllOption=false]
 *   When `true`, the "All files (*)" option is omitted from the type dropdown and
 *   the first type in `types` is pre-selected. Mirrors the native API option.
 * @param {number} [options.width=800]
 * @param {number} [options.height=600]
 * @param {string} [options.id]
 *   An identifier for this picker context. The picker remembers the last-used
 *   directory and storageRef per `id` and restores both on the next open, ignoring `startIn`.
 * @param {string} [options.startIn]
 *   Absolute path to open the picker in initially (e.g. `"/documents"`).
 *   Ignored when `id` is set and has a saved state.
 * @param {StorageRef} [options.storageRef]
 *   Open the picker pre-set to this connection. Ignored when `id` has saved state.
 * @param {string} [options.opfsStorageName]
 *   Display name for the built-in OPFS (local storage) option in the provider dropdown.
 *   Has no effect on external providers, which use their own reported name.
 * @param {boolean} [options.multiple=false] - Allow selecting multiple files. When false
 *   (default), the returned array always contains exactly one entry.
 * @returns {Promise<Entry[]|null>} Array of `Entry` objects (each with `path` and `storageRef`), or null if cancelled.
 */
export function showSelectFilePicker(options = {}) {
  // mode=open is the default, no extra param needed
  return new Promise((resolve, reject) => {
    const sessionId = crypto.randomUUID();
    const { types = null, excludeAcceptAllOption = false, width = 800, height = 600, storageRef = null, multiple = false, id = null, startIn = null, opfsStorageName = null } = options;

    pendingPickers.set(sessionId, { resolve, reject, defaultValue: [] });

    const pickerParams = new URLSearchParams();
    pickerParams.set('session', sessionId);
    if (types?.length) pickerParams.set('types', JSON.stringify(types));
    if (excludeAcceptAllOption) pickerParams.set('excludeAcceptAll', '1');
    if (storageRef) pickerParams.set('storageRef', JSON.stringify(storageRef));
    if (multiple) pickerParams.set('multiple', '1');
    if (id) pickerParams.set('id', id);
    if (startIn) pickerParams.set('startIn', startIn);
    if (opfsStorageName) pickerParams.set('opfsStorageName', opfsStorageName);

    _openPopupWindow(sessionId, pickerParams, width, height);
  });
}

/**
 * Opens a save file picker UI.
 *
 * Same as `showSelectFilePicker` but the picker shows a filename input and a Save
 * button. The result path is the chosen directory joined with the entered filename.
 *
 * @param {object} [options]
 * @param {string} [options.suggestedName] - Pre-filled filename in the save input.
 * @param {Array<{description?: string, accept: Object<string, string[]>}>} [options.types]
 * @param {boolean} [options.excludeAcceptAllOption=false]
 * @param {string} [options.id]
 * @param {string} [options.startIn]
 * @param {string} [options.opfsStorageName]
 * @param {number} [options.width=800]
 * @param {number} [options.height=600]
 * @returns {Promise<Entry|null>}
 */
export function showSaveFilePicker(options = {}) {
  return new Promise((resolve, reject) => {
    const sessionId = crypto.randomUUID();
    const { types = null, excludeAcceptAllOption = false, width = 800, height = 600,
      storageRef = null, id = null, startIn = null, opfsStorageName = null,
      suggestedName = null } = options;

    pendingPickers.set(sessionId, { resolve, reject, defaultValue: null });

    const pickerParams = new URLSearchParams();
    pickerParams.set('session', sessionId);
    pickerParams.set('mode', 'save');
    if (types?.length) pickerParams.set('types', JSON.stringify(types));
    if (excludeAcceptAllOption) pickerParams.set('excludeAcceptAll', '1');
    if (storageRef) pickerParams.set('storageRef', JSON.stringify(storageRef));
    if (id) pickerParams.set('id', id);
    if (startIn) pickerParams.set('startIn', startIn);
    if (opfsStorageName) pickerParams.set('opfsStorageName', opfsStorageName);
    if (suggestedName) pickerParams.set('suggestedName', suggestedName);

    _openPopupWindow(sessionId, pickerParams, width, height);
  });
}

/**
 * Opens a directory picker UI.
 *
 * The user navigates to a folder and confirms.
 *
 * @param {object} [options]
 * @param {string} [options.id]
 * @param {string} [options.startIn]
 * @param {string} [options.opfsStorageName]
 * @param {number} [options.width=800]
 * @param {number} [options.height=600]
 * @returns {Promise<Entry|null>}
 */
export function showDirectoryPicker(options = {}) {
  return new Promise((resolve, reject) => {
    const sessionId = crypto.randomUUID();
    const { width = 800, height = 600, storageRef = null, id = null,
      startIn = null, opfsStorageName = null } = options;

    pendingPickers.set(sessionId, { resolve, reject, defaultValue: null });

    const pickerParams = new URLSearchParams();
    pickerParams.set('session', sessionId);
    pickerParams.set('mode', 'dir');
    if (storageRef) pickerParams.set('storageRef', JSON.stringify(storageRef));
    if (id) pickerParams.set('id', id);
    if (startIn) pickerParams.set('startIn', startIn);
    if (opfsStorageName) pickerParams.set('opfsStorageName', opfsStorageName);

    _openPopupWindow(sessionId, pickerParams, width, height);
  });
}

// ── Internal helpers ───────────────────────────────────────────────────────────

function _notifyStorageChanged(...entries) {
  // This client made a storage modification, relay this to the background and
  // have it broadcasted to all active client.
  browser.runtime.sendMessage({ type: 'vfs-notify-background-storage-changed', entries }).catch(() => { });
}

function _pickerBaseUrl() {
  // import.meta.url points to vfs-client.mjs itself, so picker.html resolves
  // relative to it.
  return new URL('picker.html', import.meta.url).href;
}

function _openPopupWindow(sessionId, pickerParams, width, height) {
  const popupUrl = _pickerBaseUrl() + '?' + pickerParams.toString();
  const { resolve, reject, defaultValue } = pendingPickers.get(sessionId);
  let windowId = null;

  // Listen for result via runtime messaging
  function messageHandler(msg) {
    if (msg && msg.type === 'vfs-picker-result' && msg.session === sessionId) {
      browser.runtime.onMessage.removeListener(messageHandler);
      pendingPickers.delete(sessionId);
      if (windowId !== null) {
        browser.windows.remove(windowId).catch(() => { });
      }
      resolve(msg.result ?? defaultValue);
    }
  }

  browser.runtime.onMessage.addListener(messageHandler);

  browser.windows.create({
    type: 'popup',
    url: popupUrl,
    width,
    height,
    allowScriptsToClose: true,
  }).then(win => {
    windowId = win.id;

    // If the popup window is closed without a result (user closed it manually),
    // clean up and resolve with the default value.
    function closedHandler(closedWindowId) {
      if (closedWindowId === windowId) {
        browser.windows.onRemoved.removeListener(closedHandler);
        if (pendingPickers.has(sessionId)) {
          browser.runtime.onMessage.removeListener(messageHandler);
          pendingPickers.delete(sessionId);
          resolve(defaultValue);
        }
      }
    }

    browser.windows.onRemoved.addListener(closedHandler);
  }).catch(err => {
    browser.runtime.onMessage.removeListener(messageHandler);
    pendingPickers.delete(sessionId);
    reject(err);
  });
}
