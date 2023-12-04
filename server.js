const express = require('express')
const { createServer } = require('http')
const path = require('path');
const { Server } = require('socket.io')
const mongoose = require('mongoose')
const MONGO_URI = process.env['MONGO_URI']
if (!MONGO_URI) return console.log('Please add your mongo uri in .env file')

mongoose.connect(MONGO_URI)

const playersSchema = new mongoose.Schema({
  playerId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String
  },
  // gameId: {
  //   type: String,
  //   required: true,
  //   unique: true
  // }
});

const Players = mongoose.model('Players', playersSchema);

mongoose.connection.on('connected', () => {
  console.log('Database Connected')
});

mongoose.connection.on('disconnected', () => {
  console.log('Database Disconnected')
});

const app = express()
const server = createServer(app)
const io = new Server(server)
const port = 3000



// Render Html File
// app.use(express.static('public'))
// path.join(path.resolve('public'), 'script.js')

app.use(express.static(path.resolve('public')));

// app.get('/', function(req, res) {
//   res.sendFile(path.join(path.resolve('public'), 'index.html'));
// });

// app.get('/style.css', function(req, res) {
//   res.sendFile(path.join(path.resolve('public'), 'style.css'));
// });

// app.get('/script.js', function(req, res) {
//   res.sendFile(path.join(path.resolve('public'), 'script.js'))
// })

// app.get('/script.js', function(req, res) {
//   res.sendFile(path.join(path.resolve('public'), 'script.js'))
// })

let player_arr = []
io.on('connection', (socket) => {
  //console.log('a user connected')

  socket.on("loaded", () => {
    socket.emit("loaded", player_arr)
  })

   socket.on("create1", (data) => {
     console.log(typeof(data))
     console.log(data.name, " Joined the Game!")
     player_arr.push(data.name)

     message = data.name + " joined the game"
     
      io.emit("update", { data: player_arr, notif: message })
   })

    socket.on("tagged", (data) => {
      console.log(data.name, " was tagged")
      console.log(data)
      //console.log(typeof(data))
      console.log(data.name)
      player_arr.pop(data.name)

      message = data.name + " was tagged"

      io.emit("update", { data: player_arr, notif: message })
    })

  
  socket.on('disconnect', () => {
    //console.log('user disconnected')
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

