##soapjs

# Info

This is a WIP soap client for node.js. Not quite functional yet.

# API goals:

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

# Dependencies

Depends on libxmljs right now which I have NOT included here.
http://github.com/polotek/libxmljs