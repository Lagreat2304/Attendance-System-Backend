const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User.js");

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      console.log("Token received:", token); // Log the token

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded ID:", decoded.id); // Log the decoded ID

      req.user = await User.findById(decoded.id).select("-password");
      console.log("User found:", req.user); // Log the user object

      if (!req.user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      next();
    } catch (error) {
      console.error("Token verification failed:", error.message); // Log token errors
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    res.status(401).json({ message: "Not authorized, no token" });
  }
});


const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(401).json({ message: "Not authorized as admin" });
  }
};

module.exports = { protect, admin };
