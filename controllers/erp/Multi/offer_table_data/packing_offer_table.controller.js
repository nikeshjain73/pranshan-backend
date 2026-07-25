const MultiPackingOffer = require('../../../../models/erp/Multi/offer_table_data/packing_offer_table.model');
const MultiReleaseNote = require('../../../../models/erp/Multi/release_note/multi_release_note.model');

const { sendResponse } = require('../../../../helper/response');
const { default: mongoose } = require("mongoose");
const { Types: { ObjectId } } = require("mongoose");

exports.managePackingOfferTable = async (req, res) => {
   
    const { items } = req.body;
 
    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }

    if (!items) {
        return sendResponse(res, 400, false, {}, "Missing parameters");
    }

    const newItems = JSON.parse(items);

    let lastRecord = await MultiPackingOffer.findOne({})
        .sort({ packing_no: -1 })
        .select("packing_no")
        .exec();

    try {
        let dataAdded = false;
        let dataUpdated = false;

        for (const o of newItems) {
            const updated = await MultiPackingOffer.updateOne(
                {
                    "items.drawing_id": new ObjectId(o.drawing_id),
                    "items.grid_id": new ObjectId(o.grid_id),
                },
                {
                    $inc: {
                        "items.$.rn_used_grid_qty": o.rn_used_grid_qty,
                    }
                },
            );

            if (updated.modifiedCount > 0) {
                dataUpdated = true;
            }


            if (updated.modifiedCount === 0) {
                const newReportNo = lastRecord && lastRecord.packing_no ? lastRecord.packing_no + 1 : 1000;

                const newItem = await MultiPackingOffer.create(
                    {
                        packing_no: newReportNo,
                        items: [{
                            rn_id: o.rn_id,
                            drawing_id: o.drawing_id,
                            grid_id: o.grid_id,
                            rn_balance_grid_qty: o.rn_balance_grid_qty,
                            rn_used_grid_qty: o.rn_used_grid_qty,

                            item_name: o.item_name,
                            drawing_no: o.drawing_no,
                            grid_no: o.grid_no,
                            irn_no: o.irn_no,
                            unit_assembly_weight: o.unit_assembly_weight,
                            total_assembly_weight: o.total_assembly_weight,
                            remarks: o.remarks
                        }],
                    },
                );

                if (newItem) {
                    dataAdded = true;
                }
                lastRecord = await MultiPackingOffer.findOne({})
                    .sort({ packing_no: -1 })
                    .select("packing_no")
                    .exec();
            }
        }

        if (dataAdded && dataUpdated) {
            return sendResponse(res, 200, true, {}, "Packing data added and updated successfully");
        } else if (dataAdded) {
            return sendResponse(res, 200, true, {}, "Packing data added successfully");
        } else if (dataUpdated) {
            return sendResponse(res, 200, true, {}, "Packing updated successfully");
        } else {
            return sendResponse(res, 400, false, {}, "Packing data not added or updated");
        }
    } catch (error) {
        console.log("error", error)
        return sendResponse(res, 500, false, {}, "Internal server error");
    }
}

exports.deletePackingOffer = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error) {
        try {
            if (id) {
                const deletePackingOffer = await MultiPackingOffer.deleteOne({ _id: new ObjectId(id), });

                if (deletePackingOffer.deletedCount > 0) {
                    sendResponse(res, 200, true, {}, `Packing deleted successfully`);
                } else {
                    sendResponse(res, 400, false, {}, `Packing not delete`);
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

// exports.getPackingOffer = async (req, res) => {
//     console.log("fetch data");
//     const { project_id } = req.body;
//     if (!req.user || req.error) {
//         return sendResponse(res, 401, false, {}, "Unauthorized");
//     }
//     if (!project_id) {
//         return sendResponse(res, 400, false, {}, "Missing Parameter");
//     }

//     try {

//         const requestData = await MultiPackingOffer.aggregate([
//             { $unwind: "$items" },
//             {
//                 $lookup: {
//                     from: "erp-planner-drawings",
//                     localField: "items.drawing_id",
//                     foreignField: "_id",
//                     as: "drawingDetails",
//                     pipeline: [
//                         {
//                             $lookup: {
//                                 from: "bussiness-projects",
//                                 localField: "project",
//                                 foreignField: "_id",
//                                 as: "projectDetails",
//                                 pipeline: [
//                                     {
//                                         $lookup: {
//                                             from: "store-parties",
//                                             localField: "party",
//                                             foreignField: "_id",
//                                             as: "clientDetails",
//                                         },
//                                     },
//                                 ],
//                             },
//                         },
//                     ],
//                 },
//             },
//             {
//                 $lookup: {
//                     from: "erp-drawing-grids",
//                     localField: "items.grid_id",
//                     foreignField: "_id",
//                     as: "gridDetails",
//                 },
//             },
//             {
//                 $lookup: {
//                     from: "multi-erp-ins-release-notes",
//                     localField: "items.rn_id",
//                     foreignField: "_id",
//                     as: "rnDetails",
//                 }
//             },
//             {
//                 $lookup: {
//                     from: "erp-drawing-grid-items",
//                     let: { drawingId: "$items.drawing_id", gridId: "$items.grid_id" },
//                     pipeline: [
//                         {
//                             $match: {
//                                 $expr: {
//                                     $and: [
//                                         { $eq: ["$drawing_id", "$$drawingId"] },
//                                         { $eq: ["$grid_id", "$$gridId"] }
//                                     ]
//                                 }
//                             }
//                         },
//                         {
//                             $group: {
//                                 _id: null,
//                                 totalAssemblyWeight: { $sum: "$assembly_weight" },
//                                 totalAsm: { $sum: "$assembly_surface_area" }
//                             }
//                         }
//                     ],
//                     as: "gridItemDetails"
//                 }
//             },
//             {
//                 $addFields: {
//                     drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
//                     gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
//                     gridItemDetails: { $arrayElemAt: ["$gridItemDetails", 0] },
//                     rnDetails: { $arrayElemAt: ["$rnDetails", 0] },
//                 },
//             },
//             {
//                 $addFields: {
//                     projectDetails: {
//                         $arrayElemAt: ["$drawingDetails.projectDetails", 0],
//                     },

//                 },
//             },
//             {
//                 $addFields: {
//                     clientDetails: {
//                         $arrayElemAt: ["$projectDetails.clientDetails", 0],
//                     },
//                 },
//             },
//             {
//                 $match: {
//                     "projectDetails._id": new ObjectId(project_id)
//                 }
//             },
//             {
//                 $addFields: {

//                     //Original Code - Surat
//                     //                 total_assembly_weight: {
//                     //     $multiply: ["$gridItemDetails.totalAssemblyWeight", "$gridDetails.grid_qty"]
//                     // },
//                     // unit_assembly_weight: {
//                     //     $cond: {
//                     //         if: { $gt: ["$items.rn_used_grid_qty", 0] },
//                     //         then: { $divide: [{ $multiply: ["$gridItemDetails.totalAssemblyWeight", "$gridDetails.grid_qty"] }, "$items.rn_used_grid_qty"] },
//                     //         else: 0
//                     //     }
//                     // },


// unit_assembly_weight: "$gridItemDetails.totalAssemblyWeight",
// total_assembly_weight: {
//     $multiply: ["$gridItemDetails.totalAssemblyWeight", "$items.rn_used_grid_qty"]
// },

//                     total_asm: {
//                         $multiply: ["$gridItemDetails.totalAsm", "$gridDetails.grid_qty"]
//                     },
//                     unit_asm: {
//                         $cond: {
//                             if: { $gt: ["$items.rn_used_grid_qty", 0] },
//                             then: { $divide: [{ $multiply: ["$gridItemDetails.totalAsm", "$gridDetails.grid_qty"] }, "$items.rn_used_grid_qty"] },
//                             else: 0
//                         }
//                     }
//                 }

                
//             },

//             {
//                 $project: {
//                     _id: 1,
//                     packing_no: 1,
//                     rn_id: "$rnDetails._id",
//                     irn_no: "$rnDetails.report_no",
//                     item_detail_id: "$items._id",
//                     drawing_no: "$drawingDetails.drawing_no",
//                     drawing_id: "$drawingDetails._id",
//                     rev: "$drawingDetails.rev",
//                     sheet_no: "$drawingDetails.sheet_no",
//                     assembly_no: "$drawingDetails.assembly_no",
//                     assembly_quantity: "$drawingDetails.assembly_quantity",
//                     grid_no: "$gridDetails.grid_no",
//                     grid_id: "$gridDetails._id",
//                     grid_qty: "$gridDetails.grid_qty",
//                     rn_balance_grid_qty: "$items.rn_balance_grid_qty",
//                     rn_used_grid_qty: "$items.rn_used_grid_qty",
//                     moved_next_step: "$items.moved_next_step",
//                     remarks: "$items.remarks",
//                     total_assembly_weight: 1,
//                     unit_assembly_weight: 1,
//                     total_asm: 1,
//                     unit_asm: 1,
//                 }
//             }
//         ]);

//         console.log("requestData", requestData);
//         // console.log(requestData);
// // console.log("Packing Offer Data:");
// // requestData.forEach((item, index) => {
// //     // console.log(`--- Record ${index + 1} ---`);
// //     console.log("grid_qty:", item.grid_qty);
// //     // console.log("rn_used_grid_qty:", item.rn_used_grid_qty);
// //     // console.log("rn_balanced_grid_qty:", item.rn_balance_grid_qty);

// //     //   console.log("remaining_qty:", item.grid_qty - item.rn_used_grid_qty);
// //     console.log("unit_assembly_weight:", item.unit_assembly_weight);
// //     console.log("total_assembly_weight:", item.total_assembly_weight);
// // });


//         //    console.log(unit_asm * total_asm);
//         if (requestData.length && requestData.length > 0) {
//             sendResponse(res, 200, true, requestData, "Packing data found");
//         } else {
//             sendResponse(res, 200, false, [], `Packing data not found`);
//         }
//     } catch (error) {
//         console.log("error", error)
//         sendResponse(res, 500, false, {}, "Something went wrong11");
//     }
// }


exports.getPackingOffer = async (req, res) => {
   
    const { project_id } = req.body;

    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }

    if (!project_id) {
        return sendResponse(res, 400, false, {}, "Missing Parameter");
    }

    try {
        const requestData = await MultiPackingOffer.aggregate([
            { $unwind: "$items" },

            {
                $facet: {
                    linkedData: [
                        {
                            $match: {
                                "items.drawing_id": { $type: "objectId" },
                                "items.grid_id": { $type: "objectId" }
                            }
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
                                from: "erp-drawing-grids",
                                localField: "items.grid_id",
                                foreignField: "_id",
                                as: "gridDetails",
                            },
                        },
                        {
                            $lookup: {
                                from: "multi-erp-ins-release-notes",
                                localField: "items.rn_id",
                                foreignField: "_id",
                                as: "rnDetails",
                            }
                        },
                        {
                            $lookup: {
                                from: "erp-drawing-grid-items",
                                let: { drawingId: "$items.drawing_id", gridId: "$items.grid_id" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ["$drawing_id", "$$drawingId"] },
                                                    { $eq: ["$grid_id", "$$gridId"] }
                                                ]
                                            }
                                        }
                                    },
                                    {
                                        $group: {
                                            _id: null,
                                            totalAssemblyWeight: { $sum: "$assembly_weight" },
                                            totalAsm: { $sum: "$assembly_surface_area" }
                                        }
                                    }
                                ],
                                as: "gridItemDetails"
                            }
                        },
                        {
                            $addFields: {
                                drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
                                gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
                                gridItemDetails: { $arrayElemAt: ["$gridItemDetails", 0] },
                                rnDetails: { $arrayElemAt: ["$rnDetails", 0] },
                                projectDetails: { $arrayElemAt: ["$drawingDetails.projectDetails", 0] },
                                clientDetails: { $arrayElemAt: ["$drawingDetails.projectDetails.0.clientDetails", 0] }
                            }
                        },
                        {
                            $match: {
                                "projectDetails._id": new ObjectId(project_id)
                            }
                        },
                        {
                            $addFields: {
                                unit_assembly_weight: "$gridItemDetails.totalAssemblyWeight",
                                total_assembly_weight: {
                                    $multiply: ["$gridItemDetails.totalAssemblyWeight", "$items.rn_used_grid_qty"]
                                },
                                total_asm: {
                                    $multiply: ["$gridItemDetails.totalAsm", "$gridDetails.grid_qty"]
                                },
                                unit_asm: {
                                    $cond: {
                                        if: { $gt: ["$items.rn_used_grid_qty", 0] },
                                        then: { $divide: [{ $multiply: ["$gridItemDetails.totalAsm", "$gridDetails.grid_qty"] }, "$items.rn_used_grid_qty"] },
                                        else: 0
                                    }
                                }
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                packing_no: 1,
                                rn_id: "$rnDetails._id",
                                irn_no: "$rnDetails.report_no",
                                item_detail_id: "$items._id",
                                drawing_no: "$drawingDetails.drawing_no",
                                drawing_id: "$drawingDetails._id",
                                rev: "$drawingDetails.rev",
                                sheet_no: "$drawingDetails.sheet_no",
                                assembly_no: "$drawingDetails.assembly_no",
                                assembly_quantity: "$drawingDetails.assembly_quantity",
                                grid_no: "$gridDetails.grid_no",
                                grid_id: "$gridDetails._id",
                                grid_qty: "$gridDetails.grid_qty",
                                rn_balance_grid_qty: "$items.rn_balance_grid_qty",
                                rn_used_grid_qty: "$items.rn_used_grid_qty",
                                moved_next_step: "$items.moved_next_step",
                                remarks: "$items.remarks",
                                item_name: "$items.item_name",
                                total_assembly_weight: 1,
                                unit_assembly_weight: 1,
                                total_asm: 1,
                                unit_asm: 1
                            }
                        }
                    ],
                    rawFormData: [
                        {
                            $match: {
                                $or: [
                                    { "items.drawing_id": { $exists: false } },
                                    { "items.drawing_id": { $not: { $type: "objectId" } } }
                                ]
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                packing_no: 1,
                                item_detail_id: "$items._id",
                                drawing_no: "$items.drawing_no",
                                grid_no: "$items.grid_no",
                                irn_no: "$items.irn_no",
                                remarks: "$items.remarks",
                                rn_balance_grid_qty: "$items.rn_balance_grid_qty",
                                rn_used_grid_qty: "$items.rn_used_grid_qty",
                                moved_next_step: "$items.moved_next_step",
                                unit_assembly_weight: "$items.unit_assembly_weight",
                                total_assembly_weight: "$items.total_assembly_weight",
                                item_name: "$items.item_name",
                                total_asm: null,
                                unit_asm: null,
                                drawing_id: null,
                                grid_id: null,
                                grid_qty: null,
                                rev: null,
                                sheet_no: null,
                                assembly_no: null,
                                assembly_quantity: null
                                
                            }
                        }
                    ]
                }
            }
        ]);

        const combinedData = [
            ...(requestData[0]?.linkedData || []),
            ...(requestData[0]?.rawFormData || [])
        ];

        if (combinedData.length > 0) {
            sendResponse(res, 200, true, combinedData, "Packing data found");
        } else {
            sendResponse(res, 200, false, [], "Packing data not found");
        }
    } catch (error) {
        console.log("error", error);
        sendResponse(res, 500, false, {}, "Something went wrong while fetching packing data");
    }
};

//orginal code 
exports.updateReleaseGridBal = async (req, res) => {
    const { items, is_delete } = req.body;
    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
    if (!items) {
        return sendResponse(res, 400, false, {}, "Missing parameter");
    }

    const itemArray = JSON.parse(items);
    const is_del = JSON.parse(is_delete);

    try {
        let matchedCount = 0;
        let modifiedCount = 0;

        if (is_del) {
            for (const item of itemArray) {
                const { rn_id, drawing_id, grid_id, rn_used_grid_qty } = item;

                const result = await MultiReleaseNote.updateOne(
                    { _id: rn_id, "items.drawing_id": drawing_id, "items.grid_id": grid_id },
                    {
                        $inc: {
                            "items.$.moved_next_step": -rn_used_grid_qty,
                        },
                    }
                );

                matchedCount += result.matchedCount;
                modifiedCount += result.modifiedCount;
            }
            if (matchedCount === 0) {
                return sendResponse(res, 404, false, {}, "No release note record found");
            } else if (modifiedCount > 0) {
                return sendResponse(res, 200, true, {}, "Grid balance updated successfully");
            } else {
                return sendResponse(res, 400, false, {}, "Grid balance not updated");
            }
        } else {
            for (const item of itemArray) {
                const { rn_id, drawing_id, grid_id, rn_used_grid_qty } = item;

                const result = await MultiReleaseNote.updateOne(
                    { _id: rn_id, "items.drawing_id": drawing_id, "items.grid_id": grid_id },
                    {
                        $inc: {
                            "items.$.moved_next_step": rn_used_grid_qty,
                        },
                    }
                );

                matchedCount += result.matchedCount;
                modifiedCount += result.modifiedCount;
            }

            if (matchedCount === 0) {
                return sendResponse(res, 404, false, {}, "No release note record found");
            } else if (modifiedCount > 0) {
                return sendResponse(res, 200, true, {}, "Grid balance updated successfully");
            } else {
                return sendResponse(res, 400, false, {}, "Grid balance not updated");
            }
        }
    } catch (error) {
        console.log("error", error)
        return sendResponse(res, 500, false, {}, "Something went wrong");
    }
}

