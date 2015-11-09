var autobahn = require('autobahn');

var connection = new autobahn.Connection({
   url: 'ws://127.0.0.1:8080/ws',
   realm: 'realm1'}
);

connection.onopen = function (session) {

   // subscribe


   // example of printing json blobs for updating the canvas
   // (really just as serverside logging
   function printJSON (args) {
      console.log("event for 'printJSON' received: " + JSON.stringify(args));
   }

   session.subscribe('com.quill.newStroke', printJSON).then(
      function (sub) {
         console.log("subscribed to topic 'newStroke'");
      },
      function (err) {
         console.log("failed to subscribe: " + err);
      }
   );

   /*
   // also subscribe to a counter to test the connection
   function on_counter (args) {
      var counter = args[0];
      console.log("on_counter() event received with counter " + counter);
   }
   session.subscribe('com.quill.testServerCounter', on_counter).then(
      function (sub) {
         console.log("subscribed to topic 'testServerCounter'");
      },
      function (err) {
         console.log("failed to subscribe: " + err);
      }
   );

   // publish
   var counter = 0;
   setInterval(function () {
      session.publish('com.quill.testClientCounter', [counter]);
      console.log("published to 'testcounter' with counter " + counter);

      counter += 1;
   }, 1000);
   */
};

connection.open();
