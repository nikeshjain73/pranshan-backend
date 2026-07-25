const NDTOfferTable = require('../../../../models/erp/Multi/offer_table_data/ndt_offer_table.model');
const MultiNDTOfferTable = require('../../../../models/erp/Multi/multi_ndt_offer.model');
const NDTTypewiseOfferTable = require('../../../../models/erp/Multi/offer_table_data/ndt_typewise_offer_table.model');
const drawGridItems = require("../../../../models/erp/planner/draw_grid_items.model");
const NDTMaster = require('../../../../models/erp/Multi/multi_ndt_detail.model');
const ndtModel = require("../../../../models/erp/NDT/ndt.model");
const { sendResponse } = require("../../../../helper/response");
const { TitleFormat, NDTStatus } = require('../../../../utils/enum');
const { default: mongoose } = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const { generatePDFWithoutPrintDate } = require("../../../../utils/pdfUtils");
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

exports.manageNDTOfferTable = async (req, res) => {
    const { weld_visual_id, items } = req.body;
    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
    const newItems = JSON.parse(items);

    if (!weld_visual_id || newItems.length === 0) {
        return sendResponse(res, 400, false, {}, "Missing Parameter");
    }
    const lastRecord = await NDTOfferTable.findOne({})
        .sort({ report_no: -1 })
        .select("report_no")
        .exec();

    const newReportNo = lastRecord && lastRecord.report_no ? lastRecord.report_no + 1 : 1000;
    const object = new NDTOfferTable({
        weld_visual_id,
        items: newItems,
        report_no: newReportNo,
    });
    try {
        const result = await object.save();
        if (!result) {
            return sendResponse(res, 500, false, {}, "Failed to save data");
        }
        return sendResponse(res, 200, true, result, "Data saved successfully");

    } catch (error) {
        return sendResponse(res, 500, false, {}, "Failed to save data");
    }
}

exports.removeNDTOfferTable = async (req, res) => {
    const { weld_visual_id, items, report_no } = req.body;

    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
    const parsedItems = Array.isArray(items) ? items : JSON.parse(items);

    if (!weld_visual_id || items.length === 0 || !report_no) {
        return sendResponse(res, 400, false, {}, "Missing Parameter");
    }

    try {
        const document = await NDTOfferTable.findOne({ weld_visual_id: weld_visual_id, report_no: parseInt(report_no) });
        if (!document) {
            return sendResponse(res, 404, false, {}, "Weld Visual not found");
        }
        const updatedItems = document.items.filter(item => !parsedItems.some(
            parsedItem => parsedItem._id === item._id.toString()
        ));
        if (updatedItems.length === document.items.length) {
            return sendResponse(res, 400, false, {}, "No items matched for removal");
        }
        if (updatedItems.length === 0) {
            await NDTOfferTable.deleteOne({ _id: document._id });
            return sendResponse(res, 200, true, {}, "Document deleted as all items were removed");
        }
        document.items = updatedItems;
        await document.save();
        return sendResponse(res, 200, true, document, "Item removed successfully");
    } catch (error) {
        return sendResponse(res, 500, false, {}, "Server Error");
    }
}

exports.updatedNDTOfferTable = async (req, res) => {
    try {
        const { items } = req.body;
        if (!req.user || req.error) {
            return sendResponse(res, 401, false, {}, "Unauthorized");
        }
        let parsedItems;

        try {
            parsedItems = JSON.parse(items);
        } catch (error) {
            return sendResponse(res, 400, false, {}, "Invalid JSON format for items");
        }

        if (!parsedItems || !Array.isArray(parsedItems) || parsedItems.length === 0) {
            return sendResponse(res, 400, false, {}, "Missing or invalid parameter: items");
        }

        for (const item of parsedItems) {
            const {
                report_no,
                weld_visual_id,
                off_item_id,
                drawing_id,
                ndt_balance_qty,
                ndt_used_grid_qty,
                grid_item_id,
                ndt_requirements,
                remarks,
            } = item;

            if (!report_no || !weld_visual_id || !off_item_id) {
                return sendResponse(res, 400, false, {}, "Missing required fields in item");
            }

            const NDTEntry = await NDTOfferTable.findOneAndUpdate(
                {
                    report_no,
                    weld_visual_id,
                    "items._id": off_item_id,
                },
                {
                    $set: {
                        "items.$.drawing_id": drawing_id,
                        "items.$.ndt_balance_qty": ndt_balance_qty,
                        "items.$.ndt_used_grid_qty": ndt_used_grid_qty,
                        "items.$.grid_item_id": grid_item_id,
                        "items.$.ndt_requirements": ndt_requirements,
                        "items.$.remarks": remarks,
                    }
                },
                { new: true }
            );

            if (!NDTEntry) {
                return sendResponse(res, 404, false, {}, "NDT Entry not found");
            }
        }

        return sendResponse(res, 200, true, {}, "NDT Offer Table updated successfully");
    } catch (error) {
        return sendResponse(res, 500, false, {}, "Internal Server Error");
    }
}

exports.getNDTOfferTable = async (req, res) => {
    const { weld_visual_id } = req.query;

    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
    if (!weld_visual_id) {
        return sendResponse(res, 200, true, [], "Please select fitup");
    }

    try {
        const pipeline = [
            { $match: { weld_visual_id: new mongoose.Types.ObjectId(weld_visual_id) } },
            {
                $lookup: {
                    from: "multi-erp-weldvisual-inspections",
                    localField: "weld_visual_id",
                    foreignField: "_id",
                    as: "weld_info"
                }
            },
            { $unwind: { path: "$weld_info", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$items", preserveNullAndEmptyArrays: true, } },
            {
                $addFields: {
                    weld_item: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: '$weld_info.items',
                                    as: 'weld_item',
                                    cond: { $eq: ['$$weld_item.grid_item_id', '$items.grid_item_id'] }
                                },
                            },
                            0,
                        ],
                    },
                },
            },
            {
                $lookup: {
                    from: "multi-erp-fitup-inspections",
                    localField: "weld_info.fitup_id",
                    foreignField: "_id",
                    as: "fitup_info"
                }
            },
            { $unwind: { path: "$fitup_info", preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    fitup_item: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: "$fitup_info.items",
                                    as: "fitup_item",
                                    cond: { $eq: ["$$fitup_item.grid_item_id", "$items.grid_item_id"] }
                                }
                            },
                            0
                        ]
                    }
                }
            },
            {
                $lookup: {
                    from: "store-wps-masters",
                    localField: "fitup_item.wps_no",
                    foreignField: "_id",
                    as: "wpsNo"
                }
            },
            { $unwind: { path: "$wpsNo", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "joint-types",
                    localField: "fitup_item.joint_type",
                    foreignField: "_id",
                    as: "joint_type"
                }
            },
            {
                $lookup: {
                    from: 'erp-drawing-grid-items',
                    localField: 'items.grid_item_id',
                    foreignField: '_id',
                    as: 'grid_item',
                },
            },
            { $unwind: { path: '$grid_item', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'store-items',
                    localField: 'grid_item.item_name',
                    foreignField: '_id',
                    as: 'item_name',
                }
            },
            { $unwind: { path: '$item_name', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'erp-drawing-grids',
                    localField: 'grid_item.grid_id',
                    foreignField: '_id',
                    as: 'grid_id',
                },
            },
            { $unwind: { path: '$grid_id', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'erp-planner-drawings',
                    localField: 'items.drawing_id',
                    foreignField: '_id',
                    as: 'drawing',
                },
            },
            { $unwind: { path: '$drawing', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "ndts",
                    localField: "items.ndt_requirements.ndt_type",
                    foreignField: "_id",
                    as: "ndt_requirements"
                }
            },
            {
                $addFields: {
                    "items.ndt_requirements": {
                        $map: {
                            input: "$items.ndt_requirements",
                            as: "ndt_req",
                            in: {
                                _id: "$$ndt_req._id",
                                ndt_type: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: "$ndt_requirements",
                                                as: "ndt_type",
                                                cond: { $eq: ["$$ndt_type._id", "$$ndt_req.ndt_type"] }
                                            }
                                        },
                                        0
                                    ]
                                }
                            }
                        }
                    }
                }
            },
            // WELD DATA
            {
                $lookup: {
                    from: 'qualified_welder_lists',
                    localField: 'weld_item.weldor_no',
                    foreignField: '_id',
                    as: 'welder',
                }
            },
            { $unwind: { path: '$welder', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'store-wps-masters',
                    localField: 'welder.wpsNo',
                    foreignField: '_id',
                    as: 'welder_wpsNo',
                }
            },
            { $unwind: { path: '$welder_wpsNo', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'joint-types',
                    localField: 'welder.jointType.jointId',
                    foreignField: '_id',
                    as: 'jointDetails'
                }
            },
            {
                $project: {
                    report_no: 1,
                    weld_visual_id: 1,
                    items: {
                        _id: '$items._id',
                        grid_item_id: {
                            _id: '$grid_item._id',
                            grid_id: {
                                _id: '$grid_id._id',
                                grid_no: '$grid_id.grid_no',
                                grid_qty: '$grid_id.grid_qty',
                                drawing_id: '$grid_id.drawing_id'
                            },
                            item_name: {
                                _id: '$item_name._id',
                                name: '$item_name.name',
                            },
                            item_no: '$grid_item.item_no',
                        },
                        drawing_id: '$items.drawing_id',
                        weldor_no: {
                            _id: '$welder._id',
                            wpsNo: {
                                _id: '$welder_wpsNo._id',
                                wps_no: '$welder_wpsNo.wpsNo',
                            },
                            welderNo: '$welder.welderNo',
                            name: '$welder.name',
                            // joint_type: {
                            //     $map: {
                            //         input: '$jointDetails',
                            //         as: 'joint',
                            //         in: {
                            //             _id: '$$joint._id',
                            //             name: '$$joint.name',
                            //         }
                            //     }
                            // },
                        },
                        wpsNo: {
                            _id: "$wpsNo._id",
                            wps_no: "$wpsNo.wpsNo",
                            weldingProcess: "$wpsNo.weldingProcess",
                        },
                        joint_type: {
                            $map: {
                                input: '$joint_type',
                                as: 'joint',
                                in: {
                                    _id: '$$joint._id',
                                    name: '$$joint.name',
                                }
                            }
                        },
                        ndt_balance_qty: '$items.ndt_balance_qty',
                        ndt_used_grid_qty: '$items.ndt_used_grid_qty',
                        moved_next_step: '$items.moved_next_step',
                        // ndt_requirements: '$items.ndt_requirements',
                        ndt_requirements: {
                            $map: {
                                input: "$items.ndt_requirements",
                                as: "ndt_req",
                                in: {
                                    _id: "$$ndt_req._id",
                                    ndt_type: {
                                        _id: "$$ndt_req.ndt_type._id",
                                        name: "$$ndt_req.ndt_type.name"
                                    }
                                }
                            }
                        },
                        remarks: '$items.remarks',
                        qc_remarks: '$items.qc_remarks',
                        is_accepted: '$items.is_accepted',
                    }
                }
            }
        ]
        const result = await NDTOfferTable.aggregate(pipeline);
        if (!result || result.length === 0) {
            return sendResponse(res, 200, true, [], "No records found");
        }
        const responseData = {
            weld_visual_id,
            items: result.map((item) => ({
                ...item.items,
                report_no: item.report_no,
            })),
        };
        return sendResponse(res, 200, true, responseData, "Records fetched successfully");
    } catch (error) {
        sendResponse(res, 500, false, {}, `Something went wrong: ${error}`);
    }
}

exports.generateNDTTypewiseOffer = async (req, res) => {
    const { items, ndt_type_id, ndt_master_id, ndt_main_offer_id } = req.body;
    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
    const newItems = JSON.parse(items);
    if (!ndt_master_id || newItems.length === 0) {
        return sendResponse(res, 400, false, {}, "Missing Parameter");
    }
    const object = new NDTTypewiseOfferTable({
        ndt_master_id,
        ndt_type_id,
        ndt_main_offer_id,
        items: newItems,
    });
    try {
        const result = await object.save();
        if (!result) {
            return sendResponse(res, 500, false, {}, "Failed to save data");
        }
        return sendResponse(res, 200, true, result, "Data saved successfully");

    } catch (error) {
        return sendResponse(res, 500, false, { error: error.message }, "Failed to save data");
    }
};

exports.getNDTTypewiseOffer = async (req, res) => {
    const { type, ndt_master_id, project } = req.query;
    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
    const parseNdt = (ndt_master_id && ndt_master_id !== 'null' && ndt_master_id !== 'undefined')
        ? JSON.parse(ndt_master_id).map((id) => new mongoose.Types.ObjectId(id))
        : [];
    let testElement = await ndtModel.findOne({ _id: type });
    if (!testElement) {
        return sendResponse(res, 404, false, {}, "NDT Type not found");
    }
    const ndt_type = testElement.name.toLowerCase();
    try {
        const pipeline = [
            {
                $match: {
                    ...(parseNdt.length > 0 && { ndt_master_id: { $in: parseNdt } }),
                    ...(type && { ndt_type_id: new mongoose.Types.ObjectId(type) })
                }
            },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: 'multi-erp-ndt-masters',
                    localField: 'ndt_master_id',
                    foreignField: '_id',
                    as: 'ndt_master_id',
                },
            },
            {
                $lookup: {
                    from: 'ndts',
                    localField: 'ndt_type_id',
                    foreignField: '_id',
                    as: 'ndt_type_id',
                },
            },
            // items
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
                    ndt_master_id: { $arrayElemAt: ['$ndt_master_id', 0] },
                    ndt_type_id: { $arrayElemAt: ['$ndt_type_id', 0] },
                    grid_item: { $arrayElemAt: ['$grid_item', 0] },
                    weldor_no: { $arrayElemAt: ['$weldor_no', 0] },
                    wps_no: { $arrayElemAt: ['$wps_no', 0] },
                }
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
                    ndt_master_id: {
                        _id: '$ndt_master_id._id',
                        report_no: '$ndt_master_id.report_no'
                    },
                    ndt_type_id: {
                        _id: '$ndt_type_id._id',
                        name: '$ndt_type_id.name',
                    },
                    ndt_offer_id: 1,
                    ndt_main_offer_id: 1,
                    createdAt: 1,
                    items: {
                        _id: '$items._id',
                        grid_item_id: {
                            _id: '$grid_item._id',
                            item_name: {
                                _id: '$grid_item.item_name._id',
                                name: '$grid_item.item_name.name',
                            },
                            item_no: '$grid_item.item_no',
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
                        thickness: "$items.thickness",
                        offer_used_grid_qty: "$items.offer_used_grid_qty",
                        [ndt_type + "_use_qty"]: "$items." + ndt_type + "_use_qty",
                        [ndt_type + "_balance_qty"]: "$items." + ndt_type + "_balance_qty",
                        deleted: "$items.deleted",
                        offer_status: "$items.offer_status",
                    },
                }
            },
            {
                $group: {
                    _id: {
                        _id: "$_id",
                        ndt_master_id: "$ndt_master_id",
                        ndt_type_id: "$ndt_type_id",
                        ndt_offer_id: "$ndt_offer_id",
                        ndt_main_offer_id: "$ndt_main_offer_id",
                        createdAt: '$createdAt',
                    },
                    items: { $push: "$items" },
                }
            },
            {
                $project: {
                    _id: "$_id._id",
                    ndt_master_id: "$_id.ndt_master_id",
                    ndt_type_id: "$_id.ndt_type_id",
                    ndt_offer_id: "$_id.ndt_offer_id",
                    ndt_main_offer_id: "$_id.ndt_main_offer_id",
                    createdAt: "$_id.createdAt",
                    items: 1,
                }
            },
            {
                $sort: { createdAt: -1 },
            },
        ];
        const result = await NDTTypewiseOfferTable.aggregate(pipeline);
        if (!result || result.length === 0) {
            return sendResponse(res, 200, true, [], "No records found");
        }
        const mergedItems = result.reduce((acc, currentItem) => {
            currentItem.items.forEach((item) => {
                acc.push({
                    ...item,
                    ndt_master_id: currentItem.ndt_master_id._id,
                    ndt_type_id: currentItem.ndt_type_id._id,
                    createdAt: currentItem.createdAt,
                    ndt_offer_id: currentItem.ndt_offer_id, //new offer id
                    ndt_main_offer_id: currentItem.ndt_main_offer_id, //old offer id
                    offer_main_id: currentItem?._id,
                });
            });
            return acc;
        }, []);
        const responseData = {
            items: mergedItems,
        };
        return sendResponse(res, 200, true, responseData, "Records fetched successfully");
    } catch (error) {
        sendResponse(res, 500, false, {}, `Something went wrong: ${error}`);
    }
}

exports.removeNDTTypewiseOffer = async (req, res) => {
    const { ndt_master_id, item_id, ndt_type_id } = req.body;

    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
    if (!ndt_master_id || !item_id || !ndt_type_id) {
        return sendResponse(res, 400, false, {}, "Missing Parameter");
    }

    try {
        const document = await NDTTypewiseOfferTable.findOne({
            ndt_offer_id: { $not: { $exists: true } },
            ndt_type_id: ndt_type_id,
            ndt_master_id: ndt_master_id,
        }).populate({
            path: "items.grid_item_id",
            model: "erp-drawing-grid-items",
            select: "grid_id"
        });
        if (!document) {
            return sendResponse(res, 404, false, {}, "NDT data not found");
        }

        const SelectedItem = document.items.filter(item => item._id.toString() === item_id.toString());
        if (!SelectedItem) {
            return sendResponse(res, 404, false, {}, "Item not found");
        }
        const gridItems = await drawGridItems.find({ grid_id: { $in: SelectedItem[0].grid_item_id.grid_id }, drawing_id: { $in: SelectedItem[0].drawing_id } });
        if (!gridItems) {
            return sendResponse(res, 404, false, {}, "Item not found of grid id");
        }
        const gridItemMap = gridItems.map((grid) => grid._id.toString());

        const updatedItems = document.items.filter(item => !gridItemMap.some(
            parsedItem => parsedItem === item.grid_item_id._id.toString()
        ));
        if (updatedItems.length === document.items.length) {
            return sendResponse(res, 400, false, {}, "No items matched for removal");
        }
        if (updatedItems.length === 0) {
            await NDTTypewiseOfferTable.deleteOne({ _id: document._id });
            return sendResponse(res, 200, true, {}, "Document deleted as all items were removed");
        }
        document.items = updatedItems;
        await document.save();
        return sendResponse(res, 200, true, document, "Item removed successfully");
    } catch (error) {
        return sendResponse(res, 500, false, { error: error.message }, "Server Error");
    }
}

exports.saveNDTTypewiseOffer = async (req, res) => {
    const { items, offeredBy, project,project_id } = req.body;
    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, 'Unauthorized');
    }
    const newItems = JSON.parse(items);

    if (newItems.length === 0) {
        return sendResponse(res, 400, false, {}, "Missing Parameter");
    }

    try {
        let ndt_master_ids = newItems.map((data) => data.ndt_master_id.toString());
        ndt_master_ids = [...new Set(ndt_master_ids)];
        let grid_item_old_ids = newItems.map((data) => data.grid_item_id.toString());
        grid_item_old_ids = [...new Set(grid_item_old_ids)];
        let ndt_type_id = newItems[0].ndt_type_id;
        let offer_main_ids = newItems.map((data) => data.offer_main_id.toString());
        offer_main_ids = [...new Set(offer_main_ids)];
        let old_offer_id = await NDTTypewiseOfferTable.find({ _id: { $in: offer_main_ids } });
        let old_offer_ids = old_offer_id ? old_offer_id.filter(data => data.ndt_main_offer_id).map(data => data.ndt_main_offer_id.toString()) : [];
        old_offer_ids = [...new Set(old_offer_ids)];
        let testElement = await ndtModel.findOne({ _id: ndt_type_id });
        if (!testElement) {
            return sendResponse(res, 404, false, {}, "NDT Type not found");
        }
        const ndt_type = testElement.name.toLowerCase();
        const itemWiseQty = Object.fromEntries(
            newItems.map((item) => [
                item.grid_item_id.toString(),
                item[ndt_type + "_use_qty"],
            ])
        );
        let lastOffer = await MultiNDTOfferTable.findOne(
            {
                deleted: false,
                ndt_type_id: ndt_type_id,
                ndt_offer_no: { $exists: true, $ne: null, $regex: `/${project}/` },
            },
            { deleted: 0 },
            { sort: { updatedAt: -1 } }
        );
        let offerNo = "1";
        if (lastOffer && lastOffer.ndt_offer_no) {
            const split = lastOffer.ndt_offer_no.split('/');
            const lastOfferNo = parseInt(split[split.length - 1]);
            offerNo = lastOfferNo + 1;
        }

        let offerFormat = testElement.name + 'OFFERNO';
        const gen_ndt_offer = TitleFormat[offerFormat].replace('/PROJECT/', `/${project}/`) + offerNo;
        let updatedOffer = await MultiNDTOfferTable({
            ndt_offer_no: gen_ndt_offer,
            ndt_master_ids: ndt_master_ids,
            ndt_type_id: ndt_type_id,
            items: newItems,
            offered_by: offeredBy,
            report_date: Date.now(),
            status: NDTStatus.Offered, // send to QC for approval
        }).save();
        if (!updatedOffer) {
            return sendResponse(res, 404, false, {}, 'NDT Type Offer not found');
        } else {
            if (old_offer_ids.length > 0) {
                let get_old_offer_data = await MultiNDTOfferTable.find({ _id: { $in: old_offer_ids } });
                if (!get_old_offer_data) {
                    return sendResponse(res, 404, false, {}, 'No NDT Offer found');
                }
                get_old_offer_data.forEach(async (offer) => {
                    let grid_item_ids = offer.items.map((data) => data.grid_item_id.toString());
                    grid_item_ids = [...new Set(grid_item_ids)];
                    if (grid_item_ids.length > 0) {
                        const gridItems = await drawGridItems.find({ _id: { $in: grid_item_ids } });
                        const gridItemMap = Object.fromEntries(
                            gridItems.map((grid) => [
                                grid._id.toString(),
                                { grid_id: grid.grid_id.toString(), drawing_id: grid.drawing_id.toString() },
                            ])
                        );
                        for (const [gridItemId, details] of Object.entries(gridItemMap)) {
                            const remainingItems = await drawGridItems.find({ _id: { $nin: grid_item_ids }, grid_id: { $in: details.grid_id }, drawing_id: { $in: details.drawing_id } });
                            if (remainingItems) {
                                const remainingItemIds = remainingItems.map((item) => item._id.toString());
                                grid_item_ids = [...new Set([...grid_item_ids, ...remainingItemIds])];
                            }
                        }
                        let count_itemwise = [];
                        let is_changed = 0;
                        offer.items.forEach((key) => {
                            if (grid_item_ids.includes(key.grid_item_id.toString())) {
                                if (((key.offer_used_grid_qty - (key.grid_use_qty ? (key.grid_use_qty + itemWiseQty[key.grid_item_id.toString()] ?? 0) : itemWiseQty[key.grid_item_id.toString()] ?? 0)) === 0)) {
                                    if (!count_itemwise.includes(key.grid_item_id.toString()))
                                        count_itemwise.push(key.grid_item_id.toString());
                                }
                                if (!key.grid_use_qty && itemWiseQty[key.grid_item_id.toString()]) {
                                    key.grid_use_qty = itemWiseQty[key.grid_item_id.toString()];
                                    is_changed++;
                                } else if (key.grid_use_qty && itemWiseQty[key.grid_item_id.toString()]) {
                                    key.grid_use_qty = parseInt(key.grid_use_qty) + itemWiseQty[key.grid_item_id.toString()] ?? 0;
                                    is_changed++;
                                }
                            }
                        });
                        const checkZeroQty = offer.items.filter(key =>
                            (key.offer_used_grid_qty - (key.grid_use_qty ?? 0)) === 0
                        );
                        if (checkZeroQty.length === offer.items.length)
                            offer.status = NDTStatus.Merged;
                        if (count_itemwise.length > 0 || is_changed > 0)
                            offer.save();
                    }
                });
            }
            let deleted_offers = await NDTTypewiseOfferTable.find({ ndt_master_id: { $in: ndt_master_ids }, ndt_type_id: ndt_type_id });
            if (deleted_offers) {
                deleted_offers.forEach(async (i) => {
                    const SelectedItem = i.items.filter(item =>
                        grid_item_old_ids.includes(item.grid_item_id.toString()) && item.deleted
                    );
                    if (SelectedItem.length > 0) {
                        SelectedItem.forEach(item => {
                            item.deleted = false;
                        });
                        await i.save();
                    }
                });
            }
            await NDTMaster.updateMany({ _id: { $in: ndt_master_ids } }, {
                [testElement.name.toLowerCase() + "_status"]: NDTStatus.Offered,
            });
            await NDTTypewiseOfferTable.updateMany({ _id: { $in: offer_main_ids } }, {
                ndt_offer_id: updatedOffer._id,
            });

            /* =========================================================
    NDT OFFER EMAIL
========================================================= */

try {

    const projectDetails =
        await Project.findById(
            project_id
        );

    const offeredUser =
        await User.findById(
            offeredBy
        );

    /* ==========================================
       QC ENGINEER USERS
    ========================================== */

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
            r => r._id
        );

    const qcUsers =
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


    /* ==========================================
       OFFER DATETIME
    ========================================== */

    const offerDateTime =

        updatedOffer?.report_date

        ? new Date(
            updatedOffer.report_date
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


    /* ==========================================
       SEND EMAIL
    ========================================== */

    for(
        const user
        of qcUsers
    ){

        try{

            const html =
                commonStageOfferEmail({

                userName:
                    user?.user_name || "-",

                module:
                    "Structural",

                stageName:
                    `${testElement?.name || "NDT"} Offer`,

                offerNo:
                    updatedOffer?.ndt_offer_no || "-",

                projectName:
                    project || "-",

                workOrderNo:
                    projectDetails?.work_order_no || "-",

                createdBy:
                    offeredUser?.user_name || "-",

                offerDateTime,

                remarks:
                    `${testElement?.name || "NDT"} offer generated and forwarded for QC verification.`,

                loginUrl:
                    process.env.ERP_URL

            });


            addEmailJob({

                to:
                    user.email,

                subject:
                    `${testElement?.name || "NDT"} Offer - ${updatedOffer?.ndt_offer_no}`,

                html

            });

            console.log(
                `NDT OFFER MAIL QUEUED -> ${user.email}`
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
        "NDT OFFER EMAIL ERROR:",
        emailErr
    );

}
            return sendResponse(res, 200, true, {}, 'NDT Type Offer updated successfully');
        }

    } catch (error) {
        return sendResponse(res, 500, false, { error: error.message }, "Failed to save data");
    }
}

const getMultiNDToffer = async (ndt_offer_no) => {
    try {
        const requestData = await MultiNDTOfferTable.aggregate([
            { $match: { deleted: false, ndt_offer_no: ndt_offer_no } },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "users",
                    localField: "offered_by",
                    foreignField: "_id",
                    as: "offerDetails",
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
                    from: "ndts",
                    localField: "ndt_type_id",
                    foreignField: "_id",
                    as: "NDTTypeDetails",
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
                    offer_name: { $arrayElemAt: ["$offerDetails.user_name", 0] },
                    "items.welder_no": { $arrayElemAt: ["$weldorDetails.welderNo", 0] },
                    drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
                    gridItemDetails: { $arrayElemAt: ["$gridItemDetails", 0] },
                    wps_no: { $arrayElemAt: ["$wpsDetails.wpsNo", 0] },
                    weldingProcess: { $arrayElemAt: ["$wpsDetails.weldingProcess", 0] },
                    NDTType: { $arrayElemAt: ["$NDTTypeDetails.name", 0] },
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
                    report_no: "$ndt_offer_no",
                    client: "$clientDetails.name",
                    project_name: "$projectDetails.name",
                    wo_no: "$projectDetails.work_order_no",
                    project_po_no: "$projectDetails.work_order_no",
                    offer_name: "$offer_name",
                    offer_date: "$report_date",
                    NDTType: "$NDTType",
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
                        welder_no: "$items.welder_no",
                        thickness: "$items.thickness",
                        is_cover: "$items.is_cover",
                        remarks: "$items.remarks",
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
                        offer_name: "$offer_name",
                        offer_date: "$offer_date",
                        NDTType: "$NDTType",
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
                    offer_name: "$_id.offer_name",
                    offer_date: "$_id.offer_date",
                    NDTType: "$_id.NDTType",
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

exports.oneMultiNDTOffer = async (req, res) => {
    const { ndt_offer_no } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getMultiNDToffer(ndt_offer_no)
            let requestData = data.result;

            if (data.status === 1) {
                sendResponse(res, 200, true, requestData, "NDT offer data found");
            }
            else if (data.status === 0) {
                sendResponse(res, 200, false, [], `NDT offer data not found`)
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

exports.downloadMultiNDTOffer = async (req, res) => {
    const { ndt_offer_no, print_date } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getMultiNDToffer(ndt_offer_no)
            let requestData = data.result[0];

            if (data.status === 1) {
                let headerInfo = {
                    report_no: requestData?.report_no,
                    client: requestData?.client,
                    project_name: requestData?.project_name,
                    wo_no: requestData?.wo_no,
                    project_po_no: requestData?.project_po_no,
                    offer_name: requestData?.offer_name,
                    offer_date: requestData?.offer_date,
                    NDTType: requestData?.NDTType,
                }
                const template = fs.readFileSync(
                    "templates/multiNDTOffer.html",
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

                const pdfBuffer = await generatePDFWithoutPrintDate(page, { print_date });

                await browser.close();

                const pdfsDir = path.join(__dirname, "../../../../pdfs");
                if (!fs.existsSync(pdfsDir)) {
                    fs.mkdirSync(pdfsDir);
                }

                const filename = `ndt_${(requestData.NDTType).toLowerCase()}_offer_${Date.now()}.pdf`;
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
                sendResponse(res, 200, false, {}, `NDT offer data not found`)
            }
            else if (data.status === 2) {
                sendResponse(res, 500, false, {}, "Something went wrong");
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong1111");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};