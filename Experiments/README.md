# Experiment APIs

The built-in WebExtension APIs are not yet sufficient. On this page we collect 3 different kind of Experiment APIs, which in the meantime can be used as replacement APIs.

## Helper APIs

These APIs are not intended to be merged into Thunderbird. They are very generic and aim to quickly solve a current limitation.

| Name                   | Author |  Description |
| -----------------------| ------ | ------------ |
| LegacyPrefs            | [@jobisoft](https://github.com/jobisoft/)  | Access Thunderbird preferences |
| LegacyMenu             | [@jobisoft](https://github.com/jobisoft/)  | Add menu entries to Thunderbird menus currently not accessible using the menus API |

## Proposed APIs : Stage One

This is a collection of externally hosted APIs, which aim to be merged into Thunderbird. They are at a very early stage and do not yet fulfill the standards for stage two. Nevertheless we wish to collect them at a central place to obtain an overview of what APIs are currently being worked on, so add-on developers who wish to implement a certain functionality can collaborate.

| Name                   | Author |  Description |
| -----------------------| ------ | ------------ |
| [NotificationBox](https://github.com/jobisoft/notificationBox-API/tree/master/notificationbox)        | [@jobisoft](https://github.com/jobisoft/)       | Add Thunderbird notification boxes.        |


## Proposed APIs : Stage Two

These APIs are hosted on a dedicated repository and are on its way to be merged into Thunderbird.

| Name                               | Author                                           | Description
| ---------------------------------- | ------------------------------------------------ | --------------
| [cloudfile](https://raw.githubusercontent.com/thundernest/tb-web-ext-experiments/master/cloudfile/)          | [@kewisch](https://github.com/kewisch/)          | Experiment with add-on exposing the Cloudfile feature
| [calendar](https://raw.githubusercontent.com/thundernest/tb-web-ext-experiments/master/calendar/)            | [@kewisch](https://github.com/kewisch/)          | Draft for calendar-related APIs in Thunderbird


