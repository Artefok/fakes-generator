const socket = io();

socket.on("connect", () => {
    console.log(socket.connected);
    console.log(socket.disconnected);
});