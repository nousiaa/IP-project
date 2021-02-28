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

            defaultMessageListener(socket)

         }

         /*
         *Waits for connection to be established, terminates if connection doesn't work after x number times.
         */

         const waitConnection = (socket) => {
            return new Promise( (resolve, reject) => {
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


         const sendMessage = async (socket, msg, callback) => {
            document.getElementById("output").innerHTML+="<b>"+msg+":<b></b>\n</br>";
            if(socket.readystate !== socket.OPEN) {
               try {
                  await waitConnection(socket)
                  if(!!callback) {
                     socket.send(msg)
                     return receiveMessage(socket)
                  }
                  socket.send(msg)
               } catch (err) { console.error(err) }
            } else {
               if(!!callback) {
                  socket.send(msg)
                  return receiveMessage(socket)
               }
               socket.send(msg)
            }
         }

         //TODO: Add default behaviour
         const defaultMessageListener = (socket) => {
            socket.onmessage = null
            socket.onmessage = (event) => {
               console.log('Message from server ', event.data);               
               document.getElementById("output").innerHTML+=event.data+"\n</br>";
            }
         }

         const receiveMessage = (socket) => {
            const res = new Promise( (resolve) => {
               socket.onmessage = (event) => {
                  socket.onmessage=defaultMessageListener(socket);
                  resolve(event.data);
               }
            });

            return res
            
         }

         const parseMessage = (msg) => {
            return msg.split(";")
         }
         async function doLogin(){
            const result = await sendMessage(socket,"LOGIN;"+document.getElementById('username').value+";"+document.getElementById('password').value+";", true);
            if(result=='success') {
               document.getElementById('loggedinname').innerHTML = document.getElementById('username').value;
               document.getElementById('needlogin').style.display = 'none';
               document.getElementById('loggedin').style.display = '';
            }

            console.log(result);
            return result;
         }
         async function doLogout(){
         }
         window.onload = () => {
            windowAlmostLoad()
         }
         async function windowAlmostLoad(){
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

            await connectWS();
            //console.log(await sendMessage(socket,"LOGIN;test;test;", true));
            //console.log(await sendMessage(socket,"SELECT;8;", true));
            
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
                  mouseXmin = (mouseXmin>mouseX) ? mouseX : mouseXmin
                  mouseYmin = (mouseYmin>mouseY) ? mouseY : mouseYmin

                  mouseXmax = (mouseXmax<mouseX) ? mouseX : mouseXmax
                  mouseYmax = (mouseYmax<mouseY) ? mouseY : mouseYmax

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
         <div id="loginbox">
            <div id="needlogin">
               Username: <input type="text" id="username" value="test">
               Password: <input type="text" id="password" value="test">
               <input type="button" id="login" value="Login" onClick="doLogin();">
            </div>
            <div id="loggedin" style="display:none;">
            Logged in as: 
            <div id="loggedinname" style="display: inline;"></div>
            <input type="button" id="login" value="Logout" onClick="doLogout();">
            </div>
         </div>
         <div id="drawselect">
         </div>
         <canvas id="canvas" width="640" height="400"></canvas>
         <div id="output"></div>
         <div id="control">
         <input type="text" id="command" value="">
         <input type="button" id="connect" value="connect" onClick="connectWS()">
         <input type="button" id="send" value="send" onClick="sendMessage(socket,document.getElementById('command').value)">
         
         </div>
      </div>
      
   </body>
</html>