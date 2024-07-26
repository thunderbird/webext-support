# Supporting Add-On Developers

The goal of this repository is to provide useful information, code snippets, examples, scripts, APIs and tools to add-on developers in order to better "weather" the transition to the new extension structure of Thunderbird 78: MailExtensions.

## Content

* [Introduction to MailExtensions, WebExtension APIs and Experiments](#supporting-add-on-developers)
* [Converting legacy add-ons to MailExtensions](#converting-legacy-add-ons-to-mailextensions)


&nbsp;

## Introduction to MailExtensions, WebExtension APIs and Experiments

To get started with MailExtensions, we suggest to read our [Thunderbird MailExtension guide](https://developer.thunderbird.net/add-ons/mailextensions) first. You will learn, how MailExtensions use a set of well-defined APIs (called WebExtension APIs), which will be mostly stable, even if the underlying Thunderbird code base is changed. In the past, these internal changes have led to heavy add-on breakages on each new Thunderbird release and the WebExtension API approach aims to minimize that.

You will also learn, that the current set of available WebExtension APIs is far from being complete. Many aspects of Thunderbird which are of interest for add-ons, cannot be accessed by them. To overcome this limitation, add-on developers can write [Experiment APIs](https://developer.thunderbird.net/add-ons/mailextensions/experiments), which have direct access to internal Thunderbird functions and components and can make them available to MailExtensions. 

&nbsp;


## Converting legacy add-ons to MailExtensions

The different methods to update [legacy add-ons](https://developer.thunderbird.net/add-ons/about-add-ons#legacy-extension-types) to MailExtensions are covered in our [Thunderbird add-on update guide](https://developer.thunderbird.net/add-ons/updating/tb78). You will learn, that they can be converted by removing all legacy parts at once, or step-by-step by using two special wrapper Experiment APIs. To simplify the add-on conversion process, this repository includes the following resources:


|      | Description |
| ---- | ---- |
| [WindowListener API BootstrapLoader API](https://github.com/thunderbird/addon-developer-support/wiki) | Wrapper Experiment APIs to simplify the process to update legacy add-ons to MailExtensions. **Do not use the provided wrapper APIs to create new add-ons. New add-ons can be created as proper WebExtensions with dedicated Experiments directly. Feel free to ask questions on [discuss.thunderbird.net](https://thunderbird.topicbox.com/groups/addons) about creating new add-ons.** |
| [Update Tutorials](https://github.com/thunderbird/addon-developer-support/issues/37) | Updating add-ons using the wrapper APIs should only be the first step. We encourage add-on developers to continue the update process to pure MailExtensions, following the listed tutorials. These tutorials are each designed to be completed in a short amount of time, to get the legacy components out piece by piece. |
| [Scripts](https://github.com/thunderbird/addon-developer-support/tree/master/scripts)        | Scripts used by conversion steps after the initial update using the wrapper APIs. |
| [Tools](https://github.com/thunderbird/addon-developer-support/tree/master/tools/)          | Tools to help developers update their add-ons more easily. |
| [UI](https://github.com/thunderbird/addon-developer-support/tree/master/ui/)          | 3rd party libraries which can help to replace deprecated XUL elements. |
&nbsp;

