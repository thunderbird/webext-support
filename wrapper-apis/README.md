## Update add-ons for Thunderbird 78 using wrapper APIs

While we encourage authors to follow the WebExtension concept and try to use WebExtension/MailExtension APIs and write dedicated experiments for functions not yet available, we do know that this is not an easy task.

For a quick update so authors don't lose their user base after TB78.2 shipped in September 2020, they can also use one of the following wrapper APIs and focus on building the required MailExtension APIs later.

Please keep in mind, that these wrappers use experimental APIs whose future is uncertain and which could get disabled in a later ESR as it was done for Firefox. The update using these wrappers should only be the first step. We encourage and try to support authors to continue the update process to a pure MailExtension. Help us to identify and create still missing MailExtensions APIs, as this will allow to build future proof add-ons, which are independent of internal Thunderbird changes.

| API             | Description |
| --------------- | ----------- |
| [LegacyBootsrap](LegacyBootsrap)      |  Update a Legacy Bootstrap WebExtension
| [WindowListener](WindowListener)      |  Update a Legacy Overlay WebExtension
