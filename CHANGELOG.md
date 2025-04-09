# Change Log

All notable changes to the "MeerkatIO" extension will be documented in this file.

## [1.11.3]

- Bug fix for system notifications on Windows OS

## [1.11.1]

- Fix bug where Jupyter Notebook notifications were being triggered twice

## [1.11.0]

- New Pro Feature: Summarize task output using the VS Code AI integration. Allows users to quickly analyze the output of their long running tasks to save valuable dev time and accelerate debugging to improve productivity.
- Improved error handling and messaging with the MeerkatIO platform

## [1.10.0]

- Added VS Code Walkthrough steps with guides on configuring notification channels, trigger duration, and notification history tools. 
- Improved notification configuration in the MeerkatIO sidebar menu.

## [1.9.0]

- New Pro feature: MeerkatIO Notification History in the bottom panel allows users to search their history to see past notifications, and details about execution time.

## [1.8.0]

- Added Google Chat notifications integration. 
- Improved sign in experience using VS Code authentication sessions with GitHub.

## [1.7.0]

- Added Microsoft Teams notifications integration

## [1.6.2]

- Save notification task duration and trigger for future analysis/reporting

## [1.6.1]

- Fix bug with undefined package in some environments

## [1.6.0]

- Add re-claimed time stat on side view and improved handling of parallel execution monitors

## [1.5.7]

- Improve human-readable trigger duration

## [1.5.6]

- Add survey prompt for extension feedback and improvement

## [1.5.5]

- Improve terminal watcher to account for the currently active terminal on extension activation

## [1.5.4]

- Bug fix for Jupyter Notebook notification handler

## [1.5.3]

- Implement the VS Code telemetry best practices and improve documentation

## [1.5.1]

- Fix bug with enable/disable notifications on Jupyter Cells and Terminal Processes

## [1.5.0]

- Released terminal notifier! Monitors your Visual Studio Code terminal processes across any operating system.

## [1.4.1]

- Fix bug with notification being triggered on Jupyter kernel restart.
- Improve notification messaging formatting.

## [1.4.0]

- Added MeerkatIO side panel with Quick Actions and Account Management. Allows users to easily toggle notifications on and off and provides useful resources.
- Fixed bug where notifications were firing for every process of a Run and Debug execution. Now only fires for the parent process.

## [1.3.1]

- Added Jupyter Notebook extension integration. Watches cell execution and triggers alerts on long-running cells.
- Added the `triggerMinDurationSeconds` setting to allow more flexibility with when notifications are triggered to prevent noise.

## [1.2.0]

- Added the `system` command

## [1.1.3]

- Fixed bug with `ping` command

## [1.1.2]

- Change `sound` to `ping`

## [1.0.0]

- Initial release