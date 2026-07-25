const Skill = require('../../models/payroll/skill.model');
const { sendResponse } = require('../../helper/response');

exports.getSkill = async (req, res) => {
    if (req.user && !req.error) {
        try {
            const result = await Skill.find({ status: true, deleted: false }, { deleted: 0 })
            .sort({ name: 1 });
            if (result) {
                sendResponse(res, 200, true, result, "Skill list")
            } else {
                sendResponse(res, 400, false, {}, "Skill not found")
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.getAdminSkill = async (req, res) => {
    if (req.user && !req.error) {
        try {
            const result = await Skill.find({ deleted: false }, { deleted: 0 })
            .sort({ name: 1 });
            if (result) {
                sendResponse(res, 200, true, result, "Skill list")
            } else {
                sendResponse(res, 400, false, {}, "Skill not found")
            }
           
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.manageSkill = async (req, res) => {
    const { name, id, status } = req.body;

    if (req.user) {
        if (name) {
            const skill = new Skill({
                name: name,
            });

            if (!id) {
                try {
                    await skill.save(skill).then(data => {
                        sendResponse(res, 200, true, {}, "Skill added successfully")
                    }).catch(error => {
                        sendResponse(res, 400, false, {}, "Skill already exists");
                    })
                } catch (error) {
                    sendResponse(res, 500, false, {}, "Something went wrong");
                }
            } else {
                await Skill.findByIdAndUpdate(id, { name: name, status: status }).then(data => {
                    if (data) {
                        sendResponse(res, 200, true, {}, "Skill updated successfully")
                    } else {
                        sendResponse(res, 404, false, {}, "Skill not found")
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

exports.deleteSkill = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            await Skill.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Skill deleted successfully")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}