<?php



require dirname( __FILE__ ) . '/vendor/autoload.php';


use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;




$port = 10000;

class WSSocket implements MessageComponentInterface {

    public function __construct()
    {
        $this->conn = null;

        $this->clients = [];

        try {
            $this->conn = new PDO("sqlite:../draw.db");
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch(PDOException $e) {
            die("ERROR");
        }

    }

    public function onOpen(ConnectionInterface $conn1) {

        // Store the new connection in clients
        

        $this->clients[$conn1->resourceId]=[$conn1,0,["user_id"=>null, "drawing_id"=>null]];



        echo "New connection! ({$conn1->resourceId})\n";
    }

    public function onMessage(ConnectionInterface $from, $msg1) {
        $conn = $this->conn;
        $msgsock1 = &$this->clients[$from->resourceId];
        $clients = &$this->clients;
        $msg = "";

        $comm1 = explode(";", $msg1);

        // handle the command
        switch ($comm1[0]){
            case "JOIN":
                if(empty($msgsock1[2]["user_id"])){
                    $msg = "AUTHERROR";
                    $from->send($msg);
                    break;
                }

                $query = $conn->prepare('SELECT * FROM drawing where id=?');
                $query->execute([$comm1[1]]);
                $row = $query->fetch();

                foreach($clients as $client1){
                    if($client1[2]["drawing_id"]==$comm1[1] && $client1[0]->resourceId!=$from->resourceId && $row["owner_id"]==$client1[2]["user_id"]){
                        //var_dump($client1[2]); echo $msg;
                        $client1[0]->send($msg);
                    }

                }
                $from->send("WAITJOIN");
                break;
            case "ALLOWJOIN":
                if(empty($msgsock1[2]["user_id"])){
                    $msg = "AUTHERROR";
                    $from->send($msg);
                    break;
                }
                $query = $conn->prepare('SELECT * FROM drawing where id=?');
                $query->execute([$msgsock1[2]["drawing_id"]]);
                $row = $query->fetch();
                

                if($msgsock1[2]["user_id"] != $row["owner_id"]){
                    $msg = "AUTHERROR";
                    $from->send($msg);
                    break;
                }
                $query = $conn->prepare('SELECT * FROM users where username=?');
                $query->execute([$comm1[1]]);
                $row = $query->fetch();
                


                $query = $conn->prepare('INSERT INTO allowed_users (drawing_id, user_id, deleted) VALUES (?,?,0)');
                $query->execute([$msgsock1[2]["drawing_id"], $row["id"]]);
                break;

            case "LOGOUT":
                $msgsock1[2]["user_id"]=null;
                $msgsock1[2]["drawing_id"]=null;
                $msg = "LOGOUTSUCCESS";
                $from->send($msg);
                break;
            case "LOGIN":
                $query = $conn->prepare('SELECT * FROM user where username=?');
                $query->execute([$comm1[1]]);
                $row = $query->fetch();
                $token = "LOGINERROR";
                if(password_verify ($comm1[2], $row["password"])){

                    $token="LOGINSUCCESS";
                    $msgsock1[2]["user_id"]=$row["id"];
                }
                $from->send($token);
                break;
            case "NEW":
                if(empty($msgsock1[2]["user_id"])){
                    $msg = "AUTHERROR";
                    $from->send($msg);
                    break;
                }


                if($comm1[1]=="DATA"){
                    if(empty($msgsock1[2]["drawing_id"])){
                        $msg = "SELECTDRAWINGERROR";
                        $from->send($msg);
                        break;
                    }
                    $query = $conn->prepare('INSERT INTO data (user_id, drawing_id,deleted) VALUES (?,?,0)');
                    $query->execute([$msgsock1[2]["user_id"], $msgsock1[2]["drawing_id"]]);
                    $id = "DATAID;".$conn->lastInsertId();
                } else if($comm1[1] == "DRAWING"){
                    $query = $conn->prepare('INSERT INTO drawing (owner_id,name,description,deleted) VALUES (?,?,?,0)');
                    $query->execute([$msgsock1[2]["user_id"], $comm1[2],$comm1[3]]);
                    $id = "DRAWINGID;".$conn->lastInsertId();
                    $query = $conn->prepare('INSERT INTO allowed_users (drawing_id, user_id, deleted) VALUES (?,?,0)');
                    $query->execute([$conn->lastInsertId(), $msgsock1[2]["user_id"]]);
                    
                } else if($comm1[1]=="NOTE"){
                    if(empty($msgsock1[2]["drawing_id"])){
                        $msg = "SELECTDRAWINGERROR";
                        $from->send($msg);
                        break;
                    }
                    $query = $conn->prepare('INSERT INTO data (user_id, drawing_id,deleted) VALUES (?,?,0)');
                    $query->execute([$msgsock1[2]["user_id"], $msgsock1[2]["drawing_id"]]);
                    $id = "NEWNOTE;".$conn->lastInsertId().";".$comm1[2].";".$comm1[3].";";
                } else {
                    $id = "ERROR";
                }
                $from->send($id);
                break;


            case "SELECT":
                $query = $conn->prepare('SELECT count(*) from allowed_users WHERE drawing_id=? AND user_id=? AND deleted<>1');
                $query->execute([$comm1[1], $msgsock1[2]["user_id"]]);
                $row = $query->fetch();
                if(empty($msgsock1[2]["user_id"])||$row["count(*)"]==0){
                    $from->send("AUTHERROR");
                    break;
                }
                $msgsock1[2]["drawing_id"]=$comm1[1];
                $from->send("DRAWINGSELECTED");
                break;   
            case "UPDATE":
                if(empty($msgsock1[2]["user_id"])){
                    $msg = "AUTHERROR";
                    $from->send($msg);
                    break;
                }
                if($comm1[1]=="DATA"){
                    
                    // missing exists check
                    $query = $conn->prepare('UPDATE data SET command=? WHERE user_id = ? AND id = ?');
                    $query->execute([$comm1[3], $msgsock1[2]["user_id"], $comm1[2]]);

                    $msg = "UUPDATE;".$comm1[2].";".$comm1[3].";";
                    foreach($clients as $client1){
                        if($client1[2]["drawing_id"]==$msgsock1[2]["drawing_id"] && $client1[0]->resourceId!=$from->resourceId){
                            //var_dump($client1[2]); echo $msg;
                            $client1[0]->send($msg);
                        }

                    }

                    $msg = "OK";

                } else if($comm1[1] == "DRAWING"){

                } else{
                    $msg = "ERROR";
                }
                $from->send($msg);
                break;
            case "UNDO":
                if(empty($msgsock1[2]["user_id"])|| ($comm1[1]=="DATA" &&empty($msgsock1[2]["drawing_id"]))){
                    $from->send("AUTHERROR");
                    break;
                }
                if ($comm1[1]=="DATA") {
                    $query = $conn->prepare('SELECT  max(id)  FROM data where drawing_id =? AND deleted<>1');
                    $query->execute([$msgsock1[2]["drawing_id"]]);
                    $row = $query->fetch();

                    $query = $conn->prepare('UPDATE data SET deleted=1 WHERE drawing_id = ? AND id = ?');
                    $query->execute([$msgsock1[2]["drawing_id"],$row["max(id)"]]);

                    $msg = "DOUNDO;".$row["max(id)"].";";
                    foreach($clients as $client1){
                        $client1[0]->send($msg);
                    }
                    break;
                } else {
                    $from->send("ERROR");
                }

                break;
            case "SEND":
                if(empty($msgsock1[2]["user_id"])|| ($comm1[1]=="DATA" &&empty($msgsock1[2]["drawing_id"]))){
                    $from->send("AUTHERROR");
                    break;
                }

                if ($comm1[1]=="DATA") {
                    $query = $conn->prepare('SELECT * FROM data where drawing_id =? AND deleted<>1');
                    $query->execute([$msgsock1[2]["drawing_id"]]);
                    $rows = $query->fetchAll();
                    foreach ($rows as $row) {
                        $from->send("UUPDATE;".$row["id"].";".$row["command"].";");
                    }
                    break;
                } else {
                    $from->send("ERROR");
                }
                break;

            case "LIST":
                if(empty($msgsock1[2]["user_id"])|| ($comm1[1]=="DATA" &&empty($msgsock1[2]["drawing_id"]))){
                    $msg = "AUTHERROR";
                    $from->send($msg);
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
                    $from->send($resultStr);
                    break;
                } else if($comm1[1]=="DRAWING"){
                    if(empty($msgsock1[2]["user_id"])){
                        $msg = "AUTHERROR";
                        $from->send($msg);
                        break;
                    }
                    $query = $conn->prepare('SELECT * FROM drawing');
                    $query->execute([]);
                    $rows = $query->fetchAll();
                    $msg = "DRAWINGLIST;";
                    foreach($rows as $row){
                        $msg .= $row["id"].":".$row["name"].":".$row["description"].";";
                    }
                    
                    $from->send($msg);
                    break;  
                }
                $msg = "ERROR";
                $from->send($msg);
                break; 

        }
    }

    public function onClose(ConnectionInterface $conn1) {
        unset($this->clients[$conn1->resourceId]);
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
    }
}


$server = IoServer::factory(
    new HttpServer(
        new WsServer(
            new WSSocket()
        )
    ),
    $port
);

$server->run();
