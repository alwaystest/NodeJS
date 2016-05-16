var config = require('./config.js');
var mysql = require('mysql');
var Promise = require("bluebird");


var query = function(name){
  return new Promise(function(resolve, reject)){
    var conn = mysql.createConnection(config.mysql);
    conn.connect();
    var query = conn.query('select id from Station where name=?',[name], function(err, results){
      console.log(results[0].id);
      resolve(results[0].id);
      conn.end();
    });
    // console.log(query.sql);
  }
}

module.exports = query;
