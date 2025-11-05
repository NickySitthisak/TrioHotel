// models/Room.js
const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true, unique: true },
  roomType: {
    type: String,
    enum: ['Standard', 'Deluxe', 'Suite', 'Family', 'Honeymoon'],
    required: true
  },
  price: { type: Number, required: true },
  status: {
    type: String,
    enum: ['available', 'reserved', 'occupied', 'maintenance', 'closed'],
    default: 'available' // ✅ default เป็น available
  }
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
