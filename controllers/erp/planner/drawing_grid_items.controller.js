const DrawingItem = require("../../../models/erp/planner/draw_grid_items.model");
const GridMaster = require("../../../models/erp/planner/draw_grid.model");
const { sendResponse } = require("../../../helper/response");
const { default: mongoose } = require("mongoose");
const {
  Types: { ObjectId },
} = require("mongoose");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const Draw = require("../../../models/erp/planner/draw.model");

exports.manageDrawingItem = async (req, res) => {
  const {
    id,
    drawing_id,
    grid_id,
    item_name,
    item_qty,
    item_length,
    item_width,
    item_weight,
    item_no,
    assembly_surface_area,
    assembly_weight,
    joint_type,
  } = req.body;

  const parseJointType = JSON.parse(joint_type);

  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  if (!drawing_id || !grid_id || !item_name) {
    return sendResponse(res, 400, false, {}, "Missing parameter");
  }

  try {
    const gridDetails = await GridMaster.findById(grid_id);

    if (!gridDetails) {
      return sendResponse(res, 404, false, {}, "Grid not found");
    }

    if (id) {
      const updatedDrawingItem = await DrawingItem.findByIdAndUpdate(
        id,
        {
          drawing_id,
          grid_id,
          item_name,
          item_qty,
          item_length,
          item_width,
          item_weight,
          item_no,
          assembly_surface_area,
          assembly_weight,
          joint_type: parseJointType,
        },
        { new: true, runValidators: true }
      );

      if (!updatedDrawingItem) {
        return sendResponse(res, 404, false, {}, "Drawing item not found");
      }

      return sendResponse(
        res,
        200,
        true,
        updatedDrawingItem,
        "Drawing item updated successfully"
      );
    } else {
      const newDrawingItem = new DrawingItem({
        drawing_id,
        grid_id,
        item_name,
        item_qty,
        item_length,
        item_width,
        item_weight,
        item_no,
        assembly_surface_area,
        assembly_weight,
        balance_grid: gridDetails?.grid_qty,
        used_grid: 0,
        joint_type: parseJointType,
      });

      const savedDrawingItem = await newDrawingItem.save();

      return sendResponse(
        res,
        201,
        true,
        savedDrawingItem,
        "Drawing item created successfully"
      );
    }
  } catch (error) {
    return sendResponse(res, 500, false, {}, error.message);
  }
};

exports.getDrawingItems = async (req, res) => {
  const { drawing_id } = req.body;

  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }
  if (!drawing_id || drawing_id === "null" || drawing_id === "undefined") {
    return sendResponse(res, 400, false, {}, "Invalid drawing_id provided");
  }
  try {
    let filter = { deleted: false, drawing_id };
    if (drawing_id) {
      filter.drawing_id = drawing_id;
    }

    const drawingItems = await DrawingItem.find(filter, {
      createdAt: 0,
      updatedAt: 0,
      deleted: false,
    })
      .populate({
        path: "drawing_id",
        select: "drawing_no rev sheet_no assembly_no",
      })
      .populate({
        path: "grid_id",
        select: "grid_no grid_qty",
      })
      .populate({
        path: "item_name",
        select: "name",
      })
      .populate({
        path: "joint_type",
        select: "name"
      })

    if (!drawingItems || drawingItems.length === 0) {
      return sendResponse(res, 200, true, [], "Drawing item not found");
    }

    return sendResponse(
      res,
      200,
      true,
      drawingItems,
      "Drawing items retrieved successfully"
    );
  } catch (error) {
    return sendResponse(res, 500, false, {}, error.message);
  }
};

// exports.getDrawingMasterData = async (req, res) => {
//   if (!req.user || req.error) {
//     return sendResponse(res, 401, false, {}, "Unauthorized");
//   }

//   try {
//     const limit = Math.min(parseInt(req.query.limit) || 10, 100);
//     const page = Math.max(parseInt(req.query.page) || 1, 1);


//     const { id, drawing_id, grid_id } = req.query;
//     console.log("req.query",req.query );
//     const { project } = req.body;
//     console.log("project",req.body);
//     if (!project) {
//       return sendResponse(res, 400, false, {}, "Project is required.");
//     }

//     let filter = { deleted: false };
//     if (id) filter._id = id;
//     if (drawing_id) filter.drawing_id = drawing_id;
//     if (grid_id) filter.grid_id = grid_id;

//     // Step 1: Get drawing_ids that match the project
//     const drawingIdsMatchingProject = await Draw.find({
//       deleted: false,
//       project: project,
//     }).distinct("_id");


//     if (!drawingIdsMatchingProject.length) {
//       return sendResponse(res, 404, false, {}, "No drawings found for this project.");
//     }


//     // Step 2: Filter drawing_ids from DrawingItem
//     const allDrawingIds = await DrawingItem.distinct("drawing_id", {
//       ...filter,
//       drawing_id: { $in: drawingIdsMatchingProject },
//     });

//     const totalRecords = allDrawingIds.length;
//     const totalPages = Math.ceil(totalRecords / limit);
//     const paginatedDrawingIds = allDrawingIds.slice((page - 1) * limit, page * limit);

//     // Step 3: Fetch items for paginated drawing_ids
//     let drawingItems = await DrawingItem.find({
//       ...filter,
//       drawing_id: { $in: paginatedDrawingIds },
//     })
//       .populate({
//         path: "drawing_id",
//         match: { deleted: false },
//         populate: {
//           path: "project",
//         },
//       })
//       .populate("grid_id")
//       .populate({ path: "item_name", select: "name" })
//       .populate({ path: "joint_type", select: "name" })
//       .lean();

//     // Step 4: Group by drawing_id
//     const groupedData = drawingItems.reduce((acc, item) => {
//       const drawingId = String(item?.drawing_id?._id) || "Unknown";
//       if (!acc[drawingId]) {
//         acc[drawingId] = {
//           drawing_id: item?.drawing_id?._id,
//           drawing_no: item?.drawing_id?.drawing_no,
//           rev: item?.drawing_id?.rev,
//           sheet_no: item?.drawing_id?.sheet_no,
//           items: [],
//         };
//       }
//       acc[drawingId].items.push(item);
//       return acc;
//     }, {});

//     const result = Object.values(groupedData);

//     return sendResponse(
//       res,
//       200,
//       true,
//       {
//         pagination: {
//           totalRecords,
//           totalPages,
//           currentPage: page,
//           limit,
//         },
//         data: result,
//       },
//       "Drawing items fetched successfully"
//     );
//   } catch (error) {
//     return sendResponse(res, 500, false, {}, "Something went wrong: " + error.message);
//   }
// };

exports.getDrawingMasterData = async (req, res) => {
  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const page = Math.max(parseInt(req.query.page) || 1, 1);

    const {
      id,
      search
    } = req.query;

    const { project } = req.body;

    if (!project) {
      return sendResponse(res, 400, false, {}, "Project is required.");
    }

    let filter = { deleted: false };
    if (id) filter._id = id;


    // Create regex from search term
    const searchRegex = search ? new RegExp(search, "i") : null;

    // Step 1: Get drawing IDs matching project and search (drawing_no, assembly_no)
    const drawingMatchFilter = { deleted: false, project };

    if (searchRegex) {
      drawingMatchFilter.$or = [
        { drawing_no: searchRegex },
        { assembly_no: searchRegex },
      ];
    }

    const drawingIdsMatchingProject = await Draw.find(drawingMatchFilter).distinct("_id");

    if (!drawingIdsMatchingProject.length) {
      return sendResponse(res, 404, false, {}, "No drawings found for this project.");
    }

    // Step 2: Get distinct drawing IDs from DrawingItem
    const allDrawingIds = await DrawingItem.distinct("drawing_id", {
      ...filter,
      drawing_id: { $in: drawingIdsMatchingProject },
    });

    const totalRecords = allDrawingIds.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const paginatedDrawingIds = allDrawingIds.slice((page - 1) * limit, page * limit);

    // Step 3: Prepare item-level filter
    const itemSearchFilter = {
      ...filter,
      drawing_id: { $in: paginatedDrawingIds },
    };

    if (searchRegex) {
      itemSearchFilter.$or = [
        { section_details: searchRegex },
        { item_no: searchRegex },
        // grid_no will be filtered after population
      ];
    }

    // Step 4: Query drawing items with populations
    let drawingItems = await DrawingItem.find(itemSearchFilter)
      .populate({
        path: "drawing_id",
        match: { deleted: false },
        populate: {
          path: "project",
        },
      })
      .populate("grid_id")
      .populate({ path: "item_name", select: "name" })
      .populate({ path: "joint_type", select: "name" })
      .lean();

    // Step 5: Post-population filtering for grid_no if search is used
    if (searchRegex) {
      drawingItems = drawingItems.filter(item =>
        searchRegex.test(item?.grid_id?.grid_no || '')
      );
    }

    // Step 6: Group items by drawing_id
    const groupedData = drawingItems.reduce((acc, item) => {
      const drawingId = String(item?.drawing_id?._id) || "Unknown";
      if (!acc[drawingId]) {
        acc[drawingId] = {
          drawing_id: item?.drawing_id?._id,
          drawing_no: item?.drawing_id?.drawing_no,
          rev: item?.drawing_id?.rev,
          sheet_no: item?.drawing_id?.sheet_no,
          items: [],
        };
      }
      acc[drawingId].items.push(item);
      return acc;
    }, {});

    const result = Object.values(groupedData);

    // Optional Debug Logs (remove in production)
    console.log("Total drawing items after filtering:", drawingItems.length);
    console.log("Search term:", search);
    console.log("Regex used:", searchRegex);
    console.log("Result count:", result.length);

    return sendResponse(
      res,
      200,
      true,
      {
        pagination: {
          totalRecords,
          totalPages,
          currentPage: page,
          limit,
        },
        data: result,
      },
      "Drawing items fetched successfully"
    );
  } catch (error) {
    return sendResponse(res, 500, false, {}, "Something went wrong: " + error.message);
  }
};

exports.getDrawingMasterDataExcelDownload = async (req, res) => {

  const { id, download, project } = req.body;

  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  try {
    let query = { deleted: false };
    if (id) query._id = id;

    if (project) {
      const drawingIdsMatchingProject = await Draw.find({
        deleted: false,
        project: project,
      }).distinct("_id");

      // Add to query to only include these drawing IDs
      query.drawing_id = { $in: drawingIdsMatchingProject };
      console.log("✅ drawingIdsMatchingProject:", drawingIdsMatchingProject);
    }


    let drawingItems = await DrawingItem.find(query)
      .populate("grid_id")
      .populate({ path: "item_name", select: "name" })
      .populate({ path: "joint_type", select: "name" })

      .populate({
        path: "drawing_id",
        match: { deleted: false },
        populate: [

          {
            path: "project",
            model: "bussiness-projects",
            populate: [
              { path: "party", select: "name partyGroup" },
              { path: "projectManager", select: "name" },
              { path: "department", select: "name" },
              { path: "location", select: "name" },
            ],
          },
          { path: "issued_person", model: "Contractor", select: "name email phone" },
        ],
      });

    console.log("hellooo", drawingItems[0].drawing_id);

    if (project) {
      drawingItems = drawingItems.filter(
        (item) => String(item?.drawing_id?.project?._id) === String(project)
      );
    }

    if (!drawingItems || drawingItems.length === 0) {
      return sendResponse(res, 404, false, [], "No drawing items found for this project");
    }

    if (download === "excel") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Drawing Master Data");


      try {
        const logoUrl = process.env.LOGO_URL_1;
        if (logoUrl) {
          const logoBuffer = await axios.get(logoUrl, { responseType: "arraybuffer" });
          const imageId = workbook.addImage({ buffer: logoBuffer.data, extension: "png" });
          worksheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 150, height: 60 } });
        }
      } catch (err) {
        console.warn(" Logo load failed:", err.message);
      }


      worksheet.mergeCells("C1:T1");
      worksheet.getCell("C1").value = "VISHAL ENTERPRISE & VRISHAL ENGINEERING PRIVATE LIMITED";
      worksheet.getCell("C1").font = { size: 14, bold: true };
      worksheet.getCell("C1").alignment = { horizontal: "center" };

      worksheet.mergeCells("C2:T2");
      worksheet.getCell("C2").value = "GROUP OF COMPANIES";
      worksheet.getCell("C2").font = { size: 12, bold: true };
      worksheet.getCell("C2").alignment = { horizontal: "center" };

      worksheet.mergeCells("C3:T3");
      worksheet.getCell("C3").value = "DRAWING MASTER DATA - STRUCTURAL";
      worksheet.getCell("C3").font = { size: 12, bold: true };
      worksheet.getCell("C3").alignment = { horizontal: "center" };



      worksheet.mergeCells("A5:B5");
      worksheet.getCell("A5").value = "CLIENT";
      worksheet.getCell("A5").font = { bold: true };
      worksheet.getCell("C5").value = drawingItems[0]?.drawing_id?.project?.party?.name || "N/A";

      worksheet.mergeCells("A6:B6");
      worksheet.getCell("A6").value = "PROJECT";
      worksheet.getCell("A6").font = { bold: true };
      worksheet.getCell("C6").value = drawingItems[0]?.drawing_id?.project?.name || "N/A";


      worksheet.mergeCells("S5:T5");
      worksheet.getCell("S5").value = "PO NUMBER";
      worksheet.getCell("S5").font = { bold: true };
      worksheet.getCell("U5").value = drawingItems[0]?.drawing_id?.project?.work_order_no || "N/A";

      worksheet.mergeCells("S6:T6");
      worksheet.getCell("S6").value = "PDF DOWNLOAD DATE";
      worksheet.getCell("S6").font = { bold: true };
      worksheet.getCell("U6").value = new Date().toLocaleDateString();

      // ---------- TOTAL CALCULATION BEFORE DATA ROWS ----------

      let total_assembly_total_qty = 0;
      let total_grid_qty = 0;
      let total_item_qty = 0;
      let total_length = 0;
      let total_width = 0;
      let total_item_weight = 0;
      let total_assembly_weight = 0;
      let total_total_weight = 0;
      let total_area = 0;
      let total_sqm = 0;

      drawingItems.forEach(it => {
        total_grid_qty += Number(it?.grid_id?.grid_qty || 0);
        total_item_qty += Number(it?.item_qty || 0);
        total_length += Number(it?.item_length || 0);
        total_width += Number(it?.item_width || 0);
        total_item_weight += Number(it?.item_weight || 0);
        total_assembly_weight += Number(it?.assembly_weight || 0);
        total_assembly_total_qty += Number(it?.drawing_id?.assembly_quantity || 0);

        const tw = it?.assembly_weight && it?.grid_id?.grid_qty ? (it.assembly_weight * it.grid_id.grid_qty) : 0;
        total_total_weight += tw;

        total_area += Number(it?.assembly_surface_area || 0);
        total_sqm += Number(it?.assembly_surface_area || 0) * Number(it?.grid_id?.grid_qty || 0);
      });

      // ---------- ADD TOTAL ROW BEFORE ITEM ROWS ----------
      const totalRow = worksheet.addRow([
        "TOTAL",
        "",
        "",
        "",
        "",
        total_assembly_total_qty,
        "",
        "",
        "",
        "",
        "",
        "",
        total_grid_qty,
        "",
        "",
        total_item_qty,
        total_length,
        total_width,
        total_item_weight,
        total_assembly_weight,
        total_total_weight,
        total_area,
        total_sqm
      ]);

      totalRow.height = 28;

      totalRow.eachCell(cell => {
        cell.font = { bold: true, size: 14 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE699" } };
        cell.border = {
          top: { style: "medium" },
          bottom: { style: "medium" },
          left: { style: "thin" },
          right: { style: "thin" }
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      // Merge TOTAL label across A–K
      const totalRowNum = totalRow.number;
      worksheet.mergeCells(`A${totalRowNum}:E${totalRowNum}`);
      worksheet.getCell(`A${totalRowNum}`).font = { bold: true, size: 16 };
      worksheet.getCell(`A${totalRowNum}`).alignment = { horizontal: "center", vertical: "middle" };


      const headers = [
        "SR NO", "DRAWING NO.", "REV NO.", "SHEET NO.", "ASSEMBLY NUMBER",
        "ASSEMBLY TOTAL QTY (NOS)", "UNIT / AREA", "DRAWING RECEIVE DATE",
        "DRAWING ENTRY DATE", "DRAWING ISSUE DATE", "ISSUED TO",
        "GRID NO.", "GRID QTY.", "SECTION DETAILS", "ITEM NO.",
        "ITEM QTY. (NOS)", "LENGTH (MM)", "WIDTH (MM)", "ITEM WEIGHT (Kg)",
        "ASSEMBLY WEIGHT", "TOTAL WEIGHT", "ASSEMBLY AREA / SQUARE METER", "TOTAL SQM"
      ];
      worksheet.addRow(headers);

      const headerRow = worksheet.getRow(8);
      headerRow.font = { bold: true };
      headerRow.alignment = { horizontal: "center", vertical: "middle" };
      headerRow.eachCell((cell) => {
        cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F6B26B" } };
      });

      const groupedData = drawingItems.reduce((acc, item) => {

        const drawingNo = item?.drawing_id?._id?.toString() || "Unknown";
        if (!acc[drawingNo]) {
          acc[drawingNo] = { drawing: item.drawing_id, items: [] };

        }
        acc[drawingNo].items.push(item);
        return acc;
      }, {});



      let sr = 1;
      for (const [_, group] of Object.entries(groupedData)) {
        const { drawing, items } = group;
        const startRow = worksheet.lastRow.number + 1;
        const totalSqm =
          items.reduce(
            (sum, item) =>
              sum + Number(item?.assembly_surface_area || 0),
            0
          ) * Number(items[0]?.grid_id?.grid_qty || 0);

        for (const it of items) {

          worksheet.addRow([
            sr,
            drawing?.drawing_no || "-",
            drawing?.rev || "-",
            drawing?.sheet_no || "-",
            drawing?.assembly_no || "-",
            drawing?.assembly_quantity || "-",
            drawing?.unit || "-",
            drawing?.draw_receive_date ? new Date(drawing.draw_receive_date).toLocaleDateString() : "-",
            drawing?.master_updation_date ? new Date(drawing.master_updation_date).toLocaleDateString() : "-",
            drawing?.issued_date ? new Date(drawing.issued_date).toLocaleDateString() : "-",
            drawing?.issued_person?.name || "-",
            it?.grid_id?.grid_no || "-",
            it?.grid_id?.grid_qty || "-",
            it?.item_name?.name || "-",
            it?.item_no || "-",
            it?.item_qty ? Number(it.item_qty) : 0,
            it?.item_length ? Number(it.item_length) : 0,
            it?.item_width ? Number(it.item_width) : 0,
            it?.item_weight ? Number(it.item_weight) : 0,
            it?.assembly_weight ? Number(it.assembly_weight) : 0,
            it?.assembly_weight && it?.grid_id?.grid_qty ? Number((it.assembly_weight * it.grid_id.grid_qty).toFixed(2)) : 0,
            it?.assembly_surface_area ? Number(it.assembly_surface_area) : 0,
            // TOTAL SQM
            Number(totalSqm.toFixed(2)) || 0
          ]);
        }

        const endRow = worksheet.lastRow.number;
        ["A", "B", "C", "D", "F", "L", "M", "W"].forEach((col) => {
          if (endRow > startRow) {
            worksheet.mergeCells(`${col}${startRow}:${col}${endRow}`);
            worksheet.getCell(`${col}${startRow}`).alignment = { vertical: "middle", horizontal: "center" };
          }
        });

        sr++;
      }

      // Column width + wrap text
      worksheet.columns.forEach((col) => {
        col.width = 20;
        col.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      });


      // Add borders
      worksheet.eachRow((row, rowNum) => {
        if (rowNum >= 8) {
          row.eachCell((cell) => {
            cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
          });
        }
      });




      const xlsxPath = path.join(__dirname, "../../../xlsx");
      if (!fs.existsSync(xlsxPath)) fs.mkdirSync(xlsxPath, { recursive: true });

      const filename = `Drawing_Master_Data_${Date.now()}.xlsx`;
      const filePath = path.join(xlsxPath, filename);
      await workbook.xlsx.writeFile(filePath);

      const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
      const fileUrl = `${protocol}://${req.get("host")}/xlsx/${filename}`;

      return sendResponse(res, 200, true, { file: fileUrl, report_name: "Drawing Master Data" }, "Excel file generated successfully");
    }


    return sendResponse(res, 200, true, drawingItems, "Drawing items fetched successfully");

  } catch (error) {
    console.error(" Excel Export Error:", error);
    return sendResponse(res, 500, false, {}, "Failed to export Drawing Master Excel");
  }
};

exports.deleteDrawingItem = async (req, res) => {
  const { id } = req.body;

  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  if (!id) {
    return sendResponse(res, 400, false, {}, "Drawing item id is required");
  }
  try {
    const deletedDrawingItem = await DrawingItem.findByIdAndDelete(id);

    if (!deletedDrawingItem) {
      return sendResponse(res, 404, false, {}, "Drawing item not found");
    }

    return sendResponse(
      res,
      200,
      true,
      {},
      "Drawing item deleted successfully"
    );
  } catch (error) {
    return sendResponse(res, 500, false, {}, error.message);
  }
};

exports.updateGridBalance = async (req, res) => {
  const { updateItems, flag } = req.body;
  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  if (!updateItems || updateItems.length === 0 || !flag) {
    return sendResponse(res, 400, false, {}, "Missing parameter");
  }

  try {
    // Add Operation (flag == 1)
    if (parseInt(flag) == 1) {
      for (const item of JSON.parse(updateItems)) {
        await DrawingItem.updateOne(
          { _id: item._id },
          {
            $set: {
              used_grid: parseInt(item.used_grid_qty),
              balance_grid: parseInt(item.balance_grid_qty),
            },
          }
        );
      }
    }
    // Update Operation (flag == 0)
    else if (parseInt(flag) == 0) {
      for (const item of JSON.parse(updateItems)) {
        await DrawingItem.updateOne({ _id: item._id }, [
          {
            $set: {
              balance_grid: item.balance_grid_qty + item.used_grid_qty,
              used_grid: 0,
            },
          },
        ]);
      }
    }

    sendResponse(res, 200, true, {}, "Grid balance updated successfully");
  } catch (error) {
    console.error(error);
    sendResponse(res, 400, false, {}, "Something went wrong");
  }
};
exports.getMultiGridItems = async (req, res) => {
  const { drawingIds } = req.body;

  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  let parseIds;
  try {
    parseIds = Array.isArray(drawingIds) ? drawingIds : JSON.parse(drawingIds);
  } catch (error) {
    return sendResponse(res, 400, false, {}, "Invalid drawingIds format");
  }

  const objectIds = parseIds.map((id) => new ObjectId(id));
  try {
    const aggregationPipeline = [
      {
        $match: {
          deleted: false,
          drawing_id: { $in: objectIds },
        },
      },
      {
        $lookup: {
          from: "erp-planner-drawings",
          localField: "drawing_id",
          foreignField: "_id",
          as: "drawing_details",
        },
      },
      {
        $unwind: {
          path: "$drawing_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "erp-drawing-grids",
          localField: "grid_id",
          foreignField: "_id",
          as: "grid_details",
        },
      },
      {
        $unwind: {
          path: "$grid_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "store-items",
          localField: "item_name",
          foreignField: "_id",
          as: "item_details",
        },
      },
      {
        $unwind: {
          path: "$item_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "joint-types",
          localField: "joint_type",
          foreignField: "_id",
          as: "jointTypeDetails",
        },
      },
      {
        $project: {
          drawing_id: "$drawing_details._id",
          drawing_no: "$drawing_details.drawing_no",
          drawing_rev: "$drawing_details.rev",
          drawing_sheet_no: "$drawing_details.sheet_no",
          drawing_assembly_no: "$drawing_details.assembly_no",
          grid_no: "$grid_details.grid_no",
          grid_qty: "$grid_details.grid_qty",
          item_name: "$item_details.name",
          item_no: 1,
          item_qty: 1,
          item_length: 1,
          item_width: 1,
          item_weight: 1,
          assembly_weight: 1,
          assembly_surface_area: 1,
          used_grid: 1,
          balance_grid: 1,
          joint_type: {
            $map: {
              input: "$jointTypeDetails",
              as: "jt",
              in: {
                _id: "$$jt._id",
                name: "$$jt.name"
              }
            }
          }
        },
      },
    ];

    const drawingItems = await DrawingItem.aggregate(aggregationPipeline);

    return sendResponse(
      res,
      200,
      true,
      drawingItems,
      "Drawing items retrieved successfully"
    );
  } catch (error) {
    console.error(error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};
