import time
from typing import Any
from networktables import NetworkTables

NetworkTables.initialize(server="10.91.53.2")


def on_value_changed(key: str, value: Any, is_new: bool) -> None:
    prefix = "[NEW]" if is_new else ""
    print(f"{prefix} '{key}': {value}")


NetworkTables.addEntryListener(on_value_changed)

# Keep main thread busy for a while (he doesn't know)
while True:
    time.sleep(1)
