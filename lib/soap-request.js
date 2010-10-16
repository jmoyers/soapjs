var http = require('http'),
    url = require('url'),
    util = require('util'),
    events = require('events'),
    sparam = require('./soap-param'),
	parser = require('libxmljs'),
	rest = require('../../restler/lib/restler');
    
exports.SoapRequest = SoapRequest;

function SoapRequest(method, params, url, namespace, soapAddress){
    events.EventEmitter.call( this );
    
    this.method = method;
    this.params = params;
    this.url = url;
	this.namespace = namespace;
	this.soapAddress = soapAddress;
	
	this.requestBody = false;
	this.responseBody = false;
	
	this.on( "soapcomplete", this.parseXML );
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
 
    this.requestBody = this.createHeader();
    this.requestBody += this.createBody(this.method, this.params);
    this.requestBody += this.createFooter();
    
    var info = url.parse(this.url);
    var port = info.port ? info.port : 80;
	var hostname = info.hostname;
	
	var soapInfo = url.parse(this.soapAddress);
	var soapHost = soapInfo.host;
	
	rest.post(info.protocol + "//" + info.host + info.pathname, {
		data: self.requestBody,
		headers: {
			'Host': soapHost,
			'SOAPAction': '',
			'Content-Type': 'application/soap+xml; charset=utf-8',
			'Content-Length': Buffer.byteLength(self.requestBody)
		}
	}).on('complete', function(data, response) {
		self.responseBody = data;
		self.emit( 'soapcomplete', data );
	});
}

SoapRequest.prototype.parseXML = function( xml ){
	var envelopeNamespace = "http://schemas.xmlsoap.org/soap/envelope/";
	var bodyQuery = "//xmlns:Body/*";
	var doc = parser.parseXmlString( xml );
	
	var body = doc.find( bodyQuery, envelopeNamespace );
	
	var obj = {}
	obj[body[0].name()] = this.elementToJSON( body[0] );
	
	this.emit( "end", obj );
}

SoapRequest.prototype.elementToJSON = function( element ){
	var obj = {};
	var children = element.childNodes()
	if( children.length == 0 ){
		return element.text();
	}
	for( var i = 0; i < children.length; i++ ){
		if( children[i].name() != "text" ){
			obj[children[i].name()] = this.elementToJSON( children[i] );
		}
		else{
			return children[i].text();
		}
	}
	return obj;
}