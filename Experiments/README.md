# Experiment APIs

The built-in WebExtension APIs are not yet sufficient. On this page we collect 3 different kind of Experiment APIs, which in the meantime can be used as replacement APIs.

&nbsp;

## Helper APIs

These APIs are not intended to be merged into Thunderbird. They are very generic and aim to quickly solve a current limitation.

| Name                   | Author |  Description |
| -----------------------| ------ | ------------ |
| [LegacyPrefs](https://github.com/thundernest/addon-developer-support/tree/master/auxiliary-apis/LegacyPrefs)            | [@jobisoft](https://github.com/jobisoft/)  | Access Thunderbird preferences |
| [LegacyMenu](https://github.com/thundernest/addon-developer-support/tree/master/auxiliary-apis/LegacyMenu)             | [@jobisoft](https://github.com/jobisoft/)  | Add menu entries to Thunderbird menus currently not accessible using the menus API |
| [CachingFix](https://github.com/rsjtdrjgfuzkfg/thunderbird-experiments/tree/master/experiments/cachingfix)        | [@rsjtdrjgfuzkfg](https://github.com/rsjtdrjgfuzkfg/) | Adding this experiment will automatically [fix caching issues when the add-on is updated, disabled or uninstalled](https://developer.thunderbird.net/add-ons/mailextensions/experiments#managing-your-experiments-lifecycle). A similar feature is built into the WindowListener wrapper API. |

&nbsp;
 
## Proposed APIs : Stage One

This is a collection of externally hosted APIs, which aim to be merged into Thunderbird. They are at a very early stage and do not yet fulfill the standards for stage two. Nevertheless we wish to collect them at a central place to obtain an overview of what APIs are currently being worked on, so add-on developers who wish to implement a certain functionality can collaborate.

If you are working on an API yourself, we are looking forward to list it here as well.

| Name                   | Author |  Description |
| -----------------------| ------ | ------------ |
| [NotificationBox](https://github.com/jobisoft/notificationBox-API/tree/master/notificationbox)        | [@jobisoft](https://github.com/jobisoft/)       | Add Thunderbird notification boxes.        |
| [CustomUI](https://github.com/rsjtdrjgfuzkfg/thunderbird-experiments/tree/master/experiments/customui) | [@rsjtdrjgfuzkfg](https://github.com/rsjtdrjgfuzkfg/) | A generic UI extension framework based iframes registered at fixed extension points. |
| [TCP](https://github.com/rsjtdrjgfuzkfg/thunderbird-experiments/tree/master/experiments/tcp) | [@rsjtdrjgfuzkfg](https://github.com/rsjtdrjgfuzkfg/) | TCP support based on ArrayBuffers (currently client side only). |

&nbsp;

## Proposed APIs : Stage Two

These APIs are hosted on a dedicated repository and are on its way to be merged into Thunderbird.

| Name                               | Author                                           | Description
| ---------------------------------- | ------------------------------------------------ | --------------
| [cloudfile](https://github.com/thundernest/tb-web-ext-experiments/blob/master/cloudfile)          | [@kewisch](https://github.com/kewisch/)          | Experiment with add-on exposing the Cloudfile feature
| [calendar](https://github.com/thundernest/tb-web-ext-experiments/blob/master/calendar)            | [@kewisch](https://github.com/kewisch/)          | Draft for calendar-related APIs in Thunderbird


