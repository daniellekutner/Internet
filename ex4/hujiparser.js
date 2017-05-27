/**
 * Created by dkutner on 07/01/2017.
 */
var net = require("net");
var url = require("url");
var PATH = require("path");

// --------------------- parsing exceptions: ----------------------------
// exception while request
function requestException(){
    throw "HTTP request parse error, check request math HTTP/1.1 protocol";
}

// --------------------- internal objects constructors: ----------------------------
// header object with two fields for name and value
var headerObj = function(name, val){
    this.headerName = name;
    this.headerVal = val;
};


function pathWithNoReferer(oldPath, referer)
{
    referer = url.parse(referer,true).pathname;
    var refererParts = referer.split('/');
    var toReplace =  '/' + refererParts[refererParts.length - 1] ;
    return oldPath.replace(toReplace, "");
}

// --------------------- request object: ----------------------------


function HttpRequest(headers, query, method, path,version, httpBody){
    var self = this;
    self.query = query;
    self.method = method;
    self.path = path;
    self.protocol = 'http';
    self.headers = headers;
    self.params = {};
    self.cookies = {};
    self.body = httpBody;
    self.version = version;

    self.get = function(name){
        var lowerCaseName = name.toLowerCase();
        for(var i = 0; i < self.headers.length; i++){
            if(self.headers[i].headerName === lowerCaseName){
                return self.headers[i].headerVal;
            }
        }
        return null;
    };

    // we can assume this header exist in any valid httpRequest
    self.host = self.get("Host").substring(0, self.get("Host").lastIndexOf(":"));
    self.is = function (contentType) {
        var pattern = new RegExp(contentType);
        return pattern.test(self.get("Content-Type"));
    };

    self.param = function(name){
        if (self.params[name]){
            return self.params[name];
        }
        else if(self.query[name]){
            return self.query[name];
        }else{
            return null;
        }
    };

    var cookieHeader = self.get("Cookie");
    if(cookieHeader != null){
        cookieHeader = cookieHeader.split(/;\s*/);
        for (var i = 0; i< cookieHeader.length; i++){
            var cookieMatch = cookieHeader[i].match(/^(.+)=(.+)$/);
            self.cookies[cookieMatch[1]] = cookieMatch[2];
        }
    }

    self.setParam = function(paramName, paramVal){
        self.params[paramName] = paramVal;
    };

    self.clearParam = function(){
        self.params = {};
    };

    self.toJson = function()
    {
        if(self.is(self.body) === 'json')
        {
            self.body = JSON.parse(self.body);
        }
        else
        {
            console.log("not json");
        }
    };
}

// -------------- methods to export: return request and response objects ------------

exports.parseHttpRequest = function(string) {
    var request = string.toString().split(/\r?\n\r?\n/g);
    var header = request[0];
    var headerByLines = header.split(/\r?\n/g);
    var firstLineArgs = headerByLines[0].split(" ");

    var method, path, headerMatch, query, version;
    var body = "";
    var headers = [];

    if(firstLineArgs[0] === "GET" ||
        firstLineArgs[0] === "POST" ||
        firstLineArgs[0] === "PUT" ||
        firstLineArgs[0] === "DELETE" ||
        firstLineArgs[0] === "OPTIONS" ||
        firstLineArgs[0] === "TRACE HTTP"){
        method = firstLineArgs[0];
    }else{
        requestException();
    }

    var parts = url.parse(firstLineArgs[1],true);
    path = parts.pathname;
    query = parts.query;
    if(firstLineArgs[2] === "HTTP/1.0" || firstLineArgs[2] === "HTTP/1.1"){
        version = firstLineArgs[2];
    }else{
        requestException();
    }
    var i = 1;
    while(i < headerByLines.length){
        headerMatch = headerByLines[i].match(/^(.+):\s+(.+)\s*$/);
        headerByLines[i] = headerByLines[i].toLowerCase();
        headers.push(new headerObj(headerMatch[1].toLowerCase(),headerMatch[2]));
        i++;
    }
    var httpBody = body.concat(request[1]);

    return new HttpRequest(headers, query, method, path, version, httpBody);
};