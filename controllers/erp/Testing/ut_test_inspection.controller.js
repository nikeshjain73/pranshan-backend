const utInspectionReport = require('../../../models/erp/Testing/ut_test_inspection.model');
const TestOffer = require('../../../models/erp/Testing/test_offer_model');
const { TitleFormat } = require('../../../utils/enum');
const { sendResponse } = require('../../../helper/response');
const { updateNdtStatus } = require('../../../helper/index');
const ejs = require("ejs");
const fs = require("fs");
const puppeteer = require("puppeteer");
const path = require("path");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;

exports.manageUTInspectionReport = async (req, res) => {
    const { id, ndt_offer_no, items, qc_name, test_date, procedure_no,
        accept_standard, surface_condition, extent_examination, examination_stage,
        examination_surface, technique, basic_cal_block, equip_model,
        ref_block_id, equip_no, scanning_senstive_level, couplant, ref_sensitivity_level,
        search_unit_no, test_range, model, ref_db, wave_mode, trans_corr, frequency,
        refer_angle, project, qc_status, final_remarks, return_stage, drawing_id
    } = req.body;
    if (req.user && !req.error) {
        if (ndt_offer_no && items && qc_name && procedure_no && project) {
            const newItems = JSON.parse(items) || [];
            let UtTestoffer = await TestOffer.findByIdAndUpdate(ndt_offer_no);

            try {
                if (!id) {
                    const lastUtTest = await utInspectionReport.findOne({ deleted: false, test_inspect_no: { $regex: `/${project}/` } }, { deleted: 0 }, { sort: { createdAt: -1 } });
                    let utTestNo = "1";
                    if (lastUtTest && lastUtTest.test_inspect_no) {
                        const split = lastUtTest.test_inspect_no.split('/');
                        const lastUtTestNo = parseInt(split[split.length - 1]);
                        utTestNo = lastUtTestNo + 1;
                    }
                    const gen_utTest_no = TitleFormat.UTINSPECTNO.replace('/PROJECT/', `/${project}/`) + utTestNo;

                    const utInspectionReportObj = new utInspectionReport({
                        test_inspect_no: gen_utTest_no,
                        ndt_offer_no,
                        items: newItems,
                        qc_name,
                        test_date,
                        procedure_no,
                        accept_standard,
                        surface_condition,
                        extent_examination,
                        examination_stage,
                        examination_surface,
                        technique,
                        basic_cal_block,
                        equip_model,
                        ref_block_id,
                        equip_no,
                        scanning_senstive_level,
                        couplant,
                        ref_sensitivity_level,
                        search_unit_no,
                        test_range,
                        model,
                        ref_db,
                        wave_mode,
                        trans_corr,
                        frequency,
                        refer_angle,
                        qc_time: Date.now(),
                        project,
                        qc_status,
                        final_remarks,
                        return_stage,
                        drawing_id,
                    });

                    await utInspectionReportObj.save().then(result => {
                        if (result) {
                            if (qc_status === "true") {
                                newItems.forEach(item => {
                                    item.item_status = 2;
                                });
                                if (UtTestoffer) {
                                    UtTestoffer.status = 2; // Completed
                                    UtTestoffer.save();
                                }
                            } else if (qc_status === "false") {
                                newItems.forEach(item => {
                                    item.item_status = 3;
                                });
                                if (UtTestoffer) {
                                    UtTestoffer.status = 3; // rejected by QC
                                    UtTestoffer.save();
                                }
                            }
                            updateNdtStatus(ndt_offer_no);
                            sendResponse(res, 200, true, {}, "UT inspection report added successfully");
                        }
                    }).catch(err => {
                        console.log(err);
                        sendResponse(res, 500, false, {}, "Something went wrong")
                    });

                } else {
                    await utInspectionReport.findByIdAndUpdate(id, {
                        ndt_offer_no,
                        items: newItems,
                        qc_name,
                        test_date,
                        procedure_no,
                        accept_standard,
                        surface_condition,
                        extent_examination,
                        examination_stage,
                        examination_surface,
                        technique,
                        basic_cal_block,
                        equip_model,
                        ref_block_id,
                        equip_no,
                        scanning_senstive_level,
                        couplant,
                        ref_sensitivity_level,
                        search_unit_no,
                        test_range,
                        model,
                        ref_db,
                        wave_mode,
                        trans_corr,
                        frequency,
                        refer_angle,
                        qc_time: Date.now(),
                        project,
                        final_remarks,
                        return_stage,
                        drawing_id,
                    }, { new: true }).then(result => {
                        if (result) {
                            if (qc_status === "true") {
                                newItems.forEach(item => {
                                    item.item_status = 2;
                                });
                                if (UtTestoffer) {
                                    UtTestoffer.status = 2; // Completed
                                    UtTestoffer.save();
                                }
                            } else if (qc_status === "false") {
                                newItems.forEach(item => {
                                    item.item_status = 3;
                                });
                                if (UtTestoffer) {
                                    UtTestoffer.status = 3; // rejected by QC
                                    UtTestoffer.save();
                                }
                            }
                            updateNdtStatus(ndt_offer_no);
                            sendResponse(res, 200, true, {}, "UT inspection report updated successfully");
                        }
                    }).catch(err => {
                        console.log(err);
                        sendResponse(res, 500, false, {}, "Something went wrong while updating")
                    })
                }
            } catch (error) {
                sendResponse(res, 500, false, {}, "Something went wrong" + error);
            }
        } else {
            sendResponse(res, 400, false, 'Missing parameter');
            return;
        }
    } else {
        sendResponse(res, 401, false, {}, 'Unauthorized');
        return;
    }
}

exports.getUTInspectionReport = async (req, res) => {
    if (req.user && !req.error) {
        try {
            const result = await utInspectionReport.find({ deleted: false }, { deleted: 0, __v: 0 })
                .populate('qc_name', 'user_name')
                .populate(
                    {
                        path: 'items.weldor_no',
                        select: 'wpsNo welderNo',
                        populate: { path: 'wpsNo', select: 'jointType weldingProcess', populate: { path: 'jointType', select: 'name' } }

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
                .populate('procedure_no', 'client_doc_no vendor_doc_no ducument_no issue_no procedure_no')
                .populate(
                    {
                        path: 'ndt_offer_no',
                        select: 'ndt_master_id ndt_type_id report_date',
                        populate: [
                            { path: 'ndt_master_id', select: 'ndt_master_no' },
                            { path: 'ndt_type_id', select: 'name' }
                        ]
                    }
                );
            if (result) {
                sendResponse(res, 200, true, result, "UT inspection report list")
            } else {
                sendResponse(res, 404, false, {}, "UT inspection report not found")
            }

        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.downloadUTOfferReport = async (req, res) => {
    const { test_inspect_no, print_date } = req.body;
    if (req.user && !req.error) {
        try {
            const requestData = await utInspectionReport.aggregate([
                { $match: { deleted: false, test_inspect_no: test_inspect_no } },
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
                        from: "procedure_and_specifications",
                        localField: "procedure_no",
                        foreignField: "_id",
                        as: "procedureDetails",
                    },
                },
                {
                    $addFields: {
                        procedure: { $arrayElemAt: ["$procedureDetails.vendor_doc_no", 0] },
                    },
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "qc_name",
                        foreignField: "_id",
                        as: "qcDetails",
                    },
                },
                {
                    $addFields: {
                        qc_name: { $arrayElemAt: ["$qcDetails.user_name", 0] },
                    },
                },
                {
                    $project: {
                        _id: 1,
                        client: "$partyDetails.name",
                        report_no: "$test_inspect_no",
                        project_name: "$projectDetails.name",
                        report_date: "$createdAt",
                        wo_no: "$projectDetails.work_order_no",
                        test_date: "$test_date",
                        procedure_no: "$procedure",
                        accept_standard: "$accept_standard",
                        surface_condition: "$surface_condition",
                        extent_examination: "$extent_examination",
                        examination_stage: "$examination_stage",
                        examination_surface: "$examination_surface",
                        technique: "$technique",
                        equip_model: "$equip_model",
                        basic_cal_block: "$basic_cal_block",
                        ref_block_id: "$ref_block_id",
                        equip_no: "$equip_no",
                        scanning_senstive_level: "$scanning_senstive_level",
                        couplant: "$couplant",
                        ref_sensitivity_level: "$ref_sensitivity_level",
                        search_unit_no: "$search_unit_no",
                        test_range: "$test_range",
                        model: "$model",
                        ref_db: "$ref_db",
                        wave_mode: "$wave_mode",
                        trans_corr: "$trans_corr",
                        frequency: "$frequency",
                        refer_angle: "$refer_angle",
                        final_remarks: "$final_remarks",
                        qc_name: "$qc_name",
                        qc_time: "$qc_time",
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
                            disc_type: "$items.disc_type",
                            accept: {
                                $cond: [
                                    { $eq: ["$qc_status", true] },
                                    "ACC",
                                    {
                                        $cond: [
                                            { $eq: ["$qc_status", false] },
                                            "REJ", "--"
                                        ]
                                    }
                                ]
                            },
                            remarks: "$items.remarks",
                        },
                    },
                },
                {
                    $group: {
                        _id: {
                            _id: "$_id",
                            report_no: "$report_no",
                            project_name: "$project_name",
                            wo_no: "$wo_no",
                            client: "$client",
                            report_date: "$report_date",
                            test_date: "$test_date",
                            procedure_no: "$procedure_no",
                            accept_standard: "$accept_standard",
                            surface_condition: "$surface_condition",
                            extent_examination: "$extent_examination",
                            examination_stage: "$examination_stage",
                            examination_surface: "$examination_surface",
                            technique: "$technique",
                            equip_model: "$equip_model",
                            basic_cal_block: "$basic_cal_block",
                            ref_block_id: "$ref_block_id",
                            equip_no: "$equip_no",
                            scanning_senstive_level: "$scanning_senstive_level",
                            couplant: "$couplant",
                            ref_sensitivity_level: "$ref_sensitivity_level",
                            search_unit_no: "$search_unit_no",
                            test_range: "$test_range",
                            model: "$model",
                            ref_db: "$ref_db",
                            wave_mode: "$wave_mode",
                            trans_corr: "$trans_corr",
                            frequency: "$frequency",
                            refer_angle: "$refer_angle",
                            final_remarks: "$final_remarks",
                            qc_name: "$qc_name",
                            qc_time: "$qc_time",
                        },
                        items: { $push: "$items" },
                    },
                },
                {
                    $project: {
                        _id: "$_id._id",
                        report_no: "$_id.report_no",
                        project_name: "$_id.project_name",
                        wo_no: "$_id.wo_no",
                        client: "$_id.client",
                        report_date: "$_id.report_date",
                        test_date: "$_id.test_date",
                        procedure_no: "$_id.procedure_no",
                        accept_standard: "$_id.accept_standard",
                        surface_condition: "$_id.surface_condition",
                        extent_examination: "$_id.extent_examination",
                        examination_stage: "$_id.examination_stage",
                        examination_surface: "$_id.examination_surface",
                        technique: "$_id.technique",
                        equip_model: "$_id.equip_model",
                        basic_cal_block: "$_id.basic_cal_block",
                        ref_block_id: "$_id.ref_block_id",
                        equip_no: "$_id.equip_no",
                        scanning_senstive_level: "$_id.scanning_senstive_level",
                        couplant: "$_id.couplant",
                        ref_sensitivity_level: "$_id.ref_sensitivity_level",
                        search_unit_no: "$_id.search_unit_no",
                        test_range: "$_id.test_range",
                        model: "$_id.model",
                        ref_db: "$_id.ref_db",
                        wave_mode: "$_id.wave_mode",
                        trans_corr: "$_id.trans_corr",
                        frequency: "$_id.frequency",
                        refer_angle: "$_id.refer_angle",
                        final_remarks: "$_id.final_remarks",
                        qc_name: "$_id.qc_name",
                        qc_time: "$_id.qc_time",
                        items: 1,
                    },
                },
            ]);

            // sendResponse(res, 200, true, requestData, "PDF downloaded Successfully");

            if (requestData && requestData.length > 0) {
                const template = fs.readFileSync(
                    "templates/UTtestReport.html",
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
                });;

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

                const filename = `ut_inspection_report_${Date.now()}.pdf`;
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