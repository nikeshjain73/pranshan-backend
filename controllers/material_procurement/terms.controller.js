const Terms = require("../../models/material_procurement/terms.model");
const {sendResponse} = require("../../helper/response");// ...existing code...
const { default: mongoose } = require("mongoose");


exports.manageTerms = async (req, res) => {
  try {
    const { id, description, firm_id, project, status } = req.body;

    // Common validation
    if (!description || !firm_id || !project) {
      return sendResponse(res, 400, false,"Please provide all required fields");
    }

    let result;

    // 🔹 UPDATE
    if (id) {
      result = await Terms.findByIdAndUpdate(
        id,
        {
          description,
          ...(status !== undefined && { status })
        },
        { new: true }
      );

      if (!result) {
        return sendResponse(res, 404, false,"Terms & Conditions not found");
      }

        return sendResponse(res, 200, true, result, "Terms & Conditions updated successfully");
    }

    // 🔹 ADD (status = true by default)
    result = new Terms({
      description,
      firm_id,
      project
    });

    await result.save();

    return sendResponse(res, 200, true, result, "Terms & Conditions added successfully");

  } catch (error) {
    console.error("Manage Terms Error:", error);
    return sendResponse(res, 500, false,"Internal Server Error");
  }
};


exports.getTermsList = async (req, res) => {
  try {
    const { project, page, limit, search } = req.body;

    if(!req.user && req.error){
      return sendResponse(res, 401, false,"Unauthorized");
    }

    if(!project){
      return sendResponse(res, 400, false,"Please provide project");
    }
    const filter = {};
    if (project) filter.project = project;

    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: "i" } }
      ];
    }

    let termsQuery = Terms.find(filter).sort({ createdAt: -1 });

    // Apply pagination only if both page and limit are provided
    let responseData = {};
    if (page && limit) {
      const currentPage = Math.max(parseInt(page), 1);
      const perPage = Math.max(parseInt(limit), 1);
      const skip = (currentPage - 1) * perPage;

      const total = await Terms.countDocuments(filter);
      termsQuery = termsQuery.skip(skip).limit(perPage);

      const termsList = await termsQuery;
      responseData = {
        total,
        page: currentPage,
        limit: perPage,
        data: termsList
      };
    } else {
      // No pagination
      const termsList = await termsQuery;
      responseData = { data: termsList };
    }

    return sendResponse(
      res,
      200,
      true,
      responseData,
      "Terms & Conditions list fetched successfully",
    );

  } catch (error) {
    console.error("Get Terms List Error:", error);
    return sendResponse(res, 500, false, "Internal Server Error");
  }
};


exports.deleteTerms = async (req, res) => {
  try {
    const { id } = req.body;

    const deleted = await Terms.findByIdAndDelete(id);

    if (!deleted) {
      return sendResponse(res, 404, false, null, "Terms not found");
    }

    return sendResponse(res, 200, true, null, "Terms deleted successfully");

  } catch (error) {
    console.error("Delete Terms Error:", error);

    return sendResponse(res, 500, false,"Internal Server Error");
  }
};

