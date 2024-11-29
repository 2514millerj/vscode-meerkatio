const vscode = require("vscode");
const { getExtensionContext, setExtensionContext } = require("./extensionContext");
const Constants = require('./constants');

module.exports.meerkatAuthenticate = async function () {
    let context = getExtensionContext();

    let authenticated = false;
    try {
        // Request authentication for GitHub. You could also use 'microsoft'
        const session = await vscode.authentication.getSession('github', ['user:email'], { createIfNone: true });
        console.log(session);

        if (session) {
            // Extract the email from the session's account
            const githubUsername = session.account.label;
            const githubAccessToken = session.accessToken;
            
            // Send email to MeerkatIO to create an account
            const response = await fetch('https://meerkatio.com/github-callback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.accessToken}`
                },
                body: JSON.stringify({ githubAccessToken, githubUsername })
            });
            
            if (response.ok) {
                let data = await response.json();
                let token = data.token;
                let token_valid = data.token_valid;
                let account_type = data.account_type;
                let email = data.email;

                context.globalState.update(Constants.ACCOUNT_TYPE, account_type);
                context.globalState.update(Constants.ACCOUNT_VALID, token_valid);
                context.globalState.update(Constants.ACCOUNT_EMAIL, email);
                context.globalState.update(Constants.MEERKATIO_TOKEN, token);
                
                if (token && token_valid) {
                    authenticated = true;
                } else if (token && !token_valid) {
                    vscode.window.showErrorMessage(`Your MeerkatIO free trial has expired. To continue using MeerkatIO Pro features, add a Pro Subscription today!`, "Get MeerkatIO Pro").then((selection) => {
                        if (selection === 'Get MeerkatIO Pro') {
                            vscode.env.openExternal("https://meerkatio.com/account#subscription");
                        }
                    });
                }
                setExtensionContext(context);
            } else {
                const errorText = await response.text();
                vscode.window.showErrorMessage(`Failed to create MeerkatIO account.`);
            }
        } else {
            vscode.window.showErrorMessage('Login failed or was canceled.');
        }
    } catch (error) {
        console.error(error);
        vscode.window.showErrorMessage("Authentication error. MeerkatIO login failed.");
    }
    return authenticated;
}

module.exports.checkMeerkatAccount = async function () {
    let context = getExtensionContext();
    const token = vscode.workspace.getConfiguration('meerkat').get('token') || context.globalState.get(Constants.MEERKATIO_TOKEN);

    if (!token)
        return;

    const response = await fetch('https://meerkatio.com/api/user/info', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
    });
    if (response.ok) {
        let data = await response.json();
        let account_type = data.account_type;
        let token_valid = data.token_valid;
        let email = data.email;

        context.globalState.update(Constants.ACCOUNT_TYPE, account_type);
        context.globalState.update(Constants.ACCOUNT_VALID, token_valid);
        context.globalState.update(Constants.ACCOUNT_EMAIL, email);
    }
}