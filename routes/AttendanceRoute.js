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
    getStudentAttendance
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

module.exports = router;