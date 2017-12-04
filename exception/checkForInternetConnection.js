const Rx = require('rxjs');
const DNS = require('dns');

module.exports = function checkInternet(websiteUrl) {
    return Rx.Observable.create(obs => {
        const startTime = new Date();
        DNS.lookup(websiteUrl,function(err) {
            if (err && err.code == "ENOTFOUND") {
                obs.error(err);
            } else {
                const dnsLookupDelay = new Date() - startTime
                obs.next({
                    internetConnection: true,
                    dnsLookupDelay: dnsLookupDelay
                });
            }
        });
    })
}
