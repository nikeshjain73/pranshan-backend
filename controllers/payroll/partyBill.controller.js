
const express = require("express");
const Party = require("../../models/store/party.model");
const Project = require("../../models/project.model");
const PartyBill = require("../../models/payroll/partyBill.model");
const Transaction = require("../../models/main-store/transaction/transaction.model")
const { Types } = require("mongoose"); // for ObjectId validation
const MultiErpInvoice = require("../../models/erp/Multi/Invoice/multi_invoice.model");
const {singleUpload} = require("../../helper/index");
const { body, validationResult } = require('express-validator');
const InventoryLocation = require('../../models/store/inventory_location.model')
const { sendResponse } = require('../../helper/response');
const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");
const Firm = require('../../models/firm.model')
exports.getAllPartyBills = async (req, res) => {
  try {
    let { page , limit , search = '' } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const searchRegex = new RegExp(search, 'i');

    const aggregationPipeline = [
      { $match: { deleted: false } },

      // Populate project
      {
        $lookup: {
          from: 'bussiness-projects',
          localField: 'project_id',
          foreignField: '_id',
          as: 'project'
        }
      },
      { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },

      // Populate party
      {
        $lookup: {
          from: 'store-parties',
          localField: 'party_id',
          foreignField: '_id',
          as: 'party'
        }
      },
        {
        $lookup: {
          from: 'firms',
          localField: 'firm_id',
          foreignField: '_id',
          as: 'firm'
        }
      },
      { $unwind: { path: '$party', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$firm', preserveNullAndEmptyArrays: true } }
    ];

    // Apply search filter
    if (search) {
      aggregationPipeline.push({
        $match: {
          $or: [
            { po_no: { $regex: searchRegex } },
            { invoice_no: { $regex: searchRegex } },
            { 'project.name': { $regex: searchRegex } },
            { 'party.name': { $regex: searchRegex } },
             { 'firm.name': { $regex: searchRegex } }
          ]
        }
      });
    }

    // Get total count
    const countPipeline = [...aggregationPipeline, { $count: 'total' }];
    const countResult = await PartyBill.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Add pagination and sorting
    aggregationPipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    );

    // Final shape
    aggregationPipeline.push({
      $project: {
        _id: 1,
        po_no: 1,
        invoice_no: 1,
        invoice_date: 1,
        receiving_by: 1,
        receiving_from: 1,
        receiving_date: 1,
        category: 1,
        description: 1,
        amount_with_out_gst: 1,
        gst:1,
        cgst: 1,
        sgst: 1,
        igst: 1,
        tax_Type:1,
        amount_with_gst: 1,
        balance_amount: 1,
        mail_status: 1,
        payment_status: 1,
        remark: 1,
        createdAt: 1,
        project_id: '$project',
        party_id: {
          _id: '$party._id',
          name: '$party.name',
          bank_name: '$party.bank_name',
          bank_acc_no: '$party.bank_acc_no',
          ifsc_code: '$party.ifsc_code'
        },
        firm_id:{
           _id: '$firm._id',
          name: '$firm.name',
        }
      }
    });

    const bills = await PartyBill.aggregate(aggregationPipeline);

    res.status(200).json({
      success: true,
      data: bills,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch party bills'
    });
  }
};

exports.updatePartyBill = async (req, res) => {
  try {
    const billData = { ...req.body };
if (!billData.firm_id) billData.firm_id = null;

    if (req.file) {
      billData.file = req.file.filename;
    }

    const bill = await PartyBill.findByIdAndUpdate(req.params.id, billData, { new: true });

    if (!bill) return res.status(404).json({ success: false, message: "Party bill not found" });


        if (billData.party_id) {
      await Party.findByIdAndUpdate(
        billData.party_id,
        {
        
          bank_name: billData.bank_name,
          ifsc_code: billData.ifsc_code,
          bank_acc_no: billData.bank_acc_no,
        },
        { new: true }
      );
    }

  


    res.status(200).json({ success: true, data: bill });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update party bill" });
  }
};

// Get Party Bill by ID
exports.getPartyBillById = async (req, res) => {
  try {
    const bill = await PartyBill.findById(req.params.id)
      .populate("project_id", "name work_order_no category")
      .populate("party_id", "name bank_name ifsc_code bank_acc_no")
      .populate("firm_id", "name ");
      
    if (!bill) return res.status(404).json({ success: false, message: "Party bill not found" });
    res.status(200).json({ success: true, data: bill });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch party bill" });
  }
};

// Validation middleware
exports.validatePartyBill = [
  body('site').notEmpty().withMessage('Please select site').trim(),
  body('project_id').notEmpty().withMessage('Project is required'),
  body('party_id').notEmpty().withMessage('Party is required'),

  body('invoice_no').notEmpty().withMessage('Invoice No is required').trim(),
  body('invoice_date')
    .notEmpty().withMessage('Invoice Date is required')
    .isISO8601().withMessage('Invoice Date must be a valid date'),

  body('receiving_date')
    .notEmpty().withMessage('Receiving Date is required')
    .isISO8601().withMessage('Receiving Date must be a valid date'),

  body('category').notEmpty().withMessage('Category is required').trim(),
  body('description').notEmpty().withMessage('Description is required').trim(),

  // NOTE: align name with your DB/other code. Here I use `amount_with_out_gst`
  body('amount_with_out_gst')
    .exists().withMessage('Amount without GST is required')
    .bail()
    .isFloat({ min: 0 }).withMessage('Amount without GST must be a number')
    .toFloat(),
 body('tax_type').notEmpty().withMessage('Please Select Tax Type.'),
 
body('gst').notEmpty().isFloat({ min: 0 }).withMessage('GST must be a number'),
  body('cgst').optional({nullable: true}).isFloat({ min: 0 }).withMessage('CGST must be a number').toFloat(),
  body('sgst').optional({nullable: true}).isFloat({ min: 0 }).withMessage('SGST must be a number').toFloat(),
  body('igst').optional({nullable: true}).isFloat({ min: 0 }).withMessage('IGST must be a number').toFloat(),

  body('amount_with_gst')
    .exists().withMessage('Amount with GST is required')
    .bail()
    .isFloat({ min: 0 }).withMessage('Amount with GST must be a number')
    .toFloat(),

  body('bank_name').notEmpty().withMessage('Bank Name is required').trim(),
  body('bank_acc_no').notEmpty().withMessage('Bank Account No is required').trim(),
  body('ifsc_code').notEmpty().withMessage('IFSC Code is required').trim(),
  // mail_status/payment_status are often strings in form-data; convert to boolean
  body('mail_status').optional().toBoolean(),
  body('payment_status').optional().toBoolean(),

  (req, res, next) => {
    const errors = validationResult(req);

    // file checks
    if (!req.file) {
      errors.errors.push({ msg: "File is required", param: "file", location: "body" });
    } else {
      const allowedTypes = ["application/pdf"];
      if (!allowedTypes.includes(req.file.mimetype)) {
        errors.errors.push({ msg: "Only PDF files are allowed", param: "file", location: "body" });
      }

      // e.g., max 5MB
      const maxSize = 3 * 1024 * 1024; 
      if (req.file.size > maxSize) {
        errors.errors.push({ msg: "File size must be less than 3MB", param: "file", location: "body" });
      }
    }

    if (errors.errors.length > 0) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    next();
  }
];

exports.managePartyBill = async (req, res) => {
  try {
    const billData = { ...req.body };
if (!billData.firm_id) billData.firm_id = null;
       billData.mail_status = billData.mail_status === true || billData.mail_status === 'true';
    billData.payment_status = billData.payment_status === true || billData.payment_status === 'true';

  


    if (req.file) {
      billData.file = req.file.filename; // Save file name to DB
    }

    const bill = new PartyBill(billData);
    await bill.save();

    if (billData.party_id) {
      await Party.findByIdAndUpdate(
        billData.party_id,
        {
          bank_name: billData.bank_name,
          ifsc_code: billData.ifsc_code,
          bank_acc_no: billData.bank_acc_no,
        },
        { new: true }
      );
    }

    res.status(201).json({ success: true, data: bill });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to create party bill" });
  }
};


exports.getInvoicesByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ success: false, message: "Project ID required" });
    }

    const invoices = await MultiErpInvoice.find({ projectId })
      .select("projectId invoiceNo invoiceDate totalAmount netAmount items")
      .lean();

    res.status(200).json({ success: true, data: invoices });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

exports.exportPartyBillExcelDownload = async (req, res) => {
  try {
    const bills = await PartyBill.find({ deleted: false })
      .populate("project_id", "name")
      .populate("party_id", "name bank_name bank_acc_no ifsc_code")
       .populate("firm_id", "name")
      .lean();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Bill Received Details");

    worksheet.getRow(1).height = 5;
    worksheet.getRow(2).font = { bold: true };
    worksheet.getRow(2).alignment = { vertical: "middle", horizontal: "center" };

    // ======= Add Logo =======
    try {
      const logoUrl = process.env.LOGO_URL_1;
      if (logoUrl) {
        const logoBuffer = await axios.get(logoUrl, { responseType: "arraybuffer" });
        const imageId = workbook.addImage({ buffer: logoBuffer.data, extension: "png" });
        worksheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 150, height: 60 } });
      }
    } catch (err) {
      console.warn("Logo load failed:", err.message);
    }

    // ======= Company Name =======
    worksheet.mergeCells("D2:M2");
    worksheet.getCell("D2").value = "VISHAL ENTERPRISE & VRISHAL ENGINEERING PRIVATE LIMITED";
    worksheet.getCell("D2").font = { size: 18, bold: true };
    worksheet.getCell("D2").alignment = { horizontal: "center", vertical: "middle" };

    // ======= Merged Header Title =======
    worksheet.mergeCells("H3:I3");
    worksheet.getCell("H3").value = "BILL RECEIVED - 2025-26";
    worksheet.getCell("H3").font = { size: 18, bold: true };
    worksheet.getCell("H3").alignment = { horizontal: "center", vertical: "middle" };

    // ======= Table Column Headers =======
    const headerRow = worksheet.getRow(4);
    headerRow.values = [
      "Sr No",
      "Project",
      "Party",
      "Category",
      "Invoice No",
      "Invoice Date",
      "Receiving Date",
      "Tax Type",
      "Description",
      "Amount Without GST",
      "GST (%)",
      "CGST",
      "SGST",
      "IGST",
      "Amount With GST",
      "PO No",
      "Firm",
      "Bank Name",
      "Bank A/C No",
      "IFSC Code",
      "Mail Sent",
      "Payment Done",
      "Balance Amount",
      "Remark",
    ];
    headerRow.font = { bold: true , size: 12};
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    // ======= COLUMN WIDTHS =======
    worksheet.columns = [
      { key: "sr_no", width: 6 },
      { key: "project_name", width: 25 },
      { key: "party_name", width: 25 },
      { key: "category", width: 15 },
      { key: "invoice_no", width: 18 },
      { key: "invoice_date", width: 15 },
      { key: "receiving_date", width: 15 },
      { key: "tax_type", width: 12 },
      { key: "description", width: 30 },
      { key: "amount_with_out_gst", width: 20 },
      { key: "gst", width: 10 },
      { key: "cgst", width: 10 },
      { key: "sgst", width: 10 },
      { key: "igst", width: 10 },
      { key: "amount_with_gst", width: 20 },
      { key: "po_no", width: 18 },
      { key: "firm_name", width: 12 },
      { key: "bank_name", width: 18 },
      { key: "bank_acc_no", width: 18 },
      { key: "ifsc_code", width: 15 },
      { key: "mail_status", width: 10 },
      { key: "payment_status", width: 12 },
      { key: "balance_amount", width: 15 },
      { key: "remark", width: 25 },
    ];

    // ======= Add Data Rows (from Row 5) =======
    bills.forEach((bill, index) => {
      worksheet.addRow({
        sr_no: index + 1,
        project_name: bill.project_id?.name || "-",
        party_name: bill.party_id?.name || "-",
        category: bill.category || "-",
        invoice_no: bill.invoice_no || "-",
        invoice_date: bill.invoice_date
          ? new Date(bill.invoice_date).toLocaleDateString("en-IN")
          : "-",
        receiving_date: bill.receiving_date
          ? new Date(bill.receiving_date).toLocaleDateString("en-IN")
          : "-",
        tax_type: bill.tax_type || "-",
        description: bill.description || "-",
        amount_with_out_gst: bill.amount_with_out_gst || "-",
        gst: bill.gst || "-",
        cgst: bill.cgst || "-",
        sgst: bill.sgst || "-",
        igst: bill.igst || "-",
        amount_with_gst: bill.amount_with_gst || "-",
        po_no: bill.po_no || "-",
        firm_name: bill.firm_id?.name || "-",
        bank_name: bill.party_id?.bank_name || "-",
        bank_acc_no: bill.party_id?.bank_acc_no || "-",
        ifsc_code: bill.party_id?.ifsc_code || "-",
        mail_status: bill.mail_status ? "Yes" : "No",
        payment_status: bill.payment_status ? "Paid" : "Pending",
        balance_amount: bill.balance_amount || "-",
        remark: bill.remark || "-",
      });
    });

    // ======= Apply Border to All Cells =======
    const totalRows = worksheet.rowCount;
    for (let i = 4; i <= totalRows; i++) {
      const row = worksheet.getRow(i);
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    }

   
   const xlsxDir = path.join(__dirname, "../../xlsx");
    if (!fs.existsSync(xlsxDir)) fs.mkdirSync(xlsxDir, { recursive: true });

    const fileName = `BILL_RECEIVED_${Date.now()}.xlsx`;
    const filePath = path.join(xlsxDir, fileName);

    await workbook.xlsx.writeFile(filePath);

    // ======= Return file URL =======
    const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const fileUrl = `${protocol}://${req.get("host")}/xlsx/${fileName}`;

    return sendResponse(res, 200, true, { fileUrl }, "Excel file generated successfully");

  } catch (err) {
    console.error("Excel Export Error:", err);
    return sendResponse(res, 500, false, {}, "Failed to export Excel");
  }
};

exports.getPartyByProjectAndBankDetails = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ success: false, message: "Project ID required" });
    }

    const parties = await Transaction.find({ projectId })
      .populate("party_id", "name bank_name bank_acc_no ifsc_code city") // make sure field name is correct
      .lean();

    const result = parties.map((p) => ({
      _id: p.party_id?._id,
      name: p.party_id?.name,
      bank_name: p.party_id?.bank_name,
      bank_acc_no: p.party_id?.bank_acc_no,
      ifsc_code: p.party_id?.ifsc_code,
      city: p.party_id?.city,
    })).filter(p => p._id); // filter out nulls

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching parties:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

exports.deletePartyBill = async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await PartyBill.findById(id);
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Party Bill not found' });
    }

    // Option 1: Soft delete
    bill.deleted = true;
    await bill.save();

    // Option 2: Hard delete
    // await PartyBill.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: 'Party Bill deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to delete Party Bill' });
  }
};

exports.getSiteLocation = async (req, res) => {
    if (req.user && !req.error) {
        try {
            await InventoryLocation.find({ deleted: false }, { deleted: 0 })
                .sort({ createdAt: -1 })
                .then(data => {
                    if (data) {
                        sendResponse(res, 200, true, data, 'Inventory location List');
                    }
                    else {
                        sendResponse(res, 200, true, [], 'Inventory location not found');
                    }
                })
        } catch (error) {
            sendResponse(res, 500, false, {}, 'Something went wrong');
        }
    } else {
        sendResponse(res, 401, false, {}, 'Unauthorized');
    }
}

exports.getPoByParty = async (req, res) => {
  try {
    const { partyId } = req.params;

    if (!partyId) {
      return res.status(400).json({ success: false, message: "Party ID required" });
    }

    const poData = await Transaction.find({ party_id: partyId })
      .select("po_no receive_date receiver_name received_by")
      .lean();

    res.status(200).json({ success: true, data: poData });
  } catch (error) {
    console.error("Error fetching PO data:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

exports.getAllParties = async (req, res) => {
  try {
    const parties = await Party.find({ deleted: false }).select("name city bank_name bank_acc_no ifsc_code");

    res.status(200).json({ success: true, data: parties });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find({ deleted: false })
      .select("name") // Only return the "name" field
      .populate("party", "name"); // Also populate party name only

    res.status(200).json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



exports.getFirmPartyBill = async (req, res) => {
    if (req.user && !req.error) {
        try {
            await Firm.find({ status: true, deleted: false }, { deleted: 0, password: 0 }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, data, "Firms list")
                } else {
                    sendResponse(res, 400, false, {}, "Firms not found")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}


