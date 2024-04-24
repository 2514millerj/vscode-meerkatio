// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const axios = require('axios');
var player = require('play-sound')(opts = {});
//const notifier = require('node-notifier');

function sendMeerkatNotification(method, message) {
    const url = 'https://meerkatio.com/api/notification/send';

	const token = vscode.workspace.getConfiguration('meerkat').get('token');
	if (!token) {
		vscode.window.showErrorMessage("No MeerkatIO token found. Check configuration and try again.");
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
			vscode.window.showInformationMessage(message);
		else
			vscode.window.showErrorMessage("MeerkatIO failed to send notification. Please check your credentials and valid configuration options.");
	})
	.catch(error => {
		console.log(error);
		vscode.window.showErrorMessage('Error contacting MeerkatIO Platform');
	});
}

function handleMeerkatNotification(meerkatioNotification, message, extensionPath) {
	if (meerkatioNotification === 'ping') {
		player.play(extensionPath + '/audio/default_ping.mp3', function(err){
			if (err) throw err
			});
	}
	else if (meerkatioNotification === 'slack') {
		console.log("Slack Alert");
		sendMeerkatNotification('slack', message);
	}
	else if (meerkatioNotification === 'sms') {
		console.log("SMS Alert");
		sendMeerkatNotification('sms', message);
	}
	else if (meerkatioNotification === 'email') {
		console.log("Email Alert");
		sendMeerkatNotification('email', message);
	}
}


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	if (vscode.workspace.getConfiguration('meerkat').get('enabled', true))
		vscode.window.showInformationMessage('MeerkatIO - your notification manager - is now active!');

	//const debugTaskListener = vscode.debug.onDidEndTask((e) => handleNotification(e, context));
	const debugTaskListener = vscode.debug.onDidTerminateDebugSession((e) => {
		if (!vscode.workspace.getConfiguration('meerkat').get('enabled', true))
			return;

		const meerkatioNotification = vscode.workspace.getConfiguration('meerkat').get('meerkatNotification', 'ping');
		const message = `Run and Debug Task Completed: ${e.name}`;
		handleMeerkatNotification(meerkatioNotification, message, context.extensionPath);
	})

	const taskListener = vscode.tasks.onDidEndTask((e) => {
		if (!vscode.workspace.getConfiguration('meerkat').get('enabled', true))
			return;

		const meerkatioNotification = vscode.workspace.getConfiguration('meerkat').get('meerkatNotification', 'ping');
		const message = `Task completed: ${e.execution.task.name}`;
		handleMeerkatNotification(meerkatioNotification, message, context.extensionPath);
	});

	context.subscriptions.push(debugTaskListener);
	context.subscriptions.push(taskListener);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
