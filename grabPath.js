var cheerio = require('cheerio');
var superagent = require('superagent');
// var url = require('url');
var async = require('async');
var mysql = require('mysql');
var Promise = require("bluebird");
var iconv = require("iconv-lite");
var charset = require("superagent-charset")
var cache = require("memory-cache");
var config = require('./config.js');
var query = require('./query.js');

var pool = mysql.createPool(config.mysql);

var divider = '----------------------------------------------------------------';
var baseUrl = 'http://www.tielu.org/Search/';

var NoErrorFlag = true;
var list = [];
var start = 5445;
charset(superagent);
var q = async.queue(function (task,callback){
    var queryFromId = query(task.from,cache,pool);
    var queryToId = query(task.to,cache,pool);
    Promise.all([queryFromId,queryToId])
    .then(function(ids){
        if(task.count == 0){
            insertQueue.push({from:ids[0],to:ids[1],lineNo:task.lineNo});
            callback();
        }else{
            checkExsist(ids[0],ids[1],task.lineNo,callback);
        }
    })
    .catch(function(err){
        console.error(err.message);
        callback();//出现Error，导致callback无法被调用，这里调用callback，使得q能继续执行。
    })
    .done();
},20);

q.drain = function(){
    console.log("All Complete");
};

var insertQueue = async.queue(function(task,callback){
    saveToDB(task.from,task.to,task.lineNo,callback);
},20);

insertQueue.drain = function(){
    console.log("Insert Complete");
    setTimeout(function(){
        if(StationsWebQueue.length()==0 && q.length()==0 && insertQueue.length()==0){
            pool.end(function(err){
                if(err){
                    console.log(err.message);
                }
                console.log('---Pool End()---');
            });
            console.log('NoError---'+NoErrorFlag);
        }
    },30000);
};

var StationsWebQueue = async.queue(function(task,callback){
    superagent.get(task.url).charset('gbk')
    .end(function(err, sres) {
        if (err) {
            console.error("err@\t"+task.url);
            return;
        }
        // var items = [];
        var $ = cheerio.load(sres.text);
        var stations = [];
        $('#timetable2>tr td:nth-child(2)').each(function(idx, element){
            var $element = $(element);
            //console.log($element.html());
            var station = $element.text().trim();
            stations.push(station);
        });
        saveRelations(stations,task.item);
        setTimeout(function(){
            console.log('StationWebQ---'+StationsWebQueue.length());
            callback();
        },1000);
    });
},1);

var readList = function (callback) {
    pool.getConnection(function(err, conn){
        if(err){
            console.error(err);
            return;
        }
        conn.query("select * from TrainNo",function(error,result){
            if(error) {
                console.log(error);
                conn.release();
                return;
            }
            result.forEach(function(item, index){
                //if(index > start + 10) return;
                if(index > start){
                    list.push(item.train);
                }else{
                    console.log(item.train+'\t Skip');
                }
            });
            console.log('Load '+list.length+' Train');
            conn.release();
            callback();
        });
    });
}

function saveToDB(from, to, lineNo, AsyncCallback){
    pool.getConnection(function(err, connTmp){
        if(err){
            console.error(err);
            return;
        }
        var relation = {fromStation:from, toStation:to,TrainNo:lineNo};
        connTmp.query('insert into TrainRelation set ?', relation,function(err,result){
            console.log('InsertDB_Q---'+insertQueue.length());
            if(err){
                console.log(err);
                connTmp.release();
                AsyncCallback();
                return;
            }
            if(result.affectedRows>0){
                console.log(from+'\t'+to+'\t'+'at line\t'+lineNo+"\tSuccess");
            }
            connTmp.release();
            AsyncCallback();
        });
    });
}

function checkLineNo(lineNo) {
    return new Promise(function(resolve,reject){
        pool.getConnection(function(err, connTmp){
            if(err){
                console.error(err);
                return;
            }
            connTmp.query('select * from TrainRelation where TrainNo = ?',[lineNo],function(err, result){
                if(err){
                    connTmp.release();
                    reject(err);
                    return;
                }
                if(result.length == 0){
                    console.log('New Line');
                    resolve(0);
                }else{
                    resolve(result.length);
                }
                connTmp.release();
            });
        });
    });
}

function checkExsist(from, to, lineNo, AsyncCallback){
    //console.log(from+'\t'+to+'\t'+lineNo);
    pool.getConnection(function(err, connTmp){
        if(err){
            console.error(err);
            return;
        }
        connTmp.query('select * from TrainRelation where fromStation = ? and toStation = ? and TrainNo = ?',[from,to,lineNo],function(error,result){
            //connTmp.query("select * from TrainNo",function(error,result){
            console.log('CheckQueue---'+q.length());
            if(error) {
                console.log(from+'\t'+to+'\t'+'at line\t'+lineNo+"\tFailed");
                connTmp.release();
                AsyncCallback();
                return;
            }
            //console.log(result.length);
            if(result.length==0){
                console.log(from+'\t'+to+'\t'+'at line\t'+lineNo+"\tDoing");
                NoErrorFlag = false;
                //console.log(from+'\t'+ids[0]+'\t'+to+'\t'+ids[1]+'\t'+'at line\t'+lineNo+"\tSuccess");
                insertQueue.push({from:from,to:to,lineNo:lineNo});
                //saveToDB(from,to,lineNo);
            }else{
                console.log(from+'\t'+to+'\t'+'at line\t'+lineNo+"\tExists");
            }
            connTmp.release();
            AsyncCallback();
        });
    });
}

function saveRelations(stations,lineNo){
    console.log(stations);
    checkLineNo(lineNo)
    .then(function(count){
        for(i=0; i < stations.length - 1; i++){
            for(j = i + 1; j < stations.length; j++){
                //console.log(stations[i] + ' to ' + stations[j]);
                q.push({from:stations[i],to:stations[j],lineNo:lineNo,count:count});
            }
        }
    })
    .catch(function(err){
        console.error(err);
    }).done();
}

var grab = Promise.promisify(readList);
grab().then(function(){
    list.forEach(function (item, index) {
        var url = baseUrl + item + '.html';
        StationsWebQueue.push({url:url,item:item});
    });
});
