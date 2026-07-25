const ProjectLocation = require('../../../models/erp/ProjectLocation/project_location.model');
const { sendResponse } = require("../../../helper/response");


exports.getProjectLocation = async (req, res) => {
    if (req.user && !req.error) {
        let status = req.query.status
        let qurey = { deleted: false }
        if (status) {
            qurey.status = status
        }
        try {
            let data = await ProjectLocation.find(qurey, { deleted: 0, __v: 0 }).sort({ createdAt: -1 }).lean()
            if (data) {
                sendResponse(res, 200, true, data, "Project Location data found successfully");
            } else {
                sendResponse(res, 200, true, data, "Project Location data not found");
            }
        } catch (err) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.manageProjectLocation = async (req, res) => {
    const { id, name, status } = req.body;

    if (req.user && !req.error) {
        try {
            if (name) {
                if (!id) {
                    await ProjectLocation.create({ name: name }).then((data) => {
                        sendResponse(res, 200, true, {}, "Project Location added successfully");
                    }).catch(error => {
                        sendResponse(res, 400, false, {}, "Project Location already exists");
                    })
                } else {
                    const resData = await ProjectLocation.findOneAndUpdate({ _id: id }, {
                        name: name,
                        status: status
                    })
                    if (resData) {
                        sendResponse(res, 200, true, {}, "Project Location updated successfully");
                    } else {
                        sendResponse(res, 404, false, {}, "Project Location not found")
                    }
                }
            } else {
                return sendResponse(res, 400, false, {}, "Missing parameters");
            }
        } catch (err) {
            return sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.deleteProjectLocation = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            await ProjectLocation.findByIdAndUpdate(id, { deleted: true }).then((data) => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Project Location deleted successfully");
                }
            });
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

