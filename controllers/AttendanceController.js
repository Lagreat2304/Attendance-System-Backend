const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const faceapi = require('face-api.js');
const canvas = require('canvas');
const { Canvas, Image, ImageData } = canvas;
const axios = require('axios');
const mongoose = require('mongoose');
const User = require('../models/User');

faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

async function convertUrlToBase64(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer'
      });
      
      const base64Image = Buffer.from(response.data, 'binary').toString('base64');
      return base64Image;
    } catch (error) {
      console.error('Error converting image:', error);
      throw new Error('Failed to convert Cloudinary image to base64');
    }
  }


const loadModels = async () => {
    await Promise.all([
        faceapi.nets.faceRecognitionNet.loadFromDisk('./weights'),
        faceapi.nets.faceLandmark68Net.loadFromDisk('./weights'),
        faceapi.nets.ssdMobilenetv1.loadFromDisk('./weights')
    ]);
    console.log("Done")
};

loadModels().catch(console.error);


const calculateDistance = (currentDescriptor, storedDescriptor) => {
    return faceapi.euclideanDistance(currentDescriptor, storedDescriptor);
};

const verifyFace = asyncHandler(async (req, res) => {
    const { studentId, currentFaceImage } = req.body;

    try {
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));
      
        const attendance = await Attendance.findOne({
          registerNo : student.registerNo,
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        });
      
        if (attendance) {
          return res.status(400).json({ message: "Attendance already marked for today" });
        }

        const currentImageBuffer = Buffer.from(currentFaceImage, 'base64');
        const storedImageBase64 = await convertUrlToBase64(student.image);
        const storedImageBuffer = Buffer.from(storedImageBase64, 'base64');
        const currentImg = await canvas.loadImage(currentImageBuffer);
        const storedImg = await canvas.loadImage(storedImageBuffer);
        const currentFaceDescriptor = await faceapi
            .detectSingleFace(currentImg)
            .withFaceLandmarks()
            .withFaceDescriptor();

        const storedFaceDescriptor = await faceapi
            .detectSingleFace(storedImg)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!currentFaceDescriptor || !storedFaceDescriptor) {
            return res.status(400).json({
                isMatch: false,
                message: "Face could not be detected clearly"
            });
        }

        const distance = calculateDistance(
            currentFaceDescriptor.descriptor,
            storedFaceDescriptor.descriptor
        );

        const threshold = 0.6;
        res.json({ isMatch: distance < threshold });
    } catch (error) {
        console.error('Face verification error:', error);
        res.status(500).json({
            isMatch: false,
            message: "Error during face verification"
        });
    }
});


const markAttendance = asyncHandler(async (req, res) => {
    const { studentId , timestamp } = req.body;

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingAttendance = await Attendance.findOne({
            student: studentId,
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        if (existingAttendance) {
            return res.status(400).json({
                success: false,
                message: "Attendance already marked for today"
            });
        }

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const classStartTime = new Date();
        classStartTime.setHours(8, 0, 0);
        const isLate = new Date(timestamp) > classStartTime;

        const attendance = await Attendance.create({
            student: studentId,
            name : student.name,
            registerNo : student.registerNo,
            date: new Date(timestamp || Date.now()),
            status: isLate ? 'Late' : 'Present',
            verificationMethod: 'Face',
            department: student.department,
            year: student.year,
            timeIn: new Date(),
        });

        res.status(201).json({
            success: true,
            message: "Attendance marked successfully",
            attendance
        });
    } catch (error) {
        console.error('Attendance marking error:', error);
        res.status(500).json({
            success: false,
            message: "Error marking attendance"
        });
    }
});


const getStudentAttendance = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    try {
        if (!studentId) {
            return res.status(400).json({ message: "Student ID is required." });
        }

        const query = { student: studentId };

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        const attendanceRecords = await Attendance.find(query)
            .sort({ date: -1 })
            .populate('student', 'name registerNo department year')
            .populate('verifiedBy', 'name').lean();

        if (attendanceRecords.length === 0) {
            return res.status(404).json({ message: "No attendance records found for this student." });
        }
        res.status(200).json({
            message: "Attendance records retrieved successfully.",
            studentId,
            attendance: attendanceRecords,
            total : attendanceRecords.length
        });
    } catch (error) {
        res.status(500).json({
            message: "An error occurred while fetching attendance records.",
            error: error.message,
        });
    }
});

const getAttendanceByDateRange = asyncHandler(async (req, res) => {
    const { startDate, endDate, department } = req.query;

    const query = {
        date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        }
    };

    if (department) {
        query.department = department;
    }

    const attendance = await Attendance.find(query)
        .populate('student', 'name registerNo')
        .sort({ date: -1 });
    res.json(attendance);
});

const getTodayAttendance = async (req, res) => {
  try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const report = await Attendance.aggregate([
          {
              $match: {
                  date: {
                      $gte: today,
                      $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                  }
              }
          },
          {
              $group: {
                  _id: '$department',
                  totalPresent: {
                      $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] }
                  },
                  totalAbsent: {
                      $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] }
                  },
                  totalLate: {
                      $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] }
                  }
              }
          }
      ]);

      res.status(200).json(report);
  } catch (error) {
      console.error('Error fetching today\'s attendance:', error);
      res.status(500).json({ message: 'Error fetching today\'s attendance' });
  }
};


const deleteAttendance = async (req, res) => {
  try {
      const attendance = await Attendance.findById(req.params.id);

      if (!attendance) {
          return res.status(404).json({ message: 'Attendance record not found' });
      }

      await attendance.remove();
      res.status(200).json({ message: 'Attendance record deleted' });
  } catch (error) {
      console.error('Error deleting attendance record:', error);
      res.status(500).json({ message: 'Error deleting attendance record' });
  }
};


const getDepartmentAttendance = async (req, res) => {
    try {
        const department = req.params.deptId;
        if (!department) {
            return res.status(400).json({ message: "Department ID is required." });
        }

        const attendance = await Attendance.find({ department })
            .populate('student', 'name registerNo')
            .sort({ date: -1 });

        if (attendance.length === 0) {
            return res.status(404).json({ message: "No attendance records found for the specified department." });
        }
        res.status(200).json({
            message: "Attendance records retrieved successfully.",
            department,
            attendance,
        });
    } catch (error) {
        console.error("Error fetching department attendance:", error);
        res.status(500).json({
            message: "An error occurred while fetching attendance records.",
            error: error.message,
        });
    }
};

const getAttendancePercentage = async (req, res) => {
    try {
        const studentId = req.params.studentId;
        const { startDate, endDate } = req.query;

        if (!studentId || !startDate || !endDate) {
            return res.status(400).json({ message: "Student ID, startDate, and endDate are required." });
        }

        const totalDays = await Attendance.countDocuments({
            student: studentId,
            date: { $gte: new Date(startDate), $lte: new Date(endDate) }
        });

        const presentDays = await Attendance.countDocuments({
            student: studentId,
            status: 'Present',
            date: { $gte: new Date(startDate), $lte: new Date(endDate) }
        });

        const percentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

        res.status(200).json({ studentId, attendancePercentage: percentage.toFixed(2) });
    } catch (error) {
        res.status(500).json({ message: "Error calculating attendance percentage.", error: error.message });
    }
};

//by suganth

const getAttendanceByDate = asyncHandler(async (req, res) => {
    try {
      const { date } = req.params;
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
  
      const attendanceRecords = await Attendance.find({
        date: { $gte: start, $lte: end },
      });
  
      res.status(200).json({ success: true, data: attendanceRecords });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error fetching attendance by date" });
    }
  });
  
  // Generate missing attendance records for a given date (i.e. for students not in Attendance)
  const generateAttendance = asyncHandler(async (req, res) => {
    try {
      const { date } = req.params;
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
  
      // Find all attendance records for this date
      const existingRecords = await Attendance.find({
        date: { $gte: start, $lte: end },
      });
  
      // Find all students
      const allStudents = await Student.find({});
  
      // Create a set of student IDs that already have a record for this date
      const presentStudentIds = new Set(
        existingRecords.map((record) => record.student.toString())
      );
  
      const recordsToInsert = [];
      allStudents.forEach((student) => {
        if (!presentStudentIds.has(student._id.toString())) {
          recordsToInsert.push({
            student: student._id,
            name: student.name,
            registerNo: student.registerNo,
            date: start, // use the start-of-day date
            status: "Absent",
            verificationMethod: "Manual",
            department: student.department,
            year: student.year,
            timeIn: null,
            verifiedBy: null,
            remarks: "",
          });
        }
      });
  
      if (recordsToInsert.length > 0) {
        // Insert missing attendance records.
        await Attendance.insertMany(recordsToInsert);
      }
  
      res.status(200).json({
        success: true,
        message: "Missing attendance records generated",
      });
    } catch (error) {
      console.error("Error in generateAttendance:", error);
      res.status(500).json({
        success: false,
        message: "Error generating attendance records",
      });
    }
  });
  
  // Get unverified attendance records for a specific date
  const getUnverifiedAttendanceByDate = asyncHandler(async (req, res) => {
    try {
      const { date } = req.params;
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
  
      const unverified = await Attendance.find({
        verifiedBy: null,
        date: { $gte: start, $lte: end },
      });
  
      res.status(200).json({ success: true, data: unverified });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching unverified attendance",
      });
    }
  });
  
  // Approve a single attendance record
//   const approveAttendance = asyncHandler(async (req, res) => {
//     try {
//       const { id } = req.params;
//       const { verifiedBy } = req.body; // This is the username
//     console.log(id);
//       if (!id || !verifiedBy) {
//         return res.status(400).json({ success: false, message: "Missing required fields" });
//       }
  
//       // Find the user by username
//       const user = await User.findOne({ name: verifiedBy });
//       if (!user) {
//         return res.status(404).json({ success: false, message: "User not found" });
//       }
  
//       // Update the attendance record
//       const updatedAttendance = await Attendance.findByIdAndUpdate(
//         id,
//         { verifiedBy: user._id, status: "Present", timeIn: new Date() },
//         { new: true }
//       );
  
//       if (!updatedAttendance) {
//         return res.status(404).json({ success: false, message: "Attendance record not found" });
//       }
  
//       res.status(200).json({ success: true, message: "Attendance approved" });
//     } catch (error) {
//       console.error("Error in approveAttendance:", error);
//       res.status(500).json({ success: false, message: "Error approving attendance" });
//     }
//   });

const approveAttendance = asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const { verifiedBy } = req.body; // This is the username of the approver
      if (!id || !verifiedBy) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
      }
      // Find the user by name
      const user = await User.findOne({ name: verifiedBy });
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      // Fetch the current attendance record
      const record = await Attendance.findById(id);
      if (!record) {
        return res.status(404).json({ success: false, message: "Attendance record not found" });
      }
  
      // Determine the new status and timeIn:
      // If the record already indicates absence (or no timeIn), then we verify it as absent.
      // Otherwise, we mark it as present.
      let newStatus, newTimeIn;
      if (record.status === "Absent" || !record.timeIn) {
        newStatus = "Absent";
        newTimeIn = null;
      } else {
        newStatus = "Present";
        newTimeIn = new Date();
      }
  
      // Update the attendance record with the current user’s id in verifiedBy
      const updatedAttendance = await Attendance.findByIdAndUpdate(
        id,
        { verifiedBy: user._id, status: newStatus, timeIn: newTimeIn },
        { new: true }
      ).populate('verifiedBy', 'name');
  
      res.status(200).json({ success: true, message: "Attendance approved", data: updatedAttendance });
    } catch (error) {
      console.error("Error in approveAttendance:", error);
      res.status(500).json({ success: false, message: "Error approving attendance" });
    }
  });
  
  
  // Decline attendance
//   const declineAttendance = asyncHandler(async (req, res) => {
//     try {
//       const { id } = req.params;
//       await Attendance.findByIdAndUpdate(id, { verifiedBy: null, status: "Absent" });
//       res.status(200).json({ success: true, message: "Attendance declined" });
//     } catch (error) {
//       res.status(500).json({ success: false, message: "Error declining attendance" });
//     }
//   });

const declineAttendance = asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const { verifiedBy } = req.body; // This is the username of the user declining
      if (!id || !verifiedBy) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
      }
      // Find the user by name
      const user = await User.findOne({ name: verifiedBy });
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      // Update the attendance record: mark as "Absent", set timeIn to null and update verifiedBy
      const updatedAttendance = await Attendance.findByIdAndUpdate(
        id,
        { verifiedBy: user._id, status: "Absent", timeIn: null },
        { new: true }
      ).populate('verifiedBy', 'name');
  
      if (!updatedAttendance) {
        return res.status(404).json({ success: false, message: "Attendance record not found" });
      }
      res.status(200).json({ success: true, message: "Attendance declined", data: updatedAttendance });
    } catch (error) {
      console.error("Error in declineAttendance:", error);
      res.status(500).json({ success: false, message: "Error declining attendance" });
    }
  });
  
  
  // Approve all attendance records (bulk update)
//   const approveAllAttendance = asyncHandler(async (req, res) => {
//     try {
//       const { verifiedBy } = req.body;
//       await Attendance.updateMany(
//         { verifiedBy: null },
//         { verifiedBy, status: "Present", timeIn: new Date() }
//       );
//       res.status(200).json({ success: true, message: "All attendance approved" });
//     } catch (error) {
//       res.status(500).json({ success: false, message: "Error approving all attendance" });
//     }
//   });

const approveAllAttendance = asyncHandler(async (req, res) => {
    try {
      const { verifiedBy } = req.body;
      if (!verifiedBy) {
        return res.status(400).json({ success: false, message: "Missing verifiedBy" });
      }
      const user = await User.findOne({ name: verifiedBy });
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      // Here you might want to update only those records with verifiedBy: null
      await Attendance.updateMany(
        { verifiedBy: null },
        { verifiedBy: user._id, status: "Present", timeIn: new Date() }
      );
      res.status(200).json({ success: true, message: "All attendance approved" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error approving all attendance" });
    }
  });
  

module.exports = {
    verifyFace,
    markAttendance,
    getAttendanceByDateRange,
    getTodayAttendance,
    deleteAttendance,
    getDepartmentAttendance,
    getAttendancePercentage,
    getStudentAttendance,
    ////
    getAttendanceByDate,
    generateAttendance,
    getUnverifiedAttendanceByDate,
    approveAttendance,
    declineAttendance,
    approveAllAttendance,
};
