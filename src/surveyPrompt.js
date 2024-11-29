const vscode = require('vscode');

const Constants = require('./constants');

const NOTIF_COUNT_TRIGGER = 50;

function checkSurveyTrigger(context) {
    //Store notification data and run post-notification tasks
    let notifications = context.globalState.get(Constants.NOTIF_HISTORY, []);
    if (!notifications) return;

    if (notifications.length === NOTIF_COUNT_TRIGGER) {
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