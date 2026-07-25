const Category = require('../../models/payroll/category.model');
const { sendResponse } = require('../../helper/response')
const PartyBill = require("../../models/payroll/partyBill.model");

exports.getCategory = async (req, res) => {
    if (req.user && !req.error) {
        try {
            const result = await Category.find({ status: true, deleted: false }, { deleted: 0 })
            .sort({ name: 1 });

            if (result) {
                sendResponse(res, 200, true, result, "Category list")
            } else {
                    sendResponse(res, 400, false, {}, "Category not found")
            }
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
            const result = await Category.find({ deleted: false }, { deleted: 0 })
            .sort({ name: 1 });
            if (result) {
                sendResponse(res, 200, true, result, "Category list")
            } else {
                sendResponse(res, 400, false, {}, "Category not found")
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.manageCategory = async (req, res) => {
    const { name, id, status } = req.body;

    if (req.user) {
        if (name) {
            const category = new Category({
                name: name,
            });

            if (!id) {
                try {
                    await category.save(category).then(data => {
                        sendResponse(res, 200, true, {}, "Category added successfully")
                    }).catch(error => {
                        sendResponse(res, 400, false, {}, "Category already exists");
                    })
                } catch (error) {
                    sendResponse(res, 500, false, {}, "Something went wrong");
                }
            } else {
                await Category.findByIdAndUpdate(id, { name: name, status: status }).then(data => {
                    if (data) {
                        sendResponse(res, 200, true, {}, "Category updated successfully")
                    } else {
                        sendResponse(res, 404, false, {}, "Category not found")
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

exports.deleteCategory = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {

            const inUse = await PartyBill.findOne({ category: id ,deleted: false});
            if (inUse) {
                sendResponse(res, 400, false, {}, "Cannot delete Category. It is in use by in Party Bill.");
                return;
            }
            await Category.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Category deleted successfully")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}