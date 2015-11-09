"use strict";

// DOM
var canvas;
var mode;
var save;
var clear;
var cursor;

// State
var ploma = null;
var isDrawing = false;

// WAMP session globals
var connection;
var session;

// dictionary to store all plomas from all other client GUIDs
var plomaDictionary = {};

// ONLOAD
window.onload = function() {

    // load DOM elements
    canvas = document.getElementById('myCanvas');
    canvas.setAttribute('width', window.innerWidth);
    canvas.setAttribute('height', window.innerHeight);

    save = document.getElementById('save');
    clear = document.getElementById('clear');
    cursor = document.getElementById('cursor');

    // set up autobahn WAMP connection
    var wsuri;
    if (document.location.origin == "file://") {
        wsuri = "ws://127.0.0.1:8080/ws";
    } else {
        wsuri = (document.location.protocol === "http:" ? "ws:" : "wss:") + "//" +
            document.location.host + "/ws";
    }

    // the WAMP connection to the Router
    connection = new autobahn.Connection({
        url: wsuri,
        realm: "realm1"
    });

    // load Ploma onto canvas and clear it
    ploma = new Ploma(canvas);
    ploma.clear();

    ////////////
    // BUTTONS
    ////////////
    save.onclick = function(e) {
        window.open(canvas.toDataURL());
    };

    clear.onclick = function(e) {
        ploma.clear();
        session.publish("com.quill.clear");
    };

    cursor.onclick = function(e) {
        // TODO: UPDATE CHECKBOX OR IMAGE ON BUTTON
        if(canvas.style.cursor === 'none') {
            document.getElementById('cursor-icon').setAttribute('src', 'img/cursor-24.png');
            canvas.style.cursor = 'crosshair';
        } else {
            document.getElementById('cursor-icon').setAttribute('src', 'img/cursor-24-75.png');
            canvas.style.cursor = 'none';
        }
    };

    // RESIZE
    window.onresize = function(e) {
        ploma.resize(window.innerWidth, window.innerHeight);
    };

    // MOUSE EVENT
    canvas.onmousedown = function(e) {
        // we use this to make sure we're capturing a full pen stroke
        // and not random mouse movement
        isDrawing = true; 

        ploma.beginStroke( e.clientX, e.clientY, 0.9 );
        session.publish("com.quill.beginStroke", [e.clientX, e.clientY, 0.9]);
    };
    canvas.onmousemove = function(e) {
        if (!isDrawing) return;

        ploma.extendStroke( e.clientX, e.clientY, 0.9 );
        session.publish("com.quill.extendStroke", [e.clientX, e.clientY, 0.9]);
    };
    canvas.onmouseup = function(e) {
        isDrawing = false;

        ploma.endStroke( e.clientX, e.clientY, 0.9 );
        session.publish("com.quill.endStroke", [e.clientX, e.clientY, 0.9]);
    };

    // pub/sub to WAMP events
    connection.onopen = function (newSession, details) {
        console.log("Connected!");

        // set the global so our other functions can publish their events
        session = newSession;
        console.log("My WAMP session ID is : " + session.id);

        // reveal our session ID on every publish
        session.publisher_disclose_me = true;

        // for debugging, log who all is subscribed when we open our connection
        session.call("wamp.subscription.lookup", 
        ["com.quill.beginStroke", { match: "wildcard" }])
        .then(session.log, session.log)

        function createPlomaForSessionID(theirID) {
            // make sure we don't have this one already (and that it's not ours
            if (theirID in plomaDictionary) {
                console.log("error: existing canvas found", theirID);
            } else if (theirID == session.id) {
                console.log("normal: don't want to add ourselves again", theirID);
            } else {
                // if not, create a canvas and a ploma instance for the new GUID
                console.log("creating a new canvas for guid: " + theirID);

                var newCanvas = document.createElement('canvas');
                newCanvas.id = theirID; // because why not
                newCanvas.className = "plomaCanvas noselect"; 
                newCanvas.setAttribute('width', window.innerWidth);
                newCanvas.setAttribute('height', window.innerHeight);

                // add our canvas to the DOM
                document.getElementById('canvases').appendChild(newCanvas);

                // load Ploma onto canvas and clear it
                var newPloma = new Ploma(newCanvas);
                newPloma.clear();

                // finally, add the new ploma to our dictionary for safekeeping
                plomaDictionary[theirID] = newPloma;
            }
        };

        // subscribe to "session.on_join" to keep an up-to-date client list
        // TODO: I don't think subscribing to 'session.on_leave' makes much sense:
        //  the only real action to take on_leave would be to remove the client ID
        //  from the list, but we don't want to remove their canvas so that seems pointless
        // REAL solution is to implement authorization and id/write to the canvas
        //  based on authID rather than the ever-shifting sessionID
        var topic = "wamp.session.on_join";
        session.subscribe(topic, function(args, kwargs, details) {
            console.log("on_join sessionID detected: " + args[0].session);
            createPlomaForSessionID(args[0].session);
        }).then(
            function (sub) {
                console.log('Subscribed to meta topic ' + topic);
            },
            function (err) {
                console.log('Failed to subscribe to meta topic ' + topic, err);
            }
        );

        // for our first action as a new subscriber, get the list of all subscribers
        // and then create a canvas for each subscriber
        session.call("wamp.session.list").then(
            function (sessions) {
                console.log("Current session IDs on realm", sessions);
                for (var i = 0; i < sessions.length; ++i) {
                    createPlomaForSessionID(sessions[i]);
                }
            },
            function (err) {
                console.log("Could not retrieve subscription for topic", err);
            }
        );

        // generic function to subscribe to a topic and receive events
        var subscribeEvent = function (eventName, func) {
            session.subscribe(eventName, func).then(
                function (sub) { 
                    console.log("subscribed to " + eventName); 
                },
                function (err) { 
                    console.log("error subscribing to " + eventName  + ": " + err); 
                }
            );
        };

        // subscribe to new stroke event
        subscribeEvent("com.quill.beginStroke", function (args, kwargs, details) {
            var theirGUID = details.publisher; 

            console.log("details.publisher: " + details.publisher);
            //findOrCreatePloma(theirGUID);

            if (theirGUID in plomaDictionary) {
                console.log("beginStroke: " + args);
                plomaDictionary[theirGUID].beginStroke(args[0], args[1], args[2]);
            } else {
                console.log("error begin");
            }
        });

        // subscribe to extend stroke event
        subscribeEvent("com.quill.extendStroke", function (args, kwargs, details) {
            var theirGUID = details.publisher; 

            if (theirGUID in plomaDictionary) {
                console.log("extendStroke: " + args);
                plomaDictionary[theirGUID].extendStroke(args[0], args[1], args[2]);
            } else {
                console.log("error extend");
            }
        });

        // subscribe to end stroke event
        subscribeEvent("com.quill.endStroke", function (args, kwargs, details) {
            var theirGUID = details.publisher; 

            if (theirGUID in plomaDictionary) {
                console.log("endstroke: " + args);
                plomaDictionary[theirGUID].endStroke(args[0], args[1], args[2]);
            } else {
                console.log("error end: " + args);
            }
        });

        // subscribe to the clear screen event 
        subscribeEvent("com.quill.clear", function (args, kwargs, details) {
            var theirGUID = details.publisher; 

            if (theirGUID in plomaDictionary) {
                console.log("clear: " + args);
                plomaDictionary[theirGUID].clear();
            } else {
                console.log("error clear: " + args);
            }
        });

    };

    // fired when connection was lost (or could not be established)
    connection.onclose = function (reason, details) {
        console.log("Connection lost: " + reason);
    };

    // now actually open the connection
    connection.open();
}
