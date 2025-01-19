const asyncHandler = require("express-async-handler");
const Student = require("../models/Student");
const Attendance = require("../models/Attendance");
const bcrypt = require("bcrypt");
const cloudinary = require("cloudinary").v2;
const jwt = require("jsonwebtoken");
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage }).single("image");


const getStudent = asyncHandler(async (req, res) => {
  const { email: rawEmail, password: rawPassword } = req.body;
  const email = rawEmail.trim();
  const password = rawPassword.trim();
  console.log(email, password);
  const student = await Student.findOne({ email });
  if(!student){
    res.status(401).json({ message: "User Not Found!" });
  }
  console.log(student);
  const dehashedPassword = await bcrypt.compare(password, student.password);
  console.log(dehashedPassword);
  if (student && dehashedPassword) {
    const token = jwt.sign({ email },process.env.JWT_SECRET , { expiresIn: '1h' });
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
  console.log("Form data received:", req.body);
  console.log("Image data:", req.file);

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
      console.log(hashedPassword);
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
    await student.remove();
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
};