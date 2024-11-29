// Imports
const vscode = require('vscode');
const axios = require('axios');
var player = require('play-sound')(opts = {});
const notifier = require('node-notifier');
const psList = require('ps-list');
const moment = require('moment');

// Module Imports
const SideBarProvider = require('./SideBarProvider');
let sideBarProvider = new SideBarProvider();
const BottomPanelProvider = require('./BottomPanelProvider');
let bottomPanelProvider = new BottomPanelProvider();

const checkSurveyTrigger = require('./surveyPrompt');

const NotificationHistory = require('./notificationHistory');
const logNotificationHistory = NotificationHistory.logNotificationHistory;
const NotificationMonitor = NotificationHistory.NotificationMonitor;

const ExtensionContext = require('./extensionContext');
const { meerkatAuthenticate, checkMeerkatAccount } = require('./authentication');
const Constants = require('./constants');

// Global Variables
var extensionPath = "";
const nc = new notifier.NotificationCenter();
var activePIDs = [];

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isValidNotification(durationMs) {
	if (durationMs / 1000 >= vscode.workspace.getConfiguration('meerkat').get('triggerMinDurationSeconds', 30) && vscode.workspace.getConfiguration('meerkat').get('enabled', true)) {
		return true;
	} else {
		return false;
	}
}

function sendMeerkatLocal(method, time_diff, trigger) {
	if (!vscode.env.isTelemetryEnabled) {
		return;
	}
	const url = 'https://meerkatio.com/api/notification/local';

	const data = {
        uid: vscode.env.machineId,
		method,
		duration_ms: time_diff,
		trigger
    };

    axios.post(url, data, {
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(response => {

	})
	.catch(error => {
		
	});
}

function sendMeerkatNotification(method, message, duration_ms, trigger) {
    const url = 'https://meerkatio.com/api/notification/send';

	const context = ExtensionContext.getExtensionContext();
	const token = vscode.workspace.getConfiguration('meerkat').get('token') || context.globalState.get(Constants.MEERKATIO_TOKEN);
	if (!token) {
		vscode.window.showErrorMessage("MeerkatIO: No token found. Check configuration and try again.");
		return;
	}

    const data = {
        meerkat_token: token,
        method,
		message: "From VS Code: " + message,
		duration_ms,
		source_uid: vscode.env.machineId,
		trigger
    };

    axios.post(url, data, {
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(response => {
		if (response.status === 200)
			//TODO: save account type from response
			vscode.window.showInformationMessage("MeerkatIO: " + message);
		else
			vscode.window.showErrorMessage("MeerkatIO: " + response.data.error);
	})
	.catch(error => {
		console.log(error);
		vscode.window.showErrorMessage('Error contacting MeerkatIO Platform');
	});
}

//return boolean sent true/false
function handleMeerkatNotification(message, time_diff, trigger) {
	const meerkatioNotification = vscode.workspace.getConfiguration('meerkat').get('meerkatNotification', 'ping');

	let moment_duration = moment.duration(time_diff);
	let humaized_duration = moment_duration.humanize();
	
	if (meerkatioNotification === 'ping') {
		player.play(extensionPath + '/audio/default_ping.mp3', function(err){
			if (err) {
				vscode.window.showErrorMessage("MeerkatIO: Failed to access audio device for Ping notification");
			}
		});
		vscode.window.showInformationMessage(`MeerkatIO: Ping Notification (${humaized_duration}): ` + message);
	
		sendMeerkatLocal('ping', time_diff, trigger);
	}
	else if (meerkatioNotification === 'system') {
		nc.notify({
			title: 'MeerkatIO Alert',
			message: message,
			icon: extensionPath + "/images/logo-transparent.png"
		}, function (err, response) {
			if (err !== null) {
				vscode.window.showErrorMessage(`MeerkatIO: Unable to display system notification, please check your permissions`);
			}
		});
		vscode.window.showInformationMessage(`MeerkatIO: System Notification (${humaized_duration}): ` + message);
	
		sendMeerkatLocal('system', time_diff, trigger);
	}
	else if (meerkatioNotification === 'slack') {
		sendMeerkatNotification('slack', message, time_diff, trigger);
	}
	else if (meerkatioNotification === 'teams') {
		sendMeerkatNotification('teams', message, time_diff, trigger);
	}
	else if (meerkatioNotification === 'google_chat') {
		sendMeerkatNotification('google_chat', message, time_diff, trigger);
	}
	else if (meerkatioNotification === 'sms') {
		sendMeerkatNotification('sms', message, time_diff, trigger);
	}
	else if (meerkatioNotification === 'email') {
		sendMeerkatNotification('email', message, time_diff, trigger);
	}
}

/*
 * Jupyter Notebook Watcher
 */

async function notebookWatcher(context) {
	vscode.workspace.onDidChangeNotebookDocument((event) => {
		for(let cell of event.cellChanges) {
			if (cell.executionSummary?.timing) {
				//Cell completed
				let startTime = new Date(cell.executionSummary.timing.startTime);
				let endTime = new Date(cell.executionSummary.timing.endTime);
				let message = `Cell #${cell.cell.index} in notebook ${event.notebook.uri.path.split("/").pop()} ${cell.executionSummary.success ? "Completed Successfully" : "Execution Failed"}`;
				let kernelMonitor = new NotificationMonitor(message, "jupyter", startTime);
				kernelMonitor.uuid = event.notebook.uri.path;
				kernelMonitor.setEndDatetime(endTime);

				if (isValidNotification(kernelMonitor.duration)) {
					handleMeerkatNotification(kernelMonitor.message, kernelMonitor.duration, "jupyter");
					logNotificationHistory(kernelMonitor, context);
					checkSurveyTrigger(context);
				}
				sideBarProvider.updateHtml();
				bottomPanelProvider.updateHtml();
			}
		}
	});
}

/*
 * Terminal Watcher
 */

async function terminalHandler(pid, context) {
	let childPIDs = new Map();
	while (activePIDs.includes(pid)) {
		//get child PIDs
		//for each new child PID, monitor until PID no longer exists, then trigger notification
		const allTasks = await psList();
		const childTasks = allTasks.filter((x) => x.ppid === pid);

		const PIDList = [];
		for (const task of childTasks) {
			if (!childPIDs.has(task.pid)) {
				childPIDs.set(task.pid, {timestamp: new Date(), command: task.cmd ? task.cmd : task.name});
			}
			PIDList.push(task.pid);
		}
		
		// ended tasks
		for(const childPID of Array.from(childPIDs.keys())) {
			if (!PIDList.includes(childPID)) {
				let terminalCommand = childPIDs.get(childPID).command;
				const message = `Terminal Process Completed${terminalCommand ? ": " + terminalCommand : ""}`;
				const time_diff = new Date() - childPIDs.get(childPID).timestamp;
				let nm = new NotificationMonitor(message, "terminal", childPIDs.get(childPID).timestamp);
				nm.setEndDatetime(new Date());
				if (isValidNotification(nm.duration)) {
					handleMeerkatNotification(message, time_diff, "terminal");
					logNotificationHistory(nm, context);
					checkSurveyTrigger(context);
				}
				sideBarProvider.updateHtml();
				bottomPanelProvider.updateHtml();
				childPIDs.delete(childPID);
			}
		}

		await sleep(1000);
	}
}

async function terminalWatcher(terminal, context) {
	if (terminal !== undefined) {
		let pid = await terminal.processId;
		if(!activePIDs.includes(pid)) {
			activePIDs.push(pid);
			terminalHandler(pid, context);
		}
	} else {
		// no active terminal defined, remove all active PIDs
		activePIDs = [];
	}
}

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
	// Init
	extensionPath = context.extensionPath;
	ExtensionContext.setExtensionContext(context);
	
	// Add WebViews
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			"meerkat-sidebar",
			sideBarProvider
		)
	);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			"meerkat-bottom-panel",
			bottomPanelProvider
		)
	);

	// Get User Info
	await checkMeerkatAccount();
	sideBarProvider.updateHtml();
	bottomPanelProvider.updateHtml();

	/*
	 * Run and Debug Monitor
	 */
	let debugMonitor = new NotificationMonitor(null, "debug", null);
	const debugStartTaskListener = vscode.debug.onDidStartDebugSession((e) => {
		debugMonitor.startDatetime = new Date();
	});
	const debugTaskListener = vscode.debug.onDidTerminateDebugSession((e) => {
		if (e.parentSession === undefined) {
			debugMonitor.message = `Run (${e.type}) Completed: ${e.name}`;
			debugMonitor.setEndDatetime(new Date());
			if (isValidNotification(debugMonitor.duration)) {
				handleMeerkatNotification(debugMonitor.message, debugMonitor.duration, debugMonitor.trigger);
				logNotificationHistory(debugMonitor, context);
				checkSurveyTrigger(context);
			}
			sideBarProvider.updateHtml();
			bottomPanelProvider.updateHtml();
		}
	});

	/*
	 * Task Monitor
	 */
	let taskMonitor = new NotificationMonitor(null, "task", null);
	const taskStartTaskListener = vscode.tasks.onDidStartTask((e) => {
		taskMonitor.startDatetime = new Date();
	});
	const taskListener = vscode.tasks.onDidEndTask((e) => {
		taskMonitor.message = `Task (${e.execution.task.source}) completed: ${e.execution.task.name}`;		
		taskMonitor.setEndDatetime(new Date());
		if (isValidNotification(taskMonitor.duration)) {
			handleMeerkatNotification(taskMonitor.message, taskMonitor.duration, taskMonitor.trigger);
			logNotificationHistory(taskMonitor, context);
			checkSurveyTrigger(context);
		}
		sideBarProvider.updateHtml();
		bottomPanelProvider.updateHtml();
	});

	/*
	 * Jupyter Monitor
	 */
	notebookWatcher(context);

	/*
	 * Terminal Monitor
	 */
	terminalWatcher(vscode.window.activeTerminal, context);
	const terminalListener = vscode.window.onDidChangeActiveTerminal((t) => terminalWatcher(t, context));

	context.subscriptions.push(debugStartTaskListener);
	context.subscriptions.push(debugTaskListener);
	context.subscriptions.push(taskStartTaskListener);
	context.subscriptions.push(taskListener);
	context.subscriptions.push(terminalListener);

	/*
	 * Account Login Command
	 */
	context.subscriptions.push(vscode.commands.registerCommand('meerkat.login', async () => {
        const authenticated = await meerkatAuthenticate();
        if (authenticated) {
			sideBarProvider.updateHtml();
			bottomPanelProvider.updateHtml();
            vscode.window.showInformationMessage(`Successfully logged in to MeerkatIO`, "Configure Notifications").then((selection) => {
				if (selection === 'Configure Notifications') {
					// Open the extension's settings
					vscode.commands.executeCommand('workbench.action.openSettings', 'meerkat');
				}
			});
        }
    }));

	// Authentication + Account Configuration
	let authenticated = vscode.workspace.getConfiguration('meerkat').get('token') || context.globalState.get(Constants.MEERKATIO_TOKEN)
	if (vscode.workspace.getConfiguration('meerkat').get('enabled', true))
		if (authenticated)
			vscode.window.showInformationMessage('MeerkatIO - your notification manager - has enabled your Pro account!', "Configure Notifications").then((selection) => {
				if (selection === 'Configure Notifications') {
					// Open the extension's settings
					vscode.commands.executeCommand('workbench.action.openSettings', 'meerkat');
				}
			});
		else
			vscode.window.showInformationMessage('MeerkatIO - your notification manager - is now active!', "Log In to MeerkatIO Pro with GitHub").then((selection) => {
				if (selection === 'Log In to MeerkatIO Pro with GitHub') {
					// Run login command
					vscode.commands.executeCommand("meerkat.login");
				}
			});
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
