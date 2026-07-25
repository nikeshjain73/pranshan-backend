const SuperAdmin = require("../models/super_admin.model");
const jwt = require('jsonwebtoken');
const md5 = require('md5');
const { sendResponse } = require("../helper/response");

exports.super_login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email && !password) {
            sendResponse(res, 400, false, null, "Missing parameters")
        } else {
            const super_admin = await SuperAdmin.findOne({
                email,
                password: md5(password),
            })

            if (super_admin) {
                var token = jwt.sign(
                    { super_admin: { id: super_admin._id } },
                    process.env.SECRET_KEY_JWT
                );

                const data = {
                    name: super_admin.name,
                    email: super_admin.email,
                    image: super_admin.image,
                    token: token
                }

                sendResponse(res, 200, true, data, "Login successful.");
            } else {
                sendResponse(res, 400, false, [], "Invalid credentials");
            }
        }
    } catch (err) {
        console.log("err", err)
        sendResponse(res, 500, false, null, "Something went wrong")
    }
}

// Office use only

exports.createuser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name && !email && !password) {
            sendResponse(res, 400, false, null, "Missing parameters")
        } else {
            const super_admin = await SuperAdmin.create({
                name,
                email,
                password: md5(password),
            })

            if (super_admin) {
                sendResponse(res, 200, true, super_admin, "Create Login successful.");
            } else {
                sendResponse(res, 400, false, [], "Invalid credentials");
            }
        }
    } catch (err) {
        sendResponse(res, 500, false, null, "Something went wrong")
    }
}

exports.getSuperAdminProfile = async (req, res) => {
    console.log(req.user);
    if (req.user && !req.error) {
        await SuperAdmin.findOne({ _id: req.user.super_admin.id }, { password: 0 })
            .lean()
            .then(async (data) => {

                res.status(200).send({
                    success: true,
                    data: data,
                    message: "Super Admin data"
                });
            });
    } else {
        res.status(401).send({
            error: { message: "Unauthorized" },

        });
    }
};