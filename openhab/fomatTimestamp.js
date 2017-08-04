(function(json) {
    var obj = JSON.parse(json);
    var seconds = obj.uptime;
    var retval = "";
    var days = Math.floor(seconds / (24 * 60 * 60));
    seconds = seconds % (24 * 60 * 60);
    var hours = Math.floor(seconds / (60 * 60));
    seconds = seconds % (60 * 60);
    var minutes = Math.floor(seconds / (60));
    seconds = seconds % (60);

    if (days > 0) {
        if (days > 1) {
            retval = retval + days + " " + "days ";
        } else {
            retval = retval + days + " " + "day ";
        }
    }

    retval = retval + hours + ":";

    if (minutes < 10) {
        retval = retval + "0" + minutes;
    } else {
        retval = retval + minutes;
    }

    return retval;
})(input)
