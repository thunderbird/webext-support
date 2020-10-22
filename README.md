# Supporting Add-On Developers

The goal of this repository is to provide useful information, code snippets, examples, scripts, APIs and tools to add-on developers in order to better "weather" the transition to the new extension structure of Thunderbird 78: MailExtensions.

## Content

* [Introduction to MailExtensions, WebExtension APIs and Experiments](#supporting-add-on-developers)
* [Converting legacy add-ons to MailExtensions](#converting-legacy-add-ons-to-mailextensions)
* [Collaborating on new WebExtension APIs](#collaborating-on-new-webextension-apis)
* [Proposing new WebExtension APIs](#proposing-new-webextension-apis)
* [Some useful helper Experiment APIs](#some-useful-helper-experiment-apis)

&nbsp;

## Introduction to MailExtensions, WebExtension APIs and Experiments

To get started with MailExtensions, we suggest to read our [Thunderbird MailExtension guide](https://developer.thunderbird.net/add-ons/mailextensions) first. You will learn, how MailExtensions use a set of well-defined APIs (called WebExtension APIs), which will be mostly stable, even if the underlying Thunderbird code base is changed. In the past, these internal changes have led to heavy add-on breakages on each new Thunderbird release and the WebExtension API approach aims to minimize that.

You will also learn, that the current set of available WebExtension APIs is far from being complete. Many aspects of Thunderbird which are of interest for add-ons, cannot be accessed by them. To overcome this limitation, add-on developers can write [Experiment APIs](https://developer.thunderbird.net/add-ons/mailextensions/experiments), which have direct access to internal Thunderbird functions and components and can make them available to MailExtensions. 

&nbsp;


## Converting legacy add-ons to MailExtensions

The different methods to update [legacy add-ons](https://developer.thunderbird.net/add-ons/about-add-ons#legacy-extension-types) to MailExtensions are covered in our [Thunderbird add-on update guide](https://developer.thunderbird.net/add-ons/updating/tb78). You will learn, that they can be converted by removing all legacy parts at once, or step-by-step by using two special wrapper Experiment APIs. To simplify the add-on conversion process, this repository includes the following resources:


|      | Description |
| ---- | ---- |
| [WindowListener API BootstrapLoader API](https://github.com/thundernest/addon-developer-support/wiki) | Wrapper Experiment APIs to simplify the process to update legacy add-ons to MailExtensions. |
| [Update Tutorials](https://github.com/thundernest/addon-developer-support/issues/37) | Updating add-ons using the wrapper APIs should only be the first step. We encourage add-on developers to continue the update process to pure MailExtensions, following the listed tutorials. These tutorials are each designed to be completed in a short amount of time, to get the legacy components out piece by piece. |
| [Scripts](https://github.com/thundernest/addon-developer-support/tree/master/scripts)        | Scripts used by conversion steps after the initial update using the wrapper APIs. |
| [Tools](https://github.com/thundernest/addon-developer-support/tree/master/tools/)          | Tools to help developers update their add-ons more easily. |

&nbsp;

## Collaborating on new WebExtension APIs

The main idea behind Experiment APIs is not just to make Thunderbird internals available to MailExtensions, but to actually design and experiment with new WebExtension APIs, which can then be proposed to be merged into Thunderbird.

This is a collection of externally hosted APIs, which aim to be merged into Thunderbird, but do not yet fulfill the required standards. Nevertheless, we wish to collect them at a central place to obtain an overview of what APIs are currently being worked on, so add-on developers who wish to implement a certain functionality can collaborate.

If you are working on an API yourself, we are looking forward to listing it here as well. These APIs can be discussed in the issue section of this repository. 

| Name                   | Author |  Discussion | Description |
| -----------------------| ------ | ----------- | ----------- |
| [NotificationBox](https://github.com/jobisoft/notificationBox-API/tree/master/notificationbox)        | [@jobisoft](https://github.com/jobisoft/)       | [:speech_balloon:](https://github.com/thundernest/addon-developer-support/issues/47) | Add Thunderbird notification boxes.        |
| [CustomUI](https://github.com/rsjtdrjgfuzkfg/thunderbird-experiments/tree/master/experiments/customui) | [@rsjtdrjgfuzkfg](https://github.com/rsjtdrjgfuzkfg/) | | A generic UI extension framework based iframes registered at fixed extension points. |
| [TCP](https://github.com/rsjtdrjgfuzkfg/thunderbird-experiments/tree/master/experiments/tcp) | [@rsjtdrjgfuzkfg](https://github.com/rsjtdrjgfuzkfg/) | | TCP support based on ArrayBuffers (currently client side only). |
| [Runtime.onDisable](https://github.com/rsjtdrjgfuzkfg/thunderbird-experiments/tree/master/experiments/runtime) | [@rsjtdrjgfuzkfg](https://github.com/rsjtdrjgfuzkfg/) | | Permit WebExtensions to perform (time-limited) cleanup tasks after the add-on is disabled or uninstalled. |
| [composeMessageHeaders](https://github.com/gruemme/tb-api-compose_message_headers) | [@gruemme](https://github.com/gruemme/) | | Adds missing functionality to add headers to a newly composed message. Aims to add a header object to the compose.ComposeDetails object, so headers can be set via compose.setComposeDetails |

&nbsp;

## Proposing new WebExtension APIs

These APIs are hosted on a dedicated repository and are on its way to be merged into Thunderbird.

| Name                               | Author                                           | Description
| ---------------------------------- | ------------------------------------------------ | --------------
| [cloudfile](https://github.com/thundernest/tb-web-ext-experiments/blob/master/cloudfile)          | [@kewisch](https://github.com/kewisch/)          | Experiment with add-on exposing the Cloudfile feature
| [calendar](https://github.com/thundernest/tb-web-ext-experiments/blob/master/calendar)            | [@kewisch](https://github.com/kewisch/)          | Draft for calendar-related APIs in Thunderbird

&nbsp;

## Some useful helper Experiment APIs

These APIs are not intended to be merged into Thunderbird. They are very generic and aim to quickly solve a current limitation.

| Name                   | Author |  Description |
| -----------------------| ------ | ------------ |
| [LegacyPrefs](https://github.com/thundernest/addon-developer-support/tree/master/auxiliary-apis/LegacyPrefs)            | [@jobisoft](https://github.com/jobisoft/)  | Access Thunderbird preferences |
| [LegacyMenu](https://github.com/thundernest/addon-developer-support/tree/master/auxiliary-apis/LegacyMenu)             | [@jobisoft](https://github.com/jobisoft/)  | Add menu entries to Thunderbird menus currently not accessible using the built-in menus API |
| [CachingFix](https://github.com/rsjtdrjgfuzkfg/thunderbird-experiments/tree/master/experiments/cachingfix)        | [@rsjtdrjgfuzkfg](https://github.com/rsjtdrjgfuzkfg/) | Adding this Experiment API will automatically [fix caching issues when the add-on is updated, disabled or uninstalled](https://developer.thunderbird.net/add-ons/mailextensions/experiments#managing-your-experiments-lifecycle). A similar feature is built into the WindowListener wrapper API. |

&nbsp;

