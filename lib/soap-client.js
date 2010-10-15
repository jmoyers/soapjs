var http = require('http'),
    url = require('url'),
    util = require('util'),
    events = require('events'),
    parser = require('libxmljs'),
    sparam = require('./soap-param'),
    srequest = require('./soap-request');

exports.SoapClient = SoapClient;

function SoapClient(WSDL){
    events.EventEmitter.call( this );
    
    this.WSDL = WSDL;
    this.WSDLContent = "";
    this.namespace = "";
    
    this.on( "wsdlLoaded", this.parseWSDL )
    
    this.retrieveWSDL();
}

util.inherits( SoapClient, events.EventEmitter );

SoapClient.prototype.retrieveWSDL = function(){
    var self = this;
    var info = url.parse(this.WSDL);
	
    var client = http.createClient(info.port,info.hostname);
    var request = client.request("GET",this.WSDL,{
        'host': info.host
    });
    
    request.on( 'response', function(res){
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            self.WSDLContent += chunk;
        });
        res.on('end', function(){
           self.emit('wsdlLoaded');
        });
    });
    
    request.end();
}

SoapClient.prototype.parseWSDL = function(){
	var start =  new Date().getMilliseconds();
	console.log( "Start: " + start );
    var self = this;
    
    var defaultNamespace = "http://schemas.xmlsoap.org/wsdl/";
    var typeNamespace = "http://www.w3.org/2001/XMLSchema";
	var soapNamespace = "http://schemas.xmlsoap.org/wsdl/soap/";
    
    var doc = parser.parseXmlString( this.WSDLContent );
    
    this.namespace = doc.get(".").attr( "targetNamespace" ).value();
    
    var types = doc.find("//xmlns:element", typeNamespace );
    var function_defs = doc.find("//xmlns:portType/xmlns:operation", defaultNamespace);
    
    console.log( "Namespace " + this.namespace );
    console.log( "Types " + types.length );
    console.log( "Functions " + function_defs.length )
    
    this.functions = [];
    
    for( var i = 0; i < function_defs.length; i++ ){
        var name = function_defs[i].attr( "name" ).value();
        var vars = {};
        
        var input = false;
        var input_name = false;
        
        try{
            input = function_defs[i].get("./xmlns:input", defaultNamespace).attr( "message" ).value();
        }
        catch(e){}
        
        if( input ){
            var messageLookup = "//xmlns:message[@name='"+input.split(":")[1]+"']";
            input = doc.get(messageLookup, defaultNamespace)
                    .get("./xmlns:part", defaultNamespace);
            input_name = input.attr( "name" ).value();
            
            var paramSequenceLookup = "//xmlns:complexType[@name='"+input_name+"']/xmlns:sequence/xmlns:element";
            paramSequence = doc.find(paramSequenceLookup, typeNamespace);
                  
            for( var x = 0; x < paramSequence.length; x++ ){
                vars[paramSequence[x].attr("name").value()] = new sparam.SoapParam(
                    paramSequence[x].attr("name").value(),
                    false,
                    paramSequence[x].attr("type").value()
                );
            }
        }
        
        var output = false;
        var output_name = false;
        
        try{
            output = function_defs[i].get("./xmlns:output", defaultNamespace).attr( "message" ).value();
        }
        catch(e){}
        
        var function_def = {
            name: name,
            vars: vars,
            input: input_name
        };
               
        this.functions.push(function_def);
    }
    
    for( var i = 0; i < this.functions.length; i++ ){
        (function(iter){
            self[self.functions[iter].name] = function(param_obj){
                if( typeof( self.functions[iter] ) == "undefined" ){
                    return;
                }
                var params = [];
                for( prop in param_obj ){
                    console.log( prop );
                    if( typeof self.functions[iter].vars[prop] != "undefined" ){
                        // Copy the object as a prototype
                        var param = self.functions[iter].vars[prop].copy();
						
						param.value = param_obj[prop];
                        params.push( param );
                    }
                };
                
                return self.invoke(self.functions[iter].name, params);
            }   
        })(i);
    }
	
	var locationLookup = "//def:service/def:port/soap:address";
    this.location = doc.get(locationLookup, {
		"def": defaultNamespace,
		"soap": soapNamespace
	}).attr("location").value();
	
	console.log( "Location " + this.location );
	
	console.log( "Parse done: " + (new Date().getMilliseconds() - start) );
    
    this.emit( "ready" );
}

SoapClient.prototype.invoke = function( method, params ){
    var self = this;
    var req = new srequest.SoapRequest(method, params, this.WSDL, this.namespace, this.location);
    req.end();
    return req;
}