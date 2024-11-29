const crypto = require('crypto');
const Constants = require('./constants');

module.exports.NotificationMonitor = class {
    constructor(message, trigger, startDatetime) {
        this.message = message;
        this.trigger = trigger;
        this.startDatetime = startDatetime;
        this.endDatetime = null;

        this.uuid = crypto.randomUUID();
    }

    // Set the endDatetime
    setEndDatetime(endDatetime) {
        this.endDatetime = endDatetime;
    }

    // Calculate the duration based on startDatetime and endDatetime
    get duration() {
        if (this.endDatetime) {
            return new Date(this.endDatetime) - new Date(this.startDatetime);
        }
        return new Date() - new Date(this.startDatetime); // Fallback if endDatetime isn't set
    }
}

module.exports.logNotificationHistory = function (nm, context) {
    let notifHistory = context.globalState.get(Constants.NOTIF_HISTORY);
    if (notifHistory) {
        notifHistory.push(nm);
        context.globalState.update(Constants.NOTIF_HISTORY, notifHistory);
    } else {
        context.globalState.update(Constants.NOTIF_HISTORY, [nm]);
    }
}
