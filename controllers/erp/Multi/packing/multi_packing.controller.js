const MultiPacking = require("../../../../models/erp/Multi/packing/multi_packing.model");
const PackingOfferTable = require("../../../../models/erp/Multi/offer_table_data/packing_offer_table.model");
const { sendResponse } = require("../../../../helper/response");
const { TitleFormat } = require("../../../../utils/enum");
const { default: mongoose } = require("mongoose");
const {
  Types: { ObjectId },
} = require("mongoose");
const ejs = require("ejs");
const fs = require("fs");
const puppeteer = require("puppeteer");
const path = require("path");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;
const { generatePDF, generatePDFA4 } = require("../../../../utils/pdfUtils");
const drawModel = require("../../../../models/erp/planner/draw.model");
const drawGridModel = require("../../../../models/erp/planner/draw_grid.model");
const multiReleaseNoteModel = require("../../../../models/erp/Multi/release_note/multi_release_note.model");
//  const mongoose = require("mongoose");
const BussinessProject = require("../../../../models/project.model"); // adjust path if needed
// exports.manageMultiPacking = async (req, res) => {
//      console.log("Hello Clicked  ");
//     const { items, project, consignment_no, destination, vehicle_no,
//         driver_name, gst_no, e_way_bill_no, remarks, packed_by, physical_weight } = req.body;

// console.log("request body",req.body);
//     if (!req.user || req.error) {
//         return sendResponse(res, 401, false, {}, "Unauthorized");
//     }
//     if (!items) {
//         return sendResponse(res, 400, false, {}, "Missing parameter");
//     }

//     const itemsArray = JSON.parse(items);
// console.log("item array",itemsArray);

//     try {
//         const lastPacking = await MultiPacking.findOne(
//             { deleted: false, voucher_no: { $regex: `/${project}/` } },
//             {},
//             { sort: { createdAt: -1 } }
//         );

//         let packingNo = lastPacking?.voucher_no
//             ? parseInt(lastPacking.voucher_no.split("/").pop()) + 1
//             : 1;

//         const gen_report_no =
//             TitleFormat.PACKINGNO.replace("/PROJECT/", `/${project}/`) + packingNo;

//         const result = await MultiPacking.create({
//             voucher_no: gen_report_no,
//             items: itemsArray,
//             consignment_no,
//             destination,
//             vehicle_no,
//             driver_name,
//             gst_no,
//             e_way_bill_no,
//             remarks,
//             packed_by,
//             physical_weight
//         });

//         console.log("result", result);
//         if (result) {
//             for (const item of itemsArray) {
//                 const { rn_offer_id } = item;
//                 const deletePackingOffer = await PackingOfferTable.deleteOne({ _id: new ObjectId(rn_offer_id), });
//             }
//             return sendResponse(res, 200, true, result, "Packing data added successfully");
//         } else {
//             return sendResponse(res, 400, false, {}, "Packing data not added");
//         }
//     } catch (error) {
//         console.log(error);
//         sendResponse(res, 500, false, {}, "Something went wrong");
//     }
// }
//

//working code 
// exports.manageMultiPacking = async (req, res) => {

//   const {
//     items,
//     project,
//     consignment_no,
//     destination,
//     vehicle_no,
//     driver_name,
//     gst_no,
//     e_way_bill_no,
//     remarks,
//     packed_by,
//     physical_weight,
//   } = req.body;

// console.log("req body", req.body);

//   if (!req.user || req.error) {
//     return sendResponse(res, 401, false, {}, "Unauthorized");
//   }

//   if (!items) {
//     return sendResponse(res, 400, false, {}, "Missing parameter: items");
//   }

//   let itemsArray;
//   try {
//     itemsArray = JSON.parse(items);
//   } catch (err) {
//     return sendResponse(res, 400, false, {}, "Invalid JSON in items");
//   }



//   try {
//     // Normalize items based on whether it's grid-wise or drawing-wise
//     const normalizedItems = itemsArray.map((item) => {
//       const isDrawingWise = item.rn_id && item.drawing_id && item.grid_id;

//       if (isDrawingWise) {
//         return {
//           rn_id: new ObjectId(item.rn_id),
//           drawing_id: new ObjectId(item.drawing_id),
//           grid_id: new ObjectId(item.grid_id),
//           rn_balance_grid_qty: item.rn_balance_grid_qty || 0,
//           rn_used_grid_qty: item.rn_used_grid_qty || 0,
//           moved_next_step: 0,
//           unit_assembly_weight: item.unit_assembly_weight || 0,
//           total_assembly_weight: item.total_assembly_weight || 0,
//           remarks: item.remarks || "",
//         };
//       } else {
//         // Treat as grid-wise, remove any ID fields if present
//         return {
//           item_name: item.item_name || "",
//           drawing_no: item.drawing_no || "",
//           grid_no: item.grid_no || "",
//           irn_no: item.irn_no || "",
//           //  irn_no: new ObjectId(item.irn_no),
//           // drawing_no: new ObjectId(item.drawing_no),
//           // grid_no: new ObjectId(item.grid_no),
//           rn_balance_grid_qty: item.rn_balance_grid_qty || 0,
//           rn_used_grid_qty: item.rn_used_grid_qty || 0,
//           moved_next_step: 0,
//           unit_assembly_weight: item.unit_assembly_weight || 0,
//           total_assembly_weight: item.total_assembly_weight || 0,
//           remarks: item.remarks || "",
//         };
//       }
//     });

//     const lastPacking = await MultiPacking.findOne(
//       { deleted: false, voucher_no: { $regex: `/${project}/` } },
//       {},
//       { sort: { createdAt: -1 } }
//     );

//     let packingNo = lastPacking?.voucher_no
//       ? parseInt(lastPacking.voucher_no.split("/").pop()) + 1
//       : 1;

//     const gen_report_no =
//       TitleFormat.PACKINGNO.replace("/PROJECT/", `/${project}/`) + packingNo;

//     const result = await MultiPacking.create({
//       voucher_no: gen_report_no,
     
//       items: normalizedItems,
//       consignment_no,
//       destination,
//       vehicle_no,
//       driver_name,
//       gst_no,
//       e_way_bill_no,
//       remarks,
//       packed_by,
//       physical_weight,
//     });

  
//     // if (result) {
//     //   for (const item of normalizedItems) {
//     //     if (item.rn_offer_id) {
//     //       await PackingOfferTable.deleteOne({
//     //         _id: new ObjectId(item.rn_offer_id),
//     //       });
//     //     }
//     //   }
//     //   return sendResponse(
//     //     res,
//     //     200,
//     //     true,
//     //     result,
//     //     "Packing data added successfully"
//     //   );
//     // }
    
//      if (result) {
//             for (const item of itemsArray) {
//                 const { rn_offer_id } = item;
//                 const deletePackingOffer = await PackingOfferTable.deleteOne({ _id: new ObjectId(rn_offer_id), });
//             }
//             return sendResponse(res, 200, true, result, "Packing data added successfully");
//         }
//     else {
//       return sendResponse(res, 400, false, {}, "Packing data not added");
//     }
//   } catch (error) {
//     console.error("Error in manageMultiPacking:", error);
//     sendResponse(res, 500, false, {}, "Something went wrong");
//   }
// };


// final working code - add project_id

exports.manageMultiPacking = async (req, res) => {
  const {
    items,
    project,
    project_id,
    consignment_no,
    destination,
    vehicle_no,
    driver_name,
    gst_no,
    e_way_bill_no,
    remarks,
    packed_by,
    physical_weight,
  } = req.body;

  console.log("req body", req.body);

  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  if (!items) {
    return sendResponse(res, 400, false, {}, "Missing parameter: items");
  }

  let itemsArray;
  try {
    itemsArray = JSON.parse(items);
  } catch (err) {
    return sendResponse(res, 400, false, {}, "Invalid JSON in items");
  }

  try {
    // Step 1: Resolve project_id
    let finalProjectId;
    if (project_id && ObjectId.isValid(project_id)) {
      finalProjectId = new ObjectId(project_id);
    } else {
      const foundProject = await BussinessProject.findOne({
        name: { $regex: `^${project}$`, $options: "i" },
      });

      if (!foundProject) {
        return sendResponse(res, 400, false, {}, `Project "${project}" not found`);
      }

      finalProjectId = foundProject._id;
    }
    console.log("Saving packing with project_id:", finalProjectId);


    // Step 2: Normalize items
    const normalizedItems = itemsArray.map((item) => {
      const isDrawingWise = item.rn_id && item.drawing_id && item.grid_id;

      if (isDrawingWise) {
        return {
          rn_id: new ObjectId(item.rn_id),
          drawing_id: new ObjectId(item.drawing_id),
          grid_id: new ObjectId(item.grid_id),
          rn_balance_grid_qty: item.rn_balance_grid_qty || 0,
          rn_used_grid_qty: item.rn_used_grid_qty || 0,
          moved_next_step: 0,
          unit_assembly_weight: item.unit_assembly_weight || 0,
          total_assembly_weight: item.total_assembly_weight || 0,
          remarks: item.remarks || "",
        };
      } else {
        return {
          item_name: item.item_name || "",
          drawing_no: item.drawing_no || "",
          grid_no: item.grid_no || "",
          irn_no: item.irn_no || "",
           project_id: finalProjectId, // ✅ project_id stored
          rn_balance_grid_qty: item.rn_balance_grid_qty || 0,
          rn_used_grid_qty: item.rn_used_grid_qty || 0,
          moved_next_step: 0,
          unit_assembly_weight: item.unit_assembly_weight || 0,
          total_assembly_weight: item.total_assembly_weight || 0,
          remarks: item.remarks || "",
        };
      }
    });

    // Step 3: Generate voucher number
    const lastPacking = await MultiPacking.findOne(
      { deleted: false, voucher_no: { $regex: `/${project}/` } },
      {},
      { sort: { createdAt: -1 } }
    );

    let packingNo = lastPacking?.voucher_no
      ? parseInt(lastPacking.voucher_no.split("/").pop()) + 1
      : 1;

    const gen_report_no =
      TitleFormat.PACKINGNO.replace("/PROJECT/", `/${project}/`) + packingNo;

    // Step 4: Save packing
    const result = await MultiPacking.create({
      voucher_no: gen_report_no,
    
      items: normalizedItems,
      consignment_no,
      destination,
      vehicle_no,
      driver_name,
      gst_no,
      e_way_bill_no,
      remarks,
      packed_by,
      physical_weight,
    });
console.log("Saved MultiPacking:", result);

    // Step 5: Delete used rn_offer_id if exists
    if (result) {
      for (const item of itemsArray) {
        const { rn_offer_id } = item;
        if (rn_offer_id) {
          await PackingOfferTable.deleteOne({ _id: new ObjectId(rn_offer_id) });
        }
      }

      return sendResponse(res, 200, true, result, "Packing data added successfully");
    } else {
      return sendResponse(res, 400, false, {}, "Packing data not added");
    }
  } catch (error) {
    console.error("Error in manageMultiPacking:", error);
    sendResponse(res, 500, false, {}, "Something went wrong");
  }
};


exports.getMultiPacking = async (req, res) => {
  const { project_keyword, project_id } = req.body;
 
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search?.trim();
 
  const projectObjectId = project_id ? new mongoose.Types.ObjectId(project_id) : null;
 
  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }
 
  try {
    const pipeline = [
      // First match for basic filters
      {
        $match: {
          deleted: false,
          ...(project_keyword && {
            voucher_no: { $regex: project_keyword, $options: "i" },
          }),
        },
      },
      { $unwind: "$items" },
     
      // Lookups
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
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "packed_by",
          foreignField: "_id",
          as: "packedByDetails",
        },
      },
      {
        $lookup: {
          from: "multi-erp-ins-release-notes",
          localField: "items.rn_id",
          foreignField: "_id",
          as: "rnOfferDetails",
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
 
      // Add joined fields
      {
        $addFields: {
          drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
          packedByDetails: { $arrayElemAt: ["$packedByDetails", 0] },
          gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
          rnOfferDetails: { $arrayElemAt: ["$rnOfferDetails", 0] },
          projectDetails: {
            $arrayElemAt: [{ $ifNull: ["$drawingDetails.projectDetails", []] }, 0],
          },
        },
      },
      // Second match (after lookups and addFields)
      ...(search
        ? [
            {
              $match: {
                $or: [
                  { voucher_no: { $regex: search, $options: "i" } },
                  { consignment_no: { $regex: search, $options: "i" } },
                  { destination: { $regex: search, $options: "i" } },   // ✅ added
                  { vehicle_no: { $regex: search, $options: "i" } },
                  { driver_name: { $regex: search, $options: "i" } },
                  { gst_no: { $regex: search, $options: "i" } },
                  { e_way_bill_no: { $regex: search, $options: "i" } },
                  { remarks: { $regex: search, $options: "i" } },
                  { "packedByDetails.user_name": { $regex: search, $options: "i" } },
                  { "drawingDetails.drawing_no": { $regex: search, $options: "i" } },
                  { "gridDetails.grid_no": { $regex: search, $options: "i" } },
                  { "rnOfferDetails.report_no": { $regex: search, $options: "i" } },
                  { "items.item_name": { $regex: search, $options: "i" } },
                  { "items.drawing_no": { $regex: search, $options: "i" } },  // ✅ added
                  { "items.grid_no": { $regex: search, $options: "i" } },     // ✅ added
                  { "items.irn_no": { $regex: search, $options: "i" } },      // ✅ added
                  { "items.unit_area": { $regex: search, $options: "i" } },   // ✅ added
                  { "items.assembly_no": { $regex: search, $options: "i" } }, // ✅ added
                  { project_name: { $regex: search, $options: "i" } },        // ✅ added
                ],
              },
            },
          ]
        : []),
      // Optional project filter
      ...(projectObjectId
        ? [
            {
              $match: {
                $or: [
                  { "drawingDetails.project": projectObjectId },
                  { "items.project_id": projectObjectId },
                ],
              },
            },
          ]
        : []),
 
      // Group by voucher_no
      {
        $group: {
          _id: "$voucher_no",
          voucher_no: { $first: "$voucher_no" },
          consignment_no: { $first: "$consignment_no" },
          destination: { $first: "$destination" },
          vehicle_no: { $first: "$vehicle_no" },
          driver_name: { $first: "$driver_name" },
          gst_no: { $first: "$gst_no" },
          e_way_bill_no: { $first: "$e_way_bill_no" },
          packing_date: { $first: "$packing_date" },
          remarks: { $first: "$remarks" },
          packed_by_id: { $first: "$packed_by" },
          packed_by_name: { $first: "$packedByDetails.user_name" },
          physical_weight: { $first: "$physical_weight" },
          createdAt: { $first: "$createdAt" },
          project_name: { $first: "$projectDetails.name" },
          project_id: { $first: { $ifNull: ["$items.project_id", "$drawingDetails.project"] } },
          items: {
            $push: {
              $mergeObjects: [
                "$items",
                {
                  unit_area: "$drawingDetails.unit",
                  assembly_no: {
                    $ifNull: ["$drawingDetails.assembly_no", "$items.item_name"],
                  },
                  item_name: "$items.item_name",
                  grid_no: "$gridDetails.grid_no",
                  irn_no: "$rnOfferDetails.report_no",
                  drawing_no: "$drawingDetails.drawing_no",
                },
              ],
            },
          },
        },
      },
 
      // Sort and paginate
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];
 
    const result = await MultiPacking.aggregate(pipeline);
 
    const data = result[0]?.data || [];
    const totalCount = result[0]?.totalCount[0]?.count || 0;
 
    sendResponse(res, 200, true, {
      data,
      pagination: {
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
      },
    }, "Grouped packing data");
 
  } catch (error) {
    console.error("getMultiPackingGrouped error:", error);
    sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

const getOnePacking = async (voucher_no) => {
  try {
    const result = await MultiPacking.aggregate([
      {
        $match: {
          deleted: false,
          voucher_no: voucher_no,
        },
      },
      // { $unwind: "$items" },

      // Drawing with nested lookups to project and client
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
          from: "users",
          localField: "packed_by",
          foreignField: "_id",
          as: "packedByDetails",
        },
      },
      {
        $lookup: {
          from: "multi-erp-ins-release-notes",
          localField: "items.rn_id",
          foreignField: "_id",
          as: "rnOfferDetails",
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

      // Flatten all arrays
      {
        $addFields: {
          drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
          packedByDetails: { $arrayElemAt: ["$packedByDetails", 0] },
          gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
          rnOfferDetails: { $arrayElemAt: ["$rnOfferDetails", 0] },
          projectDetails: { $arrayElemAt: ["$drawingDetails.projectDetails", 0] },
          clientDetails: { $arrayElemAt: ["$projectDetails.clientDetails", 0] },
        },
      },

      // Group and shape final output
      {
        $group: {
          _id: "$voucher_no",
          voucher_no: { $first: "$voucher_no" },
          client: { $first: "$projectDetails.clientDetails.name" },
          project_name: { $first: "$projectDetails.name" },
          wo_no: { $first: "$projectDetails.work_order_no" },
          project_po_no: { $first: "$projectDetails.work_order_no" }, // or update if separate PO field
          consignment_no: { $first: "$consignment_no" },
          destination: { $first: "$destination" },
          vehicle_no: { $first: "$vehicle_no" },
          driver_name: { $first: "$driver_name" },
          gst_no: { $first: "$gst_no" },
          e_way_bill_no: { $first: "$e_way_bill_no" },
          packing_date: { $first: "$packing_date" },
          remarks: { $first: "$remarks" },
          physical_weight: { $first: "$physical_weight" },
          packed_by: { $first: "$packedByDetails.user_name" },

          items: {
            $push: {
              $mergeObjects: [
                "$items",
                {
                  unit_area: { $ifNull: ["$drawingDetails.unit", "--"] },
                  assembly_no: {
                    $ifNull: ["$drawingDetails.assembly_no", "$items.item_name"],
                  },
                  item_name: "$items.item_name",
                  grid_no: "$gridDetails.grid_no",
                  irn_no: "$rnOfferDetails.report_no",
                  drawing_no: {
                    $ifNull: ["$drawingDetails.drawing_no", "$items.drawing_no"],
                  },
                },
              ],
            },
          },
        },
      },
    ]);

   
    return { status: 1, result: result };
  } catch (err) {
    console.error("getOnePacking error:", err);
    return { status: 2 };
  }
};


exports.downloadOneMultiPacking = async (req, res) => {
  const { voucher_no, print_date } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await getOnePacking(voucher_no);
      let requestData = data.result[0];

      if (data.status === 1) {
        let headerInfo = {
          report_no: requestData?.voucher_no,
          packed_by: requestData?.packed_by,
          client: requestData?.client,
          project_name: requestData?.project_name,
          wo_no: requestData?.wo_no,
          project_po_no: requestData?.project_po_no,
          consignment_no: requestData?.consignment_no,
          destination: requestData?.destination,
          vehicle_no: requestData?.vehicle_no,
          driver_name: requestData?.driver_name,
          gst_no: requestData?.gst_no,
          e_way_bill_no: requestData?.e_way_bill_no,
          packing_date: requestData?.packing_date,
          remarks: requestData?.remarks,
          physical_weight: requestData?.physical_weight,
        };
        const template = fs.readFileSync(
          "templates/multiPackingList.html",
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

        const pdfBuffer = await generatePDFA4(page, { print_date });

        await browser.close();

        const pdfsDir = path.join(__dirname, "../../../../pdfs");
        if (!fs.existsSync(pdfsDir)) {
          fs.mkdirSync(pdfsDir);
        }

        const filename = `packing_${Date.now()}.pdf`;
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
      } else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Packing data not found`);
      } else if (data.status === 2) {
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
