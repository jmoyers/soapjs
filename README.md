# A client to interact with soap web services in node.js

## Currently unmaintained -- use at your own risk. This was literally built before npm, package.json and the rest were popular.

API Goals
----------

    // Download the wsdl, and create your functions at runtime
    // Using optional http auth. WSDL address and endpoints can be https
    var c = soap.createClient(wsdl, {
        username: 'username',
        password: 'password'
    });

    // Emit when we're done with instantiation from wsdl
    c.on( "ready", function(){
    
        // Call a method from the wsdl, which is created at runtime
        // It will be optionally typed (using the wsdl as the basis)
        var request = c.GetSUID({
            "userid": "jmoyers@gmail.com"
        })
        
        request.on("end", function( data ){
            console.log( "JSON formatted data from server:" );
            console.log( data );
            console.log( "Actual xml request body generated by invoking runtime method:" );
            console.log( request.requestBody );
            console.log( request.responseBody );
        });
    });


WSDL Introspection
-------------------

For instance, consuming a jBilling soap wsdl gives us the following using repl tab complete:

<pre>
c._events                     c.applyPayment                c.authenticate                c.complexTypeCache            c.create
c.createInvoice               c.createItem                  c.createOrder                 c.createOrderAndInvoice       c.createOrderPreAuthorize
c.createUser                  c.deleteInvoice               c.deleteOrder                 c.deleteUser                  c.functions
c.getAllItemCategories        c.getAllItems                 c.getCurrentOrder             c.getInvoiceWS                c.getInvoicesByDate
c.getItem                     c.getItemByCategory           c.getLastInvoices             c.getLastInvoicesByItemType   c.getLastOrders
c.getLastOrdersByItemType     c.getLastPayments             c.getLatestInvoice            c.getLatestInvoiceByItemType  c.getLatestOrder
c.getLatestOrderByItemType    c.getLatestPayment            c.getOrder                    c.getOrderByPeriod            c.getOrderLine
c.getPayment                  c.getUserContactsWS           c.getUserId                   c.getUserInvoicesByDate       c.getUserItemsByCategory
c.getUserTransitions          c.getUserTransitionsAfterId   c.getUserWS                   c.getUsersByCreditCard        c.getUsersByCustomField
c.getUsersByStatus            c.getUsersInStatus            c.getUsersNotInStatus         c.isUserSubscribedTo          c.location
c.namespace                   c.options                     c.password                    c.payInvoice                  c.processPayment
c.rateOrder                   c.rateOrders                  c.simpleTypes                 c.updateCreditCard            c.updateCurrentOrder
c.updateItem                  c.updateOrder                 c.updateOrderLine             c.updateUser                  c.updateUserContact
c.username                    c.validateMultiPurchase       c.validatePurchase            c.wsdl                        c.wsdlContent

> c.describe( c.createUser );
{ name: 'createUser',
  vars: 
   { arg0: 
      { autoRecharge: [Object],
        balanceType: [Object],
        blacklistMatches: [Object],
        childIds: [Object],
        contact: [Object],
        createDatetime: [Object],
        creditCard: [Object],
        creditLimit: [Object],
        currencyId: [Object],
        deleted: [Object],
        dynamicBalance: [Object],
        failedAttempts: [Object],
        invoiceChild: [Object],
        isParent: [Object],
        language: [Object],
        languageId: [Object],
        lastLogin: [Object],
        lastStatusChange: [Object],
        mainOrderId: [Object],
        mainRoleId: [Object],
        owingBalance: [Object],
        parentId: [Object],
        partnerId: [Object],
        password: [Object],
        role: [Object],
        status: [Object],
        statusId: [Object],
        subscriberStatusId: [Object],
        userId: [Object],
        userIdBlacklisted: [Object],
        userName: [Object] } } }
>

</pre>
