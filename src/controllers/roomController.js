const Room = require('../models/Room');
const Booking = require('../models/Booking');

// list rooms (optionally available between dates)
exports.list = async (req, res, next) => {
  try {
    const { from, to } = req.query; // ISO date strings
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);

      // find rooms that have conflicting bookings in that range
      const bookedRoomIds = await Booking.find({
        checkIn: { $lt: toDate },
        checkOut: { $gt: fromDate },
        bookingStatus: { $in: ['reserved','confirmed'] }
      }).distinct('room');

      const rooms = await Room.find({ _id: { $nin: bookedRoomIds }, status: 'available' });
      return res.json(rooms);
    }
    const rooms = await Room.find();
    res.json(rooms);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { roomNumber, roomType, price, status } = req.body;
    const room = await Room.create({ roomNumber, roomType, price, status });
    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
};
