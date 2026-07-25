const Unit = require('../../models/store/store_unit.model');
const { sendResponse } = require('../../helper/response');
const upload = require('../../helper/multerConfig');
const xlsx = require('xlsx');
const path = require('path');
const { downloadFormat } = require('../../helper/index');

exports.getUnit = async (req, res) => {
    if (req.user && !req.error) {
        try {
            await Unit.find({ status: true, deleted: false }, { deleted: 0 }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, data, "Unit list");
                } else {
                    sendResponse(res, 400, false, [], "Unit not found");
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.getAdminUnit = async (req, res) => {
    if (req.user && !req.error) {
        try {
            await Unit.find({ deleted: false }, { deleted: 0 })
                .sort({ createdAt: -1 })
                .then(data => {
                    if (data) {
                        sendResponse(res, 200, true, data, "Unit list");
                    } else {
                        sendResponse(res, 400, false, [], "Unit not found");
                    }
                })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.manageUnit = async (req, res) => {
    // console.log(req.user);
    const { name, status, id } = req.body
    if (req.user) {
        if (name) {
            const unit = new Unit({
                name: name,
            });

            if (!id) {
                try {
                    await unit.save(unit).then(data => {
                        sendResponse(res, 200, true, {}, "Unit added successfully")
                    }).catch(error => {
                        sendResponse(res, 400, false, {}, "Unit already exists");
                    })
                } catch (error) {
                    sendResponse(res, 500, false, {}, "Something went wrong");
                }
            } else {
                await Unit.findByIdAndUpdate(id, {
                    name: name,
                    status: status,
                }).then(data => {
                    if (data) {
                        sendResponse(res, 200, true, {}, "Unit updated successfully")
                    } else {
                        sendResponse(res, 200, true, {}, "Unit not found")
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

exports.deleteUnit = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            await Unit.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Unit deleted successfully")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.importUnit = async (req, res) => {
    if (req.user && !req.error) {
        upload(req, res, async function (err) {
            if (err) {
                return sendResponse(res, 500, false, {}, `File upload failed: ${err.message}`);
            }
            if (!req.file) {
                return sendResponse(res, 400, false, {}, 'Missing file');
            }

            const fileTypes = /xlsx|xlsm|xltx|xltm/;
            const extname = fileTypes?.test(path?.extname(req.file.originalname).toLowerCase());
            const mimetype = req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                req.file.mimetype === 'application/vnd.ms-excel.sheet.macroEnabled.12';

            if (!extname || !mimetype) {
                return sendResponse(res, 400, false, {}, 'Only .xlsx files are allowed!');
            }

            const filePath = req.file.path;
            try {
                const workbook = xlsx.readFile(filePath);
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const data = xlsx.utils.sheet_to_json(worksheet);

                const results = { success: [], errors: [] };

                for (const row of data) {
                    const name = row.name?.trim();
                    if (!name) {
                        results.errors.push({ row, error: 'Name is required' });
                        continue;
                    }
                    try {
                        const existingUnit = await Unit.findOne({ name: new RegExp(`^${name}$`, 'i') });
                        if (existingUnit) {
                            results.errors.push({ row, error: `Duplicate entry: ${existingUnit.name}` });
                        } else {
                            const unit = new Unit({ name });
                            await unit.save();
                        }
                    } catch (error) {
                        results.errors.push({ row, error: error.message });
                    }
                }
                if (results.errors.length > 0) {
                    sendResponse(res, 400, false, results, 'Some rows could not be processed');
                } else {
                    sendResponse(res, 200, true, results, 'Unit file uploaded successfully');
                }
            } catch (error) {
                // console.error('Error reading or processing file:', error);
                sendResponse(res, 500, false, {}, 'Something went wrong');
            }
        });
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
};

exports.downloadFormate = async (req, res) => {
    downloadFormat(req, res, 'Unit.xlsx')
}