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
            socket.addEventListener('message', function(event) {
               receiveMessage(event.data)
            });


         }

         const waitConnection = (socket) => {
            return new Promise((resolve, reject) => {
               const numberOfAttempts = 10
               const intervalTime = 1000

               let currentAttempt = 0

               const interval = setInterval(() => {
                  if( currentAttempt > numberOfAttempts -1) {
                     clearInterval(interval)
                     reject(new Error('Maximum number of attempts'))
                  } else if (socket.readyState === socket.OPEN) {
                     clearInterval(interval)
                     resolve()
                  }
                  currentAttempt++
               }, intervalTime);
            });
         }


         const sendMessage = async (socket, msg, waitForResponse) => {
            document.getElementById("command").value=msg;
            if(socket.readystate !== socket.OPEN) {
               try {
                  await waitConnection(socket)
                  socket.send(msg)
                  //NOT SURE IF WORKS!
                  if( waitForResponse ? true : false) {
                     const result = await new Promise((resolve) =>  {
                        socket.addEventListener("message", (data) => {
                           resolve(data);
                        });
                     }).then( value => {
                        return value
                     });
                     
                  }
               } catch (err) { console.error(err) }
            } else {
               socket.send(msg)
               if( waitForResponse ? true : false) {
                  const result = await new Promise((resolve) =>  {
                     socket.addEventListener("message", (data) => {
                        resolve(data);
                     });
                  }).then( value => {
                        return value
                  });
               }
            }
         }

         const receiveMessage = (data) => {
            console.log('Message from server ', data);
            document.getElementById("output").innerHTML+="<b>"+document.getElementById("command").value+":<b></b>\n</br>";
            document.getElementById("output").innerHTML+=event.data+"\n</br>";
            return data
         }

         window.onload = () => {
            let canvas = document.getElementById("canvas");
            let context = canvas.getContext("2d");
            let boundings = canvas.getBoundingClientRect();
            let xyMatrix = [];
            let mouseXmin = 0;
            let mouseYmin = 0;

            let mouseXmax = 0;
            let mouseYmax = 0;

            let mouseX = 0;
            let mouseY = 0;
            context.strokeStyle = 'black';
            context.lineWidth = 1; // initial brush width
            let isDrawing = false;

            connectWS();
            sendMessage(socket,"LOGIN;test;test;", true);
            //sendMessage(socket,"LOGIN;test;test;");
            //Start drawing when mouse is clicked down
            canvas.addEventListener('mousedown', function(event) {
               setMouseCoordinates(event);
               isDrawing = true;
               xyMatrix = [];
               mouseXmin = mouseX;
               mouseXmax = mouseX;
               mouseYmin = mouseY;
               mouseYmax = mouseY;
               // Start Drawing
               context.beginPath();
               context.moveTo(mouseX, mouseY);
            });

            // Draw line to x,y when mouse is pressed down
            canvas.addEventListener('mousemove', function(event) {
               setMouseCoordinates(event);

               if(isDrawing)
               {
                  if(mouseXmin>mouseX)mouseXmin = mouseX;
                  else if(mouseXmax<mouseX)mouseXmax = mouseX;

                  if(mouseYmin>mouseY)mouseYmin = mouseY;
                  else if(mouseYmax<mouseY)mouseYmax = mouseY;

                  xyMatrix.push([mouseX, mouseY]);
                  context.lineTo(mouseX, mouseY);
                  context.stroke();
               }
            });

            // Stop drawing when mouse button is released
            canvas.addEventListener('mouseup', function(event) {
               setMouseCoordinates(event);
               isDrawing = false;
               console.log(mouseXmin,mouseYmin,mouseXmax,mouseYmax);
               console.log(xyMatrix);

               let unique = xyMatrix.map(ar=>JSON.stringify(ar))
               .filter((itm, idx, arr) => arr.indexOf(itm) === idx)
               .map(str=>JSON.parse(str));
               let resStr = "UPDATE;DATA;8;FREEDRAW-";
               unique.forEach((v)=>{
                  resStr += v[0]+":"+v[1]+"-"
               });
               console.log(unique);
               console.log(resStr);
               resStr+=";";


               // disable this to stop sending
               sendMessage(socket,resStr);

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
         <canvas id="canvas" width="640" height="400"></canvas>
         <div id="output"></div>
         <div id="control">
         <input type="text" id="command" value="LOGIN;test;test">
         <input type="button" id="connect" value="connect" onClick="connectWS()">
         <input type="button" id="send" value="send" onClick="sendMessage(socket,document.getElementById('command').value)">
         
         </div>
      </div>
      
   </body>
</html>