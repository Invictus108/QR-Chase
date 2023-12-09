const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  roomId: {
    type: String,
    required: true
  },
  socketId: {
    type: String,
    required: true,
    unique: true
  }
});

module.exports = mongoose.model('Player', playerSchema);