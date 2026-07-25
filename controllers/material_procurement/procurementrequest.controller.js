const { downloadFormat, padWithLeadingZeros, generateExcel } = require("../../helper/index");
const {sendResponse} = require("../../helper/response");// ...existing code...
const { default: mongoose } = require("mongoose");
const ejs = require("ejs");
const fs = require("fs");
const path = require("path");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;
const puppeteer = require("puppeteer");
const Item = require("../../models/store/item.model");
const ProcurementRequest = require('../../models/material_procurement/procurementrequest.model');
const ObjectId = mongoose.Types.ObjectId;
const Project = require("../../models/project.model");
const MaterialMto = require('../../models/material_procurement/material_mto.model');


// fetch Last no 
async function getLastPr(projectName) {
  try {
    const pipeline = [
      {
        $match: {
          prNo: {
            $regex: `^VE/${projectName}/STR/PR/\\d+$`,
            $options: "i"
          }
        }
      },
      {
        $addFields: {
          prNumber: {
            $toInt: {
              $arrayElemAt: [
                { $split: ["$prNo", "/"] },
                -1
              ]
            }
          }
        }
      },
      { $sort: { prNumber: -1 } },
      { $limit: 1 },
      { $project: { _id: 1, prNo: 1, prNumber: 1, createdAt: 1 } }
    ];

    const [lastPr] = await ProcurementRequest.aggregate(pipeline);
    return lastPr || null;
  } catch (error) {
    console.error("Error fetching last PR:", error);
    throw error;
  }
}

// Helper: Generate next PR number
async function getNextPrNo(projectName) {
  const lastPr = await getLastPr(projectName);

  let nextNo = "1"; // default
  if (lastPr && lastPr.prNumber) {
    nextNo = String(lastPr.prNumber + 1) // always 3 digits
  }

  return `VE/${projectName}/STR/PR/${nextNo}`;
}

// ---------------- CREATE / UPDATE PROCUREMENT REQUEST ----------------
exports.manageProcurementRequest = async (req, res) => {
  try {
    let {
      id,
      project,
      prNo,
      date,
      items,
      totalQty,
      preparedBy,
      reviewedBy,
      remarks,
      approvedmake,
      mtc,
      delivery_location,
      other_note,
    } = req.body;

    console.log("Managing Procurement Request:", req.body);

    // --- VALIDATION ---
    if (!project || !items || !totalQty || !preparedBy) {
      return sendResponse(res, 400, false, {}, "Missing required fields");
    }

    if (!mongoose.Types.ObjectId.isValid(project)) {
      return sendResponse(res, 400, false, {}, "Invalid projectID");
    }

    project = new ObjectId(project);
    const projectDoc = await Project.findById(project).select("name");
    if (!projectDoc || !projectDoc.name) {
      return sendResponse(res, 404, false, {}, "Project not found or missing name");
    }

    // Clean other_note
    if (Array.isArray(other_note)) {
      other_note = other_note
        .map(n => (typeof n === "string" ? n.trim() : ""))
        .filter(n => n.length > 0);

      if (other_note.length === 0) {
        other_note = undefined; // remove completely
      }
    } else {
      other_note = undefined;
    }

    // --- CREATE NEW ---
    if (!id) {
      // Generate PR number if not provided
      if (!prNo) {
        prNo = await getNextPrNo(projectDoc.name); // e.g., VE/<NAME>/PR/001
      }

      const newPr = new ProcurementRequest({
        project,
        prNo,
        revNo: 0,
        date: date || Date.now(),
        items: items.map(it => ({
          ...it,
          balance_qty: it.prQty || 0
        })),
        totalQty,
        preparedBy,
        remarks,
        approvedmake,
        mtc,
        delivery_location,
         ...(other_note && { other_note }), // ✅ only add if exists
      });

      const savedPr = await newPr.save();


      console.log("Saved Procurement Request:", savedPr);

      // --- UPDATE MTO ITEMS BALANCE ---
      const mtoUpdates = [];
      for (const it of items) {
        console.log(it);
        const mtoDoc = await MaterialMto.findById(it.mto);
        if (!mtoDoc) continue;

      const mtoItem = mtoDoc.items.find(i => i.item.toString() === it.item.toString());
        if (!mtoItem) continue;

        mtoItem.prqty += it.prQty;
        mtoItem.balanceQty -= it.prQty;

        mtoUpdates.push(mtoDoc.save());
      }
      await Promise.all(mtoUpdates);

      return sendResponse(res, 200, true, savedPr, "Procurement Request created successfully");
    }

    // --- UPDATE EXISTING ---
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      const existingPr = await ProcurementRequest.findById(id);
      if (!existingPr) {
        return sendResponse(res, 404, false, {}, "Procurement Request not found");
      }

      // --- RESTORE PREVIOUS MTO ITEMS BALANCE ---
      const restoreUpdates = [];
      for (const oldItem of existingPr.items) {
        const mtoDoc = await MaterialMto.findById(oldItem.mto);
        if (!mtoDoc) continue;

        const mtoItem = mtoDoc.items.id(oldItem.item);
        if (!mtoItem) continue;

        mtoItem.prqty -= oldItem.prQty;
        mtoItem.balanceQty += oldItem.prQty;

        restoreUpdates.push(mtoDoc.save());
      }
      await Promise.all(restoreUpdates);

      // Adjust balance_qty for items
      const updatedItems = items.map(newItem => {
        const itemId = newItem.item?._id || newItem.item;
        const oldItem = existingPr.items.find(it => it.item.toString() === itemId.toString());
        if (oldItem) {
          const diff = (newItem.prQty || 0) - (oldItem.prQty || 0);
          return {
            ...newItem,
            balance_qty: Math.max(0, (oldItem.balance_qty || 0) + diff)
          };
        } else {
          return {
            ...newItem,
            balance_qty: newItem.prQty || 0
          };
        }
      });

      // --- UPDATE PR ---
      const updatedPr = await ProcurementRequest.findByIdAndUpdate(
        id,
        {
          project,
          prNo,
          revNo: (existingPr.revNo || 0) + 1,
          date: date || Date.now(),
          items: updatedItems,
          totalQty,
          preparedBy,
          reviewedBy,
          remarks,
          approvedmake,
          mtc,
          delivery_location,
          ...(other_note !== undefined
          ? { other_note }       // update if valid
          : { $unset: { other_note: "" } }), // ❗ remove from DB if empty
        },
        { new: true }
      );

      // --- UPDATE MTO ITEMS BALANCE WITH NEW PR ---
      const mtoUpdates = [];
      for (const it of items) {
        const mtoDoc = await MaterialMto.findById(it.mto);
        if (!mtoDoc) continue;

        const mtoItem = mtoDoc.items.id(it.item);
        if (!mtoItem) continue;

        mtoItem.prqty += it.prQty;
        mtoItem.balanceQty -= it.prQty;

        mtoUpdates.push(mtoDoc.save());
      }
      await Promise.all(mtoUpdates);

      return sendResponse(res, 200, true, updatedPr, "Procurement Request updated successfully");
    }

    return sendResponse(res, 400, false, {}, "Invalid request");
  } catch (error) {
    console.error("manageProcurementRequest error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};


// ---------------- GET ALL PROCUREMENT REQUESTS ----------------
exports.getAllProcurementRequests = async (req, res) => {
  try {
    const { project, mto, page, limit, search, status } = req.body;

    const filter = {isDeleted: false};
    
    if (project && mongoose.Types.ObjectId.isValid(project)) filter.project = project;
    if (mto && mongoose.Types.ObjectId.isValid(mto)) filter.mto = mto;

    if (status) filter.sendInquiry = status;

    let query = ProcurementRequest.find(filter)
      .populate("project", "name")
      .populate({
          path: "items.item",
          select: "name material_grade mcode unit",
          populate: {
            path: "unit", // nested populate
            select: "name",
          },
        })
      .populate("approvedmake", "name")
      .populate("preparedBy", "username email")
      .populate("reviewedBy", "username email")
      .sort({ createdAt: -1 });

    // --- SEARCH ---
    if (search && search.trim() !== "") {
      const regex = new RegExp(search, "i");
      query = query.or([{ prNo: regex }, { revNo: regex }, { "items.remarks": regex }]);
    }

    // --- PAGINATION ---
    let total = await ProcurementRequest.countDocuments(filter);
    if (page && limit) {
      const skip = (page - 1) * limit;
      query = query.skip(skip).limit(parseInt(limit, 10));
    }

    const data = await query.exec();

    return sendResponse(res, 200, true, { data, total }, "Procurement Requests fetched successfully");

  } catch (error) {
    console.error("getAllProcurementRequests error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

// ---------------- GET PROCUREMENT REQUEST BY ID ----------------
exports.getProcurementRequestById = async (req, res) => {
  try {
    console.log("getProcurementRequestById", req.body);
    console.log("getProcurementRequestById", req.query);
    const id = req.query.id || req.body.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, 400, false, {}, "Invalid Procurement Request ID");
    }

    const data = await ProcurementRequest.findById(id)
      .populate("project", "name code")
      .populate("items.item", "name material_grade mcode unit")
      .populate("preparedBy", "username email")
      .populate("reviewedBy", "username email");

    if (!data) {
      return sendResponse(res, 404, false, {}, "Procurement Request not found");
    }

    return sendResponse(res, 200, true, data, "Procurement Request fetched successfully");
  } catch (error) {
    console.error("getProcurementRequestById error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

// ---------------- DELETE PROCUREMENT REQUEST ----------------
exports.deleteProcurementRequest = async (req, res) => {
  try {
    const id = req.query.id || req.body.id;
    console.log("deleteProcurementRequest", id);

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, 400, false, {}, "Invalid Procurement Request ID");
    }

    // --- FIND EXISTING PR FIRST ---
    const existingPr = await ProcurementRequest.findById(id);
    if (!existingPr) {
      return sendResponse(res, 404, false, {}, "Procurement Request not found");
    }

    // --- CHECK IF ALREADY DELETED ---
    if (existingPr.isDeleted) {
      return sendResponse(res, 400, false, {}, "Procurement Request already deleted");
    }

    // --- RESTORE MTO QTY & BALANCE BEFORE MARKING AS DELETED ---
    const restoreUpdates = [];
    for (const oldItem of existingPr.items) {
      const mtoDoc = await MaterialMto.findById(oldItem.mto);
      if (!mtoDoc) continue;

      const mtoItem = mtoDoc.items.find(
        (i) => i.item.toString() === oldItem.item.toString()
      );
      if (!mtoItem) continue;

      // Restore back the original MTO state
      mtoItem.prqty -= oldItem.prQty;
      mtoItem.balanceQty += oldItem.prQty;

      restoreUpdates.push(mtoDoc.save());
    }

    await Promise.all(restoreUpdates);

    // --- MARK PR AS DELETED (SOFT DELETE) ---
    existingPr.isDeleted = true;
    existingPr.deletedAt = new Date();
    await existingPr.save();

    return sendResponse(res, 200, true, {}, "Procurement Request soft deleted and MTO restored successfully");
  } catch (error) {
    console.error("deleteProcurementRequest error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};



// ---------------- UPDATE sendInquiry STATUS ----------------
exports.updateSendInquiryStatus = async (req, res) => {
  try {
    const { id, sendInquiry } = req.body;
    console.log("id, sendInquiry", req.body);

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, 400, false, {}, "Invalid Procurement Request ID");
    }

    const updated = await ProcurementRequest.findByIdAndUpdate(
      id,
      { sendInquiry: true },
      { new: true }
    );

    if (!updated) {
      return sendResponse(res, 404, false, {}, "Procurement Request not found");
    }

    return sendResponse(res, 200, true, updated, "sendInquiry status updated successfully");
  } catch (error) {
    console.error("updateSendInquiryStatus error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

//=================== MULTILE SENDINQUERY ==================
// Update multiple PRs' sendInquiry status
exports.sendMultiplePRsToInquiry = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No PR IDs provided" });
    }

    // Validate all IDs
    const invalidIds = ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ success: false, message: "One or more invalid PR IDs" });
    }

    const result = await ProcurementRequest.updateMany(
      { _id: { $in: ids }, sendInquiry: false }, // only unsent PRs
      { $set: { sendInquiry: true } }
    );

    return res.status(200).json({
      success: true,
      modifiedCount: result.modifiedCount,
      message: `${result.modifiedCount} PR(s) sent to Inquiry successfully`,
    });
  } catch (error) {
    console.error("sendMultiplePRsToInquiry error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};


// PDF 
exports.downloadProcurementRequest = async (req, res) => {
  const { pr_id } = req.body;

  // Check user auth
  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  // Validate ObjectId
  if (!pr_id || !mongoose.Types.ObjectId.isValid(pr_id)) {
    return sendResponse(res, 400, false, {}, "Invalid Procurement Request ID");
  }

  try {
    // Fetch Procurement Request
    const procurementRequest = await ProcurementRequest.findOne({
      _id: new mongoose.Types.ObjectId(pr_id),
    })
      .populate({
          path: "project",
          select: "name code party",
          populate: {
            path: "party",   // this points to store-parties
            select: "name address contact",
          },
        })
      .populate({
          path: "items.item",
          select: "name material_grade mcode unit",
          populate: {
            path: "unit", // nested populate
            select: "name",
          },
        })
      .populate("approvedmake", "name")
      .populate("preparedBy", "user_name email signature")
      .populate("reviewedBy", "name email");

    if (!procurementRequest) {
      return sendResponse(res, 404, false, {}, "Procurement Request not found");
    }

    console.log("Fetched Procurement Request for PDF:", procurementRequest);

    // Render HTML template (EJS)
    const templatePath = path.join(
      __dirname,
      "../../templates/material_procurement/procurementRequest.html"
    );
    const template = fs.readFileSync(templatePath, "utf-8");

    const renderedHtml = ejs.render(template, {
      pr: procurementRequest.toObject(),
      logoUrl1: process.env.LOGO_URL_1 || "",
      logoUrl2: process.env.LOGO_URL_2 || "",
    });

    // Puppeteer launch
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      ...(process.env.PUPPETEER_EXEC_PATH && { executablePath: process.env.PUPPETEER_EXEC_PATH }),
    });
    const page = await browser.newPage();
    await page.setContent(renderedHtml, { waitUntil: "networkidle0" });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      landscape:true,
      margin: { top: "20px", bottom: "20px", left: "15px", right: "15px" },
    });

    await browser.close();

    // Ensure /pdfs folder exists
    const pdfsDir = path.join(__dirname, "../../pdfs");
    if (!fs.existsSync(pdfsDir)) {
      fs.mkdirSync(pdfsDir, { recursive: true });
    }

    const filename = `ProcurementRequest_${Date.now()}.pdf`;
    const filePath = path.join(pdfsDir, filename);
    fs.writeFileSync(filePath, pdfBuffer);

    const fileUrl = `${URI}/pdfs/${filename}`;

    return sendResponse(res, 200, true, { file: fileUrl }, "Procurement Request PDF generated successfully");
  } catch (error) {
    console.error("downloadProcurementRequest error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong while generating PDF");
  }
};
