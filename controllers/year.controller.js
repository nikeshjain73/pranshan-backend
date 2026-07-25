const Year = require('../models/year.model');
const { sendResponse } = require('../helper/response')

exports.getYear = async (req, res) => {

    if (req.user && !req.error) {
        try {
                  const status = req.query.status === "false" ? false : true; 
            await Year.find({ status: true, deleted: false }, { deleted: 0 }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, data, "Year list")
                } else {
                    sendResponse(res, 400, false, {}, "Year not found")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.getAdminYear = async (req, res) => {

    if (req.user && !req.error) {
        try {
            await Year.find({ deleted: false }, { deleted: 0 }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, data, "Year list")
                } else {
                    sendResponse(res, 400, false, {}, "Year not found")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.manageYear = async (req, res) => {
    const { start_year, end_year, id, status } = req.body;
    if (req.user) {
        if (start_year, end_year) {
            const year = new Year({
                start_year: start_year,
                end_year: end_year,
            });

            if (!id) {
                try {
                    await year.save(year).then(data => {
                        sendResponse(res, 200, true, {}, "Year added successfully")
                    }).catch(error => {
                        sendResponse(res, 400, false, {}, "Year already exists");
                    })
                } catch (error) {
                    sendResponse(res, 500, false, {}, "Something went wrong");
                }
            } else {
                await Year.findByIdAndUpdate(id, {
                    start_year: start_year,
                    end_year: end_year,
                    status: status
                }).then(data => {
                    if (data) {
                        sendResponse(res, 200, true, {}, "Year updated successfully")
                    } else {
                        sendResponse(res, 200, true, {}, "Year not found")
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

exports.deleteYear = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            await Year.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Year deleted successfully")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}