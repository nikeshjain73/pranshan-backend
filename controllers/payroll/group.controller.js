const Group = require('../../models/payroll/group.model');
const { sendResponse } = require('../../helper/response');
const Department = require('../../models/payroll/department.model');

exports.getGroup = async (req, res) => {
    if (req.user && !req.error) {
        try {
            await Group.find({ status: true, deleted: false }, { deleted: 0 }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, data, "Group list")
                } else {
                    sendResponse(res, 400, false, {}, "Group not found")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.getAdminGroup = async (req, res) => {
    if (req.user && !req.error) {
        try {
            await Group.find({ deleted: false }, { deleted: 0 }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, data, "Group list")
                } else {
                    sendResponse(res, 400, false, {}, "Group not found")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.manageGroup = async (req, res) => {
    const { name, id, status } = req.body;
    if (req.user) {
        if (name) {
            const group = new Group({
                name: name,
            });
            if (!id) {
                try {
                    await group.save(group).then(data => {
                        sendResponse(res, 200, true, {}, "Group added successfully")
                    }).catch(error => {
                        sendResponse(res, 400, false, {}, "Group already exists");
                    })
                } catch (error) {
                    sendResponse(res, 500, false, {}, "Something went wrong");
                }
            } else {
                await Group.findByIdAndUpdate(id, { name: name, status: status }).then(data => {
                    if (data) {
                        sendResponse(res, 200, true, {}, "Group updated successfully")
                    } else {
                        sendResponse(res, 404, false, {}, "Group not found")
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

exports.deleteGroup = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            const inUse = await Department.findOne({ group: id , deleted: false});
            if (inUse) {
                sendResponse(res, 400, false, {}, "Cannot delete group. It is in use by department.");
                return
            }
            await Group.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Group deleted successfully")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}