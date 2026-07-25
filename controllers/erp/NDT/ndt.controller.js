const NDT = require("../../../models/erp/NDT/ndt.model");
const { sendResponse } = require("../../../helper/response");
const { TitleFormat } = require("../../../utils/enum");

exports.getNDT = async (req, res) => {
  if (req.user && !req.error) {
    let status = req.query.status
    let project = req.query.project;
    let qurey = { deleted: false }
    if (status) {
      qurey.status = status
    }
    if (project) {
      qurey.project = project;
    }
    try {
      let data = await NDT.find(qurey, { deleted: 0, __v: 0 })
        .populate('joint_type', 'name')
        .sort({ createdAt: -1 }).lean()
      if (data) {
        sendResponse(res, 200, true, data, "NDT data found successfully");
      } else {
        sendResponse(res, 400, false, data, "NDT data not found");
      }
    } catch (err) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.manageNDT = async (req, res) => {
  const { id, name, status, joint_type, examination, project } = req.body;
  if (req.user && !req.error) {
    try {
      if (name) {
        const jointData = joint_type && JSON.parse(joint_type);

        if (!id) {
          const ndt = new NDT({
            name: name,
            joint_type: jointData,
            examination: examination,
            project: project,
          });

          await ndt.save().then((data) => {
            sendResponse(res, 200, true, {}, "NDT added successfully");
          }).catch(error => {
            console.log(error, 'Error')
            sendResponse(res, 400, false, {}, "NDT already exists");
          });
        } else {
          await NDT.findOneAndUpdate({ _id: id }, {
            name: name,
            status: status,
            joint_type: jointData,
            examination: examination,
            project: project,
          }).then((resData) => {
            if (resData) {
              sendResponse(res, 200, true, {}, "NDT updated successfully");
            } else {
              sendResponse(res, 404, false, {}, "NDT not found")
            }
          });
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (err) {
      console.log('err', err);
      return sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.deleteNDT = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error && id) {
    try {
      await NDT.findByIdAndUpdate(id, { deleted: true }).then(
        (data) => {
          if (data) {
            sendResponse(res, 200, true, {}, "NDT deleted successfully");
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

