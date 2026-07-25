const Invoice = require("../../../../models/erp/Multi/Invoice/multi_invoice.model");
const { sendResponse } = require("../../../../helper/response");
const { default: mongoose } = require("mongoose");
const { Types: { ObjectId } } = require("mongoose");
const ejs = require("ejs");
const fs = require("fs");
const XLSX = require('xlsx');
const path = require("path");
const excelJs = require('exceljs');
const moment = require('moment');
const PATH = process.env.PDF_PATH;
const URI = process.env.PDF_URL;
const puppeteer = require("puppeteer");
const { generatePDFA4 } = require('../../../../utils/pdfUtils');

exports.manageInvoice = async (req, res) => {
    const { projectId, ra, invoiceNo, invoiceDate, firmId, items, totalAmount, cgst, sgst, netAmount, id, status, isSgst, isCgst } = req.body;
    if (!req.user && req.error) {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }

    const parseItems = JSON.parse(items);

    if (!projectId && !ra && !invoiceNo && !invoiceDate && !firmId && parseItems?.length === 0) {
        sendResponse(res, 400, false, {}, "Please provide all required fields");
        return;
    }
    try {
        const object = new Invoice({
            projectId,
            ra,
            invoiceNo,
            invoiceDate,
            firmId,
            items: parseItems,
            totalAmount,
            cgst,
            sgst,
            netAmount,
            status,
            isSgst,
            isCgst,
        });

        if (!id) {
            try {
                const result = await object.save();
                if (result) {
                    sendResponse(res, 200, true, {}, 'Invoice added successfully');
                }
            } catch (err) {
                sendResponse(res, 500, false, {}, 'Something went wrong');
            }
        } else {
            try {
                const result = await Invoice.findByIdAndUpdate(id, {
                    projectId,
                    ra,
                    invoiceNo,
                    invoiceDate,
                    firmId,
                    items: parseItems,
                    totalAmount,
                    cgst,
                    sgst,
                    netAmount,
                    status,
                    isSgst,
                    isCgst,
                }, { new: true });
                if (result) {
                    sendResponse(res, 200, true, {}, 'Invoice updated successfully');
                }
            } catch (err) {
                console.log(err, '11')
                sendResponse(res, 500, false, {}, 'Something went wrong');
            }
        }
    } catch (error) {
        console.log(error)
        sendResponse(res, 500, false, {}, 'Something went wrong');
    }
}

exports.getInvoice = async (req, res) => {
    const { inId } = req.params;
    const { status, pId } = req.body;
    if (!req.user && req.error) {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }

    try {
        let matchQuery = {};
        if (inId) {
            matchQuery._id = new mongoose.Types.ObjectId(inId);
        }
        if (pId) {
            matchQuery.projectId = new mongoose.Types.ObjectId(pId);
        }
        if (status !== undefined) {
            matchQuery.status = parseInt(status);
        }

        const invoices = await Invoice.aggregate([
            { $match: matchQuery },
            {
                $lookup: {
                    from: "bussiness-projects",
                    localField: "projectId",
                    foreignField: "_id",
                    pipeline: [
                        {
                            $lookup: {
                                from: "store-parties",
                                localField: "party",
                                foreignField: "_id",
                                as: "clientDetails"
                            }
                        }
                    ],
                    as: "projectDetails",
                }
            },
            {
                $lookup: {
                    from: "firms",
                    localField: "firmId",
                    foreignField: "_id",
                    as: "firmDetails"
                }
            },
            {
                $addFields: {
                    projectDetails: { $arrayElemAt: ["$projectDetails", 0] },
                    firmDetails: { $arrayElemAt: ["$firmDetails", 0] }
                }
            },
            {
                $addFields: {
                    clientDetails: { $arrayElemAt: ["$projectDetails.clientDetails", 0], },
                },
            },
            {
                $project: {
                    _id: 1,
                    ra: 1,
                    invoiceNo: 1,
                    invoiceDate: 1,
                    firmId: "$firmDetails._id",
                    firmName: "$firmDetails.name",
                    firmAddress: "$firmDetails.address",
                    firmAddTwo: "$firmDetails.address_two",
                    firmAddThree: "$firmDetails.address_three",
                    firmCity: "$firmDetails.city",
                    firmPincode: "$firmDetails.pincode",
                    firmGstNo: "$firmDetails.gst_no",
                    projectId: "$projectDetails._id",
                    projectPoNo: "$projectDetails.work_order_no",
                    projectPoDate: "$projectDetails.po_date",
                    clientName: "$clientDetails.name",
                    clientGSTNo: "$clientDetails.gstNumber",
                    clientAddress: "$clientDetails.address",
                    clientCity: "$clientDetails.city",
                    clientPincode: "$clientDetails.pincode",
                    totalAmount: 1,
                    cgst: 1,
                    sgst: 1,
                    netAmount: 1,
                    items: 1,
                    status: 1,
                    createdAt: 1,
                    isSgst: 1,
                    isCgst: 1,
                }
            }
        ]);

        return sendResponse(res, 200, true, invoices, "Invoices fetched successfully");
    } catch (error) {
        console.error("Error fetching invoices:", error);
        return sendResponse(res, 500, false, {}, "Internal Server Error");
    }
}

const getOneInvoice = async (id) => {
    try {
        let matchQuery = {};
        if (id) {
            matchQuery._id = new mongoose.Types.ObjectId(id);
        }
        const requestData = await Invoice.aggregate([
            { $match: matchQuery },
            {
                $lookup: {
                    from: "bussiness-projects",
                    localField: "projectId",
                    foreignField: "_id",
                    pipeline: [
                        {
                            $lookup: {
                                from: "store-parties",
                                localField: "party",
                                foreignField: "_id",
                                as: "clientDetails"
                            }
                        }
                    ],
                    as: "projectDetails",
                }
            },
            {
                $lookup: {
                    from: "firms",
                    localField: "firmId",
                    foreignField: "_id",
                    as: "firmDetails"
                }
            },
            {
                $addFields: {
                    projectDetails: { $arrayElemAt: ["$projectDetails", 0] },
                    firmDetails: { $arrayElemAt: ["$firmDetails", 0] }
                }
            },
            {
                $addFields: {
                    clientDetails: { $arrayElemAt: ["$projectDetails.clientDetails", 0], },
                },
            },
            {
                $project: {
                    _id: 1,
                    ra: 1,
                    invoiceNo: 1,
                    invoiceDate: 1,
                    firmId: "$firmDetails._id",
                    firmName: "$firmDetails.name",
                    firmAddress: "$firmDetails.address",
                    firmAddTwo: "$firmDetails.address_two",
                    firmAddThree: "$firmDetails.address_three",
                    firmCity: "$firmDetails.city",
                    firmPincode: "$firmDetails.pincode",

                    firmGstNo: "$firmDetails.gst_no",

                    projectId: "$projectDetails._id",
                    projectPoNo: "$projectDetails.work_order_no",
                    projectPoDate: "$projectDetails.po_date",
                    clientName: "$clientDetails.name",
                    clientGSTNo: "$clientDetails.gstNumber",
                    clientAddress: "$clientDetails.address",
                    clientCity: "$clientDetails.city",
                    clientPincode: "$clientDetails.pincode",
                    totalAmount: 1,
                    cgst: 1,
                    sgst: 1,
                    netAmount: 1,
                    items: 1,
                    status: 1,
                    createdAt: 1,
                    isSgst: 1,
                    isCgst: 1,
                }
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
}

exports.downloadXlsxInvoice = async (req, res) => {

    const { id } = req.body;

    if (!req.user && req.error) {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
    try {
        const data = await getOneInvoice(id);

        if (data.status === 1) {
            const invoice = data.result[0];

            const workbook = new excelJs.Workbook();
            const worksheet = workbook.addWorksheet("Tax Invoice");

            // Invoice Title
            worksheet.mergeCells("A1:H1");
            worksheet.getCell("A1").value = "TAX INVOICE";
            worksheet.getCell("A1").font = { bold: true, size: 16 };
            worksheet.getCell("A1").alignment = { horizontal: "center" };

            // "Original for Buyer"
            worksheet.mergeCells("H2:H2");
            worksheet.getCell("H2").value = "(Original for Buyer)";
            worksheet.getCell("H2").font = { italic: true };
            worksheet.getCell("H2").alignment = { horizontal: "right" };

            // Manufacturer Details
            worksheet.addRow(["Manufacturer's Detail:", invoice.manufacturer || "VISHAL ENTERPRISE"]);
            worksheet.addRow(["Plot:", invoice.manufacturer_address || "A-34/C, Icchapore GIDC"]);
            worksheet.addRow(["GST Regn. No.:", invoice.manufacturer_gst || "24AAYPM1959N1ZS"]);
            worksheet.addRow([]);

            // Buyer Details
            worksheet.addRow(["Buyer / Consignee:", invoice.buyer_name || "TATA Chemicals Limited"]);
            worksheet.addRow(["District:", invoice.buyer_district || "Devbhoomi Dwarka, Gujarat"]);
            worksheet.addRow(["GST Regn. No.:", invoice.buyer_gst || "24AAACT4059M1Z5"]);
            worksheet.addRow([]);

            // Invoice Details
            worksheet.addRow(["INVOICE NO:", invoice.invoice_no || "N/A", "DATE:", invoice.invoice_date || "N/A"]);
            worksheet.addRow(["PO NO:", invoice.po_no || "N/A", "PO DATE:", invoice.po_date || "N/A"]);
            worksheet.addRow([]);

            // Table Headers
            const headers = [
                "ITEM NO.",
                "DESCRIPTION",
                "INVOICE QUANTITY (MT)",
                "UNIT RATE (INR)",
                "PO QTY. (MT)",
                "PO AMOUNT (INR)",
                "INVOICE AMOUNT (INR)",
                "Remarks"
            ];
            worksheet.addRow(headers);
            worksheet.getRow(worksheet.rowCount).font = { bold: true };

            // Table Data - Dynamic
            if (invoice.items && Array.isArray(invoice.items)) {
                invoice.items.forEach((item, index) => {
                    worksheet.addRow([
                        index + 1,
                        item.description || "",
                        item.quantity || 0,
                        item.unitRate || 0,
                        item.poQty || 0,
                        item.poAmount || 0,
                        item.invoice_amount || 0,
                        item.remarks || ""
                    ]);
                });
            }

            // Total Amounts
            worksheet.addRow([]);
            worksheet.addRow(["TOTAL AMOUNT BEFORE TAX", "", "", "", "", "", invoice.totalAmount || 0]);
            worksheet.addRow(["ADD : CGST", "", "", "", "", "", invoice.cgst || 0]);
            worksheet.addRow(["ADD : SGST", "", "", "", "", "", invoice.sgst || 0]);
            worksheet.addRow(["TOTAL AMOUNT AFTER TAX", "", "", "", "", "", invoice.netAmount || 0]);
            worksheet.addRow([]);

            // Bank Details
            worksheet.addRow(["BANK DETAIL OF VISHAL ENTERPRISE"]);
            worksheet.addRow(["Bank:", invoice.bank_name || "Axis Bank Ltd."]);
            worksheet.addRow(["Bank Address:", invoice.bank_address || "ATHWALINES, SURAT-395007"]);
            worksheet.addRow(["Account No:", invoice.account_no || "912020016336104"]);
            worksheet.addRow(["IFSC Code:", invoice.ifsc_code || "UTIB0001587"]);
            worksheet.addRow(["SWIFT Code:", invoice.swift_code || "AXISINBB047"]);

            const uploadDir = path.join(__dirname, "../../../../xlsx");
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const filePath = path.join(uploadDir, "Invoice-Report.xlsx");
            await workbook.xlsx.writeFile(filePath);

            const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
            const file = `${protocol}://${req.get("host")}/xlsx/Invoice-Report.xlsx`;
            return sendResponse(res, 200, true, { file }, "Invoice Report generated successfully");

        } else if (data.status === 0) {
            sendResponse(res, 200, false, {}, `Invoice data not found`);
        }
        else if (data.status === 2) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } catch (error) {
        console.log(error);
        sendResponse(res, 500, false, {}, "Something went wrong");
    }
}

exports.downloadPdfInvoice = async (req, res) => {
    const { id, isOriginal } = req.body;

    if (!req.user && req.error) {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
    try {

        const data = await getOneInvoice(id)
        let requestData = data.result[0];

        if (data.status === 1) {

            let headerInfo = {
                ra: requestData.ra,
                invoiceNo: requestData?.invoiceNo,
                invoiceDate: requestData?.invoiceDate ? moment(requestData?.invoiceDate).format('YYYY-MM-DD') : '-',
                firmName: requestData?.firmName,
                firmAddress: requestData?.firmAddress,
                firmAddTwo: requestData?.firmAddTwo,
                firmAddThree: requestData?.firmAddThree,
                firmCity: requestData?.firmCity,
                firmPincode: requestData?.firmPincode,
                clientName: requestData?.clientName,
                clientGSTNo: requestData?.clientGSTNo,
                clientAddress: requestData?.clientAddress,
                clientCity: requestData?.clientCity,
                clientPincode: requestData?.clientPincode,
                totalAmount: requestData?.totalAmount,
                cgst: requestData?.cgst,
                sgst: requestData?.sgst,
                netAmount: requestData?.netAmount,
                projectPoNo: requestData?.projectPoNo,
                projectPoDate: requestData?.projectPoDate ? moment(requestData?.projectPoDate).format('YYYY-MM-DD') : '-',
                is_original: isOriginal === "true" ? " (Original)" : "(Duplicate)",
                firmGstNo: requestData?.firmGstNo,
            }

            const template = fs.readFileSync(
                "templates/multiInvoice.html",
                "utf-8"
            );

            const renderedHtml = ejs.render(template, {
                invoice: headerInfo,
                items: requestData?.items,
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

            const pdfBuffer = await generatePDFA4(page, { print_date: true });

            await browser.close();

            const pdfsDir = path.join(__dirname, "../../../pdfs");
            if (!fs.existsSync(pdfsDir)) {
                fs.mkdirSync(pdfsDir);
            }

            const filename = `invoice_${Date.now()}.pdf`;
            const filePath = path.join(__dirname, "../../../../pdfs", filename);

            fs.writeFileSync(filePath, pdfBuffer);

            const fileUrl = `${URI}/pdfs/${filename}`;

            sendResponse(
                res,
                200,
                true,
                { file: fileUrl },
                "PDF downloaded Successfully"
            );

        } else if (data.status === 0) {
            sendResponse(res, 200, false, {}, `Invoice data not found`)
        }
        else if (data.status === 2) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } catch (error) {
        console.log(error);
        sendResponse(res, 500, false, {}, "Something went wrong");
    }
}
