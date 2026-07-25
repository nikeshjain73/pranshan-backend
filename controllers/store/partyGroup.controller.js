const PartyGroup = require('../../models/store/party_group.model');

const { sendResponse } = require('../../helper/response');

exports.getPartyGroup = async (req, res) => {

    if (req.user && !req.error) {
        try {
            await PartyGroup.find({ status: true, deleted: false }, { deleted: 0 }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, data, "Party group list")
                } else {
                    sendResponse(res, 400, false, {}, "Party group not found")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.getAdminPartyGroup = async (req, res) => {

    if (req.user && !req.error) {
        try {
            await PartyGroup.find({ deleted: false }, { deleted: 0 }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, data, "Party group list");
                } else {
                    sendResponse(res, 400, false, {}, "Party group not found");
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}


exports.managePartyGroup = async (req, res) => {
    const { name, status, id } = req.body
    if (req.user) {
        if (name) {
            const partyGroup = new PartyGroup({
                name: name,
            });

            if (!id) {
                try {
                    await partyGroup.save(partyGroup).then(data => {
                        sendResponse(res, 200, true, {}, "Party group added successfully")
                    }).catch(error => {
                        sendResponse(res, 400, false, {}, "Party group already exists");
                    })
                } catch (error) {
                    sendResponse(res, 500, false, {}, "Something went wrong");
                }
            } else {
                await PartyGroup.findByIdAndUpdate(id, {
                    name: name,
                    status: status,
                }).then(data => {
                    if (data) {
                        sendResponse(res, 200, true, {}, "Party group updated successfully")
                    } else {
                        sendResponse(res, 200, true, {}, "Party group not found")
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


exports.deletePartyGroup = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            await PartyGroup.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Party group deleted successfully")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}
