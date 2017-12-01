const ping = require('ping');
const Rx = require('rxjs');
const config = require('./config.json');

var pingMeasure = function(websiteUrl){
    return Rx.Observable.create(obs => {
        ping.promise.probe(websiteUrl, {min_reply: config.pingRepeat})
        .then(res => {
            obs.next(res)
        })
        .catch(err => {
            obs.error(err);
        })
    });
}

pingMeasure('google.fr').subscribe({
    next: res => {
        console.log(res.avg, 'ms')
    },
    error: err => {
        console.error(err)
    }
})
