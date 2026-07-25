const Admin = require('../models/admin.model');
const Otps = require('../models/otp.model');
const Customer = require('../models/store/customer.model')
const InventoryLocation = require('../models/store/inventory_location.model');
const ItemCategories = require('../models/store/item_category.model');
const Items = require('../models/store/item.model');
const Suppliers = require('../models/store/supplier.model');
const Firm = require('../models/firm.model')
const Department = require('../models/payroll/department.model');
const users = require('../models/users.model');
const Employee = require('../models/payroll/employ.model')
const md5 = require('md5');
const jwt = require('jsonwebtoken');

const Transaction = require('../models/main-store/transaction/transaction.model');
const Tag = require('../models/main-store/general/tag.model');

const DailyAttendance = require('../models/payroll/daily.attendance.model');
const SalaryReport = require('../models/payroll/salaryreport.model');

const { sendResponse } = require('../helper/response');
const { sendMail } = require('../helper');
const { generateOtp } = require('../helper');
const { Status } = require('../utils/enum');
const { default: mongoose } = require("mongoose");
const { Types: { ObjectId }, } = require("mongoose");

const Fitup = require('../models/erp/Multi/multi_fitup_inspection.model');
const WeldVisual = require('../models/erp/Multi/multi_weld_inspection.model');
const FinalDimension = require('../models/erp/Multi/multi_fd_master.model');
const FinalCoat = require('../models/erp/Multi/multi_final_coat_inspection.model');
const DispatchNote = require('../models/erp/Multi/dispatch_note/multi_dispatch_note.model');
const Drawing = require('../models/erp/planner/draw.model');

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email && !password) {
            sendResponse(res, 400, false, null, "Missing parameters")
        } else {
            const admin = await Admin.findOne({
                email,
                password: md5(password),
            })

            if (admin) {
                var token = jwt.sign(
                    { admin: { id: admin._id } },
                    process.env.SECRET_KEY_JWT
                );

                const data = {
                    name: admin.name,
                    email: admin.email,
                    image: admin.image,
                    token: token
                }

                sendResponse(res, 200, true, data, "Login successful.");
            } else {
                sendResponse(res, 400, false, [], "Invalid credentials");
            }
        }
    } catch (err) {
        sendResponse(res, 500, false, null, "Something went wrong")
    }
}

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (email) {
        const adminDetail = await Admin.findOne({ email });
        if (adminDetail) {
            const otp = await generateOtp(email);

            const html = `<table cellspacing="0" border="0" cellpadding="0" width="100%" bgcolor="#f2f3f8" style="font-family: Arial, sans-serif; padding: 20px;">
                        <tr>
                            <td>
                                <table style="background-color: #fff; max-width:600px; margin:0 auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);" width="100%" border="0" align="center" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="padding: 40px;">
                                            <h2 style="color: #333; font-size: 24px; margin-bottom: 20px;">Password Reset</h2>
                                            <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">Hi ${email},</p>
                                            <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">You requested a password reset for your account. Click the link below to reset your password:</p>
                                            <p style="background-color: #007bff; color: #fff; text-decoration: none; font-size: 16px; padding: 12px 20px; border-radius: 5px; display: inline-block;">${otp}</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>`;

            const sendingEmail = await sendMail("Reset Password Link", email, html);
            if (sendingEmail) {
                // console.log(sendingEmail, '@@@')
                sendResponse(res, 200, true, null, "Verification Code Sent")
            } else {
                sendResponse(res, 500, true, null, "Something went wrong while sending email");
            }
        } else {
            sendResponse(res, 400, false, [], "Email does not exists")
        }
    } else {
        sendResponse(res, 400, false, null, "Missing parameters")
    }
}

exports.verifyOtp = async (req, res) => {
    const { email, otp } = req.body;
    if (email && otp) {
        await Otps.findOne({
            email: email.trim().toLowerCase(),
        }).then(async (data) => {

            if (data && data._id) {
                if (data.otp == otp) {
                    var dates = Date.now();

                    if (data.expire_time < dates) {
                        sendResponse(res, 400, false, {}, "The OTP code has expired");
                    } else {
                        await Otps.findByIdAndUpdate(
                            data._id,
                            { otp: "", expire_time: "" },
                            { useFindAndModify: false }
                        ).then(async (datas) => {
                            sendResponse(res, 200, true, {}, "Otp verify successfully");
                        }).catch((err) => {
                            sendResponse(res, 400, false, {}, "Some error occurred while verifying OTP.");
                        });
                    }
                } else {
                    sendResponse(res, 400, false, {}, "Incorrect OTP");
                }
            } else {
                sendResponse(res, 400, false, {}, "No OTP found for this email");
            }
        }).catch((err) => {
            sendResponse(res, 400, false, {}, "Some error occurred while verifying OTP.");
        });
    } else {
        sendResponse(res, 400, false, {}, "Missing Parameters");
    }
}


exports.checkAccount = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            sendResponse(res, 400, true, null, "Missing parameters")
        } else {
            const adminDetail = await Admin.findById(id)

            if (adminDetail) {
                sendResponse(res, 200, true, adminDetail, "Account found");
            } else {
                sendResponse(res, 400, false, [], "Account not found");
            }
        }
    } catch (err) {

        sendResponse(res, 400, false, null, "Account not found");
    }
}

exports.resetPassword = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email && !password) {
            sendResponse(res, 400, false, null, "Missing parameters");
        } else {
            const adminDetail = await Admin.findOne({ email: email });

            if (adminDetail) {
                const pwd = md5(password);
                if (adminDetail.password === pwd) {
                    sendResponse(res, 400, false, null, "New password should be different from old password");
                } else {
                    await Admin.findByIdAndUpdate(adminDetail._id, { password: pwd });
                    sendResponse(res, 200, true, null, "Password reset successfully");
                }
            } else {
                sendResponse(res, 400, false, [], "Account not found");
            }
        }
    } catch (error) {
        console.log(error)
        sendResponse(res, 500, false, null, 'Something went wrong');
    }
}

exports.changePassword = async (req, res) => {

    if (req.user) {
        var conditions = { _id: req.user.admin.id };
        const getPassword = await Admin.findOne(conditions);

        if (getPassword.password == md5(req.body.old_password)) {

            if (getPassword.password == md5(req.body.new_password)) {
                res.status(400).send({
                    message: "New password should be different from old password",
                    success: false,
                    data: [],
                });
            } else {
                var encryptedPassword = md5(req.body.new_password);
                Admin.findByIdAndUpdate(
                    conditions,
                    { password: encryptedPassword },
                    { useFindAndModify: false }
                )
                    .then((data) => {

                        if (!data) {
                            res.status(400).send({
                                message: "Your password is not reset",
                                success: false,
                                data: [],
                            });
                        } else {
                            res.status(200).send({
                                success: true,
                                data: [],
                                message: "Password is reset successfully",
                            });
                        }
                    })
                    .catch((err) => {
                        res.status(400).send({
                            success: false,
                            data: [],
                            message: "Admin is not exist",
                        });
                    });
            }
        } else {
            res.status(200).send({
                success: false,
                data: [],
                message: "Old password is wrong",
            });
        }
    } else {
        res.status(401).send({
            success: false,
            data: [],
            message: "You are not authorized",
        });
    }
};

exports.getProfile = async (req, res) => {
    if (req.user && !req.error) {
        await Admin.findOne({ _id: req.user.admin.id }, { password: 0 })
            .lean()
            .then(async (data) => {

                res.status(200).send({
                    success: true,
                    data: data,
                    message: "Admin data"
                });
            });
    } else {
        res.status(401).send({
            error: { message: "Unauthorized" },

        });
    }
};

exports.updateProfile = async (req, res) => {

    if (req.user && !req.error) {
        if (req.body.name) {
            await Admin.findByIdAndUpdate(req.user.admin.id, req.body)
                .then(async (datas) => {
                    await Admin.findOne({ _id: req.user.admin.id }, { password: 0 })
                        .lean()
                        .then(async (data) => {
                            sendResponse(res, 200, true, data, "Updated successfully");
                        })
                })
        } else {
            sendResponse(res, 400, false, {}, "Missing parameters");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.StoreDashboard = async (req, res) => {
    if (req.user && !req.error) {
        try {

            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const date = new Date(`${currentYear}-01-01`);

            let totalInventory = (await InventoryLocation.find({ status: true })).length;

            let totalItems = (await Items.find({ status: true, deleted: false })).length;

            let totalCategory = (await ItemCategories.find({ status: true, deleted: false })).length;

            let totalSalesCustomers = (await Customer.find({ status: true, deleted: false })).length;

            let totalSuppliers = (await Suppliers.find({ status: true })).length;

            let totalFirms = (await Firm.find({ status: true })).length;
            let totalDeps = (await Department.find({ status: true })).length;
            let totalUsers = (await users.find({ status: true })).length;
            let totalEmps = (await Employee.find({ status: true, deleted: false })).length;
            let data = {};

            data.total_Suppliers = totalSuppliers;
            data.total_SaleCustomer = totalSalesCustomers;
            data.total_ActiveItems = totalItems;
            data.total_ActiveCategory = totalCategory;
            data.total_ActiveInventries = totalInventory;
            data.total_firms = totalFirms;
            data.total_Departments = totalDeps;
            data.total_Users = totalUsers;
            data.total_employees = totalEmps;


            sendResponse(res, 200, true, data, "Data found successfully.")
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }

    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

const getCountByStatus = async (Model, project, statusFilter = null) => {
    const matchStage = { deleted: false };
    if (project) {
        const drawings = await Drawing.find({ project: new ObjectId(project), deleted: false }, { _id: 1 });
        const drawingIds = drawings.map(d => d._id);
        matchStage["items.drawing_id"] = { $in: drawingIds };
    }

    if (statusFilter) matchStage.status = { $in: statusFilter };

    const data = await Model.aggregate([
        { $match: matchStage },
        { $group: { _id: null, count: { $sum: 1 } } }
    ]);

    return data.length > 0 ? data[0].count : 0;
};

exports.getAdminDashboard = async (req, res) => {
    const { project } = req.query;

    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }

    try {
        const tag = await Tag.findOne({ tag_number: 13 });
        if (!tag) {
            return sendResponse(res, 404, false, {}, "Tag not found");
        }

        const matchStage = {
            tag_id: new ObjectId(tag?._id),
            deleted: false
        };
        if (project) {
            matchStage.project_id = new ObjectId(project);
        }

        const transactionData = await Transaction.aggregate([
            { $match: matchStage },
            { $unwind: "$items_details" },
            {
                $group: {
                    _id: { $month: "$trans_date" },
                    ms_iss_amount: { $sum: "$items_details.total_amount" }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        let matchObj = { deleted: false };
        if (project) {
            matchObj.project = new ObjectId(project);
        }

        const employeesOnProject = await DailyAttendance.find(matchObj, { employee: 1, project: 1 });
        const empIds = employeesOnProject.map((e) => e.employee);

        let salaryData = [];
        if (employeesOnProject.length > 0) {
            salaryData = await SalaryReport.aggregate([
                { $match: { employee: { $in: empIds } } },
                {
                    $group: {
                        _id: "$month",
                        salary_amount: { $sum: "$gross_salary" }
                    }
                },
                { $sort: { "_id": 1 } }
            ]);
        }

        const expensesMap = new Map();

        transactionData.forEach(item => {
            expensesMap.set(item._id, { month: item._id, ms_iss_amount: item.ms_iss_amount, salary_amount: 0 });
        });

        salaryData.forEach(item => {
            if (expensesMap.has(item._id)) {
                expensesMap.get(item._id).salary_amount = item.salary_amount;
            } else {
                expensesMap.set(item._id, { month: item._id, ms_iss_amount: 0, salary_amount: item.salary_amount });
            }
        });

        const expenses = Array.from(expensesMap.values());

        // Get counts for different statuses
        const statusFilter = [2, 3, 4];
        const fitupCount = await getCountByStatus(Fitup, project, statusFilter);
        const weldCount = await getCountByStatus(WeldVisual, project, statusFilter);
        const fdCount = await getCountByStatus(FinalDimension, project, statusFilter);
        const finalCoatCount = await getCountByStatus(FinalCoat, project, statusFilter);
        const dispatchNoteCount = await getCountByStatus(DispatchNote, project);

        const response = {
            expenses,
            counts: {
                fitup: fitupCount,
                weld: weldCount,
                final_dimension: fdCount,
                final_coat: finalCoatCount,
                dispatch_note: dispatchNoteCount
            }
        };

        sendResponse(res, 200, true, response, "Data found successfully.");
    } catch (error) {
        sendResponse(res, 500, false, {}, "Something went wrong");
    }
};

exports.getEmpAttCount = async (req, res) => {
    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }

    try {
        const yesterday = new Date()    ;
        yesterday.setDate(yesterday.getDate() - 1);

        const startOfDay = new Date(yesterday);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(yesterday);
        endOfDay.setHours(23, 59, 59, 999);

        const result = await DailyAttendance.aggregate([
            {
                $match: {
                    date: {
                        $gte: startOfDay,
                        $lte: endOfDay
                    },
                    sum_Apchar: { $in: ['P', 'SP', 'FN', 'PFN', 'HP', 'HD'] },
                    deleted: false
                }
            },
            {
                $group: {
                    _id: {
                        date: {
                            $dateToString: { format: "%Y-%m-%d", date: "$date" }
                        }
                    },
                    presentCount: { $sum: 1 },
                    // uniqueEmployees: { $addToSet: "$employee" }
                }
            },
            {
                $project: {
                    _id: 0,
                    date: "$_id.date",
                    presentCount: 1,
                    // If using unique employee count:
                    // presentCountUnique: { $size: "$uniqueEmployees" }
                }
            }
        ]);

        const responseData = result.length > 0
            ? result[0]
            : {
                date: yesterday.toISOString().split('T')[0],
                presentCount: 0
            };

        return sendResponse(res, 200, true, responseData, "Present employee count retrieved successfully");
    } catch (error) {
        console.error("Error in getEmpAttCount:", error);
        return sendResponse(res, 500, false, {}, "Internal server error");
    }
}