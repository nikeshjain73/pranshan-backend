const Employee = require('../../models/payroll/employ.model');
const Designation = require('../../models/payroll/designation.model');
const Salary = require('../../models/payroll/salary.model');
const employeeType = require('../../models/payroll/employee_type.model');
const holiday = require('../../models/payroll/holiday.model');
const SalaryReport = require('../../models/payroll/salaryreport.model');
const designationModel = require('../../models/payroll/designation.model');
const bankModel = require('../../models/payroll/bank.model');
const salaryModel = require('../../models/payroll/salary.model');
const departmentModel = require('../../models/payroll/department.model');
const workDayModel = require('../../models/payroll/workDay.model');
const mongoose = require('mongoose');
const monthlyAttendanceModel = require('../../models/payroll/monthly.attendance.model');
const earningModel = require('../../models/payroll/earning.model');
const excelJS = require("exceljs");
const employModel = require('../../models/payroll/employ.model');
const { MonthCount, EarningRates } = require('../../utils/enum');
const deductionModel = require('../../models/payroll/deduction.model');
const dailyAttendanceModel = require('../../models/payroll/daily.attendance.model');
const shiftModel = require('../../models/payroll/shift.model');
const yearModel = require('../../models/year.model');
const Firm = require('../../models/firm.model');
const { sendResponse } = require('../../helper/response');
const ejs = require('ejs');
const fs = require('fs')
const puppeteer = require('puppeteer');
const path = require("path");
const upload = require('../../helper/multerConfig');
var parser = require('simple-excel-to-json')
const moment = require('moment');
const projectModel = require('../../models/project.model');
const { pid } = require('process');
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;
require('dotenv').config();
const { Types: { ObjectId } } = require("mongoose");
const xlsx = require('xlsx')

exports.getEmployee = async (req, res) => {
    if (req.user && !req.error) {
        let limit = parseInt(req.query.limit) || 10;
        let page = parseInt(req.query.page) || 1;
        let firm = req.query.firm;

        try {
            const employeesQuery = Employee.find({ status: true, deleted: false, firm_id: firm })
                .populate('designation', 'name')
                .populate('shift', 'name')
                .populate('shift_two', 'name')
                .populate('firm_id', 'name')
                .populate('skills', 'name')
                .populate('emp_type', 'name')

            const totalEmployees = await Employee.countDocuments({ status: true, deleted: false });

            const employees = await employeesQuery
                .skip((page - 1) * limit)
                .limit(limit);

            const employeeIds = employees.map(employee => employee._id);
            const salaries = await Salary.find({ employee: { $in: employeeIds } })
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
                .lean();

            const employeeData = employees.map(employee => {
                const salaryData = salaries.find(salary => salary.employee.equals(employee._id)) || null;
                return {
                    ...employee.toObject(),
                    salary_id: salaryData
                };
            });

            const totalPages = Math.ceil(totalEmployees / limit);

            const response = {
                totalEmployees,
                totalPages,
                currentPage: page,
                employees: employeeData
            };
            if (response) {
                sendResponse(res, 200, true, response, "Employee list");
            } else {
                sendResponse(res, 400, false, {}, "Employee not found")
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.getAdminEmployee = async (req, res) => {
    if (req.user && !req.error) {
        let limit = parseInt(req.query.limit) || 10;
        let page = parseInt(req.query.page) || 1;
        let firm = req.query.firm;
        let search = req.query.search;
        try {
            const searchCondition = search
                ? {
                    $or: [
                        { $expr: { $regexMatch: { input: { $toLower: "$full_name" }, regex: search.toLowerCase() } } },
                        { $expr: { $regexMatch: { input: { $toLower: "$employee_id" }, regex: search.toLowerCase() } } },
                        { $expr: { $regexMatch: { input: { $toLower: { $toString: "$card_no" } }, regex: search.toLowerCase() } } },
                        { $expr: { $regexMatch: { input: { $toLower: { $toString: "$adhar_no" } }, regex: search.toLowerCase() } } }
                    ]
                }
                : {};

            const employeeFilter = { deleted: false, firm_id: firm, ...searchCondition };

            const totalEmployees = await Employee.countDocuments(employeeFilter);
            const totalPages = Math.ceil(totalEmployees / limit);


            const employees = await Employee.find(employeeFilter)
                .populate('designation shift shift_two firm_id skills emp_type', 'name')
                .skip((page - 1) * limit)
                .limit(limit)
                .sort({ full_name: 1 })
                .lean();
             console.log("employees",employees);
            const employeeIds = employees.map(emp => emp._id);
            const salaries = await Salary.find({ employee: { $in: employeeIds } })
                .populate('bank_name department.group', 'name')
                .sort({ createdAt: -1 })
                .lean();
   console.log("salaries",salaries);
            const employeeData = employees.map(emp => {
                const salary = salaries.find(s => s.employee.equals(emp._id)) || null;
                return {
                    ...emp,
                    salary_id: salary
                };
            });
   console.log("employeeData",employeeData);
            const response = {
                totalEmployees,
                totalPages,
                currentPage: page,
                employees: employeeData
            };

            if (response) {
                sendResponse(res, 200, true, response, "Employee list");
            } else {
                sendResponse(res, 400, false, {}, "Employee not found")
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong" + error);
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.getAllEmployee = async (req, res) => {
    if (req.user && !req.error) {
        let month = req.query.month
        try {
            const employeeData = await Employee.find({ status: true, deleted: false },
                {
                    full_name: 1, employee_id: 1, designation: 1, adhar_no: 1, firm_id: 1,
                    shift: 1, in_time: 1, out_time: 1, shift_two: 1, in_time_two: 1, out_time_two: 1, card_no: 1
                })
                .populate('designation', 'name')
                .populate('shift', 'name')
                .populate('shift_two', 'name')
                .lean()

            const employeeIds = employeeData.map(employee => employee._id);
            const salariesQuery = { employee: { $in: employeeIds } };
            if (month) {
                salariesQuery.month = month;
            }
            const salaries = await Salary.find(salariesQuery, { department: 1, employee: 1, bank: 1, is_stop_salary: 1 })
                .populate('department', 'name')
                .populate('bank_name', 'name')
                .lean()

            const finalData = employeeData.map(employee => {
                const salaryData = salaries.find(salary => salary.employee && salary.employee.equals(employee._id)) || null;
                return {
                    ...employee,
                    salary_id: salaryData
                };
            });

            if (finalData) {
                sendResponse(res, 200, true, finalData, "Employee list")
            } else {
                sendResponse(res, 400, false, {}, "Employee not found")
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong" + error)
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.listEmployeeAll = async (req, res) => {
    if (!req.user && req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
    const { firm_id } = req.query;

    // Guard: reject missing, empty, or the literal string "null"
    if (!firm_id || firm_id === 'null' || firm_id === 'undefined') {
        return sendResponse(res, 400, false, {}, "Firm ID is required");
    }

    try {
        const matchObj = { deleted: false, status: true, firm_id };

        const employeeData = await Employee.find(matchObj, { full_name: 1, firm_id: 1, card_no: 1, designation: 1, adhar_no: 1, employee_id: 1 })
            .populate('designation', 'name')
            .populate('firm_id', 'name')
            .lean()
            .sort({ full_name: 1 });

        return sendResponse(res, 200, true, employeeData || [], "Employee list");
    } catch (error) {
        console.error("Error fetching employee data:", error);
        return sendResponse(res, 500, false, {}, "Something went wrong");
    }
}

exports.searchEmployee = async (req, res) => {
    if (req.user && !req.error) {
        let search = req.query.search || '';
        try {
            const searchData = {
                status: true,
                deleted: false,
                'full_name': { $regex: search, $options: 'i' }
            };
            await Employee.find(searchData, { adhar_no: 1, full_name: 1, designation: 1, employee_id: 1, adhar_no: 1 })
                .populate('designation', 'name')
                .lean()
                .then(data => {
                    if (data) {
                        sendResponse(res, 200, true, data, "Employee list")
                    } else {
                        sendResponse(res, 400, false, {}, "Employee not found")
                    }
                })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.manageEmploy = async (req, res) => {
    const {
        card_no, first_name, middle_name, last_name, full_name, image,
        mobile_number, dob, email, gender, designation,
        same_address, address, address_two, address_three, state,
        city, pincode, pre_address, pre_address_two, pre_address_three,
        pre_state, pre_city, pre_pincode, adhar_no, pancard_no,
        shift, in_time, out_time, shift_two, in_time_two, out_time_two,
        joining_date, leaving_date, leaving_reason, black_list,
        black_list_reason, holiday, firm_id, uan_no,
        is_emergency, emergency_contact_number, emergency_contact_person,
        emergency_person_relation, pan_card_image, aadhar_card_image, status,
        passport_number, blood_group, weight,
        height, esi_number, caste, skills,
        emp_type, education, nationality, emergency_person_dob,
        emergency_person_aadhar_number, emergency_person_aadhar_photo,
        other_document_imgs, esic_ip, pf_no, married_status,
        id, projects
    } = req.body;
    if (uan_no && uan_no.length > 20) {
        sendResponse(res, 400, false, {}, "UAN number should not exceed 20 characters");
        return;
    }

    if (req.user) {
        if (
            joining_date && full_name &&
            //  email &&
            mobile_number && dob && gender &&
            designation && address && state &&
            city && pincode && adhar_no
            // holiday &&
            // shift && in_time && out_time && shift_two &&
            // in_time_two && out_time_two && aadhar_card_image
        ) {
            const trimEmp = full_name.trim()
            const existingEmployee = await Employee.findOne({
                full_name: trimEmp, adhar_no: adhar_no, firm_id: firm_id,
            });

            if (existingEmployee && (!id || existingEmployee._id.toString() !== id)) {
                sendResponse(res, 400, false, {}, "Employee with the same full name, firm ID, and Aadhar number already exists");
                return;
            }
            const designationData = await Designation.findById(designation);
            const firmData = await Firm.findById(firm_id);
            if (!designationData) {
                sendResponse(res, 404, false, {}, "Designation not found");
                return;
            }
            if (!firmData) {
                sendResponse(res, 404, false, {}, "Firm not found");
                return
            }

            let lastEmployee = await Employee.findOne({}, {}, { sort: { 'import_id': -1 } });
            let employee_id = '1';
            // console.log(lastEmployee)
            if (lastEmployee && lastEmployee.employee_id) {
                const lastEmployeeId = parseInt(lastEmployee.employee_id);
                employee_id = `${lastEmployeeId + 1}`;
            }

            let import_id = '1';

            if (lastEmployee && lastEmployee.import_id) {
                const lastImportId = parseInt(lastEmployee.import_id);
                import_id = `${lastImportId + 1}`;
            }


            const empType = emp_type === 'undefined' ? null : emp_type;
            const empSkills = skills === 'undefined' ? null : skills;
            const shiftOne = shift === 'undefined' ? null : shift;
            const shiftTwo = shift_two === 'undefined' ? null : shift_two;

            const otherDocumentImages = JSON.parse(other_document_imgs || '[]');
            const parsedProjects = projects ? JSON.parse(projects) : [];
            const employee = new Employee({
                employee_id: employee_id,
                import_id: import_id,
                card_no: card_no,
                first_name: first_name,
                middle_name: middle_name,
                last_name: last_name,
                full_name: full_name,
                image: image,
                mobile_number: mobile_number,
                dob: dob,
                email: email ? email : '',
                gender: gender,
                designation: designation,
                adhar_no: adhar_no,
                pancard_no: pancard_no,
                address: address,
                address_two: address_two,
                address_three: address_three,
                state: state,
                city: city,
                pincode: pincode,
                same_address: same_address,
                pre_address: pre_address,
                pre_address_two: pre_address_two,
                pre_address_three: pre_address_three,
                pre_state: pre_state,
                pre_city: pre_city,
                pre_pincode: pre_pincode,
                shift: shiftOne,
                in_time: in_time,
                out_time: out_time,
                shift_two: shiftTwo,
                in_time_two: in_time_two,
                out_time_two: out_time_two,
                joining_date: joining_date,
                leaving_date: leaving_date || '',
                leaving_reason: leaving_reason,
                black_list: black_list,
                black_list_reason: black_list_reason,
                uan_no: uan_no,
                holiday: holiday,
                firm_id: firm_id,
                is_emergency: is_emergency,
                emergency_contact_number: emergency_contact_number ? emergency_contact_number : '',
                emergency_contact_person: emergency_contact_person,
                emergency_person_relation: emergency_person_relation,

                emergency_person_dob: emergency_person_dob ? emergency_person_dob : '',
                emergency_person_aadhar_number: emergency_person_aadhar_number ? emergency_person_aadhar_number : '',
                emergency_person_aadhar_photo: emergency_person_aadhar_photo ? emergency_person_aadhar_photo : '',
                education: education ? education : '',
                nationality: nationality ? nationality : '',
                emp_type: emp_type ? emp_type : null,
                skills: skills ? skills : null,
                esi_number: esi_number ? esi_number : 0,
                caste: caste,
                height: height ? height : 0,
                weight: weight ? weight : 0,
                blood_group: blood_group,
                passport_number: passport_number,
                pan_card_image: pan_card_image,
                aadhar_card_image: aadhar_card_image,
                other_document_imgs: otherDocumentImages,
                esic_ip: esic_ip,
                pf_no: pf_no,
                married_status: married_status,
                projects: parsedProjects,
            });


            if (!id) {
                try {
                    await employee.save(employee).then(data => {
                        sendResponse(res, 200, true, {}, "Employee added successfully");
                    }).catch(error => {
                        sendResponse(res, 400, false, {}, error.message);
                    })
                } catch (error) {
                    sendResponse(res, 500, false, {}, "Something went wrong");
                }
            } else {
                await Employee.findByIdAndUpdate(id, {
                    card_no: card_no,
                    first_name: first_name,
                    middle_name: middle_name,
                    last_name: last_name,
                    full_name: full_name,
                    image: image,
                    mobile_number: mobile_number,
                    dob: dob,
                    email: email,
                    gender: gender,
                    designation: designation,
                    adhar_no: adhar_no,
                    pancard_no: pancard_no,
                    address: address,
                    address_two: address_two,
                    address_three: address_three,
                    state: state,
                    city: city,
                    pincode: pincode,
                    same_address: same_address,
                    pre_address: pre_address,
                    pre_address_two: pre_address_two,
                    pre_address_three: pre_address_three,
                    pre_state: pre_state,
                    pre_city: pre_city,
                    pre_pincode: pre_pincode,
                    shift: shiftOne,
                    in_time: in_time,
                    out_time: out_time,
                    shift_two: shiftTwo,
                    in_time_two: in_time_two,
                    out_time_two: out_time_two,
                    joining_date: joining_date,
                    leaving_date: leaving_date || '',
                    leaving_reason: leaving_reason,
                    black_list: black_list,
                    black_list_reason: black_list_reason,
                    uan_no: uan_no,
                    holiday: holiday,
                    firm_id: firm_id,
                    is_emergency: is_emergency,
                    emergency_contact_number: emergency_contact_number !== "null" ? emergency_contact_number : null,
                    emergency_contact_person: emergency_contact_person,
                    emergency_person_relation: emergency_person_relation,
                    pan_card_image: pan_card_image,
                    aadhar_card_image: aadhar_card_image,
                    emergency_person_dob: emergency_person_dob ? emergency_person_dob : '',
                    emergency_person_aadhar_number: emergency_person_aadhar_number ? emergency_person_aadhar_number : '',
                    emergency_person_aadhar_photo: emergency_person_aadhar_photo ? emergency_person_aadhar_photo : '',
                    education: education ? education : '',
                    nationality: nationality ? nationality : '',
                    emp_type: empType,
                    skills: empSkills,
                    esi_number: esi_number ? esi_number : 0,
                    caste: caste ? caste : '',
                    height: height ? height : '',
                    weight: weight ? weight : 0,
                    blood_group: blood_group ? blood_group : '',
                    passport_number: passport_number ? passport_number : '',
                    other_document_imgs: otherDocumentImages,
                    esic_ip: esic_ip,
                    pf_no: pf_no,
                    married_status: married_status,
                    status: status,
                    projects: parsedProjects,
                }).then(data => {
                    if (data) {
                        sendResponse(res, 200, true, {}, "Employee updated successfully")
                    } else {
                        sendResponse(res, 404, false, {}, "Employee not found")
                    }
                }).catch(error => {
                    sendResponse(res, 400, false, {}, error.message);
                })
            }
        } else {
            sendResponse(res, 400, false, {}, "Missing parameters");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.deleteEmployee = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            const inUse = await Salary.findOne({ employee: id, deleted: false });
            if (inUse) {
                sendResponse(res, 400, false, {}, "Cannot delete employee. It is in use by salary.");
                return;
            }
            await Employee.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Employee deleted successfully")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.EmployeeReport = async (req, res) => {
    if (req.user && !req.error) {
        let { firm_id, year_id, month, employee } = req.body;
        month = parseInt(month);
        if (req.user) {
            try {
                if (firm_id && year_id && month) {
                    let myArray = [];
                    let employeeIds = employee;

                    if (typeof employee === 'string') {
                        employeeIds = JSON.parse(employee);
                    }

                    if (employeeIds?.length > 0) {
                        const employee_id_arr = employeeIds.map(o => new mongoose.Types.ObjectId(o.id))

                        let employeeInfo = await Employee.aggregate(
                            [
                                {
                                    $match: { $and: [{ _id: { $in: [...employee_id_arr] } }] }
                                },
                                {
                                    $lookup: {
                                        from: "monthly-attendances",
                                        let: { emp: "$_id", yea_id: new mongoose.Types.ObjectId(year_id), mont: month },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: {
                                                        $and:
                                                            [
                                                                { $eq: ["$employee", "$$emp"] },
                                                                { $eq: ["$month", "$$mont"] },
                                                                { $eq: ["$year_id", "$$yea_id"] },
                                                            ]
                                                    }
                                                }
                                            }, {
                                                $project: { month: 1, present_day: 1, ot_day: 1, ot_hour: 1 }
                                            }
                                        ],
                                        as: "monthlyAttendenceDetails"
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "daily-attendances",
                                        let: { emp: "$_id", yea_id: new mongoose.Types.ObjectId(year_id), mont: month },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: { $and: [{ $eq: ["$employee", "$$emp"] }, { $eq: ["$year_id", "$$yea_id"] }, { $eq: ["$month", "$$mont"] }] } // Lookup for department
                                                }
                                            },
                                            {
                                                $project: { month: 1, present_day: 1, ot_hour: 1 }
                                            },
                                            {
                                                $group: {
                                                    _id: null,
                                                    totalPresentDays: { $sum: "$present_day" },
                                                    totalOTHour: { $sum: "$ot_hour" }
                                                }
                                            },
                                            {
                                                $project: {
                                                    _id: null,
                                                    TotalPresentDays: { $sum: "$present_day" },
                                                    totalOTHour: { $sum: "$ot_hour" }
                                                }
                                            }
                                        ],
                                        as: "dailyAttendenceDetails"
                                    }
                                },
                                {
                                    $addFields: {
                                        OtHour: {
                                            $cond: {
                                                if: { $gt: [{ $size: "$monthlyAttendenceDetails" }, 0] },
                                                then: { $arrayElemAt: ["$monthlyAttendenceDetails.ot_hour", 0] },
                                                else: 0
                                            }
                                        },
                                        OtDay: {
                                            $cond: {
                                                if: { $gt: [{ $size: "$monthlyAttendenceDetails" }, 0] },
                                                then: { $arrayElemAt: ["$monthlyAttendenceDetails.ot_day", 0] },
                                                else: 0
                                            }
                                        },
                                        totalPresentDays: {
                                            $cond: {
                                                if: { $gt: [{ $size: "$monthlyAttendenceDetails" }, 0] },
                                                then: { $arrayElemAt: ["$monthlyAttendenceDetails.present_day", 0] },
                                                else: 0
                                            }
                                        }
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "salaries",
                                        let: { employeeid: "$_id", fir_id: new mongoose.Types.ObjectId(firm_id), yea_id: new mongoose.Types.ObjectId(year_id), mont: month, },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: {
                                                        $and: [
                                                            { $eq: ["$month", "$$mont"] },
                                                            { $eq: ["$employee", "$$employeeid"] },
                                                            { $eq: ["$year_id", "$$yea_id"] },
                                                            { $eq: ["$firm_id", "$$fir_id"] },
                                                        ]
                                                    }

                                                }
                                            },
                                            {
                                                $sort: { createdAt: -1 }
                                            },
                                            {
                                                $project: {
                                                    createdAt: 0, updatedAt: 0, remark: 0, firm_id: 0, year_id: 0, month: 0,
                                                }
                                            }
                                        ],
                                        as: "salaryData"
                                    }
                                },
                                {
                                    $addFields: {
                                        salaryData: {
                                            $cond: {
                                                if: { $gt: [{ $size: "$salaryData" }, 0] },
                                                then: { $arrayElemAt: ["$salaryData", 0] },
                                                else: {}
                                            }
                                        }
                                    }
                                },
                                {

                                    $addFields: {
                                        dailyAttOTD: {
                                            $cond: {
                                                if: { $gt: [{ $size: "$dailyAttendenceDetails" }, 0] },
                                                then: { $divide: [{ $arrayElemAt: ["$dailyAttendenceDetails.totalOTHour", 0] }, "$salaryData.working_hour"] },
                                                else: 0
                                            }
                                        },
                                        dailyAttTotalPresentDays: {
                                            $cond: {
                                                if: { $gt: [{ $size: "$dailyAttendenceDetails" }, 0] },
                                                then: { $arrayElemAt: ["$dailyAttendenceDetails.TotalPresentDays", 0] },
                                                else: 0
                                            }
                                        },
                                    },
                                },
                                {
                                    $addFields: {
                                        dailyAttOTH: {
                                            $cond: {
                                                if: { $gt: [{ $size: "$dailyAttendenceDetails" }, 0] },
                                                then: { $arrayElemAt: ["$dailyAttendenceDetails.totalOTHour", 0] },
                                                else: 0
                                            }
                                        },
                                    }
                                },
                                {
                                    $addFields: {
                                        total_present_Day: {
                                            $cond: {
                                                if: { $gt: [{ $size: "$monthlyAttendenceDetails" }, 0] },
                                                then: "$totalPresentDays",
                                                else: "$dailyAttTotalPresentDays"
                                            }
                                        },
                                        total_ot_Day: {
                                            $cond: {
                                                if: { $gt: [{ $size: "$monthlyAttendenceDetails" }, 0] },
                                                then: "$OtDay",
                                                else: "$dailyAttOTD"
                                            }
                                        },
                                        total_ot_hour: {
                                            $cond: {
                                                if: { $gt: [{ $size: "$monthlyAttendenceDetails" }, 0] },
                                                then: "$OtHour",
                                                else: "$dailyAttOTH"
                                            }
                                        },
                                        total_days: {
                                            $cond: {
                                                if: { $gt: [{ $size: "$monthlyAttendenceDetails" }, 0] },
                                                then: { $sum: ["$OtDay", "$totalPresentDays"] },
                                                else: { $sum: ["$dailyAttOTD", "$dailyAttTotalPresentDays"] }
                                            }
                                        },
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "banks",
                                        let: { bankName: "$salaryData.bank_name" },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: { $eq: ["$_id", "$$bankName"] }
                                                }
                                            },
                                            {
                                                $project: { name: 1, _id: 1 }
                                            },
                                        ],
                                        as: "bankDetails"
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "departments",
                                        let: { departmentName: "$salaryData.department" },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: { $eq: ["$_id", "$$departmentName"] }
                                                }
                                            },
                                            {
                                                $project: { name: 1, _id: 1 }
                                            }
                                        ],
                                        as: "departmentDetails"
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "workdays",
                                        let: { wd: "$salaryData.work_day_id" },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: { $eq: ["$_id", "$$wd"] }
                                                }
                                            },
                                            {
                                                $project: { working_hour: 1, basic: 1, lwf: 1, _id: 0 }
                                            }
                                        ],
                                        as: "workDayDetails"
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "designations",
                                        let: { name: "$designation" },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: { $eq: ["$_id", "$$name"] }
                                                }
                                            },
                                            {
                                                $project: { name: 1, _id: 1 }
                                            }
                                        ],
                                        as: "designationDetails"
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "shifts",
                                        let: { name: "$shift" },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: { $eq: ["$_id", "$$name"] }
                                                }
                                            },
                                            {
                                                $project: { name: 1, _id: 1 }
                                            }
                                        ],
                                        as: "shiftDetails"
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "shifts",
                                        let: { name: "$shift_two" },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: { $eq: ["$_id", "$$name"] }
                                                }
                                            },
                                            {
                                                $project: { name: 1, _id: 1 }
                                            }
                                        ],
                                        as: "shiftTwoDetails"
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "firms",
                                        let: { name: "$firm_id" },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: { $eq: ["$_id", "$$name"] }
                                                }
                                            },
                                            {
                                                $project: { name: 1, _id: 1 }
                                            }
                                        ],
                                        as: "firmDetails"
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "deductions",
                                        let: { emp: "$_id", yea_id: new mongoose.Types.ObjectId(year_id), month },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: { $and: [{ $eq: ["$employee", "$$emp"] }, { $eq: ["$year_id", "$$yea_id"] }, { $eq: ["$month", "$$month"] }] },
                                                    type: { $not: { $regex: "loan", $options: "i" } }
                                                }
                                            },
                                            {
                                                $project: { amount: 1 }
                                            },
                                            {
                                                $group: {
                                                    _id: null,
                                                    other_deductions: { $sum: "$amount" },
                                                }
                                            },
                                        ],
                                        as: "otherDeducts"
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "deductions",
                                        let: { emp: "$_id", yea_id: new mongoose.Types.ObjectId(year_id), month },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: { $and: [{ $eq: ["$employee", "$$emp"] }, { $eq: ["$year_id", "$$yea_id"] }, { $eq: ["$month", "$$month"] }] },
                                                    type: { $regex: "loan", $options: "i" }
                                                }
                                            },
                                            {
                                                $project: { amount: 1 }
                                            },
                                            {
                                                $group: {
                                                    _id: null,
                                                    loan_deductions: { $sum: "$amount" },
                                                }
                                            },
                                        ],
                                        as: "loanDeducts"
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "earnings",
                                        let: { emp: "$_id", yea_id: new mongoose.Types.ObjectId(year_id), month },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: { $and: [{ $eq: ["$employee", "$$emp"] }, { $eq: ["$year_id", "$$yea_id"] }, { $eq: ["$month", "$$month"] }] },
                                                }
                                            },
                                            {
                                                $project: { amount: 1 }
                                            },
                                            {
                                                $group: {
                                                    _id: null,
                                                    earnings: { $sum: "$amount" },
                                                }
                                            },
                                        ],
                                        as: "earns"
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "earnings",
                                        let: { emp: "$_id", yea_id: new mongoose.Types.ObjectId(year_id), month, tpe: "Sunday_Present" },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: { $and: [{ $eq: ["$employee", "$$emp"] }, { $eq: ["$year_id", "$$yea_id"] }, { $eq: ["$month", "$$month"] }, { $eq: ["$type", "$$tpe"] }] },
                                                }
                                            },
                                            {
                                                $project: { amount: 1 }
                                            },
                                            {
                                                $group: {
                                                    _id: null,
                                                    earnings: { $sum: "$amount" },
                                                }
                                            },
                                        ],
                                        as: "sunday_earns"
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "earnings",
                                        let: { emp: "$_id", yea_id: new mongoose.Types.ObjectId(year_id), month, tpe: "Full_Night_Present" },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: { $and: [{ $eq: ["$employee", "$$emp"] }, { $eq: ["$year_id", "$$yea_id"] }, { $eq: ["$month", "$$month"] }, { $eq: ["$type", "$$tpe"] }] },
                                                }
                                            },
                                            {
                                                $project: { amount: 1 }
                                            },
                                            {
                                                $group: {
                                                    _id: null,
                                                    earnings: { $sum: "$amount" },
                                                }
                                            },
                                        ],
                                        as: "full_night_earns"
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "earnings",
                                        let: { emp: "$_id", yea_id: new mongoose.Types.ObjectId(year_id), month, tpe: "Bonus" },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: { $and: [{ $eq: ["$employee", "$$emp"] }, { $eq: ["$year_id", "$$yea_id"] }, { $eq: ["$month", "$$month"] }, { $eq: ["$type", "$$tpe"] }] },
                                                }
                                            },
                                            {
                                                $project: { amount: 1 }
                                            },
                                            {
                                                $group: {
                                                    _id: null,
                                                    earnings: { $sum: "$amount" },
                                                }
                                            },
                                        ],
                                        as: "bonus_earns"
                                    }
                                },
                                {
                                    $addFields: {
                                        total_extra_earning: {
                                            $cond: {
                                                if:
                                                {
                                                    $gt: [{ $size: "$earns" }, 0]
                                                },
                                                then: { $arrayElemAt: ["$earns.earnings", 0] },
                                                else: 0
                                            }
                                        },
                                        total_sunday_earning: {
                                            $cond: {
                                                if:
                                                {
                                                    $gt: [{ $size: "$sunday_earns" }, 0]
                                                },
                                                then: { $arrayElemAt: ["$sunday_earns.earnings", 0] },
                                                else: 0
                                            }
                                        },
                                        total_full_night_earning: {
                                            $cond: {
                                                if:
                                                {
                                                    $gt: [{ $size: "$full_night_earns" }, 0]
                                                },
                                                then: { $arrayElemAt: ["$full_night_earns.earnings", 0] },
                                                else: 0
                                            }
                                        },
                                        total_bonus_earning: {
                                            $cond: {
                                                if:
                                                {
                                                    $gt: [{ $size: "$bonus_earns" }, 0]
                                                },
                                                then: { $arrayElemAt: ["$bonus_earns.earnings", 0] },
                                                else: 0
                                            }
                                        },
                                        total_other_deduction: {
                                            $cond: {
                                                if:
                                                {
                                                    $gt: [{ $size: "$otherDeducts" }, 0]
                                                },
                                                then: { $arrayElemAt: ["$otherDeducts.other_deductions", 0] },
                                                else: 0
                                            }
                                        },
                                        loan_deduction: {
                                            $cond: {
                                                if:
                                                {
                                                    $gt: [{ $size: "$loanDeducts" }, 0]
                                                },
                                                then: { $arrayElemAt: ["$loanDeducts.loan_deductions", 0] },
                                                else: 0
                                            }
                                        },
                                    }
                                },
                                {
                                    $group: {
                                        _id: "$departmentDetails",
                                        data: {
                                            $push: {
                                                adhar_no: "$adhar_no",
                                                employee_id: "$employee_id",
                                                year_id: year_id,
                                                month: month,
                                                name: "$full_name",
                                                full_name: "$full_name",
                                                father_name: "$middle_name",
                                                joining_date: "$joining_date",
                                                dob: "$dob",
                                                mobile_number: "$mobile_number",
                                                uan_no: "$uan_no",
                                                joining_date: "$joining_date",
                                                card_no: "$card_no",
                                                salaryData: "$salaryData",
                                                firm_id: { $arrayElemAt: ["$firmDetails", 0] },
                                                shift: { $arrayElemAt: ["$shiftDetails", 0] },
                                                designation: { $arrayElemAt: ["$designationDetails", 0] },
                                                shift_two: { $arrayElemAt: ["$shiftTwoDetails", 0] },
                                                bank_name: { $arrayElemAt: ["$bankDetails", 0] },
                                                department: { $arrayElemAt: ["$departmentDetails", 0] },
                                                bank_account_no: "$salaryData.bank_account_no",
                                                bank_account_ifsc: "$salaryData.bank_account_ifsc",
                                                is_stop_salary: "$salaryData.is_stop_salary",
                                                working_hour: "$salaryData.working_hour",
                                                total_salary: "$salaryData.total_salary",
                                                perday_salary: "$salaryData.perday_salary",
                                                working_day: "$salaryData.working_day",
                                                basic_salary: "$salaryData.basic",
                                                hra_salary: "$salaryData.hra",
                                                conveyance_allowance_salary: "$salaryData.conveyance_allowance",
                                                medical_allowance_salary: "$salaryData.medical_allowance",
                                                other_salary: "$salaryData.other",
                                                tds: "$salaryData.tds",
                                                per_hour_ot_salary: "$salaryData.perhour_ot_salary",
                                                lwf: { $arrayElemAt: ["$workDayDetails.lwf", 0] },
                                                loan_deduction: "$loan_deduction",
                                                total_other_deduction: "$total_other_deduction",
                                                total_extra_earning: "$total_extra_earning",
                                                total_bonus_earning: "$total_bonus_earning",
                                                total_full_night_earning: "$total_full_night_earning",
                                                total_sunday_earning: "$total_sunday_earning",
                                                total_present_Day: "$total_present_Day",
                                                total_ot_Day: "$total_ot_Day",
                                                total_ot_hour: "$total_ot_hour",
                                                total_days: "$total_days"
                                            }
                                        },
                                        working_hour: { $sum: "$salaryData.working_hour" },
                                        total_salary: { $sum: "$salaryData.total_salary" },
                                        perday_salary: { $sum: "$salaryData.perday_salary" },
                                        working_day: { $sum: "$salaryData.working_day" },
                                        basic_salary: { $sum: "$salaryData.basic" },
                                        hra_salary: { $sum: "$salaryData.hra" },
                                        conveyance_allowance_salary: { $sum: "$salaryData.conveyance_allowance" },
                                        medical_allowance_salary: { $sum: "$salaryData.medical_allowance" },
                                        other_salary: { $sum: "$salaryData.other" },
                                        tds: { $sum: "$salaryData.tds" },
                                        per_hour_ot_salary: { $sum: "$salaryData.perhour_ot_salary" },
                                        lwf: { $sum: { $arrayElemAt: ["$workDayDetails.lwf", 0] } },
                                        loan_deduction: { $sum: "$loan_deduction" },
                                        total_other_deduction: { $sum: "$total_other_deduction" },
                                        total_extra_earning: { $sum: "$total_extra_earning" },
                                        total_bonus_earning: { $sum: "$total_bonus_earning" },
                                        total_full_night_earning: { $sum: "$total_full_night_earning" },
                                        total_sunday_earning: { $sum: "$total_sunday_earning" },
                                        total_present_Day: { $sum: "$total_present_Day" },
                                        total_ot_Day: { $sum: "$total_ot_Day" },
                                        total_ot_hour: { $sum: "$total_ot_hour" },
                                        total_days: { $sum: "$total_days" }
                                        // total_working_day:{
                                        //     $sum:"$salaryData.working_day"

                                        // },         
                                        // total_working_hours:{
                                        //     $sum:"$salaryData.working_day"

                                        // }         

                                    }
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        department: { $arrayElemAt: ["$_id", 0] },
                                        data: 1,
                                        working_hour: 1,
                                        total_salary: 1,
                                        perday_salary: 1,
                                        working_day: 1,
                                        basic_salary: 1,
                                        hra_salary: 1,
                                        conveyance_allowance_salary: 1,
                                        medical_allowance_salary: 1,
                                        other_salary: 1,
                                        tds: 1,
                                        per_hour_ot_salary: 1,
                                        lwf: 1,
                                        loan_deduction: 1,
                                        total_other_deduction: 1,
                                        total_extra_earning: 1,
                                        total_bonus_earning: 1,
                                        total_full_night_earning: 1,
                                        total_sunday_earning: 1,
                                        total_present_Day: 1,
                                        total_ot_Day: 1,
                                        total_ot_hour: 1,
                                        total_days: 1,
                                    }
                                }
                            ])
                        // return res.send(employeeInfo)
                        let aa = []
                        let ss = []
                        let final_working_hour = 0
                        let final_total_salary = 0
                        let final_perday_salary = 0
                        let final_working_day = 0
                        let final_basic_salary = 0
                        let final_hra_salary = 0
                        let final_conveyance_allowance_salary = 0
                        let final_medical_allowance_salary = 0
                        let final_other_salary = 0
                        let final_tds = 0
                        let final_per_hour_ot_salary = 0
                        let final_lwf = 0
                        let final_loan_deduction = 0
                        let final_total_other_deduction = 0
                        let final_total_extra_earning = 0
                        let final_total_bonus_earning = 0
                        let final_total_full_night_earning = 0
                        let final_total_sunday_earning = 0
                        let final_total_present_Day = 0
                        let final_total_ot_Day = 0
                        let final_total_ot_hour = 0
                        let final_total_days = 0
                        let final_tot_esi = 0
                        let final_tot_pf = 0
                        let final_tot_presD_sal = 0
                        let final_tot_ot_sal = 0
                        let final_tot_gross_sal = 0
                        let final_tot_pt = 0
                        let final_tot_ex_net_sal = 0
                        let final_tot_ded = 0
                        let final_tot_net_salary = 0
                        let final_tot_net_diff = 0


                        for (let i = 0; i <= employeeInfo.length - 1; i++) {
                            let tot_esi = 0;
                            let tot_pf = 0;
                            let tot_presD_sal = 0;
                            let tot_ot_sal = 0;
                            let tot_gross_sal = 0;
                            let tot_pt = 0;
                            let tot_ex_net_sal = 0;
                            let tot_ded = 0;
                            let tot_net_salary = 0;
                            let tot_net_diff = 0;

                            const array = await employeeInfo[i].data.map(async o => {
                                let basic_salary = o.salaryData.basic;
                                let pf_amount = 0;
                                if (o.salaryData.is_pf) {
                                    let max_salary = 15000;
                                    pf_amount = basic_salary / o.salaryData.working_day;
                                    pf_amount = pf_amount * (o.total_present_Day + o.total_ot_Day);
                                    if (pf_amount > max_salary) {
                                        pf_amount = max_salary * 12;
                                        pf_amount = Math.round(pf_amount / 100)
                                    } else {
                                        pf_amount = pf_amount * 12;
                                        pf_amount = Math.round(pf_amount / 100)
                                    }
                                }
                                let pf = pf_amount
                                tot_pf += pf
                                let present_day_salary = Math.round(o.total_present_Day * o.perday_salary)
                                tot_presD_sal += present_day_salary
                                let ot_salary = Math.round(o.total_ot_hour * o.per_hour_ot_salary)
                                tot_ot_sal += ot_salary
                                // let gross_salary = (present_day_salary + ot_salary + o.total_extra_earning + o.total_sunday_earning+ o.total_full_night_earning+ o.total_bonus_earning)
                                let gross_salary = (present_day_salary + ot_salary + o.total_extra_earning)
                                tot_gross_sal += gross_salary
                                let esi = o.salaryData.is_esi ? (Math.ceil(gross_salary * 0.075)) : 0;
                                tot_esi += esi
                                let pt = o.salaryData.is_pt ? (gross_salary > 12000 ? 200 : 0) : 0;
                                tot_pt += pt
                                let excel_net_salary = o.salaryData.excel_net_salary !== '' ? Math.round(o.salaryData.excel_net_salary) : 0
                                tot_ex_net_sal += excel_net_salary
                                let total_deduction = (o.total_other_deduction + o.loan_deduction + pf + esi + pt + o.tds + o.lwf);
                                tot_ded += total_deduction
                                let net_salary = gross_salary - total_deduction;
                                tot_net_salary += net_salary
                                // let net_difference = Math.round(o.salaryData.excel_net_salary !== '' ? o.salaryData.excel_net_salary : 0 - (gross_salary - total_deduction));
                                let net_difference = Math.round(o.salaryData.excel_net_salary - (gross_salary - total_deduction));
                                tot_net_diff += net_difference
                                let obj = {
                                    ...o,
                                    month: parseInt(month, 0),
                                    total_ot_Day: parseFloat(o.total_ot_Day),
                                    total_days: parseFloat(o.total_days),
                                    pf,
                                    present_day_salary,
                                    ot_salary,
                                    gross_salary,
                                    esi,
                                    pt,
                                    excel_net_salary,
                                    total_deduction,
                                    net_salary,
                                    net_difference,
                                }
                                if (o.total_present_Day >= 0) {
                                    await SalaryReport.findOneAndUpdate({ employee_id: o.employee_id, month, year_id }, { ...obj }, { upsert: true })
                                    return { ...obj }
                                }
                                return null
                            }
                            )
                            const sal_arr = await (await Promise.allSettled(array)).map(o => o.value).filter(o => o !== null)
                            aa = [...aa, ...sal_arr]
                            ss.push({
                                ...employeeInfo[i], data: [...aa],
                                tot_esi,
                                tot_pf,
                                tot_presD_sal,
                                tot_ot_sal,
                                tot_gross_sal,
                                tot_pt,
                                tot_ex_net_sal,
                                tot_ded,
                                tot_net_salary,
                                tot_net_diff,
                            })
                            final_working_hour += employeeInfo[i].working_hour
                            final_total_salary += employeeInfo[i].total_salary
                            final_perday_salary += employeeInfo[i].perday_salary
                            final_working_day += employeeInfo[i].working_day
                            final_basic_salary += employeeInfo[i].basic_salary
                            final_hra_salary += employeeInfo[i].hra_salary
                            final_conveyance_allowance_salary += employeeInfo[i].conveyance_allowance_salary
                            final_medical_allowance_salary += employeeInfo[i].medical_allowance_salary
                            final_other_salary += employeeInfo[i].other_salary
                            final_tds += employeeInfo[i].tds
                            final_per_hour_ot_salary += employeeInfo[i].per_hour_ot_salary
                            final_lwf += employeeInfo[i].lwf
                            final_loan_deduction += employeeInfo[i].loan_deduction
                            final_total_other_deduction += employeeInfo[i].total_other_deduction
                            final_total_extra_earning += employeeInfo[i].total_extra_earning
                            final_total_bonus_earning += employeeInfo[i].total_bonus_earning
                            final_total_full_night_earning += employeeInfo[i].total_full_night_earning
                            final_total_sunday_earning += employeeInfo[i].total_sunday_earning
                            final_total_present_Day += employeeInfo[i].total_present_Day
                            final_total_ot_Day += employeeInfo[i].total_ot_Day
                            final_total_ot_hour += employeeInfo[i].total_ot_hour
                            final_total_days += employeeInfo[i].total_days
                            final_tot_esi += tot_esi
                            final_tot_pf += tot_pf
                            final_tot_presD_sal += tot_presD_sal
                            final_tot_ot_sal += tot_ot_sal
                            final_tot_gross_sal += tot_gross_sal
                            final_tot_pt += tot_pt
                            final_tot_ex_net_sal += tot_ex_net_sal
                            final_tot_ded += tot_ded
                            final_tot_net_salary += tot_net_salary
                            final_tot_net_diff += tot_net_diff



                        }
                        const net_total = {
                            final_working_hour,
                            final_total_salary,
                            final_perday_salary,
                            final_working_day,
                            final_basic_salary,
                            final_hra_salary,
                            final_conveyance_allowance_salary,
                            final_medical_allowance_salary,
                            final_other_salary,
                            final_tds,
                            final_per_hour_ot_salary,
                            final_lwf,
                            final_loan_deduction,
                            final_total_other_deduction,
                            final_total_extra_earning,
                            final_total_bonus_earning,
                            final_total_full_night_earning,
                            final_total_sunday_earning,
                            final_total_present_Day,
                            final_total_ot_Day,
                            final_total_ot_hour,
                            final_total_days,
                            final_tot_esi,
                            final_tot_pf,
                            final_tot_presD_sal,
                            final_tot_ot_sal,
                            final_tot_gross_sal,
                            final_tot_pt,
                            final_tot_ex_net_sal,
                            final_tot_ded,
                            final_tot_net_salary,
                            final_tot_net_diff,
                        }
                        sendResponse(res, 200, true, { data: ss, net_total: net_total }, "Data found successfully.")
                    }
                } else {
                    sendResponse(res, 400, false, {}, "Missing parameters");
                }
            } catch (error) {
                console.log(error)
                sendResponse(res, 500, false, {}, "Something went wrong")
            }
        } else {
            sendResponse(res, 401, false, {}, "Unauthorized")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}


// Date 19-03-2025
// Add employee info, daily attendace types, count the Bonus value and added in Gross Salary
// count the mess, advance and penalty deduction
// In salary report, do not add project filter and fields in future
exports.EmployeeDailyReport = async (req, res) => {
    if (req.user && !req.error) {
        let { firm_id, year_id, month, employee } = req.body;
        month = parseInt(month);
        if (req.user) {
            try {
                if (firm_id && year_id && month) {
                    let myArray = [];
                    let employeeIds = employee;

                    if (typeof employee === 'string') {
                        employeeIds = JSON.parse(employee);
                    }

                    if (employeeIds?.length > 0) {
                        const employee_id_arr = employeeIds.map(o => new mongoose.Types.ObjectId(o.id))

                        let employeeInfo = await Employee.aggregate(
                            [
                                {
                                    $match: { $and: [{ _id: { $in: [...employee_id_arr] } }] }
                                },
                                {
                                    $lookup: {
                                        from: "daily-attendances",
                                        let: { emp: "$_id", yea_id: new mongoose.Types.ObjectId(year_id), mont: month },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: {
                                                        $and: [
                                                            { $eq: ["$employee", "$$emp"] },
                                                            { $eq: ["$year_id", "$$yea_id"] },
                                                            { $eq: ["$month", "$$mont"] }
                                                        ]
                                                    }
                                                }
                                            },
                                            {
                                                $project: { month: 1, present_day: 1, ot_hour: 1, sunday_present: 1, full_night_present: 1, holiday_present: 1, sum_Apchar: 1 }
                                            }
                                        ],
                                        as: "dailyAttendenceDetails"
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "daily-attendances",
                                        let: { emp: "$_id", yea_id: new mongoose.Types.ObjectId(year_id), mont: month },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: {
                                                        $and: [
                                                            { $eq: ["$employee", "$$emp"] },
                                                            { $eq: ["$year_id", "$$yea_id"] },
                                                            { $eq: ["$month", "$$mont"] }
                                                        ]
                                                    }
                                                }
                                            },
                                            {
                                                $group: {
                                                    _id: "$sum_Apchar",
                                                    count: { $sum: 1 }
                                                }
                                            }
                                        ],
                                        as: "sumApcharCounts"
                                    }
                                },
                                {
                                    $addFields: {
                                        totalPresentDays: {
                                            $sum: "$dailyAttendenceDetails.present_day"
                                        },
                                        totalOtHours: {
                                            $sum: "$dailyAttendenceDetails.ot_hour"
                                        },
                                        totalSundayPresents: {
                                            $sum: "$dailyAttendenceDetails.sunday_present"
                                        },
                                        totalFullNightPresents: {
                                            $sum: "$dailyAttendenceDetails.full_night_present"
                                        },
                                        totalHolidayPresents: {
                                            $sum: "$dailyAttendenceDetails.holiday_present"
                                        },
                                    }
                                },
                                {
                                    $addFields: {
                                        totalP: {
                                            $ifNull: [
                                                { $sum: { $map: { input: "$sumApcharCounts", as: "item", in: { $cond: [{ $eq: ["$$item._id", "P"] }, "$$item.count", 0] } } } },
                                                0
                                            ]
                                        },
                                        totalFN: {
                                            $ifNull: [
                                                { $sum: { $map: { input: "$sumApcharCounts", as: "item", in: { $cond: [{ $eq: ["$$item._id", "FN"] }, "$$item.count", 0] } } } },
                                                0
                                            ]
                                        },
                                        totalSP: {
                                            $ifNull: [
                                                { $sum: { $map: { input: "$sumApcharCounts", as: "item", in: { $cond: [{ $eq: ["$$item._id", "SP"] }, "$$item.count", 0] } } } },
                                                0
                                            ]
                                        },
                                        totalH: {
                                            $ifNull: [
                                                { $sum: { $map: { input: "$sumApcharCounts", as: "item", in: { $cond: [{ $eq: ["$$item._id", "H"] }, "$$item.count", 0] } } } },
                                                0
                                            ]
                                        },
                                        totalCL: {
                                            $ifNull: [
                                                { $sum: { $map: { input: "$sumApcharCounts", as: "item", in: { $cond: [{ $eq: ["$$item._id", "CL"] }, "$$item.count", 0] } } } },
                                                0
                                            ]
                                        },
                                        totalPFN: {
                                            $ifNull: [
                                                { $sum: { $map: { input: "$sumApcharCounts", as: "item", in: { $cond: [{ $eq: ["$$item._id", "PFN"] }, "$$item.count", 0] } } } },
                                                0
                                            ]
                                        }
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "salaries",
                                        let: { employeeid: "$_id", fir_id: new mongoose.Types.ObjectId(firm_id), yea_id: new mongoose.Types.ObjectId(year_id), mont: month, },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: {
                                                        $and: [
                                                            { $eq: ["$month", "$$mont"] },
                                                            { $eq: ["$employee", "$$employeeid"] },
                                                            { $eq: ["$year_id", "$$yea_id"] },
                                                            { $eq: ["$firm_id", "$$fir_id"] },
                                                        ]
                                                    }

                                                }
                                            },
                                            {
                                                $sort: { createdAt: -1 }
                                            },
                                            {
                                                $project: {
                                                    createdAt: 0, updatedAt: 0, remark: 0, firm_id: 0, year_id: 0, month: 0,
                                                }
                                            }
                                        ],
                                        as: "salaryData"
                                    }
                                },
                                {
                                    $addFields: {
                                        salaryData: {
                                            $cond: {
                                                if: { $gt: [{ $size: "$salaryData" }, 0] },
                                                then: { $arrayElemAt: ["$salaryData", 0] },
                                                else: {}
                                            }
                                        }
                                    }
                                },
                                {
                                    $addFields: {
                                        dailyAttOTD: {
                                            $cond: {
                                                if: { $gt: [{ $size: "$dailyAttendenceDetails" }, 0] },
                                                then: {
                                                    $divide: [
                                                        { $sum: "$dailyAttendenceDetails.ot_hour" }, // Total OT Hours from attendance
                                                        { $ifNull: ["$salaryData.working_hour", 1] } // Prevent division by zero
                                                    ]
                                                },
                                                else: 0
                                            }
                                        },
                                        dailyAttTotalPresentDays: {
                                            $cond: {
                                                if: { $gt: [{ $size: "$dailyAttendenceDetails" }, 0] },
                                                then: { $sum: "$dailyAttendenceDetails.present_day" }, // Total present days
                                                else: 0
                                            }
                                        },
                                        dailyAttOTH: {
                                            $cond: {
                                                if: { $gt: [{ $size: "$dailyAttendenceDetails" }, 0] },
                                                then: { $sum: "$dailyAttendenceDetails.ot_hour" }, // Total OT Hours
                                                else: 0
                                            }
                                        }
                                    }
                                },
                                {
                                    $addFields: {
                                        total_present_Day: {
                                            $cond: {
                                                if: { $gt: [{ $size: "$dailyAttendenceDetails" }, 0] },
                                                then: "$totalPresentDays",
                                                else: 0
                                            }
                                        },
                                        total_sunday_presents: {
                                            $cond: {
                                                if: { $gt: [{ $size: "$dailyAttendenceDetails" }, 0] },
                                                then: "$totalSundayPresents",
                                                else: 0
                                            }
                                        },
                                        total_full_night_presents: {
                                            $cond: {
                                                if: { $gt: [{ $size: "$dailyAttendenceDetails" }, 0] },
                                                then: "$totalFullNightPresents",
                                                else: 0
                                            }
                                        },
                                        total_holiday_presents: {
                                            $cond: {
                                                if: { $gt: [{ $size: "$dailyAttendenceDetails" }, 0] },
                                                then: "$totalHolidayPresents",
                                                else: 0
                                            }
                                        },
                                        total_ot_Day: {
                                            $cond: {
                                                if: { $gt: [{ $size: "$dailyAttendenceDetails" }, 0] },
                                                then: "$dailyAttOTD",
                                                else: 0
                                            }
                                        },
                                        total_ot_hour: {
                                            $cond: {
                                                if: { $gt: [{ $size: "$dailyAttendenceDetails" }, 0] },
                                                then: "$dailyAttOTH",
                                                else: 0
                                            }
                                        },
                                        total_days: {
                                            $cond: {
                                                if: { $gt: [{ $size: "$dailyAttendenceDetails" }, 0] },
                                                then: { $sum: ["$dailyAttOTD", "$dailyAttTotalPresentDays"] },
                                                else: 0
                                            }
                                        },

                                    }
                                },
                                {
                                    $lookup: {
                                        from: "banks",
                                        let: { bankName: "$salaryData.bank_name" },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: { $eq: ["$_id", "$$bankName"] }
                                                }
                                            },
                                            {
                                                $project: { name: 1, _id: 1 }
                                            },
                                        ],
                                        as: "bankDetails"
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "departments",
                                        let: { departmentName: "$salaryData.department" },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: { $eq: ["$_id", "$$departmentName"] }
                                                }
                                            },
                                            {
                                                $project: { name: 1, _id: 1 }
                                            }
                                        ],
                                        as: "departmentDetails"
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "workdays",
                                        let: { wd: "$salaryData.work_day_id" },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: { $eq: ["$_id", "$$wd"] }
                                                }
                                            },
                                            {
                                                $project: { working_hour: 1, basic: 1, lwf: 1, _id: 0 }
                                            }
                                        ],
                                        as: "workDayDetails"
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "designations",
                                        let: { name: "$designation" },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: { $eq: ["$_id", "$$name"] }
                                                }
                                            },
                                            {
                                                $project: { name: 1, _id: 1 }
                                            }
                                        ],
                                        as: "designationDetails"
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "shifts",
                                        let: { name: "$shift" },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: { $eq: ["$_id", "$$name"] }
                                                }
                                            },
                                            {
                                                $project: { name: 1, _id: 1 }
                                            }
                                        ],
                                        as: "shiftDetails"
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "shifts",
                                        let: { name: "$shift_two" },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: { $eq: ["$_id", "$$name"] }
                                                }
                                            },
                                            {
                                                $project: { name: 1, _id: 1 }
                                            }
                                        ],
                                        as: "shiftTwoDetails"
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "firms",
                                        let: { name: "$firm_id" },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: { $eq: ["$_id", "$$name"] }
                                                }
                                            },
                                            {
                                                $project: { name: 1, _id: 1 }
                                            }
                                        ],
                                        as: "firmDetails"
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "deductions",
                                        let: { emp: "$_id", yea_id: new mongoose.Types.ObjectId(year_id), month },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: {
                                                        $and: [
                                                            { $eq: ["$employee", "$$emp"] },
                                                            { $eq: ["$year_id", "$$yea_id"] },
                                                            { $eq: ["$month", "$$month"] },
                                                        ],
                                                    },
                                                    type: { $not: { $regex: "loan", $options: "i" } },
                                                },
                                            },
                                            { $project: { amount: 1 } },
                                            {
                                                $group: {
                                                    _id: null,
                                                    other_deductions: { $sum: "$amount" },
                                                },
                                            },
                                        ],
                                        as: "otherDeducts",
                                    },
                                },
                                {
                                    $lookup: {
                                        from: "deductions",
                                        let: { emp: "$_id", yea_id: new mongoose.Types.ObjectId(year_id), month },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: {
                                                        $and: [
                                                            { $eq: ["$employee", "$$emp"] },
                                                            { $eq: ["$year_id", "$$yea_id"] },
                                                            { $eq: ["$month", "$$month"] },
                                                        ],
                                                    },
                                                    type: { $regex: "loan", $options: "i" },
                                                },
                                            },
                                            { $project: { amount: 1 } },
                                            {
                                                $group: {
                                                    _id: null,
                                                    loan_deductions: { $sum: "$amount" },
                                                },
                                            },
                                        ],
                                        as: "loanDeducts",
                                    },
                                },
                                {
                                    $lookup: {
                                        from: "deductions",
                                        let: { emp: "$_id", yea_id: new mongoose.Types.ObjectId(year_id), month },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: {
                                                        $and: [
                                                            { $eq: ["$employee", "$$emp"] },
                                                            { $eq: ["$year_id", "$$yea_id"] },
                                                            { $eq: ["$month", "$$month"] },
                                                        ],
                                                    },
                                                    type: { $regex: "mess", $options: "i" },
                                                },
                                            },
                                            { $project: { amount: 1 } },
                                            {
                                                $group: {
                                                    _id: null,
                                                    mess_deductions: { $sum: "$amount" },
                                                },
                                            },
                                        ],
                                        as: "messDeducts",
                                    },
                                },
                                {
                                    $lookup: {
                                        from: "deductions",
                                        let: { emp: "$_id", yea_id: new mongoose.Types.ObjectId(year_id), month },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: {
                                                        $and: [
                                                            { $eq: ["$employee", "$$emp"] },
                                                            { $eq: ["$year_id", "$$yea_id"] },
                                                            { $eq: ["$month", "$$month"] },
                                                        ],
                                                    },
                                                    type: { $regex: "penalty", $options: "i" },
                                                },
                                            },
                                            { $project: { amount: 1 } },
                                            {
                                                $group: {
                                                    _id: null,
                                                    penalty_deductions: { $sum: "$amount" },
                                                },
                                            },
                                        ],
                                        as: "penaltyDeducts",
                                    },
                                },
                                {
                                    $lookup: {
                                        from: "deductions",
                                        let: { emp: "$_id", yea_id: new mongoose.Types.ObjectId(year_id), month },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: {
                                                        $and: [
                                                            { $eq: ["$employee", "$$emp"] },
                                                            { $eq: ["$year_id", "$$yea_id"] },
                                                            { $eq: ["$month", "$$month"] },
                                                        ],
                                                    },
                                                    type: { $regex: "advance", $options: "i" },
                                                },
                                            },
                                            { $project: { amount: 1 } },
                                            {
                                                $group: {
                                                    _id: null,
                                                    advance_deductions: { $sum: "$amount" },
                                                },
                                            },
                                        ],
                                        as: "advanceDeducts",
                                    },
                                },
                                {
                                    $lookup: {
                                        from: "earnings",
                                        let: { emp: "$_id", yea_id: new mongoose.Types.ObjectId(year_id), month },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: {
                                                        $and: [
                                                            { $eq: ["$employee", "$$emp"] },
                                                            { $eq: ["$year_id", "$$yea_id"] },
                                                            { $eq: ["$month", "$$month"] },
                                                        ],
                                                    },
                                                },
                                            },
                                            { $project: { amount: 1 } },
                                            {
                                                $group: {
                                                    _id: null,
                                                    earnings: { $sum: "$amount" },
                                                },
                                            },
                                        ],
                                        as: "earns",
                                    },
                                },
                                {
                                    $lookup: {
                                        from: "earnings",
                                        let: { emp: "$_id", yea_id: new mongoose.Types.ObjectId(year_id), month, tpe: "Sunday_Present" },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: {
                                                        $and: [
                                                            { $eq: ["$employee", "$$emp"] },
                                                            { $eq: ["$year_id", "$$yea_id"] },
                                                            { $eq: ["$month", "$$month"] },
                                                            { $eq: ["$type", "$$tpe"] },
                                                        ],
                                                    },
                                                },
                                            },
                                            { $project: { amount: 1 } },
                                            {
                                                $group: {
                                                    _id: null,
                                                    earnings: { $sum: "$amount" },
                                                },
                                            },
                                        ],
                                        as: "sunday_earns",
                                    },
                                },
                                {
                                    $lookup: {
                                        from: "earnings",
                                        let: { emp: "$_id", yea_id: new mongoose.Types.ObjectId(year_id), month, tpe: "Full_Night_Present" },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: {
                                                        $and: [
                                                            { $eq: ["$employee", "$$emp"] },
                                                            { $eq: ["$year_id", "$$yea_id"] },
                                                            { $eq: ["$month", "$$month"] },
                                                            { $eq: ["$type", "$$tpe"] },
                                                        ],
                                                    },
                                                },
                                            },
                                            { $project: { amount: 1 } },
                                            {
                                                $group: {
                                                    _id: null,
                                                    earnings: { $sum: "$amount" },
                                                },
                                            },
                                        ],
                                        as: "full_night_earns",
                                    },
                                },
                                {
                                    $lookup: {
                                        from: "earnings",
                                        let: { emp: "$_id", yea_id: new mongoose.Types.ObjectId(year_id), month, tpe: "Bonus" },
                                        pipeline: [
                                            {
                                                $match: {
                                                    deleted: false,
                                                    $expr: {
                                                        $and: [
                                                            { $eq: ["$employee", "$$emp"] },
                                                            { $eq: ["$year_id", "$$yea_id"] },
                                                            { $eq: ["$month", "$$month"] },
                                                            { $eq: ["$type", "$$tpe"] },
                                                        ],
                                                    },
                                                },
                                            },
                                            { $project: { amount: 1 } },
                                            {
                                                $group: {
                                                    _id: null,
                                                    earnings: { $sum: "$amount" },
                                                },
                                            },
                                        ],
                                        as: "bonus_earns",
                                    },
                                },
                                {
                                    $addFields: {
                                        total_extra_earning: {
                                            $cond: {
                                                if:
                                                {
                                                    $gt: [{ $size: "$earns" }, 0]
                                                },
                                                then: { $arrayElemAt: ["$earns.earnings", 0] },
                                                else: 0
                                            }
                                        },
                                        total_sunday_earning: {
                                            $cond: {
                                                if:
                                                {
                                                    $gt: [{ $size: "$sunday_earns" }, 0]
                                                },
                                                then: { $arrayElemAt: ["$sunday_earns.earnings", 0] },
                                                else: 0
                                            }
                                        },
                                        total_full_night_earning: {
                                            $cond: {
                                                if:
                                                {
                                                    $gt: [{ $size: "$full_night_earns" }, 0]
                                                },
                                                then: { $arrayElemAt: ["$full_night_earns.earnings", 0] },
                                                else: 0
                                            }
                                        },
                                        total_bonus_earning: {
                                            $cond: {
                                                if:
                                                {
                                                    $gt: [{ $size: "$bonus_earns" }, 0]
                                                },
                                                then: { $arrayElemAt: ["$bonus_earns.earnings", 0] },
                                                else: 0
                                            }
                                        },
                                        total_other_deduction: {
                                            $cond: {
                                                if:
                                                {
                                                    $gt: [{ $size: "$otherDeducts" }, 0]
                                                },
                                                then: { $arrayElemAt: ["$otherDeducts.other_deductions", 0] },
                                                else: 0
                                            }
                                        },
                                        loan_deduction: {
                                            $cond: {
                                                if:
                                                {
                                                    $gt: [{ $size: "$loanDeducts" }, 0]
                                                },
                                                then: { $arrayElemAt: ["$loanDeducts.loan_deductions", 0] },
                                                else: 0
                                            }
                                        },
                                        mess_deduction: {
                                            $cond: {
                                                if:
                                                {
                                                    $gt: [{ $size: "$messDeducts" }, 0]
                                                },
                                                then: { $arrayElemAt: ["$messDeducts.mess_deductions", 0] },
                                                else: 0
                                            }
                                        },
                                        penalty_deduction: {
                                            $cond: {
                                                if:
                                                {
                                                    $gt: [{ $size: "$penaltyDeducts" }, 0]
                                                },
                                                then: { $arrayElemAt: ["$penaltyDeducts.penalty_deductions", 0] },
                                                else: 0
                                            }
                                        },
                                        advance_deduction: {
                                            $cond: {
                                                if:
                                                {
                                                    $gt: [{ $size: "$advanceDeducts" }, 0]
                                                },
                                                then: { $arrayElemAt: ["$advanceDeducts.advance_deductions", 0] },
                                                else: 0
                                            }
                                        },
                                    }
                                },
                                {
                                    $group: {
                                        _id: "$departmentDetails",
                                        data: {
                                            $push: {
                                                adhar_no: "$adhar_no",
                                                employee_id: "$employee_id",
                                                year_id: year_id,
                                                employee: "$_id",
                                                month: month,
                                                name: "$full_name",
                                                full_name: "$full_name",
                                                father_name: "$middle_name",
                                                joining_date: "$joining_date",
                                                dob: "$dob",
                                                mobile_number: "$mobile_number",
                                                uan_no: "$uan_no",
                                                joining_date: "$joining_date",
                                                card_no: "$card_no",
                                                salaryData: "$salaryData",
                                                firm_id: { $arrayElemAt: ["$firmDetails", 0] },
                                                shift: { $arrayElemAt: ["$shiftDetails", 0] },
                                                designation: { $arrayElemAt: ["$designationDetails", 0] },
                                                shift_two: { $arrayElemAt: ["$shiftTwoDetails", 0] },
                                                bank_name: { $arrayElemAt: ["$bankDetails", 0] },
                                                department: { $arrayElemAt: ["$departmentDetails", 0] },
                                                bank_account_no: "$salaryData.bank_account_no",
                                                bank_account_ifsc: "$salaryData.bank_account_ifsc",
                                                salary_type: "$salaryData.salary_type",
                                                working_hour: "$salaryData.working_hour",
                                                total_salary: "$salaryData.total_salary",
                                                perday_salary: "$salaryData.perday_salary",
                                                working_day: "$salaryData.working_day",
                                                basic_salary: "$salaryData.basic",
                                                hra_salary: "$salaryData.hra",
                                                is_bonus: "$salaryData.is_bonus",
                                                conveyance_allowance_salary: "$salaryData.conveyance_allowance",
                                                medical_allowance_salary: "$salaryData.medical_allowance",
                                                other_salary: "$salaryData.other",
                                                tds: "$salaryData.tds",
                                                per_hour_ot_salary: "$salaryData.perhour_ot_salary",
                                                lwf: { $arrayElemAt: ["$workDayDetails.lwf", 0] },
                                                loan_deduction: "$loan_deduction",
                                                mess_deduction: "$mess_deduction",
                                                penalty_deduction: "$penalty_deduction",
                                                advance_deduction: "$advance_deduction",
                                                total_other_deduction: "$total_other_deduction",
                                                total_extra_earning: "$total_extra_earning",
                                                total_bonus_earning: "$total_bonus_earning",
                                                total_full_night_earning: "$total_full_night_earning",
                                                total_sunday_earning: "$total_sunday_earning",
                                                total_present_Day: "$totalPresentDays",
                                                total_ot_Day: "$total_ot_Day",
                                                total_ot_hour: "$totalOtHours",
                                                total_days: "$total_days",
                                                total_sunday_presents: "$total_sunday_presents",
                                                totalP: "$totalP",
                                                totalFN: "$totalFN",
                                                totalSP: "$totalSP",
                                                totalH: "$totalH",
                                                totalCL: "$totalCL",
                                                totalPFN: "$totalPFN",
                                            }
                                        },
                                        working_hour: { $sum: "$salaryData.working_hour" },
                                        total_salary: { $sum: "$salaryData.total_salary" },
                                        perday_salary: { $sum: "$salaryData.perday_salary" },
                                        working_day: { $sum: "$salaryData.working_day" },
                                        basic_salary: { $sum: "$salaryData.basic" },
                                        hra_salary: { $sum: "$salaryData.hra" },
                                        conveyance_allowance_salary: { $sum: "$salaryData.conveyance_allowance" },
                                        medical_allowance_salary: { $sum: "$salaryData.medical_allowance" },
                                        other_salary: { $sum: "$salaryData.other" },
                                        tds: { $sum: "$salaryData.tds" },
                                        per_hour_ot_salary: { $sum: "$salaryData.perhour_ot_salary" },
                                        lwf: { $sum: { $arrayElemAt: ["$workDayDetails.lwf", 0] } },
                                        loan_deduction: { $sum: "$loan_deduction" },
                                        mess_deduction: { $sum: "$mess_deduction" },
                                        penalty_deduction: { $sum: "$penalty_deduction" },
                                        advance_deduction: { $sum: "$advance_deduction" },
                                        total_other_deduction: { $sum: "$total_other_deduction" },
                                        total_extra_earning: { $sum: "$total_extra_earning" },
                                        total_bonus_earning: { $sum: "$total_bonus_earning" },
                                        total_full_night_earning: { $sum: "$total_full_night_earning" },
                                        total_sunday_earning: { $sum: "$total_sunday_earning" },
                                        total_present_Day: { $sum: "$totalPresentDays" },
                                        total_ot_Day: { $sum: "$total_ot_Day" },
                                        total_ot_hour: { $sum: "$totalOtHours" },
                                        total_days: { $sum: "$total_days" },
                                        totalP: { $sum: "$totalP" },
                                        totalFN: { $sum: "$totalFN" },
                                        totalSP: { $sum: "$totalSP" },
                                        totalH: { $sum: "$totalH" },
                                        totalCL: { $sum: "$totalCL" },
                                        totalPFN: { $sum: "$totalPFN" },
                                        total_working_day: {
                                            $sum: "$salaryData.working_day"

                                        },
                                        total_working_hours: {
                                            $sum: "$salaryData.working_day"

                                        }

                                    }
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        department: { $arrayElemAt: ["$_id", 0] },
                                        data: 1,
                                        working_hour: 1,
                                        total_salary: 1,
                                        perday_salary: 1,
                                        working_day: 1,
                                        basic_salary: 1,
                                        hra_salary: 1,
                                        conveyance_allowance_salary: 1,
                                        medical_allowance_salary: 1,
                                        other_salary: 1,
                                        tds: 1,
                                        per_hour_ot_salary: 1,
                                        lwf: 1,
                                        loan_deduction: 1,
                                        mess_deduction: 1,
                                        penalty_deduction: 1,
                                        advance_deduction: 1,
                                        total_other_deduction: 1,
                                        total_extra_earning: 1,
                                        total_bonus_earning: 1,
                                        total_full_night_earning: 1,
                                        total_sunday_earning: 1,
                                        total_present_Day: 1,
                                        total_ot_Day: 1,
                                        total_ot_hour: 1,
                                        total_days: 1,
                                        totalP: 1,
                                        totalFN: 1,
                                        totalSP: 1,
                                        totalH: 1,
                                        totalCL: 1,
                                        totalPFN: 1,
                                        total_sunday_presents: 1,
                                        total_full_night_presents: 1,
                                        total_holiday_presents: 1,
                                    }
                                }

                            ])
                        // return res.send(employeeInfo)
                        let aa = []
                        let ss = []
                        let final_working_hour = 0
                        let final_total_salary = 0
                        let final_perday_salary = 0
                        let final_working_day = 0
                        let final_basic_salary = 0
                        let final_hra_salary = 0
                        let final_conveyance_allowance_salary = 0
                        let final_medical_allowance_salary = 0
                        let final_other_salary = 0
                        let final_tds = 0
                        let final_per_hour_ot_salary = 0
                        let final_lwf = 0
                        let final_loan_deduction = 0
                        let final_mess_deduction = 0
                        let final_penalty_deduction = 0
                        let final_advance_deduction = 0
                        let final_total_other_deduction = 0
                        let final_total_extra_earning = 0
                        let final_total_bonus_earning = 0
                        let final_total_full_night_earning = 0
                        let final_total_sunday_earning = 0
                        let final_total_present_Day = 0
                        let final_total_ot_Day = 0
                        let final_total_ot_hour = 0
                        let final_total_days = 0
                        let final_tot_esi = 0
                        let final_tot_esi1 = 0
                        let final_tot_esi2 = 0
                        let final_tot_pf = 0
                        let final_tot_presD_sal = 0
                        let final_tot_ot_sal = 0
                        let final_tot_gross_sal = 0
                        let final_tot_pt = 0
                        let final_tot_ex_net_sal = 0
                        let final_tot_ded = 0
                        let final_tot_net_salary = 0
                        let final_tot_net_diff = 0
                        let final_isBonus_salary = 0

                        for (let i = 0; i <= employeeInfo.length - 1; i++) {
                            let tot_esi = 0;
                            let tot_esi1 = 0;
                            let tot_esi2 = 0;
                            let tot_pf = 0;
                            let tot_presD_sal = 0;
                            let tot_ot_sal = 0;
                            let tot_isBonus_sal = 0;
                            let tot_gross_sal = 0;
                            let tot_pt = 0;
                            let tot_ex_net_sal = 0;
                            let tot_ded = 0;
                            let tot_net_salary = 0;
                            let tot_net_diff = 0;

                            const array = await employeeInfo[i].data.map(async o => {
                                let basic_salary = o.salaryData.basic;
                                // let pf_amount = 0;
                                // if (o.salaryData.is_pf) {
                                //     let max_salary = 15000;
                                //     pf_amount = basic_salary / o.salaryData.working_day;
                                //     pf_amount = pf_amount * (o.total_present_Day + o.total_ot_Day);
                                //     if (pf_amount > max_salary) {
                                //         pf_amount = max_salary * 12;
                                //         pf_amount = Math.round(pf_amount / 100)
                                //     } else {
                                //         pf_amount = pf_amount * 12;
                                //         pf_amount = Math.round(pf_amount / 100)
                                //     }
                                // }
                                let pf = o.salaryData.is_pf ? o.salaryData.salary_type === "Daily" ? parseFloat((basic_salary * o.total_present_Day * 0.12).toFixed(2)) : parseFloat(((basic_salary / o.salaryData.working_day) * o.total_present_Day * 0.12).toFixed(2)) : 0
                                tot_pf += pf
                                let present_day_salary = Math.round(o.total_present_Day * o.perday_salary)
                                tot_presD_sal += present_day_salary
                                let ot_salary = Math.round(o.total_ot_hour * o.per_hour_ot_salary)
                                tot_ot_sal += ot_salary
                                let isBonus_salary = o.salaryData.is_bonus ? o.salaryData.salary_type === "Daily" ? parseFloat((basic_salary * o.total_present_Day * 0.0833).toFixed(2)) : parseFloat(((basic_salary / o.salaryData.working_day) * o.total_present_Day * 0.0833).toFixed(2)) : 0
                                tot_isBonus_sal += isBonus_salary
                                let esi = o.salaryData.is_esi ? o.salaryData.salary_type === "Daily" ? parseFloat((basic_salary * o.total_present_Day * 0.0075).toFixed(2)) : parseFloat(((basic_salary / o.salaryData.working_day) * o.total_present_Day * 0.0075).toFixed(2)) : 0
                                tot_esi += esi
                                let esi1 = o.salaryData.is_esi ? o.salaryData.salary_type === "Daily" ? parseFloat((basic_salary * o.total_present_Day * 0.0075).toFixed(2)) : parseFloat(((basic_salary / o.salaryData.working_day) * o.total_present_Day * 0.0075).toFixed(2)) : 0
                                tot_esi1 += esi1
                                let esi2 = o.salaryData.is_esi ? o.salaryData.salary_type === "Daily" ? parseFloat((basic_salary * o.total_present_Day * 0.0075).toFixed(2)) : parseFloat(((basic_salary / o.salaryData.working_day) * o.total_present_Day * 0.0075).toFixed(2)) : 0
                                tot_esi2 += esi2
                                // let isBonus_salary = o.salaryData.is_bonus ? parseFloat((o.perday_salary * o.total_present_Day * 0.0833).toFixed(2)) : 0;
                                // tot_isBonus_sal += isBonus_salary
                                // let gross_salary = (present_day_salary + ot_salary + o.total_extra_earning + o.total_sunday_earning+ o.total_full_night_earning+ o.total_bonus_earning)
                                let gross_salary = (present_day_salary + ot_salary + o.total_extra_earning + isBonus_salary)
                                tot_gross_sal += gross_salary
                                // let esi = o.salaryData.is_esi ? (Math.ceil(gross_salary * 0.075)) : 0;
                                // tot_esi += esi
                                let pt = o.salaryData.is_pt ? (gross_salary > 12000 ? 200 : 0) : 0;
                                tot_pt += pt
                                let excel_net_salary = o.salaryData.excel_net_salary !== '' ? Math.round(o.salaryData.excel_net_salary) : 0
                                tot_ex_net_sal += excel_net_salary
                                let total_deduction = (o.total_other_deduction + o.loan_deduction + pf + esi + pt + o.tds + o.lwf);
                                tot_ded += total_deduction
                                let net_salary = gross_salary - total_deduction;
                                tot_net_salary += net_salary
                                // let net_difference = Math.round(o.salaryData.excel_net_salary !== '' ? o.salaryData.excel_net_salary : 0 - (gross_salary - total_deduction));
                                let net_difference = Math.round(o.salaryData.excel_net_salary - (gross_salary - total_deduction));
                                tot_net_diff += net_difference
                                let obj = {
                                    ...o,
                                    month: parseInt(month, 0),
                                    total_ot_Day: parseFloat(o.total_ot_Day),
                                    total_days: parseFloat(o.total_days),
                                    pf,
                                    present_day_salary,
                                    ot_salary,
                                    isBonus_salary,
                                    gross_salary,
                                    esi,
                                    pt,
                                    excel_net_salary,
                                    total_deduction,
                                    net_salary,
                                    net_difference,
                                }

                                if (o.total_present_Day > 0 || o.total_sunday_presents > 0 || o.total_full_night_presents > 0 || o.total_holiday_presents > 0) {
                                    await SalaryReport.findOneAndUpdate({ employee_id: o.employee_id, month, year_id }, { ...obj }, { upsert: true })
                                    return { ...obj }
                                }
                                return null
                            }
                            )
                            const sal_arr = await (await Promise.allSettled(array)).map(o => o.value).filter(o => o !== null)
                            aa = [...aa, ...sal_arr]
                            ss.push({
                                ...employeeInfo[i], data: [...aa],
                                tot_esi,
                                tot_esi1,
                                tot_esi2,
                                tot_pf,
                                tot_presD_sal,
                                tot_ot_sal,
                                tot_isBonus_sal,
                                tot_gross_sal,
                                tot_pt,
                                tot_ex_net_sal,
                                tot_ded,
                                tot_net_salary,
                                tot_net_diff,
                            })
                            final_working_hour += employeeInfo[i].working_hour
                            final_total_salary += employeeInfo[i].total_salary
                            final_perday_salary += employeeInfo[i].perday_salary
                            final_working_day += employeeInfo[i].working_day
                            final_basic_salary += employeeInfo[i].basic_salary
                            final_hra_salary += employeeInfo[i].hra_salary
                            final_conveyance_allowance_salary += employeeInfo[i].conveyance_allowance_salary
                            final_medical_allowance_salary += employeeInfo[i].medical_allowance_salary
                            final_other_salary += employeeInfo[i].other_salary
                            final_tds += employeeInfo[i].tds
                            final_per_hour_ot_salary += employeeInfo[i].per_hour_ot_salary
                            final_lwf += employeeInfo[i].lwf
                            final_loan_deduction += employeeInfo[i].loan_deduction
                            final_mess_deduction += employeeInfo[i].mess_deduction
                            final_penalty_deduction += employeeInfo[i].penalty_deduction
                            final_advance_deduction += employeeInfo[i].advance_deduction
                            final_total_other_deduction += employeeInfo[i].total_other_deduction
                            final_total_extra_earning += employeeInfo[i].total_extra_earning
                            final_total_bonus_earning += employeeInfo[i].total_bonus_earning
                            final_total_full_night_earning += employeeInfo[i].total_full_night_earning
                            final_total_sunday_earning += employeeInfo[i].total_sunday_earning
                            final_total_present_Day += employeeInfo[i].total_present_Day
                            final_total_ot_Day += employeeInfo[i].total_ot_Day
                            final_total_ot_hour += employeeInfo[i].total_ot_hour
                            final_total_days += employeeInfo[i].total_days
                            final_tot_esi += tot_esi
                            final_tot_esi1 += tot_esi1
                            final_tot_esi2 += tot_esi2
                            final_tot_pf += tot_pf
                            final_tot_presD_sal += tot_presD_sal
                            final_tot_ot_sal += tot_ot_sal
                            final_tot_gross_sal += tot_gross_sal
                            final_tot_pt += tot_pt
                            final_tot_ex_net_sal += tot_ex_net_sal
                            final_tot_ded += tot_ded
                            final_tot_net_salary += tot_net_salary
                            final_tot_net_diff += tot_net_diff
                            final_isBonus_salary += tot_isBonus_sal
                        }
                        const net_total = {
                            final_working_hour,
                            final_total_salary,
                            final_perday_salary,
                            final_working_day,
                            final_basic_salary,
                            final_hra_salary,
                            final_conveyance_allowance_salary,
                            final_medical_allowance_salary,
                            final_other_salary,
                            final_tds,
                            final_per_hour_ot_salary,
                            final_lwf,
                            final_loan_deduction,
                            final_mess_deduction,
                            final_penalty_deduction,
                            final_advance_deduction,
                            final_total_other_deduction,
                            final_total_extra_earning,
                            final_total_bonus_earning,
                            final_total_full_night_earning,
                            final_total_sunday_earning,
                            final_total_present_Day,
                            final_total_ot_Day,
                            final_total_ot_hour,
                            final_total_days,
                            final_tot_esi,
                            final_tot_esi1,
                            final_tot_esi2,
                            final_tot_pf,
                            final_tot_presD_sal,
                            final_tot_ot_sal,
                            final_isBonus_salary,
                            final_tot_gross_sal,
                            final_tot_pt,
                            final_tot_ex_net_sal,
                            final_tot_ded,
                            final_tot_net_salary,
                            final_tot_net_diff,
                        }
                        sendResponse(res, 200, true, { data: ss, net_total: net_total }, "Data found successfully.")
                    }
                } else {
                    sendResponse(res, 400, false, {}, "Missing parameters");
                }
            } catch (error) {
                console.log(error)
                sendResponse(res, 500, false, {}, "Something went wrong")
            }
        } else {
            sendResponse(res, 401, false, {}, "Unauthorized")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}
exports.GetEmployeeReport = async (req, res) => {
    const { month, firm, year } = req.query;
    try {
        const query = {}
        if (firm) query.firm_id = firm;
        if (year) query.year_id = year;
        if (month) query.month = month;
        const salaryReports = await SalaryReport.find(query, { __v: 0 })
            .populate('firm_id', 'name')
            .populate('year_id', 'start_year end_year')
            .populate('designation', 'name')
            .populate('shift', 'name')
            .populate('bank_name', 'name')
            .populate('department', 'name')
            .sort({ department: 1, name: 1 })
            .lean();
console.log("Salary Report (last 10):", JSON.stringify(salaryReports.slice(-10), null, 2));


        if (salaryReports) {
            sendResponse(res, 200, true, salaryReports, "Salary Report list")
        } else {
            sendResponse(res, 400, false, {}, "Holiday not found")
        }
    } catch (error) {
        sendResponse(res, 500, false, {}, "Something went wrong");
    }
}

exports.downloadForm11 = async (req, res) => {
    if (req.user && !req.error) {
        const { id } = req.body;
        if (id) {
            const empData = await Employee.findById(id)
                .populate("designation", "name")
                .populate("shift", "name")
                .populate("shift_two", "name")
                .populate("firm_id", "name address")
                .populate("emp_type", "name")

            const salary = await Salary.find({ employee: id })
                .populate("bank_name", "name")
                .populate({
                    path: "department",
                    select: "name group",
                    populate: {
                        path: "group",
                        select: "name",
                    },
                })
                .sort({ createdAt: -1 });

            const salaryData = salary[0]
                ? {
                    employee: salary[0].employee,
                    month: salary[0].month,
                    department: salary[0].department,
                    bank_name: salary[0].bank_name,
                    bank_branch_name: salary[0].bank_branch_name,
                    bank_account_name: salary[0].bank_account_name,
                    bank_account_no: salary[0].bank_account_no,
                    bank_account_ifsc: salary[0].bank_account_ifsc,
                    bank_code: salary[0].bank_code,
                }
                : {
                    employee: "",
                    month: "",
                    department: { name: "", group: { name: "" } },
                    bank_name: { name: "" },
                    bank_branch_name: "",
                    bank_account_name: "",
                    bank_account_no: "",
                    bank_account_ifsc: "",
                    bank_code: "",
                };

            // if (!salaryData) {
            //     sendResponse(res, 404, false, {}, "Salary data not found");
            //     return;
            // }

            try {

                const template = fs.readFileSync("templates/form11.html", "utf-8");
             const renderedHtml = ejs.render(template, { emp: empData, sal: salaryData });


                // const browser = await puppeteer.launch({ headless: true });
                const browser = await puppeteer.launch({
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox'],
                    executablePath: PATH,
                });
                const page = await browser.newPage();

                await page.setContent(renderedHtml, {
                    baseUrl: `${URI}`,
                });
                const pdfBuffer = await page.pdf({
                    format: "A4",
                    margin: {
                        top: "0.2in",
                        right: "0.5in",
                        bottom: "0.5in",
                        left: "0.5in",
                    },
                    printBackground: true,
                    preferCSSPageSize: true,
                });

                await browser.close();

                const pdfsDir = path.join(__dirname, '../../pdfs');
                if (!fs.existsSync(pdfsDir)) {
                    fs.mkdirSync(pdfsDir);
                }

                const filename = `formA_${Date.now()}.pdf`;
                const filePath = path.join(__dirname, '../../pdfs', filename);

                fs.writeFileSync(filePath, pdfBuffer);

                const fileUrl = `${URI}/pdfs/${filename}`;

                // res.status(200).json({ pdfUrl: fileUrl });
                sendResponse(res, 200, true, { file: fileUrl }, "PDF downloaded Successfully")
            } catch (error) {
                console.error("Error generating PDF:", error);
                sendResponse(res, 500, false, {}, "Internal Server Error")
            }
        } else {
            sendResponse(res, 400, false, {}, "Missing parameters")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.downloadPoliceForm = async (req, res) => {
    if (req.user && !req.error) {
        const { id } = req.body;
        if (id) {
            const empData = await Employee.findById(id)
                .populate("designation", "name")
                .populate("shift", "name")
                .populate("shift_two", "name")
                .populate("firm_id", "name address address_two address_three state city pincode mobile_number");

            try {

                const template = fs.readFileSync("templates/PoliceStation.html", "utf-8");
                const renderedHtml = ejs.render(template, { emp: empData });

                const browser = await puppeteer.launch({
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox'],
                    executablePath: PATH,
                });
                const page = await browser.newPage();

                await page.setContent(renderedHtml, {
                    baseUrl: `${URI}`,
                });
                const pdfBuffer = await page.pdf({
                    format: "A4",
                    margin: {
                        top: "0.1in",
                        right: "0.5in",
                        bottom: "0.5in",
                        left: "0.5in",
                    },
                    printBackground: true,
                    preferCSSPageSize: true,
                    compress: true
                });

                await browser.close();

                const pdfsDir = path.join(__dirname, '../../pdfs');
                if (!fs.existsSync(pdfsDir)) {
                    fs.mkdirSync(pdfsDir);
                }
                const filename = `police-station_${Date.now()}.pdf`;
                const filePath = path.join(__dirname, '../../pdfs', filename);
                fs.writeFileSync(filePath, pdfBuffer);

                const fileUrl = `${URI}/pdfs/${filename}`;

                sendResponse(res, 200, true, { file: fileUrl }, "PDF downloaded Successfully")
            } catch (error) {
                console.error("Error generating PDF:", error);
                sendResponse(res, 500, false, {}, "Internal Server Error")
            }
        } else {
            sendResponse(res, 400, false, {}, "Missing parameters")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.downloadGatePass = async (req, res) => {
    if (req.user && !req.error) {
        const { id } = req.body;
        if (id) {
            const empData = await Employee.findById(id)
                .populate("designation", "name")
                .populate("shift", "name")
                .populate("shift_two", "name")
                .populate(
                    "firm_id",
                    "name address address_two address_three state city pincode mobile_number"
                );

            try {
                const template = fs.readFileSync("templates/gatepass.html", "utf-8");
                const renderedHtml = ejs.render(template, {
                    emp: empData,
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
                    format: "A4",
                    margin: {
                        top: "0.5in",
                        right: "0.5in",
                        bottom: "0.5in",
                        left: "0.5in",
                    },
                    printBackground: true,
                    preferCSSPageSize: true,
                    compress: true,
                });

                await browser.close();

                const pdfsDir = path.join(__dirname, "../../pdfs");
                if (!fs.existsSync(pdfsDir)) {
                    fs.mkdirSync(pdfsDir);
                }

                const filename = `Gatepass_${Date.now()}.pdf`;
                const filePath = path.join(__dirname, "../../pdfs", filename);
                fs.writeFileSync(filePath, pdfBuffer);

                const fileUrl = `${URI}/pdfs/${filename}`;

                sendResponse(res, 200, true, { file: fileUrl }, "PDF downloaded Successfully");
            } catch (error) {
                console.error("Error generating PDF:", error);
                sendResponse(res, 500, false, {}, "Internal Server Error");
            }
        } else {
            sendResponse(res, 400, false, {}, "Missing parameters");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.importEmployeeData = async (req, res) => {
    if (req.user && !req.error) {
        upload(req, res, async function (err) {
            if (!req.body.firm_id) {
                sendResponse(res, 400, false, {}, 'Firm is required');
                return;
            }

            if (!req.body.year_id) {
                sendResponse(res, 400, false, {}, 'Year is required');
                return;
            }

            if (!req.file) {
                sendResponse(res, 400, false, {}, 'Select an excel file');
                return;
            } else if (err) {
                return sendResponse(res, 400, false, {}, `Not uploaded: ${err.message}`);
            }

            try {
                const data = parser.parseXls2Json(req.file.path, { cellDate: true });
                const result = data.at(0).filter(elem => elem.import_id != '');

                const validItems = [];
                const salaryData = [];
                const errors = [];
                const monthlyAttendance = [];
                const earning = [];

                // Fetch the last employee_id once
                const lastEmployee = await Employee.findOne({}, {}, { sort: { 'employee_id': -1 } });
                let employee_id = lastEmployee && lastEmployee.employee_id ? parseInt(lastEmployee.employee_id) : 0;

                // Fetching last voucher-no for earning

                const lastEarning = await earningModel.findOne({}, {}, { sort: { 'createdAt': -1 } });
                let newVoucher_no = lastEarning && lastEarning.voucher_no ? parseInt(lastEarning.voucher_no) : 0;


                // Fetch all bank and department data
                const bankCache = await bankModel.find({}).lean();
                const departmentCache = await departmentModel.find({}).lean();
                const designationCache = await designationModel.find({}).lean();
                const employeeTypeCache = await employeeType.find({}).lean();

                const bankMap = bankCache.reduce((acc, bank) => {
                    acc[bank.name.toLowerCase()] = bank._id;
                    return acc;
                }, {});

                const departmentMap = departmentCache.reduce((acc, department) => {
                    acc[department.name.toLowerCase()] = department._id;
                    return acc;
                }, {});

                const designationMap = designationCache.reduce((acc, designation) => {
                    acc[designation.name.toLowerCase()] = designation._id;
                    return acc;
                }, {});

                const employeeTypeMap = employeeTypeCache.reduce((acc, type) => {
                    acc[type.name.toLowerCase()] = type._id;
                    return acc;
                }, {});

                for (const item of result) {
                    const record = {
                        import_id, first_name, last_name, middle_name, joining_date, designation, card_no, uan_no,
                        email, gender, dob, mobile_number, adhar_no, pancard_no, address, address_two, address_three, state,
                        city, pincode, pre_address, pre_address_two, pre_address_three, pre_state, pre_city, pre_pincode, same_address,
                        height, weight, skills, emp_type, esi_number, passport_number, nationality, caste, blood_group, education,
                        salary_type, working_day, working_hour, basic, hra, perhour_ot_salary, bank_name,
                        bank_account_ifsc, bank_account_no, employee, department, actual_present_day, cl_day,
                        ph_day, ot_hour, bonus_count
                    } = item;

                    if (record.skills === '') {
                        record.skills = null;
                    }

                    if (record.emp_type === '') {
                        record.emp_type = null;
                    }

                    if (record.bank_name) {
                        let bankId = bankMap[record.bank_name.trim().toLowerCase()];
                        if (!bankId) {
                            const bankObj = new bankModel({ name: record.bank_name });
                            const newBank = await bankObj.save();
                            bankId = newBank._id;
                            bankMap[record.bank_name.trim().toLowerCase()] = bankId;
                        }
                        record.bank_name = bankId;
                    } else {
                        record.bank_name = null;
                    }
                    if (record.department !== '') {
                        let departmentId = departmentMap[record.department.trim().toLowerCase()];
                        if (!departmentId) {
                            const departmentObj = new departmentModel({
                                name: record.department,
                                group: '65e5c2a7291d96a10400fe89',
                            });
                            const newDept = await departmentObj.save();
                            departmentId = newDept._id;
                            departmentMap[record.department.trim().toLowerCase()] = departmentId;
                        }
                        record.department = departmentId;
                    } else {
                        record.department = null;
                    }


                    if (record.designation !== '') {
                        let designationId = designationMap[record.designation.trim().toLowerCase()];
                        if (!designationId && record.designation !== '') {
                            const designationObj = new designationModel({ name: record.designation });
                            const newDesignation = await designationObj.save();
                            designationId = newDesignation._id;
                            designationMap[record.designation.trim().toLowerCase()] = designationId;
                        }
                        record.designation = designationId;
                    } else {
                        record.designation = null;
                    }

                    if (record.emp_type) {
                        record.emp_type = employeeTypeMap[record.emp_type.trim().toLowerCase()] || null;
                    }

                    if (record.address !== '' && record.pre_address !== '') {
                        record.pre_address = record.address;
                        record.pre_address_two = record.address_two;
                        record.pre_address_three = record.address_three;
                        record.pre_state = record.state;
                        record.pre_city = record.city;
                        record.pre_pincode = record.pincode;
                        record.same_address = true;
                    } else {
                        record.same_address = false;
                    }

                    if (record.dob !== '') {
                        const dob = new Date(record.dob);
                        const today = new Date();
                        const currentYear = today.getFullYear();
                        const dobYear = dob.getFullYear();
                        const age = currentYear - dobYear;
                        record.age = age;
                    }

                    record.gender = record.gender ? converFirstLetterUpper(record.gender) : '';
                    //record.department = record.department ? converFirstLetterUpper(record.department) : '';
                    record.state = record.state ? converFirstLetterUpper(record.state) : '';
                    record.city = record.city ? converFirstLetterUpper(record.city) : '';
                    record.dob = record.dob ? moment(convertExcelDateToJSDate(record.dob)).format('YYYY-MM-DD') : '';
                    record.joining_date = record.joining_date ? moment(convertExcelDateToJSDate(record.joining_date)).format('YYYY-MM-DD') : '';
                    const isExisting = await Employee.findOne({ import_id: record.import_id });

                    if (isExisting) {
                        errors.push({
                            record: record,
                            message: `Record already exists with this import_id: ${record.import_id}`
                        });
                        continue;
                    }

                    employee_id += 1;
                    record.employee_id = employee_id.toString();
                    record.firm_id = req.body.firm_id;
                    record.year_id = req.body.year_id;
                    record.black_list = false;
                    record.is_emergency = false;
                    record.shift = "65d82a0d360572449e64b123";
                    record.in_time = "08:00";
                    record.out_time = "20:00";
                    record.shift_two = "65d82a13360572449e64b126";
                    record.in_time_two = "20:00";
                    record.out_time_two = "08:00";
                    record.holiday = "Sunday";
                    record.leaving_date = "";
                    record.leaving_reason = "";
                    record.black_list_reason = "";
                    record.esi_number = "0";
                    record.image = "";
                    record.pan_card_image = "";
                    record.aadhar_card_image = "";
                    record.full_name = record.first_name + " " + record.middle_name + " " + record.last_name;
                    record.emergency_contact_number = 0,
                        record.emergency_contact_person = "",
                        record.emergency_person_aadhar_number = 0,
                        record.emergency_person_aadhar_photo = "",
                        record.emergency_person_dob = null,
                        record.emergency_person_relation = ""
                    validItems.push(record);

                    if (record.department !== '') {
                        const basic = parseFloat(record.basic) || 0;
                        const hra = parseFloat(record.hra) || 0;
                        const conveyance_allowance = 0;
                        const medical_allowance = 0;
                        const washing = 0;
                        const other = 0;
                        const tds = 0;

                        record.total_salary = basic + hra;

                        let perdaySalary = 0;
                        if (record.salary_type && record.total_salary && record.working_day) {
                            if (record.salary_type === 'Monthly' || record.salary_type === 'Fix') {
                                perdaySalary = (
                                    parseFloat(record.total_salary) /
                                    parseFloat(record.working_day)
                                )?.toFixed(2);
                            } else if (record.salary_type === 'Daily') {
                                perdaySalary = parseFloat(record.total_salary?.toFixed(2));
                            }
                        }
                        record.perday_salary = parseFloat(perdaySalary);

                        if (!parseFloat(record.perhour_ot_salary)) {
                            const countPerHour = parseFloat(record.perday_salary) / parseFloat(record.working_hour);
                            record.perhour_ot_salary = (parseFloat(countPerHour.toFixed(2)));
                        }

                        const workday = await workDayModel.findOne({ department: record.department, month: 5 });

                        salaryData.push({
                            salary_type: record.salary_type,
                            working_day: parseFloat(record.working_day),
                            working_hour: parseFloat(record.working_hour),
                            basic: parseFloat(record.basic),
                            hra: parseFloat(record.hra),
                            perday_salary: record.perday_salary,
                            conveyance_allowance: conveyance_allowance,
                            medical_allowance: medical_allowance,
                            washing: washing,
                            other: other,
                            tds: tds,
                            perhour_ot_salary: parseFloat(record.perhour_ot_salary),
                            total_salary: parseFloat(record.total_salary),
                            bank_name: record.bank_name,
                            bank_account_no: record.bank_account_no,
                            bank_account_ifsc: record.bank_account_ifsc,
                            bank_branch_name: '-',
                            employee_id: record.employee_id,
                            firm_id: record.firm_id,
                            year_id: record.year_id,
                            department: record.department,
                            month: 5,
                            work_day_id: workday ? workday._id : null,
                            is_pf: record.uan_no !== '' ? true : false,
                        });

                        if (record.actual_present_day === '') {
                            record.actual_present_day = 0;
                        }

                        if (record.cl_day === '') {
                            record.cl_day = 0;
                        }

                        if (record.ph_day === '') {
                            record.ph_day = 0;
                        }

                        if (parseFloat(record.actual_present_day) > 0 && record.actual_present_day !== '') {
                            let total_present = parseFloat(record.actual_present_day) + parseFloat(record.cl_day) + parseFloat(record.ph_day);
                            monthlyAttendance.push({
                                firm_id: record.firm_id,
                                year_id: record.year_id,
                                month: 5,
                                actual_present_day: record.actual_present_day,
                                cl_day: record.cl_day,
                                ph_day: record.ph_day,
                                present_day: parseFloat(total_present),
                                week_off_present: 0,
                                use_leave: 0,
                                ot_hour: record.ot_hour === '' ? parseFloat(record.ot_hour) : 0,
                                ot_day: 0,
                                remark: '',
                            })

                        }

                    }
                    newVoucher_no += 1;

                    if (parseFloat(record.bonus_count) > 0) {
                        earning.push({
                            firm_id: record.firm_id,
                            year_id: record.year_id,
                            date: '2024-05-31',
                            month: 5,
                            voucher_no: newVoucher_no,
                            other_voucher_no: 0,
                            type: 'Other',
                            amount: parseFloat(bonus_count) * 500,
                        })
                    }
                }
                // return res.send("Hello");
                if (validItems.length > 0) {
                    const session = await mongoose.startSession();
                    session.startTransaction();

                    try {
                        const insertedRecords = await Employee.insertMany(validItems, { session });
                        const salaryInserts = insertedRecords.map((employee, index) => ({
                            ...salaryData[index],
                            employee: employee._id
                        }));

                        // const monthInserts = insertedRecords.map((employee, index) => ({ 
                        //     ...monthlyAttendance[index],
                        //     employee: employee._id,
                        // }));



                        // const earningData = insertedRecords.map((employee, index) => ({
                        //     ...earning[index],
                        //     employee: employee._id,
                        // }));



                        await salaryModel.insertMany(salaryInserts, { session });
                        //await monthlyAttendanceModel.insertMany(monthInserts, { session });
                        //await earningModel.insertMany(earningData,{ session });

                        await session.commitTransaction();
                        session.endSession();

                        sendResponse(res, 200, true, {}, 'Employee data,salaries,earning and attendance imported successfully');
                        return;
                    } catch (error) {
                        await session.abortTransaction();
                        session.endSession();
                        throw error;
                    }
                }
            } catch (err) {
                return sendResponse(res, 400, false, {}, 'Something went wrong: ' + err.message);
            }
        });
    } else {
        sendResponse(res, 401, false, {}, 'Unauthorised');
    }
};

exports.getAttendanceSheet = async (req, res) => {
    const { date } = req.body;

    if (req.user && !req.error) {
        if (!date) {
            return sendResponse(res, 400, false, {}, 'Please provide date');
        }
        try {
            const employeeData = await employModel.aggregate([
                {
                    $match: { deleted: false, leaving_date: "" }
                },
                {
                    $lookup: {
                        from: "salaries",
                        let: { employeeId: "$_id" },
                        pipeline: [
                            { $match: { $expr: { $eq: ["$employee", "$$employeeId"] } } },
                            { $sort: { month: -1 } },
                            { $limit: 1 },
                            {
                                $lookup: {
                                    from: "departments",
                                    localField: "department",
                                    foreignField: "_id",
                                    as: "department"
                                }
                            },
                            { $unwind: "$department" }
                        ],
                        as: "latestSalary"
                    }
                },
                {
                    $unwind: { path: "$latestSalary", preserveNullAndEmptyArrays: true }
                },
                {
                    $project: {
                        employee_id: 1,
                        adhar_no: 1,
                        card_no: 1,
                        full_name: 1,
                        designation: 1,
                        department: { $ifNull: ["$latestSalary.department.name", "-"] }
                    }
                },
                {
                    $lookup: {
                        from: "designations",
                        localField: "designation",
                        foreignField: "_id",
                        as: "designation"
                    }
                },
                { $unwind: "$designation" },
                {
                    $project:
                    {
                        employee_id: 1,
                        full_name: 1,
                        card_no: 1,
                        designation: "$designation.name",
                        department: 1,
                        adhar_no: 1
                    }
                },
                // {
                //     $sort: {
                //         department: 1,
                //     }
                // }    
            ]);

            const rows = employeeData.map((employee, i) => ({
                sr: i + 1,
                date: date,
                empid: employee.employee_id,
                full_name: employee.full_name,
                card_no: employee.card_no,
                designation: employee.designation,
                department: employee.department,
                adhar_no: employee.adhar_no?.toString(),
                shift: '',
                in_time: '',
                out_time: '',
                is_present: '',
                ot_hrs: '',
                other_absent_present: '',
                // use_leave: '', 
                // sunday_present: '', 
                // full_night_present: '', 
                // holiday_present: '', 
            }));


            const workbook = new excelJS.Workbook();
            const worksheet = workbook.addWorksheet("Daily-attendance-report");

            worksheet.columns = [
                { header: 'Sr', key: 'sr', width: 10 },
                { header: "Date", key: "date", width: 15 },
                { header: "EmployeeID", key: "empid", width: 10 },
                { header: "Full Name", key: "full_name", width: 55 },
                { header: "Card No", key: "card_no", width: 10 },
                { header: "Designation", key: "designation", width: 15 },
                { header: "Department", key: "department", width: 15 },
                { header: "Adhar No", key: "adhar_no", width: 15 },
                { header: "Shift", key: "shift", width: 10 },
                { header: "InTime", key: "in_time", width: 10 },
                { header: "OutTime", key: "out_time", width: 10 },
                { header: "AP", key: "is_present", width: 10 },
                { header: "OT_Hrs", key: "ot_hrs", width: 10 },
                { header: "OtherAP", key: "other_absent_present", width: 10 },
                { header: "Used_Leave", key: "use_leave", width: 10 },
                { header: "PID", key: "pid", width: 10 }

                // { header: "Sunday Present", key: "sunday_present", width: 20 },
                // { header: "Full Night Present", key: "full_night_present", width: 20 },
                // { header: "Holiday Present", key: "holiday_present", width: 20 },
            ];

            worksheet.getRow(1).eachCell(cell => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFF00' }
                };
            });

            worksheet.addRows(rows);

            const filePath = path.join(__dirname, '../../xlsx/daily-report.xlsx');
            await workbook.xlsx.writeFile(filePath);
            const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
            const fileUrl = `${protocol}://${req.get('host')}/xlsx/daily-report.xlsx`;
            sendResponse(res, 200, true, { file: fileUrl }, 'XLSX file downloaded successfully');
        } catch (error) {
            console.error(error);
            sendResponse(res, 500, false, null, 'Failed to generate XLSX file');
        }
    } else {
        sendResponse(res, 403, false, null, 'Unauthorized request');
    }
};

exports.getMonthlySheet = async (req, res) => {
    const { month } = req.body;
    if (req.user && !req.error) {
        const employeeData = await salaryModel.find({ month: month }).select('month employee firm_id year_id')
            .populate('department', 'name')
            .populate({
                path: 'employee',
                select: 'employee_id adhar_no designation full_name',
                populate: {
                    path: 'designation',
                    select: 'name'
                }
            })
            .populate('firm_id', 'name')
            .populate('year_id', 'start_year end_year');


        employeeData.sort((a, b) => {
            if (a.department.name < b.department.name) return -1;
            if (a.department.name > b.department.name) return 1;
            if (a.employee.full_name < b.employee.full_name) return -1;
            if (a.employee.full_name > b.employee.full_name) return 1;
            return 0;
        });

        const workbook = new excelJS.Workbook();
        const worksheet = workbook.addWorksheet("Monthly-report");

        // // Define columns in the worksheet 
        worksheet.columns = [
            { header: "month", key: "month", width: 15 },
            { header: "year_id", key: "year", width: 15 },
            { header: "employee", key: "empid", width: 10 },
            { header: "full_name", key: "full_name", width: 55 },
            { header: "adhar_no", key: "adhar_no", width: 15 },
            { header: "department", key: "department", width: 15 },
            { header: "designation", key: "designation", width: 20 },
            { header: "actual_present_day", key: "present_day", width: 10 },
            { header: "cl_day", key: "cl_day", width: 10 },
            { header: "ph_day", key: "ph_day", width: 10 },
            { header: "ot_hour", key: "ot_hrs", width: 10 },
            { header: "sunday_present", key: "sunday_present", width: 20 },
            { header: "full_night_present", key: "full_night_present", width: 20 },
            { header: "bonus_percent", key: "bonus_percent", width: 20 },
            // { header: "deduct_mess", key: "mess", width: 15 },
            // { header: "deduct_other", key: "other", width: 15 },
            // { header: "deduct_loan", key: "loan", width: 15 },
            // { header: "earn_bonus", key: "earning_bonus", width: 15 },
            // { header: "earn_ot", key: "earning_overtime", width: 15 },
            // { header: "earn_other", key: "earning_other", width: 15 },
        ];

        worksheet.getRow(1).eachCell(cell => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFF00' } // Yellow color
            };
        });
        // // Add data to the worksheet 
        employeeData.forEach(employee => {
            worksheet.addRow({
                month: MonthCount[parseInt(employee.month)],
                year: `${employee.year_id.start_year.getFullYear()}-${employee.year_id.end_year.getFullYear()}`,
                empid: employee.employee?.employee_id,
                adhar_no: employee?.employee?.adhar_no?.toString(),
                full_name: employee.employee.full_name,
                department: employee.department?.name,
                designation: employee.employee.designation?.name,
            });
        });

        const filePath = path.join(__dirname, '../../xlsx/Monthly-report.xlsx');
        await workbook.xlsx.writeFile(filePath);

        const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        const fileUrl = `${protocol}://${req.get('host')}/xlsx/Monthly-report.xlsx`;
        sendResponse(res, 200, true, { file: fileUrl }, 'XLSX file downloaded successfully');
    }

}

exports.importMonthlyData = async (req, res) => {
    if (req.user && !req.error) {
        upload(req, res, async function (err) {
            if (!req.body.firm_id) {
                sendResponse(res, 400, false, {}, 'Firm is required');
                return;
            }

            if (!req.body.year_id) {
                sendResponse(res, 400, false, {}, 'Year is required');
                return;
            }

            if (!req.file) {
                sendResponse(res, 400, false, {}, 'Select an excel file');
                return;
            } else if (req.file.mimetype !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
                sendResponse(res, 400, false, {}, 'Invalid file type. Please upload an Excel file');
                fs.unlinkSync(req.file.path); // Delete the file if it's invalid
                return;
            } else if (err) {
                sendResponse(res, 400, false, {}, `Not uploaded: ${err.message}`);
                return;
            }


            try {
                const data = parser.parseXls2Json(req.file.path);
                const result = data.at(0).filter(res => res.actual_present_day > 0 && res.actual_present_day !== '');
                const monthly = [];
                const ded_mess = [];
                const ded_other = [];
                const ded_loan = [];
                const earn_other = [];
                const earn_bonus = [];
                const earn_sunday = [];
                const earn_fullnight = [];
                const earn_ot = [];
                const salary = [];



                let newVoucher_no = await getLastVoucherNo(earningModel);
                let newDeduct_no = await getLastVoucherNo(deductionModel);
                // return res.json(result[0]);
                for (let item of result) {
                    const monthVal = Object.keys(MonthCount).find(key => MonthCount[key] === item.month);
                    const employee = await employModel.findOne({ employee_id: parseInt(item.employee), deleted: false });
                    let employeewithSalary = await salaryModel.findOne({ employee: employee?._id, month: monthVal, deleted: false })
                        .populate('employee', 'name');

                    if (employeewithSalary === null) {
                        continue;
                    }


                    monthly.push({
                        firm_id: req.body.firm_id,
                        year_id: req.body.year_id,
                        employee: employee?._id,
                        month: monthVal,
                        actual_present_day: item?.actual_present_day,
                        cl_day: item?.cl_day,
                        ph_day: item?.ph_day,
                        ot_hour: item?.ot_hour,
                        present_day: (parseFloat(item.actual_present_day) + parseFloat(item.cl_day) + parseFloat(item.ph_day)).toFixed(2),
                        ot_day: 0,
                        use_leave: 0,
                        week_off_present: 0,
                        sunday_present: item?.sunday_present,
                        full_night_present: item?.full_night_present,
                        bonus_percent: parseFloat(item?.bonus_percent),
                        remarks: "",
                    })

                    // if (item.basic >= 0 && item.basic !== '') {

                    //     salary.push({
                    //         _id: employeewithSalary?._id,
                    //         basic: parseFloat(item?.basic),
                    //         hra: parseFloat(item?.hra),
                    //         total_salary: parseFloat(item?.basic) + parseFloat(item?.hra),
                    //         perday_salary: getPerDaySalary(item.basic + item.hra, employeewithSalary?.working_day, employeewithSalary?.salary_type),
                    //         perhour_ot_salary: parseFloat(parseFloat((item?.basic + item?.hra) / (employeewithSalary?.working_day)).toFixed(2) / parseFloat(employeewithSalary?.working_hour)).toFixed(2),
                    //         excel_net_salary: item?.excel_net_salary ? parseFloat(item?.excel_net_salary) : 0,
                    //         net_difference: 0,
                    //         employee: employeewithSalary?.employee?._id,
                    //     })

                    // }

                    // if (item.deduct_mess !== '' && parseFloat(item.deduct_mess) > 0) {
                    //     ded_mess.push({
                    //         firm_id: req.body.firm_id,
                    //         year_id: req.body.year_id,
                    //         voucher_no: (++newDeduct_no).toString(),
                    //         month: monthVal,
                    //         date: `2024-0${monthVal}-30`,
                    //         employee: employee?._id,
                    //         type: 'Mess',
                    //         amount: (parseFloat(item.deduct_mess)).toFixed(2),
                    //         remark: "",
                    //         other_voucher_no: "",
                    //         other_remark: ""
                    //     });
                    // }
                    // if (item.deduct_loan !== '' && parseFloat(item.deduct_loan) > 0) {
                    //     ded_loan.push({
                    //         firm_id: req.body.firm_id,
                    //         year_id: req.body.year_id,
                    //         voucher_no: (++newDeduct_no).toString(),
                    //         month: monthVal,
                    //         date: `2024-0${monthVal}-30`,
                    //         employee: employee?._id,
                    //         type: 'Loan',
                    //         amount: (parseFloat(item.deduct_loan)).toFixed(2),
                    //         remark: "",
                    //         other_voucher_no: "",
                    //         other_remark: ""
                    //     });
                    // }
                    // if (item.deduct_other !== '' && parseFloat(item.deduct_other) > 0) {
                    //     ded_other.push({
                    //         firm_id: req.body.firm_id,
                    //         year_id: req.body.year_id,
                    //         voucher_no: (++newDeduct_no).toString(),
                    //         month: monthVal,
                    //         date: `2024-0${monthVal}-30`,
                    //         employee: employee?._id,
                    //         type: 'Other',
                    //         amount: (parseFloat(item.deduct_other)).toFixed(2),
                    //         remark: "",
                    //         other_voucher_no: "",
                    //         other_remark: ""
                    //     });
                    // }

                    // if (item.earn_bonus !== '' && parseFloat(item.earn_bonus) > 0) {
                    //     earn_bonus.push({
                    //         firm_id: req.body.firm_id,
                    //         year_id: req.body.year_id,
                    //         voucher_no: (++newVoucher_no).toString(),
                    //         month: monthVal,
                    //         date: `2024-0${monthVal}-30`,
                    //         employee: employee?._id,
                    //         type: 'Bonus',
                    //         amount: (parseFloat(item.earn_bonus)).toFixed(2),
                    //         remark: "",
                    //         other_voucher_no: "",
                    //         other_remark: ""
                    //     });
                    // }
                    // if (item.earn_ot !== '' && parseFloat(item.earn_ot) > 0) {
                    //     earn_ot.push({
                    //         firm_id: req.body.firm_id,
                    //         year_id: req.body.year_id,
                    //         voucher_no: (++newVoucher_no).toString(),
                    //         month: monthVal,
                    //         date: `2024-0${monthVal}-30`,
                    //         employee: employee?._id,
                    //         type: 'Over Time',
                    //         amount: (parseFloat(item.earn_ot)).toFixed(2),
                    //         remark: "",
                    //         other_voucher_no: "",
                    //         other_remark: ""
                    //     });
                    // }
                    // if (item.earn_other !== '' && parseFloat(item.earn_other) > 0) {
                    //     earn_other.push({
                    //         firm_id: req.body.firm_id,
                    //         year_id: req.body.year_id,
                    //         voucher_no: (++newVoucher_no).toString(),
                    //         month: monthVal,
                    //         date: `2024-0${monthVal}-30`,
                    //         employee: employee?._id,
                    //         type: 'Other',
                    //         amount: (parseFloat(item.earn_other)).toFixed(2),
                    //         remark: "",
                    //         other_voucher_no: "",
                    //         other_remark: ""
                    //     });
                    // }

                    if (item.sunday_present !== '' && parseFloat(item.sunday_present) > 0) {
                        earn_sunday.push({
                            firm_id: req.body.firm_id,
                            year_id: req.body.year_id,
                            voucher_no: (++newVoucher_no).toString(),
                            month: monthVal,
                            date: `2024-0${monthVal}-30`,
                            employee: employee?._id,
                            type: 'Sunday_Present',
                            amount: EarningRates.Extra * (parseFloat(item.sunday_present)).toFixed(2),
                            remark: "Earning for Sunday Present",
                            other_voucher_no: "",
                            other_remark: ""
                        });
                    }

                    if (item.full_night_present !== '' && parseFloat(item.full_night_present) > 0) {
                        earn_fullnight.push({
                            firm_id: req.body.firm_id,
                            year_id: req.body.year_id,
                            voucher_no: (++newVoucher_no).toString(),
                            month: monthVal,
                            date: `2024-0${monthVal}-30`,
                            employee: employee?._id,
                            type: 'Full_Night_Present',
                            amount: EarningRates.Extra * (parseFloat(item.full_night_present)).toFixed(2),
                            remark: "Earning for Full Night Present",
                            other_voucher_no: "",
                            other_remark: ""
                        });
                    }

                    if (item.bonus_percent !== '' && parseFloat(item.bonus_percent) > 0) {
                        let totalPresentDays = item?.actual_present_day + item?.cl_day + item?.ph_day;
                        let bonusAmt = Math.round((item.bonus_percent / 100) * (employeewithSalary?.perday_salary * totalPresentDays));
                        earn_bonus.push({
                            firm_id: req.body.firm_id,
                            year_id: req.body.year_id,
                            voucher_no: (++newVoucher_no).toString(),
                            month: monthVal,
                            date: `2024-0${monthVal}-30`,
                            employee: employee?._id,
                            type: 'Bonus',
                            amount: bonusAmt,
                            remark: "Earning for Bonus",
                            other_voucher_no: "",
                            other_remark: ""
                        });
                    }
                }

                if (monthly.length > 0) {
                    await monthlyAttendanceModel.insertMany(monthly);
                }

                // if (ded_mess.length > 0) {
                //     await deductionModel.insertMany(ded_mess);
                //     messages.push("Deductions added successfully");
                // }

                // if (ded_loan.length > 0) {
                //     await deductionModel.insertMany(ded_loan);
                //     messages.push("Deductions added successfully");
                // }

                // if (ded_other.length > 0) {
                //     await deductionModel.insertMany(ded_other);
                //     messages.push("Deductions added successfully");
                // }

                // Just to update the basic and hra salary in database usage- Not a part of monthly-Data
                // if (salary.length > 0) {
                //     for (const empSalary of salary) {

                //         await salaryModel.findByIdAndUpdate(empSalary?._id, empSalary);
                //     }
                //     messages.push("Salary updated successfully");
                // }

                if (earn_bonus.length > 0) {
                    await earningModel.insertMany(earn_bonus);
                }

                if (earn_sunday.length > 0) {
                    await earningModel.insertMany(earn_sunday);
                }

                if (earn_fullnight.length > 0) {
                    await earningModel.insertMany(earn_fullnight);
                }


                // if (earn_other.length > 0) {
                //     await earningModel.insertMany(earn_other);
                //     messages.push("Earning added successfully");
                // }
                // if (earn_ot.length > 0) {
                //     await earningModel.insertMany(earn_ot);
                //     messages.push("Earning added successfully");
                // }

                sendResponse(res, 200, true, {}, "Monthly data imported successfully");
            } catch (err) {
                console.log(err);
            }
        });
    } else {
        sendResponse(res, 401, false, {}, 'Unauthorised');
    }
}




exports.importDailyData = async (req, res) => {
    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, 'Unauthorized');
    }

    upload(req, res, async (err) => {
        const { firm_id, year_id, password, month } = req.body;

        if (!firm_id || !year_id || !password || !month) {
            return sendResponse(res, 400, false, {}, 'Firm, Year, Password, and Month are required');
        }

        if (!req.file) {
            return sendResponse(res, 400, false, {}, 'Select an Excel file');
        }

        if (req.file.mimetype !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            fs.unlinkSync(req.file.path);
            return sendResponse(res, 400, false, {}, 'Invalid file type. Please upload an Excel file');
        }

        if (err) {
            return sendResponse(res, 400, false, {}, `File not uploaded: ${err.message}`);
        }

        if (password !== process.env.DAILY_IMPORT_PASSWORD) {
            return sendResponse(res, 401, false, {}, 'Invalid password');
        }

        try {
            const data = parser.parseXls2Json(req.file.path);
            const result = data.at(0);
            const filteredResult = result.filter(item => item.Shift || item.OT_Hrs || item.OtherAP || item.AP);
            const entry = [];
            const errors = [];
            const sundayPresents = [];
            const fullNightPresents = [];
            const holidayPresents = [];

            const processedEntries = new Set();

            const yearData = await yearModel.findById(year_id);
            const startYear = yearData?.start_year.getFullYear();
            const endYear = yearData?.end_year.getFullYear();
            const monthYear = month >= 4 && month <= 12 ? startYear : endYear;
            const daysofMonth = daysInMonth(month, monthYear);

            const lastEarningEntry = await earningModel.findOne({ deleted: false }).sort({ voucher_no: -1 });
            let earningVoucherNo = lastEarningEntry ? lastEarningEntry.voucher_no + 1 : 1;

            const lastDailyEntry = await dailyAttendanceModel.findOne({ deleted: false }).sort({ voucher_no: -1 });
            let currentVoucherNo = 1;
            if (lastDailyEntry) {
                currentVoucherNo = lastDailyEntry.voucher_no + 1;
            }

            const monthAttendance = await monthlyAttendanceModel.find({ month: month, deleted: false, year_id: year_id });
            if (monthAttendance.length > 0) {
                return sendResponse(res, 400, false, {}, 'Monthly data already imported for this month.');
            }

            for (let item of filteredResult) {
                const { Sr, EmployeeID, Shift, OT_Hrs, OtherAP, AP, Department, PID } = item;
                // console.log(item);
                // return;

                item.Date = formatToDate(item.Date);

                const shiftName = Shift === '' || Shift === 1 ? 'First' : 'Second';

                const uniqueKey = `${EmployeeID}_${item.Date}_${firm_id}_${year_id}`;
                if (processedEntries.has(uniqueKey)) {
                    continue;
                }

                processedEntries.add(uniqueKey);

                const [employeeDetails, departmentDetails, shifts, isHoliday, projectDetails] = await Promise.all([
                    employModel.findOne({ employee_id: EmployeeID, deleted: false }),
                    departmentModel.findOne({ name: Department, deleted: false }),
                    shiftModel.findOne({ name: shiftName, deleted: false }),
                    holiday.findOne({ date: new Date(item.Date) }),
                    projectModel.findOne({ voucher_no: PID, deleted: false }),
                ]);
                const currentDate = new Date(item.Date).getDate();
                const currentMonth = new Date(item.Date).getMonth() + 1;

                if (currentDate < 1 || currentDate > daysofMonth || currentMonth > month) {
                    errors.push({
                        employee: employeeDetails?.full_name,
                        date: item.Date,
                        index: Sr,
                        shift: Shift || 1,
                        ap: AP,
                        employee_id: EmployeeID,
                        message: `${item.Date} is not a valid date for this month.`,
                    });
                    continue;
                }

                const isSunday = new Date(item.Date).getDay() === 0;

                if (!isSunday && AP === 'SP') {
                    errors.push({
                        employee: employeeDetails?.full_name,
                        date: item.Date,
                        shift: Shift || 1,
                        ap: AP,
                        index: Sr,
                        employee_id: EmployeeID,
                        message: `${item.Date} is not a Sunday.`,
                    });
                    continue;
                }

                if (!isHoliday && AP === 'HP') {
                    errors.push({
                        employee: employeeDetails?.full_name,
                        date: item.Date,
                        shift: Shift || 1,
                        ap: AP,
                        index: Sr,
                        employee_id: EmployeeID,
                        message: `${item.Date} is not a holiday.`,
                    });
                    continue;
                }

                const empSalary = await salaryModel.findOne({ employee: employeeDetails?._id, month: parseInt(month), deleted: false });
                if (!empSalary) {
                    errors.push({
                        employee: employeeDetails?.full_name,
                        date: item.Date,
                        shift: Shift || 1,
                        ap: AP,
                        index: Sr,
                        employee_id: EmployeeID,
                        message: `Salary record not found for this Employee for ${MonthCount[month]}`,
                    });
                    continue;
                }

                const existingEntry = await dailyAttendanceModel.findOne({
                    employee: employeeDetails?._id,
                    date: item.Date,
                    firm_id,
                    year_id,
                    month: month,
                    deleted: false
                });

                if (existingEntry) {
                    errors.push({
                        employee: employeeDetails?.full_name,
                        date: item.Date,
                        shift: Shift || 1,
                        ap: AP,
                        index: Sr,
                        employee_id: EmployeeID,
                        message: `Already existing record for employee`,
                    });
                    continue;
                }

                const departmentId = departmentDetails ? departmentDetails._id : null;
                let pdays = 0, usedLeave = 0, fullNight = 0, halfDays = 0;

                switch (AP) {
                    // case 'A': case 'H': case 'O':
                    //     pdays = 0;
                    //     break;
                    case 'A': case 'H': case 'O':
                        pdays = 0;
                        break;
                    case 'H':
                        pdays = 1;
                        break;
                    case 'HD':
                        pdays = OtherAP === 'CL' ? 1.5 : 0.5;
                        usedLeave = OtherAP === 'CL' ? 1 : 0;
                        halfDays = 1;
                        break;
                    case 'P':
                        pdays = OtherAP === 'FN' ? 1 : 1;
                        fullNight = OtherAP === 'FN' ? 1 : 0;
                        break;
                    case 'CL':
                        pdays = 1;
                        usedLeave = 1;
                        break;
                    case 'SP': case 'HP':
                        pdays = 0;
                        break;
                    default:
                        pdays = 0;
                }

                if ((AP === 'SP' && isSunday) || (OtherAP === 'SP' && isSunday)) {
                    sundayPresents.push({
                        firm_id,
                        year_id,
                        employee: employeeDetails?._id,
                        date: new Date(item.Date),
                        e_year: monthYear,
                        e_day: new Date(item.Date).getDate(),
                        month: new Date(item.Date).getMonth() + 1,
                        voucher_no: earningVoucherNo++,
                        amount: EarningRates.Extra,
                        type: 'Sunday_Present',
                        remark: "Earning for Sunday Present",
                        other_voucher_no: "",
                        other_remark: "",
                        autoPost: true,
                    })
                }

                if ((AP === 'HP' && isHoliday) || (OtherAP === 'HP' && isHoliday)) {
                    holidayPresents.push({
                        firm_id,
                        year_id,
                        employee: employeeDetails?._id,
                        date: new Date(item.Date),
                        e_year: monthYear,
                        e_day: new Date(item.Date).getDate(),
                        month: new Date(item.Date).getMonth() + 1,
                        voucher_no: earningVoucherNo++,
                        amount: EarningRates.Extra,
                        type: 'Other',
                        remark: "Earning for Holiday Present",
                        other_voucher_no: "",
                        other_remark: "",
                        autoPost: true,
                    })
                }

                if (AP === 'FN' || OtherAP === 'FN') {
                    fullNightPresents.push({
                        firm_id,
                        year_id,
                        employee: employeeDetails?._id,
                        date: new Date(item.Date),
                        e_year: monthYear,
                        e_day: new Date(item.Date).getDate(),
                        month: new Date(item.Date).getMonth() + 1,
                        voucher_no: earningVoucherNo++,
                        amount: EarningRates.Extra,
                        type: 'Full_Night_Present',
                        remark: "Earning for Full Night Present Present",
                        other_voucher_no: "",
                        other_remark: "",
                        autoPost: true,
                    })
                }

                const newAP = (OtherAP !== 'undefined' || OtherAP == '' || OtherAP == '0') ? OtherAP.toUpperCase() : '';

                entry.push({
                    firm_id,
                    year_id,
                    voucher_no: currentVoucherNo,
                    empid: parseInt(EmployeeID),
                    project: projectDetails !== null ? projectDetails?._id : null,
                    employee: employeeDetails?._id,
                    work_department: departmentId,
                    date: item.Date,
                    shift: shifts?._id,
                    apchar: AP.toUpperCase(),
                    ot_hour: OT_Hrs || 0,
                    other: OtherAP,
                    present_day: pdays,
                    other_Apchar: newAP,
                    sum_Apchar: AP.toUpperCase() + newAP,
                    sunday_present: OtherAP === 'SP' ? 1 : 0,
                    full_night_present: OtherAP === 'FN' ? 1 : 0,
                    holiday_present: OtherAP === 'HP' ? 1 : 0,
                    use_leave: usedLeave,
                    half_day: halfDays,
                    import_tag: 1,
                    e_year: monthYear,
                    e_day: new Date(item.Date).getDate(),
                    month: new Date(item.Date).getMonth() + 1,
                });
                currentVoucherNo++;
            }
            let errorFile = "";
            if (errors.length > 0) {
                const workbook = new excelJS.Workbook();
                const worksheet = workbook.addWorksheet('Errors');

                worksheet.addRow(['Sr', 'Date', 'Name', 'EmpID', 'AP', 'Error_Message']);
                worksheet.getColumn(1).width = 5;
                worksheet.getColumn(2).width = 15;
                worksheet.getColumn(3).width = 40;
                worksheet.getColumn(4).width = 10;
                worksheet.getColumn(5).width = 6;
                worksheet.getColumn(6).width = 50;

                worksheet.getRow(1).eachCell(cell => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFF00' }
                    };
                });

                errors.forEach((error) => {
                    worksheet.addRow([error.index, error.date, error.employee, error.employee_id, error.ap, error.message]);
                });

                const xlsx = path.join(__dirname, '../../xlsx');
                if (!fs.existsSync(xlsx)) {
                    fs.mkdirSync(xlsx);
                }

                const filename = `DailyAttendance-Error-Report.xlsx`;
                const filePath = path.join(__dirname, '../../xlsx', filename);

                await workbook.xlsx.writeFile(filePath);


                const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
                const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;
                errorFile = fileUrl;
            }

            if (entry.length > 0) {
                // console.log(entry.filter(entry => entry.full_night_present == 1));
                // return;
                await dailyAttendanceModel.insertMany(entry);
                await earningModel.insertMany([...sundayPresents, ...fullNightPresents, ...holidayPresents])
                sendResponse(res, 200, true, { file: errorFile }, `Daily data (${entry.length} rows) imported successfully.`);
            } else {
                sendResponse(res, 200, false, {}, 'No new data to import');
            }

        } catch (err) {
            console.error(err);
            sendResponse(res, 500, false, {}, 'Internal server error');
        } finally {
            fs.unlinkSync(req.file.path);
        }
    });
};

exports.createMonthSalary = async (req, res) => {
    const { month, password, year_id, financial_year, is_fi_year } = req.body;
    if (req.user && !req.error) {
        if (!month || !password || !year_id) {
            sendResponse(res, 400, false, {}, 'Missing parameter');
            return;
        }
        try {
            if (password === process.env.SALARY_TRANSFER_PASSWORD) {
                const prevmonth = parseInt(month) === 1 ? 12 : parseInt(month) - 1;
                const employees = await salaryModel
                    .find({
                        month: prevmonth,
                        year_id: year_id,
                        deleted: false,
                        is_stop_salary: { $ne: true }
                    })
                    .populate('department', 'name')
                    .lean();

                const workDays = await workDayModel.find({ month: month, year_id: is_fi_year === "true" ? new ObjectId(financial_year) : new ObjectId(year_id), deleted: false }, { _id: 1, month: 1, department: 1, working_day: 1, ot_hours: 1 }).populate('department', 'name').lean();
                if (workDays.length === 0 || workDays.length === 1) {
                    sendResponse(res, 400, false, {}, 'No working days have been set for this month. Please add working days before processing salary transfers.');
                    return;
                }
                for (let emp of employees) {


                    const existingSalary = await salaryModel.findOne({
                        employee: emp.employee,
                        month: parseInt(month),
                        year_id: is_fi_year === "true" ? financial_year : year_id,
                        deleted: false,
                    });

                    if (existingSalary) {
                        continue;
                    }

                    let matchWorkDay = workDays.find(item => item.department.name === emp.department?.name);
                    let ps = parseFloat((emp?.total_salary / matchWorkDay?.working_day).toFixed(2));
                    let newEmp = { ...emp };

                    newEmp._id = new mongoose.Types.ObjectId();
                    newEmp.month = parseInt(month);
                    newEmp.work_day_id = matchWorkDay?._id;
                    newEmp.working_day = matchWorkDay?.working_day;
                    newEmp.excel_net_salary = 0;
                    newEmp.year_id = is_fi_year === "true" ? financial_year : year_id;
                    newEmp.perday_salary = ps;
                    newEmp.perhour_ot_salary = parseFloat(ps / matchWorkDay?.ot_hours).toFixed(2);
                    newEmp.createdAt = new Date();
                    newEmp.updatedAt = new Date();
                    await new salaryModel(newEmp).save();
                }
                sendResponse(res, 200, true, {}, 'Salary created successfully');
            }
            else {
                sendResponse(res, 401, false, {}, 'Incorrect password');
                return;
            }
        } catch (err) {
            sendResponse(res, 500, false, {}, err.message);
        }
    } else {
        sendResponse(res, 401, false, {}, 'Unauthorised');
    }
}

exports.importSalaryData = async (req, res) => {
    if (req.user && !req.error) {
        upload(req, res, async function (err) {
            if (!req.body.firm_id) {
                sendResponse(res, 400, false, {}, 'Firm is required');
                return;
            }

            if (!req.body.year_id) {
                sendResponse(res, 400, false, {}, 'Year is required');
                return;
            }

            if (!req.file) {
                sendResponse(res, 400, false, {}, 'Select an excel file');
                return;
            } else if (err) {
                return sendResponse(res, 400, false, {}, `Not uploaded: ${err.message}`);
            }

            try {
                const data = parser.parseXls2Json(req.file.path);
                const result = data.at(0).filter(res => res.basic != '');
                const monthVal = Object.keys(MonthCount).find(key => MonthCount[key] === item.month);

                const workingDay = await workDayModel.findOne({ month: parseInt(monthVal) })
                    .populate('department', 'name');


                const newSalary = [];
                const updateSalary = [];

                for (let item of result) {
                    let employee = await employModel.findOne({ employee_id: parseInt(item.employee) });
                    let existSalary = await salaryModel.findOne({ employee: employee?._id })
                        .populate('employee', 'full_name');

                    if (!existSalary) {
                        newSalary.push({
                            basic: parseFloat(item?.basic),
                            hra: parseFloat(item?.hra),
                            total_salary: parseFloat(item?.basic) + parseFloat(item?.hra),
                            perday_salary: parseFloat((item?.basic + item?.hra) / (existSalary?.working_day)).toFixed(2),
                            perhour_ot_salary: parseFloat(parseFloat((item?.basic + item?.hra) / (employeewithSalary?.working_day)).toFixed(2) / parseFloat(employeewithSalary?.working_hour)).toFixed(2),
                            excel_net_salary: item?.excel_net_salary ? parseFloat(item?.excel_net_salary) : 0,
                            net_difference: 0,
                            employee: employeewithSalary?.employee?._id,
                        })
                    } else {

                    }
                }
            } catch (err) {
                console.log(err)
                sendResponse(res, 400, false, {}, 'Something went wrong')
            }
        })

    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.generateExcelReport = async (req, res) => {
    const { month, year_id } = req.body;
    if (req.user && !req.error) {
        const query = {};
        if (month) {
            query.month = parseInt(month);
        }
        if (year_id) {
            query.year_id = new ObjectId(year_id);
        }
        try {
            const salaryReports = await SalaryReport.find(query)
                .populate('firm_id', 'name')
                .populate('year_id', 'start_year end_year')
                .populate('designation', 'name')
                .populate('shift', 'name')
                .populate('bank_name', 'name')
                .populate('department', 'name')
                .sort({ department: 1, name: 1 }).lean();

            if (salaryReports) {
                const monthVal = MonthCount[parseInt(month)];
                const workbook = new excelJS.Workbook();
                const worksheet = workbook.addWorksheet(`${monthVal}-Salary-report`);

                worksheet.columns = [
                    { header: "Sr.", key: "sr", width: 5 },
                    { header: "Month", key: "month", width: 10 },
                    // { header: "EmpId", key: "empid", width: 8 },
                    { header: 'Aadhar No', key: "adharno", width: 15 },
                    { header: 'DOB', key: 'dob', width: 12 },
                    { header: 'J.Date', key: 'joining_date', width: 12 },
                    { header: 'Mobile', key: 'mobile_number', width: 15 },
                    { header: "Card No", key: "cardno", width: 10 },
                    { header: 'Uan No.', key: "uan_no", width: 13 },

                    { header: "Employee", key: "employee", width: 55 },
                    { header: "F. Name", key: "father_name", width: 23 },

                    { header: "Department", key: "dept", width: 12 },
                    { header: "Designation", key: "designation", width: 18 },

                    { header: "P", key: "totalP", width: 5 },
                    { header: "FN", key: "totalFN", width: 5 },
                    { header: "SP", key: "totalSP", width: 5 },
                    { header: "H", key: "totalH", width: 5 },
                    { header: "CL", key: "totalCL", width: 5 },
                    { header: "PFN", key: "totalPFN", width: 5 },

                    { header: "Bonus", key: "is_bonus", width: 8 },


                    { header: "W.D.", key: "wday", width: 10 },
                    { header: "W.Hrs", key: "whours", width: 10 },
                    { header: "Pr.D.", key: "prday", width: 10 },
                    { header: "OTD.", key: "otday", width: 10 },
                    { header: "T.OTH.", key: "tothr", width: 10 },
                    { header: "TD", key: "tdeduct", width: 10 },

                    { header: "TS(Bonus Included Rate)", key: "tsalary", width: 10 },
                    { header: "Bonus(8.33%)", key: "total_bonus_amount", width: 5 },
                    { header: "Basic PF", key: "basic_pf", width: 10 },

                    { header: "SP S.", key: "totalSP_salary", width: 10 },
                    { header: "FN S.", key: "totalFN_salary", width: 10 },

                    { header: "Per.DayS.", key: "pdaySal", width: 10 },
                    { header: "PerH.OTS", key: "phrotSal", width: 10 },
                    { header: "Per.DS", key: "predaySal", width: 10 },
                    { header: "OTS", key: "otsal", width: 10 },
                    { header: "TExtraE", key: "tearning", width: 10 },
                    { header: "GS", key: "gs", width: 10 },

                    { header: "LoanD", key: "loan", width: 10 },
                    { header: "MessD", key: "mess_deduction", width: 10 },
                    { header: "PenaltyD", key: "penalty_deduction", width: 10 },
                    { header: "AdvanceD", key: "advance_deduction", width: 10 },

                    { header: "OtherD(Mes+Pen+Ad+Oth)", key: "otherdeduct", width: 10 },
                    { header: "PF", key: "pf", width: 10 },
                    { header: "ESI", key: "esi", width: 10 },
                    { header: "PT", key: "pt", width: 10 },
                    { header: "TDS", key: "tds", width: 10 },
                    { header: "LWF", key: "lwf", width: 10 },
                    { header: "TD.", key: "tdeduct", width: 10 },
                    { header: "NetS.", key: "netsal", width: 10 },
                    // { header: "Excel_Net", key: "excel_net_salary", width: 10 },
                    // { header: "Net_Difference", key: "net_difference", width: 10 },

                    { header: "Bank", key: "bank", width: 20 },
                    { header: "A/C No.", key: "account", width: 20 },
                    { header: "IFSC", key: "ifsc", width: 15 },
                ];


                worksheet.getRow(1).eachCell(cell => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFF00' } // Yellow color
                    };
                });


                salaryReports.map((report, index) => {
                    worksheet.addRow({
                        sr: index + 1,
                        month: monthVal,
                        // empid: report.employee_id,
                        card_no: report.card_no,
                        adharno: report?.adhar_no?.toString(),

                        dob: moment(report?.dob).format('DD-MM-YYYY'),
                        joining_date: moment(report?.joining_date).format('DD-MM-YYYY'),
                        mobile_number: report?.mobile_number,
                        cardno: report?.card_no,
                        uan_no: report?.uan_no,

                        employee: report?.name,
                        father_name: report?.father_name,

                        dept: report?.department?.name,
                        designation: report?.designation?.name,

                        totalP: report?.totalP,
                        totalFN: report?.totalFN,
                        totalSP: report?.totalSP,
                        totalH: report?.totalH,
                        totalCL: report?.totalCL,
                        totalPFN: report?.totalPFN,
                        is_bonus: report?.is_bonus,

                        wday: report?.working_day,
                        whours: report?.working_hour,
                        prday: report?.total_present_Day,
                        otday: report?.total_ot_Day,
                        tothr: report?.total_ot_hour,
                        tdeduct: report?.total_deduction,

                        tsalary: report?.total_salary,

                        total_bonus_amount: report?.isBonus_salary,

                        basic_pf: report?.basic_pf,
                        totalSP_salary: report?.totalSP ? (report?.totalSP * 500) : 0,
                        totalFN_salary: ((report?.totalFN * 500) || 0) + ((report?.totalPFN * 500) || 0),

                        pdaySal: report?.perday_salary,
                        phrotSal: report?.per_hour_ot_salary,
                        predaySal: report?.present_day_salary,
                        otsal: report?.ot_salary,
                        tearning: report?.total_extra_earning,
                        gs: report?.gross_salary,

                        loan: report?.loan_deduction,

                        mess_deduction: report?.mess_deduction,
                        penalty_deduction: report?.penalty_deduction,
                        advance_deduction: report?.advance_deduction,

                        otherdeduct: report?.total_other_deduction,
                        pf: report?.pf,
                        pt: report?.pt,
                        esi: report?.esi,
                        tds: report?.tds,
                        lwf: report?.lwf,
                        tdeduct: report?.total_deduction,
                        netsal: report?.net_salary,
                        // excel_net_salary: report?.excel_net_salary,
                        // net_difference: report?.net_difference,

                        bank: report?.bank_name?.name,
                        account: report?.bank_account_no,
                        ifsc: report?.bank_account_ifsc,
                    })
                });

                //File path for excel
                const xlsx = path.join(__dirname, '../../xlsx');
                if (!fs.existsSync(xlsx)) {
                    fs.mkdirSync(xlsx);
                }

                const filename = `${monthVal}-Salary-report.xlsx`;
                const filePath = path.join(__dirname, '../../xlsx', filename);

                //const filePath = path.join(__dirname, '../../xlsx/Salary-report.xlsx');
                await workbook.xlsx.writeFile(filePath);

                // const fileUrl = `${req.protocol}://${req.get('host')}/xlsx/${filename}`;
                const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
                const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;

                sendResponse(res, 200, true, fileUrl, 'XLSX file downloaded successfully');
            } else {
                sendResponse(res, 400, false, {}, "Employee salary report not found")
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.DepartmentSalaryReport = async (req, res) => {
    let { month, year_id, firm_id } = req.body;
    month = parseInt(month)
    year_id = new mongoose.Types.ObjectId(year_id)
    firm_id = new mongoose.Types.ObjectId(firm_id)
    if (req.user && !req.error) {
        try {

            const salaryReport = await SalaryReport.aggregate([
                {
                    $match:
                    {
                        year_id,
                        month,
                        firm_id
                    }
                }, {
                    $lookup: {
                        from: "departments",
                        let: { id: "$department" },
                        pipeline: [{
                            $match: {
                                $expr: {
                                    $eq: ["$_id", "$$id"]
                                }
                            }
                        }],
                        as: "deptDetails"
                    }
                }, {
                    $group: {
                        _id: "$department",
                        deptDetails: { $first: { $arrayElemAt: ["$deptDetails.name", 0] } },
                        reports: {
                            $push:
                            {
                                total_salary: { $sum: "$total_salary" },
                                perday_salary: { $sum: "$perday_salary" },
                                working_day: { $sum: "$working_day" },
                                basic_salary: { $sum: "$basic_salary" },
                                hra_salary: { $sum: "$hra_salary" },
                                conveyance_allowance_salary: { $sum: "$conveyance_allowance_salary" },
                                medical_allowance_salary: { $sum: "$medical_allowance_salary" },
                                other_salary: { $sum: "$other_salary" },
                                working_hour: { $sum: "$working_hour" },
                                total_present_Day: { $sum: "$total_present_Day" },
                                total_ot_Day: { $sum: "$total_ot_Day" },
                                total_days: { $sum: "$total_days" },
                                present_day_salary: { $sum: "$present_day_salary" },
                                ot_salary: { $sum: "$ot_salary" },
                                total_extra_earning: { $sum: "$total_extra_earning" },
                                gross_salary: { $sum: "$gross_salary" },
                                loan_deduction: { $sum: "$loan_deduction" },
                                total_other_deduction: { $sum: "$total_other_deduction" },
                                pf: { $sum: "$pf" },
                                esi: { $sum: "$esi" },
                                pt: { $sum: "$pt" },
                                tds: { $sum: "$tds" },
                                lwf: { $sum: "$lwf" },
                                total_deduction: { $sum: "$total_deduction" },
                                net_salary: { $sum: "$net_salary" },
                                total_ot_hour: { $sum: "$total_ot_hour" },
                                per_hour_ot_salary: { $sum: "$per_hour_ot_salary" },
                                excel_net_salary: { $sum: "$excel_net_salary" },
                                net_difference: { $sum: "$net_difference" },
                            }

                        }
                    }
                }, {
                    $project: {
                        _id: 0,
                        deptDetails: 1,
                        total_salary: { $sum: "$reports.total_salary" },
                        perday_salary: { $sum: "$reports.perday_salary" },
                        working_day: { $sum: "$reports.working_day" },
                        basic_salary: { $sum: "$reports.basic_salary" },
                        hra_salary: { $sum: "$reports.hra_salary" },
                        conveyance_allowance_salary: { $sum: "$reports.conveyance_allowance_salary" },
                        medical_allowance_salary: { $sum: "$reports.medical_allowance_salary" },
                        other_salary: { $sum: "$reports.other_salary" },
                        working_hour: { $sum: "$reports.working_hour" },
                        total_present_Day: { $sum: "$reports.total_present_Day" },
                        total_ot_Day: { $sum: "$reports.total_ot_Day" },
                        total_days: { $sum: "$reports.total_days" },
                        present_day_salary: { $sum: "$reports.present_day_salary" },
                        ot_salary: { $sum: "$reports.ot_salary" },
                        total_extra_earning: { $sum: "$reports.total_extra_earning" },
                        gross_salary: { $sum: "$reports.gross_salary" },
                        loan_deduction: { $sum: "$reports.loan_deduction" },
                        total_other_deduction: { $sum: "$reports.total_other_deduction" },
                        pf: { $sum: "$reports.pf" },
                        esi: { $sum: "$reports.esi" },
                        pt: { $sum: "$reports.pt" },
                        tds: { $sum: "$reports.tds" },
                        lwf: { $sum: "$reports.lwf" },
                        total_deduction: { $sum: "$reports.total_deduction" },
                        net_salary: { $sum: "$reports.net_salary" },
                        total_ot_hour: { $sum: "$reports.total_ot_hour" },
                        per_hour_ot_salary: { $sum: "$reports.per_hour_ot_salary" },
                        excel_net_salary: { $sum: "$reports.excel_net_salary" },
                        net_difference: { $sum: "$reports.net_difference" },
                    }
                }
            ]
            );

            // return res.json(salaryReport)

            if (salaryReport.length > 0) {
                let tot_total_salary = 0
                let tot_perday_salary = 0
                let tot_working_day = 0
                let tot_basic_salary = 0
                let tot_hra_salary = 0
                let tot_conveyance_allowance_salary = 0
                let tot_medical_allowance_salary = 0
                let tot_other_salary = 0
                let tot_working_hour = 0
                let tot_total_present_Day = 0
                let tot_total_ot_Day = 0
                let tot_total_days = 0
                let tot_present_day_salary = 0
                let tot_ot_salary = 0
                let tot_total_extra_earning = 0
                let tot_gross_salary = 0
                let tot_loan_deduction = 0
                let tot_total_other_deduction = 0
                let tot_pf = 0
                let tot_esi = 0
                let tot_pt = 0
                let tot_tds = 0
                let tot_lwf = 0
                let tot_total_deduction = 0
                let tot_net_salary = 0
                let tot_total_ot_hour = 0
                let tot_per_hour_ot_salary = 0
                let tot_excel_net_salary = 0
                let tot_net_difference = 0
                await salaryReport.forEach((o, i) => {
                    tot_total_salary += o.total_salary
                    tot_perday_salary += o.perday_salary
                    tot_working_day += o.working_day
                    tot_basic_salary += o.basic_salary
                    tot_hra_salary += o.hra_salary
                    tot_conveyance_allowance_salary += o.conveyance_allowance_salary
                    tot_medical_allowance_salary += o.medical_allowance_salary
                    tot_other_salary += o.other_salary
                    tot_working_hour += o.working_hour
                    tot_total_present_Day += o.total_present_Day
                    tot_total_ot_Day += o.total_ot_Day
                    tot_total_days += o.total_days
                    tot_present_day_salary += o.present_day_salary
                    tot_ot_salary += o.ot_salary
                    tot_total_extra_earning += o.total_extra_earning
                    tot_gross_salary += o.gross_salary
                    tot_loan_deduction += o.loan_deduction
                    tot_total_other_deduction += o.total_other_deduction
                    tot_pf += o.pf
                    tot_esi += o.esi
                    tot_pt += o.pt
                    tot_tds += o.tds
                    tot_lwf += o.lwf
                    tot_total_deduction += o.total_deduction
                    tot_net_salary += o.net_salary
                    tot_total_ot_hour += o.total_ot_hour
                    tot_per_hour_ot_salary += o.per_hour_ot_salary
                    tot_excel_net_salary += o.excel_net_salary
                    tot_net_difference += o.net_difference
                }
                )

                const data = {
                    reports: salaryReport, Net_Total: {
                        tot_total_salary,
                        tot_perday_salary,
                        tot_working_day,
                        tot_basic_salary,
                        tot_hra_salary,
                        tot_conveyance_allowance_salary,
                        tot_medical_allowance_salary,
                        tot_other_salary,
                        tot_working_hour,
                        tot_total_present_Day,
                        tot_total_ot_Day,
                        tot_total_days,
                        tot_present_day_salary,
                        tot_ot_salary,
                        tot_total_extra_earning,
                        tot_gross_salary,
                        tot_loan_deduction,
                        tot_total_other_deduction,
                        tot_pf,
                        tot_esi,
                        tot_pt,
                        tot_tds,
                        tot_lwf,
                        tot_total_deduction,
                        tot_net_salary,
                        tot_total_ot_hour,
                        tot_per_hour_ot_salary,
                        tot_excel_net_salary,
                        tot_net_difference,
                    }
                }
                sendResponse(res, 200, true, data, "Department wise Report found");
                return;
            }
            // if (inMonth) {
            sendResponse(res, 400, false, {}, "Unable to find report");
            return;
            // }
            // if (inDaily) {
            //     sendResponse(res, 400, false, {}, "Cannot delete salary. Employee is currently in the daily attendance");
            //     return;
            // }

        } catch (error) {
            console.log("ërror", error)
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.updateEmployeeByExcel = async (req, res) => {
    if (req.user && !req.error) {
        upload(req, res, async function (err) {
            try {
                const data = parser.parseXls2Json(req.file.path);
                const result = data.at(0).filter(p => p.First_Name != '');

                for (let row of result) {
                    const { employee, First_Name, Full_Name, Father_Name } = row;
                    await Employee.findOneAndUpdate({ employee_id: employee }, { first_name: First_Name, full_name: Full_Name, middle_name: Father_Name });

                }
                sendResponse(res, 200, true, {}, "Employee details updated successfully");
            } catch (err) {
                console.log(err)
                sendResponse(res, 500, false, {}, "Error updating employee details");
            }
        });
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
        return;
    }
};

const convertExcelDateToJSDate = (excelDate) => {
    const jsDate = new Date((excelDate - (25567 + 2)) * 86400 * 1000);
    return jsDate;
};

const converFirstLetterUpper = (str) => {
    if (typeof str !== 'string' || !str) return '';
    return str.substring(0, 1).toUpperCase() + str.substring(1).toLowerCase()
};

const getLastVoucherNo = async (model) => {
    const lastRecord = await model.findOne().sort({ voucher_no: -1 });
    return lastRecord ? lastRecord.voucher_no : 0;
}

const getPerDaySalary = (total_salary, working_day, salary_type) => {
    let perdaySalary = 0;
    if (salary_type === 'Monthly') {
        perdaySalary = (parseFloat(total_salary) /
            parseFloat(working_day))?.toFixed(2)
    } else if (salary_type === 'Fix') {
        perdaySalary = (parseFloat(total_salary) /
            parseFloat(working_day)
        )?.toFixed(2)
    } else if (salary_type === 'Daily') {
        perdaySalary = parseFloat((total_salary)?.toFixed(2))
    }

    return parseFloat(perdaySalary);
}

const daysInMonth = (month, year) => {
    const daysInMonths = [31, (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return daysInMonths[month - 1];
}

const formatToDate = (date) => {

    if (!isNaN(date) && typeof date === 'number') {
        const serialDate = new Date(0);
        serialDate.setDate(serialDate.getDate() + date - 25569);
        return serialDate.toISOString().split('T')[0];
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
        return null;
    }

    const year = parsedDate.getFullYear();
    const month = ('0' + (parsedDate.getMonth() + 1)).slice(-2);
    const day = ('0' + parsedDate.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
};


const oneAttendanceRegister = async (firm_id, year_id, month, project) => {
    try {
        const requestData = await Employee.aggregate([
            {
                $match: {
                    deleted: false,
                    firm_id: new ObjectId(firm_id),
                }
            },
            {
                $lookup: {
                    from: 'designations',
                    localField: 'designation',
                    foreignField: '_id',
                    pipeline: [{ $project: { name: 1 } }],
                    as: 'designationDetails'
                }
            },
            {
                $lookup: {
                    from: 'daily-attendances',
                    let: { empId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$employee', '$$empId'] },
                                        { $eq: ['$year_id', new ObjectId(year_id)] },
                                        { $eq: ['$month', parseInt(month)] },
                                        // { $eq: ['$project', new ObjectId(project)] },
                                        { $eq: ['$deleted', false] }
                                    ]
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: 'bussiness-projects',
                                localField: 'project',
                                foreignField: '_id',
                                pipeline: [{ $project: { name: 1 } }],
                                as: 'projectDetails',
                            }
                        },
                        {
                            $lookup: {
                                from: 'shifts',
                                localField: 'shift',
                                foreignField: '_id',
                                pipeline: [{ $project: { name: 1 } }],
                                as: 'shiftDetails',
                            }
                        },
                        {
                            $addFields: {
                                projectDetails: { $arrayElemAt: ["$projectDetails", 0] },
                                shiftDetails: { $arrayElemAt: ["$shiftDetails", 0] }
                            }
                        },
                        {
                            $project: { date: 1, present_day: 1, is_present: 1, apchar: 1, other_Apchar: 1, sum_Apchar: 1, project: "$projectDetails.name", shift: "$shiftDetails.name" }
                        }
                    ],
                    as: 'attendance'
                }
            },
            {
                $lookup: {
                    from: 'salaries',  // Salary Collection
                    let: { empId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$employee', '$$empId'] },
                                        { $eq: ['$year_id', new ObjectId(year_id)] },
                                        { $eq: ['$month', parseInt(month)] },
                                        { $eq: ['$firm_id', new ObjectId(firm_id)] },
                                        { $eq: ['$deleted', false] }
                                    ]
                                }
                            }
                        },
                        {
                            $project: { working_day: 1 } // Fetch only working_day
                        }
                    ],
                    as: 'salaryDetails'
                }
            },
            {
                $addFields: {
                    designationDetails: { $arrayElemAt: ["$designationDetails", 0] },
                    working_day: {
                        $ifNull: [{ $arrayElemAt: ["$salaryDetails.working_day", 0] }, 0]
                    },
                    ot: {
                        $map: {
                            input: "$attendance",
                            as: "att",
                            in: {
                                date: "$$att.date",
                                other_Apchar: "$$att.other_Apchar"
                            }
                        }
                    }
                },
            },
            {
                $match: {
                    $and: [
                        { attendance: { $ne: [] } },
                        { OT: { $ne: [] } }
                    ]
                }
            },
            {
                $project: {
                    _id: 1,
                    first_name: 1,
                    last_name: 1,
                    full_name: 1,
                    gender: 1,
                    dob: 1,
                    card_no: 1,
                    joining_date: 1,
                    designation_name: "$designationDetails.name",
                    attendance: 1,
                    working_day: 1,
                    ot: 1
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
}


exports.getAttendanceRegister = async (req, res) => {
    const { firm_id, year_id, month, project } = req.body;
    if (!req.user && req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }

    if (!firm_id || !year_id || !month || !project) {
        return sendResponse(res, 400, false, {}, "Please provide firm, year, month, and project");
    }
    try {
        const data = await oneAttendanceRegister(firm_id, year_id, month, project);
        let requestData = data.result;

        if (data.status === 1) {
            sendResponse(res, 200, true, requestData, `Attendace Register data list`);
        } else if (data.status === 0) {
            sendResponse(res, 200, true, [], `Attendace Register data not found`);
        } else if (data.status === 2) {
            console.log("error", data.result);
            sendResponse(res, 500, false, {}, "Something went wrong11");
        }
    } catch (error) {
        sendResponse(res, 500, false, {}, "Something went wrong1111");
    }
}

const getFirmDetails = async (firm_id) => {
    try {

        const firm = await Firm.aggregate([
            {
                $match: {
                    _id: new ObjectId(firm_id),
                    deleted: false
                }
            },
            {
                $project: {
                    _id: 0,
                    name: "$name",
                    firm_address: {
                        $concat: [
                            "$address", " ",
                            "$address_two", " ",
                            "$address_three", " ",
                            "$city", ", ",
                            "$state", " - ",
                            { $toString: "$pincode" }
                        ]
                    }
                }
            }
        ]);
        if (firm.length && firm.length > 0) {
            return { status: 1, result: firm[0] };
        } else {
            return { status: 0, result: {} };
        }
    } catch (error) {
        return { status: 2, result: error };
    }
}

const getYearDetails = async (year_id) => {
    try {
        const year = await yearModel.aggregate([
            {
                $match: {
                    _id: new ObjectId(year_id),
                    deleted: false
                }
            },
            {
                $project: {
                    _id: 0,
                    start_year: "$start_year",
                    end_year: "$end_year"
                }
            }
        ]);
        if (year.length && year.length > 0) {
            return { status: 1, result: year[0] };
        } else {
            return { status: 0, result: {} };
        }
    } catch (error) {
        return { status: 2, result: error };
    }
}

exports.downloadXlsxAttendaceRegister = async (req, res) => {
    const { firm_id, year_id, month, project, print_date } = req.body;
    if (!req.user && req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
    if (!firm_id || !year_id || !month) {
        return sendResponse(res, 400, false, {}, "Please provide firm, year, month, and project");
    }
    try {
        const data = await oneAttendanceRegister(firm_id, year_id, month, project);

        const firmDetails = await getFirmDetails(firm_id);
        const yearDetails = await getYearDetails(year_id);


        let requestData = data.result;
        if (data.status === 1) {

            const startYear = new Date(yearDetails.result.start_year).getFullYear();
            const endYear = new Date(yearDetails.result.end_year).getFullYear();
            const selectedMonth = parseInt(month); // Assuming month is 1-12
            const monthName = new Date(startYear, selectedMonth - 1, 1).toLocaleString('en-US', { month: 'long' });

            const daysInMonth = new Date(startYear, selectedMonth, 0).getDate();

            const workbook = new excelJS.Workbook();
            const worksheet = workbook.addWorksheet('ATTENDENCE REGI.');

            const headerStyle = {
                font: { bold: true },
                // fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'fdc686' } },
                alignment: { horizontal: 'center', vertical: 'middle' }
            };

            const headerStyle2 = {
                font: { size: 12, bold: true },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'fdc686' } },
                alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
            };

            const headerData = [
                { range: 'A1:AO2', value: `${firmDetails.result.name}\n${firmDetails.result.firm_address}`, style: headerStyle2 },
                { range: 'A3:AO4', value: 'ATTENDANCE REGISTER / MUSTER ROLL / FORM NO. 15 / FORM NO. 28 / REGISTER - 1', style: headerStyle },
                { range: 'AN5:AO5', value: `${monthName}/2025`, style: headerStyle }
            ];

            if (print_date) {
                headerData.push({ range: 'AN6:AO6', value: `Print Date: ${new Date().toLocaleDateString()}`, style: headerStyle });
            }

            headerData.forEach(({ range, value, style }) => {
                worksheet.mergeCells(range);
                worksheet.getCell(range.split(":")[0]).value = value;
                worksheet.getCell(range.split(":")[0]).style = style;
            });

            worksheet.addRow([]);

            const headers = [
                "SR. No.", "CARD/GP NO.", "NAME OF WORKER (FATHER / HUSBAND NAME)", "SEX (M/F)", "DESIGNATION",
                "DATE OF BIRTH", "DATE OF APPOINTMENT", "PROJECT", "SHIFT", "PERIOD OF WORK",
                ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
                "Total NO. OF DAYS", "REMARKS"
            ];

            worksheet.addRow(headers).eachCell(cell => (cell.style = headerStyle));

            [
                ['A9:B9', "1"], ['C9', "2-3"], ['D9', "4"], ['E9', "5"], ['F9', "6"],
                ['G9', "7"], ['H9', "8"], ['I9', "9"], ['J9', "10"],
            ].forEach(([range, value]) => {
                worksheet.mergeCells(range);
                worksheet.getCell(range.split(":")[0]).value = value;
                worksheet.getCell(range.split(":")[0]).style = headerStyle;
            });

            const columnWidths = [
                7,  // SR. No.
                15,  // CARD/GP NO.
                45,  // NAME OF WORKER (FATHER / HUSBAND NAME)
                10,   // SEX (M/F)
                25,  // DESIGNATION
                15,  // DATE OF BIRTH
                22,  // DATE OF APPOINTMENT
                30,  // PROJECT
                10,  // SHIFT
                20,   // PERIOD OF WORK
                ...Array.from({ length: daysInMonth }, () => 5), // Dates (1-31)
                18,  // Total NO. OF DAYS
                10   // REMARKS
            ];

            columnWidths.forEach((width, index) => {
                worksheet.getColumn(index + 1).width = width;
            });

            let rowIndex = 10;
            requestData.forEach((worker, index) => {
                let row = [
                    index + 1,
                    worker.card_no,
                    worker.full_name,
                    worker.gender.charAt(0).toUpperCase(),
                    worker.designation_name || "",
                    new Date(worker.dob).toLocaleDateString(),
                    new Date(worker.joining_date).toLocaleDateString(),
                    worker.project,
                    worker.shift || "",
                    worker.working_day || "",
                ];

                let attendanceMap = {};
                worker.attendance.forEach(att => {
                    const day = new Date(att.date).getDate();
                    attendanceMap[day] = att.apchar || "-";
                });

                for (let day = 1; day <= daysInMonth; day++) {
                    row.push(attendanceMap[day] || "-");
                }

                row.push(worker.attendance.filter(a => a.present_day === 1).length);
                row.push("");

                worksheet.addRow(row);

                // Add the OT row dynamically
                let otRow = new Array(10 + daysInMonth + 2).fill(""); // Adjust the length for total columns
                otRow[0] = "OT"; // Place OT under the "Name of Worker" column

                for (let day = 1; day <= daysInMonth; day++) {
                    const otEntry = worker.attendance.find(att => new Date(att.date).getDate() === day);
                    otRow[10 + day - 1] = otEntry ? otEntry.other_Apchar || "" : "";
                }

                worksheet.addRow(otRow);
            });

            const xlsxPath = path.join(__dirname, '../../xlsx');
            if (!fs.existsSync(xlsxPath)) {
                fs.mkdirSync(xlsxPath, { recursive: true });
            }

            const filename = `ATTENDANCE_REG_${Date.now()}.xlsx`;
            const filePath = path.join(xlsxPath, filename);

            await workbook.xlsx.writeFile(filePath);

            const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
            const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;

            sendResponse(res, 200, true, { file: fileUrl }, `XLSX file generated successfully`);
        } else if (data.status === 0) {
            sendResponse(res, 200, false, {}, `Attendace report not found`)
        }
        else if (data.status === 2) {
            console.log(data.error)
            sendResponse(res, 500, false, {}, "Something went wrong111");
        }
    } catch (error) {
        console.log(error);
        sendResponse(res, 500, false, {}, "Something went wrong");
    }
}

exports.updateGatePass = async (req, res) => {
    upload(req, res, async function (err) {
        if (!req.file) {
            sendResponse(res, 400, false, {}, 'Select an excel file');
            return;
        } else if (err) {
            return sendResponse(res, 400, false, {}, `Not uploaded: ${err.message}`);
        }
        try {
            const filePath = req.file.path;
            const workbook = xlsx.readFile(filePath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = xlsx.utils.sheet_to_json(sheet);

            const results = [];
            const errors = [];
            for (const row of rows) {
                const adhar = row.adhar?.toString().trim();
                const newCard = row.new_card?.toString().trim();

                if (!adhar || !newCard) {
                    results.push({ adhar, status: 'Skipped - Missing data' });
                    continue;
                }

                const employee = await Employee.findOneAndUpdate(
                    { adhar_no: parseInt(adhar) },
                    { card_no: newCard },
                    { new: true }
                );

                if (employee) {
                    results.push({ adhar, status: 'Updated', card_no: newCard });
                } else {
                    errors.push({ ...row, adhar: parseInt(adhar), error: 'Employee not found with adhar_no' });
                }
            }

            fs.unlinkSync(filePath);

            if (errors.length > 0) {
                const outputWorkbook = xlsx.utils.book_new();
                const errorSheet = xlsx.utils.json_to_sheet(errors);
                xlsx.utils.book_append_sheet(outputWorkbook, errorSheet, 'Errors');
                const resultSheet = xlsx.utils.json_to_sheet(results);
                xlsx.utils.book_append_sheet(outputWorkbook, resultSheet, 'Results');

                // Create a unique filename
                const timestamp = Date.now();
                const outputFilename = `gatepass_update_${timestamp}.xlsx`;
                const outputDir = path.join(__dirname, '../../public/downloads');

                // Ensure directory exists
                if (!fs.existsSync(outputDir)) {
                    fs.mkdirSync(outputDir, { recursive: true });
                }

                const outputPath = path.join(outputDir, outputFilename);
                xlsx.writeFile(outputWorkbook, outputPath);

                // Generate public URL
                const fileUrl = `${req.protocol}://${req.get('host')}/downloads/${outputFilename}`;

                // Return URL instead of forcing download
                return sendResponse(res, 200, true, {
                    url: fileUrl,
                    results,
                    errors
                }, 'Processing complete. Download available at the provided URL.');
            }
            return sendResponse(res, 200, true, results, 'Card numbers updated successfully');
        } catch (error) {
            console.error('Update error:', error);
            return sendResponse(res, 500, false, {}, 'Something went wrong');
        }
    })
}

// exports.getDob = async (req, res) => {
//     try {
//         // Convert string to Date object, and normalize it (remove time)
//         const targetDate = new Date('2024-06-25T00:00:00.000Z');

//         // Start and end of the day for range query
//         const startOfDay = new Date(targetDate.setUTCHours(0, 0, 0, 0));
//         const endOfDay = new Date(targetDate.setUTCHours(23, 59, 59, 999));

//         // Find all employees with dob on this date
//         const employees = await Employee.find(
//             {
//                 dob: {
//                     $gte: startOfDay,
//                     $lte: endOfDay,
//                 },
//             },
//             { full_name: 1, dob: 1, _id: 1, card_no: 1 }
//         );

//         console.log(employees?.length);

//         if (employees.length > 0) {
//             // Create the new date (01-01-2000)
//             const newDob = new Date('2000-01-01T00:00:00.000Z');

//             // Extract just the IDs for the update operation
//             const employeeIds = employees.map(emp => emp._id);

//             // Update all matching employees
//             const updateResult = await Employee.updateMany(
//                 { _id: { $in: employeeIds } },
//                 { $set: { dob: newDob } }
//             );

//             console.log(`Updated ${updateResult.modifiedCount} employees`);

//             // Return the original data before update, or the updated count, or fetch fresh data
//             return sendResponse(res, 200, true, {
//                 matched: employees.length,
//                 updated: updateResult.modifiedCount,
//                 originalData: employees
//             }, 'Data found and updated');
//         } else {
//             return sendResponse(res, 200, false, {}, 'Data not found');
//         }
//     } catch (error) {
//         console.error('Error:', error);
//         return sendResponse(res, 500, false, {}, 'Server error');
//     }
// }

exports.updateLeavingDate = async (req, res) => {
    upload(req, res, async function (err) {
        if (!req.file) {
            return sendResponse(res, 400, false, {}, 'Select an excel file');
        }
        if (err) {
            return sendResponse(res, 400, false, {}, `Not uploaded: ${err.message}`);
        }

        try {
            const filePath = req.file.path;
            const workbook = xlsx.readFile(filePath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = xlsx.utils.sheet_to_json(sheet);

            const results = [];
            const errors = [];

            for (const row of rows) {
                // Skip empty rows
                if (!row || (!row.adhar_no && !row.date)) {
                    continue;
                }

                const adhar = row.adhar_no?.toString().trim();
                let date = row.date;

                // Skip if missing required data
                if (!adhar || !date) {
                    results.push({ adhar, status: 'Skipped - Missing data' });
                    continue;
                }

                // Convert Excel date to JS date if needed
                if (typeof date === 'number') {
                    date = xlsx.SSF.format('yyyy-mm-dd', date);
                } else {
                    date = new Date(date).toISOString().split('T')[0];
                }

                try {
                    const employee = await Employee.findOneAndUpdate(
                        { adhar_no: parseInt(adhar) }, // Keep as string
                        {
                            leaving_date: date,
                            leaving_reason: "Updated Leaving Date With XLSX sheet by system"
                        },
                        { new: true }
                    );

                    if (employee) {
                        results.push({
                            adhar,
                            status: 'Updated',
                            employee_id: employee._id,
                            leaving_date: date
                        });
                    } else {
                        errors.push({
                            ...row,
                            error: 'Employee not found with this Aadhar number'
                        });
                    }
                } catch (dbError) {
                    errors.push({
                        ...row,
                        error: `Database error: ${dbError.message}`
                    });
                }
            }

            fs.unlinkSync(filePath);

            // Prepare response
            const response = {
                success: true,
                totalRecords: rows.length,
                processed: results.length,
                errors: errors.length,
                results,
                errors
            };

            // Generate error report if needed
            if (errors.length > 0) {
                const outputWorkbook = xlsx.utils.book_new();
                const errorSheet = xlsx.utils.json_to_sheet(errors);
                xlsx.utils.book_append_sheet(outputWorkbook, errorSheet, 'Errors');
                const resultSheet = xlsx.utils.json_to_sheet(results);
                xlsx.utils.book_append_sheet(outputWorkbook, resultSheet, 'Results');

                const timestamp = Date.now();
                const outputFilename = `leaving_date_update_${timestamp}.xlsx`;
                const outputDir = path.join(__dirname, '../../public/downloads');

                if (!fs.existsSync(outputDir)) {
                    fs.mkdirSync(outputDir, { recursive: true });
                }

                const outputPath = path.join(outputDir, outputFilename);
                xlsx.writeFile(outputWorkbook, outputPath);

                response.downloadUrl = `${req.protocol}://${req.get('host')}/downloads/${outputFilename}`;
            }

            return sendResponse(res, 200, true, response, errors.length > 0
                ? 'Processing complete with some errors'
                : 'All leaving dates updated successfully');
        } catch (error) {
            console.error('Update error:', error);
            return sendResponse(res, 500, false, {}, 'Internal server error');
        }
    });
};

exports.addGatepassNo = async (req, res) => {
    upload(req, res, async function (err) {
        if (!req.file) {
            return sendResponse(res, 400, false, {}, 'Select an excel file');
        }
        if (err) {
            return sendResponse(res, 400, false, {}, `Not uploaded: ${err.message}`);
        }
        try {
            const filePath = req.file.path;
            const workbook = xlsx.readFile(filePath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = xlsx.utils.sheet_to_json(sheet);

            const results = [];
            const errors = [];

            for (const row of rows) {

                const { employeeCode, adhar_no, device_code, name } = row;
                try {
                    const adhar = adhar_no?.toString().trim();
                    const employee = await Employee.findOneAndUpdate({
                        adhar_no: parseInt(adhar),
                    }, {
                        punch_machine_no: employeeCode,
                    },
                        { new: true }
                    );

                    if (employee) {
                        results.push({
                            adhar_no: adhar,
                            status: 'Updated',
                            employee_id: employee._id,
                            punch_machine_no: employeeCode
                        });
                    } else {
                        errors.push({
                            ...row,
                            error: 'Employee not found with this Aadhar number'
                        });
                    }

                } catch (error) {
                    errors.push({
                        ...row,
                        error: `Database error: ${error.message}`
                    });
                }
            }

            fs.unlinkSync(filePath);

            const response = {
                success: true,
                totalRecords: rows.length,
                processed: results.length,
                errors: errors.length,
                results,
                errors
            };

            if (errors.length > 0) {
                const outputWorkbook = xlsx.utils.book_new();
                const errorSheet = xlsx.utils.json_to_sheet(errors);
                xlsx.utils.book_append_sheet(outputWorkbook, errorSheet, 'Errors');
                const resultSheet = xlsx.utils.json_to_sheet(results);
                xlsx.utils.book_append_sheet(outputWorkbook, resultSheet, 'Results');

                const timestamp = Date.now();
                const outputFilename = `leaving_date_update_${timestamp}.xlsx`;
                const outputDir = path.join(__dirname, '../../public/downloads');

                if (!fs.existsSync(outputDir)) {
                    fs.mkdirSync(outputDir, { recursive: true });
                }

                const outputPath = path.join(outputDir, outputFilename);
                xlsx.writeFile(outputWorkbook, outputPath);

                response.downloadUrl = `${req.protocol}://${req.get('host')}/downloads/${outputFilename}`;
            }

            return sendResponse(res, 200, true, response, errors.length > 0
                ? 'Processing complete with some errors'
                : 'All leaving dates updated successfully');

        } catch (error) {
            console.error('Update error:', error);
            return sendResponse(res, 500, false, {}, 'Internal server error');
        }
    })
}