const NDTInspection = require('../../../models/erp/Multi/multi_ndt_detail.model');
const WeldInspection = require("../../../models/erp/Multi/multi_weld_inspection.model");
const ndtModel = require("../../../models/erp/NDT/ndt.model");
const NDTTypeOffer = require('../../../models/erp/Multi/multi_ndt_offer.model');
const { sendResponse } = require("../../../helper/response");
const { TitleFormat } = require('../../../utils/enum');
const ejs = require("ejs");
const fs = require("fs");
const XLSX = require('xlsx');  // for utility functions
const XLSXStyle = require('xlsx-style');  // for styling
const puppeteer = require("puppeteer");
const path = require("path");
const { generatePDF } = require("../../../utils/pdfUtils");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;
const Draw = require("../../../models/erp/planner/draw.model");
const GridItem = require("../../../models/erp/planner/draw_grid_items.model");
exports.updateNDTGridBalance = async (req, res) => {
  const { weld_visual_id, items, flag } = req.body;

  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  if (!items || !flag || !weld_visual_id) {
    return sendResponse(res, 400, false, {}, "Missing parameter");
  }

  try {
    const parsedItems = JSON.parse(items);
    const wvAcceptanceDetails = await WeldInspection.findById(weld_visual_id);

    if (!wvAcceptanceDetails) {
      return sendResponse(res, 404, false, {}, "Weld visual details not found");
    }

    const wvItems = wvAcceptanceDetails?.items || [];
    const flagValue = parseInt(flag);

    if (![0, 1].includes(flagValue)) {
      return sendResponse(res, 400, false, {}, "Invalid flag value");
    }

    const commonElements = wvItems.filter((wvItem) =>
      parsedItems.some(
        (inputItem) =>
          inputItem.grid_item_id?._id === wvItem.grid_item_id.toString()
      )
    );

    const adjustment = flagValue === 1 ? 1 : -1;

    commonElements.forEach((wvItem) => {
      const inputItem = parsedItems.find(
        (item) => item.grid_item_id?._id === wvItem.grid_item_id.toString()
      );
      if (inputItem) {
        wvItem.moved_next_step += adjustment * inputItem.ndt_used_grid_qty;
      }
    });
    await WeldInspection.findByIdAndUpdate(weld_visual_id, { items: wvItems });
    sendResponse(res, 200, true, {}, "Grid balance updated successfully");
  } catch (err) {
    console.error(
      `Error updating grid balance for issue ${weld_visual_id}:`,
      err.message || err
    );
    sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

// exports.getNDTInspection = async (req, res) => {
//   const { id, status, project } = req.query;

//   if (!req.user || req.error) {
//     return sendResponse(res, 401, false, {}, "Unauthorized");
//   }

//   try {
//     const query = { deleted: false };
//     if (id) query._id = id;
//     if (status) query.status = status;

//       let result = await NDTInspection.find(query, { deleted: 0, __v: 0 })
//           .populate("offered_by", "user_name")
//           .populate("qc_name", "user_name")
//           .populate({
//               path: "items",
//               select: "grid_item_id",
//               populate: [
//                   {
//                       path: "grid_item_id",
//                       select: "item_name drawing_id item_no item_qty grid_id",
//                       populate: [
//                           { path: "item_name", select: "name" },
//                           { path: "grid_id", select: "grid_no grid_qty" },
//                           {
//                               path: "drawing_id",
//                               select: "drawing_no sheet_no rev assembly_no project assembly_quantity unit",
//                               populate: {
//                                   path: "project",
//                                   select: "name party work_order_no",
//                                   populate: { path: "party", select: "name" },
//                               },
//                           },
//                       ],
//                   },
//                   {
//                       path: "ndt_requirements",
//                       select: "name",
//                   },
//               ]
//           })
//           .populate({
//               path: "weld_visual_id",
//               select: "items",
//               // populate: [
//               //     { path: "items.joint_type", select: "name" },
//               //     { path: "items.wps_no", select: "wpsNo weldingProcess" },
//               // ]
//           })
//           .sort({ createdAt: -1 })
//           .lean();

//     if (result?.length) {
//       // result = result.map((inspection) => {
//       //     const fitupItems = inspection.fitup_id?.items || [];
//       //     inspection.items = inspection.items.map((item) => {
//       //         const match = fitupItems.find(
//       //             (fitup) => fitup.grid_item_id?.toString() === item.grid_item_id?._id?.toString()
//       //         );
//       //         if (match) {
//       //             return {
//       //                 ...item,
//       //                 joint_type: match.joint_type || [],
//       //                 wps_no: match.wps_no || null,
//       //             };
//       //         }
//       //         return item;
//       //     });
//       //     return inspection;
//       // });

//       if (project) {
//         result = result.filter(item =>
//           item.items.some(i =>
//             i.grid_item_id?.drawing_id?.project?._id?.toString() === project
//           )
//         );
//       }

//       return sendResponse(res, 200, true, result, "Weld Visual inspection offer list");
//     }

//     return sendResponse(res, 200, true, [], "Records fetched successfully");
//   } catch (error) {
//     sendResponse(res, 500, false, {}, `Something went wrong: ${err}`);
//   }
// }

exports.getNDTInspection = async (req, res) => {
  const { id, status, project, currentPage, limit } = req.query;

  const searchRaw = Array.isArray(req.query.search)
    ? req.query.search[0]
    : req.query.search || "";
  const search = typeof searchRaw === "string" ? searchRaw.trim() : "";

  const hasPagination = currentPage !== undefined && limit !== undefined;
  const pageNum = hasPagination ? parseInt(currentPage) || 1 : 1;
  const limitNum = hasPagination ? parseInt(limit) || 10 : 0;
  const skip = (pageNum - 1) * limitNum;

  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  try {
    let query = { deleted: false };
    if (id) query._id = id;
    if (status) query.status = status;

    // 🎯 Filter by project early
    if (project) {
      // Step 1: get all drawings of that project
      const drawingIds = await Draw.find({
        deleted: false,
        project: project,
      }).distinct("_id");

      if (!drawingIds.length) {
        return sendResponse(res, 200, true, {
          data: [],
          pagination: { total: 0, count: 0, currentPage: pageNum, limit: limitNum },
        }, "NDT inspection list");
      }

      // Step 2: get all grid items linked to those drawings
      const gridItemIds = await GridItem.find({
        deleted: false,
        drawing_id: { $in: drawingIds },
      }).distinct("_id");

      if (!gridItemIds.length) {
        return sendResponse(res, 200, true, {
          data: [],
          pagination: { total: 0, count: 0, currentPage: pageNum, limit: limitNum },
        }, "NDT inspection list");
      }

      // Step 3: filter NDT inspection items by grid item ids
      query["items.grid_item_id"] = { $in: gridItemIds };
    }

    // 🔍 Search logic
    if (search) {
      // Find matching drawings by assembly_no or unit
      const drawingMatch = await Draw.find({
        $or: [
          { assembly_no: { $regex: search, $options: "i" } },
          { unit: { $regex: search, $options: "i" } },
        ],
        deleted: false,
      }).distinct("_id");

      const searchConditions = [
        { report_no: { $regex: search, $options: "i" } },
      ];

      if (drawingMatch.length > 0) {
        const gridItemIds = await GridItem.find({
          deleted: false,
          drawing_id: { $in: drawingMatch },
        }).distinct("_id");

        if (gridItemIds.length > 0) {
          searchConditions.push({ "items.grid_item_id": { $in: gridItemIds } });
        }
      }

      query.$or = searchConditions;
    }

    // 📊 Count total
    const totalCount = await NDTInspection.countDocuments(query);

    // 📦 Main query with population
    let queryExec = NDTInspection.find(query, { deleted: 0, __v: 0 })
      .populate("offered_by", "user_name")
      .populate("qc_name", "user_name")
      .populate({
        path: "items",
        select: "grid_item_id ndt_requirements",
        populate: [
          {
            path: "grid_item_id",
            select: "item_name drawing_id item_no item_qty grid_id",
            populate: [
              { path: "item_name", select: "name" },
              { path: "grid_id", select: "grid_no grid_qty" },
              {
                path: "drawing_id",
                select:
                  "drawing_no sheet_no rev assembly_no project assembly_quantity unit",
                populate: {
                  path: "project",
                  select: "name party work_order_no",
                  populate: { path: "party", select: "name" },
                },
              },
            ],
          },
          { path: "ndt_requirements", select: "name" },
        ],
      })
      .populate({
        path: "weld_visual_id",
        select: "items",
      })
      .sort({ createdAt: -1 })
      .lean();

    // 📑 Pagination
    if (hasPagination) {
      queryExec = queryExec.skip(skip).limit(limitNum);
    }

    const result = await queryExec;

    return sendResponse(res, 200, true, {
      data: result,
      pagination: {
        total: totalCount,
        count: result.length,
        currentPage: pageNum,
        limit: limitNum,
      },
    }, "NDT inspection list");
  } catch (error) {
    console.error("Error in getNDTInspection:", error);
    sendResponse(res, 500, false, {}, `Something went wrong: ${error.message}`);
  }
};



// exports.getNDTInspection = async (req, res) => {
//   const { id, status, project, currentPage, limit, search } = req.query;

//   if (!req.user || req.error) {
//     return sendResponse(res, 401, false, {}, "Unauthorized");
//   }

//   try {
//     const query = { deleted: false };
//     if (id) query._id = id;
//     if (status) query.status = status;

//     let mongoQuery = NDTInspection.find(query, { deleted: 0, __v: 0 })
//       .populate("offered_by", "user_name")
//       .populate("qc_name", "user_name")
//       .populate({
//         path: "items",
//         select: "grid_item_id ndt_requirements",
//         populate: [
//           {
//             path: "grid_item_id",
//             select: "item_name drawing_id item_no item_qty grid_id",
//             populate: [
//               { path: "item_name", select: "name" },
//               { path: "grid_id", select: "grid_no grid_qty" },
//               {
//                 path: "drawing_id",
//                 select: "drawing_no sheet_no rev assembly_no project assembly_quantity unit",
//                 populate: {
//                   path: "project",
//                   select: "name party work_order_no",
//                   populate: { path: "party", select: "name" },
//                 },
//               },
//             ],
//           },
//           {
//             path: "ndt_requirements",
//             select: "name",
//           },
//         ],
//       })
//       .populate({
//         path: "weld_visual_id",
//         select: "items",
//       })
//       .sort({ createdAt: -1 })
//       .lean();

//     let result = await mongoQuery;

//     // Filter by project if provided
//     if (project) {
//       result = result.filter(item =>
//         item.items?.some(i =>
//           i.grid_item_id?.drawing_id?.project?._id?.toString() === project
//         )
//       );
//     }

//     // Apply search filters (reportNo, unit, assemblyNo)
//     if (search) {
//       const searchLower = search.toLowerCase();
//       result = result.filter(item =>
//         item.report_no?.toLowerCase().includes(searchLower) ||
//         item.items?.some(i =>
//           i.grid_item_id?.drawing_id?.unit?.toLowerCase().includes(searchLower) ||
//           i.grid_item_id?.drawing_id?.assembly_no?.toLowerCase().includes(searchLower)
//         )
//       );
//     }

//     // Pagination
//     let paginatedResult = result;
//     if (currentPage && limit) {
//       const pageNum = parseInt(currentPage);
//       const limitNum = parseInt(limit);
//       const startIndex = (pageNum - 1) * limitNum;
//       const endIndex = startIndex + limitNum;

//       paginatedResult = result.slice(startIndex, endIndex);
//     }

//     return sendResponse(res, 200, true, {
//       data: paginatedResult,
//       pagination:{
//         total: result.length,
//        count: paginatedResult.length,
//        currentPage,
//        limit
//       }
//     }, "Weld Visual inspection offer list");
//   } catch (error) {
//     console.error("Error in getNDTInspection:", error);
//     sendResponse(res, 500, false, {}, `Something went wrong: ${error.message}`);
//   }
// }

async function getLastInspection(project) {
  try {
    const pipeline = [
      {
        $match: {
          deleted: false,
          report_no_two: {
            $regex: `^VE/${project}/STR/NDT/\\d+$`,
            $options: 'i'
          }
        }
      },
      {
        $addFields: {
          inspectionNumber: {
            $toInt: {
              $arrayElemAt: [
                { $split: ["$report_no_two", "/"] },
                -1
              ]
            }
          }
        }
      },
      { $sort: { inspectionNumber: -1 } },
      { $limit: 1 },
      {
        $project: {
          _id: 1,
          report_no_two: 1,
          createdAt: 1,
          inspectionNumber: 1
        }
      }
    ];

    const [lastInspection] = await NDTInspection.aggregate(pipeline);
    console.log('Aggregation result:', lastInspection); // Debug log
    return lastInspection || null;
  } catch (error) {
    console.error('Error fetching last inspection:', error);
    throw error;
  }
}

exports.manageNDTInspection = async (req, res) => {
  const { id, weld_visual_id, items, offered_by, project } = req.body;
  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  const newItems = JSON.parse(items);

  if (!weld_visual_id || !offered_by || !items || newItems.length === 0) {
    return sendResponse(res, 400, false, {}, "Missing parameter");
  }

  try {
    // const lastInspection = await NDTInspection.findOne(
    //   { deleted: false, report_no: { $regex: `/${project}/` } },
    //   {},
    //   { sort: { createdAt: -1 } }
    // );
 const lastInspection = await getLastInspection(project);
    let inspectionNo = lastInspection?.report_no
      ? parseInt(lastInspection.report_no.split('/').pop()) + 1
      : 1;

    const gen_report_no = TitleFormat.ndtVoucher.replace('/PROJECT/', `/${project}/`) + inspectionNo;
    const testTypes = await ndtModel.find({ deleted: false }, { deleted: 0, __v: 0, status: 0 }).lean();
    let testLabel = testTypes.map(item => item.name);
    let testId = testTypes.map(item => item._id.toString());
    let categorizedItems = [];

    testId.forEach((id, index) => {
      let currentLabel = testLabel[index];
      let filteredItems = newItems
        .filter(item =>
          item.ndt_requirements.some(requirement => requirement.ndt_type === id)
        )
        .map(item => ({
          ndt_type: id,
          grid_item_id: item.grid_item_id,
          drawing_id: item.drawing_id,
        }));

      categorizedItems.push({
        label: currentLabel,
        items: filteredItems,
      });
    });
    if (!id) {
      await NDTInspection.create({
        report_no: gen_report_no,
        weld_visual_id,
        items: JSON.parse(items) || [],
        offered_by,
      }).then(async (data) => {
        if (data) {
          const ndtMasterId = data._id;
          const noneTypeId = await ndtModel.findOne({ name: "None", deleted: false });
          await Promise.all(categorizedItems.map(async item => {
            if (item.items[0]?.ndt_type && (noneTypeId?._id.toString() !== item.items[0]?.ndt_type)) {
              let combinedItems = item.items.map(elem => ({
                grid_item_id: elem.grid_item_id,
                drawing_id: elem.drawing_id,
              }));

              let testObject = {
                ndt_master_id: ndtMasterId,
                ndt_type_id: item.items[0]?.ndt_type,
                items: combinedItems,
                offered_by,
              };

              await NDTTypeOffer.create(testObject);
            }
          }));
          return sendResponse(res, 200, true, {}, "NDT inspection offer added successfully");
        }
      });
    }
    const result = await NDTInspection.findByIdAndUpdate(id, {
      items: JSON.parse(items) || [],
      offered_by,
    });

    if (result) {
      return sendResponse(res, 200, true, {}, "NDT inspection offer updated successfully");
    }

  } catch (error) {
    sendResponse(res, 500, false, {}, "Something went wrong");
  }
}

const getOneMultiNDTMaster = async (report_no) => {
  try {
    let matchObj = { deleted: false }
    if (report_no) {
      matchObj = { ...matchObj, report_no: report_no }
    }

    const requestData = await NDTInspection.aggregate([
      { $match: matchObj },
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
        $lookup: {
          from: "multi-erp-weldvisual-inspections",
          localField: "weld_visual_id",
          foreignField: "_id",
          as: "weldVisualDetails",
        },
      },
      {
        $unwind: {
          path: "$weldVisualDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          matchingWeldItem: {
            $filter: {
              input: "$weldVisualDetails.items",
              as: "weldItem",
              cond: {
                $and: [
                  { $eq: ["$$weldItem.drawing_id", "$items.drawing_id"] },
                  { $eq: ["$$weldItem.grid_item_id", "$items.grid_item_id"] },
                ],
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "qualified_welder_lists",
          localField: "matchingWeldItem.weldor_no",
          foreignField: "_id",
          as: "welderDetails",
        },
      },
      {
        $lookup: {
          from: "multi-erp-fitup-inspections",
          localField: "weldVisualDetails.fitup_id",
          foreignField: "_id",
          as: "fitupDetails",
        },
      },
      {
        $unwind: {
          path: "$fitupDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          matchingFitupItem: {
            $filter: {
              input: "$fitupDetails.items",
              as: "fitupItem",
              cond: {
                $and: [
                  { $eq: ["$$fitupItem.drawing_id", "$items.drawing_id"] },
                  { $eq: ["$$fitupItem.grid_item_id", "$items.grid_item_id"] },
                ],
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "store-wps-masters",
          localField: "matchingFitupItem.wps_no",
          foreignField: "_id",
          as: "wpsDetails",
        },
      },
      {
        $lookup: {
          from: "joint-types",
          localField: "matchingFitupItem.joint_type",
          foreignField: "_id",
          as: "jointTypeDetails",
        },
      },
      {
        $addFields: {
          offer_name: { $arrayElemAt: ["$offerDetails.user_name", 0] },
          welder_no: { $arrayElemAt: ["$welderDetails.welderNo", 0] },
          wps_no: { $arrayElemAt: ["$wpsDetails.wpsNo", 0] },
          weldingProcess: { $arrayElemAt: ["$wpsDetails.weldingProcess", 0] },
          joint_type: {
            $map: {
              input: "$jointTypeDetails",
              as: "joint",
              in: "$$joint.name",
            },
          },
          drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
          gridItemDetails: { $arrayElemAt: ["$gridItemDetails", 0] },
        },
      },
      {
        $addFields: {
          gridDetails: {
            $arrayElemAt: ["$gridItemDetails.gridDetails", 0],
          },
          itemDetails: {
            $arrayElemAt: ["$gridItemDetails.itemDetails", 0],
          },
          projectDetails: {
            $arrayElemAt: ["$drawingDetails.projectDetails", 0],
          },
        },
      },
      {
        $addFields: {
          clientDetails: {
            $arrayElemAt: ["$projectDetails.clientDetails", 0],
          },
        },
      },
      {
        $project: {
          _id: 1,
          report_no: "$report_no",
          client: "$clientDetails.name",
          project_name: "$projectDetails.name",
          wo_no: "$projectDetails.work_order_no",
          offer_name: "$offer_name",
          ut_status: "$ut_status",
          rt_status: "$rt_status",
          mpt_status: "$mpt_status",
          lpt_status: "$lpt_status",
          items: {
            _id: "$items._id",
            drawing_no: "$drawingDetails.drawing_no",
            rev: "$drawingDetails.rev",
            assembly_no: "$drawingDetails.assembly_no",
            grid_no: "$gridDetails.grid_no",
            used_grid_qty: "$items.ndt_used_grid_qty",
            profile: "$itemDetails.name",
            joint_type: "$joint_type",
            wps_no: "$wps_no",
            weldingProcess: "$weldingProcess",
            welder_no: "$welder_no",
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
            offer_name: "$offer_name",
            ut_status: "$ut_status",
            rt_status: "$rt_status",
            mpt_status: "$mpt_status",
            lpt_status: "$lpt_status",
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
          offer_name: "$_id.offer_name",
          ut_status: "$_id.ut_status",
          rt_status: "$_id.rt_status",
          mpt_status: "$_id.mpt_status",
          lpt_status: "$_id.lpt_status",
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

exports.listOneMultiNDTMaster = async (req, res) => {
  const { report_no } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await getOneMultiNDTMaster(report_no)
      let requestData = data.result;

      if (data.status === 1) {
        sendResponse(res, 200, true, requestData, "NDT master data found");
      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, [], `NDT master data not found`)
      }
      else if (data.status === 2) {
        console.log("error", data.result);
        sendResponse(res, 500, false, {}, "Something went wrong1111");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.downloadOneMultiNDTMaster = async (req, res) => {
  const { report_no } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await getOneMultiNDTMaster(report_no)
      let requestData = data.result[0];

      if (data.status === 1) {
        let headerInfo = {
          report_no: requestData?.report_no,
          client: requestData?.client,
          project_name: requestData?.project_name,
          wo_no: requestData?.wo_no,
          offer_name: requestData?.offer_name,
          ut_status: requestData?.ut_status,
          rt_status: requestData?.rt_status,
          lpt_status: requestData?.lpt_status,
          mpt_status: requestData?.mpt_status,
        }
        const template = fs.readFileSync(
          "templates/multiNDTMaster.html",
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

        const pdfBuffer = await generatePDF(page, { print_date: true });

        await browser.close();

        const pdfsDir = path.join(__dirname, "../../../pdfs");
        if (!fs.existsSync(pdfsDir)) {
          fs.mkdirSync(pdfsDir);
        }

        const filename = `ndt_master_${Date.now()}.pdf`;
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
        sendResponse(res, 200, false, {}, `NDT master data not found`)
      }
      else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong1111");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};