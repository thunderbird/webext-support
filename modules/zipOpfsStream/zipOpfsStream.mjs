/*
 * This file is provided by the webext-support repository at
 * https://github.com/thunderbird/webext-support
 *
 * For usage descriptions, please check:
 * https://github.com/thunderbird/webext-support/tree/master/modules/zipOpfsStream
 *
 * Version 1.0
 *
 * ZIP read/write without loading the archive into memory: the writer streams into the OPFS through
 * createWritable(), the reader slices single entries out of the file.
 */

const TMP_PREFIX = "zip-opfs-";
const TMP_SUFFIX = ".zip.tmp";
const CHUNK = 1024 * 1024;
const liveTempFiles = new Set();

/**
 * Check whether the APIs needed by this module are available in the current context.
 *
 * @returns {boolean}
 */
export function isSupported() {
  return (
    typeof CompressionStream !== "undefined" &&
    typeof DecompressionStream !== "undefined" &&
    !!globalThis.navigator?.storage?.getDirectory &&
    typeof FileSystemFileHandle !== "undefined" &&
    !!FileSystemFileHandle.prototype.createWritable
  );
}

/**
 * Remove temporary ZIP files which an earlier session left behind in the OPFS (for example after a
 * crash). Call it once at start-up. Files of writers which are alive in this context are kept.
 *
 * @returns {Promise<number>} number of removed files
 */
export async function removeStaleTempFiles() {
  let removed = 0;
  try {
    const root = await navigator.storage.getDirectory();
    const stale = [];
    for await (const [name] of root.entries()) {
      if (name.startsWith(TMP_PREFIX) && name.endsWith(TMP_SUFFIX) && !liveTempFiles.has(name)) {
        stale.push(name);
      }
    }
    for (const name of stale) {
      try {
        await root.removeEntry(name);
        removed++;
      } catch (ex) {
        // Still in use somewhere else, or already gone.
      }
    }
  } catch (ex) {
    // OPFS is not available, nothing to clean up.
  }
  return removed;
}

function newTempFileName() {
  const random = Math.random().toString(36).slice(2, 8);
  return `${TMP_PREFIX}${Date.now()}-${random}${TMP_SUFFIX}`;
}

async function removeTempFile(name) {
  const root = await navigator.storage.getDirectory();
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      await root.removeEntry(name);
      return;
    } catch (ex) {
      if (ex?.name === "NotFoundError") {
        return;
      }
      // A handle may still be closing.
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  console.error(`zip-opfs: could not remove temporary file ${name}`);
}

// ---------------------------------------------------------------------------------------------
// CRC32 (the web platform has no native implementation)

const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(crc, bytes) {
  let c = crc ^ -1;
  for (let i = 0; i < bytes.length; i++) {
    c = crcTable[(c ^ bytes[i]) & 255] ^ (c >>> 8);
  }
  return (c ^ -1) >>> 0;
}

// ---------------------------------------------------------------------------------------------
// Streaming ZIP64 builder. The sink only has to offer `async write(Uint8Array)`.
//   per file:  local header (sizes unknown, "data descriptor" flag) + deflate-raw data +
//              24 byte ZIP64 data descriptor
//   at the end: central directory + ZIP64 end records

const encoder = new TextEncoder();

function dosDateTime(date) {
  const d = date instanceof Date && !isNaN(date) ? date : new Date();
  const year = Math.min(Math.max(d.getFullYear(), 1980), 2107);
  return {
    time: ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff,
    date: (((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff,
  };
}

function checkEntryName(name) {
  if (typeof name !== "string" || name.length === 0 || name.includes("\0")) {
    throw new Error(`Invalid ZIP entry name: ${JSON.stringify(name)}`);
  }
  return name;
}

async function* toChunks(data) {
  if (typeof data === "string") {
    data = encoder.encode(data);
  }
  if (data instanceof Blob) {
    const reader = data.stream().getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      yield { bytes: value, owned: true };
    }
  }
  let bytes;
  if (data instanceof ArrayBuffer) {
    bytes = new Uint8Array(data);
  } else if (ArrayBuffer.isView(data)) {
    bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  } else {
    throw new Error("ZIP entry data must be a string, Blob, ArrayBuffer or typed array");
  }
  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    yield { bytes: bytes.subarray(offset, Math.min(offset + CHUNK, bytes.length)), owned: false };
  }
}

class ZipBuilder {
  #sink;
  #createParents;
  #position = 0;
  #entries = [];
  #directories = new Set();
  #finished = false;

  constructor(sink, { createParentDirectories = true } = {}) {
    this.#sink = sink;
    this.#createParents = createParentDirectories;
  }

  async #put(bytes) {
    await this.#sink.write(bytes);
    this.#position += bytes.length;
  }

  #assertOpen() {
    if (this.#finished) {
      throw new Error("The ZIP archive has already been finished");
    }
  }

  async addDirectory(name, { lastModified } = {}) {
    this.#assertOpen();
    name = checkEntryName(name);
    if (!name.endsWith("/")) {
      name += "/";
    }
    if (this.#createParents) {
      const parts = name.split("/").slice(0, -2);
      let path = "";
      for (const part of parts) {
        path += `${part}/`;
        await this.#writeDirectory(path, lastModified);
      }
    }
    await this.#writeDirectory(name, lastModified);
  }

  async #writeDirectory(name, lastModified) {
    if (this.#directories.has(name)) {
      return;
    }
    this.#directories.add(name);
    const nameBytes = encoder.encode(name);
    const { time, date } = dosDateTime(lastModified);
    const offset = this.#position;
    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x0800, true); // UTF-8 names, no data descriptor
    view.setUint16(10, time, true);
    view.setUint16(12, date, true);
    view.setUint16(26, nameBytes.length, true);
    header.set(nameBytes, 30);
    await this.#put(header);
    this.#entries.push({ nameBytes, time, date, crc: 0, csize: 0, usize: 0, offset, method: 0, flags: 0x0800 });
  }

  async addFile(name, data, { compress = true, lastModified } = {}) {
    this.#assertOpen();
    name = checkEntryName(name);
    if (name.endsWith("/")) {
      throw new Error(`File names must not end with "/": ${name}`);
    }
    if (this.#createParents && name.includes("/")) {
      await this.addDirectory(name.slice(0, name.lastIndexOf("/") + 1), { lastModified });
    }
    const nameBytes = encoder.encode(name);
    const { time, date } = dosDateTime(lastModified);
    const offset = this.#position;
    const method = compress ? 8 : 0;

    const header = new Uint8Array(30 + nameBytes.length + 20);
    const hv = new DataView(header.buffer);
    hv.setUint32(0, 0x04034b50, true);
    hv.setUint16(4, 45, true);
    hv.setUint16(6, 0x0808, true); // UTF-8 names + data descriptor follows
    hv.setUint16(8, method, true);
    hv.setUint16(10, time, true);
    hv.setUint16(12, date, true);
    hv.setUint16(26, nameBytes.length, true);
    hv.setUint16(28, 20, true); // ZIP64 extra field, the sizes follow in the descriptor
    header.set(nameBytes, 30);
    hv.setUint16(30 + nameBytes.length, 1, true);
    hv.setUint16(32 + nameBytes.length, 16, true);
    await this.#put(header);

    let crc = 0;
    let usize = 0;
    let csize = 0;
    if (compress) {
      const stream = new CompressionStream("deflate-raw");
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();
      const pump = (async () => {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) {
            return;
          }
          csize += value.length;
          await this.#put(value);
        }
      })();
      try {
        for await (const { bytes, owned } of toChunks(data)) {
          crc = crc32(crc, bytes);
          usize += bytes.length;
          // The compression stream must never take over a caller's buffer.
          await writer.write(owned ? bytes : bytes.slice());
        }
        await writer.close();
      } catch (ex) {
        writer.abort(ex).catch(() => {});
        pump.catch(() => {});
        throw ex;
      }
      await pump;
    } else {
      for await (const { bytes } of toChunks(data)) {
        crc = crc32(crc, bytes);
        usize += bytes.length;
        csize += bytes.length;
        await this.#put(bytes);
      }
    }

    const descriptor = new Uint8Array(24);
    const dv = new DataView(descriptor.buffer);
    dv.setUint32(0, 0x08074b50, true);
    dv.setUint32(4, crc, true);
    dv.setBigUint64(8, BigInt(csize), true);
    dv.setBigUint64(16, BigInt(usize), true);
    await this.#put(descriptor);
    this.#entries.push({ nameBytes, time, date, crc, csize, usize, offset, method, flags: 0x0808 });
  }

  async finish() {
    this.#assertOpen();
    this.#finished = true;
    const directoryStart = this.#position;
    for (const e of this.#entries) {
      const record = new Uint8Array(46 + e.nameBytes.length + 28);
      const v = new DataView(record.buffer);
      v.setUint32(0, 0x02014b50, true);
      v.setUint16(4, 45, true);
      v.setUint16(6, 45, true);
      v.setUint16(8, e.flags, true);
      v.setUint16(10, e.method, true);
      v.setUint16(12, e.time, true);
      v.setUint16(14, e.date, true);
      v.setUint32(16, e.crc, true);
      v.setUint32(20, 0xffffffff, true); // the real sizes and the offset are in the ZIP64 extra field
      v.setUint32(24, 0xffffffff, true);
      v.setUint16(28, e.nameBytes.length, true);
      v.setUint16(30, 28, true);
      v.setUint32(42, 0xffffffff, true);
      record.set(e.nameBytes, 46);
      const x = 46 + e.nameBytes.length;
      v.setUint16(x, 1, true);
      v.setUint16(x + 2, 24, true);
      v.setBigUint64(x + 4, BigInt(e.usize), true);
      v.setBigUint64(x + 12, BigInt(e.csize), true);
      v.setBigUint64(x + 20, BigInt(e.offset), true);
      await this.#put(record);
    }
    const directorySize = this.#position - directoryStart;
    const zip64Start = this.#position;
    const end = new Uint8Array(56 + 20 + 22);
    const v = new DataView(end.buffer);
    v.setUint32(0, 0x06064b50, true); // ZIP64 end of central directory
    v.setBigUint64(4, 44n, true);
    v.setUint16(12, 45, true);
    v.setUint16(14, 45, true);
    v.setBigUint64(24, BigInt(this.#entries.length), true);
    v.setBigUint64(32, BigInt(this.#entries.length), true);
    v.setBigUint64(40, BigInt(directorySize), true);
    v.setBigUint64(48, BigInt(directoryStart), true);
    v.setUint32(56, 0x07064b50, true); // ZIP64 locator
    v.setBigUint64(64, BigInt(zip64Start), true);
    v.setUint32(72, 1, true);
    v.setUint32(76, 0x06054b50, true); // classic end record, every field says "see ZIP64"
    v.setUint16(84, 0xffff, true);
    v.setUint16(86, 0xffff, true);
    v.setUint32(88, 0xffffffff, true);
    v.setUint32(92, 0xffffffff, true);
    await this.#put(end);
    return { size: this.#position, entryCount: this.#entries.length };
  }
}

// ---------------------------------------------------------------------------------------------
// Lazy ZIP reader. Only the central directory is read up front (in windows). Every entry is
// sliced out of the Blob and inflated on demand. A File picked by the user is backed by the file
// on disk, so even archives far bigger than the available RAM can be read.

const CENTRAL_DIRECTORY_WINDOW = 16 * 1024 * 1024;

async function readRange(blob, start, end) {
  if (start < 0 || end > blob.size || start > end) {
    throw new Error("ZIP structure points outside of the file");
  }
  return new DataView(await blob.slice(start, end).arrayBuffer());
}

async function findCentralDirectory(blob) {
  const tailStart = Math.max(0, blob.size - (22 + 0xffff));
  const tail = await readRange(blob, tailStart, blob.size);
  let eocd = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (tail.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) {
    throw new Error("Not a ZIP file (no end-of-central-directory record)");
  }
  let count = tail.getUint16(eocd + 10, true);
  let size = tail.getUint32(eocd + 12, true);
  let offset = tail.getUint32(eocd + 16, true);
  if (count === 0xffff || size === 0xffffffff || offset === 0xffffffff) {
    const locatorAt = tailStart + eocd - 20;
    const locator = await readRange(blob, locatorAt, locatorAt + 20);
    if (locator.getUint32(0, true) !== 0x07064b50) {
      throw new Error("ZIP64 locator is missing");
    }
    const recordAt = Number(locator.getBigUint64(8, true));
    const record = await readRange(blob, recordAt, recordAt + 56);
    if (record.getUint32(0, true) !== 0x06064b50) {
      throw new Error("ZIP64 end record is missing");
    }
    count = Number(record.getBigUint64(32, true));
    size = Number(record.getBigUint64(40, true));
    offset = Number(record.getBigUint64(48, true));
  }
  return { count, size, offset };
}

function entryStream(blob, info, verify) {
  return async () => {
    if (info.flags & 1) {
      throw new Error(`Encrypted ZIP entries are not supported: ${info.name}`);
    }
    if (info.method !== 0 && info.method !== 8) {
      throw new Error(`Unsupported compression method ${info.method}: ${info.name}`);
    }
    const local = await readRange(blob, info.localOffset, info.localOffset + 30);
    if (local.getUint32(0, true) !== 0x04034b50) {
      throw new Error(`Bad local header: ${info.name}`);
    }
    const dataStart = info.localOffset + 30 + local.getUint16(26, true) + local.getUint16(28, true);
    const raw = blob.slice(dataStart, dataStart + info.compressedSize);
    if (raw.size !== info.compressedSize) {
      throw new Error(`Entry is truncated: ${info.name}`);
    }
    let stream = raw.stream();
    if (info.method === 8) {
      stream = stream.pipeThrough(new DecompressionStream("deflate-raw"));
    }
    if (verify) {
      let crc = 0;
      let total = 0;
      stream = stream.pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            crc = crc32(crc, chunk);
            total += chunk.length;
            controller.enqueue(chunk);
          },
          flush() {
            if (total !== info.size) {
              throw new Error(`Size mismatch: ${info.name}`);
            }
            if (crc !== info.crc32) {
              throw new Error(`CRC mismatch: ${info.name}`);
            }
          },
        })
      );
    }
    return { stream, raw };
  };
}

function dosToDate(time, date) {
  return new Date(
    ((date >> 9) & 0x7f) + 1980,
    ((date >> 5) & 0x0f) - 1,
    date & 0x1f,
    (time >> 11) & 0x1f,
    (time >> 5) & 0x3f,
    (time & 0x1f) * 2
  );
}

/**
 * Open a ZIP archive without loading it into memory.
 *
 * @param {Blob} blob - A Blob or File, ideally backed by a file on disk (picked by the user, or
 *   from the OPFS).
 * @param {object} [options]
 * @param {function(number):void} [options.onProgress] - Called with 0..1 while the central
 *   directory is being read.
 * @param {boolean} [options.verify=true] - Check size and CRC32 while an entry is read.
 * @returns {Promise<{entries: ZipEntry[]}>}
 *
 * A ZipEntry has: name, isDirectory, size, compressedSize, crc32, lastModified (Date) and the
 * async methods stream() (ReadableStream), blob(), bytes() (Uint8Array) and text().
 */
export async function openZip(blob, { onProgress, verify = true } = {}) {
  const { size, offset } = await findCentralDirectory(blob);
  const utf8 = new TextDecoder("utf-8");
  const latin1 = new TextDecoder("iso-8859-1");
  const entries = [];
  const end = offset + size;
  let position = offset;
  let carry = new Uint8Array(0);

  while (position < end || carry.length > 0) {
    let chunk = carry;
    if (position < end) {
      const next = new Uint8Array(
        await blob.slice(position, Math.min(position + CENTRAL_DIRECTORY_WINDOW, end)).arrayBuffer()
      );
      position += next.length;
      chunk = new Uint8Array(carry.length + next.length);
      chunk.set(carry, 0);
      chunk.set(next, carry.length);
    }
    const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    let at = 0;
    while (at + 46 <= chunk.length) {
      if (view.getUint32(at, true) !== 0x02014b50) {
        throw new Error("Bad central directory entry");
      }
      const nameLength = view.getUint16(at + 28, true);
      const extraLength = view.getUint16(at + 30, true);
      const commentLength = view.getUint16(at + 32, true);
      const total = 46 + nameLength + extraLength + commentLength;
      if (at + total > chunk.length) {
        break; // incomplete, continue with the next window
      }
      const flags = view.getUint16(at + 8, true);
      let compressedSize = view.getUint32(at + 20, true);
      let uncompressedSize = view.getUint32(at + 24, true);
      let localOffset = view.getUint32(at + 42, true);
      const extraAt = at + 46 + nameLength;
      for (let x = extraAt; x + 4 <= extraAt + extraLength; ) {
        const id = view.getUint16(x, true);
        const length = view.getUint16(x + 2, true);
        if (id === 1) {
          // ZIP64: only the fields which are 0xFFFFFFFF are present, in this order.
          let f = x + 4;
          if (uncompressedSize === 0xffffffff) {
            uncompressedSize = Number(view.getBigUint64(f, true));
            f += 8;
          }
          if (compressedSize === 0xffffffff) {
            compressedSize = Number(view.getBigUint64(f, true));
            f += 8;
          }
          if (localOffset === 0xffffffff) {
            localOffset = Number(view.getBigUint64(f, true));
          }
        }
        x += 4 + length;
      }
      const name = (flags & 0x800 ? utf8 : latin1).decode(chunk.subarray(at + 46, at + 46 + nameLength));
      const info = {
        name,
        flags,
        method: view.getUint16(at + 10, true),
        crc32: view.getUint32(at + 16, true),
        compressedSize,
        size: uncompressedSize,
        localOffset,
      };
      const open = entryStream(blob, info, verify);
      const isDirectory = name.endsWith("/");
      entries.push({
        name,
        isDirectory,
        size: uncompressedSize,
        compressedSize,
        crc32: info.crc32,
        lastModified: dosToDate(view.getUint16(at + 12, true), view.getUint16(at + 14, true)),
        async stream() {
          return (await open()).stream;
        },
        async blob() {
          if (isDirectory) {
            return new Blob([]);
          }
          const { stream, raw } = await open();
          const result = await new Response(stream).blob();
          return info.method === 0 ? raw : result; // a stored entry stays a lazy slice
        },
        async bytes() {
          return new Uint8Array(await (await this.blob()).arrayBuffer());
        },
        async text() {
          return (await this.blob()).text();
        },
      });
      at += total;
    }
    carry = chunk.slice(at);
    onProgress?.(Math.min(1, (position - offset) / Math.max(size, 1)));
    if (position >= end && at === 0) {
      throw new Error("Truncated central directory");
    }
  }
  onProgress?.(1);
  return { entries };
}

// ---------------------------------------------------------------------------------------------
// Writer: runs on the calling thread and streams into the OPFS through createWritable().

/**
 * Creates a ZIP archive in a temporary file in the OPFS, one entry at a time. Memory use does not
 * depend on the size of the archive. Await every call before making the next one.
 *
 * @example
 * const zip = new ZipWriter();
 * await zip.addFile("mails/one.eml", rawBytes);
 * const file = await zip.finish(); // File, lives in the OPFS
 * await messenger.downloads.download({ url: URL.createObjectURL(file), filename: "mails.zip" });
 * await zip.dispose();             // remove the temporary file
 */
export class ZipWriter {
  #fileName = newTempFileName();
  #options;
  #queue = Promise.resolve();
  #started = null;
  #builder = null;
  #writable = null;
  #handle = null;
  #disposed = false;

  /**
   * @param {object} [options]
   * @param {boolean} [options.createParentDirectories=true] - Add directory entries for the parent
   *   folders of every entry, like most ZIP tools do.
   */
  constructor(options = {}) {
    this.#options = options;
    liveTempFiles.add(this.#fileName);
  }

  #run(task) {
    const result = this.#queue.then(task);
    this.#queue = result.catch(() => {});
    return result;
  }

  async #start() {
    if (this.#disposed) {
      throw new Error("The ZipWriter has been disposed");
    }
    this.#started ??= (async () => {
      const root = await navigator.storage.getDirectory();
      this.#handle = await root.getFileHandle(this.#fileName, { create: true });
      this.#writable = await this.#handle.createWritable();
      this.#builder = new ZipBuilder({ write: bytes => this.#writable.write(bytes) }, this.#options);
    })();
    await this.#started;
  }

  /**
   * @param {string} path - Entry name, "/" separated, for example "folder/file.txt".
   * @param {string|Blob|ArrayBuffer|TypedArray} data - A Blob is streamed and never fully loaded.
   * @param {object} [options]
   * @param {boolean} [options.compress=true] - Deflate the data (false: store it as it is).
   * @param {Date} [options.lastModified=new Date()]
   */
  addFile(path, data, options) {
    return this.#run(async () => {
      await this.#start();
      await this.#builder.addFile(path, data, options);
    });
  }

  /** @param {string} path - Directory name, for example "folder/sub". */
  addDirectory(path, options) {
    return this.#run(async () => {
      await this.#start();
      await this.#builder.addDirectory(path, options);
    });
  }

  /**
   * Write the central directory and close the archive.
   *
   * @returns {Promise<File>} the archive, backed by the temporary file in the OPFS
   */
  finish() {
    return this.#run(async () => {
      await this.#start();
      await this.#builder.finish();
      const writable = this.#writable;
      this.#writable = null;
      await writable.close();
      return this.#handle.getFile();
    });
  }

  /** Remove the temporary file. Safe to call more than once, also before finish(). */
  async dispose() {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;
    try {
      await this.#started;
    } catch (ex) {
      // never started
    }
    await this.#queue;
    if (this.#writable) {
      await this.#writable.abort().catch(() => {});
      this.#writable = null;
    }
    liveTempFiles.delete(this.#fileName);
    await removeTempFile(this.#fileName);
  }
}
