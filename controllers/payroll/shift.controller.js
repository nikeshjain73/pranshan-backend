const Shift = require('../../models/payroll/shift.model');
const { sendResponse } = require('../../helper/response')

exports.getShift = async (req, res) => {

    if (req.user && !req.error) {
        try {
            const result = await Shift.find({ status: true, deleted: false }, { deleted: 0 })
            .sort({ name: 1 });
            if (result) {
                sendResponse(res, 200, true, result, "Shift list")
            } else {
                sendResponse(res, 400, false, {}, "Shift not found")
            }
            
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.getAdminShift = async (req, res) => {

    if (req.user && !req.error) {
        try {
            const result = await Shift.find({ deleted: false }, { deleted: 0 })
            .sort({ name: 1 });
            if (result) {
                sendResponse(res, 200, true, result, "Shift list")
            } else {
                sendResponse(res, 400, false, {}, "Shift not found")
            }
            
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.manageShift = async (req, res) => {
    const { name, id, status } = req.body;
    if (req.user) {
        if (name) {
            const shift = new Shift({
                name: name,
            });

            if (!id) {
                try {
                    await shift.save(shift).then(data => {
                        sendResponse(res, 200, true, {}, "Shift added successfully")
                    }).catch(error => {
                        sendResponse(res, 400, false, {}, "Shift already exists");
                    })
                } catch (error) {
                    sendResponse(res, 500, false, {}, "Something went wrong");
                }
            } else {
                await Shift.findByIdAndUpdate(id, { name: name, status: status }).then(data => {
                    if (data) {
                        sendResponse(res, 200, true, {}, "Shift updated successfully")
                    } else {
                        sendResponse(res, 404, false, {}, "Shift not found")
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

exports.deleteShift = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            await Shift.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Shift deleted successfully")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}