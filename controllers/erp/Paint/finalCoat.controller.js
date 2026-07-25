const { sendResponse } = require("../../../helper/response");
const FinalCoatModel = require("../../../models/erp/Paint/final_coat.model");
const mioModel = require("../../../models/erp/Paint/mio.model");
const { TitleFormat } = require("../../../utils/enum");
const ejs = require("ejs");
const fs = require("fs");
const puppeteer = require("puppeteer");
const path = require("path");
const inspect_summaryModel = require("../../../models/erp/Execution/inspect_summary.model");
const surfaceModel = require("../../../models/erp/Paint/surface.model");
const inspection_releaseModel = require("../../../models/erp/ReleaseNote/inspection_release.model");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;

exports.getFinalCoatData = async (req, res) => {
    const { status } = req.query;
    if (req.user && !req.error) {
        try {
            let query = { deleted: false };
            if (status) {
                query.status = status;
            }
            const data = await FinalCoatModel.find(query, { deleted: 0, __v: 0 })
                .populate('offered_by', 'user_name')
                .populate('drawing_id', 'drawing_no')
                .populate('project_id', 'name')
                .populate('procedure_no', 'client_doc_no vendor_doc_no')
                .populate('qc_name', 'user_name')
                .populate({
                    path: 'dispatch_note',
                    select: 'lot_no paint_system',
                    populate: {
                        path: 'paint_system',
                        select: 'paint_system_no voucher_no surface_preparation profile_requirement salt_test paint_manufacturer prime_paint primer_app_method primer_dft_range mio_paint mio_app_method mio_dft_range final_paint final_paint_app_method final_paint_dft_range total_dft_requirement',
                        populate: {
                            path: 'paint_manufacturer',
                            select: 'name'
                        }
                    }
                })
                .sort({ createdAt: -1 }).lean();
            if (data) {
                sendResponse(res, 200, true, data, "Final Paint data found successfully");
            } else {
                sendResponse(res, 400, false, data, "Final Paint data not found");
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.manageFinalCoat = async (req, res) => {
    const { id, project_id, drawing_id, dispatch_note, procedure_no, weather_condition,
        final_date, time, shelf_life, manufacture_date,
        paint_batch_base, paint_batch_hardner, offered_by, remarks, project, notes } = req.body;

    if (req.user && !req.error) {
        if (project_id && drawing_id && dispatch_note && procedure_no && offered_by && project) {
            try {

                let lastOffer = await FinalCoatModel.findOne({ deleted: false, voucher_no: { $regex: `/${project}/` } }, { deleted: 0 }, { sort: { createdAt: -1 } });
                let newOfferNo = "1";
                if (lastOffer && lastOffer.voucher_no) {
                    const split = lastOffer.voucher_no.split('/');
                    const lastOfferNo = parseInt(split[split.length - 1]);
                    newOfferNo = lastOfferNo + 1;
                }
                const gen_voucher_no = TitleFormat.FINALCOATOFFERNO.replace('/PROJECT/', `/${project}/`) + newOfferNo;
                const weatherCondition = (typeof weather_condition !== 'undefined' && weather_condition !== null)
                    ? JSON.parse(weather_condition)
                    : [];

                // Check previous step is done before processing
                const previousStep = (await mioModel.find({ dispatch_note, deleted: false }).lean()).find(elem => elem.qc_status === true);

                if (previousStep) {
                    if (!id) {
                        const newFinalCoatModel = new FinalCoatModel({
                            voucher_no: gen_voucher_no,
                            project_id, drawing_id, dispatch_note, procedure_no,
                            final_date, time, shelf_life, manufacture_date,
                            paint_batch_base, paint_batch_hardner, offered_by, remarks, project,
                            weather_condition: weatherCondition,
                            offer_date: Date.now(),
                            notes: notes,
                        });
                        await newFinalCoatModel.save();
                        sendResponse(res, 200, true, {}, "Final Paint added successfully");
                    } else {
                        await FinalCoatModel.findByIdAndUpdate(id, {
                            project_id, drawing_id, dispatch_note, procedure_no,
                            final_date, time, shelf_life, manufacture_date,
                            paint_batch_base, paint_batch_hardner, offered_by, remarks, project,
                            weather_condition: weatherCondition,
                            notes: notes,
                        }).then(result => {
                            if (result) {
                                sendResponse(res, 200, true, {}, "Final Paint updated successfully");
                            }
                        }).catch(err => {
                            console.error(err);
                            sendResponse(res, 500, false, {}, "Something went wrong while updating");
                        })
                    }
                }
                else {
                    sendResponse(res, 400, false, {}, "Please complete the mio paint step first");
                    return;
                }
            } catch (error) {
                console.log(error);
                sendResponse(res, 500, false, {}, "Something went wrong");
            }
        } else {
            sendResponse(res, 400, false, {}, "Missing parameters!");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized!");
    }
}

exports.getFinalCoatApproval = async (req, res) => {
    const { id, qc_name, status, project, average_dft_final_coat, qc_notes } = req.body;

    if (req.user && !req.error) {
        if (id && qc_name && status && average_dft_final_coat && project) {
            try {
                let lastVoucher = await FinalCoatModel.findOne({ deleted: false, voucher_no_two: { $regex: `/${project}/` } }, { deleted: 0 }, { sort: { createdAt: -1 } });
                let newInpectedNo = "1";
                if (lastVoucher && lastVoucher.voucher_no_two) {
                    const split = lastVoucher.voucher_no_two.split('/');
                    const lastVoucherNo = parseInt(split[split.length - 1]);
                    newInpectedNo = lastVoucherNo + 1;
                }
                const gen_report_no = TitleFormat.FINALCOATINSPECTNO.replace('/PROJECT/', `/${project}/`) + newInpectedNo;
                await FinalCoatModel.findByIdAndUpdate(id, {
                    qc_status: status,
                    qc_time: Date.now(),
                    qc_name: qc_name,
                    voucher_no_two: gen_report_no,
                    status: status === 'true' ? 2 : 3,
                    average_dft_final_coat: average_dft_final_coat,
                    qc_notes: qc_notes || '',
                }).then(async result => {
                    if (result) {
                        if (status === 'true') {
                            const lastReportNo = await inspection_releaseModel.findOne({ deleted: false }, { deleted: 0 }, { sort: { createdAt: -1 } });
                            let ReportNo = "1";

                            if (lastReportNo && lastReportNo.report_no) {
                                const split = lastReportNo.report_no.split('/');
                                ReportNo = parseInt(split[split.length - 1]) + 1;
                            }

                            const gen_report_no = TitleFormat.IRNREPORTNO.replace('/PROJECT/', `/${project}/`) + ReportNo;
                            const id = await FinalCoatModel.findById(result?._id);
                            const inspect = await inspect_summaryModel.findOne({ drawing_id: id.drawing_id, deleted: false });
                            const surfacePrimer = await surfaceModel.findOne({ drawing_id: id.drawing_id, deleted: false });
                            const mioPaint = await mioModel.findOne({ drawing_id: id.drawing_id, deleted: false });

                            const newReleaseObject = new inspection_releaseModel({
                                report_no: gen_report_no,
                                release_date: Date.now(),
                                drawing_id: id?.drawing_id,
                                inspection_summary_id: inspect?._id.toString(),
                                surafce_primer_report_id: surfacePrimer?._id.toString(),
                                mio_paint_report_id: mioPaint?._id.toString(),
                                final_coat_paint_report_id: id?._id.toString(),
                                prepared_by: qc_name,
                                remarks: 'OFFER INSPECTION COMPLETED.'
                            });

                            await newReleaseObject.save();
                        }
                        sendResponse(res, 200, true, {}, "Qc details submitted successfully");
                    }
                })

            } catch (error) {
                sendResponse(res, 500, false, {}, "Something went wrong" + error.message);
            }
        } else {
            sendResponse(res, 400, false, {}, "Missing parameter");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.downloadFinalPaint = async (req, res) => {
    const { voucher_no, voucher_no_two, print_date } = req.body;
    if (req.user && !req.error) {
        try {
            let matchObj = { deleted: false }
            if (voucher_no) {
                matchObj = { ...matchObj, voucher_no: voucher_no }
            }
            if (voucher_no_two) {
                matchObj = { ...matchObj, voucher_no_two: voucher_no_two }
            }
            let requestData = await FinalCoatModel.aggregate([
                { $match: matchObj },
                {
                    $lookup: {
                        from: "users",
                        localField: "offered_by",
                        foreignField: "_id",
                        as: "offerDetails",
                        pipeline: [
                            { $project: { _id: 0, user_name: "$user_name" } },
                        ],
                    },
                },
                {
                    $lookup: {
                        from: "procedure_and_specifications",
                        localField: "procedure_no",
                        foreignField: "_id",
                        as: "procedureDetails",
                        pipeline: [
                            { $project: { _id: 0, voucher_no: "$voucher_no" } },
                        ],
                    },
                },
                {
                    $lookup: {
                        from: "store_transaction_items",
                        localField: "drawing_id",
                        foreignField: "drawingId",
                        as: "transItemDetails",
                    },
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "qc_name",
                        foreignField: "_id",
                        as: "qcDetails",
                        pipeline: [
                            { $project: { _id: 0, user_name: "$user_name" } },
                        ],
                    },
                },
                {
                    $lookup: {
                        from: "erp-planner-drawings",
                        localField: "drawing_id",
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
                {
                    $lookup: {
                        from: "erp-painting-dispatch-notes",
                        localField: "dispatch_note",
                        foreignField: "_id",
                        as: "dispatchDetails",
                        pipeline: [
                            {
                                $lookup: {
                                    from: "painting-systems",
                                    localField: "paint_system",
                                    foreignField: "_id",
                                    as: "paintSysDetails",
                                    pipeline: [
                                        {
                                            $lookup: {
                                                from: "paint-manufactures",
                                                localField: "paint_manufacturer",
                                                foreignField: "_id",
                                                as: "paintManDetails",
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
                        drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
                        dispatchDetails: { $arrayElemAt: ["$dispatchDetails", 0] },
                    },
                },
                {
                    $addFields: {
                        paintSysDetails: {
                            $arrayElemAt: [
                                "$dispatchDetails.paintSysDetails",
                                0,
                            ],
                        },
                        projectDetails: {
                            $arrayElemAt: [
                                "$drawingDetails.projectDetails",
                                0,
                            ],
                        },
                    },
                },
                {
                    $addFields: {
                        paintManDetails: {
                            $arrayElemAt: [
                                "$paintSysDetails.paintManDetails",
                                0,
                            ],
                        },
                        partyDetails: {
                            $arrayElemAt: [
                                "$projectDetails.partyDetails",
                                0,
                            ],
                        },
                        grid_no: { $arrayElemAt: ["$transItemDetails.grid_no", 0] },
                    },
                },
                {
                    $project: {
                        _id: 1,
                        client: "$partyDetails.name",
                        project_name: "$projectDetails.name",
                        report_no: voucher_no ? "$voucher_no" : "$voucher_no_two",
                        wo_no: "$projectDetails.work_order_no",
                        procedure_no: { $arrayElemAt: ["$procedureDetails.voucher_no", 0] },
                        date: voucher_no ? "$offer_date" : "$qc_time",
                        weather_condition: "$weather_condition",
                        final_paint: "$paintSysDetails.final_paint",
                        final_paint_app_method: "$paintSysDetails.final_paint_app_method",
                        final_date: "$final_date",
                        paint_manufacturer: "$paintManDetails.name",
                        final_paint_dft_range: "$paintSysDetails.final_paint_dft_range",
                        time: "$time",
                        paint_batch_base: "$paint_batch_base",
                        manufacture_date: "$manufacture_date",
                        shelf_life: "$shelf_life",
                        paint_batch_hardner: "$paint_batch_hardner",
                        drawing_no: "$drawingDetails.drawing_no",
                        assembly_no: "$drawingDetails.assembly_no",
                        grid_no: "$grid_no",
                        qty: "$drawingDetails.assembly_quantity",
                        remarks: "$remarks",
                        offer_name: { $arrayElemAt: ["$offerDetails.user_name", 0] },
                        notes: "$notes",
                        ...(voucher_no_two && {
                            average_dft_final_coat: "$average_dft_final_coat",
                            qc_name: { $arrayElemAt: ["$qcDetails.user_name", 0] },
                            accept: {
                                $cond: [
                                    { $eq: ["$status", 1] },
                                    "PEN",
                                    {
                                        $cond: [
                                            { $eq: ["$status", 2] },
                                            "ACC",
                                            {
                                                $cond: [{ $eq: ["$status", 3] }, "REJ", "--"]
                                            }
                                        ]
                                    }
                                ]
                            }
                        }),
                    },
                },
            ]);

            // sendResponse(res, 200, true, requestData, "PDF downloaded Successfully");

            if (requestData && requestData.length > 0) {
                requestData = requestData[0];

                const template = fs.readFileSync(
                    "templates/final_coat.html",
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
                    width: "14in",
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

                let lastmio = ""

                if (requestData) {
                    const split = requestData.report_no.split("/");
                    lastmio = split[split.length - 2];
                }

                let x = ""
                if (lastmio === "OFFER") {
                    x = "offer"
                } else {
                    x = "inspection"
                }

                const filename = `mio_paint_${x}_${Date.now()}.pdf`;
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
            } else {
                sendResponse(res, 200, false, {}, "PDF data not found");
            }
        } catch (error) {
            console.log("error", error);
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

