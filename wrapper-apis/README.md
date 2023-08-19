# Deprecation Notice
The wrapper APIs provided here are deprecated and will not receive further compatibility updates beyond Thunderbird 115. It is recommended to switch to dedicated single-purpose Experiments.

Examples:
 - [Attachment API](https://github.com/TB-throwback/LookOut-fix-version/blob/09d7565640317ac0ed10c52570a5774266ccc94c/src/api/Attachment/implementation.js) from Lookout-Fixed Add-on

## Update add-ons for Thunderbird 78 using wrapper APIs

Thunderbird 78 usually requires significant changes to add-ons, such as the locale and preference system as well converting XUL documents to HTML. Furthermore, the new WebExtension technology does not yet provide all the functions which were available to add-ons by using legacy Thunderbird APIs.

To support developers, we created these wrapper APIs which do not require all of these changes, just to get the add-on running in Thunderbird 78 again. The goal is to get as many add-ons compatible with the current ESR version, so users can continue to work with their beloved add-ons.

| Description     | API |
| --------------------------------------- | ----------- |
| Update a Legacy Bootstrap WebExtension  | [BootstrapLoader](https://github.com/thundernest/addon-developer-support/wiki/Using-the-BootstrapLoader-API-to-convert-a-Legacy-Bootstrap-WebExtension-into-a-MailExtension-for-Thunderbird-78)      |
| Update a Legacy Overlay WebExtension    | [WindowListener](https://github.com/thundernest/addon-developer-support/wiki/Using-the-WindowListener-API-to-convert-a-Legacy-Overlay-WebExtension-into-a-MailExtension-for-Thunderbird-78)           |  

_Please note: Updating add-ons with these wrapper APIs should only be the first step, as they are [experimental APIs](https://thunderbird-webextensions.readthedocs.io/en/latest/how-to/experiments.html) which are only a temporary solution. We encourage add-on developers to continue the upgrade process to pure MailExtensions, following the tutorials listed in the [tutorials section](https://github.com/thundernest/addon-developer-support/issues/37). These tutorials are each designed to be completed in a short amount of time, to get the legacy components out piece by piece._

**Please note: Do not use the provided wrapper APIs to create new add-ons. New add-ons can be created as proper WebExtensions with dedicated Experiments directly. Feel free to ask questions on [discuss.thunderbird.net](https://thunderbird.topicbox.com/groups/addons) about creating new add-ons.**

