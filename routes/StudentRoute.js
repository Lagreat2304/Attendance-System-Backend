const express = require("express");
const {
    getStudent,
    addStudent,
    updateStudentProfile,
    getAllStudents,
    deleteStudent,
    getStudentById,
    getStudentBydepartment,
} =  require("../controllers/StudentController.js");
const { protect, admin } = require("../middleware/Auth.js");
const upload  = require("../middleware/Upload.js");

const router = express.Router();
router.route("/all").get(protect, getAllStudents);
router.route("/addStudent").post(upload, addStudent);
router.route("/login").post(getStudent);
router
  .route("/:id")
  .get(protect, getStudentById)
  .delete(protect, admin, deleteStudent)
  .put(protect, admin, updateStudentProfile);
router.route("/dept/:deptId").get(getStudentBydepartment);
module.exports = router;