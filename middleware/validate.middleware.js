const { sendResponse } = require("../helper/response");

const validate = (schema) => async (req, res, next) => {
  try {
    const parseBody = await schema.parseAsync(req.body);
    req.body = parseBody;
    next();
  } catch (err) {
    const status = 422;
    const message = "Fill the input properly";
    const extraDetails = err.errors[0].message;

    const error = {
      status,
      extraDetails,
      message,
    };

    sendResponse(res, status, false, extraDetails, message);
    // console.log(error);
    next(error);
  }
};

const authPermissions = function (resource) {
  return async (req, res, next) => {
    try {
      const { permissions, group } = req[AUTH_USER_DETAILS];

      if (
        permissions.some((e) => resource.includes(e.name)) ||
        group == "admin"
      ) {
        return next();
      } else {
        const responsePayload = {
          message: null,
          status: RESPONSE_PAYLOAD_STATUS_ERROR,
          data: null,
          error: RESPONSE_STATUS_MESSAGE_PERMISSION_AUTHORIZATION_ERROR,
        };
        return res
          .status(RESPONSE_STATUS_CODE_PERMISSION_AUTHORIZATION_ERROR)
          .json(responsePayload);
      }
    } catch (error) {
      const responsePayload = {
        status: RESPONSE_PAYLOAD_STATUS_ERROR,
        message: null,
        data: null,
        error: RESPONSE_STATUS_MESSAGE_PERMISSION_AUTHORIZATION_ERROR,
      };
      return res
        .status(RESPONSE_STATUS_CODE_PERMISSION_AUTHORIZATION_ERROR)
        .json(responsePayload);
    }
  };
};

module.exports = { validate, authPermissions };
