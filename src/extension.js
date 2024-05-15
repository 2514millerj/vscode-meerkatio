const vscode = require('vscode');
const axios = require('axios');
var player = require('play-sound')(opts = {});
const notifier = require('node-notifier');
const SideBarProvider = require('./SideBarProvider');

const nc = new notifier.NotificationCenter();
var timestamp = null;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function sendMeerkatLocal(method) {
	const url = 'https://meerkatio.com/api/notification/local';

	const data = {
        uid: vscode.env.machineId,
		method
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

function handleMeerkatNotification(meerkatioNotification, message, extensionPath, time_diff) {
	let minTriggerSeconds = vscode.workspace.getConfiguration('meerkat').get('triggerMinDurationSeconds', 30);
	if (time_diff < minTriggerSeconds * 1000) {
		return;
	}
	
	if (meerkatioNotification === 'ping') {
		player.play(extensionPath + '/audio/default_ping.mp3', function(err){
			if (err) throw err
			});
		vscode.window.showInformationMessage(`MeerkatIO: Ping Notification (${time_diff} ms): ` + message);
	
		sendMeerkatLocal('ping');
	}
	else if (meerkatioNotification === 'system') {
		nc.notify({
			title: 'MeerkatIO Alert',
			message: message,
			icon: extensionPath + "/images/logo-transparent.png",
			timeout: 30
		});
		vscode.window.showInformationMessage(`MeerkatIO: System Notification (${time_diff} ms): ` + message);
	
		sendMeerkatLocal('system');
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

async function handleNotebookKernel(api, uri, context) {
	let kernelFound = false;
	let kernel = undefined;
	while(!kernelFound) {
		kernel = await api.kernels.getKernel(uri);
		if (kernel !== undefined) {
			kernelFound = true;
		}
		await sleep(1000);
	}

	context.subscriptions.push(kernel.onDidChangeStatus((e) => {
		if (e === "busy") {
			timestamp = new Date();
		} else if (e === "idle" && timestamp !== null) {
			const meerkatioNotification = vscode.workspace.getConfiguration('meerkat').get('meerkatNotification', 'ping');
			const message = `Jupyter Notebook Cell Completed`;
			const time_diff = new Date() - timestamp;
			handleMeerkatNotification(meerkatioNotification, message, context.extensionPath, time_diff);
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

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
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
		if (!vscode.workspace.getConfiguration('meerkat').get('enabled', true))
			return;

		if (e.parentSession === undefined) {
			const meerkatioNotification = vscode.workspace.getConfiguration('meerkat').get('meerkatNotification', 'ping');
			const message = `Run (${e.type}) Completed: ${e.name}`;
			const time_diff = new Date() - timestamp;
			handleMeerkatNotification(meerkatioNotification, message, context.extensionPath, time_diff);
			timestamp = null;
		}
	});

	const taskStartTaskListener = vscode.tasks.onDidStartTask((e) => {
		timestamp = new Date();
	});

	const taskListener = vscode.tasks.onDidEndTask((e) => {
		if (!vscode.workspace.getConfiguration('meerkat').get('enabled', true))
			return;

		const meerkatioNotification = vscode.workspace.getConfiguration('meerkat').get('meerkatNotification', 'ping');
		const message = `Task (${e.execution.task.source}) completed: ${e.execution.task.name}`;
		const time_diff = new Date() - timestamp;
		handleMeerkatNotification(meerkatioNotification, message, context.extensionPath, time_diff);
		timestamp = null;
	});

	//start async Jupyter notebook watcher for when a user opens new notebooks
	notebookWatcher(context);

	context.subscriptions.push(debugStartTaskListener);
	context.subscriptions.push(debugTaskListener);
	context.subscriptions.push(taskStartTaskListener);
	context.subscriptions.push(taskListener);

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
