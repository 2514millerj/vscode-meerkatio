# Change Log

All notable changes to the "MeerkatIO" extension will be documented in this file.

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