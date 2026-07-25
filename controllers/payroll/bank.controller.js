const Bank = require('../../models/payroll/bank.model');
const { sendResponse } = require('../../helper/response')
const Salary = require('../../models/payroll/salary.model');

exports.getBank = async (req, res) => {
    if (req.user && !req.error) {
        try {
            const result = await Bank.find({ status: true, deleted: false }, { deleted: 0 })
            .sort({ name: 1 });

            if (result) {
                sendResponse(res, 200, true, result, "Bank list")
            } else {
                    sendResponse(res, 400, false, {}, "Bank not found")
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.getAdminBank = async (req, res) => {
    if (req.user && !req.error) {
        try {
            const result = await Bank.find({ deleted: false }, { deleted: 0 })
            .sort({ name: 1 });
            if (result) {
                sendResponse(res, 200, true, result, "Bank list")
            } else {
                sendResponse(res, 400, false, {}, "Bank not found")
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.manageBank = async (req, res) => {
    const { name, id, status } = req.body;

    if (req.user) {
        if (name) {
            const bank = new Bank({
                name: name,
            });

            if (!id) {
                try {
                    await bank.save(bank).then(data => {
                        sendResponse(res, 200, true, {}, "Bank added successfully")
                    }).catch(error => {
                        sendResponse(res, 400, false, {}, "Bank already exists");
                    })
                } catch (error) {
                    sendResponse(res, 500, false, {}, "Something went wrong");
                }
            } else {
                await Bank.findByIdAndUpdate(id, { name: name, status: status }).then(data => {
                    if (data) {
                        sendResponse(res, 200, true, {}, "Bank updated successfully")
                    } else {
                        sendResponse(res, 404, false, {}, "Bank not found")
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

exports.deleteBank = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {

            const inUse = await Salary.findOne({ bank_name: id ,deleted: false});
            if (inUse) {
                sendResponse(res, 400, false, {}, "Cannot delete bank. It is in use by salary.");
                return;
            }
            await Bank.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Bank deleted successfully")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}