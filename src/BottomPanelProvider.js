const vscode = require("vscode");
const moment = require('moment');

const Constants = require('./constants');
const ExtensionContext = require('./extensionContext');

class MeerkatIOBottomPanelProvider {
    constructor(extensionUri) {
        this.extensionUri = extensionUri;
    }

    updateHtml() {
        if (this._view) {
            this._view.webview.html = this.getHtmlContent();
        }
    }

    /**
     * @param {vscode.WebviewView} webviewView
     * @param {vscode.WebviewViewResolveContext} context
     * @param {vscode.CancellationToken} token
     */
    resolveWebviewView(webviewView, context, token) {
        webviewView.webview.options = {
            // Restrict the webview to only load resources from the extension's folder
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };

        // Set the HTML content for the webview
        webviewView.webview.html = this.getHtmlContent();

        // Listen for messages from the Sidebar component and execute action
        webviewView.webview.onDidReceiveMessage(
            message => {
                switch (message) {
                    case "login":
                        vscode.commands.executeCommand("meerkat.login");
                        break;
                }
                          
            }
        );

        this._view = webviewView;
    }

    _buildNotificationHistory() {
        let context = ExtensionContext.getExtensionContext();
        let monitors = context.globalState.get(Constants.NOTIF_HISTORY);
    
        const montiorNames = {
            "terminal": "Terminal",
            "jupyter": "Jupyter Notebook",
            "task": "Task",
            "debug": "Run + Debug"
        }

        let monitorHistory = `
            <div style="
                display: flex;    
                flex-direction: column;
                justify-content: center;
                align-items: center;
            ">
        `;
    
        if (monitors && monitors.length > 0) {
            for (let i = monitors.length - 1; i >= 0; i--) {
                let monitorData = monitors[i];
                let startDatetime = moment(monitorData.startDatetime);
                let endDatetime = moment(monitorData.endDatetime);
                let monitorComponent = `
                    <div style="
                        margin-bottom: 15px; 
                        padding: 15px; 
                        border: 1px solid #ddd; 
                        border-radius: 10px; 
                        background-color: #252526; 
                        color: white;
                        word-wrap: break-word;
                        width: 75%;
                    ">
                        <h3 style="margin: 0 0 5px; font-size: 16px; color: #85d4ff;">${montiorNames[monitorData.trigger]}</h3>
                        <p style="margin: 0; font-size: 12px; color: #c5c5c5;">${startDatetime.isValid() ? startDatetime.fromNow() + " (" + startDatetime.format('YYYY-MM-DD HH:mm:ss') + ")" : ""}</p>
                        <p style="margin: 0; font-size: 12px; color: #c5c5c5;">${startDatetime.isValid() && endDatetime.isValid() ? moment.duration(endDatetime - startDatetime).humanize() : ""}</p>
                        <p style="margin: 5px 0 0; font-size: 14px;">${monitorData.message}</p>
                    </div>
                `;
                monitorHistory += monitorComponent;
            }
        } else {
            monitorHistory += `
                <p style="
                    font-size: 14px; 
                    text-align: center;
                ">
                    No notifications to display.
                </p>
            `;
        }
    
        monitorHistory += "</div>";
        return monitorHistory;
    }    


    // Define HTML content to display in the panel
    getHtmlContent() {
        let context = ExtensionContext.getExtensionContext();
        const nonce = getNonce();
        const token = vscode.workspace.getConfiguration('meerkat').get('token') || context.globalState.get(Constants.MEERKATIO_TOKEN);
        const account_email = context.globalState.get(Constants.ACCOUNT_EMAIL, "");
        const account_valid = context.globalState.get(Constants.ACCOUNT_VALID, true);
        const stripe_url = "https://buy.stripe.com/5kAcPD5627OO3OoeUV?prefilled_email=" + encodeURIComponent(account_email);
        
        if (token && account_valid) {
            return `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>MeerkatIO</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            text-align: center;
                            padding: 10px;
                        }
                    </style>
                </head>
                <body>
                    <h2>MeerkatIO Notification History</h2>
                    ${this._buildNotificationHistory()}
                </body>
                </html>
            `;
        } else {
            let buttonHTML = token ? `<a style="text-decoration: none;" href="${stripe_url}"><button id="subscribeButton" style="margin: 0 auto; margin-top: 10px; color: white; background-color: green; border-radius: 4px; padding: 5px; width: 100%;">Subscribe to Pro</button></a>` : `<button id="startFreeTrialButton">Start Pro Trial</button>`                        
            let description = token ? `<p>Your MeerkatIO Pro account has expired. Renew your account today to re-gain access to your notification history!</p>` : `<p>Start your free 30 day Pro trial to access Notification History and other Pro features, or <a href="https://meerkatio.com/account">sign in</a>.</p>`
            return `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>MeerkatIO</title>

                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            text-align: center;
                            padding: 10px;
                        }

                        h1 {
                            margin-bottom: 5px;
                        }

                        h2 {
                            font-weight: normal;
                            margin: 5px 0 15px;
                        }

                        .section-box {
                            border: 1px solid #d1d1d1;
                            border-radius: 8px;
                            padding-left: 30px;
                            padding-right: 30px;
                            width: 100%;
                            max-width: 600px;
                            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                            text-align: center;
                        }

                        p {
                            max-width: 600px;
                            margin: 10px 0 20px;
                            line-height: 1.6;
                        }

                        #startFreeTrialButton {
                            color: white;
                            background-color: #0074d9;
                            border: none;
                            border-radius: 4px;
                            padding: 10px 20px;
                            font-size: 1rem;
                            cursor: pointer;
                            margin-top: 20px;
                            transition: background-color 0.3s;
                        }

                        #startFreeTrialButton:hover {
                            background-color: #005bb5;
                        }

                        #loginLink {
                            color: #0074d9;
                            text-decoration: none;
                            font-weight: bold;
                        }

                        #loginLink:hover {
                            text-decoration: underline;
                        }
                    </style>
                </head>
                <body>
                    <div class="section-box">
                        <h2>MeerkatIO Notification History</h2>
                    
                        <p>Easily scroll through your VS Code execution history. Use Notification History to easily recall terminal commands and see what tasks are taking up the most of your time.</p>
                        
                        ${buttonHTML}
                        ${description}
                    </div>
                </body>
                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
    
                    try{
                        document.getElementById('startFreeTrialButton').addEventListener('click', () => {
                            // Send a message to the extension when the button is clicked
                            vscode.postMessage('login');
                        });
                    } catch (e) {console.log(e)}
                </script>
                </html>
            `; 
        }
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


module.exports = MeerkatIOBottomPanelProvider;