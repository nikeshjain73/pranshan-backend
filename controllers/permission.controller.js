const { sendResponse } = require("../helper/response");
const Permission = require("../models/permission.model");

exports.addPermission = async (req, res) => {
  const { module } = req.body;
  if (req.user && !req.error) {
    try {
      if (module) {
        const titl = module.toLowerCase();
        let newArr = [
          {
            title: `${titl}-view`,
          },
          {
            title: `${titl}-add`,
          },
          {
            title: `${titl}-update`,
          },
          {
            title: `${titl}-delete`,
          },
        ];
        const addPermission = await Permission.create(newArr);
        if (addPermission) {
          sendResponse(
            res,
            200,
            true,
            addPermission,
            "Permission added successfully"
          );
        } else {
          sendResponse(res, 400, false, {}, "Permission not added");
        }
      } else {
        sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.managePermission = async (req, res) => {
  const { title, id } = req.body;
  const titl = title.toLowerCase();
  if (req.user && !req.error) {
    try {
      if (id) {
        const existingPermission = await Permission.find({
          deleted: false,
          title: { $regex: new RegExp(`^${titl}$`, "i") },
        });
        const filterdata = existingPermission.filter(
          (o) => o._id.toString() != id
        );
        if (filterdata.length > 0) {
          sendResponse(
            res,
            400,
            false,
            {},
            "Permission already exist with title"
          );
        } else {
          const updatePermission = await Permission.findByIdAndUpdate(
            id,
            {
              title: title,
            },
            { new: true }
          );
          if (updatePermission) {
            sendResponse(
              res,
              200,
              true,
              updatePermission,
              "Permission update successfully"
            );
          } else {
            sendResponse(res, 400, false, {}, "Permission not updated");
          }
        }
      } else {
        const existingPermission = await Permission.find({
          deleted: false,
          title: { $regex: new RegExp(`^${titl}$`, "i") },
        });
        if (existingPermission.length > 0) {
          sendResponse(
            res,
            400,
            false,
            {},
            "Permission already exist with title"
          );
        } else {
          const addPermission = await Permission.create({
            title: title,
          });
          if (addPermission) {
            sendResponse(
              res,
              200,
              true,
              addPermission,
              "Permission added successfully"
            );
          } else {
            sendResponse(res, 400, false, {}, "Permission not added");
          }
        }
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.deletePermission = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      await Permission.findByIdAndUpdate(id, { deleted: true }).then((data) => {
        if (data) {
          sendResponse(res, 200, true, {}, "Permission deleted successfully");
        } else {
          sendResponse(res, 400, false, {}, "Permission not deleted");
        }
      });
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.getPermission = async (req, res) => {
  if (req.user && !req.error) {
    try {
      await Permission.find(
        { status: true, deleted: false },
        { deleted: 0 }
      ).then((data) => {
        if (data) {
          sendResponse(res, 200, true, data, "Permission list");
        } else {
          sendResponse(res, 400, false, [], "Permission not found");
        }
      });
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.getOnePermission = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      await Permission.findById(id).then((data) => {
        if (data) {
          sendResponse(res, 200, true, data, "Permission list");
        } else {
          sendResponse(res, 400, false, [], "Permission not found");
        }
      });
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};
