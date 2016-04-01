var request = require('request');
var Promise = require("bluebird");
Promise.promisifyAll(request);
var logger = require('winston');
var progressRequest = require('progress-request');
var mysql = require('mysql');

var config = require('./config.js');

var stationFileUrl = "https://kyfw.12306.cn/otn/resources/js/framework/station_name.js";

var conn = mysql.createConnection(config.mysql);

function save(stationList) {
	conn.connect();
	stationList.data.forEach(function(item, index) {
		// console.log(item);
		conn.query('insert into Station set ?',item,function (err, result) {
			if(err) throw err;
			console.log(item.id);
		});
	});
	conn.end();
}
/**
* 抓取并保存车站列表
*/
var grabStation = function(global) {
	logger.info("开始抓取车站列表");
	return progressRequest(stationFileUrl).then(function(data) {
		/* 		var stationsStr = data[1]; //"var station_names ='@bjb|北京北|VA……" */
		var station_names = (new Function(data + ' ; return station_names')());
		var tempStationList = station_names.split('@');
		var stationListData = [];
		tempStationList.splice(0, 1);
		tempStationList.forEach(function(stationStr) {
			/*
			格式说明
			bjb|北京北|VAP|beijingbei|bjb|0
			[0] -->如果两个字 则为第一个字的首字母和第二个字的拼音前两个字母
			其他则为前两个字和最后一个字的首字母
			[1] -->车站名
			[2] -->telecode
			[3] -->拼音
			[4] -->拼音首字母
			[5] -->id
			*/
			var tempStation = stationStr.split('|');
			var station = {
				id: tempStation[5],
				name: tempStation[1],
				telecode: tempStation[2],
				spell: tempStation[3],
				sspell: tempStation[4],
				ssspell: tempStation[0]
			};
			stationListData.push(station);
		});
		logger.info("analyse " + tempStationList.length + " stations complete....");
		return Promise.resolve({
			data: stationListData
		});

	}).then(function(stationList) {
		// global.stationList = stationList;
		//保存
		return save(stationList);
		// return util.saveData('station_list.json', JSON.stringify(stationList.data, null, 4));
	});
	/* 	request({url : stationFilePath ,strictSSL : false}, function (error, response, body) {
	if(error){
	console.log(error);
}
if (!error && response.statusCode == 200) {
console.log(body); // Show the HTML for the Google homepage.
}
}); */
};



module.exports = grabStation;
