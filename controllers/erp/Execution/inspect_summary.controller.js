
const FdOfferModel = require('../../../models/erp/Execution/fd_inspection_offer.model');
const { TitleFormat } = require('../../../utils/enum');
const { sendResponse } = require('../../../helper/response');
const transaction_itemModel = require('../../../models/store/transaction_item.model');
const fitup_inspectionModel = require('../../../models/erp/Execution/fitup_inspection.model');
const weld_inspection_offerModel = require('../../../models/erp/Execution/weld_inspection_offer.model');
const ut_test_inspectionModel = require('../../../models/erp/Testing/ut_test_inspection.model');
const rt_test_inspectionModel = require('../../../models/erp/Testing/rt_test_inspection.model');
const lpt_test_inspectionModel = require('../../../models/erp/Testing/lpt_test_inspection.model');
const mpt_test_inspectionModel = require('../../../models/erp/Testing/mpt_test_inspection.model');
const drawModel = require('../../../models/erp/planner/draw.model');
const inspect_summaryModel = require('../../../models/erp/Execution/inspect_summary.model');
const { ObjectId } = require('mongodb');
const ejs = require("ejs");
const fs = require("fs");
const puppeteer = require("puppeteer");
const path = require("path");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;

exports.manageInspectSummary = async (drawing_id, project, remarks) => {
    try {
        const lastSummaryNo = await inspect_summaryModel.findOne({ deleted: false, test_inspect_no: { $regex: `/${project}/` }, report_no: { $regex: `/${project}/` } }, { deleted: 0 }, { sort: { createdAt: -1 } });
        let SummaryNo = "1";
        if (lastSummaryNo && lastSummaryNo.report_no) {
            const split = lastSummaryNo.report_no.split('/');
            SummaryNo = parseInt(split[split.length - 1]) + 1;
        }
        const gen_report_no = TitleFormat.INSPECTSUMMARY.replace('/PROJECT/', `/${project}/`) + SummaryNo;

        const result = await transaction_itemModel.find({ drawingId: (drawing_id), deleted: false });
        const resultIds = result.map(item => item._id);

        const FitupReport = await fitup_inspectionModel.find({ 'items.transaction_id': { $in: resultIds } });
        const WeldVisualReport = await weld_inspection_offerModel.find({ 'items.transaction_id': { $in: resultIds } });
        const UtReport = await ut_test_inspectionModel.find({ 'items.transaction_id': { $in: resultIds } });
        const RtReport = await rt_test_inspectionModel.find({ 'items.transaction_id': { $in: resultIds } });
        const LptReport = await lpt_test_inspectionModel.find({ 'items.transaction_id': { $in: resultIds } });
        const MptReport = await mpt_test_inspectionModel.find({ 'items.transaction_id': { $in: resultIds } });
        const FdReport = await FdOfferModel.find({ 'drawing_id': drawing_id, deleted: false });

        const matchingIds1 = FitupReport.map(record => record.report_no_two);
        const matchingIds2 = WeldVisualReport.map(record => record.weld_report_qc_no);
        const matchingIds3 = UtReport.map(record => record.test_inspect_no);
        const matchingIds4 = RtReport.map(record => record.test_inspect_no);
        const matchingIds5 = LptReport.map(record => record.test_inspect_no);
        const matchingIds6 = MptReport.map(record => record.test_inspect_no);
        const matchingIds7 = FdReport.map(record => record.qc_report_no);

        const draw = await drawModel.findOne({ _id: drawing_id }, { assembly_no: 1, rev: 1, sheet_no: 1, project: 1 })
            .populate({
                path: 'project',
                select: 'name party',
                populate: { path: 'party', select: 'name' }
            });

        const obj = {};
        obj.drawing = draw;
        obj.fitup = [...new Set(matchingIds1)];
        obj.weld_visual = [...new Set(matchingIds2)];
        obj.ut = [...new Set(matchingIds3)];
        obj.rt = [...new Set(matchingIds4)];
        obj.lpt = [...new Set(matchingIds5)];
        obj.mpt = [...new Set(matchingIds6)];
        obj.fd = [...new Set(matchingIds7)];

        const newSummaryObj = new inspect_summaryModel({
            report_no: gen_report_no,
            summary_date: Date.now(),
            drawing_id: drawing_id,
            fitup_inspection_report: obj.fitup[0],
            weld_inspection_report: obj.weld_visual[0],
            ut_report: obj.ut[0],
            rt_report: obj.rt[0],
            lpt_report: obj.lpt[0],
            mpt_report: obj.mpt[0],
            fd_report: obj.fd[0],
            remarks: remarks,
        });

        await newSummaryObj.save();
    } catch (error) {
        console.log(error);
        throw new Error('Something went wrong while managing inspection summary');
    }
};


exports.getInspectSummary = async (req, res) => {
    if (req.user && !req.error) {
        const result = await inspect_summaryModel.find({ deleted: false })
            .populate({
                path: 'drawing_id',
                select: 'drawing_no assembly_no rev sheet_no project',
                populate: { path: 'project', select: 'name party work_order_no', populate: { path: 'party', select: 'name' } }
            });
        if (result) {
            sendResponse(res, 200, true, result, "Inspection Summary list");
        } else {
            sendResponse(res, 400, false, {}, "Inspection Summary not found");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.downloadOneInspectionSummary = async (req, res) => {
    const { report_no, print_date } = req.body;
    if (req.user && !req.error) {
        try {
            const requestData = await inspect_summaryModel.aggregate([
                { $match: { deleted: false, report_no: report_no } },
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
                            {
                                $lookup: {
                                    from: 'store_transaction_item',
                                    localField: 'items',
                                    foreignField: '_id',
                                    as: 'gridDetails',
                                },
                            }
                        ],
                    },
                },
                {
                    $addFields: {
                        drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
                        gridDetails: { $arrayElemAt: ['$gridDetails', 0] },
                    },
                },
                {
                    $addFields: {
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
                        partyDetails: {
                            $arrayElemAt: [
                                "$projectDetails.partyDetails",
                                0,
                            ],
                        },
                    },
                },
                {
                    $lookup: {
                        from: "store_transaction_items",
                        localField: "drawing_id",
                        foreignField: "drawingId",
                        as: "transactionItems"
                    }
                },
                {
                    $addFields: {
                        grid_numbers: {
                            $map: {
                                input: "$transactionItems",
                                as: "item",
                                in: "$$item.grid_no"
                            }
                        }
                    }
                },
                {
                    $addFields: {
                        grid_numbers: { $setUnion: ["$grid_numbers"] }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        report_no: "$report_no",
                        client: "$partyDetails.name",
                        project_name:
                            "$projectDetails.name",
                        wo_no:
                            "$projectDetails.work_order_no",
                        project_po_no:
                            "$projectDetails.work_order_no",
                        date: "$summary_date",
                        drawing_no: "$drawingDetails.drawing_no",
                        rev: "$drawingDetails.rev",
                        assembly_no: "$drawingDetails.assembly_no",
                        grid_no: "$grid_numbers",
                        fitup_inspection_report: "$fitup_inspection_report",
                        weld_inspection_report: "$weld_inspection_report",
                        ut_report: "$ut_report",
                        rt_report: "$rt_report",
                        mpt_report: "$mpt_report",
                        lpt_report: "$lpt_report",
                        fd_report: "$fd_report",
                        remarks: "$remarks",
                    },
                },
            ]);

            if (requestData && requestData.length > 0) {
                const template = fs.readFileSync(
                    "templates/inspectionSummary.html",
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
                const pageHeight = await page.evaluate(() => {
                    return document.body.scrollHeight;
                });

                const pdfBuffer = await page.pdf({
                    // width: "13in",
                    height: pageHeight,
                    landscape: true,
                    format: 'A4',
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

                const filename = `inspection_summary_${Date.now()}.pdf`;
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
