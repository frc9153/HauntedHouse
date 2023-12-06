import time
import json
import random
from networktables import NetworkTables
from simple_websocket_server import WebSocketServer, WebSocket

class Responses:
    OK = {"success": "OK"}
    ERR = {"error": "BAD"}

# yes this is ugly
# clean it up okay
# WARNING: This thing silently eats up errors for now, probably something to do
# with the WS serve loop. Heartbeat should save us here but let's fix that ASAP

# As a client to connect to a robot
NetworkTables.initialize(server="10.91.53.2")
entry = NetworkTables.getTable("limelight").getEntry("botpose")

print("Setting pipeline...")
NetworkTables.getTable("limelight").getEntry("pipeline").setDouble(1)

command_table = NetworkTables.getTable("deadfoodbabe")
heartbeat_entry = command_table.getEntry("badump")
mov_entry = command_table.getEntry("mov")
rot_entry = command_table.getEntry("rot")


def get_response(cmd: str, dat):
    if cmd == "getpose":
        e = entry.getDoubleArray(0)
        return e
    #elif cmd == "setvector":
    #    mov = dat["mov"]
    #    rot = dat["rot"]
    #    print(f"Mov {mov}, Rot {rot}")
    #    mov_entry.setDouble(mov)
    #    rot_entry.setDouble(rot)
    #    return Responses.OK
    elif cmd == "setmov":
        mov = float(dat["mov"])
        print(f"Mov {mov}")
        mov_entry.setDouble(mov)
        return Responses.OK
    elif cmd == "setrot":
        rot = float(dat["rot"])
        print(f"Rot {rot}")
        rot_entry.setDouble(rot)
        return Responses.OK
    elif cmd == "badump":
        token = dat["token"]
        assert isinstance(token, float)

        heartbeat_entry.setDouble(token)
        return Responses.OK
    else:
        return Responses.ERR

class SimpleEcho(WebSocket):
    def handle(self):
        j = json.loads(self.data)
        print(j)
        try:
            out = get_response(j["cmd"], j)
            self.send_message(json.dumps(out))
        except:
            print("AHHHHHHHHHHHHHHHHHHHHH")
            self.send_message(json.dumps({"die": true}))
            raise

    def connected(self):
        print(self.address, "connected")

    def handle_close(self):
        print(self.address, "closed")


server = WebSocketServer("", 8001, SimpleEcho)
server.serve_forever()

