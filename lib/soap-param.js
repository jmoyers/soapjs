exports.SoapParam = SoapParam;

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
    return "<" + this.name + ">" +
                this.serialize( this.value ) +
            "</" + this.name + ">";
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