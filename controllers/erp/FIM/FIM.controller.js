
const FimPackingList = require("../../../models/erp/FIM/FimPackingList.model.js"); // adjust path
const { downloadFormat, padWithLeadingZeros, generateExcel } = require("../../../helper/index");
const { sendResponse } = require("../../../helper/response");// ...existing code...
const { default: mongoose } = require("mongoose");
const ejs = require("ejs");
const fs = require("fs");
const path = require("path");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;
const puppeteer = require("puppeteer");
const { TitleFormat } = require('../../../utils/enum');
const Item = require("../../../models/store/item.model");
const XLSX = require('xlsx');  // for utility functions
const XLSXStyle = require('xlsx-style');  // for styling
const upload = require('../../../helper/multerConfig');
const PurchaseOffer = require("../../../models/store/purchase_offer.model");
const TransactionItems = require("../../../models/store/transaction_item.model");
const ObjectId = mongoose.Types.ObjectId;
const User = require("../../../models/users.model");
const ErpRole = require("../../../models/erp/erp_role.model");
const Project = require("../../../models/project.model");
const addEmailJob = require("../../../utils/emailJob");
const sendEmail = require("../../../utils/sendEmail");
const commonStageOfferEmail = require("../../../utils/commonStageOfferEmail");
const commonStageAcceptanceEmail = require("../../../utils/commonStageAcceptanceEmail");

// ----------------- Create / Update -----------------
// Manage FIM Packing (create / update)
exports.manageFimPackingList = async (req, res) => {
  console.log("manageFimPackingList called with body:", req.body);

  if (req.user || !req.error) {


    try {
      const {
        project,
        packing_no,
        packing_date,
        rgp_no,
        fim_lot_no,
        returnable_type,
        eway_bill,
        vehicle_number,
        supplier,
        receiving_date,
        received_by,
        id,
      } = req.body;


      // --- Required Fields ---
      if (!project || !packing_no || !supplier || !received_by) {
        console.log("Missing required fields:", {
          project,
          packing_no,
          supplier,
          received_by,
        });
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }

      if (!id) {
        // --- Create New ---
        const exists = await FimPackingList.findOne({
          project: new ObjectId(project),
          packing_no,
          deleted: false,
        });

        console.log("Duplicate check result:", exists);

        if (exists) {
          return sendResponse(res, 400, false, {}, "Packing list already exists");
        }

        const newPacking = new FimPackingList({
          project,
          packing_no,
          packing_date,
          rgp_no,
          fim_lot_no,
          returnable_type,
          eway_bill,
          vehicle_number,
          supplier,
          receiving_date,
          received_by,
        });


        const savedPacking = await newPacking.save();
        console.log("New packing list created:", savedPacking);

        return sendResponse(
          res,
          200,
          true,
          savedPacking,
          "Packing list created successfully"
        );
      } else {
        // --- Update Existing ---
        const updated = await FimPackingList.findByIdAndUpdate(
          id,
          {
            project,
            packing_no,
            packing_date,
            rgp_no,
            fim_lot_no,
            returnable_type,
            eway_bill,
            vehicle_number,
            supplier,
            receiving_date,
            received_by,
          },
          { new: true }
        );

        console.log("Packing list update result:", updated);

        if (updated) {
          return sendResponse(
            res,
            200,
            true,
            updated,
            "Packing list updated successfully"
          );
        } else {
          return sendResponse(res, 404, false, {}, "Packing list not found");
        }
      }
    } catch (error) {
      console.error("manageFimPackingList error:", error);
      return sendResponse(res, 500, false, {}, "Something went wrong");
    }
  }
  else {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }
};
// Manage Fim item create / update
exports.manageFimPackingItems = async (req, res) => {
  try {
    const { fim_packing_id, id, item_id, material_grade, weight_as_per_list, numbers_as_per_list,
      received_weight, received_length, received_width, received_nos,
      status, remarks } = req.body;

    if (!fim_packing_id || !item_id) {
      return sendResponse(res, 400, false, {}, "Missing required fields");
    }

    const fimDoc = await FimPackingList.findById(fim_packing_id);
    if (!fimDoc) {
      return sendResponse(res, 404, false, {}, "FIM packing not found");
    }

    if (id) {
      // --- Update Existing Item ---
      const item = fimDoc.items.id(id);
      console.log("item to update:", item);
      if (!item) {
        return sendResponse(res, 404, false, {}, "Item not found in this packing list");
      }

      item.item_id = item_id;
      item.weight_as_per_list = weight_as_per_list;
      item.numbers_as_per_list = numbers_as_per_list;
      item.received_weight = received_weight;
      item.received_length = received_length;
      item.received_width = received_width;
      item.received_nos = received_nos;
      item.status = status;
      item.remarks = remarks;

    } else {
      // --- Add New Item ---
      fimDoc.items.push({
        item_id,
        weight_as_per_list,
        numbers_as_per_list,
        received_weight,
        received_length,
        received_width,
        received_nos,
        status,
        remarks
      });
    }

    // ---------- Sync Material Grade with Item Master ----------
    const existingItem = await Item.findById(item_id);
    console.log("Fetched item for material grade sync:", existingItem);
    if (existingItem) {
      if (material_grade && existingItem.material_grade !== material_grade) {
        existingItem.material_grade = material_grade;
        await existingItem.save();
      }
    }


    const saved = await fimDoc.save();
    console.log("Fim packing after item add/update:", saved);
    return sendResponse(res, 200, true, saved, id ? "Item updated successfully" : "Item added successfully");

  } catch (error) {
    console.error("manageFimPackingItems error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

exports.getSampleFIMImport = async (req, res) => {
  downloadFormat(req, res, "fim_import.xlsx");
}


// import from execel  

exports.importFimItemsByName = async (req, res) => {
  if (!req.user) return sendResponse(res, 401, false, {}, "Unauthorized");

  // Use the Multer upload helper
  upload(req, res, async function (err) {
    if (err) {
      return sendResponse(res, 400, false, {}, `File upload error: ${err.message}`);
    }

    if (!req.file) {
      return sendResponse(res, 400, false, {}, "No file uploaded");
    }

    try {
      const { fim_packing_id } = req.body;
      if (!fim_packing_id) {
        return sendResponse(res, 400, false, {}, "FIM packing ID is required");
      }

      const fimDoc = await FimPackingList.findById(fim_packing_id);
      if (!fimDoc) {
        return sendResponse(res, 404, false, {}, "FIM packing not found");
      }

      // Read the uploaded Excel file from disk
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet);

      // Delete the file after reading
      fs.unlinkSync(req.file.path);

      if (!rows.length) {
        return sendResponse(res, 400, false, {}, "Excel file is empty");
      }

      let importedCount = 0;

      for (const row of rows) {
        const name = row['SECTION DETAILS'];
        const material_grade = row['MATERIAL GRADE'];
        const weight_as_per_list = row['WEIGHT AS PER PACKING LIST (Kg)'];
        const numbers_as_per_list = row['NUMBERS AS PER PACKING LIST (Kg)'];
        const received_weight = row['RECEIVED WEIGHT (Kg)'];
        const received_length = row['RECEIVED LENGTH (MM)'];
        const received_width = row['RECEIVED WIDTH (MM)'];
        const received_nos = row['RECEIVED NOS'];
        const remarks = row['REMARKS']; // optional

        if (!name) continue; // skip rows without name

        const item = await Item.findOne({ name });
        if (!item) continue; // skip if item not found

        fimDoc.items.push({
          item_id: item._id,
          material_grade: material_grade || item.material_grade,
          weight_as_per_list,
          numbers_as_per_list,
          received_weight,
          received_length,
          received_width,
          received_nos,
          remarks,
        });

        if (material_grade && item.material_grade !== material_grade) {
          item.material_grade = material_grade;
          await item.save();
        }

        importedCount = importedCount + 1;
      }

      await fimDoc.save();

      return sendResponse(
        res,
        200,
        true,
        { importedCount, items: fimDoc.items },
        `${importedCount} items imported successfully`
      );

    } catch (error) {
      console.error("importFimItemsByName error:", error);
      return sendResponse(res, 500, false, {}, "Something went wrong during import");
    }
  });
};

// Send to QC
exports.sendFimPackingToQC = async (req, res) => {
  try {
    const { fim_id } = req.body;
    const qcUser = req.user?._id; // who is sending it to QC

    if (!fim_id) {
      return sendResponse(res, 400, false, {}, "FIM Packing List ID is required");
    }

    if (!mongoose.Types.ObjectId.isValid(fim_id)) {
      return sendResponse(res, 400, false, {}, "Invalid FIM Packing List ID");
    }

    const existingFim = await FimPackingList.findById(fim_id);
    if (!existingFim) {
      return sendResponse(res, 404, false, {}, "FIM Packing List not found");
    }

    if (existingFim.send_to_qc === true) {
      return sendResponse(res, 400, false, {}, "FIM Packing List already sent to QC");
    }

    if (!existingFim.items || existingFim.items.length === 0) {
      return sendResponse(res, 400, false, {}, "Cannot send to QC: no items found in packing list");
    }

    // Update document
    const updatedFim = await FimPackingList.findByIdAndUpdate(
      fim_id,
      {
        status: "1", // Send to QC
        send_to_qc: true,
        qc_by: qcUser,
        qc_timestamp: new Date(),
      },
      { new: true }
    );

    if (!updatedFim) {
      return sendResponse(res, 404, false, {}, "FIM Packing List not found");
    }
/* ==========================================
   FIM PACKING -> QC OFFER EMAIL
========================================== */

try {

const qcSender = await User.findById(existingFim.received_by);
console.log("qcSender====>", qcSender);

  const projectDetails = await Project.findById(
    updatedFim.project
  );

  // Send to QC Engineers
  const roles = await ErpRole.find({
    deleted: false,
    name: {
      $in: ["QC Engineer"]
    }
  });

  const roleIds = roles.map(
    role => role._id
  );

  const users = await User.find({
    deleted: false,
    status: true,
    structureRole: {
      $in: roleIds
    },
    email: {
      $exists: true,
      $ne: ""
    }
  });

  const offerDateTime =
    updatedFim?.updatedAt
      ? new Date(updatedFim.updatedAt)
          .toLocaleString(
            "en-IN",
            {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true
            }
          )
          .replace("am", "AM")
          .replace("pm", "PM")
      : "-";

  for (const user of users) {

    const emailHtml =
      commonStageOfferEmail({

        userName:
          user?.user_name || "-",

        module:
          "Structural",

        stageName:
          "FIM Packing List Offer",

        packageListNo:
          updatedFim?.packing_no || "-",

        projectName:
          projectDetails?.name || "-",

        workOrderNo:
          projectDetails?.work_order_no || "-",

        createdBy:
          qcSender?.user_name || "-",

        offerDateTime,

        remarks:
          `FIM Packing List Offer has been Completed by ${qcSender?.user_name || "-"} and is ready for QC verification.`,

        loginUrl:
          process.env.ERP_URL

      });

    addEmailJob({

      to: user.email,

      subject:
        `FIM Packing List - ${updatedFim?.packing_no}`,

      html: emailHtml

    });

    console.log(
      `FIM QC mail queued -> ${user.email}`
    );
  }

} catch (emailErr) {

  console.log(
    "FIM QC EMAIL ERROR:",
    emailErr
  );

}
    return sendResponse(res, 200, true, updatedFim, "FIM Packing List sent to QC");
  } catch (error) {
    console.error("sendFimPackingToQC error:", error);
    return sendResponse(res, 500, false, {}, "Internal server error");
  }
};


exports.deleteFimPackingItem = async (req, res) => {
  try {
    const { fim_packing_id, id } = req.body;

    const fimDoc = await FimPackingList.findById(fim_packing_id);
    if (!fimDoc) {
      return sendResponse(res, 404, false, {}, "FIM packing not found");
    }

    // fimDoc.items.id(id).remove();
    fimDoc.items.pull(id);

    const saved = await fimDoc.save();

    return sendResponse(res, 200, true, saved, "Item deleted successfully");
  } catch (error) {
    console.error("deleteFimPackingItem error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

exports.getFimPackingListById = async (req, res) => {
  // console.log("getFimPackingListById called with params:", req.query);
  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  try {
    const { fim_id } = { ...req.query, ...req.body };

    if (!mongoose.Types.ObjectId.isValid(fim_id)) {
      return sendResponse(res, 400, false, {}, "Invalid FIM Packing List ID");
    }

    const packingList = await FimPackingList.findOne({ _id: fim_id, deleted: false })
      .populate("project", "name code") // only needed fields
      .populate("received_by", "full_name email")
      .populate("items.item_id", "name code unit material_grade"); // fetch item details

    if (!packingList) {
      return sendResponse(res, 404, false, {}, "FIM Packing List not found");
    }

    return sendResponse(res, 200, true, packingList, "FIM Packing List fetched successfully");
  } catch (error) {
    console.error("Error fetching FIM Packing List:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

exports.getFimPackingListsByProject = async (req, res) => {
  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }
  try {
    const { project, page, limit } = req.body;
    const { status, search } = req.query;

    const filter = { deleted: false };

    if (project && mongoose.Types.ObjectId.isValid(project)) {
      filter.project = new mongoose.Types.ObjectId(project);
    }

    if (status) {
      filter.status = Number(status);
    }

    const pageNumber = page ? parseInt(page) : null;
    const limitNumber = limit ? parseInt(limit) : null;
    const skip = pageNumber && limitNumber ? (pageNumber - 1) * limitNumber : 0;

    let searchQuery = {};
    if (search) {
      const regex = new RegExp(search, "i");
      searchQuery = {
        $or: [
          { packing_no: regex },
          { rgp_no: regex },
          { fim_lot_no: regex },
          { eway_bill: regex },
          { vehicle_number: regex },
          { supplier: regex },
          { "project.name": regex },
          { "project.code": regex },
          { "items.item_id.name": regex },
          { "items.item_id.code": regex },
          { "items.item_id.material_grade": regex },
          { "items.item_id.unit.name": regex },
        ],
      };
    }

    const pipeline = [
      { $match: filter },

      // -------- Project Lookup --------
      {
        $lookup: {
          from: "bussiness-projects",
          localField: "project",
          foreignField: "_id",
          as: "project",
        },
      },
      { $unwind: "$project" },


      // -------- Received By Lookup --------
      {
        $lookup: {
          from: "users",
          localField: "received_by",
          foreignField: "_id",
          as: "received_by",
        },
      },
      { $unwind: { path: "$received_by", preserveNullAndEmptyArrays: true } },

      // -------- Store Items Lookup --------
      {
        $lookup: {
          from: "store-items",
          localField: "items.item_id",
          foreignField: "_id",
          as: "items_info",
        },
      },
      // -------- Purchase Offer Lookup (For IMIR No) --------
      {
        $lookup: {
          from: "erp-purchase-offers", // collection name
          localField: "_id",
          foreignField: "fim_id",
          as: "purchase_offer",
        },
      },
      {
        $addFields: {
          imir_no: { $arrayElemAt: ["$purchase_offer.imir_no", 0] },
        },
      },

      // -------- Units Lookup --------
      {
        $lookup: {
          from: "store-item-units",
          localField: "items_info.unit",
          foreignField: "_id",
          as: "units_info",
        },
      },

      // -------- Corrected Item + Unit Merge --------
      {
        $addFields: {
          items: {
            $map: {
              input: "$items",
              as: "i",
              in: {
                $mergeObjects: [
                  "$$i",
                  {
                    item_id: {
                      $let: {
                        vars: {
                          itemObj: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: "$items_info",
                                  cond: { $eq: ["$$this._id", "$$i.item_id"] },
                                },
                              },
                              0,
                            ],
                          },
                        },
                        in: {
                          $mergeObjects: [
                            "$$itemObj",
                            {
                              unit: {
                                $arrayElemAt: [
                                  {
                                    $filter: {
                                      input: "$units_info",
                                      cond: { $eq: ["$$this._id", "$$itemObj.unit"] },
                                    },
                                  },
                                  0,
                                ],
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },

      { $match: searchQuery },

      { $sort: { createdAt: -1 } },

      {
        $project: {
          _id: 1,
          packing_no: 1,
          packing_date: 1,
          vehicle_number: 1,
          rgp_no: 1,
          fim_lot_no: 1,
          supplier: 1,
          status: 1,
          send_to_qc: 1,
          createdAt: 1,
          returnable_type: 1,
          eway_bill: 1,
          imir_no: 1, // ✅ ADD THIS
          project: { _id: 1, name: 1, code: 1 },
          received_by: { _id: 1, user_name: 1, email: 1 },
          items: 1,
        },
      },
    ];

    // -------- Pagination --------
    if (pageNumber && limitNumber) {
      pipeline.push({
        $facet: {
          data: [{ $skip: skip }, { $limit: limitNumber }],
          totalCount: [{ $count: "count" }],
        },
      });
    } else {
      pipeline.push({
        $facet: {
          data: [{ $match: {} }],
          totalCount: [{ $count: "count" }],
        },
      });
    }

    const packingLists = await FimPackingList.aggregate(pipeline);

    const result = packingLists[0] || { data: [], totalCount: [] };
    const totalItems = result.totalCount.length > 0 ? result.totalCount[0].count : 0;

    return sendResponse(
      res,
      200,
      true,
      {
        data: result.data,
        pagination:
          pageNumber && limitNumber
            ? {
              totalItems,
              currentPage: pageNumber,
              totalPages: Math.ceil(totalItems / limitNumber),
              limit: limitNumber,
            }
            : null,
      },
      "FIM Packing Lists fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching FIM Packing Lists by project:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

exports.updateFimPackingStatus = async (req, res) => {
  try {
    const { id } = req.body;
    let status = req.body.status;
    console.log("updateFimPackingStatus called with:", req.body);

    switch (status) {
      case "Pending": status = "0"; break;
      case "Partially Approved": status = "1"; break;
      case "Approved": status = "2"; break;
      case "Rejected": status = "3"; break;
      default:
        return sendResponse(res, 400, false, {}, "Invalid status value");
    }

    console.log("Mapped status value:", status);

    // Validate required fields
    if (!id || !status) {
      return sendResponse(res, 400, false, {}, "Missing required parameters (id or status)");
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, 400, false, {}, "Invalid FIM Packing List ID");
    }

    // Update FIM status
    const updatedFim = await FimPackingList.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedFim) {
      return sendResponse(res, 404, false, {}, "FIM Packing List not found");
    }

    switch (updatedFim.status) {
      case 0: updatedStatus = "Pending"; break;
      case 1: updatedStatus = "Partially Approved"; break;
      case 2: updatedStatus = "Approved"; break;
      case 3: updatedStatus = "Rejected"; break;
      default:
        return sendResponse(res, 400, false, {}, "Invalid status value");
    }


    return sendResponse(
      res,
      200,
      true,
      updatedFim,
      `FIM status updated to ${updatedStatus}`
    );
  } catch (error) {
    console.error("Error updating FIM status:", error);
    return sendResponse(res, 500, false, {}, "Internal server error");
  }
};
// =================== DOWNLOAD ONE FIM (PDF) ===================
exports.downloadFimPackingList = async (req, res) => {
  const { fim_id, print_date } = req.body;

  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  try {
    // 🔹 Fetch packing list with populated fields
    const packingList = await FimPackingList.findOne({ _id: fim_id, deleted: false })
      .populate({
        path: "project",
        select: "name code party",
        populate: {
          path: "party",   // this points to store-parties
          select: "name address contact",
        },
      })
      .populate("received_by", "user_name email")
      .populate("items.item_id", "name code unit material_grade");

    console.log("Fetched packing list for PDF:", packingList);

    if (!packingList) {
      return sendResponse(res, 404, false, {}, "FIM Packing List not found");
    }

    // 🔹 Render HTML using template (FIMbyid.html)
    const template = fs.readFileSync("templates/FIMbyid.html", "utf-8");
    const renderedHtml = ejs.render(template, {
      fim: packingList.toObject(),
      logoUrl1: process.env.LOGO_URL_1,
      logoUrl2: process.env.LOGO_URL_2,
    });

    // 🔹 Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: PATH,
    });
    const page = await browser.newPage();

    await page.setContent(renderedHtml, { baseUrl: `${URI}` });

    // 🔹 Generate PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", bottom: "20px", left: "10px", right: "10px" },
    });

    await browser.close();

    // 🔹 Save PDF in /pdfs folder
    const pdfsDir = path.join(__dirname, "../../../pdfs");
    if (!fs.existsSync(pdfsDir)) {
      fs.mkdirSync(pdfsDir);
    }

    const filename = `FIM_${Date.now()}.pdf`;
    const filePath = path.join(pdfsDir, filename);
    fs.writeFileSync(filePath, pdfBuffer);

    const fileUrl = `${URI}/pdfs/${filename}`;

    console.log("Generated PDF URL:", fileUrl);

    return sendResponse(res, 200, true, { file: fileUrl }, "FIM PDF generated successfully");
  } catch (error) {
    console.error("downloadFimPackingList error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong while generating PDF");
  }
};

// =================== DOWNLOAD FIM PACKING LIST (EXCEL) ===================
exports.downloadFimPackingListExcel = async (req, res) => {
  const { fim_id } = req.body;

  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  try {
    const packingList = await FimPackingList.findOne({ _id: fim_id, deleted: false })
      .populate("project", "name code")
      .populate("received_by", "user_name email")
      .populate("items.item_id", "name code unit material_grade");

    if (!packingList) {
      return sendResponse(res, 404, false, {}, "FIM Packing List not found");
    }

    const wsData = [];

    // Headers
    wsData.push(["VISHAL ENTERPRISE & VRISHAL ENGINEERING PRIVATE LIMITED"]);
    wsData.push(["GROUP OF COMPANIES"]);
    wsData.push(["FIM PACKING LIST - STRUCTURE (FIM INSPECTION OFFER LIST)"]);
    wsData.push([]);

    // Client / Project / Dates
    wsData.push([
      "CLIENT", packingList.client || "--",
      "RECEIVING DATE", packingList.receiving_date ? new Date(packingList.receiving_date).toLocaleDateString() : "--"
    ]);
    wsData.push([
      "PROJECT", packingList.project?.name || "--",
      "RECEIVED BY", packingList.received_by?.user_name || "--"
    ]);
    wsData.push([
      "PACKING LIST NO.", packingList.packing_list_no || "--",
      "PACKING LIST DATE", packingList.packing_date ? new Date(packingList.packing_date).toLocaleDateString() : "--"
    ]);
    wsData.push([
      "RGP NO.", packingList.rgp_no || "--",
      "FIM LOT NO.", packingList.fim_lot_no || "--"
    ]);
    wsData.push([
      "RETURNABLE/NON RETURNABLE", packingList.returnable_type || "--",
      "VEHICLE NUMBER", packingList.vehicle_number || "--"
    ]);
    wsData.push([
      "E-WAY BILL", packingList.eway_bill || "--",
      "SUPPLIER", packingList.supplier || "--"
    ]);
    wsData.push([]);

    // Table Headers
    wsData.push([
      "Sr. No.",
      "Section Details",
      "Material Grade",
      "Weight as per Packing List (Kg)",
      "Numbers as per Packing List",
      "Received Weight (Kg)",
      "Received Length (MM)",
      "Received Width (MM)",
      "Received Nos",
      "Rejected Weight (Kg)",
      "Rejected Length (MM)",
      "Rejected Width (MM)",
      "Rejected Nos",
      "Remarks",
    ]);

    // Items
    packingList.items.forEach((item, idx) => {
      wsData.push([
        idx + 1,
        item.item_id?.name || "--",
        item.material_grade || "--",
        item.weight_as_per_list || 0,
        item.numbers_as_per_list || 0,
        item.received_weight || 0,
        item.received_length || 0,
        item.received_width || 0,
        item.received_nos || 0,
        item.rejected_weight || 0,
        item.rejected_length || 0,
        item.rejected_width || 0,
        item.rejected_nos || 0,
        item.remarks || "--",
      ]);
    });

    wsData.push([]);
    wsData.push([
      "RECEIVED BY", "",
      "SIGNATURE", "",
      "PASS NO.", packingList.pass_no || "--",
      "DATE", packingList.receive_date ? new Date(packingList.receive_date).toLocaleDateString() : "--"
    ]);

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // 🔹 Apply merges
    ws["!merges"] = [
      // Top headers
      { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } }, // Company name
      { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } }, // Group of Companies
      { s: { r: 2, c: 0 }, e: { r: 2, c: 13 } }, // Title

      // Client / Receiving Date
      { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
      { s: { r: 4, c: 2 }, e: { r: 4, c: 5 } },
      { s: { r: 4, c: 6 }, e: { r: 4, c: 7 } },

      // Project / Received By
      { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },
      { s: { r: 5, c: 2 }, e: { r: 5, c: 5 } },
      { s: { r: 5, c: 6 }, e: { r: 5, c: 7 } },

      // Packing List No / Date
      { s: { r: 6, c: 0 }, e: { r: 6, c: 1 } },
      { s: { r: 6, c: 2 }, e: { r: 6, c: 5 } },
      { s: { r: 6, c: 6 }, e: { r: 6, c: 7 } },

      // RGP No / FIM Lot
      { s: { r: 7, c: 0 }, e: { r: 7, c: 1 } },
      { s: { r: 7, c: 2 }, e: { r: 7, c: 5 } },
      { s: { r: 7, c: 6 }, e: { r: 7, c: 7 } },

      // Returnable / Vehicle
      { s: { r: 8, c: 0 }, e: { r: 8, c: 1 } },
      { s: { r: 8, c: 2 }, e: { r: 8, c: 5 } },
      { s: { r: 8, c: 6 }, e: { r: 8, c: 7 } },

      // E-way Bill / Supplier
      { s: { r: 9, c: 0 }, e: { r: 9, c: 1 } },
      { s: { r: 9, c: 2 }, e: { r: 9, c: 5 } },
      { s: { r: 9, c: 6 }, e: { r: 9, c: 7 } },
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "FIM Packing List");

    // Save file
    const excelDir = path.join(__dirname, "../../../xlsx");
    if (!fs.existsSync(excelDir)) {
      fs.mkdirSync(excelDir);
    }

    const filename = `FIM_${Date.now()}.xlsx`;
    const filePath = path.join(excelDir, filename);
    XLSX.writeFile(wb, filePath);

    const fileUrl = `${process.env.PDF_URL}/excels/${filename}`;
    return sendResponse(res, 200, true, { file: fileUrl }, "Excel generated successfully");

  } catch (error) {
    console.error("downloadFimPackingListExcel error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong while generating Excel");
  }
};


// Verify 
exports.verifyFimPacking = async (req, res) => {
  try {
    const { id, PROJECT, qc_name, qc_by, qc_notes, items } = req.body;
    console.log("verifyFimPacking called with:", req.body);
    const qcUser = req.user?._id;

    if (!id) {
      return sendResponse(res, 400, false, {}, "FIM ID is required");
    }

    if (!qc_by) {
      return sendResponse(res, 400, false, {}, "QC By is required");
    }

    let parsedItems = [];
    try {
      parsedItems = typeof items === "string" ? JSON.parse(items) : items;
    } catch (err) {
      return sendResponse(res, 400, false, {}, "Invalid items data");
    }

    // Fetch FIM
    const fim = await FimPackingList.findById(id);
    if (!fim) {
      return sendResponse(res, 404, false, {}, "FIM not found");
    }

    // ---------------------------------------------
    // UPDATE FIM ITEMS
    // ---------------------------------------------
    fim.items = fim.items.map((item) => {
      const updated = parsedItems.find((u) => String(u._id) === String(item._id));
      if (updated) {
        // Helper to convert comma-separated string or array to array
        const toArray = (val) => {
          if (!val) return [];
          if (Array.isArray(val)) return val;
          if (typeof val === "string") return val.split(",").map(v => v.trim()).filter(v => v);
          return [val];
        };

        // Extract Heat and TC Numbers
        let heat_nos = [];
        let tc_nos = [];
        let combined_details = [];

        if (updated.tc_heat_details && Array.isArray(updated.tc_heat_details)) {
          heat_nos = updated.tc_heat_details.map(d => d.heat_no).filter(v => v);
          tc_nos = updated.tc_heat_details.map(d => d.tc_no).filter(v => v);
          combined_details = updated.tc_heat_details;
        } else {
          heat_nos = toArray(updated.heat_no ?? item.heat_no);
          tc_nos = toArray(updated.tc_no ?? item.tc_no);
          combined_details = heat_nos.map((h, i) => ({
            heat_no: h,
            tc_no: tc_nos[i] || "",
            inspect_nos: i === 0 ? (updated.inspect_nos || item.inspected_nos) : 0,
            inspect_length: i === 0 ? (updated.inspect_length || item.inspected_length) : "",
            inspect_width: i === 0 ? (updated.inspect_width || item.inspected_width) : "",
          }));
        }

        return {
          ...item.toObject(),

          manufacture: updated.manufacture ?? item.manufacture,
          // inspected_nos: updated.inspect_nos ?? item.inspected_nos,
          inspected_weight: updated.inspect_weight ?? item.inspected_weight,
          // inspected_length: updated.inspect_length ?? item.inspected_length,
          // inspected_width: updated.inspect_width ?? item.inspected_width,

          rejected_weight: updated.rejected_weight ?? item.rejected_weight,
          rejected_length: updated.rejected_length ?? item.rejected_length,
          rejected_width: updated.rejected_width ?? item.rejected_width,
          rejected_nos: updated.rejected_nos ?? item.rejected_nos,

          // QC
          // heat_no: heat_nos,
          // tc_no: tc_nos,
          tc_heat_details: combined_details, // Ensure this is saved if model updated
          status: updated.qc_status == true ? 1 : 2,
          remarks: updated.remarks ?? item.remarks,
        };
      }
      return item;
    });

    // ---------------------------------------------
    // UPDATE QC INFO
    // ---------------------------------------------
    fim.qc_by = qc_by || qcUser;
    fim.qc_timestamp = new Date();
    fim.qc_notes = qc_notes || "";
    fim.qc_name = qc_name || "";

    // Determine FIM Status
    const itemStatuses = fim.items.map((i) => i.status);
    if (itemStatuses.every((s) => s === 1)) fim.status = 2;        // Completed
    else if (itemStatuses.some((s) => s === 2)) fim.status = 3;     // Rejected
    else fim.status = 1;                                            // In 

    // ---------------------------------------------
    // GENERATE FIM REPORT NO
    // ---------------------------------------------
    if (!fim.report_no) {
      const lastFim = await FimPackingList.findOne(
        { deleted: false },
        {},
        { sort: { createdAt: -1 } }
      );

      let nextReportNo = 1;
      if (lastFim?.report_no) {
        const parts = lastFim.report_no.split("/");
        const last = parseInt(parts[parts.length - 1], 10);
        nextReportNo = isNaN(last) ? 1 : last + 1;
      }

      fim.report_no =
        TitleFormat.FIMREPORTNO.replace("PROJECT", PROJECT) +
        String(nextReportNo);
    }

    await fim.save();


    // ---------------------------------------------
    // PURCHASE OFFER CREATION / UPDATE
    // ---------------------------------------------
    let offer = await PurchaseOffer.findOne({ fim_id: fim._id });

    if (!offer) {
      offer = new PurchaseOffer({
        fim_id: fim._id,
        is_fim: true,
        received_date: new Date(),
        offer_no: "",
        imir_no: "",
        items: [],
        offeredBy: qcUser,
      });
    }

    // ---------------------------------------------
    // ⭐ SYNC ITEMS + CREATE TRANSACTION ITEMS
    // ---------------------------------------------
    offer.items = [];

    for (const fItem of fim.items) {

      // ➤ Only accepted items should be synced
      if (fItem.status !== 1) {
        console.log("Skipping rejected item:", fItem._id);
        continue;
      }

      const transaction = await TransactionItems.create({
        fimId: fim._id,
        tag: 1, // Purchase
        itemName: fItem.item_id,

        quantity: fItem.received_weight || 0,
        pcs: fItem.received_nos || 0,
        item_length: fItem.received_length || null,
        item_width: fItem.received_width || null,
        item_weight: fItem.received_weight || null,

        status: 4, // Completed
      });

      const updatedItem = parsedItems.find((u) => String(u._id) === String(fItem._id));
      const details = updatedItem?.tc_heat_details || [];

      offer.items.push({
        transactionId: transaction._id,

        offeredQty: fItem.weight_as_per_list,
        offeredNos: fItem.numbers_as_per_list,

        acceptedQty: fItem.inspected_weight,
        acceptedNos: fItem.inspected_nos,
        acceptedLength: fItem.inspected_length,
        acceptedWidth: fItem.inspected_width,

        rejectedQty: fItem.rejected_weight,
        rejected_length: fItem.rejected_length,
        rejected_width: fItem.rejected_width,
        rejectedNos: fItem.rejected_nos,

        tcNo: (fItem.tc_no && fItem.tc_no.length > 0) ? fItem.tc_no.join(", ") : "",
        heat_no_data: details.length > 0
          ? details.map((d) => ({
            heat_no: d.heat_no,
            inspected_nos: Number(d.inspect_nos) || 0,
            inspected_length: d.inspect_length || "",
            inspected_width: d.inspect_width || "",
            tc_no: d.tc_no || ""
          }))
          : (fItem.heat_no && fItem.heat_no.length > 0)
            ? fItem.heat_no.map((h, idx) => ({
              heat_no: h,
              inspected_nos: idx === 0 ? (fItem.inspected_nos ?? 0) : 0,
              inspected_length: idx === 0 ? (fItem.inspected_length ?? "") : "",
              inspected_width: idx === 0 ? (fItem.inspected_width ?? "") : "",
              tc_no: (fItem.tc_no && fItem.tc_no[idx]) ? fItem.tc_no[idx] : ""
            }))
            : [
              {
                heat_no: "",
                inspected_nos: fItem.inspected_nos ?? 0,
                inspected_length: fItem.inspected_length ?? "",
                inspected_width: fItem.inspected_width ?? "",
                tc_no: ""
              }
            ],

        qcStatus: fItem.status === 1 ? 2 : 3,
        remarks: fItem.remarks || "",
      });
    }

    if (fim.status === 2) offer.status = 3;    // Approved
    else if (fim.status === 3) offer.status = 4; // Rejected
    else offer.status = 2;                      // Processing

    offer.acceptedBy = qcUser;
    offer.qc_date = new Date();


    if (!offer.offer_no || offer.offer_no === "") {
      let offerNo = "1";

      const lastOffer = await PurchaseOffer.findOne(
        { deleted: false, offer_no: { $regex: `/${PROJECT}/STR/FIM/INWARD/OFFER/` } },
        {},
        { sort: { createdAt: -1 } }
      );

      if (lastOffer?.offer_no) {
        const parts = lastOffer.offer_no.split("/");
        const last = parseInt(parts[parts.length - 1], 10);
        offerNo = isNaN(last) ? "1" : String(last + 1);
      }

      offer.offer_no =
        TitleFormat.FIMOFFERNO.replace("PROJECT", PROJECT) +
        String(offerNo);
    }
    console.log("Generated offer.offer_no:", offer.offer_no);

    // ---------------------------------------------
    // ⭐ GENERATE FIM IMIR NO USING TitleFormat
    // ---------------------------------------------
    if (!offer.imir_no || offer.imir_no.trim() === "") {
      let nextImir = 1;

      const lastImir = await PurchaseOffer.findOne(
        { deleted: false, imir_no: { $regex: `/${PROJECT}/STR/FIM/IMIR/` } },
        {},
        { sort: { createdAt: -1 } }
      );

      if (lastImir?.imir_no) {
        const parts = lastImir.imir_no.split("/");
        const last = parseInt(parts[parts.length - 1], 10);
        nextImir = isNaN(last) ? 1 : last + 1;
      }

      offer.imir_no =
        TitleFormat.FIMIMIRNO.replace("PROJECT", PROJECT) +
        String(nextImir);
    }


    await offer.save();

    // ==========================================
    // FIM ACCEPTANCE EMAIL NOTIFICATION
    // ==========================================

    try {

      const projectData = await Project.findById(
        fim.project
      ).select(
        " name work_order_no"
      );

      const qcUserDetails =
        await User.findById(
          qc_by || qcUser
        );

      const acceptanceRoles =
        await ErpRole.find({
          deleted: false,
          name: {
            $in: ["Planning Engineer"]
          }
        });

      const roleIds =
        acceptanceRoles.map(
          role => role._id
        );

      const users =
        await User.find({

          deleted: false,
          status: true,

          structureRole: {
            $in: roleIds
          },

          email: {
            $exists: true,
            $ne: ""
          }

        });

      // show actual FIM status only
    const fimStatusMap = {
      0: "Pending",
      1: "Sent To QC",
      2: "Accepted",
      3: "Rejected",
      4: "Partially Accepted"
    };

    const qcStatus =
      fimStatusMap[fim.status] || "Unknown";
      const accptanceDateTime =
        fim.qc_timestamp
          ? new Date(
              fim.qc_timestamp
            )
              .toLocaleString(
                "en-IN",
                {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true
                }
              )
              .replace("am","AM")
              .replace("pm","PM")
          : "-";

      for(const user of users){

        const emailHtml =
          commonStageAcceptanceEmail({

            userName:
              user?.user_name || "-",

            module:
              "Structural",

            stageName:
              "FIM Verification",

            reportNo:
              fim.report_no || "-",

            projectName:
              PROJECT || "-",

            workOrderNo:
              projectData?.work_order_no || "-",

            accptedBy:
              qcUserDetails?.user_name || "-",

            qcStatus,

            accptanceDateTime,

            remarks:
              `FIM verification has been completed by ${qcUserDetails?.user_name || "-"} with status ${qcStatus}.`,

            loginUrl:
              process.env.FRONTEND_URL

          });

        addEmailJob({

          to: user.email,

          subject:
            `FIM Verification - ${fim.report_no}`,

          html: emailHtml

        });

      }

      console.log(
        "FIM acceptance email jobs added"
      );

    }
    catch(error){
      console.log(
        "FIM EMAIL ERROR:",
        error
      );
    }
    return sendResponse(res, 200, true, {
      fim,
      purchase_offer: offer,
    }, "FIM verification updated & Purchase Offer synced");

  } catch (err) {
    console.error("verifyFimPacking error:", err);
    return sendResponse(res, 500, false, {}, "Server error: " + err.message);
  }
};


// const getOneFimPackingDetails = async (fim_id) => {
//   try {
//     const filter = {
//       deleted: false,
//       _id: new mongoose.Types.ObjectId(fim_id),
//     };

//     const data = await FimPackingList.aggregate([
//       { $match: filter },
//       {
//         $lookup: {
//           from: "bussiness-projects",
//           localField: "project",
//           foreignField: "_id",
//           as: "projectDetails",
//         },
//       },
//       { $unwind: "$projectDetails" },

//       // ⭐ ADD PARTY LOOKUP (from projectDetails.party → store-parties)
//       {
//         $lookup: {
//           from: "store-parties",
//           localField: "projectDetails.party",
//           foreignField: "_id",
//           as: "partyDetails",
//           pipeline: [{ $project: { _id: 0, name: 1 } }]
//         }
//       },
//       {
//         $unwind: {
//           path: "$partyDetails",
//           preserveNullAndEmptyArrays: true
//         }
//       },

//       // Received User
//       {
//         $lookup: {
//           from: "users",
//           localField: "received_by",
//           foreignField: "_id",
//           as: "receivedUser",
//           pipeline: [{ $project: { _id: 0, user_name: 1 } }],
//         },
//       },
//       { $unwind: "$receivedUser" },

//       { $unwind: "$items" },

//       // ITEM DETAILS
//       {
//         $lookup: {
//           from: "store-items",
//           localField: "items.item_id",
//           foreignField: "_id",
//           as: "itemDetails",
//           pipeline: [
//             { $project: { _id: 0, name: 1, detail: 1, material_grade: 1 } },
//           ]
//         }
//       },
//       { $unwind: "$itemDetails" },

//       // MANUFACTURER
//       {
//         $lookup: {
//           from: "store-parties",
//           let: { id: "$items.manufacture" },
//           pipeline: [
//             { $match: { $expr: { $eq: ["$_id", "$$id"] } } },
//             { $project: { _id: 0, name: 1 } }
//           ],
//           as: "manufactureDetails"
//         }
//       },
//       { $unwind: { path: "$manufactureDetails", preserveNullAndEmptyArrays: true } },

//       // OFFER DETAILS
//       {
//         $lookup: {
//           from: "erp-purchase-offers",
//           let: { fid: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ["$fim_id", "$$fid"] },
//                     { $eq: ["$deleted", false] },
//                     { $eq: ["$is_fim", true] },
//                   ],
//                 },
//               },
//             },
//             { $project: { offer_no: 1, qc_date: 1, acceptedBy: 1, imir_no: 1 } }
//           ],
//           as: "offerDetails",
//         },
//       },

//       // PROJECT HEADER
//       {
//         $project: {
//           headerInfo: {
//             project_name: "$projectDetails.name",
//             work_order_no: "$projectDetails.work_order_no",
//             packing_no: "$packing_no",
//             packing_date: "$packing_date",
//             supplier: "$supplier",
//             rgp_no: "$rgp_no",
//             fim_lot_no: "$fim_lot_no",
//             returnable_type: "$returnable_type",
//             received_by: "$receivedUser.user_name",
//             receiving_date: "$receiving_date",
//             vehicle_number: "$vehicle_number",
//             eway_bill: "$eway_bill",
//             report_no: "$report_no",
//             imir_no: { $arrayElemAt: ["$offerDetails.imir_no", 0] },
//             client: "$partyDetails.name",
//             send_qc_time: "$qc_timestamp",
//           },

//           items: {

//             item_name: "$itemDetails.name",
//             material_grade: "$itemDetails.material_grade",
//             manufacture: "$items.manufacture",
//             received_weight: "$items.received_weight",
//             inspected_weight: "$items.inspected_weight",
//             rejected_weight: "$items.rejected_weight",
//             received_length: "$items.received_length",
//             inspected_length: "$items.inspected_length",
//             rejected_length: "$items.rejected_length",
//             received_width: "$items.received_width",
//             inspected_width: "$items.inspected_width",
//             rejected_width: "$items.rejected_width",
//             received_nos: "$items.received_nos",
//             inspected_nos: "$items.inspected_nos",
//             rejected_nos: "$items.rejected_nos",
//             heat_no: "$items.heat_no",
//             tc_no: "$items.tc_no",
//             remarks: "$items.remarks",
//             status: "$items.status"
//           }
//         }
//       },

//       // GROUP BACK
//       {
//         $group: {
//           _id: "$_id",
//           headerInfo: { $first: "$headerInfo" },
//           items: { $push: "$items" },
//         }
//       }
//     ]);

//     if (data.length > 0) return { status: 1, result: data };
//     return { status: 0, result: [] };

//   } catch (err) {
//     console.log("FIM Aggregation ERROR:", err);
//     return { status: 2, result: err };
//   }
// };

const getOneFimPackingDetails = async (fim_id) => {
  try {
    const filter = {
      deleted: false,
      _id: new mongoose.Types.ObjectId(fim_id),
    };

    const data = await FimPackingList.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "bussiness-projects",
          localField: "project",
          foreignField: "_id",
          as: "projectDetails",
        },
      },
      { $unwind: "$projectDetails" },

      // ⭐ ADD PARTY LOOKUP (from projectDetails.party → store-parties)
      {
        $lookup: {
          from: "store-parties",
          localField: "projectDetails.party",
          foreignField: "_id",
          as: "partyDetails",
          pipeline: [{ $project: { _id: 0, name: 1 } }]
        }
      },
      {
        $unwind: {
          path: "$partyDetails",
          preserveNullAndEmptyArrays: true
        }
      },

      // Received User
      {
        $lookup: {
          from: "users",
          localField: "received_by",
          foreignField: "_id",
          as: "receivedUser",
          pipeline: [{ $project: { _id: 0, user_name: 1 } }],
        },
      },
      { $unwind: { path: "$receivedUser", preserveNullAndEmptyArrays: true } },

      // QC USER 
      {
        $lookup: {
          from: "users",
          localField: "qc_by",
          foreignField: "_id",
          as: "qcUser",
          pipeline: [{ $project: { _id: 0, user_name: 1 } }],
        },
      },
      { $unwind: { path: "$qcUser", preserveNullAndEmptyArrays: true } },

      // CLIENT USER
      {
        $lookup: {
          from: "users",
          localField: "client_user",
          foreignField: "_id",
          as: "clientUser",
          pipeline: [{ $project: { _id: 0, user_name: 1 } }],
        },
      },
      {
        $unwind: {
          path: "$clientUser",
          preserveNullAndEmptyArrays: true,
        },
      },

      { $unwind: "$items" },

      // ITEM DETAILS
      {
        $lookup: {
          from: "store-items",
          localField: "items.item_id",
          foreignField: "_id",
          as: "itemDetails",
          pipeline: [
            { $project: { _id: 0, name: 1, detail: 1, material_grade: 1 } },
          ]
        }
      },
      {
        $unwind: {
          path: "$itemDetails",
          preserveNullAndEmptyArrays: true
        }
      },

      // MANUFACTURER
      {
        $lookup: {
          from: "store-parties",
          let: { id: "$items.manufacture" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$id"] } } },
            { $project: { _id: 0, name: 1 } }
          ],
          as: "manufactureDetails"
        }
      },
      { $unwind: { path: "$manufactureDetails", preserveNullAndEmptyArrays: true } },

      // OFFER DETAILS
      {
        $lookup: {
          from: "erp-purchase-offers",
          let: { fid: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$fim_id", "$$fid"] },
                    { $eq: ["$deleted", false] },
                    { $eq: ["$is_fim", true] },
                  ],
                },
              },
            },
            { $project: { offer_no: 1, qc_date: 1, acceptedBy: 1, imir_no: 1 } }
          ],
          as: "offerDetails",
        },
      },

      // PROJECT HEADER
      {
        $project: {
          headerInfo: {
            project_name: "$projectDetails.name",
            work_order_no: "$projectDetails.work_order_no",
            packing_no: "$packing_no",
            packing_date: "$packing_date",
            supplier: "$supplier",
            rgp_no: "$rgp_no",
            fim_lot_no: "$fim_lot_no",
            returnable_type: "$returnable_type",
            received_by: "$receivedUser.user_name",
            received_signature: "$receivedUser.signature",
            receiving_date: "$receiving_date",
            vehicle_number: "$vehicle_number",
            eway_bill: "$eway_bill",
            report_no: "$report_no",
            imir_no: { $arrayElemAt: ["$offerDetails.imir_no", 0] },
            client: "$partyDetails.name",
            send_qc_time: "$qc_timestamp",
            //Qc 
            qc_by: "$qcUser.user_name",
            // qc_signature: "$qcUser.signature",
            qc_date: "$qc_timestamp",
            // ✅ CLIENT STATUS INFO
            status_type: "$status_type",
            client_status: "$client_status",
            client_date: "$client_date",
            client_user: "$clientUser.user_name",
            qc_timestamp: "$qc_timestamp",
            client_signature: "$clientUser.signature",

          },

          items: {
            item_name: "$itemDetails.name",
            material_grade: "$itemDetails.material_grade",
            manufacture: "$items.manufacture",
            received_weight: "$items.received_weight",
            inspected_weight: "$items.inspected_weight",
            rejected_weight: "$items.rejected_weight",
            received_length: "$items.received_length",
            inspected_length: {
              $cond: [
                { $gt: [{ $size: { $ifNull: ["$items.tc_heat_details", []] } }, 0] },
                {
                  $reduce: {
                    input: "$items.tc_heat_details",
                    initialValue: "",
                    in: {
                      $concat: [
                        "$$value",
                        { $cond: [{ $eq: ["$$value", ""] }, "", ", "] },
                        { $toString: { $ifNull: ["$$this.inspect_length", ""] } }
                      ]
                    }
                  }
                },
                "$items.inspected_length"
              ]
            },
            rejected_length: "$items.rejected_length",
            received_width: "$items.received_width",
            inspected_width: {
              $cond: [
                { $gt: [{ $size: { $ifNull: ["$items.tc_heat_details", []] } }, 0] },
                {
                  $reduce: {
                    input: "$items.tc_heat_details",
                    initialValue: "",
                    in: {
                      $concat: [
                        "$$value",
                        { $cond: [{ $eq: ["$$value", ""] }, "", ", "] },
                        { $toString: { $ifNull: ["$$this.inspect_width", ""] } }
                      ]
                    }
                  }
                },
                "$items.inspected_width"
              ]
            },
            rejected_width: "$items.rejected_width",
            received_nos: "$items.received_nos",
            inspected_nos: {
              $cond: [
                { $gt: [{ $size: { $ifNull: ["$items.tc_heat_details", []] } }, 0] },
                {
                  $reduce: {
                    input: "$items.tc_heat_details",
                    initialValue: "",
                    in: {
                      $concat: [
                        "$$value",
                        { $cond: [{ $eq: ["$$value", ""] }, "", ", "] },
                        { $toString: { $ifNull: ["$$this.inspect_nos", ""] } }
                      ]
                    }
                  }
                },
                "$items.inspected_nos"
              ]
            },
            rejected_nos: "$items.rejected_nos",
            heat_no: {
              $cond: [
                { $gt: [{ $size: { $ifNull: ["$items.tc_heat_details", []] } }, 0] },
                {
                  $reduce: {
                    input: "$items.tc_heat_details",
                    initialValue: "",
                    in: {
                      $concat: [
                        "$$value",
                        { $cond: [{ $eq: ["$$value", ""] }, "", ", "] },
                        { $ifNull: ["$$this.heat_no", ""] }
                      ]
                    }
                  }
                },
                {
                  $cond: [
                    { $isArray: "$items.heat_no" },
                    {
                      $reduce: {
                        input: "$items.heat_no",
                        initialValue: "",
                        in: {
                          $concat: [
                            "$$value",
                            { $cond: [{ $eq: ["$$value", ""] }, "", ", "] },
                            "$$this"
                          ]
                        }
                      }
                    },
                    "$items.heat_no"
                  ]
                }
              ]
            },
            tc_no: {
              $cond: [
                { $gt: [{ $size: { $ifNull: ["$items.tc_heat_details", []] } }, 0] },
                {
                  $reduce: {
                    input: "$items.tc_heat_details",
                    initialValue: "",
                    in: {
                      $concat: [
                        "$$value",
                        { $cond: [{ $eq: ["$$value", ""] }, "", ", "] },
                        { $ifNull: ["$$this.tc_no", ""] }
                      ]
                    }
                  }
                },
                {
                  $cond: [
                    { $isArray: "$items.tc_no" },
                    {
                      $reduce: {
                        input: "$items.tc_no",
                        initialValue: "",
                        in: {
                          $concat: [
                            "$$value",
                            { $cond: [{ $eq: ["$$value", ""] }, "", ", "] },
                            "$$this"
                          ]
                        }
                      }
                    },
                    "$items.tc_no"
                  ]
                }
              ]
            },
            remarks: "$items.remarks",
            status: "$items.status",
            selected: "$items.selected",
            tc_heat_details: "$items.tc_heat_details",
          }
        }
      },

      // GROUP BACK
      {
        $group: {
          _id: "$_id",
          headerInfo: { $first: "$headerInfo" },
          items: { $push: "$items" },
        }
      }
    ]);

    console.log("getOneFimPackingDetails data:", data);

    if (data.length > 0) return { status: 1, result: data };
    return { status: 0, result: [] };

  } catch (err) {
    console.log("FIM Aggregation ERROR:", err);
    return { status: 2, result: err };
  }
};

// =======================
//  DOWNLOAD FIM PDF
// =======================
exports.downloadFimPackingPdf = async (req, res) => {
  const { fim_id, print_date } = req.body;
  console.log("fim_id:", fim_id);
  console.log("print_date:", print_date);

  if (!(req.user && !req.error)) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  try {
    const data = await getOneFimPackingDetails(fim_id);
    let result = data.result;

    if (data.status !== 1 || result.length === 0) {
      return sendResponse(res, 404, false, {}, "FIM Packing List not found");
    }

    const headerInfo = result[0].headerInfo;
    const items = result[0].items;

    // 1️⃣ Load HTML template
    const template = fs.readFileSync(
      "templates/FIMInspectionItem.html",
      "utf-8"
    );

    const renderedHtml = ejs.render(template, {
      headerInfo,
      items,
      print_date,
      logoUrl1: process.env.LOGO_URL_1,
      logoUrl2: process.env.LOGO_URL_2,
    });

    // 2️⃣ Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: PATH,
    });

    const page = await browser.newPage();

    await page.setContent(renderedHtml, {
      baseUrl: `${URI}`,
    });

    // 3️⃣ Create PDF directly (no generatePDF function)
    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: "20px", bottom: "20px", left: "10px", right: "10px" },
    });

    await browser.close();

    // 4️⃣ Save PDF to folder
    const pdfsDir = path.join(__dirname, "../../../pdfs");
    if (!fs.existsSync(pdfsDir)) fs.mkdirSync(pdfsDir);

    const filename = `fim_packing_${Date.now()}.pdf`;
    const filePath = path.join(pdfsDir, filename);

    fs.writeFileSync(filePath, pdfBuffer);

    const fileUrl = `${URI}/pdfs/${filename}`;

    console.log("Generated FIM PDF:", fileUrl);

    return sendResponse(res, 200, true, { file: fileUrl }, "PDF downloaded Successfully");

  } catch (error) {
    console.log("FIM PDF ERROR:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong while generating PDF");
  }
};



exports.exportFimPackingListExcel = async (req, res) => {
  try {
    const { project } = req.body;

    // ---------- Base filter ----------
    const filter = { deleted: false };
    if (project && mongoose.Types.ObjectId.isValid(project)) {
      filter.project = new mongoose.Types.ObjectId(project);
    }

    // ---------- Fetch FIM Packing Lists ----------
    const packingLists = await FimPackingList.find(filter)
      .populate("project", "name code")
      .populate("received_by", "user_name email")
      .populate("items.item_id", "name code material_grade unit")
      .lean();

    // ---------- Create workbook ----------
    const wb = XLSX.utils.book_new();

    packingLists.forEach((pl, idx) => {
      const rows = [];

      // ---- Header section ----
      rows.push(["FIM Packing List", `#${idx + 1}`]);
      rows.push(["Project", `${pl.project?.name || ""} (${pl.project?.code || ""})`]);
      rows.push(["Packing No", pl.packing_no]);
      rows.push(["Packing Date", pl.packing_date ? new Date(pl.packing_date).toLocaleDateString() : ""]);
      rows.push(["RGP No", pl.rgp_no || ""]);
      rows.push(["FIM Lot No", pl.fim_lot_no || ""]);
      rows.push(["Returnable Type", pl.returnable_type || ""]);
      rows.push(["Supplier", pl.supplier || ""]);
      rows.push(["Vehicle Number", pl.vehicle_number || ""]);
      rows.push(["E-way Bill", pl.eway_bill || ""]);
      rows.push(["Received By", pl.received_by?.user_name || ""]);
      rows.push(["Receiving Date", pl.receiving_date ? new Date(pl.receiving_date).toLocaleDateString() : ""]);
      rows.push(["Status", pl.status === 0 ? "Pending" : pl.status === 1 ? "Send to QC" : pl.status === 2 ? "Completed" : "Rejected"]);
      rows.push([]); // blank row

      // ---- Items table ----
      rows.push([
        "S.No",
        "Item Code",
        "Item Name",
        "Material Grade",
        "Unit",
        "Weight as per List (Kg)",
        "Nos. as per List",
        "Received Weight",
        "Received Length (mm)",
        "Received Width (mm)",
        "Received Nos.",
        "Rejected Weight",
        "Rejected Length (mm)",
        "Rejected Width (mm)",
        "Rejected Nos.",
        "Item Status",
        "Remarks",
      ]);

      pl.items.forEach((it, i) => {
        rows.push([
          i + 1,
          it.item_id?.code || "",
          it.item_id?.name || "",
          it.item_id?.material_grade || "",
          it.item_id?.unit?.name || "",
          it.weight_as_per_list || 0,
          it.numbers_as_per_list || 0,
          it.received_weight || 0,
          it.received_length || 0,
          it.received_width || 0,
          it.received_nos || 0,
          it.rejected_weight || 0,
          it.rejected_length || 0,
          it.rejected_width || 0,
          it.rejected_nos || 0,
          it.status === 0 ? "Pending" : it.status === 1 ? "Approved" : "Rejected",
          it.remarks || "",
        ]);
      });

      rows.push([]); // blank row

      // ---- Summary ----
      rows.push([
        "Summary",
        "",
        "",
        "",
        "",
        "Total Received Weight",
        pl.items.reduce((sum, it) => sum + (it.received_weight || 0), 0),
        "Total Received Nos.",
        pl.items.reduce((sum, it) => sum + (it.received_nos || 0), 0),
        "Total Rejected Weight",
        pl.items.reduce((sum, it) => sum + (it.rejected_weight || 0), 0),
        "Total Rejected Nos.",
        pl.items.reduce((sum, it) => sum + (it.rejected_nos || 0), 0),
      ]);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, `Packing_${idx + 1}`);
    });

    // ---------- Save Excel to server ----------
    const excelDir = path.join(__dirname, "../../../xlsx");
    if (!fs.existsSync(excelDir)) {
      fs.mkdirSync(excelDir, { recursive: true });
    }

    const filename = `FIM_${Date.now()}.xlsx`;
    const filePath = path.join(excelDir, filename);
    XLSX.writeFile(wb, filePath);

    const fileUrl = `${process.env.PDF_URL}/excels/${filename}`;
    return sendResponse(res, 200, true, { file: fileUrl }, "Excel generated and saved successfully");
  } catch (error) {
    console.error("Excel export error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong while exporting FIM Excel");
  }
};

// Client Review 
exports.getFimPackingListclient = async (req, res) => {
  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }
  try {
    const { project, page, limit } = req.body;
    const { status, search } = req.query;

    const filter = { deleted: false, status: 2 };

    if (project && mongoose.Types.ObjectId.isValid(project)) {
      filter.project = new mongoose.Types.ObjectId(project);
    }

    if (status) {
      filter.status = Number(status);
    }

    const pageNumber = page ? parseInt(page) : null;
    const limitNumber = limit ? parseInt(limit) : null;
    const skip = pageNumber && limitNumber ? (pageNumber - 1) * limitNumber : 0;

    let searchQuery = {};
    if (search) {
      const regex = new RegExp(search, "i");
      searchQuery = {
        $or: [
          { packing_no: regex },
          { rgp_no: regex },
          { fim_lot_no: regex },
          { eway_bill: regex },
          { vehicle_number: regex },
          { supplier: regex },
          { "project.name": regex },
          { "project.code": regex },
          { "items.item_id.name": regex },
          { "items.item_id.code": regex },
          { "items.item_id.material_grade": regex },
          { "items.item_id.unit.name": regex },
        ],
      };
    }

    const pipeline = [
      { $match: filter },

      // -------- Project Lookup --------
      {
        $lookup: {
          from: "bussiness-projects",
          localField: "project",
          foreignField: "_id",
          as: "project",
        },
      },
      { $unwind: "$project" },

      // -------- Received By Lookup --------
      {
        $lookup: {
          from: "users",
          localField: "received_by",
          foreignField: "_id",
          as: "received_by",
        },
      },
      { $unwind: { path: "$received_by", preserveNullAndEmptyArrays: true } },

      // -------- Store Items Lookup --------
      {
        $lookup: {
          from: "store-items",
          localField: "items.item_id",
          foreignField: "_id",
          as: "items_info",
        },
      },

      // -------- Units Lookup --------
      {
        $lookup: {
          from: "store-item-units",
          localField: "items_info.unit",
          foreignField: "_id",
          as: "units_info",
        },
      },

      // -------- Corrected Item + Unit Merge --------
      {
        $addFields: {
          items: {
            $map: {
              input: "$items",
              as: "i",
              in: {
                $mergeObjects: [
                  "$$i",
                  {
                    item_id: {
                      $let: {
                        vars: {
                          itemObj: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: "$items_info",
                                  cond: { $eq: ["$$this._id", "$$i.item_id"] },
                                },
                              },
                              0,
                            ],
                          },
                        },
                        in: {
                          $mergeObjects: [
                            "$$itemObj",
                            {
                              unit: {
                                $arrayElemAt: [
                                  {
                                    $filter: {
                                      input: "$units_info",
                                      cond: { $eq: ["$$this._id", "$$itemObj.unit"] },
                                    },
                                  },
                                  0,
                                ],
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },

      { $match: searchQuery },

      { $sort: { createdAt: -1 } },

      {
        $project: {
          _id: 1,
          packing_no: 1,
          packing_date: 1,
          vehicle_number: 1,
          rgp_no: 1,
          fim_lot_no: 1,
          supplier: 1,
          status: 1,
          send_to_qc: 1,
          createdAt: 1,
          returnable_type: 1,
          eway_bill: 1,
          project: { _id: 1, name: 1, code: 1 },
          received_by: { _id: 1, user_name: 1, email: 1 },
          items: 1,
          client_status: 1,
          status_type: 1,
        },
      },
    ];

    // -------- Pagination --------
    if (pageNumber && limitNumber) {
      pipeline.push({
        $facet: {
          data: [{ $skip: skip }, { $limit: limitNumber }],
          totalCount: [{ $count: "count" }],
        },
      });
    } else {
      pipeline.push({
        $facet: {
          data: [{ $match: {} }],
          totalCount: [{ $count: "count" }],
        },
      });
    }

    const packingLists = await FimPackingList.aggregate(pipeline);

    const result = packingLists[0] || { data: [], totalCount: [] };
    const totalItems = result.totalCount.length > 0 ? result.totalCount[0].count : 0;

    return sendResponse(
      res,
      200,
      true,
      {
        data: result.data,
        pagination:
          pageNumber && limitNumber
            ? {
              totalItems,
              currentPage: pageNumber,
              totalPages: Math.ceil(totalItems / limitNumber),
              limit: limitNumber,
            }
            : null,
      },
      "FIM Packing Lists fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching FIM Packing Lists by project:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};


// Update Client status 
exports.updateFimClientStatus = async (req, res) => {
  const { fimId, status_type, items, client_date, client_user } = req.body;

  if (req.user && !req.error) {
    try {
      // Validate fimId
      if (!fimId || !mongoose.Types.ObjectId.isValid(fimId)) {
        return sendResponse(res, 400, false, {}, "Invalid or missing fimId");
      }

      // Validate status_type
      const validStatusTypes = ["REVIEWED", "WITNESSED", "RANDOM WITNESSED"];
      if (status_type && !validStatusTypes.includes(status_type)) {
        return sendResponse(res, 400, false, {}, "Invalid status_type");
      }

      // Find FIM Packing List
      const fim = await FimPackingList.findById(fimId);
      if (!fim) {
        return sendResponse(res, 404, false, {}, "FIM Packing List not found");
      }

      // Update status_type
      if (status_type) fim.status_type = status_type;

      // RANDOM WITNESSED → update selected & remarks item-wise
      if (status_type === "RANDOM WITNESSED" && Array.isArray(items)) {
        items.forEach((itemUpdate) => {
          const item = fim.items.id(itemUpdate._id);
          if (item) {
            item.selected = itemUpdate.selected;
            item.remarks = itemUpdate.remarks;
          }
        });

        fim.client_status = 1; // Approved
        fim.client_date = client_date;
        fim.client_user = client_user;
      }

      // WITNESSED → select all items
      else if (status_type === "WITNESSED") {
        fim.items.forEach((item) => {
          item.selected = true;
        });

        fim.client_status = 1;
        fim.client_date = client_date;
        fim.client_user = client_user;
      }

      // REVIEWED → only header-level approval
      else if (status_type === "REVIEWED") {
        fim.client_status = 1;
        fim.client_date = client_date;
        fim.client_user = client_user;
      }

      await fim.save();

      return sendResponse(
        res,
        200,
        true,
        { fim },
        "FIM Client Status Updated Successfully"
      );
    } catch (err) {
      console.error("Error updating FIM client status:", err);
      return sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }
};




// =======================
//  DOWNLOAD FIM PDF
// =======================
exports.downloadFimPackingPdfClient = async (req, res) => {
  const { fim_id, print_date } = req.body;

  if (!(req.user && !req.error)) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const data = await getOneFimPackingDetails(fim_id);
    const result = data.result;

    if (data.status !== 1 || !result.length) {
      return res
        .status(404)
        .json({ success: false, message: "FIM Packing List not found" });
    }

    const headerInfo = result[0].headerInfo;
    const items = result[0].items;

    // 1️⃣ Load HTML template
    const template = fs.readFileSync(
      "templates/FIMInspectionItem.html",
      "utf-8"
    );

    const renderedHtml = ejs.render(template, {
      headerInfo,
      items,
      print_date,
      logoUrl1: process.env.LOGO_URL_1,
      logoUrl2: process.env.LOGO_URL_2,
    });

    // 2️⃣ Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: PATH,
    });

    const page = await browser.newPage();
    await page.setContent(renderedHtml, { waitUntil: "networkidle0" });

    // 3️⃣ Generate PDF BUFFER
    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: {
        top: "20px",
        bottom: "20px",
        left: "10px",
        right: "10px",
      },
    });

    await browser.close();

    // 🔥 VERY IMPORTANT HEADERS (same as QC)
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "inline; filename=fim_packing.pdf"
    );
    res.setHeader("Content-Length", pdfBuffer.length);

    // 🔥 SEND PDF AS BLOB
    return res.end(pdfBuffer);

  } catch (error) {
    console.error("FIM PDF ERROR:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};
