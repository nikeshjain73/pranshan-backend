const PaintManufacturer = require('../../../models/erp/PaintManufacturer/paintManufacture.model');
const { sendResponse } = require("../../../helper/response");

exports.getPaintManufacturer = async (req, res) => {
    if (req.user && !req.error) {
        let status = req.query.status
        let project = req.query.project;
        let qurey = { deleted: false }
        if (status) {
            qurey.status = status
        }
        if (project) {
            qurey.project = project;
        }
        try {
            let data = await PaintManufacturer.find(qurey, { deleted: 0, __v: 0 }).sort({ createdAt: -1 }).lean()
            if (data) {
                sendResponse(res, 200, true, data, "Paint manufacturer data found successfully");
            } else {
                sendResponse(res, 400, false, data, "Paint manufacturer data not found");
            }
        } catch (err) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.managePaintManufacturer = async (req, res) => {
    const { id, name, status, project } = req.body;
    if (req.user && !req.error) {
        try {
            if (name) {
                const paintManufacture = new PaintManufacturer({
                    name: name,
                    project: project,
                });
                if (!id) {
                    await paintManufacture.save(paintManufacture).then(data => {
                        sendResponse(res, 200, true, {}, "Paint manufacturer added successfully");
                    }).catch(error => {
                        sendResponse(res, 400, false, {}, "Paint manufacturer already exists");
                    });
                } else {
                    await PaintManufacturer.findOneAndUpdate({ _id: id }, {
                        name: name,
                        status: status,
                        project: project,
                    }).then((resData) => {
                        if (resData) {
                            sendResponse(res, 200, true, {}, "Paint manufacturer updated successfully");
                        } else {
                            sendResponse(res, 404, false, {}, "Paint manufacturer not found");
                        }
                    });
                }
            } else {
                return sendResponse(res, 400, false, {}, "Missing parameters");
            }
        } catch (err) {
            console.log('err', err);
            return sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
}


exports.deletePaintManufacture = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            await PaintManufacturer.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Paint manufacturer deleted successfully");
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}