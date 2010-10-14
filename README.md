# soapjs - A client to interact with soap web services in node.js

Info
----------

* Create functions at runtime with optional param checking
* Not quite funtional yet
* Contact: jmoyers@gmail.com
* Focusing on a specific wsdl for now (with complex types)
* TODO: local file caching for wsdl, loading wsdl from fs, support per operation soapAction

Current status: the below example creates xml with a proper soap envelope, getting a 400 (malformed), from the server I'm testing with. Suspect namespacing on operation tags.


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

* [http://github.com/ry/node]
* [http://github.com/polotek/libxmljs]
