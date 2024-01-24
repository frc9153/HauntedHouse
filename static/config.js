export { Config };

const Config = {
    BOT_SIZE_FT: [
        // FIXME: Probably not our size!
        32.3 / 12,
        31.0 / 12.
    ],
    SATISFACTORY_DISTANCE: 5,
    MAX_SPEED: 5,
    ROT_SPEED: 4,
    BOT_ROTATE: true,
    FREEZE_NPCS: false,
    NPC_BOREDOM_TIMER_RANGE: [60, 90],
    DRAW_GRID: true,
    DRAW_FIELD: true,
};

const settingsContainerEl = document.getElementById("settings-container");

class UserSetting {
    constructor(name, type) {
        this.name = name;
        this.type = type;

        let inputEl = null;
        switch (type) {
            case "bool":
                inputEl = document.createElement("input");
                inputEl.type = "checkbox";
		inputEl.checked = Config[name];
                break;
            default:
                throw new Error("What is " + type);
        }

        const labelEl = document.createElement("span");
        labelEl.innerText = name;

        inputEl.addEventListener("change", function() {
            let val = inputEl.checked;
            Config[name] = val;
        });

        const container = document.createElement("div");
        container.className = "setting";
        container.appendChild(labelEl);
        container.appendChild(inputEl);

        settingsContainerEl.appendChild(container);
    }
}

new UserSetting("BOT_ROTATE", "bool");
new UserSetting("FREEZE_NPCS", "bool");
new UserSetting("DRAW_GRID", "bool");
new UserSetting("DRAW_FIELD", "bool");
