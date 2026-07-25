const Designation = require('../../models/payroll/designation.model');
const { sendResponse } = require('../../helper/response');
const Employee = require('../../models/payroll/employ.model');

exports.getDesignation = async (req, res) => {
    if (req.user && !req.error) {
        try {
            const result = await Designation.find({ status: true, deleted: false }, { deleted: 0 })
            .sort({ name: 1 });
            if (result) {
                sendResponse(res, 200, true, result, "Designation list")
            } else {
                sendResponse(res, 400, false, {}, "Designation not found")
            }
            
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.getAdminDesignation = async (req, res) => {
    if (req.user && !req.error) {
        try {
            const result = await Designation.find({ deleted: false }, { deleted: 0 })
            .sort({ name: 1 });
                if (result) {
                    sendResponse(res, 200, true, result, "Designation list")
                } else {
                    sendResponse(res, 400, false, {}, "Designation not found")
                }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.manageDesignation = async (req, res) => {
    const { name, id, status } = req.body;
    if (req.user) {
        if (name) {
            const designation = new Designation({
                name: name,
            });
            if (!id) {
                try {
                    await designation.save(designation).then(data => {
                        sendResponse(res, 200, true, {}, "Designation added successfully")
                    })
                } catch (error) {
                    sendResponse(res, 500, false, {}, "Something went wrong");
                }
            } else {
                await Designation.findByIdAndUpdate(id, { name: name, status: status }).then(data => {
                    if (data) {
                        sendResponse(res, 200, true, {}, "Designation updated successfully")
                    } else {
                        sendResponse(res, 404, false, {}, "Designation not found")
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

exports.deleteDesignation = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            const inUse = await Employee.findOne({ designation: id , deleted: false   });
            if (inUse) {
                sendResponse(res, 400, false, {}, "Cannot delete designation. It is in use by employees.");
                return;
            }
            await Designation.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Designation deleted successfully")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}