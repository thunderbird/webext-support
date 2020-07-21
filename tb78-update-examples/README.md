## HowTo: Update add-ons for Thunderbird 78 using wrapper APIs

While we encourage authors to follow the WebExtension concept and try to use WebExtension/MailExtension APIs and write dedicated experiments for functions not yet available, we do know that this is not an easy task.

For a quick update, so that you do not loose your user base after TB78.2 will be shipped in September 2020, you can also use one of the following wrapper APIs and focus on creating the needed MailExtension APIs later.

| API             | Description |
| --------------- | ----------- |
| [LegacyBootsrap][LegacyBootsrap]      |  Update Legacy Bootstrap WebExtension
| [WindowListener][WindowListener]      |  Update Legacy Overlay WebExtension
