const crypto = require('crypto');
const Constants = require('./constants');

module.exports.NotificationMonitor = class {
    constructor(message, trigger, startDatetime) {
        this.message = message;
        this.trigger = trigger;
        this.startDatetime = startDatetime;

        this.uuid = crypto.randomUUID();
    }

    get duration() {
        return new Date() - this.startDatetime;
    }
}

module.exports.logNotificationHistory = function (nm, context) {
    let notificationCount = context.globalState.get(Constants.NOTIF_COUNT_KEY);
    if (notificationCount) {
        let newCount = notificationCount + 1;
        context.globalState.update(Constants.NOTIF_COUNT_KEY, newCount);
    } else {
        context.globalState.update(Constants.NOTIF_COUNT_KEY, 1);
    }

    let timeSaved = context.globalState.get(Constants.NOTIF_TOTAL_DURATION_KEY);
    if (timeSaved) {
        let newCount = timeSaved + nm.duration;
        context.globalState.update(Constants.NOTIF_TOTAL_DURATION_KEY, newCount);
    } else {
        context.globalState.update(Constants.NOTIF_TOTAL_DURATION_KEY, nm.duration);
    }

    let notifHistory = context.globalState.get(Constants.NOTIF_HISTORY);
    if (notifHistory) {
        notifHistory.push(nm);
        context.globalState.update(Constants.NOTIF_HISTORY, notifHistory);
    } else {
        context.globalState.update(Constants.NOTIF_HISTORY, [nm]);
    }
}
