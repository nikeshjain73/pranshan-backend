const { downloadFormat, padWithLeadingZeros, generateExcel } = require("../../helper/index");
const {sendResponse} = require("../../helper/response");// ...existing code...
const { default: mongoose } = require("mongoose");
const ejs = require("ejs");
const fs = require("fs");
const path = require("path");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;
const puppeteer = require("puppeteer");
const ExcelJS = require("exceljs");
const axios = require("axios");
const Item = require("../../models/store/item.model");
const ObjectId = mongoose.Types.ObjectId;
const Project = require("../../models/project.model");
const Inquiry = require('../../models/material_procurement/inquiry.model');
const ProcurementRequest = require('../../models/material_procurement/procurementrequest.model');

// ====================== GET LAST INQUIRY NUMBER ======================
async function getLastInquiryNo(projectName) {
  try {
    const pipeline = [
      {
        $match: {
          InquiryNo: {
            $regex: `^VE/${projectName}/STR/INQ/\\d+`,
            $options: "i",
          },
        },
      },
      {
        $addFields: {
          inquiryNumber: {
            $toInt: { $arrayElemAt: [{ $split: ["$InquiryNo", "/"] }, -1] },
          },
        },
      },
      { $sort: { inquiryNumber: -1 } },
      { $limit: 1 },
      { $project: { InquiryNo: 1, inquiryNumber: 1 } },
    ];

    const [last] = await Inquiry.aggregate(pipeline);
    return last || null;
  } catch (error) {
    console.error("getLastInquiryNo error:", error);
    throw error;
  }
}

// ====================== GET NEXT INQUIRY NUMBER ======================
async function getNextInquiryNo(projectName) {
  const last = await getLastInquiryNo(projectName);
  let nextNo = "1";
  if (last && last.inquiryNumber) {
    nextNo = String(last.inquiryNumber + 1);
  }
  return `VE/${projectName}/STR/INQ/${nextNo}`;
}

// Sync PR balances when Inquiry is created/updated/deleted
async function syncPrBalances(items, mode = 'subtract') {
  const groupedByPr = items.reduce((acc, item) => {
    const prid = item.prid?._id || item.prid;
    if (!prid) return acc;
    if (!acc[prid]) acc[prid] = [];
    acc[prid].push(item);
    return acc;
  }, {});

  for (const prid in groupedByPr) {
    const pr = await ProcurementRequest.findById(prid);
    if (!pr) continue;

    for (const inqItem of groupedByPr[prid]) {
      const itemId = inqItem.item?._id || inqItem.item;
      const prItem = pr.items.find(it => it.item.toString() === itemId.toString());

      if (prItem) {
        let currentBalance = prItem.balance_qty || 0;
        if (mode === 'subtract') {
          prItem.balance_qty = Math.max(0, currentBalance - (inqItem.qty || 0));
        } else {
          prItem.balance_qty = currentBalance + (inqItem.qty || 0);
        }
        // Sync requiredSize
        if (inqItem.requiredSize) {
          prItem.sectionLengthOrDimensions = inqItem.requiredSize;
        }
      }
    }

    // Set inquiryGenerated status: true only if all items have 0 or less balance
    const allInquired = pr.items.every(it => (it.balance_qty || 0) <= 0);
    pr.inquiryGenrated = allInquired;

    await pr.save();
  }
}

// ====================== CREATE / UPDATE INQUIRY ======================
exports.manageInquiry = async (req, res) => {
  try {
    let {
      id,
      project,
      InquiryNo,
      revno,
      items,
      total_qty,
      terms_conditions, // renamed to otherTerms in model
      terms_and_conditions,
      remarks,
      purchase_order,
      createdby,
    } = req.body;

    console.log("req.body", req.body);
    if (!project || !items) {
      return sendResponse(res, 400, false, {}, "Missing required fields");
    }

    if (!mongoose.Types.ObjectId.isValid(project)) {
      return sendResponse(res, 400, false, {}, "Invalid Project ID");
    }

    const projectDoc = await Project.findById(project).select("name");
    if (!projectDoc) {
      return sendResponse(res, 404, false, {}, "Project not found");
    }

    // --- CREATE ---
    if (!id) {
      if (!InquiryNo) {
        InquiryNo = await getNextInquiryNo(projectDoc.name);
      }
      const date = new Date();

      const newInquiry = new Inquiry({
        project,
        InquiryNo,
        InquiryDate: date,
        revno: revno || 0,
        purchase_order,
        items: items.map((item) => ({
          prid: item.prid,
          item: item.item,
          requiredSize: item.requiredSize,
          qty: item.qty,
          manufacture: item.manufacture,
          remarks: item.remarks,
          balance_to_order: item.qty,
        })),
        total_qty,
        terms_and_conditions,
        otherTerms: terms_conditions,
        remarks: remarks,
        createdby,
      });

      const saved = await newInquiry.save();

      // Sync PR balances
      await syncPrBalances(items, 'subtract');

      return sendResponse(
        res,
        200,
        true,
        saved,
        "Inquiry created successfully"
      );
    }

    // --- UPDATE ---
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      const existing = await Inquiry.findById(id);
      if (!existing) {
        return sendResponse(res, 404, false, {}, "Inquiry not found");
      }

      // Revert old balances from PR
      await syncPrBalances(existing.items, 'add');

      existing.purchase_order = purchase_order || existing.purchase_order;
      existing.remarks = remarks || existing.remarks;
      existing.terms_and_conditions = terms_and_conditions || existing.terms_and_conditions;
      existing.otherTerms = terms_conditions || existing.otherTerms;
      existing.createdby = createdby || existing.createdby;
      existing.revno = (existing.revno || 0) + 1;

      existing.items = items.map((item) => ({
        prid: item.prid?._id || item.prid,
        item: item.item?._id || item.item,
        qty: item.qty,
        manufacture: item.manufacture,
        requiredSize: item.requiredSize,
        remarks: item.remarks,
        balance_to_order: item.qty,
      }));

      existing.total_qty = total_qty;

      const updated = await existing.save();

      // Deduct new balances from PR
      await syncPrBalances(items, 'subtract');

      return sendResponse(
        res,
        200,
        true,
        updated,
        "Inquiry updated successfully"
      );
    }

    return sendResponse(res, 400, false, {}, "Invalid Inquiry ID");
  } catch (error) {
    console.error("manageInquiry error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

// ====================== GET ALL INQUIRIES ======================
// exports.getAllInquiries = async (req, res) => {
//   try {
//     const { project, search, page , limit } = req.body;

//     const filter = {};
//     if (project && mongoose.Types.ObjectId.isValid(project))
//       filter.project = project;

//     let query = Inquiry.find(filter)
//       .populate("project", "name code")
//        .populate({
//         path: "items.item",
//         select: "name mcode material_grade unit",
//         populate: {
//           path: "unit",
//           select: "name", // ✅ This fetches the unit name
//         },
//       })
//       .populate("items.manufacture", "name ")
//       .populate("items.prid", "prNo")
//       .sort({ InquiryNo: -1 });

//       let pr = ProcurementRequest.find();


//     // --- SEARCH ---
//     if (search && search.trim() !== "") {
//       const regex = new RegExp(search, "i");
//       query = query.or([{ InquiryNo: regex }]);
//     }

//     const total = await Inquiry.countDocuments(filter);
//     const skip = (page - 1) * limit;
//     const data = await query.skip(skip).limit(parseInt(limit)).exec();

//     console.log("data", data);

//     return sendResponse(res, 200, true, { data, total }, "Inquiries fetched successfully");
//   } catch (error) {
//     console.error("getAllInquiries error:", error);
//     return sendResponse(res, 500, false, {}, "Something went wrong");
//   }
// };

  exports.getAllInquiries = async (req, res) => {
    try {
      const { project, search, page, limit } = req.body;

      const filter = {};
      if (project && mongoose.Types.ObjectId.isValid(project))
        filter.project = project;

      // Build the base query for inquiries
      let query = Inquiry.find(filter)
        .populate("project", "name code")
        .populate({
          path: "items.item",
          select: "name mcode material_grade unit",
          populate: {
            path: "unit",
            select: "name", // Fetch the unit name
          },
        })
        .populate("items.manufacture", "name ")
        .populate("terms_and_conditions", "description")
        .sort({ createdAt: -1 });

      // --- SEARCH ---
      if (search && search.trim() !== "") {
        const regex = new RegExp(search, "i");
        query = query.or([{ InquiryNo: regex }]);
      }

      const total = await Inquiry.countDocuments(filter);
      const skip = page && limit ? (page - 1) * limit : 0;

      // Execute the query and get the data
      let data = await query.skip(skip).limit(parseInt(limit) || 1000).lean();

      // Synchronize with frontend expectations
      data = data.map(inq => ({
        ...inq,
        terms_conditions: inq.otherTerms || []
      }));

      return sendResponse(res, 200, true, { data, total }, "Inquiries fetched successfully");
    } catch (error) {
      console.error("getAllInquiries error:", error);
      return sendResponse(res, 500, false, {}, "Something went wrong");
    }
  };


// ====================== GET PENDING INQUIRIES ======================
exports.getPendingInquiries = async (req, res) => {
  try {
    const { project, search } = req.body;

    // --- FILTER ---
    const filter = { genratePO: false, deleted: false };
    if (project && mongoose.Types.ObjectId.isValid(project)) {
      filter.project = project;
    }

    // --- BASE QUERY ---
    let query = Inquiry.find(filter)
      .populate("project", "name code")
      .populate({
        path: "items.item",
        select: "name mcode material_grade unit",
        populate: { path: "unit", select: "name" },
      })
      .populate("items.manufacture", "name")
      .sort({ InquiryNo: -1 });

    // --- SEARCH ---
    if (search && search.trim() !== "") {
      const regex = new RegExp(search, "i");
      query = query.or([{ InquiryNo: regex }]);
    }

    const data = await query.exec();
    const total = data.length;

    return sendResponse(res, 200, true, { data, total }, "Pending inquiries fetched successfully");
  } catch (error) {
    console.error("getPendingInquiries error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};


// ====================== GET INQUIRY BY ID ======================
// exports.getInquiryById = async (req, res) => {
//   try {
//     const id = req.query.id || req.body.id;
//     if (!id || !mongoose.Types.ObjectId.isValid(id)) {
//       return sendResponse(res, 400, false, {}, "Invalid Inquiry ID");
//     }

//     const data = await Inquiry.findById(id)
//       .populate("project", "name code")
//       .populate("items.item", "name mcode material_grade unit")
//       .populate("items.manufacture", "name email contact")
//       .populate("items.prid", "prNo");

//     if (!data) {
//       return sendResponse(res, 404, false, {}, "Inquiry not found");
//     }

//     return sendResponse(res, 200, true, data, "Inquiry fetched successfully");
//   } catch (error) {
//     console.error("getInquiryById error:", error);
//     return sendResponse(res, 500, false, {}, "Something went wrong");
//   }
// };

exports.getInquiryById = async (req, res) => {
  try {
    const id = req.query.id || req.body.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, 400, false, {}, "Invalid Inquiry ID");
    }

    // Fetch inquiry data and populate necessary fields
    const data = await Inquiry.findById(id)
      .populate("project", "name code")
      .populate({
        path: "items.item",
        select: "name mcode material_grade unit",
        populate: {
          path: "unit",
          select: "name", // Fetch the unit name
        },
      })
      .populate("items.manufacture", "name email contact") // Populate manufacture info
      .populate("items.prid", "prNo items") // Populate PR and its items
      .populate("terms_and_conditions", "description");

    if (!data) {
      return sendResponse(res, 404, false, {}, "Inquiry not found");
    }

    const result = data.toObject();
    // Synchronize for frontend
    result.terms_conditions = result.otherTerms || [];

    // Inject `prQty` and ensure requiredSize matches PR
    result.items.forEach(inqItem => {
      const pr = inqItem.prid; // The populated PR

      // If PR is populated and contains items
      if (pr && pr.items) {
        const itemObjId = inqItem.item?._id || inqItem.item;
        // Find the matched PR item based on the item ID
        const matchedPrItem = pr.items.find(prItem =>
          prItem.item?.toString() === itemObjId?.toString()
        );

        // If a matching PR item is found, inject its values
        if (matchedPrItem) {
          inqItem.requiredSize = matchedPrItem.sectionLengthOrDimensions;
          inqItem.prQty = matchedPrItem.prQty;
        }
      }
    });

    // Send the response with the inquiry data
    return sendResponse(res, 200, true, result, "Inquiry fetched successfully");
  } catch (error) {
    console.error("getInquiryById error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};


// ====================== DELETE INQUIRY ======================
exports.deleteInquiry = async (req, res) => {
  try {
    const id = req.query.id || req.body.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, 400, false, {}, "Invalid Inquiry ID");
    }

    const existing = await Inquiry.findById(id);
    if (!existing) {
      return sendResponse(res, 404, false, {}, "Inquiry not found");
    }

    // Revert balances in PR
    await syncPrBalances(existing.items, 'add');

    existing.deleted = true;
    existing.deletedAt = new Date();
    await existing.save();
    return sendResponse(res, 200, true, {}, "Inquiry deleted successfully");
  } catch (error) {
    console.error("deleteInquiry error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

// ====================== PDF DOWNLOAD ======================

exports.downloadInquiry = async (req, res) => {
  try {
    const { id } = req.body;

    // Auth check
    if (!req.user || req.error) {
      return sendResponse(res, 401, false, {}, "Unauthorized");
    }

    // Validate ObjectId
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, 400, false, {}, "Invalid Inquiry ID");
    }

    const inquiryObjectId = new mongoose.Types.ObjectId(id);

    // Fetch inquiry with populated references
    let inquiry = await Inquiry.findOne({ _id: inquiryObjectId, deleted: false })
      .populate({
        path: "project",
        select: "name code party",
        populate: {
          path: "party",
          select: "name address contact",
        },
      })
      .populate({
        path: "items.item",
        select: "name material_grade mcode unit",
        populate: {
          path: "unit",
          select: "name",
        },
      })
      .populate("items.manufacture", "name address contact")
      .populate({
        path: "items.prid",
        select: "prNo items.item items.prQty",
        populate: {
          path: "items.item",
          select: "name",
        },
      })
      .populate("terms_and_conditions", "description")
      .lean();

    if (!inquiry) {
      return sendResponse(res, 404, false, {}, "Inquiry not found");
    }

    // Map otherTerms to terms_conditions for the template
    inquiry.terms_conditions = inquiry.otherTerms || [];

    console.log("Inquiry for PDF:", inquiry.items[0]);

    // Render EJS HTML template
    const templatePath = path.join(
      __dirname,
      "../../templates/material_procurement/inquiry.html"
    );
    const template = fs.readFileSync(templatePath, "utf-8");

    const renderedHtml = ejs.render(template, {
      inquiry,
      logoUrl1: process.env.LOGO_URL_1 || "",
      logoUrl2: process.env.LOGO_URL_2 || "",
    });

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      ...(PATH && { executablePath: PATH }),
    });

    const page = await browser.newPage();
    await page.setContent(renderedHtml, { waitUntil: "networkidle0" });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      landscape: true,
      margin: { top: "20px", bottom: "20px", left: "10px", right: "10px" },
    });

    await browser.close();

    // Ensure /pdfs folder exists
    const pdfsDir = path.join(__dirname, "../../pdfs");
    if (!fs.existsSync(pdfsDir)) {
      fs.mkdirSync(pdfsDir, { recursive: true });
    }

    // Save file
    const filename = `Inquiry_${Date.now()}.pdf`;
    const filePath = path.join(pdfsDir, filename);
    fs.writeFileSync(filePath, pdfBuffer);

    const fileUrl = `${URI}/pdfs/${filename}`;

    return sendResponse(
      res,
      200,
      true,
      { file: fileUrl },
      "Inquiry PDF generated successfully"
    );
  } catch (error) {
    console.error("downloadInquiry error:", error);
    return sendResponse(
      res,
      500,
      false,
      {},
      "Something went wrong while generating PDF"
    );
  }
};


// ====================== UPDATE SEND PO STATUS ======================
exports.updateSendPOStatus = async (req, res) => {
  try {
    const { id, sendPO } = req.body;
    console.log("id, sendPO", req.body);

    // Validate Inquiry ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, 400, false, {}, "Invalid Inquiry ID");
    }

    // Update the sendPO status
    const updated = await Inquiry.findByIdAndUpdate(
      id,
      { sendPO: sendPO === true }, // ensure boolean
      { new: true }
    );

    if (!updated) {
      return sendResponse(res, 404, false, {}, "Inquiry not found");
    }

    return sendResponse(
      res,
      200,
      true,
      updated,
      "sendPO status updated successfully"
    );
  } catch (error) {
    console.error("updateSendPOStatus error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

// ====================== SEND MULTIPLE INQUIRIES ======================
exports.sendMultipleInquiries = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No Inquiry IDs provided" });
    }

    // Validate all IDs
    const invalidIds = ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ success: false, message: "One or more invalid Inquiry IDs" });
    }

    // Update sendPO in Inquiries
    const result = await Inquiry.updateMany(
      { _id: { $in: ids }, sendPO: false }, // only unsent inquiries
      { $set: { sendPO: true } }
    );

    return res.status(200).json({
      success: true,
      modifiedCount: result.modifiedCount,
      message: `${result.modifiedCount} Inquiry(ies) sent successfully`,
    });
  } catch (error) {
    console.error("sendMultipleInquiries error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};



//********************************Excel Download************************************  
// exports.downloadInquiryExcel = async (req, res) => {
//   try {
//     const { id } = req.body;

//     /* ================= AUTH ================= */
//     if (!req.user || req.error) {
//       return sendResponse(res, 401, false, {}, "Unauthorized");
//     }

//     if (!id || !mongoose.Types.ObjectId.isValid(id)) {
//       return sendResponse(res, 400, false, {}, "Invalid Inquiry ID");
//     }

//     /* ================= FETCH DATA ================= */

//     const inquiry = await Inquiry.findOne({ _id: id, deleted: false })
//       .populate({
//         path: "project",
//         select: "name code party",
//         populate: {
//           path: "party",
//           select: "name address contact",
//         },
//       })
//       .populate({
//         path: "items.item",
//         select: "name material_grade unit",
//         populate: {
//           path: "unit",
//           select: "name",
//         },
//       })
//       .populate("items.manufacture", "name") // ✅ MULTIPLE
//       .lean();

//     if (!inquiry) {
//       return sendResponse(res, 404, false, {}, "Inquiry not found");
//     }

//     /* ================= WORKBOOK ================= */

//     const workbook = new ExcelJS.Workbook();
//     const sheet = workbook.addWorksheet("Inquiry");

//     /* ================= HEADER ================= */

//     sheet.mergeCells("A1:M1");
//     sheet.getCell("A1").value =
//       "VISHAL ENTERPRISE & VRISHAL ENGINEERING PRIVATE LIMITED";
//     sheet.getCell("A1").font = { bold: true, size: 14 };
//     sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
//     // Outer border for merged cells A1:M1
//     const firstCell = sheet.getRow(1).getCell(1); // Column A
//     const lastCell = sheet.getRow().getCell(13); // Column M

//     firstCell.border = {
//       top: { style: "thick" },
//       left: { style: "thick" },
//       right: { style: "thick" }, // right side of first cell
//     };

//     lastCell.border = {
//       top: { style: "thin" },
//       right: { style: "thin" },
//       bottom: { style: "thin" },
//       left: { style: "thin" }, // left side of last cell
//     };

//     sheet.mergeCells("A2:M2");
//     sheet.getCell("A2").value = "GROUP OF COMPANIES";
//     sheet.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

//     sheet.mergeCells("A3:M3");
//     sheet.getCell("A3").value =
//       "INQUIRY FOR SUPPLY OF STRUCTURAL STEEL SECTIONS";
//     sheet.getCell("A3").font = { bold: true };
//     sheet.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };

//     sheet.addRow([]);

//     /* ================= DETAILS ================= */

//     sheet.addRow([
//       "Inquiry No", inquiry.InquiryNo || "--",
//       "Date", inquiry.InquiryDate
//         ? new Date(inquiry.InquiryDate).toLocaleDateString()
//         : "--",
//     ]);

//     sheet.addRow([
//       "Project", inquiry.project?.name || "--",
//       "Party", inquiry.project?.party?.name || "--",
//     ]);

//     sheet.addRow([]);

//     /* ================= TABLE HEADER ================= */

//     const headerRow = sheet.addRow([
//       "Sr No",
//       "Item Description",
//       "Material Grade",
//       "Required Size",
//       "Manufacturer(s)",
//       "UOM",
//       "Quantity",
//       "Rate",
//       "Amount",
//       "Delivery Days",
//       "Offer Size",
//       "Offer Make",
//       "Remarks",
//     ]);

//     headerRow.eachCell(cell => {
//       cell.font = { bold: true };
//       cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
//       cell.border = {
//         top: { style: "thin" },
//         bottom: { style: "thin" },
//         left: { style: "thin" },
//         right: { style: "thin" },
//       };
//       // Add fill color for header cells
//       cell.fill = {
//         type: "pattern",
//         pattern: "solid",
//         fgColor: { argb: "F6B26B" }, // soft orange color
//       };
//     });

//     /* ================= ITEMS ================= */

//     inquiry.items.forEach((item, index) => {
//       const manufacturers = item.manufacture?.length
//         ? item.manufacture.map(m => m.name).join(", ")
//         : "--";

//       const row = sheet.addRow([
//         index + 1,
//         item.item?.name || "--",
//         item.item?.material_grade || "--",
//         item.requiredSize || "--",
//         manufacturers, // ✅ MULTIPLE FIX
//         item.item?.unit?.name || "--",
//         item.qty || 0,
//         "",
//         "",
//         "",
//         "",
//         "",
//       ]);

//       row.eachCell(cell => {
//         cell.border = {
//           top: { style: "thin" },
//           bottom: { style: "thin" },
//           left: { style: "thin" },
//           right: { style: "thin" },
//         };
//         cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
//       });
//     });

//     /* ================= COLUMN WIDTH ================= */

//     sheet.columns = [
//       { width: 6 },
//       { width: 30 },
//       { width: 18 },
//       { width: 16 },
//       { width: 30 }, // Manufacturer column
//       { width: 10 },
//       { width: 14 },
//       { width: 16 },  // Rates (INR / Unit)
//       { width: 16 },  // Amount (INR)
//       { width: 14 },  // Delivery Days
//       { width: 14 },  // Offer Size
//       { width: 14 },  // Offer Make
//       { width: 20 },  
//     ];

//     // Specifically allow wrap text for Manufacturer column (5)
//     sheet.getColumn(5).alignment = { wrapText: true, vertical: "middle", horizontal: "center" };

//     /* ================= SAVE FILE ================= */

//     const excelDir = path.join(__dirname, "../../xlsx");
//     if (!fs.existsSync(excelDir)) {
//       fs.mkdirSync(excelDir, { recursive: true });
//     }

//     const filename = `Inquiry_${Date.now()}.xlsx`;
//     const filePath = path.join(excelDir, filename);

//     await workbook.xlsx.writeFile(filePath);

//     const fileUrl = `${process.env.PDF_URL}/excels/${filename}`;

//     return sendResponse(
//       res,
//       200,
//       true,
//       { file: fileUrl },
//       "Inquiry Excel generated successfully"
//     );

//   } catch (error) {
//     console.error("downloadInquiryExcel error:", error);
//     return sendResponse(
//       res,
//       500,
//       false,
//       {},
//       "Something went wrong while generating Inquiry Excel"
//     );
//   }
// };

// exports.downloadInquiryExcel = async (req, res) => {
//   try {
//     const { id } = req.body;

//     /* ================= AUTH ================= */
//     if (!req.user || req.error) {
//       return sendResponse(res, 401, false, {}, "Unauthorized");
//     }

//     if (!id || !mongoose.Types.ObjectId.isValid(id)) {
//       return sendResponse(res, 400, false, {}, "Invalid Inquiry ID");
//     }

//     /* ================= FETCH DATA ================= */

//     const inquiry = await Inquiry.findOne({ _id: id, deleted: false })
//       .populate({
//         path: "project",
//         select: "name code party",
//         populate: {
//           path: "party",
//           select: "name address contact",
//         },
//       })
//       .populate({
//         path: "items.item",
//         select: "name material_grade unit",
//         populate: {
//           path: "unit",
//           select: "name",
//         },
//       })
//       .populate("items.manufacture", "name")
//       .lean();

//     if (!inquiry) {
//       return sendResponse(res, 404, false, {}, "Inquiry not found");
//     }

//     const applyInternalBorder = (range) => {
//       const [start, end] = range.split(":");
//       const startCell = sheet.getCell(start);
//       const endCell = sheet.getCell(end);

//       for (let row = startCell.row; row <= endCell.row; row++) {
//         for (let col = startCell.col; col <= endCell.col; col++) {
//           const cell = sheet.getRow(row).getCell(col);

//           cell.border = {
//             top: { style: "thin" },
//             bottom: { style: "thin" },
//             left: { style: "thin" },
//             right: { style: "thin" },
//           };
//         }
//       }
//     };
//     /* ================= WORKBOOK ================= */

//     const workbook = new ExcelJS.Workbook();
//     const sheet = workbook.addWorksheet("Inquiry");

//     /* ================= HEADER ================= */

//     sheet.mergeCells("A1:M1");
//     sheet.getCell("A1").value =
//       "VISHAL ENTERPRISE & VRISHAL ENGINEERING PRIVATE LIMITED";
//     sheet.getCell("A1").font = { bold: true, size: 24 };
//     sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

//     sheet.mergeCells("A2:M2");
//     sheet.getCell("A2").value = "GROUP OF COMPANIES";
//     sheet.getCell("A2").font = { bold: true, size: 22 };
//     sheet.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

//     sheet.mergeCells("A3:M3");
//     sheet.getCell("A3").value =
//       "INQUIRY FOR SUPPLY OF STRUCTURAL STEEL SECTIONS";
//     sheet.getCell("A3").font = { bold: true, size: 20 };
//     sheet.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };

//     sheet.mergeCells("A4:M4");

//     /* ================= DETAILS ================= */

//     // Row 5
//     sheet.mergeCells("A5:B5");
//     sheet.mergeCells("C5:E5");
//     sheet.mergeCells("F5:G5");
//     sheet.mergeCells("H5:I5");
//     sheet.mergeCells("J5:K5");
//     sheet.mergeCells("L5:M5");

//     sheet.getCell("A5").value = "Inquiry No :";
//     sheet.getCell("C5").value = inquiry.InquiryNo || "--";
//     sheet.getCell("F5").value = "Date :";
//     sheet.getCell("H5").value = inquiry.InquiryDate
//       ? new Date(inquiry.InquiryDate).toLocaleDateString()
//       : "--";
//     sheet.getCell("J5").value = "Rev :";
//     sheet.getCell("L5").value = inquiry.revno ?? "";
//     sheet.getCell("L5").alignment = { horizontal: "left", vertical: "middle" };
//     // Row 6
//     sheet.mergeCells("A6:B6");
//     sheet.mergeCells("C6:E6");
//     sheet.mergeCells("F6:G6");
//     sheet.mergeCells("H6:M6");

//     sheet.getCell("A6").value = "Project :";
//     sheet.getCell("C6").value = inquiry.project?.name || "--";
//     sheet.getCell("F6").value = "Client :";
//     sheet.getCell("H6").value = inquiry.project?.party?.name || "--";


//     ["A5", "F5", "J5","A6", "F6"].forEach(cell => {
//       sheet.getCell(cell).font = { bold: true };
//     });

//     // Row 5
//     applyInternalBorder("A5:B5");
//     applyInternalBorder("C5:E5");
//     applyInternalBorder("F5:G5");
//     applyInternalBorder("H5:I5");
//     applyInternalBorder("J5:K5");
//     applyInternalBorder("L5:M5");

//     // Row 6
//     applyInternalBorder("A6:B6");
//     applyInternalBorder("C6:E6");
//     applyInternalBorder("F6:G6");
//     applyInternalBorder("H6:M6");

//     sheet.mergeCells("A7:M7");


//     /* ================= TABLE HEADER ================= */

//     const headerRow = sheet.addRow([
//       "Sr No",
//       "Item Description",
//       "Material Grade",
//       "Required Size",
//       "Manufacturer(s)",
//       "UOM",
//       "Quantity",
//       "Rate",
//       "Amount",
//       "Delivery Days",
//       "Offer Size",
//       "Offer Make",
//       "Remarks",
//     ]);

//     headerRow.eachCell(cell => {
//       cell.font = { bold: true };
//       cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
//       cell.border = {
//         top: { style: "thin" },
//         bottom: { style: "thin" },
//         left: { style: "thin" },
//         right: { style: "thin" },
//       };
//       cell.fill = {
//         type: "pattern",
//         pattern: "solid",
//         fgColor: { argb: "F6B26B" },
//       };
//     });

//     /* ================= ITEMS ================= */

//     inquiry.items.forEach((item, index) => {
//       const manufacturers = item.manufacture?.length
//         ? item.manufacture.map(m => m.name).join(", ")
//         : "--";

//       const row = sheet.addRow([
//         index + 1,
//         item.item?.name || "--",
//         item.item?.material_grade || "--",
//         item.requiredSize || "--",
//         manufacturers,
//         item.item?.unit?.name || "--",
//         item.qty || 0,
//         "",
//         "",
//         "",
//         "",
//         "",
//         "",
//       ]);

//       row.eachCell(cell => {
//         cell.border = {
//           top: { style: "thin" },
//           bottom: { style: "thin" },
//           left: { style: "thin" },
//           right: { style: "thin" },
//         };
//         cell.alignment = {
//           vertical: "middle",
//           horizontal: "center",
//           wrapText: true,
//         };
//       });
//     });

//     /* ================= TERMS & CONDITIONS ================= */

//     if (Array.isArray(inquiry.terms_conditions) && inquiry.terms_conditions.length) {

//       sheet.mergeCells("A12:M12");

//       const titleRow = sheet.addRow(["TERMS & CONDITIONS"]);
//       sheet.mergeCells(`A${titleRow.number}:M${titleRow.number}`);
//       sheet.getCell(`A${titleRow.number}`).font = { bold: true };
//       applyInternalBorder(`A${titleRow.number}:M${titleRow.number}`, sheet);

//       inquiry.terms_conditions.forEach((t, i) => {
//         const r = sheet.addRow([`${i + 1}. ${t}`]);
//         sheet.mergeCells(`A${r.number}:M${r.number}`);
//         sheet.getCell(`A${r.number}`).alignment = { wrapText:true, vertical:"top" };
//         applyInternalBorder(`A${r.number}:M${r.number}`, sheet);
//       });
//     }

//     /* ================= COLUMN WIDTH ================= */

//     sheet.columns = [
//       { width: 6 },
//       { width: 30 },
//       { width: 18 },
//       { width: 16 },
//       { width: 30 },
//       { width: 10 },
//       { width: 14 },
//       { width: 16 },
//       { width: 16 },
//       { width: 14 },
//       { width: 14 },
//       { width: 14 },
//       { width: 20 },
//     ];

//     /* ================= FINAL DYNAMIC OUTER BORDER ================= */

//     const firstRow = 1;
//     const lastRow = sheet.rowCount;
//     const firstCol = 1;
//     const lastCol = sheet.columnCount;

//     for (let row = firstRow; row <= lastRow; row++) {
//       const rowRef = sheet.getRow(row);

//       for (let col = firstCol; col <= lastCol; col++) {
//         const cell = rowRef.getCell(col);
//         const oldBorder = cell.border || {};

//         cell.border = {
//           top:
//             row === firstRow ? { style: "thick" } : oldBorder.top,
//           bottom:
//             row === lastRow ? { style: "thick" } : oldBorder.bottom,
//           left:
//             col === firstCol ? { style: "thick" } : oldBorder.left,
//           right:
//             col === lastCol ? { style: "thick" } : oldBorder.right,
//         };
//       }
//     }

//     /* ================= SAVE FILE ================= */

//     const excelDir = path.join(__dirname, "../../xlsx");
//     if (!fs.existsSync(excelDir)) {
//       fs.mkdirSync(excelDir, { recursive: true });
//     }

//     const filename = `Inquiry_${Date.now()}.xlsx`;
//     const filePath = path.join(excelDir, filename);

//     await workbook.xlsx.writeFile(filePath);

//     const fileUrl = `${process.env.PDF_URL}/excels/${filename}`;

//     return sendResponse(
//       res,
//       200,
//       true,
//       { file: fileUrl },
//       "Inquiry Excel generated successfully"
//     );

//   } catch (error) {
//     console.error("downloadInquiryExcel error:", error);
//     return sendResponse(
//       res,
//       500,
//       false,
//       {},
//       "Something went wrong while generating Inquiry Excel"
//     );
//   }
// };

exports.downloadInquiryExcel = async (req, res) => {
  try {
    const { id } = req.body;

    /* ================= AUTH ================= */
    if (!req.user || req.error) {
      return sendResponse(res, 401, false, {}, "Unauthorized");
    }

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, 400, false, {}, "Invalid Inquiry ID");
    }

    /* ================= FETCH LOGO ================= */
    let logoBuffer = null;
    let logoExtension = 'png';
    if (process.env.LOGO_URL_1) {
      try {
        if (process.env.LOGO_URL_1.startsWith('http')) {
          const response = await axios.get(process.env.LOGO_URL_1, { responseType: 'arraybuffer' });
          logoBuffer = Buffer.from(response.data, 'binary');
          const contentType = response.headers['content-type'];
          if (contentType) logoExtension = contentType.split('/')[1] || 'png';
        } else {
          const logoPath = path.resolve(__dirname, "../../", process.env.LOGO_URL_1);
          if (fs.existsSync(logoPath)) {
            logoBuffer = fs.readFileSync(logoPath);
            logoExtension = path.extname(logoPath).substring(1) || 'png';
          }
        }
      } catch (e) {
        console.warn("Logo fetch failed for Excel:", e.message);
      }
    }

    /* ================= FETCH DATA ================= */
    const inquiry = await Inquiry.findOne({ _id: id, deleted: false })
      .populate({
        path: "project",
        select: "name code party",
        populate: {
          path: "party",
          select: "name address contact",
        },
      })
      .populate({
        path: "items.item",
        select: "name material_grade unit",
        populate: {
          path: "unit",
          select: "name",
        },
      })
      .populate("items.manufacture", "name")
      .populate("terms_and_conditions", "description")
      .lean();

    if (!inquiry) {
      return sendResponse(res, 404, false, {}, "Inquiry not found");
    }

        const applyInternalBorder = (range) => {
      const [start, end] = range.split(":");
      const startCell = sheet.getCell(start);
      const endCell = sheet.getCell(end);

      for (let row = startCell.row; row <= endCell.row; row++) {
        for (let col = startCell.col; col <= endCell.col; col++) {
          const cell = sheet.getRow(row).getCell(col);

          cell.border = {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          };
        }
      }
    };

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Inquiry");

    /* ================= ADD LOGO ================= */
    if (logoBuffer) {
      try {
        const imageId = workbook.addImage({
          buffer: logoBuffer,
          extension: logoExtension,
        });
        // Add logo to top-left (Col A, Row 1-3 area)
        sheet.addImage(imageId, {
          tl: { col: 0.1, row: 0.1 },
          ext: { width: 120, height: 70 }
        });
      } catch (imgErr) {
        console.error("Error adding image to Excel:", imgErr);
      }
    }

    /* ================= HEADER ================= */
    sheet.mergeCells("A1:M1");
    sheet.getCell("A1").value =
      "VISHAL ENTERPRISE & VRISHAL ENGINEERING PRIVATE LIMITED";
    sheet.getCell("A1").font = { bold: true, size: 24 };
    sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

    sheet.mergeCells("A2:M2");
    sheet.getCell("A2").value = "GROUP OF COMPANIES";
    sheet.getCell("A2").font = { bold: true, size: 22 };
    sheet.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

    sheet.mergeCells("A3:M3");
    sheet.getCell("A3").value =
      "INQUIRY FOR SUPPLY OF STRUCTURAL STEEL SECTIONS";
    sheet.getCell("A3").font = { bold: true, size: 20 };
    sheet.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };

    sheet.mergeCells('A4:M4');
    sheet.mergeCells('A5:M5');
    sheet.getCell('A5').value = "PURCHASE ORDER FOR :" + inquiry.purchase_order;
    sheet.getCell('A5').alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    sheet.mergeCells("A6:M6");

    /* ================= DETAILS ================= */
    sheet.mergeCells("A7:B7");
    sheet.mergeCells("C7:E7");
    sheet.mergeCells("F7:G7");
    sheet.mergeCells("H7:I7");
    sheet.mergeCells("J7:K7");
    sheet.mergeCells("L7:M7");

    sheet.getCell("A7").value = "Inquiry No :";
    sheet.getCell("C7").value = inquiry.InquiryNo || "--";
    sheet.getCell("F7").value = "Date :";
    sheet.getCell("H7").value = inquiry.InquiryDate
      ? new Date(inquiry.InquiryDate).toLocaleDateString()
      : "--";
    sheet.getCell("J7").value = "Rev :";
    sheet.getCell("L7").value = inquiry.revno ?? "";
    sheet.getCell("L7").alignment = { horizontal: "left", vertical: "middle" };

    sheet.mergeCells("A8:B8");
    sheet.mergeCells("C8:E8");
    sheet.mergeCells("F8:G8");
    sheet.mergeCells("H8:M8");

    sheet.getCell("A8").value = "Project :";
    sheet.getCell("C8").value = inquiry.project?.name || "--";
    sheet.getCell("F8").value = "Client :";
    sheet.getCell("H8").value = inquiry.project?.party?.name || "--";

    ["A7", "F7", "J7", "A8", "F8"].forEach(cell => {
      sheet.getCell(cell).font = { bold: true };
    });

    /* ================= TABLE HEADER ================= */
    const headerRow = sheet.addRow([
      "Sr No",
      "Item Description",
      "Material Grade",
      "Required Size",
      "Manufacturer(s)",
      "UOM",
      "Quantity",
      "Rate",
      "Amount",
      "Delivery Days",
      "Offer Size",
      "Offer Make",
      "Remarks",
    ]);

    headerRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "F6B26B" },
      };
    });

    /* ================= ITEMS ================= */
    inquiry.items.forEach((item, index) => {
      const manufacturers = item.manufacture?.length
        ? item.manufacture.map(m => m.name).join(", ")
        : "--";

      const row = sheet.addRow([
        index + 1,
        item.item?.name || "--",
        item.item?.material_grade || "--",
        item.requiredSize || "--",
        manufacturers,
        item.item?.unit?.name || "--",
        item.qty || 0,
        "",
        "",
        "",
        "",
        "",
        "",
      ]);

      row.eachCell(cell => {
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true,
        };
      });
    });

    /* ================= TERMS & CONDITIONS ================= */
    const allTerms = [];
    if (inquiry.terms_and_conditions && inquiry.terms_and_conditions.length) {
      inquiry.terms_and_conditions.forEach(t => {
        if (typeof t === 'object' && t.description) allTerms.push(t.description);
        else if (typeof t === 'string') allTerms.push(t);
      });
    }
    if (inquiry.otherTerms && inquiry.otherTerms.length) {
      allTerms.push(...inquiry.otherTerms);
    }

    if (allTerms.length) {
      sheet.addRow([]); // Blank row
      const titleRow = sheet.addRow(["TERMS & CONDITIONS"]);
      sheet.mergeCells(`A${titleRow.number}:M${titleRow.number}`);
      sheet.getCell(`A${titleRow.number}`).font = { bold: true };
      applyInternalBorder(`A${titleRow.number}:M${titleRow.number}`);

      allTerms.forEach((t, i) => {
        const r = sheet.addRow([`${i + 1}. ${t}`]);
        sheet.mergeCells(`A${r.number}:M${r.number}`);
        sheet.getCell(`A${r.number}`).alignment = { wrapText: true, vertical: "top" };
        applyInternalBorder(`A${r.number}:M${r.number}`);
      });
    }

    /* ================= COLUMN WIDTH ================= */
    sheet.columns = [
      { width: 6 },
      { width: 30 },
      { width: 18 },
      { width: 16 },
      { width: 30 },
      { width: 10 },
      { width: 14 },
      { width: 16 },
      { width: 16 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 20 },
    ];

    /* ================= FINAL DYNAMIC OUTER BORDER ================= */
    const firstRow = 1;
    const lastRow = sheet.rowCount;
    const firstCol = 1;
    const lastCol = sheet.columnCount;

    for (let row = firstRow; row <= lastRow; row++) {
      const rowRef = sheet.getRow(row);
      for (let col = firstCol; col <= lastCol; col++) {
        const cell = rowRef.getCell(col);
        const oldBorder = cell.border || {};

        cell.border = {
          top:
            row === firstRow ? { style: "thick" } : oldBorder.top,
          bottom:
            row === lastRow ? { style: "thick" } : oldBorder.bottom,
          left:
            col === firstCol ? { style: "thick" } : oldBorder.left,
          right:
            col === lastCol ? { style: "thick" } : oldBorder.right,
        };
      }
    }

    /* ================= DOWNLOAD ================= */
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Inquiry_${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("downloadInquiryExcel error:", error);
    return sendResponse(
      res,
      500,
      false,
      {},
      "Something went wrong while generating Inquiry Excel"
    );
  }
};
