const Rx = require('rxjs');
const DNS = require('dns');

module.exports = function checkInternet() {
    return Rx.Observable.create(obs => {
        DNS.lookup("www.google.fr",function(err) {
            if (err && err.code == "ENOTFOUND") {
                obs.error(err);
            } else {
                obs.next({
                    internetConnection: true
                });
            }
        });
    })
}
