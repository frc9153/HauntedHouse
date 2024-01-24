from flask import Flask, send_file

app = Flask("HauntedHouse")

# Don't cache files
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

@app.route("/")
def index():
    return send_file("static/index.html")

if __name__ == "__main__":
    app.run(
        host="localhost",
        port=8080,
    )
