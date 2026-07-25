const { sendResponse } = require("../helper/response");
const UserPermission = require("../models/user_permission.model");

exports.manageUserPermission = async (req, res) => {
  const { user_id, permission_id } = req.body;
  //   if (req.user) {
  if (user_id && permission_id) {
    const existData = await UserPermission.findOne({
      user_id,
      deleted: false,
    });
    if (existData) {
      const updateData = await UserPermission.findOneAndUpdate(
        { user_id },
        { permission_id },
        { new: true }
      );
      if (updateData) {
        sendResponse(
          res,
          200,
          true,
          addTransaction,
          `User permission update successfully`
        );
      } else {
        sendResponse(res, 400, false, {}, `User permission not updated`);
      }
    } else {
      const addUserPerm = await UserPermission.create({
        user_id,
        permission_id,
      });
      if (addUserPerm) {
        sendResponse(
          res,
          200,
          true,
          addUserPerm,
          `User permission added successfully`
        );
      } else {
        sendResponse(res, 400, false, {}, `User permission not added`);
      }
    }
  } else {
    sendResponse(res, 400, false, {}, "Missing parameters");
  }
  //   } else {
  // sendResponse(res, 401, false, {}, "Unauthorized");
  //   }
};

exports.deleteUserPermission = async (req, res) => {
  const { id } = req.body;
  //   if (req.user && !req.error) {
  try {
    await UserPermission.findByIdAndUpdate(id, { deleted: true }).then(
      (data) => {
        if (data) {
          sendResponse(
            res,
            200,
            true,
            {},
            "User Permission deleted successfully"
          );
        } else {
          sendResponse(res, 400, false, {}, "User permission not deleted");
        }
      }
    );
  } catch (error) {
    sendResponse(res, 500, false, {}, "Something went wrong");
  }
  //   } else {
  // sendResponse(res, 401, false, {}, "Unauthorized");
  //   }
};

exports.getAllUserPermission = async (req, res) => {
  // if (req.user && !req.error) {
  try {
    const getData = await UserPermission.aggregate({
        
    })
    // await UserPermission.find(
    //   { status: true, deleted: false },
    //   { deleted: 0 }
    // ).then((data) => {
    //   if (data) {
    //     sendResponse(res, 200, true, data, "User permission list");
    //   } else {
    //     sendResponse(res, 400, false, [], "User permission not found");
    //   }
    // });
  } catch (error) {
    sendResponse(res, 500, false, {}, "Something went wrong");
  }
  // } else {
  //   sendResponse(res, 401, false, {}, "Unauthorized");
  // }
};
