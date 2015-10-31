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
    }
}