const MptInspectionReport = require('../../../../models/erp/Multi/Testing/multi_mpt_test.model');
const TestOffer = require('../../../../models/erp/Multi/multi_ndt_offer.model');
const MultiNDTMaster = require('../../../../models/erp/Multi/multi_ndt_detail.model');
const { TitleFormat, NDTStatus } = require('../../../../utils/enum');
const { sendResponse } = require('../../../../helper/response');
const { updateMultiNdtStatus, regenerateRejectedNDTOffer } = require('../../../../helper');
const { default: mongoose } = require("mongoose");
const { generatePDFWithoutPrintDate, generatePDFA4WithoutPrintDate } = require('../../../../utils/pdfUtils');
const ObjectId = mongoose.Types.ObjectId;
const ejs = require("ejs");
const fs = require("fs");
const XLSX = require("xlsx"); // for utility functions
const XLSXStyle = require("xlsx-style"); // for styling
const puppeteer = require("puppeteer");
const path = require("path");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;
const User = require("../../../../models/users.model");
const ErpRole = require("../../../../models/erp/erp_role.model");
const Project = require("../../../../models/project.model");
const addEmailJob = require("../../../../utils/emailJob");
const sendEmail = require("../../../../utils/sendEmail");
const commonStageOfferEmail = require("../../../../utils/commonStageOfferEmail");
const commonStageAcceptanceEmail = require("../../../../utils/commonStageAcceptanceEmail");

exports.manageMptInspectionReport = async (req, res) => {
    const { ndt_offer_no, items, qc_name, test_date,
        acceptance_standard, surface_condition, extent_examination, examination_stage,
        post_cleaning, magnetization, technique, light_equipment, medium,
        lighting_intensity, yoke_spacing, particle, yoke_sr_no, yoke_make_model,
        particle_batch_no, contrast, contrast_batch_no, project, pId
    } = req.body;
    if (req.user && !req.error) {
        if (ndt_offer_no && items && qc_name && project) {
            const newItems = JSON.parse(items) || [];
            let MptTestoffer = await TestOffer.findByIdAndUpdate(ndt_offer_no);
            let NdtMaster = await MultiNDTMaster.find({ _id: { $in: MptTestoffer?.ndt_master_ids } });
            try {
                const lastMptTest = await MptInspectionReport.findOne({ deleted: false, test_inspect_no: { $regex: `/${project}/` } }, { deleted: 0 }, { sort: { createdAt: -1 } });
                let mptTestNo = "1";
                if (lastMptTest && lastMptTest.test_inspect_no) {
                    const split = lastMptTest.test_inspect_no.split('/');
                    const lastMptTestNo = parseInt(split[split.length - 1]);
                    mptTestNo = lastMptTestNo + 1;
                }
                const gen_mptTest_no = TitleFormat.MPTINSPECTNO.replace('/PROJECT/', `/${project}/`) + mptTestNo;

                let MptInspectionReportObj = new MptInspectionReport({
                    test_inspect_no: gen_mptTest_no,
                    ndt_offer_no,
                    items: newItems,
                    qc_name,
                    test_date,
                    acceptance_standard,
                    surface_condition,
                    extent_examination,
                    examination_stage,
                    post_cleaning,
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
                });
                let accepted = 0;
                let rejected = 0;
                newItems.forEach(item => {
                    if (item.is_accepted)
                        accepted++;
                    else
                        rejected++;
                });
                MptInspectionReportObj.status = (newItems.length == accepted ? NDTStatus.Completed : (newItems.length == rejected ? NDTStatus.Rejected : NDTStatus.Partially));
                await MptInspectionReportObj.save().then(async (result) => {
                    if (result) {
                        if (MptTestoffer) {
                            MptTestoffer.status = result.status;
                            if (MptTestoffer.status === NDTStatus.Completed) {
                                let new_items_updated = newItems.map(item => ({
                                    "grid_item_id": item.grid_item_id,
                                    "drawing_id": item.drawing_id,
                                    "ndt_master_id": item.ndt_master_id,
                                    //  "offer_balance_qty": item.offer_balance_qty,
                                    "offer_used_grid_qty": item.offer_used_grid_qty,
                                    "joint_type": item.joint_type,
                                    "wps_no": item.wps_no,
                                    "weldor_no": item.weldor_no,
                                    "thickness": item.thickness,
                                    "is_accepted": item.is_accepted,
                                    "is_cover": item.is_cover,
                                    "remarks": item.qc_remarks
                                }));
                                MptTestoffer.items = new_items_updated;
                            }
                            MptTestoffer.save();

                            if (NdtMaster) {
                                if (newItems.length == accepted) {
                                    NdtMaster.forEach(async (ndtmaster) => {
                                        ndtmaster.mpt_status = NDTStatus.Completed;
                                        ndtmaster.save();
                                    });
                                } else {
                                    const rejectedItems = newItems.filter(item => !item.is_accepted);
                                    regenerateRejectedNDTOffer(rejectedItems, 'MPT', qc_name, MptTestoffer, MptInspectionReportObj, pId);
                                }
                            }
                        }
                        updateMultiNdtStatus(ndt_offer_no);

                        /* =========================================================
   MPT INSPECTION EMAIL
========================================================= */

try {

    const qcUser =
        await User.findById(
            qc_name
        );

    const projectDetails =
        await Project.findById(
            pId
        ).select(
            "name work_order_no"
        );

    let users = [];

    /* ---------------- ACCEPTED ---------------- */

    if (
        result.status ===
        NDTStatus.Completed
    ) {

        const roles =
            await ErpRole.find({

                deleted:false,

                name:{
                    $in:[
                        "QC Engineer"
                    ]
                }

            });

        const roleIds =
            roles.map(
                role=>role._id
            );

        users =
            await User.find({

                deleted:false,

                status:true,

                structureRole:{
                    $in:roleIds
                },

                email:{
                    $exists:true,
                    $ne:""
                }

            });

    }

    /* ---------------- REJECTED ---------------- */

    else if (
        result.status ===
        NDTStatus.Rejected
    ) {

        const offerUser =
            await User.findById(
                MptTestoffer?.offered_by
            );

        if(
            offerUser?.email
        ){
            users=[
                offerUser
            ];
        }

    }

    /* ---------------- PARTIAL ---------------- */

    else {

        const roles =
            await ErpRole.find({

                deleted:false,

                name:{
                    $in:[
                        "QC Engineer"
                    ]
                }

            });

        const roleIds =
            roles.map(
                role=>role._id
            );

        const roleUsers =
            await User.find({

                deleted:false,

                status:true,

                structureRole:{
                    $in:roleIds
                },

                email:{
                    $exists:true,
                    $ne:""
                }

            });

        users=[...roleUsers];

        const offerUser =
            await User.findById(
                MptTestoffer?.offered_by
            );

        if(
            offerUser?.email &&
            !users.some(
                u=>
                String(u._id)===
                String(
                    offerUser._id
                )
            )
        ){
            users.push(
                offerUser
            );
        }

    }

    /* ---------------- STATUS ---------------- */

    let qcStatus="-";
    let remarks="";

    if(
        result.status===
        NDTStatus.Completed
    ){

        qcStatus=
            "Accepted";

        remarks=
            `MPT inspection completed by ${qcUser?.user_name || "-"} and accepted successfully.`;

    }

    else if(
        result.status===
        NDTStatus.Rejected
    ){

        qcStatus=
            "Rejected";

        remarks=
            `MPT inspection completed by ${qcUser?.user_name || "-"} and rejected. Please reoffer rejected items.`;

    }

    else{

        qcStatus=
            "Partially Accepted";

        remarks=
            `MPT inspection completed by ${qcUser?.user_name || "-"} and partially accepted.`;

    }

    const acceptanceDateTime =

        result?.qc_time

        ? new Date(
            result.qc_time
        )
        .toLocaleString(
            "en-IN",
            {
                day:"2-digit",
                month:"2-digit",
                year:"numeric",
                hour:"2-digit",
                minute:"2-digit",
                second:"2-digit",
                hour12:true
            }
        )
        .replace("am","AM")
        .replace("pm","PM")

        : "-";

    /* ---------------- SEND EMAIL ---------------- */

    for(
        const user
        of users
    ){

        try{

            const html =
                commonStageAcceptanceEmail({

                userName:
                    user?.user_name || "-",

                module:
                    "Structural",

                stageName:
                    "MPT Inspection",

                reportNo:
                    result?.test_inspect_no || "-",

                projectName:
                    projectDetails?.name || "-",

                workOrderNo:
                    projectDetails?.work_order_no || "-",

                accptedBy:
                    qcUser?.user_name || "-",

                qcStatus,

                accptanceDateTime:
                    acceptanceDateTime,

                remarks,

                loginUrl:
                    process.env.ERP_URL

            });

            addEmailJob({

                to:
                    user.email,

                subject:
                    `MPT Inspection - ${result?.test_inspect_no}`,

                html

            });

            console.log(
                `MPT EMAIL QUEUED -> ${user.email}`
            );

        }
        catch(mailErr){

            console.log(
                `MAIL ERROR ${user.email}`,
                mailErr.message
            );

        }

    }

}
catch(emailErr){

    console.log(
        "MPT EMAIL ERROR:",
        emailErr
    );

}
                        return sendResponse(res, 200, true, {}, 'Mpt inspection report added successfully');
                    }
                }).catch(err => {
                    console.log(err);
                    return sendResponse(res, 500, false, {}, 'Something went wrong');
                });
            } catch (error) {
                return sendResponse(res, 500, false, {}, 'Something went wrong');
            }
        } else {
            return sendResponse(res, 400, false, {}, 'Missing parameter');
        }
    } else {
        return sendResponse(res, 401, false, {}, 'Unauthorized');
    }
}

exports.getMptMultiClearance = async (req, res) => {
    const { project } = req.query;

    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
    try {
        const result = await MptInspectionReport.aggregate([
            { $unwind: "$items" },
            {
                $lookup: {
                    from: 'multi-erp-ndt-offers',
                    localField: 'ndt_offer_no',
                    foreignField: '_id',
                    as: 'ndt_offer_no',
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'qc_name',
                    foreignField: '_id',
                    as: 'qc_name',
                },
            },
            {
                $lookup: {
                    from: 'erp-drawing-grid-items',
                    localField: 'items.grid_item_id',
                    foreignField: '_id',
                    as: 'grid_item',
                    pipeline: [
                        {
                            $lookup: {
                                from: 'store-items',
                                localField: 'item_name',
                                foreignField: '_id',
                                as: 'item_name',
                            },
                        },
                        {
                            $lookup: {
                                from: 'erp-drawing-grids',
                                localField: 'grid_id',
                                foreignField: '_id',
                                as: 'grid_id',
                            },
                        },
                        {
                            $lookup: {
                                from: 'erp-planner-drawings',
                                localField: 'drawing_id',
                                foreignField: '_id',
                                as: 'drawing_id',
                                pipeline: [
                                    {
                                        $lookup: {
                                            from: 'bussiness-projects',
                                            localField: 'project',
                                            foreignField: '_id',
                                            as: 'project',
                                            pipeline: [
                                                {
                                                    $lookup: {
                                                        from: 'store-parties',
                                                        localField: 'party',
                                                        foreignField: '_id',
                                                        as: 'client',
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
                $lookup: {
                    from: 'qualified_welder_lists',
                    localField: 'items.weldor_no',
                    foreignField: '_id',
                    as: 'weldor_no',
                },
            },
            {
                $lookup: {
                    from: 'store-wps-masters',
                    localField: 'items.wps_no',
                    foreignField: '_id',
                    as: 'wps_no',
                },
            },
            {
                $lookup: {
                    from: 'joint-types',
                    localField: 'items.joint_type',
                    foreignField: '_id',
                    as: 'joint_type',
                },
            },
            {
                $addFields: {
                    ndt_offer_no: { $arrayElemAt: ['$ndt_offer_no', 0] },
                    qc_name: { $arrayElemAt: ['$qc_name', 0] },
                    grid_item: { $arrayElemAt: ['$grid_item', 0] },
                    weldor_no: { $arrayElemAt: ['$weldor_no', 0] },
                    wps_no: { $arrayElemAt: ['$wps_no', 0] },
                },
            },
            {
                $addFields: {
                    'grid_item.item_name': { $arrayElemAt: ['$grid_item.item_name', 0] },
                    'grid_item.grid_id': { $arrayElemAt: ['$grid_item.grid_id', 0] },
                    'grid_item.drawing_id': { $arrayElemAt: ['$grid_item.drawing_id', 0] },
                },
            },
            {
                $addFields: {
                    'grid_item.drawing_id.project': { $arrayElemAt: ['$grid_item.drawing_id.project', 0] },
                },
            },
            {
                $addFields: {
                    'grid_item.drawing_id.project.client': {
                        $arrayElemAt: ['$grid_item.drawing_id.project.client', 0],
                    },
                },
            },
            {
                $addFields: {
                    project_id: '$grid_item.drawing_id.project._id',
                },
            },
            {
                $match: {
                    project_id: new ObjectId(project),
                },
            },
            {
                $project: {
                    _id: 1,
                    test_inspect_no: 1,
                    ndt_offer_no: {
                        _id: '$ndt_offer_no._id',
                        ndt_offer_no: '$ndt_offer_no.ndt_offer_no',
                    },
                    test_date: 1,
                    acceptance_standard: 1,
                    surface_condition: 1,
                    extent_examination: 1,
                    examination_stage: 1,
                    post_cleaning: 1,
                    technique: 1,
                    magnetization: 1,
                    light_equipment: 1,
                    medium: 1,
                    lighting_intensity: 1,
                    yoke_spacing: 1,
                    particle: 1,
                    yoke_sr_no: 1,
                    yoke_make_model: 1,
                    particle_batch_no: 1,
                    contrast: 1,
                    contrast_batch_no: 1,
                    qc_name: {
                        _id: '$qc_name._id',
                        name: '$qc_name.user_name',
                    },
                    qc_time: 1,
                    status: 1,
                    createdAt: 1,
                    items: {
                        _id: '$items._id',
                        grid_item_id: {
                            _id: '$grid_item._id',
                            item_name: {
                                _id: '$grid_item.item_name._id',
                                name: '$grid_item.item_name.name',
                            },
                            grid_id: {
                                _id: '$grid_item.grid_id._id',
                                grid_no: '$grid_item.grid_id.grid_no',
                                grid_qty: '$grid_item.grid_id.grid_qty',
                            },
                            drawing_id: {
                                _id: '$grid_item.drawing_id._id',
                                drawing_no: '$grid_item.drawing_id.drawing_no',
                                rev: '$grid_item.drawing_id.rev',
                                assembly_no: '$grid_item.drawing_id.assembly_no',
                                project: {
                                    _id: '$grid_item.drawing_id.project._id',
                                    name: '$grid_item.drawing_id.project.name',
                                    client: {
                                        _id: '$grid_item.drawing_id.project.client._id',
                                        name: '$grid_item.drawing_id.project.client.name',
                                    },
                                },
                            },
                        },
                        weldor_no: {
                            _id: '$weldor_no._id',
                            welderNo: '$weldor_no.welderNo',
                        },
                        wps_no: {
                            _id: '$wps_no._id',
                            wpsNo: '$wps_no.wpsNo',
                            weldingProcess: '$wps_no.weldingProcess',
                        },
                        joint_type: {
                            $map: {
                                input: {
                                    $filter: {
                                        input: '$joint_type',
                                        as: 'jt',
                                        cond: { $in: ['$$jt._id', '$items.joint_type'] },
                                    },
                                },
                                as: 'jt',
                                in: {
                                    _id: '$$jt._id',
                                    name: '$$jt.name',
                                },
                            },
                        },
                        offer_balance_qty: '$tems.offer_balance_qty',
                        offer_used_grid_qty: '$items.offer_used_grid_qty',
                        drawing_id: '$items.drawing_id',
                        thickness: '$items.thickness',
                        observation: '$items.observation',
                        qc_remarks: '$items.qc_remarks',
                        is_cover: '$items.is_cover',
                        is_accepted: '$items.is_accepted',
                    },
                }
            },
            {
                $group: {
                    _id: {
                        _id: "$_id",
                        test_inspect_no: "$test_inspect_no",
                        ndt_offer_no: "$ndt_offer_no",
                        test_date: "$test_date",
                        acceptance_standard: "$acceptance_standard",
                        surface_condition: "$surface_condition",
                        extent_examination: "$extent_examination",
                        examination_stage: "$examination_stage",
                        post_cleaning: "$post_cleaning",
                        technique: "$technique",
                        magnetization: "$magnetization",
                        light_equipment: "$light_equipment",
                        medium: '$medium',
                        lighting_intensity: '$lighting_intensity',
                        yoke_spacing: "$yoke_spacing",
                        particle: "$particle",
                        yoke_sr_no: "$yoke_sr_no",
                        yoke_make_model: "$yoke_make_model",
                        particle_batch_no: "$particle_batch_no",
                        contrast: "$contrast",
                        contrast_batch_no: "$contrast_batch_no",
                        qc_name: "$qc_name",
                        qc_time: "$qc_time",
                        status: "$status",
                        createdAt: '$createdAt',
                    },
                    items: { $push: "$items" },
                },
            },
            {
                $project: {
                    _id: "$_id._id",
                    test_inspect_no: "$_id.test_inspect_no",
                    ndt_offer_no: "$_id.ndt_offer_no",
                    test_date: "$_id.test_date",
                    acceptance_standard: "$_id.acceptance_standard",
                    surface_condition: "$_id.surface_condition",
                    extent_examination: "$_id.extent_examination",
                    examination_stage: "$_id.examination_stage",
                    post_cleaning: "$_id.post_cleaning",
                    technique: "$_id.technique",
                    magnetization: "$_id.magnetization",
                    light_equipment: "$_id.light_equipment",
                    medium: '$_id.medium',
                    lighting_intensity: '$_id.lighting_intensity',
                    yoke_spacing: "$_id.yoke_spacing",
                    particle: "$_id.particle",
                    yoke_sr_no: "$_id.yoke_sr_no",
                    yoke_make_model: "$_id.yoke_make_model",
                    particle_batch_no: "$_id.particle_batch_no",
                    contrast: "$_id.contrast",
                    contrast_batch_no: "$_id.contrast_batch_no",
                    qc_name: "$_id.qc_name",
                    qc_time: "$_id.qc_time",
                    status: "$_id.status",
                    items: 1,
                    createdAt: '$_id.createdAt'
                },
            },
            {
                $sort: { createdAt: -1 }
            },
        ])

        if (!result || result.length === 0) {
            return sendResponse(res, 200, true, [], "No records found");
        }

        return sendResponse(res, 200, true, result, "LPT clearance fetched successfully");

    } catch (error) {
        console.log(error);
        sendResponse(res, 500, false, {}, "Something went wrong");
    }
}

const getMultiMPTInspection = async (test_inspect_no) => {
    try {
        const requestData = await MptInspectionReport.aggregate([
            { $match: { deleted: false, test_inspect_no: test_inspect_no } },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "users",
                    localField: "qc_name",
                    foreignField: "_id",
                    as: "qcDetails",
                },
            },
            {
                $lookup: {
                    from: "qualified_welder_lists",
                    localField: "items.weldor_no",
                    foreignField: "_id",
                    as: "weldorDetails",
                },
            },
            {
                $lookup: {
                    from: "store-wps-masters",
                    localField: "items.wps_no",
                    foreignField: "_id",
                    as: "wpsDetails",
                },
            },
            {
                $lookup: {
                    from: "joint-types",
                    localField: "items.joint_type",
                    foreignField: "_id",
                    as: "jointTypeDetails",
                },
            },
            {
                $lookup: {
                    from: "multi-erp-ndt-offers",
                    localField: "ndt_offer_no",
                    foreignField: "_id",
                    as: "NDTOfferDetails",
                },
            },
            {
                $lookup: {
                    from: "erp-planner-drawings",
                    localField: "items.drawing_id",
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
                                            as: "clientDetails",
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
                    from: "erp-drawing-grid-items",
                    localField: "items.grid_item_id",
                    foreignField: "_id",
                    as: "gridItemDetails",
                    pipeline: [
                        {
                            $lookup: {
                                from: "erp-drawing-grids",
                                localField: "grid_id",
                                foreignField: "_id",
                                as: "gridDetails",
                            },
                        },
                        {
                            $lookup: {
                                from: "store-items",
                                localField: "item_name",
                                foreignField: "_id",
                                as: "itemDetails",
                            },
                        },
                    ],
                },
            },
            {
                $addFields: {
                    qcDetails: { $arrayElemAt: ["$qcDetails", 0] },
                    welder_no: { $arrayElemAt: ["$weldorDetails.welderNo", 0] },
                    drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
                    gridItemDetails: { $arrayElemAt: ["$gridItemDetails", 0] },
                    wps_no: { $arrayElemAt: ["$wpsDetails.wpsNo", 0] },
                    weldingProcess: { $arrayElemAt: ["$wpsDetails.weldingProcess", 0] },
                    NDTOfferDetails: { $arrayElemAt: ["$NDTOfferDetails", 0] },
                    jointTypeNames: {
                        $map: {
                            input: "$jointTypeDetails",
                            as: "joint",
                            in: "$$joint.name",
                        },
                    },
                },
            },
            {
                $addFields: {
                    gridDetails: { $arrayElemAt: ["$gridItemDetails.gridDetails", 0], },
                    itemDetails: { $arrayElemAt: ["$gridItemDetails.itemDetails", 0], },
                    projectDetails: { $arrayElemAt: ["$drawingDetails.projectDetails", 0], },
                },
            },
            {
                $addFields: {
                    clientDetails: { $arrayElemAt: ["$projectDetails.clientDetails", 0], },
                },
            },
            {
                $project: {
                    _id: 1,
                    report_no: "$test_inspect_no",
                    client: "$clientDetails.name",
                    project_name: "$projectDetails.name",
                    wo_no: "$projectDetails.work_order_no",
                    project_po_no: "$projectDetails.work_order_no",
                    offer_date: "$NDTOfferDetails.report_date",
                    offer_no: "$NDTOfferDetails.ndt_offer_no",
                    qc_name: "$qcDetails.user_name",
                    qc_date: "$qc_time",
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
                    status: "$status",
                    items: {
                        _id: "$items._id",
                        drawing_no: "$drawingDetails.drawing_no",
                        rev: "$drawingDetails.rev",
                        sheet_no: "$drawingDetails.sheet_no",
                        assembly_no: "$drawingDetails.assembly_no",
                        grid_no: "$gridDetails.grid_no",
                        used_grid_qty: "$items.offer_used_grid_qty",
                        qty: "$gridItemDetails.item_qty",
                        item_no: "$gridItemDetails.item_no",
                        profile: "$itemDetails.name",
                        joint_type: "$jointTypeNames",
                        weldingProcess: "$weldingProcess",
                        welder_no: "$welder_no",
                        thickness: "$items.thickness",
                        observation: "$items.observation",
                        accept: {
                            $cond: [
                                { $eq: ["$items.is_accepted", true] },
                                "ACC",
                                {
                                    $cond: [
                                        { $eq: ["$items.is_accepted", false] },
                                        "REJ", "--"]
                                }
                            ]
                        },
                        qc_remarks: "$items.qc_remarks",

                    },
                },
            },
            {
                $group: {
                    _id: {
                        _id: "$_id",
                        report_no: "$report_no",
                        client: "$client",
                        project_name: "$project_name",
                        wo_no: "$wo_no",
                        project_po_no: "$project_po_no",
                        offer_date: "$offer_date",
                        offer_no: "$offer_no",
                        qc_name: "$qc_name",
                        qc_date: "$qc_date",
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
                        status: "$status",
                    },
                    items: { $push: "$items" },
                },
            },
            {
                $project: {
                    _id: "$_id._id",
                    report_no: "$_id.report_no",
                    client: "$_id.client",
                    project_name: "$_id.project_name",
                    wo_no: "$_id.wo_no",
                    project_po_no: "$_id.project_po_no",
                    offer_date: "$_id.offer_date",
                    offer_no: "$_id.offer_no",
                    qc_name: "$_id.qc_name",
                    qc_date: "$_id.qc_date",
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
                    status: "$_id.status",
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

exports.oneMultiMPTInspection = async (req, res) => {
    const { test_inspect_no } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getMultiMPTInspection(test_inspect_no)
            let requestData = data.result;

            if (data.status === 1) {
                sendResponse(res, 200, true, requestData, "MPT Inspection data found");
            }
            else if (data.status === 0) {
                sendResponse(res, 200, false, [], `MPT Inspection data not found`)
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

exports.downloadMultiMPTInspection = async (req, res) => {
    const { test_inspect_no, print_date } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getMultiMPTInspection(test_inspect_no)
            let requestData = data.result[0];

            if (data.status === 1) {
                let headerInfo = {
                    report_no: requestData?.report_no,
                    client: requestData?.client,
                    project_name: requestData?.project_name,
                    wo_no: requestData?.wo_no,
                    project_po_no: requestData?.project_po_no,
                    offer_date: requestData?.offer_date,
                    offer_no: requestData?.offer_no,
                    qc_name: requestData?.qc_name,
                    qc_date: requestData?.qc_date,
                    test_date: requestData?.test_date,
                    acceptance_standard: requestData?.acceptance_standard,
                    surface_condition: requestData?.surface_condition,
                    extent_examination: requestData?.extent_examination,
                    examination_stage: requestData?.examination_stage,
                    post_cleaning: requestData?.post_cleaning,
                    technique: requestData?.technique,
                    magnetization: requestData?.magnetization,
                    light_equipment: requestData?.light_equipment,
                    medium: requestData?.medium,
                    lighting_intensity: requestData?.lighting_intensity,
                    yoke_spacing: requestData?.yoke_spacing,
                    particle: requestData?.particle,
                    yoke_sr_no: requestData?.yoke_sr_no,
                    yoke_make_model: requestData?.yoke_make_model,
                    particle_batch_no: requestData?.particle_batch_no,
                    contrast: requestData?.contrast,
                    contrast_batch_no: requestData?.contrast_batch_no,
                    status: requestData?.status,
                }
                const template = fs.readFileSync(
                    "templates/multiMPTInspection.html",
                    "utf-8"
                );

                const renderedHtml = ejs.render(template, {
                    headerInfo,
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

                const pdfBuffer = await generatePDFA4WithoutPrintDate(page, { print_date });

                await browser.close();

                const pdfsDir = path.join(__dirname, "../../../../pdfs");
                if (!fs.existsSync(pdfsDir)) {
                    fs.mkdirSync(pdfsDir);
                }

                const filename = `mpt_inspection_${Date.now()}.pdf`;
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
            }
            else if (data.status === 0) {
                sendResponse(res, 200, false, {}, `MPT inspection data not found`)
            }
            else if (data.status === 2) {
                sendResponse(res, 500, false, {}, "Something went wrong");
            }
        } catch (error) {
            console.log("error", error);
            sendResponse(res, 500, false, {}, "Something went wrong1111");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};