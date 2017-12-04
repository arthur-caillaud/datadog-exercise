require('console.table');

module.exports.error = function error(message){
    console.error("\x1b[31m%s\x1b[0m",message);
}

module.exports.log = function log(message){
    console.log(message);
}

module.exports.logData = function logData(data){
    if(data.type === 'tenMinutesAnalytics'){
        let dataArray = [];
        let statusCodeArray = [];
        let titles = ['Data label','Minimum','Average','Maximum'];
        let statusCodeTitles = [];
        let statusCodeLine = [];
        const analytics = data.data
        Object.keys(analytics).forEach(dataType => {
            if(dataType !== 'computationDuration' && dataType !== 'statusCode'){
                let tableLine = [];
                tableLine.push(dataType);
                tableLine.push(analytics[dataType].minimum);
                tableLine.push(analytics[dataType].average);
                tableLine.push(analytics[dataType].maximum);
                dataArray.push(tableLine);
            }
            else if(dataType === 'statusCode'){
                Object.keys(analytics.statusCode).forEach(statusCode => {
                    statusCodeTitles.push(statusCode)
                    statusCodeLine.push(analytics.statusCode[statusCode]);
                    console.log(statusCodeTitles)
                    console.log(statusCodeLine)
                })
            }
        });
        console.log("\nTEN LAST MINUTES ANALYTICS");
        console.table(titles,dataArray);
        console.table(statusCodeTitles,statusCodeLine);
    }
    else if(data.type === 'hourAnalytics'){
        let dataArray = [];
        let statusCodeArray = [];
        let titles = ['Data label','Minimum','Average','Maximum'];
        let statusCodeTitles = [];
        let statusCodeLine = [];
        const analytics = data.data
        Object.keys(analytics).forEach(dataType => {
            if(dataType !== 'computationDuration' && dataType !== 'statusCode'){
                let tableLine = [];
                tableLine.push(dataType);
                tableLine.push(analytics[dataType].minimum);
                tableLine.push(analytics[dataType].average);
                tableLine.push(analytics[dataType].maximum);
                dataArray.push(tableLine);
            }
            else if(dataType === 'statusCode'){
                Object.keys(analytics.statusCode).forEach(statusCode => {
                    statusCodeTitles.push(statusCode)
                    statusCodeLine.push(analytics.statusCode[statusCode]);
                    console.log(statusCodeTitles)
                    console.log(statusCodeLine)
                })
            }
        });
        console.log("\nTEN LAST MINUTES ANALYTICS");
        if(titles.length > 0 && dataArray.length > 0){
            console.table(titles,dataArray);
        }
        if(statusCodeTitles.length > 0 && statusCodeLine.length > 0){
            console.table(statusCodeTitles,statusCodeLine);
        }
    }
}
