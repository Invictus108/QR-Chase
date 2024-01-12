const express = require('express')
const session = require('express-session');
const { createServer } = require('http')
const path = require('path');
const { Server } = require('socket.io')
const mongoose = require('mongoose')
const Player = require('./schemas/players')
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
const io = new Server(server, { addTrailingSlash: false })
const port = 3000

// Use the cookies
io.use((socket, next) => {
  const parsedCookies = cookie.parse(socket.handshake.headers.cookie || '');
  socket.cookies = parsedCookies;
  next();
});


// Render Html File
app.use(express.static(path.resolve('public')));


// let player_arr = []
// let user_arr = []
let room;
let username;

io.on('connection', async (socket) => {
  //get data from cookies and reconnects user is they are disconnected
  room = socket.cookies.room; //socket.request.session
  username = socket.cookies.username;
  // console.log("Session data\n", room, "\n". username)
  

  // console.log(socket.request.session)
  

  //if user exist in add them back to array
  if (room && username) {
    const previousPlayerData = await Player.findOne({ username: username, roomId: room});
    if (previousPlayerData) {
      socket.join(previousPlayerData.roomId)
    } else if (!previousPlayerData) {
      const playerData = new Player({
         username: username, 
         socketId: socket.id,
         roomId: room,
       });

      await playerData.save();
      socket.join(room)
    }
  }

  // console.log('Upon Connection', io.sockets.adapter.rooms);
  
  

  // Create new room
  socket.on("create-room", async (data) => {
    // console.log('potato')
    //console.log(typeof data.room)
    // console.log('Before created All rooms:', io.sockets.adapter.rooms);

    // Need to use mode later
    const mode = data.mode;

    socket.join(data.room);

    //global varable 
    username = data.username;
    room = data.room;

    const roomAlreadyExist = await Player.findOne({ roomId: room });
    if (roomAlreadyExist) {
      return io.to(socket.id).emit("room-created", {
        worked: false
      })
    }
    
    //add to user array
    const playerData = new Player({
       username: data.username, // Set to empty initially
       socketId: socket.id,
       roomId: data.room,
     });

    await playerData.save();
    
    //store in session
    socket.cookies.username = data.username; //socket.request.session
    socket.cookies.room = data.room;
    //socket.request.session.save();
    

    //send response back to individual
    io.to(socket.id).emit("room-created", {
      worked: true,
    });
    
    // console.log('After created All rooms:', io.sockets.adapter.rooms);
  });

  //give username to front end for qr code
  socket.on("username", () => {
    //can just send all data to be put in json?
    io.to(socket.id).emit("username", {
      username: socket.cookies.username
    });;
  })

  // Join room
  socket.on("join-room", async (data) => {
    // console.log('Before Joined All rooms:', io.sockets.adapter.rooms);

    // Check if the room exists
    const rooms = io.sockets.adapter.rooms;
    if (!rooms.has(data.room)) {
      // emit error if room no exist
      return socket.emit("room-joined", {
        worked: false,
      });
    }

    // Room exists, join the room
    socket.join(data.room);

    //global varable 
    username = data.username;
    room = data.room;

    //add to user array
    const playerData = new Player({
       username: data.username, // Set to empty initially
       socketId: socket.id,
       roomId: data.room,
     });

    await playerData.save();

    //store in session
    socket.cookies.username = data.username; //socket.request.session
    socket.cookies.room = data.room;
    //socket.request.session.save();


    io.to(socket.id).emit("room-joined", {
      worked: true,
    });

    // console.log('After Joined All rooms:', io.sockets.adapter.rooms);
  });


  

  
  //give data to new players joining game
  socket.on("loaded2", async () => {
    //find players in roo,
    console.log("Loaded server side")

    const playersInRoom = await Player.find({ roomId: room }).lean();
    const usernamesInRoom = playersInRoom.map(player => player.username);
    
    //  const playersInRoom = player_arr.filter(player => player.roomId === room);
    // console.log(`looking for players in ${room}`)
    // console.log(playersInRoom)
    //  const usernamesInRoom = playersInRoom.map(player => player.username);
    // console.log('Got the following: ', usernamesInRoom)
    //  //io
      io.to(socket.id).emit("update", {data: usernamesInRoom, notif: 'Welcome to the game! 👋'})
  })

  //join game
   socket.on("create1", async (data) => {
     // Add player information to player_arr
     // const playerData = new Player({
     //   username: data.username, // Set to empty initially
     //   socketId: socket.id,
     //   roomId: data.room,
     // });

     // await playerData.save();

     console.log(data.username, " Joined the Game!")

     const message = data.username + " joined the game"

     //find players in roo,
     const playersInRoom = await Player.find({ roomId: room }).lean();

     const usernamesInRoom = playersInRoom.map(player => player.username);
     // const playersInRoom = player_arr.filter(player => player.roomId === room);
     // const usernamesInRoom = playersInRoom.map(player => player.username);


     //fix undefiend notifs
     if(message){
       io.to(room).emit("update", { data: usernamesInRoom, notif: message })
     }
     
   })

    //tags and remove tagged players
    socket.on("tagged", async (data) => {
      console.log('Tagged User Data: ', data)
      
      const dataPlayer = await Player.findOne({ username: data.username, roomId: data.room });

      let taggedPerson
      if (dataPlayer) {
        taggedPerson = dataPlayer;
        await dataPlayer.deleteOne();
      }
      else return;

      //taggerPerson: TODO: given socket.id find username
      const taggerPerson = await Player.findOne({ socketId: socket.id, roomId: data.room }).lean();
      
      const playersInRoom = await Player.find({ roomId: data.room }).lean();

       const usernamesInRoom = playersInRoom.map(player => player.username);

      message = `${data.username} was tagged 🏷️`
      message2 = `${taggerPerson?.username ?? "User"} tagged you 🏷️`
      message3 = `You tagged ${data.username} 🏷️`

      if (usernamesInRoom.length === 1) {
        message = `${taggerPerson?.username ?? "User"} won the game! 🎉`
        message3 = 'You Won! 🎉'
      }

           
      io.to(room).emit("update", { data: usernamesInRoom, notif: message })
      io.to(taggedPerson.socketId).emit("dead", {message: message2})
      io.to(socket.id).emit("update", { data: usernamesInRoom, notif: message3 })
    })

  //disconnects
  socket.on('disconnect', async () => {
    // console.log('user disconnected')

    const dataPlayer = await Player.findOne({ socketId: socket.id });
    if (dataPlayer) await dataPlayer.deleteOne();
    // const indexToRemovePlayer = player_arr.findIndex(player => player.username === username);

    // const indexToRemoveUser = user_arr.findIndex(player => player.username === username);

    // if (indexToRemovePlayer !== -1) {
    //   player_arr.splice(indexToRemovePlayer, 1);
    // }

    // if (indexToRemoveUser !== -1) {
    //   user_arr.splice(indexToRemoveUser, 1);
    // }
  })
})

server.listen(port, () => {
  console.log("Server is running on port 3000");
})