# MeerkatIO Extension for Visual Studio Code

[MeerkatIO](https://meerkatio.com) is your personal notification tool that uses the notification channel that fits your workflow. This one extension immediately opens the door to any notification method you need to save time in your day, integrating with all of the built in tools already at your fingertips.

## Available Integrations

- Jupyter Extension support out of the box. Just run your cell(s) like normal and MeerkatIO will keep an eye out and alert you when your code completes.
- Terminal command monitoring for Mac, Windows, and Linux! MeerkatIO keeps track of all running terminal processes inside of VS Code and alerts you when a process completes according to your workspace settings.
- VS Code Run and Debug monitoring. Alert yourself after long-running processes complete from VS Code's built in Run and Debug Tool.
- VS Code Task monitoring. Monitor long running tasks defined in `.vscode/launch.json` without any extra configuration.

## Available Notification Channels

The MeerkatIO VS Code Extension supports the following notification channels:
- Ping
- System
- Slack Direct Message
- SMS
- Email

## Use Cases

- Ping yourself when a task defined in `.vscode/launch.json` completes
- Send your phone an SMS text message when your long running Jupyter Notebook cell completes
- Generate a system tray notification when your test suite completes while you have a different window open
- Slack yourself an update on your build pipeline while you are taking your dog for a walk so you know when to head back

## Quickstart
No setup is required to use the Ping or System commands with this extension, but in order to access Slack, SMS, and Email notification channels a MeerkatIO account is required. [Get started for free today!](https://meerkatio.com/register)

MeerkatIO notifications will automatically (after a window reload) execute for all task, debug, and Jupyter cell executions. The communication channel can be quickly changed and notifications can easily be toggled on and off to fit your current workflow!

## Extension Settings
After creating your account, set the following Extension Settings to unlock the full MeerkatIO Platform command set:

* `meerkat.token`: Your MeerkatIO account token which can be found at https://meerkatio.com/account
* `meerkat.meerkatNotification`: the notification channel you would like to be alerted with. Available notification options:
    * ping
    * system
    * slack
    * email
    * sms
* `meerkat.enabled`: Toggle MeerkatIO notifications on and off
* `meerkat.triggerMinDurationSeconds`: The minimum duration in seconds code must run to cause an alert to be triggered. This avoids noisy alerts on short tasks.

## Tips For Success

- Be sure to configure the `triggerMinDurationSeconds` to match your workflow. Noisy alerts get ignored, so customize this setting to improve your personal workflow.
- Use the MeerkatIO sidebar to easily toggle notifications on and off as you need them

### System Notifications

- On macOS make sure you have notifications enabled for `terminal-notifier` in order to have notifications show up in your system tray
- On Linux, make sure you have `notify-osd` or `libnotify-bin` installed. (Installed by default on Ubuntu)

## Release Notes

### 1.5.0

Released terminal notifier! Monitors your Visual Studio Code terminal processes across any operating system.

### 1.4.1

Fix bug with notification being triggered on Jupyter kernel restart.

Improve notification messaging formatting.

### 1.4.0

Added MeerkatIO side panel with Quick Actions and Account Management. Allows users to easily toggle notifications on and off and provides useful resources.

Fixed bug where notifications were firing for every process of a Run and Debug execution. Now only fires for the parent process.

### 1.3.1

Added Jupyter Notebook extension integration. Watches cell execution and triggers alerts on long-running cells.

Added the `triggerMinDurationSeconds` setting to allow more flexibility with when notifications are triggered to prevent noise.

### 1.2.0

Added the `system` notification channel


**Thank you for your support!**
