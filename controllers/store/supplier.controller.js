const Supplier = require('../../models/store/supplier.model');

const { sendResponse } = require('../../helper/response');

exports.getSuppliers = async (req, res) => {
    if (req.user && !req.error) {
        try {
            await Supplier.find({ status: true, deleted: false }, { deleted: 0 }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, data, 'Supplier list');
                } else {
                    sendResponse(res, 400, false, {}, "Supplier not found");
                }
            });
        } catch (error) {
            sendResponse(res, 500, false, {}, 'Something went wrong');
        }
    } else {
        sendResponse(res, 400, false, {}, 'Unauthorised');
    }
}


exports.getAdminSuppliers = async (req, res) => {
    if (req.user && !req.error) {
        try {
            await Supplier.find({ deleted: false }, { deleted: 0 }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, data, 'Supplier list');
                } else {
                    sendResponse(res, 400, false, {}, "Supplier not found");
                }
            });
        } catch (error) {
            sendResponse(res, 500, false, {}, 'Something went wrong');
        }
    } else {
        sendResponse(res, 400, false, {}, 'Unauthorised');
    }
}

exports.manageSupplier = async (req, res) => {
    const { name, address, phone, email, gstNumber, status, id } = req.body;

    if (req.user) {
        if (name && address && phone && gstNumber) {
            const supplierObject = new Supplier({
                name: name,
                address: address,
                phone: phone,
                email: email,
                gstNumber: gstNumber
            });

            if (!id) {
                try {
                    await supplierObject.save(supplierObject).then(data => {
                        sendResponse(res, 200, true, {}, "Supplier added successfully")
                    }).catch(error => {
                        sendResponse(res, 400, false, {}, "Supplier already exists");
                    })
                } catch (error) {
                    sendResponse(res, 500, false, {}, "Something went wrong");
                }
            } else {
                await Supplier.findByIdAndUpdate(id, {
                    name: name,
                    address: address,
                    phone: phone,
                    email: email,
                    gstNumber: gstNumber,
                    status: status,
                }).then(data => {
                    if (data) {
                        sendResponse(res, 200, true, {}, "Supplier updated successfully");
                    } else {
                        sendResponse(res, 400, true, {}, "Supplier not found");
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

exports.deleteSupplier = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            await Supplier.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Supplier deleted successfully");
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

