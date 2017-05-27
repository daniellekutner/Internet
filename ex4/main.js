/**
 * Created by dkutner on 16/01/2017.
 */
var huji = require('./hujiwebserver.js');
var FS = require('fs');
var httpTypesDict = {'html': 'text/html' , 'css':'text/css', 'js' : 'application/javascript'};
var gameScore = {"zeros":0, "ones":0};

huji.use('/www', function(rq,rs){
    var path = rq.path;
    FS.readFile(path.substring(1,path.length), function(err, data) {
        if (err){
            rs.status('404');
            rs.send("illegal file");
            return;
        }
        var body = data.toString();
        rs.set("Content-Length", body.length);
        var httpType = httpTypesDict[path.substring(path.lastIndexOf('.') + 1, path.length)];

        if(typeof httpType === 'undefined'){
            rs.status('404');
            rs.send("Unsupported file extension");
            return;
        }
        rs.set("Content-Type", httpType);
        rs.send(body);
    })
});

huji.use('/gamble/0', function (rq, rs) {
    gameScore["zeros"] += 1;
    rs.json(gameScore);
});

huji.use('/gamble/1', function (rq, rs) {
    gameScore["ones"] += 1;
    rs.json(gameScore);
});

huji.use('/gamble/reset', function (rq, rs) {
    gameScore["ones"] = 0;
    gameScore["zeros"] = 0;
    rs.json(gameScore);
});

function errorHandler(err) {
    if(err){
        console.log(err);
    }
}

huji.start(8081, errorHandler);