var socket = io().connect();
var pathname = window.location.pathname;
let path = pathname.split("/")
let room_id = path[path.length - 1]

$(document).ready(function () {
    socket.on("second_connect", function(data) {
        $('#name1').text(data[0]['name']);
        $('#level1').text(data[0]['level']);
        $('#rank1').text(data[0]['rank']);
        $('#hp1').text(data[0]['hp']);
        $('#attack1').text(data[0]['attack']);
        $('#defense1').text(data[0]['defense']);
        $('#mag-attack1').text(data[0]['mag-attack']);
        $('#dodge1').text(data[0]['dodge']);
        console.log("sheesh");
        socket.emit("update_socket", data[0]);
    });
    socket.on("return", function(){
        window.location.href = "/profile";
    });
    $('#attack').on('click', function () {
        socket.emit('attack', room_id);
    });
    socket.on("win", function(player){
        if(player == 'First'){
            $('#attack').text("You win!");
            $('#attack').prop("disabled", true);
        } else if(player == 'Second') {
            $('#attack').text("You lose!");
            $('#attack').prop("disabled", true);
        }
    });
    socket.on("update", function (data) {
        console.log(data);
        console.log(data.data.user_state);
        $('.first-card .stats #hp').text(data["data"].user2.hp);
        $('.second-card .stats #hp1').text(data["data"].user1.hp);
        console.log("sus");
        socket.emit("sus", 1);
        socket.on("lets go", (data) => {
            console.log(data);
            console.log("yeeeeeeees!");
            $('.first-card .stats #hp').text(data["data"].user2.hp);
            $('.second-card .stats #hp1').text(data["data"].user1.hp);
        });
    });
})

