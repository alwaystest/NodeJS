var cheerio = require('cheerio');
var superagent = require('superagent');
// var url = require('url');
var async = require('async');
var mysql = require('mysql');
var Promise = require("bluebird");
var iconv = require("iconv-lite");
var charset = require("superagent-charset")
var config = require('./config.js');

var conn = mysql.createConnection(config.mysql);

var divider = '----------------------------------------------------------------';
var baseUrl = 'http://www.tielu.org/Search/';

var list = [];
charset(superagent);

var readList = function (callback) {
    conn.connect();
    conn.query("select * from TrainNo",function(error,result){
        result.forEach(function(item, index){
            if(index > 2) return;
            list.push(item.train);
        });
        console.log(list);
        callback();
    });
    conn.end();
    // return callback();
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
            $('#timetable2 tbody tr td:nth-child(2)').each(function(idx, element){
                var $element = $(element);
                console.log($element.text().trim());
                // console.log($element.attr('href'));
            });
        });
    });
});
