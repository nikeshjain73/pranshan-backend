const Department = require('../../models/payroll/department.model');
const Group = require('../../models/payroll/group.model');
const WorkDay = require('../../models/payroll/workDay.model');

const { sendResponse } = require('../../helper/response');

exports.getDepartment = async (req, res) => {
    if (req.user && !req.error) {
        try {
            const result = await Department.find({ status: true, deleted: false }, { deleted: 0 })
                .populate('group', 'name')
                .sort({ name: 1 });
                if (result) {
                    sendResponse(res, 200, true, result, "Department list")
                } else {
                    sendResponse(res, 400, false, {}, "Department not found")
                }
                
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.getAdminDepartment = async (req, res) => {
    if (req.user && !req.error) {
        try {
            const result = await Department.find({ deleted: false }, { deleted: 0 })
                .populate('group', 'name')
                .sort({ name: 1 });
                if (result) {
                    sendResponse(res, 200, true, result, "Department list")
                } else {
                    sendResponse(res, 400, false, {}, "Department not found")
                }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}


exports.manageDepartment = async (req, res) => {
    const { name, group, id, status } = req.body

    if (req.user) {
        if (name && group) {
            const groupData = await Group.findById(group);

            if (!groupData) {
                sendResponse(res, 404, false, {}, "Group not found");
                return;
            }

            if (groupData) {
                const department = new Department({
                    name: name,
                    group: groupData._id,
                })

                if (!id) {
                    try {
                        await department.save(department).then(data => {
                            sendResponse(res, 200, true, {}, "Department added successfully")
                        }).catch(error => {
                            sendResponse(res, 400, false, {}, "Department already exists");
                        })
                    } catch (error) {
                        sendResponse(res, 500, false, {}, "Something went wrong");
                    }
                } else {
                    await Department.findByIdAndUpdate(id, { name: name, group: group, status: status }).then(data => {
                        if (data) {
                            sendResponse(res, 200, true, {}, "Department updated successfully");
                        } else {
                            sendResponse(res, 404, false, {}, "Department not found");
                        }
                    });
                }
            } else {
                sendResponse(res, 404, false, {}, "Group not found");
            }
        } else {
            sendResponse(res, 400, false, {}, "Missing parameters");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.deleteDepartment = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            const inUser = await WorkDay.findOne({ department: id , deleted: false  });
            if (inUser) {
                sendResponse(res, 400, false, {}, "Cannot delete department. It is in use by workdays.");
                return;
            }
            await Department.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Department deleted successfully")
                }
            }).catch(error => {
                sendResponse(res, 400, true, {}, "Department not found")
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong" + error)
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}