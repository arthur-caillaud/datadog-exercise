const askForInput = require('./console/askForInput');
const checkForInternetConnection = require('./exception/checkForInternetConnection');
const console = require('./console/console');
const computeMetrics = require('./analytics/computeMetrics');

console.log("Looking for an internet connection...")
checkForInternetConnection().subscribe({
    next: () => {
        askForInput().subscribe({
            next: input => {
                const websitesArray = input.websitesArray;
                const checkIntervals = input.checkIntervals;
                websitesArray.forEach((website,index) => {
                    const computeMetricsObservable = computeMetrics(website, checkIntervals[index]);
                    computeMetricsObservable.subscribe({
                        next: data => {
                            console.logData(data);
                        },
                        error: err => {
                            console.error(err);
                        }
                    });
                })
            },
            error: err => {
                console.error(err)
            }
        });
    },
    error: err => {
        console.error('This application needs an internet connection. Please connect to internet.')
    }
})
