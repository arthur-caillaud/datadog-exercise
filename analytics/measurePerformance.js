const ping = require('ping');
const Rx = require('rxjs');
const http = require('http');
const https = require('https');
const checkForInternetConnection = require('../exception/checkForInternetConnection');

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
 * Converts an url into domain name
 * Mainly used for pingMeasure function
 */
const toDomainName = function(websiteUrl){
    const slashSplitUrl = websiteUrl.split('/')
    if (slashSplitUrl.length > 1){
        return slashSplitUrl[2]
    }
    return slashSplitUrl[0]
}

/*
 * Realizes a ping measure to see if host is alive
 * Function should return an Observable
 */
const pingMeasure = function(websiteUrl){
    return Rx.Observable.create(obs => {
        ping.promise.probe(toDomainName(websiteUrl))
        .then(res => {
            if(!res.alive){
                /*
                 * If ping test fails we have to test for internet connection before asserting
                 * server is really down.
                 */
                checkForInternetConnection().subscribe({
                    next: data => {
                        if (data.internetConnection){
                            obs.next({
                                ping: {
                                    timestamp: now(),
                                    isAlive: res.false
                                }
                            })
                        }
                    },
                    error: err => {
                        obs.error("Internet connection not stable enough for these tests...")
                    }
                })
            }
            obs.next({
                ping: {
                    timestamp: now(),
                    isAlive: res.alive
                }
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
        if (statusCode === 301 || statusCode === 302) {
            // We have to change the url used for further requests as the server wants to redirect us
            obs.next({
                statusCode: {
                    timestamp: now(),
                    value: statusCode
                },
                shouldRedirect: true,
                trueLocation: res.headers.location
            });
            res.resume();
        }
        else {
            const error = new Error('Request Failed.\n' + `Status Code: ${statusCode}`)
            obs.next({
                statusCode: {
                    timestamp: now(),
                    value: statusCode
                },
                shouldRedirect: false,
                trueLocation: res.headers.location,
                dnsLookupDelay: {
                    timestamp: now(),
                    value: 0
                },
                tcpConnectionDelay: {
                    timestamp: now(),
                    value: 0
                },
                tlsHandshakeDelay: {
                    timestamp: now(),
                    value: 0
                },
                firstByteDelay: {
                    timestamp: now(),
                    value: 0
                },
                lastByteDelay: {
                    timestamp: now(),
                    value: 0
                }
            });
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
            obs.next({
                dnsLookupDelay: {
                    timestamp: now(),
                    value: 0
                },
                tcpConnectionDelay: {
                    timestamp: now(),
                    value: 0
                },
                firstByteDelay: {
                    timestamp: now(),
                    value: 0
                },
                lastByteDelay: {
                    timestamp: now(),
                    value: 0
                }
            });
            obs.error(`Got error: ${err.message}`);
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
            obs.next({
                dnsLookupDelay: {
                    timestamp: now(),
                    value: 0
                },
                tcpConnectionDelay: {
                    timestamp: now(),
                    value: 0
                },
                tlsHandshakeDelay: {
                    timestamp: now(),
                    value: 0
                },
                firstByteDelay: {
                    timestamp: now(),
                    value: 0
                },
                lastByteDelay: {
                    timestamp: now(),
                    value: 0
                }
            });
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
                console.log(data);
                if(!data.statusCode){
                    let finalUrl = trueUrl;
                    let finalProtocol = protocol;
                    let finalMeasurementFunction = httpMeasure;
                    if(data.shouldRedirect){
                        console.log("Server is trying to redirect us.\nChanging url used for monitoring.");
                        finalUrl = toStandardUrl(data.trueLocation).url;
                        finalProtocol = toStandardUrl(data.trueLocation).protocol;
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
                        });
                        pingMeasure(finalUrl).subscribe({
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
