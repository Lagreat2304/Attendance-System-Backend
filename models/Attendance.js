const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  registerNo: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late'],
    default: 'Absent'
  },
  verificationMethod: {
    type: String,
    enum: ['Face', 'Manual'],
    required: true
  },
  department: {
    type: String,
    required: true
  },
  year: {
    type: String,
    required: true
  },
  timeIn: {
    type: Date,
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  remarks: {
    type: String
  }
}, {
  timestamps: true 
});

attendanceSchema.index({ student: 1, date: 1 }, { unique: true });
attendanceSchema.index({ department: 1, date: 1 }); 
attendanceSchema.index({ date: 1 });


attendanceSchema.statics.getAttendancePercentage = async function(studentId, startDate, endDate) {
  const totalDays = await this.countDocuments({
    student: studentId,
    date: { $gte: startDate, $lte: endDate }
  });

  const presentDays = await this.countDocuments({
    student: studentId,
    status: 'present',
    date: { $gte: startDate, $lte: endDate }
  });

  return totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
};

attendanceSchema.statics.getDepartmentAttendance = async function(department, date) {
  return this.aggregate([
    {
      $match: {
        department,
        date: {
          $gte: new Date(date.setHours(0,0,0)),
          $lt: new Date(date.setHours(23,59,59))
        }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;