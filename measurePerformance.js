const ping = require('ping');
const Rx = require('rxjs');
const config = require('./config.json');
const http = require('http');
const https = require('https');

/*
 * Function used to timestamp datanodes
 * Function returns the number of milliseconds since January 1, 1970
 */
var now = function(){
    return new Date().getTime()
}

/*
 * Convert a domain name to the standard url associated for the measurementFunction
 * Return an object containing both url:standardurl and protocol:protocol used for requests
 */
var toStandardUrl = function(websiteUrl){
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
var pingMeasure = function(websiteUrl){
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
var requestCallBackFunction = function(res, obs){
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
                trueLocation: websiteUrl
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
            trueLocation: websiteUrl
        })
        res.once('readable', () => {
            let firstReceiveDelay = process.hrtime(startTime)
            obs.next({
                firstByteDelay: {
                    timestamp: now(),
                    value: firstReceiveDelay[1]/1000000
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
                    value: lastReceiveDelay[1]/1000000
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
var httpMeasure = function(websiteUrl){
    return Rx.Observable.create(obs => {
        const startTime = process.hrtime();
        const req = http.get(websiteUrl, res => {
            requestCallBackFunction(res,obs);
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
                        value: dnsLookupDelay[1]/1000000
                    }
                })
            })
            socket.on('connect', () => {
                const tcpConnectionDelay = process.hrtime(startTime)
                obs.next({
                    tcpConnectionDelay: {
                        timestamp: now(),
                        value: tcpConnectionDelay[1]/1000000
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
var httpsMeasure = function(websiteUrl){
    return Rx.Observable.create(obs => {
        const startTime = process.hrtime();
        const req = https.get(websiteUrl, res => {
            requestCallBackFunction(res,obs);
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
                        value: dnsLookupDelay[1]/1000000
                    }
                })
            })
            socket.on('connect', () => {
                const tcpConnectionDelay = process.hrtime(startTime)
                obs.next({
                    tcpConnectionDelay: {
                        timestamp: now(),
                        value: tcpConnectionDelay[1]/1000000
                    }
                })
            })
            socket.on('secureConnect', () => {
                const tlsHandshakeDelay = process.hrtime(startTime)
                obs.next({
                    tlsHandshakeDelay: {
                        timestamp: now(),
                        value: tlsHandshakeDelay[1]/1000000
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
var measurePerformance = function(website,checkInterval){
    let trueUrl = toStandardUrl(website).url;
    let protocol = toStandardUrl(website).protocol;
    let measurementFunction = httpMeasure;
    if (protocol === 'https'){
        measurementFunction = httpsMeasure;
    }
    /*
     * We have to make a first request to know if we are going to request the server
     * on the appropriate url. If we obtain a shouldRedirect=true we are going to change trueUrl
     * before keeping on making measurements
     */
    return Rx.Observable.create(obs => {
        measurementFunction(trueUrl).subscribe({
            next: data => {
                if(data.statusCode){
                    if(data.shouldRedirect){
                        trueUrl = data.trueLocation
                    }
                    setInterval(trueUrl => {
                        measurementFunction(trueUrl).subscribe({
                            next: data => {
                                obs.next(data)
                            },
                            error: err => {
                                obs.error(err)
                            }
                        })
                    },checkInterval);
                };
            },
            error: err => {
                console.error(err);
            }
        });
    });
}

module.exports = measurePerformance
