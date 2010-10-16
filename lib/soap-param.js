exports.SoapParam = SoapParam;

function SoapParam( name, value, type, definition ){
    this.name = name;
    this.defintion = definition;
    this.value = value;
    
    this.type = type;
    
    this.serialize_map = {
        "datetime" : this.serializeDate,
        "date": this.serializeDate,
        "string": this.serializeString,
        "boolean": this.serializeString,
        "number": this.serializeNumber,
        "decimal": this.serializeNumber,
        "array": this.serializeObject
    }
}

SoapParam.prototype.toXML = function(){
    return "<" + this.name + ">" +
                this.serialize( this.value ) +
            "</" + this.name + ">";
}

SoapParam.prototype.serializeSoapParam = function( value ){
    return value.toXML();
}

SoapParam.prototype.serialize = function( value ){
    try{
        var key = this.getType();
        console.log( this.serialize_map, key );
        return this.serialize_map[key](value);
    }
    catch(e){
        console.log( "Do not know how to serialize" );
        return false;
    }
}

SoapParam.prototype.getType = function( value ){
    return (this.type?
                this.type:
                (value?value.constructor.toString().split(" ")[1].split( "(" )[0]:false)
            ).toLowerCase();
}

SoapParam.prototype.serializeObject = function( value ){
    s = "";
    for( prop in value ){
        s += "<" + prop + ">" +
                this.serialize( value[prop] ) +
            "</" + prop + ">";
    }
    return s;
}

SoapParam.prototype.serializeString = function( value ){
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
    return year + "-" + month + "-" + date + "T" + hours + ":" + minutes + ":" + seconds + "." + milliseconds + timezone;
}

SoapParam.prototype.copy = function(){
    return new SoapParam(this.name, this.value, this.type);
}

SoapParam.prototype.setValue = function( value ){
    if( typeof( value ) == "object" ){
        for( prop in value ){
            this.value[prop].setValue( value[prop] );
        }
    }
    else{
        console.log( "Setting value of " + this.name + " to " + value + " type: " + this.type );
        this.value = value;
    }
}