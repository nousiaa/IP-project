<?php

// websocket helper functions

/**
 * send data to websocket TODO: add support for mask
 */
function send($client,$msg){
    echo $msg;
    $mlen = strlen($msg);
    echo $mlen;
    $mlenresult = chr($mlen);
    echo $mlenresult;
    if ($mlen > 65536) {
        $mlenresult = chr(127).substr(pack('J', $mlen),0);
    } else if($mlen>127 ) {
        $mlenresult = chr(126).substr(pack('J', $mlen),6);
    }
    $msg = chr(129) . $mlenresult . $msg;
    socket_write($client,$msg,strlen($msg));
}

/** 
 * make data from websocket readable; TODO: add support for lack of mask
 */
function convert($dat) {
    if(empty($dat)) return;
    $length = ord($dat[1]) & 127;
    $maskoffset = 2;

    if($length == 126) $maskoffset = 4;
    elseif($length == 127)  $maskoffset = 10;
    
    $masks = substr($dat, $maskoffset, 4);
    $data = substr($dat, $maskoffset+4);
    $res = "";
    for ($i = 0; $i < strlen($data); $i++) $res .= $data[$i] ^ $masks[$i%4];
    
    return $res;
    }


// disable timeout for the script
set_time_limit(0);
$tokenTable = [];

// connect to database
try {
    $conn = new PDO("sqlite:./draw.db");
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    die("ERROR");
}

ob_implicit_flush();

// address and port
$address = '127.0.0.1';
$port = 10000;

// create main socket
$sock = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
socket_bind($sock, $address, $port);
socket_listen($sock);
socket_set_nonblock($sock);


$comm = "";

$clients = [];

// loop requests
while (true){

    // if new connection comes in, accept it (as a websocket connection over tcp socket)
    if ($tsoc = socket_accept($sock)) {
        socket_set_nonblock($tsoc);
        echo "NEW SOCKET";
        var_dump($tsoc);

        // do ws handshake
        $secwebsocketkey ="";
        $comm = socket_read($tsoc, 2048, PHP_BINARY_READ);
        echo "-".$comm."\n";
        
        $swk = explode("Sec-WebSocket-Key:",$comm);
        $swk = explode("\n",$swk[1]);

        $secwebsocketkey = trim($swk[0]);
        echo $secwebsocketkey."\n";
        $result1 = base64_encode(sha1($secwebsocketkey."258EAFA5-E914-47DA-95CA-C5AB0DC85B11",true));
        
        $headers = "HTTP/1.1 101 Switching Protocols\r\n";
        $headers .= "Upgrade: websocket\r\n";
        $headers .= "Connection: Upgrade\r\n";
        $headers .= "Sec-WebSocket-Version: 13\r\n";
        $headers .= "Sec-WebSocket-Accept: $result1\r\n\r\n";
        echo $headers;
        socket_write($tsoc, $headers, strlen($headers));
            
        // add client to client table
        $clients[]=[$tsoc,0,["user_id"=>null, "drawing_id"=>null]];
    }
    // loop through client connections
    foreach($clients as &$msgsock1){
        if ($msgsock1[1]==1)continue;
        $msgsock = $msgsock1[0];
        $comm ="";
        $msg = "";

        // try to get data from client
        if(false === ($comm = socket_read($msgsock, 2048, PHP_BINARY_READ))){
            if(socket_last_error() != 10035){
                socket_close($msgsock);
                $msgsock1[1]=1;
            }

        }

        // parse data from client
        $comm = convert($comm);
        $comm = trim($comm);
        $comm1 = explode(";", $comm);

        // handle the command
        switch ($comm1[0]){
            case "test":
                $msg = "";
                for($i =0; $i<200;$i++){
                    $msg .= "test".$i;
                }
                
                send($msgsock, $msg);
                break;
            case "CONSOLELOG":
                var_dump($msgsock1);
                break;
            case "LOGOUT":
                $msgsock1[2]["user_id"]=null;
                $msg = "LOGOUT";
                send($msgsock, $msg);
                break;
            case "LOGIN":
                $query = $conn->prepare('SELECT * FROM user where username=?');
                $query->execute([$comm1[1]]);
                $row = $query->fetch();
                $token = "ERROR";
                if(password_verify ($comm1[2], $row["password"])){
                    //$token = bin2hex(random_bytes(8));
                    //$tokenTable[$token]=$row["id"];
                    $token="success";
                    $msgsock1[2]["user_id"]=$row["id"];
                }

                send($msgsock, $token);
                break;
            case "NEW":
                if(empty($msgsock1[2]["user_id"])){
                    $msg = "AUTHERROR";
                    send($msgsock, $msg);
                    break;
                }


                if($comm1[1]=="DATA"){
                    if(empty($msgsock1[2]["drawing_id"])){
                        $msg = "SELECTDRAWINGERROR";
                        send($msgsock, $msg);
                        break;
                    }
                    $query = $conn->prepare('INSERT INTO data (user_id, drawing_id,deleted) VALUES (?,?,0)');
                    $query->execute([$msgsock1[2]["user_id"], $msgsock1[2]["drawing_id"]]);
                    $id = "DATAID;".$conn->lastInsertId();
                } else if($comm1[1] == "DRAWING"){
                    $query = $conn->prepare('INSERT INTO drawing (owner_id,name,description,deleted) VALUES (?,?,?,0)');
                    $query->execute([$msgsock1[2]["user_id"], $comm1[2],$comm1[3]]);
                    $id = "DRAWINGID;".$conn->lastInsertId();
                } else{
                    $id = "ERROR";
                }
                send($msgsock, $id);
                break;


            case "SELECT":
                if(empty($msgsock1[2]["user_id"])){
                    $msg = "AUTHERROR";
                    send($msgsock, $msg);
                    break;
                }
                $msgsock1[2]["drawing_id"]=$comm1[1];
                $msg = "OK";
                send($msgsock, $msg);
                break;   
            case "UPDATE":
                if(empty($msgsock1[2]["user_id"])){
                    $msg = "AUTHERROR";
                    send($msgsock, $msg);
                    break;
                }
                if($comm1[1]=="DATA"){
                    
                    // missing exists check
                    $query = $conn->prepare('UPDATE data SET command=? WHERE user_id = ? AND id = ?');
                    $query->execute([$comm1[3], $msgsock1[2]["user_id"], $comm1[2]]);

                    $msg = "UNWANTEDUPDATE;".$msgsock1[2]["drawing_id"].";".$comm1[3].";";
                    foreach($clients as $client1){
                        if($client1[2]["drawing_id"]==$msgsock1[2]["drawing_id"]){
                            var_dump($client1[2]); echo $msg;
                            send($client1[0], $msg);
                        }

                    }

                    $msg = "OK";

                } else if($comm1[1] == "DRAWING"){

                } else{
                    $msg = "ERROR";
                }
                send($msgsock, $msg);
                break;
            case "LIST":
                if(empty($msgsock1[2]["user_id"])|| ($comm1[1]=="DATA" &&empty($msgsock1[2]["drawing_id"]))){
                    $msg = "AUTHERROR";
                    send($msgsock, $msg);
                    break;
                }

                if ($comm1[1]=="DATA") {
                    if (isset($comm1[2]) && is_int($comm1[2])) {
                        $query = $conn->prepare('SELECT * FROM data where drawing_id =? AND id>?');
                        $query->execute([$msgsock1[2]["drawing_id"],$comm1[2]]);
                        $rows = $query->fetchAll();
                    } else {
                        $query = $conn->prepare('SELECT * FROM data where drawing_id =?');
                        $query->execute([$msgsock1[2]["drawing_id"]]);
                        $rows = $query->fetchAll();
                        var_dump($rows);
                    }
                    $getLastId = end($rows);
                    $resultStr = $getLastId["id"].";";
                    foreach ($rows as $row) {
                        $resultStr.=$row["command"].";";
                    }
                    send($msgsock, $resultStr);
                    break;
                } else if($comm1[1]=="DRAWING"){
                    if(empty($msgsock1[2]["user_id"])){
                        $msg = "AUTHERROR";
                        send($msgsock, $msg);
                        break;
                    }
                    $query = $conn->prepare('SELECT * FROM drawing');
                    $query->execute([]);
                    $rows = $query->fetchAll();
                    $msg = "";
                    foreach($rows as $row){
                        $msg .= $row["id"].":".$row["name"].":".$row["description"].";";
                    }
                    
                    send($msgsock, $msg);
                    break;  
                }
                $msg = "ERROR";
                send($msgsock, $msg);
                break; 

        }
    }  
}