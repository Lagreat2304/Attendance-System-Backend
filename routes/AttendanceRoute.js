const express = require("express");
const {
    getAttendanceByDept,
    enterAttendanceByDept,
    getAttendance,
    deleteAttendanceByDays,
} =  require("../controllers/AttendanceController.js");
const { protect, admin } =  require("../middleware/Auth.js");
const router = express.Router();
router.route("/:Dept").get(protect, getAttendanceByDept);
router.route("/").post(protect, admin, enterAttendanceByDept);
router.route("/:days").delete(protect, admin, deleteAttendanceByDays);
router.route("/getAnalysis").post(protect, getAttendance);
module.exports = router;