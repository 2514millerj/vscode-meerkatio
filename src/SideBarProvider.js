const vscode = require("vscode");

class SideBarProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }

    resolveWebviewView(webviewView, context, _token) {
        webviewView.webview.options = {
            enableScripts: true
        };
        webviewView.webview.localResourceOptions = {
            allowScripts: true
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

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
                <button id="disableNotificationsButton" style="display: ${disableBtnVis}; color: white; background-color: #0074d9; border-radius: 4px; padding: 5px; width: 80%;">Disable Notifications</button>
                <button id="enableNotificationsButton" style="display: ${enableBtnVis}; color: white; background-color: #0074d9; border-radius: 4px; padding: 5px; width: 80%;">Enable Notifications</button>
            `
    }

    _getAccountOption() {
        let token = vscode.workspace.getConfiguration('meerkat').get('token', null);
        if (!token) {
            return `
                <a href="https://meerkatio.com/register" style="text-decoration: none;"><button style="color: white; background-color: #0074d9; border-radius: 4px; padding: 5px; width: 80%;">Start Free Trial</button></a>
                <p><a href="https://meerkatio.com/login">Or sign in</a> and add your token to the workspace if you already have a MeerkatIO Pro account</p>
                `
        } else {
            return `
                <p>Looks like you have your MeerkatIO token set, thank you for using MeerkatIO Pro!</p>
                <p>Make sure to <a style="text-decoration: none;" href="https://meerkatio.com/account">upgrade your account</a> so your notifications keep coming.</p>
            `
        }
    }

    _getHtmlForWebview(webview) {
        const nonce = getNonce()
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
                <h1>Welcome to MeerkatIO</h1>
                <p>The personal notification tool for software developers and data scientists that <strong>fits your workflow</strong>.</p>
                <hr />

                <h2>Quick Actions</h2>
                ${this._getNotificationActionButton()}
                
                <hr />
                <h2>Account Management</h2>
                <p>Ping and System notifications are always free and accessible to everyone!</p> 
                <p>MeerkatIO accounts unlock Slack, SMS, and Email notification channels - free for the first month!</p>
                
                ${this._getAccountOption()}
                
                <hr />
                <h2>Resources</h2>
                <p><a href="https://meerkatio.com/docs" style="text-decoration: none;"><i class="fa fa-book" aria-none="true"></i> Documentation</a></p>
                <p><a href="https://github.com/2514millerj/vscode-meerkatio/issues" style="text-decoration: none;">Issues</a></p>
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
