const Loan = require('../../models/payroll/loan.model');
const Salary = require('../../models/payroll/salary.model');
const Deduction = require('../../models/payroll/deduction.model');
const mongoose = require('mongoose');
const { sendResponse } = require('../../helper/response');
const { generateReport } = require('../../utils/generateReport');

exports.getLoan = async (req, res) => {
    const { month, firm, year } = req.query;
    if (req.user && !req.error) {
        const query = { status: true, deleted: false }
        if (firm) query.firm_id = firm;
        if (year) query.year_id = year;
        if (month) query.month = month;
        try {
            const LoanData = await Loan.find(query, { deleted: 0 })
                .populate({
                    path: 'employee',
                    select: 'card_no full_name designation salary_id employee_id',
                    populate: {
                        path: 'designation',
                        select: 'name'
                    },
                })
                .populate('auth_person', 'name')
                .populate('firm_id', 'name')
                .populate('year_id', 'start_year end_year')

            await Promise.all(LoanData.map(async (elem) => {
                let salaryData = null;
                if (elem.employee) {
                    if (elem.employee._id) {
                        const salary = await Salary.find({ employee: elem.employee._id })
                            .populate('bank_name', 'name')
                            .populate({
                                path: 'department',
                                select: 'name group',
                                populate: {
                                    path: 'group',
                                    select: 'name'
                                }
                            })
                            .sort({ createdAt: -1 })

                        salaryData = salary[0] ? {
                            employee: salary[0].employee,
                            department: salary[0].department,
                            bank_name: salary[0].bank_name,
                            bank_branch_name: salary[0].bank_branch_name,
                            bank_account_name: salary[0].bank_account_name,
                            bank_account_no: salary[0].bank_account_no,
                            bank_account_ifsc: salary[0].bank_account_ifsc,
                            bank_code: salary[0].bank_code
                        } : {};

                    } else {
                        salaryData = {};
                    }
                }
                return {
                    ...elem.toObject(),
                    salary_id: salaryData
                }
            })).then(data => {
                if (data) {
                    sendResponse(res, 200, true, data, "Loan list")
                } else {
                    sendResponse(res, 400, false, {}, "Loan not found")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.getAdminLoan = async (req, res) => {
    const { month, firm, year } = req.query;
    console.log()
    if (req.user && !req.error) {
        const query = { status: true, deleted: false }
        if (firm) query.firm_id = firm;
        if (year) query.year_id = year;
        if (month) query.e_month = month;
        try {
            const LoanData = await Loan.find(query, { deleted: 0, __v: 0 })
                .populate({
                    path: 'employee',
                    select: 'card_no full_name designation salary_id employee_id adhar_no',
                    populate: {
                        path: 'designation',
                        select: 'name'
                    }
                })
                .populate('auth_person', 'name')
                .populate('firm_id', 'name')
                .populate('year_id', 'start_year end_year')
                .lean();

            const employeeIds = LoanData.map(elem => elem.employee ? elem.employee._id : null).filter(id => id);

            const salaries = await Salary.find({ employee: { $in: employeeIds }, deleted: false }, { department: 1, employee: 1 })
                .populate('department', 'name')
                .populate('employee', 'full_name')
                .sort({ createdAt: -1 })
                .lean();

            const salaryMap = salaries.reduce((map, salary) => {
                map[salary.employee?._id] = {
                    employee: salary.employee?._id,
                    department: salary.department,
                };
                return map;
            }, {});

            const responseData = LoanData.map(elem => ({
                ...elem,
                salary_id: salaryMap[elem.employee?._id] || {}
            }));

            if (responseData) {
                sendResponse(res, 200, true, responseData, "Loan list");
            } else {
                sendResponse(res, 400, false, {}, "Loan not found");
            }
        } catch (error) {
            console.error(error);
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.manageLoan = async (req, res) => {
    const {
        firm_id, year_id, date, employee, loan_amount, installment_amount, auth_person,
        remark, loan_terms, interest_rate, status, id
    } = req.body;

    try {
        if (!req.user) {
            return sendResponse(res, 401, false, {}, "Unauthorized");
        }

        if (!firm_id || !year_id || !date || !employee || !loan_amount || !auth_person || !loan_terms) {
            return sendResponse(res, 400, false, {}, "Missing parameters");
        }

        const startYear = new Date(date).getFullYear();
        const month = new Date(date).getMonth();
        const day = new Date(date).getDate();
        let voucher_no = '1';
        if (!id) {
            // const existData = await Loan.findOne({ employee, deleted: false }, { employee: 1 }).lean();
            // if (existData) {
            //     return sendResponse(res, 404, false, {}, "Loan entry for this employee already exists");
            // }

            const lastLoan = await Loan.findOne({}).sort({ voucher_no: -1 }).lean();
            if (lastLoan && lastLoan.voucher_no) {
                voucher_no = `${parseInt(lastLoan.voucher_no) + 1}`;
            }
        } else {
            // const existAtt = await Loan.findOne({ employee, _id: { $ne: id } });
            // if (existAtt) {
            //     return sendResponse(res, 400, false, {}, "Loan entry for this employee already exists");
            // }
        }

        const loanData = {
            firm_id, year_id, date, voucher_no, employee,
            e_year: startYear, e_month: month, e_day: day,
            loan_amount,
            installment_amount: installment_amount === "null" ? 0 : installment_amount,
            auth_person, remark,
            loan_terms, interest_rate, status
        };

        let result;
        if (!id) {
            const loan = new Loan(loanData);
            result = await loan.save();
            sendResponse(res, 200, true, result, "Loan added successfully");
        } else {
            result = await Loan.findByIdAndUpdate(id, loanData, { new: true });
            if (!result) {
                return sendResponse(res, 404, false, {}, "Loan not found");
            }
            sendResponse(res, 200, true, result, "Loan updated successfully");
        }
    } catch (error) {
        console.error("Error in manageLoan:", error);
        sendResponse(res, 500, false, {}, "Something went wrong");
    }
};

exports.deleteLoan = async (req, res) => {
    const { id } = req.body
    if (req.user && !req.error && id) {
        try {
            await Loan.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Loan deleted successfully")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.getLoanIssueReport = async (req, res) => {
    let { firm, startDate, endDate, department, full_name } = req.body;

    if (req.user && !req.error) {
        const matchParams = { deleted: false };

        if (startDate && endDate) {
            const d1 = startDate ? new Date(`${startDate}T00:00:00.000Z`) : null;
            const d2 = endDate ? new Date(`${endDate}T23:59:59.999Z`) : null;
            matchParams.date = { $gte: d1, $lt: d2 };
        }

        if (typeof department === 'string' && department.startsWith('[') && department.endsWith(']')) {
            department = JSON.parse(department.replace(/'/g, '"'));
        }

        const departmentMatch = department
            ? Array.isArray(department)
                ? { "departmentData.name": { $in: department } }
                : { "departmentData.name": department }
            : {};

        const report = await Loan.aggregate([
            {
                $match: matchParams,
            },
            {
                $lookup: {
                    from: "employees",
                    localField: "employee",
                    foreignField: "_id",
                    as: "employeeData"
                }
            },
            {
                $unwind: "$employeeData"
            },
            ...(full_name ? [{
                $match: {
                    "employeeData.full_name": {
                        $regex: new RegExp(full_name, "i")
                    }
                }
            }] : []),
            {
                $lookup: {
                    from: "salaries",
                    let: { employeeId: "$employeeData._id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$employee", "$$employeeId"]
                                }
                            }
                        },
                        {
                            $sort: { month: -1 }
                        },
                        {
                            $limit: 1
                        }
                    ],
                    as: "salaryData"
                }
            },
            {
                $unwind: "$salaryData"
            },
            {
                $lookup: {
                    from: "departments",
                    localField: "salaryData.department",
                    foreignField: "_id",
                    as: "departmentData"
                }
            },
            {
                $unwind: "$departmentData"
            },
            {
                $match: departmentMatch,
            },
            {
                $lookup: {
                    from: "firms",
                    localField: "firm_id",
                    foreignField: "_id",
                    as: "firmData"
                }
            },
            {
                $unwind: "$firmData"
            },
            ...(firm ? ([{
                $match: {
                    $expr: {
                        $eq: ["$firmData._id", new mongoose.Types.ObjectId(firm)],
                    }
                }
            }
            ]) : []),
            {
                $lookup: {
                    from: "years",
                    localField: "year_id",
                    foreignField: "_id",
                    as: "yearData"
                }
            },
            {
                $unwind: "$yearData"
            },
            {
                $lookup: {
                    from: "auth-people",
                    localField: "auth_person",
                    foreignField: "_id",
                    as: "approvedBy"
                }
            },
            {
                $unwind: "$approvedBy"
            },
            {
                $project: {
                    _id: 1,
                    voucher_no: 1,
                    date: 1,
                    full_name: "$employeeData.full_name",
                    card_no: "$employeeData.card_no",
                    employee_id: "$employeeData.employee_id",
                    department: "$departmentData.name",
                    loan_terms: 1,
                    loan_amount: 1,
                    installment_amount: 1,
                    remark: 1,
                    firm: "$firmData.name",
                    firm_id: "$firmData._id",
                    year_id: 1,
                    e_month: 1,
                    approvedPerson: "$approvedBy.name"
                }
            }
        ])

        if (report?.length > 0) {
            sendResponse(res, 200, true, report, 'Loan issue report List');
        } else {
            sendResponse(res, 200, true, [], "No data found");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
        return;
    }
}

exports.genLoanStatusReport = async (req, res) => {
    let { firm, startDate, endDate, department, full_name } = req.body;

    if (req.user && !req.error) {

        const matchParams = { deleted: false };
        if (!startDate || !endDate) {
            sendResponse(res, 400, false, {}, 'Please select date');
            return;
        }
        try {
            if (startDate && endDate) {
                const d1 = startDate ? new Date(`${startDate}T00:00:00.000Z`) : null;
                const d2 = endDate ? new Date(`${endDate}T23:59:59.999Z`) : null;
                matchParams.date = { $gte: d1, $lte: d2 };

                if (typeof department === 'string' && department.startsWith('[') && department.endsWith(']')) {
                    department = JSON.parse(department.replace(/'/g, '"'));
                }

                const departmentMatch = department
                    ? Array.isArray(department)
                        ? { "departmentData.name": { $in: department } }
                        : { "departmentData.name": department }
                    : {};

                // Loan receive entry
                const result = await generateReport({ type: "Loan", startDate: startDate, endDate: endDate, tableType: "deductions" })

                const prevDate = new Date(startDate);
                prevDate.setDate(prevDate.getDate() - 1);

                const report = await Loan.aggregate([
                    {
                        $match: matchParams,
                    },
                    {
                        $lookup: {
                            from: "employees",
                            localField: "employee",
                            foreignField: "_id",
                            as: "employeeData"
                        }
                    },
                    {
                        $unwind: "$employeeData",
                    },
                    {
                        $lookup: {
                            from: "designations",
                            localField: "employeeData.designation",
                            foreignField: "_id",
                            as: "designationData"
                        }
                    },
                    {
                        $unwind: "$designationData"
                    },
                    ...(full_name ? [{
                        $match: {
                            "employeeData.full_name": {
                                $regex: new RegExp(full_name, "i")
                            }
                        }
                    }] : []),
                    {
                        $lookup: {
                            from: "salaries",
                            let: { employeeId: "$employeeData._id" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: { $eq: ["$employee", "$$employeeId"] }
                                    }
                                },
                                { $sort: { month: -1 } },
                                { $limit: 1 }
                            ],
                            as: "salaryData"
                        }
                    },
                    {
                        $unwind: { path: "$salaryData", preserveNullAndEmptyArrays: true }
                    },
                    {
                        $lookup: {
                            from: "departments",
                            localField: "salaryData.department",
                            foreignField: "_id",
                            as: "departmentData"
                        }
                    },
                    {
                        $unwind: { path: "$departmentData", preserveNullAndEmptyArrays: true }
                    },
                    {
                        $match: departmentMatch,
                    },
                    {
                        $sort: { date: -1 }
                    },
                    {
                        $lookup: {
                            from: "firms",
                            localField: "firm_id",
                            foreignField: "_id",
                            as: "firmData"
                        }
                    },
                    {
                        $unwind: "$firmData"
                    },
                    ...(firm ? ([{
                        $match: {
                            $expr: {
                                $eq: ["$firmData._id", new mongoose.Types.ObjectId(firm)],
                            }
                        }
                    }
                    ]) : []),
                    {
                        $lookup: {
                            from: "loans",
                            let: { employeeId: "$employeeData._id" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: { $eq: ["$employee", "$$employeeId"] },
                                        date: { $lte: prevDate }
                                    }
                                },
                                {
                                    $group: {
                                        _id: null,
                                        opening_balance: { $sum: "$loan_amount" }
                                    }
                                }
                            ],
                            as: "previousLoanData"
                        }
                    },
                    {
                        $unwind: {
                            path: "$previousLoanData",
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $lookup: {
                            from: "deductions",
                            let: { employeeId: "$employeeData._id" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                { $eq: ["$employee", "$$employeeId"] },
                                                { $eq: ["$type", "Loan"] },
                                                { $lte: ["$date", prevDate] }
                                            ]
                                        }
                                    }
                                },
                                {
                                    $group: {
                                        _id: null,
                                        totalPaid: { $sum: "$amount" }  // Sum the loan deduction amounts
                                    }
                                }
                            ],
                            as: "previousPaidData"
                        }
                    },
                    {
                        $unwind: {
                            path: "$previousPaidData",
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $group: {
                            _id: "$employeeData._id",
                            full_name: { $first: "$employeeData.full_name" },
                            employee_id: { $first: "$employeeData.employee_id" },
                            card_no: { $first: "$employeeData.card_no" },
                            designation: { $first: "$designationData.name" },
                            totalLoanAmt: { $sum: "$loan_amount" },
                            totalLoan: { $sum: 1 },
                            installment_amount: { $first: "$installment_amount" },
                            department: { $first: "$departmentData.name" },
                            opening_balance: { $first: "$previousLoanData.opening_balance" },
                            totalPaidAmt: { $first: "$previousPaidData.totalPaid" },
                            prev: { $first: "$previousPaidData" },
                            firm_id: { $first: "$firmData._id" },
                            firm_name: { $first: "$firmData.name" },
                        },
                    },
                    {
                        $addFields: {
                            opening_balance: {
                                $ifNull: ["$opening_balance", 0]
                            },
                            installment_amount: {
                                $ifNull: ["$installment_amount", 0]
                            },
                            open_balance: {
                                $subtract: ["$opening_balance", "$totalPaidAmt"]
                            },
                            lastPaidamt: {
                                $ifNull: ["$previousPaidData", 0]
                            },
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            full_name: 1,
                            employee_id: 1,
                            card_no: 1,
                            totalLoanAmt: 1,
                            totalLoan: 1,
                            installment_amount: 1,
                            department: 1,
                            open_balance: 1,
                            firm_id: 1,
                            firm_name: 1,
                            designation: 1,
                            // totalPaidAmt: 1,
                            // prev: 1
                        }
                    }
                ]);

                const deductionMap = new Map();
                result[0]?.deductions?.employees.map(deduction => {
                    if (!deductionMap.get(deduction.card_no)) {
                        deductionMap.set((deduction.card_no), deduction.amount);
                    } else {
                        deductionMap.set((deduction.card_no), deductionMap.get((deduction.card_no)) + deduction.amount);
                    }
                })


                const finalReport = report.map(report => ({
                    ...report,
                    open_balance: report.open_balance === null ? 0 : report.open_balance,
                    receive_amount: deductionMap.get((report.card_no)) || 0,
                    balance_amount: report.open_balance + report.totalLoanAmt - (deductionMap?.get((report.card_no)) || 0),
                }))

                sendResponse(res, 200, true, finalReport, 'Loan status report!');
            }
        } catch (err) {
            console.log(err)
            sendResponse(res, 500, false, {}, 'Something went wrong!');
            return;
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
        return;
    }
};

exports.loanSummary = async (req, res) => {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;
    if (!req.user && req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }

    try {
        let safeStartDate = (startDate && startDate !== "null") ? new Date(startDate) : null;
        let safeEndDate = (endDate && endDate !== "null") ? new Date(endDate) : null;

        const dateFilter = {};
        if (safeStartDate && safeEndDate) {
            dateFilter.date = {
                $gte: safeStartDate,
                $lte: safeEndDate,
            };
        } else if (safeStartDate) {
            dateFilter.date = { $gte: safeStartDate };
        } else if (safeEndDate) {
            dateFilter.date = { $lte: safeEndDate };
        }
        const loans = await Loan.find({ employee: employeeId, deleted: false, ...dateFilter }).sort({ date: 1 });
        const deductions = await Deduction.find({ employee: employeeId, type: 'Loan', deleted: false, ...dateFilter }).sort({ date: 1 });

        let combinedList = [];

        // Push loans (type: 'taken')
        for (let loan of loans) {
            combinedList.push({
                type: 'taken',
                loan_id: loan._id,
                amount: loan.loan_amount,
                date: loan.date,
                remark: loan.remark || ''
            });
        }

        // Push deductions (type: 'deducted')
        for (let d of deductions) {
            combinedList.push({
                type: 'deducted',
                amount: d.amount,
                date: d.date,
                remark: d.remark || '',
                voucher_no: d.voucher_no
            });
        }

        // Sort by date ascending
        combinedList.sort((a, b) => new Date(a.date) - new Date(b.date));

        let runningBalance = 0;
        let totalTaken = 0;
        let totalPaid = 0;

        const enrichedList = combinedList.map(entry => {
            if (entry.type === 'taken') {
                runningBalance += entry.amount;
                totalTaken += entry.amount;
            } else if (entry.type === 'deducted') {
                runningBalance -= entry.amount;
                totalPaid += entry.amount;
            }

            return {
                ...entry,
                runningBalance,
                status: runningBalance <= 0 ? 'paid' : 'running'
            };
        });

        const openingBalance = totalTaken;
        const closingBalance = openingBalance - totalPaid;

        const overallStatus =
            totalTaken === 0 && totalPaid === 0
                ? 'no-loan'
                : closingBalance === 0
                    ? 'paid'
                    : 'running';

        const result = {
            employeeId,
            openingBalance,
            totalTaken,
            totalPaid,
            closingBalance,
            status: overallStatus,
            loanDetails: enrichedList
        };

        sendResponse(res, 200, true, result, "Loan summary list");
    } catch (error) {
        console.error("Error in loanSummary:", error);
        sendResponse(res, 500, false, {}, "Something went wrong");
    }
};