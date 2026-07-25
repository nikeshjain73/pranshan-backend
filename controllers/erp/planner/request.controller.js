const RequestModal = require("../../../models/erp/planner/request.model");
const { sendResponse } = require("../../../helper/response");
const { OrderTypes } = require("../../../utils/enum");
const TransactionItems = require("../../../models/store/transaction_item.model");
const AdminModal = require("../../../models/admin.model");
const ejs = require("ejs");
const fs = require("fs");
const XLSX = require('xlsx');
const XLSXStyle = require('xlsx-style');
const puppeteer = require("puppeteer");
const path = require("path");
const { default: mongoose } = require("mongoose");
const { generatePDF } = require("../../../utils/pdfUtils");
const ObjectId = mongoose.Types.ObjectId;
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;

const DrawingGridItems = require("../../../models/erp/planner/draw_grid_items.model")
const User = require("../../../models/users.model");
const ErpRole = require("../../../models/erp/erp_role.model");
const Project = require("../../../models/project.model");
const addEmailJob = require("../../../utils/emailJob");
const sendEmail = require("../../../utils/sendEmail");
const commonStageOfferEmail = require("../../../utils/commonStageOfferEmail");
const commonStageAcceptanceEmail = require("../../../utils/commonStageAcceptanceEmail");

const getOneRequestItem = async (requestId) => {
  try {
    const filter = {
      deleted: false,
      _id: new ObjectId(requestId),
    };
    const filter1 = {
      deleted: false,
    };

    const requestData = await RequestModal.aggregate([
      { $match: filter },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "bussiness-projects",
          localField: "project",
          foreignField: "_id",
          as: "projectDetails",
          pipeline: [{ $project: { _id: 0, location: 1, name: 1 } }],
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "preparedBy",
          foreignField: "_id",
          as: "prepareDetails",
          pipeline: [{ $project: { _id: 0, user_name: 1 } }],
        },
      },
      {
        $lookup: {
          from: "admins",
          localField: "approvedBy",
          foreignField: "_id",
          as: "adminDetails",
          pipeline: [{ $project: { _id: 0, name: 1 } }],
        },
      },
      {
        $lookup: {
          from: "departments",
          localField: "department",
          foreignField: "_id",
          as: "departmentDetails",
          pipeline: [{ $project: { _id: 0, name: 1 } }],
        },
      },
      {
        $lookup: {
          from: "erp-project-locations",
          localField: "storeLocation",
          foreignField: "_id",
          as: "storeLocationDetails",
          pipeline: [{ $project: { _id: 0, name: 1 } }],
        },
      },
      {
        $lookup: {
          from: "erp-planner-drawings",
          localField: "drawing_id",
          foreignField: "_id",
          as: "drawingDetails",
          pipeline: [{ $project: { _id: 0, drawing_no: 1 } }],
        },
      },
      {
        $lookup: {
          from: "store_transaction_items",
          localField: "_id",
          foreignField: "requestId",
          as: "transItemDetails",
          pipeline: [
            {
              $match: filter1,
            },
            // {
            //   $lookup: {
            //     from: "store-parties",
            //     localField: "preffered_supplier",
            //     foreignField: "_id",
            //     as: "partyDetails",
            //     pipeline: [{ $project: { _id: 0, name: 1 } }],
            //   },
            // },
            {
              $lookup: {
                from: "store-parties",
                localField: "preffered_supplier.supId",
                foreignField: "_id",
                as: "preferred_supplier_details",
                pipeline: [
                  {
                    $project: {
                      _id: 0,
                      name: 1
                    }
                  }
                ]
              }
            },
            {
              $lookup: {
                from: "store-parties",
                localField: "main_supplier",
                foreignField: "_id",
                as: "main_supplierDetails",
                pipeline: [{ $project: { _id: 0, name: 1 } }],
              },
            },
            {
              $lookup: {
                from: "store-items",
                localField: "itemName",
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
                    $project: {
                      _id: 1,
                      name: 1,
                      "unitDetails.name": 1,
                      mcode: 1,
                      quantity: 1,
                      store_type: 1,
                      material_grade: 1,
                      tag: 1,
                      unit_rate: 1,
                      total_rate: 1,
                      store_type: 1,
                    },
                  },
                ],
              },
            },
            {
              $unwind: {
                path: "$itemDetails",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                item_name: "$itemDetails.name",
                unit: { $arrayElemAt: ["$itemDetails.unitDetails.name", 0] },
                mcode: "$itemDetails.mcode",
                material_grade: "$itemDetails.material_grade",
                quantity: 1,
                store_type: 1,
                tag: 1,
                unit_rate: 1,
                total_rate: 1,
                store_type: 1,
                remarks: { $ifNull: ["$remarks", ""] },
                // preferred_supplier: {
                //   $arrayElemAt: ["$partyDetails.name", 0],
                preferred_supplier: {
                  $cond: {
                    if: { $isArray: "$preferred_supplier_details" },
                    then: {
                      $map: {
                        input: "$preferred_supplier_details",
                        as: "supplier",
                        in: "$$supplier.name"
                      }
                    },
                    else: []
                  }
                },
                main_supplier: { $arrayElemAt: ["$main_supplierDetails.name", 0] },
              },
            },
          ],
        },
      },
      {
        $project: {
          _id: 1,
          requestDate: 1,
          material_po_no: 1,
          requestNo: 1,
          prepared_by: { $arrayElemAt: ["$prepareDetails.user_name", 0] },
          approved_by: { $arrayElemAt: ["$adminDetails.name", 0] },
          project_location: { $arrayElemAt: ["$projectDetails.location", 0] },
          project: { $arrayElemAt: ["$projectDetails.name", 0] },
          department: { $arrayElemAt: ["$departmentDetails.name", 0] },
          storeLocation: { $arrayElemAt: ["$storeLocationDetails.name", 0] },
          main_supplier: 1,
          drawing_id: {
            $ifNull: [
              { $arrayElemAt: ["$drawingDetails.drawing_no", 0] },
              null,
            ],
          },
          item_details: "$transItemDetails",
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

const getOneMaterialOffer = async (requestId, offer_no) => {
  try {
    const filter = {
      deleted: false,
      _id: new ObjectId(requestId),
    };

    const requestData = await RequestModal.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "bussiness-projects",
          localField: "project",
          foreignField: "_id",
          as: "projectDetails",
          pipeline: [
            { $project: { _id: 0, name: 1, work_order_no: 1, party: 1 } },
          ],
        },
      },
      { $unwind: "$projectDetails" },
      {
        $lookup: {
          from: "store-parties",
          localField: "projectDetails.party",
          foreignField: "_id",
          as: "partyDetails",
        },
      },
      { $unwind: "$partyDetails" },
      {
        $lookup: {
          from: "erp-purchase-offers",
          let: { requestId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$requestId", "$$requestId"] },
                    { $eq: ["$offer_no", offer_no] },
                    { $eq: ["$deleted", false] },
                  ],
                },
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "offeredBy",
                foreignField: "_id",
                as: "offerDetails",
                pipeline: [
                  { $project: { _id: 0, user_name: "$user_name" } },
                ],
              },
            },
            { $unwind: "$offerDetails" },
            { $unwind: "$items" },
            {
              $lookup: {
                from: "store_transaction_items",
                let: { transactionId: "$items.transactionId" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$_id", "$$transactionId"] },
                    },
                  },
                  {
                    $project: {
                      _id: 0,
                      transaction_quantity: "$quantity",
                      item_name: "$itemName",
                      preffered_supplier: 1,
                      main_supplier: 1,
                    },
                  },
                ],
                as: "transactionDetails",
              },
            },
            { $unwind: "$transactionDetails" },
            {
              $lookup: {
                from: "store-item-units",
                let: { offeruomId: "$items.offer_uom" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$_id", "$$offeruomId"] },
                    },
                  },
                  {
                    $project: {
                      _id: 0,
                      offer_uom: "$name",
                    },
                  },
                ],
                as: "offerUomDetails",
              },
            },
            { $unwind: "$offerUomDetails" },
            {
              $lookup: {
                from: "store-parties",
                let: { mainSupplierId: "$transactionDetails.main_supplier" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$_id", "$$mainSupplierId"] },
                    },
                  },
                  {
                    $project: {
                      _id: 0,
                      main_supplier: "$name",
                    },
                  },
                ],
                as: "mainSupplierDetails",
              },
            },
            { $unwind: "$mainSupplierDetails" },
            {
              $lookup: {
                from: "store-items",
                let: { itemName: "$transactionDetails.item_name" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$_id", "$$itemName"] },
                    },
                  },
                  {
                    $project: {
                      _id: 0,
                      item_name: "$name",
                      item_detail: "$detail",
                      material_grade: "$material_grade",
                      unit: 1,
                      mcode: 1,
                    },
                  },
                ],
                as: "itemDetails",
              },
            },
            { $unwind: "$itemDetails" },
            {
              $lookup: {
                from: "store-item-units",
                let: { unitId: "$itemDetails.unit" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$_id", "$$unitId"] },
                    },
                  },
                  {
                    $project: {
                      _id: 0,
                      unit_name: "$name",
                    },
                  },
                ],
                as: "unitDetails",
              },
            },
            { $unwind: "$unitDetails" },
            {
              $lookup: {
                from: "store-parties",
                let: { manfId: "$items.manufacture" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$_id", "$$manfId"] },
                    },
                  },
                  {
                    $project: {
                      _id: 0,
                      manufacture: "$name",
                    },
                  },
                ],
                as: "manfDetails",
              },
            },
            { $unwind: "$manfDetails" },
            {
              $project: {
                _id: 0,
                offer_no: "$offer_no",
                invoice_no: "$invoice_no",
                offer_by_date: "$createdAt",
                received_date: "$received_date",
                offeredQty: "$items.offeredQty",
                offerNos: "$items.offerNos",
                offerLength: "$items.offerLength",
                offerWidth: "$items.offerWidth",
                thick_tb: "$items.offer_topbottom_thickness",
                thick_w: "$items.offer_width_thickness",
                thick_n: "$items.offer_normal_thickness",
                lotNo: "$items.lotNo",
                manufacturer: "$manfDetails.manufacture",
                remarks: "$items.remarks",
                offer_uom: "$offerUomDetails.offer_uom",
                challan_qty: "$items.challan_qty",
                po_quantity: "$transactionDetails.transaction_quantity",
                item_name: "$itemDetails.item_name",
                item_detail: "$itemDetails.item_detail",
                material_grade: "$itemDetails.material_grade",
                mcode: "$itemDetails.mcode",
                uom: "$unitDetails.unit_name",
                main_supplier: "$mainSupplierDetails.main_supplier",
                party_address: "$partyDetails.party_address",
                offer_name: "$offerDetails.user_name",
              },
            },
          ],
          as: "purchaseOfferDetails",
        },
      },
      {
        $addFields: {
          offer_no: { $arrayElemAt: ["$purchaseOfferDetails.offer_no", 0] },
          invoice_no: { $arrayElemAt: ["$purchaseOfferDetails.invoice_no", 0] },
          offer_by_date: { $arrayElemAt: ["$purchaseOfferDetails.offer_by_date", 0] },
          offer_name: { $arrayElemAt: ["$purchaseOfferDetails.offer_name", 0] },
          received_date: {
            $arrayElemAt: ["$purchaseOfferDetails.received_date", 0],
          },
          purchaseOfferDetails: {
            $map: {
              input: "$purchaseOfferDetails",
              as: "offerDetail",
              in: {
                $mergeObjects: [
                  "$$offerDetail",
                  { material_po_no: "$material_po_no" },
                ],
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          client: "$partyDetails.name",
          wo_no: "$projectDetails.work_order_no",
          project_name: "$projectDetails.name",
          offer_no: 1,
          invoice_no: 1,
          received_date: 1,
          offer_name: 1,
          offer_by_date: 1,
          purchaseOfferDetails: 1,
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

// const getOneMaterialInspaction = async (requestId, imir_no) => {
//   try {
//     const filter = {
//       deleted: false,
//       _id: new ObjectId(requestId),
//     };

//     const requestData = await RequestModal.aggregate([
//       { $match: filter },
//       {
//         $lookup: {
//           from: "bussiness-projects",
//           localField: "project",
//           foreignField: "_id",
//           as: "projectDetails",
//           pipeline: [
//             { $project: { _id: 0, name: 1, work_order_no: 1, party: 1 } },
//           ],
//         },
//       },
//       { $unwind: "$projectDetails" },
//       {
//         $lookup: {
//           from: "store-parties",
//           localField: "projectDetails.party",
//           foreignField: "_id",
//           as: "partyDetails",
//         },
//       },
//       { $unwind: "$partyDetails" },
//       {
//         $lookup: {
//           from: "erp-purchase-offers",
//           let: { requestId: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ["$requestId", "$$requestId"] },
//                     { $eq: ["$imir_no", imir_no] },
//                     { $eq: ["$deleted", false] },
//                   ],
//                 },
//               },
//             },
//             {
//               $lookup: {
//                 from: "users",
//                 localField: "acceptedBy",
//                 foreignField: "_id",
//                 as: "acceptDetails",
//                 pipeline: [{ $project: { _id: 0, user_name: "$user_name", signature: "$signature" } }],
//               },
//             },
//            {
//               $unwind: {
//                 path: "$acceptDetails",
//                 preserveNullAndEmptyArrays: true,
//               },
//             },
//             /* Client User */
//             {
//               $lookup: {
//                 from: "users",
//                 localField: "client_user",
//                 foreignField: "_id",
//                 as: "clientUserDetails",
//                 pipeline: [
//                   { $project: { _id: 0, user_name: 1, signature: 1 } },
//                 ],
//               },
//             },
//             {
//               $unwind: {
//                 path: "$clientUserDetails",
//                 preserveNullAndEmptyArrays: true,
//               },
//             },
//             { $unwind: "$items" },
//             {
//               $lookup: {
//                 from: "store-parties",
//                 let: { manufactureId: "$items.manufacture" },
//                 pipeline: [
//                   {
//                     $match: {
//                       $expr: { $eq: ["$_id", "$$manufactureId"] },
//                     },
//                   },
//                   {
//                     $project: {
//                       _id: 0,
//                       manufacture: "$name",
//                     },
//                   },
//                 ],
//                 as: "manufactureDetails",
//               },
//             },
//             { $unwind: "$manufactureDetails" },
//             {
//               $lookup: {
//                 from: "store_transaction_items",
//                 let: { transactionId: "$items.transactionId" },
//                 pipeline: [
//                   {
//                     $match: {
//                       $expr: { $eq: ["$_id", "$$transactionId"] },
//                     },
//                   },
//                   {
//                     $project: {
//                       _id: 0,
//                       item_name: "$itemName",
//                       preffered_supplier: 1,
//                       main_supplier: 1,
//                       remarks: 1,
//                     },
//                   },
//                 ],
//                 as: "transactionDetails",
//               },
//             },
//             { $unwind: "$transactionDetails" },
//             {
//               $lookup: {
//                 from: "store-item-units",
//                 let: { offeruomId: "$items.offer_uom" },
//                 pipeline: [
//                   {
//                     $match: {
//                       $expr: { $eq: ["$_id", "$$offeruomId"] },
//                     },
//                   },
//                   {
//                     $project: {
//                       _id: 0,
//                       offer_uom: "$name",
//                     },
//                   },
//                 ],
//                 as: "offerUomDetails",
//               },
//             },
//             { $unwind: "$offerUomDetails" },

//             {
//               $lookup: {
//                 from: "store-parties",
//                 let: { supplierIds: "$transactionDetails.preffered_supplier" },
//                 pipeline: [
//                   {
//                     $match: {
//                       $expr: {
//                         $in: [
//                           "$_id",
//                           {
//                             $map: {
//                               input: "$$supplierIds",
//                               as: "supplier",
//                               in: "$$supplier.supId",
//                             },
//                           },
//                         ],
//                       },
//                     },
//                   },
//                   {
//                     $project: {
//                       _id: 0,
//                       party_name: "$name",
//                       party_address: "$address",
//                     },
//                   },
//                 ],
//                 as: "supplierDetails",
//               },
//             },
//             {
//               $lookup: {
//                 from: "store-parties",
//                 let: { mainSupplierId: "$transactionDetails.main_supplier" },
//                 pipeline: [
//                   {
//                     $match: {
//                       $expr: { $eq: ["$_id", "$$mainSupplierId"] },
//                     },
//                   },
//                   {
//                     $project: {
//                       _id: 0,
//                       main_supplier_name: "$name",
//                     },
//                   },
//                 ],
//                 as: "mainSupplierDetails",
//               },
//             },
//             { $unwind: "$mainSupplierDetails" },
//             {
//               $lookup: {
//                 from: "store-items",
//                 let: { itemName: "$transactionDetails.item_name" },
//                 pipeline: [
//                   {
//                     $match: {
//                       $expr: { $eq: ["$_id", "$$itemName"] },
//                     },
//                   },
//                   {
//                     $project: {
//                       _id: 0,
//                       item_name: "$name",
//                       item_detail: "$detail",
//                       material_grade: "$material_grade",
//                     },
//                   },
//                 ],
//                 as: "itemDetails",
//               },
//             },
//             { $unwind: "$itemDetails" },
//             {
//               $project: {
//                 _id: 0,
//                 imir_no: 1,
//                 received_date: 1,
//                 invoice_no: 1,
//                 status: 1,
//                 qc_date: 1,
//                 send_qc_time: 1,
//                 client_status: 1,
//                 client_date: 1,
//                 client_user_name: "$clientUserDetails.user_name",
//                 client_user_signature: "$clientUserDetails.signature",
//                 offer_no: "$offer_no",
//                 offeredQty: "$items.offeredQty",
//                 offerNos: "$items.offerNos",
//                 offerLength: "$items.offerLength",
//                 offerWidth: "$items.offerWidth",
//                 offer_topbottom_thickness: "$items.offer_topbottom_thickness",
//                 offer_width_thickness: "$items.offer_width_thickness",
//                 offer_normal_thickness: "$items.offer_normal_thickness",
//                 lotNo: "$items.lotNo",
//                 remarks: "$items.acceptedRemarks",
//                 offer_uom: "$offerUomDetails.offer_uom",
//                 inspected_length: "$items.acceptedLength",
//                 inspected_width: "$items.acceptedWidth",
//                 inspected_nos: "$items.acceptedNos",
//                 acceptedQty: "$items.acceptedQty",
//                 accepted_topbottom_thickness:
//                   "$items.accepted_topbottom_thickness",
//                 accepted_width_thickness: "$items.accepted_width_thickness",
//                 accepted_normal_thickness: "$items.accepted_normal_thickness",
//                 accepted_lot_no: "$items.accepted_lot_no",
//                 tc_no: "$items.tcNo",
//                 heat_no_data: "$items.heat_no_data",
//                 item_name: "$itemDetails.item_name",
//                 item_detail: "$itemDetails.item_detail",
//                 material_grade: "$itemDetails.material_grade",
//                 item_selected: "$items.selected",
//                 supplier: "$supplierDetails.party_name",
//                 main_supplier_name: "$mainSupplierDetails.main_supplier_name",
//                 manufacture: "$manufactureDetails.manufacture",
//                 party_address: "$supplierDetails.party_address",
//                 accept_name: "$acceptDetails.user_name",
//                 accept_signature: "$acceptDetails.signature",
//                 qcStatus: "$items.qcStatus",
//               },
//             },
//           ],
//           as: "purchaseOfferDetails",
//         },
//       },
//       {
//         $addFields: {
//           purchaseOfferDetails: {
//             $map: {
//               input: "$purchaseOfferDetails",
//               as: "offerDetail",
//               in: {
//                 $mergeObjects: [
//                   "$$offerDetail",
//                   {
//                     material_po_no: "$material_po_no",
//                     acc_rej: {
//                       $switch: {
//                         branches: [
//                           {
//                             case: { $eq: ["$$offerDetail.status", 1] },
//                             then: "PEN",
//                           },
//                           {
//                             case: { $eq: ["$$offerDetail.status", 2] },
//                             then: "INS",
//                           },
//                           {
//                             case: { $eq: ["$$offerDetail.status", 3] },
//                             then: "ACC",
//                           },
//                           {
//                             case: { $eq: ["$$offerDetail.status", 4] },
//                             then: "REJ",
//                           },
//                           {
//                             case: { $eq: ["$$offerDetail.status", 5] },
//                             then: "ACC",
//                           },
//                         ],
//                         default: "--",
//                       },
//                     },
//                   },
//                 ],
//               },
//             },
//           },
//         },
//       },

//       {
//         $project: {
//           _id: 0,
//           client: "$partyDetails.name",
//           client_user_name: {
//             $arrayElemAt: ["$purchaseOfferDetails.client_user_name", 0],
//           },
//           client_user_signature: {
//             $arrayElemAt: ["$purchaseOfferDetails.client_user_signature", 0],
//           },
//           client_status: {
//             $arrayElemAt: ["$purchaseOfferDetails.client_status", 0],
//           },
//           client_date: {
//             $arrayElemAt: ["$purchaseOfferDetails.client_date", 0],
//           },
//           wo_no: "$projectDetails.work_order_no",
//           project_name: "$projectDetails.name",
//           imir_no: { $arrayElemAt: ["$purchaseOfferDetails.imir_no", 0] },
//           received_date: {
//             $arrayElemAt: ["$purchaseOfferDetails.received_date", 0],
//           },
//           qc_date: { $arrayElemAt: ["$purchaseOfferDetails.qc_date", 0] },
//           send_qc_time: {
//             $arrayElemAt: ["$purchaseOfferDetails.send_qc_time", 0],
//           },
//           accept_name: {
//             $arrayElemAt: ["$purchaseOfferDetails.accept_name", 0],
//           },
//           accept_signature: {
//             $arrayElemAt: ["$purchaseOfferDetails.accept_signature", 0],
//           },
//           invoice_no: { $arrayElemAt: ["$purchaseOfferDetails.invoice_no", 0] },
//           purchaseOfferDetails: 1,
//         },
//       },
//     ]);

//     if (requestData.length && requestData.length > 0) {
//       return { status: 1, result: requestData };
//     } else {
//       return { status: 0, result: [] };
//     }
//   } catch (error) {
//     return { status: 2, result: error };
//   }
// };

// const getOneMaterialInspaction = async (requestId, imir_no) => {
//   try {
//     const filter = {
//       deleted: false,
//       _id: new ObjectId(requestId),
//     };

//     const requestData = await RequestModal.aggregate([
//       { $match: filter },

//       {
//         $lookup: {
//           from: "bussiness-projects",
//           localField: "project",
//           foreignField: "_id",
//           as: "projectDetails",
//           pipeline: [
//             { $project: { _id: 0, name: 1, work_order_no: 1, party: 1 } },
//           ],
//         },
//       },
//       { $unwind: "$projectDetails" },

//       {
//         $lookup: {
//           from: "store-parties",
//           localField: "projectDetails.party",
//           foreignField: "_id",
//           as: "partyDetails",
//         },
//       },
//       { $unwind: "$partyDetails" },

//       {
//         $lookup: {
//           from: "erp-purchase-offers",
//           let: { requestId: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ["$requestId", "$$requestId"] },
//                     { $eq: ["$imir_no", imir_no] },
//                     { $eq: ["$deleted", false] },
//                   ],
//                 },
//               },
//             },

//             /* Accepted By */
//             {
//               $lookup: {
//                 from: "users",
//                 localField: "acceptedBy",
//                 foreignField: "_id",
//                 as: "acceptDetails",
//                 pipeline: [
//                   { $project: { _id: 0, user_name: 1, signature: 1 } },
//                 ],
//               },
//             },
//             {
//               $unwind: {
//                 path: "$acceptDetails",
//                 preserveNullAndEmptyArrays: true,
//               },
//             },

//             /* Client User */
//             {
//               $lookup: {
//                 from: "users",
//                 localField: "client_user",
//                 foreignField: "_id",
//                 as: "clientUserDetails",
//                 pipeline: [
//                   { $project: { _id: 0, user_name: 1, signature: 1 } },
//                 ],
//               },
//             },
//             {
//               $unwind: {
//                 path: "$clientUserDetails",
//                 preserveNullAndEmptyArrays: true,
//               },
//             },

//             { $unwind: "$items" },

//             /* Manufacture */
//             {
//               $lookup: {
//                 from: "store-parties",
//                 let: { manufactureId: "$items.manufacture" },
//                 pipeline: [
//                   { $match: { $expr: { $eq: ["$_id", "$$manufactureId"] } } },
//                   { $project: { _id: 0, manufacture: "$name" } },
//                 ],
//                 as: "manufactureDetails",
//               },
//             },
//             { $unwind: "$manufactureDetails" },

//             /* Transaction Item */
//             {
//               $lookup: {
//                 from: "store_transaction_items",
//                 let: { transactionId: "$items.transactionId" },
//                 pipeline: [
//                   { $match: { $expr: { $eq: ["$_id", "$$transactionId"] } } },
//                   {
//                     $project: {
//                       _id: 0,
//                       item_name: "$itemName",
//                       preffered_supplier: 1,
//                       main_supplier: 1,
//                       remarks: 1,
//                     },
//                   },
//                 ],
//                 as: "transactionDetails",
//               },
//             },
//             { $unwind: "$transactionDetails" },

//             /* Item */
//             {
//               $lookup: {
//                 from: "store-items",
//                 let: { itemName: "$transactionDetails.item_name" },
//                 pipeline: [
//                   { $match: { $expr: { $eq: ["$_id", "$$itemName"] } } },
//                   {
//                     $project: {
//                       _id: 0,
//                       item_name: "$name",
//                       item_detail: "$detail",
//                       material_grade: "$material_grade",
//                     },
//                   },
//                 ],
//                 as: "itemDetails",
//               },
//             },
//             { $unwind: "$itemDetails" },

//             /* Final Projection */
//             {
//               $project: {
//                 _id: 0,
//                 imir_no: 1,
//                 received_date: 1,
//                 invoice_no: 1,
//                 status: 1,
//                 qc_date: 1,
//                 send_qc_time: 1,

//                 client_status: 1,
//                 client_date: 1,
//                 status_type: 1,
//                 client_user_name: "$clientUserDetails.user_name",
//                 client_user_signature: "$clientUserDetails.signature",

//                 accept_name: "$acceptDetails.user_name",
//                 accept_signature: "$acceptDetails.signature",

//                 offeredQty: "$items.offeredQty",
//                 acceptedQty: "$items.acceptedQty",
//                 lotNo: "$items.lotNo",
//                 qcStatus: "$items.qcStatus",

//                 item_name: "$itemDetails.item_name",
//                 item_detail: "$itemDetails.item_detail",
//                 material_grade: "$itemDetails.material_grade",

//                 manufacture: "$manufactureDetails.manufacture",
//               },
//             },
//           ],
//           as: "purchaseOfferDetails",
//         },
//       },

//       {
//         $project: {
//           _id: 0,
//           client: "$partyDetails.name",
//           wo_no: "$projectDetails.work_order_no",
//           project_name: "$projectDetails.name",

//           imir_no: { $arrayElemAt: ["$purchaseOfferDetails.imir_no", 0] },
//           received_date: {
//             $arrayElemAt: ["$purchaseOfferDetails.received_date", 0],
//           },
//           qc_date: { $arrayElemAt: ["$purchaseOfferDetails.qc_date", 0] },
          
//           accept_name: {
//             $arrayElemAt: ["$purchaseOfferDetails.accept_name", 0],
//           },
//           accept_signature: {
//             $arrayElemAt: ["$purchaseOfferDetails.accept_signature", 0],
//           },
//           status_type: { $arrayElemAt: ["$purchaseOfferDetails.status_type", 0] },

//           client_user_name: {
//             $arrayElemAt: ["$purchaseOfferDetails.client_user_name", 0],
//           },
//           client_user_signature: {
//             $arrayElemAt: ["$purchaseOfferDetails.client_user_signature", 0],
//           },
//           client_status: {
//             $arrayElemAt: ["$purchaseOfferDetails.client_status", 0],
//           },
//           client_date: {
//             $arrayElemAt: ["$purchaseOfferDetails.client_date", 0],
//           },

//           purchaseOfferDetails: 1,
//         },
//       },
//     ]);

//     return requestData.length
//       ? { status: 1, result: requestData }
//       : { status: 0, result: [] };

//   } catch (error) {
//     return { status: 2, result: error };
//   }
// };


const getOneMaterialInspaction = async (requestId, imir_no) => {
  try {
    const filter = {
      deleted: false,
      _id: new ObjectId(requestId),
    };

    const requestData = await RequestModal.aggregate([
      { $match: filter },

      {
        $lookup: {
          from: "bussiness-projects",
          localField: "project",
          foreignField: "_id",
          as: "projectDetails",
          pipeline: [
            { $project: { _id: 0, name: 1, work_order_no: 1, party: 1 } },
          ],
        },
      },
      { $unwind: "$projectDetails" },

      {
        $lookup: {
          from: "store-parties",
          localField: "projectDetails.party",
          foreignField: "_id",
          as: "partyDetails",
        },
      },
      { $unwind: "$partyDetails" },

      {
        $lookup: {
          from: "erp-purchase-offers",
          let: { requestId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$requestId", "$$requestId"] },
                    { $eq: ["$imir_no", imir_no] },
                    { $eq: ["$deleted", false] },
                  ],
                },
              },
            },

            /* Accepted By User Details */
            {
              $lookup: {
                from: "users",
                localField: "acceptedBy",
                foreignField: "_id",
                as: "acceptDetails",
                pipeline: [{ $project: { _id: 0, user_name: 1, signature: 1 } }],
              },
            },
            {
              $unwind: {
                path: "$acceptDetails",
                preserveNullAndEmptyArrays: true,
              },
            },

            /* Client User Details */
            {
              $lookup: {
                from: "users",
                localField: "client_user",
                foreignField: "_id",
                as: "clientUserDetails",
                pipeline: [{ $project: { _id: 0, user_name: 1, signature: 1 } }],
              },
            },
            {
              $unwind: {
                path: "$clientUserDetails",
                preserveNullAndEmptyArrays: true,
              },
            },

            { $unwind: "$items" },

            /* Manufacture Details */
            {
              $lookup: {
                from: "store-parties",
                let: { manufactureId: "$items.manufacture" },
                pipeline: [
                  { $match: { $expr: { $eq: ["$_id", "$$manufactureId"] } } },
                  { $project: { _id: 0, manufacture: "$name" } },
                ],
                as: "manufactureDetails",
              },
            },
            { $unwind: "$manufactureDetails" },

            /* Transaction Item Details */
            {
              $lookup: {
                from: "store_transaction_items",
                let: { transactionId: "$items.transactionId" },
                pipeline: [
                  { $match: { $expr: { $eq: ["$_id", "$$transactionId"] } } },
                  {
                    $project: {
                      _id: 0,
                      item_name: "$itemName",
                      preffered_supplier: 1,
                      main_supplier: 1,
                      remarks: 1,
                      section_details: 1, // assuming section details here
                    },
                  },
                ],
                as: "transactionDetails",
              },
            },
            { $unwind: "$transactionDetails" },

            /* Supplier Details - for preferred suppliers */
            {
              $lookup: {
                from: "store-parties",
                let: { supplierIds: "$transactionDetails.preffered_supplier" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $in: [
                          "$_id",
                          {
                            $map: {
                              input: "$$supplierIds",
                              as: "supplier",
                              in: "$$supplier.supId",
                            },
                          },
                        ],
                      },
                    },
                  },
                  {
                    $project: {
                      _id: 0,
                      party_name: "$name",
                      party_address: "$address",
                    },
                  },
                ],
                as: "supplierDetails",
              },
            },

            /* Main Supplier Details */
            {
              $lookup: {
                from: "store-parties",
                let: { mainSupplierId: "$transactionDetails.main_supplier" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$_id", "$$mainSupplierId"] },
                    },
                  },
                  {
                    $project: {
                      _id: 0,
                      main_supplier_name: "$name",
                    },
                  },
                ],
                as: "mainSupplierDetails",
              },
            },
            { $unwind: "$mainSupplierDetails" },

            /* Item Details */
            {
              $lookup: {
                from: "store-items",
                let: { itemName: "$transactionDetails.item_name" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$_id", "$$itemName"] },
                    },
                  },
                  {
                    $project: {
                      _id: 0,
                      item_name: "$name",
                      item_detail: "$detail",
                      material_grade: "$material_grade",
                    },
                  },
                ],
                as: "itemDetails",
              },
            },
            { $unwind: "$itemDetails" },
            /* Final Projection */
            {
              $project: {
                _id: 0,
                imir_no: 1,
                received_date: 1,
                invoice_no: 1,
                material_po_no: 1,
                status: 1,
                qc_date: 1,
                send_qc_time: 1,

                client_status: 1,
                client_date: 1,
                status_type: 1,
                selected: "$items.selected",
                client_user_name: "$clientUserDetails.user_name",
                client_user_signature: "$clientUserDetails.signature",

                accept_name: "$acceptDetails.user_name",
                accept_signature: "$acceptDetails.signature",

                offeredQty: "$items.offeredQty",
                acceptedQty: "$items.acceptedQty",
                lotNo: "$items.lotNo",
                qcStatus: "$items.qcStatus",
                heat_no_data: "$items.heat_no_data", // heat/lot no

                inspected_nos: "$items.acceptedNos",
                inspected_length: "$items.acceptedLength",
                inspected_width: "$items.acceptedWidth",

                tc_no: "$items.tcNo",

                remarks: "$items.acceptedRemarks",

                acc_rej: 1,

                section_details: "$transactionDetails.section_details",

                item_name: "$itemDetails.item_name",
                item_detail: "$itemDetails.item_detail",
                material_grade: "$itemDetails.material_grade",

                supplier: { $arrayElemAt: ["$supplierDetails.party_name", 0] },
                main_supplier_name: "$mainSupplierDetails.main_supplier_name",
                manufacture: "$manufactureDetails.manufacture",
                party_address: { $arrayElemAt: ["$supplierDetails.party_address", 0] },
              },
            },
          ],
          as: "purchaseOfferDetails",
        },
      },
      {
        $addFields: {
          purchaseOfferDetails: {
            $map: {
              input: "$purchaseOfferDetails",
              as: "offerDetail",
              in: {
                $mergeObjects: [
                  "$$offerDetail",
                  {
                    material_po_no: "$material_po_no",
                    acc_rej: {
                      $switch: {
                        branches: [
                          {
                            case: { $eq: ["$$offerDetail.status", 1] },
                            then: "PEN",
                          },
                          {
                            case: { $eq: ["$$offerDetail.status", 2] },
                            then: "INS",
                          },
                          {
                            case: { $eq: ["$$offerDetail.status", 3] },
                            then: "ACC",
                          },
                          {
                            case: { $eq: ["$$offerDetail.status", 4] },
                            then: "REJ",
                          },
                          {
                            case: { $eq: ["$$offerDetail.status", 5] },
                            then: "ACC",
                          },
                        ],
                        default: "--",
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          client: "$partyDetails.name",
          wo_no: "$projectDetails.work_order_no",
          project_name: "$projectDetails.name",

          imir_no: { $arrayElemAt: ["$purchaseOfferDetails.imir_no", 0] },
          received_date: { $arrayElemAt: ["$purchaseOfferDetails.received_date", 0] },
          qc_date: { $arrayElemAt: ["$purchaseOfferDetails.qc_date", 0] },

          accept_name: { $arrayElemAt: ["$purchaseOfferDetails.accept_name", 0] },
          accept_signature: { $arrayElemAt: ["$purchaseOfferDetails.accept_signature", 0] },
          status_type: { $arrayElemAt: ["$purchaseOfferDetails.status_type", 0] },
          send_qc_time: {
            $arrayElemAt: ["$purchaseOfferDetails.send_qc_time", 0],
          },
          client_user_name: { $arrayElemAt: ["$purchaseOfferDetails.client_user_name", 0] },
          client_user_signature: { $arrayElemAt: ["$purchaseOfferDetails.client_user_signature", 0] },
          client_status: { $arrayElemAt: ["$purchaseOfferDetails.client_status", 0] },
          client_date: { $arrayElemAt: ["$purchaseOfferDetails.client_date", 0] },
          purchaseOfferDetails: 1
        },
      },
    ]);

    return requestData.length
      ? { status: 1, result: requestData }
      : { status: 0, result: [] };

  } catch (error) {
    return { status: 2, result: error };
  }
};




exports.getStoreRequest = async (req, res) => {
  const { tag } = req.body;

  if (req.user && !req.err) {
    try {
      const filter = { deleted: false, tag };
      const data = await RequestModal.find(filter, { deleted: 0 })
        .sort({ createdAt: -1 })
        .populate({
          path: "project",
          select: "name party work_order_no",
          populate: {
            path: "party",
            select: "name",
          },
        })
        .populate("approvedBy", "name")
        .populate("preparedBy", "user_name")
        .populate("department", "name")
        .populate("firm_id", "name")
        .populate("year_id", "start_year end_year")
        .populate({
          path: "drawing_id",
          select:
            "drawing_no draw_receive_date rev assembly_no status sheet_no unit assembly_quantity drawing_pdf drawing_pdf_name issued_person issued_date",
          populate: {
            path: "issued_person",
            select: "name",
          },
        });
      const finalData = await Promise.all(
        data.map(async (elem) => {
          const items = await TransactionItems.find(
            { deleted: false, requestId: elem._id },
            { deleted: 0 }
          )
            .populate("preffered_supplier", "name email address phone")
            .populate({
              path: "itemName",
              select: "name unit material_grade",
              populate: {
                path: "unit",
                select: "name",
              },
            });

          let drawingObject = null;
          if (elem?.drawing_id !== null) {
            const drawingItems = await TransactionItems.find(
              { deleted: false, drawingId: elem?.drawing_id?._id },
              { deleted: 0, project: 0, createdAt: 0, updatedAt: 0 }
            ).populate("itemName", "name");

            drawingObject = {
              ...elem?.drawing_id.toJSON(),
              items: drawingItems,
            };
          }

          const obj = items.map((i) => ({
            _id: i?.requestId,
            transactionId: i?._id,
            itemName: i?.itemName,
            quantity: i?.quantity,
            balance_qty: i?.balance_qty,
            unit_rate: i?.unit_rate,
            total_rate: i?.total_rate,
            remarks: i?.remarks,
            tag: i?.tag,
            store_type: i?.store_type,
            requestNo: elem?.requestNo,
            requestDate: elem?.requestDate,
            preffered_supplier: i?.preffered_supplier,
            mcode: i?.mcode,
            project: elem?.project,
            drawing_id: drawingObject,
            firm_id: elem?.firm_id,
            year_id: elem?.year_id,
            itemStatus: i?.status,
            storeLocation: elem?.storeLocation,
            material_po_no: elem?.material_po_no,
            department: elem?.department,
            approvedBy: elem?.approvedBy,
            preparedBy: elem?.preparedBy,
            requestStatus: elem?.status,
          }));

          return obj;
        })
      );

      const flattenedFinalData = [].concat(...finalData);

      if (flattenedFinalData) {
        const message =
          parseInt(tag) === OrderTypes["Purchase Order"]
            ? "Purchase Request List"
            : "Sales Request List";
        sendResponse(res, 200, true, flattenedFinalData, message);
      } else {
        const message =
          parseInt(tag) === OrderTypes["Purchase Order"]
            ? "Purchase Request not found"
            : "Sale Request not found";
        sendResponse(res, 200, true, flattenedFinalData, message);
      }
    } catch (err) {
      sendResponse(res, 500, false, {}, "Something went wrong" + err);
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.downloadOneRequestItem = async (req, res) => {
  const { requestId, print_date } = req.body;

  if (req.user && !req.error) {
    try {
      const data = await getOneRequestItem(requestId);
      let requestData = data.result;

      let headerInfo = {
        request_no: '',
        project_name: '',
        project_location: '',
        prepared_by: '',
        material_po_no: '',
        date: '',
        approved_by: '',
        department: '',
        main_supplier: '',
      };

      headerInfo.request_no = requestData[0]?.requestNo;
      headerInfo.project_name = requestData[0]?.project;
      headerInfo.project_location = requestData[0]?.storeLocation;
      headerInfo.prepared_by = requestData[0]?.prepared_by;
      headerInfo.material_po_no = requestData[0]?.material_po_no;
      headerInfo.date = requestData[0]?.requestDate;
      headerInfo.approved_by = requestData[0]?.approved_by;
      headerInfo.department = requestData[0]?.department;
      headerInfo.main_supplier = requestData[0]?.item_details[0]?.main_supplier;

      if (data.status === 1) {
        const template = fs.readFileSync(
          "templates/requestTransItem.html",
          "utf-8"
        );
        const renderedHtml = ejs.render(template, {
          headerInfo: headerInfo,
          logoUrl1: process.env.LOGO_URL_1,
          logoUrl2: process.env.LOGO_URL_2,
          items: requestData[0]?.item_details,
        });

        const browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
          executablePath: PATH,
        });

        const page = await browser.newPage();
        await page.setContent(renderedHtml, { baseUrl: `${URI}` });

        // Use the reusable PDF generation utility
        const pdfBuffer = await generatePDF(page, { print_date });

        await browser.close();

        const pdfsDir = path.join(__dirname, "../../../pdfs");
        if (!fs.existsSync(pdfsDir)) {
          fs.mkdirSync(pdfsDir);
        }

        const filename = `request_item_${Date.now()}.pdf`;
        const filePath = path.join(pdfsDir, filename);

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
        sendResponse(res, 200, false, {}, `Purchase request not found`);
      } else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.xlsxOneRequestItem = async (req, res) => {
  const { requestId, print_date } = req.body;

  if (req.user && !req.error) {
    try {
      const data = await getOneRequestItem(requestId)
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
          font: { bold: true }, alignment: { horizontal: 'center', vertical: 'middle' },
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
          [
            { v: `PURCHASE REQUEST (PR)`, s: headerStyle4 },
            "", "", "",
            print_date ? { v: `Download Date : ${new Date().toLocaleDateString()}`, s: headerStyle4 } : "",
          ],
          [
            { v: `Project Location       : ${requestData[0].project_location}`, s: headerStyle1 },
            "", "", "",
            requestData[0].requestDate ? { v: `Request Date : ${new Date(requestData[0].requestDate).toLocaleDateString()}`, s: headerStyle1 } : "",
          ],
          [
            { v: `Project                      : ${requestData[0].project}`, s: headerStyle1 },
            "", "", "",
            { v: `Prepared By             : ${requestData[0].prepared_by}`, s: headerStyle1 },
          ],
          [
            { v: `Department             : ${requestData[0].department}`, s: headerStyle1 },
            "", "", "",
            { v: `Approved By            : ${requestData[0].approved_by}`, s: headerStyle1 },
          ],
          [
            { v: `Request No.             : ${requestData[0].requestNo}`, s: headerStyle1 },
            "", "", "",
            { v: `Material PO No.       : ${requestData[0].material_po_no}`, s: headerStyle1 },
          ],
        ];

        const headers = [
          { v: "Sr No.", s: headerStyle },
          { v: "Section Details", s: headerStyle },
          { v: "Material Grade", s: headerStyle },
          { v: "UOM", s: headerStyle },
          { v: "PO. Qty.", s: headerStyle },
          { v: "Unit Rate", s: headerStyle },
          { v: "Total Rate", s: headerStyle },
          { v: "Preferred Supplier", s: headerStyle },
        ];

        ws_data.push(headers);

        requestData[0].item_details.forEach((detail, itemIndex) => {
          const row = [
            itemIndex + 1,
            detail.item_name || '--',
            detail.material_grade || '--',
            detail.unit || '--',
            detail.quantity || '--',
            detail.unit_rate || '--',
            detail.total_rate || '--',
            detail.preferred_supplier || '--',
          ];

          ws_data.push(row);
        });
        ws_data.push([]);
        ws_data.push(
          [
            { v: `VE-STR-01`, s: headerStyle1 },
          ]
        );

        const colWidths = ws_data[6].map((_, colIndex) => ({
          wch: Math.max(
            ...ws_data.slice(6, 6 + requestData[0].item_details.length + 1).map(row => (
              row[colIndex]?.toString().length || 0
            ))
          ) + 2,
        }));

        ws = XLSX.utils.aoa_to_sheet(ws_data);
        ws['!cols'] = colWidths;

        ws['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
          { s: { r: 1, c: 4 }, e: { r: 1, c: 7 } },
          { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
          { s: { r: 2, c: 4 }, e: { r: 2, c: 7 } },
          { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } },
          { s: { r: 3, c: 4 }, e: { r: 3, c: 7 } },
          { s: { r: 4, c: 0 }, e: { r: 4, c: 3 } },
          { s: { r: 4, c: 4 }, e: { r: 4, c: 7 } },
          { s: { r: 5, c: 0 }, e: { r: 5, c: 3 } },
          { s: { r: 5, c: 4 }, e: { r: 5, c: 7 } },
          { s: { r: ws_data.length - 1, c: 0 }, e: { r: ws_data.length - 1, c: 7 } },
        ];

        XLSX.utils.book_append_sheet(wb, ws, `Purchase Request`);

        const xlsxPath = path.join(__dirname, '../../../xlsx');

        if (!fs.existsSync(xlsxPath)) {
          fs.mkdirSync(xlsxPath, { recursive: true });
        }

        const filename = `Purchase_request_${Date.now()}.xlsx`;
        const filePath = path.join(xlsxPath, filename);

        await XLSXStyle.writeFile(wb, filePath);


        const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;

        sendResponse(res, 200, true, { file: fileUrl }, `XLSX file generated successfully`)

      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Purchase request not found`)
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

exports.downloadOfferRequestItem = async (req, res) => {
  const { requestId, offer_no, print_date } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await getOneMaterialOffer(requestId, offer_no)
      let requestData = data.result;

      let headerInfo = {
        client: requestData[0]?.client,
        project_name: requestData[0]?.project_name,
        offer_no: requestData[0]?.offer_no,
        wo_no: requestData[0].wo_no,
        received_date: requestData[0].received_date,
        offer_by_date: requestData[0].offer_by_date,
        offer_name: requestData[0].offer_name,
        invoice_no: requestData[0].invoice_no,
      }
      if (data.status === 1) {
        const template = fs.readFileSync(
          "templates/materialOfferItem.html",
          "utf-8"
        );
        const renderedHtml = ejs.render(template, {
          headerInfo,
          items: requestData[0]?.purchaseOfferDetails,
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

        const pdfBuffer = await generatePDF(page, { print_date });

        await browser.close();

        const pdfsDir = path.join(__dirname, "../../../pdfs");
        if (!fs.existsSync(pdfsDir)) {
          fs.mkdirSync(pdfsDir);
        }

        const filename = `material_offer_item_${Date.now()}.pdf`;
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
        sendResponse(res, 200, false, {}, `Material Offer not found`)
      }
      else if (data.status === 2) {
        console.log('gell')
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } catch (error) {
      console.error(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.xlsxOfferRequestItem = async (req, res) => {
  const { requestId, offer_no, print_date } = req.body;

  if (req.user && !req.error) {
    try {
      const data = await getOneMaterialOffer(requestId, offer_no)
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
          [
            { v: `INWARD MATERIAL OFFER LIST`, s: headerStyle4 },
            "", "", "", "", "", "", "",
            print_date ? { v: `Download Date : ${new Date().toLocaleDateString()}`, s: headerStyle4 } : "",
          ],
          [
            { v: `Client                 : ${requestData[0].client}`, s: headerStyle1 },
            "", "", "", "", "", "", "",
            { v: `Project                 : ${requestData[0].project_name}`, s: headerStyle1 },
          ],
          [
            { v: `Offer No.           : ${requestData[0].offer_no}`, s: headerStyle1 },
            "", "", "", "", "", "", "",
            { v: `Po Wo No            : ${requestData[0].wo_no}`, s: headerStyle1 },
          ],
        ];

        const headers = [
          { v: "Sr No.", s: headerStyle },
          { v: "Material PO No.", s: headerStyle },
          { v: "Section Details", s: headerStyle },
          { v: "Material Grade", s: headerStyle },
          { v: "UOM", s: headerStyle },
          { v: "PO. Qty.", s: headerStyle },
          { v: "Supplier", s: headerStyle },
          { v: "Challan Qty.", s: headerStyle },
          { v: "Off. Qty.", s: headerStyle },
          { v: "Rec.Date", s: headerStyle },
          { v: "Off. UOM", s: headerStyle },
          { v: "Off. Len.", s: headerStyle },
          { v: "Off. Wid.", s: headerStyle },
          { v: "Off. Nos", s: headerStyle },
          { v: "Loat No.", s: headerStyle },
          { v: "Remarks", s: headerStyle },
        ];

        ws_data.push(headers);

        requestData[0].purchaseOfferDetails.forEach((detail, itemIndex) => {
          const row = [
            itemIndex + 1,
            detail.material_po_no || '--',
            detail.item_name || '--',
            detail.material_grade || '--',
            detail.uom || '--',
            detail.po_quantity || '--',
            detail.supplier || '--',
            detail.challan_qty || '--',
            detail.offeredQty || '--',
            detail.received_date ? new Date(detail.received_date).toLocaleDateString() : '--',
            detail.offer_uom || '--',
            detail.offerLength || '--',
            detail.offerWidth || '--',
            detail.offerNos || '--',
            detail.lotNo || '--',
            detail.remarks || '--',
          ];

          ws_data.push(row);
        });
        ws_data.push([]);
        ws_data.push(
          [
            { v: `Remarks`, s: headerStyle3 },
          ],
          [
            "", "",
            {
              v: `Offer By`, s: headerStyle4
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
              v: `${requestData[0].offer_by_date ? new Date(requestData[0].offer_by_date).toLocaleDateString() : ''}`, s: headerStyle5
            },
          ],
          [
            { v: `VE-STR-02`, s: headerStyle1 },
          ]
        );

        const colWidths = ws_data[4].map((_, colIndex) => ({
          wch: Math.max(
            ...ws_data.slice(4, 4 + requestData[0].purchaseOfferDetails.length + 1).map(row => (
              row[colIndex]?.toString().length || 0
            ))
          ),
        }));

        ws = XLSX.utils.aoa_to_sheet(ws_data);
        ws['!cols'] = colWidths;

        ws['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 15 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
          { s: { r: 1, c: 8 }, e: { r: 1, c: 15 } },
          { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } },
          { s: { r: 2, c: 8 }, e: { r: 2, c: 15 } },
          { s: { r: 3, c: 0 }, e: { r: 3, c: 7 } },
          { s: { r: 3, c: 8 }, e: { r: 3, c: 15 } },
          { s: { r: ws_data.length - 6, c: 0 }, e: { r: ws_data.length - 6, c: 1 } },
          { s: { r: ws_data.length - 6, c: 2 }, e: { r: ws_data.length - 6, c: 15 } },
          { s: { r: ws_data.length - 5, c: 0 }, e: { r: ws_data.length - 5, c: 1 } },
          { s: { r: ws_data.length - 5, c: 2 }, e: { r: ws_data.length - 5, c: 15 } },
          { s: { r: ws_data.length - 4, c: 0 }, e: { r: ws_data.length - 4, c: 1 } },
          { s: { r: ws_data.length - 4, c: 2 }, e: { r: ws_data.length - 4, c: 15 } },
          { s: { r: ws_data.length - 3, c: 0 }, e: { r: ws_data.length - 3, c: 1 } },
          { s: { r: ws_data.length - 3, c: 2 }, e: { r: ws_data.length - 3, c: 15 } },
          { s: { r: ws_data.length - 2, c: 0 }, e: { r: ws_data.length - 2, c: 1 } },
          { s: { r: ws_data.length - 2, c: 2 }, e: { r: ws_data.length - 2, c: 15 } },
          { s: { r: ws_data.length - 1, c: 0 }, e: { r: ws_data.length - 1, c: 15 } },
        ];

        XLSX.utils.book_append_sheet(wb, ws, `Material Offer`);

        const xlsxPath = path.join(__dirname, '../../../xlsx');

        if (!fs.existsSync(xlsxPath)) {
          fs.mkdirSync(xlsxPath, { recursive: true });
        }

        const filename = `Material_offer_${Date.now()}.xlsx`;
        const filePath = path.join(xlsxPath, filename);

        await XLSXStyle.writeFile(wb, filePath);


        const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;

        sendResponse(res, 200, true, { file: fileUrl }, `XLSX file generated successfully`)

      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Material Offer not found`)
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

exports.downloadMaterialInspactionItem = async (req, res) => {
  const { requestId, imir_no, print_date } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await getOneMaterialInspaction(requestId, imir_no)
      let requestData = data.result;

      const poffDetails = requestData[0]?.purchaseOfferDetails || [];
      

      const filteredData = poffDetails?.filter(item =>
        item.qcStatus !== 3 && item.acceptedQty !== 0
      );

      let headerInfo = {
        client: requestData[0]?.client,
        project_name: requestData[0]?.project_name,
        imir_no: requestData[0]?.imir_no,
        wo_no: requestData[0]?.wo_no,
        send_qc_time: requestData[0]?.send_qc_time,
        accept_name: requestData[0]?.accept_name,
        qc_date: requestData[0]?.received_date,
        invoice_no: requestData[0]?.invoice_no,
      }

      if (data.status === 1) {
        const template = fs.readFileSync(
          "templates/materialInspactionItem.html",
          "utf-8"
        );
        const renderedHtml = ejs.render(template, {
          headerInfo,
          items: filteredData,
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

        const pdfBuffer = await generatePDF(page, { print_date });
        await browser.close();

        const pdfsDir = path.join(__dirname, "../../../pdfs");
        if (!fs.existsSync(pdfsDir)) {
          fs.mkdirSync(pdfsDir);
        }

        const filename = `material_inspaction_item_${Date.now()}.pdf`;
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
        sendResponse(res, 200, false, {}, `Material Inspaction not found`)
      }
      else if (data.status === 2) {
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

exports.xlsxOfferInspactionItem = async (req, res) => {
  const { requestId, imir_no, print_date } = req.body;

  if (req.user && !req.error) {
    try {
      const data = await getOneMaterialInspaction(requestId, imir_no)
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
          [
            { v: `INWARD MATERIAL INSPECTION REPORT (IMIR)`, s: headerStyle4 },
            "", "", "", "", "", "", "",
            print_date ? { v: `Download Date : ${new Date().toLocaleDateString()}`, s: headerStyle4 } : "",
          ],
          [
            { v: `Client                 : ${requestData[0].client}`, s: headerStyle1 },
            "", "", "", "", "", "", "",
            { v: `Project                 : ${requestData[0].project_name}`, s: headerStyle1 },
          ],
          [
            { v: `IMIR No.           : ${requestData[0].imir_no}`, s: headerStyle1 },
            "", "", "", "", "", "", "",
            { v: `Po Wo No            : ${requestData[0].wo_no}`, s: headerStyle1 },
          ],
        ];

        const headers = [
          { v: "Sr No.", s: headerStyle },
          { v: "Material PO No.", s: headerStyle },
          { v: "Section Details", s: headerStyle },
          { v: "Material Grade", s: headerStyle },
          { v: "Off. UOM", s: headerStyle },
          { v: "Off. Len.", s: headerStyle },
          { v: "Off. Wid.", s: headerStyle },
          { v: "Off. Nos", s: headerStyle },
          { v: "Acc. Len.", s: headerStyle },
          { v: "Acc. Wid.", s: headerStyle },
          { v: "Acc. Nos", s: headerStyle },
          { v: "Acc/Rej", s: headerStyle },
          { v: "Manufacture", s: headerStyle },
          { v: "Lot No.", s: headerStyle },
          { v: "Lot No.", s: headerStyle },
          { v: "Remarks", s: headerStyle },
        ];

        ws_data.push(headers);

        requestData[0].purchaseOfferDetails.forEach((detail, itemIndex) => {
          const row = [
            itemIndex + 1,
            detail.material_po_no || '--',
            detail.item_name || '--',
            detail.material_grade || '--',
            detail.offer_uom || '--',
            detail.offerLength || '--',
            detail.offerWidth || '--',
            detail.offerNos || '--',
            detail.inspected_length || '--',
            detail.inspected_width || '--',
            detail.inspected_nos || '--',
            detail.acc_rej || '--',
            detail.supplier || '--',
            detail.lotNo || '--',
            detail.tc_no || '--',
            detail.remarks || '--',
          ];

          ws_data.push(row);
        });
        ws_data.push([]);
        ws_data.push(
          [
            { v: `Remarks`, s: headerStyle3 },
          ],
          [
            "", "",
            {
              v: `VE-QC`, s: headerStyle4
            },
            "", "", "", "", "", "",
            {
              v: `CLIENT-QC / TPI`, s: headerStyle4
            },
          ],
          [
            { v: `Signature`, s: headerStyle3 },
          ],
          [
            { v: `Name`, s: headerStyle3 },
            "",
            {
              v: `${requestData[0].accept_name}`, s: headerStyle5
            },
          ],
          [
            { v: `Date`, s: headerStyle3 },
            "",
            {
              v: `${requestData[0].qc_date ? new Date(requestData[0].qc_date).toLocaleDateString() : ''}`, s: headerStyle5
            },
          ],
          [
            { v: `VE-STR-03`, s: headerStyle1 },
          ]
        );

        const colWidths = ws_data[4].map((_, colIndex) => ({
          wch: Math.max(
            ...ws_data.slice(4, 4 + requestData[0].purchaseOfferDetails.length + 1).map(row => (
              row[colIndex]?.toString().length || 0
            ))
          ),
        }));

        ws = XLSX.utils.aoa_to_sheet(ws_data);
        ws['!cols'] = colWidths;

        ws['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 15 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
          { s: { r: 1, c: 8 }, e: { r: 1, c: 15 } },
          { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } },
          { s: { r: 2, c: 8 }, e: { r: 2, c: 15 } },
          { s: { r: 3, c: 0 }, e: { r: 3, c: 7 } },
          { s: { r: 3, c: 8 }, e: { r: 3, c: 15 } },
          { s: { r: ws_data.length - 6, c: 0 }, e: { r: ws_data.length - 6, c: 1 } },
          { s: { r: ws_data.length - 6, c: 2 }, e: { r: ws_data.length - 6, c: 8 } },
          { s: { r: ws_data.length - 6, c: 9 }, e: { r: ws_data.length - 6, c: 15 } },
          { s: { r: ws_data.length - 5, c: 0 }, e: { r: ws_data.length - 5, c: 1 } },
          { s: { r: ws_data.length - 5, c: 2 }, e: { r: ws_data.length - 5, c: 8 } },
          { s: { r: ws_data.length - 5, c: 9 }, e: { r: ws_data.length - 5, c: 15 } },
          { s: { r: ws_data.length - 4, c: 0 }, e: { r: ws_data.length - 4, c: 1 } },
          { s: { r: ws_data.length - 4, c: 2 }, e: { r: ws_data.length - 4, c: 8 } },
          { s: { r: ws_data.length - 4, c: 9 }, e: { r: ws_data.length - 4, c: 15 } },
          { s: { r: ws_data.length - 3, c: 0 }, e: { r: ws_data.length - 3, c: 1 } },
          { s: { r: ws_data.length - 3, c: 2 }, e: { r: ws_data.length - 3, c: 8 } },
          { s: { r: ws_data.length - 3, c: 9 }, e: { r: ws_data.length - 3, c: 15 } },
          { s: { r: ws_data.length - 2, c: 0 }, e: { r: ws_data.length - 2, c: 1 } },
          { s: { r: ws_data.length - 2, c: 2 }, e: { r: ws_data.length - 2, c: 8 } },
          { s: { r: ws_data.length - 2, c: 9 }, e: { r: ws_data.length - 2, c: 15 } },
          { s: { r: ws_data.length - 1, c: 0 }, e: { r: ws_data.length - 1, c: 15 } },
        ];

        XLSX.utils.book_append_sheet(wb, ws, `Material Inspection`);

        const xlsxPath = path.join(__dirname, '../../../xlsx');

        if (!fs.existsSync(xlsxPath)) {
          fs.mkdirSync(xlsxPath, { recursive: true });
        }

        const filename = `Material_inspection_${Date.now()}.xlsx`;
        const filePath = path.join(xlsxPath, filename);

        await XLSXStyle.writeFile(wb, filePath);


        const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;

        sendResponse(res, 200, true, { file: fileUrl }, `XLSX file generated successfully`)

      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Stock report not found`)
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

// exports.getRequest = async (req, res) => {
//   const { tag, project } = req.body;
// console.log("req.body", req.body);
//   if (req.user && !req.err) {
//     try {
//       const filter = { deleted: false, tag };
//       if (project) {
//         filter.project = project;
//       }
//       const data = await RequestModal.find(filter, { deleted: 0 })
//         .sort({ createdAt: -1 })
//         .populate({
//           path: "project",
//           select: "name party work_order_no",
//           populate: {
//             path: "party",
//             select: "name",
//           },
//         })
//         .populate("approvedBy", "name")
//         .populate("preparedBy", "user_name")
//         .populate("department", "name")
//         .populate("firm_id", "name")
//         .populate('storeLocation', 'name')
//         .populate("year_id", "start_year end_year")
//         .populate({
//           path: "drawing_id",
//           select:
//             "drawing_no draw_receive_date rev assembly_no status sheet_no unit assembly_quantity drawing_pdf drawing_pdf_name issued_person issued_date",
//           populate: {
//             path: "issued_person",
//             select: "name",
//           },
//         });

//       const finalData = await Promise.all(
//         data.map(async (elem) => {
//           const items = await TransactionItems.find(
//             { deleted: false, requestId: elem._id },
//             { deleted: 0, __v: 0 }
//           )
//             .populate("preffered_supplier.supId", "name email address phone")
//             .populate("main_supplier", "name email address phone")
//             .populate({
//               path: "itemName",
//               select: "name",
//               populate: { path: "unit", select: "name" },
//             });

//           let drawingDetails = null;
//           if (elem?.drawing_id !== null) {
//             const drawingItems = await TransactionItems.find(
//               { deleted: false, drawingId: elem?.drawing_id?._id },
//               { deleted: 0 }
//             ).populate("itemName", "name");
//             drawingDetails = {
//               ...elem?.drawing_id.toObject(),
//               items: drawingItems,
//             };
//           }

//           const mergeObjects = {
//             ...elem.toObject(),
//             items,
//             drawing_id: drawingDetails,
//           };

//           return mergeObjects;
//         })
//       );

//       if (finalData) {
//         const message =
//           parseInt(tag) === OrderTypes["Purchase Order"]
//             ? "Purchase Request List"
//             : "Sales Request List";
//         sendResponse(res, 200, true, finalData, message);
//       } else {
//         const message =
//           parseInt(tag) === OrderTypes["Purchase Order"]
//             ? "Purchase Request not found"
//             : "Sale Request not found";
//         sendResponse(res, 200, true, finalData, message);
//       }
//     } catch (err) {
//       sendResponse(res, 500, false, {}, "Something went wrong");
//     }
//   } else {
//     sendResponse(res, 401, false, {}, "Unauthorized");
//   }
// };


exports.getRequest = async (req, res) => {
  const { tag, project, page, limit, search, status } = req.body;

  console.log("req.body", req.body);

  if (req.user && !req.err) {
    try {
      const filter = { deleted: false, tag };

      if (project) {
        filter.project = project;
      }

      if (search && search.trim() !== "") {
        filter.material_po_no = { $regex: search.trim(), $options: "i" };
      }
    
      if (status && status !== "") {
        filter.status = parseInt(status);
      }
      // Count total matching documents
      const totalCount = await RequestModal.countDocuments(filter);

      // Initialize query
      let query = RequestModal.find(filter, { deleted: 0 }).sort({ createdAt: -1 });

      // Apply pagination only if both page and limit are provided and valid
      let skip = 0;
      let limitValue = 0;

      if (page && limit && !isNaN(page) && !isNaN(limit)) {
        skip = (parseInt(page) - 1) * parseInt(limit);
        limitValue = parseInt(limit);
        query = query.skip(skip).limit(limitValue);
      }

      // Populate fields
      const data = await query
        .populate({
          path: "project",
          select: "name party work_order_no",
          populate: {
            path: "party",
            select: "name",
          },
        })
        .populate("approvedBy", "name")
        .populate("preparedBy", "user_name")
        .populate("department", "name")
        .populate("firm_id", "name")
        .populate("storeLocation", "name")
        .populate("year_id", "start_year end_year")
        .populate({
          path: "drawing_id",
          select:
            "drawing_no draw_receive_date rev assembly_no status sheet_no unit assembly_quantity drawing_pdf drawing_pdf_name issued_person issued_date",
          populate: {
            path: "issued_person",
            select: "name",
          },
        });

      // Fetch items and drawing details per request
      const finalData = await Promise.all(
        data.map(async (elem) => {
          const items = await TransactionItems.find(
            { deleted: false, requestId: elem._id },
            { deleted: 0, __v: 0 }
          )
            .populate("preffered_supplier.supId", "name email address phone")
            .populate("main_supplier", "name email address phone")
            .populate({
              path: "itemName",
              select: "name",
              populate: { path: "unit", select: "name" },
            });

          let drawingDetails = null;
          if (elem?.drawing_id !== null) {
            const drawingItems = await TransactionItems.find(
              { deleted: false, drawingId: elem?.drawing_id?._id },
              { deleted: 0 }
            ).populate("itemName", "name");

            drawingDetails = {
              ...elem?.drawing_id.toObject(),
              items: drawingItems,
            };
          }

          return {
            ...elem.toObject(),
            items,
            drawing_id: drawingDetails,
          };
        })
      );

      const message =
        parseInt(tag) === OrderTypes["Purchase Order"]
          ? "Purchase Request List"
          : "Sales Request List";

      // Send response
      sendResponse(res, 200, true, {
        data: finalData,
        pagination: {
          total: totalCount,
          page: page ? parseInt(page) : null,
          limit: limit ? parseInt(limit) : null,
          totalPages:
            page && limit ? Math.ceil(totalCount / parseInt(limit)) : 1,
        },
      }, message);

    } catch (err) {
      console.error(err);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.getRequestStatus = async (req, res) => {
  const { tag, project, page, limit, search, status } = req.body;

  console.log("req.body", req.body);

  if (req.user && !req.err) {
    try {
      const filter = { deleted: false, tag };

      if (project) {
        filter.project = project;
      }

      if (search && search.trim() !== "") {
        filter.material_po_no = { $regex: search.trim(), $options: "i" };
      }
      

      // if (status && status !== "") {
      //   filter.status = parseInt(status);
      // }
      if (status && status !== "") {
        const statusArray = status.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        if (statusArray.length > 0) {
          filter.status = { $in: statusArray };
        }
      } else {
        filter.status = { $nin: [1, 3] };
      }

      
      // Count total matching documents
      const totalCount = await RequestModal.countDocuments(filter);

      // Initialize query
      let query = RequestModal.find(filter, { deleted: 0 }).sort({ createdAt: -1 });

      // Apply pagination only if both page and limit are provided and valid
      let skip = 0;
      let limitValue = 0;

      if (page && limit && !isNaN(page) && !isNaN(limit)) {
        skip = (parseInt(page) - 1) * parseInt(limit);
        limitValue = parseInt(limit);
        query = query.skip(skip).limit(limitValue);
      }

      // Populate fields
      const data = await query
        .populate({
          path: "project",
          select: "name party work_order_no",
          populate: {
            path: "party",
            select: "name",
          },
        })
        .populate("approvedBy", "name")
        .populate("preparedBy", "user_name")
        .populate("department", "name")
        .populate("firm_id", "name")
        .populate("storeLocation", "name")
        .populate("year_id", "start_year end_year")
        .populate({
          path: "drawing_id",
          select:
            "drawing_no draw_receive_date rev assembly_no status sheet_no unit assembly_quantity drawing_pdf drawing_pdf_name issued_person issued_date",
          populate: {
            path: "issued_person",
            select: "name",
          },
        });

      // Fetch items and drawing details per request
      const finalData = await Promise.all(
        data.map(async (elem) => {
          const items = await TransactionItems.find(
            { deleted: false, requestId: elem._id },
            { deleted: 0, __v: 0 }
          )
            .populate("preffered_supplier.supId", "name email address phone")
            .populate("main_supplier", "name email address phone")
            .populate({
              path: "itemName",
              select: "name material_grade",
              populate: { path: "unit", select: "name" },
            });

          let drawingDetails = null;
          if (elem?.drawing_id !== null) {
            const drawingItems = await TransactionItems.find(
              { deleted: false, drawingId: elem?.drawing_id?._id },
              { deleted: 0 }
            ).populate("itemName", "name");

            drawingDetails = {
              ...elem?.drawing_id.toObject(),
              items: drawingItems,
            };
          }

          return {
            ...elem.toObject(),
            items,
            drawing_id: drawingDetails,
          };
        })
      );

      const message =
        parseInt(tag) === OrderTypes["Purchase Order"]
          ? "Purchase Request List"
          : "Sales Request List";

      // Send response

      
      sendResponse(res, 200, true, {
        data: finalData,
        pagination: {
          total: totalCount,
          page: page ? parseInt(page) : null,
          limit: limit ? parseInt(limit) : null,
          totalPages:
            page && limit ? Math.ceil(totalCount / parseInt(limit)) : 1,
        },
      }, message);

    } catch (err) {
      console.error(err);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

// exports.getRequest = async (req, res) => {
//   const { tag, project, page , limit , search , status } = req.body;

// // if (status) {
// //   filter.status = parseInt(status);
// // }


// console.log("req.body", req.body);
//   if (req.user && !req.err) {
//     try {
//       const filter = { deleted: false, tag };
//       if (project) {
//         filter.project = project;
//       }

//         if (search && search.trim() !== "") {
//         filter.material_po_no = { $regex: search.trim(), $options: "i" }; // case-insensitive
//       }

//       if (status && status !== '') {
//   filter.status = parseInt(status);
// }
//       const skip = (parseInt(page) - 1) * parseInt(limit);

//       // Get total count
//       const totalCount = await RequestModal.countDocuments(filter);

//       // Get paginated data
//       const data = await RequestModal.find(filter, { deleted: 0 })
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(parseInt(limit))
//         .populate({
//           path: "project",
//           select: "name party work_order_no",
//           populate: {
//             path: "party",
//             select: "name",
//           },
//         })
//         .populate("approvedBy", "name")
//         .populate("preparedBy", "user_name")
//         .populate("department", "name")
//         .populate("firm_id", "name")
//         .populate("storeLocation", "name")
//         .populate("year_id", "start_year end_year")
//         .populate({
//           path: "drawing_id",
//           select:
//             "drawing_no draw_receive_date rev assembly_no status sheet_no unit assembly_quantity drawing_pdf drawing_pdf_name issued_person issued_date",
//           populate: {
//             path: "issued_person",
//             select: "name",
//           },
//         });

//       const finalData = await Promise.all(
//         data.map(async (elem) => {
//           const items = await TransactionItems.find(
//             { deleted: false, requestId: elem._id },
//             { deleted: 0, __v: 0 }
//           )
//             .populate("preffered_supplier.supId", "name email address phone")
//             .populate("main_supplier", "name email address phone")
//             .populate({
//               path: "itemName",
//               select: "name",
//               populate: { path: "unit", select: "name" },
//             });

//           let drawingDetails = null;
//           if (elem?.drawing_id !== null) {
//             const drawingItems = await TransactionItems.find(
//               { deleted: false, drawingId: elem?.drawing_id?._id },
//               { deleted: 0 }
//             ).populate("itemName", "name");
//             drawingDetails = {
//               ...elem?.drawing_id.toObject(),
//               items: drawingItems,
//             };
//           }

//           return {
//             ...elem.toObject(),
//             items,
//             drawing_id: drawingDetails,
//           };
//         })
//       );

//       const message =
//         parseInt(tag) === OrderTypes["Purchase Order"]
//           ? "Purchase Request List"
//           : "Sales Request List";

//       sendResponse(res, 200, true, {
//         data: finalData,
//         pagination: {
//           total: totalCount,
//           page: parseInt(page),
//           limit: parseInt(limit),
//           totalPages: Math.ceil(totalCount / parseInt(limit)),
//         },
//       }, message);
//     } catch (err) {
//       console.error(err);
//       sendResponse(res, 500, false, {}, "Something went wrong");
//     }
//   } else {
//     sendResponse(res, 401, false, {}, "Unauthorized");
//   }
// };




exports.getRequestEdit = async (req, res) => {
  const { tag, project, requestId } = req.body;

  if (req.user && !req.err) {
    try {
      // ✅ Dynamically build the filter
      const filter = { deleted: false };

      if (requestId) {
        filter._id = requestId;
      } else if (tag) {
        filter.tag = tag;
        if (project) {
          filter.project = project;
        }
      }

      const data = await RequestModal.find(filter, { deleted: 0 })
        .sort({ createdAt: -1 })
        .populate({
          path: "project",
          select: "name party work_order_no",
          populate: {
            path: "party",
            select: "name",
          },
        })
        .populate("approvedBy", "name")
        .populate("preparedBy", "user_name")
        .populate("department", "name")
        .populate("firm_id", "name")
        .populate("storeLocation", "name")
        .populate("year_id", "start_year end_year")
        .populate({
          path: "drawing_id",
          select:
            "drawing_no draw_receive_date rev assembly_no status sheet_no unit assembly_quantity drawing_pdf drawing_pdf_name issued_person issued_date",
          populate: {
            path: "issued_person",
            select: "name",
          },
        });

      // Process each result to include transaction items and drawing items
      const finalData = await Promise.all(
        data.map(async (elem) => {
          const items = await TransactionItems.find(
            { deleted: false, requestId: elem._id },
            { deleted: 0, __v: 0 }
          )
            .populate("preffered_supplier.supId", "name email address phone")
            .populate("main_supplier", "name email address phone")
            .populate({
              path: "itemName",
              select: "name",
              populate: { path: "unit", select: "name" },
            });

          // If drawing exists, populate its related items too
          let drawingDetails = null;
          if (elem?.drawing_id !== null) {
            const drawingItems = await TransactionItems.find(
              { deleted: false, drawingId: elem?.drawing_id?._id },
              { deleted: 0 }
            ).populate("itemName", "name");

            drawingDetails = {
              ...elem?.drawing_id.toObject(),
              items: drawingItems,
            };
          }

          const mergeObjects = {
            ...elem.toObject(),
            items,
            drawing_id: drawingDetails,
          };

          return mergeObjects;
        })
      );

      // ✅ Response handling
      if (finalData?.length > 0) {
        if (requestId) {
          // For edit mode: return a single object
          sendResponse(res, 200, true, finalData[0], "Request loaded successfully");
        } else {
          // For list mode
          const message =
            parseInt(tag) === OrderTypes["Purchase Order"]
              ? "Purchase Request List"
              : "Sales Request List";
          sendResponse(res, 200, true, finalData, message);
        }
      } else {
        // No matching data found
        const message =
          requestId
            ? "Request not found"
            : parseInt(tag) === OrderTypes["Purchase Order"]
            ? "Purchase Request not found"
            : "Sale Request not found";
        sendResponse(res, 404, false, {}, message);
      }
    } catch (err) {
      console.error("getRequest Error:", err);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.manageRequest = async (req, res) => {
  const {
    id,
    firm_id,
    year_id,
    requestDate,
    storeLocation,
    project,
    approvedBy,
    department,
    preparedBy,
    // drawing_id,
    drawingIds,
    material_po_no,
    tag,
  } = req.body;
  if (req.user && !req.error) {
    if (
      firm_id &&
      year_id &&
      requestDate &&
      storeLocation &&
      project &&
      department &&
      preparedBy
    ) {

      try {
        let lastRequest = await RequestModal.findOne(
          { deleted: false },
          { deleted: 0 },
          { sort: { createdAt: -1 } }
        );
        let requestNo = "1000";
        if (lastRequest && lastRequest.requestNo) {
          const lastrequestNo = parseInt(lastRequest.requestNo);
          requestNo = lastrequestNo + 1;
        }

        const parseDrIds = JSON.parse(drawingIds);
        // const finalDraw =
        //   drawing_id === "" || drawing_id === "undefined" ? null : drawing_id;

        if (!id) {
          const requestObject = new RequestModal({
            requestNo,
            requestDate,
            firm_id,
            year_id,
            project,
            department,
            approvedBy,
            preparedBy,
            storeLocation,
            // drawing_id: finalDraw,
            drawingIds: parseDrIds,
            tag,
            material_po_no,
          });

          const resData = await requestObject.save();

          const newRequestId = resData._id;
          const message =
            parseInt(tag) === OrderTypes["Purchase Order"]
              ? "Purchase request created successfully"
              : "Sales request created successfully";

          if (parseDrIds.length > 0) {
            // as per the drawings add the drawing items in the transaction items 
            const drGridItems = await DrawingGridItems.find({ drawing_id: { $in: parseDrIds } });
            const transactionItems = drGridItems.map((item) => ({
              requestId: newRequestId,
              itemName: item.item_name,
              drawingId: item.drawing_id,
              quantity: item.item_qty,
              tag: 3,
            }));
            const resTransData = await TransactionItems.insertMany(transactionItems);
          }
          sendResponse(res, 200, true, resData, message);
        } else {
          const existingRequest = await RequestModal.findById(id);
          requestNo = existingRequest.requestNo;
          await RequestModal.findByIdAndUpdate(id, {
            requestNo,
            requestDate,
            department,
            approvedBy,
            preparedBy,
            // drawing_id: finalDraw,
            drawingIds: parseDrIds,
            storeLocation,
            material_po_no,
          }).then((data) => {
            const message = data
              ? parseInt(tag) === OrderTypes["Purchase Order"]
                ? "Purchase request updated successfully"
                : "Sales request updated successfully"
              : parseInt(tag) === OrderTypes["Purchase Order"]
                ? "Purchase request not found"
                : "Sales request not found";
            sendResponse(res, 200, true, data, message);
          });
        }
      } catch (error) {
        console.log(error);
        sendResponse(res, 500, false, {}, "Something went wrong" + error);
      }
    } else {
      sendResponse(res, 400, false, {}, "Missing parameter");
    }
  }
};

exports.verifyRequestStatus = async (req, res) => {
  const { id, status, adminEmail } = req.body;
  if (req.user && !req.error) {
    if (!status) {
      sendResponse(res, 400, false, {}, "Missing required field: status");
      return;
    }

    const adminId = await AdminModal.findOne({ email: adminEmail });

    try {
      await RequestModal.findByIdAndUpdate(id, {
        status: status,
        approvedBy: adminId._id,
        admin_approval_time: Date.now(),
      }).then(async(data) => {

                     /* =========================================================
                 MATERIAL REQUEST APPROVAL EMAIL
              ========================================================= */
        
              try {
        
                const requestData = await RequestModal.findById(id)
                  .populate("project")
                  .populate("preparedBy");
        
                /* ==========================================
                   MATERIAL CONTROLLER USERS
                ========================================== */
        
                const roles =
                  await ErpRole.find({
        
                    deleted: false,
        
                    name: {
                      $in: [
                        "Material Controller"
                      ]
                    }
        
                  });
        
                const roleIds =
                  roles.map(
                    role => role._id
                  );
        
                const materialUsers =
                  await User.find({
        
                    deleted: false,
        
                    status: true,
        
                    pipingRole: {
                      $in: roleIds
                    },
        
                    email: {
                      $exists: true,
                      $ne: ""
                    }
        
                  });
        
                /* ==========================================
                   STATUS
                ========================================== */
        
                let approvalStatus = "-";
                let remarks = "";
        
                if (status == 2) {
        
                  approvalStatus = "Approved";
        
                  remarks =
                    "Material PO request approved and ready for material receiving process.";
        
                } else {
        
                  approvalStatus = "Rejected";
        
                  remarks =
                    "Material PO request has been rejected by admin.";
        
                }
        
                /* ==========================================
                   SEND EMAIL
                ========================================== */
        
                for (const user of materialUsers) {
        
                  try {
        
                    const html =
                      commonStageAcceptanceEmail({
        
                        userName:
                          user?.user_name || "-",
        
                        module:
                          "Structural",
        
                        stageName:
                          "Material PO Approval",
        
                        reportNo:
                          requestData?.requestNo || "-",
        
                        projectName:
                          requestData?.project?.name || "-",
        
                        workOrderNo:
                          requestData?.project?.work_order_no || "-",
        
                        accptedBy:
                          adminId?.name || "Admin",
        
                        qcStatus:
                          approvalStatus,
        
                        accptanceDateTime:
                          new Date()
                            .toLocaleString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                                hour12: true
                              }
                            )
                            .replace("am", "AM")
                            .replace("pm", "PM"),
        
                        remarks,
        
                        loginUrl:
                          process.env.ERP_URL
        
                      });
        
                    addEmailJob({
        
                      to:
                        user.email,
        
                      subject:
                        `Material PO ${approvalStatus} - ${requestData?.requestNo}`,
        
                      html
        
                    });
        
                    console.log(
                      `MATERIAL CONTROLLER EMAIL QUEUED -> ${user.email}`
                    );
        
                  } catch (mailErr) {
        
                    console.log(
                      `MAIL ERROR ${user.email}`,
                      mailErr.message
                    );
        
                  }
        
                }
        
              } catch (emailErr) {
        
                console.log(
                  "MATERIAL REQUEST EMAIL ERROR :",
                  emailErr
                );
        
              }

        sendResponse(res, 200, true, {}, "Request status updated successfully");
      });
    } catch (err) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.sendToAdmin = async (req, res) => {
  try {
    const { id, send_to_admin,project_id,project_name } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Request ID is required",
      });
    }

    const checkOrder = await RequestModal.findById(id);
                    console.log("checkOrder===>",checkOrder);

    if (!checkOrder) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    const updatedOrder = await RequestModal.findByIdAndUpdate(
      id,
      {
        send_to_admin: send_to_admin === "true" || send_to_admin === true,
      },
      {
        new: true,
      }
    );

      /* =========================================================
       SEND EMAIL TO ADMIN
    ========================================================= */

    try {

      if (
        send_to_admin === "true" ||
        send_to_admin === true
      ) {

        // GET ADMIN USERS
        const admins = await AdminModal.find({
         
          email: {
            $exists: true,
            $ne: ""
          }
        });
const projectData = await Project.findById(
            project_id
          ).select(
            "name work_order_no"
          );

         const requestUser = await User.findOne({
  _id: checkOrder?.preparedBy,
}).select("user_name");
                    console.log("requestUser===>",requestUser);
        for (const admin of admins) {

          try {

            const html =
              commonStageOfferEmail({

                userName:
                  admin?.name || "Admin",

                module:
                  "Structural",

                stageName:
                  "Material PO No Approval",

                offerNo:
                  updatedOrder?.requestNo || "-",

                projectName:
                 project_name || "-",

                workOrderNo:
                  projectData?.work_order_no || "-",

                createdBy:
                  requestUser?.user_name || "-",

                offerDateTime:
                  new Date()
                    .toLocaleString(
                      "en-IN",
                      {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: true
                      }
                    )
                    .replace("am", "AM")
                    .replace("pm", "PM"),

                remarks:
                  "Material PO No request has been sent for admin approval.",

                loginUrl:
                  process.env.ERP_URL

              });

            addEmailJob({

              to:
                admin.email,

              subject:
                `Material PO No Approval - ${updatedOrder?.requestNo}`,

              html

            });

            console.log(
              `ADMIN EMAIL QUEUED -> ${admin.email}`
            );

          } catch (mailErr) {

            console.log(
              `ADMIN MAIL ERROR ${admin.email}`,
              mailErr.message
            );

          }

        }

      }

    } catch (emailErr) {

      console.log(
        "SEND TO ADMIN EMAIL ERROR :",
        emailErr
      );

    }
    return res.status(200).json({
      success: true,
      message: "Request sent to admin successfully",
      data: updatedOrder,
    });
  } catch (error) {
    console.log("SEND TO ADMIN ERROR :", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getRequestDataToAdmin = async (req, res) => {
  const { tag, project, page, limit, search, status } = req.body;

  console.log("req.body", req.body);

  if (req.user && !req.err) {
    try {
      const filter = { deleted: false, tag, send_to_admin:true };

      if (project) {
        filter.project = project;
      }

      if (search && search.trim() !== "") {
        filter.material_po_no = { $regex: search.trim(), $options: "i" };
      }
    
      if (status && status !== "") {
        filter.status = parseInt(status);
      }
      // Count total matching documents
      const totalCount = await RequestModal.countDocuments(filter);

      // Initialize query
      let query = RequestModal.find(filter, { deleted: 0 }).sort({ createdAt: -1 });

      // Apply pagination only if both page and limit are provided and valid
      let skip = 0;
      let limitValue = 0;

      if (page && limit && !isNaN(page) && !isNaN(limit)) {
        skip = (parseInt(page) - 1) * parseInt(limit);
        limitValue = parseInt(limit);
        query = query.skip(skip).limit(limitValue);
      }

      // Populate fields
      const data = await query
        .populate({
          path: "project",
          select: "name party work_order_no",
          populate: {
            path: "party",
            select: "name",
          },
        })
        .populate("approvedBy", "name")
        .populate("preparedBy", "user_name")
        .populate("department", "name")
        .populate("firm_id", "name")
        .populate("storeLocation", "name")
        .populate("year_id", "start_year end_year")
        .populate({
          path: "drawing_id",
          select:
            "drawing_no draw_receive_date rev assembly_no status sheet_no unit assembly_quantity drawing_pdf drawing_pdf_name issued_person issued_date",
          populate: {
            path: "issued_person",
            select: "name",
          },
        });

      // Fetch items and drawing details per request
      const finalData = await Promise.all(
        data.map(async (elem) => {
          const items = await TransactionItems.find(
            { deleted: false, requestId: elem._id },
            { deleted: 0, __v: 0 }
          )
            .populate("preffered_supplier.supId", "name email address phone")
            .populate("main_supplier", "name email address phone")
            .populate({
              path: "itemName",
              select: "name",
              populate: { path: "unit", select: "name" },
            });

          let drawingDetails = null;
          if (elem?.drawing_id !== null) {
            const drawingItems = await TransactionItems.find(
              { deleted: false, drawingId: elem?.drawing_id?._id },
              { deleted: 0 }
            ).populate("itemName", "name");

            drawingDetails = {
              ...elem?.drawing_id.toObject(),
              items: drawingItems,
            };
          }

          return {
            ...elem.toObject(),
            items,
            drawing_id: drawingDetails,
          };
        })
      );

      const message =
        parseInt(tag) === OrderTypes["Purchase Order"]
          ? "Purchase Request List"
          : "Sales Request List";

      // Send response
      sendResponse(res, 200, true, {
        data: finalData,
        pagination: {
          total: totalCount,
          page: page ? parseInt(page) : null,
          limit: limit ? parseInt(limit) : null,
          totalPages:
            page && limit ? Math.ceil(totalCount / parseInt(limit)) : 1,
        },
      }, message);

    } catch (err) {
      console.error(err);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.deleteRequest = async (req, res) => {
  const { id } = req.body;

  try {
    const deletedRequest = await RequestModal.findByIdAndUpdate(id, {
      deleted: true,
    });

    if (deletedRequest) {
      sendResponse(res, 200, true, {}, "Request deleted successfully");
    } else {
      sendResponse(res, 404, false, {}, "Request not found");
    }
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, false, {}, "Something went wrong");
  }
};



// Client View 
// exports.downloadMaterialInspactionforClient = async (req, res) => {
//   const { requestId, imir_no, print_date } = req.body;
//   if (req.party && !req.error) {

//     try {
//       const data = await getOneMaterialInspaction(requestId, imir_no)
//       let requestData = data.result;

//       const poffDetails = requestData[0]?.purchaseOfferDetails || [];

//       const filteredData = poffDetails?.filter(item =>
//         item.qcStatus !== 3 && item.acceptedQty !== 0
//       );

//       let headerInfo = {
//         client: requestData[0]?.client,
//         project_name: requestData[0]?.project_name,
//         imir_no: requestData[0]?.imir_no,
//         wo_no: requestData[0]?.wo_no,
//         send_qc_time: requestData[0]?.send_qc_time,
//         accept_name: requestData[0]?.accept_name,
//         qc_date: requestData[0]?.received_date,
//         invoice_no: requestData[0]?.invoice_no,
//       }

//       if (data.status === 1) {
//         const template = fs.readFileSync(
//           "templates/materialInspactionItem.html",
//           "utf-8"
//         );
//         const renderedHtml = ejs.render(template, {
//           headerInfo,
//           items: filteredData,
//           logoUrl1: process.env.LOGO_URL_1,
//           logoUrl2: process.env.LOGO_URL_2,
//         });

//         const browser = await puppeteer.launch({
//           headless: true,
//           args: ["--no-sandbox", "--disable-setuid-sandbox"],
//           executablePath: PATH,
//         });

//         const page = await browser.newPage();

//         await page.setContent(renderedHtml, {
//           baseUrl: `${URI}`,
//         });

//         const pdfBuffer = await generatePDF(page, { print_date });
//         await browser.close();

//         const pdfsDir = path.join(__dirname, "../../../pdfs");
//         if (!fs.existsSync(pdfsDir)) {
//           fs.mkdirSync(pdfsDir);
//         }

//         const filename = `material_inspaction_item_${Date.now()}.pdf`;
//         const filePath = path.join(__dirname, "../../../pdfs", filename);

//         fs.writeFileSync(filePath, pdfBuffer);

//         const fileUrl = `${URI}/pdfs/${filename}`;

//         sendResponse(
//           res,
//           200,
//           true,
//           { file: fileUrl },
//           "PDF downloaded Successfully"
//         );
//       }
//       else if (data.status === 0) {
//         sendResponse(res, 200, false, {}, `Material Inspaction not found`)
//       }
//       else if (data.status === 2) {
//         sendResponse(res, 500, false, {}, "Something went wrong");
//       }
//     } catch (error) {
//       console.log("error", error);
//       sendResponse(res, 500, false, {}, "Something went wrong");
//     }
//   } else {
//     sendResponse(res, 401, false, {}, "Unauthorized");
//   }
// };


exports.downloadMaterialInspactionforClient = async (req, res) => {
  const { requestId, imir_no, print_date } = req.body;

  if (req.user && !req.error) {
    try {
      const data = await getOneMaterialInspaction(requestId, imir_no);
      let requestData = data.result;

      console.log("requestData", requestData[0].purchaseOfferDetails);

      const poffDetails = requestData[0]?.purchaseOfferDetails || [];
      const filteredData = poffDetails.filter(
        item => item.qcStatus !== 3 && item.acceptedQty !== 0
      );

      let headerInfo = {
        client: requestData[0]?.client,
        project_name: requestData[0]?.project_name,
        imir_no: requestData[0]?.imir_no,
        wo_no: requestData[0]?.wo_no,
        send_qc_time: requestData[0]?.send_qc_time,
        accept_name: requestData[0]?.accept_name,
        accept_signature: requestData[0]?.accept_signature,
        client_status: requestData[0]?.client_status,
        client_user: requestData[0]?.client_user_name,
        client_signature: requestData[0]?.client_user_signature,
        status_type: requestData[0]?.status_type,
        qc_date: requestData[0]?.received_date,
        invoice_no: requestData[0]?.invoice_no,
      };

      console.log("headerInfo", headerInfo);

      if (data.status === 1) {
        const template = fs.readFileSync(
          "templates/materialInspactionItem.html",
          "utf-8"
        );

        const renderedHtml = ejs.render(template, {
          headerInfo,
          items: filteredData,
          logoUrl1: process.env.LOGO_URL_1,
          logoUrl2: process.env.LOGO_URL_2,
        });

        const browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
          executablePath: PATH,
        });

        const page = await browser.newPage();
        await page.setContent(renderedHtml, { waitUntil: "networkidle0" });

        const pdfBuffer = await generatePDF(page, { print_date });
        await browser.close();

        // 🔥 VERY IMPORTANT HEADERS
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          "inline; filename=material_inspection.pdf"
        );
        res.setHeader("Content-Length", pdfBuffer.length);

        return res.end(pdfBuffer); // 🔥 SEND BLOB
      }

      if (data.status === 0) {
        return res.status(404).json({ success: false, message: "Material Inspection not found" });
      }

      return res.status(500).json({ success: false, message: "Something went wrong" });

    } catch (error) {
      console.error("PDF error:", error);
      return res.status(500).json({ success: false, message: "Something went wrong" });
    }
  } else {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
};
