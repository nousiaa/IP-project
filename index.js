let data = "test;"; //"LOGIN;test;test"
var result1string = "";
var currentTMPid = 0;
let socket = null;
var active = false;
var drawmode = 0;
var drawingData = [[], []];

function addToDrawingData(id, command) {
  //console.log(id,command);
  const existID = drawingData[0].indexOf(id);
  if (existID == -1) {
    drawingData[0].push(id);
    drawingData[1].push(command);
  } else {
    drawingData[1][existID] = command;
  }
}
function remove1DrawingData(id) {
  const existID = drawingData[0].indexOf(id);
  if (existID != -1) {
    drawingData[0].splice(existID, 1);
    drawingData[1].splice(existID, 1);
  }
}
function clearDrawingData() {
  drawingData = [[], []];
}

function updateNote(noteid, notedata, x, y, sx, sy) {
  const nid = noteid.split("_");
  if (nid[1]) {
    const notecommand =
      "NOTE:" +
      btoa(noteid + ":" + x + ":" + y + ":" + sx + ":" + sy + ":" + notedata);
    addToDrawingData(nid[1], notecommand);
    socket.send("UPDATE;DATA;" + nid[1] + ";" + notecommand);
  }
}

function forceRedraw() {
  clearScreen(true);
  drawingData[1].forEach((element) => {
    processDrawCommand(element);
  });
}

function clearScreen(retaindata = false) {
  let canvasc = document.getElementById("canvas");
  let canvascc = canvasc.getContext("2d");
  let canvasc1 = document.getElementById("canvas1");
  let canvascc1 = canvasc1.getContext("2d");
  canvascc.clearRect(0, 0, canvasc.width, canvasc.height);
  canvascc1.clearRect(0, 0, canvasc1.width, canvasc1.height);
  let itm = document.getElementsByClassName("drawNote");
  while (itm.length > 0) {
    itm[0].parentNode.removeChild(itm[0]);
  }
  if (!retaindata) clearDrawingData();
}

function processDrawCommand(command) {
  const tmpdata1 = command.split(":");
  //console.log(tmpdata1);
  if (tmpdata1[0] == "DATA")
    convert64BaseStringToCoordinates(tmpdata1[1], false);
  else if (tmpdata1[0] == "NOTE") convert64BaseStringToNote(tmpdata1[1]);
  else if (tmpdata1[0] == "ERASE")
    convert64BaseStringToCoordinates(tmpdata1[1], true);
}

function connectWS() {
  socket = new WebSocket("wss://n0p0.com/wss2/"); //ws://localhost:10000");//"
  // Connection opened
  socket.addEventListener("open", function (event) {
    document.getElementById("output").innerHTML += "<b>CONNECTED<b></b>\n</br>";
    document.getElementById("connect").disabled = true;
  });
  socket.addEventListener("message", function (event) {
    const tmpdata = event.data.split(";");
    // console.log(tmpdata);
    switch (tmpdata[0]) {
      case "DATAID":
        currentTMPid = tmpdata[1];
        break;

      case "DRAWINGSELECTED":
        clearScreen();
        socket.send("SEND;DATA;");
        break;

      case "UUPDATE":
        addToDrawingData(tmpdata[1], tmpdata[2]);
        processDrawCommand(tmpdata[2]);
        break;

      case "DRAWINGLIST":
        let rows = tmpdata;
        // console.log(rows);
        document.getElementById("connectList").innerHTML =
          "<tr><th>Name</th><th>Description</th><th>Connect</th></tr>";
        rows.forEach((x) => {
          var subrow = x.split(":");
          //  console.log(subrow);
          if (subrow[0] && subrow[0] != "DRAWINGLIST")
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
        break;

      case "LOGINSUCCESS":
        document.getElementById(
          "loggedinname"
        ).innerHTML = document.getElementById("username").value;
        document.getElementById("needlogin").style.display = "none";
        document.getElementById("loggedin").style.display = "";
        updateList();
        break;

      case "NEWNOTE":
        createNote("note_" + tmpdata[1], tmpdata[2], tmpdata[3], "");
        break;

      case "DOUNDO":
        remove1DrawingData(tmpdata[1]);
        forceRedraw();
        break;

      case "LOGOUTSUCCESS":
        document.getElementById("loggedinname").innerHTML = "";
        document.getElementById("needlogin").style.display = "";
        document.getElementById("loggedin").style.display = "none";
        clearScreen();
        break;
      case "ASKJOIN":
        if(confirm("Allow user "+tmpdata[2]+" to join this drawing?")){
          socket.send("ALLOWJOIN;"+tmpdata[1]+";");
        } else {
          socket.send("DISALLOWJOIN;"+tmpdata[1]+";");
        }
        break;
    }
    //if (tmpdata[0] == "DATAID") {
    //  currentTMPid = tmpdata[1];
    //} else if (tmpdata[0] == "UUPDATE") {
    //  addToDrawingData(tmpdata[1],tmpdata[2]);
    //  processDrawCommand(tmpdata[2]);
    //} else if (tmpdata[0] == "DRAWINGSELECTED"){
    //  clearScreen();
    //  socket.send("SEND;DATA;");
    //} else if (tmpdata[0] == "DRAWINGLIST"){
    //  let rows = tmpdata;
    // // console.log(rows);
    //  document.getElementById("connectList").innerHTML =
    //    "<tr><th>Name</th><th>Description</th><th>Connect</th></tr>";
    //  rows.forEach((x) => {
    //    var subrow = x.split(":");
    //  //  console.log(subrow);
    //    if (subrow[0] && subrow[0]!="DRAWINGLIST")
    //      document.getElementById("connectList").innerHTML +=
    //        "<tr><td>" +
    //        subrow[1] +
    //        "</td><td>" +
    //        subrow[2] +
    //        "</td><td><input type='button' id='Connect" +
    //        subrow[0] +
    //        "' value='Connect' onClick='selectDraw(" +
    //        subrow[0] +
    //        ");'></td></tr>";
    //  });
    //} else if (tmpdata[0] == "LOGINSUCCESS"){
    //  document.getElementById("loggedinname").innerHTML = document.getElementById(
    //    "username"
    //  ).value;
    //  document.getElementById("needlogin").style.display = "none";
    //  document.getElementById("loggedin").style.display = "";
    //  updateList();
    //} else if (tmpdata[0] == "NEWNOTE"){
    //  createNote("note_"+tmpdata[1],tmpdata[2],tmpdata[3],"");
    //
    //} else if (tmpdata[0] == "LOGOUTSUCCESS"){
    //  document.getElementById("loggedinname").innerHTML = "";
    //  document.getElementById("needlogin").style.display = "";
    //  document.getElementById("loggedin").style.display = "none";
    //  clearScreen();
    //} else if (tmpdata[0] == "DOUNDO"){
    //  remove1DrawingData(tmpdata[1])
    //  forceRedraw();
    //}
    //
    //
    //
    //
    //
    ////console.log("Message from server ", event.data);
    ////document.getElementById("output").innerHTML += event.data + "\n</br>";
  });
  //
  defaultMessageListener(socket);
}

function uploadImage(e) {
  let reader = new FileReader();
  let canvas = document.getElementById("canvas1");
  let context = canvas.getContext("2d");
  reader.onload = (event) => {
    let img = new Image();
    img.onload = () => {
      context.drawImage(img, 30, 30);
    };
    img.src = event.target.result;
  };
  let dataURL = reader.readAsDataURL(e.target.files[0]);
  let prefix = "NEW;IMAGE;30:30:" + dataURL
  let command = prefix + dataURL
  //socket.send(command)
}

function createNote(noteID, x, y, tvalue, sx = "60px", sy = "40px") {
  const divID = noteID + "div"
  const existingnote = document.getElementById(noteID);
  const existingDiv = document.getElementById(divID)

  if (existingnote && existingDiv) {

    existingDiv.style.left = x;
    existingDiv.style.top = y;
    existingDiv.style.width = sx;
    existingDiv.style.height =sy;


    existingnote.style.left = 0;
    existingnote.style.top = 0;
    existingnote.style.width = sx;
    existingnote.style.height = sy;
    existingnote.value = tvalue;
  } else {
    let div = document.createElement("div-textarea");
    let input = document.createElement("textarea");


    div.appendChild(input)


    div.style = "position: absolute;"
    div.id = divID
    div.style.left = x;
    div.style.top = y;
    div.style.width = sx;
    div.style.height =sy;

    input.type = "text";
    input.id = noteID;
    input.oninput = function () {
      updateNote(
        this.id,
        this.value,
        input.style.left,
        input.style.top,
        this.style.width,
        this.style.height
      );
    };
    input.classList.add("drawNote");
    input.style =
      "display:block; position: relative; z-index: 2; border: none; background-color: rgba(255,255,204,0.1); box-shadow: 5px 5px 7px rgba(33,33,33,.7);";
    input.style.left = 0;
    input.style.top = 0;
    input.style.width = sx;
    input.style.height = sy;
    input.value = tvalue;
    input.classList.add("drawNote");
    //console.log(noteID);

    document.getElementById("canvDIV").appendChild(div);
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

function setNoteMode() {
  drawmode = 1;
  document.getElementById("canvas").style.zIndex = 0;
}
function setDrawMode() {
  drawmode = 0;
  document.getElementById("canvas").style.zIndex = 3;
}
function setEraseMode() {
  drawmode = 2;
  document.getElementById("canvas").style.zIndex = 3;
}
const convert64BaseStringToNote = (str) => {
  const note = atob(str).split(":");
  //console.log(note);
  createNote(note[0], note[1], note[2], note[5], note[3], note[4]);
};

const convert64BaseStringToCoordinates = (str, eraseMode = false) => {
  parseString = window.atob(str);
  let canvas = document.getElementById("canvas1");
  let context = canvas.getContext("2d");
  let startX = parseString.charCodeAt(0) + (parseString.charCodeAt(1) << 8);
  let startY = parseString.charCodeAt(2) + (parseString.charCodeAt(3) << 8);
  //console.log(startX);
  //console.log(startY);
  if (eraseMode) context.globalCompositeOperation = "destination-out";
  else context.globalCompositeOperation = "source-over";
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

async function doLogin() {
  socket.send(
    "LOGIN;" +
      document.getElementById("username").value +
      ";" +
      document.getElementById("password").value +
      ";"
  );
}

function createNewDrawing() {
  socket.send("NEW;DRAWING;TESTI1;TESTI1;");
  socket.send("LIST;DRAWING;");
}
function selectDraw(id) {
  socket.send("SELECT;" + id + ";");
}
function doUndo() {
  socket.send("UNDO;DATA;");
}
//async function selectDraw(id) {
//  return await sendMessage(socket, "SELECT;" + id + ";", true);
//}

function updateList() {
  socket.send("LIST;DRAWING;");
}
function doLogout() {
  socket.send("LOGOUT;");
}
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
  let canvasDIV = document.getElementById("canvDIV");
  let canvas = document.getElementById("canvas");
  let canvas1 = document.getElementById("canvas1");
  let context = canvas.getContext("2d");
  let imageloader = document.getElementById("imageloader");
  imageloader.addEventListener("change", uploadImage);
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
    setMouseCoordinates(event, "canvas1");

    socket.send("NEW;NOTE;" + mouseX + "px;" + mouseY + "px;");
  });

  canvas.addEventListener("mousedown", function (event) {
    socket.send("NEW;DATA;");
    interVARl = setInterval(sendDataInterval, 200);
    setMouseCoordinates(event, "canvas");
    isDrawing = true;
    mouseXmin = mouseX;
    mouseXmax = mouseX;
    mouseYmin = mouseY;
    mouseYmax = mouseY;
    // Start Drawing
    context.beginPath();
    context.moveTo(mouseX, mouseY);
    resultString +=
      String.fromCharCode(mouseX & 255) +
      String.fromCharCode((mouseX >> 8) & 255) +
      String.fromCharCode(mouseY & 255) +
      String.fromCharCode((mouseY >> 8) & 255);
  });

  // Draw line to x,y when mouse is pressed down
  canvas.addEventListener("mousemove", function (event) {
    setMouseCoordinates(event, "canvas");

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
      if (drawmode == 2) context.globalCompositeOperation = "destination-out";
      else context.globalCompositeOperation = "source-over";
      context.lineTo(mouseX, mouseY);
      context.stroke();
      drawPrefix = "DATA:";
      let b64str = window.btoa(resultString);
      if (drawmode == 2) {
        drawPrefix = "ERASE:";
        convert64BaseStringToCoordinates(b64str, true);
      } else {
        convert64BaseStringToCoordinates(b64str, false);
      }
      result1string = drawPrefix + b64str;
    } else {
      resizeCanvas();
      forceRedraw();
    }
  });

  // Stop drawing when mouse button is released
  canvas.addEventListener("mouseup", function (event) {
    setMouseCoordinates(event, "canvas");
    clearInterval(interVARl);
    isDrawing = false;

    //console.log(mouseXmin, mouseYmin, mouseXmax, mouseYmax);
    drawPrefix = "DATA:";
    let b64str = window.btoa(resultString);
    if (drawmode == 2) {
      drawPrefix = "ERASE:";
      convert64BaseStringToCoordinates(b64str, true);
    } else {
      convert64BaseStringToCoordinates(b64str, false);
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    result1string = drawPrefix + b64str;

    sendDataInterval();
    addToDrawingData(currentTMPid, result1string);
    //console.log(encodedData);
    currentTMPid = 0;
    resultString = "";
  });
  //canvasDIV.addEventListener("mousemove", function (event) {

  //});

  function resizeCanvas() {
    const divx = canvasDIV.style.width.split("px")[0];
    const divy = canvasDIV.style.height.split("px")[0];
    //console.log(divx);
    if (canvas.width != divx) {
      canvas.width = divx;
      canvas1.width = divx;
    }

    if (canvas.height != divy) {
      canvas.height = divy;
      canvas1.height = divy;
    }
  }

  // Handle Mouse Coordinates
  function setMouseCoordinates(event, canv) {
    let crect = document.getElementById(canv).getBoundingClientRect();

    mouseX = event.clientX - crect.left;
    mouseY = event.clientY - crect.top;
  }
}

function exportImage() {
  html2canvas(document.querySelector("#canvDIV")).then(canvas => {
    const data = canvas.toDataURL();
    const anchor = document.createElement("a");
    anchor.href = data;
    anchor.download = "export.png"
    anchor.target = "_blank";
    anchor.click();
  })
}
