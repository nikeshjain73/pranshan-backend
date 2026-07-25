const Master = require("../../../models/main-store/general/master.model");

const { sendResponse } = require("../../../helper/response");
const Tag = require("../../../models/main-store/general/tag.model");

exports.manageMaster = async (req, res) => {
  const { tag_id, name, id } = req.body;
  if (req.user && !req.error) {
    try {
      if (tag_id && name) {
        if (id) {
          await Master.find({
            tag_id: tag_id,
            name: { $regex: new RegExp(`^${name}$`, "i") },
            deleted: false,
          }).then(async (data) => {
            const filterdata = data.filter((o) => o._id.toString() != id);
            if (filterdata.length) {
              sendResponse(
                res,
                400,
                false,
                {},
                "Master already exist with tag"
              );
            } else {
              const updateMaster = await Master.findByIdAndUpdate(
                id,
                {
                  tag_id: tag_id,
                  name: name,
                },
                { new: true }
              );
              if (updateMaster) {
                sendResponse(
                  res,
                  200,
                  true,
                  updateMaster,
                  "Master update successfully"
                );
              } else {
                sendResponse(res, 400, false, {}, "Master not updated");
              }
            }
          });
        } else {
          await Master.find({
            tag_id: tag_id,
            name: { $regex: new RegExp(`^${name}$`, "i") },
            deleted: false,
          }).then(async (data) => {
            if (data.length) {
              sendResponse(
                res,
                400,
                false,
                {},
                "Master already exist with tag"
              );
            } else {
              const addMaster = await Master.create({
                tag_id: tag_id,
                name: name,
              });
              if (addMaster) {
                sendResponse(
                  res,
                  200,
                  true,
                  addMaster,
                  "Master added successfully"
                );
              } else {
                sendResponse(res, 400, false, {}, "Master not added");
              }
            }
          });
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.getMaster = async (req, res) => {
  let { tag_id } = req.query;
  if (req.user && !req.error) {
    try {

      let tag
      if (tag_id) {
        tag = await Tag.findOne({
          tag_number: tag_id,
          deleted: false,
        }).select({ _id: 1 });
        if (!tag) {
          sendResponse(res, 400, false, [], "Master not found on this tag id");
          return;
        }
      }
      const masterData = await Master.aggregate([
        {
          $match: {
            status: true,
            deleted: false,
            ...(tag
              ? {
                $expr: {
                  $eq: ["$tag_id", tag._id],
                },
              }
              : {}),
          },
        },
        {
          $lookup: {
            from: "tags",
            let: { id: "$tag_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$id"] },
                },
              },
              {
                $project: {
                  _id: 0,
                  title: { $toString: "$title" },
                  tag_number: 1,
                },
              },
            ],
            as: "tag",
          },
        },
        {
          $addFields: {
            tag_title: { $arrayElemAt: ["$tag.title", 0] },
            tag_number: { $arrayElemAt: ["$tag.tag_number", 0] },
          },
        },
        {
          $sort: { name: -1 },
        },
        {
          $project: {
            tag: 0,
          },
        },
      ]);
      if (masterData) {
        sendResponse(res, 200, true, masterData, "Master list");
      } else {
        sendResponse(res, 400, false, [], "Master not found");
      }
    } catch (error) {
      console.log("error", error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.deleteMaster = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      await Master.findByIdAndUpdate(id, { deleted: true }).then((data) => {
        if (data) {
          sendResponse(res, 200, true, {}, "Master deleted successfully");
        }
      });
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};
