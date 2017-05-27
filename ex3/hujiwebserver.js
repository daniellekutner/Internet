var netServer = require('./netServer.js');
var serverObj = null;

module.exports = {
    commands:[],
    /**
     * @param port
     * @param callback - In case the huji could not start it should execute the
     callback with your string err argument that contains the
     error reason.
     * @returns serverObj which starts the
     huji and upon readiness to accept HTTP requests call the
     callback function.
     */
    start: function(port, callback) {
        try {
            serverObj = new netServer.netServer(port, this.commands);
            callback(null);
        } catch (e) {
            callback(e.message);
        }
        return serverObj;
    },


    /**
     * @param command - command is the prefix of the URL command/resource (the
     URL portion that can be found right after the domain.
     ■ the commands argument of the use method is
     optional, in case the .use function receives only
     one argument, you will set the commands to be ‘/’
     * @param callback -
     *  . middleware(request,response,next) is a function that receives 3 arguments, request, response and next
     ● request is the object that represents the HTTP request
     ● response is the object that represents the HTTP response
     ● next() is a function that hints your module to lookup for the next relevant middleware.
     */
    use: function(command, callback){
        if(callback === undefined)
        {
            callback = command;
            command = '/';
        }
        var middlewareRegex = command;
        var paramsRegex = command;
        var paramsMatchArr = command.match(/(:(?:[^/]*)*)/g);
        if (command === '/') {
            middlewareRegex = ".*";
        }
        if (paramsMatchArr != null)
        {
            for (var i = 0; i < paramsMatchArr.length; i++)
            {
                paramsRegex = paramsRegex.replace(paramsMatchArr[i], "([^/]*)");
            }
            for (var j = 0; j < paramsMatchArr.length; j++)
            {
                middlewareRegex =  middlewareRegex.replace(paramsMatchArr[j],
                    "[^/]+");
                paramsMatchArr[j] = paramsMatchArr[j].substring(1, paramsMatchArr[j].length);
            }
        }
        middlewareRegex = "^(" + middlewareRegex + "(?:/[^/]+)*)$";
        middlewareRegex = new RegExp(middlewareRegex);
        this.commands.push({command: command,
            callback: callback,
            params: paramsMatchArr,
            matchMiddleWareRegex: middlewareRegex,
            paramsRegex: paramsRegex
        });
        return this;
    }
};
