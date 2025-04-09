// Imports
const vscode = require('vscode');
const axios = require('axios');
var player = require('play-sound')(opts = {});
const notifier = require('node-notifier');
const psList = require('ps-list');
const moment = require('moment');
const os = require('os');

// Module Imports
const SideBarProvider = require('./SideBarProvider');
let sideBarProvider = new SideBarProvider();
const BottomPanelProvider = require('./BottomPanelProvider');
let bottomPanelProvider = new BottomPanelProvider();

const checkSurveyTrigger = require('./surveyPrompt');
const { wrapText } = require('./utils');

const NotificationHistory = require('./notificationHistory');
const logNotificationHistory = NotificationHistory.logNotificationHistory;
const NotificationMonitor = NotificationHistory.NotificationMonitor;

const ExtensionContext = require('./extensionContext');
const { meerkatAuthenticate, checkMeerkatAccount } = require('./authentication');
const Constants = require('./constants');

function nodeNotifierFactory(options = {})
{
	switch (os.platform()) {
		case 'win32':
			return new notifier.WindowsToaster({
				...options
			});
		case 'darwin':
			return new notifier.NotificationCenter({
				...options
			});
		case 'linux':
			return new notifier.NotifySend({
				...options
			});
	}
}

function desktopNotifcationFactory(options = {})
{
	switch (os.platform()) {
		case 'win32':
			return {
				...options,
				appID: Constants.WINDOWS_APP_ID
			};
		case 'darwin':
			return {
				...options,
			};
		case 'linux':
			return {
				...options,
			};
	}
}

// Global Variables
var extensionPath = "";
const nc = nodeNotifierFactory({});
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

function handleSummarizeTaskButton(notification) {
	let context = ExtensionContext.getExtensionContext();
	const accountEmail = context.globalState.get(Constants.ACCOUNT_EMAIL, "");
	const accountValid = context.globalState.get(Constants.ACCOUNT_VALID, true);
	let isProUser = accountEmail && accountValid;
	const stripeURL = "https://buy.stripe.com/5kAcPD5627OO3OoeUV?prefilled_email=" + encodeURIComponent(accountEmail);
	
	if (isProUser) {
		vscode.commands.executeCommand('meerkat.analyzeLastNotificationOutput', [notification]);
	} else {
		vscode.window.showErrorMessage("MeerkatIO: Pro account required to summarize task output.", "Upgrade to MeerkatIO Pro").then((selection) => {
			if (accountEmail)
				vscode.env.openExternal(stripeURL);
			else
				vscode.commands.executeCommand("meerkat.login");
		});
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

function sendMeerkatNotification(method, notification) {
	const message = notification.message;
	const duration_ms = notification.duration;
	const trigger = notification.trigger;
	
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
		if (response.status === 200) {
			vscode.window.showInformationMessage("MeerkatIO: " + message, "Summarize Task Output").then((selection) => {
				if (selection === "Summarize Task Output") 
					handleSummarizeTaskButton(notification)
			});

			let context = ExtensionContext.getExtensionContext();
			let accountType = response.data.accountType;
			context.globalState.update(Constants.ACCOUNT_TYPE, accountType);
		}
	})
	.catch(error => {
		if (axios.isAxiosError(error) && error.response?.status === 400) {
			let errorMessage = error.response.data.error ? error.response.data.error : "Failed to send notification";
			if (errorMessage.includes("Upgrade")) {
				vscode.window.showErrorMessage("MeerkatIO: " + errorMessage, "Upgrade to MeerkatIO Pro").then((selection) => {
					if (selection === "Upgrade to MeerkatIO Pro") {
						let context = ExtensionContext.getExtensionContext();
						const accountEmail = context.globalState.get(Constants.ACCOUNT_EMAIL, "");
						const stripeURL = "https://buy.stripe.com/5kAcPD5627OO3OoeUV?prefilled_email=" + encodeURIComponent(accountEmail);

						vscode.env.openExternal(stripeURL);
					}
				});
			} else {
				vscode.window.showErrorMessage("MeerkatIO: " + errorMessage);
			}
		  } else {
			vscode.window.showErrorMessage('Error contacting MeerkatIO Platform');
		  }
	});
}

//return boolean sent true/false
function handleMeerkatNotification(notification) {
	const meerkatioNotification = vscode.workspace.getConfiguration('meerkat').get('meerkatNotification', 'ping');

	let momentDuration = moment.duration(notification.duration);
	let humaizedDuration = momentDuration.humanize();

	if (meerkatioNotification === 'ping') {
		player.play(extensionPath + '/audio/default_ping.mp3', function(err){
			if (err) {
				vscode.window.showErrorMessage("MeerkatIO: Failed to access audio device for Ping notification");
			}
		});
		vscode.window.showInformationMessage(`MeerkatIO: Ping Notification (${humaizedDuration}): ` + notification.message, "Summarize Task Output").then((selection) => {
			if (selection === "Summarize Task Output") 
				handleSummarizeTaskButton(notification)
		});
	
		sendMeerkatLocal('ping', notification.duration, notification.trigger);
	}
	else if (meerkatioNotification === 'system') {
		nc.notify(
			desktopNotifcationFactory(
				{
					title: 'MeerkatIO Alert',
					message: notification.message,
					icon: extensionPath + "/images/logo-transparent.png"
				}
			), 
		function (err, response) {
			if (err !== null) {
				vscode.window.showErrorMessage(`MeerkatIO: Unable to display system notification, please check your permissions`);
			}
		});
		vscode.window.showInformationMessage(`MeerkatIO: System Notification (${humaizedDuration}): ` + notification.message, "Summarize Task Output").then((selection) => {
			if (selection === "Summarize Task Output") 
				handleSummarizeTaskButton(notification)
		});
	
		sendMeerkatLocal('system', notification.duration, notification.trigger);
	}
	else if (meerkatioNotification === 'slack') {
		sendMeerkatNotification('slack', notification);
	}
	else if (meerkatioNotification === 'teams') {
		sendMeerkatNotification('teams', notification);
	}
	else if (meerkatioNotification === 'google_chat') {
		sendMeerkatNotification('google_chat', notification);
	}
	else if (meerkatioNotification === 'sms') {
		sendMeerkatNotification('sms', notification);
	}
	else if (meerkatioNotification === 'email') {
		sendMeerkatNotification('email', notification);
	}
}

/*
 * Jupyter Notebook Watcher
 */

async function notebookWatcher(context) {
	var cellIDs = [];
	vscode.workspace.onDidChangeNotebookDocument((event) => {
		for(let cell of event.cellChanges) {
			if (cell.executionSummary?.timing !== undefined) {				
				//Cell completed
				let startTime = new Date(cell.executionSummary.timing.startTime);
				let endTime = new Date(cell.executionSummary.timing.endTime);
				
				if (cellIDs.includes(cell.executionSummary.timing.startTime)) {
					continue;
				}
				cellIDs.push(cell.executionSummary.timing.startTime);
				
				let message = `Cell #${cell.cell.index} in notebook ${event.notebook.uri.path.split("/").pop()} ${cell.executionSummary.success ? "Completed Successfully" : "Execution Failed"}`;
				let kernelMonitor = new NotificationMonitor(message, "jupyter", startTime);
				kernelMonitor.uuid = event.notebook.uri.path;
				kernelMonitor.setEndDatetime(endTime);

				let output = "";
				if (cell.cell.outputs && cell.cell.outputs.length > 0) {
					// Process the outputs
					cell.cell.outputs.forEach((cellOutput) => {
					  if (cellOutput.items) {
						cellOutput.items.forEach((item) => {
						  const mime = item.mime; // The MIME type of the output
						  const value = item.data.toString(); // Convert the data to string
						  output += value;
						});
					  }
					});
				}
				kernelMonitor.setOutput(output);

				if (isValidNotification(kernelMonitor.duration)) {
					handleMeerkatNotification(kernelMonitor);
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

async function terminalHandler(pid, context, terminalName) {
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
				let terminalMonitor = new NotificationMonitor(message, "terminal", childPIDs.get(childPID).timestamp);
				terminalMonitor.setEndDatetime(new Date());
				if (isValidNotification(terminalMonitor.duration)) {
					terminalMonitor.id = terminalName;
					
					handleMeerkatNotification(terminalMonitor);
					logNotificationHistory(terminalMonitor, context);
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
			terminalHandler(pid, context, terminal.name);
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
	try{
		await checkMeerkatAccount();
	} catch(e) {
		console.log(e);
	}
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
				handleMeerkatNotification(debugMonitor);
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
			handleMeerkatNotification(taskMonitor);
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
					vscode.commands.executeCommand('meerkat.setNotificationChannel');
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
					vscode.commands.executeCommand('meerkat.setNotificationChannel');
				}
			});
		else
			vscode.window.showInformationMessage('MeerkatIO - your notification manager - is now active!', "Log In to MeerkatIO Pro with GitHub").then((selection) => {
				if (selection === 'Log In to MeerkatIO Pro with GitHub') {
					// Run login command
					vscode.commands.executeCommand("meerkat.login");
				}
			});

	/*
	 * Walkthrough Commands
	 */
	context.subscriptions.push(vscode.commands.registerCommand('meerkat.openNotificationHistory', async () => {
        vscode.commands.executeCommand('workbench.view.extension.meerkat-bottom-panel-view');
    }));
	context.subscriptions.push(vscode.commands.registerCommand('meerkat.setNotificationChannel', async () => {
        vscode.commands.executeCommand('workbench.view.extension.meerkat-sidebar-view');
    }));
	context.subscriptions.push(vscode.commands.registerCommand('meerkat.setExecutionTriggerDuration', async () => {
        vscode.commands.executeCommand('workbench.view.extension.meerkat-sidebar-view');
    }));

	context.subscriptions.push(vscode.commands.registerCommand('meerkat.analyzeLastNotificationOutput', async (notifications) => {
        const notification = notifications[0];
		const models = await vscode.lm.selectChatModels();
		let model = undefined;
		if (models && models.length > 0) {
			model = models[0];
		} else {
			vscode.window.showErrorMessage("MeerkatIO: AI Model not found. Please configure your VS Code AI.")
			return;
		}

		let output = "";
		if (notification.trigger === "terminal") {
			// Capture terminal output
			const terminals = vscode.window.terminals;
			const completedTerminal = terminals.find(t => t.name === notification.id);
			if (completedTerminal) {
				completedTerminal.show();
			}

			await vscode.commands.executeCommand('workbench.action.terminal.selectAll');
			await vscode.commands.executeCommand('workbench.action.terminal.copySelection');
	
			// Wait a bit for clipboard operation
			await new Promise(resolve => setTimeout(resolve, 100));
	
			output = await vscode.env.clipboard.readText();

			// Clear selection
			await vscode.commands.executeCommand('workbench.action.terminal.clearSelection');
		} else if (notification.trigger === "jupyter") {
			output = notification.output;
		}

		if (!output) {
			vscode.window.showErrorMessage("MeerkatIO: No task output to summarize.")
			return;
		}

		const messages = [
			vscode.LanguageModelChatMessage
				.User(`You are a helpful senior engineer. Your job is to analyze output from a program and provide insight into what the output means in a simple and concise message. The goal of your response is to save the developer time in understanding what happened after program execution.`),
			vscode.LanguageModelChatMessage.User(output.length > model.maxInputTokens ? output.slice(0, model.maxInputTokens) : output)
		];

		try {
			let chatResponse = await model.sendRequest(
				messages,
				{},
				new vscode.CancellationTokenSource().token
			);

			let response = "==================\n";
			response += notification.message;
			response += "\n==================\n\nTask Output Summary:\n\n";
			for await (const fragment of chatResponse.text) {
				response += fragment;
			}
			// Create a new untitled document
			const document = await vscode.workspace.openTextDocument({
				content: wrapText(response, 80),
				language: 'plaintext' // You can specify the language mode here
			});
			
			// Show the document in the editor
			await vscode.window.showTextDocument(document);
		} catch (err) {
			console.log(err);
			vscode.window.showErrorMessage("MeerkatIO: Failed to generate AI output.")
		}
    }));	  
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
