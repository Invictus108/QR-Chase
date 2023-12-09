const mongoose = require('mongoose');

const playersSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  socketId: {
    type: String,
    required: true,
    unique: true
  }
});

module.exports = mongoose.model('Players', playersSchema);