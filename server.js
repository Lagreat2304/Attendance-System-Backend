const express = require('express');
const app = express();
const cors = require('cors');
const dotenv = require('dotenv');
const connetDB = require('./config/Connect');
const userRoutes = require('./routes/UserRoute');
const studentRoutes = require('./routes/StudentRoute');
const attendanceRoutes = require('./routes/AttendanceRoute');
const { errorHandler, notFound } = require('./middleware/Error');


app.use(cors());
dotenv.config();
connetDB();
const cloudinary = require('cloudinary').v2;
require('dotenv').config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/users", userRoutes);
app.use("/student", studentRoutes);
app.use("/attendance", attendanceRoutes);

app.get("/", async (req, res) => {
  res.send("API is running....");
});

app.use(errorHandler);
app.use(notFound);

const PORT = process.env.PORT || 5000;

app.listen(
  PORT,
  console.log(`Server running on port ${PORT}`)
);