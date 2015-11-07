"use strict";

// TEST
var elapsed;

// DOM
var canvas;
var mode;
var save;
var clear;
var cursor;
var plugin;
var extendStroke;

// State
var sampling = 2;
var ploma = null;
var w;// = 1300;
var h;// = 1000;
var isDrawing = false;

// WAMP session global
var connection;
var session;

// dictionary to store all plomas from all other client GUIDs
var plomaDictionary = {};

// create a unique ID for the client
function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
};

var GUID = guid();
console.log("My GUID is: " + GUID);

/////////////
// ONLOAD
/////////////
window.onload = function() {

    // load DOM elements
    canvas = document.getElementById('myCanvas');
    canvas.setAttribute('width', window.innerWidth);
    canvas.setAttribute('height', window.innerHeight);

    save = document.getElementById('save');
    clear = document.getElementById('clear');
    cursor = document.getElementById('cursor');
    plugin = document.getElementById('wtPlugin');

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
    extendStroke = ploma.extendStroke;

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
        isDrawing = true;

        ploma.beginStroke( e.clientX, e.clientY, 0.9 );
        session.publish("com.quill.beginStroke", [GUID, e.clientX, e.clientY, 0.9]);
    };
    canvas.onmousemove = function(e) {
        if (!isDrawing) return;

        ploma.extendStroke( e.clientX, e.clientY, 0.9 );
        session.publish("com.quill.extendStroke", [GUID, e.clientX, e.clientY, 0.9]);
    };
    canvas.onmouseup = function(e) {
        isDrawing = false;

        ploma.endStroke( e.clientX, e.clientY, 0.9 );
        session.publish("com.quill.endStroke", [GUID, e.clientX, e.clientY, 0.9]);
    };

    // timers
    //
    //var t1, t2;
    // fired when connection is established and session attached
    //
    connection.onopen = function (newSession, details) {
        console.log("Connected");

        session = newSession;

        // generic function to subscribe to a topic and receive events
        var subscribeEvent = function (eventName, func) {
            session.subscribe(eventName, func).then(
                function (sub) { 
                    console.log("subscribed to " + eventName); 
                },
                function (err) { 
                    console.log("error subscribing to " + eventName  + ": " + err); 
                });
        };

        function findOrCreatePloma(theirGUID) {
          if (theirGUID in plomaDictionary) {
            console.log("existing canvas found");
          } else {
            // if not, create a canvas and a ploma instance for the new GUID
            console.log("creating a new canvas for guid: " + theirGUID);
            var newCanvas = document.createElement('canvas');
            newCanvas.id = theirGUID; // because why not
            newCanvas.className = "plomaCanvas noselect"; // set it up the way the og canvas is
            newCanvas.setAttribute('width', window.innerWidth);
            newCanvas.setAttribute('height', window.innerHeight);

            // add our canvas to the DOM
            document.getElementById('canvases').appendChild(newCanvas);

            // load Ploma onto canvas and clear it
            var newPloma = new Ploma(newCanvas);
            newPloma.clear();

            // finally, add the new ploma to our dictionary for safekeeping
            plomaDictionary[theirGUID] = newPloma;
          }
        };

        // subscribe to new stroke event
        subscribeEvent("com.quill.beginStroke", function (args) {
            var theirGUID = args[0]; 

            findOrCreatePloma(theirGUID);

            if (theirGUID in plomaDictionary) {
              console.log("beginStroke: " + args);
              plomaDictionary[theirGUID].beginStroke(args[1], args[2], args[3]);
            } else {console.log("error begin");}
        });
        
        // subscribe to extend stroke event
        subscribeEvent("com.quill.extendStroke", function (args) {
            var theirGUID = args[0]; 

            // check if we've seen this GUID before
            if (theirGUID in plomaDictionary) {
                console.log("extendStroke: " + args);
                // add the stroke to the corresponding GUID's ploma instance
                plomaDictionary[theirGUID].extendStroke( args[1], args[2], args[3] );
            } else {console.log("error extend");}
        });

        // subscribe to end stroke event
        subscribeEvent("com.quill.endStroke", function (args) {
            var theirGUID = args[0]; 

            // check if we've seen this GUID before
            if (theirGUID in plomaDictionary) {
                console.log("endstroke: " + args);
                // add the stroke to the corresponding GUID's ploma instance
                plomaDictionary[theirGUID].endStroke( args[1], args[2], args[3] );
            } else {console.log("error end");}
        });

        // subscribe to the clear screen event 
        subscribeEvent("com.quill.clear", function () {
            ploma.clear();
        });

    };

     // fired when connection was lost (or could not be established)
    connection.onclose = function (reason, details) {
        console.log("Connection lost: " + reason);
    };

    // now actually open the connection
    connection.open();
}
