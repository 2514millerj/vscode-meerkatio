const vscode = require('vscode');

const NOTIF_COUNT_TRIGGER = 50;
const NOTIF_COUNT_KEY = "notif_count";

function checkSurveyTrigger(context) {
    //Store notification data and run post-notification tasks
    let notificationCount = context.globalState.get(NOTIF_COUNT_KEY);
    if (!notificationCount) return;

    if (notificationCount === NOTIF_COUNT_TRIGGER) {
        triggerSurveyPrompt();
    }
}

function triggerSurveyPrompt() {
    vscode.window.showInformationMessage(
        'Help us improve the MeerkatIO extension with a short survey. As a thank you, we are providing users 30 free days of MeerkatIO Pro - on top of the first free month!',
        'Yes', 'No'
    ).then(selection => {
        if (selection === 'Yes') {
            // Replace the URL below with the link to your survey
            const surveyUrl = 'https://www.surveymonkey.com/r/RMX2TL9';
            vscode.env.openExternal(vscode.Uri.parse(surveyUrl));
        }
    });
}

module.exports = checkSurveyTrigger;