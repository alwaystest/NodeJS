var config = require('./config.js');
var grabTrainNo = require('./grabTrainNo.js');
var grabStation = require('./grabStation.js');

if(config.grabTrainNo){
    console.log('Grabing train No');
    grabTrainNo();
}else{
    console.log('skip grabTrainNo');
}
if(config.grabStation){
    console.log('Grabing Station Info');
    grabStation();
}else{
    console.log('skip grabStation');
}
