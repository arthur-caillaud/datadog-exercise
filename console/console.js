module.exports.error = function error(message){
    console.error("\x1b[31m%s\x1b[0m",message);
}

module.exports.log = function log(message){
    console.log(message);
}
