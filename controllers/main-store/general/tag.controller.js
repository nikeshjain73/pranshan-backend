const Tag = require("../../../models/main-store/general/tag.model");

const { sendResponse } = require("../../../helper/response");

exports.manageTag = async (req, res) => {
  const { title, tag_number, id } = req.body;
  const titl = title.toLowerCase();
  if (req.user && !req.error) {
    try {
      if (title && tag_number) {
        if (id) {
          await Tag.find({
            $or: [
              { title: { $regex: new RegExp(`^${titl}$`, "i") } },
              { tag_number: tag_number },
            ],
            deleted: false,
          }).then(async (data) => {
            const filterdata = data.filter((o) => o._id.toString() != id);
            if (filterdata.length) {
              sendResponse(
                res,
                400,
                false,
                {},
                "Tag already exist with title or tag number"
              );
            } else {
              const updateTag = await Tag.findByIdAndUpdate(
                id,
                {
                  title: title,
                  tag_number: tag_number,
                },
                { new: true }
              );
              if (updateTag) {
                sendResponse(
                  res,
                  200,
                  true,
                  updateTag,
                  "Tag update successfully"
                );
              } else {
                sendResponse(res, 400, false, {}, "Tag not updated");
              }
            }
          });
        } else {
          await Tag.find({
            $or: [
              { title: { $regex: new RegExp(`^${titl}$`, "i") } },
              { tag_number: tag_number },
            ],
            deleted: false,
          }).then(async (data) => {
            if (data.length) {
              sendResponse(
                res,
                400,
                false,
                {},
                "Tag already exist with title or tag number"
              );
            } else {
              const addTag = await Tag.create({
                title: title,
                tag_number: tag_number,
              });
              if (addTag) {
                sendResponse(res, 200, true, addTag, "Tag added successfully");
              } else {
                sendResponse(res, 400, false, {}, "Tag not added");
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

exports.getTag = async (req, res) => {
  if (req.user && !req.error) {
    try {
      await Tag.find({ status: true, deleted: false }, { deleted: 0 }).then(
        (data) => {
          if (data) {
            sendResponse(res, 200, true, data, "Tag list");
          } else {
            sendResponse(res, 400, false, [], "Tag not found");
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

exports.deleteTag = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      await Tag.findByIdAndUpdate(id, { deleted: true }).then((data) => {
        if (data) {
          sendResponse(res, 200, true, {}, "Tag deleted successfully");
        } else {
          sendResponse(res, 400, false, {}, "Tag not deleted");
        }
      });
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};
