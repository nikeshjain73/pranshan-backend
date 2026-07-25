const AuthPerson = require('../../models/payroll/auth_person.model');
const { sendResponse } = require('../../helper/response');

exports.getAuhPerson = async (req, res) => {
    if (req.user && !req.error) {
        try {
            const result = await AuthPerson.find({ status: true, deleted: false }, { deleted: 0 })
            if (result) {
                sendResponse(res, 200, true, result, "Authorized Person list")
            } else {
                sendResponse(res, 400, false, {}, "Authorized Person not found")
            }
          
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.getAdminAuhPerson = async (req, res) => {
    if (req.user && !req.error) {
        try {
            const result = await AuthPerson.find({ deleted: false }, { deleted: 0 })
            if (result) {
                sendResponse(res, 200, true, result, "Authorized Person list")
            } else {
                sendResponse(res, 400, false, {}, "Authorized Person not found")
            }
            
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.manageAuthPerson = async (req, res) => {
    const { name, id, status } = req.body;
    if (req.user) {
        if (name) {
            const authPerson = AuthPerson({
                name: name
            });

            if (!id) {
                await authPerson.save(authPerson).then(data => {
                    sendResponse(res, 200, true, {}, "Authorized Person added successfully")
                }).catch(error => {
                    sendResponse(res, 400, false, {}, "Authorized Person already exists");
                })
            } else {
                await AuthPerson.findByIdAndUpdate(id, { name: name, status: status }).then(data => {
                    if (data) {
                        sendResponse(res, 200, true, {}, "Authorized Person updated successfully")
                    } else {
                        sendResponse(res, 404, false, {}, "Authorized Person not found")
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

exports.deleteAuthPerson = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            await AuthPerson.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Authorized Person deleted successfully")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}