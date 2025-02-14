const express = require("express");
const {
    getStudent,
    addStudent,
    updateStudentProfile,
    getAllStudents,
    deleteStudent,
    getStudentById,
    getStudentBydepartment,
    sendOTP,
    verifyOTP,
    resetPassword
} =  require("../controllers/StudentController.js");
const { protect, admin } = require("../middleware/Auth.js");
const upload  = require("../middleware/Upload.js");
const router = express.Router();
router.route("/all").get(getAllStudents);
router.route("/addStudent").post(upload, addStudent);
router.route("/login").post(getStudent);
router.route("/sendOTP").post(sendOTP);
router.route("/verifyotp").post(verifyOTP);
router.route("/reset-password").post(resetPassword);
router
  .route("/:id")
  .get(protect, getStudentById)
  .delete(protect, admin, deleteStudent)
  .put(protect, admin, updateStudentProfile);
router.route("/dept/:deptId").get(getStudentBydepartment);
module.exports = router;