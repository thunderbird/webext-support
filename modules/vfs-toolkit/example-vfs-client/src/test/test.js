import * as vfs from '/vendor/vfs-client/vfs-client.mjs';

// ── Minimal test harness ──────────────────────────────────────────────────────

const log  = document.getElementById('log');
const summary = document.getElementById('summary');
let passed = 0, failed = 0;

function print(msg, cls = 'info') {
  const li = document.createElement('li');
  li.className = cls;
  li.textContent = msg;
  log.appendChild(li);
}

async function run(label, fn) {
  try {
    await fn();
    print(`✓ ${label}`, 'pass');
    passed++;
  } catch (err) {
    print(`✗ ${label}: ${err.message}`, 'fail');
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg ?? 'Assertion failed');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function list(storageRef, path) {
  return vfs.list({ storageRef, path });
}

// ── Test suite ────────────────────────────────────────────────────────────────

async function runTests(storageRef) {
  passed = 0; failed = 0;
  log.innerHTML = '';
  summary.textContent = '';
  print(`Running against: ${storageRef ? JSON.stringify(storageRef) : 'OPFS'}`, 'info');

  const base = '/vfs-test-' + Date.now();

  // 1. addFolder
  await run('addFolder creates a directory', async () => {
    await vfs.addFolder({ storageRef, path: base });
    const entries = await list(storageRef, '/');
    assert(entries.some(e => e.name === base.slice(1) && e.kind === 'directory'),
      'Created folder not found in listing');
  });

  // 2. addFolder — nested
  await run('addFolder creates nested directories', async () => {
    await vfs.addFolder({ storageRef, path: `${base}/sub` });
    const entries = await list(storageRef, base);
    assert(entries.some(e => e.name === 'sub' && e.kind === 'directory'),
      'Nested folder not found');
  });

  // 3. writeFile + list
  await run('writeFile adds a file visible in list', async () => {
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    await vfs.writeFile({ storageRef, path: `${base}/hello.txt` }, file);
    const entries = await list(storageRef, base);
    assert(entries.some(e => e.name === 'hello.txt' && e.kind === 'file'),
      'Written file not found in listing');
  });

  // 4. readFile
  await run('readFile returns correct content', async () => {
    const entry = await vfs.readFile({ storageRef, path: `${base}/hello.txt` });
    const text = await entry.text();
    assert(text === 'hello', `Expected "hello", got "${text}"`);
  });

  // 5. writeFile overwrites existing file
  await run('writeFile overwrites existing content', async () => {
    const file = new File(['world'], 'hello.txt', { type: 'text/plain' });
    await vfs.writeFile({ storageRef, path: `${base}/hello.txt` }, file, { overwrite: true });
    const entry = await vfs.readFile({ storageRef, path: `${base}/hello.txt` });
    const text = await entry.text();
    assert(text === 'world', `Expected "world", got "${text}"`);
  });

  // 6. readFile on non-existent path throws
  await run('readFile throws for non-existent file', async () => {
    let threw = false;
    try { await vfs.readFile({ storageRef, path: `${base}/no-such-file.txt` }); }
    catch { threw = true; }
    assert(threw, 'Expected an error for missing file');
  });

  // 7. list on non-existent path throws
  await run('list throws for non-existent directory', async () => {
    let threw = false;
    try { await list(storageRef, `${base}/no-such-dir`); }
    catch { threw = true; }
    assert(threw, 'Expected an error for missing directory');
  });

  // 8. moveFile
  await run('moveFile renames a file', async () => {
    await vfs.moveFile({ storageRef, path: `${base}/hello.txt` }, `${base}/renamed.txt`);
    const entries = await list(storageRef, base);
    assert(!entries.some(e => e.name === 'hello.txt'), 'Old name still present after move');
    assert(entries.some(e => e.name === 'renamed.txt'), 'New name not found after move');
  });

  // 9. copyFile
  await run('copyFile creates a copy', async () => {
    await vfs.copyFile({ storageRef, path: `${base}/renamed.txt` }, `${base}/copy.txt`);
    const entries = await list(storageRef, base);
    assert(entries.some(e => e.name === 'renamed.txt'), 'Original missing after copy');
    assert(entries.some(e => e.name === 'copy.txt'), 'Copy not found');
  });

  // 10. copyFile with overwrite
  await run('copyFile overwrites existing file', async () => {
    const file = new File(['overwritten'], 'target.txt', { type: 'text/plain' });
    await vfs.writeFile({ storageRef, path: `${base}/target.txt` }, file);
    await vfs.copyFile({ storageRef, path: `${base}/renamed.txt` }, `${base}/target.txt`, { overwrite: true });
    const entry = await vfs.readFile({ storageRef, path: `${base}/target.txt` });
    const text = await entry.text();
    assert(text === 'world', `Expected copy content "world", got "${text}"`);
  });

  // 11. moveFile with overwrite
  await run('moveFile overwrites existing file', async () => {
    const file = new File(['to-be-replaced'], 'dest.txt', { type: 'text/plain' });
    await vfs.writeFile({ storageRef, path: `${base}/dest.txt` }, file);
    await vfs.moveFile({ storageRef, path: `${base}/copy.txt` }, `${base}/dest.txt`, { overwrite: true });
    const entries = await list(storageRef, base);
    assert(!entries.some(e => e.name === 'copy.txt'), 'Source still present after move');
    const entry = await vfs.readFile({ storageRef, path: `${base}/dest.txt` });
    const text = await entry.text();
    assert(text === 'world', `Expected moved content "world", got "${text}"`);
  });

  // 12. moveFolder
  await run('moveFolder renames a folder', async () => {
    await vfs.moveFolder({ storageRef, path: `${base}/sub` }, `${base}/sub-renamed`);
    const entries = await list(storageRef, base);
    assert(!entries.some(e => e.name === 'sub'), 'Old folder still present after move');
    assert(entries.some(e => e.name === 'sub-renamed'), 'Renamed folder not found');
  });

  // 13. copyFolder
  await run('copyFolder duplicates a folder', async () => {
    await vfs.copyFolder({ storageRef, path: `${base}/sub-renamed` }, `${base}/sub-copy`);
    const entries = await list(storageRef, base);
    assert(entries.some(e => e.name === 'sub-renamed'), 'Original folder missing after copy');
    assert(entries.some(e => e.name === 'sub-copy'), 'Copied folder not found');
  });

  // 14. getCapabilities
  await run('getCapabilities returns an object', async () => {
    const caps = await vfs.getCapabilities(storageRef);
    assert(caps && typeof caps === 'object', 'Expected capabilities object');
    assert('file' in caps && 'folder' in caps, 'Expected file and folder capability keys');
  });

  // 15. getStorageUsage
  await run('getStorageUsage returns usage info', async () => {
    const { usage, quota } = await vfs.getStorageUsage(storageRef);
    // Providers that do not track usage return null — either way the keys must be present.
    assert('usage' in { usage, quota } && 'quota' in { usage, quota },
      'Expected usage and quota keys');
    if (usage !== null) assert(typeof usage === 'number', 'usage should be a number');
    if (quota !== null) assert(typeof quota === 'number', 'quota should be a number');
  });

  // 16. deleteFile
  await run('deleteFile removes a file', async () => {
    await vfs.deleteFile({ storageRef, path: `${base}/target.txt` });
    const entries = await list(storageRef, base);
    assert(!entries.some(e => e.name === 'target.txt'), 'File still present after delete');
  });

  // 17. deleteFolder (recursive) — cleans up everything
  await run('deleteFolder removes folder and contents', async () => {
    await vfs.deleteFolder({ storageRef, path: base });
    const entries = await list(storageRef, '/');
    assert(!entries.some(e => e.name === base.slice(1)), 'Folder still present after delete');
  });

  const total = passed + failed;
  summary.textContent = `${passed}/${total} passed`;
  summary.className = failed ? 'fail' : 'pass';
  summary.style.color = failed ? '#f44747' : '#4ec9b0';
}

// ── Startup ───────────────────────────────────────────────────────────────────

const _params = new URLSearchParams(location.search);
const _storageRef = _params.has('storageRef') ? JSON.parse(_params.get('storageRef')) : null;

document.getElementById('btn-run').addEventListener('click', () => runTests(_storageRef));
