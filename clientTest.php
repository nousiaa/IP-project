<!DOCTYPE HTML>

<html>
   <head>
      
      <script src = "index.js"></script>
    
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
               <div id="drawselect">
                  <input type="button" id="login" value="LIST DRAWINGS" onClick="updateList();">
                  <table id="connectList" style=""></table>
               </div>
            </div>
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