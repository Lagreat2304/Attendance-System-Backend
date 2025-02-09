const express = require('express');
const router = express.Router();
const {
    verifyFace,
    markAttendance,
    getAttendanceByDateRange,
    getTodayAttendance,
    deleteAttendance,
    getDepartmentAttendance,
    getAttendancePercentage,
    getStudentAttendance,
    getAttendanceByDate,
    getUnverifiedAttendanceByDate,
    approveAttendance,
    declineAttendance,
    approveAllAttendance,
    generateAttendance,
} = require('../controllers/AttendanceController');

router.route('/verify').post(verifyFace);
router.route('/mark').post(markAttendance);

router.get('/date-range',  getAttendanceByDateRange);
router.get('/student/:studentId',  getStudentAttendance);
router.get('/department/:deptId',   getDepartmentAttendance);
router.get('/percentage/:studentId',   getAttendancePercentage);
router.get('/today',   getTodayAttendance);

//router.put('/:id',   updateAttendance);
router.delete('/:id',   deleteAttendance);
//by suganth

router.get("/date/:date", getAttendanceByDate);

// New route: Get unverified attendance for a specific date
router.get("/unverified/:date", getUnverifiedAttendanceByDate);

router.put("/approve/:id", approveAttendance);
router.put("/decline/:id", declineAttendance);
router.put("/approve-all", approveAllAttendance);

// New route: Generate missing attendance records for a given date
router.post("/generate/:date", generateAttendance);

module.exports = router;