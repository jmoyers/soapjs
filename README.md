# soapjs - A client to interact with soap web services in node.js

Info
----------

    This is a WIP soap client for node.js. Not quite functional yet.

API Goals
----------

    // Download the wsdl, and create your functions at runtime
    var c = soap.createClient( wsdl );

    // Emit when we're done with instantiation from wsdl
    c.on( "ready", function(){
    
        // Call a method from the wsdl, which is created at runtime
        // It will be optionally typed (using the wsdl as the basis)
        c.GetSUID({
            "userid": "jmoyers@gmail.com"
        }).on("response", function( resp ){
            console.log( "Response from server:" );
            console.log( resp );
        });
    
        // For debugging in general
        c.getFunctions( showParams );
        c.getTypes();
    });

Dependencies
-------------

* http://github.com/ry/node
* http://github.com/polotek/libxmljs
