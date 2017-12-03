const ping = require('ping');
const Rx = require('rxjs');
const config = require('./config.json');
const http = require('http');
const https = require('https');

const NS_PER_MS = 1000000;
const MS_PER_S = 1000;

/*
 * Function used to timestamp datanodes
 * Function returns the number of milliseconds since January 1, 1970
 */
const now = function(){
    return new Date().getTime()
}

const toMilliSeconds = function(prcessHourTime){
    return prcessHourTime[0]*MS_PER_S+prcessHourTime[1]/NS_PER_MS
}

/*
 * Convert a domain name to the standard url associated for the measurementFunction
 * Return an object containing both url:standardurl and protocol:protocol used for requests
 */
const toStandardUrl = function(websiteUrl){
    const splitDotUrl = websiteUrl.split('.');
    const splitDoubleDotUrl = websiteUrl.split(':');
    let returnUrl = websiteUrl;
    if(splitDoubleDotUrl.length > 1){
        return ({
            url: returnUrl,
            protocol: splitDoubleDotUrl[0]
        })
    }
    else{
        returnUrl = 'http://' + returnUrl;
        return ({
            url: returnUrl,
            protocol: 'http'
        });
    }
}

/*
 * Realizes a ping measure to see if host is alive
 * Function should return an Observable
 */
const pingMeasure = function(websiteUrl){
    return Rx.Observable.create(obs => {
        ping.promise.probe(websiteUrl, {min_reply: config.pingRepeat})
        .then(res => {
            obs.next({
                timestamp: now(),
                isAlive: res.alive,
                minPing: res.min,
                maxPing: res.max,
                avgPing: res.avg
            })
        })
        .catch(err => {
            obs.error(err);
        })
    });
}

/*
 * Function called as a callback in both httpMeasure and httpsMeasure
 */
const requestCallBackFunction = function(res, obs, startTime){
    const statusCode = res.statusCode;
    if (statusCode !== 200) {
        const error = new Error('Request Failed.\n' + `Status Code: ${statusCode}`);
        if (statusCode === 301 || statusCode === 302) {
            // We have to change the url used for further requests as the server wants to redirect us
            obs.next({
                statusCode: {
                    timestamp: now(),
                    value: statusCode
                },
                shouldRedirect: true,
                trueLocation: res.headers.location
            })
            obs.error(error.message);
            res.resume();
        }
        else {
            obs.next({
                statusCode: {
                    timestamp: now(),
                    value: statusCode
                },
                shouldRedirect: false,
                trueLocation: res.headers.location
            })
            obs.error(error.message);
            res.resume();
        }
    }
    else {
        obs.next({
            statusCode: {
                timestamp: now(),
                value: statusCode
            },
            shouldRedirect: false,
            trueLocation: res.headers.location
        })
        res.once('readable', () => {
            let firstReceiveDelay = process.hrtime(startTime)
            obs.next({
                firstByteDelay: {
                    timestamp: now(),
                    value: toMilliSeconds(firstReceiveDelay)
                }
            });
        });
        let rawDataBuffer;
        res.on('data', (chunk) => { rawDataBuffer += chunk; });
        res.on('end', () => {
            let lastReceiveDelay = process.hrtime(startTime)
            obs.next({
                lastByteDelay: {
                    timestamp: now(),
                    value: toMilliSeconds(lastReceiveDelay)
                }
            });
        });
    }
}

/*
 * Function measures some useful time performance metrics for website monitoring
 * Uses HTTP protocol (look httpsMeasure for HTTPS protocol)
 * Returns an observable we can listen to obtain the datanodes
 * Datanode : {timestamp: now(), value: dataNodeValue}
 */
const httpMeasure = function(websiteUrl){
    return Rx.Observable.create(obs => {
        const startTime = process.hrtime();
        const req = http.get(websiteUrl, res => {
            requestCallBackFunction(res,obs,startTime);
        });
        req.on('error', err => {
                console.error(`Got error: ${err.message}`);
        });
        req.on('socket', socket => {
            socket.on('lookup', () => {
                const dnsLookupDelay = process.hrtime(startTime)
                obs.next({
                    dnsLookupDelay: {
                        timestamp: now(),
                        value: toMilliSeconds(dnsLookupDelay)
                    }
                })
            })
            socket.on('connect', () => {
                const tcpConnectionDelay = process.hrtime(startTime)
                obs.next({
                    tcpConnectionDelay: {
                        timestamp: now(),
                        value: toMilliSeconds(tcpConnectionDelay)
                    }
                })
            })
        });
    })
}

/*
 * Function measures some useful time performance metrics for website monitoring
 * Uses HTTPS protocol (look httpMeasure for HTTP protocol)
 * Returns an observable we can listen to obtain the datanodes
 * Datanode : {timestamp: now(), value: dataNodeValue}
 */
const httpsMeasure = function(websiteUrl){
    return Rx.Observable.create(obs => {
        const startTime = process.hrtime();
        const req = https.get(websiteUrl, res => {
            requestCallBackFunction(res,obs,startTime);
        });
        req.on('error', err => {
                obs.error(err);
        });
        req.on('socket', socket => {
            socket.on('lookup', () => {
                const dnsLookupDelay = process.hrtime(startTime)
                obs.next({
                    dnsLookupDelay: {
                        timestamp: now(),
                        value: toMilliSeconds(dnsLookupDelay)
                    }
                })
            })
            socket.on('connect', () => {
                const tcpConnectionDelay = process.hrtime(startTime)
                obs.next({
                    tcpConnectionDelay: {
                        timestamp: now(),
                        value: toMilliSeconds(tcpConnectionDelay)
                    }
                })
            })
            socket.on('secureConnect', () => {
                const tlsHandshakeDelay = process.hrtime(startTime)
                obs.next({
                    tlsHandshakeDelay: {
                        timestamp: now(),
                        value: toMilliSeconds(tlsHandshakeDelay)
                    }
                })
            })
        });
    })
}

/*
 * Main function of this module
 * Function returns an observable we can listen to obtain the datanodes
 * Function chooses the relevant protocol considering the given website
 * Function converts eventual domain name to the proper url to request
 */
const measurePerformance = function(website,checkInterval){
    /*
     * We have to make a first request to know if we are going to request the server
     * on the appropriate url. If we obtain a shouldRedirect=true we are going to change trueUrl
     * before keeping on making measurements
     */
    return Rx.Observable.create(obs => {
        let trueUrl = toStandardUrl(website).url;
        let protocol = toStandardUrl(website).protocol;
        let measurementFunction = httpMeasure;
        if (protocol === 'https'){
            measurementFunction = httpsMeasure;
        }
        measurementFunction(trueUrl).subscribe({
            next: data => {
                if(data.statusCode){
                    var finalUrl = toStandardUrl(data.trueLocation).url;
                    var finalProtocol = toStandardUrl(data.trueLocation).protocol;
                    var finalMeasurementFunction = httpMeasure;
                    if(data.shouldRedirect){
                        if (finalProtocol === 'https'){
                            finalMeasurementFunction = httpsMeasure;
                        }
                    }
                    setInterval(() => {
                        finalMeasurementFunction(finalUrl).subscribe({
                            next: data => {
                                obs.next(data)
                            },
                            error: err => {
                                obs.error(err)
                            }
                        })
                    },checkInterval*MS_PER_S);
                };
            },
            error: err => {
                console.error(err);
            }
        });
    });
}

//EXPORT
module.exports = measurePerformance
