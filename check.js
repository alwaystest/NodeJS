var mysql = require('mysql');
var config = require('./config.js');

var conn = mysql.createConnection(config.mysql);

var checkExsist = function(from, to, lineNo){
    conn.connect();
    conn.query("select * from TrainRelation where from = ? and to =?",[from, to],function(err, result){
        console.log(result.length);
    });
    conn.end();
}

module.exports = checkExsist;
