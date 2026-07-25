const ItemCategory = require('../../models/store/item_category.model');
const { sendResponse } = require('../../helper/response');
const upload = require('../../helper/multerConfig');
const path = require('path');
const xlsx = require('xlsx');
const { downloadFormat } = require('../../helper/index');

exports.getCategory = async (req, res) => {
    if (req.user && !req.error) {
        try {
            await ItemCategory.find({ status: true, deleted: false }, { deleted: 0 }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, data, "Item category list")
                } else {
                    sendResponse(res, 400, false, {}, "Item category not found")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.getAdminCategory = async (req, res) => {
    if (req.user && !req.error) {
        try {
            await ItemCategory.find({ deleted: false }, { deleted: 0 }).sort({ createdAt: -1 })
                .then(data => {
                    if (data) {
                        sendResponse(res, 200, true, data, "Item category list")
                    } else {
                        sendResponse(res, 400, false, {}, "Item category not found")
                    }
                })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}


exports.manageItemCategory = async (req, res) => {
    const { name, status, id } = req.body;
    if (req.user) {
        if (name) {
            const itemCategory = new ItemCategory({
                name: name,
            });

            if (!id) {
                try {
                    await itemCategory.save(itemCategory).then(data => {
                        sendResponse(res, 200, true, {}, "Item category added successfully")
                    }).catch(error => {
                        sendResponse(res, 400, false, {}, "Item category already exists");
                    })
                } catch (error) {
                    sendResponse(res, 500, false, {}, "Something went wrong");
                }
            } else {
                await ItemCategory.findByIdAndUpdate(id, {
                    name: name,
                    status: status,
                }).then(data => {
                    if (data) {
                        sendResponse(res, 200, true, {}, "Item category updated successfully")
                    } else {
                        sendResponse(res, 200, true, {}, "Item category not found")
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

exports.deleteItemCategory = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            await ItemCategory.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Item category deleted successfully")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.uploadItemCategory = async (req, res) => {
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
                    const { name } = row;
                    if (!name) {
                        results.errors.push({ row, error: 'Name is required' });
                        continue;
                    }
                    try {
                        const existingItemCategory = await ItemCategory.findOne({ name: new RegExp(`^${name}$`, 'i') });
                        if (existingItemCategory) {
                            results.errors.push({ row, error: `Duplicate entry: ${existingItemCategory.name}` });
                        } else {
                            const itemCategory = new ItemCategory({ name });
                            await itemCategory.save();
                            // results.success.push(row);
                        }
                    } catch (error) {
                        // console.error('Error processing row:', error);
                        results.errors.push({ row, error: error.message });
                    }
                }
                if (results.errors.length > 0) {
                    sendResponse(res, 400, false, results, 'Some rows could not be processed');
                } else {
                    sendResponse(res, 200, true, results, 'Item category file uploaded successfully');
                }
            } catch (error) {
                // console.error('Error reading or processing file:', error);
                sendResponse(res, 500, false, {}, 'Something went wrong');
            }
        });
    } else {
        sendResponse(res, 401, false, {}, 'Unauthorized');
    }
};

exports.downloadFormate = async (req, res) => {
   downloadFormat(req,res,'ItemCategory.xlsx')
}