const askForInput = require('./console/askForInput');
const checkForInternetConnection = require('./exception/checkForInternetConnection');
const appConsole = require('./console/console');
const measurePerformance = require('./analytics/measurePerformance');

appConsole.log("Looking for an internet connection...")
checkForInternetConnection().subscribe({
    next: () => {
        askForInput().subscribe({
            next: input => {
                const websitesArray = input.websitesArray;
                const checkIntervals = input.checkIntervals;
                websitesArray.forEach((website,index) => {
                    const websitePerformanceObservable = measurePerformance(website, checkIntervals[index]);
                    websitePerformanceObservable.subscribe({
                        next: data => {
                            console.log(website, data);
                        },
                        error: err => {
                            appConsole.error(err);
                        }
                    });
                })
            },
            error: err => {
                appConsole.error(err)
            }
        });
    },
    error: err => {
        appConsole.error('This application needs an internet connection. Please connect to internet.')
    }
})
