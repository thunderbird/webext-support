## Update add-ons for Thunderbird 78 using wrapper APIs

We encourage add-on developers to follow the WebExtension concept and try to use WebExtension/MailExtension APIs and write dedicated experiments for functions not yet available. However, we do know that this is not an easy task and many add-on developers struggle to get their add-on running in Thunderbird 78.

The following wrapper APIs are experimental APIs and allow to complete the conversion from a Legacy WebExtension (Thunderbird 68) to a MailExtension (Thunderbird 78) with minimal changes. The table below contains links to the wiki of the addon-developer-support repository with step-by-step descriptions.

_Please note that the future of experimental APIs is uncertain and they could be deactivated in a later ESR like it was done for Firefox. Updating with the WindowListener API should only be the first step. We encourage and try to help add-on developers to continue the upgrade process to a pure MailExtension. Help us to identify and create still missing MailExtensions APIs, as this will allow building future proof add-ons, which are independent of internal Thunderbird changes._

| API             | Description |
| --------------- | ----------- |
| [WindowListener](https://github.com/thundernest/addon-developer-support/wiki/Using-the-WindowListener-API-to-convert-a-Legacy-Overlay-WebExtension-into-a-MailExtension-for-Thunderbird-78)      |  Update a Legacy Overlay WebExtension (draft)
| [LegacyBootstrap](LegacyBootstrap)      |  Update a Legacy Bootstrap WebExtension (pre draft)
