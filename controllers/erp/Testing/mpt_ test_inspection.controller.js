const MptInspectionReport = require('../../../models/erp/Testing/mpt_test_inspection.model');
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

exports.manageMptInspectionReport = async (req, res) => {
    const { id, ndt_offer_no, items, qc_name, test_date,
        acceptance_standard, surface_condition, extent_examination, examination_stage,
        examinapost_cleaning, magnetization, technique, light_equipment, medium,
        lighting_intensity, yoke_spacing, particle, yoke_sr_no, yoke_make_model,
        particle_batch_no, contrast, contrast_batch_no, qc_time, project, qc_status,
        final_remarks, return_stage, drawing_id
    } = req.body;
    if (req.user && !req.error) {
        if (ndt_offer_no && items && qc_name && project) {
            const newItems = JSON.parse(items) || [];
            let MptTestoffer = await TestOffer.findByIdAndUpdate(ndt_offer_no);

            try {
                if (!id) {
                    const lastMptTest = await MptInspectionReport.findOne({ deleted: false, test_inspect_no: { $regex: `/${project}/` } }, { deleted: 0 }, { sort: { createdAt: -1 } });
                    let mptTestNo = "1";
                    if (lastMptTest && lastMptTest.test_inspect_no) {
                        const split = lastMptTest.test_inspect_no.split('/');
                        const lastMptTestNo = parseInt(split[split.length - 1]);
                        mptTestNo = lastMptTestNo + 1;
                    }
                    const gen_mptTest_no = TitleFormat.MPTINSPECTNO.replace('/PROJECT/', `/${project}/`) + mptTestNo;

                    const MptInspectionReportObj = new MptInspectionReport({
                        test_inspect_no: gen_mptTest_no,
                        ndt_offer_no,
                        items: newItems,
                        qc_name,
                        test_date,
                        acceptance_standard,
                        surface_condition,
                        extent_examination,
                        examination_stage,
                        examinapost_cleaning,
                        magnetization,
                        technique,
                        light_equipment,
                        medium,
                        lighting_intensity,
                        yoke_spacing,
                        particle,
                        yoke_sr_no,
                        yoke_make_model,
                        particle_batch_no,
                        contrast,
                        contrast_batch_no,
                        qc_time: Date.now(),
                        project,
                        qc_status,
                        final_remarks,
                        return_stage, drawing_id
                    });

                    await MptInspectionReportObj.save().then(result => {
                        if (result) {
                            if (qc_status === "true") {
                                newItems.forEach(item => {
                                    item.item_status = 2;
                                });
                                if (MptTestoffer) {
                                    MptTestoffer.status = 2; // Completed
                                    MptTestoffer.save();
                                }
                            } else if (qc_status === "false") {
                                newItems.forEach(item => {
                                    item.item_status = 3;
                                });
                                if (MptTestoffer) {
                                    MptTestoffer.status = 3; // rejected by QC
                                    MptTestoffer.save();
                                }
                            }
                            updateNdtStatus(ndt_offer_no);
                            sendResponse(res, 200, true, {}, 'Mpt inspection report added successfully');
                        }
                    }).catch(err => {
                        console.log(err);
                        sendResponse(res, 500, false, {}, 'Something went wrong');
                    });
                } else {
                    const MptInspectionReportObj = await MptInspectionReport.findByIdAndUpdate(id, {
                        ndt_offer_no,
                        items: newItems,
                        qc_name,
                        test_date,
                        acceptance_standard,
                        surface_condition,
                        extent_examination,
                        examination_stage,
                        examinapost_cleaning,
                        magnetization,
                        technique,
                        light_equipment,
                        medium,
                        lighting_intensity,
                        yoke_spacing,
                        particle,
                        yoke_sr_no,
                        yoke_make_model,
                        particle_batch_no,
                        contrast,
                        contrast_batch_no,
                        qc_time: Date.now(),
                        project,
                        qc_status,
                        final_remarks,
                        return_stage,
                        drawing_id
                    });

                    if (MptInspectionReportObj) {
                        if (qc_status === "true") {
                            newItems.forEach(item => {
                                item.item_status = 2;
                            });
                            if (MptTestoffer) {
                                MptTestoffer.status = 2; // Completed
                                MptTestoffer.save();
                            }
                        } else if (qc_status === "false") {
                            newItems.forEach(item => {
                                item.item_status = 3;
                            });
                            if (MptTestoffer) {
                                MptTestoffer.status = 3; // rejected by QC
                                MptTestoffer.save();
                            }
                        }
                        updateNdtStatus(ndt_offer_no);
                        sendResponse(res, 200, true, {}, 'Mpt inspection report updated successfully');
                    } else {
                        sendResponse(res, 404, false, {}, 'Mpt inspection report not found');
                    }
                }

            } catch (error) {
                sendResponse(res, 500, false, {}, 'Something went wrong');
            }
        } else {
            sendResponse(res, 400, false, {}, 'Missing parameter');
        }
    } else {
        sendResponse(res, 401, false, {}, 'Unauthorized');
    }
}

exports.getMptInspectionReport = async (req, res) => {
    if (req.user && !req.error) {
        try {
            const result = await MptInspectionReport.find({ deleted: false }, { deleted: 0, __v: 0 })
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
                sendResponse(res, 200, true, result, "MPT inspection report list")
            } else {
                sendResponse(res, 404, false, {}, "MPT inspection report not found")
            }
        } catch (error) {
            console.log(error)
            sendResponse(res, 500, false, {}, 'Something went wrong');
        }

    } else {
        sendResponse(res, 401, false, {}, 'Unauthorized');
    }
}

exports.downloadMPTOfferReport = async (req, res) => {
    const { test_inspect_no, print_date } = req.body;
    if (req.user && !req.error) {
        try {
            const requestData = await MptInspectionReport.aggregate([
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
                        acceptance_standard: "$acceptance_standard",
                        surface_condition: "$surface_condition",
                        extent_examination: "$extent_examination",
                        examination_stage: "$examination_stage",
                        post_cleaning: "$post_cleaning",
                        technique: "$technique",
                        magnetization: "$magnetization",
                        light_equipment: "$light_equipment",
                        medium: "$medium",
                        lighting_intensity: "$lighting_intensity",
                        yoke_spacing: "$yoke_spacing",
                        particle: "$particle",
                        yoke_sr_no: "$yoke_sr_no",
                        yoke_make_model: "$yoke_make_model",
                        particle_batch_no: "$particle_batch_no",
                        contrast: "$contrast",
                        contrast_batch_no: "$contrast_batch_no",
                        qc_name: "$qc_name",
                        qc_time: "$qc_time",
                        items: {
                            _id: "$items._id",
                            drawing_no: "$drawingDetails.drawing_no",
                            assembly_no: "$drawingDetails.assembly_no",
                            grid_no: "$transactionDetails.grid_no",
                            profile: "$itemProfile.name",
                            joint_type: "$joint_type",
                            weld_process: "$weld_process",
                            welder_no: "$welder_no",
                            thickness: "$items.thickness",
                            observation: "$items.observation",
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
                            client: "$client",
                            report_no: "$report_no",
                            project_name: "$project_name",
                            report_date: "$report_date",
                            wo_no: "$wo_no",
                            test_date: "$test_date",
                            acceptance_standard: "$acceptance_standard",
                            surface_condition: "$surface_condition",
                            extent_examination: "$extent_examination",
                            examination_stage: "$examination_stage",
                            post_cleaning: "$post_cleaning",
                            technique: "$technique",
                            magnetization: "$magnetization",
                            light_equipment: "$light_equipment",
                            medium: "$medium",
                            lighting_intensity: "$lighting_intensity",
                            yoke_spacing: "$yoke_spacing",
                            particle: "$particle",
                            yoke_sr_no: "$yoke_sr_no",
                            yoke_make_model: "$yoke_make_model",
                            particle_batch_no: "$particle_batch_no",
                            contrast: "$contrast",
                            contrast_batch_no: "$contrast_batch_no",
                            qc_name: "$qc_name",
                            qc_time: "$qc_time",
                        },
                        items: { $push: "$items" },
                    },
                },
                {
                    $project: {
                        _id: "$_id._id",
                        client: "$_id.client",
                        report_no: "$_id.report_no",
                        project_name: "$_id.project_name",
                        report_date: "$_id.report_date",
                        wo_no: "$_id.wo_no",
                        test_date: "$_id.test_date",
                        acceptance_standard: "$_id.acceptance_standard",
                        surface_condition: "$_id.surface_condition",
                        extent_examination: "$_id.extent_examination",
                        examination_stage: "$_id.examination_stage",
                        post_cleaning: "$_id.post_cleaning",
                        technique: "$_id.technique",
                        magnetization: "$_id.magnetization",
                        light_equipment: "$_id.light_equipment",
                        medium: "$_id.medium",
                        lighting_intensity: "$_id.lighting_intensity",
                        yoke_spacing: "$_id.yoke_spacing",
                        particle: "$_id.particle",
                        yoke_sr_no: "$_id.yoke_sr_no",
                        yoke_make_model: "$_id.yoke_make_model",
                        particle_batch_no: "$_id.particle_batch_no",
                        contrast: "$_id.contrast",
                        contrast_batch_no: "$_id.contrast_batch_no",
                        qc_name: "$_id.qc_name",
                        qc_time: "$_id.qc_time",
                        items: 1,
                    },
                },
            ]);

            // sendResponse(res, 200, true, requestData, "PDF downloaded Successfully");

            if (requestData && requestData.length > 0) {
                const template = fs.readFileSync(
                    "templates/MPTtestReport.html",
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

                const filename = `mpt_inspection_report_${Date.now()}.pdf`;
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