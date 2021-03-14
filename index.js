let data = "test;"; //"LOGIN;test;test"
var result1string = "";
var currentTMPid = 0;
let socket = null;
var drawmode = 0;

function updateNote(noteid,notedata,x,y,sx,sy) {
  const nid = noteid.split("_")
  if (nid[1]) {
    
    socket.send("UPDATE;DATA;" + nid[1] + ";NOTE:"+ btoa(noteid+":"+x+":"+y+":"+sx+":"+sy+":"+notedata));
  }
}

function connectWS() {
  socket = new WebSocket("wss://n0p0.com/wss2/");
  // Connection opened
  socket.addEventListener("open", function (event) {
    document.getElementById("output").innerHTML += "<b>CONNECTED<b></b>\n</br>";
    document.getElementById("connect").disabled = true;
  });
  socket.addEventListener("message", function (event) {
    const tmpdata = event.data.split(";");
   // console.log(tmpdata);
    if (tmpdata[0] == "DATAID") currentTMPid = tmpdata[1];
    else if (tmpdata[0] == "UUPDATE") {
      const tmpdata1 = tmpdata[2].split(":");
      if (tmpdata1[0] == "DATA")convert64BaseStringToCoordinates(tmpdata1[1],false);
      else if (tmpdata1[0] == "NOTE")convert64BaseStringToNote(tmpdata1[1]);
      else if (tmpdata1[0] == "ERASE")convert64BaseStringToCoordinates(tmpdata1[1],true);
    }
    else if (tmpdata[0] == "DRAWINGSELECTED"){
      let canvasc = document.getElementById("canvas")
      let canvascc = canvasc.getContext("2d");
      let canvasc1 = document.getElementById("canvas1")
      let canvascc1 = canvasc1.getContext("2d");
      canvascc.clearRect(0, 0, canvasc.width, canvasc.height);
      canvascc1.clearRect(0, 0, canvasc1.width, canvasc1.height);
      let itm = document.getElementsByClassName("drawNote");
      while(itm.length > 0){
        itm[0].parentNode.removeChild(itm[0]);
      };
      socket.send("SEND;DATA;");
    }
    else if (tmpdata[0] == "DRAWINGLIST"){
      let rows = tmpdata;
     // console.log(rows);
      document.getElementById("connectList").innerHTML =
        "<tr><th>Name</th><th>Description</th><th>Connect</th></tr>";
      rows.forEach((x) => {
        var subrow = x.split(":");
      //  console.log(subrow);
        if (subrow[0] && subrow[0]!="DRAWINGLIST")
          document.getElementById("connectList").innerHTML +=
            "<tr><td>" +
            subrow[1] +
            "</td><td>" +
            subrow[2] +
            "</td><td><input type='button' id='Connect" +
            subrow[0] +
            "' value='Connect' onClick='selectDraw(" +
            subrow[0] +
            ");'></td></tr>";
      });
    }
    else if (tmpdata[0] == "LOGINSUCCESS"){
      document.getElementById("loggedinname").innerHTML = document.getElementById(
        "username"
      ).value;
      document.getElementById("needlogin").style.display = "none";
      document.getElementById("loggedin").style.display = "";
    } else if (tmpdata[0] == "NEWNOTE"){
      createNote("note_"+tmpdata[1],tmpdata[2],tmpdata[3],"");

    }





    //console.log("Message from server ", event.data);
    //document.getElementById("output").innerHTML += event.data + "\n</br>";
  });

  defaultMessageListener(socket);
} 
function createNote(noteID,x,y,tvalue,sx="30px",sy="20px"){
  const existingnote = document.getElementById(noteID);

  if(existingnote){
    existingnote.style.left = x;
    existingnote.style.top = y;
    existingnote.style.width = sx;
    existingnote.style.height = sy;
    existingnote.value=tvalue;

  } else {
    let input = document.createElement("textarea");
    input.type = "text";
    input.id=noteID;
    input.oninput = function(){updateNote(this.id, this.value,input.style.left,input.style.top,this.style.width,this.style.height);};
    input.classList.add("drawNote");
    input.style="display:block; position: absolute; z-index: 2; border: none; background-color: rgba(255,255,204,0.1); box-shadow: 5px 5px 7px rgba(33,33,33,.7);"
    input.style.left = x;
    input.style.top = y;
    input.style.width = sx;
    input.style.height = sy;
    input.value=tvalue;
    input.classList.add("drawNote");
    //console.log(noteID);
  
    document.getElementById("canvDIV").appendChild(input)
  }


}
/*
 *Waits for connection to be established, terminates if connection doesn't work after x number times.
 */
const waitConnection = (socket) => {
  return new Promise((resolve, reject) => {
    const numberOfAttempts = 10;
    const intervalTime = 1000;

    let currentAttempt = 0;

    const interval = setInterval(() => {
      if (currentAttempt > numberOfAttempts - 1) {
        clearInterval(interval);
        reject(new Error("Maximum number of attempts"));
      } else if (socket.readyState === socket.OPEN) {
        clearInterval(interval);
        resolve();
      }
      currentAttempt++;
    }, intervalTime);
  });
};

const sendMessage = async (socket, msg, callback) => {
  //document.getElementById("output").innerHTML +=
  //  "<b>" + msg + ":<b></b>\n</br>";
  if (socket.readystate !== socket.OPEN) {
    try {
      await waitConnection(socket);
      if (!!callback) {
        socket.send(msg);
        return receiveMessage(socket);
      }
      socket.send(msg);
    } catch (err) {
      console.error(err);
    }
  } else {
    if (!!callback) {
      socket.send(msg);
      return receiveMessage(socket);
    }
    socket.send(msg);
  }
};

//TODO: Add default behaviour, such as parsing message.
const defaultMessageListener = (socket) => {
  socket.onmessage = null;
  socket.onmessage = (event) => {};
};

const receiveMessage = (socket) => {
  const res = new Promise((resolve) => {
    socket.onmessage = (event) => {
      socket.onmessage = defaultMessageListener(socket);
      resolve(event.data);
    };
  });

  return res;
};

function setNoteMode(){
  drawmode = 1;
  document.getElementById('canvas').style.zIndex=0;

};
function setDrawMode(){
  drawmode = 0;
  document.getElementById('canvas').style.zIndex=3;
};
function setEraseMode(){
  drawmode = 2;
  document.getElementById('canvas').style.zIndex=3;
}
const convert64BaseStringToNote = (str) => {
  const note = atob(str).split(":");
  //console.log(note);
  createNote(note[0],note[1],note[2],note[5],note[3],note[4]);
};
const convert64BaseStringToCoordinates = (str,eraseMode=false) => {
  parseString = window.atob(str);
  let canvas = document.getElementById("canvas1");
  let context = canvas.getContext("2d");
  let startX = parseString.charCodeAt(0) + (parseString.charCodeAt(1) << 8);
  let startY = parseString.charCodeAt(2) + (parseString.charCodeAt(3) << 8);
  //console.log(startX);
  //console.log(startY);
  if(eraseMode) context.globalCompositeOperation = 'destination-out';
  else context.globalCompositeOperation = 'source-over';
  context.beginPath();
  context.moveTo(startX, startY);
  for (i = 4; i < parseString.length; i += 4) {
    let mouseX =
      parseString.charCodeAt(i) + (parseString.charCodeAt(i + 1) << 8);
    let mouseY =
      parseString.charCodeAt(i + 2) + (parseString.charCodeAt(i + 3) << 8);
    //console.log(mouseX);
    //console.log(mouseY);
    context.lineTo(mouseX, mouseY);
    context.stroke();
  }
  context.closePath();
};

const parseMessage = (msg) => {
  const splittedString = msg.split(";");
  //console.log(splittedString);
};

async function doLogin() {
  socket.send("LOGIN;"+document.getElementById("username").value+";"+document.getElementById("password").value+";");
}

function createNewDrawing(){
  socket.send("NEW;DRAWING;TESTI1;TESTI1;");
  socket.send("LIST;DRAWING;");
}
function selectDraw(id) {
  socket.send("SELECT;" + id + ";");
}
//async function selectDraw(id) {
//  return await sendMessage(socket, "SELECT;" + id + ";", true);
//}

function updateList() {
  socket.send("LIST;DRAWING;");
}
function doLogout() {}
window.onload = () => {
  windowAlmostLoad();
};

function sendDataInterval() {
  //console.log("UPDATE;DATA;" + currentTMPid + ";" + result1string);
  if (currentTMPid) {
    socket.send("UPDATE;DATA;" + currentTMPid + ";" + result1string);
  }
}


async function windowAlmostLoad() {
  let canvas = document.getElementById("canvas");
  let canvas1 = document.getElementById("canvas1");
  let context = canvas.getContext("2d");
  let resultString = "";
  let mouseXmin = 0;
  let mouseYmin = 0;
  let interVARl = 0;

  let mouseXmax = 0;
  let mouseYmax = 0;

  let mouseX = 0;
  let mouseY = 0;
  context.strokeStyle = "black";
  context.lineWidth = 1; // initial brush width
  let isDrawing = false;

  connectWS();
  //console.log(await sendMessage(socket,"LOGIN;test;test;", true));
  //console.log(await sendMessage(socket,"SELECT;8;", true));

  //sendMessage(socket,"LOGIN;test;test;");
  //Start drawing when mouse is clicked down

  canvas1.addEventListener("mousedown", function (event) {
    setMouseCoordinates(event,"canvas1");
    
    socket.send("NEW;NOTE;"+mouseX+"px;"+mouseY+"px;"); 

  });

  canvas.addEventListener("mousedown", function (event) {
    socket.send("NEW;DATA;");
    interVARl = setInterval(sendDataInterval, 200);
    setMouseCoordinates(event,"canvas");
    isDrawing = true;
    mouseXmin = mouseX;
    mouseXmax = mouseX;
    mouseYmin = mouseY;
    mouseYmax = mouseY;
    // Start Drawing
    context.beginPath();
    context.moveTo(mouseX, mouseY);
  });

  // Draw line to x,y when mouse is pressed down
  canvas.addEventListener("mousemove", function (event) {
      setMouseCoordinates(event,"canvas");

      if (isDrawing) {
        mouseXmin = mouseXmin > mouseX ? mouseX : mouseXmin;
        mouseYmin = mouseYmin > mouseY ? mouseY : mouseYmin;

        mouseXmax = mouseXmax < mouseX ? mouseX : mouseXmax;
        mouseYmax = mouseYmax < mouseY ? mouseY : mouseYmax;
        resultString +=
          String.fromCharCode(mouseX & 255) +
          String.fromCharCode((mouseX >> 8) & 255) +
          String.fromCharCode(mouseY & 255) +
          String.fromCharCode((mouseY >> 8) & 255);
      if(drawmode==2) context.globalCompositeOperation = 'destination-out';
      else context.globalCompositeOperation = 'source-over';
      context.lineTo(mouseX, mouseY);
      context.stroke();
      drawPrefix = "DATA:";
      let b64str = window.btoa(resultString)
      if(drawmode==2){
        drawPrefix ="ERASE:";
        convert64BaseStringToCoordinates(b64str,true);
      } else {
        convert64BaseStringToCoordinates(b64str,false);
      }
      result1string = drawPrefix+b64str;
      }
  });

  // Stop drawing when mouse button is released
  canvas.addEventListener("mouseup", function (event) {
      setMouseCoordinates(event,"canvas");
      clearInterval(interVARl);
      isDrawing = false;
      //console.log(mouseXmin, mouseYmin, mouseXmax, mouseYmax);
      drawPrefix = "DATA:";
      let b64str = window.btoa(resultString)
      if(drawmode==2){
        drawPrefix ="ERASE:";
        convert64BaseStringToCoordinates(b64str,true);
      } else {
        convert64BaseStringToCoordinates(b64str,false);
      }
      context.clearRect(0, 0, canvas.width, canvas.height);
      result1string = drawPrefix+b64str;

      sendDataInterval();

      //console.log(encodedData);
      resultString = "";
  });

  // Handle Mouse Coordinates
  function setMouseCoordinates(event,canv) {
    let crect = document.getElementById(canv).getBoundingClientRect();

    mouseX = event.clientX - crect.left;
    mouseY = event.clientY - crect.top;
  }
}
