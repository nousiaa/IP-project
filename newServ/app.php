<?php
require dirname(__FILE__) . '/vendor/autoload.php';

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;

$port = 10000;

class WSSocket implements MessageComponentInterface
{
    public function __construct()
    {
        $this->conn = null;
        $this->servconf=require("settings.php");
        $this->clients = [];

        try {
            $dbconf = $this->servconf["DB"];
            $this->conn = new PDO("mysql:host=".$dbconf["DBHOST"].";dbname=".$dbconf["DBNAME"], $dbconf["DBUSER"], $dbconf["DBPASS"]);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch (PDOException $e) {
            die("ERROR");
        }
    }

    public function onOpen(ConnectionInterface $conn1)
    {
        // Store the new connection in clients
        $this->clients[$conn1->resourceId]=[$conn1,0,["user_id"=>null, "drawing_id"=>null]];
        echo "New connection! ({$conn1->resourceId})\n";
    }

    public function onMessage(ConnectionInterface $from, $msg1)
    {
        $conn = $this->conn;
        $msgsock1 = &$this->clients[$from->resourceId];
        $clients = &$this->clients;
        $msg = "";

        $comm1 = explode(";", $msg1);

        // handle the command
        switch ($comm1[0]) {
            case "DRAWINGUSERS":
                if (empty($msgsock1[2]["user_id"])||empty($msgsock1[2]["drawing_id"])) {
                    $msg = "AUTHERROR";
                    $from->send($msg);
                    break;
                }

                $query = $conn->prepare('SELECT user_id FROM allowed_users where drawing_id=?');
                $query->execute([$msgsock1[2]["drawing_id"]]);
                $rows = $query->fetchAll();
                $msg = "USERIDS;";
                foreach($rows as $row){
                    $msg .=$row["user_id"].":";
                }
                $msg=substr($msg, 0, -1);
                $msg .= ";";
                $from->send($msg);


                break;
            case "WHOIS":
                if (empty($msgsock1[2]["user_id"])) {
                    $msg = "AUTHERROR";
                    $from->send($msg);
                    break;
                }
                $query = $conn->prepare('SELECT username FROM user where id=?');
                $query->execute([$comm1[1]]);
                $row = $query->fetch();
                $from->send("USERIS;".$comm1[1].";".$row["username"].";");
                break;
            case "LINKNOTE":
                if (empty($msgsock1[2]["user_id"])||empty($msgsock1[2]["drawing_id"])) {
                    $msg = "AUTHERROR";
                    $from->send($msg);
                    break;
                }

                $query = $conn->prepare('UPDATE data SET linked_to=? where drawing_id=? AND id=?');
                $query->execute([$comm1[2],$msgsock1[2]["drawing_id"],$comm1[1]]);
                $from->send("LINKED;");
                break;
            case "LEAVEDRAWING":
                if (empty($msgsock1[2]["user_id"])||empty($msgsock1[2]["drawing_id"])) {
                    $msg = "AUTHERROR";
                    $from->send($msg);
                    break;
                }
                    
                $query = $conn->prepare('SELECT * FROM drawing where id=?');
                $query->execute([$msgsock1[2]["drawing_id"]]);
                $row = $query->fetch();
                

                if ($msgsock1[2]["user_id"] == $row["owner_id"]) {
                    $query = $conn->prepare('UPDATE allowed_users SET deleted=1 where drawing_id=?');
                    $query->execute([$msgsock1[2]["drawing_id"]]);
                    $query = $conn->prepare('UPDATE drawing SET deleted=1 where id=?');
                    $query->execute([$msgsock1[2]["drawing_id"]]);
                    $did  =$msgsock1[2]["drawing_id"];
                    $msg = "LEAVEDRAWING;";
                    foreach ($clients as &$client1) {
                        if ($client1[2]["drawing_id"]==$did) {
                            $client1[2]["drawing_id"]=null;
                            $client1[0]->send($msg);
                        }
                    }
                    $msgsock1[2]["drawing_id"] = null;
                } else {
                    $query = $conn->prepare('UPDATE allowed_users SET deleted=1 where drawing_id=? AND user_id=?');
                    $query->execute([$msgsock1[2]["drawing_id"],$msgsock1[2]["user_id"]]);
                    $msgsock1[2]["drawing_id"] = null;
                    $from->send("LEAVEDRAWING;");
                }

                break;
            case "DELETENOTE":
                if (empty($msgsock1[2]["user_id"])||empty($msgsock1[2]["drawing_id"])) {
                    $msg = "AUTHERROR";
                    $from->send($msg);
                    break;
                }
                $query = $conn->prepare('UPDATE data SET deleted=1 WHERE drawing_id = ? AND id = ?');
                $query->execute([$msgsock1[2]["drawing_id"],$comm1[1]]);

                $query = $conn->prepare('INSERT INTO data (user_id, drawing_id,deleted,command, linked_to) VALUES (?,?,0,?,?)');
                $query->execute([$msgsock1[2]["user_id"], $msgsock1[2]["drawing_id"],"DELETED",$comm1[1]]);
                $from->send("DELETEOK");

                $msg = "DELETENOTE;".$comm1[1].";";
                foreach ($clients as $client1) {
                    if ($client1[2]["drawing_id"]==$msgsock1[2]["drawing_id"]) {
                        $client1[0]->send($msg);
                    }
                }
                break;
            case "DISALLOWJOIN":
                if (empty($msgsock1[2]["user_id"])) {
                    $msg = "AUTHERROR";
                    $from->send($msg);
                    break;
                }
                $query = $conn->prepare('SELECT * FROM drawing where id=?');
                $query->execute([$msgsock1[2]["drawing_id"]]);
                $row = $query->fetch();
                

                if ($msgsock1[2]["user_id"] != $row["owner_id"]) {
                    $msg = "AUTHERROR";
                    $from->send($msg);
                    break;
                }
                foreach ($clients as $client1) {
                    if ($client1[2]["user_id"]==$comm1[1]) {
                        $client1[0]->send("DISALLOWJ;".$msgsock1[2]["drawing_id"].";");
                    }
                }
                $from->send("OK");
                break;
            case "ALLOWJOIN":
                if (empty($msgsock1[2]["user_id"])) {
                    $msg = "AUTHERROR";
                    $from->send($msg);
                    break;
                }
                $query = $conn->prepare('SELECT * FROM drawing where id=?');
                $query->execute([$msgsock1[2]["drawing_id"]]);
                $row = $query->fetch();
                

                if ($msgsock1[2]["user_id"] != $row["owner_id"]) {
                    $msg = "AUTHERROR";
                    $from->send($msg);
                    break;
                }


                $query = $conn->prepare('INSERT INTO allowed_users (drawing_id, user_id, deleted) VALUES (?,?,0)');
                $query->execute([$msgsock1[2]["drawing_id"], $comm1[1]]);

                foreach ($clients as $client1) {
                    if ($client1[2]["user_id"]==$comm1[1]) {
                        $client1[0]->send("ALLOWJ;".$msgsock1[2]["drawing_id"].";");
                    }
                }
                $from->send("OK");

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
                if (password_verify($comm1[2], $row["password"])) {
                    $token="LOGINSUCCESS;".$row["id"].";";
                    $msgsock1[2]["user_id"]=$row["id"];
                }
                $from->send($token);
                break;
            case "NEW":
                if (empty($msgsock1[2]["user_id"])) {
                    $msg = "AUTHERROR";
                    $from->send($msg);
                    break;
                }

                if ($comm1[1]=="IMAGE") {
                    if (empty($msgsock1[2]["drawing_id"])) {
                        $msg = "SELECTDRAWINGERROR";
                        $from->send($msg);
                        break;
                    }
                    $query = $conn->prepare('INSERT INTO data (user_id, drawing_id,deleted,command) VALUES (?,?,0,?)');
                    $query->execute([$msgsock1[2]["user_id"], $msgsock1[2]["drawing_id"],$comm1[3]]);
                    $id = $conn->lastInsertId();
                    $from->send("UPDATEID;".$comm1[2].";".$id.";");
                    

                    $msg = "UUPDATE;NULL;".$msgsock1[2]["user_id"].";".$id.";".$comm1[3].";";
                    foreach ($clients as $client1) {
                        if ($client1[2]["drawing_id"]==$msgsock1[2]["drawing_id"] && $client1[0]->resourceId!=$from->resourceId) {
                            $client1[0]->send($msg);
                        }
                    }
                    break;
                } elseif ($comm1[1]=="DATA") {
                    if (empty($msgsock1[2]["drawing_id"])) {
                        $msg = "SELECTDRAWINGERROR";
                        $from->send($msg);
                        break;
                    }
                    $query = $conn->prepare('INSERT INTO data (user_id, drawing_id,deleted) VALUES (?,?,0)');
                    $query->execute([$msgsock1[2]["user_id"], $msgsock1[2]["drawing_id"]]);
                    $id = "DATAID;".$conn->lastInsertId();
                } elseif ($comm1[1] == "DRAWING") {
                    $query = $conn->prepare('INSERT INTO drawing (owner_id,name,description,deleted) VALUES (?,?,?,0)');
                    $query->execute([$msgsock1[2]["user_id"], $comm1[2],$comm1[3]]);
                    $id = "DRAWINGID;".$conn->lastInsertId();
                    $query = $conn->prepare('INSERT INTO allowed_users (drawing_id, user_id, deleted) VALUES (?,?,0)');
                    $query->execute([$conn->lastInsertId(), $msgsock1[2]["user_id"]]);
                } elseif ($comm1[1]=="NOTE") {
                    if (empty($msgsock1[2]["drawing_id"])) {
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
                if (empty($msgsock1[2]["user_id"])) {
                    $msg = "AUTHERROR";
                    $from->send($msg);
                    break;
                }
                $query = $conn->prepare('SELECT count(*) from allowed_users WHERE drawing_id=? AND user_id=? AND deleted<>1');
                $query->execute([$comm1[1], $msgsock1[2]["user_id"]]);
                $row = $query->fetch();

                // handle asking for join
                if ($row["count(*)"]==0) {
                    $query = $conn->prepare('SELECT * FROM drawing where id=?');
                    $query->execute([$comm1[1]]);
                    $row = $query->fetch();
    
                    $query = $conn->prepare('SELECT * FROM user where id=?');
                    $query->execute([$msgsock1[2]["user_id"]]);
                    $row1 = $query->fetch();
    
                    $msg = "ASKJOIN;".$msgsock1[2]["user_id"].";".$row1["username"].";";
    
                    foreach ($clients as $client1) {
                        if ($client1[2]["drawing_id"]==$comm1[1] && $client1[0]->resourceId!=$from->resourceId && $row["owner_id"]==$client1[2]["user_id"]) {
                            $client1[0]->send($msg);
                        }
                    }
                    $from->send("WAITJOIN");
                    break;
                }

                $msgsock1[2]["drawing_id"]=$comm1[1];
                $from->send("DRAWINGSELECTED");
                break;
            case "UPDATE":
                if (empty($msgsock1[2]["user_id"])) {
                    $msg = "AUTHERROR";
                    $from->send($msg);
                    break;
                }
                if ($comm1[1]=="DATA") {
                    
                    // missing exists check
                    $query = $conn->prepare('UPDATE data SET command=? WHERE user_id = ? AND id = ?');
                    $query->execute([$comm1[3], $msgsock1[2]["user_id"], $comm1[2]]);

                    $query = $conn->prepare('SELECT linked_to FROM data WHERE user_id = ? AND id = ?');
                    $query->execute([$msgsock1[2]["user_id"], $comm1[2]]);
                    $row1 = $query->fetch();
                    $ltoID = $row1["linked_to"];
                    if($ltoID==null){
                        $ltoID="NULL";
                    }
                    if($query->rowCount()>0){
                        $msg = "UUPDATE;".$ltoID.";".$msgsock1[2]["user_id"].";".$comm1[2].";".$comm1[3].";";
                        foreach ($clients as $client1) {
                            if ($client1[2]["drawing_id"]==$msgsock1[2]["drawing_id"] && $client1[0]->resourceId!=$from->resourceId) {
                                $client1[0]->send($msg);
                            }
                        }
                        $msg = "OK";
                    } else {
                        $msg = "AUTHERROR";
                    }
                } else {
                    $msg = "ERROR";
                }
                $from->send($msg);
                break;
            case "UNDO":
                if (empty($msgsock1[2]["user_id"])|| ($comm1[1]=="DATA" &&empty($msgsock1[2]["drawing_id"]))) {
                    $from->send("AUTHERROR");
                    break;
                }
                if ($comm1[1]=="DATA") {
                    $query = $conn->prepare('SELECT  max(id)  FROM data where drawing_id =? AND deleted<>1');
                    $query->execute([$msgsock1[2]["drawing_id"]]);
                    $row = $query->fetch();

                    $query = $conn->prepare('SELECT  command, linked_to  FROM data where drawing_id =? AND id=?');
                    $query->execute([$msgsock1[2]["drawing_id"],$row["max(id)"]]);
                    $row1 = $query->fetch();

                    if($row1["command"]=="DELETED"){
                        $query = $conn->prepare('UPDATE data SET deleted=1 WHERE drawing_id = ? AND id = ?');
                        $query->execute([$msgsock1[2]["drawing_id"],$row["max(id)"]]);
                        $query = $conn->prepare('UPDATE data SET deleted=0 WHERE drawing_id = ? AND id = ?');
                        $query->execute([$msgsock1[2]["drawing_id"],$row1["linked_to"]]);
                        $query = $conn->prepare('SELECT * FROM data where drawing_id =? AND id=?');
                        $query->execute([$msgsock1[2]["drawing_id"],$row1["linked_to"]]);
                        $row2 = $query->fetch();

                        $linkID = $row2["linked_to"];
                        if($linkID==null)$linkID="NULL";
                        $msg = "UUPDATE;".$linkID.";".$row2["user_id"].";".$row2["id"].";".$row2["command"].";";
                        foreach ($clients as $client1) {
                            if ($client1[2]["drawing_id"]==$msgsock1[2]["drawing_id"]) {
                                $client1[0]->send($msg);
                            }
                        }
                        break;
                    }else {
                        $query = $conn->prepare('SELECT id from data WHERE drawing_id = ? AND linked_to=?');
                        $query->execute([$msgsock1[2]["drawing_id"],$row["max(id)"]]);
                        $linkedrows = $query->fetchAll();
    
                        $query = $conn->prepare('UPDATE data SET deleted=1 WHERE drawing_id = ? AND (id = ? OR linked_to=?)');
                        $query->execute([$msgsock1[2]["drawing_id"],$row["max(id)"],$row["max(id)"]]);
                        $linkedrows[]=["id"=>$row["max(id)"]];
    
                        
                        foreach ($linkedrows as $lr){
                            $msg = "DOUNDO;".$lr["id"].";";
                            foreach ($clients as $client1) {
                                if ($client1[2]["drawing_id"]==$msgsock1[2]["drawing_id"]) {
                                    $client1[0]->send($msg);
                                }
                            }
                        }
    
                        $msg = "DOREDRAW;";
                        foreach ($clients as $client1) {
                            if ($client1[2]["drawing_id"]==$msgsock1[2]["drawing_id"]) {
                                $client1[0]->send($msg);
                            }
                        }
                        break;
                    }
                    
                    break;
                } else {
                    $from->send("ERROR");
                }

                break;
            case "SEND":
                if (empty($msgsock1[2]["user_id"])|| ($comm1[1]=="DATA" &&empty($msgsock1[2]["drawing_id"]))) {
                    $from->send("AUTHERROR");
                    break;
                }

                if ($comm1[1]=="DATA") {
                    $query = $conn->prepare('SELECT * FROM data where drawing_id =? AND deleted<>1');
                    $query->execute([$msgsock1[2]["drawing_id"]]);
                    $rows = $query->fetchAll();
                    foreach ($rows as $row) {
                        $ltoID =$row["linked_to"];
                        if($ltoID==null)$ltoID = "NULL";
                        if($row["command"]!="DELETED") $from->send("UUPDATE;".$ltoID.";".$row["user_id"].";".$row["id"].";".$row["command"].";");
                    }
                    break;
                } else {
                    $from->send("ERROR");
                }
                break;

            case "LIST":
                if (empty($msgsock1[2]["user_id"])|| ($comm1[1]=="DATA" &&empty($msgsock1[2]["drawing_id"]))) {
                    $msg = "AUTHERROR";
                    $from->send($msg);
                    break;
                }

                if ($comm1[1]=="DRAWING") {
                    if (empty($msgsock1[2]["user_id"])) {
                        $msg = "AUTHERROR";
                        $from->send($msg);
                        break;
                    }
                    $query = $conn->prepare('SELECT * FROM drawing where deleted=0');
                    $query->execute([]);
                    $rows = $query->fetchAll();
                    $msg = "DRAWINGLIST;";
                    foreach ($rows as $row) {
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

    public function onClose(ConnectionInterface $conn1)
    {
        unset($this->clients[$conn1->resourceId]);
    }

    public function onError(ConnectionInterface $conn, \Exception $e)
    {
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
