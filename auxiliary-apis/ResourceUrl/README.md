## Objective

Use this API registers `resource://` urls, which is needed to load custom JSM modules defined in experiemnts. This API also takes care of flushing the JSM cache and unloading any loaded JSMs using the registered `resource://` url.

This API is used in the following example: https://github.com/thundernest/sample-extensions/tree/master/experiment

## Usage

A background script could look like the following:

```
async function main() {
  // Define the resource url for the modules folder, which is part of our experiement..
  await browser.ResourceUrl.register("exampleapi","modules");

 ...
}

main();

```

