var http = require('http'),
    url = require('url'),
    util = require('util'),
    events = require('events'),
    sparam = require('./soap-param');
    
exports.SoapRequest = SoapRequest;

function SoapRequest(method, params, url, namespace, soapAddress){
    events.EventEmitter.call( this );
    
    this.method = method;
    this.params = params;
    this.url = url;
	this.namespace = namespace;
	this.soapAddress = soapAddress;
}

util.inherits( SoapRequest, events.EventEmitter );

SoapRequest.prototype.createHeader = function(){
	// May have to define the target namespace and use that
	// rather the the default xmlns on the operation tags
    return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
				"<SOAP-ENV:Envelope " +
				"xmlns:SOAP-ENV=\"http://schemas.xmlsoap.org/soap/envelope/\" "+
				"xmlns:ns1=\""+this.namespace+"\">";
}

SoapRequest.prototype.createBody = function( method, params ){
    var param_string = "";
    if( params.constructor == Array ){
        for( prop in params ){
            param_string += params[prop].toXML();
        }
    }
    else{
        param_string = params.toXML();
    }
    return "<SOAP-ENV:Body>" +
			"<ns1:" + method + ">" +
			param_string +
			"</ns1:" + method + ">" +
			"</SOAP-ENV:Body>";
}

SoapRequest.prototype.createFooter = function(){
    return "</SOAP-ENV:Envelope>\n";
}

SoapRequest.prototype.end = function(){
    var self = this;
 
    var reqBody = this.createHeader();
    reqBody += this.createBody(this.method, this.params);
    reqBody += this.createFooter();
    
    var info = url.parse(this.url);
    var port = info.port ? info.port : 80;
	var hostname = info.hostname;
	
	var soapInfo = url.parse(this.soapAddress);
	var soapHost = soapInfo.host;
	
	console.log( soapInfo );
	
    var client = http.createClient(port, hostname);
	
	console.log(
		"Port: ", port, "\n",
		"Soap host: ", soapHost, "\n",
		"Method: ", this.method, "\n",
		"Namespace: ", this.namespace, "\n",
		"POST URL: ", soapInfo.pathname, "\n",
		"Content-Length: ", Buffer.byteLength(reqBody) );
	
	console.log( reqBody, "\n" );
    
    var request = client.request("POST", soapInfo.pathname,{
        'Host': soapHost,
        'SOAPAction': '',
        'Content-Type': 'application/soap+xml; charset=utf-8',
        'Content-Length': Buffer.byteLength(reqBody)
    });
    
    request.write( reqBody );
    
    var resBody = "";
    
    request.on( 'response', function(res){
        console.log( "Reponse code: " + res.statusCode );
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            resBody += chunk;
        });
        res.on('end', function(){
           self.emit('end', resBody);
        });
    });
    
    request.end();
}