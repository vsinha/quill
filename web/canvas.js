"use strict";

// TEST
var elapsed;

// DOM
var canvas;
var mode;
var save;
var clear;
var cursor;
var texture;
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

// Red Pixel
var r = new Uint8ClampedArray(16);
var rid;
r[0] = 255;
r[3] = 255;
r[4] = 255;
r[7] = 255;
r[8] = 255;
r[11] = 255;
r[12] = 255;
r[15] = 255;

/////////////
// ONLOAD
/////////////
window.onload = function() {

    // load DOM elements
    canvas = document.getElementById('canvas');
    canvas.setAttribute('width', window.innerWidth);
    canvas.setAttribute('height', window.innerHeight);
    mode = document.getElementById('mode');
    save = document.getElementById('save');
    clear = document.getElementById('clear');
    cursor = document.getElementById('cursor');
    texture = document.getElementById('texture');
    plugin = document.getElementById('wtPlugin');
    //mode.innerHTML = sampling;
    //texture.innerHTML = "T";

    // set up autobahn WAMP connection
    var wsuri;
    if (document.location.origin == "file://") {
        wsuri = "ws://127.0.0.1:8080/ws";
    } else {
        wsuri = (document.location.protocol === "http:" ? "ws:" : "wss:") + "//" +
        document.location.host + "/ws";
    }

    // the WAMP connection to the Router
    //
    connection = new autobahn.Connection({
        url: wsuri,
        realm: "realm1"
    });


    // populate red pixel
    rid = canvas.getContext('2d').createImageData(2, 2);
    rid.data.set(r);

    // load Ploma onto canvas and clear it
    ploma = new Ploma(canvas);
    ploma.clear();
    extendStroke = ploma.extendStroke;

    ////////////
    // BUTTONS
    ////////////
    /*mode.onclick = function(e) {
      sampling = (sampling === 2) ? 0 : sampling + 1;
      ploma.setSample(sampling);
      mode.innerHTML = sampling; 
    }*/
    save.onclick = function(e) {
      window.open(canvas.toDataURL());
    }
    clear.onclick = function(e) {
      ploma.clear();
    }
    cursor.onclick = function(e) {
      // TODO: UPDATE CHECKBOX OR IMAGE ON BUTTON
      if(canvas.style.cursor === 'none') {
        document.getElementById('cursor-icon').setAttribute('src', 'img/cursor-24.png');
        canvas.style.cursor = 'crosshair';
      } else {
        document.getElementById('cursor-icon').setAttribute('src', 'img/cursor-24-75.png');
        canvas.style.cursor = 'none';
      }
    }
    /*texture.onclick = function(e) {
      ploma.toggleTexture();
      if (texture.innerHTML === "T") {
        texture.innerHTML = "N";
      } else {
        texture.innerHTML = "T";
      }
    }*/

    ////////////
    // RESIZE
    ////////////
    window.onresize = function(e) {
      ploma.resize(window.innerWidth, window.innerHeight);
    }

    // bind device input events
    /*if(window.PointerEvent) {
      ///////////////////////////////////
      // POINTER EVENT
      ///////////////////////////////////
      canvas.onpointerdown = function(e) {
        ploma.beginStroke(
          e.clientX,
          e.clientY,
          e.pressure
        );
        isDrawing = true;
      }
      canvas.onpointermove = function(e) {
        if (!isDrawing) return;
        ploma.extendStroke(
          e.clientX,
          e.clientY,
          e.pressure
        );
      }
      canvas.onpointerup = function(e) {
        ploma.endStroke(
          e.clientX,
          e.clientY,
          e.pressure
        );
        isDrawing = false;
      }
    } else {*/
    ///////////////////////////////////
    // MOUSE EVENT
    ///////////////////////////////////
    canvas.onmousedown = function(e) {
        isDrawing = true;
        if (sampling === 0) return;
        ploma.beginStroke(
          e.clientX,
          e.clientY,
          0.9
        );
    }
    canvas.onmousemove = function(e) {
        if (!isDrawing) return;
        //elapsed = Date.now();
        if (sampling === 0) {
          //console.log(Date.now() - elapsed);
          canvas.getContext('2d').putImageData(
            rid,
            e.clientX,
            e.clientY,
            0,
            0,
            2,
            2
          );
          return;
        }
        ploma.extendStroke(
          e.clientX,
          e.clientY,
          0.9
        );
    }
    canvas.onmouseup = function(e) {
        isDrawing = false;
        if (sampling === 0) return;
        ploma.endStroke(
          e.clientX,
          e.clientY,
          0.9
        );
        var curstroke = ploma.curStroke();
        console.log("publishing curstroke: " + JSON.stringify(curstroke));
        session.publish('com.quill.newStroke',curstroke); 
    }

    // timers
    //
    //var t1, t2;
    // fired when connection is established and session attached
    //
    connection.onopen = function (newSession, details) {
        console.log("Connected");
        session = newSession;
        // SUBSCRIBE to a topic and receive events
        //

        // subscribe to new stroke event
        function newStroke (stroke) {

            console.log("New stroke: " + JSON.stringify(stroke));
            //TODO where in 'args' is this information actually
            ploma.setStrokes(stroke);
        }
        session.subscribe('com.quill.newStroke', newStroke).then(
            function (sub) {
                console.log("subscribed to newStroke");
            },
            function (err) {
                console.log("error subscribing to newStroke: " + err);
            }
        );
        /*
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
        */
    };
     // fired when connection was lost (or could not be established)
     //
    connection.onclose = function (reason, details) {
        console.log("Connection lost: " + reason);
        /*
        if (t1) {
            clearInterval(t1);
            t1 = null;
        }
        if (t2) {
           clearInterval(t2);
           t2 = null;
        }
        */
    }
    // now actually open the connection
    //
    connection.open();
}
