const vscode = require('vscode');
const axios = require('axios');
var player = require('play-sound')(opts = {});
const notifier = require('node-notifier');
const psList = require('ps-list');
const SideBarProvider = require('./SideBarProvider');

// Global Variables
var extensionPath = "";
const nc = new notifier.NotificationCenter();
var timestamp = null;
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
	if (!vscode.workspace.getConfiguration('meerkat').get('enabled', true))
		return;

	const meerkatioNotification = vscode.workspace.getConfiguration('meerkat').get('meerkatNotification', 'ping');
	let minTriggerSeconds = vscode.workspace.getConfiguration('meerkat').get('triggerMinDurationSeconds', 30);
	if (time_diff < minTriggerSeconds * 1000) {
		return;
	}
	
	if (meerkatioNotification === 'ping') {
		player.play(extensionPath + '/audio/default_ping.mp3', function(err){
			if (err) throw err
			});
		vscode.window.showInformationMessage(`MeerkatIO: Ping Notification (${time_diff} ms): ` + message);
	
		sendMeerkatLocal('ping', time_diff, trigger);
	}
	else if (meerkatioNotification === 'system') {
		nc.notify({
			title: 'MeerkatIO Alert',
			message: message,
			icon: extensionPath + "/images/logo-transparent.png",
			timeout: 30
		});
		vscode.window.showInformationMessage(`MeerkatIO: System Notification (${time_diff} ms): ` + message);
	
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

	context.subscriptions.push(kernel.onDidChangeStatus((e) => {
		if (e === "busy") {
			timestamp = new Date();
		} else if (e === "idle" && timestamp !== null) {
			const message = `Jupyter Notebook Cell Completed`;
			const time_diff = new Date() - timestamp;
			handleMeerkatNotification(message, time_diff, "jupyter");
			timestamp = null;
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

async function terminalHandler(pid) {
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
				childPIDs.delete(childPID);
			}
		}

		await sleep(1000);
	}
}

async function terminalWatcher(terminal) {
	if (terminal !== undefined) {
		let pid = await terminal.processId;
		if(!activePIDs.includes(pid)) {
			activePIDs.push(pid);
			terminalHandler(pid);
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

	const sideBarProvider = new SideBarProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			"meerkat-sidebar",
			sideBarProvider
		)
	);

	const debugStartTaskListener = vscode.debug.onDidStartDebugSession((e) => {
		timestamp = new Date();
	});

	const debugTaskListener = vscode.debug.onDidTerminateDebugSession((e) => {
		if (e.parentSession === undefined) {
			const message = `Run (${e.type}) Completed: ${e.name}`;
			const time_diff = new Date() - timestamp;
			handleMeerkatNotification(message, time_diff, "debug");
			timestamp = null;
		}
	});

	const taskStartTaskListener = vscode.tasks.onDidStartTask((e) => {
		timestamp = new Date();
	});

	const taskListener = vscode.tasks.onDidEndTask((e) => {
		const message = `Task (${e.execution.task.source}) completed: ${e.execution.task.name}`;
		const time_diff = new Date() - timestamp;
		handleMeerkatNotification(message, time_diff, "task");
		timestamp = null;
	});

	//start async Jupyter notebook watcher for when a user opens new notebooks
	notebookWatcher(context);

	//start async terminal watcher
	const terminalListener = vscode.window.onDidChangeActiveTerminal(terminalWatcher);

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
