const express = require('express')
const session = require('express-session');
const { createServer } = require('http')
const path = require('path');
const crypto = require('crypto');
const { Server } = require('socket.io')
const mongoose = require('mongoose')
const Players = require('./schemas/players')
const MONGO_URI = process.env['MONGO_URI']
if (!MONGO_URI) return console.log('Please add your mongo uri in .env file')
const cookie = require('cookie')

mongoose.connect(MONGO_URI)

mongoose.connection.on('connected', () => {
  //console.log('Database Connected')
});

mongoose.connection.on('disconnected', () => {
  //console.log('Database Disconnected')
});

const app = express()
const server = createServer(app)
const io = new Server(server)
const port = 3000

//generate session key
const secretKey1 = crypto.randomBytes(32).toString('hex');
const secretKey2 = crypto.randomBytes(32).toString('hex');

// Use the cookies
io.use((socket, next) => {
  const parsedCookies = cookie.parse(socket.handshake.headers.cookie || '');
  socket.cookies = parsedCookies;
  next();
});


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
let user_arr = []
let room;
let username;

io.on('connection', (socket) => {
  //get data from cookies and reconnects user is they are disconnected
  room = socket.cookies.room; //socket.request.session
  username = socket.cookies.username;
  console.log("Session data\n", room)
  console.log(username)

  // console.log(socket.request.session)
  

  //if user exist in add them back to array
  if (room && username) {
    const playerData = {
       username: username, 
       socketId: socket.id,
       roomId: room,
     };

    socket.join(playerData.roomId)
    user_arr.push(playerData);
  }

  console.log('Upon Connection', io.sockets.adapter.rooms);
  
  

  // Create new room
  socket.on("create-room", (data) => {
    // console.log('potato')
    //console.log(typeof data.room)
    console.log('Before created All rooms:', io.sockets.adapter.rooms);

    // Need to use mode later
    const mode = data.mode;

    socket.join(data.room);

    //global varable 
    username = data.username;
    room = data.room;
    
    //add to user array
    const playerData = {
       username: data.username, // Set to empty initially
       socketId: socket.id,
       roomId: data.room,
     };

    user_arr.push(playerData);
    
    //store in session
    socket.cookies.username = data.username; //socket.request.session
    socket.cookies.room = data.room;
    //socket.request.session.save();
    

    //send response back to individual
    io.to(socket.id).emit("room-created", {
      worked: true,
    });
    
    console.log('After created All rooms:', io.sockets.adapter.rooms);
  });

  //give username to front end for qr code
  socket.on("username", () => {
    //can just send all data to be put in json?
    io.to(socket.id).emit("username", {
      username: socket.cookies.username
    });;
  })

  // Join room
  socket.on("join-room", (data) => {
    console.log('Before Joined All rooms:', io.sockets.adapter.rooms);

    // Check if the room exists
    const rooms = io.sockets.adapter.rooms;
    if (!rooms.has(data.room)) {
      // emit error if room no exist
      socket.emit("room-joined", {
        worked: false,
      });
      return;
    }

    // Room exists, join the room
    socket.join(data.room);

    //global varable 
    username = data.username;
    room = data.room;

    //add to user array
    const playerData = {
       username: data.username, // Set to empty initially
       socketId: socket.id,
       roomId: data.room,
     };

    user_arr.push(playerData);

    //store in session
    socket.cookies.username = data.username; //socket.request.session
    socket.cookies.room = data.room;
    //socket.request.session.save();


    io.to(socket.id).emit("room-joined", {
      worked: true,
    });

    console.log('After Joined All rooms:', io.sockets.adapter.rooms);
  });


  

  
  //give data to new players joining game
  socket.on("loaded", () => {
    //find players in roo,
    console.log(player_arr)
     const playersInRoom = player_arr.filter(player => player.roomId === room);
    console.log(`looking for players in ${room}`)
    console.log(playersInRoom)
     const usernamesInRoom = playersInRoom.map(player => player.username);
    console.log('Got the following: ', usernamesInRoom)
     //io
      io.to(room).emit("update", {data: usernamesInRoom})
  })
  

  //join game
   socket.on("create1", (data) => {
     // Add player information to player_arr
     const playerData = {
       username: data.username, // Set to empty initially
       socketId: socket.id,
       roomId: data.room,
     };
     player_arr.push(playerData);

     console.log(data.username, " Joined the Game!")

     message = playerData.username + " joined the game"

     //find players in roo,
     const playersInRoom = player_arr.filter(player => player.roomId === room);
     const usernamesInRoom = playersInRoom.map(player => player.username);


     //io
      io.to(room).emit("update", { data: usernamesInRoom, notif: message })
   })

    //tags and remove tagged players
    socket.on("tagged", (data) => {
      console.log(data.username, " was tagged")
      //console.log(typeof(data))

      //find user that was tagged and remove them
      const indexToRemove = player_arr.findIndex(player => player.username === data.name);
      
      if (indexToRemove !== -1) {
        const removedPlayer = player_arr.splice(indexToRemove, 1)[0];
      }
      //find players in room
       const playersInRoom = player_arr.filter(player => player.roomId === room);
       const usernamesInRoom = playersInRoom.map(player => player.username);

      message = data.name + " was tagged"
      
      io.to(room).emit("update", { data: usernamesInRoom, notif: message })
    })

  //disconnects
  socket.on('disconnect', () => {
    //console.log('user disconnected')
    const indexToRemovePlayer = player_arr.findIndex(player => player.username === username);

    const indexToRemoveUser = user_arr.findIndex(player => player.username === username);

    if (indexToRemovePlayer !== -1) {
      player_arr.splice(indexToRemovePlayer, 1);
    }

    if (indexToRemoveUser !== -1) {
      user_arr.splice(indexToRemoveUser, 1);
    }
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

