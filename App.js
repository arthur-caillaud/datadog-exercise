const askForInput = require('./askForInput');
const checkForInternetConnection = require('./checkForInternetConnection');

checkForInternetConnection().subscribe({
    next: () => {
        askForInput().subscribe({
            next: input => {
                console.log(input)
            },
            error: err => {
                console.error(err)
            }
        });
    },
    error: err => {
        
    }
})
