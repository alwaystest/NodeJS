var config = require('./config.js');
var mysql = require('mysql');
var Promise = require("bluebird");


var query = function(name, cache){
    var conn = mysql.createConnection(config.mysql);
    return new Promise(function(resolve, reject){
        var id = cache.get(name);
        if(id != null){
            if(id != -1){
                //console.log(name+'----Cache');
                resolve(id);
            }else{
                reject(new Error(name+'车站不存在---Cache'));
            }
            return;
        }
        conn.connect();
        var query = conn.query('select id from Station where name=?',[name], function(err, results){
            if(err){
                reject(err);
                return;
            }
            if(results.length==0){
                cache.put(name,-1);
                reject(new Error(name+'车站不存在'));
                return;
            }
            //console.log(results[0].id);
            cache.put(name,results[0].id);
            resolve(results[0].id);
        });
        // console.log(query.sql);
    }).finally(function(){conn.end();});
};

module.exports = query;
