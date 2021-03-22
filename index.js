let data = "test;"; //"LOGIN;test;test"
var result1string = "";
var currentTMPid = 0;
let socket = null;
var active = false;
var drawmode = 0;
var drawingData = [[], []];
var currentImage = "";
var myuserid = null;
var currentlyLinking = null
var userList = [[],[]];
function getUser(id){
  const existID = userList[0].indexOf(id);
  if (existID != -1) {
    return userList[1][existID];
  } else {
    socket.send("WHOIS;"+id+";");
    return id;
  }
}



function doLogin() {
  socket.send(
    "LOGIN;" +
    document.getElementById("username").value +
    ";" +
    document.getElementById("password").value +
    ";"
  );
}
function updateLinkId (id,linkID) {
  const existID = drawingData[0].indexOf(id);
  //console.log(existID);
  if (existID != -1) {
    drawingData[1][existID][2] = linkID;
  }
}
function updateDrawingDataId (oldid, newid) {
  const existID = drawingData[0].indexOf(oldid);
  if (existID != -1) {
    drawingData[0][existID] = newid;
  }
}

function addToDrawingData(id, command, userid=null, linkedto1=null) {
  let linkedto = linkedto1;
  if(linkedto=="NULL")linkedto=null;
  //console.log(id,command);
  const existID = drawingData[0].indexOf(id);
  if (existID == -1) {
    drawingData[0].push(id);
    drawingData[1].push([command,userid,linkedto]);
  } else {
    drawingData[1][existID] = [command,userid,linkedto];
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

function showAndHideContent(contentToShow, contentToHide){
  contentToShow.forEach(ee=>{
    document.getElementById(ee).style.display="";
  });
  contentToHide.forEach(ee=>{
    document.getElementById(ee).style.display="none";
  });
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
    processDrawCommand(element[0],element[1],element[2]);
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
  let divs = document.getElementsByClassName("drawNoteDiv");
  while (divs.length > 0) {
    divs[0].parentNode.removeChild(divs[0]);
  }

  while (itm.length > 0) {
    itm[0].parentNode.removeChild(itm[0]);
  }
  if (!retaindata) clearDrawingData();
}



var drawbuf = [];
var drawint = null;
function processDrawCommand(command,userid,linkID) {
  drawbuf.push([command,userid,linkID]);
  if(!drawint)drawint = setInterval(processDrawCommand1, 5);
}

function processDrawCommand1() {
  if(drawbuf.length>0){
    let command = drawbuf.shift();

    const tmpdata1 = command[0].split(":");
    //console.log(tmpdata1);
    if (tmpdata1[0] == "DATA")
      convert64BaseStringToCoordinates(tmpdata1[1], false);
    else if (tmpdata1[0] == "NOTE") convert64BaseStringToNote(tmpdata1[1],command[1],command[2]);
    else if (tmpdata1[0] == "ERASE") convert64BaseStringToCoordinates(tmpdata1[1], true);
    else if (tmpdata1[0] == "IMG") draw64BaseImage(tmpdata1[1],tmpdata1[2],tmpdata1[3]+":"+tmpdata1[4].replace("*",";"));
  } else {
    clearInterval(drawint);
    drawint=null;
  }

}
function getImageDimensions(file) {
  return new Promise (function (resolved, rejected) {
    var i = new Image()
    i.onload = function(){
      resolved({w: i.width, h: i.height})
    };
    i.src = file
  })
}
async function handleLinkNote(button,x,y) {
  let count = 0;
  let correctImg =null;
  while(count<drawingData[1].length){
    const thisitem = drawingData[1][count];
    const tmpdata1 = thisitem[0].split(":");
    if (tmpdata1[0] == "IMG"){
      const imgxy = await getImageDimensions(tmpdata1[3]+":"+tmpdata1[4].replace("*",";"))
      if(tmpdata1[1]<x && tmpdata1[2]< y && (tmpdata1[1]-0+imgxy.w)>x && (tmpdata1[2]-0+imgxy.h)>y){
        correctImg=count;
      }

    } 
    count++;
  }
  if(correctImg!=null){
    const imgID = drawingData[0][correctImg];
    const id = button.parentElement.id;
    const noteID =id.split("_")[1].slice(0,-3);
    updateLinkId(noteID,imgID);
    const existingTitle = document.getElementById("note_"+noteID + "_title");
    existingTitle.innerHTML="Author: "+getUser(myuserid)+" LINKED";
    socket.send("LINKNOTE;"+noteID+";"+imgID+";");
    document.getElementById("note_"+noteID).oninput();
  }

}


function handleDeleteNote(button) {
  const id = button.parentElement.id
  const div = document.getElementById(id)
  div.remove();
  const noteID =id.split("_")[1].slice(0,-3)
  socket.send("DELETENOTE;"+noteID+";")
}


function deleteNoteCallback(noteID) {
  const note = document.getElementById(noteID)
  if(note) {
    const div = note.parentElement
    div.remove()
  }
}

function connectWS() {
  socket = new WebSocket("wss://n0p0.com/wss2/"); //ws://localhost:10000");//"
  // Connection opened
  socket.addEventListener("open", function (event) {
    document.getElementById("output").innerHTML += "<b>CONNECTED<b></b>\n</br>";
  });
  socket.addEventListener("message", function (event) {
    const tmpdata = event.data.split(";");
    // console.log(tmpdata);
    switch (tmpdata[0]) {
      case "USERIDS":
        tmpdata[1].split(":").forEach(aa=>{
          getUser(aa);
        });
        break;
      case "USERIS":
        userList[0].push(tmpdata[1])
        userList[1].push(tmpdata[2])
        break;
      case "LEAVEDRAWING":
        showAndHideContent(["initialDiv"],["contentDiv","loadDiv"]);
        updateList();
        break;
      case "UPDATEID":
        updateDrawingDataId(tmpdata[1],tmpdata[2])
        break;
      case "DATAID":
        currentTMPid = tmpdata[1];
        break;
      case "DRAWINGID":
        selectDraw(tmpdata[1]);
        break;
      case "DRAWINGSELECTED":
        showAndHideContent(["contentDiv"],["initialDiv","loadDiv"]);
        clearScreen();
        socket.send("SEND;DATA;");
        break;

      case "WAITJOIN":
        showAndHideContent(["loadDiv"],["initialDiv","contentDiv"]);
        break;

      case "ALLOWJ":  
        selectDraw(tmpdata[1]);
        break;
        
      case "DISALLOWJ":  
        showAndHideContent(["initialDiv"],["loadDiv","contentDiv"]);
        break;

      case "DELETENOTE":
        deleteNoteCallback("note_" + tmpdata[1])
        remove1DrawingData(tmpdata[1]);
        break;

      case "UUPDATE":
        addToDrawingData(tmpdata[3], tmpdata[4],tmpdata[2],tmpdata[1]);
        processDrawCommand(tmpdata[4],tmpdata[2],tmpdata[1]=="NULL"?null:tmpdata[1]);
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
        myuserid = tmpdata[1];
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
        //forceRedraw();
        break;
      case "DOREDRAW":
        //remove1DrawingData(tmpdata[1]);
        forceRedraw();
        break;
      case "LOGOUTSUCCESS":
        document.getElementById("loggedinname").innerHTML = "";
        document.getElementById("needlogin").style.display = "";
        document.getElementById("loggedin").style.display = "none";
        clearScreen();
        showAndHideContent(["initialDiv"],["loadDiv","contentDiv"])
        break;
      case "ASKJOIN":
        if (confirm("Allow user " + tmpdata[2] + " to join this drawing?")) {
          socket.send("ALLOWJOIN;" + tmpdata[1] + ";");
        } else {
          socket.send("DISALLOWJOIN;" + tmpdata[1] + ";");
        }
        break;
    }
  });
}

function uploadImage(e) {
  const reader = new FileReader();
  reader.onload = (event) => {
    currentImage=event.target.result
  };
  reader.readAsDataURL(e.target.files[0]);
}

function createNote(noteID, x, y, tvalue, sx = "60px", sy = "40px", userid=myuserid, linkID=null) {
  const mynote = myuserid==userid;
  const divID = noteID + "div"
  const existingDiv = document.getElementById(divID);
  const existingTitle = document.getElementById(noteID + "_title");
  const existingnote = document.getElementById(noteID);
  let linkTEXT = "";

  if(linkID!=null)linkTEXT=" LINKED" ;
  if (existingnote && existingDiv) {
    existingDiv.style.left = x;
    existingDiv.style.top = y;
    existingDiv.style.width = sx;
    existingDiv.style.height = sy;
    existingTitle.innerHTML="Author: "+userid+linkTEXT;

    existingnote.style.left = 0;
    existingnote.style.top = 0;
    existingnote.style.width = sx;
    existingnote.style.height = sy;
    existingnote.innerText = tvalue?tvalue:"";
  } else {
    let div = document.createElement("div");
    let button = document.createElement("button");
    let lbutton = document.createElement("button");
    let input = document.createElement("div");
    let br = document.createElement("br");
    
    let title=document.createElement("p");
    title.innerHTML="Author: "+getUser(userid)+linkTEXT;
    title.id =noteID + "_title"
    title.style = "float: left; padding: 0; margin:0;"

    div.appendChild(button)
    if(mynote)div.appendChild(lbutton)
    div.appendChild(title)
    div.appendChild(br)
    div.appendChild(input)

    button.onclick= function (){handleDeleteNote(this)};
    button.style = "float: right; padding: 0; margin:0;"
    button.innerHTML ="X"

    lbutton.onclick= function (){currentlyLinking=this};
    lbutton.style = "float: right; padding: 0; margin:0;"
    lbutton.innerHTML ="L"


    //div.addEventListener("mousedown", dragElement)


    div.style = "position: absolute; resize: both; z-index: 2; overflow: hidden; background-color: rgba(255,255,204,0.1); min-width: 8em;"
    div.id = divID
    div.style.left = x;
    div.style.top = y;
    div.style.width = sx;
    div.style.height = sy;



    //input.type = "text";
    input.id = noteID;
    input.contentEditable =mynote;
    //input.readOnly=!mynote;
    if(mynote) input.oninput = function () {
      updateNote(
        this.id,
        this.innerText,
        div.style.left,
        div.style.top,
        div.style.width,
        div.style.height
      );
    };
    div.classList.add("drawNoteDiv");
    div.classList.add("drawNoteDivExtraStyle");
    input.style = "word-wrap: break-word; display:block; position: relative; z-index: 2; width: 100%; height: 100%; border: none; resize: none; background-color: rgba(255,255,204,0.1);";
    input.style.left = 0;
    input.style.top = 0;
    input.innerText = tvalue?tvalue:"";
    input.classList.add("drawNote");
    if(mynote)draggable(div,input);
    //console.log(noteID);

    document.getElementById("canvDIV").appendChild(div);
  }
}

function draggable(element,noteinput) {
  var isMouseDown = false;
  var mouseX = 0;
  var mouseY = 0;

  var elementX = element.style.left;
  var elementY = element.style.top;

  element.addEventListener('mousedown', onMouseDown);


  function onMouseDown(event) {
    let crect = document.getElementById('canvas1').getBoundingClientRect();
    mouseX = event.clientX - crect.left;
    mouseY = event.clientY - crect.top;
    const rightEdge = parseInt(element.style.left) + parseInt(element.style.width);
    const leftEdge = rightEdge - 15;
    const bottomEdge = parseInt(element.style.top) + parseInt(element.style.height);
    const topEdge = bottomEdge - 15;
    if (mouseX > leftEdge && mouseX < rightEdge && mouseY < bottomEdge && mouseY > topEdge) {
      // resizing, don't drag
      return;
    }
    isMouseDown = true;
  }

  element.addEventListener('mouseup', onMouseUp);

  function onMouseUp(event) {

    updateNote(
      noteinput.id,
      noteinput.innerText,
      element.style.left,
      element.style.top,
      element.style.width,
      element.style.height
    );
    isMouseDown = false;
    elementX = parseInt(element.style.left) || 0;
    elementY = parseInt(element.style.top) || 0;
  }

  document.addEventListener('mousemove', onMouseMove);

  function onMouseMove(event) {
    if (!isMouseDown) return;
    let crect = document.getElementById('canvas1').getBoundingClientRect();

    var deltaX = event.clientX - mouseX - crect.left;
    var deltaY = event.clientY - mouseY - crect.top;
    element.style.left = elementX + deltaX + 'px';
    element.style.top = elementY + deltaY + 'px';
  }
}


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

const draw64BaseImage = (x,y,b64IMG) => {
  let context1 = document.getElementById("canvas1").getContext("2d");
  let image = new Image();
  image.onload = function() {
    context1.drawImage(image, x,y);
  };
  image.src = b64IMG;
}
const convert64BaseStringToNote = (str,userid,linkID) => {
  const note = atob(str).split(":");
  //console.log(linkID);
  createNote(note[0], note[1], note[2], note[5], note[3], note[4],userid,linkID);
};

const convert64BaseStringToCoordinates = (str, eraseMode = false) => {
  parseString = window.atob(str);
  let canvas = document.getElementById("canvas1");
  let context = canvas.getContext("2d");
  let startX = parseString.charCodeAt(0) + (parseString.charCodeAt(1) << 8);
  let startY = parseString.charCodeAt(2) + (parseString.charCodeAt(3) << 8);
  //console.log(startX);
  //console.log(startY);
  if (eraseMode) {
    context.lineWidth = 5;
    context.globalCompositeOperation = "destination-out";
  } else {
    context.lineWidth = 1;
    context.globalCompositeOperation = "source-over"
  };
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


function createNewDrawing() {
  const drawingName = prompt("Name for drawing", "") || "no name";
  const drawingDesc = prompt("Description for drawing", "") || "no description";
  socket.send("NEW;DRAWING;"+drawingName+";"+drawingDesc+";");
  socket.send("LIST;DRAWING;");
}
function selectDraw(id) {
  socket.send("SELECT;" + id + ";");
  socket.send("DRAWINGUSERS;");
}
function doUndo() {
  socket.send("UNDO;DATA;");
}
//async function selectDraw(id) {
//  return await sendMessage(socket, "SELECT;" + id + ";", true);
//}

function leaveDrawing() {
  socket.send("LEAVEDRAWING;");
}
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

function sendImage(x,y,image){
  let tmpId = "IMG"+0;
  let drawcom = "IMG:"+x+":"+y+":"+image.replace(";", '*');;
  let command = "NEW;IMAGE;"+tmpId+";"+drawcom;
  addToDrawingData(tmpId,drawcom);
  socket.send(command)
}

async function windowAlmostLoad() {
  let canvasDIV = document.getElementById("canvDIV");
  let canvas = document.getElementById("canvas");
  let canvas1 = document.getElementById("canvas1");
  let context = canvas.getContext("2d");
  let context1 = canvas1.getContext("2d");
  let imageloader = document.getElementById("imageloader");
  imageloader.addEventListener("change", uploadImage);
  imageloader.addEventListener("click", function(){canvasDIV.style.cursor="pointer";setDrawMode();this.value=""});
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
    if(currentlyLinking){
      handleLinkNote(currentlyLinking,mouseX,mouseY)
      currentlyLinking = null;
    }else {
      socket.send("NEW;NOTE;" + mouseX + "px;" + mouseY + "px;");
    }

  });

  canvas.addEventListener("mousedown", function (event) {
    setMouseCoordinates(event, "canvas");
    if(currentImage !=""){
      let image = new Image();
      image.onload = function() {
        context1.drawImage(image, mouseX,mouseY);
      };
      image.src = currentImage;
      sendImage(mouseX,mouseY,currentImage);
      currentImage ="";
      canvasDIV.style.cursor="";
    } else {
      socket.send("NEW;DATA;");
      interVARl = setInterval(sendDataInterval, 200);
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
    }
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
      //if(resizeCanvas()){
      //  forceRedraw();
      //}
      
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
  canvasDIV.addEventListener("mouseup", function (event) {
    if (!isDrawing) {
      if(resizeCanvas()){
        forceRedraw();
      }
    }
  });

  function resizeCanvas() {
    let didResize=false;
    const divx = canvasDIV.style.width.split("px")[0];
    const divy = canvasDIV.style.height.split("px")[0];
    //console.log(divx);
    if (canvas.width != divx) {
      canvas.width = divx;
      canvas1.width = divx;
      didResize=true;
    }

    if (canvas.height != divy) {
      canvas.height = divy;
      canvas1.height = divy;
      didResize=true;
    }
    return didResize;
  }

  // Handle Mouse Coordinates
  function setMouseCoordinates(event, canv) {
    let crect = document.getElementById(canv).getBoundingClientRect();

    mouseX = event.clientX - crect.left;
    mouseY = event.clientY - crect.top;
  }
}

function exportImage() {
  
  [].forEach.call(document.getElementsByClassName("drawNoteDiv"), function (aa) {
    aa.classList.remove("drawNoteDivExtraStyle");
  });
  html2canvas(document.querySelector("#canvDIV")).then(canvas => {
    const data = canvas.toDataURL();
    //document.body.appendChild(canvas)
    const anchor = document.createElement("a");
    anchor.href = data;
    anchor.download = "export.png"
    anchor.target = "_blank";
    anchor.click();
    [].forEach.call(document.getElementsByClassName("drawNoteDiv"), function (aa) {
      aa.classList.add("drawNoteDivExtraStyle");
    });
  })
}
