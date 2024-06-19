
const NOTIF_COUNT_KEY = "notif_count";

function logNotificationHistory(context) {
    let notificationCount = context.globalState.get(NOTIF_COUNT_KEY);
    if (notificationCount) {
        let newCount = notificationCount + 1;
        context.globalState.update(NOTIF_COUNT_KEY, newCount);
    } else {
        context.globalState.update(NOTIF_COUNT_KEY, 1);
    }
}

module.exports = logNotificationHistory;