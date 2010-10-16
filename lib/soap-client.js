var rest = require('../../restler/lib/restler'),
    url = require('url'),
    util = require('util'),
    events = require('events'),
    parser = require('libxmljs'),
    sparam = require('./soap-param'),
    srequest = require('./soap-request');

exports.SoapClient = SoapClient;

function SoapClient(wsdl, options){
    events.EventEmitter.call( this );

	this.options = options;
    this.wsdl = wsdl;
    this.wsdlContent = "";
    this.namespace = "";
	
	for( prop in options ){
		this[prop] = options[prop];
	}
	
    this.on( "wsdlLoaded", this.parseWSDL )
    
    this.retrieveWSDL();
	
	this.simpleTypes = ["string","boolean","int",
						"long", "double", "dateTime", "decimal"];
	
	this.complexTypeCache = {};
}

util.inherits( SoapClient, events.EventEmitter );

SoapClient.prototype.retrieveWSDL = function(){
    var self = this;
    var info = url.parse(this.wsdl);
	
	var endpoint = this.wsdl;
	
	if( typeof(this.username) != "undefined" && typeof(this.password) != "undefined" ){
		endpoint = info.protocol + "//" + this.username + ":" + this.password + "@" + info.hostname + info.pathname + info.search;
	}
	
    var request = rest.get(endpoint).on( "complete", function(data){
		self.wsdlContent = data;
		self.emit('wsdlLoaded');
	});
}

SoapClient.prototype.parseWSDL = function(){
    var self = this;
    
    var defaultNamespace = "http://schemas.xmlsoap.org/wsdl/";
    var typeNamespace = "http://www.w3.org/2001/XMLSchema";
	var soapNamespace = "http://schemas.xmlsoap.org/wsdl/soap/";
    
    var doc = parser.parseXmlString( this.wsdlContent );
    
    this.namespace = doc.get(".").attr( "targetNamespace" ).value();
    
    var types = doc.find("//xmlns:element", typeNamespace );
    var function_defs = doc.find("//xmlns:portType/xmlns:operation", defaultNamespace);
    
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
            
			input_name = input.attr("element").value().split(":")[1];
			
			vars = this.resolveComplexType( input_name, doc, typeNamespace );
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
                    if( typeof self.functions[iter].vars[prop] != "undefined" ){
                        // Copy the object as a prototype
                        var param = self.functions[iter].vars[prop].copy();
						
						param.setValue( param_obj[prop] );
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
	
    this.emit( "ready" );
}

SoapClient.prototype.invoke = function( method, params ){
    var self = this;
    var req = new srequest.SoapRequest(method, params, this.wsdl, this.namespace, this.location);
    req.end();
    return req;
}

SoapClient.prototype.isSimpleType = function( type ){
	return this.simpleTypes.indexOf( type ) == -1? false : true;
}

SoapClient.prototype.resolveComplexType = function( typeName, doc, typeNamespace, level ){
	if( typeof( level ) == "undefined" ){ level = 0; }
	var paramSequence = this.lookupComplexType( typeName, doc, typeNamespace );
	
	if( typeof(this.complexTypeCache[typeName.toLowerCase()]) != "undefined" ){
		return this.complexTypeCache[typeName.toLowerCase()];
	}
	
	var vars = {};
	
	for( var x = 0; x < paramSequence.length; x++ ){
		// Need to handle a nested type lookup -- the name could refer to
		// another complex type, so we should resolve it
		var curr_name = paramSequence[x].attr("name").value();
		var curr_type = paramSequence[x].attr("type").value();
		
		curr_type = curr_type.split(":");
		
		if( curr_type[1] && !this.isSimpleType( curr_type[1] ) ){
			vars[curr_name] = new sparam.SoapParam(
				curr_name,
				this.resolveComplexType(curr_type[1], doc, typeNamespace, level+1),
				curr_type[1]
			);
		}
		else{
			vars[curr_name] = new sparam.SoapParam(
				curr_name,
				false,
				curr_type[1]
			);
		}
	}
	
	this.complexTypeCache[typeName.toLowerCase()] = vars;
	
	return vars;
}

SoapClient.prototype.lookupComplexType = function( typeName, doc, typeNamespace ){
	 var paramSequenceLookup = "//xmlns:complexType[@name='"+typeName+"']/xmlns:sequence/xmlns:element";
    paramSequence = doc.find(paramSequenceLookup, typeNamespace);
    return paramSequence;
}

SoapClient.prototype.describe = function( method ){
	// All quite expensive and lame. I'm being lazy since these are all
	// likely one time costs to aid in debugging etc.
	
	for( prop in this ){
		if( this[prop] == method ){
			for( var i = 0; i < this.functions.length; i++ ){
				if( prop == this.functions[i].name ){
					method = this.functions[i];
				}
			}
		}
	}
	
	if( typeof method == "object" ){
		var desc = {}
		desc.name = method.name;
		var vars = method.vars;
		desc.vars = {}
		for( prop in vars ){
			if( this.isSimpleType( vars[prop].getType() ) ){
				desc.vars[vars[prop].name] = vars[prop].getType();
			}
			else{
				desc.vars[vars[prop].name] = this.complexTypeCache[vars[prop].getType()];
			}
		}
		console.log( desc );
	}
	else{
		console.log( "Method not found." );
	}
}