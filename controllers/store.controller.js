const Store = require('../models/store.model');
const { sendResponse } = require('../helper/response')

exports.getStore = async (req, res) => {
    if (req.user && !req.error) {
        try {
            await Store.find({ deleted: false }, { deleted: 0 }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, data, "Store list")
                } else {
                    sendResponse(res, 400, false, {}, "Store not found")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.getAdminStore = async (req, res) => {
    if (req.user && !req.error) {
        try {
            await Store.find({ deleted: false }, { deleted: 0 }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, data, "Store list")
                } else {
                    sendResponse(res, 400, false, {}, "Store not found")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.manageStore = async (req, res) => {
    const { id, store_name, store_email, store_contact, store_address, status } = req.body;
    if (req.user) {
        if (store_name && store_email && store_contact && store_address) {
            const store = new Store({
                store_name: store_name,
                store_email: store_email,
                store_contact: store_contact,
                store_address: store_address
            });

            if (!id) {
                try {
                    await store.save(store).then(data => {
                        sendResponse(res, 200, true, {}, "Store added successfully")
                    }).catch(error => {
                        sendResponse(res, 400, false, {}, "Store already exists");
                    })
                } catch (error) {
                    sendResponse(res, 500, false, {}, "Something went wrong");
                }
            } else {
                await Store.findByIdAndUpdate(id,
                {
                    store_name: store_name,
                    store_email: store_email,
                    store_contact: store_contact,
                    store_address: store_address,
                    status: status
                }).then(data => {
                    if (data) {
                        sendResponse(res, 200, true, {}, "Store updated successfully")
                    } else {
                        sendResponse(res, 200, true, {}, "Store not found")
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

exports.deleteStore = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            await Store.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Store deleted successfully")
                }
            }).catch((error)=> {
                sendResponse(res, 200, true, {}, error)
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}


