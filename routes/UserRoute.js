const express = require("express");
const router = express.Router();
const {
  authUser,
  registerUser,
  getLoggedInUser, // Update the route handler
  updateUserProfile,
  getUsers,
  deleteUser,
  getUserById,
  updateUser,
} = require("../controllers/UserController.js");
const { protect, admin } = require("../middleware/Auth.js");

// Public routes
router.route("/").post(registerUser).get(protect, admin, getUsers); // Admin protected for getting users
router.post("/login", authUser);

// Routes for logged-in user's profile
router.route("/profile").get(protect, getLoggedInUser).put(protect, updateUserProfile); // Modify to use getLoggedInUser

// Admin routes
router.route("/:id")
  .delete(protect, admin, deleteUser)
  .get(protect, admin, getUserById)
  .put(protect, admin, updateUser);

module.exports = router;
