const UserRole = require("../models/user_role.model");

const { sendResponse } = require("../helper/response");

exports.getRole = async (req, res) => {
  if (req.user && !req.error) {
    try {
      await UserRole.find({ deleted: false, status: true }, { deleted: 0 }).then((data) => {
        if (data) {
          sendResponse(res, 200, true, data, "Role list");
        } else {
          sendResponse(res, 400, false, {}, "Role not found");
        }
      });
    } catch (err) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized")
  } 
};


exports.getAdminRole = async (req, res) => {
  if (req.user && !req.error) {
    try {
      await UserRole.find({ deleted: false }, { deleted: 0 }).then((data) => {
        if (data) {
          sendResponse(res, 200, true, data, "Role list");
        } else {
          sendResponse(res, 400, false, {}, "Role not found");
        }
      });
    } catch (err) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  }
};

exports.manageRole = async (req, res) => {
  const { name, status, id } = req.body;
  if (req.user) {
    if (name) {
      const role = new UserRole({
        name: name,
      });

      if (!id) {
        try {
          await role.save(role).then((data) => {
            sendResponse(res, 200, true, {}, "Role added successfully");
          }).catch(error => {
            sendResponse(res, 400, false, {}, "Role already exists");
          })
        } catch (error) {
          sendResponse(res, 500, false, {}, "Something went wrong");
        }
      } else {
        await UserRole.findByIdAndUpdate(id, {
          name: name,
          status: status,
        }).then((data) => {
          if (data) {
            sendResponse(res, 200, true, {}, "Role updated successfully");
          } else {
            sendResponse(res, 200, true, {}, "Role not found");
          }
        });
      }
    } else {
      sendResponse(res, 400, false, {}, "Missing parameters");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.deleteRole = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error && id) {
    try {
      await UserRole.findByIdAndUpdate(id, { deleted: true }).then((data) => {
        if (data) {
          sendResponse(res, 200, true, {}, "Role deleted successfully");
        }
      });
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};
