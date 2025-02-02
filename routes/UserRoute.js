const express = require("express");
const router = express.Router();
const {
  authUser,
  registerUser,
  getLoggedInUser,
  updateUserProfile,
  getUsers,
  deleteUser,
  getUserById,
  updateUser,
  getAllAttendance,
} = require("../controllers/UserController.js");

// Public routes
router.post("/login", authUser);
router.post("/register", registerUser);
router.get("/profile", getLoggedInUser);

// Routes for updating profiles
router.put("/profile", updateUserProfile);

// Admin routes
router.get("/", getUsers);
router.route("/:id").get(getUserById).put(updateUser).delete(deleteUser);

console.log("test")
// Attendance routes
router.get("/allattendance", getAllAttendance); // New route to fetch all attendance



module.exports = router;



