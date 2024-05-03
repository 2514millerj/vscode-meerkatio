# MeerkatIO Extension for Visual Studio Code

[MeerkatIO](https://meerkatio.com) is the personal notification tool for software developers that allows you to use the notification channel that fits your workflow. This one extension immediately opens the door to any notification method you need to save time in your day.

Set up this extension to alert you after running a custom task or a test suite. The MeerkatIO Platform will help you save time and help you to stop watching your code run.

## Use Cases

- Ping yourself when a task defined in `.vscode/launch.json` completes
- Generate a system tray notification when your test suite completes while you have a different window open
- Slack yourself an update on your build pipeline while you are taking your dog for a walk so you know when to head back

Tell us how you use MeerkatIO in the review section!

## Features

The MeerkatIO VS Code Extension supports the following notification channels:
- Ping
- System
- Slack Direct Message
- SMS
- Email

## Quickstart
No setup is required to use the Ping or System commands with this extension, but in order to access Slack, SMS, and Email notification channels a MeerkatIO account is required. [Get started for free today!](https://meerkatio.com/register)

MeerkatIO notifications will automatically (after a window reload) execute for all tasks and debug executions. The communication channel can be quickly changed and notifications can easily be toggled on and off to fit your current task!

## Extension Settings
After creating your account, set the following Extension Settings to unlock the full MeerkatIO Platform command set:

* `meerkatio.token`: Your MeerkatIO account token which can be found at https://meerkatio.com/account
* `meerkatio.meerkatNotification`: the notification channel you would like to be alerted with. Available notification options:
    * ping
    * system
    * slack
    * email
    * sms
* `meerkatio.enabled`: Toggle MeerkatIO notifications on and off

## Tips For Success

### System Notifications

- On macOS make sure you have notifications enabled for `terminal-notifier` in order to have notifications show up in your system tray

## Release Notes

### 1.2.0

Added the `system` command

### 1.1.3

Fixed bug with `ping` command

### 1.1.2

Change `sound` to `ping`

### 1.1.0

Add MeerkatIO Pro communication channels including Slack, SMS, and Email

### 1.0.0

Initial release of MeerkatIO VSCode Extension


**Thank you for your support!**
