const Products = require("../models/product.model");
const { sendResponse } = require("../helper/response");

exports.getProduct = async (req, res) => {
  if (req.user && !req.error) {
    try {
      await Products.find({ status: true, deleted: false }, { deleted: 0 })
        .sort({ createdAt: 1 })
        .then((data) => {
          if (data) {
            sendResponse(res, 200, true, data, "Product list");
          } else {
            sendResponse(res, 200, false, {}, "Product not found");
          }
        });
    } catch (err) {
      console.error("GET Product API: " + err);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorised");
  }
};

exports.getAdminProduct = async (req, res) => {

    if (req.user && !req.error) {
        try {
            await Products.find({ deleted: false }, { deleted: 0 }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, data, "Product list");
                } else {
                    sendResponse(res, 400, false, {}, "Product not found");
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.manageProduct = async (req, res) => {
  const { name, status, deleted, id } = req.body;
  if (req.user) {
    if (name) {
      const role = new Products({
        name: name,
      });

      if (!id) {
        try {
          await role.save().then((data) => {
            sendResponse(res, 200, true, {}, "Product added successfully");
          }).catch(error => {
            sendResponse(res, 200, false, {}, "Product already exists");
          })
        } catch (error) {
          sendResponse(res, 500, false, {}, "Something went wrong");
        }
      } else {
        await Products.findByIdAndUpdate(id, {
          name: name,
          deleted: deleted,
          status: status,
        }).then((data) => {
          if (data) {
            sendResponse(res, 200, true, {}, "Product updated successfully");
          } else {
            sendResponse(res, 200, true, {}, "Product not found");
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

exports.deleteProduct = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error && id) {
    try {
      await Products.findByIdAndUpdate(id, { deleted: true }).then((data) => {
        if (data) {
          sendResponse(res, 200, true, {}, "Product deleted successfully");
        }
      });
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};