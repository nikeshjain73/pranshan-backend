const EmployeeType = require('../../models/payroll/employee_type.model');
const { sendResponse } = require('../../helper/response');

exports.getEmployeeType = async (req, res) => {
    if (req.user && !req.error) {
        try {
            const result = await EmployeeType.find({ status: true, deleted: false }, { deleted: 0 })
            .sort({ name: 1 });
                if (result) {
                    sendResponse(res, 200, true, result, "Employee Type list")
                } else {
                    sendResponse(res, 400, false, {}, "Employee Type not found")
                }
            
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.getAdminEmployeeType = async (req, res) => {
    if (req.user && !req.error) {
        try {
            const result = await EmployeeType.find({ deleted: false }, { deleted: 0 })
            .sort({ name: 1 });
                if (result) {
                    sendResponse(res, 200, true, result, "Employee Type list")
                } else {
                    sendResponse(res, 400, false, {}, "Employee Type not found")
                }  
         
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.manageEmployeeType = async (req, res) => {
    const { name, id, status } = req.body;

    if (req.user) {
        if (name) {
            const type = new EmployeeType({
                name: name,
            });

            if (!id) {
                try {
                    await type.save(type).then(data => {
                        sendResponse(res, 200, true, {}, "Employee Type added successfully")
                    }).catch(error => {
                        sendResponse(res, 400, false, {}, "Employee Type already exists");
                    })
                } catch (error) {
                    sendResponse(res, 500, false, {}, "Something went wrong");
                }
            } else {
                await EmployeeType.findByIdAndUpdate(id, { name: name, status: status }).then(data => {
                    if (data) {
                        sendResponse(res, 200, true, {}, "Employee Type updated successfully")
                    } else {
                        sendResponse(res, 404, false, {}, "Employee Type not found")
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

exports.deleteEmployeeType = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            await EmployeeType.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Employee Type deleted successfully")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}