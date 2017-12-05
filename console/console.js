require('console.table');

function timestampToHour(timestamp){
    // Create a new JavaScript Date object based on the timestamp
    // multiplied by 1000 so that the argument is in milliseconds, not seconds.
    var date = new Date(timestamp);
    var hours = date.getHours();
    // Minutes part from the timestamp
    var minutes = "0" + date.getMinutes();
    // Seconds part from the timestamp
    var seconds = "0" + date.getSeconds();

    // Will display time in 10:30:23 format
    var formattedTime = hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
    return formattedTime;
}

function info(message){
    console.log("\x1b[34m%s\x1b[0m",message)
}

function error(message){
    console.error("\x1b[31m%s\x1b[0m",message);
}

function ok(message){
    console.log("\x1b[32m%s\x1b[0m",message);
}

function logData(website, data){
    let dataArray = [];
    let statusCodeArray = [];
    let titles = ['Data label','Minimum','Average','Maximum'];
    let statusCodeTitles = [];
    let statusCodeLine = [];
    if(data.type === 'tenMinutesAnalytics' || data.type === 'hourAnalytics'){
        const analytics = data.data
        Object.keys(analytics).forEach(dataType => {
            if(dataType !== 'computationDuration' && dataType !== 'statusCode'){
                let tableLine = [];
                tableLine.push(dataType);
                tableLine.push(analytics[dataType].minimum.toFixed(2));
                tableLine.push(analytics[dataType].average.toFixed(2));
                tableLine.push(analytics[dataType].maximum.toFixed(2));
                dataArray.push(tableLine);
            }
            else if(dataType === 'statusCode'){
                Object.keys(analytics.statusCode).forEach(statusCode => {
                    statusCodeTitles.push(statusCode)
                    statusCodeLine.push(analytics.statusCode[statusCode]);
                })
            }
        });
    }
    if(data.type === 'tenMinutesAnalytics'){
        info("\nLAST TEN MINUTES ANALYTICS ");
        console.log(website);
        console.table(titles,dataArray);
        info("STATUS CODES");
        statusCodeTitles.forEach((label,index) => {
            console.log(label, ' | ', statusCodeLine[index])
        })
    }
    if(data.type === 'hourAnalytics'){
        info("\nLAST HOUR ANALYTICS ");
        console.log(website);
        console.table(titles,dataArray);
        info("STATUS CODES");
        console.table(statusCodeTitles,statusCodeLine);
    }
}

function logStatus(website,data){
    if(data.type === 'availibilityStats'){
        const logMessages = data.data.logMessages;
        logMessages.forEach(message => {
            if(message.type === 'down'){
                error(website + ' IS DOWN. Availibility = ' + message.availibility + ' Time = ' + timestampToHour(message.timestamp));
            }
            else{
                ok(website + ' RECOVERED. Availibility = ' + message.availibility + ' Time = ' + timestampToHour(message.timestamp))
            }
        })
    }
}

module.exports = {
    log: console.log,
    info,
    ok,
    error,
    logData,
    logStatus
}
