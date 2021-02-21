<!DOCTYPE HTML>

<html>
   <head>
      
      <script type = "text/javascript">
         let data = "test;";//"LOGIN;test;test"
         let socket = null;
         function connectWS() {
            socket = new WebSocket("ws://127.0.0.1:10000");
            // Connection opened
            socket.addEventListener('open', function (event) {
                document.getElementById("output").innerHTML+="<b>CONNECTED<b></b>\n</br>";
                document.getElementById("connect").disabled= true
            });

            // Listen for messages
            socket.addEventListener('message', function (event) {
                console.log('Message from server ', event.data);
                document.getElementById("output").innerHTML+="<b>"+document.getElementById("command").value+":<b></b>\n</br>";
                document.getElementById("output").innerHTML+=event.data+"\n</br>";
            });

         }

         function sendWS(){
            socket.send(document.getElementById("command").value);
         }

      </script>
    
   </head>
   
   <body>
      <div id = "sse">
         <div id="output"></div>
         <div id="control">
         <input type="text" id="command" value="LOGIN;test;test">
         <input type="button" id="connect" value="connect" onClick="connectWS()">
         <input type="button" id="send" value="send" onClick="sendWS()">
         </div>
      </div>
      
   </body>
</html>