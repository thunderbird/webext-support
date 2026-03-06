const fs = require("fs");
const path = require("path");

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

console.log("Cleaning dist...");
rm("extension");

console.log("Copying src...");
cp("src", "extension");

console.log("Copying WebAwesome...");
cp("node_modules/@awesome.me/webawesome/dist-cdn", "extension/vendor/webawesome");

console.log("Build finished. The 'extension' folder is ready to be zipped manually.");