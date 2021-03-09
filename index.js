let data = "test;"; //"LOGIN;test;test"
var result1string = "";
var currentTMPid = 0;
let socket = null;

function connectWS() {
  socket = new WebSocket("ws://n0p0.com:8080");
  // Connection opened
  socket.addEventListener("open", function (event) {
    document.getElementById("output").innerHTML += "<b>CONNECTED<b></b>\n</br>";
    document.getElementById("connect").disabled = true;
  });
  socket.addEventListener("message", function (event) {
    const tmpdata = event.data.split(";");
    console.log(tmpdata);
    if (tmpdata[0] == "DATAID") currentTMPid = tmpdata[1];
    if(tmpdata[0] == "UNWANTEDUPDATE") convert64BaseStringToCoordinates(tmpdata[2])
    if(tmpdata[0] == "DRAWINGSELECTED"){
      let canvasc = document.getElementById("canvas")
      let canvascc = canvasc.getContext("2d");
      let canvasc1 = document.getElementById("canvas1")
      let canvascc1 = canvasc1.getContext("2d");
      canvascc.clearRect(0, 0, canvasc.width, canvasc.height);
      canvascc1.clearRect(0, 0, canvasc1.width, canvasc1.height);
      socket.send("SEND;DATA;");
    }
    console.log("Message from server ", event.data);
    document.getElementById("output").innerHTML += event.data + "\n</br>";
  });

  defaultMessageListener(socket);
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
  document.getElementById("output").innerHTML +=
    "<b>" + msg + ":<b></b>\n</br>";
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

const convert64BaseStringToCoordinates = (str) => {
  parseString = window.atob(str);
  let canvas = document.getElementById("canvas1");
  let context = canvas.getContext("2d");
  let startX = parseString.charCodeAt(0) + (parseString.charCodeAt(1) << 8);
  let startY = parseString.charCodeAt(2) + (parseString.charCodeAt(3) << 8);
  console.log(startX);
  console.log(startY);
  context.beginPath();
  context.moveTo(startX, startY);
  for (i = 4; i < parseString.length; i += 4) {
    let mouseX =
      parseString.charCodeAt(i) + (parseString.charCodeAt(i + 1) << 8);
    let mouseY =
      parseString.charCodeAt(i + 2) + (parseString.charCodeAt(i + 3) << 8);
    console.log(mouseX);
    console.log(mouseY);
    context.lineTo(mouseX, mouseY);
    context.stroke();
  }
  context.closePath();
};

const parseMessage = (msg) => {
  const splittedString = msg.split(";");
  console.log(splittedString);
};

async function doLogin() {
  const result = await sendMessage(
    socket,
    "LOGIN;" +
      document.getElementById("username").value +
      ";" +
      document.getElementById("password").value +
      ";",
    true
  );
  if (result == "success") {
    document.getElementById("loggedinname").innerHTML = document.getElementById(
      "username"
    ).value;
    document.getElementById("needlogin").style.display = "none";
    document.getElementById("loggedin").style.display = "";
  }

  console.log(result);
  return result;
}
async function selectDraw(id) {
  return await sendMessage(socket, "SELECT;" + id + ";", true);
}

async function updateList() {
  const result = await sendMessage(socket, "LIST;DRAWING;", true);
  var rows = result.split(";");
  console.log(rows);
  document.getElementById("connectList").innerHTML =
    "<tr><th>Name</th><th>Description</th><th>Connect</th></tr>";
  rows.forEach((x) => {
    var subrow = x.split(":");
    console.log(subrow);
    if (subrow[0])
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
async function doLogout() {}
window.onload = () => {
  windowAlmostLoad();
};

function sendDataInterval() {
  console.log("UPDATE;DATA;" + currentTMPid + ";" + result1string);
  if (currentTMPid) {
    socket.send("UPDATE;DATA;" + currentTMPid + ";" + result1string);
  }
}

async function windowAlmostLoad() {
  let canvas = document.getElementById("canvas");
  let context = canvas.getContext("2d");
  let boundings = canvas.getBoundingClientRect();
  let resultString = "";
  let xyMatrix = [];
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
  canvas.addEventListener("mousedown", function (event) {
    socket.send("NEW;DATA;");
    interVARl = setInterval(sendDataInterval, 200);
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
  canvas.addEventListener("mousemove", function (event) {
    setMouseCoordinates(event);

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

     context.lineTo(mouseX, mouseY);
     context.stroke();
      result1string = window.btoa(resultString);
    }
  });

  // Stop drawing when mouse button is released
  canvas.addEventListener("mouseup", function (event) {
    0;
    setMouseCoordinates(event);
    clearInterval(interVARl);
    isDrawing = false;
    console.log(mouseXmin, mouseYmin, mouseXmax, mouseYmax);
    let encodedData = window.btoa(resultString);
    sendMessage(socket, encodedData);
    console.log(encodedData);
    resultString = "";
  });

  // Handle Mouse Coordinates
  function setMouseCoordinates(event) {
    let crect = document.getElementById("canvas").getBoundingClientRect();

    mouseX = event.clientX - crect.left;
    mouseY = event.clientY - crect.top;
  }
}
