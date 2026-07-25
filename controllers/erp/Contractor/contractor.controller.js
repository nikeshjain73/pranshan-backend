const Contractor = require("../../../models/erp/Contractor/contractor.model");
const Project = require("../../../models/project.model");
const { sendResponse } = require("../../../helper/response");

exports.getContractor = async (req, res) => {
    let { status, project_id } = req.query;
    if (req.user && !req.error) {
        try {
            let query = { deleted: false };
            if (status) {
                query.status = status;
            }

            // If project_id is provided, fetch only contractors selected in that project
            if (project_id) {
                const project = await Project.findById(project_id).select('contractor').lean();
                if (!project) {
                    return sendResponse(res, 404, false, {}, "Project not found");
                }
                const contractorIds = (project.contractor || []).map(c => c.conId);
                query._id = { $in: contractorIds };
            }

            let data = await Contractor.find(query, { deleted: 0, __v: 0 }).sort({ createdAt: -1 }).lean();
            if (data) {
                sendResponse(res, 200, true, data, "Contractor data found successfully");
            } else {
                sendResponse(res, 400, false, {}, "Contractor not found");
            }
        } catch (err) {
            console.log('err', err);
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};


exports.manageContractor = async (req, res) => {
    let { id, name, mobile, email, site_incharge, site_supervisor, status } = req.body;
    if (req.user && !req.error) {
        if (name && mobile && email && site_incharge && site_supervisor) {
            site_incharge = site_incharge && JSON.parse(site_incharge);
            site_supervisor = site_supervisor && JSON.parse(site_supervisor);
            const object = new Contractor({
                name: name,
                mobile: mobile,
                email: email,
                site_incharge: site_incharge,
                site_supervisor: site_supervisor,
                status: status,
            });

            if (!id) {
                try {
                    const result = await object.save();
                    if (result) {
                        sendResponse(res, 200, true, {}, 'Contractor added successfully');
                    } else {
                        sendResponse(res, 400, false, {}, "Contractor already exists");
                    }
                } catch (err) {
                    sendResponse(res, 500, false, {}, 'Something went wrong');
                }
            } else {
                const data = await Contractor.findByIdAndUpdate(id, {
                    name: name,
                    mobile: mobile,
                    email: email,
                    site_incharge: site_incharge,
                    site_supervisor: site_supervisor,
                    status: status,
                })

                if (data) {
                    sendResponse(res, 200, true, {}, 'Contractor updated successfully');
                } else {
                    sendResponse(res, 404, false, {}, 'Contractor not found');
                }
            }
        } else {
            sendResponse(res, 400, false, {}, 'Missing Parameter');
        }
    } else {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.deleteContractor = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            await Contractor.findByIdAndUpdate(id, { deleted: true }).then(
                (data) => {
                    if (data) {
                        sendResponse(res, 200, true, {}, "Contractor deleted successfully");
                    }
                }
            );
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

