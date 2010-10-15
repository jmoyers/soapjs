# soapjs - A client to interact with soap web services in node.js

Info
----------

* Create functions at runtime with optional param checking
* Not quite funtional yet
* Contact: jmoyers@gmail.com
* Focusing on a specific wsdl for now (with complex types)
* TODO:
    1. local file caching for wsdl,
    2. loading wsdl from fs,
    3. support per operation soapAction,
    4. http basic auth,
    5. printing the signature of a given method after parse
    6. testing on a wsdl other than the one I'm using ;-)

Current status: Basically working with the one wsdl sample I'm using. Next steps are to standardize on restler, add a signature fetch and display function, add http basic auth support


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

* [ry/node](http://github.com/ry/node)
* [polotek/libxmljs](http://github.com/polotek/libxmljs)
