var http = require("http"),
    url = require("url"),
    util = require("util"),
    events = require("events"),
    parser = require('libxmljs');

exports.createClient = function(wsdl){
    var c = new SoapClient(wsdl);
    return c;
}

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
    var self = this;
    
    var defaultNamespace = "http://schemas.xmlsoap.org/wsdl/";
    var typeNamespace = "http://www.w3.org/2001/XMLSchema";
    
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
                vars[paramSequence[x].attr("name").value()] = new SoapParam(
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
                
                self.invoke(self.functions[iter].name, params);
                return self;
            }   
        })(i);
    }
    
    this.emit( "ready" );
}

SoapClient.prototype.createHeader = function(){
	// May have to define the target namespace and use that
	// rather the the default xmlns on the operation tags
    return "<?xml version=\"1.0\" encoding=\"utf-8\"?>" +
				"<soap:Envelope " +
				"xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" " +
				"xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" " +
				"xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\">";
}

SoapClient.prototype.createBody = function( method, params ){
    var param_string = "";
    if( params.constructor == Array ){
        for( prop in params ){
            param_string += params[prop].toXML();
        }
    }
    else{
        param_string = params.toXML();
    }
    return "<soap:Body>\n" +
			"<" + method + " xmlns=\"" + this.namespace + "\">\n" +
			param_string + "\n"
			"</" + method + "></soap:Body>\n";
}

SoapClient.prototype.createFooter = function(){
    return "</soap:Envelope>\n";
}

SoapClient.prototype.invoke = function( method, params ){
    var self = this;
    var reqBody = this.createHeader();
    reqBody += this.createBody(method, params);
    reqBody += this.createFooter();
    
    var info = url.parse( this.WSDL );
    
    var client = http.createClient(info.port,info.hostname);
    var soapAction = ((this.namespace.lastIndexOf("/") != this.namespace.length - 1) ?
                      this.namespace + "/" : this.namespace) + method;
	
    var request = client.request("POST",this.WSDL,{
        'host': info.host,
        'SOAPAction': soapAction,
        'Content-Type': 'application/soap+xml; charset=utf-8',
        'Content-Length: ': Buffer.byteLength(reqBody)
    });
    
    console.log( reqBody );
    request.write( reqBody );
    
    var resBody = "";
    
    request.on( 'response', function(res){
        console.log( "Reponse code: " + res.statusCode );
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            resBody += chunk;
        });
        res.on('end', function(){
           self.emit('response', resBody);
        });
    });
    
    request.end();
}

exports.createParam = function(name, value){
    var p = new SoapParam(name,value);
    return p;
}

function SoapParam( name, value, type ){
    this.name = name;
    this.value = value;
    this.type = type;
    
    this.serialize_map = {
        "Date": this.serializeDate,
        "xs:string": this.serializeString,
        "String": this.serializeString,
        "Boolean": this.serializeString,
        "Number": this.serializeNumber,
        "Array": this.serializeObject
    }
}

SoapParam.prototype.toXML = function(){
    return "<" + this.name + ">\n" +
                this.serialize( this.value ) +
            "</" + this.name + ">\n";
}

SoapParam.prototype.serialize = function( value ){
    try{
        var key = false;
        if( typeof this.type == "undefined" || !this.type ){
            key = value.constructor.toString().split(" ")[1].split( "(" )[0];
        }
        else{
            key = this.type;
        }
        return this.serialize_map[key](value);
    }
    catch(e){ return false; }
}

SoapParam.prototype.serializeObject = function( value ){
    s = "";
    for( prop in value ){
        s += "<" + prop + ">\n" +
                this.serialize( value[prop] ) +
            "\n</" + prop + ">\n";
    }
    return s;
}

SoapParam.prototype.serializeString = function( value ){
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + "\n";
}

SoapParam.prototype.serializeDate = function( value ){
    var year = value.getFullYear().toString();
    var month = (value.getMonth() + 1).toString(); month = (month.length == 1) ? "0" + month : month;
    var date = value.getDate().toString(); date = (date.length == 1) ? "0" + date : date;
    var hours = value.getHours().toString(); hours = (hours.length == 1) ? "0" + hours : hours;
    var minutes = value.getMinutes().toString(); minutes = (minutes.length == 1) ? "0" + minutes : minutes;
    var seconds = value.getSeconds().toString(); seconds = (seconds.length == 1) ? "0" + seconds : seconds;
    var milliseconds = value.getMilliseconds().toString();
    var tzminutes = Math.abs(value.getTimezoneOffset());
    var tzhours = 0;
    while(tzminutes >= 60)
    {
        tzhours++;
        tzminutes -= 60;
    }
    tzminutes = (tzminutes.toString().length == 1) ? "0" + tzminutes.toString() : tzminutes.toString();
    tzhours = (tzhours.toString().length == 1) ? "0" + tzhours.toString() : tzhours.toString();
    var timezone = ((value.getTimezoneOffset() < 0) ? "+" : "-") + tzhours + ":" + tzminutes;
    return year + "-" + month + "-" + date + "T" + hours + ":" + minutes + ":" + seconds + "." + milliseconds + timezone + "\n";
}

SoapParam.prototype.copy = function(){
    return new SoapParam(this.name, this.value, this.type);
}