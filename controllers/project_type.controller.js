const ProjectType = require("../models/project_type.model");
const { sendResponse } = require("../helper/response");

// ---------------- GET PROJECT TYPE (User) ---------------- //
exports.getProjectType = async (req, res) => {
  if (!req.user || req.error) {
    return sendResponse(res, 400, false, {}, "Unauthorized");
  }

  try {
    const data = await ProjectType.find(
      { status: true, deleted: false },
      { deleted: 0 }
    )
      .populate("roles", "name")
      .sort({ createdAt: -1 });

    return sendResponse(
      res,
      200,
      true,
      data || [],
      data?.length ? "Project List" : "No projects found"
    );
  } catch (error) {
    console.log(error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

// ---------------- GET PROJECT TYPE (Admin) ---------------- //
exports.getAdminProjectType = async (req, res) => {
  if (!req.user || req.error) {
    return sendResponse(res, 400, false, {}, "Unauthorized");
  }

  try {
    console.log("Incoming req.user:", req.user);

    const data = await ProjectType.find(
      { deleted: false },
      { deleted: 0 }
    )
      .populate("roles", "name")  // "roles" matches your schema
      .sort({ createdAt: -1 });

    return sendResponse(res, 200, true, data, "Project Type List");

  } catch (error) {
    console.log("🔥 Controller Error:", error);
    return sendResponse(res, 500, false, {}, "Internal Server Error");
  }
};


// ---------------- ADD / UPDATE PROJECT TYPE ---------------- //
exports.manageProjectType = async (req, res) => {
  console.log("REQ BODY:", req.body); // MUST log now

  const { projectTypeName, id, status } = req.body;

  let roles = req.body["roles[]"] || req.body.roles || [];

  if (!Array.isArray(roles)) {
    roles = roles ? [roles] : [];
  }

  if (!projectTypeName || roles.length === 0) {
    return sendResponse(res, 400, false, {}, "Missing parameters");
  }

  try {
    if (!id) {
      await ProjectType.create({
        projectTypeName,
        roles,
      });

      return sendResponse(res, 200, true, {}, "Project added successfully");
    }

    await ProjectType.findByIdAndUpdate(
      id,
      {
        projectTypeName,
        roles,
        status,
      },
      { new: true }
    );

    return sendResponse(res, 200, true, {}, "Project updated successfully");

  } catch (error) {
    console.log("ERR:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};



// ---------------- DELETE PROJECT TYPE ---------------- //
exports.deleteProjectType = async (req, res) => {
  const { id } = req.body;

  if (!req.user || req.error || !id) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  try {
    const data = await ProjectType.findByIdAndUpdate(id, { deleted: true });

    if (data) {
      return sendResponse(res, 200, true, {}, "Project deleted successfully");
    }

    return sendResponse(res, 404, false, {}, "Project not found");
  } catch (error) {
    console.log(error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};
