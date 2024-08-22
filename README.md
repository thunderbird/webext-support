# Supporting WebExtension Developers

The goal of this repository is to provide additional tools, scripts, custom elements, Experiment APIs and other resources, to simplify the development of WebExtensions for Thunderbird.

## Introduction

To get started with WebExtensions for Thunderbird, we suggest to first read our [Thunderbird WebExtension Guide](https://developer.thunderbird.net/add-ons/mailextensions) and follow the ["Hello World" Example](https://developer.thunderbird.net/add-ons/hello-world-add-on).

You will learn, how WebExtensions use a set of well-defined APIs (called WebExtension APIs), which will be mostly stable, even if the underlying Thunderbird code base is changed. In the past, these internal changes have led to heavy add-on breakages on each new Thunderbird release and the WebExtension API approach aims to minimize that.

You will also learn, that the current set of available WebExtension APIs for Thunderbird is far from being complete. Many aspects of Thunderbird which are of interest for add-ons, cannot be accessed by them. To overcome this limitation, add-on developers can write [Experiment APIs](https://developer.thunderbird.net/add-ons/mailextensions/experiments), which have direct access to internal Thunderbird functions and can make them available to WebExtensions. Their usage should be minimized. In this repository we provide Experiments, which are currently not planed to be merged into core, but are maintained by us. In the [webext-experiments](https://github.com/thunderbird/webext-experiments) repository you will find additional Experiment APIs, which *are* planed to be merged into core.

## Experiment APIs

The `experiments` folder contains the following Experiment APIs:

|                | Description |
| -------------- | ----------- |
| FileSystem     | Grant read/write access to a folder in the users profile folder (file system level). |
| ImapTools      | Extract the IMAP UID from a message. |
| LegacyCSS      | Add CSS files to Thunderbird windows. |
| LegacyPrefs    | Access Thunderbird's system preferences. |

## Scripts

The `scripts` folder contains the following helper scripts:

|             | Description |
| ----------- | ----------- |
| i18n        | Script to replace i18n placeholders in HTML files. |

## Tools

The `tools` folder contains the following tools:

|                  | Description |
| ---------------- | ----------- |
| locale converter | A python script to convert legacy DTD and property files to i18n JSON files. |

## UI

The `ui` folder contains the following elements:

|                    | Description |
| ------------------ | ----------- |
| data-table         | Set of 3rd party libraries to present data in tables. | 
| mail folder picker | A custom element which allows to select one of the user's mail folders (IMAP, POP, Local, ...). |
