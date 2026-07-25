const InventoryLocation = require('../../models/store/inventory_location.model')
const { sendResponse } = require('../../helper/response');
const upload = require('../../helper/multerConfig');
const path = require('path');
const xlsx = require('xlsx');
const { downloadFormat } = require('../../helper/index');

exports.getInventoryLocation = async (req, res) => {
    if (req.user && !req.error) {
        try {
            await InventoryLocation.find({ status: true, deleted: false }, { deleted: 0 }).sort({ name: 1 })
                .then(data => {
                    if (data) {
                        sendResponse(res, 200, true, data, 'Inventory Location List');
                    }
                    else {
                        sendResponse(res, 200, true, [], 'Inventory Location not found');
                    }
                })
        } catch (error) {
            sendResponse(res, 500, false, {}, 'Something went wrong');
        }
    } else {
        sendResponse(res, 401, false, {}, 'Unauthorized');
    }
}

exports.getAdminInventoryLocation = async (req, res) => {
    if (req.user && !req.error) {
        try {
            await InventoryLocation.find({ deleted: false }, { deleted: 0 })
                .sort({ createdAt: -1 })
                .then(data => {
                    if (data) {
                        sendResponse(res, 200, true, data, 'Inventory location List');
                    }
                    else {
                        sendResponse(res, 200, true, [], 'Inventory location not found');
                    }
                })
        } catch (error) {
            sendResponse(res, 500, false, {}, 'Something went wrong');
        }
    } else {
        sendResponse(res, 401, false, {}, 'Unauthorized');
    }
}

exports.manageInventoryLocation = async (req, res) => {
    const { name, address, status, id } = req.body;

    if (req.user) {
        if (name && address) {
            const inventoryLocation = new InventoryLocation({
                name: name,
                address: address,
            });

            if (!id) {
                try {
                    await inventoryLocation.save(inventoryLocation).then(data => {
                        sendResponse(res, 200, true, {}, "Inventory location added successfully")
                    }).catch(error => {
                        sendResponse(res, 400, false, {}, "Inventory location already exists");
                    })
                } catch (error) {
                    sendResponse(res, 500, false, {}, "Something went wrong");
                }
            } else {
                await InventoryLocation.findByIdAndUpdate(id, {
                    name: name,
                    address: address,
                    status: status,
                }).then(data => {
                    if (data) {
                        sendResponse(res, 200, true, {}, "Inventory location updated successfully")
                    } else {
                        sendResponse(res, 200, true, {}, "Inventory location not found")
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

exports.deleteInventoryLocation = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            await InventoryLocation.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Inventory location deleted successfully")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.uploadInventoryLocation = async (req, res) => {
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
                    const { name, address } = row;
                    if (!name && !address) {
                        results.errors.push({ row, error: 'Name and Address are required' });
                        continue;
                    }
                    try {
                        const existingLocationByName = await InventoryLocation.findOne({
                            name: new RegExp(`^${name}$`, 'i')
                        });
                        const existingLocationByAddress = await InventoryLocation.findOne({
                            address: new RegExp(`^${address}$`, 'i')
                        });

                        if (existingLocationByName && existingLocationByAddress) {
                            results.errors.push({ row, error: 'Duplicate entry for both name and address' });
                        } else if (existingLocationByName) {
                            results.errors.push({ row, error: 'Duplicate entry for name' });
                        } else if (existingLocationByAddress) {
                            results.errors.push({ row, error: 'Duplicate entry for address' });
                        } else {
                            const inventoryLocation = new InventoryLocation({
                                name: name,
                                address: address
                            });
                            await inventoryLocation.save();
                            // results.success.push(row);
                        }
                    } catch (error) {
                        results.errors.push({ row, error: error.message });
                    }
                }
                if (results.errors.length > 0) {
                    sendResponse(res, 400, false, results, 'Some rows could not be processed');
                } else {
                    sendResponse(res, 200, true, results, 'Inventory Location file uploaded successfully');
                }
            } catch (error) {
                // console.error('Error reading or processing file:', error);
                sendResponse(res, 500, false, {}, 'Something went wrong');
            }
        })
    } else {
        sendResponse(res, 401, false, {}, 'Unauthorized');
    }
}

exports.downloadFormate = async (req, res) => {
    downloadFormat(req, res, 'InventoryLocation.xlsx')
}