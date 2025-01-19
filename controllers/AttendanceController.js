const asyncHandler = require("express-async-handler");
const Attendance = require("../models/Attendance");
const getAttendanceByDept = asyncHandler(async (req, res) => {
  const date = req.body.date || Date().toString().substring(0, 15);
  const attendance = await Attendance.findOne({
    Dept: { $in: [req.body.Dept] },
    date: date,
  });
  if (attendance) {
    res.json(attendance);
  } else {
    res.status(404);
    throw new Error(
      `You didn't take attendance today for room  No:${req.params.Dept}`
    );
  }
});

const getAttendance = asyncHandler(async (req, res) => {
  const date = req.body.date || Date().toString().substring(0, 15);
  const attendance = await Attendance.findOne({
    date: date,
  });
  if (attendance) {
    res.json(attendance);
  } else {
    res.status(404);
    throw new Error(`You didn't take attendance ${date}!!`);
  }
});

const enterAttendanceByDept = asyncHandler(async (req, res) => {
  const date = req.body.date || Date().toString().substring(0, 15);
  const attendance = await Attendance.findOne({
    date: date,
  });
  if (attendance) {
    const dataTemp = attendance.data;
    const detailsTemp = attendance.details;
    for (const [key, value] of Object.entries(req.body.data)) {
      dataTemp.set(key, value);
    }
    for (const [key, value] of Object.entries(req.body.details)) {
      detailsTemp.set(key, value);
    }
    attendance.details = detailsTemp;
    attendance.data = dataTemp;

    const updatedAttendance = await attendance.save();
    res.json(updatedAttendance);
  } else {
    const newAttendance = await Attendance.create({
      Dept: [req.body.Dept],
      date: date,
      data: req.body.data,
      details: req.body.details,
    });
    res.json(newAttendance);
  }
});

const deleteAttendanceByDays = asyncHandler(async (req, res) => {
  const days = req.params.days;
  var date = new Date();
  var deletionDate = new Date(date.setDate(date.getDate() - days));
  await Attendance.deleteMany({
    createdAt: { $lt: deletionDate },
  });
  res.json({ message: `Deleted Attendance for before past ${days} days` });
});

module.exports = {
  getAttendanceByDept,
  enterAttendanceByDept,
  getAttendance,
  deleteAttendanceByDays,
};