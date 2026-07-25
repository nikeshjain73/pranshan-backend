
const DMRCategory = require("../../../models/erp/ManResource/ManResourceCategory.model");

const { sendResponse } = require("../../../helper/response");

const mongoose = require("mongoose");



exports.manageCategory = async (req, res) => {
  console.log("Request body:", req.body);
  const { id, name, project } = req.body;
  console.log("id:", id, "name:", name, "project:", project);

  if (req.user && !req.error) {
    const userId = req.user._id;
    console.log("User ID:", userId);

    if (!name || !project) {
      console.log("Missing parameters: name or project");
      return sendResponse(res, 400, false, {}, "Missing parameters: name or project");
    }

    try {
      const projectId = new mongoose.Types.ObjectId(project);

      if (!id) {
        console.log("Creating new category");

        const existingCategory = await DMRCategory.findOne({
          name: { $regex: `^${name}$`, $options: "i" },
          project_id: projectId,
        });

        if (existingCategory) {
          console.log("Category already exists for this project");
          return sendResponse(res, 400, false, {}, "Category already exists for this project");
        }

        const newCategory = new DMRCategory({
          name,
          project_id : projectId, // ✅ Fixed field name
        });

        console.log("New category created:", newCategory);

        await newCategory.save();
        console.log("Category saved successfully");
        return sendResponse(res, 201, true, { category: newCategory }, "Category created successfully");
      } else {
        // Update mode
        const updatedCategory = await DMRCategory.findByIdAndUpdate(
          id,
          { name, project_id : projectId },
          { new: true }
        );
        console.log("Updated category:", updatedCategory);

        if (!updatedCategory) {
          return sendResponse(res, 404, false, {}, "Category not found");
        }

        return sendResponse(res, 200, true, { category: updatedCategory }, "Category updated successfully");
      }

    } catch (err) {
      if (err.code === 11000) {
        return sendResponse(res, 400, false, {}, "Duplicate category exists");
      }

      console.error(err);
      return sendResponse(res, 500, false, {}, "Something went wrong");
    }

  } else {
    return sendResponse(res, 401, false, {}, "Unauthorised");
  }
};

exports.getCategoriesByProject = async (req, res) => {
  const { project } = req.body;

  if (!project) {
    return sendResponse(res, 400, false, {}, "Project ID is required");
  }

  try {
    const projectId = new mongoose.Types.ObjectId(project);

    const categories = await DMRCategory.find({ project_id: projectId })
      .populate({
        path: 'project_id',
        select: 'name description status', // include fields you want
        model: 'bussiness-projects' // make sure this matches the model name
      })
      .sort({ name: 1 });

    return sendResponse(res, 200, true, { categories }, "Categories fetched successfully");
  } catch (err) {
    console.error(err);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

exports.deleteCategory = async (req, res) => {
  const { id } = req.body;
  console.log("Deleting category with ID:", id);
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return sendResponse(res, 400, false, {}, "Valid Category ID is required");
  }

  if (req.user && !req.error) {
    try {
      const deletedCategory = await DMRCategory.findByIdAndDelete(id);

      if (!deletedCategory) {
        return sendResponse(res, 404, false, {}, "Category not found");
      }

      return sendResponse(res, 200, true, {}, "Category deleted successfully");
    } catch (err) {
      console.error(err);
      return sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    return sendResponse(res, 401, false, {}, "Unauthorised");
  }
};