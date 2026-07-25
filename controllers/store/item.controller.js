const Item = require("../../models/store/item.model");
const Unit = require("../../models/store/store_unit.model");
const ItemCategory = require("../../models/store/item_category.model");
const InventoryLoc = require("../../models/store/inventory_location.model");
const { sendResponse } = require("../../helper/response");
const upload = require("../../helper/multerConfig");
const xlsx = require("xlsx");
const { downloadFormat, padWithLeadingZeros, generateExcel } = require("../../helper/index");
var parser = require('simple-excel-to-json')
const path = require("path");
const fs = require("fs");

exports.getItem = async (req, res) => {
  const { is_main, project } = req.query;
  if (req.user && !req.error) {
    try {
      let query = { status: true, deleted: false };

      if (is_main) {
        query.is_main = is_main;
      }
      if (project) {
        query.project = project;
      }
      const itemData = await Item.find(query, { deleted: 0 })
        .populate("unit", "name")
        .populate("category", "name")
        .populate("location", "name")
        .sort({ name: 1 })
        .lean();
      if (itemData) {
        sendResponse(res, 200, true, itemData, "Item List");
      } else {
        sendResponse(res, 200, true, {}, "Item not found");
      }
    } catch (err) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorised");
  }
};

// exports.getAdminItem = async (req, res) => {
//   const { is_main, project } = req.query;
//   if (req.user && !req.error) {
//     try {
//       let query = { deleted: false };
//       if (is_main) {
//         query.is_main = is_main;
//       }
//       if (project) {
//         query.project = project;
//       }
//       const itemData = await Item.find(query, { deleted: 0 })
//         .populate("unit", "name")
//         .populate("category", "name")
//         .populate("location", "name")
//         .sort({ createdAt: -1 })
//         .lean();
//       if (itemData) {
//         sendResponse(res, 200, true, itemData, "Item List");
//       } else {
//         sendResponse(res, 200, true, {}, "Item not found");
//       }
//     } catch (err) {
//       sendResponse(res, 500, false, {}, "Something went wrong");
//     }
//   } else {
//     sendResponse(res, 401, false, {}, "Unauthorised");
//   }
// };

exports.getAdminItem = async (req, res) => {
  const { is_main, project, currentPage, limit, search } = req.query;

  if (req.user && !req.error) {
    try {
      let query = { deleted: false };

      if (is_main) query.is_main = is_main;
      if (project) query.project = project;

      const searchRegex = search ? new RegExp(search, "i") : null;

      if (searchRegex) {
        // Direct field search
        query.$or = [
          { name: searchRegex },
          { material_grade: searchRegex },
          { m_code: searchRegex },
        ];

        // Search in category name (populate-based)
        const matchedCategories = await ItemCategory.find({ name: searchRegex }, { _id: 1 }).lean();
        const categoryIds = matchedCategories.map(cat => cat._id);

        if (categoryIds.length > 0) {
          query.$or.push({ category: { $in: categoryIds } });
        }
      }

      let itemData;
      let total;

      const pageNum = parseInt(currentPage);
      const limitNum = parseInt(limit);

      const applyPagination = !isNaN(pageNum) && !isNaN(limitNum) && limitNum > 0;

      if (applyPagination) {
        const skip = (pageNum - 1) * limitNum;
        total = await Item.countDocuments(query);

        itemData = await Item.find(query, { deleted: 0 })
          .populate("unit", "name")
          .populate("category", "name")
          .populate("location", "name")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean();
      } else {
        // No pagination or search — return all matching data
        itemData = await Item.find(query, { deleted: 0 })
          .populate("unit", "name")
          .populate("category", "name")
          .populate("location", "name")
          .sort({ createdAt: -1 })
          .lean();

        total = itemData.length;
      }

      const response = {
        data: itemData,
        pagination: {
          currentPage: applyPagination ? pageNum : 1,
          limit: applyPagination ? limitNum : total,
          total,
          totalPages: applyPagination ? Math.ceil(total / limitNum) : 1,
        
        },
      };

      sendResponse(res, 200, true, response, "Item list");
    } catch (err) {
      console.error("Error in getAdminItem:", err);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorised");
  }
};

// exports.manageItem = async (req, res) => {
//   const {
//     name,
//     unit,
//     hsn_code,
//     gst_percentage,
//     mcode,
//     purchase_rate,
//     sale_rate,
//     cost_rate,
//     reorder_quantity,
//     category,
//     material_grade,
//     detail,
//     location,
//     status,
//     is_main,
//     project,
//     id,
//   } = req.body;
//   if (req.user) {
//     if (name &&
//       //  hsn_code && 
//       unit && category && location) {
//       const getLastItem = await Item.find().sort({ ItemId: -1 }).limit(1);

//       let item_id = getLastItem[0]
//         ? getLastItem[0].ItemId
//           ? getLastItem[0].ItemId + 1
//           : null
//         : null;

//       if (!item_id) {
//         item_id = "1";
//       }

//       const hsn = hsn_code === 'null' ? 0 : hsn_code;

//       const item = new Item({
//         ItemId: item_id,
//         name: name,
//         hsn_code: hsn,
//         unit: unit,
//         gst_percentage: gst_percentage,
//         purchase_rate: purchase_rate,
//         sale_rate: sale_rate,
//         cost_rate: cost_rate,
//         category: category,
//         reorder_quantity: reorder_quantity,
//         material_grade: material_grade,
//         detail: detail,
//         location: location,
//         mcode: mcode,
//         is_main: is_main,
//         project: project,
//       });

//       // if (!id) {
//       //   try {
//       //     await item
//       //       .save(item)
//       //       .then((data) => {
//       //         sendResponse(res, 200, true, {}, "Item added successfully");
//       //       })
//       //       .catch((error) => {
//       //         console.log("error", error);
//       //         sendResponse(res, 400, false, {}, "Item already exists");
//       //       });
//       //   } catch (error) {
//       //     sendResponse(res, 500, false, {}, "Something went wrong");
//       //   }
//       // } 
//       if (!id) {
//     const exist = await Item.findOne({ name: name.trim(), project });
//     if (exist) {
//         return sendResponse(res, 400, false, {}, "Item name already exists");
//     }

//     await item.save()
//       .then(() => sendResponse(res, 200, true, {}, "Item added successfully"))
//       .catch((error) => {
//         console.log("error", error);
//         sendResponse(res, 500, false, {}, "Something went wrong");
//       });
// }

//       else {
//         await Item.findByIdAndUpdate(id, {
//           name: name,
//           hsn_code: hsn,
//           unit: unit,
//           gst_percentage: gst_percentage,
//           purchase_rate: purchase_rate,
//           sale_rate: sale_rate,
//           cost_rate: cost_rate,
//           category: category,
//           reorder_quantity: reorder_quantity,
//           material_grade: material_grade,
//           detail: detail,
//           location: location,
//           mcode: mcode,
//           status: status,
//           is_main: is_main,
//           project: project,
//         }).then((data) => {
//           if (data) {
//             sendResponse(res, 200, true, {}, "Item updated successfully");
//           } else {
//             sendResponse(res, 200, true, {}, "Item not found");
//           }
//         });
//       }
//     } else {
//       sendResponse(res, 400, false, {}, "Missing parameters");
//     }
//   } else {
//     sendResponse(res, 401, false, {}, "Unauthorized");
//   }
// };

exports.manageItem = async (req, res) => {
  const {
    name,
    unit,
    hsn_code,
    gst_percentage,
    mcode,
    purchase_rate,
    sale_rate,
    cost_rate,
    reorder_quantity,
    category,
    material_grade,
    detail,
    location,
    status,
    is_main,
    project,
    id,
  } = req.body;

  if (!req.user) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  if (!name || !unit || !category || !location) {
    return sendResponse(res, 400, false, {}, "Missing parameters");
  }

  try {
    // Generate next ItemId
    const lastItem = await Item.find().sort({ ItemId: -1 }).limit(1);
    let item_id = lastItem[0]?.ItemId ? lastItem[0].ItemId + 1 : "1";

    const hsn = hsn_code === "null" ? 0 : hsn_code;

    // Duplicate Check (Name + MaterialGrade + Project)
    const duplicateQuery = {
      name: name.trim(),
      material_grade: material_grade,
      project,
    };

    // If update → exclude current _id
    if (id) duplicateQuery._id = { $ne: id };

    const duplicate = await Item.findOne(duplicateQuery);

    if (duplicate) {
      return sendResponse(
        res,
        400,
        false,
        {},
        "Item with same name & material grade already exists"
      );
    }

    if (!id) {
      // ADD NEW ITEM
      const item = new Item({
        ItemId: item_id,
        name,
        hsn_code: hsn,
        unit,
        gst_percentage,
        purchase_rate,
        sale_rate,
        cost_rate,
        category,
        reorder_quantity,
        material_grade,
        detail,
        location,
        mcode,
        is_main,
        project,
      });

      await item.save();
      return sendResponse(res, 200, true, {}, "Item added successfully");
    } else {
      // UPDATE ITEM
      const updated = await Item.findByIdAndUpdate(
        id,
        {
          name,
          hsn_code: hsn,
          unit,
          gst_percentage,
          purchase_rate,
          sale_rate,
          cost_rate,
          category,
          reorder_quantity,
          material_grade,
          detail,
          location,
          mcode,
          status,
          is_main,
          project,
        },
        { new: true }
      );

      if (updated) {
        return sendResponse(res, 200, true, {}, "Item updated successfully");
      } else {
        return sendResponse(res, 404, false, {}, "Item not found");
      }
    }
  } catch (error) {
    console.log("manageItem error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};


exports.deleteItem = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error && id) {
    try {
      await Item.findByIdAndUpdate(id, { deleted: true }).then((data) => {
        if (data) {
          sendResponse(res, 200, true, {}, "Item deleted successfully");
        }
      });
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.importItem = async (req, res) => {
  if (req.user && !req.error) {
    upload(req, res, async (err) => {
      if (!req.file) {
        return sendResponse(res, 400, false, {}, "Select excel file");
      } else if (err) {
        return sendResponse(
          res,
          400,
          false,
          {},
          `Not uploaded: ${err.message}`
        );
      }
      try {
        const filePath = req.file.path;
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        const errors = [];
        const validItems = [];

        const validationPromises = data.map(async (row) => {
          const {
            name,
            unit,
            hsn_code,
            gst_percentage,
            mcode,
            purchase_rate,
            sale_rate,
            cost_rate,
            reorder_quantity,
            category,
            material_grade,
            detail,
            location,
          } = row;
          const missingFields = [];
          if (!name) missingFields.push("name");
          if (!unit) missingFields.push("unit");
          if (!category) missingFields.push("category");
          if (!location) missingFields.push("location");
          if (!hsn_code) missingFields.push("hsn_code");

          if (missingFields.length > 0) {
            errors.push({
              row: { name },
              message: `Missing required field (${missingFields.join(", ")})`,
            });
            return;
          }

          try {
            const itemId = await Item.find({ name: name });
            const [unitId, catId, locationId] = await Promise.all([
              findUnitIdByName(unit),
              findCategoryIdByName(category),
              findLocationIdByName(location),
            ]);

            if (itemId.length > 0) {
              errors.push({
                row: { name },
                message: `Item: '${name}' already exist in our database`,
              });
              return;
            }

            if (!unitId) {
              errors.push({
                row: { name },
                message: `For ${name}: '${unit}' unit is not present in our database`,
              });
              return;
            }

            if (!catId) {
              errors.push({
                row: { name },
                message: `For ${name}: '${category}' category is not present in our database`,
              });
              return;
            }

            if (!locationId) {
              errors.push({
                row: { name },
                message: `For ${name}: '${location}' location is not present in our database`,
              });
              return;
            }

            validItems.push({
              name,
              unit: unitId,
              category: catId,
              location: locationId,
              hsn_code,
              gst_percentage,
              purchase_rate,
              sale_rate,
              cost_rate,
              material_grade,
              mcode,
              detail,
              reorder_quantity,
            });
          } catch (error) {
            errors.push(`Error processing item: ${name}, ${error}`);
          }
        });

        await Promise.all(validationPromises);

        if (validItems.length > 0) {
          await insertItems(validItems);
          // sendResponse(res,200,true,{},`${validItems.length} items inserted successfully.`)
        }

        if (errors.length > 0) {
          // errors.forEach(error => console.error(error));
          return sendResponse(
            res,
            400,
            false,
            { errors },
            "Items with invalid references were not inserted"
          );
        }

        return sendResponse(
          res,
          200,
          true,
          {},
          "Item file uploaded successfully"
        );
      } catch (error) {
        console.error("Error during data processing:", error);
        return sendResponse(res, 500, false, {}, "Something went wrong");
      }
    });
  } else {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

async function findUnitIdByName(unitName) {
  const unit = await Unit.findOne({ name: new RegExp(`^${unitName}$`, "i") });
  return unit ? unit._id : null;
}

async function findCategoryIdByName(catName) {
  const category = await ItemCategory.findOne({ name: catName });
  return category ? category._id : null;
}

async function findLocationIdByName(locName) {
  const location = await InventoryLoc.findOne({ name: locName });
  return location ? location._id : null;
}

async function insertItems(items) {
  await Item.insertMany(items);
}

exports.downloadFile = async (req, res) => {
  downloadFormat(req, res, "Item.xlsx");
};

exports.importItemData = async (req, res) => {
  if (req.user && !req.error) {
    upload(req, res, async function (err) {
      if (!req.file) {
        return sendResponse(res, 400, false, {}, 'Select an excel file');
      } else if (err) {
        return sendResponse(res, 400, false, {}, `Not uploaded: ${err.message}`);
      }

      try {
        const data = parser.parseXls2Json(req.file.path, { cellDate: true });
        if (data[0].length > 0) {
          const insertionPromises = [];
          const Duplicate = [];
          const Missing_Parameter = [];
          const Failed_To_Import = [];
          const Successfully_Imported = [];

          for (const element of data[0]) {

            if (!element.UOM || !element.ITEM_GROUP || !element.ITEM_NAME) {
              element.reason = "Missing required parameter: UOM, ITEM_GROUP or LOCATION";
              Missing_Parameter.push(element);
              continue;
            }

            const matchObj = {
              sr_no: element.SR_NO,
              name: element.ITEM_NAME,
              hsn_code: element.HSN_CODE ? element.HSN_CODE : 0,
              gst_percentage: element.GST ? element.GST : 0,
              material_grade: element.MATERIAL_GRADE ? element.MATERIAL_GRADE : "",
              mcode: element.MATERIAL_CODE ? element.MATERIAL_CODE : "",
              reorder_quantity: element.RE_ORDER_QTY ? element.RE_ORDER_QTY : 0,
              is_main: element.MAIN === 1 ? true : false,
            };

            try {
              const normalizedUOM = element.UOM.toUpperCase();
              const normalizedItemGroup = element.ITEM_GROUP.replace(/\s*\(.*?\)/, '-$&').replace(/[()]/g, '');
              const normalizedLocation = element.LOCATION ? element.LOCATION.replace(/\s*-\s*/g, '-').trim() : null;
              const [unit, category, location] = await Promise.all([
                Unit.findOneAndUpdate(
                  { name: new RegExp(`^${normalizedUOM}$`, "i") },
                  { $setOnInsert: { name: normalizedUOM } },
                  { new: true, upsert: true }
                ),
                ItemCategory.findOneAndUpdate(
                  { name: new RegExp(`^${normalizedItemGroup}$`, "i") },
                  { $setOnInsert: { name: normalizedItemGroup } },
                  { new: true, upsert: true }
                ),
                normalizedLocation
                  ? InventoryLoc.findOneAndUpdate(
                    { name: new RegExp(`^${normalizedLocation.replace(/-/g, '\\s*-\\s*')}$`, "i") },
                    { $setOnInsert: { name: normalizedLocation } },
                    { new: true, upsert: true }
                  )
                  : null
              ]);

              const getLastItem = await Item.find().sort({ ItemId: -1 }).limit(1);
              let item_id = getLastItem[0] ? getLastItem[0].ItemId + 1 : "1";
              matchObj.ItemId = item_id
              matchObj.unit = unit._id;
              matchObj.category = category._id;
              matchObj.location = location ? location._id : null;

              const existItem = await Item.findOne({
                name: matchObj.name,
                mcode: matchObj.mcode,
                category: matchObj.category,
                deleted: false
              });

              if (existItem) {
                Duplicate.push(element);
                continue;
              }

              insertionPromises.push(
                Item.create(matchObj)
                  .then(() => {
                    Successfully_Imported.push(element);
                  })
                  .catch((createErr) => {
                    element.reason = createErr.message;
                    Failed_To_Import.push(element);
                  })
              );
            } catch (err) {
              element.reason = err.message;
              Failed_To_Import.push(element);
            }
          }

          try {
            await Promise.all(insertionPromises);

            const responseObj = {
              Duplicate,
              Missing_Parameter,
              Failed_To_Import,
              Successfully_Imported,
            };

            if (Duplicate.length == 0 && Missing_Parameter.length == 0 && Failed_To_Import.length == 0) {
              return sendResponse(res, 200, true, {}, 'Data successfully processed');
            } else {
              const fileUrl = await generateExcel(req, res, responseObj);
              return sendResponse(res, 200, true, { file: fileUrl }, 'Data successfully processed and file created');
            }
          } catch (error) {
            return sendResponse(res, 500, false, {}, 'Error processing items: ' + error.message);
          }
        } else {
          return sendResponse(res, 400, false, {}, 'No data found in uploaded file');
        }
      } catch (err) {
        return sendResponse(res, 400, false, {}, 'Something went wrong');
      }
    });
  } else {
    sendResponse(res, 401, false, {}, 'Unauthorized');
  }
};

exports.downloadItemData = async (req, res) => {
  downloadFormat(req, res, "ItemData.xlsx");
};

exports.downloadItemList = async (req, res) => {
  try {
    const items = await Item.find({}).populate("unit category location", "name");

    const data = items.map((item, i) => ({
      SrNo: i + 1,
      Name: item.name,
      ItemId: item.ItemId,
      Detail: item.detail == '' ? '-' : item.detail,
      MaterialGrade: item.material_grade,
      Unit: item.unit ? item.unit.name : '',
      HSNCode: item.hsn_code,
      GSTPercentage: item.gst_percentage,
      MCode: item.mcode,
      PurchaseRate: item.purchase_rate,
      SaleRate: item.sale_rate,
      CostRate: item.cost_rate,
      Category: item.category ? item.category.name : '',
      Location: item.location ? item.location.name : '',
      ReorderQty: item.reorder_quantity,
    }));

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(data);

    ws['!cols'] = [
      { wch: 10 },
      { wch: 50 },
      { wch: 10 },
      { wch: 10 },
      { wch: 15 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 15 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 25 },
      { wch: 13 },
      { wch: 10 }
    ];

    xlsx.utils.book_append_sheet(wb, ws, `items`);

    const xlsxPath = path.join(__dirname, '../../xlsx');

    if (!fs.existsSync(xlsxPath)) {
      fs.mkdirSync(xlsxPath, { recursive: true });
    }

    const filename = `items_${Date.now()}.xlsx`;
    const filePath = path.join(xlsxPath, filename);

    xlsx.writeFile(wb, filePath);

    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;
    sendResponse(res, 200, true, { file: fileUrl }, `XLSX file generated successfully`);

  } catch (error) {
    sendResponse(res, 500, false, {}, "Something went wrong" + error);
  }
}

exports.updateItem = async (req, res) => {
  if (req.user && !req.error) {
    upload(req, res, async function (err) {
      try {
        const data = parser.parseXls2Json(req.file.path);
        const result = data.at(0).filter(p => p.ItemId != '');

        for (let row of result) {
          const { ItemId, Main } = row;
          await Item.findOneAndUpdate({ ItemId: ItemId }, { is_main: Main === 1 ? true : false });

        }
        sendResponse(res, 200, true, {}, "Item details updated successfully");
      } catch (err) {
        console.log(err)
        sendResponse(res, 500, false, {}, "Error updating employee details");
      }
    });
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
    return;
  }
}