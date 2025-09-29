const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  type: String,
  message: String,
  sendDate: Date
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
