const readline = require('readline');
const Rx = require('rxjs');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askForInput = function(){
    return Rx.Observable.create(obs => {
        rl.question('Which websites do you want to monitor? (separate each website with a space) \n', answer => {
            let websitesArray = answer.split(' ');
            let index = websitesArray.indexOf('');
            if (index > -1) {
                websitesArray.splice(index, 1);
            }
            if(websitesArray.length > 0){
                rl.question("At what intervals (in seconds) do you want to collect your metrics? \n"+
                "(precise only one if you choose the same for all website, separe each interval with a space if not)\n", answer => {
                    let checkIntervals = answer.split(' ');
                    let index = checkIntervals.indexOf('');
                    if (index > -1) {
                        checkIntervals.splice(index, 1);
                    }
                    if(checkIntervals.length > 0){
                        checkIntervals.forEach((interval,index) => {
                            if(isNaN(interval)){
                                checkIntervals.splice(index, 1);
                            }
                            else {
                                checkIntervals[index] = Number(interval);
                            }
                        })
                        if(checkIntervals.length === 1){
                            const checkInterval = checkIntervals[0];
                            checkIntervals = [];
                            console.log(`Metrics will be measured each ${checkInterval} second`)
                            for(var i = 0; i < websitesArray.length; i++){
                                checkIntervals.push(checkInterval)
                            }
                            obs.next({
                                websitesArray: websitesArray,
                                checkIntervals: checkIntervals
                            })
                            rl.close();
                        }
                        else{
                            if(checkIntervals.length === websitesArray.length){
                                websitesArray.forEach((website, index) => {
                                    console.log(website, "will be checked each ", checkIntervals[index], " seconds");
                                })
                                obs.next({
                                    websitesArray: websitesArray,
                                    checkIntervals: checkIntervals
                                })
                                rl.close();
                            }
                            else {
                                obs.error("Number of check intervals precised does not concur with the number of websites.");
                                rl.close();
                            }
                        }
                    }
                    else {
                        obs.error("No check interval precised.");
                        rl.close();
                    }
                })
            }
            else {
                obs.error("No website precised.");
                rl.close();
            }
        });
    })
};

module.exports = askForInput;
