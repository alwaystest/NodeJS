var cheerio = require('cheerio');
var superagent = require('superagent');
// var url = require('url');
var async = require('async');
var mysql = require('mysql');
var Promise = require("bluebird");
var iconv = require("iconv-lite");
var charset = require("superagent-charset")
var config = require('./config.js');
var query = require('./query.js');

var conn = mysql.createConnection(config.mysql);

var divider = '----------------------------------------------------------------';
var baseUrl = 'http://www.tielu.org/Search/';

var list = [];
charset(superagent);
var q = async.queue(function (task,callback){
    checkExsist(task.from,task.to,task.lineNo,callback);
},2);

q.drain = function(){
    console.log("All Complete");
};

var insertQueue = async.queue(function(task,callback){
  saveToDB(task.from,task.to,task.lineNo,callback);
},2);

insertQueue.drain = function(){
    console.log("Insert Complete");
};

var readList = function (callback) {
    conn.connect();
    conn.query("select * from TrainNo",function(error,result){
        if(error) {
            console.log(error);
            return;
        }
        result.forEach(function(item, index){
            if(index > 2) return;
            list.push(item.train);
        });
        console.log('Load '+list.length+' Train');
        callback();
    });
    conn.end();
}

function saveToDB(from, to, lineNo, AsyncCallback){
    var connTmp = mysql.createConnection(config.mysql);
    connTmp.connect();
    var relation = {fromStation:from, toStation:to,TrainNo:lineNo};
    connTmp.query('insert into TrainRelation set ?', relation,function(err,result){
        if(err){
            console.log(err);
            return;
        }
        if(result.affectedRows>0){
            console.log(from+'\t'+to+'\t'+'at line\t'+lineNo+"\tSuccess");
        }
        connTmp.end();
        AsyncCallback();
    });
}

function checkExsist(from, to, lineNo, AsyncCallback){
    //console.log(from+'\t'+to+'\t'+lineNo);
    var connTmp = mysql.createConnection(config.mysql);
    connTmp.connect();
    connTmp.query('select * from TrainRelation where fromStation = ? and toStation = ?',[from,to],function(error,result){
        //connTmp.query("select * from TrainNo",function(error,result){
        if(error) {
            console.log(from+'\t'+to+'\t'+'at line\t'+lineNo+"\tFailed");
            return;
        }
        //console.log(result.length);
        if(result.length==0){
            var queryFromId = query(from);
            var queryToId = query(to);
            console.log(from+'\t'+to+'\t'+'at line\t'+lineNo+"\tDoing");
            Promise.all([queryFromId,queryToId])
            .then(function(ids){
                //console.log(from+'\t'+ids[0]+'\t'+to+'\t'+ids[1]+'\t'+'at line\t'+lineNo+"\tSuccess");
                insertQueue.push({from:ids[0],to:ids[1],lineNo:lineNo});
                //saveToDB(from,to,lineNo);
            })
            .catch(function(err){
                console.error(err.message);
            })
            .done();
        }else{
            console.log(from+'\t'+to+'\t'+'at line\t'+lineNo+"\tExists");
        }
        connTmp.end();
        AsyncCallback();
    });
}

function saveRelations(stations,lineNo){
    console.log(stations);
    for(i=0; i < stations.length - 1; i++){
        for(j = i + 1; j < stations.length; j++){
            //console.log(stations[i] + ' to ' + stations[j]);
            q.push({from:stations[i],to:stations[j],lineNo:lineNo});
        }
    }
}

var grab = Promise.promisify(readList);
grab().then(function(){
    list.forEach(function (item, index) {
        var url = baseUrl + item + '.html';
        superagent.get(url).charset('gbk')
        .end(function(err, sres) {
            if (err) {
                console.error("err@\t"+url);
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
            saveRelations(stations,item);
        });
    });
});
