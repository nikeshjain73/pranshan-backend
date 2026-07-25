const Firm = require('../models/firm.model');

const { sendResponse } = require('../helper/response');

exports.getFirm = async (req, res) => {
    if (req.user && !req.error) {
        try {
            await Firm.find({ status: true, deleted: false }, { deleted: 0, password: 0 }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, data, "Firms list")
                } else {
                    sendResponse(res, 400, false, {}, "Firms not found")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.getAdminFirm = async (req, res) => {
    if (req.user && !req.error) {
        try {
            await Firm.find({ deleted: false }, { deleted: 0, password: 0 }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, data, "Firms list")
                } else {
                    sendResponse(res, 400, false, {}, "Firms not found")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.manageFirm = async (req, res) => {
    const { name, email, address, address_two, address_three, ot_type,
        state, city, pincode, mobile_number, image, register_no, id, status, gst_no , challan_prefix
    } = req.body
    if (req.user) {
        if (
            name &&
            address &&
            state &&
            city &&
            pincode &&
            mobile_number &&
            register_no &&
            email 
        ) {
            const firm = new Firm({
                name: name,
                email: email,
                address: address,
                address_two: address_two || "",
                address_three: address_three || "",
                state: state,
                city: city,
                pincode: pincode,
                register_no: register_no,
                mobile_number: mobile_number,
                ot_type: ot_type,
                image: image,
                gst_no: gst_no,
               

            });
            if (!id) {
                try {
                    await firm.save(firm).then(data => {
                        sendResponse(res, 200, true, {}, "Firm added successfully")
                    });
                } catch (error) {
                    sendResponse(res, 500, false, {}, "Something went wrong");
                }
            } else {
                await Firm.findByIdAndUpdate(id, {
                    name: name,
                    email: email,
                    address: address,
                    address_two: address_two || "",
                    address_three: address_three || "",
                    state: state,
                    city: city,
                    pincode: pincode,
                    mobile_number: mobile_number,
                    register_no: register_no,
                    ot_type: ot_type,
                    image: image,
                    status: status,
                    gst_no: gst_no,
                
                }).then(data => {
                    if (data) {
                        sendResponse(res, 200, true, {}, "Firm updated successfully")
                    } else {
                        sendResponse(res, 200, true, {}, "Firm not found")
                    }
                })
            }
        } else {
            sendResponse(res, 400, false, {}, "Missing parameters");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.deleteFirm = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            await Firm.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Firm deleted successfully")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.getUserFirm = async (req, res) => {
    const { fId } = req.params;
    if (!req.user && req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized")
    }

    if (!fId) {
        sendResponse(res, 400, false, {}, "Missing parameters")
        return;
    }

    try {
        await Firm.findById(fId, { deleted: 0 }).then(data => {
            if (data) {
                sendResponse(res, 200, true, data, "Firm details")
            } else {
                sendResponse(res, 400, false, {}, "Firm not found")
            }
        })
    } catch (error) {
        sendResponse(res, 500, false, {}, "Something went wrong")
    }
}