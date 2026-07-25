
const MaterialMto = require('../../models/material_procurement/material_mto.model');

const { sendResponse } = require("../../helper/response");
const mongoose = require("mongoose");
const ejs = require("ejs");
const fs = require("fs");
const path = require("path");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;
const puppeteer = require("puppeteer");
const ExcelJS = require("exceljs");


exports.getItemWiseMaterialData = async (req, res) => {
  try {
    const { projectId, search = "", page, limit } = req.body;

    if (!projectId) {
      return res.status(400).json({
        status: false,
        message: "Project ID is required",
      });
    }

    const usePagination = page && limit;
    const pageNumber = parseInt(page) || 1;
    const limitNumber = parseInt(limit) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    // ================= SEARCH =================
    const searchStage =
      search.trim() !== ""
        ? {
            $match: {
              $or: [
                { area: { $regex: search, $options: "i" } },
                { item_name: { $regex: search, $options: "i" } },
                { material_grade: { $regex: search, $options: "i" } },
                { prNo: { $regex: search, $options: "i" } },
                { poNo: { $regex: search, $options: "i" } },
                { imir_no: { $regex: search, $options: "i" } },
              ],
            },
          }
        : { $match: {} };

   const pipeline = [
  // ---------------- MTO Items ----------------
  { $match: { project: new mongoose.Types.ObjectId(projectId), deleted: false } },
  { $unwind: "$items" },

  // ---------------- AREA ----------------
  {
    $lookup: {
      from: "areas",
      localField: "areaBuilding",
      foreignField: "_id",
      as: "areaData"
    }
  },
  { $unwind: "$areaData" },

  // ---------------- ITEM ----------------
  {
    $lookup: {
      from: "store-items",
      localField: "items.item",
      foreignField: "_id",
      as: "itemData"
    }
  },
  { $unwind: "$itemData" },

  // ---------------- UNIT ----------------
  {
    $lookup: {
      from: "store-item-units",
      localField: "itemData.unit",
      foreignField: "_id",
      as: "unitData"
    }
  },
  { $unwind: { path: "$unitData", preserveNullAndEmptyArrays: true } },

  // ---------------- PROCUREMENT REQUEST ----------------
  {
    $lookup: {  
      from: "material-procurement-requests",
      let: { mtoId: "$_id", itemId: "$items.item" },
      pipeline: [
        { $unwind: "$items" },
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$items.mto", "$$mtoId"] },
                { $eq: ["$items.item", "$$itemId"] }
              ]
            }
          }
        },
        { $project: { prNo: "$prNo", prRevNo: "$revNo", prQty: "$items.prQty" } }
      ],
      as: "prData"
    }
  },

  // ---------------- ORDER PLACEMENT ----------------
 // ---------------- ORDER PLACEMENT ----------------
  {
    $lookup: {
      from: "material-order-placements",
      let: { itemId: "$items.item" },
      pipeline: [
        { $unwind: "$items" },
        { $match: { $expr: { $or: [{ $eq: ["$items.inquiryItem", "$$itemId"] }, { $eq: ["$items.item", "$$itemId"] }] } } },
        { 
          $lookup: {
            from: "store-items",
            localField: "items.item",
            foreignField: "_id",
            as: "poItemData"
          }
        },
        { $unwind: { path: "$poItemData", preserveNullAndEmptyArrays: true } },
        { $project: { poNo: "$po_no", poRevNo: "$rev_no", poItemName: "$poItemData.name", poItemId: "$items.item" } }
      ],
      as: "orderData"
    }
  },

  // ---------------- STORE TRANSACTION (Calculated Received Qty) ----------------
  {
    $lookup: {
      from: "store_transaction_items",
      let: { 
        itemId: "$items.item", 
        orderPlacementIds: "$orderData._id"
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$itemName", "$$itemId"] },
                { $in: ["$orderPlacement", "$$orderPlacementIds"] },
                { $eq: ["$deleted", false] }
              ]
            }
          }
        },
        {
          $project: {
            // Received = Total Qty - Remaining Balance
            receivedQty: { $subtract: ["$quantity", "$balance_qty"] },
            totalQty: "$quantity",
            remainingBalance: "$balance_qty"
          }
        }
      ],
      as: "storeData"
    }
  },
 // ---------------- CALCULATE FINAL FIELDS ----------------
  {
    $addFields: {
      // Summing up received quantities in case there are multiple transactions for one item
      materialReceived: { $sum: "$storeData.receivedQty" },
      prNo: {
        $reduce: {
          input: { $ifNull: ["$prData.prNo", []] },
          initialValue: "",
          in: { $cond: [{ $eq: ["$$value", ""] }, { $toString: "$$this" }, { $concat: ["$$value", ", ", { $toString: "$$this" }] }] }
        }
      },
      prRevNo: {
        $reduce: {
          input: { $ifNull: ["$prData.prRevNo", []] },
          initialValue: "",
          in: { $cond: [{ $eq: ["$$value", ""] }, { $toString: "$$this" }, { $concat: ["$$value", ", ", { $toString: "$$this" }] }] }
        }
      },
      poNo: {
        $reduce: {
          input: { $ifNull: ["$orderData.poNo", []] },
          initialValue: "",
          in: { $cond: [{ $eq: ["$$value", ""] }, { $toString: "$$this" }, { $concat: ["$$value", ", ", { $toString: "$$this" }] }] }
        }
      },
      poRevNo: {
        $reduce: {
          input: { $ifNull: ["$orderData.poRevNo", []] },
          initialValue: "",
          in: { $cond: [{ $eq: ["$$value", ""] }, { $toString: "$$this" }, { $concat: ["$$value", ", ", { $toString: "$$this" }] }] }
        }
      },
      poItemName: {
        $reduce: {
          input: { $ifNull: ["$orderData.poItemName", []] },
          initialValue: "",
          in: { $cond: [{ $eq: ["$$value", ""] }, { $toString: "$$this" }, { $concat: ["$$value", ", ", { $toString: "$$this" }] }] }
        }
      }
    }
  },
  {
    $addFields: {
      // Balance Qty = Ordered Qty - Material Received
      balanceQty: {
        $subtract: [
          { $ifNull: ["$items.orderedQty", 0] },
          "$materialReceived"
        ]
      }
    }
  },
  // ---------------- SEARCH ----------------
  searchStage,

  // ---------------- FINAL SHAPE ----------------
  {
    $project: {
      _id: 0,
      area: "$areaData.area",
      item_name: "$itemData.name",
      material_grade: "$itemData.material_grade",
      uom: "$unitData.name",
      gadClientQty: "$items.gadClientQty",
      fabDrawingQty: "$items.fabDrawingQty",
      contingency: "$items.contingency",
      materialRequirement: "$items.materialRequirement",
      usableStock: "$items.usableStock",
      orderedQty: "$items.orderedQty",
      remarks: "$items.remarks",

      prNo: 1,
      prRevNo: 1,
      poNo: 1,
      poRevNo: 1,
      poItemName: 1,
      materialReceived: 1,
      balanceQty: 1,
    }
  }
];

    // ================= TOTAL =================
    const totalData = await MaterialMto.aggregate([
      ...pipeline,
      { $count: "total" },
    ]);
    const total = totalData[0]?.total || 0;

    // ================= PAGINATION =================
    const finalPipeline = [...pipeline];
    if (usePagination) {
      finalPipeline.push({ $skip: skip }, { $limit: limitNumber });
    }

    const result = await MaterialMto.aggregate(finalPipeline);

    return res.status(200).json({
      success: true,
      data: result,
      total,
      page: usePagination ? pageNumber : null,
      limit: usePagination ? limitNumber : null,
      message: "Item wise material data fetched successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};




exports.downloadItemWiseMaterialExcel = async (req, res) => {
  try {
    const { projectId, search = "" } = req.body;

    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ status: false, message: "Valid Project ID is required" });
    }

    // 1. Search Logic
    const searchStage = search.trim() !== "" ? {
      $match: {
        $or: [
          { area: { $regex: search, $options: "i" } },
          { item_name: { $regex: search, $options: "i" } },
          { material_grade: { $regex: search, $options: "i" } },
          { prNo: { $regex: search, $options: "i" } },
          { poNo: { $regex: search, $options: "i" } },
        ],
      },
    } : { $match: {} };

    // 2. The Aggregation Pipeline
    const pipeline = [
      { $match: { project: new mongoose.Types.ObjectId(projectId), deleted: false } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "bussiness-projects",
          localField: "project",
          foreignField: "_id",
          as: "projectData"
        }
      },
      { $unwind: { path: "$projectData", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "areas",
          localField: "areaBuilding",
          foreignField: "_id",
          as: "areaData"
        }
      },
      { $unwind: { path: "$areaData", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "store-items",
          localField: "items.item",
          foreignField: "_id",
          as: "itemData"
        }
      },
      { $unwind: { path: "$itemData", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "store-item-units",
          localField: "itemData.unit",
          foreignField: "_id",
          as: "unitData"
        }
      },
      { $unwind: { path: "$unitData", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "material-procurement-requests",
          let: { mtoId: "$_id", itemId: "$items.item" },
          pipeline: [
            { $unwind: "$items" },
            { $match: { $expr: { $and: [{ $eq: ["$items.mto", "$$mtoId"] }, { $eq: ["$items.item", "$$itemId"] }] } } },
            { $project: { prNo: "$prNo", revNo: "$revNo" } }
          ],
          as: "prData"
        }
      },
      {
        $lookup: {
          from: "material-order-placements",
          let: { itemId: "$items.item" },
          pipeline: [
            { $unwind: "$items" },
            { $match: { $expr: { $or: [{ $eq: ["$items.inquiryItem", "$$itemId"] }, { $eq: ["$items.item", "$$itemId"] }] } } },
            { 
              $lookup: {
                from: "store-items",
                localField: "items.item",
                foreignField: "_id",
                as: "poItemData"
              }
            },
            { $unwind: { path: "$poItemData", preserveNullAndEmptyArrays: true } },
            { $project: { _id: 1, poNo: "$po_no", poRevNo: "$rev_no", po_item_name: "$poItemData.name", poItemId: "$items.item" } }
          ],
          as: "orderData"
        }
      },
      {
        $lookup: {
          from: "store_transaction_items",
          let: { 
            itemId: "$items.item", 
            orderPlacementIds: "$orderData._id"
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$itemName", "$$itemId"] },
                    { $in: ["$orderPlacement", "$$orderPlacementIds"] },
                    { $eq: ["$deleted", false] }
                  ]
                }
              }
            },
            { $project: { receivedQty: { $subtract: ["$quantity", "$balance_qty"] } } }
          ],
          as: "storeData"
        }
      },
      {
        $addFields: {
          materialReceived: { $sum: "$storeData.receivedQty" },
          prNo: {
            $reduce: {
              input: { $ifNull: ["$prData.prNo", []] },
              initialValue: "",
              in: { $cond: [{ $eq: ["$$value", ""] }, { $toString: "$$this" }, { $concat: ["$$value", ", ", { $toString: "$$this" }] }] }
            }
          },
          prRevNo: {
            $reduce: {
              input: { $ifNull: ["$prData.revNo", []] },
              initialValue: "",
              in: { $cond: [{ $eq: ["$$value", ""] }, { $toString: "$$this" }, { $concat: ["$$value", ", ", { $toString: "$$this" }] }] }
            }
          },
          poNo: {
            $reduce: {
              input: { $ifNull: ["$orderData.poNo", []] },
              initialValue: "",
              in: { $cond: [{ $eq: ["$$value", ""] }, { $toString: "$$this" }, { $concat: ["$$value", ", ", { $toString: "$$this" }] }] }
            }
          },
          poRevNo: {
            $reduce: {
              input: { $ifNull: ["$orderData.poRevNo", []] },
              initialValue: "",
              in: { $cond: [{ $eq: ["$$value", ""] }, { $toString: "$$this" }, { $concat: ["$$value", ", ", { $toString: "$$this" }] }] }
            }
          },
          poItemName: {
            $reduce: {
              input: { $ifNull: ["$orderData.poItemName", []] },
              initialValue: "",
              in: { $cond: [{ $eq: ["$$value", ""] }, { $toString: "$$this" }, { $concat: ["$$value", ", ", { $toString: "$$this" }] }] }
            }
          }
        }
      },
      {
        $addFields: {
          balanceQty: { $subtract: [{ $ifNull: ["$items.orderedQty", 0] }, "$materialReceived"] }
        }
      },
      searchStage,
      {
        $project: {
          _id: 0,
          area: "$areaData.area",
          project_name: "$projectData.name",
          item_name: "$itemData.name",
          material_grade: "$itemData.material_grade",
          uom: "$unitData.name",
          gadClientQty: "$items.gadClientQty",
          fabDrawingQty: "$items.fabDrawingQty",
          contingency: "$items.contingency",
          materialRequirement: "$items.materialRequirement",
          usableStock: "$items.usableStock",
          orderedQty: "$items.orderedQty",
          remarks: "$items.remarks",
          prNo: 1,
          prRevNo: 1,
          poNo: 1,
          poRevNo: 1,
          poItemName: 1,
          materialReceived: 1,
          balanceQty: 1,
        }
      }
    ];

    const results = await MaterialMto.aggregate(pipeline);

    if (!results.length) {
      return res.status(404).json({ message: 'No data found' });
    }

    // Grouping Logic for Rowspan
    const grouped = results.reduce((acc, item) => {
      const key = item.area || 'N/A';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    const displayProjectName = results.length > 0 ? results[0].project_name : "N/A";

    // 3. Initialize Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Material Chart');

    // Headers
    sheet.mergeCells('A1:Q3');
    const mainHeader = sheet.getCell('A1');
    mainHeader.value = 'ITEM WISE MATERIAL STATUS REPORT';
    mainHeader.font = { bold: true, size: 16 };
    mainHeader.alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('A4:H4');
    sheet.getCell('A4').value = `PROJECT: ${displayProjectName}`;
    sheet.mergeCells('I4:Q4');
    sheet.getCell('I4').value = `REPORT DATE: ${new Date().toLocaleDateString()}`;
    sheet.getRow(4).font = { bold: true };

    const headers = [
      'Sr.', 'Area', 'Item Name', 'Material Grade', 'UOM', 'GAD Qty', 
      'Fab Qty', 'Contingency (%)', 'Material Requirement', 'Usable Stock', 'PO Item Name', 'Ordered Qty', 
      'PR No', 'PR Rev', 'PO No', 'PO Rev', 'Received', 'Balance', 'Remarks'
    ];
    
    const headerRow = sheet.getRow(6);
    headerRow.values = headers;
    headerRow.eachCell(cell => {
      cell.font = { bold: true, size: 14 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F6B26B' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    });

    // 4. Data Population with Merging
    let currentRow = 7;
    let srNo = 1;

    Object.entries(grouped).forEach(([areaName, rows]) => {
      const startRow = currentRow;

      rows.forEach((item) => {
        const rowData = [
          srNo,
          areaName,
          item.item_name || "--",
          item.material_grade || "--",
          item.uom || "--",
          item.gadClientQty || 0,
          item.fabDrawingQty || 0,
          item.contingency || 0,
          item.materialRequirement || 0,
          item.usableStock || 0,
          item.poItemName || "--",
          item.orderedQty || 0,
          item.prNo || "--",
          item.prRevNo || "--",
          item.poNo || "--",
          item.poRevNo || "--",
          item.materialReceived || 0,
          item.balanceQty || 0,
          item.remarks || "--"
        ];
        
        const row = sheet.addRow(rowData);
        row.eachCell(cell => {
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });
        currentRow++;
      });

      if (currentRow - 1 > startRow) {
        sheet.mergeCells(`A${startRow}:A${currentRow - 1}`);
        sheet.mergeCells(`B${startRow}:B${currentRow - 1}`);
      }
      srNo++;
    });

    sheet.columns = [
      { width: 6 }, { width: 20 }, { width: 35 }, { width: 35 }, { width: 15 }, { width: 20 }, { width: 12 },
      { width: 12 }, { width: 20 }, { width: 35 }, { width: 15 }, { width: 15 },
      { width: 20 }, { width: 15 }, { width: 20 }, { width: 15 }, { width: 15 },
      { width: 15 }, { width: 25 }
    ];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=MaterialChart_${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("Excel Generation Error:", error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};