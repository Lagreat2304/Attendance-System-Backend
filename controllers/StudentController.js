const asyncHandler = require("express-async-handler");
const Student = require("../models/Student");
const Attendance = require("../models/Attendance");
const bcrypt = require("bcrypt");
const cloudinary = require("cloudinary").v2;
const getToken = require("../utils/generateToken");
const OTP = require("../models/OTP");
const multer = require("multer");
const nodemailer = require("nodemailer");

const storage = multer.memoryStorage();
const upload = multer({ storage }).single("image");


const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASS,
  },
});


transporter.verify((error, success) => {
  if(error){
      console.log(error)
  } else {
      console.log("Ready for sending emails...");
  }
})


const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

const sendOTP = asyncHandler(async (req, res) => {
  console.log(req.body);
  const { registerNumber } = req.body;
  const student = await Student.findOne({ registerNo: registerNumber });

  if (!student) {
    res.status(404).json({ message: "Student not found" });
    return;
  }

  const otp = generateOTP();

  const existingOtp = await OTP.findOne({ userId: student._id });
  if (existingOtp) {
    await existingOtp.deleteOne();
  }
  const newOtp = new OTP({
    userId: student._id,
    otp,
  });

  await newOtp.save();
  const email = student.email;
  const mailOptions = {
    from: `No-Reply <${process.env.AUTH_EMAIL}>`,
    to: email,
    subject: 'Password Reset OTP',
    html: `
      <p>Hello ${student.name},</p>
      <p>We received a request to reset your password. Your OTP for password reset is: <strong>${otp}</strong></p>
      <p>Please use this OTP to reset your password. Note that the OTP is valid for only <strong>10 minutes</strong>.</p>
      <p>If you did not request a password reset, please ignore this email. Do not share this OTP with anyone for security reasons.</p>
      <p>Thank you,<br>The Support Team<br><small>(No-reply email)</small></p>
    `,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      res.status(500).json({ message: "Error sending OTP", error });
    } else {
      res.status(200).json({ message: "OTP sent successfully" });
    }
  });
});

const verifyOTP = asyncHandler(async (req, res) => {
  const { registerNumber, otp } = req.body;

  const student = await Student.findOne({ registerNo:registerNumber });
  if (!student) {
    res.status(404).json({ message: "Student not found" });
    return;
  }

  const otpRecord = await OTP.findOne({ userId: student._id });

  if (!otpRecord || otpRecord.otp !== otp) {
    res.status(400).json({ message: "Invalid OTP" });
    return;
  }

  res.status(200).json({ message: "OTP verified successfully" });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { registerNumber, password } = req.body;

  const student = await Student.findOne({ registerNo: registerNumber });
  if (!student) {
    res.status(404).json({ message: "Student not found" });
    return;
  }
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  student.password = hashedPassword;
  await student.save();
  const otpRecord = await OTP.findOne({ userId: student._id });
  await otpRecord.deleteOne();

  res.status(200).json({ message: "Password reset successfully" });
});

const getStudent = asyncHandler(async (req, res) => {
  const { email: rawEmail, password: rawPassword } = req.body;
  const email = rawEmail.trim();
  const password = rawPassword.trim();
  const student = await Student.findOne({ email });
  if(!student){
    res.status(401).json({ message: "User Not Found!" });
  }
  const dehashedPassword = await bcrypt.compare(password, student.password);
  if (student && dehashedPassword) {
    const token = getToken(student.email);
    res.json({
      _id: student._id,
      name: student.name,
      address: student.address,
      registerNo: student.registerNo,
      email: student.email,
      dob: student.dob,
      city: student.city,
      contact: student.contact,
      fatherContact: student.fatherContact,
      department: student.department,
      year: student.year,
      status: student.status,
      image: student.image,
      token: token,
    });
  } else {
    res.status(401).json({ message: "Invalid password" });
  }
});

const addStudent = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "No image file uploaded." });
    return;
  }

  cloudinary.uploader.upload_stream(
    { resource_type: 'auto' },
    async (error, result) => {
      if (error) {
        res.status(500).json({ message: error.message });
        return;
      }
      const imageUrl = result.secure_url;
      const { name, address, registerNo, dob, email, password: rawPassword, city, contact, fatherContact, department, year, status } = req.body;
      const password = rawPassword.trim();
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const student = await Student.create({
        name,
        address,
        registerNo,
        email,
        password: hashedPassword,
        dob,
        city,
        contact,
        fatherContact,
        image: imageUrl,
        department,
        year,
        status,
      });

      if (student) {
        res.status(201).json({ message: "Student registered successfully!", student });
      } else {
        res.status(500).json({ message: "Failed to create student" });
      }
    }
  ).end(req.file.buffer);
});

const updateStudentProfile = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.body._id);

  if (student) {
    student.name = req.body.name || student.name;
    student.address = req.body.address || student.address;
    student.registerNo = req.body.registerNo || student.registerNo;
    student.city = req.body.city || student.city;
    student.contact = req.body.contact || student.contact;
    student.fatherContact = req.body.fatherContact || student.fatherContact;
    student.image = req.body.image || student.image;
    student.department = req.body.department || student.department;
    student.year = req.body.year || student.year;
    student.status = req.body.status || student.status;
    const updatedStudent = await student.save();

    res.json({
      _id: updatedStudent._id,
      name: updatedStudent.name,
      address: updatedStudent.address,
      registerNo: updatedStudent.registerNo,
      city: updatedStudent.city,
      contact: updatedStudent.contact,
      fatherContact: updatedStudent.fatherContact,
      image: updatedStudent.image,
      department: updatedStudent.department,
      year: updatedStudent.year,
      status: updatedStudent.status,
    });
  } else {
    res.status(404);
    throw new Error("Student not found");
  }
});

const getAllStudents = asyncHandler(async (req, res) => {
  const pageSize = 15;
  const page = Number(req.query.pageNumber) || 1;

  const keyword = req.query.keyword
    ? {
        name: {
          $regex: req.query.keyword,
          $options: "i",
        },
      }
    : {};

  const count = await Student.countDocuments({ ...keyword });
  const students = await Student.find({ ...keyword })
    .limit(pageSize)
    .skip(pageSize * (page - 1));
  if (students && students.length != 0) {
    res.json({ students, page, pages: Math.ceil(count / pageSize) });
  } else {
    res.status(404);
    throw new Error("No Students Found");
  }
});

const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (student) {
    await student.deleteOne();
    res.json({ message: "Student removed" });
  } else {
    res.status(404);
    throw new Error("Student not found");
  }
});

const getStudentById = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (student) {
    res.json(student);
  } else {
    res.status(404);
    throw new Error("Students not found");
  }
});

const getStudentBydepartment = asyncHandler(async (req, res) => {
  const attendance = await Attendance.findOne({
    date: Date().toString().substring(0, 15),
    department: { $in: [req.params.deptId] },
  });
  const students = await Student.find({ department: req.params.deptId });
  if (students) {
    attendance
      ? res.json({ students: students, attendance: attendance })
      : res.json({ students: students });
  } else {
    res.status(404);
    throw new Error("Students not found");
  }
});

module.exports = {
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
};