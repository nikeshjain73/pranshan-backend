const PartyTag = require('../../models/store/party_tag.model');

const { sendResponse } = require('../../helper/response');

exports.getPartyTag = async (req, res) => {

    if (req.user && !req.error) {
        try {
            await PartyTag.find({ status: true, deleted: false }, { deleted: 0 }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, data, "Party tag list")
                } else {
                    sendResponse(res, 400, false, {}, "Party tag not found")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}


exports.managePartyTag = async (req, res) => {
    const { name, status, id } = req.body
    if (req.user) {
        if (name) {
            const tag = new PartyTag({
                name: name,
            });

            if (!id) {
                try {
                    await tag.save(tag).then(data => {
                        sendResponse(res, 200, true, {}, "Party tag added successfully")
                    }).catch(error => {
                        sendResponse(res, 400, false, {}, "Party tag already exists");
                    })
                } catch (error) {
                    sendResponse(res, 500, false, {}, "Something went wrong");
                }
            } else {
                await PartyTag.findByIdAndUpdate(id, {
                    name: name,
                    status: status,
                }).then(data => {
                    if (data) {
                        sendResponse(res, 200, true, {}, "Party tag updated successfully")
                    } else {
                        sendResponse(res, 200, true, {}, "Party tag not found")
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


exports.deletePartyTag = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            await PartyTag.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Party tag deleted successfully")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}
