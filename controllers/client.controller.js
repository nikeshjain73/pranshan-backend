const Client = require('../models/client.model');

const { sendResponse } = require('../helper/response');

exports.getClients = async (req, res) => {
    if (req.user && !req.error) {
        try {
            await Client.find({ status: true, deleted: false }, { deleted: 0 }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, data, 'Client list');
                }
                else {
                    sendResponse(res, 200, true, {}, 'Client not found');
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, 'Something went wrong');
        }
    } else {
        sendResponse(res, 400, false, {}, 'Unauthorised');
    }
}

exports.getAdminClients = async (req, res) => {
    if (req.user && !req.error) {
        try {
            await Client.find({ deleted: false }, { deleted: 0 }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, data, 'Client list');
                }
                else {
                    sendResponse(res, 200, true, {}, 'Client not found');
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, 'Something went wrong');
        }
    } else {
        sendResponse(res, 400, false, {}, 'Unauthorised');
    }
}

exports.manageClient = async (req, res) => {
    const { name, address, phone, email, gstNumber, status, id } = req.body;

    if (req.user) {
        if (name && address && phone && gstNumber) {
            const ClientObject = new Client({
                name: name,
                address: address,
                phone: phone,
                email: email,
                gstNumber: gstNumber
            });

            if (!id) {
                try {
                    await ClientObject.save(ClientObject).then(data => {
                        sendResponse(res, 200, true, {}, "Client added successfully")
                    })
                } catch (error) {
                    sendResponse(res, 500, false, {}, "Something went wrong");
                }
            } else {
                await Client.findByIdAndUpdate(id, {
                    name: name,
                    address: address,
                    phone: phone,
                    email: email,
                    gstNumber: gstNumber,
                    status: status,
                }).then(data => {
                    if (data) {
                        sendResponse(res, 200, true, {}, "Client updated successfully")
                    } else {
                        sendResponse(res, 200, true, {}, "Client not found")
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

exports.deleteClient = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            await Client.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Client deleted successfully")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

