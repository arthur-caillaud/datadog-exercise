const askForInput = require('./askForInput');
const checkForInternetConnection = require('./checkForInternetConnection');
const appConsole = require('./console');

checkForInternetConnection().subscribe({
    next: () => {
        askForInput().subscribe({
            next: input => {
                appConsole.log(input)
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
