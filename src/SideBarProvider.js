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
                const config = vscode.workspace.getConfiguration('meerkat', vscode.ConfigurationTarget.Workspace);
                switch (message) {
                    case "disable":
                        config.update('enabled', false, vscode.ConfigurationTarget.Workspace).then(() => {
                            webviewView.webview.postMessage('disabled');  
                        });
                        break;
                    case "enable":                        
                        config.update('enabled', true, vscode.ConfigurationTarget.Workspace).then(() => {
                            webviewView.webview.postMessage('enabled'); 
                        });
                        break;
                    case "login":
                        vscode.commands.executeCommand("meerkat.login");
                        break;
                }
                          
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
            
                <button id="startFreeTrialButton" style="margin: 0 auto; margin-top: 10px; color: white; background-color: #0074d9; border-radius: 4px; padding: 5px; width: 100%;">Start Pro Trial</button>
                <p><a href="https://meerkatio.com/login">Or sign in</a> and add your token to the workspace if you already have a MeerkatIO Pro account</p>
                `
        } else {
            if (account_type == "free") {
                return `
                    <p>Looks like you have your MeerkatIO token all set. Enjoy your free trial!</p>
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
                    <p>Looks like you have your MeerkatIO token all set. Thank you for using MeerkatIO Pro!</p>
                `
            }            
        }
    }

    _getHtmlForWebview() {
        const nonce = getNonce();
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';">
                <title>MeerkatIO Extension</title>
            </head>
            <body>
                <h1>MeerkatIO</h1>
                <p>The personal notification tool for software developers and data scientists that <strong>fits your workflow</strong>.</p>
                <hr />

                <h2>Quick Actions</h2>

                <div>
                    ${this._getNotificationActionButton()}
                    <a style="text-decoration: none;" href="https://meerkatio.com/account"><button style="display: block; margin: 0 auto; margin-top: 10px; color: white; background-color: #0074d9; border-radius: 4px; padding: 5px; width: 100%;">Configure Notification Channels</button></a>
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
