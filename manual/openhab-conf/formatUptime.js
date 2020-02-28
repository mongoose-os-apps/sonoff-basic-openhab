(function (json) {
    var obj = JSON.parse(json);
    var s = obj.uptime;

    var d = s / 86400 | 0;
    var h = (s %= 86400) / 3600 | 0;
    var m = (s %= 3600) / 60 | 0;
    return d + ' days ' + ('0' + h).substr(-2) + ':' + ('0' + m).substr(-2);


    /*
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
    */

})(input)
