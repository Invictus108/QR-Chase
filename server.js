const express = require('express')
const { createServer } = require('http')
const path = require('path');
const { Server } = require('socket.io')

const app = express()
const server = createServer(app)
const io = new Server(server)
const port = 3000



// Render Html File
app.get('/', function(req, res) {
  res.sendFile(path.join(path.resolve('public'), 'index.html'));
});

app.get('/style.css', function(req, res) {
  res.sendFile(path.join(path.resolve('public'), 'style.css'));
});

app.get('/script.js', function(req, res) {
  res.sendFile(path.join(path.resolve('public'), 'script.js'))
})

io.on('connection', (socket) => {
  console.log('a user connected')
  socket.on('disconnect', () => {
    console.log('user disconnected')
  })
})

server.listen(port, () => {
  console.log("Server is running on port 3000");
})


// const express = require("express");
// const http = require("http");
// const socketIo = require("socket.io");

// const app = express();
// const server = http.createServer(app);
// const io = socketIo(server);
// const path = require('path');

// app.use(express.static("public"));

// io.on('connection', (socket) => {
//     console.log('a user connected');
//     socket.on("send", (query) => {
//         console.log(query);
//         io.emit("send", "die");
      
//     });
// });

// server.listen(process.env.PORT || 3000, () => {
//     console.log("Server is running on port " + (process.env.PORT || 3000));
// });

