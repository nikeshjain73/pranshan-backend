const jwt = require("jsonwebtoken");
const multer = require("multer");
const md5 = require("md5");
const path = require("path");
const Admin = require("../models/admin.model");
const SuperAdmin = require("../models/super_admin.model");
const User = require("../models/users.model");
const Party = require("../models/store/party.model");
const TestOffer = require('../models/erp/Testing/test_offer_model');
const NDTMaster = require('../models/erp/NDT/ndt_master.model');
const NDTOffer = require('../models/erp/Multi/multi_ndt_offer.model');
const MultiNDTMaster = require('../models/erp/Multi/multi_ndt_detail.model');
const NDTTypewiseOfferTable = require('../models/erp/Multi/offer_table_data/ndt_typewise_offer_table.model');
const ndtType = require('../models/erp/NDT/ndt.model');
const drawGridItems = require("../models/erp/planner/draw_grid_items.model");
const Otps = require("../models/otp.model");
const sgMail = require("@sendgrid/mail");
const sharp = require("sharp");
const fs = require("fs");
const Itemstock = require("../models/main-store/transaction/itemstock.model");
const Tag = require("../models/main-store/general/tag.model");
const { default: mongoose } = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const XLSX = require('xlsx');
const XLSXStyle = require('xlsx-style');
const { TitleFormat, NDTStatus } = require('../utils/enum');
const Transaction = require("../models/main-store/transaction/transaction.model");
const { sendResponse } = require("../helper/response");
const { compressImage } = require("./compressor");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

module.exports.userTokenValidator = async (req, res, next) => {
  try {
    const token = req.header("authorization").split(" ")[1];
    // console.log(token);
    const data = jwt.verify(token, process.env.SECRET_KEY_JWT);
    let userData = data;

    if (userData) {
      await User.findById(userData.id)
        .then((user) => {
          if (user.status === false) {
            return res
              .status(403)
              .send({ error: { message: "Your account has been blocked." } });
          } else if (user.deleted === true) {
            return res
              .status(403)
              .send({ error: { message: "Your account has been deleted." } });
          } else {
            req.user = userData;
            next();
          }
        })
        .catch((err) => {
          throw err;
        });
    } else throw "err";
  } catch (err) {
    req.error = "error";
    next();
  }
};

module.exports.adminTokenValidator = async (req, res, next) => {
  try {
    const token = req.header("authorization").split(" ")[1];
    // console.log(token);
    let data = jwt.verify(token, process.env.SECRET_KEY_JWT);
    let adminData = data;
    if (adminData) {
      // console.log(adminData);
      await Admin.findById(adminData.admin.id)
        .then((user) => {
          // console.log(user);
          if (user) {
            // console.log(data);
            req.user = data;
            next();
          } else {
            throw "err";
          }
        })
        .catch((err) => {
          throw err;
        });
    } else throw "err";
  } catch (err) {
    req.error = "error";
    next();
  }
};

module.exports.superAdminTokenValidator = async (req, res, next) => {
  try {
    const token = req.header("authorization").split(" ")[1];
    let data = jwt.verify(token, process.env.SECRET_KEY_JWT);
    let superAdminData = data;
    if (superAdminData) {
      await SuperAdmin.findById(superAdminData.super_admin.id)
        .then((user) => {
          if (user.status === false) {
            return res
              .status(403)
              .send({ error: { message: "Your account has been blocked." } });
          } else if (user.deleted === true) {
            return res
              .status(403)
              .send({ error: { message: "Your account has been deleted." } });
          } else {
            req.user = data;
            next();
          }
        })
        .catch((err) => {
          throw err;
        });
    } else throw "err";
  } catch (err) {
    req.error = "error";
    next();
  }
};


// module.exports.partyLoginValidator = async (req, res, next) => {
//   const { email, password } = req.body;

//   if (!email || !password) {
//     return sendResponse(res, 400, false, {}, "Missing parameters");
//   }

//   try {
//     const party = await Party.findOne({
//       email: email.trim().toLowerCase(),
//     })
//       .populate({
//         path: "project",
//         select: "name firm_id year_id",
//         populate: [
//           { path: "firm_id", select: "name" },
//           { path: "year_id", select: "start_year end_year" },
//         ],
//       })
//       .populate("partyGroup", "name")
//       .populate("party_tag_id", "name");

//     if (!party) {
//       return sendResponse(res, 400, false, {}, "Email not registered");
//     }

//     const encryptedPassword = md5(password);

//     if (encryptedPassword !== party.password) {
//       return sendResponse(res, 400, false, {}, "Invalid credentials");
//     }

//     if (party.status === false) {
//       return sendResponse(res, 403, false, {}, "Party is blocked");
//     }

//     if (party.deleted === true) {
//       return sendResponse(res, 403, false, {}, "Party account has been deleted");
//     }

//     // Add party data to req for next middleware/controller
//     req.party = party;

//     // Optionally, generate a JWT token for session
//     req.token = jwt.sign(
//       {
//         id: party._id,
//         email: party.email,
//       },
//       process.env.SECRET_KEY_JWT
//     );

//     next();
//   } catch (error) {
//     console.error(error);
//     return sendResponse(res, 500, false, {}, "Something went wrong");
//   }
// };

module.exports.partyTokenValidator = async (req, res, next) => {
  try {
    const token = req.header("authorization").split(" ")[1];
    // console.log(token);
    const data = jwt.verify(token, process.env.SECRET_KEY_JWT);
    let userData = data;

    if (userData) {
      await User.findById(userData.id)
        .then((user) => {
          if (user.status === false) {
            return res
              .status(403)
              .send({ error: { message: "Your account has been blocked." } });
          } else if (user.deleted === true) {
            return res
              .status(403)
              .send({ error: { message: "Your account has been deleted." } });
          } else {
            req.user = userData;
            next();
          }
        })
        .catch((err) => {
          throw err;
        });
    } else throw "err";
  } catch (err) {
    req.error = "error";
    next();
  }
};



module.exports.sendMail = async (subject, email, html) => {
  let msg = {
    to: email,
    from: {
      name: "Anant Patel",
      email: "apaddonwebtech@gmail.com",
    },
    subject,
    html,
    text: html.replace(/<[^>]+>/g, ""),
  };
  const response = await sgMail
    .send(msg)
    .then((response) => {
      if (response[0].statusCode === 202) {
        return true;
      }
    })
    .catch((error) => {
      // console.log(error);
      return false;
    });
  // console.log(response);
  return response;
};

// ================image uploading code

const ensureUploadsDirectory = () => {
  const uploadDir = "./uploads";
  const pdfDir = "./pdfs";
  const excelDir = "./xlsx-formats";
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir);
  }
  if (!fs.existsSync(excelDir)) {
    fs.mkdirSync(excelDir);
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    ensureUploadsDirectory();
    // cb(null, './uploads');
    if (file.mimetype === "application/pdf") {
      cb(null, "./pdfs");
    } else if (
      file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel"
    ) {
      cb(null, "./xlsx-formats");
    } else {
      cb(null, "./uploads");
    }
  },
  // filename: function (req, file, cb) {
  //   cb(null, md5(Date.now()) + path.extname(file.originalname));
  // },
  filename: function (req, file, cb) {
    if (
      file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel"
    ) {
      cb(null, file.originalname);
    } else {
      cb(null, md5(Date.now()) + path.extname(file.originalname));
    }
  },
});

const checkFileType = (file, cb) => {
  const filetypes = /xls|xlsx/;
  const mimeTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ];
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = mimeTypes.includes(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb("Excel files only! (xlsx,xls)");
  }
};

const uploadExcelFile = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
}).single("file");

const fileFilter = function (req, file, cb) {
  if (
    file.mimetype === "application/pdf" ||
    file.mimetype.startsWith("image/")
  ) {
    cb(null, true);
  } else {
    return cb(new Error("Only image and PDF files are allowed"));
  }
};

const singleUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
}).single("image");

const multipleUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
}).array("images");

module.exports.uploadFile = async (req, res) => {
  singleUpload(req, res, async function (err) {
    if (err) {
      return sendResponse(res, 400, false, {}, `Not uploaded: ${err.message}`);
    }
    if (!req.file) {
      return sendResponse(res, 400, false, {}, "Select Image");
    } else {
      if (req.file.mimetype === "application/pdf") {
        const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        const pdfUrl = `${protocol}://${req.get("host")}/pdfs/${req.file.filename}`;
        sendResponse(
          res,
          200,
          true,
          { pdf: pdfUrl },
          "PDF uploaded successfully"
        );
      } else if (req.file.mimetype.startsWith("image/")) {
        const compressedFileName = await compressImage(req.file.path);
        await fs.promises.unlink(req.file.path);
        const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        const imageUrl = `${protocol}://${req.get(
          "host"
        )}/uploads/${compressedFileName}`;
        sendResponse(
          res,
          200,
          true,
          { image: imageUrl },
          "Image uploaded successfully"
        );
      }
    }
  });
};

module.exports.uploadMutipleFiles = async (req, res) => {
  multipleUpload(req, res, async function (err) {
    if (!req.files || req.files.length === 0) {
      sendResponse(res, 400, false, [], "Select image");
    } else if (err) {
      sendResponse(res, 400, false, [], `Not uploaded: ${err.message}`);
    } else {
      const imageObjects = await Promise.all(
        req.files.map(async (file) => {
          if (file.mimetype === "application/pdf") {
            const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
            const pdfUrl = `${protocol}://${req.get("host")}/pdfs/${file.filename
              }`;
            return { pdf: pdfUrl };
          } else if (file.mimetype.startsWith("image/")) {
            try {
              let compressedFileName = await compressImage(file.path);
              await fs.promises.unlink(file.path);
              const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
              return {
                image: `${protocol}://${req.get("host")}/uploads/${compressedFileName}`,
              };
            } catch (error) {
              console.error("Error occurred during image compression:", error);
              throw error;
            }
          }
        })
      );
      sendResponse(res, 200, true, imageObjects, "Images uploaded successfully");
    }
  });
};

module.exports.uploadExcelFiles = async (req, res) => {
  uploadExcelFile(req, res, async function (err) {
    if (err) {
      sendResponse(res, 500, false, {}, err);
      return;
    }
    if (!req.file) {
      sendResponse(res, 400, false, {}, "Please send a file");
      return;
    }
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const excelUrl = `${protocol}://${req.get("host")}/xlsx-formats/${req.file.originalname}`;
    sendResponse(res, 200, true, { excel: excelUrl }, "File uploaded successfully");
  });
};

// =========================================================================================

module.exports.generateOtp = async (email) => {
  const value = Math.floor(1000 + Math.random() * 9000);
  // console.log(value);
  var expire = Date.now() + 60000;
  await Otps.findOne({
    email: email,
  }).then(async (result) => {
    if (result === null) {
      const otps = new Otps({
        email: email,
        otp: value,
        expire_time: expire,
      });
      await otps.save(otps);
    } else {
      await Otps.findByIdAndUpdate(result.id, {
        otp: value,
        expire_time: expire,
      });
    }
  });
  return value;
};

// module.exports.convertFix = async (val, fixDigit = 2) => {
//   const parseType = parseFloat(val.toFixed(fixDigit))
//   return parseType; // return object check the value
// }

function convertToFixedDecimal(value, digits = 2) {
  return typeof value === "number" && parseFloat(value.toFixed(digits));
}

module.exports.downloadFormat = async (req, res, fileName) => {
  if (req.user && !req.error) {
    try {
      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const downloadUrl = `${protocol}://${req.get("host")}/xlsx-formats/${fileName}`;
      sendResponse(res, 200, true, { file: downloadUrl }, `${fileName.split(".")[0]} file downloaded successfully`);
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};


module.exports.generateExcel = async (req, res, responseObj) => {
  const wb = XLSX.utils.book_new();
  let ws
  const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: "FFFF00" } } };

  const ws_data = [[
    { v: `Item Data Import Report`, s: headerStyle },
    { v: "SR_NO", s: headerStyle },
    { v: "ITEM_GROUP", s: headerStyle },
    { v: "ITEM_NAME", s: headerStyle },
    { v: "UOM", s: headerStyle },
    { v: "MATERIAL_CODE", s: headerStyle },
    { v: "LOCATION", s: headerStyle },
    { v: "HSN_CODE", s: headerStyle },
    { v: "GST", s: headerStyle },
    { v: "MATERIAL_GRADE", s: headerStyle },
    { v: "RE_ORDER_QTY", s: headerStyle },
    { v: "CATEGORY", s: headerStyle },
    { v: "REASON", s: headerStyle },
  ]];


  ws_data.push([]);

  for (const [sheetName, data] of Object.entries(responseObj)) {
    ws_data.push([{ v: `${sheetName} (${data.length})`, s: headerStyle }]);

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const row = [
        "",
        item.SR_NO,
        item.ITEM_GROUP,
        item.ITEM_NAME,
        item.UOM,
        item.MATERIAL_CODE,
        item.LOCATION,
        item.HSN_CODE,
        item.GST,
        item.MATERIAL_GRADE,
        item.RE_ORDER_QTY,
        item.CATEGORY,
        item.reason,
      ];
      ws_data.push(row);
    }
    ws_data.push([]);
    ws_data.push([]);
  }

  ws = XLSX.utils.aoa_to_sheet(ws_data);

  ws['!cols'] = [{ wch: 25 }, { wch: 7 }, { wch: 18 }, { wch: 35 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 7 }, { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 30 }];

  XLSX.utils.book_append_sheet(wb, ws, `Item Data import`);

  const xlsxPath = path.join(__dirname, '../xlsx');
  console.log("xlsxPath", xlsxPath);

  if (!fs.existsSync(xlsxPath)) {
    fs.mkdirSync(xlsxPath, { recursive: true });
  }
  const filename = `itemdata_import_report_${Date.now()}.xlsx`;
  const filePath = path.join(xlsxPath, filename);
  await XLSXStyle.writeFile(wb, filePath);


  const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;
  return fileUrl;
}

module.exports.padWithLeadingZeros = (num, totalLength) => {
  return String(num).padStart(totalLength, "0");
};

// Main store item managment
// module.exports.manageMSitemStock = async (item_id, trans_id, tag_id, unit, in_out) => {
//   const existItem = await Itemstock.findOne({ item_id, transaction_id: new ObjectId(trans_id) });

//   if (existItem) {
//     if (in_out) {
//       await Itemstock.findOneAndUpdate(
//         { item_id, transaction_id: trans_id },
//         { $inc: { in: unit } },
//         { new: true }
//       );
//     } else {
//       await Itemstock.findOneAndUpdate(
//         { item_id, transaction_id: trans_id },
//         { $inc: { out: unit } },
//         { new: true }
//       );
//     }
//   } else {
//     if (in_out) {
//       await Itemstock.create({ item_id, transaction_id: trans_id, tag_id, in: unit });
//     } else {
//       await Itemstock.create({ item_id, transaction_id: trans_id, tag_id, out: unit });
//     }
//   }
// };



module.exports.manageMSitemStock = async (item_id, trans_id, tag_id, unit, in_out, year_id) => {
  try {
    const existItem = await Itemstock.findOne({ item_id, transaction_id: new ObjectId(trans_id) });

    if (existItem) {
      if (in_out) {
        await Itemstock.findOneAndUpdate(
          { item_id, transaction_id: trans_id },
          { $inc: { in: unit } },
          { new: true }
        );
      } else {
        await Itemstock.findOneAndUpdate(
          { item_id, transaction_id: trans_id },
          { $inc: { out: unit } },
          { new: true }
        );
      }
    } else {
      const createPayload = {
        item_id,
        transaction_id: trans_id,
        tag_id,
        year_id, // ✅ this was missing
        in: in_out ? unit : 0,
        out: in_out ? 0 : unit,
      };

      await Itemstock.create(createPayload);
    }
  } catch (error) {
    console.error("❌ manageMSitemStock error:", error);
  }
};


module.exports.manageMSitemStockUpdate = async (item_id, trans_id, unit, in_out) => {
  const existItem = await Itemstock.findOne({ item_id, transaction_id: trans_id });

  if (existItem) {
    if (in_out) {
      await Itemstock.findOneAndUpdate(
        { item_id, transaction_id: trans_id },
        { $inc: { in: unit } },
        { new: true }
      );
    } else {
      await Itemstock.findOneAndUpdate(
        { item_id, transaction_id: trans_id },
        { $inc: { out: unit } },
        { new: true }
      );
    }
  } else {
    if (in_out) {
      console.log("This is creiticl errorrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr")
      await Itemstock.create({ item_id, transaction_id: trans_id, tag_id, in: unit });
    } else {
      console.log("This is creiticl errorrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr")
      await Itemstock.create({ item_id, transaction_id: trans_id, tag_id, out: unit });
    }
  }
};

module.exports.tagNumber = async (tag_id) => {
  const tagData = await Tag.findById(tag_id);
  if (tagData) {
    return tagData.tag_number;
  } else {
    return false;
  }
};
module.exports.tagId = async (tag_number) => {
  const tagData = await Tag.findOne({ tag_number, deleted: false });
  if (tagData) {
    return tagData._id;
  } else {
    return false;
  }
};

module.exports.VoucherGen = async () => {
  const getLastVoucher = await Transaction.find()
    .sort({ voucher_no: -1 })
    .limit(1);

  const padWithLeadingZeros = (num, totalLength) => {
    return String(num).padStart(totalLength, "0");
  };

  let voucher_no = getLastVoucher[0]?.voucher_no.replace(
    /(\d+)+/g,
    (match, number) => padWithLeadingZeros(parseInt(number) + 1, 6)
  );

  if (!voucher_no) {
    voucher_no = "100001";
  }

  return voucher_no;
};

module.exports.ChallanIssueGen = async (tag_id, customer_id) => {

  const getPrefixByCustomer = (customer_id) => {
    const cid = String(customer_id);


    if (cid === "665acc314d06f8405870c8f6") {
      return "VEPL";
    } else if (cid === "65e1be08ff70846aacc8846c" || cid === "66716cefef29e6264d3fd0de") {
      return "VE";
    }
    return "GEN";
  };

  const firmPrefix = getPrefixByCustomer(customer_id);


  const getLastChallan = await Transaction.find({
    tag_id: tag_id,
    isexternal: true,
    challan_no: { $regex: `^${firmPrefix}/` },
  })
    .sort({ challan_no: -1 })
    .limit(1);
  console.log("Last no ", getLastChallan)


  const getFinancialYear = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const startYear = month >= 4 ? year : year - 1;
    const endYear = startYear + 1;
    return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
  };

  const finYear = getFinancialYear();


  const padWithLeadingZeros = (num, totalLength) => {
    return String(num).padStart(totalLength, "0");
  };

  let challan_no;

  if (getLastChallan.length > 0 && getLastChallan[0]?.challan_no) {
    const lastChallan = getLastChallan[0].challan_no;
    const lastNumber = parseInt(lastChallan.split("/")[2], 10) || 0;
    const newNumber = padWithLeadingZeros(lastNumber + 1, 3);
    challan_no = `${firmPrefix}/${finYear}/${newNumber}`;
  } else {
    challan_no = `${firmPrefix}/${finYear}/001`;
  }


  return challan_no;
};


module.exports.manageTransactionItemStatus = async (item_details) => {
  const validItems = item_details.filter(
    (item) => item.from_id && item.detail_id
  );
  for (const item of validItems) {
    const { from_id, detail_id } = item;
    await Transaction.updateOne(
      { _id: from_id, "items_details._id": detail_id },
      { $set: { "items_details.$.status": false } }
    );
  }
};

module.exports.manageTransactionStatus = async (item_details) => {
  const validItems = item_details.filter(
    (item) => item.from_id
  );
  for (const item of validItems) {
    const { from_id } = item;
    await Transaction.updateOne(
      { _id: from_id, },
      { status: 4 },
      { new: true }
    );
  }
};

module.exports.manageMainObjBalanceQty = async (item_details, adddelete) => {
  const validItems = item_details.filter(
    (item) => item.from_id && item.detail_id
  );

  for (const item of validItems) {
    const { from_id, detail_id, quantity } = item;
    const mainObj = await Transaction.findOne(
      { _id: from_id, "items_details._id": detail_id },
      { "items_details.$": 1 }
    );
    if (!mainObj || !mainObj.items_details || mainObj.items_details.length === 0) {
      continue;
    }
    const matchedItem = mainObj.items_details[0];
    const newBalanceQty = adddelete
      ? (matchedItem.balance_qty || 0) - quantity
      : (matchedItem.balance_qty || 0) + quantity;

    await Transaction.updateOne(
      { _id: from_id, "items_details._id": detail_id },
      { $set: { "items_details.$.balance_qty": newBalanceQty } }
    );
  }
};

module.exports.tableName = async (tag_number) => {
  if (tag_number == 11) {
    return "Purchase";
  } else if (tag_number == 12) {
    return "Purchase return";
  } else if (tag_number == 13) {
    return "Issue";
  } else if (tag_number == 14) {
    return "Issue return";
  } else {
    return "Transaction";
  }
};

module.exports.generatetwoRows = async (worksheet, startRow, endRow, data, size, alignment, rowSize, bold) => {
  let currentRow = startRow;

  for (let key in data) {
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    const mergedCell = worksheet.getCell(`A${currentRow}`);
    mergedCell.value = key;
    mergedCell.alignment = { horizontal: alignment, vertical: 'middle' };
    mergedCell.font = { size: size, bold: bold };
    mergedCell.border = {
      top: { style: 'thick' },
      left: { style: 'thick' },
      bottom: { style: 'thick' },
      right: { style: 'thick' }
    };
    mergedCell.protection = { locked: false };
    mergedCell.alignment.wrapText = true;

    worksheet.mergeCells(`C${currentRow}:G${currentRow}`);
    const mergedContentCell = worksheet.getCell(`C${currentRow}`);
    mergedContentCell.value = data[key];
    mergedContentCell.alignment = { horizontal: alignment, vertical: 'middle' };
    mergedContentCell.protection = { locked: false };
    mergedContentCell.font = { size: size, bold: bold };
    mergedContentCell.border = {
      top: { style: 'thick' },
      left: { style: 'thick' },
      bottom: { style: 'thick' },
      right: { style: 'thick' }
    };
    mergedContentCell.alignment.wrapText = true;

    worksheet.getRow(currentRow).height = rowSize;

    currentRow++;
  }
}
module.exports.generateoneRows = async (worksheet, startRow, endRow, data, size, alignment, rowSize, bold) => {
  let currentRow = startRow;

  for (let key in data) {
    worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
    const mergedCell = worksheet.getCell(`A${currentRow}`);
    mergedCell.value = data[key];
    mergedCell.alignment = { horizontal: alignment, vertical: 'middle' };
    mergedCell.font = { size: size, bold: bold };
    mergedCell.border = {
      top: { style: 'thick' },
      left: { style: 'thick' },
      bottom: { style: 'thick' },
      right: { style: 'thick' }
    };
    mergedCell.protection = { locked: false };
    mergedCell.alignment.wrapText = true;

    worksheet.getRow(currentRow).height = rowSize;

    currentRow++;
  }
}

module.exports.amountInWords = async (amount) => {
  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "Ten", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertDoubleDigits(n) {
    if (n < 10) return units[n];
    if (n >= 11 && n <= 19) return teens[n - 10];
    return tens[Math.floor(n / 10)] + (n % 10 ? " " + units[n % 10] : "");
  }

  function convertHundreds(n) {
    if (n > 99) {
      return units[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + convertDoubleDigits(n % 100) : "");
    } else {
      return convertDoubleDigits(n);
    }
  }

  function convertToWords(n) {
    let parts = [];
    if (n >= 10000000) {
      parts.push(convertHundreds(Math.floor(n / 10000000)) + " Crore");
      n = n % 10000000;
    }
    if (n >= 100000) {
      parts.push(convertHundreds(Math.floor(n / 100000)) + " Lakh");
      n = n % 100000;
    }
    if (n >= 1000) {
      parts.push(convertHundreds(Math.floor(n / 1000)) + " Thousand");
      n = n % 1000;
    }
    if (n > 0) {
      parts.push(convertHundreds(n));
    }
    return parts.join(" ");
  }

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  let rupeesInWords = convertToWords(rupees);
  let paiseInWords = paise > 0 ? convertDoubleDigits(paise) + " paise" : '';

  let result = `${rupeesInWords.trim()} rupees`;
  if (paiseInWords) {
    result += ` and ${paiseInWords}`;
  }

  return result + " Only";
}

module.exports.updateNdtStatus = async (ndt_offer_no) => {
  try {
    const ndtMaster = await TestOffer.findById(ndt_offer_no);
    const allNdtOffers = await TestOffer.find({ ndt_master_id: ndtMaster?.ndt_master_id, deleted: false });
    const approvedNdtOffers = allNdtOffers.filter(offer => offer.status === 2);

    if (approvedNdtOffers.length === allNdtOffers.length) {
      let updatedNdtMaster = await NDTMaster.findOne({ _id: ndtMaster?.ndt_master_id });
      updatedNdtMaster.status = 2;
      updatedNdtMaster.save();
    }

  } catch (error) {
    console.log(error)
  }
}

// module.exports.updateMultiNdtStatus = async (ndt_offer_no) => {
//   try {
//     const ndtMaster = await NDTOffer.findById(ndt_offer_no);
//     console.log("ndtMaster?.ndt_master_ids :",ndtMaster?.ndt_master_ids);
//     const allNdtOffers = await NDTOffer.find({ $or:[
//         { ndt_master_id: { $in: ndtMaster?.ndt_master_ids }},
//         { ndt_master_ids: { $in: ndtMaster?.ndt_master_ids }}
//     ], deleted: false, status: { $nin: [NDTStatus.Rejected, NDTStatus.Partially,NDTStatus.Merged]}});
//     const approvedNdtOffers = allNdtOffers.filter(offer => (offer.status !== NDTStatus.Rejected && offer.status !== NDTStatus.Partially && offer.status !== NDTStatus.Merged  && offer.status === NDTStatus.Completed));
//     console.log("approvedNdtOffers.length :",approvedNdtOffers.length," allNdtOffers.length :",allNdtOffers.length);
//     if (approvedNdtOffers.length === allNdtOffers.length) {
//       await MultiNDTMaster.updateMany({ _id: { $in: ndtMaster?.ndt_master_ids } }, {
//          status: NDTStatus.Completed,
//       });
//     }

//   } catch (error) {
//     console.log(error)
//   }
// }

module.exports.updateMultiNdtStatus = async (ndt_offer_no) => {
  try {
    const ndtMaster = await NDTOffer.findById(ndt_offer_no);
    if (!ndtMaster || !ndtMaster.ndt_master_ids?.length) {
      console.log("No ndtMaster or ndt_master_ids found!");
      return;
    }

    console.log("ndtMaster?.ndt_master_ids :", ndtMaster?.ndt_master_ids);

    const allNdtOffers = await NDTOffer.find({
      $or: [
        { ndt_master_id: { $in: ndtMaster?.ndt_master_ids } },
        { ndt_master_ids: { $in: ndtMaster?.ndt_master_ids } }
      ],
      deleted: false,
      status: { $nin: [NDTStatus.Rejected, NDTStatus.Partially, NDTStatus.Merged, NDTStatus.Pending] }
    });

    const approvedNdtOffers = allNdtOffers.filter(offer => offer.status === NDTStatus.Completed);
    console.log("approvedNdtOffers.length :", approvedNdtOffers.length, " allNdtOffers.length :", allNdtOffers.length);

    if (approvedNdtOffers.length === allNdtOffers.length) {
      const ndtMasterRecords = await MultiNDTMaster.find({ _id: { $in: ndtMaster.ndt_master_ids } });

      const mastersToUpdate = ndtMasterRecords.filter(master => {
        // Collect only non-zero statuses
        const statuses = [master.ut_status, master.rt_status, master.mpt_status, master.lpt_status].filter(status => status !== 0);

        // Ensure all non-zero statuses are 3 (Completed)
        return statuses.length > 0 && statuses.every(status => status === 3);
      }).map(master => master._id);

      if (mastersToUpdate.length > 0) {
        await MultiNDTMaster.updateMany(
          { _id: { $in: mastersToUpdate } },
          { status: NDTStatus.Completed }
        );
        console.log("MultiNDTMaster status updated successfully for eligible records!");
      } else {
        console.log("No MultiNDTMaster records met the status conditions.");
      }
    }
  } catch (error) {
    console.log(error);
  }
};

module.exports.getMonthName = async (monthNumber) => {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return months[monthNumber - 1] || "Invalid month";
}

module.exports.sumSalariesByDate = async (projects) => {
  const salaryByDateSum = {};

  projects.forEach(project => {
    project.salary_by_date.forEach(salaryRecord => {
      const { date, total_salary } = salaryRecord;

      // If the date doesn't exist in the object, initialize it with 0
      if (!salaryByDateSum[date]) {
        salaryByDateSum[date] = 0;
      }

      // Add the total salary for that date
      salaryByDateSum[date] += total_salary;
    });
  });

  return salaryByDateSum;
}


module.exports.regenerateRejectedNDTOffer = async (items, type, offeredBy, ndt_offer, test_obj, pId) => {
  try {
    let grid_item_ids = items.map((data) => data.grid_item_id.toString());
    grid_item_ids = [...new Set(grid_item_ids)];
    items.forEach(async (i) => {
      const remainingItems = await drawGridItems.find({ _id: { $nin: grid_item_ids }, grid_id: { $in: i.grid_id }, drawing_id: { $in: i.drawing_id } });
      if (remainingItems) {
        const remainingItemIds = remainingItems.map((item) => item._id.toString());
        grid_item_ids = [...new Set([...grid_item_ids, ...remainingItemIds])];
      }
    });
    let new_items = [];
    let testElement = await ndtType.findOne({ name: type, project: new ObjectId(pId) });
    const ndt_type = testElement.name.toLowerCase();

    const ndt_typewise_data = await NDTTypewiseOfferTable.find({
      ndt_offer_id: ndt_offer._id,
    });
    let keyGridItemIds = [];
    test_obj.items.forEach((key) => {
      if (grid_item_ids.includes(key.grid_item_id.toString())) {
        if (new_items[key.ndt_master_id] == undefined) {
          new_items[key.ndt_master_id] = [];
        }
        new_items[key.ndt_master_id].push({
          "grid_item_id": key.grid_item_id,
          "drawing_id": key.drawing_id,
          "ndt_master_id": key.ndt_master_id,
          //  "offer_balance_qty": item.offer_balance_qty,
          "offer_used_grid_qty": key.offer_used_grid_qty,
          [ndt_type + "_use_qty"]: 0,
          "grid_use_qty": 0,
          "joint_type": key.joint_type,
          "wps_no": key.wps_no,
          "weldor_no": key.weldor_no,
          "thickness": key.thickness,
          "is_accepted": key.is_accepted,
          "is_cover": key.is_cover,
          "remarks": ""
        });
        keyGridItemIds.push(key.grid_item_id.toString());
      }
    });
    if (ndt_typewise_data) {
      ndt_typewise_data.forEach(async (i) => {
        const SelectedItem = i.items.filter(item =>
          keyGridItemIds.includes(item.grid_item_id.toString())
        );
        if (SelectedItem.length > 0) {
          SelectedItem.forEach(item => {
            item.deleted = true;
            item.offer_status = ndt_offer.status;
          });
        }
        await i.save();
      });
    }
    for (const [index, key] of Object.entries(new_items)) {
      await NDTOffer.create({
        ndt_type_id: testElement?._id,
        ndt_master_id: index,
        // ndt_master_ids: index,
        items: key,
        offered_by: offeredBy,
        status: NDTStatus.Pending,
        is_reoffer: true,
      }).then(async (data) => {
        await MultiNDTMaster.updateMany({ _id: { $in: data.ndt_master_id } }, {
          [type.toLowerCase() + "_status"]: NDTStatus.Pending,
        });
      });
    }

  } catch (error) {
    console.log(error)
  }
}