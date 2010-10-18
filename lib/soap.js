var sclient = require('./soap-client'),
    srequest = require('./soap-request'),
    sparam = require('./soap-param');

exports.createClient = function (wsdl, options){
    var c = new sclient.SoapClient(wsdl, options);
    return c;
}

exports.createParam = function (name, value){
    var p = new sparam.SoapParam(name, value);
    return p;
}
