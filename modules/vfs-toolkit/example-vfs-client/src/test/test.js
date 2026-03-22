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
    console.error(`[test] ${label}`, err);
    const li = document.createElement('li');
    li.className = 'fail';
    li.textContent = `✗ ${label}: ${err.message}`;
    const div = document.createElement('div');
    div.className = 'detail';
    const checkLines = checks.map(c => `${c.ok ? '✓' : '✗'} ${c.msg}`).join('\n');
    const errInfo = [err.name !== 'Error' ? `${err.name}${err.code != null ? ` (code ${err.code})` : ''}` : null, err.detail, err.stack].filter(Boolean).join('\n');
    div.textContent = [checkLines, errInfo].filter(Boolean).join('\n');
    li.appendChild(div);
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

function checkErrorCode(checks, err, expected) {
  const ok = err?.code === expected;
  checks.push({ ok, msg: `error code: ${err?.code ?? '(none)'} (expected ${expected})` });
  if (!ok) {
    const detail = `Expected: ${expected}\nReceived: ${err?.code ?? '(none)'}`;
    const e = new Error('Wrong error code');
    e.detail = detail;
    throw e;
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
  const opfsBase = base + '-xp';

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

  // 6. binary round-trip
  await run('writeFile + readFile preserves binary content', async (checks) => {
    const original = new Uint8Array([0, 1, 127, 128, 255, 42, 0, 99]);
    await vfs.writeFile(
      { storageRef, path: `${base}/binary.bin` },
      new File([original], 'binary.bin', { type: 'application/octet-stream' }),
    );
    const result = await vfs.readFile({ storageRef, path: `${base}/binary.bin` });
    const bytes = new Uint8Array(await result.arrayBuffer());
    const match = bytes.length === original.length && original.every((b, i) => bytes[i] === b);
    const detail = match
      ? `${bytes.length} bytes match`
      : `Expected [${[...original]}]\nReceived [${[...bytes]}]`;
    checks.push({ ok: match, msg: detail });
    if (!match) { const e = new Error('Binary content mismatch'); e.detail = detail; throw e; }
  });

  // 7. readFile on non-existent path throws
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
    await vfs.moveFile({ storageRef, path: `${base}/hello.txt` }, { storageRef, path: `${base}/renamed.txt` });
    const entries = await list(storageRef, base);
    checkNotInEntries(checks, entries, 'hello.txt');
    checkInEntries(checks, entries, 'renamed.txt', 'file');
    const moved = await vfs.readFile({ storageRef, path: `${base}/renamed.txt` });
    checkContent(checks, await moved.text(), 'world', 'renamed.txt content after move');
  });

  // 9. copyFile
  await run('copyFile creates a copy', async (checks) => {
    await vfs.copyFile({ storageRef, path: `${base}/renamed.txt` }, { storageRef, path: `${base}/copy.txt` });
    const entries = await list(storageRef, base);
    checkInEntries(checks, entries, 'renamed.txt', 'file');
    checkInEntries(checks, entries, 'copy.txt', 'file');
    const copied = await vfs.readFile({ storageRef, path: `${base}/copy.txt` });
    checkContent(checks, await copied.text(), 'world', 'copy.txt content after copy');
  });

  // 10. copyFile with overwrite
  await run('copyFile overwrites existing file', async (checks) => {
    const file = new File(['overwritten'], 'target.txt', { type: 'text/plain' });
    await vfs.writeFile({ storageRef, path: `${base}/target.txt` }, file);
    await vfs.copyFile({ storageRef, path: `${base}/renamed.txt` }, { storageRef, path: `${base}/target.txt` }, { overwrite: true });
    const entry = await vfs.readFile({ storageRef, path: `${base}/target.txt` });
    const text = await entry.text();
    checkContent(checks, text, 'world', 'target.txt content after copy overwrite');
  });

  // 11. moveFile with overwrite
  await run('moveFile overwrites existing file', async (checks) => {
    const file = new File(['to-be-replaced'], 'dest.txt', { type: 'text/plain' });
    await vfs.writeFile({ storageRef, path: `${base}/dest.txt` }, file);
    await vfs.moveFile({ storageRef, path: `${base}/copy.txt` }, { storageRef, path: `${base}/dest.txt` }, { overwrite: true });
    const entries = await list(storageRef, base);
    checkNotInEntries(checks, entries, 'copy.txt');
    const entry = await vfs.readFile({ storageRef, path: `${base}/dest.txt` });
    const text = await entry.text();
    checkContent(checks, text, 'world', 'dest.txt content after move overwrite');
  });

  // 12. moveFolder
  await run('moveFolder renames a folder', async (checks) => {
    await vfs.writeFile({ storageRef, path: `${base}/sub/inner.txt` }, new File(['inner-content'], 'inner.txt'));
    await vfs.moveFolder({ storageRef, path: `${base}/sub` }, { storageRef, path: `${base}/sub-renamed` });
    const entries = await list(storageRef, base);
    checkNotInEntries(checks, entries, 'sub');
    checkInEntries(checks, entries, 'sub-renamed', 'directory');
    const moved = await vfs.readFile({ storageRef, path: `${base}/sub-renamed/inner.txt` });
    checkContent(checks, await moved.text(), 'inner-content', 'inner.txt content after folder move');
  });

  // 13. copyFolder
  await run('copyFolder duplicates a folder', async (checks) => {
    // Ensure source exists in case the moveFolder test above failed or was skipped.
    await vfs.writeFile({ storageRef, path: `${base}/sub-renamed/inner.txt` }, new File(['inner-content'], 'inner.txt'), { overwrite: true });
    await vfs.copyFolder({ storageRef, path: `${base}/sub-renamed` }, { storageRef, path: `${base}/sub-copy` });
    const entries = await list(storageRef, base);
    checkInEntries(checks, entries, 'sub-renamed', 'directory');
    checkInEntries(checks, entries, 'sub-copy', 'directory');
    const copied = await vfs.readFile({ storageRef, path: `${base}/sub-copy/inner.txt` });
    checkContent(checks, await copied.text(), 'inner-content', 'inner.txt content after folder copy');
  });

  // 14. moveFolderWithProgress
  await run('moveFolderWithProgress renames a folder', async (checks) => {
    // Ensure source has a file so we can verify content fidelity.
    // sub-copy/inner.txt may already exist from the copyFolder test above — overwrite it.
    await vfs.writeFile({ storageRef, path: `${base}/sub-copy/inner.txt` }, new File(['inner-content'], 'inner.txt'), { overwrite: true });
    let lastDone = 0, lastTotal = 0;
    await vfs.moveFolderWithProgress(
      { storageRef, path: `${base}/sub-copy` },
      { storageRef, path: `${base}/sub-indiv-moved` },
      { onProgress: p => { lastDone = p.currentFile; lastTotal = p.totalFiles; } }
    );
    const entries = await list(storageRef, base);
    checkNotInEntries(checks, entries, 'sub-copy');
    checkInEntries(checks, entries, 'sub-indiv-moved', 'directory');
    const moved = await vfs.readFile({ storageRef, path: `${base}/sub-indiv-moved/inner.txt` });
    checkContent(checks, await moved.text(), 'inner-content', 'inner.txt content after individual folder move');
    checks.push({ ok: lastDone > 0 && lastDone === lastTotal, msg: `onProgress reached done===total (${lastDone}/${lastTotal})` });
  });

  // 15. copyFolderWithProgress
  await run('copyFolderWithProgress duplicates a folder', async (checks) => {
    // Ensure source exists in case the moveFolderWithProgress test above failed or was skipped.
    await vfs.writeFile({ storageRef, path: `${base}/sub-indiv-moved/inner.txt` }, new File(['inner-content'], 'inner.txt'), { overwrite: true });
    let lastDone = 0, lastTotal = 0;
    await vfs.copyFolderWithProgress(
      { storageRef, path: `${base}/sub-indiv-moved` },
      { storageRef, path: `${base}/sub-indiv-copy` },
      { onProgress: p => { lastDone = p.currentFile; lastTotal = p.totalFiles; } }
    );
    const entries = await list(storageRef, base);
    checkInEntries(checks, entries, 'sub-indiv-moved', 'directory');
    checkInEntries(checks, entries, 'sub-indiv-copy', 'directory');
    const copied = await vfs.readFile({ storageRef, path: `${base}/sub-indiv-copy/inner.txt` });
    checkContent(checks, await copied.text(), 'inner-content', 'inner.txt content after individual folder copy');
    checks.push({ ok: lastDone > 0 && lastDone === lastTotal, msg: `onProgress reached done===total (${lastDone}/${lastTotal})` });
  });

  // 16. getCapabilities (was 14)
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

  // 17. getStorageUsage (was 15)
  await run('getStorageUsage returns usage info', async (checks) => {
    const { usage, quota } = await vfs.getStorageUsage(storageRef);
    checks.push({ ok: true, msg: `usage: ${usage}, quota: ${quota}` });
    const usageOk = usage === null || typeof usage === 'number';
    const quotaOk = quota === null || typeof quota === 'number';
    checks.push({ ok: usageOk, msg: `usage type: ${usage === null ? 'null' : typeof usage} (expected number|null)` });
    checks.push({ ok: quotaOk, msg: `quota type: ${quota === null ? 'null' : typeof quota} (expected number|null)` });
    if (!usageOk || !quotaOk) throw new Error('usage/quota type mismatch');
  });

  // ── Cross-provider tests (only when testing against a provider, not OPFS) ───

  if (storageRef) {
    // Setup: source files on the provider side and an OPFS base folder.
    await run('cross-provider: setup', async (checks) => {
      await vfs.writeFile({ storageRef, path: `${base}/xp-src.txt` }, new File(['xp-content'], 'xp-src.txt'));
      await vfs.addFolder({ storageRef, path: `${base}/xp-folder` });
      await vfs.writeFile({ storageRef, path: `${base}/xp-folder/nested.txt` }, new File(['nested'], 'nested.txt'));
      await vfs.addFolder({ storageRef: null, path: opfsBase });
      await vfs.writeFile({ storageRef: null, path: `${opfsBase}/opfs-src.txt` }, new File(['opfs-content'], 'opfs-src.txt'));
      checks.push({ ok: true, msg: 'provider files + OPFS base folder created' });
    });

    // copyFile: provider → OPFS
    await run('cross-provider copyFile: provider → OPFS', async (checks) => {
      await vfs.copyFile(
        { storageRef, path: `${base}/xp-src.txt` },
        { storageRef: null, path: `${opfsBase}/xp-copy.txt` },
      );
      const dest = await vfs.readFile({ storageRef: null, path: `${opfsBase}/xp-copy.txt` });
      checkContent(checks, await dest.text(), 'xp-content', 'copied file content');
      // source still present on provider
      const srcEntries = await list(storageRef, base);
      checkInEntries(checks, srcEntries, 'xp-src.txt', 'file');
    });

    // moveFile: provider → OPFS
    await run('cross-provider moveFile: provider → OPFS', async (checks) => {
      await vfs.moveFile(
        { storageRef, path: `${base}/xp-src.txt` },
        { storageRef: null, path: `${opfsBase}/xp-moved.txt` },
      );
      const dest = await vfs.readFile({ storageRef: null, path: `${opfsBase}/xp-moved.txt` });
      checkContent(checks, await dest.text(), 'xp-content', 'moved file content');
      // source gone from provider
      const srcEntries = await list(storageRef, base);
      checkNotInEntries(checks, srcEntries, 'xp-src.txt');
    });

    // copyFile: OPFS → provider
    await run('cross-provider copyFile: OPFS → provider', async (checks) => {
      await vfs.copyFile(
        { storageRef: null, path: `${opfsBase}/opfs-src.txt` },
        { storageRef, path: `${base}/from-opfs-copy.txt` },
      );
      const dest = await vfs.readFile({ storageRef, path: `${base}/from-opfs-copy.txt` });
      checkContent(checks, await dest.text(), 'opfs-content', 'copied file content');
      // source still present in OPFS
      const opfsEntries = await list(null, opfsBase);
      checkInEntries(checks, opfsEntries, 'opfs-src.txt', 'file');
    });

    // moveFile: OPFS → provider
    await run('cross-provider moveFile: OPFS → provider', async (checks) => {
      await vfs.moveFile(
        { storageRef: null, path: `${opfsBase}/opfs-src.txt` },
        { storageRef, path: `${base}/from-opfs-moved.txt` },
      );
      const dest = await vfs.readFile({ storageRef, path: `${base}/from-opfs-moved.txt` });
      checkContent(checks, await dest.text(), 'opfs-content', 'moved file content');
      // source gone from OPFS
      const opfsEntries = await list(null, opfsBase);
      checkNotInEntries(checks, opfsEntries, 'opfs-src.txt');
    });

    // copyFile with overwrite: provider → OPFS
    await run('cross-provider copyFile overwrites existing file: provider → OPFS', async (checks) => {
      await vfs.writeFile({ storageRef, path: `${base}/xp-ow-src.txt` }, new File(['ow-provider'], 'xp-ow-src.txt'));
      await vfs.writeFile({ storageRef: null, path: `${opfsBase}/xp-ow-dest.txt` }, new File(['ow-original'], 'xp-ow-dest.txt'));
      await vfs.copyFile(
        { storageRef, path: `${base}/xp-ow-src.txt` },
        { storageRef: null, path: `${opfsBase}/xp-ow-dest.txt` },
        { overwrite: true },
      );
      const dest = await vfs.readFile({ storageRef: null, path: `${opfsBase}/xp-ow-dest.txt` });
      checkContent(checks, await dest.text(), 'ow-provider', 'dest content replaced by provider source');
      const srcEntries = await list(storageRef, base);
      checkInEntries(checks, srcEntries, 'xp-ow-src.txt', 'file');
    });

    // copyFile with overwrite: OPFS → provider
    await run('cross-provider copyFile overwrites existing file: OPFS → provider', async (checks) => {
      await vfs.writeFile({ storageRef: null, path: `${opfsBase}/xp-ow-opfs-src.txt` }, new File(['ow-opfs'], 'xp-ow-opfs-src.txt'));
      await vfs.writeFile({ storageRef, path: `${base}/xp-ow-opfs-dest.txt` }, new File(['ow-original'], 'xp-ow-opfs-dest.txt'));
      await vfs.copyFile(
        { storageRef: null, path: `${opfsBase}/xp-ow-opfs-src.txt` },
        { storageRef, path: `${base}/xp-ow-opfs-dest.txt` },
        { overwrite: true },
      );
      const dest = await vfs.readFile({ storageRef, path: `${base}/xp-ow-opfs-dest.txt` });
      checkContent(checks, await dest.text(), 'ow-opfs', 'dest content replaced by OPFS source');
      const srcEntries = await list(null, opfsBase);
      checkInEntries(checks, srcEntries, 'xp-ow-opfs-src.txt', 'file');
    });

    // moveFile with overwrite: provider → OPFS
    await run('cross-provider moveFile overwrites existing file: provider → OPFS', async (checks) => {
      await vfs.writeFile({ storageRef, path: `${base}/xp-mv-ow-src.txt` }, new File(['mv-ow-provider'], 'xp-mv-ow-src.txt'));
      await vfs.writeFile({ storageRef: null, path: `${opfsBase}/xp-mv-ow-dest.txt` }, new File(['mv-ow-original'], 'xp-mv-ow-dest.txt'));
      await vfs.moveFile(
        { storageRef, path: `${base}/xp-mv-ow-src.txt` },
        { storageRef: null, path: `${opfsBase}/xp-mv-ow-dest.txt` },
        { overwrite: true },
      );
      const dest = await vfs.readFile({ storageRef: null, path: `${opfsBase}/xp-mv-ow-dest.txt` });
      checkContent(checks, await dest.text(), 'mv-ow-provider', 'dest content replaced by provider source');
      const srcEntries = await list(storageRef, base);
      checkNotInEntries(checks, srcEntries, 'xp-mv-ow-src.txt');
    });

    // moveFile with overwrite: OPFS → provider
    await run('cross-provider moveFile overwrites existing file: OPFS → provider', async (checks) => {
      await vfs.writeFile({ storageRef: null, path: `${opfsBase}/xp-mv-ow-opfs-src.txt` }, new File(['mv-ow-opfs'], 'xp-mv-ow-opfs-src.txt'));
      await vfs.writeFile({ storageRef, path: `${base}/xp-mv-ow-opfs-dest.txt` }, new File(['mv-ow-original'], 'xp-mv-ow-opfs-dest.txt'));
      await vfs.moveFile(
        { storageRef: null, path: `${opfsBase}/xp-mv-ow-opfs-src.txt` },
        { storageRef, path: `${base}/xp-mv-ow-opfs-dest.txt` },
        { overwrite: true },
      );
      const dest = await vfs.readFile({ storageRef, path: `${base}/xp-mv-ow-opfs-dest.txt` });
      checkContent(checks, await dest.text(), 'mv-ow-opfs', 'dest content replaced by OPFS source');
      const srcEntries = await list(null, opfsBase);
      checkNotInEntries(checks, srcEntries, 'xp-mv-ow-opfs-src.txt');
    });

    // copyFolder: provider → OPFS
    await run('cross-provider copyFolder: provider → OPFS', async (checks) => {
      await vfs.copyFolder(
        { storageRef, path: `${base}/xp-folder` },
        { storageRef: null, path: `${opfsBase}/xp-folder-copy` },
      );
      const destEntries = await list(null, `${opfsBase}/xp-folder-copy`);
      checkInEntries(checks, destEntries, 'nested.txt', 'file');
      const content = await vfs.readFile({ storageRef: null, path: `${opfsBase}/xp-folder-copy/nested.txt` });
      checkContent(checks, await content.text(), 'nested', 'nested.txt content');
      // source still present on provider
      const srcEntries = await list(storageRef, base);
      checkInEntries(checks, srcEntries, 'xp-folder', 'directory');
    });

    // moveFolder: provider → OPFS
    await run('cross-provider moveFolder: provider → OPFS', async (checks) => {
      await vfs.moveFolder(
        { storageRef, path: `${base}/xp-folder` },
        { storageRef: null, path: `${opfsBase}/xp-folder-moved` },
      );
      const destEntries = await list(null, `${opfsBase}/xp-folder-moved`);
      checkInEntries(checks, destEntries, 'nested.txt', 'file');
      const content = await vfs.readFile({ storageRef: null, path: `${opfsBase}/xp-folder-moved/nested.txt` });
      checkContent(checks, await content.text(), 'nested', 'nested.txt content after folder move');
      // source gone from provider
      const srcEntries = await list(storageRef, base);
      checkNotInEntries(checks, srcEntries, 'xp-folder');
    });

    // copyFolderWithProgress: provider → OPFS
    await run('cross-provider copyFolderWithProgress: provider → OPFS', async (checks) => {
      await vfs.addFolder({ storageRef, path: `${base}/xp-indiv-folder` });
      await vfs.writeFile({ storageRef, path: `${base}/xp-indiv-folder/nested.txt` }, new File(['indiv-nested'], 'nested.txt'));
      let lastDone = 0, lastTotal = 0;
      await vfs.copyFolderWithProgress(
        { storageRef, path: `${base}/xp-indiv-folder` },
        { storageRef: null, path: `${opfsBase}/xp-indiv-folder-copy` },
        { onProgress: p => { lastDone = p.currentFile; lastTotal = p.totalFiles; } }
      );
      const destEntries = await list(null, `${opfsBase}/xp-indiv-folder-copy`);
      checkInEntries(checks, destEntries, 'nested.txt', 'file');
      const content = await vfs.readFile({ storageRef: null, path: `${opfsBase}/xp-indiv-folder-copy/nested.txt` });
      checkContent(checks, await content.text(), 'indiv-nested', 'nested.txt content (cross-provider individual copy)');
      const srcEntries = await list(storageRef, base);
      checkInEntries(checks, srcEntries, 'xp-indiv-folder', 'directory');
      checks.push({ ok: lastDone > 0 && lastDone === lastTotal, msg: `onProgress reached done===total (${lastDone}/${lastTotal})` });
    });

    // moveFolderWithProgress: provider → OPFS
    await run('cross-provider moveFolderWithProgress: provider → OPFS', async (checks) => {
      let lastDone = 0, lastTotal = 0;
      await vfs.moveFolderWithProgress(
        { storageRef, path: `${base}/xp-indiv-folder` },
        { storageRef: null, path: `${opfsBase}/xp-indiv-folder-moved` },
        { onProgress: p => { lastDone = p.currentFile; lastTotal = p.totalFiles; } }
      );
      const destEntries = await list(null, `${opfsBase}/xp-indiv-folder-moved`);
      checkInEntries(checks, destEntries, 'nested.txt', 'file');
      const content = await vfs.readFile({ storageRef: null, path: `${opfsBase}/xp-indiv-folder-moved/nested.txt` });
      checkContent(checks, await content.text(), 'indiv-nested', 'nested.txt content (cross-provider individual move)');
      const srcEntries = await list(storageRef, base);
      checkNotInEntries(checks, srcEntries, 'xp-indiv-folder');
      checks.push({ ok: lastDone > 0 && lastDone === lastTotal, msg: `onProgress reached done===total (${lastDone}/${lastTotal})` });
    });

    // copyFolder: OPFS → provider
    await run('cross-provider copyFolder: OPFS → provider', async (checks) => {
      await vfs.addFolder({ storageRef: null, path: `${opfsBase}/xp-opfs-folder` });
      await vfs.writeFile({ storageRef: null, path: `${opfsBase}/xp-opfs-folder/nested.txt` }, new File(['opfs-nested'], 'nested.txt'));
      await vfs.copyFolder(
        { storageRef: null, path: `${opfsBase}/xp-opfs-folder` },
        { storageRef, path: `${base}/xp-opfs-folder-copy` },
      );
      const destEntries = await list(storageRef, `${base}/xp-opfs-folder-copy`);
      checkInEntries(checks, destEntries, 'nested.txt', 'file');
      const content = await vfs.readFile({ storageRef, path: `${base}/xp-opfs-folder-copy/nested.txt` });
      checkContent(checks, await content.text(), 'opfs-nested', 'nested.txt content');
      // source still present in OPFS
      const srcEntries = await list(null, opfsBase);
      checkInEntries(checks, srcEntries, 'xp-opfs-folder', 'directory');
    });

    // moveFolder: OPFS → provider
    await run('cross-provider moveFolder: OPFS → provider', async (checks) => {
      await vfs.addFolder({ storageRef: null, path: `${opfsBase}/xp-opfs-folder-mv` });
      await vfs.writeFile({ storageRef: null, path: `${opfsBase}/xp-opfs-folder-mv/nested.txt` }, new File(['opfs-nested-mv'], 'nested.txt'));
      await vfs.moveFolder(
        { storageRef: null, path: `${opfsBase}/xp-opfs-folder-mv` },
        { storageRef, path: `${base}/xp-opfs-folder-moved` },
      );
      const destEntries = await list(storageRef, `${base}/xp-opfs-folder-moved`);
      checkInEntries(checks, destEntries, 'nested.txt', 'file');
      const content = await vfs.readFile({ storageRef, path: `${base}/xp-opfs-folder-moved/nested.txt` });
      checkContent(checks, await content.text(), 'opfs-nested-mv', 'nested.txt content after folder move');
      // source gone from OPFS
      const opfsEntries = await list(null, opfsBase);
      checkNotInEntries(checks, opfsEntries, 'xp-opfs-folder-mv');
    });

    // copyFolderWithProgress: OPFS → provider
    await run('cross-provider copyFolderWithProgress: OPFS → provider', async (checks) => {
      await vfs.addFolder({ storageRef: null, path: `${opfsBase}/xp-opfs-indiv-folder` });
      await vfs.writeFile({ storageRef: null, path: `${opfsBase}/xp-opfs-indiv-folder/nested.txt` }, new File(['opfs-indiv-nested'], 'nested.txt'));
      let lastDone = 0, lastTotal = 0;
      await vfs.copyFolderWithProgress(
        { storageRef: null, path: `${opfsBase}/xp-opfs-indiv-folder` },
        { storageRef, path: `${base}/xp-opfs-indiv-folder-copy` },
        { onProgress: p => { lastDone = p.currentFile; lastTotal = p.totalFiles; } },
      );
      const destEntries = await list(storageRef, `${base}/xp-opfs-indiv-folder-copy`);
      checkInEntries(checks, destEntries, 'nested.txt', 'file');
      const content = await vfs.readFile({ storageRef, path: `${base}/xp-opfs-indiv-folder-copy/nested.txt` });
      checkContent(checks, await content.text(), 'opfs-indiv-nested', 'nested.txt content (OPFS → provider individual copy)');
      // source still present in OPFS
      const srcEntries = await list(null, opfsBase);
      checkInEntries(checks, srcEntries, 'xp-opfs-indiv-folder', 'directory');
      checks.push({ ok: lastDone > 0 && lastDone === lastTotal, msg: `onProgress reached done===total (${lastDone}/${lastTotal})` });
    });

    // moveFolderWithProgress: OPFS → provider
    await run('cross-provider moveFolderWithProgress: OPFS → provider', async (checks) => {
      await vfs.addFolder({ storageRef: null, path: `${opfsBase}/xp-opfs-indiv-folder-mv` });
      await vfs.writeFile({ storageRef: null, path: `${opfsBase}/xp-opfs-indiv-folder-mv/nested.txt` }, new File(['opfs-indiv-nested-mv'], 'nested.txt'));
      let lastDone = 0, lastTotal = 0;
      await vfs.moveFolderWithProgress(
        { storageRef: null, path: `${opfsBase}/xp-opfs-indiv-folder-mv` },
        { storageRef, path: `${base}/xp-opfs-indiv-folder-moved` },
        { onProgress: p => { lastDone = p.currentFile; lastTotal = p.totalFiles; } },
      );
      const destEntries = await list(storageRef, `${base}/xp-opfs-indiv-folder-moved`);
      checkInEntries(checks, destEntries, 'nested.txt', 'file');
      const content = await vfs.readFile({ storageRef, path: `${base}/xp-opfs-indiv-folder-moved/nested.txt` });
      checkContent(checks, await content.text(), 'opfs-indiv-nested-mv', 'nested.txt content (OPFS → provider individual move)');
      // source gone from OPFS
      const opfsEntries = await list(null, opfsBase);
      checkNotInEntries(checks, opfsEntries, 'xp-opfs-indiv-folder-mv');
      checks.push({ ok: lastDone > 0 && lastDone === lastTotal, msg: `onProgress reached done===total (${lastDone}/${lastTotal})` });
    });

    // copyFolder with merge: provider → OPFS
    await run('cross-provider copyFolder merges into existing folder: provider → OPFS', async (checks) => {
      await vfs.addFolder({ storageRef, path: `${base}/xp-merge-src` });
      await vfs.writeFile({ storageRef, path: `${base}/xp-merge-src/from-provider.txt` }, new File(['provider-file'], 'from-provider.txt'));
      await vfs.addFolder({ storageRef: null, path: `${opfsBase}/xp-merge-dest` });
      await vfs.writeFile({ storageRef: null, path: `${opfsBase}/xp-merge-dest/pre-existing.txt` }, new File(['pre-existing'], 'pre-existing.txt'));
      await vfs.copyFolder(
        { storageRef, path: `${base}/xp-merge-src` },
        { storageRef: null, path: `${opfsBase}/xp-merge-dest` },
        { merge: true },
      );
      const destEntries = await list(null, `${opfsBase}/xp-merge-dest`);
      checkInEntries(checks, destEntries, 'from-provider.txt', 'file');
      checkInEntries(checks, destEntries, 'pre-existing.txt', 'file');
      const srcEntries = await list(storageRef, base);
      checkInEntries(checks, srcEntries, 'xp-merge-src', 'directory');
    });

    // copyFolder with merge: OPFS → provider
    await run('cross-provider copyFolder merges into existing folder: OPFS → provider', async (checks) => {
      await vfs.addFolder({ storageRef: null, path: `${opfsBase}/xp-merge-opfs-src` });
      await vfs.writeFile({ storageRef: null, path: `${opfsBase}/xp-merge-opfs-src/from-opfs.txt` }, new File(['opfs-file'], 'from-opfs.txt'));
      await vfs.addFolder({ storageRef, path: `${base}/xp-merge-opfs-dest` });
      await vfs.writeFile({ storageRef, path: `${base}/xp-merge-opfs-dest/pre-existing.txt` }, new File(['pre-existing'], 'pre-existing.txt'));
      await vfs.copyFolder(
        { storageRef: null, path: `${opfsBase}/xp-merge-opfs-src` },
        { storageRef, path: `${base}/xp-merge-opfs-dest` },
        { merge: true },
      );
      const destEntries = await list(storageRef, `${base}/xp-merge-opfs-dest`);
      checkInEntries(checks, destEntries, 'from-opfs.txt', 'file');
      checkInEntries(checks, destEntries, 'pre-existing.txt', 'file');
      const srcEntries = await list(null, opfsBase);
      checkInEntries(checks, srcEntries, 'xp-merge-opfs-src', 'directory');
    });

    // moveFolder with merge: provider → OPFS
    await run('cross-provider moveFolder merges into existing folder: provider → OPFS', async (checks) => {
      await vfs.addFolder({ storageRef, path: `${base}/xp-mv-merge-src` });
      await vfs.writeFile({ storageRef, path: `${base}/xp-mv-merge-src/from-provider.txt` }, new File(['mv-provider-file'], 'from-provider.txt'));
      await vfs.addFolder({ storageRef: null, path: `${opfsBase}/xp-mv-merge-dest` });
      await vfs.writeFile({ storageRef: null, path: `${opfsBase}/xp-mv-merge-dest/pre-existing.txt` }, new File(['pre-existing'], 'pre-existing.txt'));
      await vfs.moveFolder(
        { storageRef, path: `${base}/xp-mv-merge-src` },
        { storageRef: null, path: `${opfsBase}/xp-mv-merge-dest` },
        { merge: true },
      );
      const destEntries = await list(null, `${opfsBase}/xp-mv-merge-dest`);
      checkInEntries(checks, destEntries, 'from-provider.txt', 'file');
      checkInEntries(checks, destEntries, 'pre-existing.txt', 'file');
      const srcEntries = await list(storageRef, base);
      checkNotInEntries(checks, srcEntries, 'xp-mv-merge-src');
    });

    // moveFolder with merge: OPFS → provider
    await run('cross-provider moveFolder merges into existing folder: OPFS → provider', async (checks) => {
      await vfs.addFolder({ storageRef: null, path: `${opfsBase}/xp-mv-merge-opfs-src` });
      await vfs.writeFile({ storageRef: null, path: `${opfsBase}/xp-mv-merge-opfs-src/from-opfs.txt` }, new File(['mv-opfs-file'], 'from-opfs.txt'));
      await vfs.addFolder({ storageRef, path: `${base}/xp-mv-merge-opfs-dest` });
      await vfs.writeFile({ storageRef, path: `${base}/xp-mv-merge-opfs-dest/pre-existing.txt` }, new File(['pre-existing'], 'pre-existing.txt'));
      await vfs.moveFolder(
        { storageRef: null, path: `${opfsBase}/xp-mv-merge-opfs-src` },
        { storageRef, path: `${base}/xp-mv-merge-opfs-dest` },
        { merge: true },
      );
      const destEntries = await list(storageRef, `${base}/xp-mv-merge-opfs-dest`);
      checkInEntries(checks, destEntries, 'from-opfs.txt', 'file');
      checkInEntries(checks, destEntries, 'pre-existing.txt', 'file');
      const srcEntries = await list(null, opfsBase);
      checkNotInEntries(checks, srcEntries, 'xp-mv-merge-opfs-src');
    });

    // OPFS cleanup (provider leftover files are cleaned up by deleteFolder below)
    await run('cross-provider: OPFS cleanup', async (checks) => {
      await vfs.deleteFolder({ storageRef: null, path: opfsBase });
      checks.push({ ok: true, msg: 'OPFS base folder removed' });
    });
  }

  // ── Edge cases ────────────────────────────────────────────────────────────────

  await run('list on "/" returns results without throwing', async (checks) => {
    const entries = await list(storageRef, '/');
    checks.push({ ok: Array.isArray(entries), msg: `list("/") returned ${entries.length} entries` });
    if (!Array.isArray(entries)) throw new Error('Expected an array from list("/")');
  });

  await run('addFolder creates deeply nested path (mkdirp)', async (checks) => {
    await vfs.addFolder({ storageRef, path: `${base}/edge/inner` });
    const entries = await list(storageRef, `${base}/edge`);
    checkInEntries(checks, entries, 'inner', 'directory');
  });

  await run('writeFile auto-creates intermediate directories', async (checks) => {
    await vfs.writeFile(
      { storageRef, path: `${base}/deep/nested/deep-file.txt` },
      new File(['deep'], 'deep-file.txt'),
    );
    const entry = await vfs.readFile({ storageRef, path: `${base}/deep/nested/deep-file.txt` });
    checkContent(checks, await entry.text(), 'deep', 'deep-file.txt content');
  });

  await run('moveFile moves into a different subdirectory', async (checks) => {
    await vfs.writeFile(
      { storageRef, path: `${base}/xdir-src.txt` },
      new File(['xdir'], 'xdir-src.txt'),
    );
    await vfs.moveFile(
      { storageRef, path: `${base}/xdir-src.txt` },
      { storageRef, path: `${base}/sub-renamed/xdir-dest.txt` },
    );
    const subEntries = await list(storageRef, `${base}/sub-renamed`);
    checkInEntries(checks, subEntries, 'xdir-dest.txt', 'file');
    const baseEntries = await list(storageRef, base);
    checkNotInEntries(checks, baseEntries, 'xdir-src.txt');
  });

  // ── Error cases ───────────────────────────────────────────────────────────────

  await run('writeFile throws E:EXIST on existing file without overwrite', async (checks) => {
    // Create the file first, then try to write it again without overwrite.
    await vfs.writeFile({ storageRef, path: `${base}/file-exist.txt` }, new File(['original'], 'file-exist.txt'));
    let err;
    try { await vfs.writeFile({ storageRef, path: `${base}/file-exist.txt` }, new File(['x'], 'x')); }
    catch (e) { err = e; }
    checkThrows(checks, !!err, 'writeFile(file-exist.txt)');
    checkErrorCode(checks, err, 'E:EXIST');
  });

  await run('addFolder throws E:EXIST on existing folder', async (checks) => {
    // Create the folder first, then try to create it again.
    await vfs.addFolder({ storageRef, path: `${base}/addFolder-exist` });
    let err;
    try { await vfs.addFolder({ storageRef, path: `${base}/addFolder-exist` }); }
    catch (e) { err = e; }
    checkThrows(checks, !!err, 'addFolder(addFolder-exist)');
    checkErrorCode(checks, err, 'E:EXIST');
  });

  await run('copyFile throws E:EXIST on existing dest without overwrite', async (checks) => {
    // Create a dedicated source and destination to avoid relying on earlier test state.
    await vfs.writeFile({ storageRef, path: `${base}/copy-exist-src.txt` }, new File(['src'], 'copy-exist-src.txt'));
    await vfs.writeFile({ storageRef, path: `${base}/copy-exist-dest.txt` }, new File(['dest'], 'copy-exist-dest.txt'));
    let err;
    try {
      await vfs.copyFile(
        { storageRef, path: `${base}/copy-exist-src.txt` },
        { storageRef, path: `${base}/copy-exist-dest.txt` },
      );
    } catch (e) { err = e; }
    checkThrows(checks, !!err, 'copyFile(copy-exist-src.txt → copy-exist-dest.txt)');
    checkErrorCode(checks, err, 'E:EXIST');
  });

  await run('moveFile throws E:EXIST on existing dest without overwrite', async (checks) => {
    // Create a dedicated source and destination to avoid relying on earlier test state.
    await vfs.writeFile({ storageRef, path: `${base}/move-exist-src.txt` }, new File(['src'], 'move-exist-src.txt'));
    await vfs.writeFile({ storageRef, path: `${base}/move-exist-dest.txt` }, new File(['dest'], 'move-exist-dest.txt'));
    let err;
    try {
      await vfs.moveFile(
        { storageRef, path: `${base}/move-exist-src.txt` },
        { storageRef, path: `${base}/move-exist-dest.txt` },
      );
    } catch (e) { err = e; }
    checkThrows(checks, !!err, 'moveFile(move-exist-src.txt → move-exist-dest.txt)');
    checkErrorCode(checks, err, 'E:EXIST');
    // src must still exist after the failed move
    const entries = await list(storageRef, base);
    checkInEntries(checks, entries, 'move-exist-src.txt', 'file');
  });

  await run('copyFolder throws E:EXIST on existing dest without merge', async (checks) => {
    // Create a dedicated source and destination to avoid relying on earlier test state.
    await vfs.addFolder({ storageRef, path: `${base}/copy-exist-src` });
    await vfs.addFolder({ storageRef, path: `${base}/copy-exist-dest` });
    let err;
    try {
      await vfs.copyFolder(
        { storageRef, path: `${base}/copy-exist-src` },
        { storageRef, path: `${base}/copy-exist-dest` },
      );
    } catch (e) { err = e; }
    checkThrows(checks, !!err, 'copyFolder(copy-exist-src → copy-exist-dest)');
    checkErrorCode(checks, err, 'E:EXIST');
  });

  await run('moveFolder throws E:EXIST on existing dest without merge', async (checks) => {
    // Create a dedicated source and destination to avoid relying on earlier test state.
    await vfs.addFolder({ storageRef, path: `${base}/move-exist-src` });
    await vfs.addFolder({ storageRef, path: `${base}/move-exist-dest` });
    let err;
    try {
      await vfs.moveFolder(
        { storageRef, path: `${base}/move-exist-src` },
        { storageRef, path: `${base}/move-exist-dest` },
      );
    } catch (e) { err = e; }
    checkThrows(checks, !!err, 'moveFolder(move-exist-src → move-exist-dest)');
    checkErrorCode(checks, err, 'E:EXIST');
    // src must still exist after the failed move
    const entries = await list(storageRef, base);
    checkInEntries(checks, entries, 'move-exist-src', 'directory');
  });

  await run('deleteFile is silent for non-existent path', async (checks) => {
    await vfs.deleteFile({ storageRef, path: `${base}/does-not-exist.txt` });
    checks.push({ ok: true, msg: 'no error thrown' });
  });

  await run('deleteFolder is silent for non-existent path', async (checks) => {
    await vfs.deleteFolder({ storageRef, path: `${base}/no-such-folder` });
    checks.push({ ok: true, msg: 'no error thrown' });
  });

  // ── Cleanup ───────────────────────────────────────────────────────────────────

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

    function checkEntry(targetPath, action, kind) {
      const ok = notifiedEntries.some(e => e.target.path === targetPath && e.action === action && e.kind === kind);
      const label = `${action} ${kind}: ${targetPath}`;
      if (ok) {
        checks.push({ ok: true, msg: label });
      } else {
        const related = notifiedEntries.filter(e => e.target.path === targetPath);
        const detail = related.length
          ? `  received at same path: ${related.map(e => JSON.stringify(e)).join(', ')}`
          : '  no notifications at this path';
        checks.push({ ok: false, msg: `${label}\n${detail}` });
      }
      return ok;
    }

    function checkEntryWithSource(targetPath, sourcePath, action, kind) {
      const ok = notifiedEntries.some(e =>
        e.target.path === targetPath && e.source?.path === sourcePath && e.action === action && e.kind === kind
      );
      const label = `${action} ${kind}: ${sourcePath} → ${targetPath}`;
      if (ok) {
        checks.push({ ok: true, msg: label });
      } else {
        const related = notifiedEntries.filter(e => e.target.path === targetPath || e.source?.path === sourcePath);
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
      checkEntry(`${base}/binary.bin`,   'modified', 'file'),
      checkEntryWithSource(`${base}/renamed.txt`,  `${base}/hello.txt`,    'moved',  'file'),
      checkEntryWithSource(`${base}/copy.txt`,     `${base}/renamed.txt`,  'copied', 'file'),
      checkEntry(`${base}/target.txt`,   'modified', 'file'),
      checkEntryWithSource(`${base}/target.txt`,   `${base}/renamed.txt`,  'copied', 'file'),
      checkEntry(`${base}/dest.txt`,     'modified', 'file'),
      checkEntryWithSource(`${base}/dest.txt`,     `${base}/copy.txt`,     'moved',  'file'),
      checkEntry(`${base}/sub/inner.txt`,  'modified', 'file'),
      checkEntryWithSource(`${base}/sub-renamed`,  `${base}/sub`,          'moved',  'directory'),
      checkEntryWithSource(`${base}/sub-copy`,     `${base}/sub-renamed`,  'copied', 'directory'),
      checkEntryWithSource(`${base}/sub-indiv-moved`, `${base}/sub-copy`,  'moved',  'directory'),
      checkEntryWithSource(`${base}/sub-indiv-copy`,  `${base}/sub-indiv-moved`, 'copied', 'directory'),
      checkEntry(`${base}/target.txt`,   'deleted',  'file'),
      checkEntry(base,                   'deleted',  'directory'),
      // edge cases
      checkEntry(`${base}/edge/inner`,                'created',  'directory'),
      checkEntry(`${base}/deep/nested/deep-file.txt`, 'modified', 'file'),
      checkEntry(`${base}/xdir-src.txt`,            'modified', 'file'),
      checkEntryWithSource(`${base}/sub-renamed/xdir-dest.txt`, `${base}/xdir-src.txt`, 'moved', 'file'),
      // error case setup writes
      checkEntry(`${base}/file-exist.txt`,        'modified', 'file'),
      checkEntry(`${base}/copy-exist-src.txt`,    'modified', 'file'),
      checkEntry(`${base}/copy-exist-dest.txt`,   'modified', 'file'),
      checkEntry(`${base}/move-exist-src.txt`,    'modified', 'file'),
      checkEntry(`${base}/move-exist-dest.txt`,   'modified', 'file'),
      // error case folder setup
      checkEntry(`${base}/addFolder-exist`,  'created', 'directory'),
      checkEntry(`${base}/copy-exist-src`,   'created', 'directory'),
      checkEntry(`${base}/copy-exist-dest`,  'created', 'directory'),
      checkEntry(`${base}/move-exist-src`,   'created', 'directory'),
      checkEntry(`${base}/move-exist-dest`,  'created', 'directory'),
    ];

    if (storageRef) {
      results.push(
        checkEntryWithSource(`${opfsBase}/xp-copy.txt`,    `${base}/xp-src.txt`,         'copied', 'file'),
        checkEntryWithSource(`${opfsBase}/xp-moved.txt`,   `${base}/xp-src.txt`,         'moved',  'file'),
        checkEntryWithSource(`${base}/from-opfs-copy.txt`, `${opfsBase}/opfs-src.txt`,   'copied', 'file'),
        checkEntryWithSource(`${base}/from-opfs-moved.txt`,`${opfsBase}/opfs-src.txt`,   'moved',  'file'),
        checkEntryWithSource(`${opfsBase}/xp-folder-copy`, `${base}/xp-folder`,          'copied', 'directory'),
        checkEntryWithSource(`${opfsBase}/xp-folder-moved`,  `${base}/xp-folder`,           'moved',  'directory'),
        checkEntryWithSource(`${opfsBase}/xp-indiv-folder-copy`, `${base}/xp-indiv-folder`, 'copied', 'directory'),
        checkEntryWithSource(`${opfsBase}/xp-indiv-folder-moved`,`${base}/xp-indiv-folder`, 'moved',  'directory'),
        checkEntry(opfsBase,             'deleted',  'directory'),
      );
    }

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
