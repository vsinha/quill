window.onload = function() {
    // the URL of the WAMP Router (Crossbar.io)

    var wsuri;
    if (document.location.origin == "file://") {
        wsuri = "ws://127.0.0.1:8080/ws";
    } else {
        wsuri = (document.location.protocol === "http:" ? "ws:" : "wss:") + "//" +
        document.location.host + "/ws";
    }
    // the WAMP connection to the Router
    //
    var connection = new autobahn.Connection({
        url: wsuri,
        realm: "realm1"
    });
    // timers
    //
    var t1, t2;
    // fired when connection is established and session attached
    //
    connection.onopen = function (session, details) {
        console.log("Connected");
        // SUBSCRIBE to a topic and receive events
        //
        function on_counter (args) {
           var counter = args[0];
           console.log("on_counter() event received with counter " + counter);
        }
        session.subscribe('com.quill.testClientCounter', on_counter).then(
            function (sub) {
                console.log('subscribed to topic');
            },
            function (err) {
                console.log('failed to subscribe to topic', err);
            }
        );
        // PUBLISH an event every second
        //
        var serverCounter = 0;
        t1 = setInterval(function () {
           session.publish('com.quill.testServerCounter', ['Hello from the client: ' + serverCounter]);
           console.log("published to topic 'com.quill.testServerCounter' value: " + serverCounter);
           serverCounter += 1;
        }, 1000);
    };
     // fired when connection was lost (or could not be established)
     //
    connection.onclose = function (reason, details) {
        console.log("Connection lost: " + reason);
        if (t1) {
            clearInterval(t1);
            t1 = null;
        }
        if (t2) {
           clearInterval(t2);
           t2 = null;
        }
    }
    // now actually open the connection
    //
    connection.open();
};