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

#### Reporting missing APIs on Bugzilla

If you have identified a missing functionality or a missing WebExtension API, please check the already [existing bugs in the Add-Ons: Extensions API component](https://bugzilla.mozilla.org/buglist.cgi?product=Thunderbird&component=Add-Ons%3A%20Extensions%20API&resolution=---&list_id=15465922) of Bugzilla to avoid duplicate reports. It may also be helpful to check with us on [matrix chat](https://chat.mozilla.org/#/room/#tb-addon-developers:mozilla.org) or on [topicbox](https://thunderbird.topicbox.com/groups/addons), if the requested functionality is already covered by some existing API.

If the functionality is truely missing and has not yet been reported on Bugzilla, please [file a bug in the Add-Ons: Extensions API component](https://bugzilla.mozilla.org/enter_bug.cgi?product=Thunderbird&component=Add-Ons%3A+Extensions+API&cc=john@thunderbird.net) at Bugzilla. This will allow us to properly track the progress of the API request.

#### Discussing missing APIs on Topicbox

While Bugzilla is good for keeping track of such requests, it is not ideal for discussions. Only a small group of developers will get notified of new bugs. To raise awarness of your API request and get feedback on the proposed API design, you must also post it to [Topicbox](https://thunderbird.topicbox.com/groups/addons) and link your bug to your Topicbox thread. This allows the add-on developer community to be part of the design process.

#### Working one missing APIs

The main idea behind Experiment APIs is not just to make Thunderbird internals available to MailExtensions, but to actually design and experiment with new WebExtension APIs, which can then be proposed to be merged into Thunderbird.

If you have already started to work on an Experiment API to address the missing  functionality, we wish to add it to the list below, to obtain an overview of what APIs are currently being worked on. This will enable add-on developers implementing a certain functionality to collaborate. [Contact me directly](mailto:john@thunderbird.net) to get your API added to this list, or file a pull request against this document.

| Name                   | Author |  Discussion | Description |
| -----------------------| ------ | ----------- | ----------- |
| [NotificationBar](https://github.com/jobisoft/notificationbar-API/tree/master/notificationbar)        | [@jobisoft](https://github.com/jobisoft/)       | [:speech_balloon:](https://thunderbird.topicbox.com/groups/addons/T576f843ea846049c-M2b3bf1c77ba25dfb1d78e7d4/notification-api-proposal) [:memo:](https://docs.google.com/document/d/1mTwVozOiEcDCw3QQKxVz-N5yHY8SVFC9KUL4_x0IN68/) | Add Thunderbird notification bars.        |
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

