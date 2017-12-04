const Rx = require('rxjs');
const measurePerformance = require('./measurePerformance');

/*
 * Function used to timestamp datanodes
 * Function returns the number of milliseconds since January 1, 1970
 */
const now = function(){
    return new Date().getTime()
}

const NS_PER_MS = 1000000;
const MS_PER_S = 1000;
const S_PER_MIN = 60;

const computeData = function(website,checkInterval){

    let dataObject = {};

    /*
     * This function cleans the dataobject from too old data nodes (older than two minutes)
     * so that the computation time remains stable
     * We then compute the availibility analytics and return them in an availibilityStats object
     */
    const computeAndCleanAvailibilityStats = function(timeframe){
        let availibilityStats = {};
        let startTime = now();
        if (dataObject.ping && dataObject.ping.twoMinData.length > 0){
            dataObject.ping.twoMinData.forEach((dataNode,index,dataArray) => {
                /*
                 * If this datanode timestamp is older than 10 minutes, we remove
                 * it from the data array.
                 * If not we keep it for our analytics computation
                 */
                if(startTime - dataNode.timestamp > timeframe){
                    if (index > -1) {
                        dataArray.splice(index, 1);
                    }
                }
                /* This datanode is still valid*/
                else {
                    if(!availibilityStats.total){
                        availibilityStats.total = 0;
                    }
                    if(!availibilityStats.ratio){
                        availibilityStats.ratio = 0;
                    }
                    if(dataNode.isAlive){
                        availibilityStats.ratio += 1;
                    }
                    availibilityStats.total += 1;
                }
            })
        }
        availibilityStats.ratio = availibilityStats.ratio/availibilityStats.total;
        return availibilityStats
    }
    /*
     * This function cleans the dataobject from too old data nodes (older than 10 minutes)
     * so that the computation time remains stable
     * We then compute all the analytics we want to return in the tenMinStats object
     */
    const computeAndCleanTenMinutesStats = function(timeframe){
        let tenMinStats = {};
        let startTime = now();
        Object.keys(dataObject).forEach(dataKey => {
            if(dataKey === "statusCode"){
                tenMinStats[dataKey] = {};
                dataObject.statusCode.tenMinData.forEach((dataNode,index,dataArray) => {
                    /*
                     * If this datanode timestamp is older than 10 minutes, we remove
                     * it from the data array.
                     * If not we keep it for our analytics computation
                     */
                    if(startTime - dataNode.timestamp > timeframe){
                        if (index > -1) {
                            dataArray.splice(index, 1);
                        }
                    }
                    /* This datanode is still valid*/
                    else {
                        if(!tenMinStats.statusCode.total){
                            tenMinStats.statusCode.total = 0;
                        }
                        if(!tenMinStats.statusCode[dataNode.value]){
                            tenMinStats.statusCode[dataNode.value] = 0;
                        }
                        tenMinStats.statusCode[dataNode.value] += 1;
                        tenMinStats.statusCode.total += 1
                    }
                });
                Object.keys(tenMinStats.statusCode).forEach(key => {
                    if(key !== 'total'){
                        tenMinStats.statusCode[key] = 100*tenMinStats.statusCode[key]/tenMinStats.statusCode.total +'%';
                    }
                })
            }
            else if (dataKey !== 'ping'){
                tenMinStats[dataKey] = {};
                if(dataObject[dataKey].tenMinData.length > 0){
                    let avgSum = 0;
                    let tenMinMin;
                    let tenMinMax;
                    if(dataObject[dataKey].tenMinMin && startTime - dataObject[dataKey].tenMinMin.timestamp < timeframe){
                        tenMinMin = dataObject[dataKey].tenMinMin;
                    }
                    if(dataObject[dataKey].tenMinMax && startTime - dataObject[dataKey].tenMinMax.timestamp < timeframe){
                        tenMinMax = dataObject[dataKey].tenMinMax;
                    }
                    dataObject[dataKey].tenMinData.forEach((dataNode,index,dataArray) => {
                        /*
                         * If this datanode timestamp is older than 10 minutes, we remove
                         * it from the data array.
                         * If not we keep it for our analytics computation
                         */
                        if(startTime - dataNode.timestamp > timeframe){
                            if (index > -1) {
                                dataArray.splice(index, 1);
                            }
                        }
                        /* This datanode is still valid*/
                        else {
                            avgSum += dataNode.value;
                            if(!tenMinMin || dataNode.value < tenMinMin.value){
                                tenMinMin = dataNode
                            }
                            if(!tenMinMax || dataNode.value > tenMinMax.value){
                                tenMinMax = dataNode
                            }
                        }
                    });
                    /*
                     * We modify dataObject so that it keeps track of the new values
                     */
                    dataObject[dataKey].tenMinAvg = avgSum/dataObject[dataKey].tenMinData.length;
                    dataObject[dataKey].tenMinMin = tenMinMin;
                    dataObject[dataKey].tenMinMax = tenMinMax;
                    /*
                     * We enter these new values in tenMinStats object as it is what this function returns
                     */
                    tenMinStats[dataKey].average = dataObject[dataKey].tenMinAvg;
                    tenMinStats[dataKey].minimum = dataObject[dataKey].tenMinMin.value;
                    tenMinStats[dataKey].maximum = dataObject[dataKey].tenMinMax.value;
                }
            }
        });
        let endTime = now();
        tenMinStats.computationDuration = endTime - startTime + 'ms';
        return tenMinStats
    }

    /*
     * This function cleans the dataobject from too old data nodes (older than 60 minutes)
     * so that the computation time remains stable
     * We then compute all the analytics we want to return in the hourStats object
     */
    const computeAndCleanHourStats = function(timeframe){
        let hourStats = {};
        let startTime = now();
        Object.keys(dataObject).forEach(dataKey => {
            hourStats[dataKey] = {};
            if(dataKey === "statusCode"){
                dataObject.statusCode.hourData.forEach((dataNode,index,dataArray) => {
                    /*
                     * If this datanode timestamp is older than 10 minutes, we remove
                     * it from the data array.
                     * If not we keep it for our analytics computation
                     */
                    if(startTime - dataNode.timestamp > timeframe){
                        if (index > -1) {
                            dataArray.splice(index, 1);
                        }
                    }
                    /* This datanode is still valid*/
                    else {
                        if(!hourStats.statusCode.total){
                            hourStats.statusCode.total = 0;
                        }
                        if(!hourStats.statusCode[dataNode.value]){
                            hourStats.statusCode[dataNode.value] = 0;
                        }
                        hourStats.statusCode[dataNode.value] += 1;
                        hourStats.statusCode.total += 1
                    }
                });
                Object.keys(hourStats.statusCode).forEach(key => {
                    if(key !== 'total'){
                        hourStats.statusCode[key] = 100*hourStats.statusCode[key]/hourStats.statusCode.total +'%';
                    }
                })
            }
            else if(dataKey !== 'ping'){
                if(dataObject[dataKey].hourData.length > 0){
                    let avgSum = 0;
                    let hourMin;
                    let hourMax;
                    if(dataObject[dataKey].hourMin && startTime - dataObject[dataKey].hourMin.timestamp < timeframe){
                        hourMin = dataObject[dataKey].hourMin;
                    }
                    if(dataObject[dataKey].hourMax && startTime - dataObject[dataKey].hourMax.timestamp < timeframe){
                        hourMax = dataObject[dataKey].hourMax;
                    }
                    dataObject[dataKey].hourData.forEach((dataNode,index,dataArray) => {
                        /*
                         * If this datanode timestamp is older than 10 minutes, we remove
                         * it from the data array.
                         * If not we keep it for our analytics computation
                         */
                        if(startTime - dataNode.timestamp > timeframe){
                            if (index > -1) {
                                dataArray.splice(index, 1);
                            }
                        }
                        /* This datanode is still valid*/
                        else {
                            avgSum += dataNode.value;
                            if(!hourMin || dataNode.value < hourMin.value){
                                hourMin = dataNode
                            }
                            if(!hourMax || dataNode.value > hourMax.value){
                                hourMax = dataNode
                            }
                        }
                    });
                    /*
                     * We modify dataObject so that it keeps track of the new values
                     */
                    dataObject[dataKey].hourAvg = avgSum/dataObject[dataKey].hourData.length;
                    dataObject[dataKey].hourMin = hourMin;
                    dataObject[dataKey].hourMax = hourMax;
                    /*
                     * We enter these new values in tenMinStats object as it is what this function returns
                     */
                    hourStats[dataKey].average = dataObject[dataKey].hourAvg;
                    hourStats[dataKey].minimum = dataObject[dataKey].hourMin.value;
                    hourStats[dataKey].maximum = dataObject[dataKey].hourMax.value;
                }
            }
        });
        let endTime = now();
        hourStats.computationDuration = endTime - startTime + 'ms';
        return hourStats
    }

    measurePerformance(website,checkInterval).subscribe({
        next: data => {
            Object.keys(data).forEach(key => {
                if(key === "ping"){
                    if (!dataObject[key]){
                        dataObject[key] = {};
                    }
                    if (!dataObject[key].twoMinData){
                        dataObject[key].twoMinData = [];
                    }
                    dataObject[key].twoMinData.push(data[key]);
                }
                else if(key !== "shouldRedirect" && key !== "trueLocation"){
                    if (!dataObject[key]){
                        dataObject[key] = {};
                    }
                    if(!dataObject[key].tenMinData){
                        dataObject[key].tenMinData = [];
                    }
                    if(!dataObject[key].hourData){
                        dataObject[key].hourData = [];
                    }
                    dataObject[key].tenMinData.push(data[key]);
                    dataObject[key].hourData.push(data[key]);
                }
            });
        },
        error: err => {
            console.error(err)
        }
    });
    return Rx.Observable.create(obs => {
        setInterval(() => {
            tenMinutesAnalytics = computeAndCleanTenMinutesStats(10*S_PER_MIN*MS_PER_S);
            availibilityStats = computeAndCleanAvailibilityStats(2*S_PER_MIN*MS_PER_S);
            obs.next({
                type: 'tenMinutesAnalytics',
                data: tenMinutesAnalytics
            });
            obs.next({
                type: 'availibilityStats',
                data: availibilityStats
            });
        }, 10*MS_PER_S);
        setInterval(() => {
            hourAnalytics = computeAndCleanHourStats(60*S_PER_MIN*MS_PER_S);
            obs.next({
                type: 'hourAnalytics',
                data: hourAnalytics
            });
        }, 60*MS_PER_S);
    })
}

//EXPORT
module.exports = computeData
