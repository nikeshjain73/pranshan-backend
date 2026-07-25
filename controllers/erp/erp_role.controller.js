const ErpRoles = require("../../models/erp/erp_role.model");
const { sendResponse } = require("../../helper/response");

exports.getErpRole = async (req, res) => {
  if (req.user && !req.error) {
    try {
      await ErpRoles.find({ status: true, deleted: false }, { deleted: 0 })
        .sort({ createdAt: 1 })
        .then((data) => {
          if (data) {
            sendResponse(res, 200, true, data, "Erp role list");
          } else {
            sendResponse(res, 200, false, {}, "Erp role not found");
          }
        });
    } catch (err) {
      console.error("GET ERP ROLE API: " + err);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorised");
  }
};

exports.getAdminErpRole = async (req, res) => {

    if (req.user && !req.error) {
        try {
            await ErpRoles.find({ deleted: false }, { deleted: 0 }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, data, "Erp role list");
                } else {
                    sendResponse(res, 400, false, {}, "Erp role not found");
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.manageErpRole = async (req, res) => {
  const { name, status, deleted, id } = req.body;
  if (req.user) {
    if (name) {
      const role = new ErpRoles({
        name: name,
      });

      if (!id) {
        try {
          await role.save().then((data) => {
            sendResponse(res, 200, true, {}, "Erp role added successfully");
          }).catch(error => {
            sendResponse(res, 200, false, {}, "Erp role already exists");
          })
        } catch (error) {
          sendResponse(res, 500, false, {}, "Something went wrong");
        }
      } else {
        await ErpRoles.findByIdAndUpdate(id, {
          name: name,
          deleted: deleted,
          status: status,
        }).then((data) => {
          if (data) {
            sendResponse(res, 200, true, {}, "Erp role updated successfully");
          } else {
            sendResponse(res, 200, true, {}, "Erp role not found");
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

exports.deleteErpRole = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error && id) {
    try {
      await ErpRoles.findByIdAndUpdate(id, { deleted: true }).then((data) => {
        if (data) {
          sendResponse(res, 200, true, {}, "Erp role deleted successfully");
        }
      });
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};