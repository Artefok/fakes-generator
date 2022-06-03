const express = require('express');
const nunjucks = require('nunjucks');
const session = require('express-session');
const sqlite = require('sqlite3');
const http = require('http');
const { Server } = require("socket.io");
const bodyParser = require('body-parser');
const { response } = require('express');
const { stringify } = require('querystring');
var cookieParser = require("cookie-parser");

let app = express();

const server = http.createServer(app);
const io = new Server(server);
let room_id = 0;
let isLogged = false;

app.use(express.static(__dirname + "/static"));
nunjucks.configure('templates', {
    autoescape: true,
    express: app
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); 

let socketnames = session({
     secret: "gcim2oa2", 
     user_state: 0
});

io.use(function(socket, next) {
    socketnames(socket.request, socket.request.res, next);
});

app.use(socketnames);

async function get_data(sql_query, argms) {
    let db = new sqlite.Database("database.db", (err) => {
        if(err) {
            console.error(err.message);
        } else {
            console.log("Connect to database.db complete");
        }
    });
    console.log(sql_query, argms);
    let sql_queryes = {
        "auth": "SELECT * FROM users WHERE name = ? AND password = ?",
        "reg": "INSERT INTO users (name, password) VALUES (?, ?)",
        "start_game": "INSERT INTO rooms (id_room, first, second, state, level) VALUES (?, ?, ?, 1, ?)",
        "check_user": "SELECT * FROM rooms WHERE (second = ? OR first = ?) AND id_room = ?",
        "shop": "SELECT * FROM items",
        "abilities": "SELECT * FROM abilities WHERE name = ?",
        "items": "SELECT * FROM users_items WHERE id = ?",
        "sea": 'SELECT * FROM rooms WHERE second = "" AND NOT first = ?',
        "rooms": "SELECT * FROM rooms WHERE state = 1 AND ABS(level - ?) <= 2",
        "first_player": 'SELECT * FROM users JOIN rooms ON rooms.first = users.id WHERE rooms.id_room = ?',
        "search": 'SELECT * FROM rooms JOIN users ON rooms.first = users.id WHERE ABS(users.level - ?) <= 2 AND users.status = 1 AND NOT id = ? AND rooms.state = 1 AND rooms.second = ""',
    }
    let promise = new Promise ((resolve, reject) => {
        console.log(sql_queryes[sql_query], argms);
        db.all(sql_queryes[sql_query], argms, (err, rows) => {
            if(err) {
                reject(err);
            } else {
                resolve(rows)
            };
        })
    });
    let data = await promise;
    db.close();
    return data;
}

async function give_data(sql_query, argms) {
    let db = new sqlite.Database("database.db", (err) => {
        if(err) {
            console.error(err.message);
        } else {
            console.log("Connect to database.db complete");
        }
    });
    console.log(sql_query, argms);
    let sql_queryes = {
        "fighting": "UPDATE users SET status = 2 WHERE id = ?",
        "searching": "UPDATE users SET status = 1 WHERE id = ?",
        "active": "UPDATE users SET status = 0 WHERE id = ?",
        "win": "UPDATE users SET wins = wins+1 WHERE id = ?",
        "lose": "UPDATE users SET loses = loses+1 WHERE id = ?",
        "connect": 'UPDATE rooms SET second = ? WHERE first = ?'
    }
    let promise = new Promise ((resolve, reject) => {
        console.log(sql_queryes[sql_query], argms);
        db.run(sql_queryes[sql_query], argms, (err, rows) => {
            if(err) {
                reject(err);
            } else {
                resolve(rows)
            };
        })
    });

    let data = await promise;
    db.close();
    return data;
}

app.get("/", (req, res) => {
    res.render("main.html");
});
app.get("/shop", (req, res) => {
    get_data("shop").then((data) => {
        let data1 = {"data1":{}}
        for (i = 0; i < data.length; ++i){
            let tmp = data[i]
            data1["data1"][tmp["name"]] = data[i]
        }
        console.log(data1);
        res.render("base.html", data1);
    })
});
app.get("/con_battle", (req, res) => {
    req.session.user_state = 0;
    get_data("rooms", [req.session.user.data[0].level]).then((data) => {
        let data1 = {"data1":{}}
        for (i = 0; i < data.length; ++i){
            let tmp = data[i]
            data1["data1"][tmp["id_room"]] = data[i]
        }
        console.log(data1);
        res.render("base_rooms.html", data1);
    });
});
app.get("/start_game", (req, res) => {
    req.session.room_id=Math.floor(Math.random()*(100000));
    get_data("start_game", [req.session.room_id, req.session.user.data[0].id, "", req.session.user.data[0].level]).then((data) => {
        req.session.user_state = 1;
        console.log(req.session.user_state);
        res.redirect(`/game/${req.session.room_id}`); 
    });
});

app.get("/game/:game_id", (req, res) => {
    give_data("fighting", [req.session.user.data[0].id]).then((data) => {});
    let data = {"data": {}};
    if(req.session.user_state == 1){
        res.render("base_battle.html", {"data": {"user1": req.session.user.data[0]}});
    } else if (req.session.user_state == 0){
        req.session.room_id = req.params.game_id
        get_data("first_player", [req.session.room_id]).then((info) => {
            data["data"] = {"user2": info[0], "user1":req.session.user.data[0]};
            req.session.user2 = data["data"]["user2"];
            give_data("connect", [req.session.user.data[0].id, req.session.user2.id]).then((data) => {});
            console.log(data);
            res.render("base_battle.html", data);
        });
    } else if (req.session.user_state == 2){
        data["data"] = {"user2": req.session.user2, "user1": req.session.user.data[0]};
        res.render("base_battle.html", data);
    }
})

app.get("/reg", (req, res) => {
    res.render("reg.html");
});

app.post("/reg", (req, res) => {
    req.session.user = req.body;
    get_data("reg", Object.values(req.session.user)).then((data) => {
        res.redirect("/auth");
        isLogged = true;
    }, (err) => {
        console.log(err);
        res.redirect("/reg");
    });
})
app.get("/auth", (req, res) => {
    if(req.session.user){
        isLogged = true;
        res.redirect("/profile");
    } else {
        res.render("auth.html");
    }
});
app.post("/auth", (req, res) => {
    let data1 = {"data":{}}
    get_data("auth", Object.values(req.body)).then((data) => {
        if(data.length > 0){
            data1["data"] = data
            req.session.user = data1;
            isLogged = true;
            res.redirect("/profile");
        } else {
            res.render("auth.html", {response: "Неверный логин или пароль. Попробуйте снова!"});
        }
    }, (err) => {
        console.log(err);
        res.redirect("/auth");
    });
});
app.get("/profile", (req, res) => {
    give_data("active", req.session.user.data[0].id).then((data) => {
        res.render("base_profile.html", req.session.user);
    });
});

io.on('connect', function(socket){
    let room_id = socket.request.session.room_id;
    socket.join(stringify(room_id));
    console.log("player joined");
    console.log(socket.request.session.user_state);
    if(socket.request.session.user_state == 0){
        socket.join(socket.request.session.user.data[0].id);
        socket.to(socket.request.session.user2.id).emit("second_connect", [socket.request.session.user.data[0]]);
    } else if (socket.request.session.user_state == 1){
        socket.join(socket.request.session.user.data[0].id);
        socket.on("update_socket", function(data) {
            socket.request.session.user2 = data;
        });
    }
    socket.on("attack", function (room_id) {
        if(Math.floor(Math.random * 100) <= socket.request.session.user2.dodge){
            console.log("Second player dodged!");
        } else {
            socket.request.session.user2.hp = socket.request.session.user2.hp - (socket.request.session.user.data[0].attack - socket.request.session.user2.defense); 
        }
        if(socket.request.session.user.data[0].hp <= 0){
            console.log("second player wins");
            socket.emit("win", "Second");
            socket.leave(stringify(room_id));
        } else if(socket.request.session.user2.hp <= 0) {
            console.log("first player wins");
            socket.emit("win", "First");
            socket.leave(stringify(room_id));
            socket.leave(socket.request.session.user.data[0].id);
        }
        console.log(`HP1: ${socket.request.session.user.data[0].hp}`);
        console.log(`HP2: ${socket.request.session.user2.hp}`);
        socket.to(socket.request.session.user2.id).emit("update", {"data":{"user1": socket.request.session.user.data[0], "user2": socket.request.session.user2, "user_state": 0}});
        
    });
});

server.listen(3000, () => {
    console.log('listening on http://127.0.0.1:3000/');
});
