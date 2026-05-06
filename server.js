const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {

    socket.on("join-room", ({ roomId, userId }) => {
        socket.join(roomId);
        socket.userId = userId;

        const users = [...io.sockets.adapter.rooms.get(roomId) || []]
            .map(id => io.sockets.sockets.get(id)?.userId)
            .filter(Boolean);

        socket.emit("existing-users", users);

        socket.to(roomId).emit("user-connected", userId);

        socket.on("offer", data => {
            io.to(getSocketId(data.target)).emit("offer", {
                sender: userId,
                sdp: data.sdp
            });
        });

        socket.on("answer", data => {
            io.to(getSocketId(data.target)).emit("answer", {
                sender: userId,
                sdp: data.sdp
            });
        });

        socket.on("ice-candidate", data => {
            io.to(getSocketId(data.target)).emit("ice-candidate", {
                sender: userId,
                candidate: data.candidate
            });
        });

        socket.on("disconnect", () => {
            socket.to(roomId).emit("user-disconnected", userId);
        });
    });
});

function getSocketId(userId) {
    for (let [id, socket] of io.of("/").sockets) {
        if (socket.userId === userId) return id;
    }
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
