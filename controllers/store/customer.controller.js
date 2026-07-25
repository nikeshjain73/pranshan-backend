const Customer = require("../../models/store/customer.model");

const { sendResponse } = require("../../helper/response");

exports.getCustomers = async (req, res) => {
  if (req.user && !req.error) {
    try {
      await Customer.find({ status: true, deleted: false }, { deleted: 0 })
        .populate("firm_id", "name")
        .populate("year_id", "start_year end_year")
        .then((data) => {
          if (data.length > 0) {
            sendResponse(res, 200, true, data, "Customer list");
          } else {
            sendResponse(res, 400, false, {}, "Customer not found");
          }
        });
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.getAdminCustomers = async (req, res) => {
  if (req.user && !req.error) {
    try {
      await Customer.find({ deleted: false }, { deleted: 0 })
        .populate("firm_id", "name")
        .populate("year_id", "start_year end_year")
        .then((data) => {
          if (data) {
            sendResponse(res, 200, true, data, "Customers list");
          } else {
            sendResponse(res, 400, false, {}, "Customer not found");
          }
        });
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.manageCustomer = async (req, res) => {
  const {
    firm_id,
    year_id,
    name,
    address,
    stateName,
    pinCode,
    gstNumber,
    phone,
    status,
    id,
  } = req.body;
  if (req.user) {
    if (name) {
      const CustomerObject = new Customer({
        firm_id,
        year_id,
        name: name,
        address: address,
        phone: phone,
        stateName: stateName,
        pinCode: pinCode,
        gstNumber: gstNumber,
        status: status,
      });

      if (!id) {
        try {
          await CustomerObject.save()
            .then((data) => {
              sendResponse(res, 200, true, {}, "Customer added successfully");
            })
            .catch((error) => {
              sendResponse(
                res,
                400,
                false,
                {},
                "Customer already exists" + error
              );
            });
        } catch (error) {
          sendResponse(res, 500, false, {}, "Something went wrong");
        }
      } else {
        await Customer.findByIdAndUpdate(id, {
          firm_id,
          year_id,
          name: name,
          address: address,
          phone: phone,
          stateName: stateName,
          pinCode: pinCode,
          gstNumber: gstNumber,
          status: status,
        }).then((data) => {
          if (data) {
            sendResponse(res, 200, true, {}, "Customer updated successfully");
          } else {
            sendResponse(res, 200, true, {}, "Customer not found");
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

exports.deleteCustomer = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error && id) {
    try {
      await Customer.findByIdAndUpdate(id, { deleted: true }).then((data) => {
        if (data) {
          sendResponse(res, 200, true, {}, "Customer deleted successfully");
        }
      });
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};
