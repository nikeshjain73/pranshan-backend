const User = require('../models/users.model');
const UserSession = require('../models/user_session.model');
const Employee = require('../models/payroll/employ.model');
const MonthlyAttendance = require('../models/payroll/monthly.attendance.model');
const DailyAttendance = require('../models/payroll/daily.attendance.model');
const Earning = require('../models/payroll/earning.model');
const Deduction = require('../models/payroll/deduction.model');

const Orders = require('../models/store/order.model');
const Party = require('../models/store/party.model');
const Projects = require('../models/project.model');
const Product = require("../models/product.model");
const Items = require('../models/store/item.model');
const Transports = require('../models/store/transport.model');
const InventoryLocation = require('../models/store/inventory_location.model');
const ItemStocks = require('../models/store/item_stock.model')

const Fitup = require('../models/erp/Execution/fitup_inspection.model');
const WeldVisual = require('../models/erp/Execution/weld_inspection_offer.model');
const FinalDimension = require('../models/erp/Execution/fd_inspection_offer.model');
const PmsStock = require('../models/store/item_stock.model');

const { sendResponse } = require('../helper/response');
const { Types: { ObjectId } } = require('mongoose');

const Otps = require('../models/otp.model');
const { sendMail } = require('../helper');
const { generateOtp } = require('../helper');

const jwt = require('jsonwebtoken');
const md5 = require('md5');
const moment = require('moment');
const port = process.env.PORT;

const Drawing = require('../models/erp/planner/draw.model');
const pipingDrawing = require('../models/piping/Drawing/drawing.model');
const MultiIssueAcc = require('../models/erp/Multi/multi_issue_acceptance.model');
const MultiIssueAccPiping = require('../models/piping/Multi/material_issue_acceptance_piping.model');

const MultiFitupAcc = require('../models/erp/Multi/multi_fitup_inspection.model');
const MultiFitupAccPiping = require('../models/piping/Multi/multi_fitup_inspection_piping.model');

const MultiWeldAcc = require('../models/erp/Multi/multi_weld_inspection.model');
const MultiWeldAccPiping = require('../models/piping/Multi/multi_weld_visual_inspection_piping.model');

const MultiNdtAcc = require('../models/erp/Multi/multi_ndt_detail.model');
const MultiNdtAccPiping = require('../models/erp/Multi/multi_ndt_detail.model');

const MultiRtAccPiping = require('../models/piping/Multi/Testing/rt-inspection.model');
const MultiMptAccPiping = require('../models/piping/Multi/Testing/mpt-inspection.model');
const MultiLptAccPiping = require('../models/piping/Multi/Testing/lpt_ndt_inspection_piping.model');
const MultiPwhtAccPiping = require('../models/piping/Multi/Testing/pwht_ndt_inspection.model');
const MultiFtAccPiping = require('../models/piping/Multi/Testing/ft_test_inspection.model');
const MultiHtAccPiping = require('../models/piping/Multi/Testing/ht_test_inspection.model');
const MultiPmiAccPiping = require('../models/piping/Multi/Testing/pmi_test_inspection.model');
const MultiPicklingAccPiping = require('../models/piping/Multi/Testing/pickling_test_inspection.model');






const finalDimensionAcc = require('../models/erp/Multi/multi_fd_master.model');
const finalDimensionAccPiping = require('../models/piping/Multi/multi_fd_inspection_piping.model');

const DispatchNoteAcc = require('../models/erp/Multi/dispatch_note/multi_dispatch_note.model');
const DispatchNoteAccPiping = require('../models/piping/Multi/DispatchNote/dispatchNote.model');

const SurafcePaint = require('../models/erp/Multi/multi_surface_inspection.model');
const SurafcePaintPiping = require('../models/piping/Multi/multi_surface_inspection.model');

const MioPaint = require('../models/erp/Multi/multi_mio_inspection.model');
const MioPaintPiping = require('../models/piping/Multi/multi_mio_inspection.model');

const FinalCoatPaint = require('../models/erp/Multi/multi_final_coat_inspection.model');
const FinalCoatPaintPiping = require('../models/piping/Multi/multi_final_coat_inspection.model');

const MultiPackingList = require('../models/erp/Multi/packing/multi_packing.model');
const MultiPackingListPiping = require('../models/piping/Multi/packing/multi_packing_piping.model');

exports.getUser = async (req, res) => {
    if (req.user && !req.error) {
        try {
            await User.find({ deleted: false }, { deleted: 0, password: 0 })
                .populate('firm', '_id name')
                .populate('year', 'start_year end_year')
                .populate('product', '_id name')
                .populate('erpRole', 'name')
                .populate('structureRole', 'name')
                .populate('pipingRole', 'name')
                .populate('procurementRole', 'name')
                .populate('project', 'name')
                .sort({ createdAt: -1 })
                .lean()
                .then(data => {
                    if (data) {
                        sendResponse(res, 200, true, data, "Users list")
                    } else {
                        sendResponse(res, 400, false, {}, "Users not found")
                    }
                })
        } catch (error) {
            console.log(error);
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.manageUser = async (req, res) => {
    try {
        const {
            user_name,
            email,
            password,
            year,
            firm,
            type,
            project,
            product,
            erpRole,
            structureRole,
            pipingRole,
            procurementRole,
            id,
            status,
            pay_subUser,
            pay_bankDetail,
            signature,
        } = req.body;

        console.log("Request Body", req.body);

        if (!req.user) return sendResponse(res, 401, false, {}, "Unauthorized");
        if (!user_name || !email)
            return sendResponse(res, 400, false, {}, "Missing parameters");

        const parseCleanArray = (input) => {
            try {
                let arr = input;

                if (typeof input === "string") arr = JSON.parse(input);
                if (!Array.isArray(arr)) return [];

                return arr.map(id => new ObjectId(id)); // trust FE since logs confirm it's clean
            } catch (e) {
                return [];
            }
        };


        // --- Parse everything cleanly ---
        const yearIds = parseCleanArray(year);
        const firmIds = parseCleanArray(firm);
        const projectIds = parseCleanArray(project);
        const productIds = parseCleanArray(product);

        const erpRoleIds = parseCleanArray(erpRole);
        const structureRoleIds = parseCleanArray(structureRole);
        const pipingRoleIds = parseCleanArray(pipingRole);
        const procurementRoleIds = parseCleanArray(procurementRole);

        const updateFields = {
            user_name,
            email,
            year: yearIds,
            firm: firmIds,
            project: projectIds,
            product: productIds,
            type,
            erpRole: erpRoleIds,
            structureRole: structureRoleIds,
            pipingRole: pipingRoleIds,
            procurementRole: procurementRoleIds,
            pay_subUser: pay_subUser === "true" || pay_subUser === true,
            pay_bankDetail: pay_bankDetail === "true" || pay_bankDetail === true,
            signature: signature || '',
        };

        if (status !== undefined) updateFields.status = status;
        if (password) updateFields.password = md5(password);

        if (!id) {
            const user = new User(updateFields);
            await user.save();
            return sendResponse(res, 200, true, {}, "User added successfully");
        }

        if (!signature || signature === "null" || signature === "") {
            delete updateFields.signature;
        }
        const updated = await User.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true }
        );

        if (!updated)
            return sendResponse(res, 404, false, {}, "User not found");

        return sendResponse(res, 200, true, {}, "User updated successfully");
    } catch (error) {
        console.log("User manage error:", error);
        return sendResponse(res, 500, false, {}, "Something went wrong");
    }
};


exports.deleteUser = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            await User.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "User deleted successfully")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.loginUser = async (req, res) => {
    const { email, password } = req.body
    if (email && password) {
        await User.findOne({
            email: email.trim().toLowerCase()
        })
            .populate('year', 'start_year end_year  ')
            .populate('firm', 'name')

            .populate({
                path: 'project',
                select: 'name firm_id year_id party',
                populate: ([
                    { path: 'firm_id', select: 'name' },
                    { path: 'party', select: 'name' },
                    { path: 'year_id', select: 'start_year end_year' },
                ])
            })
            .populate('erpRole', 'name')
            .populate('product', 'name')
            .populate('structureRole', 'name')
            .populate('pipingRole', 'name')
            .populate('procurementRole', 'name')
            .then(async data => {
                if (data != null) {
                    let decryptedPassword = md5(password);

                    if (decryptedPassword == data.password) {

                        // Check for existing active token to prevent multiple device login
                        // const exceptionEmails = ['hardikprajapati@vrishal.com']; // Replace with actual email
                        // if (!exceptionEmails.includes(data.email)) {
                        // const activeSession = await UserSession.findOne({ user_id: data._id, is_active: true });
                        // if (activeSession) {
                        //     try {
                        //         // If token is valid, it means user is logged in on another device
                        //         jwt.verify(activeSession.token, process.env.SECRET_KEY_JWT);
                        //         return sendResponse(res, 400, false, {}, "Already loggined in one device");
                        //     } catch (err) {
                        //         // Token expired or invalid, mark as inactive
                        //         await UserSession.findByIdAndUpdate(activeSession._id, { is_active: false });
                        //     }
                        // }
                        // }

                        const token = jwt.sign(
                            { id: data._id, email: data.email, },
                            process.env.SECRET_KEY_JWT
                        );

                        // let ip_address = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
                        // if (ip_address.includes(',')) {
                        //     ip_address = ip_address.split(',')[0].trim();
                        // }
                        // if (ip_address === '::1') {
                        //     ip_address = '127.0.0.1';
                        // } else if (ip_address.startsWith('::ffff:')) {
                        //     ip_address = ip_address.substring(7);
                        // }
                        
                        // const device_info = req.headers['user-agent'];

                        // if (!exceptionEmails.includes(data.email)) {
                        //     await UserSession.updateMany({ user_id: data._id }, { is_active: false });
                        // }

                        // await UserSession.create({
                        //     user_id: data._id,
                        //     ip_address,
                        //     device_info,
                        //     token,
                        //     is_active: true
                        // });

                        if (data.status == false) {
                            return sendResponse(res, 400, false, {}, "User has been blocked");
                        }
                        if (data.deleted == true) {
                            return sendResponse(res, 400, false, {}, "User has been deleted");
                        }
                        console.log("@@@ Logged in user data:", data);

                        const newData = {
                            id: data._id,
                            name: data.user_name,
                            email: data.email,
                            year: data.year,
                            firm: data.firm,
                            //                           firm: {
                            //     _id: data.firm._id,
                            //     name: data.firm.name,
                            //     challan_prefix: data.firm.challan_prefix // Make sure this is included
                            // },
                            product: data.product ? data.product.map(p => ({ name: p.name })) : [],
                            project: data.project ? data.project : null,
                            erpRole: data.erpRole,
                            structureRole: data.structureRole,
                            pipingRole: data.pipingRole,
                            procurementRole: data.procurementRole,
                            pay_subUser: data.pay_subUser,
                            token
                        }

                        console.log("@@@ Login User Data:", newData);
                        if (parseInt(port) === 7000) {
                            loginUserAlert({ name: data.user_name, userEmail: data.email, erpRole: data.erpRole, structureRole: data.structureRole, pipingRole: data.pipingRole });
                        }

                        sendResponse(res, 200, true, newData, "Login Successfully");
                    } else {
                        sendResponse(res, 400, false, {}, "Invalid credentials");
                    }
                } else {
                    sendResponse(res, 400, false, {}, "Email not register");
                }
            }).catch((err) => {
                console.log(err, '@@')
                sendResponse(res, 400, false, {}, "Some error occurred.");
            });
    } else {
        sendResponse(res, 400, false, {}, "Missing parameters");
    }
}

exports.userForgetPassword = async (req, res) => {
    const { email } = req.body

    if (email) {
        const userData = await User.findOne({ email });

        if (userData) {
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
        </table>`

            const sendingEmail = await sendMail("Reset Password Link", email, html);

            if (sendingEmail) {
                // console.log(sendingEmail, '@@@')
                sendResponse(res, 200, true, {}, "Verification Code Sent")
            } else {
                sendResponse(res, 400, true, {}, "Something went wrong while sending email");
            }
        } else {
            sendResponse(res, 400, false, [], "Email does not exists")
        }
    } else {
        sendResponse(res, 400, false, {}, "Missing parameters")
    }
}

exports.userVerifyOtp = async (req, res) => {
    const { email, otp } = req.body

    if (email && otp) {
        await Otps.findOne({
            email: (email.trim().toLowerCase()),
        }).then(async (data) => {
            if (data._id) {
                if (data.otp == otp) {
                    var dates = Date.now();
                    if (data.expire_time < dates) {
                        sendResponse(res, 400, false, {}, "The OTP code has expired");
                    } else {
                        await Otps.findByIdAndUpdate(
                            data._id,
                            { otp: "", expire_time: "" },
                            { useFindAndModify: false }
                        )
                            .then(async (datas) => {
                                sendResponse(res, 200, true, {}, "Otp verify successfully");
                            })
                            .catch((err) => {
                                sendResponse(res, 400, false, {}, "Some error occurred while verifing OTP.");
                            });
                    }
                } else {
                    sendResponse(res, 400, false, {}, "The OTP code is incorrect");
                }
            }
        }).catch((err) => {
            sendResponse(res, 400, false, {}, "Some error occurred while verifing OTP.");
        });
    } else {
        sendResponse(res, 400, false, {}, "Missing Parameters");
    }
}

exports.userResetPassword = async (req, res) => {
    const { email, new_password } = req.body;
    if (email && new_password) {
        await User.findOne({ email: email })
            .then(async (datas) => {
                if (datas) {
                    if (datas.password != md5(new_password)) {
                        await User.findOneAndUpdate({ email: email }, { $set: { password: md5(new_password) } })
                            .then(async () => {
                                sendResponse(res, 200, true, {}, "Password reset successfully.");
                            })
                            .catch(() => {
                                sendResponse(res, 500, false, {}, "Internal server error");
                            });
                        return
                    } else {
                        sendResponse(res, 400, false, {}, "New password should not same as old password");
                    }
                } else {
                    sendResponse(res, 400, false, {}, "User does not exists");
                }
            }).catch((err) => {
                console.log(err);
                sendResponse(res, 400, false, err, "Some error occurred.");
            });
    } else {
        sendResponse(res, 400, false, {}, "Missing Parameters");
    }
}

exports.getUserProfile = async (req, res) => {
    if (req.user && !req.error) {
        const userData = await User.findOne({ _id: req.user.id }, { password: 0 })
            .populate('year', 'start_year end_year')
            .populate('firm', '_id name')
            .populate({
                path: 'project',
                select: 'name department location startDate endDate party label projectManager firm_id year_id',
                populate: [
                    { path: 'department', select: 'name' },
                    { path: 'location', select: 'name' },
                    { path: 'party', select: 'name' },
                    { path: 'projectManager', select: 'full_name' },
                    { path: 'firm_id', select: 'name' },
                    { path: 'year_id', select: 'start_year end_year' }
                ]
            })
            .lean()

        if (userData) {
            res.status(200).send({
                success: true,
                data: userData,
                message: "User data"
            });
        } else {
            res.status(404).send({
                message: "User data not found",
                success: true,
                data: [],
            });
        }
    } else {
        res.status(401).send({
            error: { message: "Unauthorized" },
        });
    }
}

exports.changesPassword = async (req, res) => {
    if (req.user) {
        var conditions = { _id: req.user.id };
        const getPassword = await User.findOne(conditions);

        if (getPassword.password == md5(req.body.old_password)) {

            if (getPassword.password == md5(req.body.new_password)) {
                res.status(400).send({
                    message: "Old password should be different from new password",
                    success: false,
                    data: [],
                });
            } else {
                var encryptedPassword = md5(req.body.new_password);
                User.findByIdAndUpdate(
                    conditions,
                    { password: encryptedPassword },
                    { useFindAndModify: false }
                )
                    .then((data) => {
                        // console.log(data);
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
                            message: "User is not exist",
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
            data: {},
            message: "You are not authorized",
        });
    }
}

exports.updateProfile = async (req, res) => {
    if (req.user && !req.error) {
        if (req.body.user_name) {

            await User.findByIdAndUpdate(req.user.id, req.body)
                .then(async (datas) => {
                    await User.findOne({ _id: req.user.id }, { password: 0 })
                        .lean()
                        .then(async (data) => {
                            sendResponse(res, 200, true, data, "Updated successfully");
                        })
                })
        } else {
            sendResponse(res, 400, false, {}, "Missing parameters");
        }
    }
}

exports.dashboard = async (req, res) => {
    if (req.user && !req.error) {
        const { firm_id, year_id } = req.body
        if (firm_id && year_id) {
            try {
                const currentDate = new Date();
                const month = currentDate.getMonth() + 1;
                let EmployeeCount = await Employee.countDocuments({ firm_id, deleted: false });

                const MonthEarning = await Earning.find({ firm_id, month, year_id, deleted: false });
                let totalEarning = MonthEarning.reduce((total, earning) => {
                    return total + earning.amount;
                }, 0);

                const OtherDeduction = await Deduction.find({ firm_id, month, year_id, type: { $not: { $regex: "loan", $options: "i" } }, deleted: false });
                let totalOtherDeduction = OtherDeduction.reduce((total, deduction) => {
                    return total + deduction.amount;
                }, 0);

                const LoanDeduction = await Deduction.find({ firm_id, month, year_id, type: { $regex: /loan/i }, deleted: false });
                let totalLoanDeduction = LoanDeduction.reduce((total, deduction) => {
                    return total + deduction.amount;
                }, 0);

                const todayDate = new Date();
                const TodayYear = todayDate.getFullYear();
                const TodayMonth = todayDate.getMonth() + 1; // Month is zero-based, so add 1
                const TodayDay = todayDate.getDate(); // Ensure two digits

                const PresentCount = await DailyAttendance.countDocuments({
                    $expr: {
                        $and: [
                            { $eq: [{ $year: "$date" }, TodayYear] },
                            { $eq: [{ $month: "$date" }, TodayMonth] }, // MongoDB months are 0-indexed
                            { $eq: [{ $dayOfMonth: "$date" }, TodayDay] }
                        ]
                    },
                    is_present: true
                });

                const AbsentCount = await DailyAttendance.countDocuments({
                    $expr: {
                        $and: [
                            { $eq: [{ $year: "$date" }, TodayYear] },
                            { $eq: [{ $month: "$date" }, TodayMonth] }, // MongoDB months are 0-indexed
                            { $eq: [{ $dayOfMonth: "$date" }, TodayDay] }
                        ]
                    },
                    is_present: false
                });

                let data = {};
                data.total_employee = EmployeeCount;
                data.total_earning = totalEarning;
                data.total_other_deduction = totalOtherDeduction;
                data.total_loan_deduction = totalLoanDeduction;
                data.today_present = PresentCount;
                data.today_absent = AbsentCount;


                sendResponse(res, 200, true, data, "Data found successfully.")
            } catch (error) {
                sendResponse(res, 500, false, {}, "Something went wrong")
            }
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.storeDashboard = async (req, res) => {
    if (req.user && !req.error) {
        const { firm_id, year_id } = req.body
        if (firm_id && year_id) {
            try {
                let totalOrders = (await Orders.find({ deleted: false })).length;
                let purchaseOrders = (await Orders.find({ tag: 1, deleted: false })).length;
                let saleOrders = (await Orders.find({ tag: 2, deleted: false })).length;
                let totalInventory = (await InventoryLocation.find({ status: true })).length;
                let totalItems = (await Items.find({ status: true, deleted: false })).length;
                let totalProjects = (await Projects.find({ status: true, deleted: false })).length;
                let totalParties = (await Party.find({ status: true, deleted: false })).length;
                let totalTransports = (await Transports.find({ status: true, deleted: false })).length;
                // let totalItemStocks = await ItemStocks.find({ deleted: false }, { item: 1, quantity: 1 }).populate('item', 'name')

                let data = {};

                data.total_sales = saleOrders;
                data.total_purchase = purchaseOrders;
                data.total_orders = totalOrders;
                data.total_items = totalItems;
                data.total_inventories = totalInventory;
                data.total_projects = totalProjects;
                data.total_parties = totalParties;
                data.total_transports = totalTransports;
                // data.ItemStocks = totalItemStocks;
                sendResponse(res, 200, true, data, "Dashboard found successfully")

            } catch (error) {
                sendResponse(res, 500, false, {}, "Something went wrong" + error)
            }
        } else {
            sendResponse(res, 400, false, {}, "Missing parameters");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

const getTotalAssemblyWeight = async (collection, matchObj, qtyField, project) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    return await collection.aggregate([
        { $match: matchObj },
        { $unwind: "$items" },
        {
            $lookup: {
                from: "erp-drawing-grids",
                localField: "items.grid_id",
                foreignField: "_id",
                as: "gridDetails"
            }
        },
        { $unwind: "$gridDetails" },
        {
            $lookup: {
                from: "erp-drawing-grid-items",
                let: { drawingId: "$items.drawing_id", gridId: "$items.grid_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$drawing_id", "$$drawingId"] },
                                    { $eq: ["$grid_id", "$$gridId"] },
                                ]
                            }
                        }
                    }
                ],
                as: "gridItemDetails"
            }
        },
        { $unwind: { path: "$gridItemDetails", preserveNullAndEmptyArrays: true } },
        {
            $addFields: {
                totalAssemblyWeight: {
                    $multiply: [`$gridItemDetails.assembly_weight`, `$items.${qtyField}`]
                },
                totalAsm: {
                    $multiply: ["$gridItemDetails.assembly_surface_area", `$items.${qtyField}`]
                }
            }
        },
        {
            $lookup: {
                from: "erp-planner-drawings",
                localField: "items.drawing_id",
                foreignField: "_id",
                as: "drawingDetails"
            }
        },
        {
            $addFields: {
                drawingDetails: { $arrayElemAt: ['$drawingDetails', 0] }
            }
        },
        { $match: { "drawingDetails.project": new ObjectId(project) } },
        {
            $facet: {
                lastDay: [
                    { $match: { createdAt: { $gte: yesterday, $lt: today } } },
                    {
                        $group: {
                            _id: null,
                            totalAssemblyWeight: { $sum: "$totalAssemblyWeight" },
                            totalAsm: { $sum: "$totalAsm" }
                        }
                    }
                ],
                overall: [
                    {
                        $group: {
                            _id: null,
                            totalAssemblyWeight: { $sum: "$totalAssemblyWeight" },
                            totalAsm: { $sum: "$totalAsm" }
                        }
                    }
                ]
            }
        }
    ]);
};

const getAggregationData = async (model, matchObj, project, qtyField) => {

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return await model.aggregate([
        { $match: matchObj },
        { $unwind: "$items" },
        { $match: { "items.is_accepted": true } },
        {
            $lookup: {
                from: "erp-drawing-grid-items",
                localField: "items.grid_item_id",
                foreignField: "_id",
                as: "gridItemDetails"
            }
        },
        { $unwind: "$gridItemDetails" },
        {
            $addFields: {
                totalAssemblyWeight: { $multiply: ["$gridItemDetails.assembly_weight", `$items.${qtyField}`] }
            }
        },
        {
            $lookup: {
                from: "erp-planner-drawings",
                localField: "items.drawing_id",
                foreignField: "_id",
                as: "drawingDetails"
            }
        },
        {
            $addFields: {
                drawingDetails: { $arrayElemAt: ['$drawingDetails', 0] }
            }
        },
        { $match: { "drawingDetails.project": new ObjectId(project) } },
        {
            $facet: {
                lastDay: [
                    { $match: { createdAt: { $gte: yesterday, $lt: today } } },
                    {
                        $group: {
                            _id: null,
                            totalAssemblyWeight: { $sum: "$totalAssemblyWeight" }
                        }
                    }
                ],
                overall: [
                    {
                        $group: {
                            _id: null,
                            totalAssemblyWeight: { $sum: "$totalAssemblyWeight" }
                        }
                    }
                ]
            }
        }
    ]);
};

const getNdtAggregationData = async (model, matchObj, project, qtyField) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return await model.aggregate([
        { $match: matchObj },
        { $unwind: "$items" },
        {
            $lookup: {
                from: "erp-drawing-grid-items",
                localField: "items.grid_item_id",
                foreignField: "_id",
                as: "gridItemDetails"
            }
        },
        { $unwind: "$gridItemDetails" },
        {
            $addFields: {
                totalAssemblyWeight: { $multiply: ["$gridItemDetails.assembly_weight", `$items.${qtyField}`] }
            }
        },
        {
            $lookup: {
                from: "erp-planner-drawings",
                localField: "items.drawing_id",
                foreignField: "_id",
                as: "drawingDetails"
            }
        },
        {
            $addFields: {
                drawingDetails: { $arrayElemAt: ['$drawingDetails', 0] }
            }
        },
        { $match: { "drawingDetails.project": new ObjectId(project) } },
        {
            $facet: {
                lastDay: [
                    { $match: { createdAt: { $gte: yesterday, $lt: today } } },
                    {
                        $group: {
                            _id: null,
                            totalAssemblyWeight: { $sum: "$totalAssemblyWeight" }
                        }
                    }
                ],
                overall: [
                    {
                        $group: {
                            _id: null,
                            totalAssemblyWeight: { $sum: "$totalAssemblyWeight" }
                        }
                    }
                ]
            }
        }
    ]);
};

exports.pmsStore = async (req, res) => {
    const { project } = req.body;
    if (!req.user && req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
    if (!project) {
        return sendResponse(res, 400, false, {}, "Missing parameters");
    }
    try {

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        const matchObj = { deleted: false, project: new ObjectId(project) };
        const matchObj3 = { deleted: false, status: { $ne: 1 } }
        const matchObj2 = { deleted: false, status: { $nin: [1, 3] } }

        const paintObj = { deleted: false, status: { $nin: [1, 4] } }

        const aggregation = await Drawing.aggregate([
            {
                $match: matchObj,
            },
            {
                $facet: {
                    lastDay: [
                        { $match: { createdAt: { $gte: yesterday, $lt: today } } },
                        { $count: "count" }
                    ],
                    overall: [
                        { $count: "count" }
                    ]
                }
            }
        ]);

        const issueAggregation = await MultiIssueAcc.aggregate([
            {
                $match: { deleted: false, status: { $nin: [1, 3] } }
            },
            {
                $unwind: "$items"
            },
            { $match: { "items.is_accepted": true } },
            {
                $lookup: {
                    from: "erp-drawing-grid-items",
                    localField: "items.grid_item_id",
                    foreignField: "_id",
                    as: "gridItemDetails"
                }
            },
            { $unwind: "$gridItemDetails" },
            {
                $addFields: {
                    totalAssemblyWeight: { $multiply: ["$gridItemDetails.assembly_weight", "$items.iss_used_grid_qty"] }
                }
            },
            {
                $lookup: {
                    from: "erp-planner-drawings",
                    localField: "items.drawing_id",
                    foreignField: "_id",
                    as: "drawing"
                }
            },
            {
                $addFields: {
                    drawing: { $arrayElemAt: ['$drawing', 0] },
                },
            },
            {
                $match: { "drawing.project": new ObjectId(project) }
            },
            {
                $facet: {
                    lastDay: [
                        { $match: { createdAt: { $gte: yesterday, $lt: today } } },
                        {
                            $group: {
                                _id: null,
                                totalMultiplyIssQty: { $sum: { $ifNull: ["$totalAssemblyWeight", 0] } }
                            }
                        }
                    ],
                    overall: [
                        {
                            $group: {
                                _id: null,
                                totalMultiplyIssQty: { $sum: { $ifNull: ["$totalAssemblyWeight", 0] } }
                            }
                        }
                    ]
                }
            }
        ]);

        const fitupAcc = await getAggregationData(MultiFitupAcc, matchObj2, project, "fitOff_used_grid_qty");
        const weldVisualAcc = await getAggregationData(MultiWeldAcc, matchObj2, project, "weld_used_grid_qty");
        const ndtData = await getNdtAggregationData(MultiNdtAcc, matchObj3, project, "ndt_used_grid_qty");

        const fdAcc = await getTotalAssemblyWeight(finalDimensionAcc, matchObj2, "fd_used_grid_qty", project);
        const dispatchNoteAcc = await getTotalAssemblyWeight(DispatchNoteAcc, matchObj2, "dispatch_used_grid_qty", project);
        const surfacePaintAcc = await getTotalAssemblyWeight(SurafcePaint, paintObj, "surface_used_grid_qty", project);
        const mioPaintAcc = await getTotalAssemblyWeight(MioPaint, paintObj, "mio_used_grid_qty", project);
        const finalCoatPaintAcc = await getTotalAssemblyWeight(FinalCoatPaint, paintObj, "fc_used_grid_qty", project);

        const packingAcc = await MultiPackingList.aggregate([
            {
                $match: { deleted: false }
            },
            {
                $unwind: "$items"
            },
            {
                $lookup: {
                    from: "erp-drawing-grids",
                    localField: "items.grid_id",
                    foreignField: "_id",
                    as: "gridDetails"
                }
            },
            {
                $unwind: "$gridDetails"
            },
            {
                $lookup: {
                    from: "erp-drawing-grid-items",
                    let: { drawingId: "$items.drawing_id", gridId: "$items.grid_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$drawing_id", "$$drawingId"] },
                                        { $eq: ["$grid_id", "$$gridId"] },
                                    ]
                                }
                            }
                        }
                    ],
                    as: "gridItemDetails"
                }
            },
            {
                $unwind: { path: "$gridItemDetails", preserveNullAndEmptyArrays: true }
            },
            {
                $addFields: {
                    totalAssemblyWeight: {
                        $multiply: ["$gridItemDetails.assembly_weight", "$items.rn_used_grid_qty"]
                    },
                    totalAsm: {
                        $multiply: ["$gridItemDetails.assembly_surface_area", `$items.rn_used_grid_qty`]
                    }
                }
            },
            {
                $lookup: {
                    from: "erp-planner-drawings",
                    localField: "items.drawing_id",
                    foreignField: "_id",
                    as: "drawingDetails"
                }
            },
            {
                $addFields: {
                    drawingDetails: { $arrayElemAt: ['$drawingDetails', 0] }
                }
            },
            {
                $match: { "drawingDetails.project": new ObjectId(project) }
            },
            {
                $facet: {
                    lastDay: [
                        { $match: { createdAt: { $gte: yesterday, $lt: today } } },
                        {
                            $group: {
                                _id: null,
                                totalAssemblyWeight: { $sum: "$totalAssemblyWeight" },
                                totalAsm: { $sum: "$totalAsm" }
                            }
                        }
                    ],
                    overall: [
                        {
                            $group: {
                                _id: null,
                                totalAssemblyWeight: { $sum: "$totalAssemblyWeight" },
                                totalAsm: { $sum: "$totalAsm" }
                            }
                        }
                    ]
                }
            }
        ]);

        const getValue = (data, key, field) => parseFloat((data?.[0]?.[key]?.[0]?.[field] ?? 0).toFixed(2));

        const dataMappings = [
            { name: "Count", data: aggregation, field: "count" },
            { name: "MultiplyIssQty", data: issueAggregation, field: "totalMultiplyIssQty" },
            { name: "Fitup", data: fitupAcc, field: "totalAssemblyWeight" },
            { name: "WeldVisual", data: weldVisualAcc, field: "totalAssemblyWeight" },
            { name: "Ndt", data: ndtData, field: "totalAssemblyWeight" },
            { name: "Fd", data: fdAcc, field: "totalAssemblyWeight" },
            { name: "Dn", data: dispatchNoteAcc, field: "totalAssemblyWeight", asmField: "totalAsm" },
            { name: "Surface", data: surfacePaintAcc, field: "totalAssemblyWeight", asmField: "totalAsm" },
            { name: "Mio", data: mioPaintAcc, field: "totalAssemblyWeight", asmField: "totalAsm" },
            { name: "FinalCoat", data: finalCoatPaintAcc, field: "totalAssemblyWeight", asmField: "totalAsm" },
            { name: "Packing", data: packingAcc, field: "totalAssemblyWeight", asmField: "totalAsm" }
        ];

        // const data = Object.fromEntries(
        //     dataMappings.flatMap(({ name, data, field }) => [
        //         [`lastDay${name}`, getValue(data, "lastDay", field)],
        //         [`overall${name}`, getValue(data, "overall", field)]
        //     ])
        // );

        const data = Object.fromEntries(
            dataMappings.flatMap(({ name, data, field, asmField }) => [
                [`lastDay${name}`, getValue(data, "lastDay", field)],
                [`overall${name}`, getValue(data, "overall", field)],
                ...(asmField ? [
                    [`lastDay${name}Asm`, getValue(data, "lastDay", asmField)],
                    [`overall${name}Asm`, getValue(data, "overall", asmField)]
                ] : [])
            ])
        );

        sendResponse(res, 200, true, data, "PMS Stock");

    } catch (error) {
        sendResponse(res, 500, false, {}, "Something went wrong" + error)
    }
}

exports.pipingStore = async (req, res) => {
    const { project } = req.body;

    if (!req.user && req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }

    if (!project) {
        return sendResponse(res, 400, false, {}, "Missing parameters");
    }

    try {

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        /*
        ===========================================================
        DRAWING ENTRY
        ===========================================================
        */

        const aggregation = await pipingDrawing.aggregate([
            {
                $match: {
                    deleted: false,
                    project: new ObjectId(project)
                }
            },
            {
                $facet: {
                    lastDay: [
                        {
                            $match: {
                                createdAt: {
                                    $gte: yesterday,
                                    $lt: today
                                }
                            }
                        },
                        {
                            $count: "count"
                        }
                    ],

                    overall: [
                        {
                            $count: "count"
                        }
                    ]
                }
            }
        ]);

        /*
        ===========================================================
        COMMON FUNCTION
        ===========================================================
        */

        const getStageCount = async (Model) => {

            return await Model.aggregate([

                {
                    $match: {
                        // deleted: false,
                        status: { $nin: [1, 3] }
                    }
                },

                {
                    $unwind: "$items"
                },

                {
                    $lookup: {
                        from: "piping-drawings",
                        localField: "items.drawing_id",
                        foreignField: "_id",
                        as: "drawing"
                    }
                },

                {
                    $addFields: {
                        drawing: {
                            $arrayElemAt: ["$drawing", 0]
                        }
                    }
                },

                {
                    $match: {
                        "drawing.project": new ObjectId(project)
                    }
                },

                {
                    $facet: {

                        lastDay: [
                            {
                                $match: {
                                    createdAt: {
                                        $gte: yesterday,
                                        $lt: today
                                    }
                                }
                            },
                            {
                                $count: "count"
                            }
                        ],

                        overall: [
                            {
                                $count: "count"
                            }
                        ]
                    }
                }

            ]);
        };
    const getRTMPTStageCount = async (Model) => {

            return await Model.aggregate([

                {
                    $match: {
                        // deleted: false,
                        status: { $nin: [0, 2] }
                    }
                },

                {
                    $unwind: "$items"
                },

                {
                    $lookup: {
                        from: "piping-drawings",
                        localField: "items.drawing_id",
                        foreignField: "_id",
                        as: "drawing"
                    }
                },

                {
                    $addFields: {
                        drawing: {
                            $arrayElemAt: ["$drawing", 0]
                        }
                    }
                },

                {
                    $match: {
                        "drawing.project": new ObjectId(project)
                    }
                },

                {
                    $facet: {

                        lastDay: [
                            {
                                $match: {
                                    createdAt: {
                                        $gte: yesterday,
                                        $lt: today
                                    }
                                }
                            },
                            {
                                $count: "count"
                            }
                        ],

                        overall: [
                            {
                                $count: "count"
                            }
                        ]
                    }
                }

            ]);
        };
        /*
        ===========================================================
        ALL STAGES
        ===========================================================
        */

        const issueAggregation = await getStageCount(MultiIssueAccPiping);

        const fitupAcc = await getStageCount(MultiFitupAccPiping);

        const weldVisualAcc = await getStageCount(MultiWeldAccPiping);


        // const ndtData = await getStageCount(MultiNdtAccPiping);
        const rtNdtData = await getRTMPTStageCount(MultiRtAccPiping);
        const mptNdtData = await getRTMPTStageCount(MultiMptAccPiping);
        const lptNdtData = await getStageCount(MultiLptAccPiping);
        const pwhtNdtData = await getStageCount(MultiPwhtAccPiping);
        const ftNdtData = await getStageCount(MultiFtAccPiping);
        const htNdtData = await getStageCount(MultiHtAccPiping);
        const pmiNdtData = await getStageCount(MultiPmiAccPiping);
        const picklingNdtData = await getStageCount(MultiPicklingAccPiping);


        const fdAcc = await getStageCount(finalDimensionAccPiping);

        const dispatchNoteAcc = await getStageCount(DispatchNoteAccPiping);

        const surfacePaintAcc = await getStageCount(SurafcePaintPiping);

        const mioPaintAcc = await getStageCount(MioPaintPiping);

        const finalCoatPaintAcc = await getStageCount(FinalCoatPaintPiping);

        const packingAcc = await getStageCount(MultiPackingListPiping);

        /*
        ===========================================================
        GET VALUE
        ===========================================================
        */

        const getValue = (data, key, field) =>
            parseFloat(
                ((data?.[0]?.[key]?.[0]?.[field]) || 0).toFixed(2)
            );

        /*
        ===========================================================
        DATA MAPPING
        ===========================================================
        */

        const dataMappings = [

            {
                name: "Count",
                data: aggregation,
                field: "count"
            },

            {
                name: "MultiplyIssQty",
                data: issueAggregation,
                field: "count"
            },

            {
                name: "Fitup",
                data: fitupAcc,
                field: "count"
            },

            {
                name: "WeldVisual",
                data: weldVisualAcc,
                field: "count"
            },

            // {
            //     name: "Ndt",
            //     data: ndtData,
            //     field: "count"
            // },
            {
                name: "RtNdt",
                data: rtNdtData,
                field: "count"
            },
            {
                name: "MptNdt",
                data: mptNdtData,
                field: "count"
            },
            {
                name: "LptNdt",
                data: lptNdtData,
                field: "count"
            },
            {
                name: "PwhtNdt",
                data: pwhtNdtData,
                field: "count"
            },
            {
                name: "FtNdt",
                data: ftNdtData,
                field: "count"
            },
            {
                name: "HtNdt",
                data: htNdtData,
                field: "count"
            },
            {
                name: "PmiNdt",
                data: pmiNdtData,
                field: "count"
            },
            {
                name: "PicklingNdt",
                data: picklingNdtData,
                field: "count"
            },

            {
                name: "Fd",
                data: fdAcc,
                field: "count"
            },

            {
                name: "Dn",
                data: dispatchNoteAcc,
                field: "count"
            },

            {
                name: "Surface",
                data: surfacePaintAcc,
                field: "count"
            },

            {
                name: "Mio",
                data: mioPaintAcc,
                field: "count"
            },

            {
                name: "FinalCoat",
                data: finalCoatPaintAcc,
                field: "count"
            },

            {
                name: "Packing",
                data: packingAcc,
                field: "count"
            }

        ];

        /*
        ===========================================================
        FINAL RESPONSE
        ===========================================================
        */

        const data = Object.fromEntries(

            dataMappings.flatMap(({ name, data, field }) => [

                [
                    `lastDay${name}`,
                    getValue(data, "lastDay", field)
                ],

                [
                    `overall${name}`,
                    getValue(data, "overall", field)
                ]

            ])

        );

        return sendResponse(
            res,
            200,
            true,
            data,
            "PMS Stock"
        );

    } catch (error) {

        return sendResponse(
            res,
            500,
            false,
            {},
            "Something went wrong " + error.message
        );
    }
};
const loginUserAlert = async ({ name, userEmail, erpRole, structureRole, ipAddress, pipingRole }) => {
    const email = 'apaddonwebtech@gmail.com';
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Login Notification</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .email-container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            padding: 20px;
        }
        .header {
            background-color: #4CAF50;
            color: white;
            padding: 10px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            margin-top: 20px;
            line-height: 1.6;
            color: #333333;
        }
        .content h2 {
            color: #4CAF50;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 12px;
            color: #777777;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>User Login Notification</h1>
        </div>
        <div class="content">
            <h2>Hello Admin,</h2>
            <p>The following user has successfully logged into the system:</p>
            <table>
                <tr>
                    <td><strong>User Name:</strong></td>
                    <td>${name}</td>
                </tr>
                <tr>
                    <td><strong>Email:</strong></td>
                    <td>${userEmail}</td>
                </tr>
                ${erpRole ? `
                    <tr>
                        <td><strong>ERP Role:</strong></td>
                        <td>${erpRole.name}</td>
                    </tr>
                    ` : ''}
                ${structureRole ? `
                <tr>
                    <td><strong>ERP Role:</strong></td>
                    <td>${structureRole.name}</td>
                </tr>
                ` : ''}
                ${pipingRole ? `
                <tr>
                    <td><strong>ERP Role:</strong></td>
                    <td>${pipingRole.name}</td>
                </tr>
                ` : ''}
                <tr>
                    <td><strong>Login Time:</strong></td>
                    <td>${moment().format('YYYY-MM-DD HH:mm:ss')}</td>
                </tr>
                
            </table>
            <p>If this was unexpected, please review the user's activity or take necessary action.</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 Addonwebtech. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`

    await sendMail("User Login", email, html).then((res) => {
        console.log('Mail sent successfully')
    }).catch((err) => {
        console.log(err, 'error');
    });
}

exports.logoutUser = async (req, res) => {
    if (req.user && !req.error) {
        try {
            const token = req.header("authorization").split(" ")[1];
            await UserSession.updateMany(
                { token: token },
                { $set: { is_active: false } }
            );
            sendResponse(res, 200, true, {}, "Logout successfully");
        } catch (error) {
            console.log(error);
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}
