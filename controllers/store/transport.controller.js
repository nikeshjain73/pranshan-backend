const Transport = require('../../models/store/transport.model');
const { sendResponse } = require('../../helper/response');
const upload = require('../../helper/multerConfig');
const path = require('path');
const xlsx = require('xlsx');
const { downloadFormat } = require('../../helper/index');

exports.getTransport = async (req, res) => {
    if (req.user && !req.error) {
        try {
            await Transport.find({ status: true, deleted: false }, { deleted: 0 }).sort({ name: 1 })
                .then(data => {
                    if (data) {
                        sendResponse(res, 200, true, data, "Transport list")
                    } else {
                        sendResponse(res, 400, false, [], "Transport list not found")
                    }
                })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.getAdminTransport = async (req, res) => {
    if (req.user && !req.error) {
        const { projects } = req.query;
        let query = { deleted: false };
        // if(projects){
        //     query.project = { $in:projects };
        // }
        try {
            await Transport.find(query, { deleted: 0 }).sort({ createdAt: -1 })
                .then(data => {
                    if (data) {
                        sendResponse(res, 200, true, data, "Transport list")
                    } else {
                        sendResponse(res, 400, false, [], "Transport list not found")
                    }
                })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.manageTransport = async (req, res) => {
    const { name, email, phone, address, status, id } = req.body
    if (req.user) {
        if (name && phone && address) {
            const TransportObj = new Transport({
                name: name,
                email: email,
                phone: phone,
                address: address,
            });

            if (!id) {
                try {
                    await TransportObj.save(TransportObj).then(data => {
                        sendResponse(res, 200, true, {}, "Transport added successfully")
                    });
                } catch (error) {
                    sendResponse(res, 500, false, {}, "Something went wrong");
                }
            } else {
                await Transport.findByIdAndUpdate(id, {
                    name: name,
                    email: email,
                    phone: phone,
                    address: address,
                    status: status,
                }).then(data => {
                    if (data) {
                        sendResponse(res, 200, true, {}, "Transport updated successfully")
                    } else {
                        sendResponse(res, 200, true, {}, "Transport not found")
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

exports.deleteTransport = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            await Transport.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Transport deleted successfully")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.uploadTransport = async (req, res) => {
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
                const data = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
                const results = { success: [], errors: [] };

                for (const row of data) {
                    const cleanedRow = {};
                    for (const key in row) {
                        if (row.hasOwnProperty(key)) {
                            cleanedRow[key.trim()] = row[key];
                        }
                    }
                    const { name, email, phone, address } = cleanedRow;

                    const missingFields = [];
                    if (!name) missingFields.push('name');
                    if (!phone) missingFields.push('phone');
                    if (!address) missingFields.push('address');

                    if (missingFields.length > 0) {
                        results.errors.push({ row: cleanedRow, error: `Missing required field(s): ${missingFields.join(', ')}` });
                        continue;
                    }

                    const phonePattern = /^\d{10,11}$/;
                    if (!phonePattern.test(phone)) {
                        results.errors.push({ row: cleanedRow, error: 'Invalid phone number (must be 10 or 11 digits)' });
                        continue;
                    }

                    try {
                        const existingTransport = await Transport.findOne({ name: new RegExp(`^${name}$`, 'i') });
                        if (existingTransport) {
                            results.errors.push({ row, error: `Duplicate entry: ${existingTransport.name}` });
                        } else {
                            const TransportObj = new Transport({
                                name: name,
                                email: email,
                                phone: phone,
                                address: address,
                            });
                            await TransportObj.save();
                            results.success.push(row);
                        }
                    } catch (error) {
                        results.errors.push({ row: cleanedRow, error: error.message });
                    }
                }
                if (results.errors.length > 0) {
                    sendResponse(res, 400, false, results, 'Some rows could not be processed');
                } else {
                    sendResponse(res, 200, true, results, 'Transport file uploaded successfully');
                }
            } catch (error) {
                sendResponse(res, 500, false, {}, 'Something went wrong');
            }
        })
    } else {
        sendResponse(res, 401, false, {}, 'Unauthorized');
    }
}

exports.downloadFormate = async (req, res) => {
    downloadFormat(req,res,'Transport.xlsx')
}   