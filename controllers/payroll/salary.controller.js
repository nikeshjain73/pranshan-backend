const Salary = require('../../models/payroll/salary.model');
const Employee = require('../../models/payroll/employ.model');
const Department = require('../../models/payroll/department.model');
const Bank = require('../../models/payroll/bank.model');
const WorkDay = require('../../models/payroll/workDay.model');
const { default: mongoose } = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const Year = require('../../models/year.model');
const Firm = require('../../models/firm.model');
const DailyAttendance = require('../../models/payroll/daily.attendance.model');
const MonthlyAttendance = require('../../models/payroll/monthly.attendance.model');
const { sendResponse } = require('../../helper/response');
const { generatePDFA4, generatePDFLarge, generatePDF, generatePDFA4WithoutPrintDate } = require('../../utils/pdfUtils');
const ejs = require("ejs");
const fs = require("fs");
const XLSX = require('xlsx');  // for utility functions
const XLSXStyle = require('xlsx-style');  // for styling
const puppeteer = require("puppeteer");
const path = require("path");
const { getMonthName } = require('../../helper');
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;

exports.getSalary = async (req, res) => {
    if (req.user && !req.error) {
        try {
            await Salary.find({ status: true, deleted: false }, { deleted: 0 }, { sort: { 'employee.full_name': - 1 } })
                .populate('firm_id', 'name')
                .populate('year_id', 'start_year end_year')
                .populate({
                    path: 'employee',
                    select: 'full_name employee_id adhar_no',
                    populate: {
                        path: 'designation',
                        select: 'name   '
                    }
                })
                .populate('bank_name', 'name')
                .populate({
                    path: 'department',
                    select: 'name group',
                    populate: {
                        path: 'group',
                        select: 'name'
                    }
                })
                .populate({
                    path: 'work_day_id',
                    select: 'department ot_hours ot_count',
                    populate: {
                        path: 'department',
                        select: 'name group',
                        populate: {
                            path: 'group',
                            select: 'name'
                        }
                    }
                })
                .sort({ createdAt: -1 })
                .lean()
                .then(data => {
                    if (data) {
                        sendResponse(res, 200, true, data, "Salary list")
                    } else {
                        sendResponse(res, 400, false, {}, "Salary not found")
                    }
                })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.getAdminSalary = async (req, res) => {
    if (req.user && !req.error) {
        const limit = Math.min(parseInt(req.query.limit) || 10);
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const firm = req.query.firm;
        const year = req.query.year;
        const search = req.query.search ? req.query.search.toLowerCase() : '';
        const newMonth = req.query.month;

        let filter = { deleted: false };
        if (firm && firm !== 'null' && firm !== 'undefined') filter.firm_id = firm;
        if (year && year !== 'null' && year !== 'undefined') filter.year_id = year;
        if (newMonth && newMonth !== 'null' && newMonth !== 'undefined') {
            filter.month = parseInt(newMonth);
        }

        try {
            let employeeIds = [];

            if (search) {
                const employees = await Employee.find({
                    $or: [
                        { full_name: { $regex: search, $options: 'i' } },
                        { card_no: { $regex: search, $options: 'i' } },
                        { employee_id: { $regex: search, $options: 'i' } }
                    ]
                }).select('_id');

                employeeIds = employees.map(emp => emp._id);

                if (employeeIds.length === 0) {
                    return sendResponse(res, 200, true, {
                        totalSalaries: 0,
                        totalPages: 0,
                        currentPage: page,
                        salaries: []
                    }, "No matching records");
                }

                filter.employee = { $in: employeeIds };
            }

            const salariesQuery = Salary.find(filter, { deleted: 0, __v: 0 })
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate([
                    { path: 'firm_id', select: 'name' },
                    { path: 'year_id', select: 'start_year end_year' },
                    { path: 'bank_name', select: 'name' },
                    { path: 'department', select: 'name' },
                    {
                        path: 'work_day_id',
                        select: 'department ot_hours ot_count',
                        populate: { path: 'department', select: 'name' }
                    },
                    {
                        path: 'employee',
                        select: 'full_name employee_id adhar_no designation card_no',
                        populate: { path: 'designation', select: 'name' }
                    }
                ])
                .lean();
            const totalSalaries = await Salary.countDocuments(filter);

            const salaries = await salariesQuery.exec();

            const totalPages = Math.ceil(totalSalaries / limit);

            const response = {
                totalSalaries,
                totalPages,
                currentPage: page,
                salaries
            };

            sendResponse(res, 200, true, response, "Salary list");
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong: " + error.message);
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.getAllSalary = async (req, res) => {
    if (req.user && !req.error) {
        try {
            const data = await Salary.find({ deleted: false }, { department: 1, employee: 1 })
                .populate('department', 'name')
                .sort({ createdAt: -1 })
                .lean()
            if (data) {
                sendResponse(res, 200, true, data, "Salary list")
            } else {
                sendResponse(res, 400, false, {}, "Salary not found")
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.manageSalary = async (req, res) => {
    const {
        employee,
        salary_type,
        working_day,
        working_hour,
        perday_salary,
        total_salary,
        basic,
        hra,
        conveyance_allowance,
        medical_allowance,
        washing,
        other,
        month,
        firm_id,
        year_id,
        department,
        work_day_id,
        bank_name,
        bank_branch_name,
        bank_account_no,
        bank_account_ifsc,
        is_pf,
        is_esi,
        is_pt,
        tds,
        is_stop_salary,
        remark,
        ot_hourly_salary,
        perhour_ot_salary,
        status,
        is_bonus,
        id
    } = req.body

    if (req.user) {
        if (
            firm_id &&
            year_id &&
            employee &&
            salary_type &&
            working_day &&
            working_hour &&
            perday_salary &&
            total_salary &&
            month &&
            department &&
            bank_name &&
            bank_branch_name &&
            bank_account_no &&
            bank_account_ifsc
        ) {
            const firmData = await Firm.findById(firm_id);
            const yearData = await Year.findById(year_id);

            const employeeData = await Employee.findById(employee);
            const bankData = await Bank.findById(bank_name);
            const departmentData = await Department.findById(department);
            const workDayData = await WorkDay.findById(work_day_id);

            const startYear = new Date(yearData.start_year).getFullYear();
            const endYear = new Date(yearData.end_year).getFullYear();
            // Year calculation
            let monthYear;
            if (month >= 4 && month <= 12) {
                monthYear = startYear;
            }
            else if (month >= 1 && month <= 3) {
                monthYear = endYear;
            }
            
            /// 
            const existingSalary = await Salary.findOne({ employee, month, e_year: monthYear, deleted: false  });
            console.log(existingSalary , "Something")

            if (!firmData) {
                sendResponse(res, 404, false, {}, "Firm not found");
                return
            }
            if (!yearData) {
                sendResponse(res, 404, false, {}, "Year not found");
                return
            }

            if (!id) {
                if (existingSalary) {
                    sendResponse(res, 400, false, {}, "Salary entry for this employee in the specified month already exists");
                    return;
                }
            }
            if (!employeeData) {
                sendResponse(res, 404, false, {}, "Employee not found");
                return;
            }
            if (!bankData) {
                sendResponse(res, 404, false, {}, "Bank not found");
                return;
            }
            if (!departmentData) {
                sendResponse(res, 404, false, {}, "Department not found");
                return;
            }
            if (!workDayData) {
                sendResponse(res, 404, false, {}, "Working day not found");
                return;
            }

           

            const salary = new Salary({
                employee: employee,
                salary_type: salary_type,
                work_day_id: work_day_id,
                working_day: working_day,
                working_hour: working_hour,
                perday_salary: perday_salary,
                total_salary: total_salary,
                basic: basic == '' ? 0 : basic,
                hra: hra == '' ? 0 : hra,
                conveyance_allowance: conveyance_allowance == '' ? 0 : conveyance_allowance,
                medical_allowance: medical_allowance == '' ? 0 : medical_allowance,
                washing: washing == '' ? 0 : washing,
                other: other == '' ? 0 : other,
                month: month,
                e_year: monthYear,
                e_day: 1,
                firm_id: firm_id,
                year_id: year_id,
                department: department,
                work_day_id: work_day_id,
                bank_name: bank_name,
                bank_branch_name: bank_branch_name,
                bank_account_no: bank_account_no,
                bank_account_ifsc: bank_account_ifsc,
                is_pf: is_pf,
                is_esi: is_esi,
                is_pt: is_pt,
                is_bonus: is_bonus,
                tds: tds,
                is_stop_salary: is_stop_salary,
                remark: remark,
                ot_hourly_salary: ot_hourly_salary,
                perhour_ot_salary: perhour_ot_salary,
            });

            if (!id) {
                try {
                    await salary.save(salary).then(data => {
                        sendResponse(res, 200, true, {}, "Salary added successfully");
                    })
                } catch (error) {
                    sendResponse(res, 500, false, {}, "Something went wrong" + error);
                }
            } else {

                const existSalary = await Salary.findOne({ employee, month, _id: { $ne: id } });
                console.log(existSalary);
                // if (existSalary) {
                //     sendResponse(res, 400, false, {}, "Salary entry for this employee in the specified month already exists");
                //     return;
                // }

                await Salary.findByIdAndUpdate(id, {
                    employee: employee,
                    salary_type: salary_type,
                    work_day_id: work_day_id,
                    working_day: working_day,
                    working_hour: working_hour,
                    perday_salary: perday_salary,
                    total_salary: total_salary,
                    basic: basic == '' ? 0 : basic,
                    hra: hra == '' ? 0 : hra,
                    conveyance_allowance: conveyance_allowance == '' ? 0 : conveyance_allowance,
                    medical_allowance: medical_allowance == '' ? 0 : medical_allowance,
                    washing: washing == '' ? 0 : washing,
                    other: other == '' ? 0 : other,
                    month: month,
                    e_year: monthYear,
                    e_day: 1,
                    firm_id: firm_id,
                    year_id: year_id,
                    department: department,
                    work_day_id: work_day_id,
                    bank_name: bank_name,
                    bank_branch_name: bank_branch_name,
                    bank_account_no: bank_account_no,
                    bank_account_ifsc: bank_account_ifsc,
                    is_pf: is_pf,
                    is_esi: is_esi,
                    is_pt: is_pt,
                    is_bonus: is_bonus,
                    tds: tds,
                    is_stop_salary: is_stop_salary,
                    remark: remark,
                    ot_hourly_salary: ot_hourly_salary,
                    perhour_ot_salary: perhour_ot_salary,
                    status: status,
                }).then(data => {
                    if (data) {
                        sendResponse(res, 200, true, {}, "Salary updated successfully")
                    } else {
                        sendResponse(res, 404, false, {}, "Salary not found")
                    }
                });
            }
        } else {
            sendResponse(res, 400, false, {}, "Missing parameters");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.manageBankDetail = async (req, res) => {
    const {
        employee,
        firm_id,
        year_id,
        department,
        bank_name,
        bank_branch_name,
        bank_account_no,
        bank_account_ifsc,
        id
    } = req.body

    if (req.user) {
        if (
            firm_id &&
            year_id &&
            employee &&
            department &&
            bank_name &&
            bank_branch_name &&
            bank_account_no &&
            bank_account_ifsc
        ) {
            const firmData = await Firm.findById(firm_id);
            const yearData = await Year.findById(year_id);

            const employeeData = await Employee.findById(employee);
            const bankData = await Bank.findById(bank_name);
            const departmentData = await Department.findById(department);
    
           

            if (!firmData) {
                sendResponse(res, 404, false, {}, "Firm not found");
                return
            }
            if (!yearData) {
                sendResponse(res, 404, false, {}, "Year not found");
                return
            }

            if (!id) {
              
            }
            if (!employeeData) {
                sendResponse(res, 404, false, {}, "Employee not found");
                return;
            }
            if (!bankData) {
                sendResponse(res, 404, false, {}, "Bank not found");
                return;
            }
            if (!departmentData) {
                sendResponse(res, 404, false, {}, "Department not found");
                return;
            }
    

           

            const salary = new Salary({
                employee: employee,
               
                firm_id: firm_id,
                year_id: year_id,
                department: department,
                bank_name: bank_name,
                bank_branch_name: bank_branch_name,
                bank_account_no: bank_account_no,
                bank_account_ifsc: bank_account_ifsc,
               
            });

            if (!id) {
                try {
                    await salary.save(salary).then(data => {
                        sendResponse(res, 200, true, {}, "Salary added successfully");
                    })
                } catch (error) {
                    sendResponse(res, 500, false, {}, "Something went wrong" + error);
                }
            } else {

                // const existSalary = await Salary.findOne({ employee, month, _id: { $ne: id } });
                // console.log(existSalary);
                // if (existSalary) {
                //     sendResponse(res, 400, false, {}, "Salary entry for this employee in the specified month already exists");
                //     return;
                // }

                await Salary.findByIdAndUpdate(id, {
                    employee: employee,
                    firm_id: firm_id,
                    year_id: year_id,
                    department: department,
                    bank_name: bank_name,
                    bank_branch_name: bank_branch_name,
                    bank_account_no: bank_account_no,
                    bank_account_ifsc: bank_account_ifsc,
                
                }).then(data => {
                    if (data) {
                        sendResponse(res, 200, true, {}, "Salary updated successfully")
                    } else {
                        sendResponse(res, 404, false, {}, "Salary not found")
                    }
                });
            }
        } else {
            sendResponse(res, 400, false, {}, "Missing parameters");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}


exports.employeeSalary = async (req, res) => {
    const { employee, firm_id, date, month, year_id } = req.body
    if (req.user && !req.error) {
        if (firm_id && employee) {

            let findmonth;
            if (date) {
                let dateString = date;
                let full_date = new Date(dateString);
                let salary_month = full_date.getMonth() + 1;
                findmonth = salary_month;
            } else {
                findmonth = month;
            }

            const currentDate = new Date();
            const fiscalYear = currentDate.getMonth() >= 3 ? currentDate.getFullYear() : currentDate.getFullYear() - 1;

            const startYear = fiscalYear;
            const endYear = fiscalYear + 1;

            const YearData = await Year.find({
                $expr: {
                    $and: [
                        { $gte: [{ $year: "$start_year" }, startYear] }, // Start year >= 2023
                        { $lte: [{ $year: "$end_year" }, endYear] } // End year <= 2024
                    ]
                }
            }).lean();

            if (YearData.length !== 0) {

                // let year_id = YearData[0]._id;

                const salaryData = await Salary.find({ firm_id, year_id, employee, month: findmonth })
                    .populate('department', 'name')
                    .sort({ createdAt: -1 })
                    .lean();

                if (salaryData?.length > 0) {
                    sendResponse(res, 200, true, salaryData[0], "Salary data found")
                } else {
                    sendResponse(res, 400, false, {}, "Salary not found");
                }
            } else {
                sendResponse(res, 400, false, {}, "Please add the new financial year")
            }

        } else {
            sendResponse(res, 400, false, {}, "Missing parameters");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.MultipleEmployeeSalary = async (req, res) => {
    const { employees, firm_id, date, month, year_id } = req.body;
    if (req.user && !req.error) {
        if (firm_id && employees && employees.length > 0) {

            let findmonth;
            if (date) {
                let dateString = date;
                let full_date = new Date(dateString);
                let salary_month = full_date.getMonth() + 1;
                findmonth = salary_month;
            } else {
                findmonth = month;
            }

            let emplpoyeeIds = [...employees];
            if (typeof employees === 'string') {
                emplpoyeeIds = JSON.parse(employees);
            }

            if (emplpoyeeIds.length > 0) {
                emplpoyeeIds = emplpoyeeIds.map(e => e.id);
                let salaryData = await Salary.find({ firm_id, year_id, employee: { $in: emplpoyeeIds }, month: findmonth }, { employee: 1, _id: 0 })
                    .sort({ createdAt: -1 })
                    .lean();

                if (salaryData.length > 0) {
                    sendResponse(res, 200, true, salaryData.map(o => { return { id: o.employee } }), 'Salary data found');
                } else

                    sendResponse(res, 400, false, {}, "Salary not found")

            }
        } else {
            sendResponse(res, 400, false, {}, "Missing parameters");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.deleteSalary = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {

            const salaryData = await Salary.findOne({ _id: id, deleted: false });
            const inMonth = await MonthlyAttendance.findOne({ employee: salaryData.employee, month: salaryData?.month, deleted: false });
            const inDaily = await DailyAttendance.findOne({ employee: salaryData.employee, month: salaryData?.month, deleted: false });
            if (inMonth) {
                sendResponse(res, 400, false, {}, "Cannot delete salary. Employee is currently in the month of attendance");
                return;
            }
            if (inDaily) {
                sendResponse(res, 400, false, {}, "Cannot delete salary. Employee is currently in the daily attendance");
                return;
            }

            await Salary.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Salary deleted successfully")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.updateSalary = async (req, res) => {
    const salaryDetails = await Salary.find({ month: 9, working_day: 25, total_salary: { $gt: 2 }, deleted: false });
    console.log(salaryDetails.length);

    for (let emp of salaryDetails) {
        let ps = parseFloat((emp.total_salary / emp.working_day).toFixed(2));

        await Salary.findByIdAndUpdate(emp._id, {
            perday_salary: ps,
            excel_net_salary: 0,
            perhour_ot_salary: parseFloat(ps / emp.working_hour).toFixed(2),
        }).then(() => {
            console.log("Salary updated successfully");
        }).catch((error) => {
            console.log("Salary not updated", error);
        })
    }
    return res.json("Update done")
}

exports.ptReportDownload = async (req, res) => {
    const { month, year_id, firm_id } = req.query;

    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
    if (!month || !year_id || !firm_id) {
        sendResponse(res, 400, false, {}, "Missing parameters");
        return;
    }

    try {
        const salaryData = await Salary.find({ month: parseInt(month), year_id, firm_id, is_pt: true, deleted: false })
            .populate('employee', 'full_name card_no');

        if (salaryData.length === 0) {
            return sendResponse(res, 404, false, {}, "Salary data not found");
        }
        const findDailyAttendance = await DailyAttendance.find({ month: parseInt(month), year_id, deleted: false });
        const findMonthlyAttendance = await MonthlyAttendance.find({ month: parseInt(month), year_id, deleted: false });

        let attendanceData = [];

        if (findDailyAttendance.length > 0) {
            attendanceData = findDailyAttendance.map(att => {
                let daysWorked = 0;
                if (att.sum_Apchar === 'P') daysWorked = 1;

                return {
                    employeeId: att.employee,
                    daysWorked,
                    overtimeHours: att.ot_hour,
                    remarks: att.remark,
                };
            });

            attendanceData = attendanceData.reduce((acc, curr) => {
                const existingEmployee = acc.find(item => item.employeeId.toString() === curr.employeeId.toString());
                if (existingEmployee) {
                    existingEmployee.daysWorked += curr.daysWorked;
                    existingEmployee.overtimeHours += curr.overtimeHours;
                    existingEmployee.remarks += ` ${curr.remarks}`;
                } else {
                    acc.push(curr);
                }
                return acc;
            }, []);
        } else if (findMonthlyAttendance.length > 0) {
            attendanceData = findMonthlyAttendance.map(att => ({
                employeeId: att.employee,
                daysWorked: att.present_day,
                overtimeHours: att.ot_hour,
                remarks: att.remark,
            }));
        }

        const finalReport = salaryData.map(salary => {
            const attendance = attendanceData.find(
                att => att.employeeId.toString() === salary.employee._id.toString()
            ) || {};

            return {
                employeeName: salary.employee?.full_name || "N/A",
                card_no: salary.card_no,
                daysWorked: attendance.daysWorked || 0,
                grossSalary: parseInt(salary.perday_salary) * parseInt(attendance.daysWorked),
                ptAmount: salary.is_pt ? 200 : 0,
                // remarks: attendance.remarks || "",
            };
        }).filter(report =>
            report.daysWorked > 0 ||
            report.grossSalary > 0
        );
        sendResponse(res, 200, true, finalReport, 'Salary Data')
    } catch (error) {
        sendResponse(res, 500, false, {}, "Something went wrong");
    }
}

const getPTreport = async (month, year_id, firm_id, employee) => {
    try {
        const filter = JSON.parse(month)
        // const filter = month

        const matchQuery = {
            deleted: false,
            firm_id: new ObjectId(firm_id),
            year_id: new ObjectId(year_id),
            month: filter,
        };

        if (employee) {
            matchQuery.employee = new ObjectId(employee);
        }

        const requestData = await Salary.aggregate([
            {
                $match: matchQuery,
            },
            {
                $lookup: {
                    from: "employees",
                    localField: "employee",
                    foreignField: "_id",
                    as: "employeeDetails",
                    pipeline: [
                        {
                            $lookup: {
                                from: "designations",
                                localField: "designation",
                                foreignField: "_id",
                                as: "designationDetails",
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: "banks",
                    localField: "bank_name",
                    foreignField: "_id",
                    as: "bankDetails",
                },
            },
            {
                $lookup: {
                    from: "firms",
                    localField: "firm_id",
                    foreignField: "_id",
                    as: "firmDetails",
                },
            },
            {
                $lookup: {
                    from: "departments",
                    localField: "department",
                    foreignField: "_id",
                    as: "departmentDetails",
                },
            },
            {
                $lookup: {
                    from: 'daily-attendances',
                    let: { empId: "$employee", firmId: "$firm_id", yearId: "$year_id", month: "$month" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee", "$$empId"] },
                                        { $eq: ["$firm_id", "$$firmId"] },
                                        { $eq: ["$year_id", "$$yearId"] },
                                        { $eq: ["$month", "$$month"] },
                                        { $eq: ["$deleted", false] }
                                    ]
                                }
                            }
                        },
                        {
                            $group: {
                                _id: "$employee",
                                work_day: { $sum: "$present_day" },
                                ot_hour: { $sum: "$ot_hour" }
                            }
                        }
                    ],
                    as: "dailyAttendance"
                }
            },
            {
                $lookup: {
                    from: 'monthly-attendances',
                    let: { empId: "$employee", firmId: "$firm_id", yearId: "$year_id", month: "$month" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee", "$$empId"] },
                                        { $eq: ["$firm_id", "$$firmId"] },
                                        { $eq: ["$year_id", "$$yearId"] },
                                        { $eq: ["$month", "$$month"] },
                                        { $eq: ["$deleted", false] }
                                    ]
                                }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                work_day: "$present_day",
                                ot_hour: "$ot_hour"
                            }
                        }
                    ],
                    as: "monthlyAttendance"
                }
            },
            {
                $lookup: {
                    from: "earnings",
                    let: { empId: "$employee", firmId: "$firm_id", yearId: "$year_id", month: "$month" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee", "$$empId"] },
                                        { $eq: ["$firm_id", "$$firmId"] },
                                        { $eq: ["$year_id", "$$yearId"] },
                                        { $eq: ["$month", "$$month"] },
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
                $lookup: {
                    from: "deductions",
                    let: { empId: "$employee", firmId: "$firm_id", yearId: "$year_id", month: "$month" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee", "$$empId"] },
                                        { $eq: ["$firm_id", "$$firmId"] },
                                        { $eq: ["$year_id", "$$yearId"] },
                                        { $eq: ["$month", "$$month"] },
                                        { $eq: ["$deleted", false] }
                                    ]
                                }
                            }
                        },
                        {
                            $group: {
                                _id: "$employee",
                                Mess: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Mess"] }, then: "$amount", else: 0 }
                                    }
                                },
                                Loan: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Loan"] }, then: "$amount", else: 0 }
                                    }
                                },
                                Advanced: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Advance"] }, then: "$amount", else: 0 }
                                    }
                                },
                                Penalty: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Penalty"] }, then: "$amount", else: 0 }
                                    }
                                },
                                Other: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Other"] }, then: "$amount", else: 0 }
                                    }
                                }
                            }
                        }
                    ],
                    as: "deductionsDetails"
                }
            },
            {
                $addFields: {
                    employeeDetails: { $arrayElemAt: ["$employeeDetails", 0] },
                    bankDetails: { $arrayElemAt: ["$bankDetails", 0] },
                    firmDetails: { $arrayElemAt: ["$firmDetails", 0] },
                    departmentDetails: { $arrayElemAt: ["$departmentDetails", 0] },
                    total_earnings: { $sum: "$earningsDetails.amount" },
                    work_day: {
                        $ifNull: [
                            { $arrayElemAt: ["$dailyAttendance.work_day", 0] },
                            { $arrayElemAt: ["$monthlyAttendance.work_day", 0] }
                        ]
                    },
                    ot_hour: {
                        $ifNull: [
                            { $arrayElemAt: ["$dailyAttendance.ot_hour", 0] },
                            { $arrayElemAt: ["$monthlyAttendance.ot_hour", 0] }
                        ]
                    },
                    deductionsDetails: { $arrayElemAt: ["$deductionsDetails", 0] },
                    perday_salary: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$basic",
                            else: { $divide: ["$basic", "$working_day"] }
                        }
                    },
                    perday_hra: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$hra",
                            else: { $divide: ["$hra", "$working_day"] }
                        }
                    },
                    perday_conveyance_allowance: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$conveyance_allowance",
                            else: { $divide: ["$conveyance_allowance", "$working_day"] }
                        }
                    },
                    perday_medical_allowance: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$medical_allowance",
                            else: { $divide: ["$medical_allowance", "$working_day"] }
                        }
                    },
                    perday_washing: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$washing",
                            else: { $divide: ["$washing", "$working_day"] }
                        }
                    },
                    perday_others: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$other",
                            else: { $divide: ["$other", "$working_day"] }
                        }
                    },
                }
            },
            {
                $addFields: {
                    basic: { $multiply: ["$work_day", "$perday_salary"] },
                    ot_value: { $multiply: ["$ot_hour", "$perhour_ot_salary"] },
                    hra: { $multiply: ["$work_day", "$perday_hra"] },
                    conveyance_allowance: { $multiply: ["$work_day", "$perday_conveyance_allowance"] },
                    medical_allowance: { $multiply: ["$work_day", "$perday_medical_allowance"] },
                    washing: { $multiply: ["$work_day", "$perday_washing"] },
                    others: { $multiply: ["$work_day", "$perday_others"] },
                    ot_day: { $divide: ["$ot_hour", "$working_hour"] },
                    designationDetails: {
                        $arrayElemAt: ["$employeeDetails.designationDetails", 0],
                    },
                    Mess: { $ifNull: ["$deductionsDetails.Mess", 0] },
                    Loan: { $ifNull: ["$deductionsDetails.Loan", 0] },
                    Advanced: { $ifNull: ["$deductionsDetails.Advanced", 0] },
                    Penalty: { $ifNull: ["$deductionsDetails.Penalty", 0] },
                    Other: { $ifNull: ["$deductionsDetails.Other", 0] },
                    firmAddress: {
                        $reduce: {
                            input: [
                                "$firmDetails.address",
                                "$firmDetails.address_two",
                                "$firmDetails.address_three",
                                "$firmDetails.city",
                                "$firmDetails.state",
                                { $toString: "$firmDetails.pincode" }
                            ],
                            initialValue: "",
                            in: {
                                $concat: [
                                    "$$value",
                                    { $cond: { if: { $eq: ["$$value", ""] }, then: "", else: ", " } },
                                    "$$this"
                                ]
                            }
                        }
                    }
                }
            },
            {
                $match: {
                    $and: [
                        { work_day: { $gt: 0 } },
                        { total_salary: { $gt: 0 } }
                    ]
                }
            },
            {
                $addFields: {
                    pfAmount: {
                        $cond: {
                            if: { $eq: ["$is_pf", true] },
                            then: { $multiply: ["$basic", 0.12] },
                            else: 0
                        }
                    },
                    bonusAmount: {
                        $cond: {
                            if: { $eq: ["$is_bonus", true] },
                            then: { $multiply: ["$basic", 0.0833] },
                            else: 0
                        }
                    }
                }
            },
            {
                $addFields: {
                    gross_wages: { $add: ["$basic", "$hra", "$conveyance_allowance", "$medical_allowance", "$washing", "$others", "$ot_value", "$total_earnings", "$bonusAmount"] },
                }
            },
            {
                $addFields: {
                    ptAmount: {
                        $cond: {
                            if: { $and: ["$is_pt", { $gt: ["$gross_wages", 12000] }] },
                            then: 200,
                            else: 0
                        }
                    }
                }
            },
            {
                $addFields: {
                    total_deduction: { $add: ["$Mess", "$Loan", "$Advanced", "$Penalty", "$Other", "$ptAmount", "$pfAmount"] },
                }
            },
            {
                $addFields: {
                    net_salary: { $subtract: ["$gross_wages", "$total_deduction"] }
                }
            },
            {
                $project: {
                    firmName: "$firmDetails.name",
                    firmAddress: 1,
                    uan_no: "$employeeDetails.uan_no",
                    pf_no: "$employeeDetails.pf_no",
                    employeeId: "$employeeDetails._id",
                    employeeName: "$employeeDetails.full_name",
                    card_no: "$employeeDetails.card_no",
                    fatherName: "$employeeDetails.middle_name",
                    designation: "$designationDetails.name",
                    department: "$departmentDetails.name",
                    dob: "$employeeDetails.dob",
                    joining_date: "$employeeDetails.joining_date",
                    perday_salary: 1,
                    work_day: 1,
                    basic: 1,
                    gross_wages: 1,
                    pfAmount: 1,
                    ptAmount: 1,
                    married_status: "$employeeDetails.married_status",
                    aadhar_card: "$employeeDetails.adhar_no",
                    mobile_number: "$employeeDetails.mobile_number",
                    bank_name: "$bankDetails.name",
                    bank_account_no: 1,
                    bank_account_ifsc: 1,
                    hra: 1,
                    bonusAmount: 1,
                    month: 1,
                    e_year: 1,
                }
            },
            {
                $sort: { "department": 1, "gross_wages": 1 }
            },
            {
                $group: {
                    _id: "$firmName",
                    items: { $push: "$$ROOT" },
                    firmName: { $first: "$firmName" },
                    firmAddress: { $first: "$firmAddress" },
                    month: { $first: "$month" },
                    e_year: { $first: "$e_year" },
                    t_work_day: { $sum: "$work_day" },
                    t_basic: { $sum: "$basic" },
                    t_gross_wages: { $sum: "$gross_wages" },
                    t_pfAmount: { $sum: "$pfAmount" },
                    t_ptAmount: { $sum: "$ptAmount" },
                }
            }
        ]);

        if (requestData.length && requestData.length > 0) {
            return { status: 1, result: requestData };
        } else {
            return { status: 0, result: [] };
        }
    } catch (error) {
        return { status: 2, result: error };
    }
};

exports.listPTreport = async (req, res) => {
    const { month, year_id, firm_id, employee } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getPTreport(month, year_id, firm_id, employee)
            let requestData = data.result;

            if (data.status === 1) {
                sendResponse(res, 200, true, requestData, "PT report data found");
            }
            else if (data.status === 0) {
                sendResponse(res, 200, false, [], `PT report data not found`)
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

exports.downloadPTreport = async (req, res) => {
    const { month, year_id, firm_id, employee } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getPTreport(month, year_id, firm_id, employee)
            let requestData = data.result[0];

            if (data.status === 1) {
                const template = fs.readFileSync(
                    "templates/PTReport.html",
                    "utf-8"
                );

                const year = await Year.findOne({ _id: year_id });
                const selectedYear = parseInt(month) < 4
                    ? new Date(year.end_year).getFullYear()
                    : new Date(year.start_year).getFullYear();

                const monthWord = await getMonthName(month);

                const headerInfo = {
                    month: monthWord,
                    year: selectedYear,
                    totalSalarySum: requestData.t_gross_wages,
                    totalPtAmountSum: requestData.t_ptAmount,
                    totalWorkDaySum: requestData.t_work_day
                }
                const renderedHtml = ejs.render(template, {
                    headerInfo,
                    items: requestData.items,
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

                const pdfBuffer = await generatePDFA4(page, { print_date: true });

                await browser.close();

                const pdfsDir = path.join(__dirname, "../../pdfs");
                if (!fs.existsSync(pdfsDir)) {
                    fs.mkdirSync(pdfsDir);
                }

                const filename = `pt_report_${Date.now()}.pdf`;
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
                sendResponse(res, 200, false, {}, `PT report data not found`)
            }
            else if (data.status === 2) {
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

exports.xlsxPTreport = async (req, res) => {
    const { month, year_id, firm_id, print_date } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getPTreport(month, year_id, firm_id)
            let requestData = data.result[0];

            if (data.status === 1) {

                const wb = XLSX.utils.book_new();
                let ws

                const headerStyle = {
                    font: { bold: true }, fill: { fgColor: { rgb: "fdc686" } }, alignment: { horizontal: 'center', vertical: 'middle' }
                };

                const headerStyle3 = {
                    font: { size: 35, bold: true }, fill: { fgColor: { rgb: 'fdc686' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
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
                            v: `${requestData.firmName}\n${requestData.firmAddress}`, s: headerStyle3
                        }
                    ],
                    [],
                    [
                        { v: `PT REPORT`, s: headerStyle4 },
                        "", "", "",
                        { v: `${requestData.month + "/" + requestData.e_year}`, s: headerStyle4 },
                        print_date ? { v: `Date : ${new Date().toLocaleDateString()}`, s: headerStyle4 } : "",
                    ],
                ];

                const headers = [
                    { v: "Sr No.", s: headerStyle },
                    { v: "Employee Name", s: headerStyle },
                    { v: "Card No.", s: headerStyle },
                    { v: "Department", s: headerStyle },
                    { v: "Working Days", s: headerStyle },
                    { v: "Gross Salary", s: headerStyle },
                    { v: "PT Amount", s: headerStyle },
                ];

                ws_data.push(headers);

                requestData.items.forEach((detail, itemIndex) => {
                    const row = [
                        itemIndex + 1,
                        detail.employeeName || '--',
                        detail.card_no || '--',
                        detail.department || '--',
                        detail.work_day || '--',
                        (detail.gross_wages || 0).toFixed(2),
                        (detail.ptAmount || 0).toFixed(2),
                    ];
                    ws_data.push(row);
                });
                ws_data.push([]);
                ws_data.push([
                    { v: `Total`, s: headerStyle4 },
                    "",
                    "",
                    "",
                    { v: `${requestData.t_work_day}`, s: headerStyle2 },
                    { v: `${(requestData.t_gross_wages).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.t_ptAmount).toFixed(2)}`, s: headerStyle2 },
                ]);

                const maxCols = Math.max(...ws_data.map(row => row.length));

                const colWidths = Array.from({ length: maxCols }, (_, colIndex) => {
                    return {
                        wch: ws_data[3]?.[colIndex]?.v?.toString().length + 10 || 0
                    };
                });

                ws = XLSX.utils.aoa_to_sheet(ws_data);
                ws['!cols'] = colWidths;

                ws['!merges'] = [
                    { s: { r: 0, c: 0 }, e: { r: 1, c: 6 } },
                    { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
                    { s: { r: 2, c: 5 }, e: { r: 2, c: 6 } },
                    { s: { r: ws_data.length - 1, c: 0 }, e: { r: ws_data.length - 1, c: 3 } },
                ];

                XLSX.utils.book_append_sheet(wb, ws, `PT report`);

                const xlsxPath = path.join(__dirname, '../../xlsx');

                if (!fs.existsSync(xlsxPath)) {
                    fs.mkdirSync(xlsxPath, { recursive: true });
                }

                const filename = `PT_report_${Date.now()}.xlsx`;
                const filePath = path.join(xlsxPath, filename);

                await XLSXStyle.writeFile(wb, filePath);

                const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
                const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;

                sendResponse(res, 200, true, { file: fileUrl }, `XLSX file generated successfully`)
            }
            else if (data.status === 0) {
                sendResponse(res, 200, false, {}, `PT report not found`)
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

const getNsalaryReport = async (firm_id, year_id, employee, month) => {
    try {
        const filter = JSON.parse(month)
        // const filter = month

        const matchQuery = {
            deleted: false,
            firm_id: new ObjectId(firm_id),
            year_id: new ObjectId(year_id),
            month: { $in: filter }
        };

        if (employee) {
            matchQuery.employee = new ObjectId(employee);
        }

        const requestData = await Salary.aggregate([
            {
                $match: matchQuery,
            },
            {
                $lookup: {
                    from: "employees",
                    localField: "employee",
                    foreignField: "_id",
                    as: "employeeDetails",
                    pipeline: [
                        {
                            $lookup: {
                                from: "designations",
                                localField: "designation",
                                foreignField: "_id",
                                as: "designationDetails",
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: "banks",
                    localField: "bank_name",
                    foreignField: "_id",
                    as: "bankDetails",
                },
            },
            {
                $lookup: {
                    from: "firms",
                    localField: "firm_id",
                    foreignField: "_id",
                    as: "firmDetails",
                },
            },
            {
                $lookup: {
                    from: 'daily-attendances',
                    let: { empId: "$employee", firmId: "$firm_id", yearId: "$year_id", month: "$month" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee", "$$empId"] },
                                        { $eq: ["$firm_id", "$$firmId"] },
                                        { $eq: ["$year_id", "$$yearId"] },
                                        { $eq: ["$month", "$$month"] },
                                        { $eq: ["$deleted", false] }
                                    ]
                                }
                            }
                        },
                        {
                            $group: {
                                _id: "$employee",
                                work_day: { $sum: "$present_day" },
                                ot_hour: { $sum: "$ot_hour" }
                            }
                        }
                    ],
                    as: "dailyAttendance"
                }
            },
            {
                $lookup: {
                    from: 'monthly-attendances',
                    let: { empId: "$employee", firmId: "$firm_id", yearId: "$year_id", month: "$month" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee", "$$empId"] },
                                        { $eq: ["$firm_id", "$$firmId"] },
                                        { $eq: ["$year_id", "$$yearId"] },
                                        { $eq: ["$month", "$$month"] },
                                        { $eq: ["$deleted", false] }
                                    ]
                                }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                work_day: "$present_day",
                                ot_hour: "$ot_hour"
                            }
                        }
                    ],
                    as: "monthlyAttendance"
                }
            },
            {
                $lookup: {
                    from: "earnings",
                    let: { empId: "$employee", firmId: "$firm_id", yearId: "$year_id", month: "$month" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee", "$$empId"] },
                                        { $eq: ["$firm_id", "$$firmId"] },
                                        { $eq: ["$year_id", "$$yearId"] },
                                        { $eq: ["$month", "$$month"] },
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
                $lookup: {
                    from: "deductions",
                    let: { empId: "$employee", firmId: "$firm_id", yearId: "$year_id", month: "$month" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee", "$$empId"] },
                                        { $eq: ["$firm_id", "$$firmId"] },
                                        { $eq: ["$year_id", "$$yearId"] },
                                        { $eq: ["$month", "$$month"] },
                                        { $eq: ["$deleted", false] }
                                    ]
                                }
                            }
                        },
                        {
                            $group: {
                                _id: "$employee",
                                Mess: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Mess"] }, then: "$amount", else: 0 }
                                    }
                                },
                                Loan: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Loan"] }, then: "$amount", else: 0 }
                                    }
                                },
                                Advanced: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Advance"] }, then: "$amount", else: 0 }
                                    }
                                },
                                Penalty: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Penalty"] }, then: "$amount", else: 0 }
                                    }
                                },
                                Other: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Other"] }, then: "$amount", else: 0 }
                                    }
                                }
                            }
                        }
                    ],
                    as: "deductionsDetails"
                }
            },
            {
                $addFields: {
                    employeeDetails: { $arrayElemAt: ["$employeeDetails", 0] },
                    bankDetails: { $arrayElemAt: ["$bankDetails", 0] },
                    firmDetails: { $arrayElemAt: ["$firmDetails", 0] },
                    total_earnings: { $sum: "$earningsDetails.amount" },
                    work_day: {
                        $ifNull: [
                            { $arrayElemAt: ["$dailyAttendance.work_day", 0] },
                            { $arrayElemAt: ["$monthlyAttendance.work_day", 0] }
                        ]
                    },
                    ot_hour: {
                        $ifNull: [
                            { $arrayElemAt: ["$dailyAttendance.ot_hour", 0] },
                            { $arrayElemAt: ["$monthlyAttendance.ot_hour", 0] }
                        ]
                    },
                    deductionsDetails: { $arrayElemAt: ["$deductionsDetails", 0] },
                    perday_salary: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$basic",
                            else: { $divide: ["$basic", "$working_day"] }
                        }
                    },
                    perday_hra: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$hra",
                            else: { $divide: ["$hra", "$working_day"] }
                        }
                    },
                    perday_conveyance_allowance: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$conveyance_allowance",
                            else: { $divide: ["$conveyance_allowance", "$working_day"] }
                        }
                    },
                    perday_medical_allowance: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$medical_allowance",
                            else: { $divide: ["$medical_allowance", "$working_day"] }
                        }
                    },
                    perday_washing: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$washing",
                            else: { $divide: ["$washing", "$working_day"] }
                        }
                    },
                    perday_others: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$other",
                            else: { $divide: ["$other", "$working_day"] }
                        }
                    },
                }
            },
            {
                $addFields: {
                    basic: { $multiply: ["$work_day", "$perday_salary"] },
                    ot_value: { $multiply: ["$ot_hour", "$perhour_ot_salary"] },
                    hra: { $multiply: ["$work_day", "$perday_hra"] },
                    conveyance_allowance: { $multiply: ["$work_day", "$perday_conveyance_allowance"] },
                    medical_allowance: { $multiply: ["$work_day", "$perday_medical_allowance"] },
                    washing: { $multiply: ["$work_day", "$perday_washing"] },
                    others: { $multiply: ["$work_day", "$perday_others"] },
                    ot_day: { $divide: ["$ot_hour", "$working_hour"] },
                    designationDetails: {
                        $arrayElemAt: ["$employeeDetails.designationDetails", 0],
                    },
                    Mess: { $ifNull: ["$deductionsDetails.Mess", 0] },
                    Loan: { $ifNull: ["$deductionsDetails.Loan", 0] },
                    Advanced: { $ifNull: ["$deductionsDetails.Advanced", 0] },
                    Penalty: { $ifNull: ["$deductionsDetails.Penalty", 0] },
                    Other: { $ifNull: ["$deductionsDetails.Other", 0] },
                    firmAddress: {
                        $reduce: {
                            input: [
                                "$firmDetails.address",
                                "$firmDetails.address_two",
                                "$firmDetails.address_three",
                                "$firmDetails.city",
                                "$firmDetails.state",
                                { $toString: "$firmDetails.pincode" }
                            ],
                            initialValue: "",
                            in: {
                                $concat: [
                                    "$$value",
                                    { $cond: { if: { $eq: ["$$value", ""] }, then: "", else: ", " } },
                                    "$$this"
                                ]
                            }
                        }
                    }
                }
            },
            {
                $match: {
                    $and: [
                        { work_day: { $gt: 0 } },
                        { total_salary: { $gt: 0 } }
                    ]
                }
            },
            {
                $addFields: {
                    pfAmount: {
                        $cond: {
                            if: { $eq: ["$is_pf", true] },
                            then: { $multiply: ["$basic", 0.12] }, // Directly multiplying basic salary by 12%
                            else: 0
                        }
                    },
                    bonusAmount: {
                        $cond: {
                            if: { $eq: ["$is_bonus", true] },
                            then: { $multiply: ["$basic", 0.0833] },
                            else: 0
                        }
                    }
                }
            },
            {
                $addFields: {
                    gross_wages: { $add: ["$basic", "$hra", "$conveyance_allowance", "$medical_allowance", "$washing", "$others", "$ot_value", "$total_earnings", "$bonusAmount"] },
                }
            },
            {
                $addFields: {
                    ptAmount: {
                        $cond: {
                            if: { $and: ["$is_pt", { $gt: ["$gross_wages", 12000] }] },
                            then: 200,
                            else: 0
                        }
                    }
                }
            },
            {
                $addFields: {
                    total_deduction: { $add: ["$Mess", "$Loan", "$Advanced", "$Penalty", "$Other", "$ptAmount", "$pfAmount"] },
                }
            },
            {
                $addFields: {
                    net_salary: { $subtract: ["$gross_wages", "$total_deduction"] }
                }
            },
            {
                $project: {
                    firmName: "$firmDetails.name",
                    firmAddress: 1,
                    employeeName: "$employeeDetails.full_name",
                    employeeId: "$employeeDetails._id",
                    card_no: "$employeeDetails.card_no",
                    uan_no: "$employeeDetails.uan_no",
                    salary_type: 1,
                    work_day: 1,
                    designation: "$designationDetails.name",
                    basic: 1,
                    hra: 1,
                    conveyance_allowance: 1,
                    medical_allowance: 1,
                    washing: 1,
                    others: 1,
                    ot_value: 1,
                    total_salary: 1,
                    pfAmount: 1,
                    total_earnings: 1,
                    bonusAmount: 1,
                    ptAmount: 1,
                    Mess: 1,
                    Loan: 1,
                    Advanced: 1,
                    Penalty: 1,
                    Other: 1,
                    gross_wages: 1,
                    total_deduction: 1,
                    net_salary: 1,
                    bank_name: "$bankDetails.name",
                    bank_account_no: 1,
                    bank_account_ifsc: 1,
                    month: 1,
                    e_year: 1,
                }
            },
        ]);

        if (requestData.length && requestData.length > 0) {
            return { status: 1, result: requestData };
        } else {
            return { status: 0, result: [] };
        }
    } catch (error) {
        console.log(error);
        return { status: 2, result: error };
    }
};

exports.oneNsalary = async (req, res) => {
    const { firm_id, year_id, employee, month } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getNsalaryReport(firm_id, year_id, employee, month);
            let requestData = data.result;

            if (data.status === 1) {
                sendResponse(res, 200, true, requestData, `N salary data list`);
            } else if (data.status === 0) {
                sendResponse(res, 200, true, [], `N salary data not found`);
            } else if (data.status === 2) {
                console.log("error", data.result);
                sendResponse(res, 500, false, {}, "Something went wrong11");
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.downloadOneNsalary = async (req, res) => {
    const { firm_id, year_id, employee, month, print_date } = req.body;

    if (req.user && !req.error) {
        try {
            const data = await getNsalaryReport(firm_id, year_id, employee, month);
            let requestData = data.result;

            if (data.status === 1) {
                const template = fs.readFileSync(
                    "templates/NSalaryReport.html",
                    "utf-8"
                );

                const headerInfo = {
                    firmName: requestData[0].firmName,
                    firmAddress: requestData[0].firmAddress
                }
                const renderedHtml = ejs.render(template, {
                    headerInfo,
                    items: requestData,
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

                const pdfBuffer = await generatePDFA4(page, { print_date: true });

                await browser.close();

                const pdfsDir = path.join(__dirname, "../../pdfs");
                if (!fs.existsSync(pdfsDir)) {
                    fs.mkdirSync(pdfsDir);
                }

                const filename = `n_salary_report_${Date.now()}.pdf`;
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
            } else if (data.status === 0) {
                sendResponse(res, 200, false, {}, `N salary data not found`);
            } else if (data.status === 2) {
                sendResponse(res, 500, false, {}, "Something went wrong");
            }
        } catch (error) {
            console.log("error", error);
            sendResponse(res, 500, false, {}, "Something went wrong1111");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

const getBsalaryReport = async (firm_id, year_id, employee, month) => {
    try {
        const filter = JSON.parse(month)
        // const filter = month

        const matchQuery = {
            deleted: false,
            firm_id: new ObjectId(firm_id),
            year_id: new ObjectId(year_id),
            month: filter
        };

        if (employee) {
            matchQuery.employee = new ObjectId(employee);
        }

        const requestData = await Salary.aggregate([
            {
                $match: matchQuery,
            },
            {
                $lookup: {
                    from: "employees",
                    localField: "employee",
                    foreignField: "_id",
                    as: "employeeDetails",
                    pipeline: [
                        {
                            $lookup: {
                                from: "designations",
                                localField: "designation",
                                foreignField: "_id",
                                as: "designationDetails",
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: "banks",
                    localField: "bank_name",
                    foreignField: "_id",
                    as: "bankDetails",
                },
            },
            {
                $lookup: {
                    from: "firms",
                    localField: "firm_id",
                    foreignField: "_id",
                    as: "firmDetails",
                },
            },
            {
                $lookup: {
                    from: "departments",
                    localField: "department",
                    foreignField: "_id",
                    as: "departmentDetails",
                },
            },
            {
                $lookup: {
                    from: 'daily-attendances',
                    let: { empId: "$employee", firmId: "$firm_id", yearId: "$year_id", month: "$month" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee", "$$empId"] },
                                        { $eq: ["$firm_id", "$$firmId"] },
                                        { $eq: ["$year_id", "$$yearId"] },
                                        { $eq: ["$month", "$$month"] },
                                        { $eq: ["$deleted", false] }
                                    ]
                                }
                            }
                        },
                        {
                            $group: {
                                _id: "$employee",
                                work_day: { $sum: "$present_day" },
                                ot_hour: { $sum: "$ot_hour" }
                            }
                        }
                    ],
                    as: "dailyAttendance"
                }
            },
            {
                $lookup: {
                    from: 'monthly-attendances',
                    let: { empId: "$employee", firmId: "$firm_id", yearId: "$year_id", month: "$month" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee", "$$empId"] },
                                        { $eq: ["$firm_id", "$$firmId"] },
                                        { $eq: ["$year_id", "$$yearId"] },
                                        { $eq: ["$month", "$$month"] },
                                        { $eq: ["$deleted", false] }
                                    ]
                                }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                work_day: "$present_day",
                                ot_hour: "$ot_hour",
                            }
                        }
                    ],
                    as: "monthlyAttendance"
                }
            },
            {
                $lookup: {
                    from: "earnings",
                    let: { empId: "$employee", firmId: "$firm_id", yearId: "$year_id", month: "$month" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee", "$$empId"] },
                                        { $eq: ["$firm_id", "$$firmId"] },
                                        { $eq: ["$year_id", "$$yearId"] },
                                        { $eq: ["$month", "$$month"] },
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
                $lookup: {
                    from: "deductions",
                    let: { empId: "$employee", firmId: "$firm_id", yearId: "$year_id", month: "$month" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee", "$$empId"] },
                                        { $eq: ["$firm_id", "$$firmId"] },
                                        { $eq: ["$year_id", "$$yearId"] },
                                        { $eq: ["$month", "$$month"] },
                                        { $eq: ["$deleted", false] }
                                    ]
                                }
                            }
                        },
                        {
                            $group: {
                                _id: "$employee",
                                Mess: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Mess"] }, then: "$amount", else: 0 }
                                    }
                                },
                                Loan: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Loan"] }, then: "$amount", else: 0 }
                                    }
                                },
                                Advanced: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Advance"] }, then: "$amount", else: 0 }
                                    }
                                },
                                Penalty: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Penalty"] }, then: "$amount", else: 0 }
                                    }
                                },
                                Other: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Other"] }, then: "$amount", else: 0 }
                                    }
                                }
                            }
                        }
                    ],
                    as: "deductionsDetails"
                }
            },
            {
                $addFields: {
                    employeeDetails: { $arrayElemAt: ["$employeeDetails", 0] },
                    bankDetails: { $arrayElemAt: ["$bankDetails", 0] },
                    firmDetails: { $arrayElemAt: ["$firmDetails", 0] },
                    departmentDetails: { $arrayElemAt: ["$departmentDetails", 0] },
                    total_earnings: { $sum: "$earningsDetails.amount" },
                    work_day: {
                        $ifNull: [
                            { $arrayElemAt: ["$dailyAttendance.work_day", 0] },
                            { $arrayElemAt: ["$monthlyAttendance.work_day", 0] }
                        ]
                    },
                    ot_hour: {
                        $ifNull: [
                            { $arrayElemAt: ["$dailyAttendance.ot_hour", 0] },
                            { $arrayElemAt: ["$monthlyAttendance.ot_hour", 0] }
                        ]
                    },
                    deductionsDetails: { $arrayElemAt: ["$deductionsDetails", 0] },
                    perday_salary: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$basic",
                            else: { $divide: ["$basic", "$working_day"] }
                        }
                    },
                    perday_hra: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$hra",
                            else: { $divide: ["$hra", "$working_day"] }
                        }
                    },
                    perday_conveyance_allowance: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$conveyance_allowance",
                            else: { $divide: ["$conveyance_allowance", "$working_day"] }
                        }
                    },
                    perday_medical_allowance: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$medical_allowance",
                            else: { $divide: ["$medical_allowance", "$working_day"] }
                        }
                    },
                    perday_washing: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$washing",
                            else: { $divide: ["$washing", "$working_day"] }
                        }
                    },
                    perday_others: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$other",
                            else: { $divide: ["$other", "$working_day"] }
                        }
                    },
                }
            },
            {
                $addFields: {
                    basic: { $multiply: ["$work_day", "$perday_salary"] },
                    ot_value: { $multiply: ["$ot_hour", "$perhour_ot_salary"] },
                    hra: { $multiply: ["$work_day", "$perday_hra"] },
                    conveyance_allowance: { $multiply: ["$work_day", "$perday_conveyance_allowance"] },
                    medical_allowance: { $multiply: ["$work_day", "$perday_medical_allowance"] },
                    washing: { $multiply: ["$work_day", "$perday_washing"] },
                    others: { $multiply: ["$work_day", "$perday_others"] },
                    ot_day: { $divide: ["$ot_hour", "$working_hour"] },
                    designationDetails: {
                        $arrayElemAt: ["$employeeDetails.designationDetails", 0],
                    },
                    Mess: { $ifNull: ["$deductionsDetails.Mess", 0] },
                    Loan: { $ifNull: ["$deductionsDetails.Loan", 0] },
                    Advanced: { $ifNull: ["$deductionsDetails.Advanced", 0] },
                    Penalty: { $ifNull: ["$deductionsDetails.Penalty", 0] },
                    Other: { $ifNull: ["$deductionsDetails.Other", 0] },
                    firmAddress: {
                        $reduce: {
                            input: [
                                "$firmDetails.address",
                                "$firmDetails.address_two",
                                "$firmDetails.address_three",
                                "$firmDetails.city",
                                "$firmDetails.state",
                                { $toString: "$firmDetails.pincode" }
                            ],
                            initialValue: "",
                            in: {
                                $concat: [
                                    "$$value",
                                    { $cond: { if: { $eq: ["$$value", ""] }, then: "", else: ", " } },
                                    "$$this"
                                ]
                            }
                        }
                    }
                }
            },
            {
                $match: {
                    $and: [
                        { work_day: { $gt: 0 } },
                        { total_salary: { $gt: 0 } }
                    ]
                }
            },
            {
                $addFields: {
                    pfAmount: {
                        $cond: {
                            if: { $eq: ["$is_pf", true] },
                            then: { $multiply: ["$basic", 0.12] },
                            else: 0
                        }
                    },
                    bonusAmount: {
                        $cond: {
                            if: { $eq: ["$is_bonus", true] },
                            then: { $multiply: ["$basic", 0.0833] },
                            else: 0
                        }
                    }
                }
            },
            {
                $addFields: {
                    gross_wages: { $add: ["$basic", "$hra", "$conveyance_allowance", "$medical_allowance", "$washing", "$others", "$ot_value", "$total_earnings", "$bonusAmount"] },
                }
            },
            {
                $addFields: {
                    ptAmount: {
                        $cond: {
                            if: { $and: ["$is_pt", { $gt: ["$gross_wages", 12000] }] },
                            then: 200,
                            else: 0
                        }
                    }
                }
            },
            {
                $addFields: {
                    total_deduction: { $add: ["$Mess", "$Loan", "$Advanced", "$Penalty", "$Other", "$ptAmount", "$pfAmount"] },
                }
            },
            {
                $addFields: {
                    net_salary: { $subtract: ["$gross_wages", "$total_deduction"] }
                }
            },
            {
                $project: {
                    firmName: "$firmDetails.name",
                    firmAddress: 1,
                    employeeName: "$employeeDetails.full_name",
                    employeeId: "$employeeDetails._id",
                    card_no: "$employeeDetails.card_no",
                    uan_no: "$employeeDetails.uan_no",
                    salary_type: 1,
                    work_day: 1,
                    working_day: 1,
                    perday_salary: 1,
                    designation: "$designationDetails.name",
                    department: "$departmentDetails.name",
                    basic: 1,
                    hra: 1,
                    conveyance_allowance: 1,
                    medical_allowance: 1,
                    washing: 1,
                    others: 1,
                    ot_hour: 1,
                    ot_value: 1,
                    ot_day: 1,
                    total_salary: 1,
                    bonusAmount: 1,
                    pfAmount: 1,
                    total_earnings: 1,
                    ptAmount: 1,
                    Mess: 1,
                    Loan: 1,
                    Advanced: 1,
                    Penalty: 1,
                    Other: 1,
                    gross_wages: 1,
                    total_deduction: 1,
                    net_salary: 1,
                    bank_name: "$bankDetails.name",
                    bank_account_no: 1,
                    bank_account_ifsc: 1,
                    month: 1,
                    e_year: 1,
                }
            },
            {
                $sort: { "department": 1, "gross_wages": 1 }
            },
            {
                $group: {
                    _id: "$firmName",
                    items: { $push: "$$ROOT" },
                    firmName: { $first: "$firmName" },
                    firmAddress: { $first: "$firmAddress" },
                    month: { $first: "$month" },
                    e_year: { $first: "$e_year" },
                    t_work_day: { $sum: "$work_day" },
                    t_ot_value: { $sum: "$ot_value" },
                    t_ot_hour: { $sum: "$ot_hour" },
                    t_basic: { $sum: "$basic" },
                    t_hra: { $sum: "$hra" },
                    t_conveyance_allowance: { $sum: "$conveyance_allowance" },
                    t_medical_allowance: { $sum: "$medical_allowance" },
                    t_washing: { $sum: "$washing" },
                    t_others: { $sum: "$others" },
                    t_total_earnings: { $sum: "$total_earnings" },
                    t_bonusAmount: { $sum: "$bonusAmount" },
                    t_gross_wages: { $sum: "$gross_wages" },
                    t_pfAmount: { $sum: "$pfAmount" },
                    t_ptAmount: { $sum: "$ptAmount" },
                    t_Mess: { $sum: "$Mess" },
                    t_Loan: { $sum: "$Loan" },
                    t_Advanced: { $sum: "$Advanced" },
                    t_Penalty: { $sum: "$Penalty" },
                    t_Other: { $sum: "$Other" },
                    t_total_deduction: { $sum: "$total_deduction" },
                    t_net_salary: { $sum: "$net_salary" }
                }
            }
        ]);

        if (requestData.length && requestData.length > 0) {
            return { status: 1, result: requestData };
        } else {
            return { status: 0, result: [] };
        }
    } catch (error) {
        console.log(error);
        return { status: 2, result: error };
    }
};

exports.oneBsalary = async (req, res) => {
    const { firm_id, year_id, employee, month } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getBsalaryReport(firm_id, year_id, employee, month);
            let requestData = data.result;

            if (data.status === 1) {
                sendResponse(res, 200, true, requestData, `B salary data list`);
            } else if (data.status === 0) {
                sendResponse(res, 200, true, [], `B salary data not found`);
            } else if (data.status === 2) {
                console.log("error", data.result);
                sendResponse(res, 500, false, {}, "Something went wrong11");
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.downloadOneBsalary = async (req, res) => {
    const { firm_id, year_id, employee, month, print_date } = req.body;

    if (req.user && !req.error) {
        try {
            const data = await getBsalaryReport(firm_id, year_id, employee, month);
            let requestData = data.result[0];

            if (data.status === 1) {
                const template = fs.readFileSync(
                    "templates/BSalaryReport.html",
                    "utf-8"
                );

                const headerInfo = {
                    firmName: requestData.firmName,
                    firmAddress: requestData.firmAddress,
                    month: requestData.month,
                    t_work_day: requestData.t_work_day,
                    t_ot_value: requestData.t_ot_value,
                    t_ot_hour: requestData.t_ot_hour,
                    t_basic: requestData.t_basic,
                    t_hra: requestData.t_hra,
                    t_conveyance_allowance: requestData.t_conveyance_allowance,
                    t_medical_allowance: requestData.t_medical_allowance,
                    t_washing: requestData.t_washing,
                    t_others: requestData.t_others,
                    t_total_earnings: requestData.t_total_earnings,
                    t_gross_wages: requestData.t_gross_wages,
                    t_pfAmount: requestData.t_pfAmount,
                    t_ptAmount: requestData.t_ptAmount,
                    t_Mess: requestData.t_Mess,
                    t_Loan: requestData.t_Loan,
                    t_Advanced: requestData.t_Advanced,
                    t_Penalty: requestData.t_Penalty,
                    t_Other: requestData.t_Other,
                    t_total_deduction: requestData.t_total_deduction,
                    t_net_salary: requestData.t_net_salary,
                }
                const renderedHtml = ejs.render(template, {
                    headerInfo,
                    items: requestData.items,
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

                const pdfBuffer = await generatePDFLarge(page, { print_date: true });

                await browser.close();

                const pdfsDir = path.join(__dirname, "../../pdfs");
                if (!fs.existsSync(pdfsDir)) {
                    fs.mkdirSync(pdfsDir);
                }

                const filename = `b_salary_report_${Date.now()}.pdf`;
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
            } else if (data.status === 0) {
                sendResponse(res, 200, false, {}, `B salary data not found`);
            } else if (data.status === 2) {
                sendResponse(res, 500, false, {}, "Something went wrong");
            }
        } catch (error) {
            console.log("error", error);
            sendResponse(res, 500, false, {}, "Something went wrong1111");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.xlsxBsalary = async (req, res) => {
    const { firm_id, year_id, employee, month, print_date } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getBsalaryReport(firm_id, year_id, employee, month);
            let requestData = data.result[0];

            if (data.status === 1) {
                const wb = XLSX.utils.book_new();
                let ws

                const headerStyle = {
                    font: { bold: true }, fill: { fgColor: { rgb: "fdc686" } }, alignment: { horizontal: 'center', vertical: 'center' }
                };

                const headerStyle2 = {
                    font: { size: 35, bold: true }, fill: { fgColor: { rgb: 'fdc686' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                };

                const headerStyle3 = {
                    font: { size: 16, bold: true }, alignment: { horizontal: 'center', vertical: 'middle' },
                };

                const headerStyle4 = {
                    font: { bold: true }, alignment: { horizontal: 'center', vertical: 'middle' },
                };

                // *** Do not remove space ***
                const ws_data = [
                    [
                        {
                            v: `${requestData.firmName}\n${requestData.firmAddress}`, s: headerStyle2
                        }
                    ],
                    [],
                    [
                        { v: `FORM B WAGES REGISTER`, s: headerStyle3 },
                        "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
                        { v: `${requestData.month + "/" + requestData.e_year}`, s: headerStyle3 },
                        print_date ? { v: `Print Date : ${new Date().toLocaleDateString()}`, s: headerStyle3 } : "",
                    ],
                    [],
                ];

                const headers = [
                    [
                        { v: "SR NO.", s: headerStyle },
                        { v: "UAN NO.", s: headerStyle },
                        { v: "EMPLOYEE NAME", s: headerStyle },
                        { v: "DESIGNATION", s: headerStyle },
                        { v: "DEPARTMENT", s: headerStyle },
                        { v: "RATE OF WAGES", s: headerStyle },
                        { v: "TOTAL WORKING DAY", s: headerStyle },
                        { v: "PRESENT DAY", s: headerStyle },
                        { v: "O.T. HOUR", s: headerStyle },
                        { v: "PRESENT DAY BASIC", s: headerStyle },
                        { v: "DA", s: headerStyle },
                        { v: "O.T. PAYMENT", s: headerStyle },
                        { v: "SPECIAL BASIC", s: headerStyle },
                        { v: "HRA", s: headerStyle },
                        { v: "CONVEY ALLOW.", s: headerStyle },
                        { v: "MEDICAL ALLOW.", s: headerStyle },
                        { v: "WASHING ALLOW.", s: headerStyle },
                        { v: "INCENTIVE", s: headerStyle },
                        { v: "HARD WORK ALLOW.", s: headerStyle },
                        { v: "OTHER ALLOW.", s: headerStyle },
                        { v: "OTHER EARNING", s: headerStyle },
                        { v: "BONUS (8.33%)", s: headerStyle },
                        { v: "GROSS TOTAL (06 TO 10A)", s: headerStyle },
                        { v: "DEDUCTION", s: headerStyle },
                        "", "", "", "", "", "", "", "", "", "", "", "", "",
                        { v: "NET PAYMENT (11 - 25 = 26)", s: headerStyle },
                        { v: "DATE OF PAYMENT", s: headerStyle },
                        { v: "REMARKS", s: headerStyle },
                    ],
                    [
                        "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
                        { v: "PF AMOUNT", s: headerStyle },
                        { v: "PT AMOUNT", s: headerStyle },
                        { v: "MESS", s: headerStyle },
                        { v: "LOAN", s: headerStyle },
                        { v: "ADVANCE", s: headerStyle },
                        { v: "PENALTY", s: headerStyle },
                        { v: "OTHER", s: headerStyle },
                        { v: "ESIC", s: headerStyle },
                        { v: "SOCIETY", s: headerStyle },
                        { v: "INCOME TAX", s: headerStyle },
                        { v: "INSURANCE", s: headerStyle },
                        { v: "OTHER (LWF)", s: headerStyle },
                        { v: "RECOVERIES", s: headerStyle },
                        { v: "TOTAL DEDUCTION (12 TO 24)", s: headerStyle },
                    ],
                    [],
                    [
                        { v: "1", s: headerStyle },
                        "",
                        { v: "2", s: headerStyle },
                        "", "",
                        { v: "3", s: headerStyle },
                        { v: "4", s: headerStyle },
                        "",
                        { v: "5", s: headerStyle },
                        { v: "6", s: headerStyle },
                        { v: "7", s: headerStyle },
                        { v: "8", s: headerStyle },
                        { v: "9", s: headerStyle },
                        { v: "10", s: headerStyle },
                        { v: "10A", s: headerStyle },
                        "", "", "", "", "", "", "",
                        { v: "11", s: headerStyle },
                        { v: "12", s: headerStyle },
                        { v: "13", s: headerStyle },
                        { v: "14", s: headerStyle },
                        { v: "15", s: headerStyle },
                        { v: "16", s: headerStyle },
                        { v: "17", s: headerStyle },
                        { v: "18", s: headerStyle },
                        { v: "19", s: headerStyle },
                        { v: "20", s: headerStyle },
                        { v: "21", s: headerStyle },
                        { v: "22", s: headerStyle },
                        { v: "23", s: headerStyle },
                        { v: "24", s: headerStyle },
                        { v: "25", s: headerStyle },
                        { v: "26", s: headerStyle },
                        { v: "27", s: headerStyle },
                        { v: "28", s: headerStyle },
                    ]
                ];

                ws_data.push(...headers);
                ws_data.push([]);

                requestData.items.forEach((detail, itemIndex) => {
                    const row = [
                        itemIndex + 1,
                        detail.uan_no || '--',
                        detail.employeeName || '--',
                        detail.designation || '--',
                        detail.department || '--',
                        detail.total_salary || '--',
                        detail.working_day || '--',
                        detail.work_day || '--',
                        detail.ot_hour || 0,
                        (detail.basic || 0).toFixed(2),
                        '--',
                        (detail.ot_value || 0).toFixed(2),
                        '--',
                        (detail.hra || 0).toFixed(2),
                        (detail.conveyance_allowance || 0).toFixed(2),
                        (detail.medical_allowance || 0).toFixed(2),
                        (detail.washing || 0).toFixed(2),
                        (0).toFixed(2),
                        (0).toFixed(2),
                        (detail.others || 0).toFixed(2),
                        (detail.total_earnings || 0).toFixed(2),
                        (detail.bonusAmount || 0).toFixed(2),
                        (detail.gross_wages || 0).toFixed(2),
                        (detail.pfAmount || 0).toFixed(2),
                        (detail.ptAmount || 0).toFixed(2),
                        (detail.Mess || 0).toFixed(2),
                        (detail.Loan || 0).toFixed(2),
                        (detail.Advanced || 0).toFixed(2),
                        (detail.Penalty || 0).toFixed(2),
                        (detail.Other || 0).toFixed(2),
                        (0).toFixed(2),
                        (0).toFixed(2),
                        (0).toFixed(2),
                        (0).toFixed(2),
                        (0).toFixed(2),
                        (0).toFixed(2),
                        (detail.total_deduction || 0).toFixed(2),
                        (detail.net_salary || 0).toFixed(2),
                    ];
                    ws_data.push(row);
                });
                ws_data.push([]);
                ws_data.push([
                    { v: `Total`, s: headerStyle2 },
                    "", "", "", "", "", "",
                    { v: `${requestData.t_work_day || 0}`, s: headerStyle2 },
                    { v: `${(requestData.t_ot_hour || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.t_basic || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: ``, s: headerStyle2 },
                    { v: `${(requestData.t_ot_value || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: ``, s: headerStyle2 },
                    { v: `${(requestData.t_hra || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.t_conveyance_allowance || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.t_medical_allowance || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.t_washing || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.t_others || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.t_total_earnings || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.t_bonusAmount || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.t_gross_wages || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.t_pfAmount || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.t_ptAmount || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.t_Mess || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.t_Loan || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.t_Advanced || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.t_Penalty || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.t_Other || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.t_total_deduction || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.t_net_salary || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: ``, s: headerStyle2 },
                    { v: ``, s: headerStyle2 },
                ]);

                const maxCols = Math.max(...ws_data.map(row => row.length));

                const colWidths = Array.from({ length: maxCols }, (_, colIndex) => {
                    return {
                        wch: Math.max(
                            ...ws_data.slice(4, 6).map(row => (
                                row[colIndex]?.v?.toString().length + 5 || 0
                            ))
                        ),
                    }
                });


                ws = XLSX.utils.aoa_to_sheet(ws_data);
                ws['!cols'] = colWidths;

                ws['!merges'] = [
                    { s: { r: 0, c: 0 }, e: { r: 1, c: 39 } },
                    { s: { r: 2, c: 0 }, e: { r: 2, c: 36 } },
                    { s: { r: 2, c: 38 }, e: { r: 2, c: 39 } },
                    { s: { r: 4, c: 23 }, e: { r: 4, c: 36 } },
                    { s: { r: 4, c: 0 }, e: { r: 5, c: 0 } },
                    { s: { r: 4, c: 1 }, e: { r: 5, c: 1 } },
                    { s: { r: 4, c: 2 }, e: { r: 5, c: 2 } },
                    { s: { r: 4, c: 3 }, e: { r: 5, c: 3 } },
                    { s: { r: 4, c: 4 }, e: { r: 5, c: 4 } },
                    { s: { r: 4, c: 5 }, e: { r: 5, c: 5 } },
                    { s: { r: 4, c: 6 }, e: { r: 5, c: 6 } },
                    { s: { r: 4, c: 7 }, e: { r: 5, c: 7 } },
                    { s: { r: 4, c: 8 }, e: { r: 5, c: 8 } },
                    { s: { r: 4, c: 9 }, e: { r: 5, c: 9 } },
                    { s: { r: 4, c: 10 }, e: { r: 5, c: 10 } },
                    { s: { r: 4, c: 11 }, e: { r: 5, c: 11 } },
                    { s: { r: 4, c: 12 }, e: { r: 5, c: 12 } },
                    { s: { r: 4, c: 13 }, e: { r: 5, c: 13 } },
                    { s: { r: 4, c: 14 }, e: { r: 5, c: 14 } },
                    { s: { r: 4, c: 15 }, e: { r: 5, c: 15 } },
                    { s: { r: 4, c: 16 }, e: { r: 5, c: 16 } },
                    { s: { r: 4, c: 17 }, e: { r: 5, c: 17 } },
                    { s: { r: 4, c: 18 }, e: { r: 5, c: 18 } },
                    { s: { r: 4, c: 19 }, e: { r: 5, c: 19 } },
                    { s: { r: 4, c: 20 }, e: { r: 5, c: 20 } },
                    { s: { r: 4, c: 21 }, e: { r: 5, c: 21 } },
                    { s: { r: 4, c: 22 }, e: { r: 5, c: 22 } },
                    // { s: { r: 4, c: 36 }, e: { r: 5, c: 36 } },
                    { s: { r: 4, c: 37 }, e: { r: 5, c: 37 } },
                    { s: { r: 4, c: 38 }, e: { r: 5, c: 38 } },
                    { s: { r: 4, c: 39 }, e: { r: 5, c: 39 } },
                    { s: { r: 7, c: 0 }, e: { r: 7, c: 1 } },
                    { s: { r: 7, c: 2 }, e: { r: 7, c: 4 } },
                    { s: { r: 7, c: 6 }, e: { r: 7, c: 7 } },
                    { s: { r: 7, c: 14 }, e: { r: 7, c: 21 } },
                    { s: { r: ws_data.length - 1, c: 0 }, e: { r: ws_data.length - 1, c: 6 } },
                ];

                XLSX.utils.book_append_sheet(wb, ws, `B Salary report`);

                const xlsxPath = path.join(__dirname, '../../xlsx');

                if (!fs.existsSync(xlsxPath)) {
                    fs.mkdirSync(xlsxPath, { recursive: true });
                }

                const filename = `b_salary_report_${Date.now()}.xlsx`;
                const filePath = path.join(xlsxPath, filename);

                await XLSXStyle.writeFile(wb, filePath);

                const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
                const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;

                sendResponse(res, 200, true, { file: fileUrl }, `XLSX file generated successfully`)
            }
            else if (data.status === 0) {
                sendResponse(res, 200, false, {}, `B salary report not found`)
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

const getPFReport = async (firm_id, year_id, employee, month) => {
    try {
        const filter = JSON.parse(month)
        // const filter = month

        const matchQuery = {
            deleted: false,
            firm_id: new ObjectId(firm_id),
            year_id: new ObjectId(year_id),
            month: filter
        };

        if (employee) {
            matchQuery.employee = new ObjectId(employee);
        }

        const requestData = await Salary.aggregate([
            {
                $match: matchQuery,
            },
            {
                $lookup: {
                    from: "employees",
                    localField: "employee",
                    foreignField: "_id",
                    as: "employeeDetails",
                    pipeline: [
                        {
                            $lookup: {
                                from: "designations",
                                localField: "designation",
                                foreignField: "_id",
                                as: "designationDetails",
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: "banks",
                    localField: "bank_name",
                    foreignField: "_id",
                    as: "bankDetails",
                },
            },
            {
                $lookup: {
                    from: "firms",
                    localField: "firm_id",
                    foreignField: "_id",
                    as: "firmDetails",
                },
            },
            {
                $lookup: {
                    from: "departments",
                    localField: "department",
                    foreignField: "_id",
                    as: "departmentDetails",
                },
            },
            {
                $lookup: {
                    from: 'daily-attendances',
                    let: { empId: "$employee", firmId: "$firm_id", yearId: "$year_id", month: "$month" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee", "$$empId"] },
                                        { $eq: ["$firm_id", "$$firmId"] },
                                        { $eq: ["$year_id", "$$yearId"] },
                                        { $eq: ["$month", "$$month"] },
                                        { $eq: ["$deleted", false] }
                                    ]
                                }
                            }
                        },
                        {
                            $group: {
                                _id: "$employee",
                                work_day: { $sum: "$present_day" },
                                ot_hour: { $sum: "$ot_hour" }
                            }
                        }
                    ],
                    as: "dailyAttendance"
                }
            },
            {
                $lookup: {
                    from: 'monthly-attendances',
                    let: { empId: "$employee", firmId: "$firm_id", yearId: "$year_id", month: "$month" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee", "$$empId"] },
                                        { $eq: ["$firm_id", "$$firmId"] },
                                        { $eq: ["$year_id", "$$yearId"] },
                                        { $eq: ["$month", "$$month"] },
                                        { $eq: ["$deleted", false] }
                                    ]
                                }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                work_day: "$present_day",
                                ot_hour: "$ot_hour"
                            }
                        }
                    ],
                    as: "monthlyAttendance"
                }
            },
            {
                $lookup: {
                    from: "earnings",
                    let: { empId: "$employee", firmId: "$firm_id", yearId: "$year_id", month: "$month" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee", "$$empId"] },
                                        { $eq: ["$firm_id", "$$firmId"] },
                                        { $eq: ["$year_id", "$$yearId"] },
                                        { $eq: ["$month", "$$month"] },
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
                $lookup: {
                    from: "deductions",
                    let: { empId: "$employee", firmId: "$firm_id", yearId: "$year_id", month: "$month" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee", "$$empId"] },
                                        { $eq: ["$firm_id", "$$firmId"] },
                                        { $eq: ["$year_id", "$$yearId"] },
                                        { $eq: ["$month", "$$month"] },
                                        { $eq: ["$deleted", false] }
                                    ]
                                }
                            }
                        },
                        {
                            $group: {
                                _id: "$employee",
                                Mess: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Mess"] }, then: "$amount", else: 0 }
                                    }
                                },
                                Loan: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Loan"] }, then: "$amount", else: 0 }
                                    }
                                },
                                Advanced: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Advance"] }, then: "$amount", else: 0 }
                                    }
                                },
                                Penalty: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Penalty"] }, then: "$amount", else: 0 }
                                    }
                                },
                                Other: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Other"] }, then: "$amount", else: 0 }
                                    }
                                }
                            }
                        }
                    ],
                    as: "deductionsDetails"
                }
            },
            {
                $addFields: {
                    employeeDetails: { $arrayElemAt: ["$employeeDetails", 0] },
                    bankDetails: { $arrayElemAt: ["$bankDetails", 0] },
                    firmDetails: { $arrayElemAt: ["$firmDetails", 0] },
                    departmentDetails: { $arrayElemAt: ["$departmentDetails", 0] },
                    total_earnings: { $sum: "$earningsDetails.amount" },
                    work_day: {
                        $ifNull: [
                            { $arrayElemAt: ["$dailyAttendance.work_day", 0] },
                            { $arrayElemAt: ["$monthlyAttendance.work_day", 0] }
                        ]
                    },
                    ot_hour: {
                        $ifNull: [
                            { $arrayElemAt: ["$dailyAttendance.ot_hour", 0] },
                            { $arrayElemAt: ["$monthlyAttendance.ot_hour", 0] }
                        ]
                    },
                    deductionsDetails: { $arrayElemAt: ["$deductionsDetails", 0] },
                    perday_salary: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$basic",
                            else: { $divide: ["$basic", "$working_day"] }
                        }
                    },
                    perday_hra: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$hra",
                            else: { $divide: ["$hra", "$working_day"] }
                        }
                    },
                    perday_conveyance_allowance: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$conveyance_allowance",
                            else: { $divide: ["$conveyance_allowance", "$working_day"] }
                        }
                    },
                    perday_medical_allowance: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$medical_allowance",
                            else: { $divide: ["$medical_allowance", "$working_day"] }
                        }
                    },
                    perday_washing: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$washing",
                            else: { $divide: ["$washing", "$working_day"] }
                        }
                    },
                    perday_others: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$other",
                            else: { $divide: ["$other", "$working_day"] }
                        }
                    },
                }
            },
            {
                $addFields: {
                    basic: { $multiply: ["$work_day", "$perday_salary"] },
                    ot_value: { $multiply: ["$ot_hour", "$perhour_ot_salary"] },
                    hra: { $multiply: ["$work_day", "$perday_hra"] },
                    conveyance_allowance: { $multiply: ["$work_day", "$perday_conveyance_allowance"] },
                    medical_allowance: { $multiply: ["$work_day", "$perday_medical_allowance"] },
                    washing: { $multiply: ["$work_day", "$perday_washing"] },
                    others: { $multiply: ["$work_day", "$perday_others"] },
                    ot_day: { $divide: ["$ot_hour", "$working_hour"] },
                    designationDetails: {
                        $arrayElemAt: ["$employeeDetails.designationDetails", 0],
                    },
                    Mess: { $ifNull: ["$deductionsDetails.Mess", 0] },
                    Loan: { $ifNull: ["$deductionsDetails.Loan", 0] },
                    Advanced: { $ifNull: ["$deductionsDetails.Advanced", 0] },
                    Penalty: { $ifNull: ["$deductionsDetails.Penalty", 0] },
                    Other: { $ifNull: ["$deductionsDetails.Other", 0] },
                    firmAddress: {
                        $reduce: {
                            input: [
                                "$firmDetails.address",
                                "$firmDetails.address_two",
                                "$firmDetails.address_three",
                                "$firmDetails.city",
                                "$firmDetails.state",
                                { $toString: "$firmDetails.pincode" }
                            ],
                            initialValue: "",
                            in: {
                                $concat: [
                                    "$$value",
                                    { $cond: { if: { $eq: ["$$value", ""] }, then: "", else: ", " } },
                                    "$$this"
                                ]
                            }
                        }
                    }
                }
            },
            {
                $match: {
                    $and: [
                        { work_day: { $gt: 0 } },
                        { total_salary: { $gt: 0 } }
                    ]
                }
            },
            {
                $addFields: {
                    pfAmount: {
                        $cond: {
                            if: { $eq: ["$is_pf", true] },
                            then: { $multiply: ["$basic", 0.12] },
                            else: 0
                        }
                    },
                    bonusAmount: {
                        $cond: {
                            if: { $eq: ["$is_bonus", true] },
                            then: { $multiply: ["$basic", 0.0833] },
                            else: 0
                        }
                    }
                }
            },
            {
                $addFields: {
                    gross_wages: { $add: ["$basic", "$hra", "$conveyance_allowance", "$medical_allowance", "$washing", "$others", "$ot_value", "$total_earnings", "$bonusAmount"] },
                }
            },
            {
                $addFields: {
                    ptAmount: {
                        $cond: {
                            if: { $and: ["$is_pt", { $gt: ["$gross_wages", 12000] }] },
                            then: 200,
                            else: 0
                        }
                    }
                }
            },
            {
                $addFields: {
                    total_deduction: { $add: ["$Mess", "$Loan", "$Advanced", "$Penalty", "$Other", "$ptAmount", "$pfAmount"] },
                }
            },
            {
                $addFields: {
                    net_salary: { $subtract: ["$gross_wages", "$total_deduction"] }
                }
            },
            {
                $project: {
                    firmName: "$firmDetails.name",
                    firmAddress: 1,
                    uan_no: "$employeeDetails.uan_no",
                    pf_no: "$employeeDetails.pf_no",
                    employeeId: "$employeeDetails._id",
                    employeeName: "$employeeDetails.full_name",
                    fatherName: "$employeeDetails.middle_name",
                    designation: "$designationDetails.name",
                    department: "$departmentDetails.name",
                    dob: "$employeeDetails.dob",
                    joining_date: "$employeeDetails.joining_date",
                    perday_salary: 1,
                    work_day: 1,
                    basic: 1,
                    gross_wages: 1,
                    pfAmount: 1,
                    married_status: "$employeeDetails.married_status",
                    aadhar_card: "$employeeDetails.adhar_no",
                    mobile_number: "$employeeDetails.mobile_number",
                    bank_name: "$bankDetails.name",
                    bank_account_no: 1,
                    bank_account_ifsc: 1,
                    hra: 1,
                    bonusAmount: 1,
                    month: 1,
                    e_year: 1,
                }
            },
            {
                $sort: { "department": 1, "gross_wages": 1 }
            },
            {
                $group: {
                    _id: "$firmName",
                    items: { $push: "$$ROOT" },
                    firmName: { $first: "$firmName" },
                    firmAddress: { $first: "$firmAddress" },
                    month: { $first: "$month" },
                    e_year: { $first: "$e_year" },
                    t_work_day: { $sum: "$work_day" },
                    t_basic: { $sum: "$basic" },
                    t_gross_wages: { $sum: "$gross_wages" },
                    t_pfAmount: { $sum: "$pfAmount" },
                }
            }
        ]);

        if (requestData.length && requestData.length > 0) {
            return { status: 1, result: requestData };
        } else {
            return { status: 0, result: [] };
        }
    } catch (error) {
        console.log(error);
        return { status: 2, result: error };
    }
};

exports.onePF = async (req, res) => {
    const { firm_id, year_id, employee, month } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getPFReport(firm_id, year_id, employee, month);
            let requestData = data.result;

            if (data.status === 1) {
                sendResponse(res, 200, true, requestData, `PF data list`);
            } else if (data.status === 0) {
                sendResponse(res, 200, true, [], `PF data not found`);
            } else if (data.status === 2) {
                console.log("error", data.result);
                sendResponse(res, 500, false, {}, "Something went wrong11");
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.downloadOnePF = async (req, res) => {
    const { firm_id, year_id, employee, month, print_date } = req.body;

    if (req.user && !req.error) {
        try {
            const data = await getPFReport(firm_id, year_id, employee, month);
            let requestData = data.result[0];

            if (data.status === 1) {
                const template = fs.readFileSync(
                    "templates/PFReport.html",
                    "utf-8"
                );

                const headerInfo = {
                    firmName: requestData.firmName,
                    firmAddress: requestData.firmAddress,
                    month: requestData.month,
                    t_work_day: requestData.t_work_day,
                    t_basic: requestData.t_basic,
                    t_gross_wages: requestData.t_gross_wages,
                    t_pfAmount: requestData.t_pfAmount,
                }
                const renderedHtml = ejs.render(template, {
                    headerInfo,
                    items: requestData.items,
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

                const pdfBuffer = await generatePDFLarge(page, { print_date: true });

                await browser.close();

                const pdfsDir = path.join(__dirname, "../../pdfs");
                if (!fs.existsSync(pdfsDir)) {
                    fs.mkdirSync(pdfsDir);
                }

                const filename = `pf_report_${Date.now()}.pdf`;
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
            } else if (data.status === 0) {
                sendResponse(res, 200, false, {}, `PF data not found`);
            } else if (data.status === 2) {
                sendResponse(res, 500, false, {}, "Something went wrong");
            }
        } catch (error) {
            console.log("error", error);
            sendResponse(res, 500, false, {}, "Something went wrong1111");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.xlsxPFreport = async (req, res) => {
    const { firm_id, year_id, employee, month, print_date } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getPFReport(firm_id, year_id, employee, month);
            let requestData = data.result[0];

            if (data.status === 1) {
                const wb = XLSX.utils.book_new();
                let ws

                const headerStyle = {
                    font: { bold: true }, fill: { fgColor: { rgb: "fdc686" } }, alignment: { horizontal: 'center', vertical: 'middle' }
                };

                const headerStyle2 = {
                    font: { size: 35, bold: true }, fill: { fgColor: { rgb: 'fdc686' } }, alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
                };

                const headerStyle3 = {
                    font: { size: 16, bold: true }, alignment: { horizontal: 'center', vertical: 'middle' },
                };

                const headerStyle4 = {
                    font: { bold: true }, alignment: { horizontal: 'center', vertical: 'middle' },
                };

                // *** Do not remove space ***
                const ws_data = [
                    [
                        {
                            v: `${requestData.firmName}\n${requestData.firmAddress}`, s: headerStyle2
                        }
                    ],
                    [],
                    [
                        { v: `PT REGISTER`, s: headerStyle3 },
                        "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
                        { v: `${requestData.month + "/" + requestData.e_year}`, s: headerStyle3 },
                        print_date ? { v: `Print Date : ${new Date().toLocaleDateString()}`, s: headerStyle3 } : "",
                    ],
                    [],
                ];

                const headers = [
                    { v: "SR NO.", s: headerStyle },
                    { v: "UAN NO.", s: headerStyle },
                    { v: "PF NO.", s: headerStyle },
                    { v: "EMPLOYEE NAME", s: headerStyle },
                    { v: "FATHER NAME", s: headerStyle },
                    { v: "DESIGNATION", s: headerStyle },
                    { v: "DEPARTMENT", s: headerStyle },
                    { v: "DATE OF BIRTH", s: headerStyle },
                    { v: "DATE OF JOINING", s: headerStyle },
                    { v: "DAILY BASIC WAGES", s: headerStyle },
                    { v: "PRESENT DAY", s: headerStyle },
                    { v: "BASIC SALARY", s: headerStyle },
                    { v: "GROSS SALARY", s: headerStyle },
                    { v: "PF AMOUNT", s: headerStyle },
                    { v: "MARITAL STATUS", s: headerStyle },
                    { v: "AADHAR CARD NO", s: headerStyle },
                    { v: "MOBILE NO", s: headerStyle },
                    { v: "NAME OF BANK", s: headerStyle },
                    { v: "BANK ACCOUNT NO.", s: headerStyle },
                    { v: "IFSC CODE NO.", s: headerStyle },
                    { v: "REMARKS", s: headerStyle },
                ];

                ws_data.push(headers);
                ws_data.push([]);

                requestData.items.forEach((detail, itemIndex) => {
                    const row = [
                        itemIndex + 1,
                        detail.uan_no || '--',
                        detail.pf_no || '--',
                        detail.employeeName || '--',
                        detail.fatherName || '--',
                        detail.designation || '--',
                        detail.department || '--',
                        detail.dob ? new Date(detail.dob).toLocaleDateString() : '--',
                        detail.joining_date ? new Date(detail.joining_date).toLocaleDateString() : '--',
                        (detail.perday_salary || 0).toFixed(2),
                        detail.work_day || '0',
                        (detail.basic || 0).toFixed(2),
                        (detail.gross_wages || 0).toFixed(2),
                        (detail.pfAmount || 0).toFixed(2),
                        detail.married_status || '--',
                        (detail.aadhar_card).toString() || '--',
                        detail.mobile_number || '--',
                        detail.bank_name || '--',
                        detail.bank_account_no || '--',
                        detail.bank_account_ifsc || '--',
                    ];
                    ws_data.push(row);
                });
                ws_data.push([]);
                ws_data.push([
                    { v: `Total`, s: headerStyle4 },
                    "", "", "", "", "", "", "", "", "",
                    { v: `${requestData.t_work_day}`, s: headerStyle2 },
                    { v: `${(requestData.t_basic || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.t_gross_wages || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.t_pfAmount || 0).toFixed(2)}`, s: headerStyle2 },
                    "", "", "", "", "", "", "",
                ]);

                const maxCols = Math.max(...ws_data.map(row => row.length));
                const colWidths = Array.from({ length: maxCols }, (_, colIndex) => {
                    return {
                        wch: ws_data[4]?.[colIndex]?.v.toString().length + 10 || 0
                    };
                });

                ws = XLSX.utils.aoa_to_sheet(ws_data);
                ws['!cols'] = colWidths;

                ws['!merges'] = [
                    { s: { r: 0, c: 0 }, e: { r: 1, c: 20 } },
                    { s: { r: 2, c: 0 }, e: { r: 2, c: 17 } },
                    { s: { r: 2, c: 19 }, e: { r: 2, c: 20 } },
                    { s: { r: ws_data.length - 1, c: 0 }, e: { r: ws_data.length - 1, c: 9 } },
                    { s: { r: ws_data.length - 1, c: 14 }, e: { r: ws_data.length - 1, c: 20 } }
                ];

                XLSX.utils.book_append_sheet(wb, ws, `PF report`);

                const xlsxPath = path.join(__dirname, '../../xlsx');

                if (!fs.existsSync(xlsxPath)) {
                    fs.mkdirSync(xlsxPath, { recursive: true });
                }

                const filename = `PF_report_${Date.now()}.xlsx`;
                const filePath = path.join(xlsxPath, filename);

                await XLSXStyle.writeFile(wb, filePath);

                const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
                const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;

                sendResponse(res, 200, true, { file: fileUrl }, `XLSX file generated successfully`)
            }
            else if (data.status === 0) {
                sendResponse(res, 200, false, {}, `PF report not found`)
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

const getYearlysalaryReport = async (firm_id, year_id, employee) => {
    try {

        const matchQuery = {
            deleted: false,
            firm_id: new ObjectId(firm_id),
            year_id: new ObjectId(year_id),
        };

        if (employee) {
            matchQuery.employee = new ObjectId(employee);
        }

        const requestData = await Salary.aggregate([
            {
                $match: matchQuery,
            },
            {
                $lookup: {
                    from: "employees",
                    localField: "employee",
                    foreignField: "_id",
                    as: "employeeDetails",
                    pipeline: [
                        {
                            $lookup: {
                                from: "designations",
                                localField: "designation",
                                foreignField: "_id",
                                as: "designationDetails",
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: "banks",
                    localField: "bank_name",
                    foreignField: "_id",
                    as: "bankDetails",
                },
            },
            {
                $lookup: {
                    from: "firms",
                    localField: "firm_id",
                    foreignField: "_id",
                    as: "firmDetails",
                },
            },
            {
                $lookup: {
                    from: "departments",
                    localField: "department",
                    foreignField: "_id",
                    as: "departmentDetails",
                },
            },
            {
                $lookup: {
                    from: 'daily-attendances',
                    let: { empId: "$employee", firmId: "$firm_id", yearId: "$year_id", month: "$month" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee", "$$empId"] },
                                        { $eq: ["$firm_id", "$$firmId"] },
                                        { $eq: ["$year_id", "$$yearId"] },
                                        { $eq: ["$month", "$$month"] },
                                        { $eq: ["$deleted", false] }
                                    ]
                                }
                            }
                        },
                        {
                            $group: {
                                _id: "$employee",
                                work_day: { $sum: "$present_day" },
                                ot_hour: { $sum: "$ot_hour" }
                            }
                        }
                    ],
                    as: "dailyAttendance"
                }
            },
            {
                $lookup: {
                    from: 'monthly-attendances',
                    let: { empId: "$employee", firmId: "$firm_id", yearId: "$year_id", month: "$month" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee", "$$empId"] },
                                        { $eq: ["$firm_id", "$$firmId"] },
                                        { $eq: ["$year_id", "$$yearId"] },
                                        { $eq: ["$month", "$$month"] },
                                        { $eq: ["$deleted", false] }
                                    ]
                                }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                work_day: "$present_day",
                                ot_hour: "$ot_hour"
                            }
                        }
                    ],
                    as: "monthlyAttendance"
                }
            },
            {
                $lookup: {
                    from: "earnings",
                    let: { empId: "$employee", firmId: "$firm_id", yearId: "$year_id", month: "$month" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee", "$$empId"] },
                                        { $eq: ["$firm_id", "$$firmId"] },
                                        { $eq: ["$year_id", "$$yearId"] },
                                        { $eq: ["$month", "$$month"] },
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
                $lookup: {
                    from: "deductions",
                    let: { empId: "$employee", firmId: "$firm_id", yearId: "$year_id", month: "$month" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee", "$$empId"] },
                                        { $eq: ["$firm_id", "$$firmId"] },
                                        { $eq: ["$year_id", "$$yearId"] },
                                        { $eq: ["$month", "$$month"] },
                                        { $eq: ["$deleted", false] }
                                    ]
                                }
                            }
                        },
                        {
                            $group: {
                                _id: "$employee",
                                Mess: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Mess"] }, then: "$amount", else: 0 }
                                    }
                                },
                                Loan: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Loan"] }, then: "$amount", else: 0 }
                                    }
                                },
                                Advanced: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Advance"] }, then: "$amount", else: 0 }
                                    }
                                },
                                Penalty: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Penalty"] }, then: "$amount", else: 0 }
                                    }
                                },
                                Other: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Other"] }, then: "$amount", else: 0 }
                                    }
                                }
                            }
                        }
                    ],
                    as: "deductionsDetails"
                }
            },
            {
                $addFields: {
                    employeeDetails: { $arrayElemAt: ["$employeeDetails", 0] },
                    bankDetails: { $arrayElemAt: ["$bankDetails", 0] },
                    firmDetails: { $arrayElemAt: ["$firmDetails", 0] },
                    departmentDetails: { $arrayElemAt: ["$departmentDetails", 0] },
                    total_earnings: { $sum: "$earningsDetails.amount" },
                    work_day: {
                        $ifNull: [
                            { $arrayElemAt: ["$dailyAttendance.work_day", 0] },
                            { $arrayElemAt: ["$monthlyAttendance.work_day", 0] }
                        ]
                    },
                    ot_hour: {
                        $ifNull: [
                            { $arrayElemAt: ["$dailyAttendance.ot_hour", 0] },
                            { $arrayElemAt: ["$monthlyAttendance.ot_hour", 0] }
                        ]
                    },
                    deductionsDetails: { $arrayElemAt: ["$deductionsDetails", 0] },
                    perday_salary: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$basic",
                            else: { $divide: ["$basic", "$working_day"] }
                        }
                    },
                    perday_hra: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$hra",
                            else: { $divide: ["$hra", "$working_day"] }
                        }
                    },
                    perday_conveyance_allowance: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$conveyance_allowance",
                            else: { $divide: ["$conveyance_allowance", "$working_day"] }
                        }
                    },
                    perday_medical_allowance: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$medical_allowance",
                            else: { $divide: ["$medical_allowance", "$working_day"] }
                        }
                    },
                    perday_washing: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$washing",
                            else: { $divide: ["$washing", "$working_day"] }
                        }
                    },
                    perday_others: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$other",
                            else: { $divide: ["$other", "$working_day"] }
                        }
                    },
                }
            },
            {
                $addFields: {
                    basic: { $multiply: ["$work_day", "$perday_salary"] },
                    ot_value: { $multiply: ["$ot_hour", "$perhour_ot_salary"] },
                    hra: { $multiply: ["$work_day", "$perday_hra"] },
                    conveyance_allowance: { $multiply: ["$work_day", "$perday_conveyance_allowance"] },
                    medical_allowance: { $multiply: ["$work_day", "$perday_medical_allowance"] },
                    washing: { $multiply: ["$work_day", "$perday_washing"] },
                    others: { $multiply: ["$work_day", "$perday_others"] },
                    ot_day: { $divide: ["$ot_hour", "$working_hour"] },
                    designationDetails: {
                        $arrayElemAt: ["$employeeDetails.designationDetails", 0],
                    },
                    Mess: { $ifNull: ["$deductionsDetails.Mess", 0] },
                    Loan: { $ifNull: ["$deductionsDetails.Loan", 0] },
                    Advanced: { $ifNull: ["$deductionsDetails.Advanced", 0] },
                    Penalty: { $ifNull: ["$deductionsDetails.Penalty", 0] },
                    Other: { $ifNull: ["$deductionsDetails.Other", 0] },
                    firmAddress: {
                        $reduce: {
                            input: [
                                "$firmDetails.address",
                                "$firmDetails.address_two",
                                "$firmDetails.address_three",
                                "$firmDetails.city",
                                "$firmDetails.state",
                                { $toString: "$firmDetails.pincode" }
                            ],
                            initialValue: "",
                            in: {
                                $concat: [
                                    "$$value",
                                    { $cond: { if: { $eq: ["$$value", ""] }, then: "", else: ", " } },
                                    "$$this"
                                ]
                            }
                        }
                    }
                }
            },
            {
                $match: {
                    $and: [
                        { work_day: { $gt: 0 } },
                        { total_salary: { $gt: 0 } }
                    ]
                }
            },
            {
                $addFields: {
                    pfAmount: {
                        $cond: {
                            if: { $eq: ["$is_pf", true] },
                            then: { $multiply: ["$basic", 0.12] },
                            else: 0
                        }
                    },
                    bonusAmount: {
                        $cond: {
                            if: { $eq: ["$is_bonus", true] },
                            then: { $multiply: ["$basic", 0.0833] },
                            else: 0
                        }
                    }
                }
            },
            {
                $addFields: {
                    gross_wages: { $add: ["$basic", "$hra", "$conveyance_allowance", "$medical_allowance", "$washing", "$others", "$ot_value", "$total_earnings", "$bonusAmount"] },
                }
            },
            {
                $addFields: {
                    ptAmount: {
                        $cond: {
                            if: { $and: ["$is_pt", { $gt: ["$gross_wages", 12000] }] },
                            then: 200,
                            else: 0
                        }
                    }
                }
            },
            {
                $addFields: {
                    total_deduction: { $add: ["$Mess", "$Loan", "$Advanced", "$Penalty", "$Other", "$ptAmount", "$pfAmount"] },
                }
            },
            {
                $addFields: {
                    net_salary: { $subtract: ["$gross_wages", "$total_deduction"] }
                }
            },
            {
                $project: {
                    firmName: "$firmDetails.name",
                    firmAddress: 1,
                    employeeName: "$employeeDetails.full_name",
                    employeeId: "$employeeDetails.employee_id",
                    department: "$departmentDetails.name",
                    card_no: "$employeeDetails.card_no",
                    uan_no: "$employeeDetails.uan_no",
                    pf_no: "$employeeDetails.pf_no",
                    salary_type: 1,
                    work_day: 1,
                    working_day: 1,
                    perday_salary: 1,
                    designation: "$designationDetails.name",
                    basic: 1,
                    hra: 1,
                    conveyance_allowance: 1,
                    medical_allowance: 1,
                    washing: 1,
                    others: 1,
                    ot_hour: 1,
                    ot_value: 1,
                    ot_day: 1,
                    total_salary: 1,
                    bonusAmount: 1,
                    pfAmount: 1,
                    total_earnings: 1,
                    ptAmount: 1,
                    Mess: 1,
                    Loan: 1,
                    Advanced: 1,
                    Penalty: 1,
                    Other: 1,
                    gross_wages: 1,
                    total_deduction: 1,
                    net_salary: 1,
                    bank_name: "$bankDetails.name",
                    bank_account_no: 1,
                    bank_account_ifsc: 1,
                    month: 1,
                    e_year: 1,
                }
            },
            {
                $group: {
                    _id: {
                        employeeId: "$employeeId",
                        employeeName: "$employeeName",
                        card_no: "$card_no",
                        uan_no: "$uan_no",
                        pf_no: "$pf_no",
                        designation: "$designation",
                        department: "$department",
                    },
                    firmName: { $first: "$firmName" },
                    firmAddress: { $first: "$firmAddress" },
                    monthly_data: {
                        $push: {
                            work_day: "$work_day",
                            working_day: "$working_day",
                            perday_salary: "$perday_salary",
                            basic: "$basic",
                            hra: "$hra",
                            conveyance_allowance: "$conveyance_allowance",
                            medical_allowance: "$medical_allowance",
                            washing: "$washing",
                            others: "$others",
                            ot_hour: "$ot_hour",
                            ot_value: "$ot_value",
                            ot_day: "$ot_day",
                            total_salary: "$total_salary",
                            bonusAmount: "$bonusAmount",
                            pfAmount: "$pfAmount",
                            total_earnings: "$total_earnings",
                            ptAmount: "$ptAmount",
                            Mess: "$Mess",
                            Loan: "$Loan",
                            Advanced: "$Advanced",
                            Penalty: "$Penalty",
                            Other: "$Other",
                            gross_wages: "$gross_wages",
                            total_deduction: "$total_deduction",
                            net_salary: "$net_salary"
                        }
                    },
                    mt_work_day: { $sum: "$work_day" },
                    mt_ot_value: { $sum: "$ot_value" },
                    mt_ot_hour: { $sum: "$ot_hour" },
                    mt_basic: { $sum: "$basic" },
                    mt_hra: { $sum: "$hra" },
                    mt_conveyance_allowance: { $sum: "$conveyance_allowance" },
                    mt_medical_allowance: { $sum: "$medical_allowance" },
                    mt_washing: { $sum: "$washing" },
                    mt_others: { $sum: "$others" },
                    mt_total_earnings: { $sum: "$total_earnings" },
                    mt_bonusAmount: { $sum: "$bonusAmount" },
                    mt_gross_wages: { $sum: "$gross_wages" },
                    mt_pfAmount: { $sum: "$pfAmount" },
                    mt_ptAmount: { $sum: "$ptAmount" },
                    mt_Mess: { $sum: "$Mess" },
                    mt_Loan: { $sum: "$Loan" },
                    mt_Advanced: { $sum: "$Advanced" },
                    mt_Penalty: { $sum: "$Penalty" },
                    mt_Other: { $sum: "$Other" },
                    mt_total_deduction: { $sum: "$total_deduction" },
                    mt_net_salary: { $sum: "$net_salary" }
                }
            },
            {
                $sort: { "_id.department": 1, "mt_gross_wages": 1 }
            },
            {
                $group: {
                    _id: null,
                    firmName: { $first: "$firmName" },
                    firmAddress: { $first: "$firmAddress" },
                    employee_details: {
                        $push: {
                            employeeName: "$_id.employeeName",
                            employeeId: "$_id.employeeId",
                            card_no: "$_id.card_no",
                            uan_no: "$_id.uan_no",
                            pf_no: "$_id.pf_no",
                            designation: "$_id.designation",
                            department: "$_id.department",
                            monthly_data: "$monthly_data",
                            mt_work_day: "$mt_work_day",
                            mt_ot_value: "$mt_ot_value",
                            mt_ot_hour: "$mt_ot_hour",
                            mt_basic: "$mt_basic",
                            mt_hra: "$mt_hra",
                            mt_conveyance_allowance: "$mt_conveyance_allowance",
                            mt_medical_allowance: "$mt_medical_allowance",
                            mt_washing: "$mt_washing",
                            mt_others: "$mt_others",
                            mt_total_earnings: "$mt_total_earnings",
                            mt_bonusAmount: "$mt_bonusAmount",
                            mt_gross_wages: "$mt_gross_wages",
                            mt_pfAmount: "$mt_pfAmount",
                            mt_ptAmount: "$mt_ptAmount",
                            mt_Mess: "$mt_Mess",
                            mt_Loan: "$mt_Loan",
                            mt_Advanced: "$mt_Advanced",
                            mt_Penalty: "$mt_Penalty",
                            mt_Other: "$mt_Other",
                            mt_total_deduction: "$mt_total_deduction",
                            mt_net_salary: "$mt_net_salary",
                        }
                    },
                    yt_work_day: { $sum: "$mt_work_day" },
                    yt_work_day: { $sum: "$mt_work_day" },
                    yt_ot_value: { $sum: "$mt_ot_value" },
                    yt_ot_hour: { $sum: "$mt_ot_hour" },
                    yt_basic: { $sum: "$mt_basic" },
                    yt_hra: { $sum: "$mt_hra" },
                    yt_conveyance_allowance: { $sum: "$mt_conveyance_allowance" },
                    yt_medical_allowance: { $sum: "$mt_medical_allowance" },
                    yt_washing: { $sum: "$mt_washing" },
                    yt_others: { $sum: "$mt_others" },
                    yt_total_earnings: { $sum: "$mt_total_earnings" },
                    yt_bonusAmount: { $sum: "$mt_bonusAmount" },
                    yt_gross_wages: { $sum: "$mt_gross_wages" },
                    yt_pfAmount: { $sum: "$mt_pfAmount" },
                    yt_ptAmount: { $sum: "$mt_ptAmount" },
                    yt_Mess: { $sum: "$mt_Mess" },
                    yt_Loan: { $sum: "$mt_Loan" },
                    yt_Advanced: { $sum: "$mt_Advanced" },
                    yt_Penalty: { $sum: "$mt_Penalty" },
                    yt_Other: { $sum: "$mt_Other" },
                    yt_total_deduction: { $sum: "$mt_total_deduction" },
                    yt_net_salary: { $sum: "$mt_net_salary" }
                }
            },
        ]);

        if (requestData.length && requestData.length > 0) {
            return { status: 1, result: requestData };
        } else {
            return { status: 0, result: [] };
        }
    } catch (error) {
        console.log(error);
        return { status: 2, result: error };
    }
};

exports.oneYearlysalary = async (req, res) => {
    const { firm_id, year_id, employee } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getYearlysalaryReport(firm_id, year_id, employee);
            let requestData = data.result;

            if (data.status === 1) {
                sendResponse(res, 200, true, requestData, `Yearly salary data list`);
            } else if (data.status === 0) {
                sendResponse(res, 200, true, [], `Yearly salary data not found`);
            } else if (data.status === 2) {
                console.log("error", data.result);
                sendResponse(res, 500, false, {}, "Something went wrong11");
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.downloadOneYearlysalary = async (req, res) => {
    const { firm_id, year_id, employee, print_date } = req.body;

    if (req.user && !req.error) {
        try {
            const data = await getYearlysalaryReport(firm_id, year_id, employee);
            let requestData = data.result[0];

            if (data.status === 1) {
                const template = fs.readFileSync(
                    "templates/YearlySalaryReport.html",
                    "utf-8"
                );

                const yearData = await Year.findOne(
                    { _id: year_id },
                    {
                        year: {
                            $concat: [
                                { $dateToString: { format: "%Y", date: "$start_year" } },
                                "-",
                                { $dateToString: { format: "%Y", date: "$end_year" } }
                            ]
                        }
                    }
                ).lean();

                const headerInfo = {
                    firmName: requestData.firmName,
                    firmAddress: requestData.firmAddress,
                    year: yearData.year,
                    yt_work_day: requestData.yt_work_day,
                    yt_ot_value: requestData.yt_ot_value,
                    yt_ot_hour: requestData.yt_ot_hour,
                    yt_basic: requestData.yt_basic,
                    yt_hra: requestData.yt_hra,
                    yt_conveyance_allowance: requestData.yt_conveyance_allowance,
                    yt_medical_allowance: requestData.yt_medical_allowance,
                    yt_washing: requestData.yt_washing,
                    yt_others: requestData.yt_others,
                    yt_total_earnings: requestData.yt_total_earnings,
                    yt_gross_wages: requestData.yt_gross_wages,
                    yt_pfAmount: requestData.yt_pfAmount,
                    yt_ptAmount: requestData.yt_ptAmount,
                    yt_Mess: requestData.yt_Mess,
                    yt_Loan: requestData.yt_Loan,
                    yt_Advanced: requestData.yt_Advanced,
                    yt_Penalty: requestData.yt_Penalty,
                    yt_Other: requestData.yt_Other,
                    yt_total_deduction: requestData.yt_total_deduction,
                    yt_net_salary: requestData.yt_net_salary,
                }
                const renderedHtml = ejs.render(template, {
                    headerInfo,
                    items: requestData.employee_details,
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

                const pdfBuffer = await generatePDF(page, { print_date: true });

                await browser.close();

                const pdfsDir = path.join(__dirname, "../../pdfs");
                if (!fs.existsSync(pdfsDir)) {
                    fs.mkdirSync(pdfsDir);
                }

                const filename = `yearly_salary_report_${Date.now()}.pdf`;
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
            } else if (data.status === 0) {
                sendResponse(res, 200, false, {}, `Yearly salary data not found`);
            } else if (data.status === 2) {
                sendResponse(res, 500, false, {}, "Something went wrong");
            }
        } catch (error) {
            console.log("error", error);
            sendResponse(res, 500, false, {}, "Something went wrong1111");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.xlsxYearlyReport = async (req, res) => {
    const { firm_id, year_id, employee, print_date } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getYearlysalaryReport(firm_id, year_id, employee);
            let requestData = data.result[0];

            const yearData = await Year.findOne(
                { _id: year_id },
                {
                    year: {
                        $concat: [
                            { $dateToString: { format: "%Y", date: "$start_year" } },
                            "-",
                            { $dateToString: { format: "%Y", date: "$end_year" } }
                        ]
                    }
                }
            ).lean();

            if (data.status === 1) {
                const wb = XLSX.utils.book_new();
                let ws

                const headerStyle = {
                    font: { bold: true }, fill: { fgColor: { rgb: "fdc686" } }, alignment: { horizontal: 'center', vertical: 'center' }
                };

                const headerStyle2 = {
                    font: { size: 35, bold: true }, fill: { fgColor: { rgb: 'fdc686' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                };

                const headerStyle3 = {
                    font: { size: 16, bold: true }, alignment: { horizontal: 'center', vertical: 'middle' },
                };

                const headerStyle4 = {
                    font: { bold: true }, alignment: { horizontal: 'center', vertical: 'middle' },
                };

                // *** Do not remove space ***
                const ws_data = [
                    [
                        {
                            v: `${requestData.firmName}\n${requestData.firmAddress}`, s: headerStyle2
                        }
                    ],
                    [],
                    [
                        { v: `Yearly Salary Report`, s: headerStyle3 },
                        "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
                        { v: `${yearData.year}`, s: headerStyle3 },
                        print_date ? { v: `Print Date : ${new Date().toLocaleDateString()}`, s: headerStyle3 } : "",
                    ],
                    [],
                ];

                const headers = [
                    [
                        { v: "SR NO.", s: headerStyle },
                        { v: "EMPLOYEE NAME", s: headerStyle },
                        { v: "EMPLOYEE ID", s: headerStyle },
                        { v: "DESIGNATION", s: headerStyle },
                        { v: "DEPARTMENT", s: headerStyle },
                        { v: "GROSS SALARY", s: headerStyle },
                        { v: "PF AMOUNT", s: headerStyle },
                        { v: "PT AMOUNT", s: headerStyle },
                        { v: "MESS", s: headerStyle },
                        { v: "LOAN", s: headerStyle },
                        { v: "ADVANCE", s: headerStyle },
                        { v: "PENALTY", s: headerStyle },
                        { v: "OTHER", s: headerStyle },
                        { v: "ESIC", s: headerStyle },
                        { v: "SOCIETY", s: headerStyle },
                        { v: "INCOME TAX", s: headerStyle },
                        { v: "INSURANCE", s: headerStyle },
                        { v: "OTHER (LWF)", s: headerStyle },
                        { v: "RECOVERIES", s: headerStyle },
                        { v: "TOTAL DEDUCTION", s: headerStyle },
                        { v: "NET SALARY", s: headerStyle },
                    ],
                ];

                ws_data.push(...headers);
                ws_data.push([]);

                requestData.employee_details.forEach((detail, itemIndex) => {
                    const row = [
                        itemIndex + 1,
                        detail.employeeName || '--',
                        detail.employeeId || '--',
                        detail.designation || '--',
                        detail.department || '--',
                        (detail.mt_gross_wages || 0).toFixed(2),
                        (detail.mt_pfAmount || 0).toFixed(2),
                        (detail.mt_ptAmount || 0).toFixed(2),
                        (detail.mt_Mess || 0).toFixed(2),
                        (detail.mt_Loan || 0).toFixed(2),
                        (detail.mt_Advanced || 0).toFixed(2),
                        (detail.mt_Penalty || 0).toFixed(2),
                        (detail.mt_Other || 0).toFixed(2),
                        (0).toFixed(2),
                        (0).toFixed(2),
                        (0).toFixed(2),
                        (0).toFixed(2),
                        (0).toFixed(2),
                        (0).toFixed(2),
                        (detail.mt_total_deduction || 0).toFixed(2),
                        (detail.mt_net_salary || 0).toFixed(2),
                    ];
                    ws_data.push(row);
                });
                ws_data.push([]);
                ws_data.push([
                    { v: `Total`, s: headerStyle2 },
                    "", "", "", "", "",
                    { v: `${(requestData.yt_gross_wages || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.yt_pfAmount || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.yt_ptAmount || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.yt_Mess || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.yt_Loan || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.yt_Advanced || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.yt_Penalty || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.yt_Other || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.yt_total_deduction || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.yt_net_salary || 0).toFixed(2)}`, s: headerStyle2 },
                ]);

                const maxCols = Math.max(...ws_data.map(row => row.length));

                const colWidths = Array.from({ length: maxCols }, (_, colIndex) => {
                    return {
                        wch: Math.max(
                            ...ws_data.slice(4, 5).map(row => (
                                row[colIndex]?.v?.toString().length + 5 || 0
                            ))
                        ),
                    }
                });


                ws = XLSX.utils.aoa_to_sheet(ws_data);
                ws['!cols'] = colWidths;

                ws['!merges'] = [
                    { s: { r: 0, c: 0 }, e: { r: 1, c: 20 } },
                    { s: { r: 2, c: 0 }, e: { r: 2, c: 17 } },
                    { s: { r: 2, c: 19 }, e: { r: 2, c: 20 } },
                    { s: { r: ws_data.length - 1, c: 0 }, e: { r: ws_data.length - 1, c: 5 } },
                ];

                XLSX.utils.book_append_sheet(wb, ws, `Yearly Report report`);

                const xlsxPath = path.join(__dirname, '../../xlsx');

                if (!fs.existsSync(xlsxPath)) {
                    fs.mkdirSync(xlsxPath, { recursive: true });
                }

                const filename = `yearly_report_${Date.now()}.xlsx`;
                const filePath = path.join(xlsxPath, filename);

                await XLSXStyle.writeFile(wb, filePath);

                const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
                const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;

                sendResponse(res, 200, true, { file: fileUrl }, `XLSX file generated successfully`)
            }
            else if (data.status === 0) {
                sendResponse(res, 200, false, {}, `Yearly Report not found`)
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

const getYearlymonthsalaryReport = async (firm_id, year_id, employee) => {
    try {

        // const filter = JSON.parse(employee)
        const filter = employee          //  for postman

        const matchQuery = {
            deleted: false,
            firm_id: new ObjectId(firm_id),
            year_id: new ObjectId(year_id),
        };

        if (filter?.length > 0) {
            matchQuery.employee = { $in: filter.map(id => new ObjectId(id)) };
        }


        const requestData = await Salary.aggregate([
            {
                $match: matchQuery,
            },
            {
                $lookup: {
                    from: "employees",
                    localField: "employee",
                    foreignField: "_id",
                    as: "employeeDetails",
                    pipeline: [
                        {
                            $lookup: {
                                from: "designations",
                                localField: "designation",
                                foreignField: "_id",
                                as: "designationDetails",
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: "firms",
                    localField: "firm_id",
                    foreignField: "_id",
                    as: "firmDetails",
                },
            },
            {
                $lookup: {
                    from: "departments",
                    localField: "department",
                    foreignField: "_id",
                    as: "departmentDetails",
                },
            },
            {
                $lookup: {
                    from: 'daily-attendances',
                    let: { empId: "$employee", firmId: "$firm_id", yearId: "$year_id", month: "$month" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee", "$$empId"] },
                                        { $eq: ["$firm_id", "$$firmId"] },
                                        { $eq: ["$year_id", "$$yearId"] },
                                        { $eq: ["$month", "$$month"] },
                                        { $eq: ["$deleted", false] }
                                    ]
                                }
                            }
                        },
                        {
                            $group: {
                                _id: "$employee",
                                work_day: { $sum: "$present_day" },
                                ot_hour: { $sum: "$ot_hour" }
                            }
                        }
                    ],
                    as: "dailyAttendance"
                }
            },
            {
                $lookup: {
                    from: 'monthly-attendances',
                    let: { empId: "$employee", firmId: "$firm_id", yearId: "$year_id", month: "$month" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee", "$$empId"] },
                                        { $eq: ["$firm_id", "$$firmId"] },
                                        { $eq: ["$year_id", "$$yearId"] },
                                        { $eq: ["$month", "$$month"] },
                                        { $eq: ["$deleted", false] }
                                    ]
                                }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                work_day: "$present_day",
                                ot_hour: "$ot_hour"
                            }
                        }
                    ],
                    as: "monthlyAttendance"
                }
            },
            {
                $lookup: {
                    from: "earnings",
                    let: { empId: "$employee", firmId: "$firm_id", yearId: "$year_id", month: "$month" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee", "$$empId"] },
                                        { $eq: ["$firm_id", "$$firmId"] },
                                        { $eq: ["$year_id", "$$yearId"] },
                                        { $eq: ["$month", "$$month"] },
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
                $lookup: {
                    from: "deductions",
                    let: { empId: "$employee", firmId: "$firm_id", yearId: "$year_id", month: "$month" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee", "$$empId"] },
                                        { $eq: ["$firm_id", "$$firmId"] },
                                        { $eq: ["$year_id", "$$yearId"] },
                                        { $eq: ["$month", "$$month"] },
                                        { $eq: ["$deleted", false] }
                                    ]
                                }
                            }
                        },
                        {
                            $group: {
                                _id: "$employee",
                                Mess: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Mess"] }, then: "$amount", else: 0 }
                                    }
                                },
                                Loan: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Loan"] }, then: "$amount", else: 0 }
                                    }
                                },
                                Advanced: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Advance"] }, then: "$amount", else: 0 }
                                    }
                                },
                                Penalty: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Penalty"] }, then: "$amount", else: 0 }
                                    }
                                },
                                Other: {
                                    $sum: {
                                        $cond: { if: { $eq: ["$type", "Other"] }, then: "$amount", else: 0 }
                                    }
                                }
                            }
                        }
                    ],
                    as: "deductionsDetails"
                }
            },
            {
                $addFields: {
                    employeeDetails: { $arrayElemAt: ["$employeeDetails", 0] },
                    bankDetails: { $arrayElemAt: ["$bankDetails", 0] },
                    firmDetails: { $arrayElemAt: ["$firmDetails", 0] },
                    departmentDetails: { $arrayElemAt: ["$departmentDetails", 0] },
                    total_earnings: { $sum: "$earningsDetails.amount" },
                    work_day: {
                        $ifNull: [
                            { $arrayElemAt: ["$dailyAttendance.work_day", 0] },
                            { $arrayElemAt: ["$monthlyAttendance.work_day", 0] }
                        ]
                    },
                    ot_hour: {
                        $ifNull: [
                            { $arrayElemAt: ["$dailyAttendance.ot_hour", 0] },
                            { $arrayElemAt: ["$monthlyAttendance.ot_hour", 0] }
                        ]
                    },
                    deductionsDetails: { $arrayElemAt: ["$deductionsDetails", 0] },
                    perday_salary: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$basic",
                            else: { $divide: ["$basic", "$working_day"] }
                        }
                    },
                    perday_hra: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$hra",
                            else: { $divide: ["$hra", "$working_day"] }
                        }
                    },
                    perday_conveyance_allowance: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$conveyance_allowance",
                            else: { $divide: ["$conveyance_allowance", "$working_day"] }
                        }
                    },
                    perday_medical_allowance: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$medical_allowance",
                            else: { $divide: ["$medical_allowance", "$working_day"] }
                        }
                    },
                    perday_washing: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$washing",
                            else: { $divide: ["$washing", "$working_day"] }
                        }
                    },
                    perday_others: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$other",
                            else: { $divide: ["$other", "$working_day"] }
                        }
                    },
                }
            },
            {
                $addFields: {
                    basic: { $multiply: ["$work_day", "$perday_salary"] },
                    ot_value: { $multiply: ["$ot_hour", "$perhour_ot_salary"] },
                    hra: { $multiply: ["$work_day", "$perday_hra"] },
                    conveyance_allowance: { $multiply: ["$work_day", "$perday_conveyance_allowance"] },
                    medical_allowance: { $multiply: ["$work_day", "$perday_medical_allowance"] },
                    washing: { $multiply: ["$work_day", "$perday_washing"] },
                    others: { $multiply: ["$work_day", "$perday_others"] },
                    ot_day: { $divide: ["$ot_hour", "$working_hour"] },
                    designationDetails: {
                        $arrayElemAt: ["$employeeDetails.designationDetails", 0],
                    },
                    Mess: { $ifNull: ["$deductionsDetails.Mess", 0] },
                    Loan: { $ifNull: ["$deductionsDetails.Loan", 0] },
                    Advanced: { $ifNull: ["$deductionsDetails.Advanced", 0] },
                    Penalty: { $ifNull: ["$deductionsDetails.Penalty", 0] },
                    Other: { $ifNull: ["$deductionsDetails.Other", 0] },
                    firmAddress: {
                        $reduce: {
                            input: [
                                "$firmDetails.address",
                                "$firmDetails.address_two",
                                "$firmDetails.address_three",
                                "$firmDetails.city",
                                "$firmDetails.state",
                                { $toString: "$firmDetails.pincode" }
                            ],
                            initialValue: "",
                            in: {
                                $concat: [
                                    "$$value",
                                    { $cond: { if: { $eq: ["$$value", ""] }, then: "", else: ", " } },
                                    "$$this"
                                ]
                            }
                        }
                    }
                }
            },
            {
                $match: {
                    $and: [
                        { work_day: { $gt: 0 } },
                        { total_salary: { $gt: 0 } }
                    ]
                }
            },
            {
                $addFields: {
                    pfAmount: {
                        $cond: {
                            if: { $eq: ["$is_pf", true] },
                            then: { $multiply: ["$basic", 0.12] },
                            else: 0
                        }
                    },
                    bonusAmount: {
                        $cond: {
                            if: { $eq: ["$is_bonus", true] },
                            then: { $multiply: ["$basic", 0.0833] },
                            else: 0
                        }
                    }
                }
            },
            {
                $addFields: {
                    gross_wages: { $add: ["$basic", "$hra", "$conveyance_allowance", "$medical_allowance", "$washing", "$others", "$ot_value", "$total_earnings", "$bonusAmount"] },
                }
            },
            {
                $addFields: {
                    ptAmount: {
                        $cond: {
                            if: { $and: ["$is_pt", { $gt: ["$gross_wages", 12000] }] },
                            then: 200,
                            else: 0
                        }
                    }
                }
            },
            {
                $addFields: {
                    total_deduction: { $add: ["$Mess", "$Loan", "$Advanced", "$Penalty", "$Other", "$ptAmount", "$pfAmount"] },
                }
            },
            {
                $addFields: {
                    net_salary: { $subtract: ["$gross_wages", "$total_deduction"] }
                }
            },
            {
                $project: {
                    firmName: "$firmDetails.name",
                    firmAddress: 1,
                    employeeName: "$employeeDetails.full_name",
                    employeeId: "$employeeDetails.employee_id",
                    department: "$departmentDetails.name",
                    pf_no: "$employeeDetails.pf_no",
                    salary_type: 1,
                    work_day: 1,
                    working_day: 1,
                    perday_salary: 1,
                    designation: "$designationDetails.name",
                    basic: 1,
                    hra: 1,
                    conveyance_allowance: 1,
                    medical_allowance: 1,
                    washing: 1,
                    others: 1,
                    ot_hour: 1,
                    ot_value: 1,
                    total_salary: 1,
                    bonusAmount: 1,
                    pfAmount: 1,
                    total_earnings: 1,
                    ptAmount: 1,
                    Mess: 1,
                    Loan: 1,
                    Advanced: 1,
                    Penalty: 1,
                    Other: 1,
                    gross_wages: 1,
                    total_deduction: 1,
                    net_salary: 1,
                    bank_account_no: 1,
                    month: 1,
                    e_year: 1,
                }
            },
            {
                $group: {
                    _id: {
                        employeeId: "$employeeId",
                        employeeName: "$employeeName",
                        pf_no: "$pf_no",
                        designation: "$designation",
                        department: "$department",
                    },
                    firmName: { $first: "$firmName" },
                    firmAddress: { $first: "$firmAddress" },
                    monthly_data: {
                        $push: {
                            month: "$month",
                            e_year: "$e_year",
                            work_day: "$work_day",
                            perday_salary: "$perday_salary",
                            basic: "$basic",
                            ot_hour: "$ot_hour",
                            total_salary: "$total_salary",
                            pfAmount: "$pfAmount",
                            total_earnings: "$total_earnings",
                            ptAmount: "$ptAmount",
                            Mess: "$Mess",
                            Loan: "$Loan",
                            Advanced: "$Advanced",
                            Penalty: "$Penalty",
                            Other: "$Other",
                            gross_wages: "$gross_wages",
                            total_deduction: "$total_deduction",
                            net_salary: "$net_salary",
                            bank_account_no: "$bank_account_no",
                        }
                    },
                    mt_work_day: { $sum: "$work_day" },
                    mt_ot_hour: { $sum: "$ot_hour" },
                    mt_basic: { $sum: "$basic" },
                    mt_total_earnings: { $sum: "$total_earnings" },
                    mt_gross_wages: { $sum: "$gross_wages" },
                    mt_pfAmount: { $sum: "$pfAmount" },
                    mt_ptAmount: { $sum: "$ptAmount" },
                    mt_Mess: { $sum: "$Mess" },
                    mt_Loan: { $sum: "$Loan" },
                    mt_Advanced: { $sum: "$Advanced" },
                    mt_Penalty: { $sum: "$Penalty" },
                    mt_Other: { $sum: "$Other" },
                    mt_total_deduction: { $sum: "$total_deduction" },
                    mt_net_salary: { $sum: "$net_salary" }
                }
            },
            {
                $sort: { "_id.department": 1, "mt_gross_wages": 1 }
            },
            {
                $group: {
                    _id: null,
                    firmName: { $first: "$firmName" },
                    firmAddress: { $first: "$firmAddress" },
                    employee_details: {
                        $push: {
                            employeeName: "$_id.employeeName",
                            employeeId: "$_id.employeeId",
                            pf_no: "$_id.pf_no",
                            designation: "$_id.designation",
                            department: "$_id.department",
                            monthly_data: "$monthly_data",
                            mt_work_day: "$mt_work_day",
                            mt_ot_hour: "$mt_ot_hour",
                            mt_basic: "$mt_basic",
                            mt_total_earnings: "$mt_total_earnings",
                            mt_bonusAmount: "$mt_bonusAmount",
                            mt_gross_wages: "$mt_gross_wages",
                            mt_pfAmount: "$mt_pfAmount",
                            mt_ptAmount: "$mt_ptAmount",
                            mt_Mess: "$mt_Mess",
                            mt_Loan: "$mt_Loan",
                            mt_Advanced: "$mt_Advanced",
                            mt_Penalty: "$mt_Penalty",
                            mt_Other: "$mt_Other",
                            mt_total_deduction: "$mt_total_deduction",
                            mt_net_salary: "$mt_net_salary",
                        }
                    },
                    yt_work_day: { $sum: "$mt_work_day" },
                    yt_ot_hour: { $sum: "$mt_ot_hour" },
                    yt_basic: { $sum: "$mt_basic" },
                    yt_total_earnings: { $sum: "$mt_total_earnings" },
                    yt_bonusAmount: { $sum: "$mt_bonusAmount" },
                    yt_gross_wages: { $sum: "$mt_gross_wages" },
                    yt_pfAmount: { $sum: "$mt_pfAmount" },
                    yt_ptAmount: { $sum: "$mt_ptAmount" },
                    yt_Mess: { $sum: "$mt_Mess" },
                    yt_Loan: { $sum: "$mt_Loan" },
                    yt_Advanced: { $sum: "$mt_Advanced" },
                    yt_Penalty: { $sum: "$mt_Penalty" },
                    yt_Other: { $sum: "$mt_Other" },
                    yt_total_deduction: { $sum: "$mt_total_deduction" },
                    yt_net_salary: { $sum: "$mt_net_salary" }
                }
            },
        ]);

        if (requestData.length && requestData.length > 0) {
            return { status: 1, result: requestData };
        } else {
            return { status: 0, result: [] };
        }
    } catch (error) {
        console.log(error);
        return { status: 2, result: error };
    }
};

exports.oneYearlymonthsalary = async (req, res) => {
    const { firm_id, year_id, employee } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getYearlymonthsalaryReport(firm_id, year_id, employee);
            let requestData = data.result;

            if (data.status === 1) {
                sendResponse(res, 200, true, requestData, `Month wise yearly salary data list`);
            } else if (data.status === 0) {
                sendResponse(res, 200, true, [], `Month wise yearly salary data not found`);
            } else if (data.status === 2) {
                console.log("error", data.result);
                sendResponse(res, 500, false, {}, "Something went wrong11");
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.downloadOneYearlymonthsalary = async (req, res) => {
    if (req.user && !req.error) {
        try {
            const { firm_id, year_id, employee } = req.body;

            const data = await getYearlymonthsalaryReport(firm_id, year_id, employee);
            let requestData = data.result[0];

            if (data.status === 1) {
                const yearData = await Year.findOne(
                    { _id: year_id },
                    {
                        year: {
                            $concat: [
                                { $dateToString: { format: "%Y", date: "$start_year" } },
                                "-",
                                { $dateToString: { format: "%Y", date: "$end_year" } }
                            ]
                        }
                    }
                ).lean();
                const template = fs.readFileSync("templates/YearlyMonthSalaryReport.html", "utf-8");

                const headerInfo = {
                    firmName: requestData.firmName,
                    firmAddress: requestData.firmAddress,
                    year: yearData.year,
                    yt_work_day: requestData.yt_work_day,
                    yt_ot_value: requestData.yt_ot_value,
                    yt_ot_hour: requestData.yt_ot_hour,
                    yt_basic: requestData.yt_basic,
                    yt_hra: requestData.yt_hra,
                    yt_conveyance_allowance: requestData.yt_conveyance_allowance,
                    yt_medical_allowance: requestData.yt_medical_allowance,
                    yt_washing: requestData.yt_washing,
                    yt_others: requestData.yt_others,
                    yt_total_earnings: requestData.yt_total_earnings,
                    yt_gross_wages: requestData.yt_gross_wages,
                    yt_pfAmount: requestData.yt_pfAmount,
                    yt_ptAmount: requestData.yt_ptAmount,
                    yt_Mess: requestData.yt_Mess,
                    yt_Loan: requestData.yt_Loan,
                    yt_Advanced: requestData.yt_Advanced,
                    yt_Penalty: requestData.yt_Penalty,
                    yt_Other: requestData.yt_Other,
                    yt_total_deduction: requestData.yt_total_deduction,
                    yt_net_salary: requestData.yt_net_salary,
                };

                const renderedHtml = ejs.render(template, {
                    headerInfo,
                    items: requestData.employee_details,
                    logoUrl1: process.env.LOGO_URL_1,
                    logoUrl2: process.env.LOGO_URL_2,
                });

                const browser = await puppeteer.launch({
                    headless: "new",
                    args: [
                        "--no-sandbox",
                        "--disable-setuid-sandbox",
                        "--disable-dev-shm-usage",
                        "--disable-extensions",
                        "--disable-gpu",
                    ],
                    timeout: 60000000,
                });

                const page = await browser.newPage();

                await page.setContent(renderedHtml, {
                    waitUntil: "domcontentloaded",
                    timeout: 60000000,
                });

                const pdfBuffer = await generatePDFLarge(page, { print_date: true });

                await browser.close();

                const pdfsDir = path.join(__dirname, "../../pdfs");
                if (!fs.existsSync(pdfsDir)) {
                    fs.mkdirSync(pdfsDir);
                }

                const filename = `yearly_month_salary_report_${Date.now()}.pdf`;
                const filePath = path.join(pdfsDir, filename);
                fs.writeFileSync(filePath, pdfBuffer);

                const fileUrl = `${URI}/pdfs/${filename}`;

                sendResponse(res, 200, true, { file: fileUrl }, "PDF downloaded Successfully");
            } else if (data.status === 0) {
                sendResponse(res, 200, true, [], `Month wise yearly salary data not found`);
            } else if (data.status === 2) {
                console.log("error", data.result);
                sendResponse(res, 500, false, {}, "Something went wrong11");
            }
        } catch (error) {
            console.log("error", error);
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.xlsxYearlymonthReport = async (req, res) => {
    const { firm_id, year_id, employee, department, print_date } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getYearlymonthsalaryReport(firm_id, year_id, employee, department);
            let requestData = data.result[0];

            const yearData = await Year.findOne(
                { _id: year_id },
                {
                    year: {
                        $concat: [
                            { $dateToString: { format: "%Y", date: "$start_year" } },
                            "-",
                            { $dateToString: { format: "%Y", date: "$end_year" } }
                        ]
                    }
                }
            ).lean();

            if (data.status === 1) {
                const wb = XLSX.utils.book_new();
                let ws

                const headerStyle = {
                    font: { bold: true }, fill: { fgColor: { rgb: "fdc686" } }, alignment: { horizontal: 'center', vertical: 'center' }
                };

                const headerStyle2 = {
                    font: { size: 35, bold: true }, fill: { fgColor: { rgb: 'fdc686' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                };

                const headerStyle3 = {
                    font: { size: 16, bold: true }, alignment: { horizontal: 'center', vertical: 'middle' },
                };

                const headerStyle4 = {
                    font: { bold: true }, alignment: { horizontal: 'center', vertical: 'middle' },
                };

                // *** Do not remove space ***
                const ws_data = [
                    [
                        {
                            v: `${requestData.firmName}\n${requestData.firmAddress}`, s: headerStyle2
                        }
                    ],
                    [],
                    [
                        { v: `Yearly MonthSalary Report`, s: headerStyle3 },
                        "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
                        { v: `${yearData.year}`, s: headerStyle3 },
                        print_date ? { v: `Print Date : ${new Date().toLocaleDateString()}`, s: headerStyle3 } : "",
                    ],
                    [],
                ];

                const headers = [
                    [
                        { v: "SR NO.", s: headerStyle },
                        { v: "EMPLOYEE NAME", s: headerStyle },
                        { v: "EMPLOYEE ID", s: headerStyle },
                        { v: "DESIGNATION", s: headerStyle },
                        { v: "DEPARTMENT", s: headerStyle },
                        { v: "GROSS SALARY", s: headerStyle },
                        { v: "PF AMOUNT", s: headerStyle },
                        { v: "PT AMOUNT", s: headerStyle },
                        { v: "MESS", s: headerStyle },
                        { v: "LOAN", s: headerStyle },
                        { v: "ADVANCE", s: headerStyle },
                        { v: "PENALTY", s: headerStyle },
                        { v: "OTHER", s: headerStyle },
                        { v: "ESIC", s: headerStyle },
                        { v: "SOCIETY", s: headerStyle },
                        { v: "INCOME TAX", s: headerStyle },
                        { v: "INSURANCE", s: headerStyle },
                        { v: "OTHER (LWF)", s: headerStyle },
                        { v: "RECOVERIES", s: headerStyle },
                        { v: "TOTAL DEDUCTION", s: headerStyle },
                        { v: "NET SALARY", s: headerStyle },
                    ],
                ];

                ws_data.push(...headers);
                ws_data.push([]);

                requestData.employee_details.forEach((detail, itemIndex) => {
                    const row = [
                        itemIndex + 1,
                        detail.employeeName || '--',
                        detail.employeeId || '--',
                        detail.designation || '--',
                        detail.department || '--',
                        (detail.mt_gross_wages || 0).toFixed(2),
                        (detail.mt_pfAmount || 0).toFixed(2),
                        (detail.mt_ptAmount || 0).toFixed(2),
                        (detail.mt_Mess || 0).toFixed(2),
                        (detail.mt_Loan || 0).toFixed(2),
                        (detail.mt_Advanced || 0).toFixed(2),
                        (detail.mt_Penalty || 0).toFixed(2),
                        (detail.mt_Other || 0).toFixed(2),
                        (0).toFixed(2),
                        (0).toFixed(2),
                        (0).toFixed(2),
                        (0).toFixed(2),
                        (0).toFixed(2),
                        (0).toFixed(2),
                        (detail.mt_total_deduction || 0).toFixed(2),
                        (detail.mt_net_salary || 0).toFixed(2),
                    ];
                    ws_data.push(row);
                });
                ws_data.push([]);
                ws_data.push([
                    { v: `Total`, s: headerStyle2 },
                    "", "", "", "", "",
                    { v: `${(requestData.yt_gross_wages || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.yt_pfAmount || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.yt_ptAmount || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.yt_Mess || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.yt_Loan || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.yt_Advanced || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.yt_Penalty || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.yt_Other || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.yt_total_deduction || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.yt_net_salary || 0).toFixed(2)}`, s: headerStyle2 },
                ]);

                const maxCols = Math.max(...ws_data.map(row => row.length));

                const colWidths = Array.from({ length: maxCols }, (_, colIndex) => {
                    return {
                        wch: Math.max(
                            ...ws_data.slice(4, 5).map(row => (
                                row[colIndex]?.v?.toString().length + 5 || 0
                            ))
                        ),
                    }
                });


                ws = XLSX.utils.aoa_to_sheet(ws_data);
                ws['!cols'] = colWidths;

                ws['!merges'] = [
                    { s: { r: 0, c: 0 }, e: { r: 1, c: 20 } },
                    { s: { r: 2, c: 0 }, e: { r: 2, c: 17 } },
                    { s: { r: 2, c: 19 }, e: { r: 2, c: 20 } },
                    { s: { r: ws_data.length - 1, c: 0 }, e: { r: ws_data.length - 1, c: 5 } },
                ];

                XLSX.utils.book_append_sheet(wb, ws, `Yearly Month Report`);

                const xlsxPath = path.join(__dirname, '../../xlsx');

                if (!fs.existsSync(xlsxPath)) {
                    fs.mkdirSync(xlsxPath, { recursive: true });
                }

                const filename = `yearly_month_report_${Date.now()}.xlsx`;
                const filePath = path.join(xlsxPath, filename);

                await XLSXStyle.writeFile(wb, filePath);

                const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
                const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;

                sendResponse(res, 200, true, { file: fileUrl }, `XLSX file generated successfully`)
            }
            else if (data.status === 0) {
                sendResponse(res, 200, false, {}, `Month wise yearly Report not found`)
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

const getESICReport = async (firm_id, year_id, employee, month) => {
    try {
        const filter = parseInt(month)
        // const filter = month

        const matchQuery = {
            deleted: false,
            is_esi: true,
            firm_id: new ObjectId(firm_id),
            year_id: new ObjectId(year_id),
            month: filter
        };

        if (employee) {
            matchQuery.employee = new ObjectId(employee);
        }

        const requestData = await Salary.aggregate([
            {
                $match: matchQuery,
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
                $lookup: {
                    from: "firms",
                    localField: "firm_id",
                    foreignField: "_id",
                    as: "firmDetails",
                },
            },
            {
                $lookup: {
                    from: "departments",
                    localField: "department",
                    foreignField: "_id",
                    as: "departmentDetails",
                },
            },
            {
                $lookup: {
                    from: 'daily-attendances',
                    let: { empId: "$employee", firmId: "$firm_id", yearId: "$year_id", month: "$month" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee", "$$empId"] },
                                        { $eq: ["$firm_id", "$$firmId"] },
                                        { $eq: ["$year_id", "$$yearId"] },
                                        { $eq: ["$month", "$$month"] },
                                        { $eq: ["$deleted", false] }
                                    ]
                                }
                            }
                        },
                        {
                            $group: {
                                _id: "$employee",
                                work_day: { $sum: "$present_day" },
                                ot_hour: { $sum: "$ot_hour" }
                            }
                        }
                    ],
                    as: "dailyAttendance"
                }
            },
            {
                $lookup: {
                    from: 'monthly-attendances',
                    let: { empId: "$employee", firmId: "$firm_id", yearId: "$year_id", month: "$month" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee", "$$empId"] },
                                        { $eq: ["$firm_id", "$$firmId"] },
                                        { $eq: ["$year_id", "$$yearId"] },
                                        { $eq: ["$month", "$$month"] },
                                        { $eq: ["$deleted", false] }
                                    ]
                                }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                work_day: "$present_day",
                                ot_hour: "$ot_hour"
                            }
                        }
                    ],
                    as: "monthlyAttendance"
                }
            },
            {
                $addFields: {
                    employeeDetails: { $arrayElemAt: ["$employeeDetails", 0] },
                    firmDetails: { $arrayElemAt: ["$firmDetails", 0] },
                    departmentDetails: { $arrayElemAt: ["$departmentDetails", 0] },
                    work_day: {
                        $ifNull: [
                            { $arrayElemAt: ["$dailyAttendance.work_day", 0] },
                            { $arrayElemAt: ["$monthlyAttendance.work_day", 0] }
                        ]
                    },
                    perday_salary: {
                        $cond: {
                            if: { $eq: ["$salary_type", "Daily"] },
                            then: "$basic",
                            else: { $divide: ["$basic", "$working_day"] }
                        }
                    },
                }
            },
            {
                $addFields: {
                    basic: { $multiply: ["$work_day", "$perday_salary"] },
                    firmAddress: {
                        $reduce: {
                            input: [
                                "$firmDetails.address",
                                "$firmDetails.address_two",
                                "$firmDetails.address_three",
                                "$firmDetails.city",
                                "$firmDetails.state",
                                { $toString: "$firmDetails.pincode" }
                            ],
                            initialValue: "",
                            in: {
                                $concat: [
                                    "$$value",
                                    { $cond: { if: { $eq: ["$$value", ""] }, then: "", else: ", " } },
                                    "$$this"
                                ]
                            }
                        }
                    }
                }
            },
            {
                $match: {
                    $and: [
                        { work_day: { $gt: 0 } },
                        { total_salary: { $gt: 0 } }
                    ]
                }
            },
            {
                $addFields: {
                    esicAmount1: {
                        $cond: {
                            if: { $eq: ["$is_esi", true] },
                            then: { $multiply: ["$basic", 0.0075] },
                            else: 0
                        }
                    },
                    esicAmount2: {
                        $cond: {
                            if: { $eq: ["$is_esi", true] },
                            then: { $multiply: ["$basic", 0.0325] },
                            else: 0
                        }
                    },
                    esicAmount3: {
                        $cond: {
                            if: { $eq: ["$is_esi", true] },
                            then: { $multiply: ["$basic", 0.04] },
                            else: 0
                        }
                    },
                }
            },
            {
                $project: {
                    firmName: "$firmDetails.name",
                    firmAddress: 1,
                    employeeId: "$employeeDetails._id",
                    employeeName: "$employeeDetails.full_name",
                    fatherName: "$employeeDetails.middle_name",
                    esic_ip: "$employeeDetails.esic_ip",
                    department: "$departmentDetails.name",
                    dob: "$employeeDetails.dob",
                    perday_salary: 1,
                    work_day: 1,
                    basic: 1,
                    esicAmount1: 1,
                    esicAmount2: 1,
                    esicAmount3: 1,
                    month: 1,
                    e_year: 1,
                }
            },
            {
                $sort: { "department": 1, "basic": 1 }
            },
            {
                $group: {
                    _id: "$firmName",
                    items: { $push: "$$ROOT" },
                    firmName: { $first: "$firmName" },
                    firmAddress: { $first: "$firmAddress" },
                    month: { $first: "$month" },
                    e_year: { $first: "$e_year" },
                    t_esicAmount1: { $sum: "$esicAmount1" },
                    t_esicAmount2: { $sum: "$esicAmount2" },
                    t_esicAmount3: { $sum: "$esicAmount3" },
                }
            }
        ]);

        if (requestData.length && requestData.length > 0) {
            return { status: 1, result: requestData };
        } else {
            return { status: 0, result: [] };
        }
    } catch (error) {
        console.log(error);
        return { status: 2, result: error };
    }
};

exports.oneESIC = async (req, res) => {
    const { firm_id, year_id, employee, month } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getESICReport(firm_id, year_id, employee, month);
            let requestData = data.result;

            if (data.status === 1) {
                sendResponse(res, 200, true, requestData, `ESIC data list`);
            } else if (data.status === 0) {
                sendResponse(res, 200, true, [], `ESIC data not found`);
            } else if (data.status === 2) {
                sendResponse(res, 500, false, {}, "Something went wrong11");
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.downloadOneESIC = async (req, res) => {
    const { firm_id, year_id, employee, month, print_date } = req.body;

    if (req.user && !req.error) {
        try {
            const data = await getESICReport(firm_id, year_id, employee, month);
            let requestData = data.result[0];

            if (data.status === 1) {
                const template = fs.readFileSync(
                    "templates/ESICReport.html",
                    "utf-8"
                );

                const headerInfo = {
                    firmName: requestData.firmName,
                    firmAddress: requestData.firmAddress,
                    month: requestData.month,
                    e_year: requestData.e_year,
                    t_esicAmount1: requestData.t_esicAmount1,
                    t_esicAmount2: requestData.t_esicAmount2,
                    t_esicAmount3: requestData.t_esicAmount3,
                }
                const renderedHtml = ejs.render(template, {
                    headerInfo,
                    items: requestData.items,
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

                const pdfBuffer = await generatePDFA4WithoutPrintDate(page, { print_date: true });

                await browser.close();

                const pdfsDir = path.join(__dirname, "../../pdfs");
                if (!fs.existsSync(pdfsDir)) {
                    fs.mkdirSync(pdfsDir);
                }

                const filename = `esic_report_${Date.now()}.pdf`;
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
            } else if (data.status === 0) {
                sendResponse(res, 200, false, {}, `ESIC data not found`);
            } else if (data.status === 2) {
                sendResponse(res, 500, false, {}, "Something went wrong");
            }
        } catch (error) {
            console.log("error", error);
            sendResponse(res, 500, false, {}, "Something went wrong1111");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.xlsxESIC = async (req, res) => {
    const { firm_id, year_id, employee, month, print_date } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getESICReport(firm_id, year_id, employee, month);
            let requestData = data.result[0];

            if (data.status === 1) {
                const wb = XLSX.utils.book_new();
                let ws

                const headerStyle = {
                    font: { bold: true }, fill: { fgColor: { rgb: "fdc686" } }, alignment: { horizontal: 'center', vertical: 'center' }
                };

                const headerStyle2 = {
                    font: { size: 35, bold: true }, fill: { fgColor: { rgb: 'fdc686' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                };

                const headerStyle3 = {
                    font: { size: 16, bold: true }, alignment: { horizontal: 'center', vertical: 'middle' },
                };

                const headerStyle4 = {
                    font: { bold: true }, alignment: { horizontal: 'center', vertical: 'middle' },
                };

                // *** Do not remove space ***
                const ws_data = [
                    [
                        {
                            v: `${requestData.firmName}\n${requestData.firmAddress}`, s: headerStyle2
                        }
                    ],
                    [],
                    [
                        { v: `ESIC REGISTER`, s: headerStyle3 },
                        "", "", "", "", "",
                        { v: `${requestData.month + "/" + requestData.e_year}`, s: headerStyle3 }, "", "",
                        print_date ? { v: `Print Date : ${new Date().toLocaleDateString()}`, s: headerStyle3 } : "",
                    ],
                    [],
                ];

                const headers = [
                    [
                        { v: "SR NO.", s: headerStyle },
                        { v: "NAME", s: headerStyle },
                        { v: "FATHER NAME", s: headerStyle },
                        { v: "DEPARTMENT", s: headerStyle },
                        { v: "DATE OF BIRTH", s: headerStyle },
                        { v: "ESIC NO.", s: headerStyle },
                        { v: "PRESENT DAY", s: headerStyle },
                        { v: "BASIC SALARY", s: headerStyle },
                        { v: "ESIC AMOUNT", s: headerStyle },
                        "", "",
                        { v: "REMARKS", s: headerStyle },
                    ],
                    [
                        "", "", "", "", "", "", "", "",
                        { v: "0.75%", s: headerStyle },
                        { v: "3.25%", s: headerStyle },
                        { v: "4.00%", s: headerStyle },
                        "",
                    ],
                ];

                ws_data.push(...headers);
                ws_data.push([]);

                requestData.items.forEach((detail, itemIndex) => {
                    const row = [
                        itemIndex + 1,
                        detail.employeeName || '--',
                        detail.fatherName || '--',
                        detail.department || '--',
                        detail.dob ? new Date(detail.dob).toLocaleDateString() : '--',
                        detail.esic_ip || "--",
                        detail.work_day || '0',
                        (detail.basic || 0).toFixed(2),
                        (detail.esicAmount1 || 0).toFixed(2),
                        (detail.esicAmount2 || 0).toFixed(2),
                        (detail.esicAmount3 || 0).toFixed(2),
                    ];
                    ws_data.push(row);
                });
                ws_data.push([]);
                ws_data.push([
                    { v: `Total`, s: headerStyle2 },
                    "", "", "", "", "", "", "",
                    { v: `${(requestData.t_esicAmount1 || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.t_esicAmount2 || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: `${(requestData.t_esicAmount3 || 0).toFixed(2)}`, s: headerStyle2 },
                    { v: ``, s: headerStyle2 },
                ]);

                const maxCols = Math.max(...ws_data.map(row => row.length));

                const colWidths = ws_data.map((_, colIndex) => ({
                    wch: Math.max(
                        ...ws_data.slice(3, 3 + requestData.items.length + 1).map(row => {
                            const cell = row[colIndex];
                            if (cell && typeof cell === 'object' && 'v' in cell) {
                                return cell.v?.toString().length || 0;
                            } else if (typeof cell === 'string' || typeof cell === 'number') {
                                return cell.toString().length;
                            }
                            return 0;
                        })
                    ) + 3
                }));

                console.log("ws_data", ws_data[3])
                console.log("colWidths", colWidths)
                console.log("colWidths", colWidths)


                ws = XLSX.utils.aoa_to_sheet(ws_data);
                ws['!cols'] = colWidths;

                ws['!merges'] = [
                    { s: { r: 0, c: 0 }, e: { r: 1, c: 11 } },
                    { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
                    { s: { r: 2, c: 6 }, e: { r: 2, c: 8 } },
                    { s: { r: 2, c: 9 }, e: { r: 2, c: 11 } },
                    { s: { r: 4, c: 8 }, e: { r: 4, c: 10 } },
                    { s: { r: 4, c: 0 }, e: { r: 5, c: 0 } },
                    { s: { r: 4, c: 1 }, e: { r: 5, c: 1 } },
                    { s: { r: 4, c: 2 }, e: { r: 5, c: 2 } },
                    { s: { r: 4, c: 3 }, e: { r: 5, c: 3 } },
                    { s: { r: 4, c: 4 }, e: { r: 5, c: 4 } },
                    { s: { r: 4, c: 5 }, e: { r: 5, c: 5 } },
                    { s: { r: 4, c: 6 }, e: { r: 5, c: 6 } },
                    { s: { r: 4, c: 7 }, e: { r: 5, c: 7 } },
                    { s: { r: 4, c: 11 }, e: { r: 5, c: 11 } },
                    { s: { r: ws_data.length - 1, c: 0 }, e: { r: ws_data.length - 1, c: 7 } },
                ];

                XLSX.utils.book_append_sheet(wb, ws, `ESIC report`);

                const xlsxPath = path.join(__dirname, '../../xlsx');

                if (!fs.existsSync(xlsxPath)) {
                    fs.mkdirSync(xlsxPath, { recursive: true });
                }

                const filename = `esic_report_${Date.now()}.xlsx`;
                const filePath = path.join(xlsxPath, filename);

                await XLSXStyle.writeFile(wb, filePath);

                const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
                const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;

                sendResponse(res, 200, true, { file: fileUrl }, `XLSX file generated successfully`)
            }
            else if (data.status === 0) {
                sendResponse(res, 200, false, {}, `B salary report not found`)
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

exports.getDuplicateSalary = async (req, res) => {
    try {
        const { firm_id, year_id, month } = req.body;

        if (!req.user || req.error) {
            return sendResponse(res, 401, false, {}, "Unauthorized");
        }

        if (!firm_id || !year_id || month === undefined) {
            return sendResponse(res, 400, false, {}, "Missing required parameters");
        }

        const duplicateSalaries = await Salary.aggregate([
            {
                $match: {
                    firm_id: new mongoose.Types.ObjectId(firm_id),
                    year_id: new mongoose.Types.ObjectId(year_id),
                    month: Number(month), // Ensure month is a number
                    deleted: false, // Ignore deleted records
                },
            },
            {
                $group: {
                    _id: {
                        employee: "$employee",
                        month: "$month",
                        year_id: "$year_id",
                        firm_id: "$firm_id",
                    },
                    count: { $sum: 1 },
                    duplicateEntries: { $push: "$_id" },
                },
            },
            {
                $match: { count: { $gt: 1 } }, // Only duplicates
            },
            {
                $lookup: {
                    from: "employees", // Match the actual employee collection name
                    localField: "_id.employee",
                    foreignField: "_id",
                    as: "employeeDetails",
                },
            },
            {
                $unwind: "$employeeDetails", // Convert array to object
            },
            {
                $project: {
                    _id: 0,
                    employee: "$_id.employee",
                    employee_name: "$employeeDetails.name",
                    count: 1,
                    duplicateEntries: 1,
                },
            },
            {
                $group: {
                    _id: null,
                    totalDuplicateEmployees: { $sum: 1 }, // Count of employees with duplicate salaries
                    totalDuplicateEntries: { $sum: "$count" }, // Total duplicate salary records
                    duplicates: { $push: "$$ROOT" }, // Push all duplicate employee details
                },
            },
            {
                $project: {
                    _id: 0,
                    totalDuplicateEmployees: 1,
                    totalDuplicateEntries: 1,
                    duplicates: 1,
                },
            },
        ]);

        if (duplicateSalaries.length > 0) {
            return sendResponse(res, 400, false, duplicateSalaries[0], "Duplicate salary entries found");
        }

        return sendResponse(res, 200, true, { totalDuplicateEmployees: 0, totalDuplicateEntries: 0, duplicates: [] }, "No duplicate found");

    } catch (error) {
        console.error("Error fetching duplicate salaries:", error);
        return sendResponse(res, 500, false, {}, "Something went wrong");
    }
};

exports.deleteDuplicateSalary = async (req, res) => {
    try {
        const { firm_id, year_id, month } = req.body;

        if (!req.user || req.error) {
            return sendResponse(res, 401, false, {}, "Unauthorized");
        }

        if (!firm_id || !year_id || month === undefined) {
            return sendResponse(res, 400, false, {}, "Missing required parameters");
        }

        const duplicateSalaries = await Salary.aggregate([
            {
                $match: {
                    firm_id: new mongoose.Types.ObjectId(firm_id),
                    year_id: new mongoose.Types.ObjectId(year_id),
                    month: Number(month),
                    deleted: false,
                },
            },
            {
                $group: {
                    _id: {
                        employee: "$employee",
                        month: "$month",
                        year_id: "$year_id",
                        firm_id: "$firm_id",
                    },
                    count: { $sum: 1 },
                    duplicateEntries: {
                        $push: { id: "$_id", createdAt: "$createdAt" }
                    },
                },
            },
            {
                $match: { count: { $gt: 1 } }, // Only duplicates
            },
        ]);

        if (!duplicateSalaries.length) {
            return sendResponse(res, 200, true, {}, "No duplicate salary entries found");
        }

        let deleteIds = [];

        duplicateSalaries.forEach((item) => {
            // Ensure duplicateEntries is an array
            if (!Array.isArray(item.duplicateEntries) || item.duplicateEntries.length === 0) {
                return;
            }

            // Sort by createdAt (earliest one is kept)
            const sortedEntries = item.duplicateEntries.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

            // Remove first entry (keep it), delete the rest
            sortedEntries.shift();
            deleteIds.push(...sortedEntries.map(entry => entry.id));
        });

        if (deleteIds.length > 0) {
            await Salary.deleteMany({ _id: { $in: deleteIds } });
        }

        return sendResponse(res, 200, true, { deletedCount: deleteIds.length }, "Duplicate salaries deleted successfully");

    } catch (error) {
        console.error("Error deleting duplicate salaries:", error);
        return sendResponse(res, 500, false, {}, "Something went wrong");
    }
};