const Area = require('../../../models/erp/Area/area.model');
const mongoose = require('mongoose');
const { sendResponse } = require("../../../helper/response");


// Create or Update Area
exports.manageArea = async (req, res) => {
  const { id, project, area, status } = req.body;

  if(!req.user){
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  console.log("Managing Area:", { id, project, area, status });
  // Validation
  if (!project || !area) {
    return sendResponse(res, 400, false, {}, "Project and Area are required");
  }

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(project)) {
    return sendResponse(res, 400, false, {}, "Invalid project ID");
  }

  try {
    if (!id) {
      // Create new Area
      const existing = await Area.findOne({ project, area });
      if (existing) {
        return sendResponse(res, 400, false, {}, "Area already exists for this project");
      }

      const newArea = new Area({ project, area, status });
      await newArea.save();
      return sendResponse(res, 201, true, { area: newArea }, "Area created successfully");

    } else {
      // Update existing Area
      const areaDoc = await Area.findById(id);
      if (!areaDoc) {
        return sendResponse(res, 404, false, {}, "Area not found");
      }

      // Check duplicate for same project
      const existing = await Area.findOne({ project, area, _id: { $ne: id } });
      if (existing) {
        return sendResponse(res, 400, false, {}, "Area already exists for this project");
      }

      areaDoc.project = project;
      areaDoc.area = area;
      areaDoc.status = status;
      await areaDoc.save();

      return sendResponse(res, 200, true, { area: areaDoc }, "Area updated successfully");
    }

  } catch (err) {
    console.error(err);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

// Delete Area
exports.deleteArea = async (req, res) => {
  try {
    if (!req.user) {
      return sendResponse(res, 401, false, {}, "Unauthorized");
    }

    const id = req.query.id;

    // Validate ObjectId
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, 400, false, {}, "Invalid Area ID");
    }

    // Soft delete: set isDeleted = true and deletedAt timestamp
    const deletedArea = await Area.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!deletedArea) return sendResponse(res, 404, false, {}, "Area not found");

    return sendResponse(res, 200, true, { area: deletedArea }, "Area soft deleted successfully");

  } catch (err) {
    console.error(err);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};
// Get Areas (All or by project) with Pagination + Search
exports.getAreas = async (req, res) => {
  try {

      if(!req.user){
        return sendResponse(res, 401, false, {}, "Unauthorized");
      }

    const { project, search = "", page , limit ,status} = req.query;

    let filter = { isDeleted: false}; // only non-deleted areas
    if (project) filter.project = project;
    if (search) filter.area = { $regex: search, $options: "i" };
if (status) filter.status = status;
    const total = await Area.countDocuments(filter);
    const areas = await Area.find(filter)
      .populate('project', 'name details')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return sendResponse(
      res,
      200,
      true,
      { total, page: Number(page), limit: Number(limit), areas },
      "Areas fetched successfully"
    );

  } catch (err) {
    console.error(err);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};
