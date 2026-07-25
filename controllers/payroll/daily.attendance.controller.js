const { default: mongoose } = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const DailyAttendance = require('../../models/payroll/daily.attendance.model');
const MonthlyAttendance = require('../../models/payroll/monthly.attendance.model');
const Salary = require('../../models/payroll/salary.model');
const Employee = require('../../models/payroll/employ.model');
const Workdays = require('../../models/payroll/workDay.model');
const Firm = require('../../models/firm.model');
const Year = require('../../models/year.model');
const { sendResponse } = require('../../helper/response');
const earningModel = require('../../models/payroll/earning.model');
const ejs = require("ejs");
const fs = require("fs");
const puppeteer = require("puppeteer");
const path = require("path");
const XLSX = require('xlsx');  // for utility functions
const XLSXStyle = require('xlsx-style');  // for styling
const { EarningRates } = require("../../utils/enum");
const holidayModel = require("../../models/payroll/holiday.model");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;
const Earning = require('../../models/payroll/earning.model');
const { sumSalariesByDate, getMonthName } = require("../../helper");
const { generatePDF } = require("../../utils/pdfUtils");
const moment = require("moment");

exports.getDailyAttendance = async (req, res) => {
    let empId = req.query.id;

    if (req.user && !req.error) {
        try {
            let query = { status: true, deleted: false };
            if (empId) {
                query['employee'] = empId;
            }
            const dailyData = await DailyAttendance.find(query, { deleted: 0 })
                .populate('firm_id', 'name')
                .populate('year_id', 'start_year end_year')
                .populate('work_department', 'name')
                .populate('shift', 'name')
                .populate({
                    path: 'employee',
                    select: 'card_no full_name designation salary_id shift in_time out_time employee_id',
                    populate: [
                        {
                            path: 'designation',
                            select: 'name'
                        },
                        {
                            path: 'shift',
                            select: 'name'
                        }
                    ]
                })
                .lean();

            const employeeIds = dailyData.map(elem => elem.employee && elem.employee._id).filter(id => id);

            const salaries = await Salary.find({ employee: { $in: employeeIds }, deleted: false }, { department: 1 })
                .populate('department', 'name')
                .sort({ createdAt: -1 })
                .lean();

            const salaryMap = new Map();
            salaries.forEach(salary => {
                if (salary.employee && salary.employee.toString() && !salaryMap.has(salary.employee.toString())) {
                    salaryMap.set(salary.employee.toString(), {
                        employee: salary.employee,
                        department: salary.department,
                    });
                }
            });

            const result = dailyData.map(elem => {
                const salaryData = elem.employee && elem.employee._id ? salaryMap.get(elem.employee._id.toString()) : {};
                return {
                    ...elem,
                    salary_id: salaryData || {}
                };
            });

            sendResponse(res, 200, true, result, "Daily Attendance list");
        } catch (error) {
            console.error(error);
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.getAdminDailyAttendance = async (req, res) => {
    if (req.user && !req.error) {
        let limit = parseInt(req.query.limit) || 10;
        let page = parseInt(req.query.page) || 1;
        let firm = req.query.firm;
        let year = req.query.year;
        let search = req.query.search ? req.query.search.toLowerCase() : '';
        let newMonth = req.query.month;

        // let filter = { deleted: false, firm_id: firm, year_id: year };
        // if (newMonth) {
        //     filter.month = parseInt(newMonth);
        // }
        let filter = { deleted: false };
        if (firm) {
            filter.firm_id = firm;
        }
        if (year) {
            filter.year_id = year;
        }
        if (newMonth) {
            filter.month = parseInt(newMonth);
        }


        try {
            const dailyDataQuery = DailyAttendance.find(filter, { deleted: 0, __v: 0 })
                .populate('firm_id', 'name')
                .populate('year_id', 'start_year end_year')
                .populate('work_department', 'name')
                .populate('shift', 'name')
                .populate({
                    path: 'employee',
                    select: 'card_no full_name designation salary_id shift in_time out_time employee_id adhar_no',
                    match: {
                        $or: [
                            { full_name: { $regex: search, $options: 'i' } },
                            { card_no: { $regex: search, $options: 'i' } }
                        ]
                    },
                    populate: [
                        { path: 'designation', select: 'name' },
                        { path: 'shift', select: 'name' }
                    ]
                })
                .lean();

            const [dailyData, salaryData, attendanceCounts] = await Promise.all([
                dailyDataQuery,
                Salary.find({}).select('department employee').populate('department', 'name').lean(),
                Promise.all([
                    DailyAttendance.countDocuments({ apchar: 'A', deleted: false, month: parseInt(newMonth) }),
                    DailyAttendance.countDocuments({ apchar: 'P', deleted: false, month: parseInt(newMonth) }),
                    DailyAttendance.countDocuments({ apchar: 'HD', deleted: false, month: parseInt(newMonth) }),
                    DailyAttendance.countDocuments({ apchar: 'HP', deleted: false, month: parseInt(newMonth) }),
                    DailyAttendance.countDocuments({ apchar: 'FN', deleted: false, month: parseInt(newMonth) }),
                    DailyAttendance.countDocuments({ apchar: 'PFN', deleted: false, month: parseInt(newMonth) }),
                    DailyAttendance.countDocuments({ apchar: 'SP', deleted: false, month: parseInt(newMonth) }),
                    DailyAttendance.countDocuments({ apchar: 'CL', deleted: false, month: parseInt(newMonth) }),
                    DailyAttendance.countDocuments({ apchar: 'H', deleted: false, month: parseInt(newMonth) }),
                    DailyAttendance.countDocuments({ apchar: 'O', deleted: false, month: parseInt(newMonth) })
                ])
            ]);

            const filteredData = dailyData.filter(elem => elem.employee);

            const employeeDataMap = {};
            filteredData.forEach((attendance) => {
                const employeeName = attendance.employee.full_name;
                if (!employeeDataMap[employeeName]) {
                    employeeDataMap[employeeName] = [];
                }
                employeeDataMap[employeeName].push(attendance);
            });

            const uniqueEmployeeNames = Object.keys(employeeDataMap);
            const totalData = uniqueEmployeeNames.length;
            const totalPages = Math.ceil(totalData / limit);

            const slicedEmployeeNames = uniqueEmployeeNames.slice(
                (page - 1) * limit,
                (page - 1) * limit + limit
            );

            const finalData = [];
            slicedEmployeeNames.forEach(employeeName => {
                finalData.push(...employeeDataMap[employeeName]);
            });

            const salaryMap = salaryData.reduce((acc, salary) => {
                acc[salary.employee] = { department: salary.department };
                return acc;
            }, {});

            const responseData = finalData.map(elem => ({
                ...elem,
                salary_id: salaryMap[elem.employee._id] || {}
            }));

            const [absent, present, halfDays, hp, fn, pfn, sp, cl, holiday, o] = attendanceCounts;
            const response = {
                totalData,
                totalPages,
                counts: { A: absent, P: present, HD: halfDays, HP: hp, FN: fn, PFN: pfn, SP: sp, CL: cl, H: holiday, O: o },
                currentPage: page,
                data: responseData,
            };

            sendResponse(res, 200, true, response, "Daily Attendance list");
        } catch (error) {
            console.error(error);
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.manageDailyAttendance = async (req, res) => {
    const {
        firm_id,
        year_id,
        employee,
        date,
        shift,
        in_time,
        out_time,
        work_department,
        total_work_hour,
        ot_hour,
        half_day,
        present_day,
        late_hour,
        early_going,
        sunday_present,
        full_night_present,
        holiday_present,
        apchar,
        other_Apchar,
        sum_Apchar,
        remark,
        project,
        id
    } = req.body

    if (req.user) {
        if (
            firm_id &&
            year_id &&
            employee &&
            date &&
            work_department
        ) {

            const firmData = await Firm.findById(firm_id);
            const yearData = await Year.findById(year_id);
            const employeeData = await Employee.findById(employee);

            const dateString = date;
            const full_date = new Date(dateString);
            const attendance_month = full_date.getMonth() + 1;
            const month = attendance_month;
            const day = full_date.getDate();
            const year = full_date.getFullYear();

            const lastEarningEntry = await earningModel.findOne({ deleted: false }).sort({ voucher_no: -1 });
            let earningVoucherNo = lastEarningEntry ? lastEarningEntry.voucher_no + 1 : 1;

            const isHoliday = await holidayModel.findOne({ date: full_date, deleted: false });
            const isSunday = full_date.getDay() === 0 ? true : false;

            const DailyexistingAttendance = await DailyAttendance.findOne({ employee, month: month, e_day: day, e_year: year, deleted: false });

            const MonthlyexistingAttendance = await MonthlyAttendance.findOne({ employee, month, year_id })

            if (MonthlyexistingAttendance) {
                sendResponse(res, 400, false, {}, "Attendance entry for this employee on the specified month already exists");
                return;
            }

            if (!id) {
                if (DailyexistingAttendance) {
                    sendResponse(res, 400, false, {}, "Attendance entry for this employee on the specified date already exists");
                    return;
                }
            }

            if (!firmData) {
                sendResponse(res, 404, false, {}, "Firm not found");
                return;
            }
            if (!yearData) {
                sendResponse(res, 404, false, {}, "Year not found");
                return
            }
            if (!employeeData) {
                sendResponse(res, 404, false, {}, "Employee not found");
                return;
            }

            const lastAttendance = await DailyAttendance.findOne({ deleted: false }, {}, { sort: { 'voucher_no': -1 } });
            let voucher_no = '1';
            if (lastAttendance && lastAttendance.voucher_no) {
                const lastVoucherID = parseInt(lastAttendance.voucher_no);
                voucher_no = `${lastVoucherID + 1}`;
            }

            const shiftData = shift === 'undefined' || shift === '' ? null : shift;
            const dailyAtttendance = new DailyAttendance({
                firm_id: firmData,
                year_id: year_id,
                employee: employeeData,
                date: date,
                month: month,
                e_year: year,
                e_day: day,
                voucher_no: voucher_no,
                shift: shiftData,
                in_time: in_time,
                out_time: out_time,
                work_department: work_department,
                total_work_hour: total_work_hour,
                sunday_present: sunday_present != '' && parseInt(sunday_present),
                full_night_present: full_night_present != '' && parseInt(full_night_present),
                holiday_present: holiday_present != '' && parseInt(holiday_present),
                ot_hour: ot_hour,
                half_day: half_day,
                present_day: present_day,
                late_hour: late_hour,
                early_going: early_going,
                remark: remark,
                apchar: apchar,
                other_Apchar: other_Apchar,
                sum_Apchar: sum_Apchar,
                project: project === "" ? null : project,
            });


            if (!id) {
                try {
                    if (sunday_present !== '' && parseInt(sunday_present) > 0 && !isSunday) {
                        sendResponse(res, 400, false, {}, `${date} is not a Sunday.`);
                        return;
                    }
                    await dailyAtttendance.save();

                    const formattedDate = new Date(date);
                    const earnings = [];

                    if (sunday_present !== '' && parseInt(sunday_present) > 0 && isSunday) {
                        earnings.push({
                            firm_id,
                            year_id,
                            employee: employeeData._id,
                            date: formattedDate,
                            e_year: formattedDate.getFullYear(),
                            e_day: formattedDate.getDate(),
                            month: formattedDate.getMonth() + 1,
                            voucher_no: earningVoucherNo++,
                            amount: EarningRates.Extra * parseInt(sunday_present), // Replace with actual rate
                            type: 'Sunday_Present',
                            remark: "Earning for Sunday Present",
                            other_voucher_no: "",
                            other_remark: "",
                            autoPost: true,
                        });
                    }

                    if (full_night_present !== '' && parseInt(full_night_present) > 0) {
                        earnings.push({
                            firm_id,
                            year_id,
                            employee: employeeData._id,
                            date: formattedDate,
                            e_year: formattedDate.getFullYear(),
                            e_day: formattedDate.getDate(),
                            month: formattedDate.getMonth() + 1,
                            voucher_no: earningVoucherNo++,
                            amount: EarningRates.Extra * parseInt(full_night_present), // Replace with actual rate
                            type: 'Full_Night_Present',
                            remark: "Earning for Full Night Present",
                            other_voucher_no: "",
                            other_remark: "",
                            autoPost: true,
                        });
                    }

                    if (holiday_present !== '' && parseInt(holiday_present) > 0 && isHoliday) {
                        earnings.push({
                            firm_id,
                            year_id,
                            employee: employeeData._id,
                            date: formattedDate,
                            e_year: formattedDate.getFullYear(),
                            e_day: formattedDate.getDate(),
                            month: formattedDate.getMonth() + 1,
                            voucher_no: earningVoucherNo++,
                            amount: EarningRates.Extra * parseInt(holiday_present),
                            type: 'Other',
                            remark: "Earning for Holiday Present",
                            other_voucher_no: "",
                            other_remark: "",
                            autoPost: true,
                        });
                    }

                    if (earnings.length > 0) {
                        await Earning.insertMany(earnings);
                    }

                    sendResponse(res, 200, true, {}, 'Daily attendance added successfully.');
                } catch (error) {
                    sendResponse(res, 500, false, {}, "Something went wrong: " + error.message);
                }
            } else {
                try {
                    const data = await DailyAttendance.findById(id);
                    if (!data) {
                        sendResponse(res, 404, false, {}, "Daily Attendance not found");
                        return;
                    }
                    // Update daily attendance
                    const updates = {
                        firm_id: firmData,
                        year_id: year_id,
                        employee: employeeData,
                        date: date,
                        month: month,
                        e_year: year,
                        e_day: day,
                        voucher_no: voucher_no,
                        shift: shiftData,
                        in_time: in_time,
                        out_time: out_time,
                        work_department: work_department,
                        total_work_hour: total_work_hour,
                        sunday_present: sunday_present != '' && parseInt(sunday_present),
                        full_night_present: full_night_present != '' && parseInt(full_night_present),
                        holiday_present: holiday_present != '' && parseInt(holiday_present),
                        ot_hour: ot_hour,
                        half_day: half_day,
                        present_day: present_day,
                        late_hour: late_hour,
                        early_going: early_going,
                        remark: remark,
                        apchar: apchar,
                        other_Apchar: other_Apchar,
                        sum_Apchar: sum_Apchar,
                        project: (project === "undefined" || project === '') ? null : project,
                    };

                    await Earning.deleteMany({ employee: employeeData._id, date });
                    const formattedDate = new Date(date);
                    const earnings = [];
                    const parsedSunday = parseInt(sunday_present);
                    const parsedFullNight = parseInt(full_night_present);
                    const parsedHoliday = parseInt(holiday_present);

                    if (parsedSunday > 0 && !isSunday) {
                        sendResponse(res, 400, false, {}, "The selected date is not a Sunday");
                        return;
                    }

                    if (parsedHoliday > 0 && !isHoliday) {
                        sendResponse(res, 400, false, {}, "The selected date is not a holiday");
                        return;
                    }

                    if (sunday_present !== '' && isSunday) {
                        console.log("Sunday present");
                        if (parsedSunday == 0) {
                            await Earning.deleteOne({ employee: employeeData?._id, date: formattedDate, type: 'Sunday_Present' });
                            updates.other_Apchar = "";
                            updates.sum_Apchar = updates.apchar + updates.other_Apchar;
                        }
                        else {
                            earnings.push({
                                firm_id,
                                year_id,
                                employee: employeeData._id,
                                date: formattedDate,
                                e_year: formattedDate.getFullYear(),
                                e_day: formattedDate.getDate(),
                                month: formattedDate.getMonth() + 1,
                                voucher_no: earningVoucherNo++,
                                amount: EarningRates.Extra * parsedSunday,
                                type: 'Sunday_Present',
                                remark: "Earning for Sunday Present",
                                other_voucher_no: "",
                                other_remark: "",
                                autoPost: true,
                            });

                            updates.sum_Apchar = updates.apchar + updates.other_Apchar;
                        }
                    }

                    if (full_night_present !== '') {
                        console.log("Full night present");
                        if (parsedFullNight == 0) {
                            await Earning.deleteOne({ employee: employeeData?._id, date: formattedDate, type: 'Full_Night_Present' });
                            updates.other_Apchar = "";
                            updates.sum_Apchar = updates.apchar + updates.other_Apchar;
                        }
                        else {
                            earnings.push({
                                firm_id,
                                year_id,
                                employee: employeeData._id,
                                date: formattedDate,
                                e_year: formattedDate.getFullYear(),
                                e_day: formattedDate.getDate(),
                                month: formattedDate.getMonth() + 1,
                                voucher_no: earningVoucherNo++,
                                amount: EarningRates.Extra * parsedFullNight,
                                type: 'Full_Night_Present',
                                remark: "Earning for Full Night Present",
                                other_voucher_no: "",
                                other_remark: "",
                                autoPost: true,
                            });
                            updates.sum_Apchar = updates.apchar + updates.other_Apchar;
                        }
                    }

                    if (holiday_present !== '' && isHoliday) {
                        console.log("Holiday present");
                        if (parsedHoliday == 0) {
                            await Earning.deleteOne({
                                employee: employeeData?._id, date: formattedDate, type: 'Other',
                                remark: "Earning for Holiday Present"
                            });
                            updates.other_Apchar = "";
                            updates.sum_Apchar = updates.apchar + updates.other_Apchar;
                        } else {
                            earnings.push({
                                firm_id,
                                year_id,
                                employee: employeeData._id,
                                date: formattedDate,
                                e_year: formattedDate.getFullYear(),
                                e_day: formattedDate.getDate(),
                                month: formattedDate.getMonth() + 1,
                                voucher_no: earningVoucherNo++,
                                amount: EarningRates.Extra * parsedHoliday, // Replace with actual rate
                                type: 'Other',
                                remark: "Earning for Holiday Present",
                                other_voucher_no: "",
                                other_remark: "",
                                autoPost: true,
                            });

                            updates.sum_Apchar = updates.apchar + updates.other_Apchar;
                        }
                    }

                    if (updates.sum_Apchar === '') {
                        await DailyAttendance.findByIdAndDelete(id);
                        sendResponse(res, 200, true, {}, "Daily Attendance updated successfully.");
                        return;
                    }
                    await DailyAttendance.findByIdAndUpdate(id, updates, { new: true });
                    if (earnings.length > 0) {
                        await Earning.insertMany(earnings);
                    }
                    sendResponse(res, 200, true, {}, "Daily Attendance updated successfully.");

                } catch (error) {
                    sendResponse(res, 500, false, {}, "Something went wrong: " + error.message);
                }
            }
        } else {
            sendResponse(res, 400, false, {}, "Missing parameters");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.deleteDailyAttendance = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            await DailyAttendance.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Daily Attendance deleted successfully")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.dailyAttendanceReport = async (req, res) => {
    const { firm_id, year_id, month, employee } = req.body;

    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }

    if (!firm_id || !year_id || !month || !employee) {
        return sendResponse(res, 400, false, {}, "Missing parameters");
    }

    try {
        let employeeIds = Array.isArray(employee) ? employee : JSON.parse(employee);

        const [workdaysData, employeesData, attendanceData] = await Promise.all([
            Workdays.findOne({ year_id, month, firm_id }).lean(),
            Employee.find({ _id: { $in: employeeIds.map(e => e.id) } }).lean(),
            DailyAttendance.find({ employee: { $in: employeeIds.map(e => e.id) }, month, year_id }).lean(),
        ]);

        const working_hour = workdaysData?.working_hour || 0;

        const attendanceMap = attendanceData.reduce((map, attendance) => {
            if (!map[attendance.employee]) map[attendance.employee] = [];
            map[attendance.employee].push(attendance);
            return map;
        }, {});

        const resArray = employeesData.map(employeeInfo => {
            const employeeAttendance = attendanceMap[employeeInfo._id] || [];
            let totalPresentDays = 0;
            let totalOTHour = 0;

            employeeAttendance.forEach(attendance => {
                totalPresentDays += attendance.present_day;
                totalOTHour += attendance.ot_hour;
            });

            const OtDay = working_hour > 0 ? totalOTHour / working_hour : 0;

            const attendance = employeeAttendance.map(({ date, present_day, apchar }) => ({
                date: date.toISOString().split('T')[0],
                present_day,
                status: apchar,
            }));

            return {
                employee_id: employeeInfo.employee_id || 0,
                name: employeeInfo.full_name || '',
                year_id: year_id || {},
                month: parseInt(month, 10),
                total_present_day: totalPresentDays,
                total_ot_hour: totalOTHour,
                total_ot_days: OtDay,
                attendance,
            };
        });

        return sendResponse(res, 200, true, resArray, "Data found successfully.");
    } catch (error) {
        return sendResponse(res, 500, false, {}, "Something went wrong");
    }
};

exports.deleteDailyAttendanceByDate = async (req, res) => {
    const { date, password } = req.body;
    try {
        if (!req.user || req.error) {
            return sendResponse(res, 401, false, {}, "Unauthorized");
        }

        if (!date || !password) {
            return sendResponse(res, 400, false, {}, "Missing parameters");
        }

        if (password !== process.env.DAILY_IMPORT_PASSWORD) {
            return sendResponse(res, 401, false, {}, "Invalid password");
        }

        const startOfDay = moment(date).startOf('day').toDate();
        const endOfDay = moment(date).endOf('day').toDate();


        const result = await DailyAttendance.deleteMany({ date: { $gte: startOfDay, $lte: endOfDay }, deleted: false });

        if (result.modifiedCount === 0) {
            return sendResponse(res, 404, false, {}, "No records found for the given date");
        }
        await earningModel.deleteMany({ date: { $gte: startOfDay, $lte: endOfDay }, deleted: false, autoPost: true });
        return sendResponse(res, 200, true, {}, "Daily attendance deleted successfully");

    } catch (err) {
        console.error('Error deleting daily attendance:', err);
        return sendResponse(res, 500, false, {}, "Internal server error");
    }
};

const listAttendanceLedger = async (filter, month, search, firm_id, year_id) => {
    try {
        const { date } = filter;

        const date_start = date && date.start ? new Date(date.start) : new Date("1947-08-15");
        let date_end = date ? (date.end ? new Date(date.end) : new Date()) : new Date();
        date_end.setHours(23, 59, 59, 999);

        if (month) {
            const currentYear = new Date().getFullYear();
            date_start.setFullYear(currentYear, parseInt(month) - 1, 1); // Start of the month
            date_end = new Date(date_start.getFullYear(), date_start.getMonth() + 1, 0);
        }

        let matchObj = {
            deleted: false,
            // present_day: { $ne: 0 },
            firm_id: new ObjectId(firm_id),
            year_id: new ObjectId(year_id),
        };

        if (month) {
            matchObj.month = parseInt(month);
        }

        if (date && date.start && date.end) {
            matchObj.order_date = {
                $gte: date_start,
                $lte: date_end
            };
        }

        let matchObj1 = {};
        if (search !== "") {
            const searchRegex = new RegExp(`^${search}`, "i");
            matchObj1 = {
                $or: [
                    { employee_name: searchRegex },
                    { card_no: searchRegex },
                    { employee_id: searchRegex },
                    { import_id: searchRegex }
                ]
            };
        }

        // Generate full list of dates for the specified range
        const fullDateRange = [];
        for (let d = new Date(date_start); d <= date_end; d.setDate(d.getDate() + 1)) {
            fullDateRange.push(new Date(d)); // Push each date to the range array
        }

        const requestData = await DailyAttendance.aggregate([
            { $match: { ...matchObj } },
            {
                $lookup: {
                    from: "employees",
                    localField: "employee",
                    foreignField: "_id",
                    as: "employeeDetails",
                },
            },
            {
                $lookup: {
                    from: "designations",
                    localField: "employeeDetails.designation",
                    foreignField: "_id",
                    as: "designationDetails",
                },
            },
            {
                $addFields: {
                    employee_name: { $ifNull: [{ $arrayElemAt: ["$employeeDetails.full_name", 0] }, null] },
                    card_no: { $ifNull: [{ $arrayElemAt: ["$employeeDetails.card_no", 0] }, null] },
                    import_id: { $ifNull: [{ $arrayElemAt: ["$employeeDetails.import_id", 0] }, null] },
                    employee_id: { $ifNull: [{ $arrayElemAt: ["$employeeDetails.employee_id", 0] }, null] },
                },
            },
            {
                $lookup: {
                    from: "years",
                    localField: "year_id",
                    foreignField: "_id",
                    as: "yearDetails"
                }
            },
            {
                $unwind: {
                    path: "$yearDetails",
                    preserveNullAndEmptyArrays: true // Optional, in case there is no matching year
                }
            },
            {
                $group: {
                    _id: "$employee",
                    employee_name: { $first: "$employee_name" },
                    designation: { $first: "$designationDetails" },
                    card_no: { $first: "$card_no" },
                    import_id: { $first: "$import_id" },
                    employee_id: { $first: "$employee_id" },
                    attendance_records: { $push: "$$ROOT" },
                    total_present_days: { $sum: "$present_day" },
                    total_ot_hours: { $sum: "$ot_hour" },
                    yearDetails: { $first: "$yearDetails" },
                },
            },
            {
                $addFields: {
                    first_half_records: {
                        $filter: {
                            input: "$attendance_records",
                            as: "record",
                            cond: { $lte: [{ $dayOfMonth: "$$record.date" }, 15] }
                        }
                    },
                    second_half_records: {
                        $filter: {
                            input: "$attendance_records",
                            as: "record",
                            cond: { $gt: [{ $dayOfMonth: "$$record.date" }, 15] }
                        }
                    }
                }
            },
            // Add missing records for days 1-15
            {
                $addFields: {
                    full_first_half_records: {
                        $map: {
                            input: { $range: [1, 16] }, // Generates an array [1,2,...,15]
                            as: "day",
                            in: {
                                day: "$$day",
                                record: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: "$first_half_records",
                                                as: "record",
                                                cond: {
                                                    $eq: [{ $dayOfMonth: "$$record.date" }, "$$day"]
                                                }
                                            }
                                        },
                                        0
                                    ]
                                }
                            }
                        }
                    },
                    full_second_half_records: {
                        $map: {
                            input: {
                                // Use the last day of the month
                                $range: [16, new Date(2024, parseInt(month), 0).getDate() + 1],
                            },
                            as: "day",
                            in: {
                                day: "$$day",
                                record: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: "$second_half_records",
                                                as: "record",
                                                cond: {
                                                    $eq: [{ $dayOfMonth: "$$record.date" }, "$$day"]
                                                }
                                            }
                                        },
                                        0
                                    ]
                                }
                            }
                        }
                    },
                }
            },
            // Clean up unnecessary fields
            {
                $unset: [
                    "attendance_records.employee_name",
                    "attendance_records.card_no",
                    "attendance_records.import_id",
                    "attendance_records.firm_id",
                    "attendance_records.year_id",
                    "attendance_records.status",
                    "attendance_records.deleted",
                    "attendance_records.__v",
                    "attendance_records.createdAt",
                    "attendance_records.updatedAt",
                    "attendance_records.employee_id"
                ]
            },
            {
                $project: {
                    _id: 0,
                    employee: "$_id",
                    employee_name: 1,
                    designation: 1,
                    card_no: 1,
                    import_id: 1,
                    employee_id: 1,
                    attendance_records: 1,
                    total_present_days: 1,
                    total_ot_hours: 1,
                    month: month,
                    syear: "$yearDetails",
                    first_half_records: "$full_first_half_records", // Use the newly created field
                    second_half_records: "$full_second_half_records"
                }
            },
            // {
            //     $match: { ...matchObj1 }
            // },
            // {
            //     $sort: { employee_name: 1 }
            // }
        ], { allowDiskUse: true });

        return requestData.length > 0
            ? { status: 1, result: requestData }
            : { status: 0, result: [] };
    } catch (error) {
        return { status: 2, result: error };
    }
};

exports.attendanceLedger = async (req, res) => {
    const { search, month, filter, firm_id, year_id } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await listAttendanceLedger(filter, month, search, firm_id, year_id)
            if (data.status === 1) {
                sendResponse(res, 200, true, data.result, `Attendance ledger list`);
            } else if (data.status === 0) {
                sendResponse(res, 200, true, [], `Attendance ledger not found`);
            } else if (data.status === 2) {
                console.log("error", data.result);
                sendResponse(res, 500, false, {}, "Something went wrong111");
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.attendanceLedgerPDFRport = async (req, res) => {
    const { search, month, filter, firm_id, year_id, print_date } = req.body;

    if (req.user && !req.error) {
        try {
            const data = await listAttendanceLedger(filter, month, search, firm_id, year_id);
            const requestData = data.result;

            if (data.status === 1) {
                if (data.result.length && data.result.length > 0) {
                    const template = fs.readFileSync(
                        "templates/attendance.html", // Update path to your template
                        "utf-8"
                    );

                    // Render EJS Template
                    const renderedHtml = ejs.render(template, {
                        requestData,
                        logoUrl1: process.env.LOGO_URL_1,
                        logoUrl2: process.env.LOGO_URL_2,
                    });

                    // Puppeteer PDF Logic
                    const browser = await puppeteer.launch({
                        headless: true,
                        args: ["--no-sandbox", "--disable-setuid-sandbox"],
                        executablePath: process.env.PDF_PATH || undefined,
                    });

                    const page = await browser.newPage();

                    // Inject rendered HTML into the page
                    await page.setContent(renderedHtml, {
                        waitUntil: "domcontentloaded",
                    });

                    // Add CSS for two pages per sheet and landscape orientation
                    await page.addStyleTag({
                        content: `
                        @page {
                            size: A4 landscape;
                            margin: 0.5in 0.5in 0.7in 0.5in;
                        }
                        .page-break {
                            page-break-after: always;
                        }
                        body {
                            -webkit-print-color-adjust: exact;
                        }
                        `
                    });

                    const pdfBuffer = await page.pdf({
                        format: "A4",
                        landscape: true,
                        margin: {
                            top: "0.5in",
                            right: "0.5in",
                            bottom: "0.7in",
                            left: "0.5in",
                        },
                        printBackground: true,
                        preferCSSPageSize: true,
                        displayHeaderFooter: true,
                        footerTemplate: `
                          <div style="font-size: 14px; width: 100%; text-align: right; padding-right: 50px; padding-bottom: 30px;">
                            ${print_date ? `<span>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>` : ''}
                            ${print_date ? '&nbsp;&nbsp;&nbsp;' : ''}
                            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
                          </div>
                        `,
                        headerTemplate: `<div></div>`,
                        compress: true,
                    });

                    await browser.close();

                    const pdfsDir = path.join(__dirname, "../../pdfs");
                    if (!fs.existsSync(pdfsDir)) {
                        fs.mkdirSync(pdfsDir);
                    }

                    const filename = `attendance_ledger_${Date.now()}.pdf`;
                    const filePath = path.join(pdfsDir, filename);

                    fs.writeFileSync(filePath, pdfBuffer);

                    const fileUrl = `${process.env.PDF_URL}/pdfs/${filename}`;

                    sendResponse(
                        res,
                        200,
                        true,
                        { file: fileUrl },
                        "PDF downloaded successfully"
                    );
                } else {
                    sendResponse(res, 200, false, {}, "Attendance Ledger report not found");
                }
            } else if (data.status === 0) {
                sendResponse(res, 200, false, {}, `Attendance Ledger report not found`);
            } else if (data.status === 2) {
                console.log(data, '###')
                sendResponse(res, 500, false, {}, "Something went wrong11");
            }
        } catch (error) {
            console.log("error", error);
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.projectReport = async (req, res) => {
    const { month, year } = req.query;

    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }

    if (!month || !year) {
        sendResponse(res, 400, false, {}, "Missing parameters");
        return;
    }

    const dailyAttendance = await DailyAttendance.aggregate([
        {
            $match: {
                month: parseInt(month),
                e_year: parseInt(year),
                deleted: false,
            },
        },
        {
            $lookup: {
                from: "bussiness-projects",
                localField: "project",
                foreignField: "_id",
                as: "projectDetails",
            },
        },
        {
            $addFields: {
                project_data: {
                    _id: { $arrayElemAt: ["$projectDetails._id", 0] },
                    name: { $arrayElemAt: ["$projectDetails.name", 0] },
                },
            },
        },
        {
            $lookup: {
                from: "employees",
                localField: "employee",
                foreignField: "_id",
                as: "employeeDetails",
            },
        },
        {
            $addFields: {
                employee_data: {
                    _id: { $arrayElemAt: ["$employeeDetails._id", 0] },
                    full_name: { $arrayElemAt: ["$employeeDetails.full_name", 0] },
                },
            },
        },
        {
            $group: {
                _id: "$project",
                totalEmployees: { $addToSet: "$employee" },
                totalPresentDays: { $sum: "$present_day" },
                P: {
                    $sum: {
                        $cond: [{ $eq: ["$sum_Apchar", "P"] }, 1, 0],
                    },
                },
                A: {
                    $sum: {
                        $cond: [{ $eq: ["$sum_Apchar", "A"] }, 1, 0],
                    },
                },
                SP: {
                    $sum: {
                        $cond: [{ $eq: ["$sum_Apchar", "SP"] }, 1, 0],
                    },
                },
                PFN: {
                    $sum: {
                        $cond: [{ $eq: ["$sum_Apchar", "PFN"] }, 1, 0],
                    },
                },
                O: {
                    $sum: {
                        $cond: [{ $eq: ["$sum_Apchar", "O"] }, 1, 0],
                    },
                },
                HD: {
                    $sum: {
                        $cond: [{ $eq: ["$sum_Apchar", "HD"] }, 1, 0],
                    },
                },
                totalWorkHours: { $sum: "$total_work_hour" },
                totalOTHours: { $sum: "$ot_hour" },
                records: {
                    $push: {
                        month: "$month",
                        year: "$e_year",
                        date: "$date",
                        employee: "$employee_data",
                    },
                },
                project_data: { $first: "$project_data" },
            },
        },
        {
            $addFields: {
                attendanceSummary: {
                    P: "$P",
                    A: "$A",
                    SP: "$SP",
                    PFN: "$PFN",
                    O: "$O",
                    HD: "$HD",
                },
            },
        },
        {
            $project: {
                _id: 1,
                totalEmployees: { $size: "$totalEmployees" },
                attendanceSummary: 1,
                records: 1,
                project_data: 1
            },
        },
    ]);

    if (dailyAttendance.length === 0) {
        sendResponse(res, 200, false, {}, "No attendance found for the given month and year");
        return;
    }

    const salaryData = await Salary.aggregate([
        {
            $match: {
                month: parseInt(month),
                e_year: parseInt(year),
                deleted: false,
            },
        },
    ]);

    dailyAttendance.forEach(project => {
        let totalProjectCost = 0;

        project.records.forEach(record => {
            const employeeSalary = salaryData.find(salary => salary.employee.toString() === record.employee._id.toString());

            if (employeeSalary) {
                const presentDays = project.attendanceSummary.P;
                totalProjectCost += presentDays * employeeSalary.perday_salary;
            }
        });

        project.total_project_cost = totalProjectCost;
    });

    sendResponse(res, 200, true, dailyAttendance, "Attendance and Project Costs");
}

const getProjectreport = async (month, year_id, firm_id) => {
    try {
        const year = await Year.findOne({ _id: year_id });
        const selectedYear = parseInt(month) < 4
            ? new Date(year.end_year).getFullYear()
            : new Date(year.start_year).getFullYear();
        const daysInMonth = new Date(selectedYear, month, 0).getDate();
        const monthWord = await getMonthName(month);

        const dateArray = Array.from({ length: daysInMonth }, (_, i) => ({
            date: `${selectedYear}-${month.toString().padStart(2, "0")}-${(i + 1).toString().padStart(2, "0")}`,
            total_salary: 0
        }));

        const data = await DailyAttendance.aggregate([
            {
                $match: {
                    deleted: false,
                    month: parseInt(month),
                    firm_id: new ObjectId(firm_id),
                    year_id: new ObjectId(year_id),
                    project: { $exists: true, $ne: null }
                }
            },
            {
                $lookup: {
                    from: "bussiness-projects",
                    localField: "project",
                    foreignField: "_id",
                    as: "projectDetails"
                }
            },
            {
                $unwind: {
                    path: "$projectDetails",
                    preserveNullAndEmptyArrays: false
                }
            },
            {
                $lookup: {
                    from: "salaries",
                    let: { employeeId: "$employee", month: parseInt(month), firm_id: new ObjectId(firm_id), year_id: new ObjectId(year_id) },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee", "$$employeeId"] },
                                        { $eq: ["$month", "$$month"] },
                                        { $eq: ["$firm_id", "$$firm_id"] },
                                        { $eq: ["$year_id", "$$year_id"] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "salaryDetails"
                }
            },
            {
                $unwind: {
                    path: "$salaryDetails",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "earnings",
                    let: { employeeId: "$employee", month: parseInt(month), date: "$date" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee", "$$employeeId"] },
                                        { $eq: ["$month", "$$month"] },
                                        { $eq: ["$date", "$$date"] },
                                        { $eq: ["$deleted", false] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "earningsDetails"
                }
            },
            {
                $unwind: {
                    path: "$earningsDetails",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: {
                        project_id: "$project",
                        project_name: "$projectDetails.name",
                        date: "$date"
                    },
                    total_salary: {
                        $sum: {
                            $round: [
                                {
                                    $add: [
                                        { $multiply: ["$present_day", "$salaryDetails.perday_salary"] },
                                        { $multiply: ["$ot_hour", "$salaryDetails.perhour_ot_salary"] }
                                    ]
                                },
                                2
                            ]
                        }
                    },
                    total_earnings: { $sum: "$earningsDetails.amount" }
                }
            },
            {
                $group: {
                    _id: {
                        project_id: "$_id.project_id",
                        project_name: "$_id.project_name"
                    },
                    salary_by_date: {
                        $push: {
                            date: "$_id.date",
                            // total_salary: "$total_salary"
                            total_salary: { $add: ["$total_salary", "$total_earnings"] }
                        }
                    }
                }
            },
            {
                $addFields: {
                    salary_by_date: {
                        $map: {
                            input: dateArray,
                            as: "d",
                            in: {
                                date: "$$d.date",
                                total_salary: {
                                    $let: {
                                        vars: {
                                            matched: {
                                                $arrayElemAt: [
                                                    {
                                                        $filter: {
                                                            input: "$salary_by_date",
                                                            as: "s",
                                                            cond: {
                                                                $eq: [
                                                                    { $dateToString: { format: "%Y-%m-%d", date: "$$s.date" } },
                                                                    "$$d.date"
                                                                ]
                                                            }
                                                        }
                                                    },
                                                    0
                                                ]
                                            }
                                        },
                                        in: { $ifNull: ["$$matched.total_salary", 0] }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    total_project_salary: {
                        $sum: {
                            $map: {
                                input: "$salary_by_date",
                                as: "s",
                                in: "$$s.total_salary"
                            }
                        }
                    }
                }
            },
            {
                $sort: {
                    "_id.project_name": 1
                }
            },
            {
                $project: {
                    _id: 0,
                    project_id: "$_id.project_id",
                    project_name: "$_id.project_name",
                    salary_by_date: 1,
                    total_project_salary: 1
                }
            }
        ]);

        const dateSalarySum = await sumSalariesByDate(data);

        const requestData = {
            projectdata: data,
            dateSalarySum: dateSalarySum,
            month: month,
            monthWord: monthWord,
            year: selectedYear
        }


        if (data.length && data.length > 0) {
            return { status: 1, result: requestData };
        } else {
            return { status: 0, result: [] };
        }
    } catch (error) {
        return { status: 2, result: error };
    }
};

exports.listProjectreport = async (req, res) => {
    const { month, year_id, firm_id } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getProjectreport(month, year_id, firm_id)
            let requestData = data.result;

            if (data.status === 1) {
                sendResponse(res, 200, true, requestData, "Project report data found");
            }
            else if (data.status === 0) {
                sendResponse(res, 200, false, [], `Project report data not found`)
            }
            else if (data.status === 2) {
                console.log("error", data.result);
                sendResponse(res, 500, false, {}, "Something went wrong1111");
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.downloadProjectreport = async (req, res) => {
    const { month, year_id, firm_id, print_date } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getProjectreport(month, year_id, firm_id)
            let requestData = data.result;

            if (data.status === 1) {
                const template = fs.readFileSync(
                    "templates/PojectReport.html",
                    "utf-8"
                );

                const headerInfo = {
                    dateSalarySum: requestData.dateSalarySum,
                    month: requestData.month,
                    monthWord: requestData.monthWord,
                    year: requestData.year,
                }
                const renderedHtml = ejs.render(template, {
                    headerInfo,
                    items: requestData.projectdata,
                    logoUrl1: process.env.LOGO_URL_1,
                    logoUrl2: process.env.LOGO_URL_2,
                });

                const browser = await puppeteer.launch({
                    headless: true,
                    args: ["--no-sandbox", "--disable-setuid-sandbox"],
                    executablePath: PATH,
                });

                const page = await browser.newPage();

                await page.setContent(renderedHtml, {
                    baseUrl: `${URI}`,
                });

                const pdfBuffer = await page.pdf({
                    width: "25in",
                    height: "11.7in",
                    margin: {
                        top: "0.5in",
                        right: "0.5in",
                        bottom: "0.7in",
                        left: "0.5in",
                    },
                    printBackground: true,
                    preferCSSPageSize: true,
                    displayHeaderFooter: true,
                    footerTemplate: `
                      <div style="font-size: 14px; width: 100%; text-align: right; padding-right: 50px; padding-bottom: 30px;">
                        ${print_date ? `<span>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>` : ''}
                        ${print_date ? '&nbsp;&nbsp;&nbsp;' : ''}
                        Page <span class="pageNumber"></span> of <span class="totalPages"></span>
                      </div>
                    `,
                    headerTemplate: `<div></div>`,
                    compress: true,
                });

                await browser.close();

                const pdfsDir = path.join(__dirname, "../../pdfs");
                if (!fs.existsSync(pdfsDir)) {
                    fs.mkdirSync(pdfsDir);
                }

                const filename = `project_report_${Date.now()}.pdf`;
                const filePath = path.join(__dirname, "../../pdfs", filename);

                fs.writeFileSync(filePath, pdfBuffer);

                const fileUrl = `${URI}/pdfs/${filename}`;

                sendResponse(
                    res,
                    200,
                    true,
                    { file: fileUrl },
                    "PDF downloaded Successfully"
                );
            }
            else if (data.status === 0) {
                sendResponse(res, 200, false, {}, `Project report data not found`)
            }
            else if (data.status === 2) {
                console.log("error", data.result);
                sendResponse(res, 500, false, {}, "Something went wrong");
            }
        } catch (error) {
            console.log(error);
            sendResponse(res, 500, false, {}, "Something went wrong1111");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.xlsxProjectreport = async (req, res) => {
    const { month, year_id, firm_id, print_date } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getProjectreport(month, year_id, firm_id)
            let requestData = data.result;

            if (data.status === 1) {

                const wb = XLSX.utils.book_new();
                let ws

                const headerStyle = {
                    font: { bold: true }, fill: { fgColor: { rgb: "fdc686" } }, alignment: { horizontal: 'center', vertical: 'middle' }
                };

                const headerStyle2 = {
                    font: { size: 16, bold: true }, fill: { fgColor: { rgb: 'fdc686' } }, alignment: { horizontal: 'center', vertical: 'middle' },
                };

                const headerStyle4 = {
                    font: { bold: true }, alignment: { horizontal: 'center', vertical: 'middle' },
                };

                // *** Do not remove space ***
                const ws_data = [
                    [
                        {
                            v: `VISHAL ENTERPRISE & VRISHAL ENGINEERING PRIVATE LIMITED GROUP OF COMPANIES`, s: headerStyle2
                        },
                    ],
                    [
                        { v: `Project Salary Report`, s: headerStyle4 },
                    ],
                ];

                const headers = [
                    { v: "Sr No.", s: headerStyle },
                    { v: "Project Name", s: headerStyle },
                    ...requestData.projectdata[0].salary_by_date.map(detail => ({
                        v: new Date(detail.date).toLocaleDateString(),
                        s: headerStyle
                    })),
                    { v: "Total", s: headerStyle },
                ];


                ws_data.push(headers);

                requestData.projectdata.forEach((item, itemIndex) => {
                    const row = [
                        itemIndex + 1,
                        item.project_name || '--'
                    ];

                    item.salary_by_date.forEach(salary => {
                        row.push(salary.total_salary ? salary.total_salary.toFixed(2) : '0.00');
                    });

                    row.push({
                        v: item.total_project_salary ? item.total_project_salary.toFixed(2) : '0.00',
                        s: headerStyle4
                    });

                    ws_data.push(row);
                });

                ws_data.push([]);
                const total = Object.values(requestData.dateSalarySum).reduce((sum, value) => sum + value, 0);
                ws_data.push([
                    { v: "Total", s: headerStyle4 },
                    "",  // Empty cell for alignment with the second column
                    ...Object.values(requestData.dateSalarySum).map(amount => ({
                        v: amount.toFixed(2),
                        s: headerStyle4
                    })),
                    { v: total.toFixed(2), s: headerStyle4 },
                ]);

                const maxCols = Math.max(...ws_data.map(row => row.length));

                const colWidths = Array.from({ length: maxCols }, (_, colIndex) => ({
                    wch: Math.max(
                        ...ws_data.slice(2, 2 + requestData.projectdata.length + 1).map(row => (
                            row[colIndex]?.toString().length || 0
                        ))
                    ),
                }));


                ws = XLSX.utils.aoa_to_sheet(ws_data);
                ws['!cols'] = colWidths;

                ws['!merges'] = [
                    { s: { r: 0, c: 0 }, e: { r: 0, c: 33 } },
                    { s: { r: 1, c: 0 }, e: { r: 1, c: 33 } },
                    { s: { r: ws_data.length - 1, c: 0 }, e: { r: ws_data.length - 1, c: 1 } },
                ];

                XLSX.utils.book_append_sheet(wb, ws, `Project salary report`);

                const xlsxPath = path.join(__dirname, '../../xlsx');

                if (!fs.existsSync(xlsxPath)) {
                    fs.mkdirSync(xlsxPath, { recursive: true });
                }

                const filename = `project_report_${Date.now()}.xlsx`;
                const filePath = path.join(xlsxPath, filename);

                await XLSXStyle.writeFile(wb, filePath);

                const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
                const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;

                sendResponse(res, 200, true, { file: fileUrl }, `XLSX file generated successfully`)
            }
            else if (data.status === 0) {
                sendResponse(res, 200, false, {}, `Project salary report not found`)
            }
            else if (data.status === 2) {
                sendResponse(res, 500, false, {}, "Something went wrong111");
            }
        } catch (error) {
            console.log("error", error);
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.getProjectAttenance = async (req, res) => {
    const { project, month } = req.body;

    if (!req.user && req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }

    if (!project) {
        return sendResponse(res, 400, false, {}, "Project is required");
    }

    try {

        let matchStage = { project: new ObjectId(project) };

        if (month) {
            matchStage.month = parseInt(month);
        }

        const attendanceData = await DailyAttendance.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        name: "$sum_Apchar"
                    }, // Group by sum_Apchar
                    count: { $sum: 1 } // Count occurrences
                },
            },
            {
                $project: {
                    _id: 0,
                    name: "$_id.name",
                    count: 1,
                }
            },
            { $sort: { count: -1 } }
        ]);

        return sendResponse(res, 200, true, attendanceData, "Project attendance data fetched successfully");
    } catch (error) {
        return sendResponse(res, 500, false, {}, "Internal Server Error");
    }
}