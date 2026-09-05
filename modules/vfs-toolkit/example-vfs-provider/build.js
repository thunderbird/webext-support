const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// CRC-32 lookup table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[i] = c;
}
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (const byte of buf) crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * A file's modification time in the two 16-bit fields a zip entry carries.
 *
 * The date packs year-1980 in bits 15-9, the month in 8-5 and the day in
 * 4-0; the time packs hours in 15-11, minutes in 10-5 and two-second steps
 * in 4-0. Months and days count from one, so a zeroed field is not a date
 * that exists - readers disagree about what it means, and the ones that
 * guess print anything from 1979 to 2159.
 *
 * The range is 1980 to 2107 and nothing outside it is representable, so a
 * date below the floor is clamped to it rather than wrapped into a year the
 * format can hold but nobody meant.
 */
function dosDateTime(when) {
  const d = when instanceof Date && !Number.isNaN(when.getTime()) ? when : new Date();
  const year = d.getFullYear();
  if (year < 1980) return { date: (1 << 5) | 1, time: 0 };
  if (year > 2107) return { date: (127 << 9) | (12 << 5) | 31, time: (23 << 11) | (59 << 5) | 29 };
  return {
    date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
  };
}

/**
 * Zip files/folders into destFile.
 * @param {string|string[]} sources - Paths to zip
 * @param {string} destFile - Output zip file
 * @param {string[]} [exclude=[]] - Optional array of folder/file paths to exclude (relative paths)
 */
function zip(sources, destFile, exclude = []) {
  const files = [];

  // Ensure parent directory exists
  const parentDir = path.dirname(destFile);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  function collect(full, rel) {
    // skip if rel matches any exclude pattern
    if (exclude.some(e => rel === e || rel.startsWith(e + "/"))) return;

    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(full)) {
        collect(path.join(full, name), rel + "/" + name);
      }
    } else {
      files.push({ full, rel, mtime: stat.mtime });
    }
  }

  if (typeof sources === "string") {
    for (const name of fs.readdirSync(sources)) collect(path.join(sources, name), name);
  } else {
    for (const src of sources) collect(src, src);
  }

  const parts = [];
  const centralDir = [];
  let offset = 0;

  for (const { full, rel, mtime } of files) {
    const stamp = dosDateTime(mtime);
    const data = fs.readFileSync(full);
    const compressed = zlib.deflateRawSync(data);
    const useDeflate = compressed.length < data.length;
    const fileData = useDeflate ? compressed : data;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(data);
    const nameBytes = Buffer.from(rel, "utf8");

    const local = Buffer.alloc(30 + nameBytes.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(stamp.time, 10);
    local.writeUInt16LE(stamp.date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(fileData.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    nameBytes.copy(local, 30);

    const cd = Buffer.alloc(46 + nameBytes.length);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(method, 10);
    cd.writeUInt16LE(stamp.time, 12);
    cd.writeUInt16LE(stamp.date, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(fileData.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBytes.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offset, 42);
    nameBytes.copy(cd, 46);

    parts.push(local, fileData);
    centralDir.push(cd);
    offset += local.length + fileData.length;
  }

  const cdBuf = Buffer.concat(centralDir);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  fs.writeFileSync(destFile, Buffer.concat([...parts, cdBuf, eocd]));
}

function rm(dir) {
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

function cp(src, dest) {
  if (!fs.existsSync(src)) throw new Error(`Source not found: ${src}`);
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(file => cp(path.join(src, file), path.join(dest, file)));
  } else {
    fs.copyFileSync(src, dest);
  }
}

const { version } = JSON.parse(fs.readFileSync("package.json", "utf8"));
const manifest = JSON.parse(fs.readFileSync("src/manifest.json", "utf8"));
manifest.version = version;
fs.writeFileSync("src/manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(`Set manifest version to ${version}`);

const versionTag = version.replace(/\./g, "_");
const xpiName = `vfs-toolkit-example-provider_${versionTag}.xpi`;

console.log("Cleaning output directory ...");
rm("dist");

// Delete old versioned XPIs from the parent folder
for (const f of fs.readdirSync("..")) {
  if (f.startsWith("vfs-toolkit-example-provider_") && f.endsWith(".xpi")) {
    fs.rmSync(path.join("..", f));
    console.log(`Removed old XPI: ../${f}`);
  }
}

console.log("Copying vfs-provider library ...");
rm("src/vendor/vfs-provider");
cp("../vfs-provider", "src/vendor/vfs-provider");

console.log(`Creating extension file (dist/${xpiName}) ...`);
zip("src", `dist/${xpiName}`);

console.log(`Copying to parent folder (../${xpiName}) ...`);
fs.copyFileSync(`dist/${xpiName}`, path.join("..", xpiName));

console.log("Build finished. Output is in the 'dist' folder.");
