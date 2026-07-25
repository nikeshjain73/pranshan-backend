const { default: mongoose } = require("mongoose");
const MSStock = require("../../../models/main-store/transaction/itemstock.model");
const Transaction = require("../../../models/main-store/transaction/transaction.model");
const Item = require("../../../models/store/item.model");
const ObjectId = mongoose.Types.ObjectId;
const ejs = require("ejs");
const fs = require("fs");
const puppeteer = require("puppeteer");
const path = require("path");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;
const XLSX = require('xlsx');  // for utility functions
const XLSXStyle = require('xlsx-style');  // for styling


const { sendResponse } = require("../../../helper/response");


exports.MsitemStockList = async (req, res) => {
    // const { itemId, firm_id, year_id } = req.body;
     const { itemId,  year_id } = req.body;
      
    if (req.user && !req.error) {
        try {
            let matchObj = {
                deleted: false,
                item_id: new ObjectId(itemId)
            }

            let requestData = await MSStock.aggregate([
                { $match: matchObj },
                {
                    $lookup: {
                        from: "ms_trans_details",
                        localField: "transaction_id",
                        foreignField: "_id",
                        as: "transaction"
                    }
                },
                { $unwind: "$transaction" },
                {
                    $match: {
                        // "transaction.firm_id": new ObjectId(firm_id),
                        // "transaction.year_id": new ObjectId(year_id)
                        ...(year_id ? { "transaction.year_id": new ObjectId(year_id) } : {})
                    }
                },
                {
                    $group: {
                        _id: "$item_id",
                        totalIn: { $sum: "$in" },
                        totalOut: { $sum: "$out" },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        ItemId: "$_id",
                        in: "$totalIn",
                        out: "$totalOut",
                        balance: { $subtract: ["$totalIn", "$totalOut"] },
                    },
                },
            ]);

            if (requestData.length && requestData.length > 0) {
                sendResponse(res, 200, true, requestData, `MS stock list`);
            } else {
                sendResponse(res, 200, true, [], `MS stock not found`);
            }
        } catch (error) {
            console.log("error", error);
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

// const listStock = async (filter, firm_id, year_id) => {
    const listStock = async (filter, year_id) => {
    try {

        
        const filter1 = JSON.parse(filter)
        const { date } = filter1;
        // const { date } = filter

        const date_start = date && date.start ? new Date(date.start) : new Date("1947-08-15");
        let date_end = date ? (date.end ? new Date(date.end) : new Date()) : new Date();
        date_end.setHours(23, 59, 59, 999);
        const timezoneOffset = date_end.getTimezoneOffset() * 60000; // Offset in milliseconds
        date_end = new Date(date_end.getTime() - timezoneOffset);

        let sdate = null
        let edate = null

        if (date.start && date.end) {
            sdate = date.start
            edate = date.end
        }

        let matchObj1 = {
            deleted: false,
            order_date: {
                $gte: date_start,
                $lte: date_end,
            },
        };

        const transIds1 = await Transaction.distinct('_id', matchObj1)
        const item = await Item.distinct('_id', { deleted: false });

        const matchConditions = {
            deleted: false,
            transaction_id: { $nin: transIds1 },
            item_id: { $in: item }
        };

        // if (firm_id) matchConditions["transDetails.firm_id"] = new ObjectId(firm_id);
        if (year_id) matchConditions["transDetails.year_id"] = new ObjectId(year_id);

        const matchConditions1 = {
            deleted: false,
            transaction_id: { $in: transIds1 },
            item_id: { $in: item }
        };

        // if (firm_id) matchConditions1["transDetails.firm_id"] = new ObjectId(firm_id);
        if (year_id) matchConditions1["transDetails.year_id"] = new ObjectId(year_id);

        const requestData = await MSStock.aggregate([
            {
                $facet: {
                    requestData: [
                        {
                            $lookup: {
                                from: "ms_trans_details",
                                localField: "transaction_id",
                                foreignField: "_id",
                                as: "transDetails"
                            }
                        },
                        // {
                        //     $match: {
                        //         deleted: false,
                        //         "transDetails.firm_id": new ObjectId(firm_id),
                        //         "transDetails.year_id": new ObjectId(year_id),
                        //         transaction_id: { $nin: transIds1 },
                        //         item_id: { $in: item }
                        //     }
                        // },
                         { $unwind: "$transDetails" },
                        { $match: matchConditions },
                        {
                            $group: {
                                _id: "$item_id",
                                totalIn: { $sum: "$in" },
                                totalOut: { $sum: "$out" }
                            }
                        },
                        // {
                        //     $project: {
                        //         _id: 0,
                        //         item_id: "$_id",
                        //         totalIn: 1,
                        //         totalOut: 1,
                        //         opening_balance: { $subtract: ["$totalIn", "$totalOut"] }
                        //     }

                            
                        // }

                        {
  $project: {
    _id: 0,
    item_id: "$_id",
    totalIn: 1,
    totalOut: 1,
    opening_balance: {
      $cond: {
        if: { $gt: ["$totalIn", "$totalOut"] },
        then: { $subtract: ["$totalIn", "$totalOut"] },
        else: 0
      }
    }
  }
}

                    ],
                    requestData1: [
                        {
                            $lookup: {
                                from: "ms_trans_details",
                                localField: "transaction_id",
                                foreignField: "_id",
                                as: "transDetails"
                            }
                        },
                        // {
                        //     $match: {
                        //         deleted: false,
                        //         "transDetails.firm_id": new ObjectId(firm_id),
                        //         "transDetails.year_id": new ObjectId(year_id),
                        //         transaction_id: { $in: transIds1 },
                        //         item_id: { $in: item }
                        //     }
                        // },
                         { $unwind: "$transDetails" },
                        { $match: matchConditions1 },
                        {
                            $group: {
                                _id: "$item_id",
                                date_totalIn: { $sum: "$in" },
                                date_totalOut: { $sum: "$out" }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                item_id: "$_id",
                                date_totalIn: 1,
                                date_totalOut: 1,
                                date_balance: { $subtract: ["$date_totalIn", "$date_totalOut"] }
                            }
                        }
                    ]
                }
            },
            {
                $project: {
                    items: {
                        $map: {
                            input: {
                                $setUnion: [
                                    { $map: { input: "$requestData", as: "r", in: "$$r.item_id" } },
                                    { $map: { input: "$requestData1", as: "r1", in: "$$r1.item_id" } }
                                ]
                            },
                            as: "item_id",
                            in: {
                                $let: {
                                    vars: {
                                        reqData: {
                                            $arrayElemAt: [
                                                {
                                                    $filter: {
                                                        input: "$requestData",
                                                        cond: { $eq: ["$$this.item_id", "$$item_id"] }
                                                    }
                                                },
                                                0
                                            ]
                                        },
                                        reqData1: {
                                            $arrayElemAt: [
                                                {
                                                    $filter: {
                                                        input: "$requestData1",
                                                        cond: { $eq: ["$$this.item_id", "$$item_id"] }
                                                    }
                                                },
                                                0
                                            ]
                                        }
                                    },
                                    in: {
                                        item_id: "$$item_id",
                                        opening_balance: { $ifNull: ["$$reqData.opening_balance", 0] },
                                        date_totalIn: { $ifNull: ["$$reqData1.date_totalIn", 0] },
                                        date_totalOut: { $ifNull: ["$$reqData1.date_totalOut", 0] },
                                        balance: {
                                            $add: [
                                                { $ifNull: ["$$reqData.opening_balance", 0] },
                                                { $ifNull: ["$$reqData1.date_balance", 0] }
                                            ]
                                        },
                                        year_id: new ObjectId(year_id)
                                    }
                                }
                            }
                        }
                    }
                }
            },
            {
                $unwind: "$items"
            },
            {
                $lookup: {
                    from: "store-items",
                    localField: "items.item_id",
                    foreignField: "_id",
                    as: "itemDetails",
                    pipeline: [
                        {
                            $match: {
                                deleted: false
                            }
                        },
                        {
                            $lookup: {
                                from: "store-item-units",
                                localField: "unit",
                                foreignField: "_id",
                                as: "unitDetails",
                                pipeline: [{ $project: { _id: 0, name: 1 } }]
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                name: 1,
                                "unitDetails.name": 1,
                                mcode: 1,
                                material_grade: 1
                            }
                        }
                    ]
                }
            },
            {
                $unwind: {
                    path: "$itemDetails",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: null,
                    store_items: {
                        $push: {
                            item_id: "$items.item_id",
                            opening_balance: "$items.opening_balance",
                            date_totalIn: "$items.date_totalIn",
                            date_totalOut: "$items.date_totalOut",
                            balance: "$items.balance",
                            item_name: "$itemDetails.name",
                            unit: { $arrayElemAt: ["$itemDetails.unitDetails.name", 0] },
                            m_code: "$itemDetails.mcode",
                            material_grade: "$itemDetails.material_grade"
                        }
                    },
                    total_op_bal: { $sum: "$items.opening_balance" },
                    total_in: { $sum: "$items.date_totalIn" },
                    total_out: { $sum: "$items.date_totalOut" },
                    total_balance: { $sum: "$items.balance" }
                }


                
            },

            {
  $addFields: {
    "store_items": {
      $map: {
        input: "$store_items",
        as: "item",
        in: {
          $mergeObjects: ["$$item", { year_id: new ObjectId(year_id) }]
        }
      }
    }
  }
},
            {
                $project: {
                    _id: 0,
                    store_items: 1,
                    total_op_bal: 1,
                    total_in: 1,
                    total_out: 1,
                    total_balance: 1,
                    sdate: sdate,
                    edate: edate
                }
            }
        ]);

        // console.log("RequestData ==> ",requestData)


        if (requestData.length && requestData.length > 0) {
            return { status: 1, result: requestData };
        } else {
            return { status: 0, result: [] };
        }
    } catch (error) {
        return { status: 2, result: error };
    }
};

exports.msStockExcelReport = async (req, res) => {
    // const { filter, print_date, firm_id, year_id } = req.body;
    const { filter, print_date, year_id } = req.body;
    if (req.user && !req.error) {
        try {
            // const data = await listStock(filter, firm_id, year_id)
             const data = await listStock(filter, year_id)
            if (data.status === 1) {
                if (data.result.length && data.result[0].store_items.length > 0) {
                    const wb = XLSX.utils.book_new();

                    const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: "FFFF00" } } };

                    const headerStyle1 = { font: { bold: true } };

                    const ws_data = [[
                        { v: `MS Stock Report`, s: headerStyle1 }, "", "",
                        data.result[0].sdate ? { v: "From Date", s: headerStyle1 } : "",
                        data.result[0].sdate ? new Date(data.result[0].sdate).toLocaleDateString() : "",
                        data.result[0].edate ? { v: "To Date", s: headerStyle1 } : "",
                        data.result[0].edate ? new Date(data.result[0].edate).toLocaleDateString() : "",
                        print_date ? { v: "Download Date", s: headerStyle1 } : "",
                        print_date ? new Date().toLocaleDateString() : "",
                    ]];
                    ws_data.push([]);


                    ws_data.push(
                        [
                            { v: "SR NO.", s: headerStyle },
                            { v: "ITEM NAME", s: headerStyle },
                            { v: "MATERIAL GRADE", s: headerStyle },
                            { v: "UNIT", s: headerStyle },
                            { v: "M_CODE", s: headerStyle },
                            { v: "OP. QTY.", s: headerStyle },
                            { v: "IN QTY.", s: headerStyle },
                            { v: "OUT QTY.", s: headerStyle },
                            { v: "BALANCE QTY.", s: headerStyle },
                        ],
                    );


                    data.result[0].store_items.forEach((item, index) => {
                        const row = [
                            index + 1,
                            item.item_name,
                            item.material_grade,
                            item.unit,
                            item.m_code,
                            item.opening_balance,
                            item.date_totalIn,
                            item.date_totalOut,
                            item.balance,
                        ];
                        ws_data.push(row);

                    });
                    ws_data.push([]);
                    ws_data.push([]);

                    ws_data.push([
                        "", "", "", "",
                        { v: "Total", s: headerStyle },
                        data.result[0].total_op_bal,
                        data.result[0].total_in,
                        data.result[0].total_out,
                        data.result[0].total_balance,
                    ]);

                    const ws = XLSX.utils.aoa_to_sheet(ws_data);
                    ws['!merges'] = [
                        { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }
                    ];

                    ws['!cols'] = [
                        { wch: 5 },
                        { wch: 23 },
                        { wch: 15 },
                        { wch: 12 },
                        { wch: 12 },
                        { wch: 12 },
                        { wch: 12 },
                        { wch: 13 },
                        { wch: 12 },
                    ];

                    XLSX.utils.book_append_sheet(wb, ws, `MS Stock report`);

                    const xlsxPath = path.join(__dirname, '../../../xlsx');

                    if (!fs.existsSync(xlsxPath)) {
                        fs.mkdirSync(xlsxPath, { recursive: true });
                    }

                    const filename = `ms_stock_report_${Date.now()}.xlsx`;
                    const filePath = path.join(xlsxPath, filename);

                    await XLSXStyle.writeFile(wb, filePath);


                    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
                    const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;

                    sendResponse(res, 200, true, { file: fileUrl }, `XLSX file generated successfully`)
                } else {
                    sendResponse(res, 200, false, {}, `MS Stock report not found`)
                }
            }
            else if (data.status === 0) {
                sendResponse(res, 200, true, {}, `MS Stock report not found`)
            }
            else if (data.status === 2) {
                sendResponse(res, 500, false, {}, "Something went wrong1111");
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.MSstockList = async (req, res) => {
    // const { filter, firm_id, year_id } = req.body;
     const { filter, year_id } = req.body;
    if (req.user && !req.error) {
        try {
            // const data = await listStock(filter, firm_id, year_id)
             const data = await listStock(filter, year_id)
            if (data.status === 1) {
                sendResponse(res, 200, true, data.result[0], "MS stock found");
            } else if (data.status === 0) {
                sendResponse(res, 200, true, [], `MS stock not found`);
            } else if (data.status === 2) {
                console.log("error", data.result);
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

exports.downloadMSStock = async (req, res) => {
    // const { filter, print_date, firm_id, year_id } = req.body;
     const { filter, print_date, year_id } = req.body;
    if (req.user && !req.error) {
        try {
            // const data = await listStock(filter, firm_id, year_id)
             const data = await listStock(filter, year_id)
            if (data.status === 1) {
                const requestData = data.result[0];
                const template = fs.readFileSync(
                    "templates/msStockList.html",
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
                    width: "11in",
                    height: "15in",
                    // format: "A4",
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

                const filename = `main_store_stock_${Date.now()}.pdf`;
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
            } else if (data.status === 0) {
                sendResponse(res, 200, true, [], `MS stock not found`);
            } else if (data.status === 2) {
                console.log("error", data.result);
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

// const listStoreReOrder = async (search, firm_id, year_id) => {
    const listStoreReOrder = async (search, year_id) => {
    try {
        let matchObj = {}
        if (search != "") {
            const searchRegex = new RegExp(`^${search}`, 'i');
            matchObj = {
                ...matchObj,
                $or: [
                    { item_name: searchRegex },
                    { category: searchRegex },
                    { m_code: searchRegex }
                ]
            };
        }

        let matchObj1 = {
            deleted: false,
            // firm_id: new ObjectId(firm_id),
            year_id: new ObjectId(year_id),
        };

        const transIds1 = await Transaction.distinct('_id', matchObj1)

        const requestData = await MSStock.aggregate([
            {
                $match: {
                    deleted: false,
                    transaction_id: { $in: transIds1 },
                }
            },
            {
                $group: {
                    _id: "$item_id",
                    totalIn: { $sum: "$in" },
                    totalOut: { $sum: "$out" },
                },
            },
            {
                $project: {
                    _id: 0,
                    item_id: "$_id",
                    totalIn: 1,
                    totalOut: 1,
                    balance: { $subtract: ["$totalIn", "$totalOut"] },
                },
            },
            {
                $lookup: {
                    from: "store-items",
                    localField: "item_id",
                    foreignField: "_id",
                    as: "itemDetails",
                    pipeline: [
                        {
                            $lookup: {
                                from: "store-item-units",
                                localField: "unit",
                                foreignField: "_id",
                                as: "unitDetails",
                                pipeline: [{ $project: { _id: 0, name: 1 } }],
                            },
                        },
                        {
                            $lookup: {
                                from: "store-item-categories",
                                localField: "category",
                                foreignField: "_id",
                                as: "categoryDetails",
                                pipeline: [{ $project: { _id: 0, name: 1 } }],
                            },
                        },
                        {
                            $project: {
                                _id: 1,
                                name: 1,
                                unit: { $arrayElemAt: ["$unitDetails.name", 0] },
                                category: { $arrayElemAt: ["$categoryDetails.name", 0] },
                                mcode: 1,
                                material_grade: 1,
                                reorder_quantity: 1,
                                ItemId: 1,
                                hsn_code: 1,
                            },
                        },

                    ],
                },
            },
            {
                $project: {
                    item_id: 1,
                    balance: 1,
                    item_name: { $arrayElemAt: ["$itemDetails.name", 0] },
                    ItemId: { $arrayElemAt: ["$itemDetails.ItemId", 0] },
                    hsn_code: { $arrayElemAt: ["$itemDetails.hsn_code", 0] },
                    unit: { $arrayElemAt: ["$itemDetails.unit", 0] },
                    m_code: { $arrayElemAt: ["$itemDetails.mcode", 0] },
                    material_grade: { $arrayElemAt: ["$itemDetails.material_grade", 0] },
                    reorder_quantity: { $arrayElemAt: ["$itemDetails.reorder_quantity", 0] },
                    category: { $arrayElemAt: ["$itemDetails.category", 0] }
                }
            },
            {
                $match: matchObj
            },
            {
                $match: {
                    $expr: { $gt: ["$reorder_quantity", "$balance"] }
                }
            },
            {
                $addFields: {
                    order_qty: { $subtract: ["$reorder_quantity", "$balance"] }
                }
            },
            {
                $lookup: {
                    from: "ms_trans_details",
                    let: { itemId: "$item_id" },
                    pipeline: [
                        {
                            $match: {
                                deleted: false,
                                // firm_id: new ObjectId(firm_id),
                                year_id: new ObjectId(year_id),
                            }
                        },
                        {
                            $unwind: "$items_details"
                        },
                        {
                            $match: {
                                "items_details.deleted": false,
                                $expr: { $eq: ["$items_details.item_id", "$$itemId"] }
                            }
                        },
                        {
                            $lookup: {
                                from: "tags",
                                localField: "tag_id",
                                foreignField: "_id",
                                as: "tagDetails"
                            }
                        },
                        {
                            $lookup: {
                                from: "store-parties",
                                localField: "party_id",
                                foreignField: "_id",
                                as: "partyDetails"
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                transDate: "$order_date",
                                item: "$items_details",
                                voucher_no: "$voucher_no",
                                tagDetails: { $arrayElemAt: ["$tagDetails.tag_number", 0] },
                                party_name: { $arrayElemAt: ["$partyDetails.name", 0] },
                                items_details: 1
                            }
                        },
                        {
                            $sort: { transDate: -1 }
                        }
                    ],
                    as: "transDetails"
                }
            },
            {
                $addFields: {
                    lastPurchase: {
                        $first: {
                            $filter: {
                                input: "$transDetails",
                                as: "trans",
                                cond: { $eq: ["$$trans.tagDetails", 11] }
                            }
                        }
                    },
                    lastIssue: {
                        $first: {
                            $filter: {
                                input: "$transDetails",
                                as: "trans",
                                cond: { $eq: ["$$trans.tagDetails", 13] }
                            }
                        }
                    }
                }
            },
            {
                $sort: { category: 1 }
            },
            {
                $project: {
                    item_id: 1,
                    balance: 1,
                    item_name: 1,
                    ItemId: 1,
                    hsn_code: 1,
                    unit: 1,
                    m_code: 1,
                    material_grade: 1,
                    reorder_quantity: 1,
                    category: 1,
                    order_qty: 1,
                    lastPurchaseDate: "$lastPurchase.transDate",
                    lastPurchaseParty: "$lastPurchase.party_name",
                    lastPurchaseRate: "$lastPurchase.item.rate",
                    lastPurchaseVoucher: "$lastPurchase.voucher_no",
                    lastIssueDate: "$lastIssue.transDate",
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
};

exports.downloadItemStore = async (req, res) => {
    // const { search, print_date, firm_id, year_id } = req.body;
     const { search, print_date, year_id } = req.body;
    if (req.user && !req.error) {
        try {
            // const data = await listStoreReOrder(search, firm_id, year_id)
              const data = await listStoreReOrder(search, year_id)
            if (data.status === 1) {
                const requestData = data.result;
                const template = fs.readFileSync(
                    "templates/msStoreReorder.html",
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
                    width: "13in",
                    height: "17in",
                    // format: "A4",
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

                const filename = `ms_store_reorder_${Date.now()}.pdf`;
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
            } else if (data.status === 0) {
                sendResponse(res, 200, true, [], `Store reorder report not found`);
            } else if (data.status === 2) {
                console.log("error", data.result);
                sendResponse(res, 500, false, {}, "Something went wrong");
            }
        } catch (error) {
            console.log("Error", error);
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};



exports.downloadItemStoreExcel = async (req, res) => {
    const { search, print_date, year_id } = req.body;

    if (req.user && !req.error) {
        try {
            const data = await listStoreReOrder(search, year_id);

            if (data.status === 1 && data.result.length > 0) {
                const requestData = data.result;

                const wb = XLSX.utils.book_new();

                const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: "FFFF00" } } };
                const headerStyle1 = { font: { bold: true } };

                const ws_data = [[
                    { v: `Item Store Reorder Report`, s: headerStyle1 },
                    "", "",
                    print_date ? { v: "Download Date", s: headerStyle1 } : "",
                    print_date ? new Date().toLocaleDateString() : ""
                ]];

                ws_data.push([]);

                ws_data.push([
                    { v: "SR NO.", s: headerStyle },
                    { v: "ITEM NAME", s: headerStyle },
                    { v: "Category", s: headerStyle },
                    { v: "UNIT", s: headerStyle },
                    { v: "MATERIAL CODE", s: headerStyle },
                    { v: "HSN CODE", s: headerStyle },
                    { v: "REORDER QUANTITY", s: headerStyle },
                    { v: "BALANCE", s: headerStyle },
                    { v: "ORDER QTY", s: headerStyle },
                    { v: "LAST PURCHASE DATE", s: headerStyle },
                    { v: "LAST PURCHASE PARTY", s: headerStyle },
                    { v: "LAST PURCHASE VOUCHER", s: headerStyle },
                    { v: "LAST PURCHASE RATE", s: headerStyle },
                    { v: "LAST ISSUE DATE", s: headerStyle },

                ]);

                requestData.forEach((item, index) => {
                    ws_data.push([
                        index + 1,
                        item.item_name || '',
                        item.category || '',
                        item.unit || '',
                        item.m_code || '',
                        item.hsn_code || '',
                        item.reorder_quantity || '',
                        item.balance || '',
                        item.order_qty || '',
                        item.lastPurchaseDate || '',
                        item.lastPurchaseParty || '',
                        item.lastPurchaseVoucher || '',
                        item.lastPurchaseRate || '',
                        item.lastIssueDate || ''
                    ]);
                });

                const ws = XLSX.utils.aoa_to_sheet(ws_data);
                ws['!merges'] = [
                    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }
                ];

                ws['!cols'] = [
                    { wch: 5 },
                    { wch: 25 },
                    { wch: 15 },
                    { wch: 15 },
                    { wch: 12 },
                    { wch: 15 }
                ];

                XLSX.utils.book_append_sheet(wb, ws, `Reorder Report`);

                const xlsxPath = path.join(__dirname, '../../../xlsx');
                if (!fs.existsSync(xlsxPath)) {
                    fs.mkdirSync(xlsxPath, { recursive: true });
                }

                const filename = `item_store_reorder_${Date.now()}.xlsx`;
                const filePath = path.join(xlsxPath, filename);

                await XLSXStyle.writeFile(wb, filePath);

                const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
                const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;

                sendResponse(res, 200, true, { file: fileUrl }, `Excel file generated successfully`);
            } else if (data.status === 0) {
                sendResponse(res, 200, true, [], `Store reorder report not found`);
            } else if (data.status === 2) {
                console.log("error", data.result);
                sendResponse(res, 500, false, {}, "Something went wrong");
            }
        } catch (error) {
            console.log("Error", error);
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};
exports.storeReOrderList = async (req, res) => {
    // const { search, firm_id, year_id } = req.body;
     const { search, year_id } = req.body;
    if (req.user && !req.error) {
        try {
            // const data = await listStoreReOrder(search, firm_id, year_id)
            const data = await listStoreReOrder(search, year_id)
            if (data.status === 1) {
                sendResponse(res, 200, true, data.result, "Store reorder report list");
            } else if (data.status === 0) {
                sendResponse(res, 200, true, [], `Store reorder report not found`);
            } else if (data.status === 2) {
                console.log("error", data.result);
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