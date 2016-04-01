var config = require('./config.js');
var mysql = require('mysql');

var conn = mysql.createConnection(config.mysql);

var query = function(name){
    conn.connect();
    var query = conn.query('select id from Station where name=?',[name], function(err, results){
        console.log(results[0].id);
    });
    console.log(query.sql);
    conn.end();
}

module.exports = query;
