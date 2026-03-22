import * as vfs from '/vendor/vfs-client/vfs-client.mjs';

// ── Minimal test harness ──────────────────────────────────────────────────────

const log     = document.getElementById('log');
const summary = document.getElementById('summary');
let passed = 0, failed = 0;

async function run(label, fn) {
  const checks = [];
  try {
    await fn(checks);
    const li = document.createElement('li');
    li.className = 'pass';
    li.textContent = `✓ ${label}`;
    if (checks.length) {
      const div = document.createElement('div');
      div.className = 'detail';
      div.textContent = checks.map(c => `${c.ok ? '✓' : '✗'} ${c.msg}`).join('\n');
      li.appendChild(div);
    }
    log.appendChild(li);
    passed++;
  } catch (err) {
    const li = document.createElement('li');
    li.className = 'fail';
    li.textContent = `✗ ${label}: ${err.message}`;
    if (checks.length || err.detail) {
      const div = document.createElement('div');
      div.className = 'detail';
      const checkLines = checks.map(c => `${c.ok ? '✓' : '✗'} ${c.msg}`).join('\n');
      div.textContent = checkLines + (checkLines && err.detail ? '\n' + err.detail : err.detail ?? '');
      li.appendChild(div);
    }
    log.appendChild(li);
    failed++;
  }
}

// ── Structured check helpers ───────────────────────────────────────────────────

function checkInEntries(checks, entries, name, kind) {
  const found = entries.find(e => e.name === name);
  const ok = found?.kind === kind;
  if (ok) {
    checks.push({ ok: true, msg: `${kind} "${name}" present` });
  } else {
    const detail = found
      ? `Expected kind: "${kind}"  Received kind: "${found.kind}"`
      : `Expected: ${kind} "${name}"\nReceived entries: ${entries.map(e => `${e.kind} "${e.name}"`).join(', ') || '(empty)'}`;
    checks.push({ ok: false, msg: `${kind} "${name}" not found\n${detail}` });
    const err = new Error(`${kind} "${name}" not found`);
    err.detail = detail;
    throw err;
  }
}

function checkNotInEntries(checks, entries, name) {
  const found = entries.filter(e => e.name === name);
  const ok = found.length === 0;
  if (ok) {
    checks.push({ ok: true, msg: `"${name}" absent` });
  } else {
    const detail = `Expected: no entry "${name}"\nReceived: ${found.map(e => `${e.kind} "${e.name}"`).join(', ')}`;
    checks.push({ ok: false, msg: `"${name}" still present\n${detail}` });
    const err = new Error(`"${name}" still present`);
    err.detail = detail;
    throw err;
  }
}

function checkContent(checks, actual, expected, label) {
  const ok = actual === expected;
  if (ok) {
    checks.push({ ok: true, msg: `${label}: "${expected}"` });
  } else {
    const detail = `Expected: "${expected}"\nReceived: "${actual}"`;
    checks.push({ ok: false, msg: `${label} mismatch\n${detail}` });
    const err = new Error(`${label} mismatch`);
    err.detail = detail;
    throw err;
  }
}

function checkThrows(checks, threw, label) {
  if (threw) {
    checks.push({ ok: true, msg: `${label}: error thrown as expected` });
  } else {
    checks.push({ ok: false, msg: `${label}: expected error but none was thrown` });
    throw new Error(`Expected an error to be thrown`);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function list(storageRef, path) {
  return vfs.list({ storageRef, path });
}

async function resolveTargetLabel(storageRef) {
  if (!storageRef) return 'OPFS (built-in)';
  try {
    const providers = await vfs.fetchProviderConnections();
    const provider = providers.find(p => p.providerId === storageRef.providerId);
    if (!provider) return `Provider: ${storageRef.providerId} (not found)`;
    const conn = provider.connections.find(c => c.storageRef.storageId === storageRef.storageId);
    const connName = conn ? conn.name : `storageId: ${storageRef.storageId}`;
    return `${provider.name} — ${connName}`;
  } catch {
    return JSON.stringify(storageRef);
  }
}

// ── Test suite ────────────────────────────────────────────────────────────────

async function runTests(storageRef) {
  passed = 0; failed = 0;
  log.innerHTML = '';
  summary.textContent = '';

  const base = '/vfs-test-' + Date.now();

  // Collect all storage-change notifications across the entire test run.
  const notifiedEntries = [];
  function storageListener(entries) {
    for (const e of entries) notifiedEntries.push(e);
  }
  vfs.onStorageChanged.addListener(storageListener);

  // 1. addFolder
  await run('addFolder creates a directory', async (checks) => {
    await vfs.addFolder({ storageRef, path: base });
    const entries = await list(storageRef, '/');
    checkInEntries(checks, entries, base.slice(1), 'directory');
  });

  // 2. addFolder — nested
  await run('addFolder creates nested directories', async (checks) => {
    await vfs.addFolder({ storageRef, path: `${base}/sub` });
    const entries = await list(storageRef, base);
    checkInEntries(checks, entries, 'sub', 'directory');
  });

  // 3. writeFile + list
  await run('writeFile adds a file visible in list', async (checks) => {
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    await vfs.writeFile({ storageRef, path: `${base}/hello.txt` }, file);
    const entries = await list(storageRef, base);
    checkInEntries(checks, entries, 'hello.txt', 'file');
  });

  // 4. readFile
  await run('readFile returns correct content', async (checks) => {
    const entry = await vfs.readFile({ storageRef, path: `${base}/hello.txt` });
    const text = await entry.text();
    checkContent(checks, text, 'hello', 'hello.txt content');
  });

  // 5. writeFile overwrites existing file
  await run('writeFile overwrites existing content', async (checks) => {
    const file = new File(['world'], 'hello.txt', { type: 'text/plain' });
    await vfs.writeFile({ storageRef, path: `${base}/hello.txt` }, file, { overwrite: true });
    const entry = await vfs.readFile({ storageRef, path: `${base}/hello.txt` });
    const text = await entry.text();
    checkContent(checks, text, 'world', 'hello.txt content after overwrite');
  });

  // 6. readFile on non-existent path throws
  await run('readFile throws for non-existent file', async (checks) => {
    let threw = false;
    try { await vfs.readFile({ storageRef, path: `${base}/no-such-file.txt` }); }
    catch { threw = true; }
    checkThrows(checks, threw, 'readFile(no-such-file.txt)');
  });

  // 7. list on non-existent path throws
  await run('list throws for non-existent directory', async (checks) => {
    let threw = false;
    try { await list(storageRef, `${base}/no-such-dir`); }
    catch { threw = true; }
    checkThrows(checks, threw, 'list(no-such-dir)');
  });

  // 8. moveFile
  await run('moveFile renames a file', async (checks) => {
    await vfs.moveFile({ storageRef, path: `${base}/hello.txt` }, `${base}/renamed.txt`);
    const entries = await list(storageRef, base);
    checkNotInEntries(checks, entries, 'hello.txt');
    checkInEntries(checks, entries, 'renamed.txt', 'file');
  });

  // 9. copyFile
  await run('copyFile creates a copy', async (checks) => {
    await vfs.copyFile({ storageRef, path: `${base}/renamed.txt` }, `${base}/copy.txt`);
    const entries = await list(storageRef, base);
    checkInEntries(checks, entries, 'renamed.txt', 'file');
    checkInEntries(checks, entries, 'copy.txt', 'file');
  });

  // 10. copyFile with overwrite
  await run('copyFile overwrites existing file', async (checks) => {
    const file = new File(['overwritten'], 'target.txt', { type: 'text/plain' });
    await vfs.writeFile({ storageRef, path: `${base}/target.txt` }, file);
    await vfs.copyFile({ storageRef, path: `${base}/renamed.txt` }, `${base}/target.txt`, { overwrite: true });
    const entry = await vfs.readFile({ storageRef, path: `${base}/target.txt` });
    const text = await entry.text();
    checkContent(checks, text, 'world', 'target.txt content after copy overwrite');
  });

  // 11. moveFile with overwrite
  await run('moveFile overwrites existing file', async (checks) => {
    const file = new File(['to-be-replaced'], 'dest.txt', { type: 'text/plain' });
    await vfs.writeFile({ storageRef, path: `${base}/dest.txt` }, file);
    await vfs.moveFile({ storageRef, path: `${base}/copy.txt` }, `${base}/dest.txt`, { overwrite: true });
    const entries = await list(storageRef, base);
    checkNotInEntries(checks, entries, 'copy.txt');
    const entry = await vfs.readFile({ storageRef, path: `${base}/dest.txt` });
    const text = await entry.text();
    checkContent(checks, text, 'world', 'dest.txt content after move overwrite');
  });

  // 12. moveFolder
  await run('moveFolder renames a folder', async (checks) => {
    await vfs.moveFolder({ storageRef, path: `${base}/sub` }, `${base}/sub-renamed`);
    const entries = await list(storageRef, base);
    checkNotInEntries(checks, entries, 'sub');
    checkInEntries(checks, entries, 'sub-renamed', 'directory');
  });

  // 13. copyFolder
  await run('copyFolder duplicates a folder', async (checks) => {
    await vfs.copyFolder({ storageRef, path: `${base}/sub-renamed` }, `${base}/sub-copy`);
    const entries = await list(storageRef, base);
    checkInEntries(checks, entries, 'sub-renamed', 'directory');
    checkInEntries(checks, entries, 'sub-copy', 'directory');
  });

  // 14. getCapabilities
  await run('getCapabilities returns an object', async (checks) => {
    const caps = await vfs.getCapabilities(storageRef);
    const hasFile   = caps && typeof caps === 'object' && 'file'   in caps;
    const hasFolder = caps && typeof caps === 'object' && 'folder' in caps;
    checks.push({ ok: !!caps && typeof caps === 'object', msg: `capabilities is an object: ${typeof caps}` });
    checks.push({ ok: hasFile,   msg: `has "file" key: ${hasFile}`   });
    checks.push({ ok: hasFolder, msg: `has "folder" key: ${hasFolder}` });
    if (!hasFile || !hasFolder) {
      const err = new Error('Missing capability keys');
      err.detail = `Received: ${JSON.stringify(caps)}`;
      throw err;
    }
  });

  // 15. getStorageUsage
  await run('getStorageUsage returns usage info', async (checks) => {
    const { usage, quota } = await vfs.getStorageUsage(storageRef);
    checks.push({ ok: true, msg: `usage: ${usage}, quota: ${quota}` });
    const usageOk = usage === null || typeof usage === 'number';
    const quotaOk = quota === null || typeof quota === 'number';
    checks.push({ ok: usageOk, msg: `usage type: ${usage === null ? 'null' : typeof usage} (expected number|null)` });
    checks.push({ ok: quotaOk, msg: `quota type: ${quota === null ? 'null' : typeof quota} (expected number|null)` });
    if (!usageOk || !quotaOk) throw new Error('usage/quota type mismatch');
  });

  // 16. deleteFile
  await run('deleteFile removes a file', async (checks) => {
    await vfs.deleteFile({ storageRef, path: `${base}/target.txt` });
    const entries = await list(storageRef, base);
    checkNotInEntries(checks, entries, 'target.txt');
  });

  // 17. deleteFolder (recursive) — cleans up everything
  await run('deleteFolder removes folder and contents', async (checks) => {
    await vfs.deleteFolder({ storageRef, path: base });
    const entries = await list(storageRef, '/');
    checkNotInEntries(checks, entries, base.slice(1));
  });

  // 18. onStorageChanged — verify rich entries for all mutating operations
  await run('onStorageChanged received notifications for all operations', async (checks) => {
    // Allow any in-flight relay messages to settle.
    await new Promise(r => setTimeout(r, 200));
    vfs.onStorageChanged.removeListener(storageListener);

    function checkEntry(path, action, kind) {
      const ok = notifiedEntries.some(e => e.path === path && e.action === action && e.kind === kind);
      const label = `${action} ${kind}: ${path}`;
      if (ok) {
        checks.push({ ok: true, msg: label });
      } else {
        const related = notifiedEntries.filter(e => e.path === path);
        const detail = related.length
          ? `  received at same path: ${related.map(e => JSON.stringify(e)).join(', ')}`
          : '  no notifications at this path';
        checks.push({ ok: false, msg: `${label}\n${detail}` });
      }
      return ok;
    }

    function checkEntryWithSource(path, sourcePath, action, kind) {
      const ok = notifiedEntries.some(e => e.path === path && e.sourcePath === sourcePath && e.action === action && e.kind === kind);
      const label = `${action} ${kind}: ${sourcePath} → ${path}`;
      if (ok) {
        checks.push({ ok: true, msg: label });
      } else {
        const related = notifiedEntries.filter(e => e.path === path || e.sourcePath === sourcePath);
        const detail = related.length
          ? `  received with same path/sourcePath: ${related.map(e => JSON.stringify(e)).join(', ')}`
          : '  no notifications at this path or sourcePath';
        checks.push({ ok: false, msg: `${label}\n${detail}` });
      }
      return ok;
    }

    const results = [
      checkEntry(base,                   'created',  'directory'),
      checkEntry(`${base}/sub`,          'created',  'directory'),
      checkEntry(`${base}/hello.txt`,    'modified', 'file'),
      checkEntryWithSource(`${base}/renamed.txt`,  `${base}/hello.txt`,    'moved',  'file'),
      checkEntryWithSource(`${base}/copy.txt`,     `${base}/renamed.txt`,  'copied', 'file'),
      checkEntry(`${base}/target.txt`,   'modified', 'file'),
      checkEntryWithSource(`${base}/target.txt`,   `${base}/renamed.txt`,  'copied', 'file'),
      checkEntry(`${base}/dest.txt`,     'modified', 'file'),
      checkEntryWithSource(`${base}/dest.txt`,     `${base}/copy.txt`,     'moved',  'file'),
      checkEntryWithSource(`${base}/sub-renamed`,  `${base}/sub`,          'moved',  'directory'),
      checkEntryWithSource(`${base}/sub-copy`,     `${base}/sub-renamed`,  'copied', 'directory'),
      checkEntry(`${base}/target.txt`,   'deleted',  'file'),
      checkEntry(base,                   'deleted',  'directory'),
    ];

    const failCount = results.filter(r => !r).length;
    if (failCount) throw new Error(`${failCount} notification check(s) failed`);
  });

  const total = passed + failed;
  summary.textContent = `${passed}/${total} passed`;
  summary.className = failed ? 'fail' : 'pass';
  summary.style.color = failed ? '#f44747' : '#4ec9b0';
}

// ── Startup ───────────────────────────────────────────────────────────────────

const _params     = new URLSearchParams(location.search);
const _storageRef = _params.has('storageRef') ? JSON.parse(_params.get('storageRef')) : null;

// Resolve and display target info at page load, before Run Tests is clicked.
resolveTargetLabel(_storageRef).then(label => {
  document.getElementById('target-info').textContent = `Target: ${label}`;
});

document.getElementById('btn-run').addEventListener('click', () => runTests(_storageRef));
