var config = require('./config.js');
var mysql = require('mysql');
var Promise = require("bluebird");


var query = function(name){
    var conn = mysql.createConnection(config.mysql);
    return new Promise(function(resolve, reject){
        conn.connect();
        var query = conn.query('select id from Station where name=?',[name], function(err, results){
            if(err){
                reject(err);
                return;
            }
            if(results.length==0){
                reject(new Error(name+'车站不存在'));
                return;
            }
            //console.log(results[0].id);
            resolve(results[0].id);
        });
        // console.log(query.sql);
    }).finally(function(){conn.end();});
};

module.exports = query;
