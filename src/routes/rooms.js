const express = require('express');
const Room = require('../models/Room');
const auth = require('../middlewares/auth');

const router = express.Router();

// POST /api/rooms  → สร้างห้องใหม่ When we have Token
router.post('/', auth, async (req, res) => {
  try {
    const { roomNumber, roomType, price } = req.body;
    const room = new Room({ roomNumber, roomType, price });
    await room.save();
    res.status(201).json(room);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// router.post('/', auth, async (req, res) => {

//     router.post('/', async (req, res) => {
//   try {
//     const { roomNumber, roomType, price } = req.body;
//     const room = new Room({ roomNumber, roomType, price });
//     await room.save();
//     res.status(201).json(room);
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// });

// GET /api/rooms → ดึงห้องทั้งหมด
router.get('/', async (req, res) => {
  try {
    const rooms = await Room.find();
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rooms/types → ประเภทห้อง (สำหรับ front-end dropdown)
router.get('/types', (req, res) => {
  res.json(['Standard', 'Deluxe', 'Suite']);
});

module.exports = router;
