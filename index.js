var cheerio = require('cheerio');
var superagent = require('superagent');
var url = require('url');
var async = require('async');
var mysql = require('mysql');

var conn = mysql.createConnection({
    host: '192.168.99.100',
    user: 'root',
    password: 'tyuteric',
    database: 'TYUT',
    port: 3306
});

var divider = '----------------------------------------------------------------'
var baseUrl = 'http://www.tielu.org/TrainList/TrainList-';
var pages = 38;
var sleep = 1000;
var getLimit = 2;

var items = [];

function getTrain(addr, callback) {
    superagent.get(addr)
        .end(function(err, sres) {
            if (err) {
                return next(err);
            }
            // var items = [];
            var $ = cheerio.load(sres.text);
            $('.ListContentLeftContent li a').each(function(idx, element) {
                var $element = $(element);
                // var href = url.resolve(baseUrl, $element.attr('href'));
                var train = $element.text();
                items.push(train);
                // items.push(href);
            });
            console.log('now getting '+ addr);
            setTimeout(function(){
                callback(null, addr);
            },sleep);
        });
}

function test(addr, callback) {
    setTimeout(function() {
        console.log(addr);
        callback(null, addr);
    }, sleep);
}

function save() {
    conn.connect();
    for (var train in items) {
        //todo:
        conn.query('insert into TrainNo set ?',{'train': items[train]},function (err, result) {
            if(err) throw err;
            console.log(result.insertId);
        })
    }
    conn.end();
}

var TrainList = [];
for (var i = 1; i <= pages; i++) {
    TrainList.push(baseUrl + i + '.html')
}
console.log(TrainList);
console.log(divider);

async.mapLimit(TrainList, getLimit, function(url, callback) {
    // test(url, callback);
    getTrain(url,callback);
}, function(err, result) {
    console.log(divider);
    console.log(items);
    console.log(divider);
    save();
});
// getTrain(baseUrl);
