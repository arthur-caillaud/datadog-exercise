const now = function(){
    return new Date().getTime()
}

module.exports = function(logMessages,availibilityStats){
    let newLogMessages = logMessages;
    if(availibilityStats.statusChanged){
        if(availibilityStats.isAvailable){
            newLogMessages.push({
                timestamp: now(),
                type: 'up',
                availibility: availibilityStats.ratio
            });
        }
        else{
            newLogMessages.push({
                timestamp: now(),
                type: 'down',
                availibility: availibilityStats.ratio
            })
        }
    }
    return newLogMessages
}
