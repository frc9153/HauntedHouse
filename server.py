import sys
import json
import logging
from typing import Any
from flask import Flask, send_file
import flask.cli
from flask_sock import Sock
from networktables import NetworkTables

# Zap Flask spam
flask.cli.show_server_banner = lambda *_: None
logging.getLogger("werkzeug").disabled = True

app = Flask("HauntedHouse")
sock = Sock(app)

# Don't cache files
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

with open("config.json", "r") as file:
    Config = json.load(file)

# Sorry 10000er friends but I am sleepy and don't want to debug regex
assert Config["teamNumber"] < 10_000
BOTBRAIN_IP_ADDRESS = ".".join(
    [
        "10",
        str(Config["teamNumber"])[:-2].zfill(2),
        str(Config["teamNumber"])[-2:].zfill(2),
        "2"
    ]
)

print(f"Connecting to {BOTBRAIN_IP_ADDRESS}...")
NetworkTables.initialize(server=BOTBRAIN_IP_ADDRESS)
DEAD_SOCKET = "--dead" in sys.argv or not NetworkTables.isConnected()

if DEAD_SOCKET:
    print("DEAD ROBOT")
else:
    for i in range(5):
        print("LIVE ROBOT! LIVE ROBOT! LIVE ROBOT!")

class SocketResponses:
    OK = {"success": True}
    ERROR = {"success": False}

class NetTableTables:
    limelight = NetworkTables.getTable("limelight")
    command_and_control = NetworkTables.getTable("evil_manipulation")

class NetTableEntries:
    pose = NetTableTables.limelight.getEntry("botpose")
    heartbeat = NetTableTables.command_and_control.getEntry("badump_token")
    drive_vector = NetTableTables.command_and_control.getEntry("drive_vector")

def error(*args) -> None:
    print("[error]", *args)

@app.route("/")
def index():
    return send_file("static/index.html")

@sock.route("/socket_bocket_locket_rocket")
def socket(ws):
    # Robot commands are sent via websockets to avoid latency and scary HTTP
    # nightmares like caching.

    # NOTE: This route will be instanced in a new thread for each client. Greenlet is evil!!!!!!!!!!!

    if DEAD_SOCKET:
        return

    while True:
        incoming = json.loads(ws.receive())
        try:
            assert "cmd" in incoming
            assert "key" in incoming
        except Exception as e:
            print(incoming)
            raise e

        # cmd still in dat boooooo booooooo boooooooooooo boooooooooooooo boooooooooooooooooooooooooooo
        out = execute_command(incoming["cmd"], incoming)

        # Tell the client what on Earth it's receiving
        out = {**out, "cmd": incoming["cmd"], "key": incoming["key"]}

        ws.send(json.dumps(out))

def execute_command(cmd: str, dat: dict) -> Any:
    match cmd:
        case "set":
            return execute_set_command(dat["key"], dat["value"])
        case "get":
            return {"result": execute_get_command(dat["key"])}
        case _:
            error(f"[execute_command] Bad command '{cmd}'")
            return SocketResponses.ERROR

def execute_set_command(key: str, value: Any) -> dict:
    # TODO: Better type annotation for SocketResponses

    match key:
        case "drive_vector":
            NetTableEntries.drive_vector.setDoubleArray(value)
        case "badump":
            # Here we recieve a random float (0-1) token and mirror it to the bot. The bot will be
            # watchdogging around waiting for us to stop sending this without warning. If we do
            # that, bad things are afoot, and it will DIE!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            assert isinstance(value, float)
            NetTableEntries.heartbeat.setDouble(value)
        case _:
            error(f"[set_command] Bad key '{key}'")
            return SocketResponses.ERROR
    return SocketResponses.OK

def execute_get_command(key: str) -> Any:
    match key:
        case "pose":
            return NetTableEntries.pose.getDoubleArray([0, 0, 0, 0, 0, 0])
        case _:
            error(f"[get_command] Bad key '{key}'")
            return SocketResponses.ERROR

    error(f"[get_command] Didn't return anything for '{key}'")
    return SocketResponses.ERROR

if __name__ == "__main__":
    print("Ready! :^) @ http://localhost:8080")
    app.run(
        host="localhost",
        port=8080,
    )
