const Earning = require('../../models/payroll/earning.model');
const Salary = require('../../models/payroll/salary.model');
const { sendResponse } = require('../../helper/response');
const { generateReport } = require('../../utils/generateReport');

exports.getEarning = async (req, res) => {
    const { month, firm, year } = req.query;
    if (req.user && !req.error) {
        const query = { status: true, deleted: false }
        const isValid = (v) => v && v !== 'null' && v !== 'undefined';
        if (isValid(firm)) query.firm_id = firm;
        if (isValid(year)) query.year_id = year;
        if (isValid(month)) query.month = month;
        try {
            const earningData = await Earning.find(query, { deleted: 0 })
                .populate({
                    path: 'employee',
                    select: 'card_no full_name designation salary_id adhar_no employee_id',
                    populate: {
                        path: 'designation',
                        select: 'name'
                    }
                })
                .populate('firm_id', 'name')
                .populate('year_id', 'start_year end_year')
                .sort({ createdAt: -1 })
                .lean();

            const employeeIds = earningData.map(elem => elem.employee._id).filter(Boolean);
            const salaryData = await Salary.find({ employee: { $in: employeeIds } }, { employee: 1, department: 1 })
                .populate({
                    path: 'department',
                    select: 'name',
                })
                .lean();

            const salaryMap = new Map();
            salaryData.forEach(salary => {
                salaryMap.set(salary.employee.toString(), {
                    employee: salary.employee,
                    department: salary.department,
                    month: salary.month,
                });
            });

            const combinedData = earningData.map(elem => ({
                ...elem,
                salary_id: salaryMap.get(elem.employee._id.toString()) || null
            }));

            if (combinedData) {
                sendResponse(res, 200, true, combinedData, "Earning Report");
            }
        } catch (err) {
            console.error(err);
            sendResponse(res, 500, false, {}, "Internal Server Error");
        }

    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.getAdminEarning = async (req, res) => {
    const { month, firm, year } = req.query;
    if (req.user && !req.error) {
        try {
            const query = { status: true, deleted: false }
            const isValid = (v) => v && v !== 'null' && v !== 'undefined';
            if (isValid(firm)) query.firm_id = firm;
            if (isValid(year)) query.year_id = year;
            if (isValid(month)) query.month = month;
            const earningData = await Earning.find(query, { deleted: 0, __v: 0 })
                .populate({
                    path: 'employee',
                    select: 'card_no full_name designation salary_id adhar_no employee_id',
                    populate: {
                        path: 'designation',
                        select: 'name'
                    }
                })
                .populate('firm_id', 'name')
                .populate('year_id', 'start_year end_year')
                .sort({ createdAt: -1 })
                .lean();

            const employeeIds = earningData.map(elem => elem.employee._id).filter(Boolean);
            const salaryData = await Salary.find({ employee: { $in: employeeIds } }, { employee: 1, department: 1 })
                .populate({
                    path: 'department',
                    select: 'name',
                })
                .lean();

            const salaryMap = new Map();
            salaryData.forEach(salary => {
                salaryMap.set(salary.employee.toString(), {
                    employee: salary.employee,
                    department: salary.department,
                    month: salary.month,
                });
            });

            const combinedData = earningData.map(elem => ({
                ...elem,
                salary_id: salaryMap.get(elem.employee._id.toString()) || null
            }));

            if (combinedData) {
                sendResponse(res, 200, true, combinedData, "Earning list");
            } else {
                sendResponse(res, 404, false, {}, "Earning not found");
            }
        } catch (error) {
            console.log(error);
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.manageEarning = async (req, res) => {
    const {
        firm_id, year_id, employee, date, other_voucher_no, type,
        remark, other_remark, amount, status,
        id
    } = req.body;

    try {
        if (!req.user) {
            return sendResponse(res, 401, false, {}, "Unauthorized");
        }

        if (!firm_id || !year_id || !employee || !date || !type || !amount) {
            return sendResponse(res, 400, false, {}, "Missing parameters");
        }

        let voucher_no = '1';
        if (!id) {
            const lastEarning = await Earning.findOne({ firm_id, year_id }).sort({ createdAt: -1 }).lean();
            if (lastEarning && lastEarning.voucher_no) {
                voucher_no = `${parseInt(lastEarning.voucher_no) + 1}`;
            }
        }

        const dateString = date;
        const full_date = new Date(dateString);
        const month = full_date.getMonth() + 1;
        const day = full_date.getDate();

        const earningData = {
            firm_id, year_id, employee, date, month,
            e_year: monthYear, e_day: day,
            voucher_no, other_voucher_no, type, remark,
            other_remark, amount,
        };

        let result;
        if (!id) {
            const earning = new Earning(earningData);
            await earning.save();
            sendResponse(res, 200, true, {}, "Earning added successfully");
        } else {
            result = await Earning.findByIdAndUpdate(id, { ...earningData, status }, { new: true });
            if (!result) {
                return sendResponse(res, 404, false, {}, "Earning not found");
            }
            sendResponse(res, 200, true, result, "Earning updated successfully");
        }
    } catch (error) {
        console.error("Error in manageEarning:", error);
        sendResponse(res, 500, false, {}, "Something went wrong");
    }
};

exports.deleteEarning = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            await Earning.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Earning deleted successfully")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.getEarningReport = async (req, res) => {
    const { type, startDate, endDate, department, full_name, month } = req.body;
    if (req.user && !req.error) {
        try {
            const earningsReport = await generateReport({
                type,
                startDate,
                month: parseInt(month),
                endDate,
                department,
                tableType: 'earnings',
                full_name
            });

            if (earningsReport.length > 0) {
                sendResponse(res, 200, true, earningsReport, "Grouped Earnings Report fetched successfully");
            } else {
                sendResponse(res, 200, true, [], "No earnings report found");
            }
        } catch (error) {
            console.error("Error fetching earnings report:", error);
            sendResponse(res, 500, false, {}, "Error fetching earnings report");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
        return;
    }
}
