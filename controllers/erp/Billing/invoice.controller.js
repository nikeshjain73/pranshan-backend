const InvoiceTable = require('../../../models/erp/Billing/invoice.model');
const { sendResponse } = require('../../../helper/response');
const packingModel = require('../../../models/erp/Packing/packing.model');
const mongoose = require('mongoose');
const { amountInWords, generateDynamicRows, generateoneRows, generatetwoRows } = require('../../../helper');
const ObjectId = mongoose.Types.ObjectId;
const ExcelJS = require('exceljs');
const axios = require('axios');
const ejs = require("ejs");
const fs = require("fs");
const puppeteer = require("puppeteer");
const path = require("path");
const XLSX = require('xlsx');  // for utility functions
const XLSXStyle = require('xlsx-style');  // for styling
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;

exports.manageInvoice = async (req, res) => {
    const { id, party_id, project_id, invoice_date, vehicle_no, driver_name, transport_id, lr_no, lr_date, tag_id, items, packing_list } = req.body;
    if (party_id && project_id && transport_id) {
        try {
            const newItems = JSON.parse(items);
            const packingList = JSON.parse(packing_list);
            const packingIds = packingList.map(packing => new mongoose.Types.ObjectId(packing.packing_id));

            if (!id) {
                const lastInvoiceDetails = await InvoiceTable.findOne({ deleted: false }).sort({ createdAt: -1 });
                let gen_invoice_no = 100001;
                if (lastInvoiceDetails) {
                    const lastInvoice = lastInvoiceDetails?.invoice_no;
                    gen_invoice_no = parseInt(lastInvoice) + 1;
                }

                const object = new InvoiceTable({
                    party_id,
                    project_id,
                    invoice_no: gen_invoice_no,
                    invoice_date,
                    vehicle_no,
                    driver_name,
                    transport_id,
                    lr_no,
                    lr_date,
                    tag_id,
                    items: newItems,
                    packing_list: packingList,
                });

                await object.save().then(async (data) => {
                    await packingModel.updateMany({ _id: { $in: packingIds } }, { is_invoice_generated: true });
                    return data !== null ? sendResponse(res, 200, true, {}, 'Invoice created successfully') : sendResponse(res, 500, false, {},);
                });

            } else {
                const existingInvoice = await InvoiceTable.findById(id);

                if (existingInvoice) {
                    const previousPackingList = existingInvoice.packing_list.map(p => new mongoose.Types.ObjectId(p.packing_id));
                    const removedPackings = previousPackingList.filter(packingId => !packingIds.includes(packingId));

                    if (removedPackings.length > 0) {
                        await packingModel.updateMany({ _id: { $in: removedPackings } }, { is_invoice_generated: false });
                    }

                    await packingModel.updateMany({ _id: { $in: packingIds } }, { is_invoice_generated: true });

                    await InvoiceTable.findByIdAndUpdate(id, {
                        party_id,
                        project_id,
                        invoice_date,
                        vehicle_no,
                        driver_name,
                        transport_id,
                        lr_no,
                        lr_date,
                        tag_id,
                        items: newItems,
                        packing_list: packingList,
                    }).then((invoice) => {
                        return invoice != null ? sendResponse(res, 200, true, {}, 'Invoice updated successfully') : sendResponse(res, 500, false, {}, 'Invoice not updated successfully');
                    });
                } else {
                    sendResponse(res, 404, false, {}, 'Invoice not found');
                }
            }
        } catch (err) {
            console.error(err);
            sendResponse(res, 500, false, {}, 'Internal Server Error');
        }
    } else {
        sendResponse(res, 401, false, {}, 'Unauthorized');
    }
};

exports.getInvoice = async (req, res) => {
    if (req.user && !req.error) {
        try {
            const invoiceList = await InvoiceTable.find({ deleted: false })
                .populate({
                    path: 'party_id',
                    select: 'name address address_two address_three city state pincode phone email gstNumber partyGroup',
                    populate: { path: 'partyGroup', select: 'name' }
                })
                .populate('project_id', 'name work_order_no')
                .populate('transport_id', 'name email address phone')
                .populate({
                    path: 'packing_list', select: 'packing_id'
                });

            if (invoiceList.length > 0) {
                sendResponse(res, 200, true, invoiceList, 'Invoice list fetched successfully');
            } else {
                sendResponse(res, 200, true, [], 'No invoice found');
            }
        } catch (err) {
            sendResponse(res, 500, false, {}, 'Internal Server Error');
            return;
        }
    } else {
        sendResponse(res, 401, false, {}, 'Unauthorized');
        return;
    }
}

exports.deleteInvoice = async (req, res) => {
    if (req.user && !req.error) {
        try {
            const invoice = await InvoiceTable.findById(req.body.id);
            if (invoice) {
                const packingList = invoice.packing_list.map(p => new mongoose.Types.ObjectId(p.packing_id));

                if (packingList.length > 0) {
                    await packingModel.updateMany({ _id: { $in: packingList } }, { is_invoice_generated: false });
                }
                await InvoiceTable.findByIdAndUpdate(req.body.id, { deleted: true }, { new: true }).exec();

                sendResponse(res, 200, true, {}, 'Invoice deleted successfully');
            } else {
                sendResponse(res, 404, false, {}, 'Invoice not found');
            }
        } catch (err) {
            sendResponse(res, 500, false, {}, 'Internal Server Error');
        }
    } else {
        sendResponse(res, 401, false, {}, 'Unauthorized');
    }
};

const oneInvoice = async (id) => {
    try {
        const requestData = await InvoiceTable.aggregate([
            { $match: { deleted: false, _id: new ObjectId(id) } },
            {
                $addFields: {
                    items_details: "$items"
                }
            },
            { $unwind: "$items_details" },
            {
                $lookup: {
                    from: "store-items",
                    localField: "items_details.item_id",
                    foreignField: "_id",
                    as: "itemDetails",
                },
            },
            {
                $lookup: {
                    from: "store-parties",
                    localField: "party_id",
                    foreignField: "_id",
                    as: "partyDetails",
                },
            },
            {
                $lookup: {
                    from: "bussiness-projects",
                    localField: "project_id",
                    foreignField: "_id",
                    as: "projectDetails",
                },
            },
            {
                $lookup: {
                    from: "firms",
                    localField: "firm_id",
                    foreignField: "_id",
                    as: "firmDetails",
                },
            },
            {
                $lookup: {
                    from: "store-transports",
                    localField: "transport_id",
                    foreignField: "_id",
                    as: "transportDetails",
                },
            },
            {
                $lookup: {
                    from: "tags",
                    localField: "tag_id",
                    foreignField: "_id",
                    as: "tagDetails",
                },
            },
            {
                $addFields: {
                    party_name: { $arrayElemAt: ["$partyDetails.name", 0] },
                    party_full_address: {
                        $trim: {
                            input: {
                                $reduce: {
                                    input: [
                                        { $ifNull: [{ $arrayElemAt: ["$partyDetails.address", 0] }, ""] },
                                        { $ifNull: [{ $arrayElemAt: ["$partyDetails.address_two", 0] }, ""] },
                                        { $ifNull: [{ $arrayElemAt: ["$partyDetails.address_three", 0] }, ""] },
                                        { $ifNull: [{ $arrayElemAt: ["$partyDetails.city", 0] }, ""] },
                                        { $ifNull: [{ $arrayElemAt: ["$partyDetails.state", 0] }, ""] },
                                        { $ifNull: [{ $toString: { $arrayElemAt: ["$partyDetails.pincode", 0] } }, ""] }
                                    ],
                                    initialValue: "",
                                    in: {
                                        $cond: {
                                            if: { $eq: ["$$value", ""] },
                                            then: "$$this",
                                            else: {
                                                $cond: {
                                                    if: { $eq: ["$$this", ""] },
                                                    then: "$$value",
                                                    else: { $concat: ["$$value", ",", "$$this"] }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    party_gstNumber: { $arrayElemAt: ["$partyDetails.gstNumber", 0] },
                    party_phone: { $arrayElemAt: ["$partyDetails.phone", 0] },
                    party_email: { $arrayElemAt: ["$partyDetails.email", 0] },
                    party_state: { $arrayElemAt: ["$partyDetails.state", 0] },
                    firm_name: { $arrayElemAt: ["$firmDetails.name", 0] },
                    firm_full_address: {
                        $trim: {
                            input: {
                                $reduce: {
                                    input: [
                                        { $ifNull: [{ $arrayElemAt: ["$firmDetails.address", 0] }, ""] },
                                        { $ifNull: [{ $arrayElemAt: ["$firmDetails.address_two", 0] }, ""] },
                                        { $ifNull: [{ $arrayElemAt: ["$firmDetails.address_three", 0] }, ""] },
                                        { $ifNull: [{ $arrayElemAt: ["$firmDetails.city", 0] }, ""] },
                                        { $ifNull: [{ $arrayElemAt: ["$firmDetails.state", 0] }, ""] },
                                        { $ifNull: [{ $toString: { $arrayElemAt: ["$firmDetails.pincode", 0] } }, ""] }
                                    ],
                                    initialValue: "",
                                    in: {
                                        $cond: {
                                            if: { $eq: ["$$value", ""] },
                                            then: "$$this",
                                            else: {
                                                $cond: {
                                                    if: { $eq: ["$$this", ""] },
                                                    then: "$$value",
                                                    else: { $concat: ["$$value", ",", "$$this"] }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    firm_gstNumber: { $arrayElemAt: ["$firmDetails.gstNumber", 0] },
                    firm_phone: { $arrayElemAt: ["$firmDetails.mobile_number", 0] },
                    firm_email: { $arrayElemAt: ["$firmDetails.email", 0] },
                    firm_state: { $arrayElemAt: ["$firmDetails.state", 0] },
                    project_name: { $arrayElemAt: ["$projectDetails.name", 0] },
                    project_order_no: { $arrayElemAt: ["$projectDetails.work_order_no", 0] },
                    transport_name: { $arrayElemAt: ["$transportDetails.name", 0] },
                    tag_number: { $arrayElemAt: ["$tagDetails.tag_number", 0] },
                    item_name: { $arrayElemAt: ["$itemDetails.name", 0] },
                    hsn_code: { $arrayElemAt: ["$itemDetails.hsn_code", 0] },
                },
            },
            {
                $group: {
                    _id: {
                        _id: "$_id",
                        party_full_address: "$party_full_address",
                        party_name: "$party_name",
                        party_gstNumber: "$party_gstNumber",
                        party_phone: "$party_phone",
                        party_email: "$party_email",
                        party_state: "$party_state",
                        firm_full_address: "$firm_full_address",
                        firm_name: "$firm_name",
                        firm_gstNumber: "$firm_gstNumber",
                        firm_phone: "$firm_phone",
                        firm_email: "$firm_email",
                        firm_state: "$firm_state",
                        invoice_no: "$invoice_no",
                        invoice_date: "$invoice_date",
                        project_order_no: "$project_order_no",
                        vehicle_no: "$vehicle_no",
                        driver_name: "$driver_name",
                        project_name: "$project_name",
                        transport_name: "$transport_name",
                        lr_no: "$lr_no",
                        lr_date: "$lr_date",
                        tag_number: "$tag_number",
                    },
                    items: {
                        $push: {
                            _id: "$items_details._id",
                            unit: "$items_details.unit",
                            item_name: "$item_name",
                            m_code: "$items_details.m_code",
                            hsn_code: "$hsn_code",
                            quantity: "$items_details.quantity",
                            rate: "$items_details.rate",
                            amount: "$items_details.amount",
                            gst: "$items_details.gst",
                            gst_amount: "$items_details.gst_amount",
                            total_amount: "$items_details.total_amount",
                            remarks: "$items_details.remarks",
                        }
                    },
                    total_qty: { $sum: "$items_details.quantity" },
                    amt: { $sum: "$items_details.amount" },
                    gst_amt: { $sum: "$items_details.gst_amount" },
                    total_amt: { $sum: "$items_details.total_amount" },
                },
            },
            {
                $addFields: {
                    net_amt: {
                        $round: ["$total_amt", 0]
                    },
                }
            },
            {
                $addFields: {
                    round_amt: {
                        $round: [
                            {
                                $subtract: ["$net_amt", "$total_amt"]
                            },
                            2
                        ]
                    }
                }
            },
            {
                $project: {
                    _id: "$_id._id",
                    party_full_address: "$_id.party_full_address",
                    party_name: "$_id.party_name",
                    party_gstNumber: "$_id.party_gstNumber",
                    party_phone: "$_id.party_phone",
                    party_email: "$_id.party_email",
                    party_state: "$_id.party_state",
                    firm_full_address: "$_id.firm_full_address",
                    firm_name: "$_id.firm_name",
                    firm_gstNumber: "$_id.firm_gstNumber",
                    firm_phone: "$_id.firm_phone",
                    firm_email: "$_id.firm_email",
                    firm_state: "$_id.firm_state",
                    invoice_no: "$_id.invoice_no",
                    invoice_date: "$_id.invoice_date",
                    project_order_no: "$_id.project_order_no",
                    vehicle_no: "$_id.vehicle_no",
                    driver_name: "$_id.driver_name",
                    project_name: "$_id.project_name",
                    transport_name: "$_id.transport_name",
                    lr_no: "$_id.lr_no",
                    lr_date: "$_id.lr_date",
                    tag_number: "$_id.tag_number",
                    items: 1,
                    total_qty: 1,
                    amt: 1,
                    gst_amt: 1,
                    total_amt: 1,
                    round_amt: 1,
                    net_amt: 1,
                },
            }
        ]);


        if (requestData.length && requestData.length > 0) {
            return { status: 1, result: requestData };
        } else {
            return { status: 0, result: [] };
        }
    } catch (error) {
        return { status: 2, result: error };
    }
};

exports.getOneInvoice = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await oneInvoice(id)
            if (data.status === 1) {
                let requestData = data.result[0];
                requestData.net_amt_word = await amountInWords(requestData.net_amt);
                sendResponse(res, 200, true, requestData, `Invoice list`);
            } else if (data.status === 0) {
                sendResponse(res, 200, true, [], `Invoice not found`);
            } else if (data.status === 2) {
                console.log("dataaaaa", data.result)
                sendResponse(res, 500, false, {}, "Something went wrong111");
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.downloadOneInvoice = async (req, res) => {
    const { id, print_date } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await oneInvoice(id)
            let requestData = data.result[0];
            requestData.net_amt_word = await amountInWords(requestData.net_amt);

            if (data.status === 1) {
                const template = fs.readFileSync(
                    "templates/oneInvoice.html",
                    "utf-8"
                );

                const renderedHtml = ejs.render(template, {
                    requestData,
                    logoUrl1: process.env.LOGO_URL_1,
                    logoUrl2: process.env.LOGO_URL_2,
                });

                const browser = await puppeteer.launch({
                    headless: true,
                    args: ["--no-sandbox", "--disable-setuid-sandbox"],
                    executablePath: PATH,
                });

                const page = await browser.newPage();

                await page.setContent(renderedHtml, {
                    baseUrl: `${URI}`,
                });

                const pdfBuffer = await page.pdf({
                    format: "A4",
                    margin: {
                        top: "0.5in",
                        right: "0.5in",
                        bottom: "0.7in",
                        left: "0.5in",
                    },
                    printBackground: true,
                    preferCSSPageSize: true,
                    displayHeaderFooter: true,
                    footerTemplate: `
                        <div style="font-size: 14px; width: 100%; text-align: right; padding-right: 50px; padding-bottom: 30px;">
                            ${print_date ? `<span>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>` : ''}
                            ${print_date ? '&nbsp;&nbsp;&nbsp;' : ''}
                            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
                        </div>
                    `,
                    headerTemplate: `<div></div>`,
                    compress: true,
                });

                await browser.close();

                const pdfsDir = path.join(__dirname, "../../../pdfs");
                if (!fs.existsSync(pdfsDir)) {
                    fs.mkdirSync(pdfsDir);
                }

                const filename = `invoice_${Date.now()}.pdf`;
                const filePath = path.join(__dirname, "../../../pdfs", filename);

                fs.writeFileSync(filePath, pdfBuffer);

                const fileUrl = `${URI}/pdfs/${filename}`;

                sendResponse(
                    res,
                    200,
                    true,
                    { file: fileUrl },
                    "PDF downloaded Successfully"
                );
            }
            else if (data.status === 0) {
                sendResponse(res, 200, false, {}, `Purchase Order not found`)
            }
            else if (data.status === 2) {
                sendResponse(res, 500, false, {}, "Something went wrong");
            }
        } catch (error) {
            console.log("error", error);
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

// exports.xlsxOneInvoice = async (req, res) => {
//     const { id, print_date } = req.body;

//     if (req.user && !req.error) {
//         try {
//             const data = await oneInvoice(id);
//             let requestData = data.result[0];
//             requestData.net_amt_word = await amountInWords(requestData.net_amt);

//             if (data.status === 1) {
//                 const workbook = new ExcelJS.Workbook();
//                 const worksheet = workbook.addWorksheet('Invoice');

//                 const logoUrl1 = process.env.LOGO_URL_1;
//                 const logoUrl2 = process.env.LOGO_URL_2;

//                 const logo1Promise = axios.get(logoUrl1, { responseType: 'arraybuffer' });
//                 const logo2Promise = axios.get(logoUrl2, { responseType: 'arraybuffer' });

//                 const [logo1Response, logo2Response] = await Promise.all([logo1Promise, logo2Promise]);

//                 const logo1Image = workbook.addImage({
//                     buffer: logo1Response.data,
//                     extension: 'jpeg'
//                 });

//                 const logo2Image = workbook.addImage({
//                     buffer: logo2Response.data,
//                     extension: 'jpeg'
//                 });

//                 worksheet.addImage(logo1Image, {
//                     tl: { col: 0, row: 0 },
//                     ext: { width: 80, height: 80 }
//                 });

//                 // Row 1
//                 worksheet.mergeCells('B1:F1');
//                 const textCell = worksheet.getCell('B1');
//                 textCell.value = `VISHAL ENTERPRISE & VRISHAL ENGINEERING PRIVATE LIMITED\nGROUP OF COMPANIES`;
//                 textCell.alignment = { horizontal: 'center', vertical: 'middle' };
//                 textCell.font = { size: 16, bold: true };
//                 textCell.border = {
//                     top: { style: 'thick' },
//                     left: { style: 'thick' },
//                     bottom: { style: 'thick' },
//                     right: { style: 'thick' }
//                 };
//                 textCell.protection = { locked: false };
//                 textCell.alignment.wrapText = true;

//                 worksheet.addImage(logo2Image, {
//                     tl: { col: 6, row: 0 },
//                     ext: { width: 80, height: 80 }
//                 });

//                 worksheet.getRow(1).height = 75;
//                 worksheet.getColumn(1).width = 11
//                 worksheet.getColumn(2).width = 45
//                 worksheet.getColumn(3).width = 13
//                 worksheet.getColumn(4).width = 8
//                 worksheet.getColumn(5).width = 10
//                 worksheet.getColumn(6).width = 11
//                 worksheet.getColumn(7).width = 11

//                 // Row 2
//                 worksheet.mergeCells('A2:B2');
//                 const mergedCell = worksheet.getCell('A2');
//                 mergedCell.value = `${requestData.party_name}\n${requestData.party_full_address}\nGSTIN/UIN : ${requestData.party_gstNumber}\nState : ${requestData.party_state}\nEmail : ${requestData.party_email}\nMobile No. : ${requestData.party_phone}`;
//                 mergedCell.alignment = { horizontal: 'left', vertical: 'middle' };
//                 mergedCell.font = { size: 11, bold: false };
//                 mergedCell.border = {
//                     top: { style: 'thick' },
//                     left: { style: 'thick' },
//                     bottom: { style: 'thick' },
//                     right: { style: 'thick' }
//                 };
//                 mergedCell.protection = { locked: false };
//                 mergedCell.alignment.wrapText = true;
//                 worksheet.getRow(2).height = 110;

//                 worksheet.mergeCells('C2:G2');
//                 const mergedContentCell = worksheet.getCell('C2');
//                 mergedContentCell.value = `Invoice No. : ${requestData.invoice_no}\nInvoice Date : ${new Date(requestData.invoice_date).toDateString()}\nOrder No. : ${requestData.project_order_no}`;
//                 mergedContentCell.alignment = { horizontal: 'left', vertical: 'middle' };
//                 mergedContentCell.font = { size: 11, bold: true };
//                 mergedContentCell.border = {
//                     top: { style: 'thick' },
//                     left: { style: 'thick' },
//                     bottom: { style: 'thick' },
//                     right: { style: 'thick' }
//                 };
//                 mergedContentCell.protection = { locked: false };
//                 mergedContentCell.alignment.wrapText = true;
//                 worksheet.getRow(2).height = 110;

//                 // Row 3
//                 worksheet.mergeCells('A3:B3');
//                 const mergedCell3 = worksheet.getCell('A3');
//                 mergedCell3.value = `Consignee (Ship to)\n${requestData.party_name}\n${requestData.party_full_address}\nGSTIN/UIN : ${requestData.party_gstNumber}\nState : ${requestData.party_state}\nMobile No. : ${requestData.party_phone}`;
//                 mergedCell3.alignment = { horizontal: 'left', vertical: 'middle' };
//                 mergedCell.font = { size: 11, bold: false };
//                 mergedCell3.border = {
//                     top: { style: 'thick' },
//                     left: { style: 'thick' },
//                     bottom: { style: 'thick' },
//                     right: { style: 'thick' }
//                 };
//                 mergedCell3.protection = { locked: false };
//                 mergedCell3.alignment.wrapText = true;
//                 worksheet.getRow(3).height = 110;

//                 worksheet.mergeCells('C3:G3');
//                 const mergedContentCell3 = worksheet.getCell('C3');
//                 mergedContentCell3.value = `LR No. : ${requestData.lr_no}\nLR Date : ${new Date(requestData.lr_date).toDateString()}\nTransport Name : ${requestData.transport_name}`;
//                 mergedContentCell3.alignment = { horizontal: 'left', vertical: 'middle' };
//                 mergedContentCell3.font = { size: 11, bold: true };
//                 mergedContentCell3.border = {
//                     top: { style: 'thick' },
//                     left: { style: 'thick' },
//                     bottom: { style: 'thick' },
//                     right: { style: 'thick' }
//                 };
//                 mergedContentCell3.protection = { locked: false };
//                 mergedContentCell3.alignment.wrapText = true;
//                 worksheet.getRow(3).height = 110;

//                 // Row 4
//                 worksheet.mergeCells('A4:B4');
//                 const mergedCell4 = worksheet.getCell('A4');
//                 mergedCell4.value = `Buyer (Bill to)\n${requestData.party_name}\n${requestData.party_full_address}\nGSTIN/UIN : ${requestData.party_gstNumber}\nState : ${requestData.party_state}\nMobile No. : ${requestData.party_phone}`;
//                 mergedCell4.alignment = { horizontal: 'left', vertical: 'middle' };
//                 mergedCell.font = { size: 11, bold: false };
//                 mergedCell4.border = {
//                     top: { style: 'thick' },
//                     left: { style: 'thick' },
//                     bottom: { style: 'thick' },
//                     right: { style: 'thick' }
//                 };
//                 mergedCell4.protection = { locked: false };
//                 mergedCell4.alignment.wrapText = true;
//                 worksheet.getRow(4).height = 110;

//                 worksheet.mergeCells('C4:G4');
//                 const mergedContentCell4 = worksheet.getCell('C4');
//                 mergedContentCell4.value = `Vehicle No. : ${requestData.vehicle_no}\nDriver Name : ${requestData.driver_name}\nProject Name : ${requestData.project_name}`;;
//                 mergedContentCell4.alignment = { horizontal: 'left', vertical: 'middle' };
//                 mergedContentCell4.protection = { locked: false };
//                 mergedContentCell4.border = {
//                     top: { style: 'thick' },
//                     left: { style: 'thick' },
//                     bottom: { style: 'thick' },
//                     right: { style: 'thick' }
//                 };
//                 mergedContentCell4.font = { size: 11, bold: true };
//                 mergedContentCell4.alignment.wrapText = true;
//                 worksheet.getRow(4).height = 110;

//                 const headers = ['Sr No.', 'Item Name', 'HSN', 'GST(%)', 'Qty', 'Rate', 'Amount'];
//                 const headerRow = worksheet.addRow(headers);

//                 headerRow.eachCell((cell) => {
//                     cell.font = { bold: true, size: 13 };
//                     cell.border = {
//                         top: { style: 'thick' },
//                         left: { style: 'thick' },
//                         bottom: { style: 'thick' },
//                         right: { style: 'thick' }
//                     };
//                     cell.alignment = { horizontal: 'center', vertical: 'middle' };
//                 });

//                 let srNo = 1;
//                 requestData.items.forEach(item => {
//                     const quantity = item.quantity ? parseFloat(item.quantity) : 0.000;
//                     const rate = item.rate ? parseFloat(item.rate) : 0.00;
//                     const amount = item.amount ? parseFloat(item.amount) : 0.00;

//                     const newRow = worksheet.addRow([
//                         srNo++,
//                         item.item_name || '--',
//                         item.hsn_code || '--',
//                         item.gst || 0,
//                         parseFloat(quantity.toFixed(3)),
//                         parseFloat(rate.toFixed(2)),
//                         parseFloat(amount.toFixed(2))
//                     ]);

//                     newRow.eachCell({ includeEmpty: true }, (cell) => {
//                         cell.border = {
//                             top: { style: 'thick' },
//                             left: { style: 'thick' },
//                             bottom: { style: 'thick' },
//                             right: { style: 'thick' }
//                         };
//                     });
//                 });

//                 worksheet.getRow(5).height = 30;

//                 let Obj = {}

//                 if (requestData.party_state.toLowerCase() === 'gujarat') {
//                     Obj["CGST"] = (requestData.gst_amt ? (requestData.gst_amt / 2).toFixed(2) : '0.00');
//                     Obj["SGST"] = (requestData.gst_amt ? (requestData.gst_amt / 2).toFixed(2) : '0.00');
//                 } else {
//                     Obj["IGST"] = requestData.gst_amt;
//                 }

//                 Obj = {
//                     ...Obj,
//                     "Total Amount": requestData.total_amt,
//                     "+ / - Amount": requestData.round_amt,
//                     "Net Amount": `₹ ${requestData.net_amt ? requestData.net_amt.toFixed(2) : '0.00'}`,
//                 };
//                 const objLength = Object.keys(Obj).length;

//                 let Obj1 = {
//                     "Amount (in words)": `Amount (in words)\n₹ ${requestData.net_amt_word}`,
//                 };
//                 const obj1Length = Object.keys(Obj1).length;

//                 let Obj2 = {
//                     "RECEIVED BY": `AUTHORIZE BY`,
//                     "": ""
//                 };
//                 const obj2Length = Object.keys(Obj2).length;

//                 let Obj3 = {
//                     "Declaration": `Declaration\nWe declare that this invoice shows the actual price of the Service/Goods described and that all particulars are true and correct.`,
//                 };
//                 const obj3Length = Object.keys(Obj3).length;

//                 let Obj4 = {
//                     "Notice": `SUBJECT TO SURAT JURISDICTION`,
//                     "Notice1": `This is a Computer generated Invoice`,
//                 };
//                 const obj4Length = Object.keys(Obj4).length;

//                 await generatetwoRows(worksheet, 5 + srNo, objLength, Obj, 11, 'right', 22, true);
//                 await generateoneRows(worksheet, 5 + srNo + objLength, obj1Length, Obj1, 10, 'left', 40, true);
//                 await generatetwoRows(worksheet, 5 + srNo + objLength + obj1Length, obj2Length, Obj2, 12, 'center', 30, true);
//                 await generateoneRows(worksheet, 5 + srNo + objLength + obj1Length + obj2Length, obj3Length, Obj3, 10, 'left', 40, false);
//                 await generateoneRows(worksheet, 5 + srNo + objLength + obj1Length + obj2Length + obj3Length, obj4Length, Obj4, 11, 'center', 30, true);

//                 const xlsxPath = path.join(__dirname, '../../../xlsx');
//                 if (!fs.existsSync(xlsxPath)) {
//                     fs.mkdirSync(xlsxPath, { recursive: true });
//                 }

//                 const filename = `Invoice_${Date.now()}.xlsx`;
//                 const filePath = path.join(xlsxPath, filename);

//                 await workbook.xlsx.writeFile(filePath);

//                 const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
//                 const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;

//                 sendResponse(res, 200, true, { file: fileUrl }, `XLSX file generated successfully`);

//             } else if (data.status === 0) {
//                 sendResponse(res, 200, false, {}, `${tag} report not found`);
//             } else if (data.status === 2) {
//                 sendResponse(res, 500, false, {}, "Something went wrong111");
//             }
//         } catch (error) {
//             console.log("error", error);
//             sendResponse(res, 500, false, {}, "Something went wrong");
//         }
//     } else {
//         sendResponse(res, 401, false, {}, "Unauthorized");
//     }
// }

exports.xlsxOneInvoice = async (req, res) => {
    const {
        id,
        print_date
    } = req.body;

    if (req.user && !req.error) {
        try {
            const data = await oneInvoice(id)
            let requestData = data.result[0];
            requestData.net_amt_word = await amountInWords(requestData.net_amt);

            if (data.status === 1) {
                const wb = XLSX.utils.book_new();
                let ws

                const headerStyle = {
                    font: { bold: true }, fill: { fgColor: { rgb: "fdc686" } }, alignment: { horizontal: 'center', vertical: 'middle' }
                };

                const headerStyle1 = {
                    font: { size: 2, bold: false }, alignment: { horizontal: 'left', vertical: 'middle' },
                };

                const headerStyle2 = {
                    font: { size: 16, bold: true }, fill: { fgColor: { rgb: 'fdc686' } }, alignment: { horizontal: 'center', vertical: 'middle' },
                };

                const headerStyle3 = {
                    font: { bold: true }, alignment: { horizontal: 'center', vertical: 'middle' },
                };

                const headerStyle4 = {
                    font: { bold: true }, alignment: { horizontal: 'right', vertical: 'middle' },
                };

                const headerStyle5 = {
                    font: { bold: false }, alignment: { horizontal: 'center', vertical: 'middle' },
                };

                // *** Do not remove space ***
                const ws_data = [[
                    { v: `VISHAL ENTERPRISE & VRISHAL ENGINEERING PRIVATE LIMITED GROUP OF COMPANIES`, s: headerStyle2 },], [
                    { v: `INVOICE`, s: headerStyle3 },
                    "",
                    print_date ? { v: `Download Date : ${new Date().toLocaleDateString()}`, s: headerStyle3 } : ""], [
                    { v: `Invoice No.           : ${requestData.invoice_no}`, s: headerStyle1 },
                    "",
                    requestData.invoice_date ? { v: `Invoice Date          : ${new Date(requestData.invoice_date).toLocaleDateString()}`, s: headerStyle1 } : ""], [
                    { v: `Order No.             : ${requestData.project_order_no}`, s: headerStyle1 },
                    "",
                    { v: `Project                   : ${requestData.project_name}`, s: headerStyle1 },], [
                    { v: `LR No.                   : ${requestData.lr_no}`, s: headerStyle1 },
                    "",
                    requestData.lr_date ? { v: `LR Date                  : ${new Date(requestData.lr_date).toLocaleDateString()}`, s: headerStyle1 } : ""], [
                    { v: `Party                     : ${requestData.party_name}`, s: headerStyle1 },
                    "",
                    { v: `Transport              : ${requestData.transport_name}`, s: headerStyle1 },], [
                    { v: `Vehicle No.           : ${requestData.vehicle_no}`, s: headerStyle1 },
                    "",
                    { v: `Driver                    : ${requestData.driver_name}`, s: headerStyle1 },
                ]];

                const headers = [
                    { v: "Sr No.", s: headerStyle },
                    { v: "Item Name", s: headerStyle },
                    { v: "HSN", s: headerStyle },
                    { v: "GST(%)", s: headerStyle },
                    { v: "Qty", s: headerStyle },
                    { v: "Rate", s: headerStyle },
                    { v: "Amount", s: headerStyle }
                ];

                ws_data.push(headers);

                requestData.items.forEach((item, itemIndex) => {
                    const row = [
                        itemIndex + 1,
                        item.item_name,
                        item.hsn_code ? item.hsn_code : '--',
                        item.gst ? item.gst : 0,
                        item.quantity ? parseFloat(item.quantity.toFixed(3)) : '0.000',
                        item.rate ? parseFloat(item.rate.toFixed(2)) : '0.00',
                        item.amount ? parseFloat(item.amount.toFixed(2)) : '0.00',
                    ];

                    ws_data.push(row);
                });
                ws_data.push([]);

                if (requestData.party_state.toLowerCase() === "gujarat") {
                    ws_data.push([
                        { v: `CGST`, s: headerStyle4 },
                        "",
                        { v: requestData.gst_amt ? (requestData.gst_amt / 2).toFixed(2) : '0.00', s: headerStyle4 },], [
                        { v: `SGST`, s: headerStyle4 },
                        "",
                        { v: requestData.gst_amt ? (requestData.gst_amt / 2).toFixed(2) : '0.00', s: headerStyle4 },
                    ]);
                } else {
                    ws_data.push([
                        { v: `IGST`, s: headerStyle4 },
                        "",
                        { v: requestData.gst_amt ? requestData.gst_amt.toFixed(2) : '0.00', s: headerStyle4 },
                    ]);
                }
                ws_data.push([
                    { v: `Total Amount`, s: headerStyle4 },
                    "",
                    { v: requestData.total_amt ? requestData.total_amt.toFixed(2) : '0.00', s: headerStyle4 },], [
                    { v: `+ / - Amount`, s: headerStyle4 },
                    "",
                    { v: requestData.round_amt ? requestData.round_amt.toFixed(2) : '0.00', s: headerStyle4 },], [
                    { v: `Net Amount`, s: headerStyle4 },
                    "",
                    { v: `₹ ${requestData.net_amt ? requestData.net_amt.toFixed(2) : '0.00'}`, s: headerStyle4 },], [
                    { v: `Amount (in words) : ₹ ${requestData.net_amt_word}`, s: headerStyle1 },], [
                    { v: `RECEIVED BY`, s: headerStyle3 },
                    "",
                    { v: `AUTHORIZE BY`, s: headerStyle3 },], [
                    { v: ``, s: headerStyle4 },
                    "",
                    { v: ``, s: headerStyle4 },], [
                    { v: `Declaration We declare that this invoice shows the actual price of the Service/Goods described and that all particulars are true and correct.`, s: headerStyle1 },], [
                    { v: `SUBJECT TO SURAT JURISDICTION`, s: headerStyle3 },], [
                    { v: `This is a Computer generated Invoice`, s: headerStyle5 },
                ]);

                const colWidths = ws_data[8].map((_, colIndex) => ({
                    wch: Math.max(
                        ...ws_data.slice(8, 8 + requestData.items.length + 1).map(row => (
                            row[colIndex]?.toString().length || 0
                        ))
                    ) + 5
                }));

                ws = XLSX.utils.aoa_to_sheet(ws_data);
                ws['!cols'] = colWidths;

                ws['!merges'] = [
                    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
                    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
                    { s: { r: 1, c: 2 }, e: { r: 1, c: 6 } },
                    { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
                    { s: { r: 2, c: 2 }, e: { r: 2, c: 6 } },
                    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
                    { s: { r: 3, c: 2 }, e: { r: 3, c: 6 } },
                    { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
                    { s: { r: 4, c: 2 }, e: { r: 4, c: 6 } },
                    { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },
                    { s: { r: 5, c: 2 }, e: { r: 5, c: 6 } },
                    { s: { r: 6, c: 0 }, e: { r: 6, c: 1 } },
                    { s: { r: 6, c: 2 }, e: { r: 6, c: 6 } },
                    { s: { r: ws_data.length - 1, c: 0 }, e: { r: ws_data.length - 1, c: 6 } },
                    { s: { r: ws_data.length - 2, c: 0 }, e: { r: ws_data.length - 2, c: 6 } },
                    { s: { r: ws_data.length - 3, c: 0 }, e: { r: ws_data.length - 3, c: 6 } },
                    { s: { r: ws_data.length - 4, c: 0 }, e: { r: ws_data.length - 4, c: 1 } },
                    { s: { r: ws_data.length - 4, c: 2 }, e: { r: ws_data.length - 4, c: 6 } },
                    { s: { r: ws_data.length - 5, c: 0 }, e: { r: ws_data.length - 5, c: 1 } },
                    { s: { r: ws_data.length - 5, c: 2 }, e: { r: ws_data.length - 5, c: 6 } },
                    { s: { r: ws_data.length - 6, c: 0 }, e: { r: ws_data.length - 6, c: 6 } },
                    { s: { r: ws_data.length - 7, c: 0 }, e: { r: ws_data.length - 7, c: 1 } },
                    { s: { r: ws_data.length - 7, c: 2 }, e: { r: ws_data.length - 7, c: 6 } },
                    { s: { r: ws_data.length - 8, c: 0 }, e: { r: ws_data.length - 8, c: 1 } },
                    { s: { r: ws_data.length - 8, c: 2 }, e: { r: ws_data.length - 8, c: 6 } },
                    { s: { r: ws_data.length - 9, c: 0 }, e: { r: ws_data.length - 9, c: 1 } },
                    { s: { r: ws_data.length - 9, c: 2 }, e: { r: ws_data.length - 9, c: 6 } },
                    { s: { r: ws_data.length - 10, c: 0 }, e: { r: ws_data.length - 10, c: 1 } },
                    { s: { r: ws_data.length - 10, c: 2 }, e: { r: ws_data.length - 10, c: 6 } },

                ];


                if (requestData.party_state.toLowerCase() === "gujarat") {
                    ws['!merges'].push(
                        { s: { r: ws_data.length - 11, c: 0 }, e: { r: ws_data.length - 11, c: 1 } },
                        { s: { r: ws_data.length - 11, c: 2 }, e: { r: ws_data.length - 11, c: 6 } }
                    );
                }

                XLSX.utils.book_append_sheet(wb, ws, `Invoice`);

                const xlsxPath = path.join(__dirname, '../../../xlsx');

                if (!fs.existsSync(xlsxPath)) {
                    fs.mkdirSync(xlsxPath, { recursive: true });
                }

                const filename = `Invoice_${Date.now()}.xlsx`;
                const filePath = path.join(xlsxPath, filename);

                await XLSXStyle.writeFile(wb, filePath);


                const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
                const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;

                sendResponse(res, 200, true, { file: fileUrl }, `XLSX file generated successfully`)

            }
            else if (data.status === 0) {
                sendResponse(res, 200, false, {}, `Invoice not found`)
            }
            else if (data.status === 2) {
                sendResponse(res, 500, false, {}, "Something went wrong111");
            }
        } catch (error) {
            console.log("error", error);
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

const allInvoice = async (project_id) => {
    try {
        const requestData = await InvoiceTable.aggregate([
            {
                $match: {
                    deleted: false,
                    project_id: new ObjectId(project_id),
                }
            },
            {
                $addFields: {
                    items_details: "$items"
                }
            },
            { $unwind: "$items_details" },
            {
                $lookup: {
                    from: "store-items",
                    localField: "items_details.item_id",
                    foreignField: "_id",
                    as: "itemDetails",
                },
            },
            {
                $lookup: {
                    from: "store-parties",
                    localField: "party_id",
                    foreignField: "_id",
                    as: "partyDetails",
                },
            },
            {
                $lookup: {
                    from: "bussiness-projects",
                    localField: "project_id",
                    foreignField: "_id",
                    as: "projectDetails",
                },
            },
            {
                $lookup: {
                    from: "firms",
                    localField: "firm_id",
                    foreignField: "_id",
                    as: "firmDetails",
                },
            },
            {
                $lookup: {
                    from: "store-transports",
                    localField: "transport_id",
                    foreignField: "_id",
                    as: "transportDetails",
                },
            },
            {
                $lookup: {
                    from: "tags",
                    localField: "tag_id",
                    foreignField: "_id",
                    as: "tagDetails",
                },
            },
            {
                $addFields: {
                    party_name: { $arrayElemAt: ["$partyDetails.name", 0] },
                    party_full_address: {
                        $trim: {
                            input: {
                                $reduce: {
                                    input: [
                                        { $ifNull: [{ $arrayElemAt: ["$partyDetails.address", 0] }, ""] },
                                        { $ifNull: [{ $arrayElemAt: ["$partyDetails.address_two", 0] }, ""] },
                                        { $ifNull: [{ $arrayElemAt: ["$partyDetails.address_three", 0] }, ""] },
                                        { $ifNull: [{ $arrayElemAt: ["$partyDetails.city", 0] }, ""] },
                                        { $ifNull: [{ $arrayElemAt: ["$partyDetails.state", 0] }, ""] },
                                        { $ifNull: [{ $toString: { $arrayElemAt: ["$partyDetails.pincode", 0] } }, ""] }
                                    ],
                                    initialValue: "",
                                    in: {
                                        $cond: {
                                            if: { $eq: ["$$value", ""] },
                                            then: "$$this",
                                            else: {
                                                $cond: {
                                                    if: { $eq: ["$$this", ""] },
                                                    then: "$$value",
                                                    else: { $concat: ["$$value", ",", "$$this"] }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    party_gstNumber: { $arrayElemAt: ["$partyDetails.gstNumber", 0] },
                    party_phone: { $arrayElemAt: ["$partyDetails.phone", 0] },
                    party_email: { $arrayElemAt: ["$partyDetails.email", 0] },
                    party_state: { $arrayElemAt: ["$partyDetails.state", 0] },
                    firm_name: { $arrayElemAt: ["$firmDetails.name", 0] },
                    firm_full_address: {
                        $trim: {
                            input: {
                                $reduce: {
                                    input: [
                                        { $ifNull: [{ $arrayElemAt: ["$firmDetails.address", 0] }, ""] },
                                        { $ifNull: [{ $arrayElemAt: ["$firmDetails.address_two", 0] }, ""] },
                                        { $ifNull: [{ $arrayElemAt: ["$firmDetails.address_three", 0] }, ""] },
                                        { $ifNull: [{ $arrayElemAt: ["$firmDetails.city", 0] }, ""] },
                                        { $ifNull: [{ $arrayElemAt: ["$firmDetails.state", 0] }, ""] },
                                        { $ifNull: [{ $toString: { $arrayElemAt: ["$firmDetails.pincode", 0] } }, ""] }
                                    ],
                                    initialValue: "",
                                    in: {
                                        $cond: {
                                            if: { $eq: ["$$value", ""] },
                                            then: "$$this",
                                            else: {
                                                $cond: {
                                                    if: { $eq: ["$$this", ""] },
                                                    then: "$$value",
                                                    else: { $concat: ["$$value", ",", "$$this"] }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    firm_gstNumber: { $arrayElemAt: ["$firmDetails.gstNumber", 0] },
                    firm_phone: { $arrayElemAt: ["$firmDetails.mobile_number", 0] },
                    firm_email: { $arrayElemAt: ["$firmDetails.email", 0] },
                    firm_state: { $arrayElemAt: ["$firmDetails.state", 0] },
                    project_name: { $arrayElemAt: ["$projectDetails.name", 0] },
                    project_order_no: { $arrayElemAt: ["$projectDetails.work_order_no", 0] },
                    transport_name: { $arrayElemAt: ["$transportDetails.name", 0] },
                    tag_number: { $arrayElemAt: ["$tagDetails.tag_number", 0] },
                    item_name: { $arrayElemAt: ["$itemDetails.name", 0] },
                    hsn_code: { $arrayElemAt: ["$itemDetails.hsn_code", 0] },
                },
            },
            {
                $group: {
                    _id: {
                        _id: "$_id",
                        party_full_address: "$party_full_address",
                        party_name: "$party_name",
                        party_gstNumber: "$party_gstNumber",
                        party_phone: "$party_phone",
                        party_email: "$party_email",
                        party_state: "$party_state",
                        firm_full_address: "$firm_full_address",
                        firm_name: "$firm_name",
                        firm_gstNumber: "$firm_gstNumber",
                        firm_phone: "$firm_phone",
                        firm_email: "$firm_email",
                        firm_state: "$firm_state",
                        invoice_no: "$invoice_no",
                        invoice_date: "$invoice_date",
                        project_order_no: "$project_order_no",
                        vehicle_no: "$vehicle_no",
                        driver_name: "$driver_name",
                        project_name: "$project_name",
                        transport_name: "$transport_name",
                        lr_no: "$lr_no",
                        lr_date: "$lr_date",
                        tag_number: "$tag_number",
                    },
                    items: {
                        $push: {
                            _id: "$items_details._id",
                            unit: "$items_details.unit",
                            item_name: "$item_name",
                            m_code: "$items_details.m_code",
                            hsn_code: "$hsn_code",
                            quantity: "$items_details.quantity",
                            rate: "$items_details.rate",
                            amount: "$items_details.amount",
                            gst: "$items_details.gst",
                            gst_amount: "$items_details.gst_amount",
                            total_amount: "$items_details.total_amount",
                            remarks: "$items_details.remarks",
                        }
                    },
                    total_qty: { $sum: "$items_details.quantity" },
                    amt: { $sum: "$items_details.amount" },
                    gst_amt: { $sum: "$items_details.gst_amount" },
                    total_amt: { $sum: "$items_details.total_amount" },
                },
            },
            {
                $addFields: {
                    net_amt: {
                        $round: ["$total_amt", 0]
                    },
                }
            },
            {
                $addFields: {
                    round_amt: {
                        $round: [
                            {
                                $subtract: ["$net_amt", "$total_amt"]
                            },
                            2
                        ]
                    }
                }
            },
            {
                $project: {
                    _id: "$_id._id",
                    party_full_address: "$_id.party_full_address",
                    party_name: "$_id.party_name",
                    party_gstNumber: "$_id.party_gstNumber",
                    party_phone: "$_id.party_phone",
                    party_email: "$_id.party_email",
                    party_state: "$_id.party_state",
                    firm_full_address: "$_id.firm_full_address",
                    firm_name: "$_id.firm_name",
                    firm_gstNumber: "$_id.firm_gstNumber",
                    firm_phone: "$_id.firm_phone",
                    firm_email: "$_id.firm_email",
                    firm_state: "$_id.firm_state",
                    invoice_no: "$_id.invoice_no",
                    invoice_date: "$_id.invoice_date",
                    project_order_no: "$_id.project_order_no",
                    vehicle_no: "$_id.vehicle_no",
                    driver_name: "$_id.driver_name",
                    project_name: "$_id.project_name",
                    transport_name: "$_id.transport_name",
                    lr_no: "$_id.lr_no",
                    lr_date: "$_id.lr_date",
                    tag_number: "$_id.tag_number",
                    items: 1,
                    total_qty: 1,
                    amt: 1,
                    gst_amt: 1,
                    total_amt: 1,
                    round_amt: 1,
                    net_amt: 1,
                },
            }
        ]);


        if (requestData.length && requestData.length > 0) {
            return { status: 1, result: requestData };
        } else {
            return { status: 0, result: [] };
        }
    } catch (error) {
        return { status: 2, result: error };
    }
};

exports.getAllInvoice = async (req, res) => {
    const { project_id } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await allInvoice(project_id)
            let requestData = data.result;

            for (const item of requestData) {
                item.net_amt_word = await amountInWords(item.net_amt);
            }

            if (data.status === 1) {
                sendResponse(res, 200, true, requestData, `Invoice list`);
            } else if (data.status === 0) {
                sendResponse(res, 200, true, [], `Invoice not found`);
            } else if (data.status === 2) {
                console.log("dataaaaa", data.result)
                sendResponse(res, 500, false, {}, "Something went wrong111");
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.downloadAllInvoice = async (req, res) => {
    const { project_id, print_date } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await allInvoice(project_id)
            let requestData = data.result;

            for (const item of requestData) {
                item.net_amt_word = await amountInWords(item.net_amt);
            }

            if (data.status === 1) {
                const template = fs.readFileSync(
                    "templates/allInvoice.html",
                    "utf-8"
                );

                const renderedHtml = ejs.render(template, {
                    requestData,
                    logoUrl1: process.env.LOGO_URL_1,
                    logoUrl2: process.env.LOGO_URL_2,
                });

                const browser = await puppeteer.launch({
                    headless: true,
                    args: ["--no-sandbox", "--disable-setuid-sandbox"],
                    executablePath: PATH,
                });

                const page = await browser.newPage();

                await page.setContent(renderedHtml, {
                    baseUrl: `${URI}`,
                });

                const pdfBuffer = await page.pdf({
                    height: "13in",
                    width: "15in",
                    margin: {
                        top: "0.5in",
                        right: "0.5in",
                        bottom: "0.7in",
                        left: "0.5in",
                    },
                    printBackground: true,
                    preferCSSPageSize: true,
                    displayHeaderFooter: true,
                    footerTemplate: `
                        <div style="font-size: 14px; width: 100%; text-align: right; padding-right: 50px; padding-bottom: 30px;">
                            ${print_date ? `<span>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>` : ''}
                            ${print_date ? '&nbsp;&nbsp;&nbsp;' : ''}
                            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
                        </div>
                    `,
                    headerTemplate: `<div></div>`,
                    compress: true,
                });

                await browser.close();

                const pdfsDir = path.join(__dirname, "../../../pdfs");
                if (!fs.existsSync(pdfsDir)) {
                    fs.mkdirSync(pdfsDir);
                }

                const filename = `invoice_${Date.now()}.pdf`;
                const filePath = path.join(__dirname, "../../../pdfs", filename);

                fs.writeFileSync(filePath, pdfBuffer);

                const fileUrl = `${URI}/pdfs/${filename}`;

                sendResponse(
                    res,
                    200,
                    true,
                    { file: fileUrl },
                    "PDF downloaded Successfully"
                );
            }
            else if (data.status === 0) {
                sendResponse(res, 200, false, {}, `Invoice report not found`)
            }
            else if (data.status === 2) {
                sendResponse(res, 500, false, {}, "Something went wrong");
            }
        } catch (error) {
            console.log("error", error);
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.xlsxAllInvoice = async (req, res) => {
    const {
        partyVisible,
        projectVisible,
        lrNoVisible,
        lrDateVisible,
        transNameVisible,
        vehicleVisible,
        driverVisible,
        project_id,
        print_date
    } = req.body;

    if (req.user && !req.error) {
        try {
            const data = await allInvoice(project_id)
            let requestData = data.result;
            if (data.status === 1) {
                const wb = XLSX.utils.book_new();
                let ws

                const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: "FFFF00" } } };

                const headerStyle1 = { font: { bold: true } };

                const ws_data = [[
                    { v: `Invoice Report`, s: headerStyle1 },
                    "",
                    ...(partyVisible ? [""] : []),
                    ...(projectVisible ? [""] : []),
                    ...(lrNoVisible ? [""] : []),
                    ...(lrDateVisible ? [""] : []),
                    ...(transNameVisible ? [""] : []),
                    ...(vehicleVisible ? [""] : []),
                    ...(driverVisible ? [""] : []),
                    "", "", "", "", "", "", "", "",
                    print_date ? { v: `Download Date - ${new Date().toLocaleDateString()}`, s: headerStyle1 } : ""
                ]];

                const headers = [{ v: "Sr No.", s: headerStyle }];
                headers.push({ v: "Invoice No.", s: headerStyle });
                headers.push({ v: "Invoice Date", s: headerStyle });
                headers.push({ v: "Order No.", s: headerStyle });
                if (partyVisible) headers.push({ v: "Party", s: headerStyle });
                if (projectVisible) headers.push({ v: "Project", s: headerStyle });
                if (lrNoVisible) headers.push({ v: "LR No.", s: headerStyle });
                if (lrDateVisible) headers.push({ v: "LR Date", s: headerStyle });
                if (transNameVisible) headers.push({ v: "Transport Name", s: headerStyle });
                if (vehicleVisible) headers.push({ v: "Vehicle No.", s: headerStyle });
                if (driverVisible) headers.push({ v: "Driver Name", s: headerStyle });
                headers.push({ v: "Item Name", s: headerStyle });
                headers.push({ v: "HSN", s: headerStyle });
                headers.push({ v: "GST(%)", s: headerStyle });
                headers.push({ v: "Qty", s: headerStyle });
                headers.push({ v: "Rate", s: headerStyle });
                headers.push({ v: "Amount", s: headerStyle });
                headers.push({ v: "Total Amt", s: headerStyle });
                headers.push({ v: "+/- Amt", s: headerStyle });
                headers.push({ v: "Net Amt", s: headerStyle });

                ws_data.push(headers);

                let srNo = 1;

                requestData.forEach((trans) => {
                    let firstRow = true;

                    trans.items.forEach((item) => {
                        const row = [
                            firstRow ? srNo++ : "",
                            firstRow ? trans.invoice_no : "",
                            firstRow ? new Date(trans.invoice_date).toLocaleDateString() : "",
                            firstRow ? trans.project_order_no : "",
                            ...(partyVisible ? [firstRow ? trans.party_name : ""] : []),
                            ...(projectVisible ? [firstRow ? trans.project_name : ""] : []),
                            ...(lrNoVisible ? [firstRow ? trans.lr_no : ""] : []),
                            ...(lrDateVisible ? [firstRow ? new Date(trans.lr_date).toLocaleDateString() : ""] : []),
                            ...(transNameVisible ? [firstRow ? trans.transport_name : ""] : []),
                            ...(vehicleVisible ? [firstRow ? trans.vehicle_no : ""] : []),
                            ...(driverVisible ? [firstRow ? trans.driver_name : ""] : []),
                            item.item_name,
                            item.hsn_code,
                            item.gst,
                            item.quantity ? parseFloat(item.quantity).toFixed(3) : '0.000',
                            item.rate ? parseFloat(item.rate).toFixed(2) : '0.00',
                            item.amount ? parseFloat(item.amount).toFixed(2) : '0.00',
                            "",
                            "",
                            "",
                        ];

                        ws_data.push(row);
                        firstRow = false;
                    });
                    ws_data.push([]);

                    const isGujarat = trans.party_state.toLowerCase() === "gujarat";

                    ws_data.push([
                        "",
                        "",
                        "",
                        "",
                        ...(partyVisible ? [""] : []),
                        ...(projectVisible ? [""] : []),
                        ...(lrNoVisible ? [""] : []),
                        ...(lrDateVisible ? [""] : []),
                        ...(transNameVisible ? [""] : []),
                        ...(vehicleVisible ? [""] : []),
                        ...(driverVisible ? [""] : []),
                        { v: "Total", s: headerStyle },
                        isGujarat ? "CGST/SGST" : "IGST",
                        isGujarat ? `${(trans.gst_amt / 2).toFixed(2)} / ${(trans.gst_amt / 2).toFixed(2)}` : parseFloat(trans.gst_amt).toFixed(2),
                        trans.total_qty ? parseFloat(trans.total_qty.toFixed(3)) : 0.000,
                        "",
                        trans.amt ? parseFloat(trans.amt).toFixed(2) : 0.00,
                        trans.total_amt ? parseFloat(trans.total_amt).toFixed(2) : 0.00,
                        trans.round_amt ? parseFloat(trans.round_amt).toFixed(2) : 0.00,
                        trans.net_amt ? parseFloat(trans.net_amt).toFixed(2) : 0.00,
                    ]);


                    ws_data.push([]);
                    ws_data.push([]);
                });

                const colWidths = ws_data[1].map((_, colIndex) => ({
                    wch: Math.max(
                        ...ws_data.slice(1, 1 + requestData[0].items.length + 1).map(row => (
                            row[colIndex]?.toString().length || 0
                        ))
                    ),
                }));

                ws = XLSX.utils.aoa_to_sheet(ws_data);
                ws['!cols'] = colWidths;
                ws['!merges'] = [
                    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
                    { s: { r: colWidths.length - 3, c: 0 }, e: { r: colWidths.length + 2, c: 2 } }
                ];

                XLSX.utils.book_append_sheet(wb, ws, `Invoice report`);

                const xlsxPath = path.join(__dirname, '../../../xlsx');

                if (!fs.existsSync(xlsxPath)) {
                    fs.mkdirSync(xlsxPath, { recursive: true });
                }

                const filename = `Invoice_report_${Date.now()}.xlsx`;
                const filePath = path.join(xlsxPath, filename);

                await XLSXStyle.writeFile(wb, filePath);


                const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
                const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;

                sendResponse(res, 200, true, { file: fileUrl }, `XLSX file generated successfully`)

            }
            else if (data.status === 0) {
                sendResponse(res, 200, false, {}, `${tag} report not found`)
            }
            else if (data.status === 2) {
                sendResponse(res, 500, false, {}, "Something went wrong111");
            }
        } catch (error) {
            console.log("error", error);
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}