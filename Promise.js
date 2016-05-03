var Promise = require('bluebird');

function sleep(num) {
    return new Promise(function(resolve, reject){
        setTimeout(function(){
            console.log(num);
            resolve(num);
        },1000);
    });
}

sleep(1).then(function(data) {
    return sleep(2);
}).then(function(data) {
    return sleep(3);
}).then(function(){
    console.log('complete');
})
