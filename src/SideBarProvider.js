const vscode = require("vscode");

const Constants = require('./constants');
const ExtensionContext = require('./extensionContext');

class SideBarProvider {

    updateHtml() {
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview();
        }
    }

    resolveWebviewView(webviewView, context, _token) {
        webviewView.webview.options = {
            enableScripts: true
        };
        webviewView.webview.localResourceOptions = {
            allowScripts: true
        };

        webviewView.webview.html = this._getHtmlForWebview();

        // Listen for messages from the Sidebar component and execute action
        webviewView.webview.onDidReceiveMessage(
            message => {
                const config = vscode.workspace.getConfiguration('meerkat', vscode.ConfigurationTarget.Global);
                const context = ExtensionContext.getExtensionContext();
                
                switch (message.split(":")[0]) {
                    case "disable":
                        config.update('enabled', false, vscode.ConfigurationTarget.Global).then(() => {
                            webviewView.webview.postMessage('disabled');  
                        });
                        break;
                    case "enable":                        
                        config.update('enabled', true, vscode.ConfigurationTarget.Global).then(() => {
                            webviewView.webview.postMessage('enabled'); 
                        });
                        break;
                    case "login":
                        vscode.commands.executeCommand("meerkat.login");
                        break;
                    case "trigger_duration":
                        let duration = message.split(":")[1] * 60;
                        if (vscode.workspace.getConfiguration('meerkat').get('triggerMinDurationSeconds', undefined) !== undefined) {
                            config.update('triggerMinDurationSeconds', duration, vscode.ConfigurationTarget.Global);
                        }
                        context.globalState.update(Constants.NOTIF_TRIGGER_DURATION_SECONDS, duration);
                        break;
                    case "microsoft_teams":
                        if (message.split(":")[1] == "selected") {
                            if (vscode.workspace.getConfiguration('meerkat').get('meerkatNotification', undefined) !== undefined) {
                                config.update('meerkatNotification', 'teams', vscode.ConfigurationTarget.Global);
                            }
                            context.globalState.update(Constants.NOTIF_METHOD, "microsoft_teams");
                        } else {
                            fetch('https://meerkatio.com/api/user/add-microsoft-teams-webhook', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ 
                                    token: context.globalState.get(Constants.MEERKATIO_TOKEN),
                                    microsoft_teams_webhook: message.split(":").slice(1).join(":")
                                 })
                            }).then((response) => {});
                        }
                        break;
                    case "google_chat":
                        if (message.split(":")[1] == "selected") {
                            if (vscode.workspace.getConfiguration('meerkat').get('meerkatNotification', undefined) !== undefined) {
                                config.update('meerkatNotification', 'google_chat', vscode.ConfigurationTarget.Global);
                            }
                            context.globalState.update(Constants.NOTIF_METHOD, "google_chat");
                        } else {
                            fetch('https://meerkatio.com/api/user/add-google-chat-webhook', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ 
                                    token: context.globalState.get(Constants.MEERKATIO_TOKEN),
                                    google_chat_webhook: message.split(":").slice(1).join(":")
                                 })
                            }).then((response) => {});
                        }
                        break;
                    case "sms":
                        if (message.split(":")[1] == "selected") {
                            if (vscode.workspace.getConfiguration('meerkat').get('meerkatNotification', undefined) !== undefined) {
                                config.update('meerkatNotification', 'sms', vscode.ConfigurationTarget.Global);
                            }
                            context.globalState.update(Constants.NOTIF_METHOD, "sms");
                        } else {
                            fetch('https://meerkatio.com/api/user/add-phone-number', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ 
                                    token: context.globalState.get(Constants.MEERKATIO_TOKEN),
                                    phone_num: message.split(":")[1]
                                 })
                            }).then((response) => {});
                        }
                        break;
                    case "email":
                        if (message.split(":")[1] == "selected") {
                            if (vscode.workspace.getConfiguration('meerkat').get('meerkatNotification', undefined) !== undefined) {
                                config.update('meerkatNotification', 'email', vscode.ConfigurationTarget.Global);
                            }
                            context.globalState.update(Constants.NOTIF_METHOD, "email");
                        }
                        break;
                    case "ping":
                        if (message.split(":")[1] == "selected") {
                            if (vscode.workspace.getConfiguration('meerkat').get('meerkatNotification', undefined) !== undefined) {
                                config.update('meerkatNotification', 'ping', vscode.ConfigurationTarget.Global);
                            }
                            context.globalState.update(Constants.NOTIF_METHOD, "ping");
                        }
                        break;
                    case "system":
                        if (message.split(":")[1] == "selected") {
                            if (vscode.workspace.getConfiguration('meerkat').get('meerkatNotification', undefined) !== undefined) {
                                config.update('meerkatNotification', 'system', vscode.ConfigurationTarget.Global);
                            }
                            context.globalState.update(Constants.NOTIF_METHOD, "system");
                        }
                        break;
                }
                ExtensionContext.setExtensionContext(context);        
            }
        );
        this._view = webviewView;
    }

    _getNotificationActionButton() {
        let enabled = vscode.workspace.getConfiguration('meerkat').get('enabled', true);
        let enableBtnVis = enabled ? "none" : "block";
        let disableBtnVis = enabled ? "block" : "none";

        return `
                <button id="disableNotificationsButton" style="margin: 0 auto; margin-top: 10px; display: ${disableBtnVis}; color: white; background-color: #0074d9; border-radius: 4px; padding: 5px; width: 100%;">Disable Notifications</button>
                <button id="enableNotificationsButton" style="margin: 0 auto; margin-top: 10px; display: ${enableBtnVis}; color: white; background-color: #0074d9; border-radius: 4px; padding: 5px; width: 100%;">Enable Notifications</button>
            `
    }

    _getAccountOption() {
        const context = ExtensionContext.getExtensionContext();
	    const token = vscode.workspace.getConfiguration('meerkat').get('token') || context.globalState.get(Constants.MEERKATIO_TOKEN);
        const account_type = context.globalState.get(Constants.ACCOUNT_TYPE, "free");
        const account_valid = context.globalState.get(Constants.ACCOUNT_VALID, true);
        const account_email = context.globalState.get(Constants.ACCOUNT_EMAIL, "");

        let subscribeButton = `<a style="text-decoration: none;" href="https://buy.stripe.com/5kAcPD5627OO3OoeUV?prefilled_email=${encodeURIComponent(account_email)}"><button id="subscribeButton" style="margin: 0 auto; margin-top: 10px; color: white; background-color: green; border-radius: 4px; padding: 5px; width: 100%;">Subscribe to Pro</button></a>`

        if (!token) {
            return `
                <p>Ping and System notifications are always free and accessible to everyone!</p> 
                <p>MeerkatIO accounts unlock Slack, Teams, Google Chat, SMS, and Email notification channels - free for the first month!</p>
            
                <button id="startFreeTrialButton" style="margin: 0 auto; margin-top: 10px; color: white; background-color: green; border-radius: 4px; padding: 5px; width: 100%;">Start Pro Trial</button>
                <p><a href="https://meerkatio.com/login">Or sign in</a> and add your token to the workspace if you already have a MeerkatIO Pro account</p>
                `
        } else {
            if (account_type == "free" && account_valid) {
                return `
                    <p>Looks like you have your MeerkatIO Pro account all set. Enjoy your free trial!</p>
                    ${subscribeButton}
                `
            } else if (!account_valid) {
                return `
                    <p>Your MeerkatIO Pro account has expired. Renew your account today to re-gain access!</p>
                    ${subscribeButton}
                `
            } 
            else {
                return `
                    <p>Looks like you have your MeerkatIO Pro account all set. Thank you for using MeerkatIO Pro!</p>
                    <a style="text-decoration: none;" href="https://meerkatio.com/account"><button id="subscribeButton" style="margin: 0 auto; margin-top: 10px; color: white; background-color: green; border-radius: 4px; padding: 5px; width: 100%;">Go To Account</button></a>
                `
            }            
        }
    }

    _getHtmlForWebview() {
        const nonce = getNonce();
        const context = ExtensionContext.getExtensionContext();
        
        var email = context.globalState.get(Constants.ACCOUNT_EMAIL, '');
        var microsoftWebhook = context.globalState.get(Constants.ACCOUNT_MICROSOFT_TEAMS_WEBHOOK, '');
        var googleWebhook = context.globalState.get(Constants.ACCOUNT_GOOGLE_CHAT_WEBHOOK, '');
        var slackToken = context.globalState.get(Constants.ACCOUNT_SLACK_TOKEN, '');
        var phoneNumber = context.globalState.get(Constants.ACCOUNT_PHONE_NUMBER, '');

        var notificationMethod = vscode.workspace.getConfiguration('meerkat').get('meerkatNotification', context.globalState.get(Constants.NOTIF_METHOD, 'ping'));
        var notificationTriggerDurationMinutes = vscode.workspace.getConfiguration('meerkat').get('triggerMinDurationSeconds', context.globalState.get(Constants.NOTIF_TRIGGER_DURATION_SECONDS, 30)) / 60;

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src 'self' https://platform.slack-edge.com;">

                <title>MeerkatIO Extension</title>
                <style>
                    .sidebar {
                        padding: 16px;
                        font-family: var(--vscode-font-family);
                    }

                    .meerkat-notification-select {
                        width: 100%; /* Full width for responsive design */
                        padding: 8px;
                        margin-top: 8px;
                        font-size: 14px;
                        border: 1px solid var(--vscode-settings-focusedRowBorder);
                        border-radius: 4px;
                        background-color: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                    }

                    .meerkat-trigger-input {
                        border: 1px solid var(--vscode-settings-focusedRowBorder);
                        border-radius: 4px;
                        background-color: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        width: 60px; 
                        height: 30px; 
                        text-align: center;
                    }

                    .meerkat-notification-select:focus {
                        border-color: var(--vscode-focusBorder);
                        outline: none;
                        box-shadow: 0 0 3px var(--vscode-focusBorder);
                    }

                    .webhook-container {
                        margin-top: 16px;
                    }

                    .webhook-input {
                        width: 100%;
                        padding: 8px;
                        font-size: 14px;
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 4px;
                        background-color: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                    }

                    .webhook-input:focus {
                        border-color: var(--vscode-focusBorder);
                        outline: none;
                        box-shadow: 0 0 3px var(--vscode-focusBorder);
                    }

                </style>
            </head>
            <body>
                <h1>MeerkatIO</h1>
                <p>The personal notification tool for software developers and data scientists that <strong>fits your workflow</strong>.</p>
                <hr />

                <h2>Quick Actions</h2>

                <div>
                    ${this._getNotificationActionButton()}
                    
                    <div style="padding: 16px; display: flex; justify-content: center; align-items: center;">
                        <label for="trigger-duration" style="margin-right: 5px;">Notification Trigger (Minutes):</label>
                        <input 
                            id="trigger-duration" 
                            class="meerkat-trigger-input"
                            type="number" 
                            value="${notificationTriggerDurationMinutes}" 
                            min="0.5" 
                            step="0.5"
                            max="120" 
                        />
                    </div>
                    
                    <div class="sidebar">
                      <label for="meerkat-notification-select">Select Notification Channel:</label>
                        <select id="meerkat-notification-select" class="meerkat-notification-select">
                            <option value="ping" ${notificationMethod == 'ping' ? 'selected' : ''}>Ping</option>
                            <option value="system" ${notificationMethod == 'system' ? 'selected' : ''}>System Notification</option>
                            <option value="slack" ${notificationMethod == 'slack' ? 'selected' : ''}>Slack</option>
                            <option value="teams" ${notificationMethod == 'teams' ? 'selected' : ''}>Microsoft Teams</option>
                            <option value="google_chat" ${notificationMethod == 'google_chat' ? 'selected' : ''}>Google Chat</option>
                            <option value="email" ${notificationMethod == 'email' ? 'selected' : ''}>Email</option>
                            <option value="sms" ${notificationMethod == 'sms' ? 'selected' : ''}>SMS</option>
                        </select>
                        <div id="teams-webhook" class="webhook-container" style="display: none;">
                            <label for="teams-webhook-url">Microsoft Teams Webhook URL:</label>
                            <input type="url" id="teams-webhook-url" class="webhook-input" placeholder="https://example.webhook.url" value="${microsoftWebhook}" />
                        </div>
                        <div id="google-chat-webhook" class="webhook-container" style="display: none;">
                            <label for="google-chat-webhook-url">Google Chat Webhook URL:</label>
                            <input type="url" id="google-chat-webhook-url" class="webhook-input" placeholder="https://example.webhook.url" value="${googleWebhook}" />
                        </div>
                        <div id="slack-token" class="webhook-container" style="display: none;">
                            <a href="https://slack.com/oauth/v2/authorize?client_id=6908270676551.6916200280070&scope=chat:write&user_scope="><img height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" /></a>
                        </div>
                        <div id="email" class="webhook-container" style="display: none;">
                            <label for="email-value">Email:</label>
                            <input type="url" readonly id="email-value" class="webhook-input" value="${email}" />
                        </div>
                        <div id="sms" class="webhook-container" style="display: none;">
                            <label for="phone-num">Phone Number:</label>
                            <input type="phone" id="phone-num" class="webhook-input" placeholder="+1 123-456-7890" value="${phoneNumber}" />
                        </div>
                    </div>
                </div>

                <hr />
                <h2>Account Management</h2>
                
                ${this._getAccountOption()}
                
                <hr />
                <h2>Resources</h2>
                <p><a href="https://meerkatio.com/docs" style="text-decoration: none;"><i class="fa fa-book" aria-none="true"></i>Documentation</a></p>
                <p><a href="https://www.surveymonkey.com/r/RMX2TL9" style="text-decoration: none;">Submit Feedback</a></p>
                <p><a href="https://meerkatio.com" style="text-decoration: none;">MeerkatIO Website</a></p>
                <p><a href="https://marketplace.visualstudio.com/items?itemName=MeerkatIO.meerkatio" style="text-decoration: none;">Marketplace</a></p>
                <p><a href="https://github.com/2514millerj/vscode-meerkatio" style="text-decoration: none;">GitHub</a></p>
            
                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();

                    try{
                        document.getElementById('disableNotificationsButton').addEventListener('click', () => {
                            // Send a message to the extension when the button is clicked
                            vscode.postMessage('disable');
                        });
                    } catch (e) {}
                    
                    try{
                        document.getElementById('enableNotificationsButton').addEventListener('click', () => {
                            // Send a message to the extension when the button is clicked
                            vscode.postMessage('enable');
                        });
                    } catch (e) {}

                    try{
                        document.getElementById('startFreeTrialButton').addEventListener('click', () => {
                            // Send a message to the extension when the button is clicked
                            vscode.postMessage('login');
                        });
                    } catch (e) {}

                    const selectMenu = document.getElementById('meerkat-notification-select');
                    const teamsWebhookContainer = document.getElementById('teams-webhook');
                    const googleChatWebhookContainer = document.getElementById('google-chat-webhook');
                    const slackContainer = document.getElementById('slack-token');
                    const emailContainer = document.getElementById('email');
                    const phoneContainer = document.getElementById('sms');

                    // Listen for changes in the select menu
                    selectMenu.addEventListener('change', () => {
                        if (selectMenu.value === 'teams') {
                            teamsWebhookContainer.style.display = 'block';
                            vscode.postMessage('teams:selected');
                        } else {
                            teamsWebhookContainer.style.display = 'none';
                        }

                        if (selectMenu.value === 'google_chat') {
                            googleChatWebhookContainer.style.display = 'block';
                            vscode.postMessage('google_chat:selected');
                        } else {
                            googleChatWebhookContainer.style.display = 'none';
                        }

                        if (selectMenu.value === 'slack' && ${slackToken == ''}) {
                            slackContainer.style.display = 'block';
                            vscode.postMessage('slack:selected');
                        } else {
                            slackContainer.style.display = 'none';
                        }

                        if (selectMenu.value === 'email') {
                            emailContainer.style.display = 'block';
                            vscode.postMessage('email:selected');
                        } else {
                            emailContainer.style.display = 'none';
                        }

                        if (selectMenu.value === 'sms') {
                            phoneContainer.style.display = 'block';
                            vscode.postMessage('sms:selected');
                        } else {
                            phoneContainer.style.display = 'none';
                        }

                        if (selectMenu.value === 'ping') {
                            vscode.postMessage('ping:selected');
                        }

                        if (selectMenu.value === 'system') {
                            vscode.postMessage('system:selected');
                        }
                    });

                    window.addEventListener('message', event => {
                        if (event.data === 'enabled') {
                            document.getElementById("disableNotificationsButton").style.display = "block";
                            document.getElementById("enableNotificationsButton").style.display = "none";
                        }
                        if (event.data === 'disabled') {
                            document.getElementById("disableNotificationsButton").style.display = "none";
                            document.getElementById("enableNotificationsButton").style.display = "block";
                        }
                    });

                    const teamsInputField = document.getElementById('teams-webhook-url');
                    teamsInputField.addEventListener('input', (event) => {
                        // Update the output text with the current value of the input field
                        vscode.postMessage('microsoft_teams:' + event.target.value);
                    });

                    const googleChatInputField = document.getElementById('google-chat-webhook-url');
                    googleChatInputField.addEventListener('input', (event) => {
                        // Update the output text with the current value of the input field
                        vscode.postMessage('google_chat:' + event.target.value);
                    });

                    const smsInputField = document.getElementById('phone-num');
                    let smsDebounceTimer;
                    smsInputField.addEventListener('input', (event) => {
                        clearTimeout(smsDebounceTimer);
                        smsDebounceTimer = setTimeout(() => {
                            // Send the message after 2 seconds of no typing
                            vscode.postMessage('sms:' + event.target.value);
                        }, 2000);
                    });

                    const triggerDurationField = document.getElementById('trigger-duration');
                    triggerDurationField.addEventListener('input', (event) => {
                        const value = event.target.value;

                        vscode.postMessage('trigger_duration:' + value);
                    });
                </script>
            </body>
        </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

module.exports = SideBarProvider;
