const Holiday = require('../../models/payroll/holiday.model');

const Year = require('../../models/year.model');
const Firm = require('../../models/firm.model');


const { sendResponse } = require('../../helper/response');

exports.getHoliday = async (req, res) => {
    if (req.user && !req.error) {
        try {
            await Holiday.find({ status: true, deleted: false }, { deleted: 0 })
                .populate('firm_id', 'name')
                // .populate('year_id', 'start_year end_year')
                .then(data => {
                    if (data) {
                        sendResponse(res, 200, true, data, "Holiday list")
                    } else {
                        sendResponse(res, 400, false, {}, "Holiday not found")
                    }
                })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.getAdminHoliday = async (req, res) => {
    if (req.user && !req.error) {
        try {
            await Holiday.find({ deleted: false }, { deleted: 0 })
                .populate('firm_id', 'name')
                // .populate('year_id', 'start_year end_year')
                .then(data => {
                    if (data) {
                        sendResponse(res, 200, true, data, "Holiday list")
                    } else {
                        sendResponse(res, 400, false, {}, "Holiday not found")
                    }
                })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.manageHoliday = async (req, res) => {
    const {
        name,
        day,
        date,
        month,
        firm_id,
        // year_id,

        status,
        id
    } = req.body;

    if (req.user) {
        if (
            name &&
            firm_id &&
            date &&
            month &&
            day
        ) {
            const firmData = await Firm.findById(firm_id);
            if (!firmData) {
                sendResponse(res, 404, false, {}, "Firm not found");
                return;
            }

            const holiday = new Holiday({
                name: name,
                day: day,
                date: date,
                month: month,
                firm_id: firm_id,
            })

            if (!id) {
                try {
                    await holiday.save(holiday).then(data => {
                        sendResponse(res, 200, true, {}, "Holiday added successfully")
                    }).catch(error => {
                        sendResponse(res, 400, false, {}, "Holiday already exists");
                    })
                } catch (error) {
                    sendResponse(res, 500, false, {}, "Something went wrong");
                }
            } else {
                await Holiday.findByIdAndUpdate(id, {
                    firm_id: firm_id,
                    month: month,
                    name: name,
                    day: day,
                    date: date,

                    status: status,
                }).then(data => {
                    if (data) {
                        sendResponse(res, 200, true, {}, "Holiday updated successfully")
                    } else {
                        sendResponse(res, 404, false, {}, "Holiday not found")
                    }
                })
            }
        } else {

            sendResponse(res, 400, false, {}, "Missing parameters");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.deleteHoliday = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            await Holiday.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Holiday deleted successfully")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}