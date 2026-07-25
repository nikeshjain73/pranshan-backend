const unitLocation = require('../../../models/main-store/unitLocation/unitLocation.model');
const { sendResponse } = require('../../../helper/response');

exports.getUnitLocation = async (req, res) => {
    const { status } = req.query;
    if (!req.user && req.error) {
        return sendResponse(res, 401, false, {}, 'Unauthorized');
    }
    try {
        let query = { deleted: false };
        if (status) {
            query.status = status;
        }
        const unitLocationData = await unitLocation.find({ ...query }, { deleted: 0, __v: 0 }).sort({ createdAt: -1 });
        if (!unitLocationData || unitLocationData.length === 0) {
            return sendResponse(res, 200, true, [], 'No Unit Location found');
        }
        return sendResponse(res, 200, true, unitLocationData, 'Unit Location fetched successfully');
    } catch (error) {
        return sendResponse(res, 500, false, error.message, 'Internal Server Error');
    }
}

exports.manageUnitLocation = async (req, res) => {
    const { name, status, id } = req.body;
    if (!req.user && req.error) {
        return sendResponse(res, 401, false, {}, 'Unauthorized');
    }
    try {
        if (id) {
            const unitLocationData = await unitLocation.findByIdAndUpdate(id, { name, status }, { new: true });
            if (!unitLocationData) {
                return sendResponse(res, 404, false, {}, 'Unit Location not found');
            }
            return sendResponse(res, 200, true, unitLocationData, 'Unit Location updated successfully');
        } else {
            const existingUnitLocation = await unitLocation.findOne({ name, deleted: false });
            if (existingUnitLocation) {
                return sendResponse(res, 400, false, {}, 'Unit Location already exists');
            }
            const unitLocationData = await unitLocation.create({ name });
            if (!unitLocationData) {
                return sendResponse(res, 400, false, {}, 'Unit Location creation failed');
            }
            return sendResponse(res, 201, true, unitLocationData, 'Unit Location created successfully');
        }
    } catch (error) {
        return sendResponse(res, 500, false, error.message, 'Internal Server Error');
    }
}

exports.deleteUnitLocation = async (req, res) => {
    const { id } = req.params;
    if (!req.user && req.error) {
        return sendResponse(res, 401, false, {}, 'Unauthorized');
    }
    try {
        const unitLocationData = await unitLocation.findByIdAndUpdate(id, { deleted: true }, { new: true });
        if (!unitLocationData) {
            return sendResponse(res, 404, false, {}, 'Unit Location not found');
        }
        return sendResponse(res, 200, true, unitLocationData, 'Unit Location deleted successfully');
    } catch (error) {
        return sendResponse(res, 500, false, error.message, 'Internal Server Error');
    }
}