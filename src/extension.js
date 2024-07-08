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

const checkSurveyTrigger = require('./surveyPrompt');

const NotificationHistory = require('./notificationHistory');
const logNotificationHistory = NotificationHistory.logNotificationHistory;
const NotificationMonitor = NotificationHistory.NotificationMonitor;

const ExtensionContext = require('./extensionContext');

// Global Variables
var extensionPath = "";
const nc = new notifier.NotificationCenter();
var activePIDs = [];

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

function sendMeerkatNotification(method, message) {
    const url = 'https://meerkatio.com/api/notification/send';

	const token = vscode.workspace.getConfiguration('meerkat').get('token');
	if (!token) {
		vscode.window.showErrorMessage("MeerkatIO: No token found. Check configuration and try again.");
		return;
	}

    const data = {
        meerkat_token: token,
        method,
		message: "From VS Code: " + message
    };

    axios.post(url, data, {
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(response => {
		if (response.status === 200)
			vscode.window.showInformationMessage("MeerkatIO: " + message);
		else
			vscode.window.showErrorMessage("MeerkatIO: failed to send notification. Please check your credentials and valid configuration options.");
	})
	.catch(error => {
		console.log(error);
		vscode.window.showErrorMessage('Error contacting MeerkatIO Platform');
	});
}

function handleMeerkatNotification(message, time_diff, trigger) {
	console.log("MeerkatIO Notification Triggered");
	if (!vscode.workspace.getConfiguration('meerkat').get('enabled', true))
		return;

	const meerkatioNotification = vscode.workspace.getConfiguration('meerkat').get('meerkatNotification', 'ping');
	let minTriggerSeconds = vscode.workspace.getConfiguration('meerkat').get('triggerMinDurationSeconds', 30);
	if (time_diff < minTriggerSeconds * 1000) {
		return;
	}

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
		sendMeerkatNotification('slack', message);
	}
	else if (meerkatioNotification === 'sms') {
		sendMeerkatNotification('sms', message);
	}
	else if (meerkatioNotification === 'email') {
		sendMeerkatNotification('email', message);
	}
}

/*
 * Jupyter Notebook Watcher
 */

async function handleNotebookKernel(api, uri, context) {
	let kernelFound = false;
	let kernel = undefined;
	while(!kernelFound) {
		try {
			if (api.kernels !== undefined) {
				kernel = await api.kernels.getKernel(uri);
				if (kernel !== undefined) {
					kernelFound = true;
				}
			}
		} catch(e) {
			console.log(e);
		}
		await sleep(1000);
	}
	console.log(`New Jupyter Kernel found: ${uri}`);

	const message = `Jupyter Notebook Cell Completed`;
	let kernelMonitor = new NotificationMonitor(message, "jupyter", null);
	kernelMonitor.uuid = uri;

	context.subscriptions.push(kernel.onDidChangeStatus((e) => {
		if (e === "busy") {
			kernelMonitor.startDatetime = new Date();
		} else if (e === "idle" && kernelMonitor.startDatetime !== null) {
			handleMeerkatNotification(kernelMonitor.message, kernelMonitor.duration, "jupyter");
			logNotificationHistory(kernelMonitor, context);
			checkSurveyTrigger(context);
			sideBarProvider.updateHtml();
			kernelMonitor.startDatetime = null;
		}
	}));
}

async function notebookWatcher(context) {
	const jupyterExt = vscode.extensions.getExtension('ms-toolsai.jupyter');
	if (jupyterExt) {
		const api = await jupyterExt.activate();
		
		let existingDocs = [];
		while(true) {
			for (const document of vscode.workspace.notebookDocuments) {
				if (!existingDocs.includes(document.uri)) {
					console.log(`New Jupyter Notebook Detected: ${document.uri}`)
					handleNotebookKernel(api, document.uri, context);
					existingDocs.push(document.uri);
				}
			}
			await sleep(1000);
		}	
	}
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
				childPIDs.set(task.pid, {timestamp: new Date(), command: task.cmd});
			}
			PIDList.push(task.pid);
		}
		
		// ended tasks
		for(const childPID of Array.from(childPIDs.keys())) {
			if (!PIDList.includes(childPID)) {
				const message = `Terminal Process Completed: ${childPIDs.get(childPID).command}`;
				const time_diff = new Date() - childPIDs.get(childPID).timestamp;
				handleMeerkatNotification(message, time_diff, "terminal");
				let nm = new NotificationMonitor(message, "terminal", childPIDs.get(childPID).timestamp);
				logNotificationHistory(nm, context);
				checkSurveyTrigger(context);
				sideBarProvider.updateHtml();
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
	extensionPath = context.extensionPath
	ExtensionContext.setExtensionContext(context);
	
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			"meerkat-sidebar",
			sideBarProvider
		)
	);

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
			handleMeerkatNotification(debugMonitor.message, debugMonitor.duration, debugMonitor.trigger);
			logNotificationHistory(debugMonitor, context);
			checkSurveyTrigger(context);
			sideBarProvider.updateHtml();
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
		handleMeerkatNotification(taskMonitor.message, taskMonitor.duration, taskMonitor.trigger);
		logNotificationHistory(taskMonitor, context);
		checkSurveyTrigger(context);
		sideBarProvider.updateHtml();
	});

	//start async Jupyter notebook watcher for when a user opens new notebooks
	notebookWatcher(context);

	//start async terminal watcher
	terminalWatcher(vscode.window.activeTerminal, context);
	const terminalListener = vscode.window.onDidChangeActiveTerminal((t) => terminalWatcher(t, context));

	context.subscriptions.push(debugStartTaskListener);
	context.subscriptions.push(debugTaskListener);
	context.subscriptions.push(taskStartTaskListener);
	context.subscriptions.push(taskListener);
	context.subscriptions.push(terminalListener);

	// This line of code will only be executed once when your extension is activated
	if (vscode.workspace.getConfiguration('meerkat').get('enabled', true))
		vscode.window.showInformationMessage('MeerkatIO - your notification manager - is now active!');

}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
