const UsableStock = require('../../models/store/usable_stock.model');
const { sendResponse } = require('../../helper/response');
const { default: mongoose } = require("mongoose");
const { Types: { ObjectId }, } = require("mongoose");
const { generatePDF } = require('../../utils/pdfUtils');
const ejs = require("ejs");
const fs = require("fs");
const puppeteer = require("puppeteer");
const path = require("path");
const XLSX = require('xlsx');  // for utility functions
const XLSXStyle = require('xlsx-style');  // for styling
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;



exports.addUsable = async (req, res) => {
    if (req.user && !req.error) {
        const { items } = req.body

        const item = JSON.parse(items)
        // const item = items
        try {
            if (Array.isArray(item) && item.length > 0) {
                const addUsable = await UsableStock.insertMany(item)
                if (addUsable) {
                    sendResponse(res, 200, true, addUsable, "Usable stock added successfully");
                } else {
                    sendResponse(res, 400, false, {}, `Usable stock not added`);
                }
            } else {
                sendResponse(res, 400, false, {}, "Missing parameters");
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

// const getUsableListFunction = async (project_id) => {
//     try {

//         matchObj = { deleted: false }

//         if (project_id) {
//             matchObj.project_id = new ObjectId(project_id)
//         }
//         let requestData = await UsableStock.aggregate([
//             {
//                 $match: matchObj
//             },
//             {
//                 $lookup: {
//                     from: "bussiness-projects",
//                     localField: "project_id",
//                     foreignField: "_id",
//                     as: "projectDetails",
//                 },
//             },
//             {
//                 $lookup: {
//                     from: "store-items",
//                     localField: "itemId",
//                     foreignField: "_id",
//                     as: "itemDetails",
//                     pipeline: [
//                         {
//                             $lookup: {
//                                 from: "store-item-units",
//                                 localField: "unit",
//                                 foreignField: "_id",
//                                 as: "unitDetails",
//                             },
//                         },
//                     ],
//                 },
//             },
//             {
//                 $lookup: {
//                     from: "store-parties",
//                     localField: "manufacture_id",
//                     foreignField: "_id",
//                     as: "manufactureDetails",
//                 },
//             },
//             {
//                 $lookup: {
//                     from: "store-parties",
//                     localField: "supplier_id",
//                     foreignField: "_id",
//                     as: "supplierDetails",
//                 },
//             },
//             {
//                 $addFields: {
//                     projectDetails: { $arrayElemAt: ["$projectDetails", 0] },
//                     itemDetails: { $arrayElemAt: ["$itemDetails", 0] },
//                     manufactureDetails: { $arrayElemAt: ["$manufactureDetails", 0] },
//                     supplierDetails: { $arrayElemAt: ["$supplierDetails", 0] },
//                 },
//             },
//             {
//                 $addFields: {
//                     unitDetails: { $arrayElemAt: ["$itemDetails.unitDetails", 0] },
//                 },
//             },
//             {
//                 $project: {
//                     _id: 1,
//                     project_id: "$projectDetails._id",
//                     project_name: "$projectDetails.name",
//                     material_po_no: "$material_po_no",
//                     item_id: "$itemDetails._id",
//                     item_name: "$itemDetails.name",
//                     material_grade: "$itemDetails.material_grade",
//                     mcode: "$itemDetails.mcode",
//                     unit: "$unitDetails.name",
//                     balance_qty: "$balance_qty",
//                     manufacture_id: "$manufactureDetails._id",
//                     manufacture_name: "$manufactureDetails.name",
//                     supplier_id: "$supplierDetails._id",
//                     supplier_name: "$supplierDetails.name",
//                     imir_no: "$imir_no",
//                     accepted_lot_no: "$accepted_lot_no",
//                     usableLength: "$usableLength",
//                     usableWidth: "$usableWidth",
//                     usableNos: "$usableNos",
//                     usableQty: "$usableQty",
//                     remarks: "$remarks",
//                     issued:"$issued",

//                 },
//             },
//         ]);

//         if (requestData.length && requestData.length > 0) {
//             return { status: 1, result: requestData };
//         } else {
//             return { status: 0, result: [] };
//         }
//     } catch (error) {
//         console.log(error);
//         return { status: 2, result: error };
//     }
// };

// exports.getUsableList = async (req, res) => {
//     const { project_id } = req.body;
//     if (req.user && !req.error) {
//         try {
//             const data = await getUsableListFunction(project_id);
//             let requestData = data.result;

//             if (data.status === 1) {
//                 sendResponse(res, 200, true, requestData, `Usable stock data list`);
//             } else if (data.status === 0) {
//                 sendResponse(res, 200, true, [], `Usable stock not found`);
//             } else if (data.status === 2) {
//                 console.log("error", data.result);
//                 sendResponse(res, 500, false, {}, "Something went wrong11");
//             }
//         } catch (error) {
//             sendResponse(res, 500, false, {}, "Something went wrong");
//         }
//     } else {
//         sendResponse(res, 401, false, {}, "Unauthorized");
//     }
// };


// Without Project ID 

const getUsableListFunction = async (project_id) => {
    try {
        // Base filter
        let matchObj = { deleted: false };

        // Optional project filter
        if (project_id) {
            matchObj.project_id = new ObjectId(project_id);
        }

        let requestData = await UsableStock.aggregate([
            { $match: matchObj },
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
                    from: "store-items",
                    localField: "itemId",
                    foreignField: "_id",
                    as: "itemDetails",
                    pipeline: [
                        {
                            $lookup: {
                                from: "store-item-units",
                                localField: "unit",
                                foreignField: "_id",
                                as: "unitDetails",
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: "store-parties",
                    localField: "manufacture_id",
                    foreignField: "_id",
                    as: "manufactureDetails",
                },
            },
            {
                $lookup: {
                    from: "store-parties",
                    localField: "supplier_id",
                    foreignField: "_id",
                    as: "supplierDetails",
                },
            },
            {
                $addFields: {
                    projectDetails: { $arrayElemAt: ["$projectDetails", 0] },
                    itemDetails: { $arrayElemAt: ["$itemDetails", 0] },
                    manufactureDetails: { $arrayElemAt: ["$manufactureDetails", 0] },
                    supplierDetails: { $arrayElemAt: ["$supplierDetails", 0] },
                    unitDetails: { $arrayElemAt: ["$itemDetails.unitDetails", 0] },
                },
            },
            {
                $project: {
                    _id: 1,
                    project_id: "$projectDetails._id",
                    project_name: "$projectDetails.name",
                    material_po_no: "$material_po_no",
                    item_id: "$itemDetails._id",
                    item_name: "$itemDetails.name",
                    material_grade: "$itemDetails.material_grade",
                    mcode: "$itemDetails.mcode",
                    unit: "$unitDetails.name",
                    balance_qty: "$balance_qty",
                    manufacture_id: "$manufactureDetails._id",
                    manufacture_name: "$manufactureDetails.name",
                    supplier_id: "$supplierDetails._id",
                    supplier_name: "$supplierDetails.name",
                    imir_no: "$imir_no",
                    accepted_lot_no: "$accepted_lot_no",
                    usableLength: "$usableLength",
                    usableWidth: "$usableWidth",
                    usableNos: "$usableNos",
                    usableQty: "$usableQty",
                    remarks: "$remarks",
                    issued: "$issued",
                },
            },
        ]);

        if (requestData.length && requestData.length > 0) {
            return { status: 1, result: requestData };
        } else {
            return { status: 0, result: [] };
        }
    } catch (error) {
        console.log(error);
        return { status: 2, result: error };
    }
};

exports.getUsableList = async (req, res) => {
    const { project_id } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getUsableListFunction(project_id);
            let requestData = data.result;

            if (data.status === 1) {
                sendResponse(res, 200, true, requestData, `Usable stock data list`);
            } else if (data.status === 0) {
                sendResponse(res, 200, true, [], `Usable stock not found`);
            } else if (data.status === 2) {
                console.log("error", data.result);
                sendResponse(res, 500, false, {}, "Something went wrong");
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.getUsableStockverify = async (req, res) => {
    const { project_id } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getUsableListFunction(project_id);
            let requestData = data.result;

            if (data.status === 1) {
                const selectedData = requestData.map(item => ({
                    item_id: item.item_id,
                    imir_no: item.imir_no,
                    usableQty: item.usableQty
                }));
                sendResponse(res, 200, true, selectedData, `Usable stock data verify list`);
            } else if (data.status === 0) {
                sendResponse(res, 200, true, [], `Usable stock not found`);
            } else if (data.status === 2) {
                console.log("error", data.result);
                sendResponse(res, 500, false, {}, "Something went wrong11");
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.getUsableStockverifyNode = async (project_id) => {
    try {
        const data = await getUsableListFunction(project_id);
        let requestData = data.result;

        if (data.status === 1) {
            const selectedData = requestData.map(item => ({
                item_id: item.item_id,
                imir_no: item.imir_no,
                usableQty: item.usableQty
            }));
            return selectedData;
        } else if (data.status === 0) {
            return [];
        } else if (data.status === 2) {
            return [];
        }
    } catch (error) {
        sendResponse(res, 500, false, {}, "Something went wrong");
    }
};

exports.updateUsableStock = async (req, res) => {
    const { id, usableLength, usableWidth, usableNos, usableQty } = req.body;

    if (req.user && !req.error) {
        try {
            if (id) {
                const updateUsableStock = await UsableStock.findByIdAndUpdate(
                    id,
                    {
                        usableLength,
                        usableWidth,
                        usableNos,
                        usableQty
                    },
                    { new: true }
                );

                if (updateUsableStock) {
                    sendResponse(res, 200, true, updateUsableStock, `Usable stock update successfully`);
                } else {
                    sendResponse(res, 400, false, {}, `Usable stock not update`);
                }
            } else {
                return sendResponse(res, 400, false, {}, "Missing parameters");
            }
        } catch (error) {
            console.log(error);
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 400, false, {}, "Unauthorised");
    }
};

exports.deleteUsableStock = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error) {
        try {
            if (id) {
                const deleteUsableStock = await UsableStock.findByIdAndUpdate(id, { deleted: true }, { new: true });

                if (deleteUsableStock) {
                    sendResponse(res, 200, true, {}, `Usable stock deleted successfully`);
                } else {
                    sendResponse(res, 400, false, {}, `Usable stock not delete`);
                }
            } else {
                return sendResponse(res, 400, false, {}, "Missing parameters");
            }
        } catch (error) {
            console.log(error);
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 400, false, {}, "Unauthorised");
    }
};

exports.UsableListPDF = async (req, res) => {
    const { project_id } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getUsableListFunction(project_id)
            const requestData = data.result;

            if (data.status === 1) {

                const template = fs.readFileSync(
                    "templates/usableList.html",
                    "utf-8"
                );
                const renderedHtml = ejs.render(template, {
                    items: requestData,
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

                const pdfBuffer = await generatePDF(page, { print_date: true });

                await browser.close();

                const pdfsDir = path.join(__dirname, "../../pdfs");
                if (!fs.existsSync(pdfsDir)) {
                    fs.mkdirSync(pdfsDir);
                }

                const filename = `usable_stock_${Date.now()}.pdf`;
                const filePath = path.join(__dirname, "../../pdfs", filename);

                fs.writeFileSync(filePath, pdfBuffer);

                const fileUrl = `${URI}/pdfs/${filename}`;

                sendResponse(res, 200, true, { file: fileUrl }, "PDF downloaded Successfully"
                );

            }
            else if (data.status === 0) {
                sendResponse(res, 200, false, {}, `Usable stock report not found`)
            }
            else if (data.status === 2) {
                sendResponse(res, 500, false, {}, "Something went wrong111");
            }
        } catch (error) {
            console.log(error);
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.UsableListXLSX = async (req, res) => {
    const { project_id } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getUsableListFunction(project_id)
            let requestData = data.result;

            if (data.status === 1) {

                const wb = XLSX.utils.book_new();
                let ws

                const headerStyle = {
                    font: { bold: true }, fill: { fgColor: { rgb: "fdc686" } }, alignment: { horizontal: 'center', vertical: 'middle' }
                };

                const headerStyle3 = {
                    font: { size: 35, bold: true }, fill: { fgColor: { rgb: 'fdc686' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                };

                const headerStyle2 = {
                    font: { size: 16, bold: true }, fill: { fgColor: { rgb: 'fdc686' } }, alignment: { horizontal: 'center', vertical: 'middle' },
                };

                const headerStyle4 = {
                    font: { bold: true }, alignment: { horizontal: 'center', vertical: 'middle' },
                };

                // *** Do not remove space ***
                const ws_data = [
                    [
                        { v: `VISHAL ENTERPRISE & VRISHAL ENGINEERING PRIVATE LIMITED \n GROUP OF COMPANIES`, s: headerStyle3 }
                    ],
                    [],
                    [
                        { v: `PROJECT MATERIAL USABLE LIST`, s: headerStyle4 }
                    ],
                ];

                const headers = [
                    { v: "Sr No.", s: headerStyle },
                    { v: "Project Name", s: headerStyle },
                    { v: "Material Po No.", s: headerStyle },
                    { v: "Section Details", s: headerStyle },
                    { v: "Grade", s: headerStyle },
                    { v: "UOM", s: headerStyle },
                    { v: "Stock Qty/Avalible Qty", s: headerStyle },
                    { v: "Manufacturer", s: headerStyle },
                    { v: "Supplier", s: headerStyle },
                    { v: "IMIR No.", s: headerStyle },
                    { v: "Heat No.", s: headerStyle },
                    { v: "Usable Length", s: headerStyle },
                    { v: "Usable Width", s: headerStyle },
                    { v: "Usable Nos", s: headerStyle },
                    { v: "Usable Qty", s: headerStyle },
                    { v: "Remarks", s: headerStyle },
                ];

                ws_data.push(headers);

                requestData.forEach((detail, itemIndex) => {
                    const row = [
                        itemIndex + 1,
                        detail.project_name || '--',
                        detail.material_po_no || '--',
                        detail.item_name || '--',
                        detail.material_grade || '--',
                        detail.unit || '--',
                        (detail.balance_qty || 0).toFixed(3),
                        detail.manufacture_name || '--',
                        detail.supplier_name || '--',
                        detail.imir_no || '--',
                        detail.accepted_lot_no || '--',
                        (detail.usableLength || 0).toFixed(2),
                        (detail.usableWidth || 0).toFixed(2),
                        detail.usableNos || '--',
                        (detail.usableQty || 0).toFixed(3),
                        detail.remarks || '--'
                    ];
                    ws_data.push(row);
                });
                ws_data.push([]);

                const maxCols = Math.max(...ws_data.map(row => row.length));

                const colWidths = ws_data[3].map((_, colIndex) => ({
                    wch: Math.max(
                        ...ws_data.slice(3, 3 + requestData.length + 1).map(row => {
                            const cell = row[colIndex];
                            if (cell && typeof cell === 'object' && 'v' in cell) {
                                return cell.v?.toString().length || 0;
                            } else if (typeof cell === 'string' || typeof cell === 'number') {
                                return cell.toString().length;
                            }
                            return 0;
                        })
                    ) + 3
                }));

                ws = XLSX.utils.aoa_to_sheet(ws_data);
                ws['!cols'] = colWidths;

                ws['!merges'] = [
                    { s: { r: 0, c: 0 }, e: { r: 1, c: 15 } },
                    { s: { r: 2, c: 0 }, e: { r: 2, c: 15 } },
                ];

                XLSX.utils.book_append_sheet(wb, ws, `project material usable list`);

                const xlsxPath = path.join(__dirname, '../../xlsx');

                if (!fs.existsSync(xlsxPath)) {
                    fs.mkdirSync(xlsxPath, { recursive: true });
                }

                const filename = `Usable_Stock_${Date.now()}.xlsx`;
                const filePath = path.join(xlsxPath, filename);

                await XLSXStyle.writeFile(wb, filePath);

                const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
                const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;

                sendResponse(res, 200, true, { file: fileUrl }, `XLSX file generated successfully`)
            }
            else if (data.status === 0) {
                sendResponse(res, 200, false, {}, `Usable Stock not found`)
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
