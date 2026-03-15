/**
 * background.js - Example vfs-toolkit provider add-on
 *
 * Exposes a virtual in-memory file system to any add-on that connects via a
 * 'vfs-toolkit' port. Static files are pre-defined, additional files can be added
 * at runtime.
 *
 * Mutating operations simulate a slow delay with progress pushes for debug testing.
 */

import { VfsProviderImplementation } from './vendor/vfs-provider.mjs';

const STORAGE_KEY = 'vfs-toolkit-local-slow-data-transfer';

// ── Fixed virtual file system ──────────────────────────────────────────────────

const FILES = {
  '/documents/readme.txt': {
    content: 'Welcome to the example VFS provider.\n\nThis is a read-only virtual file system.',
    type: 'text/plain',
    lastModified: new Date('2024-01-15').getTime(),
  },
  '/documents/notes.md': {
    content: '# Notes\n\n- Files are defined in the provider add-on.\n- Added files are kept in memory only.',
    type: 'text/markdown',
    lastModified: new Date('2024-03-01').getTime(),
  },
  '/documents/report.csv': {
    content: 'Name,Value,Date\nAlpha,42,2024-01-01\nBeta,17,2024-02-01\nGamma,99,2024-03-01',
    type: 'text/csv',
    lastModified: new Date('2024-03-10').getTime(),
  },
  '/templates/welcome.html': {
    content: '<!DOCTYPE html>\n<html>\n<head><title>Welcome</title></head>\n<body>\n  <h1>Hello, World!</h1>\n  <p>This is a template file.</p>\n</body>\n</html>',
    type: 'text/html',
    lastModified: new Date('2024-02-20').getTime(),
  },
  '/templates/signature.txt': {
    content: 'Best regards,\nThe Example Provider\nexample@provider.com',
    type: 'text/plain',
    lastModified: new Date('2024-02-20').getTime(),
  },
  '/archive/old-notes.txt': {
    content: 'These are some older notes that have been archived.',
    type: 'text/plain',
    lastModified: new Date('2023-11-01').getTime(),
  },
};

// In-memory store for files added at runtime: path → { blob, type, lastModified }
const MEMORY_FILES = new Map();

// In-memory store for explicitly-created empty folders
const MEMORY_FOLDERS = new Set();

function getAllFiles() {
  const result = {};
  for (const [path, meta] of Object.entries(FILES)) {
    result[path] = meta;
  }
  for (const [path, entry] of MEMORY_FILES) {
    result[path] = entry;
  }
  return result;
}

// Derive the folder tree from all file paths plus explicitly-created folders.
function getFolders() {
  const folders = new Set(['/']);
  for (const path of [...Object.keys(FILES), ...MEMORY_FILES.keys()]) {
    const parts = path.split('/').filter(Boolean);
    for (let i = 1; i < parts.length; i++) {
      folders.add('/' + parts.slice(0, i).join('/'));
    }
  }
  for (const folder of MEMORY_FOLDERS) {
    folders.add(folder);
  }
  return folders;
}

// ── Provider implementation ────────────────────────────────────────────────────

const SIMULATED_OP_MS = 500; // total simulated operation time
const PROGRESS_STEPS = 10;   // number of progress pushes

class ExampleVfsProvider extends VfsProviderImplementation {
  #cancelledOps = new Set();

  /**
   * Throws E:AUTH if storageId was not issued by this provider.
   * Valid storageIds are those persisted by reportNewConnection() in browser.storage.local.
   *
   * CONTRACT: Every on* handler validates incomming storageIds and rejects invalid
   * connections with an E:AUTH error code.
   */
  async #assertAuth(storageId) {
    const rv = await browser.storage.local.get({ 'vfs-toolkit-connections': [] });
    const known = rv['vfs-toolkit-connections'].some(c => c.storageId === storageId);
    if (!known) throw Object.assign(new Error(`Unauthorized storageId`), { code: 'E:AUTH' });
  }

  async reportStorageChangeToAll(paths) {
    const rv = await browser.storage.local.get({ 'vfs-toolkit-connections': [] });
    for (const { storageId } of rv['vfs-toolkit-connections']) {
      this.reportStorageChange(storageId, paths);
    }
  }

  async onCancel(canceledRequestId) {
    this.#cancelledOps.add(canceledRequestId);
  }

  async onStorageUsage(storageId) {
    await this.#assertAuth(storageId);
    let usage = 0;
    for (const meta of Object.values(FILES)) {
      usage += new TextEncoder().encode(meta.content).length;
    }
    for (const meta of MEMORY_FILES.values()) {
      usage += meta.blob.size;
    }
    return { usage, quota: null };
  }

  async onList(requestId, storageId, path) {
    await this.#assertAuth(storageId);
    const allFiles = getAllFiles();
    const folders = getFolders();
    const dir = path === '/' ? '' : path.replace(/\/$/, '');
    const entries = [];
    const seen = new Set();

    // Direct child folders
    for (const folder of folders) {
      if (folder === '/') continue;
      const parent = folder.replace(/\/[^/]+$/, '') || '/';
      if (parent === (dir || '/') && !seen.has(folder)) {
        seen.add(folder);
        entries.push({ name: folder.split('/').pop(), path: folder, kind: 'directory' });
      }
    }

    // Direct child files
    for (const [filePath, meta] of Object.entries(allFiles)) {
      const parent = '/' + filePath.split('/').filter(Boolean).slice(0, -1).join('/');
      if ((parent === '/' ? '' : parent) === dir && !seen.has(filePath)) {
        seen.add(filePath);
        const size = meta.blob
          ? meta.blob.size
          : new TextEncoder().encode(meta.content).length;
        entries.push({ name: filePath.split('/').pop(), path: filePath, kind: 'file', size, lastModified: meta.lastModified });
      }
    }

    entries.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    await this.#simulateProgress(requestId);
    return entries;
  }

  async onReadFile(requestId, storageId, path) {
    await this.#assertAuth(storageId);
    const meta = getAllFiles()[path];
    if (!meta) throw new Error(`File not found: ${path}`);
    await this.#simulateProgress(requestId);
    const name = path.split('/').pop();
    if (meta.blob) {
      return new File([meta.blob], name, { type: meta.type, lastModified: meta.lastModified });
    }
    return new File([new TextEncoder().encode(meta.content)], name, { type: meta.type, lastModified: meta.lastModified });
  }

  async onWriteFile(requestId, storageId, path, file, overwrite) {
    await this.#assertAuth(storageId);
    if (!overwrite && getAllFiles()[path]) throw Object.assign(new Error(`File already exists: ${path}`), { code: 'E:EXIST' });
    await this.#simulateProgress(requestId);
    const blob = file instanceof Blob ? file : new Blob([], { type: 'application/octet-stream' });
    MEMORY_FILES.set(path, { blob, type: blob.type || 'application/octet-stream', lastModified: Date.now() });
  }

  async onAddFolder(requestId, storageId, path) {
    await this.#assertAuth(storageId);
    if (getFolders().has(path)) throw Object.assign(new Error(`Folder already exists: ${path}`), { code: 'E:EXIST' });
    await this.#simulateProgress(requestId);
    MEMORY_FOLDERS.add(path);
  }

  async onMoveFile(requestId, storageId, oldPath, newPath, overwrite) {
    await this.#assertAuth(storageId);
    if (!overwrite && getAllFiles()[newPath]) throw Object.assign(new Error(`Target already exists: ${newPath}`), { code: 'E:EXIST' });
    await this.#simulateProgress(requestId);
    _renameEntry(oldPath, newPath);
  }

  async onMoveFolder(requestId, storageId, oldPath, newPath, merge) {
    await this.#assertAuth(storageId);
    if (!merge && getFolders().has(newPath)) throw Object.assign(new Error(`Target already exists: ${newPath}`), { code: 'E:EXIST' });
    await this.#simulateProgress(requestId);
    _renameFolderPrefix(oldPath, newPath);
  }

  async onCopyFile(requestId, storageId, oldPath, newPath, overwrite) {
    await this.#assertAuth(storageId);
    const srcMeta = getAllFiles()[oldPath];
    if (!srcMeta) throw new Error(`File not found: ${oldPath}`);
    if (!overwrite && getAllFiles()[newPath]) throw Object.assign(new Error(`Target already exists: ${newPath}`), { code: 'E:EXIST' });
    await this.#simulateProgress(requestId);
    MEMORY_FILES.set(newPath, { ...srcMeta, lastModified: Date.now() });
  }

  async onCopyFolder(requestId, storageId, oldPath, newPath, merge) {
    await this.#assertAuth(storageId);
    if (!merge && getFolders().has(newPath)) throw Object.assign(new Error(`Target already exists: ${newPath}`), { code: 'E:EXIST' });
    await this.#simulateProgress(requestId);
    const oldPrefix = oldPath.replace(/\/$/, '');
    const newPrefix = newPath.replace(/\/$/, '');
    MEMORY_FOLDERS.add(newPath);
    for (const [filePath, meta] of Object.entries(getAllFiles())) {
      if (filePath.startsWith(oldPrefix + '/')) {
        MEMORY_FILES.set(newPrefix + filePath.slice(oldPrefix.length), { ...meta, lastModified: Date.now() });
      }
    }
    for (const folder of getFolders()) {
      if (folder.startsWith(oldPrefix + '/')) {
        MEMORY_FOLDERS.add(newPrefix + folder.slice(oldPrefix.length));
      }
    }
  }

  async onDeleteFile(requestId, storageId, path) {
    await this.#assertAuth(storageId);
    await this.#simulateProgress(requestId);
    delete FILES[path];
    MEMORY_FILES.delete(path);
  }

  async onDeleteFolder(requestId, storageId, path) {
    await this.#assertAuth(storageId);
    await this.#simulateProgress(requestId);
    const prefix = path.replace(/\/$/, '') + '/';
    for (const p of Object.keys(FILES)) {
      if (p === path || p.startsWith(prefix)) delete FILES[p];
    }
    for (const p of [...MEMORY_FILES.keys()]) {
      if (p === path || p.startsWith(prefix)) MEMORY_FILES.delete(p);
    }
    MEMORY_FOLDERS.delete(path);
    for (const f of [...MEMORY_FOLDERS]) {
      if (f.startsWith(prefix)) MEMORY_FOLDERS.delete(f);
    }
  }

  async #simulateProgress(requestId) {
    const rv = await browser.storage.local.get({ [STORAGE_KEY]: false });
    if (!rv[STORAGE_KEY]) return;

    const stepMs = SIMULATED_OP_MS / PROGRESS_STEPS;
    for (let i = 1; i <= PROGRESS_STEPS; i++) {
      await new Promise(r => setTimeout(r, stepMs));
      if (this.#cancelledOps.delete(requestId)) throw new Error('Cancelled');
      this.reportProgress(requestId, Math.round(i / PROGRESS_STEPS * 100));
    }
  }
}

// ── Internal helpers ───────────────────────────────────────────────────────────

function _renameEntry(oldPath, newPath) {
  if (FILES[oldPath]) {
    FILES[newPath] = FILES[oldPath];
    delete FILES[oldPath];
  }
  if (MEMORY_FILES.has(oldPath)) {
    MEMORY_FILES.set(newPath, MEMORY_FILES.get(oldPath));
    MEMORY_FILES.delete(oldPath);
  }
}

function _renameFolderPrefix(oldPath, newPath) {
  const prefix = oldPath.replace(/\/$/, '') + '/';
  for (const p of Object.keys(FILES)) {
    if (p.startsWith(prefix)) {
      FILES[newPath + p.slice(oldPath.length)] = FILES[p];
      delete FILES[p];
    }
  }
  for (const p of [...MEMORY_FILES.keys()]) {
    if (p.startsWith(prefix)) {
      MEMORY_FILES.set(newPath + p.slice(oldPath.length), MEMORY_FILES.get(p));
      MEMORY_FILES.delete(p);
    }
  }
  for (const f of [...MEMORY_FOLDERS]) {
    if (f === oldPath || f.startsWith(prefix)) {
      MEMORY_FOLDERS.delete(f);
      MEMORY_FOLDERS.add(newPath + f.slice(oldPath.length));
    }
  }
}

// ── Start ──────────────────────────────────────────────────────────────────────

const provider = new ExampleVfsProvider({
  name: 'Example VFS Toolkit storage provider',
  setupPath: '/setup/setup.html',
  configPath: '/config/config.html',
  configWidth: 500,
  configHeight: 400,
});

provider.init();

// ── Simulated incoming files ───────────────────────────────────────────────────

setInterval(() => {
  const name = `incoming-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
  const path = `/${name}`;
  MEMORY_FILES.set(path, {
    blob: new Blob([`File received at ${new Date().toLocaleTimeString()}`], { type: 'text/plain' }),
    type: 'text/plain',
    lastModified: Date.now(),
  });
  provider.reportStorageChangeToAll([path]);
}, 15000);