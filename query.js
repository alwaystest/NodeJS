var config = require('./config.js');
var mysql = require('mysql');
var Promise = require("bluebird");


var query = function(name, cache, pool){
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
        pool.getConnection(function(err, conn){
            if(err){
                console.log(err);
                return;
            }
            var query = conn.query('select id from Station where name=?',[name], function(err, results){
                if(err){
                    conn.release();
                    reject(err);
                    return;
                }
                if(results.length==0){
                    cache.put(name,-1);
                    conn.release();
                    reject(new Error(name+'车站不存在'));
                    return;
                }
                //console.log(results[0].id);
                cache.put(name,results[0].id);
                conn.release();
                resolve(results[0].id);
            });
            // console.log(query.sql);
        });
    });
};

module.exports = query;
