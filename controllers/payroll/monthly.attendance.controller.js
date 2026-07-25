const MonthlyAttendance = require('../../models/payroll/monthly.attendance.model');
const Firm = require('../../models/firm.model');
const Employee = require('../../models/payroll/employ.model');
const Salary = require('../../models/payroll/salary.model');
const DailyAttendance = require('../../models/payroll/daily.attendance.model');
const Earning = require('../../models/payroll/earning.model');

const Year = require('../../models/year.model');

const { sendResponse } = require('../../helper/response');
const { EarningRates } = require('../../utils/enum');
exports.getMonthlyAttendance = async (req, res) => {
    let empId = req.query.id;
    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
    let query = { status: true, deleted: false };
    if (empId) {
        query.employee = empId;
    }
    try {
        const monthlyData = await MonthlyAttendance.find(query, { deleted: 0 })
            .populate('firm_id', 'name')
            .populate('year_id', 'start_year end_year')
            .populate({
                path: 'employee',
                select: 'card_no full_name designation salary_id employee_id'
            })
            .sort({ createdAt: -1 })
            .lean();

        const responseData = [];
        for (const elem of monthlyData) {
            let salaryData = null;
            if (elem.employee && elem.employee._id) {
                const salary = await Salary.findOne({ employee: elem.employee._id, deleted: false }, { department: 1 })
                    .populate('bank_name', 'name')
                    .populate('department', 'name')
                    .sort({ createdAt: -1 })
                    .lean();

                if (salary) {
                    salaryData = {
                        employee: salary.employee,
                        department: salary.department
                    };
                }
            }

            responseData.push({
                ...elem,
                salary_id: salaryData
            });
        }

        if (responseData.length > 0) {
            return sendResponse(res, 200, true, responseData, "Monthly Attendance list");
        } else {
            return sendResponse(res, 400, false, {}, "Monthly Attendance not found");
        }

    } catch (error) {
        console.error(error);
        return sendResponse(res, 500, false, {}, "Something went wrong");
    }
};


exports.getAdminMonthlyAttendance = async (req, res) => {
    const { month, firm, year } = req.query;
    if (req.user && !req.error) {
        try {
            const query = { status: true, deleted: false }
            if (firm) query.firm_id = firm;
            if (year) query.year_id = year;
            if (month) query.month = month;
            const monthlyData = await MonthlyAttendance.find(query, { deleted: 0, __v: 0 })
                .populate('firm_id', 'name')
                .populate('year_id', 'start_year end_year')
                .populate({
                    path: 'employee',
                    select: 'card_no full_name designation salary_id employee_id adhar_no'
                })
                .sort({ createdAt: -1 })
                .lean();

            const employeeIds = monthlyData.map(elem => elem.employee?._id).filter(id => id);

            const salaries = await Salary.find({ employee: { $in: employeeIds } })
                .populate({
                    path: 'department',
                    select: 'name',
                })
                .sort({ createdAt: -1 })
                .lean();

            const salaryMap = salaries.reduce((map, salary) => {
                if (!map[salary.employee]) {
                    map[salary.employee] = salary;
                }
                return map;
            }, {});
            const responseData = monthlyData.map(elem => {
                const salaryData = elem.employee ? salaryMap[elem.employee._id] : null;
                return {
                    ...elem,
                    salary_id: salaryData ? {
                        employee: salaryData.employee,
                        department: salaryData.department,
                    } : null
                };
            });

            if (responseData) {
                sendResponse(res, 200, true, responseData, "Monthly Attendance list");
            } else {
                sendResponse(res, 400, false, {}, "Monthly Attendance not found");
            }
        } catch (error) {
            console.error("Error fetching monthly attendance:", error);
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.manageMonthlyAttendance = async (req, res) => {
    const {
        firm_id, year_id, employee, month, ot_day, ot_hour, use_leave, week_off_present, remark, actual_present_day,
        cl_day, ph_day, present_day, sunday_present, full_night_present, bonus_percent, status, id
    } = req.body;

    if (req.user) {
        if (firm_id && year_id && employee && month && present_day) {
            const [firmData, employeeData, salaryEmpData, yearData] = await Promise.all([
                Firm.findById(firm_id),
                Employee.findOne({ _id: employee, deleted: false }),
                Salary.findOne({ employee, month, firm_id, year_id, deleted: false }),
                Year.findById(year_id)
            ]);

            if (!firmData || !employeeData || !yearData) {
                return sendResponse(res, 404, false, {}, "Required data not found");
            }

            const startYear = new Date(yearData.start_year).getFullYear();
            const endYear = new Date(yearData.end_year).getFullYear();
            const monthYear = (month >= 4 && month <= 12) ? startYear : endYear;

            const existingAttendance = await MonthlyAttendance.findOne({ employee, month, year_id, deleted: false });
            const dailyExistingAttendance = await DailyAttendance.findOne({ employee, month, year_id, deleted: false });

            if (!id && (existingAttendance || dailyExistingAttendance)) {
                return sendResponse(res, 404, false, {}, "Monthly attendance entry already exists");
            }

            const lastDailyAttendance = await DailyAttendance.findOne({ firm_id, year_id, deleted: false }, {}, { sort: { createdAt: -1 } });
            const voucherNo = lastDailyAttendance ? `${parseInt(lastDailyAttendance.voucher_no) + 1}` : '1';

            const monthlyAttendanceData = {
                firm_id, year_id, employee: employeeData, month, e_year: monthYear, e_day: 1, present_day, ot_day,
                ot_hour, use_leave, week_off_present, remark, voucher_no: voucherNo, actual_present_day, cl_day,
                ph_day, sunday_present, full_night_present, bonus_percent
            };

            if (!id) {
                const newAttendance = new MonthlyAttendance(monthlyAttendanceData);
                await newAttendance.save();
            } else {
                await MonthlyAttendance.findByIdAndUpdate(id, { ...monthlyAttendanceData, status });
            }

            const updateEarningEntry = async (type, remark, amount) => {
                const existingEarning = await Earning.findOne({ employee, firm_id, year_id, month, type, remark, deleted: false });

                if (amount === 0) {
                    if (existingEarning) {
                        await Earning.findByIdAndDelete(existingEarning._id);
                    }
                } else if (existingEarning) {
                    await Earning.findByIdAndUpdate(existingEarning._id, { amount });
                } else {
                    const lastEarning = await Earning.findOne({}, {}, { sort: { 'voucher_no': -1 } });
                    const newVoucherNo = lastEarning ? `${parseInt(lastEarning.voucher_no) + 1}` : '1';

                    const newEarning = new Earning({
                        employee,
                        firm_id,
                        year_id,
                        month,
                        e_year: monthYear,
                        e_day: 1,
                        type,
                        amount: parseFloat(amount).toFixed(2),
                        remark,
                        voucher_no: newVoucherNo,
                        date: new Date(monthYear, month - 1, 30)
                    });
                    await newEarning.save();
                    return newVoucherNo;
                }
            };

            if (sunday_present > 0) {
                await updateEarningEntry('Sunday_Present', 'Sunday Present Remark', parseFloat((sunday_present * EarningRates.Extra).toFixed(2)));
            } else {
                await updateEarningEntry('Sunday_Present', 'Sunday Present Remark', 0);
            }

            if (full_night_present > 0) {
                await updateEarningEntry('Full_Night_Present', 'Full Night Remark', parseFloat((full_night_present * EarningRates.Extra).toFixed(2)));
            } else {
                await updateEarningEntry('Full_Night_Present', 'Full Night Remark', 0);
            }

            if (bonus_percent > 0) {
                const bonusAmount = parseFloat(((bonus_percent / 100) * (salaryEmpData.basic / salaryEmpData.working_day) * actual_present_day).toFixed(2));
                await updateEarningEntry('Bonus', 'Bonus Remark', bonusAmount);
            } else {
                await updateEarningEntry('Bonus', 'Bonus Remark', 0);
            }

            const message = id ? "Monthly Attendance updated successfully" : "Monthly Attendance added successfully";
            return sendResponse(res, 200, true, {}, message);
        } else {
            return sendResponse(res, 400, false, {}, "Missing parameters");
        }
    } else {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.deleteMonthlyAttendance = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            await MonthlyAttendance.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Monthly Attendance deleted successfully")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}