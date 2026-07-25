const mongoose = require("mongoose");
const { sendResponse } = require("../../helper/response");
const OrderPlacement = require("../../models/material_procurement/order_placement.model");
const Project = require("../../models/project.model");
const { amountInWords } = require("../../helper/index");
const ejs = require("ejs");
const fs = require("fs");
const path = require("path");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;
const ExcelJS = require("exceljs");
const puppeteer = require("puppeteer");
const Inquiry = require("../../models/material_procurement/inquiry.model");
const RequestModal = require("../../models/erp/planner/request.model");
const TransactionItems = require("../../models/store/transaction_item.model");
const User = require("../../models/users.model");
const ErpRole = require("../../models/erp/erp_role.model");
const addEmailJob = require("../../utils/emailJob");
const sendEmail = require("../../utils/sendEmail");
const commonStageOfferEmail = require("../../utils/commonStageOfferEmail");
const commonStageAcceptanceEmail = require("../../utils/commonStageAcceptanceEmail");

// ====================== CREATE / UPDATE ORDER PLACEMENT ======================
// exports.manageOrderPlacement = async (req, res) => {
//   try {
//     let {
//       id,
//       project,
//       vendor_name,
//       vendor_address,
//       po_no,
//       po_date,
//       email,
//       kind_atten,
//       contact_no,
//       buyer,
//       purchase_order,
//       ref_no,
//       items,
//       total_qty,
//       total_amount,
//       total_cgst,
//       total_sgst,
//       total_igst,
//       terms_and_conditions,
//       otherTerms, // <-- added
//       remarks,
//       createdby,
//     } = req.body;

//     console.log(req.body);
//     // --- VALIDATION ---
//     if (req.user && !req.err) {

//     if (!project || !vendor_name || !po_no || !po_date || !items) {
//       return sendResponse(res, 400, false, {}, "Missing required fields");
//     }

//     if (!mongoose.Types.ObjectId.isValid(project)) {
//       return sendResponse(res, 400, false, {}, "Invalid Project ID");
//     }

//     const projectDoc = await Project.findById(project).select("name");
//     if (!projectDoc) {
//       return sendResponse(res, 404, false, {}, "Project not found");
//     }

//     // ====================== CREATE ======================
//     if (!id) {
//       const newOrder = new OrderPlacement({
//         project,
//         vendor_name,
//         vendor_address,
//         po_no,
//         po_date,
//         rev_no: 0, // Initial revision number
//         email,
//         kind_atten,
//         contact_no,
//         buyer,
//         purchase_order,
//         ref_no,
//         items: items.map((item) => ({
//           inquiryId: item.inquiryId,
//           item: item.item,
//           manufacture: item.manufacture,
//           qty: item.qty,
//           rates: item.rates,
//           cgst: item.cgst,
//           sgst: item.sgst,
//           igst: item.igst,
//           amount: item.amount,
//           remarks: item.remarks,
//         })),
//         total_qty,
//         total_amount,
//         total_cgst,
//         total_sgst,
//         total_igst,
//         terms_and_conditions,
//         otherTerms, // <-- save otherTerms
//         remarks,
//         createdby
//       });

//       const saved = await newOrder.save();

//       // === UPDATE Inquiry: set genratePO = true ===
//         const inquiryIds = items.map(i => i.inquiryId);

//         await Inquiry.updateMany(
//           { _id: { $in: inquiryIds } },
//           { $set: { genratePO: true } }
//         );

//       return sendResponse(
//         res,
//         200,
//         true,
//         saved,
//         "Order Placement created successfully"
//       );
//     }

//     // ====================== UPDATE ======================
//     if (id && mongoose.Types.ObjectId.isValid(id)) {
//       const existing = await OrderPlacement.findById(id);

//       if (!existing) {
//         return sendResponse(res, 404, false, {}, "Order Placement not found");
//       }

//       existing.vendor_name = vendor_name || existing.vendor_name;
//       existing.vendor_address = vendor_address || existing.vendor_address;
//       existing.po_no = po_no || existing.po_no;
//       existing.rev_no = existing.rev_no + 1;
//       existing.po_date = po_date || existing.po_date;
//       existing.email = email || existing.email;
//       existing.kind_atten = kind_atten || existing.kind_atten;
//       existing.contact_no = contact_no || existing.contact_no;
//       existing.buyer = buyer || existing.buyer;
//       existing.purchase_order = buyer || existing.purchase_order;
//       existing.ref_no = ref_no || existing.ref_no;

//       existing.items = items.map((item) => ({
//         inquiryId: item.inquiryId,
//         item: item.item,
//         manufacture: item.manufacture,
//         qty: item.qty,
//         rates: item.rates,
//         cgst: item.cgst,
//         sgst: item.sgst,
//         igst: item.igst,
//         amount: item.amount,
//         remarks: item.remarks,
//       }));

//       existing.total_qty = total_qty;
//       existing.total_amount = total_amount;
//       existing.total_cgst = total_cgst;
//       existing.total_sgst = total_sgst;
//       existing.total_igst = total_igst;
//       existing.terms_and_conditions = terms_and_conditions;
//       existing.otherTerms = otherTerms; // <-- update otherTerms
//       existing.remarks = remarks;
//       existing.createdby = createdby;

//       const updated = await existing.save();

//       const inquiryIds = items.map(i => i.inquiryId);
//       await Inquiry.updateMany(
//         { _id: { $in: inquiryIds } },
//         { $set: { genratePO: true } }
//       );

//       return sendResponse(
//         res,
//         200,
//         true,
//         updated,
//         "Order Placement updated successfully"
//       );
//     }
//   }
//     return sendResponse(res, 400, false, {}, "Invalid Order ID");
//   } catch (error) {
//     console.error("manageOrderPlacement error:", error);
//     return sendResponse(res, 500, false, {}, "Something went wrong");
//   }
// };

// Helper to sync inquiry balances when PO is created/updated
async function syncInquiryBalances(poItems, mode = "subtract") {
  const groupedByInquiry = poItems.reduce((acc, item) => {
    const inqId = item.inquiryId?._id || item.inquiryId;
    if (!inqId) return acc;
    if (!acc[inqId]) acc[inqId] = [];
    acc[inqId].push(item);
    return acc;
  }, {});

  for (const inqId in groupedByInquiry) {
    const inquiry = await Inquiry.findById(inqId);
    if (!inquiry) continue;

    for (const poItem of groupedByInquiry[inqId]) {
      // Use inquiryItem (original) if present, otherwise fallback to item (editable)
      const itemId = poItem.inquiryItem || poItem.item?._id || poItem.item;
      const inqItem = inquiry.items.find(
        (it) => it.item.toString() === itemId.toString(),
      );
      if (inqItem) {
        let currentBalance = inqItem.balance_to_order || 0;
        if (mode === "subtract") {
          inqItem.balance_to_order = Math.max(
            0,
            currentBalance - (poItem.qty || 0),
          );
        } else {
          inqItem.balance_to_order = currentBalance + (poItem.qty || 0);
        }
      }
    }

    // Update genratePO status: true if all items have 0 or less balance
    const allOrdered = inquiry.items.every(
      (it) => (it.balance_to_order || 0) <= 0,
    );
    inquiry.genratePO = allOrdered;

    await inquiry.save();
  }
}

// Helper to sync PO changes to Request and Transaction Items
async function syncPOToRequest(poDoc, oldPoId) {
  try {
    const request = await RequestModal.findOne({ orderPlacement: oldPoId, deleted: false });
    if (!request) return;

    // Update request links
    request.orderPlacement = poDoc._id;
    request.material_po_no = poDoc.po_no;
    await request.save();

    // Fetch existing transaction items
    const existingTxItems = await TransactionItems.find({ requestId: request._id });

    // Map new PO items for comparison
    const poItemsMap = new Map();
    poDoc.items.forEach(item => poItemsMap.set(item.item.toString(), item));

    // Update or remove existing transaction items
    for (const txItem of existingTxItems) {
      const poItem = poItemsMap.get(txItem.itemName.toString());

      if (poItem) {
        // Item exists in PO
        if (txItem.quantity === txItem.balance_qty) {
          // No receipt: Update all fields
          txItem.quantity = poItem.qty;
          txItem.balance_qty = poItem.qty;
          txItem.rate = poItem.rates;
          txItem.amount = poItem.amount;
          const cgst = poItem.cgst || 0;
          const sgst = poItem.sgst || 0;
          const igst = poItem.igst || 0;
          txItem.gst_percent = igst > 0 ? igst : cgst + sgst;
          txItem.gst_amount = (txItem.gst_percent * poItem.amount) / 100;
          txItem.remarks = poItem.remarks || "";
          txItem.main_supplier = poDoc.vendor;
          txItem.preffered_supplier = Array.isArray(poItem.manufacture)
            ? poItem.manufacture.map(id => ({ supId: id }))
            : [{ supId: poItem.manufacture }];
          txItem.orderPlacement = poDoc._id;
        }
        await txItem.save();
        poItemsMap.delete(txItem.itemName.toString());
      } else {
        // Removed from PO
        if (txItem.quantity === txItem.balance_qty) {
          // Never received: Delete
          await TransactionItems.deleteOne({ _id: txItem._id });
        } else {
          // Received: Keep
          txItem.orderPlacement = poDoc._id;
          await txItem.save();
        }
      }
    }

    // Add new items from PO
    if (poItemsMap.size > 0) {
      const newTxItems = Array.from(poItemsMap.values()).map(itm => {
        const cgst = itm.cgst || 0;
        const sgst = itm.sgst || 0;
        const igst = itm.igst || 0;
        const gstPercent = igst > 0 ? igst : cgst + sgst;

        return {
          requestId: request._id,
          itemName: itm.item,
          quantity: itm.qty,
          balance_qty: itm.qty,
          orderPlacement: poDoc._id,
          tag: 1,
          remarks: itm.remarks || "",
          rate: itm.rates,
          amount: itm.amount,
          gst_percent: gstPercent,
          gst_amount: (gstPercent * itm.amount) / 100,
          main_supplier: poDoc.vendor,
          preffered_supplier: Array.isArray(itm.manufacture)
            ? itm.manufacture.map(id => ({ supId: id }))
            : [{ supId: itm.manufacture }]
        };
      });
      await TransactionItems.insertMany(newTxItems);
    }
  } catch (error) {
    console.error("syncPOToRequest error:", error);
  }
}

exports.manageOrderPlacement = async (req, res) => {
  try {
    const {
      id,
      project,
      po_no,
      vendor,
      po_date,
      kind_atten,
      buyer,
      buyer_number,
      purchase_order,
      ref_no,
      items,
      total_qty,
      total_amount,
      total_cgst,
      total_sgst,
      total_igst,
      terms_and_conditions,
      terms,
      remarks,
      createdby,
    } = req.body;
    // ---------- AUTH CHECK ----------
    if (!req.user || req.err) {
      return sendResponse(res, 401, false, {}, "Unauthorized");
    }

    // ---------- BASIC VALIDATION ----------
    if (
      !project ||
      !po_no ||
      !vendor ||
      !po_date ||
      !kind_atten ||
      !buyer ||
      !buyer_number ||
      !purchase_order ||
      !ref_no ||
      !items ||
      !items.length
    ) {
      return sendResponse(res, 400, false, {}, "Missing required fields");
    }

    if (!mongoose.Types.ObjectId.isValid(project)) {
      return sendResponse(res, 400, false, {}, "Invalid Project ID");
    }

    if (!mongoose.Types.ObjectId.isValid(vendor)) {
      return sendResponse(res, 400, false, {}, "Invalid Vendor ID");
    }

    // ---------- PROJECT CHECK ----------
    const projectDoc = await Project.findById(project).select("_id");
    if (!projectDoc) {
      return sendResponse(res, 404, false, {}, "Project not found");
    }

    // ---------- PREPARE ITEMS ----------
    const formattedItems = items.map((item) => ({
      inquiryId: item.inquiryId,
      inquiryItem: item.inquiryItem || item.item,
      item: item.item,
      manufacture: item.manufacture,
      qty: item.qty,
      rates: item.rates,
      cgst: item.cgst,
      sgst: item.sgst,
      igst: item.igst,
      amount: item.amount,
      remarks: item.remarks,
    }));

    const inquiryIds = formattedItems.map((i) => i.inquiryId);

    // ====================== CREATE ======================
    if (!id) {
      const newOrder = new OrderPlacement({
        project,
        po_no,
        vendor,
        po_date,
        kind_atten,
        buyer,
        buyer_number,
        purchase_order,
        ref_no,
        items: formattedItems,
        total_qty,
        total_amount,
        total_cgst,
        total_sgst,
        total_igst,
        terms_and_conditions,
        terms,
        remarks,
        createdby,
        rev_no: 0,
      });

      const saved = await newOrder.save();

      // Update Inquiry balances
      await syncInquiryBalances(formattedItems, "subtract");

      return sendResponse(
        res,
        200,
        true,
        saved,
        "Order Placement created successfully",
      );
    }

    // ====================== UPDATE ======================
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      const existing = await OrderPlacement.findById(id);

      if (!existing) {
        return sendResponse(res, 404, false, {}, "Order Placement not found");
      }

      // Check if anything OTHER than quantity/amount/taxes has changed
      let isOtherChanged = false;
      const isSameString = (a, b) => (a || "").toString().trim() === (b || "").toString().trim();

      if (
        !isSameString(existing.project, project) ||
        !isSameString(existing.po_no, po_no) ||
        !isSameString(existing.vendor, vendor) ||
        !isSameString(existing.kind_atten, kind_atten) ||
        !isSameString(existing.buyer, buyer) ||
        !isSameString(existing.buyer_number, buyer_number) ||
        !isSameString(existing.purchase_order, purchase_order) ||
        !isSameString(existing.ref_no, ref_no) ||
        !isSameString(existing.remarks, remarks)
      ) {
        isOtherChanged = true;
      }

      // Arrays and dates comparison
      if (!isOtherChanged) {
        const d1 = new Date(existing.po_date).getTime();
        const d2 = new Date(po_date).getTime();
        if (d1 !== d2 && !isNaN(d1) && !isNaN(d2)) {
          isOtherChanged = true;
        }
      }
      if (!isOtherChanged) {
        const existTermsStr = (existing.terms || []).map(t => t.toString()).sort().join();
        const newTermsStr = (terms || []).map(t => t.toString()).sort().join();
        if (existTermsStr !== newTermsStr) isOtherChanged = true;
      }

      // Item array structural differences (excluding qty, amount, cgst, sgst, igst)
      if (!isOtherChanged) {
        if (existing.items.length !== formattedItems.length) {
          isOtherChanged = true; // Added/removed items counts as an 'other' change
        } else {
          for (let i = 0; i < formattedItems.length; i++) {
            const exItem = existing.items.find(
              (item) => item.item.toString() === formattedItems[i].item.toString()
            );
            if (!exItem) {
              isOtherChanged = true;
              break;
            }
            if (
              Number(exItem.rates) !== Number(formattedItems[i].rates) ||
              !isSameString(exItem.remarks, formattedItems[i].remarks)
            ) {
              isOtherChanged = true;
              break;
            }
            const exMfg = (exItem.manufacture || []).map(m => m.toString()).sort().join();
            const newMfg = (formattedItems[i].manufacture || []).map(m => m.toString()).sort().join();
            if (exMfg !== newMfg) {
              isOtherChanged = true;
              break;
            }
          }
        }
      }

      // Revert old balances first
      await syncInquiryBalances(existing.items, "add");

      // ---------- LOCKING CHECK (If sent to material) ----------
      if (existing.send_to_material === true) {
        const existingTxItems = await TransactionItems.find({ orderPlacement: existing._id, deleted: false });
        for (const exItem of existing.items) {
            const txItem = existingTxItems.find(it => it.itemName.toString() === exItem.item.toString());
            if (txItem && txItem.quantity !== txItem.balance_qty) {
                const newItem = formattedItems.find(it => it.item.toString() === exItem.item.toString());
                if (!newItem || Number(newItem.qty) !== Number(txItem.quantity)) {
                    // Revert in-memory update for inquiry balances before returning
                    await syncInquiryBalances(existing.items, "subtract");
                    return sendResponse(res, 400, false, {}, "Items with received quantity cannot be modified or removed.");
                }
            }
        }
      }

      let updated;
      if (isOtherChanged) {
        // Other non-qty fields changed, create a new PO revision
        const updatedOrder = new OrderPlacement({
          project,
          po_no,
          vendor,
          po_date,
          kind_atten,
          buyer,
          buyer_number,
          purchase_order,
          ref_no,
          items: formattedItems,
          total_qty,
          total_amount,
          total_cgst,
          total_sgst,
          total_igst,
          terms_and_conditions,
          terms,
          remarks,
          createdby,
          send_to_material: existing.send_to_material, // preserve material linkage
          rev_no: existing.rev_no + 1,
        });

        updated = await updatedOrder.save();
      } else {
        // Only quantities/amounts changed, update the existing record directly
        existing.project = project;
        existing.po_no = po_no;
        existing.vendor = vendor;
        existing.po_date = po_date;
        existing.kind_atten = kind_atten;
        existing.buyer = buyer;
        existing.buyer_number = buyer_number;
        existing.purchase_order = purchase_order;
        existing.ref_no = ref_no;
        existing.items = formattedItems;
        existing.total_qty = total_qty;
        existing.total_amount = total_amount;
        existing.total_cgst = total_cgst;
        existing.total_sgst = total_sgst;
        existing.total_igst = total_igst;
        existing.terms_and_conditions = terms_and_conditions;
        existing.terms = terms;
        existing.remarks = remarks;
        existing.createdby = createdby;

        updated = await existing.save();
      }

      // Sync with Request and Transaction Items if already sent
      if (existing.send_to_material === true) {
        await syncPOToRequest(updated, existing._id);
      }

      // Apply new balances
      await syncInquiryBalances(formattedItems, "subtract");


      return sendResponse(
        res,
        200,
        true,
        updated,
        "Order Placement updated successfully",
      );
    }

    return sendResponse(res, 400, false, {}, "Invalid Order ID");
  } catch (error) {
    console.error("manageOrderPlacement error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

// ====================== GET ALL ORDERS ======================
exports.getAllOrderPlacements = async (req, res) => {
  try {
    const { project, search, page, limit } = req.body;

    const filter = { deleted: false };

    if (project && mongoose.Types.ObjectId.isValid(project)) {
      filter.project = project;
    }

    let query = OrderPlacement.find(filter)
      .populate("project", "name code")
      .populate({
        path: "items.item",
        select: "name mcode material_grade unit",
        populate: {
          path: "unit",
          select: "name", // ✅ This fetches the unit name
        },
      })
      .populate("items.inquiryItem", "name material_grade unit")
      .populate("items.manufacture", "name")
      .populate("items.inquiryId", "InquiryNo")
      .populate("terms_and_conditions", "description")
      .populate(
        "vendor",
        "name address address_two address_three city state pincode email phone",
      )
      .sort({ createdAt: -1 });

    // SEARCH by PO Number
    if (search && search.trim() !== "") {
      const regex = new RegExp(search, "i");
      query = query.or([{ po_no: regex }, { vendor_name: regex }]);
    }

    const total = await OrderPlacement.countDocuments(filter);
    const skip = (page - 1) * limit;

    const data = await query.skip(skip).limit(parseInt(limit)).exec();

    // Enrichment: Add hide_flag and isReceived based on TransactionItems
    const poIds = data.map(po => po._id);
    const txItems = await TransactionItems.find({ orderPlacement: { $in: poIds }, deleted: false });

    const enrichedData = data.map(po => {
      const poObj = po.toObject();
      poObj.items = poObj.items.map(pItem => {
          const itemId = pItem.item?._id || pItem.item;
          const txItem = txItems.find(tx => 
              tx.orderPlacement.toString() === poObj._id.toString() && 
              tx.itemName.toString() === itemId.toString()
          );
          const isReceived = txItem ? txItem.quantity !== txItem.balance_qty : false;
          return {
              ...pItem,
              hide_flag: isReceived,
              isReceived: isReceived
          };
      });
      return poObj;
    });

    return sendResponse(
      res,
      200,
      true,
      { data: enrichedData, total },
      "Orders fetched successfully",
    );
  } catch (error) {
    console.error("getAllOrderPlacements error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

// ====================== GET ORDER BY ID ======================
exports.getOrderPlacementById = async (req, res) => {
  try {
    const id = req.query.id || req.body.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, 400, false, {}, "Invalid ID");
    }

    const data = await OrderPlacement.findById(id)
      .populate("project", "name code")
      .populate(
        "vendor",
        "name address address_two address_three city state pincode email phone",
      )
      .populate("items.item", "name mcode material_grade unit")
      .populate("items.inquiryItem", "name material_grade unit")
      .populate("items.inquiryId", "InquiryNo");

    if (!data) {
      return sendResponse(res, 404, false, {}, "Order Placement not found");
    }

    // Enrichment: Add hide_flag and isReceived
    const txItems = await TransactionItems.find({ orderPlacement: data._id, deleted: false });
    const poObj = data.toObject();
    poObj.items = poObj.items.map(pItem => {
        const itemId = pItem.item?._id || pItem.item;
        const txItem = txItems.find(tx => tx.itemName.toString() === itemId.toString());
        const isReceived = txItem ? txItem.quantity !== txItem.balance_qty : false;
        return {
            ...pItem,
            hide_flag: isReceived,
            isReceived: isReceived
        };
    });

    return sendResponse(res, 200, true, poObj, "Order fetched successfully");
  } catch (error) {
    console.error("getOrderPlacementById error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

// ====================== DELETE ORDER (SOFT DELETE) ======================
exports.deleteOrderPlacement = async (req, res) => {
  try {
    const id = req.query.id || req.body.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, 400, false, {}, "Invalid ID");
    }

    const existing = await OrderPlacement.findById(id);
    if (!existing) {
      return sendResponse(res, 404, false, {}, "Order not found");
    }

    // Revert inquiry balances
    await syncInquiryBalances(existing.items, "add");

    existing.deleted = true;
    existing.deletedAt = new Date();

    await existing.save();

    return sendResponse(res, 200, true, {}, "Order deleted successfully");
  } catch (error) {
    console.error("deleteOrderPlacement error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

exports.downloadOrderPlacement = async (req, res) => {
  try {
    const { id, project_id } = req.body;

    // Auth check
    if (!req.user || req.error) {
      return sendResponse(res, 401, false, {}, "Unauthorized");
    }

    // Validate ObjectId
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, 400, false, {}, "Invalid Order Placement ID");
    }

    const orderId = new mongoose.Types.ObjectId(id);
    const projectId = new mongoose.Types.ObjectId(project_id);

    // ====================== FETCH ORDER WITH POPULATE ======================
    let order = await OrderPlacement.findOne({
      _id: orderId,
      project: projectId,
      deleted: false,
    })
      .populate({
        path: "project",
        select: "name code firm_id",
        populate: {
          path: "firm_id",
          select: "name", // firm _id comes automatically
        },
      })
      .populate({
        path: "items.item",
        select: "name mcode material_grade unit",
        populate: {
          path: "unit",
          select: "name", // ✅ This fetches the unit name
        },
      })
      .populate("items.manufacture", "name")
      .populate("terms_and_conditions", "description")
      .populate(
        "vendor",
        "name address address_two address_three city state pincode email phone",
      )
      .populate("createdby", "user_name ")
      .lean();

    if (!order) {
      return sendResponse(res, 404, false, {}, "Order Placement not found");
    }

    console.log("Order fetched for PDF:", order);

    const rupeesInWords = await amountInWords(order.total_amount);

    // ====================== RENDER HTML ======================
    const templatePath = path.join(
      __dirname,
      "../../templates/material_procurement/order_placement.html",
    );
    const template = fs.readFileSync(templatePath, "utf-8");

    let LetterHead = "";
    if (order.project.firm_id.name === "VRISHAL ENGINEERING PRIVATE LIMITED") {
      LetterHead = process.env.VISHALENG;
    } else if (order.project.firm_id.name === "Vishal Enterprise") {
      LetterHead = process.env.VISHALENT;
    }

    const renderedHtml = ejs.render(template, {
      order,
      amountInWords: rupeesInWords,
      logoUrl1: process.env.LOGO_URL_1 || "",
      logoUrl2: process.env.LOGO_URL_2 || "",
      LetterHead: LetterHead || "",
    });

    // ====================== GENERATE PDF ======================
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      ...(PATH && { executablePath: PATH }),
    });

    const page = await browser.newPage();
    await page.setContent(renderedHtml, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", bottom: "20px", left: "10px", right: "10px" },
    });

    await browser.close();

    // ====================== SAVE PDF ======================
    const pdfDir = path.join(__dirname, "../../pdfs");
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    const filename = `OrderPlacement_${Date.now()}.pdf`;
    const filePath = path.join(pdfDir, filename);

    fs.writeFileSync(filePath, pdfBuffer);

    const fileUrl = `${URI}/pdfs/${filename}`;

    // ====================== RESPONSE ======================
    return sendResponse(
      res,
      200,
      true,
      { file: fileUrl },
      "Order Placement PDF generated successfully",
    );
  } catch (error) {
    console.error("downloadOrderPlacement error:", error);
    return sendResponse(
      res,
      500,
      false,
      {},
      "Something went wrong while generating PDF",
    );
  }
};

exports.placeMultipleOrders = async (req, res) => {
  try {
    const { ids, firm_id, year_id } = req.body;

    if (req.user && !req.err) {
      // --- VALIDATION ---
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "No Order Placement IDs provided" });
      }

      // Validate all IDs
      const invalidIds = ids.filter(
        (id) => !mongoose.Types.ObjectId.isValid(id),
      );
      if (invalidIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: "One or more invalid Order Placement IDs",
        });
      }

      // fetch orders
      const orders = await OrderPlacement.find({
        _id: { $in: ids },
        deleted: false,
      });

      if (!orders.length) {
        return res
          .status(404)
          .json({ success: false, message: "Orders not found" });
      }

      // helper to get next requestNo
      const getNextRequestNo = async () => {
        const lastRequest = await RequestModal.findOne(
          { deleted: false },
          { requestNo: 1 },
          { sort: { createdAt: -1 } },
        );
        const base = lastRequest?.requestNo
          ? parseInt(lastRequest.requestNo, 10)
          : 1000;
        return base + 1;
      };

      const createdRequests = [];

      for (const order of orders) {
        // skip if already linked
        if (order.send_to_material === true) continue;

        const requestNo = await getNextRequestNo();

        const requestDoc = new RequestModal({
          requestNo,
          requestDate: new Date(),
          firm_id: firm_id,
          year_id: year_id,
          project: order.project,
          orderPlacement: order._id,
          department: null,
          approvedBy: null,
          preparedBy: order.createdby, // fallback to order creator
          storeLocation: null,
          drawingIds: [],
          tag: 1, // purchase
          status: 2,
          material_po_no: order.po_no,
        });

        const savedReq = await requestDoc.save();
        createdRequests.push(savedReq._id);

        order.send_to_material = true;
        await order.save();

        // create transaction items for this request from order items
        if (Array.isArray(order.items) && order.items.length) {
          const txItems = order.items.map((itm) => {
            const cgst = itm.cgst || 0;
            const sgst = itm.sgst || 0;
            const igst = itm.igst || 0;
            // prefer IGST when present, otherwise use CGST+SGST
            const gstPercent = igst > 0 ? igst : cgst + sgst;

            return {
              requestId: savedReq._id,
              itemName: itm.item,
              quantity: itm.qty,
              orderPlacement: order._id,
              tag: 1, // purchase
              remarks: itm.remarks || "",
              rate: itm.rates,
              amount: itm.amount,
              gst_percent: gstPercent,
              gst_amount: (gstPercent * itm.amount) / 100,
              balance_qty: itm.qty,
              main_supplier: order.vendor,
              preffered_supplier: Array.isArray(itm.manufacture)
                ? itm.manufacture.map((id) => ({ supId: id }))
                : [{ supId: itm.manufacture }],
            };
          });

          console.log("Transaction items created", {
            txItems,
            requestId: savedReq._id.toString(),
            count: txItems.length,
          });
          await TransactionItems.insertMany(txItems);

                    /* =========================================================
             MATERIAL RECEIVING EMAIL
          ========================================================= */
          
          try {
          
              const projectDetails =
                  await Project.findById(
                      order.project
                  ).select(
                      "name work_order_no"
                  );
          
              const createdUser =
                  await User.findById(
                      order.createdby
                  );
          
              const roles =
                  await ErpRole.find({
          
                      deleted:false,
          
                      name:{
                          $in:[
                              "Material Controller"
                          ]
                      }
          
                  });
          
              const roleIds =
                  roles.map(
                      role => role._id
                  );
          
              const users =
                  await User.find({
          
                      deleted:false,
          
                      status:true,
          
                      structureRole:{
                          $in:roleIds
                      },
          
                      email:{
                          $exists:true,
                          $ne:""
                      }
          
                  });
          
              const requestDateTime =
          
                  savedReq?.requestDate
          
                  ? new Date(
                      savedReq.requestDate
                  )
                  .toLocaleString(
                      "en-IN",
                      {
                          day:"2-digit",
                          month:"2-digit",
                          year:"numeric",
                          hour:"2-digit",
                          minute:"2-digit",
                          second:"2-digit",
                          hour12:true
                      }
                  )
                  .replace("am","AM")
                  .replace("pm","PM")
          
                  : "-";
          
              for(
                  const user
                  of users
              ){
          
                  try{
          
                      const html =
                          commonStageOfferEmail({
          
                          userName:
                              user?.user_name || "-",
          
                          module:
                              "Structural Material Procurment",
          
                          stageName:
                              "Order Placement",
          
                          poNo:
                              order?.po_no || "-",
          
                          projectName:
                              projectDetails?.name || "-",
          
                          workOrderNo:
                              projectDetails?.work_order_no || "-",
          
                          createdBy:
                              createdUser?.user_name || "-",
          
                          offerDateTime:
                              requestDateTime,
          
                          remarks:
                              `Order Placement generated with PO No ${order?.po_no || "-"} and ready for Material Receiving request.`,
          
                          loginUrl:
                              process.env.ERP_URL
          
                      });
          
                      addEmailJob({
          
                          to:
                              user.email,
          
                          subject:
                              `Order Placement - ${order?.po_no}`,
          
                          html
          
                      });
          
                      console.log(
                          `Order Placement EMAIL QUEUED -> ${user.email}`
                      );
          
                  }
                  catch(mailErr){
          
                      console.log(
                          `MATERIAL RECEIVING MAIL ERROR ${user.email}`,
                          mailErr.message
                      );
          
                  }
          
              }
          
          }
          catch(emailErr){
          
              console.log(
                  "MATERIAL RECEIVING EMAIL ERROR:",
                  emailErr
              );
          
          }

          console.log("Transaction items inserted", {
            requestId: savedReq._id.toString(),
            count: txItems.length,
          });
        }
      }

      return res.status(200).json({
        success: true,
        createdRequests,
        message: `${createdRequests.length} request(s) created and linked to order(s)`,
      });
    }
  } catch (error) {
    console.error("placeMultipleOrders error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

// ==========Execel
exports.downloadOrderExcel = async (req, res) => {
  try {
    const { id } = req.body;

    /* ================= AUTH ================= */
    if (!req.user || req.error) {
      return sendResponse(res, 401, false, {}, "Unauthorized");
    }

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, 400, false, {}, "Invalid Order ID");
    }

    /* ================= FETCH DATA ================= */
    const order = await OrderPlacement.findOne({ _id: id, deleted: false })
      .populate({
        path: "vendor",
        select: "name address contact email",
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

    console.log(order);

    if (!order) {
      return sendResponse(res, 404, false, {}, "Order not found");
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Purchase Order");

    /* ================= MERGE A1 TO K7 ================= */

    // Merging A1 to L7 (spanning rows and columns)
    sheet.mergeCells("A1:L7");
    const headerCell = sheet.getCell("A1");
    headerCell.value = "";
    headerCell.font = { bold: true, size: 16 };
    headerCell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    /* ================= ADDING OTHER HEADER DATA ================= */

    // Add PO number, PO Date, and other details below the merged cell
    sheet.mergeCells("A8:F8");
    sheet.getCell("A8").value = "To,";
    sheet.mergeCells("G8:I8");
    sheet.getCell("G8").value = "PURCHASE ORDER NO,";
    sheet.mergeCells("J8:L8");
    sheet.getCell("J8").value = order.po_no;

    sheet.mergeCells("A9:B9");
    sheet.getCell("A9").value = "VENDOR NAME:";
    sheet.mergeCells("C9:F9");
    sheet.getCell("C9").value = order.vendor.name;
    sheet.mergeCells("G9:I9");
    sheet.getCell("G9").value = "PURCHASE ORDER DATE:";
    sheet.mergeCells("J9:L9");
    sheet.getCell("J9").value = new Date(order.po_date).toLocaleDateString();

    sheet.mergeCells("A10:B10");
    sheet.getCell("A10").value = "VENDOR ADDRESS:";
    sheet.mergeCells("C10:L10");
    sheet.getCell("C10").value =
      [
        order.vendor.address,
        order.vendor.address_two,
        order.vendor.address_three,
      ]
        .filter(Boolean)
        .join(", ") || "--";

    /* ================= VENDOR INFORMATION ================= */
    sheet.mergeCells("A11:B11");
    sheet.getCell("A11").value = "EMAIL:";
    sheet.mergeCells("C11:F11");
    sheet.getCell("C11").value = order.vendor.email || "--";
    sheet.mergeCells("G11:I11");
    sheet.getCell("G11").value = "BUYER" || "--";
    sheet.mergeCells("J11:L11");
    sheet.getCell("J11").value = order.buyer_number ? `${order.buyer} (${order.buyer_number})` : (order.buyer || "--");

    sheet.mergeCells("A12:B12");
    sheet.getCell("A12").value = "KIND ATTEN:";
    sheet.mergeCells("C12:F12");
    sheet.getCell("C12").value = order.kind_atten;

    sheet.mergeCells("G12:I12");
    sheet.getCell("G12").value = "CONTACT NO:";
    sheet.mergeCells("J12:L12");
    sheet.getCell("J12").value = order.vendor.phone || "--";

    sheet.mergeCells("A13:B13");
    sheet.getCell("A13").value = "REF NO.:";
    sheet.mergeCells("C13:L13");
    sheet.getCell("C13").value = order.ref_no || "--";

    sheet.mergeCells("A14:L14");
    sheet.mergeCells("A15:L15");
    sheet.getCell("A15").value = "PURCHASE ORDER FOR :" + order.purchase_order;
    sheet.getCell("A15").alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    /* ================= TABLE HEADER ================= */
    const headerRow = sheet.addRow([
      "SN",
      "ITEM DESCRIPTION",
      "Material Grade",
      "Make/Manufacturer",
      "UNIT",
      "QTY",
      "RATE(INR)",
      "PRICE(INR)",
      "SGST(%)",
      "CGST(%)",
      "AMOUNT(INR)",
      "Remarks",
    ]);

    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
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

    order.items.forEach((item, index) => {
      const manufacturers = item.manufacture?.length
        ? item.manufacture.map((m) => m.name).join(", ")
        : "--";

      const baseAmount = (item.qty || 0) * (item.rates || 0);
      const sgstAmount = (baseAmount * (item.sgst || 0)) / 100;
      const cgstAmount = (baseAmount * (item.cgst || 0)) / 100;
      const igstAmount = (baseAmount * (item.igst || 0)) / 100;

      const totalItemAmount = baseAmount + sgstAmount + cgstAmount + igstAmount;

      const row = sheet.addRow([
        index + 1,
        item.item?.name || "--",
        item.item?.material_grade || "--",
        manufacturers,
        item.item?.unit?.name || "--",
        item.qty || 0,
        item.rates || 0,
        baseAmount.toFixed(2),
        item.sgst || 0,
        item.cgst || 0,
        totalItemAmount.toFixed(2),
        item.remarks || "--",
      ]);
      // const row = sheet.addRow([
      //   index + 1,
      //   item.item?.name || "--",
      //   item.item?.material_grade || "--",
      //   manufacturers,
      //   item.item?.unit?.name || "--",
      //   item.qty || 0,
      //   item.rates || 0,
      //   item.sgst || 0,
      //   item.cgst || 0,
      //   (item.qty * item.rates).toFixed(2),
      //   item.remarks || "--",
      // ]);1

      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });
    });

    const totalQty = order.items.reduce(
      (sum, item) => sum + (item.qty || 0),
      0,
    );
    // const totalAmount = order.items.reduce((sum, item) => sum + ((item.qty || 0) * (item.rates || 0)), 0);
    const totalAmount = order.items.reduce((sum, item) => {
      const base = (item.qty || 0) * (item.rates || 0);
      const sgst = (base * (item.sgst || 0)) / 100;
      const cgst = (base * (item.cgst || 0)) / 100;
      const igst = (base * (item.igst || 0)) / 100;

      return sum + base + sgst + cgst + igst;
    }, 0);
    const rupeesInWords = await amountInWords(totalAmount);

    const totalRowNumber = sheet.rowCount + 1;

    // Merge A to E for "Total :" label and right-align it
    sheet.mergeCells(`A${totalRowNumber}:E${totalRowNumber}`);
    const totalLabelCell = sheet.getCell(`A${totalRowNumber}`);
    totalLabelCell.value = "Total :";
    totalLabelCell.alignment = { horizontal: "right", vertical: "middle" };
    totalLabelCell.font = { bold: true };

    // Set total QTY in column F
    const totalQtyCell = sheet.getCell(`F${totalRowNumber}`);
    totalQtyCell.value = totalQty;
    totalQtyCell.font = { bold: true };
    totalQtyCell.alignment = { horizontal: "center", vertical: "middle" };

    // Leave columns G, H, I empty as per screenshot

    // Set total Amount in column K
    const totalAmountCell = sheet.getCell(`K${totalRowNumber}`);
    totalAmountCell.value = totalAmount.toFixed(2);
    totalAmountCell.font = { bold: true };
    totalAmountCell.alignment = { horizontal: "center", vertical: "middle" };

    const amountWordsRowNumber = sheet.rowCount + 1;
    sheet.mergeCells(`A${amountWordsRowNumber}:C${amountWordsRowNumber}`);
    sheet.mergeCells(`D${amountWordsRowNumber}:L${amountWordsRowNumber}`);
    const amountTitleCell = sheet.getCell(`A${amountWordsRowNumber}`);
    const amountWordsCell = sheet.getCell(`D${amountWordsRowNumber}`);
    amountTitleCell.value = `Amount in Words:`;
    amountTitleCell.alignment = { horizontal: "right", vertical: "middle" }; // Align title to the right
    amountTitleCell.font = { bold: true };
    amountWordsCell.value = `${rupeesInWords} only.`;
    amountWordsCell.alignment = {
      horizontal: "left",
      vertical: "middle",
      wrapText: true,
    };
    amountWordsCell.font = { italic: true };

    // Apply borders to the "Amount in Words" row

    sheet.getRow(amountWordsRowNumber).eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });

    sheet.getRow(amountWordsRowNumber).eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Apply borders to entire total row
    sheet.getRow(totalRowNumber).eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });

    /* ================= TERMS & CONDITIONS ================= */
    const terms = Array.isArray(order.terms) ? order.terms : [];

    // Merge all
    const allTerms = [...terms];

    if (allTerms.length) {
      // Empty row gap
      const Emptymeger = sheet.rowCount + 1;
      sheet.mergeCells(`A${Emptymeger}:L${Emptymeger}`);

      const titleRowNumber = sheet.rowCount + 1;
      sheet.mergeCells(`A${titleRowNumber}:L${titleRowNumber}`);

      const titleCell = sheet.getCell(`A${titleRowNumber}`);
      titleCell.value = "TERMS & CONDITIONS";
      titleCell.font = { bold: true };
      titleCell.alignment = { horizontal: "left", vertical: "middle" };

      allTerms.forEach((term, index) => {
        const row = sheet.addRow([`${index + 1}. ${term}`]);

        // Merge A–L for each term row
        sheet.mergeCells(`A${row.number}:L${row.number}`);

        row.eachCell((cell) => {
          cell.alignment = {
            horizontal: "left",
            vertical: "top",
            wrapText: true,
          };
          cell.border = {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          };
        });
      });
    }

    /* ================= BILL SUBMISSION ================= */
    const billSubmissionRowNumber = sheet.rowCount + 1;

    // "Bill Submission" title, aligned to the left and bold
    sheet.mergeCells(`A${billSubmissionRowNumber}:L${billSubmissionRowNumber}`);
    const billSubmissionCell = sheet.getCell(`A${billSubmissionRowNumber}`);
    billSubmissionCell.value = "Bill Submission:";
    billSubmissionCell.alignment = {
      horizontal: "left",
      vertical: "middle",
      wrapText: true,
    };
    billSubmissionCell.font = { bold: true };
    billSubmissionCell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };

    // Add each line of the billing address in separate rows
    const billingRows = [
      "The bills shall be submitted to Accounts Department with following billing address:",
      "Manager – F & A",
      "Vrishal Engineering Private Limited",
      "A-34/C, Icchapore GIDC, near Audi Service Center, B/H Premier looms manufacturing unit, Icchapore, Surat- 394510",
      "Phone No: 9081256767",
    ];

    // Loop to add each row
    billingRows.forEach((line, index) => {
      const rowNumber = sheet.rowCount + 1;
      sheet.mergeCells(`A${rowNumber}:L${rowNumber}`);
      const billingCell = sheet.getCell(`A${rowNumber}`);
      billingCell.value = line;
      billingCell.alignment = {
        horizontal: "left",
        vertical: "top",
        wrapText: true,
      };

      // Optional: Apply borders for each row (optional but recommended for clarity)
      sheet.getRow(rowNumber).eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    // Add the "FORMAT" text in the last row, aligned to the right
    const formatRowNumber = sheet.rowCount + 1;
    sheet.mergeCells(`A${formatRowNumber}:L${formatRowNumber}`);
    const formatCell = sheet.getCell(`A${formatRowNumber}`);
    formatCell.value = "FORMAT : VE-D0C-38 REV.00";
    formatCell.alignment = {
      horizontal: "right",
      vertical: "top",
      wrapText: true,
    }; // Right-align the FORMAT text

    // Apply borders to the "FORMAT" row (optional)
    sheet.getRow(formatRowNumber).eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });

    const lastRow = sheet.rowCount;
    const lastColumn = 12; // Column L (which is column 12)
    // Border iuter
    for (let row = 1; row <= lastRow; row++) {
      for (let col = 1; col <= lastColumn; col++) {
        const cell = sheet.getCell(row, col);
        if (row === 1) {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
            bottom: { style: "thin" },
          };
        } else if (row === lastRow) {
          cell.border = {
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
            top: { style: "thin" },
          };
        } else {
          cell.border = {
            left: { style: "thin" },
            right: { style: "thin" },
          };
        }
        if (col === 1) {
          cell.border.left = { style: "thin" };
        }
        if (col === lastColumn) {
          cell.border.right = { style: "thin" };
        }
      }
    }

    sheet.columns = [
      { key: "sn", width: 4 },
      { key: "item", width: 20 },
      { key: "material", width: 15 },
      { key: "manufacturer", width: 30 },
      { key: "unit", width: 8 },
      { key: "qty", width: 8 },
      { key: "rate", width: 10 },
      { key: "price", width: 10 },
      { key: "sgst", width: 9 },
      { key: "cgst", width: 9 },
      { key: "amount", width: 10 },
      { key: "remarks", width: 10 },
    ];

    /* ================= SAVE FILE ================= */
    // const excelDir = path.join(__dirname, "../../xlsx");
    // if (!fs.existsSync(excelDir)) {
    //   fs.mkdirSync(excelDir, { recursive: true });
    // }

    // const filename = `Order_${Date.now()}.xlsx`;
    // const filePath = path.join(excelDir, filename);

    // await workbook.xlsx.writeFile(filePath);

    // const fileUrl = `${process.env.PDF_URL}/excels/${filename}`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Order_${Date.now()}.xlsx`,
    );

    await workbook.xlsx.write(res);
    res.end();

    // return sendResponse(res, 200, true, { file: fileUrl }, "Order Excel generated successfully");
  } catch (error) {
    console.error("downloadOrderExcel error:", error);
    return sendResponse(
      res,
      500,
      false,
      {},
      "Something went wrong while generating Order Excel",
    );
  }
};
