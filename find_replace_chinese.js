/**
	1.此脚本目的，替换 as 文件中的 中文件字符串
	2.在字符串前添加 lang( 在字符串后添加 )
	3.在文件头开始添加
		import net.pixvi.common.system.language.lang;
		通过在第一个 { 括号后添加这个
*/
var fs = require("fs");
var path = require("path");
var mkdirp = require('mkdirp');
var config = require("./config");
var num= 0;
var pattern = /[\u4e00-\u9fa5]+/i;
var result = "";
var outputDir = config.outDir;
var chinese= require("./chinese.json");

var processFile = function(fileName){
	fs.readFile(fileName, (err, data)=>{
		if( err ) throw err;
		var text = data.toString("utf-8");
		var firstDaKuoHaoIndex = text.indexOf("{");
		//	没有大括号则不修改此文件
		if( firstDaKuoHaoIndex === -1 ){
			return;
		}

		if( text.indexOf("import net.pixvi.common.system.language.lang;") === -1 ){
			result += text.substr(0, firstDaKuoHaoIndex+1);
			result += "\r\n\timport net.pixvi.common.system.language.lang;";
			text = text.substr(firstDaKuoHaoIndex+1);
		}

		var startPos = 0;;
		var firstQuote = 0
		var secondQuote = 0;

		while(true){
			//	如果前面是反斜杠，则重新找
			while(true){
				firstQuote = text.indexOf('"', startPos);
				//	判断引号之前是否有 \ 
				var strBeforeQuote1 = "";
				if( firstQuote - 1 > 0 ){
					strBeforeQuote1 = text.substr(firstQuote-1, 1);
				}

				if( strBeforeQuote1 === "\\"){
					startPos = firstQuote + 1;
					continue;
				}
				break;
			}

			if( firstQuote === -1 ){
				//	写入文件
				result += text;
				break;
			}

			//secondQuote = text.indexOf('"', firstQuote+1);
			//	如果前面是反斜杠，则重新找
			var secondStartPos = firstQuote+1;
			while(true){
				secondQuote = text.indexOf('"', secondStartPos);
				//	判断引号之前是否有 \ 
				var strBeforeQuote1 = "";
				if( secondQuote - 1 > 0 ){
					strBeforeQuote1 = text.substr(secondQuote-1, 1);
				}

				if( strBeforeQuote1 === "\\"){
					secondStartPos = secondQuote + 1;
					continue;
				}
				break;
			}

			//console.log('循环开始',firstQuote, secondQuote);
			//	判断引号之前是否有 lang(
			var strBeforeQuote5 = "", strBeforeQuote6="";
			if( firstQuote - 5 > 0 ){
				strBeforeQuote5 = text.substr(firstQuote-5, 5);
			}

			//	判断引号之前是不是 trace(
			if( firstQuote - 6 > 0 ){
				strBeforeQuote6 = text.substr(firstQuote-6, 6);
			}

			var strQuoted = text.substr(firstQuote, secondQuote-firstQuote +1);
			if( strBeforeQuote5 === "lang("){
				var contentInStr = strQuoted.replace(/\"/g, "");
//				console.log("前面有lang", contentInStr);
				chinese[contentInStr] = 1;
			}
			else if( strBeforeQuote6 !== "trace("){
				if( ifNeedReplace(strQuoted)){
					//console.log("需要替换",strQuoted);
					//	先把引号之前的写入文
	//				console.log(text.substr(0, firstQuote)+"lang("+strQuoted+")");
					result += text.substr(0, firstQuote)+"lang("+strQuoted+")";
			//		fs.appendFileSync("./th/"+fileName+num, text.substr(0, firstQuote)+"lang("+strQuoted+")");
					text = text.substr(secondQuote+1);
					//	重新从头开始搜索
					startPos = 0;
					continue;
				}
			}
			else{
				//console.log('前面有东西', strBeforeQuote5, strBeforeQuote6, strQuoted);
			}

			//	继续向后搜索
			startPos = secondQuote+1;
			//firstQuote = text.indexOf('"', secondQuote+1);
			//secondQuote = text.indexOf('"', firstQuote+1);
		}
		let absolutePath = path.resolve(fileName);
		let outputFileFullName = absolutePath.replace(config.srcDir, config.outDir);
		console.log(absolutePath, '=>', outputFileFullName);
		let outputDirName = path.dirname(outputFileFullName);
		if( !fs.existsSync(outputDirName)){
			mkdirp.sync(outputDirName);
		}

		fs.writeFileSync(outputFileFullName, result);
		//	重新写回到
		fs.writeFileSync("./myrzx_chinese.json", JSON.stringify(chinese, null, 4)); 
		console.log(fileName+"替换完成");
	});
}

var ifNeedReplace = function(strQuoted){
	var contentInStr = strQuoted.replace(/\"/g, "");
	//console.log(contentInStr);
	if( contentInStr === "" ){
		//console.log("空的");
		return false;
	}

	if( -1 === contentInStr.search(pattern)){
		//console.log("不包含中文");
		return false; 
	}else{
		//	包含中文
		chinese[contentInStr] = {};
	}
	return true;
}

var processDir = function(dirName){
	fs.readdir(dirName, function(err, files){
		files.forEach(function(fileName){
			let fullPathName = dirName+"/"+fileName;
			let stat = fs.lstatSync(fullPathName);
			//	是否是目录
			if(stat.isDirectory()){
				processDir(fullPathName);
				return;
			}
			
			//	处理文件
			if( fullPathName.endsWith('.as')){
				//	忽略目标文件夹
//				console.log(fullPathName);
				let absolutePath = path.resolve(fullPathName);
				if( absolutePath.startsWith(outputDir)){
//					console.log("忽略输出目录");
					return;
				}
				processFile(fullPathName);
			}
		});
	});
}

processDir(config.srcDir);



