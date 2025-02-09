const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Student = require("../models/Student");

// ========================== USER AUTH & MANAGEMENT ==========================

// Login user and get user details
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    });
  } else {
    res.status(401).json({ success: false, message: "Invalid email or password" });
  }
});

// Register a new user
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ success: false, message: "User already exists" });
  }

  const user = await User.create({ name, email, password });

  if (user) {
    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    });
  } else {
    res.status(400).json({ success: false, message: "Invalid user data" });
  }
});

// Get logged-in user's profile
const getLoggedInUser = asyncHandler(async (req, res) => {
  const { id } = req.query;

  try {
    const user = await User.findById(id).select("-password");
    // console.log("first2");
    if (!user) throw new Error("User not found");

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

// Update user profile
const updateUserProfile = asyncHandler(async (req, res) => {
  const { id, name, email, password, isAdmin } = req.body;
  const user = await User.findById(id);

  if (user) {
    user.name = name || user.name;
    user.email = email || user.email;
    user.isAdmin = isAdmin !== undefined ? isAdmin : user.isAdmin;

    if (password && password !== "********") {
      user.password = password;
    }

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        isAdmin: updatedUser.isAdmin,
      },
    });
  } else {
    res.status(404).json({ success: false, message: "User not found" });
  }
});

// ========================== USER MANAGEMENT ==========================

// Get all users
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select("-password");
  res.status(200).json({ success: true, data: users });
});

// Delete a user by ID
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    await user.remove();
    res.status(200).json({ success: true, message: "User removed" });
  } else {
    res.status(404).json({ success: false, message: "User not found" });
  }
});

// Get user by ID
// const getUserById = asyncHandler(async (req, res) => {
//   const user = await User.findById(req.body.id).select("-password");

//   if (user) {
//     res.status(200).json({ success: true, data: user });
//   } else {
//     res.status(404).json({ success: false, message: "User not found" });
//   }
// });

const getUserById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    // Return only the _id and name fields
    res.status(200).json({ success: true, data: { id: user._id, name: user.name } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching user" });
  }
});

// Update a user by ID
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.isAdmin = req.body.isAdmin;

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        isAdmin: updatedUser.isAdmin,
      },
    });
  } else {
    res.status(404).json({ success: false, message: "User not found" });
  }
});

// ========================== ATTENDANCE MANAGEMENT ==========================

// Fetch attendance records for a specific date

// Fetch all attendance records
const getAllAttendance = async (req, res) => {
  console.log("first")
  // res.json({msg : "ghg"})
  console.log("attendance test");
  try {
    const attendanceRecords = await Attendance.find(); // Fetch all attendance data
    console.log(attendanceRecords);
    res.status(200).json({ success: true, data: attendanceRecords });
  } catch (error) {
    console.error("Error fetching all attendance:", error);
    res.status(500).json({ success: false, message: "Failed to fetch attendance data" });
  }
};


module.exports = {
  authUser,
  registerUser,
  getLoggedInUser,
  updateUserProfile,
  getUsers,
  deleteUser,
  getUserById,
  updateUser,
  getAllAttendance,
};
