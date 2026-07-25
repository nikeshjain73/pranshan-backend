const MaterialMto = require('../../models/material_procurement/material_mto.model');
const { downloadFormat, padWithLeadingZeros, generateExcel } = require("../../helper/index");
const {sendResponse} = require("../../helper/response");// ...existing code...
const mongoose = require("mongoose");
const ejs = require("ejs");
const fs = require("fs");
const path = require("path");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;
const puppeteer = require("puppeteer");
const Item = require("../../models/store/item.model");
const XLSX = require('xlsx');  // for utility functions
const XLSXStyle = require('xlsx-style');  // for styling
const upload = require('../../helper/multerConfig');
const ObjectId = mongoose.Types.ObjectId;
const Project = require("../../models/project.model");
const ussableStockList = require("../../models/store/usable_stock.model");

// ---------------- FETCH LAST MTO ----------------
async function getLastMto(projectName) {
  try {
    const pipeline = [
      {
        $match: {
          poNumber: {
            $regex: `^VE/${projectName}/STR/MTO/\\d+`,
            $options: "i"
          },
          deleted: false
        }
      },
      {
        $addFields: {
          seqNumber: {
            $toInt: {
              $arrayElemAt: [
                { $split: ["$poNumber", "/"] },
                -1
              ]
            }
          }
        }
      },
      { $sort: { seqNumber: -1 } },
      { $limit: 1 },
      { $project: { _id: 1, poNumber: 1, seqNumber: 1, createdAt: 1 } }
    ];

    const [lastMto] = await MaterialMto.aggregate(pipeline);
    console.log("Last MTO fetched for project", projectName, ":", lastMto);
    return lastMto || null;
  } catch (error) {
    console.error("Error fetching last MTO:", error);
    throw error;
  }
}

// ---------------- GENERATE NEXT MTO NUMBER ----------------
async function getNextMtoNumber(projectName) {
  const lastMto = await getLastMto(projectName);

  let nextNo = "1"; // default
  if (lastMto && lastMto.seqNumber) {
    nextNo = String(lastMto.seqNumber + 1);
  }

  return `VE/${projectName}/STR/MTO/${nextNo}`;
}

// ---------------- CREATE / UPDATE MATERIAL MTO ----------------
// exports.manageMaterialMto = async (req, res) => {
//   try {
      
//     const { id, project,  created, areaBuilding, } = req.body;
//     const items = req.body.items || [];

//     if (!req.user || req.error) {
//       return sendResponse(res, 401, false, {}, "Unauthorized");
//     }

//     if (!project || !areaBuilding || !created) {
//       return sendResponse(res, 400, false, {}, "Missing parameters");
//     }

//     if (!mongoose.Types.ObjectId.isValid(project)) {
//       return sendResponse(res, 400, false, {}, "Invalid project ID");
//     }

//     const projectDoc = await Project.findById(project).select("name code");
//     if (!projectDoc || !projectDoc.name) {
//       return sendResponse(res, 404, false, {}, "Project not found or missing name");
//     }

//     const projectName = projectDoc.name;
//     const date = new Date();
//     // --- CREATE ---
//     if (!id) {
//       const poNumber = await getNextMtoNumber(projectName);

//       const exists = await MaterialMto.findOne({
//         project: new ObjectId(project),
//         poNumber,
//         areaBuilding,
//         deleted: false
//       });

//       if (exists) {
//         return sendResponse(res, 400, false, {}, "Material MTO already exists");
//       }

     

//       const newMto = new MaterialMto({
//         project,
//         poNumber,
//         date,
//         areaBuilding,
//         created,
//         items
//       });

//       const savedMto = await newMto.save();
//       return sendResponse(res, 200, true, savedMto, "Material MTO created successfully");

//     } else {
//       // --- UPDATE ---
//       const updated = await MaterialMto.findOneAndUpdate(
//         { _id: id, deleted: false },
//         { project, date, items, areaBuilding, },
//         { new: true }
//       )
//         .populate("project")
//         .populate("items.item");

//       return sendResponse(res, 200, true, updated, "Material MTO updated successfully");
//     }

//   } catch (error) {
//     console.error("manageMaterialMto error:", error);
//     return sendResponse(res, 500, false, {}, "Something went wrong");
//   }
// };

exports.manageMaterialMto = async (req, res) => {
  try {
    const { id, project, created, areaBuilding, poNumber } = req.body;
    const items = req.body.items || [];

    if (!req.user || req.error) {
      return sendResponse(res, 401, false, {}, "Unauthorized");
    }

    if (!project || !areaBuilding || !created) {
      return sendResponse(res, 400, false, {}, "Missing parameters");
    }

    if (!mongoose.Types.ObjectId.isValid(project)) {
      return sendResponse(res, 400, false, {}, "Invalid project ID");
    }

    const projectDoc = await Project.findById(project).select("name");
    if (!projectDoc) {
      return sendResponse(res, 404, false, {}, "Project not found");
    }

    const date = new Date();

    /* ======================================================
       CREATE OR FETCH
    ====================================================== */
    if (!id) {
      const newPoNumber = await getNextMtoNumber(projectDoc.name);

      const newMto = new MaterialMto({
        project,
        poNumber: newPoNumber,
        date,
        areaBuilding,
        created,
        items,
      });

      const savedMto = await newMto.save();

      return sendResponse(
        res,
        200,
        true,
        savedMto,
        "Material MTO created successfully"
      );
    }

    /* ======================================================
       UPDATE (poNumber CHECK)
    ====================================================== */

    if (!poNumber) {
      return sendResponse(res, 400, false, {}, "poNumber is required for update");
    }

    // 🔎 Ensure MTO exists with matching poNumber
    const existingMto = await MaterialMto.findOne({
      _id: id,
      poNumber,
      deleted: false,
    });

    if (!existingMto) {
      return sendResponse(
        res,
        404,
        false,
        {},
        "Material MTO not found or poNumber mismatch"
      );
    }

    existingMto.items = items;
    existingMto.areaBuilding = areaBuilding;
    existingMto.date = date;

    const updated = await existingMto.save();

    await updated.populate("project items.item");

    return sendResponse(
      res,
      200,
      true,
      updated,
      "Material MTO updated successfully"
    );

  } catch (error) {
    console.error("manageMaterialMto error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};


// Manage Material MTO Items (add / update)
exports.manageMtoItems = async (req, res) => {
  try {
    const {
      mto_id,   // required: existing MTO ID
      item_id,
      id,
      material_grade,
      gadClientQty,
      fabDrawingQty,
      contingency,
      usableStock,
      usableStockId,
      orderedQty,
      remarks
    } = req.body;


    // Validate required fields
    if (!mto_id || !item_id ) {
      return sendResponse(res, 400, false, {}, "Missing required fields");
    }


    // Find existing MTO
    const mtoDoc = await MaterialMto.findById(mto_id);
    if (!mtoDoc) {
      return sendResponse(res, 404, false, {}, "Material MTO not found");
    }
    const contingencyPercent = (Number(contingency) || 0) / 100;
    const materialRequirement = (Number(fabDrawingQty) || 0) + (Number(gadClientQty) || 0) +
          ((Number(fabDrawingQty) || 0) * (Number(contingencyPercent) || 0)) +
          ((Number(gadClientQty) || 0) * (Number(contingencyPercent) || 0));

    if (id) {
      // --- Update Existing Item ---
      const item = mtoDoc.items.id(id);
      if (!item) {
        return sendResponse(res, 404, false, {}, "Item not found in this MTO");
      }

      item.entryDate = new Date(new Date().setHours(0, 0, 0, 0));
      item.item = item_id;
      item.gadClientQty = gadClientQty;
      item.fabDrawingQty = fabDrawingQty;
      item.contingency = contingency
      item.materialRequirement = materialRequirement;
      item.usableStock = usableStock;
      item.usableStockId = usableStockId ? new ObjectId(usableStockId) : null;
      item.orderedQty = orderedQty ;
      item.balanceQty = orderedQty;
      item.rev = item.rev + 1;
      item.remarks = remarks;

      if (usableStockId) {
        const stockDoc = await ussableStockList.findById(usableStockId);
        if (stockDoc && !stockDoc.issued) {
          stockDoc.issued = true;
          await stockDoc.save();
        }
      }


    } else {
      // --- Add New Item

      mtoDoc.items.push({
        entryDate: new Date(new Date().setHours(0, 0, 0, 0)),
        item: item_id,
        gadClientQty,
        fabDrawingQty,
        materialRequirement: materialRequirement,
        contingency,
        usableStock : usableStock ?? 0,
        usableStockId: usableStockId ? new ObjectId(usableStockId) : null,
        orderedQty: orderedQty,
        balanceQty: orderedQty,
        rev: 0,
        remarks
      });

       if (usableStockId) {
        const stockDoc = await ussableStockList.findById(usableStockId);
        if (stockDoc && !stockDoc.issued) {
          stockDoc.issued = true;
          await stockDoc.save();
        }
      }
    }

    // ---------- Sync Material Grade with Item Master ----------
    const existingItem = await Item.findById(item_id);
    if (existingItem) {
      if (material_grade && existingItem.material_grade !== material_grade) {
        existingItem.material_grade = material_grade;
        await existingItem.save();
      }
    }

    const saved = await mtoDoc.save();
    return sendResponse(res, 200, true, saved, id ? "Item updated successfully" : "Item added successfully");

  } catch (error) {
    console.error("manageMtoItems error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

// ---------------- SET MTO STATUS TO 0 (Pending) ----------------
exports.setMtoPendingStatus = async (req, res) => {
  try {
    const { mtoId } = req.body; // get MTO ID from request

    if (!mtoId) {
      return sendResponse(res, 400, false, {}, "MTO ID is required");
    }

    const updatedMto = await MaterialMto.findByIdAndUpdate(
      mtoId,
      { status: 0 }, // set status to 0 (Pending)
      { new: true }
    );

    if (!updatedMto) {
      return sendResponse(res, 404, false, {}, "Material MTO not found");
    }

    return sendResponse(res, 200, true, updatedMto, "MTO status set to Pending successfully");
  } catch (error) {
    console.error("setMtoPendingStatus error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};


// ================ GET ALL ==================
exports.getAllMaterialMto = async (req, res) => {
  try {
    const { search, page, limit, status } = req.body;
    const project = req.query.project ?? req.body.project;

    // --- Base filter ---
    const filter = { deleted: false };

    if (project && mongoose.Types.ObjectId.isValid(project)) {
      filter.project = new mongoose.Types.ObjectId(project);
    }

    if (status !== undefined && [0, 1, 3, 4].includes(Number(status))) {
      filter.status = Number(status);
    }

    const pageNum = page ? parseInt(page, 10) : null;
    const limitNum = limit ? parseInt(limit, 10) : null;
    const skip = pageNum && limitNum ? (pageNum - 1) * limitNum : 0;

    // --- Aggregation pipeline ---
    const pipeline = [
      { $match: filter },

      { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },

      /* ---------------- ITEM LOOKUP ---------------- */
      {
        $lookup: {
          from: "store-items",
          let: { itemId: "$items.item" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$itemId"] } } },
            {
              $project: {
                name: 1,
                mcode: 1,
                material_grade: 1,
                ItemId: 1,
                purchase_rate: 1,
                sale_rate: 1,
                cost_rate: 1,
                gst_percentage: 1,
                unit: 1,
              },
            },
          ],
          as: "itemDetail",
        },
      },
      { $unwind: { path: "$itemDetail", preserveNullAndEmptyArrays: true } },

      /* ---------------- UNIT LOOKUP ---------------- */
      {
        $lookup: {
          from: "store-item-units",
          let: { unitId: "$itemDetail.unit" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$unitId"] } } },
            { $project: { name: 1 } },
          ],
          as: "unitDetail",
        },
      },
      { $unwind: { path: "$unitDetail", preserveNullAndEmptyArrays: true } },

      /* ---------------- AREA LOOKUP (FIXED) ---------------- */
      {
        $lookup: {
          from: "areas",
          let: { areaId: "$areaBuilding" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$areaId"] } } },
            { $project: { area: 1, building: 1 } },
          ],
          as: "areaDetail",
        },
      },
      { $unwind: { path: "$areaDetail", preserveNullAndEmptyArrays: true } },

      /* ---------------- CREATED USER ---------------- */
      {
        $lookup: {
          from: "users",
          let: { userId: "$created" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$userId"] } } },
            { $project: { user_name: 1, email: 1 } },
          ],
          as: "createdUser",
        },
      },
      { $unwind: { path: "$createdUser", preserveNullAndEmptyArrays: true } },

      /* ---------------- UPDATED USER ---------------- */
      {
        $lookup: {
          from: "users",
          let: { userId: "$updated" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$userId"] } } },
            { $project: { user_name: 1, email: 1 } },
          ],
          as: "updatedUser",
        },
      },
      { $unwind: { path: "$updatedUser", preserveNullAndEmptyArrays: true } },

      /* ---------------- MERGE FIELDS ---------------- */
      {
        $addFields: {
          items: {
            $mergeObjects: [
              "$items",
              {
                gadClientQty: { $toString: "$items.gadClientQty" },
                fabDrawingQty: { $toString: "$items.fabDrawingQty" },
                materialRequirement: { $toString: "$items.materialRequirement" },
                orderedQty: { $toString: "$items.orderedQty" },
                balanceQty: { $toString: "$items.balanceQty" },
                materail_received: { $toString: "$items.materail_received" },
                balance_to_receive: { $toString: "$items.balance_to_receive" },

                item: {
                  _id: "$itemDetail._id",
                  name: "$itemDetail.name",
                  mcode: "$itemDetail.mcode",
                  material_grade: "$itemDetail.material_grade",
                  ItemId: { $toString: "$itemDetail.ItemId" },
                  purchase_rate: { $toString: "$itemDetail.purchase_rate" },
                  sale_rate: { $toString: "$itemDetail.sale_rate" },
                  cost_rate: { $toString: "$itemDetail.cost_rate" },
                  gst_percentage: { $toString: "$itemDetail.gst_percentage" },
                  unit: {
                    _id: "$unitDetail._id",
                    name: "$unitDetail.name",
                  },
                },
              },
            ],
          },
          areaBuilding: {
                _id: "$areaDetail._id",
                area: "$areaDetail.area",
                building: "$areaDetail.building",
              },
          created: "$createdUser",
          updated: "$updatedUser",
        },
      },

      /* ---------------- GROUP BACK ---------------- */
      {
        $group: {
          _id: "$_id",
          doc: { $first: "$$ROOT" },
          items: { $push: "$items" },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$doc", { items: "$items" }],
          },
        },
      },
    ];

    // --- Search ---
    if (search && search.trim()) {
      const regex = new RegExp(search, "i");
      pipeline.push({
        $match: {
          $or: [
            { poNumber: regex },
            { date: regex },
            { "items.remarks": regex },
            { "items.prNo": regex },
            { "items.areaBuilding.area": regex },
            { "items.rev": regex },
            { "items.item.name": regex },
            { "items.item.mcode": regex },
            { "items.item.material_grade": regex },
            { "items.item.unit.name": regex }, // ✅ unit search
          ],
        },
      });
    }

    pipeline.push({ $sort: { createdAt: -1 } });

    if (pageNum && limitNum) {
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limitNum });
    }

    const list = await MaterialMto.aggregate(pipeline);

    let total = null;
    if (pageNum && limitNum) {
      const countPipeline = pipeline.filter(
        (p) => !("$skip" in p || "$limit" in p)
      );
      total =
        (await MaterialMto.aggregate([
          ...countPipeline,
          { $count: "total" },
        ]))[0]?.total || 0;
    }

    return sendResponse(
      res,
      200,
      true,
      {
        data: list,
        total: total ?? list.length,
        page: pageNum || null,
        limit: limitNum || null,
        totalPages:
          pageNum && limitNum ? Math.ceil(total / limitNum) : null,
      },
      "Material MTO list fetched successfully"
    );
  } catch (error) {
    console.error("getAllMaterialMto error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};


// ---------------- GET BY ID ----------------
exports.getMaterialMtoById = async (req, res) => {
  try {
  const id = req.query.id || req.body.id;

    console.log("getMaterialMtoById called with id:", id);

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, 400, false, {}, "Invalid Material MTO ID");
    }

    const data = await MaterialMto.findOne({ _id: id, deleted: false })
      .populate("project","name")
      .populate({
             path: "items.item",
             select: "name mcode material_grade unit",
             populate: {
               path: "unit",
               select: "name", // ✅ This fetches the unit name
             },
           })
      

    if (!data) {
      return sendResponse(res, 404, false, {}, "Material MTO not found");
    }

    return sendResponse(res, 200, true, data, "Material MTO fetched successfully");
  } catch (error) {
    console.error("getMaterialMtoById error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

//-----------------------Get by area 
exports.getMaterialMtoByAreaBuilding = async (req, res) => {
  try {
    const {areaBuilding, project }=  req.body;

    if (!areaBuilding) {
      return sendResponse(res, 400, false, {}, "Area/Building is required");
    }

    // Find MTOs matching the areaBuilding and not deleted
    const data = await MaterialMto.find({ areaBuilding: areaBuilding, project:project, deleted: false })
      .populate("project","name")
      .populate({
        path: "items.item",
        select: "name mcode material_grade unit",
        populate: {
          path: "unit",
          select: "name", // ✅ This fetches the unit name
        },
      });

    if (!data || data.length === 0) {
      return sendResponse(res, 200, true, {}, "No Material MTO found for this Area/Building");
    }

    return sendResponse(res, 200, true, data, "Material MTOs fetched successfully");
  } catch (error) {
    console.error("getMaterialMtoByAreaBuilding error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};



// ---------------- DELETE (SOFT) ----------------
exports.deleteMaterialMto = async (req, res) => {
  try {
    const id  = req.query.id || req.body.id;
    console.log("deleteMaterialMto called with id:", id);

    const deletedMto = await MaterialMto.findByIdAndUpdate(
      { _id: id },
      { deleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!deletedMto) {
      return sendResponse(res, 404, false, {}, "Material MTO not found");
    }

    return sendResponse(res, 200, true, {}, "Material MTO deleted successfully");
  } catch (error) {
    console.error("deleteMaterialMto error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

// ---------------- DELETE ITEM (HARD) ----------------
exports.deleteMaterialMtoItem = async (req, res) => {
  try {
    const { mto_id, id } = req.body;
    console.log("deleteMaterialMtoItem called with mtoId:", mto_id, "and item id:", id);

    if (!mto_id || !id) {
      return sendResponse(res, 400, false, {}, "MTO ID and Item ID are required");
    }

    const updatedMto = await MaterialMto.findByIdAndUpdate(
      mto_id,
      { $pull: { items: { _id: id } } },
      { new: true }
    );

    if (!updatedMto) {
      return sendResponse(res, 404, false, {}, "Material MTO or Item not found");
    }

    return sendResponse(res, 200, true, {}, "Item removed successfully");
  } catch (error) {
    console.error("deleteMaterialMtoItem error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};


// =================== DOWNLOAD MATERIAL MTO (PDF) ===================
  exports.downloadMaterialMto = async (req, res) => {
    const { mto_id } = req.body;
    // Check user auth
    if (!req.user || req.error) {
      return sendResponse(res, 401, false, {}, "Unauthorized");
    }

    // Validate ObjectId
    if (!mto_id || !mongoose.Types.ObjectId.isValid(mto_id)) {
      return sendResponse(res, 400, false, {}, "Invalid MTO ID");
    }

    const mtoObjectId = new mongoose.Types.ObjectId(mto_id);

    try {
      // Fetch Material MTO
      const materialMto = await MaterialMto.findOne({ _id: mtoObjectId, deleted: false })
      .populate({
          path: "project",
          select: "name code party",
          populate: {
            path: "party",   // this points to store-parties
            select: "name address contact",
          },
        })
        .populate("areaBuilding", "area")
        .populate({
                path: "items.item",
                select: "name mcode material_grade unit",
                populate: {
                  path: "unit",
                  select: "name", // ✅ This fetches the unit name
                },
              })
        .populate({
          path: "items.usableStockId",
          select: "imir_no"
        });


      // Check if exists
      if (!materialMto) {
        return sendResponse(res, 404, false, {}, "Material MTO not found");
      }

      console.log("Fetched Material MTO for PDF:", materialMto._id);

      // Render HTML template
      const templatePath = path.join(__dirname, "../../templates/material_procurement/materialMTO.html");
      const template = fs.readFileSync(templatePath, "utf-8");

      const renderedHtml = ejs.render(template, {
        mto: materialMto.toObject(),
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
        format: "legal",
        landscape:true,
        printBackground: true,
        margin: { top: "20px", bottom: "20px", left: "10px", right: "10px" },
      });

      await browser.close();

      // Ensure /pdfs folder exists
      const pdfsDir = path.join(__dirname, "../../pdfs");
      if (!fs.existsSync(pdfsDir)) {
        fs.mkdirSync(pdfsDir, { recursive: true });
      }

      const filename = `MaterialMTO_${Date.now()}.pdf`;
      const filePath = path.join(pdfsDir, filename);
      fs.writeFileSync(filePath, pdfBuffer);

      const fileUrl = `${URI}/pdfs/${filename}`;

      return sendResponse(res, 200, true, { file: fileUrl }, "Material MTO PDF generated successfully");
    } catch (error) {
      console.error("downloadMaterialMto error:", error);
      return sendResponse(res, 500, false, {}, "Something went wrong while generating PDF");
    }
  };


// ======================= Chanege Status from MTO to PR =======================
// ✅ Update status from 0 → 1 (MTO → PR)
// exports.updateMtoToPr = async (req, res) => {
//   try {
//     const { id, updatedBy } = req.body; // user performing the update

//     const mto = await MaterialMto.findOneAndUpdate(
//       { _id: id, status: 0 }, // only update if status is 0
//       { $set: { status: 1, updated: updatedBy } },
//       { new: true }
//     );

//     if (!mto) {
//       return sendResponse(res, 404, false, null, "MTO not found or already converted to PR");
//     }

//     return sendResponse(res, 200, true, mto, "MTO status updated to PR successfully");
//   } catch (error) {
//     console.error("Error updating MTO status:", error);
//     return sendResponse(res, 500, false, null, error.message || "Server error while updating MTO status");
//   }
// };


// Bulk update MTOs to PR
exports.updateMultipleMtoToPr = async (req, res) => {
  try {
    const { ids, updatedBy } = req.body; // array of MTO IDs and user performing the update

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return sendResponse(res, 400, false, null, "No MTO IDs provided");
    }

    const result = await MaterialMto.updateMany(
      { _id: { $in: ids }, status: 0 }, // only update MTOs with status 0
      { $set: { status: 1, updated: updatedBy } }
    );

    if (result.modifiedCount === 0) {
      return sendResponse(res, 404, false, null, "No MTOs were updated. They might already be converted to PR.");
    }

    return sendResponse(res, 200, true, result, `${result.modifiedCount} MTO(s) updated to PR successfully`);
  } catch (error) {
    console.error("Error updating MTO statuses:", error);
    return sendResponse(res, 500, false, null, error.message || "Server error while updating MTO statuses");
  }
};


