const vscode = require("vscode");
const { getExtensionContext, setExtensionContext } = require("./extensionContext");
const Constants = require('./constants');

module.exports.meerkatAuthenticate = async function () {
    let context = getExtensionContext();

    if (vscode.workspace.getConfiguration('meerkat').get('token') | context.globalState.get(Constants.MEERKATIO_TOKEN))
        // No need to authenticate if token is set already
        return true;

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
                if (token) {
                    authenticated = true;
                    context.globalState.update(Constants.MEERKATIO_TOKEN, token);
                    setExtensionContext(context);
                }
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