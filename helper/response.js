const { response } = require("express")
const { log } = require("util")

module.exports.sendResponse = async (res,statuscode,success,data,message) => {
   return res.status(statuscode).send({
        success:success,
        data:data,
        message:message
   })
 }