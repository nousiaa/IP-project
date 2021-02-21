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

         window.onload = () => {
            let canvas = document.getElementById("canvas");
            let context = canvas.getContext("2d");
            let boundings = canvas.getBoundingClientRect();

            let mouseX = 0;
            let mouseY = 0;
            context.strokeStyle = 'black';
            context.lineWidth = 1; // initial brush width
            let isDrawing = false;

            //Start drawing when mouse is clicked down
            canvas.addEventListener('mousedown', function(event) {
               setMouseCoordinates(event);
               isDrawing = true;

               // Start Drawing
               context.beginPath();
               context.moveTo(mouseX, mouseY);
            });

            // Draw line to x,y when mouse is pressed down
            canvas.addEventListener('mousemove', function(event) {
               setMouseCoordinates(event);

               if(isDrawing){
                  context.lineTo(mouseX, mouseY);
                  context.stroke();
               }
            });

            // Stop drawing when mouse button is released
            canvas.addEventListener('mouseup', function(event) {
               setMouseCoordinates(event);
               isDrawing = false;
            });

            // Handle Mouse Coordinates
            function setMouseCoordinates(event) {
               mouseX = event.clientX - boundings.left;
               mouseY = event.clientY - boundings.top;
            }

         };

      </script>
    
   </head>
   <style>
        canvas {
            border: 1px solid #000000;
        }

   </style>
   
   <body>
      <div id = "sse">
         <div id="output"></div>
         <div id="control">
         <input type="text" id="command" value="LOGIN;test;test">
         <input type="button" id="connect" value="connect" onClick="connectWS()">
         <input type="button" id="send" value="send" onClick="sendWS()">
         <canvas id="canvas" width="640" height="400"></canvas>
         </div>
      </div>
      
   </body>
</html>