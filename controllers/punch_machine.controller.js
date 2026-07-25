const axios = require('axios');
const PunchMachine = require("../models/punch_machine.model");
const Employee = require("../models/payroll/employ.model");
const Shift = require("../models/payroll/shift.model");
const Salary = require("../models/payroll/salary.model");
const DailyAttendance = require("../models/payroll/daily.attendance.model");
const Holiday = require("../models/payroll/holiday.model");
const Earning = require("../models/payroll/earning.model");
const { sendResponse } = require('../helper/response');
const Year = require("../models/year.model");
const moment = require('moment');
const API_KEY = process.env.PUNCH_API_KEY;
const API_URL = process.env.PUNCH_API_URL;

const getToday = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
};

exports.syncPunchLogs = async () => {
    try {
        const today = getToday();
        const url = `${API_URL}?APIKey=${API_KEY}&FromDate=${today}&ToDate=${today}`;
        const { data } = await axios.get(url);

        if (!Array.isArray(data)) {
            console.error('Unexpected API response:', data);
            return;
        }
        for (const log of data) {
            const { EmployeeCode, LogDate, SerialNumber, PunchDirection } = log;

            const employee = await Employee.findOne({ punch_machine_no: parseInt(EmployeeCode) });

            if (!employee) {
                // console.log(`No employee found for code: ${EmployeeCode}`);
                continue;
            }

            const alreadyExists = await PunchMachine.findOne({
                employee_id: employee._id,
                punch_time: new Date(LogDate),
                serial_number: SerialNumber
            });

            if (alreadyExists) {
                // console.log(`Duplicate punch log for ${EmployeeCode} at ${LogDate}`);
                continue;
            }

            await PunchMachine.create({
                employee_id: employee._id,
                employee_code: parseInt(EmployeeCode),
                punch_time: new Date(LogDate),
                serial_number: SerialNumber,
                punch_type: PunchDirection || null
            });
            console.log(`Punch log saved for employee: ${EmployeeCode}`);
        }
    } catch (error) {
        console.error('Error syncing punch logs:', error.message);
    }
};

exports.getEmployeesWithPunchLogs = async (req, res) => {
    try {
        const { employeeId } = req.query;
        const matchStage = {
            deleted: false,
            status: true
        };
        if (employeeId) {
            matchStage._id = new mongoose.Types.ObjectId(employeeId);
        }
        const result = await Employee.aggregate([
            {
                $match: matchStage
            },
            {
                $lookup: {
                    from: 'punch-machines',
                    localField: '_id',
                    foreignField: 'employee_id',
                    as: 'logs'
                }
            },
            {
                $addFields: {
                    logs: { $sortArray: { input: "$logs", sortBy: { punch_time: 1 } } },
                    logs_count: { $size: "$logs" },  // Count number of logs
                    start_time: { $arrayElemAt: ["$logs.punch_time", 0] },
                    end_time: { $arrayElemAt: ["$logs.punch_time", -1] },
                }
            },
            {
                $match: {
                    logs_count: { $gt: 0 } // Only employees who have at least 1 log
                }
            },
            {
                $project: {
                    // card_no: 1,
                    full_name: 1,
                    adhar_no: 1,
                    punch_machine_no: 1,
                    logs: {
                        _id: 1,
                        punch_time: 1,
                        punch_type: 1,
                        serial_number: 1,
                    },
                    start_time: 1,
                    end_time: 1,
                }
            }
        ]);

        if (result.length === 0) {
            return sendResponse(res, 404, false, [], "No employee found or no logs available");
        }

        return sendResponse(res, 200, true, result, "Employee and logs fetched successfully");
    } catch (error) {
        console.log(error);
        return sendResponse(res, 500, false, [], "Error fetching employee and logs");
    }
}

exports.processDailyAttendance = async () => {
    const FIRM_ID = "65e1be08ff70846aacc8846c";
    const today = new Date();

    const getAllYear = await Year.find({ status: true, deleted: false }, { deleted: 0 });
    const matchedYear = getAllYear.find(year =>
        today >= new Date(year.start_year) && today <= new Date(year.end_year)
    );

    if (!matchedYear) throw new Error("No matched year found");

    const year_id = matchedYear._id;
    const shiftData = await Shift.findOne({ name: 'First', deleted: false });

    const punches = await PunchMachine.find({
        punch_time: {
            $gte: moment(today).startOf('day').toDate(),
            $lte: moment(today).endOf('day').toDate(),
        }
    });

    for (const punch of punches) {
        const employeeId = punch.employee_id;
        const punchTime = moment(punch.punch_time);
        const year = punchTime.year();
        const month = punchTime.month() + 1;
        const dateNum = punchTime.date();
        const punchTimeStr = punchTime.format('HH:mm');
        const hour = punchTime.hour();
        const isNightPunch = hour < 7 || hour >= 21;
        const isSunday = punchTime.day() === 0;
        const isHoliday = await Holiday.findOne({ date: punchTime.toDate() });

        // Determine apchar, other_Apchar, sum_Apchar
        let apchar = '';
        let other_Apchar = '';

        if (!isSunday && !isHoliday && !isNightPunch) {
            apchar = 'P';
        }

        if (isNightPunch && apchar === 'P') {
            other_Apchar = 'FN';
        } else if (isNightPunch) {
            other_Apchar = 'FN';
        } else if (isSunday) {
            other_Apchar = 'SP';
        } else if (isHoliday) {
            other_Apchar = 'HP';
        }

        let sum_Apchar = apchar + other_Apchar;

        const salaryEntry = await Salary.findOne({
            employee: employeeId,
            firm_id: FIRM_ID,
            year_id: year_id,
            month,
            deleted: false,
        }).lean();

        if (!salaryEntry) {
            console.log(`No salary entry found for employee ${employeeId} in ${month}/${year}. Skipping.`);
            continue;
        }

        const departmentId = salaryEntry?.department || null;

        let existingEntry = await DailyAttendance.findOne({
            employee: employeeId,
            date: punchTime.startOf('day').toDate(),
            deleted: false,
        });

        const present_day = apchar === 'P' ? 1 : 0;

        if (!existingEntry) {
            const lastAttendance = await DailyAttendance.findOne({ deleted: false }).sort({ voucher_no: -1 });
            const voucher_no = lastAttendance?.voucher_no ? lastAttendance.voucher_no + 1 : 1;

            await DailyAttendance.create({
                firm_id: FIRM_ID,
                year_id: year_id,
                employee: employeeId,
                project: null,
                date: punchTime.toDate(),
                e_year: year,
                e_day: dateNum,
                month: month,
                shift: shiftData?._id || null,
                work_department: departmentId,
                present_day,
                apchar,
                other_Apchar,
                sum_Apchar,
                is_present: true,
                import_tag: 3,
                in_time: punchTimeStr,
                out_time: '',
                remark: `Punch at ${punchTimeStr}`,
                voucher_no,
                sunday_present: isSunday ? 1 : 0,
                full_night_present: isNightPunch ? 1 : 0,
                holiday_present: isHoliday ? 1 : 0,
            });

            // Insert to Earning table if needed
            const earningEntries = [];

            if (isSunday) {
                earningEntries.push({
                    firm_id: FIRM_ID,
                    year_id: year_id,
                    employee: employeeId,
                    date: punchTime.toDate(),
                    voucher_no: voucher_no,
                    amount: 500,
                    type: 'Sunday_Present',
                    remark: 'Earning for Sunday Present',
                    autoPost: true,
                });
            }

            if (isNightPunch) {
                earningEntries.push({
                    firm_id: FIRM_ID,
                    year_id: year_id,
                    employee: employeeId,
                    date: punchTime.toDate(),
                    voucher_no: voucher_no,
                    amount: 500,
                    type: 'Full_Night_Present',
                    remark: 'Earning for Full Night Present',
                    autoPost: true,
                });
            }

            if (isHoliday) {
                earningEntries.push({
                    firm_id: FIRM_ID,
                    year_id: year_id,
                    employee: employeeId,
                    date: punchTime.toDate(),
                    voucher_no: voucher_no,
                    amount: 500,
                    type: 'Holiday_Present',
                    remark: 'Earning for Holiday Present',
                    autoPost: true,
                });
            }

            if (earningEntries.length > 0) {
                await Earning.insertMany(earningEntries);
            }
        } else {
            const existingIn = existingEntry.in_time ? moment(existingEntry.in_time, "HH:mm") : null;
            const existingOut = existingEntry.out_time ? moment(existingEntry.out_time, "HH:mm") : null;
            const currentTime = moment(punchTimeStr, "HH:mm");

            if (!existingIn || currentTime.isBefore(existingIn)) {
                existingEntry.in_time = punchTimeStr;
            }
            if (!existingOut || currentTime.isAfter(existingOut)) {
                existingEntry.out_time = punchTimeStr;
            }

            if (!existingEntry.remark.includes(punchTimeStr)) {
                existingEntry.remark = existingEntry.remark
                    ? `${existingEntry.remark} | Punch at ${punchTimeStr}`
                    : `Punch at ${punchTimeStr}`;
            }

            Object.assign(existingEntry, {
                shift: shiftData?._id || null,
                work_department: departmentId,
                apchar,
                other_Apchar,
                sum_Apchar,
                is_present: true,
                present_day,
                sunday_present: isSunday ? 1 : 0,
                full_night_present: isNightPunch ? 1 : 0,
                holiday_present: isHoliday ? 1 : 0,
            });

            await existingEntry.save();
        }
    }
};



exports.punchEntryInAtt = async (req, res) => {
    try {
        await processDailyAttendance();
        return sendResponse(res, 200, true, {}, "Attendance updated successfully.");
    } catch (err) {
        console.error("Punch Entry Error:", err);
        return sendResponse(res, 500, false, {}, err.message || "Something went wrong");
    }
};