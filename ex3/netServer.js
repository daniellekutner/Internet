/**
 * Created by dkutner on 13/01/2017.
 */

var net = require('net');
var parser = require('./hujiparser.js');
var stream = require('stream');


// ------------------------------ net huji object ----------------------------------
exports.netServer = function (port, commands) {
    var server;
    var self = this;
    self.commands = commands;
    self.port = port;

    self.stop = function () {
        server.close();
    };

    try {
        server = net.createServer(function (socket) {
            var MAX_IDLE_TIME = 25000;
            var httpReq;
            var data = "";
            // Set socket to timeout after MAX_IDLE_TIME
            socket.setTimeout(MAX_IDLE_TIME, function(){
                socket.end("HTTP/1.1 408 Server Time Out\r\n");
            });

            socket.on('timeout', function() {
                socket.end();
            });

            socket.on('error', function(error) {
                console.log("socket "+error);
            });

            socket.on('close', function() {
                socket.end()
            });

            socket.on('end', function() {
                socket.end();
            });

            socket.on('data', function (newData) {
                data += newData;
                if((/\r?\n\r?\n/g).test(data)) {
                    try {

                        // create http request using parser module
                        httpReq = parser.parseHttpRequest(data.toString());
                        var response = new HttpResponse(socket, httpReq.path);

                        var timeoutID = setTimeout(function () {response.status('404').send("Server could finish execute due to timeout error")}, 10000);
                        response.setTimeOutID(timeoutID);
                        var i = 0;
                        while (i < self.commands.length)
                        {
                            if (commandMatchMiddleware(i, self.commands, httpReq))
                            {
                                var current = i;
                                self.commands[i].callback(httpReq, response, function(){i++;}
                                );
                                if(current === i) {
                                    break;
                                }else{
                                    clearTimeout(response.timeOutID);
                                }
                            }else{
                                i++;
                            }
                        }
                        if (i == self.commands.length)
                        {
                            response.status('404');
                            response.send("middleware not found");
                        }
                    }catch(fileError){
                        console.log('file error');
                        internal500Exception(socket);
                    }
                }
            })
        });

        server.listen(port);
    }catch (createNetServerError) {
        console.log(createNetServerError.message);
        throw (createNetServerError);
    }
};

function internal500Exception(socket) {
    var error = "HTTP/1.1 500 Internal Error\n" + "Content-Type: text/html\n" + "Date: " + Date.now() + "\n" + "Content-Length: 145\r\n\n";
    var htmlError = "\<html><head><title>500 internal error</title></head><body>" +
        "\ <h1>Internal Error</h1>   " +
        "\<p>Server could finish execute due to internal error</p></body></html>";
    socket.end(error + htmlError);
}

// ------------------------------ private functions ----------------------------------

// private function use to determine if the command match middleware in given index. if so,
// update params in http request.
function commandMatchMiddleware(index, commands, httpRequest){
    var testMatch, paramValues;
    if (index == commands.length)
    {
        return false;
    }
    testMatch = httpRequest.path.match(commands[index].matchMiddleWareRegex);
    if(testMatch === null) {
        return false;
    }
    else if (httpRequest.path != testMatch[0] &&
        commands[index].params != null){
        return false;
    }
    paramValues = httpRequest.path.match(commands[index].paramsRegex);
    httpRequest.clearParam();
    if(commands[index].params == null)
    {
        return true;
    }
    // update params
    for (var k = 1; k < commands[index].params.length + 1 && k < paramValues.length; k++)
    {
        httpRequest.setParam(commands[index].params[k-1], paramValues[k]);
    }
    return true;
}


// ------------------------------ response object  ----------------------------------

var HttpResponse =  function(socket, path) {
    this.timeOutID = 0;
    var self = this;
    var statusMsg =
        {
            200: "OK",
            404: "Not Found",
            500: "Internal Server Error"
        };
    self.cookies = {};
    self.headers = {};
    self.socket = socket;
    self.statusCode = "200";
    self.httpTypesDict = {'html': 'text/html' , 'css':'text/css', 'js' : 'application/javascript'};

    var createHttpContent = function() {
        var httpRespond = "";
        if (typeof self.statusCode == "undefined") {
            console.log('status undefined');
            self.status('500');
            self.send("Server could finish execute due to internal error");
            return;
        }
        httpRespond += "HTTP/1.1 " + self.statusCode + " " +
            statusMsg[self.statusCode] + "\r\n" + "Date: " + Date.now() + "\r\n";
        for (var header in self.headers) {
            httpRespond += header + ": " + self.get(header) + "\r\n";
        }
        for (var cookie in self.cookies) {
            httpRespond += "Set-Cookie:" + cookie + "= " + self.cookies.cookie.value;
        }
        httpRespond += "\r\n";
        return httpRespond;
    };

    self.set = function (headerName, headerValue) {
        if (typeof headerValue != "undefined") {
            self.headers[headerName] = headerValue;
        } else {
            for (var key in headerName) {
                if (headerName.hasOwnProperty(key)) {
                self.headers[key] = headerName[key];
                }
            }
        }
    };

    self.status = function (code) {
        self.statusCode = code;
        return self;
    };

    self.get = function (field) {
        return self.headers[field];
    };

    self.setTimeOutID = function(id){
      self.timeOutID = id;
    };

    self.cookie = function (name, value, options) {
        self.cookies[name] = {value: value, options: options};
    };

    self.json = function (body) {
        clearTimeout(self.timeOutID);
        var jsonResponseContent = "";
        if(body === null)
        {
            socket.end(createHttpContent());
        }
        else
        {
            if(!isJson(body)) {
                body = JSON.stringify(body);
            }
            self.set("Content-Type", 'json');
            self.set("Content-Length", body.length);
            jsonResponseContent = createHttpContent();
            jsonResponseContent += body;
            socket.end(jsonResponseContent);
        }
    };

    self.send = function (body) {
        var responseContent = "";
        if(!body)
        {
            // TODO handle timeout
            clearTimeout(self.timeOutID);
            socket.end(createHttpContent());
        }
        else if(typeof(body) != 'object' && typeof(body) != 'string' && typeof(body) != 'undefined' && !body instanceof stream.Stream)
        {
            console.log("Error 500 - unsupported body type");
            self.status('500');
            self.send("Server could finish execute due to internal error");

        }
        else if (typeof(body) === 'object' || isJson(body)) {
            if(isJson(body))
            {
                body = JSON.parse(body);
            }
            self.json(body);
        }

        else if (typeof body === "string") {
            clearTimeout(self.timeOutID);
            var contentType = self.get("Content-Type");
            if(self.httpTypesDict[contentType] === 'undefined'){
                self.set("Content-Type", 'text/html');
                self.set("Content-Length", body.length);
            }
            responseContent = createHttpContent();
            responseContent += body;
            socket.end(responseContent);
        }
    };
};

function isJson(str){
    try{
        JSON.parse(str);
    }
    catch(e){
        return false;
    }
    return true;
}