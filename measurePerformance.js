const ping = require('ping');
const Rx = require('rxjs');
const config = require('./config.json');
const http = require('http');
const https = require('https');

var toStandardUrl = function(websiteUrl){
    const splitDotUrl = websiteUrl.split('.');
    const splitSlashUrl = websiteUrl.split(':');
    let returnUrl = websiteUrl;
    if(splitDotUrl.length < 2 && splitDotUrl[0] !== "www"){
        returnUrl = 'www.' + returnUrl;
    }
    if(splitSlashUrl.length > 1){
        return ({
            url: returnUrl,
            protocol: splitSlashUrl[0]
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

var pingMeasure = function(websiteUrl){
    return Rx.Observable.create(obs => {
        ping.promise.probe(websiteUrl, {min_reply: config.pingRepeat})
        .then(res => {
            obs.next({
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

var httpMeasure = function(websiteUrl){
    return Rx.Observable.create(obs => {
        const startTime = process.hrtime();
        const req = http.get(websiteUrl, res => {
            const { statusCode } = res;
            obs.next({statusCode: statusCode})
            const contentType = res.headers['content-type'];
            obs.next({contentType: contentType})
            let error;
            if (statusCode !== 200) {
                error = new Error('Request Failed.\n' + `Status Code: ${statusCode}`);
            }
            if (error) {
                obs.error(error.message);
                // consume response data to free up memory
                res.resume();
            }
            else {
                let firstReceiveDelay;
                let lastReceiveDelay
                res.once('readable', () => {
                    firstReceiveDelay = process.hrtime(startTime)
                    obs.next({
                        firstByteDelay: firstReceiveDelay[1]/1000000
                    });
                });
                let rawDataBuffer;
                res.on('data', (chunk) => { rawDataBuffer += chunk; });
                res.on('end', () => {
                    lastReceiveDelay = process.hrtime(startTime)
                    obs.next({
                        lastByteDelay: lastReceiveDelay[1]/1000000,
                        contentTransferDelay: lastReceiveDelay[1]/1000000 - firstReceiveDelay[1]/1000000
                    });
                });
            }
        });
        req.on('error', err => {
                console.error(`Got error: ${err.message}`);
        });
        req.on('socket', socket => {
            socket.on('lookup', () => {
                const dnsLookupDelay = process.hrtime(startTime)
                obs.next({
                    dnsLookupDelay: dnsLookupDelay[1]/1000000
                })
            })
            socket.on('connect', () => {
                const tcpConnectionDelay = process.hrtime(startTime)
                obs.next({
                    tcpConnectionDelay: tcpConnectionDelay[1]/1000000
                })
            })
            socket.on('secureConnect', () => {
                const tlsHandshakeDelay = process.hrtime(startTime)
                obs.next({
                    tlsHandshakeDelay: tlsHandshakeDelay[1]/1000000
                })
            })
        });
    })
}

var httpsMeasure = function(websiteUrl){
    return Rx.Observable.create(obs => {
        const startTime = process.hrtime();
        const req = https.get(websiteUrl, res => {
            const { statusCode } = res;
            obs.next({statusCode: statusCode})
            const contentType = res.headers['content-type'];
            obs.next({contentType: contentType})
            let error;
            if (statusCode !== 200) {
                error = new Error('Request Failed.\n' + `Status Code: ${statusCode}`);
            }
            if (error) {
                obs.error(error.message);
                // consume response data to free up memory
                res.resume();
            }
            else {
                res.once('readable', () => {
                    const firstReceiveDelay = process.hrtime(startTime)
                    obs.next({
                        firstByteDelay: firstReceiveDelay[1]/1000000
                    });
                });
                let rawDataBuffer;
                res.on('data', (chunk) => { rawDataBuffer += chunk; });
                res.on('end', () => {
                    const lastReceiveDelay = process.hrtime(startTime)
                    obs.next({
                        lastByteDelay: lastReceiveDelay[1]/1000000
                    });
                });
            }
        });
        req.on('error', err => {
                console.error(`Got error: ${err.message}`);
        });
        req.on('socket', socket => {
            socket.on('lookup', () => {
                const dnsLookupDelay = process.hrtime(startTime)
                obs.next({
                    dnsLookupDelay: dnsLookupDelay[1]/1000000
                })
            })
            socket.on('connect', () => {
                const tcpConnectionDelay = process.hrtime(startTime)
                obs.next({
                    tcpConnectionDelay: tcpConnectionDelay[1]/1000000
                })
            })
            socket.on('secureConnect', () => {
                const tlsHandshakeDelay = process.hrtime(startTime)
                obs.next({
                    tlsHandshakeDelay: tlsHandshakeDelay[1]/1000000
                })
            })
        });
    })
}

/*console.log(toStandardUrl("https://www.google.fr"));

pingMeasure('google.fr').subscribe({
    next: res => {
        console.log(res)
    },
    error: err => {
        console.error(err)
    }
})*/

httpMeasure("http://www.facebook.fr").subscribe({
    next: time => {
        console.log(time)
    },
    error: err => {
        console.error(err)
    }
})
