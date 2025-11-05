// controllers/roomController.js
const Room = require('../models/Room');
const Booking = require('../models/Booking');

// ================== List rooms (optionally filter available between dates) ==================
exports.list = async (req, res, next) => {
  try {
    const { from, to } = req.query; // ISO date strings
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);

      // หาห้องที่มี booking ขัดแย้งในช่วงนั้น
      const bookedRoomIds = await Booking.find({
        checkIn: { $lt: toDate },
        checkOut: { $gt: fromDate },
        bookingStatus: { $in: ['reserved','confirmed'] }
      }).distinct('room');

      // ดึงห้องที่ไม่ถูกจองและ status = available
      const rooms = await Room.find({ _id: { $nin: bookedRoomIds }, status: 'available' });
      return res.json(rooms);
    }

    // ถ้าไม่ filter วัน ให้แสดงห้องทั้งหมด
    const rooms = await Room.find();
    res.json(rooms);
  } catch (err) {
    next(err);
  }
};

// ================== Create room ==================
exports.create = async (req, res, next) => {
  try {
    const { roomNumber, roomType, price, status } = req.body;
    const room = await Room.create({ roomNumber, roomType, price, status });
    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
};
