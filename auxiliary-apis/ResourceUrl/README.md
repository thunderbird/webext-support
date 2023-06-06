## Objective

Use this API to register a `resource://` URL, which is needed to load a custom JSM file defined in an Experiment. This API also takes care of flushing the JSM cache and unloading any loaded JSM which is using the registered `resource://` url.

## Example

This API is used in the following example: https://github.com/thundernest/sample-extensions/tree/master/experiment

## Usage

Add the [ResourceUrl API](https://github.com/thundernest/addon-developer-support/tree/master/auxiliary-apis/ResourceUrl) to your add-on. Your `manifest.json` needs an entry like this:

```
  "experiment_apis": {
    "ResourceUrl": {
      "schema": "api/ResourceUrl/schema.json",
      "parent": {
        "scopes": ["addon_parent"],
        "paths": [["ResourceUrl"]],
        "script": "api/ResourceUrl/implementation.js"
      }
    }
  },
```

A background script could look like the following:

```
async function main() {
  // Define the resource URL for the modules folder, which is part of our Experiment.
  await browser.ResourceUrl.register("exampleapi","modules/");

 ...
}

main();

```

The files in the `modules/*` folder will be accessible via `resource://exampleapi/*`.
