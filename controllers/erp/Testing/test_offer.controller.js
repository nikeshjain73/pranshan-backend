const TestOffer = require('../../../models/erp/Testing/test_offer_model');
const NDT = require('../../../models/erp/NDT/ndt.model');
const { TitleFormat } = require('../../../utils/enum');
const { sendResponse } = require('../../../helper/response');
const ejs = require("ejs");
const fs = require("fs");
const XLSX = require('xlsx');  // for utility functions
const XLSXStyle = require('xlsx-style');  // for styling
const puppeteer = require("puppeteer");
const path = require("path");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;


exports.manageTestOffer = async (req, res) => {
    const { id, items, offeredBy, project, type, drawing_id } = req.body;
    if (req.user && !req.error) {
        if (project && items && offeredBy && drawing_id) {
            try {
                let newItems = JSON.parse(items) || [];
                let testElement = await NDT.findOne({ name: type });
                // let lastOffer = await TestOffer.findOne({ deleted: false, ndt_type_id: testElement?._id }, { deleted: 0 }, { sort: { updatedAt: -1 } });
                let lastOffer = await TestOffer.findOne(
                    {
                        deleted: false,
                        ndt_type_id: testElement?._id,
                        ndt_offer_no: { $exists: true, $ne: null , $regex: `/${project}/`},
                    },
                    { deleted: 0 },
                    { sort: { updatedAt: -1 } }
                );
                let offerNo = "1";
                // if (lastOffer[lastOffer.length - 1] && lastOffer[lastOffer.length - 1].ndt_offer_no) {
                if (lastOffer && lastOffer.ndt_offer_no) {
                    const split = lastOffer.ndt_offer_no.split('/');
                    const lastOfferNo = parseInt(split[split.length - 1]);
                    offerNo = lastOfferNo + 1;
                }

                let offerFormat = type + 'OFFERNO';
                const gen_ndt_offer = TitleFormat[offerFormat].replace('/PROJECT/', `/${project}/`) + offerNo;

                if (id) {
                    let updatedOffer = await TestOffer.findByIdAndUpdate(id, {
                        ndt_offer_no: gen_ndt_offer,
                        items: newItems,
                        offeredBy: offeredBy,
                        report_date: Date.now(),
                        drawing_id,
                        status: 4, // send to QC for approval
                    }, { new: true });
                    if (!updatedOffer) {
                        sendResponse(res, 404, false, {}, 'Test Offer not found');
                        return;
                    } else {
                        sendResponse(res, 200, true, {}, 'Test Offer updated successfully');
                        return;
                    }
                }
            } catch (error) {
                sendResponse(res, 500, false, {}, 'Something went wrong' + error);
            }
        } else {
            sendResponse(res, 400, false, {}, 'Missing parameters');
            return;
        }

    } else {
        sendResponse(res, 401, false, {}, 'Unauthorized');
        return;
    }
}

exports.getTestOffer = async (req, res) => {
    const { status, type } = req.query;
    if (req.user && !req.error) {
        try {
            const query = { deleted: false };
            if (status) {
                query.status = status;

            }
            if (type) {
                query.ndt_type_id = type;
            }

            let offer = await TestOffer.find(query, { deleted: 0 })
                .populate({
                    path: 'ndt_master_id',
                    select: 'ndt_voucher_no weld_inspection_id',
                    populate: {
                        path: 'weld_inspection_id',
                        select: 'fitup_id',
                        populate: {
                            path: 'fitup_id',
                            select: 'items',
                            populate: {
                                path: 'items',
                                select: 'transaction_id joint_type',
                                populate: {
                                    path: 'joint_type',
                                    select: 'name'
                                }
                            }
                        }
                    }
                })
                .populate('ndt_type_id', 'name')
                .populate('offered_by', 'user_name')
                .populate({
                    path: 'items.weldor_no',
                    select: 'welderNo wpsNo',
                    populate: {
                        path: 'wpsNo', select: 'jointType weldingProcess',
                        populate: { path: 'jointType.jointId', select: 'name' }
                    }
                })
                .populate({
                    path: 'items.transaction_id',
                    select: 'itemName drawingId quantity item_no grid_no',
                    populate: [
                        { path: 'itemName', select: 'name' },
                        {
                            path: 'drawingId', select: 'drawing_no sheet_no rev assembly_no project',
                            populate: {
                                path: 'project',
                                select: 'name party work_order_no',
                                populate: { path: 'party', select: 'name' }

                            }
                        }
                    ]
                })
                .sort({ createdAt: -1 });
            if (!offer) {
                sendResponse(res, 404, false, {}, 'Test Offer not found');
                return;
            } else {
                sendResponse(res, 200, true, offer, 'Test Offer found successfully');
                return;
            }

        } catch (error) {
            sendResponse(res, 500, false, {}, 'Something went wrong');
        }
    } else {
        sendResponse(res, 401, false, {}, 'Unauthorized');
        return;
    }
}

const getOneNDToffer = async (ndt_offer_no) => {
    try {
        const requestData = await TestOffer.aggregate([
            { $match: { deleted: false, ndt_offer_no: ndt_offer_no } },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "qualified_welder_lists",
                    localField: "items.weldor_no",
                    foreignField: "_id",
                    as: "qualWeldDetails",
                    pipeline: [
                        {
                            $lookup: {
                                from: "store-wps-masters",
                                localField: "wpsNo",
                                foreignField: "_id",
                                as: "wpsDetails",
                                pipeline: [
                                    {
                                        $lookup: {
                                            from: "joint-types",
                                            localField: "jointType",
                                            foreignField: "_id",
                                            as: "jointDetails",
                                        },
                                    },
                                    { $unwind: { path: "$jointDetails", preserveNullAndEmptyArrays: true } },
                                ],
                            },
                        },
                    ],
                },
            },
            {
                $addFields: {
                    qualWeldDetails: { $arrayElemAt: ["$qualWeldDetails", 0] },
                    wpsDetails: { $arrayElemAt: ["$qualWeldDetails.wpsDetails", 0] },
                    jointDetails: { $arrayElemAt: ["$qualWeldDetails.wpsDetails.jointDetails", 0] },
                },
            },
            {
                $addFields: {
                    welder_no: "$qualWeldDetails.welderNo",
                    weld_process: { $arrayElemAt: ["$qualWeldDetails.wpsDetails.weldingProcess", 0] },
                    joint_type: { $arrayElemAt: ["$qualWeldDetails.wpsDetails.jointDetails.name", 0] },
                },
            },
            {
                $lookup: {
                    from: "store_transaction_items",
                    localField: "items.transaction_id",
                    foreignField: "_id",
                    as: "transactionDetails",
                    pipeline: [
                        {
                            $lookup: {
                                from: "store-items",
                                localField: "itemName",
                                foreignField: "_id",
                                as: "itemProfile",
                            },
                        },
                        {
                            $lookup: {
                                from: "erp-planner-drawings",
                                localField: "drawingId",
                                foreignField: "_id",
                                as: "drawingDetails",
                                pipeline: [
                                    {
                                        $lookup: {
                                            from: "bussiness-projects",
                                            localField: "project",
                                            foreignField: "_id",
                                            as: "projectDetails",
                                            pipeline: [
                                                {
                                                    $lookup: {
                                                        from: "store-parties",
                                                        localField: "party",
                                                        foreignField: "_id",
                                                        as: "partyDetails",
                                                    },
                                                },
                                            ],
                                        },
                                    },
                                ],
                            },
                        },
                    ],
                },
            },
            {
                $addFields: {
                    transactionDetails: { $arrayElemAt: ["$transactionDetails", 0] },
                },
            },
            {
                $addFields: {
                    itemProfile: { $arrayElemAt: ["$transactionDetails.itemProfile", 0] },
                    drawingDetails: { $arrayElemAt: ["$transactionDetails.drawingDetails", 0] },
                },
            },
            {
                $addFields: {
                    projectDetails: { $arrayElemAt: ["$drawingDetails.projectDetails", 0] },
                },
            },
            {
                $addFields: {
                    partyDetails: { $arrayElemAt: ["$projectDetails.partyDetails", 0] },
                },
            },
            {
                $lookup: {
                    from: "ndts",
                    localField: "ndt_type_id",
                    foreignField: "_id",
                    as: "ndtTypeDetails",
                },
            },
            {
                $addFields: {
                    ndtType: { $arrayElemAt: ["$ndtTypeDetails.name", 0] },
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "offered_by",
                    foreignField: "_id",
                    as: "offerDetails",
                },
            },
            {
                $addFields: {
                    offer_name: { $arrayElemAt: ["$offerDetails.user_name", 0] },
                },
            },
            {
                $project: {
                    _id: 1,
                    report_no: "$ndt_offer_no",
                    ndtType: "$ndtType",
                    client: "$partyDetails.name",
                    project_name: "$projectDetails.name",
                    wo_no: "$projectDetails.work_order_no",
                    offer_date: "$report_date",
                    offer_name: "$offer_name",
                    items: {
                        _id: "$items._id",
                        drawing_no: "$drawingDetails.drawing_no",
                        rev: "$drawingDetails.rev",
                        assembly_no: "$drawingDetails.assembly_no",
                        grid_no: "$transactionDetails.grid_no",
                        profile: "$itemProfile.name",
                        joint_type: "$joint_type",
                        weld_process: "$weld_process",
                        welder_no: "$welder_no",
                        thickness: "$items.thickness",
                        remarks: "$items.remarks",
                    },
                },
            },
            {
                $group: {
                    _id: {
                        _id: "$_id",
                        ndtType: "$ndtType",
                        report_no: "$report_no",
                        project_name: "$project_name",
                        wo_no: "$wo_no",
                        offer_date: "$offer_date",
                        client: "$client",
                        offer_name: "$offer_name",
                    },
                    items: { $push: "$items" },
                },
            },
            {
                $project: {
                    _id: "$_id._id",
                    ndtType: "$_id.ndtType",
                    report_no: "$_id.report_no",
                    client: "$_id.client",
                    project_name: "$_id.project_name",
                    wo_no: "$_id.wo_no",
                    offer_date: "$_id.offer_date",
                    offer_name: "$_id.offer_name",
                    items: 1,
                },
            },
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

exports.downloadNDTOffer = async (req, res) => {
    const { ndt_offer_no, print_date } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getOneNDToffer(ndt_offer_no)
            let requestData = data.result;

            if (data.status === 1) {
                const template = fs.readFileSync(
                    "templates/NDToffer.html",
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
                const filename = `ndt_${(requestData[0].ndtType).toLowerCase()}_offer_${Date.now()}.pdf`;
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
                sendResponse(res, 200, false, {}, `FD data not found`)
            }
            else if (data.status === 2) {
                sendResponse(res, 500, false, {}, "Something went wrong");
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.xlsxOneNDTOffer = async (req, res) => {
    const { ndt_offer_no, print_date } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getOneNDToffer(ndt_offer_no)
            let requestData = data.result;

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
                    font: { bold: true }, alignment: { horizontal: 'left', vertical: 'middle' },
                };

                const headerStyle4 = {
                    font: { bold: true }, alignment: { horizontal: 'center', vertical: 'middle' },
                };

                const headerStyle5 = {
                    font: { bold: false }, alignment: { horizontal: 'center', vertical: 'middle' },
                };

                // *** Do not remove space ***
                const ws_data = [
                    [
                        {
                            v: `VISHAL ENTERPRISE & VRISHAL ENGINEERING PRIVATE LIMITED GROUP OF COMPANIES`, s: headerStyle2
                        },
                    ],
                ]

                let a = "";
                let b = "";


                if (requestData[0].ndtType == "UT") {
                    ws_data.push(
                        [
                            { v: `ULTRASONIC TEST OFFER`, s: headerStyle4 },
                            "", "", "", "",
                            print_date ? { v: `Download Date : ${new Date().toLocaleDateString()}`, s: headerStyle4 } : "",
                        ]
                    );
                    a = "Ultrasonic Test";
                    b = "Ultrasonic_test";
                } else if (requestData[0].ndtType == "RT") {
                    ws_data.push(
                        [
                            { v: `RADIOGRAPHY TEST OFFER`, s: headerStyle4 },
                            "", "", "", "",
                            print_date ? { v: `Download Date : ${new Date().toLocaleDateString()}`, s: headerStyle4 } : "",
                        ]
                    );
                    a = "Radiography Test";
                    b = "Radiography_test";
                } else if (requestData[0].ndtType == "MPT") {
                    ws_data.push(
                        [
                            { v: `MAGNETIC PARTICLE TEST OFFER`, s: headerStyle4 },
                            "", "", "", "",
                            print_date ? { v: `Download Date : ${new Date().toLocaleDateString()}`, s: headerStyle4 } : "",
                        ]
                    );
                    a = "Magnetic Particle Test";
                    b = "Magnetic_particle_test";
                } else if (requestData[0].ndtType == "LPT") {
                    ws_data.push(
                        [
                            { v: `LIQUID PENETRANT TEST OFFER`, s: headerStyle4 },
                            "", "", "", "",
                            print_date ? { v: `Download Date : ${new Date().toLocaleDateString()}`, s: headerStyle4 } : "",
                        ]
                    );
                    a = "Liquid Penetrant Test";
                    b = "Liquid_penetrant_test";
                }

                ws_data.push(
                    [
                        { v: `Client                          : ${requestData[0].client}`, s: headerStyle1 },
                        "", "", "", "",
                        { v: `Project                               : ${requestData[0].project_name}`, s: headerStyle1 },
                    ],
                    [
                        { v: `Report No.                  : ${requestData[0].report_no}`, s: headerStyle1 },
                        "", "", "", "",
                        { v: `WO PO No.                        : ${requestData[0].wo_no}`, s: headerStyle1 },
                    ],
                    [
                        { v: `Offer Date.                  : ${requestData[0].offer_date ? new Date(requestData[0].offer_date).toLocaleDateString() : '--'}`, s: headerStyle1 }
                    ],
                );

                const headers = [
                    { v: "Sr No.", s: headerStyle },
                    { v: "Drawing No.", s: headerStyle },
                    { v: "ASS. No.", s: headerStyle },
                    { v: "Grid No.", s: headerStyle },
                    { v: "Profile", s: headerStyle },
                    { v: "Type Of Weld", s: headerStyle },
                    { v: "Welding Process", s: headerStyle },
                    { v: "Welder No.", s: headerStyle },
                    { v: "ThicKness (mm)", s: headerStyle },
                    { v: "Remarks", s: headerStyle },
                ];

                ws_data.push(headers);

                requestData[0].items.forEach((detail, itemIndex) => {
                    const row = [
                        itemIndex + 1,
                        detail.drawing_no || '--',
                        detail.assembly_no || '--',
                        detail.grid_no || '--',
                        detail.profile || '--',
                        detail.joint_type || '--',
                        detail.weld_process || '--',
                        detail.welder_no || '--',
                        detail.thickness || '--',
                        detail.remarks || '--',
                    ];

                    ws_data.push(row);
                });
                ws_data.push([]);
                ws_data.push(
                    [
                        { v: `Note`, s: headerStyle3 },
                    ],
                    [
                        "", "",
                        {
                            v: `Offered By`, s: headerStyle4
                        },
                    ],
                    [
                        { v: `Signature`, s: headerStyle3 },
                    ],
                    [
                        { v: `Name`, s: headerStyle3 },
                        "",
                        {
                            v: `${requestData[0].offer_name}`, s: headerStyle5
                        },
                    ],
                    [
                        { v: `Date`, s: headerStyle3 },
                        "",
                        {
                            v: `${requestData[0].offer_date ? new Date(requestData[0].offer_date).toLocaleDateString() : ''}`, s: headerStyle5
                        },
                    ],
                );


                if (requestData[0].ndtType == "UT") {
                    ws_data.push(
                        [
                            { v: `VE-QA-FORMAT-50A`, s: headerStyle1 },
                        ],
                    );
                } else if (requestData[0].ndtType == "RT") {
                    ws_data.push(
                        [
                            { v: `VE-QA-FORMAT-07A`, s: headerStyle1 },
                        ],
                    );
                } else if (requestData[0].ndtType == "MPT") {
                    ws_data.push(
                        [
                            { v: `VE-QA-FORMAT-29A`, s: headerStyle1 },
                        ],
                    );
                } else if (requestData[0].ndtType == "LPT") {
                    ws_data.push(
                        [
                            { v: `VE-STR-13A`, s: headerStyle1 },
                        ],
                    );
                }

                const colWidths = ws_data[5].map((_, colIndex) => ({
                    wch: Math.max(
                        ...ws_data.slice(5, 5 + requestData.length + 1).map(row => (
                            row[colIndex]?.toString().length || 0
                        ))
                    ),
                }));

                ws = XLSX.utils.aoa_to_sheet(ws_data);
                ws['!cols'] = colWidths;

                ws['!merges'] = [
                    { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
                    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
                    { s: { r: 1, c: 5 }, e: { r: 1, c: 9 } },
                    { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
                    { s: { r: 2, c: 5 }, e: { r: 2, c: 9 } },
                    { s: { r: 3, c: 0 }, e: { r: 3, c: 4 } },
                    { s: { r: 3, c: 5 }, e: { r: 3, c: 9 } },
                    { s: { r: 4, c: 0 }, e: { r: 4, c: 9 } },
                    { s: { r: ws_data.length - 6, c: 0 }, e: { r: ws_data.length - 6, c: 1 } },
                    { s: { r: ws_data.length - 6, c: 2 }, e: { r: ws_data.length - 6, c: 9 } },
                    { s: { r: ws_data.length - 5, c: 0 }, e: { r: ws_data.length - 5, c: 1 } },
                    { s: { r: ws_data.length - 5, c: 2 }, e: { r: ws_data.length - 5, c: 9 } },
                    { s: { r: ws_data.length - 4, c: 0 }, e: { r: ws_data.length - 4, c: 1 } },
                    { s: { r: ws_data.length - 4, c: 2 }, e: { r: ws_data.length - 4, c: 9 } },
                    { s: { r: ws_data.length - 3, c: 0 }, e: { r: ws_data.length - 3, c: 1 } },
                    { s: { r: ws_data.length - 3, c: 2 }, e: { r: ws_data.length - 3, c: 9 } },
                    { s: { r: ws_data.length - 2, c: 0 }, e: { r: ws_data.length - 2, c: 1 } },
                    { s: { r: ws_data.length - 2, c: 2 }, e: { r: ws_data.length - 2, c: 9 } },
                    { s: { r: ws_data.length - 1, c: 0 }, e: { r: ws_data.length - 1, c: 9 } },
                ];

                XLSX.utils.book_append_sheet(wb, ws, `${a}`);

                const xlsxPath = path.join(__dirname, '../../../xlsx');

                if (!fs.existsSync(xlsxPath)) {
                    fs.mkdirSync(xlsxPath, { recursive: true });
                }

                const filename = `${b}_${Date.now()}.xlsx`;
                const filePath = path.join(xlsxPath, filename);

                await XLSXStyle.writeFile(wb, filePath);

                const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
                const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;

                sendResponse(res, 200, true, { file: fileUrl }, `XLSX file generated successfully`)

            }
            else if (data.status === 0) {
                sendResponse(res, 200, false, {}, `Detail not found`)
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