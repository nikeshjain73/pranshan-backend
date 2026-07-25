const { downloadFormat, padWithLeadingZeros, generateExcel } = require("../../../helper/index");
const DMR = require("../../../models/erp/ManResource/ManResource.model");
const { sendResponse } = require("../../../helper/response");
const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");

exports.downloadFile = async (req, res) => {
  downloadFormat(req, res, "Dmr.xlsx");
};


exports.manageDMR = async (req, res) => {
  const { id, project, category, date, value } = req.body;

console.log("Managing DMR:", { id, project, category, date, value });
  // Validation
  if (!project || !category || !date || value == null) {
    return sendResponse(res, 400, false, {}, "Project, category, date, and value are required");
  }

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(project)) {
    return sendResponse(res, 400, false, {}, "Invalid project ID");
  }

  try {
    const dateObj = new Date(date);

    if (!id) {
      // Create new DMR entry
      let dmr = await DMR.findOne({ project, category });

      if (!dmr) {
        // New record
        dmr = new DMR({
          project,
          category,
          cumulative_mandays: value,
          daily_mandays: [{ date: dateObj, value }]
        });
      } else {
        // Update existing record's daily_mandays
        const existingDay = dmr.daily_mandays.find(
          (d) => d.date.toISOString().split("T")[0] === dateObj.toISOString().split("T")[0]
        );
        if (existingDay) {
          existingDay.value = value;
        } else {
          dmr.daily_mandays.push({ date: dateObj, value });
        }
        dmr.cumulative_mandays = dmr.daily_mandays.reduce((sum, d) => sum + d.value, 0);
      }

      await dmr.save();
      return sendResponse(res, 201, true, { dmr }, "DMR saved successfully");

    } else {
      // Update specific DMR record by id
      const dmr = await DMR.findById(id);
      if (!dmr) {
        return sendResponse(res, 404, false, {}, "DMR not found");
      }

      const existingDay = dmr.daily_mandays.find(
        (d) => d.date.toISOString().split("T")[0] === new Date(date).toISOString().split("T")[0]
      );
      if (existingDay) {
        existingDay.value = value;
      } else {
        dmr.daily_mandays.push({ date: new Date(date), value });
      }

      dmr.cumulative_mandays = dmr.daily_mandays.reduce((sum, d) => sum + d.value, 0);
      await dmr.save();

      return sendResponse(res, 200, true, { dmr }, "DMR updated successfully");
    }
  } catch (err) {
    console.error(err);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};


exports.getDMRByProject = async (req, res) => {
  const { project } = req.body;

  if (!project) {
    return sendResponse(res, 400, false, {}, "Project ID is required");
  }
  if (!mongoose.Types.ObjectId.isValid(project)) {
    return sendResponse(res, 400, false, {}, "Invalid Project ID");
  }

  try {
    const dmrs = await DMR.find({ project })
      .populate("project", "name description")
      .populate("category", "name") // ✅ Add category name
      .sort({ createdAt: -1 });

    return sendResponse(res, 200, true, { dmrs }, "DMRs fetched successfully");
  } catch (err) {
    console.error(err);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};


// exports.exportDMRToExcel = async (req, res) => {
//   const { project } = req.body;

//   if (!project || !mongoose.Types.ObjectId.isValid(project)) {
//     return sendResponse(res, 400, false, {}, "Invalid or missing project ID");
//   }

//   try {
//     const dmrs = await DMR.find({ project })
//       .populate("project", "name")
//       .populate("category", "name")
//       .sort({ createdAt: -1 });

//     if (dmrs.length === 0) {
//       return sendResponse(res, 404, false, {}, "No DMR records found");
//     }

//     const projectName = dmrs[0].project?.name || "Project";
//     const sanitizedProjectName = projectName.replace(/[^a-zA-Z0-9_-]/g, "_");

//     const workbook = new ExcelJS.Workbook();
//     const worksheet = workbook.addWorksheet("DMR Report");

//     // Title
//     worksheet.mergeCells("A1:E1");
//     worksheet.getCell("A1").value = `${projectName} - Daily Manpower Report`;
//     worksheet.getCell("A1").font = { size: 14, bold: true };
//     worksheet.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };
//     worksheet.addRow([]);

//     // Headers
//     worksheet.columns = [
//       { header: "Project Name", key: "project", width: 30 },
//       { header: "Category", key: "category", width: 30 },
//       { header: "Date", key: "date", width: 20 },
//       { header: "Daily Mandays", key: "daily", width: 20 },
//       { header: "Cumulative Mandays", key: "cumulative", width: 25 }
//     ];

//     // Data
//     dmrs.forEach((dmr) => {
//       dmr.daily_mandays.forEach((entry) => {
//         worksheet.addRow({
//           project: dmr.project?.name || "N/A",
//           category: dmr.category?.name || "N/A",
//           date: entry.date.toISOString().split("T")[0],
//           daily: entry.value,
//           cumulative: dmr.cumulative_mandays
//         });
//       });
//     });

//     // Save path
//     const xlsxPath = path.join(__dirname, "../../xlsx");
//     if (!fs.existsSync(xlsxPath)) {
//       fs.mkdirSync(xlsxPath, { recursive: true });
//     }

//     const filename = `${sanitizedProjectName}_DMR_Report_${Date.now()}.xlsx`;
//     const filePath = path.join(xlsxPath, filename);

//     // Save file to server
//     await workbook.xlsx.writeFile(filePath);

//     // Public download link
//     const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
//     const fileUrl = `${protocol}://${req.get("host")}/xlsx/${filename}`;

//     return sendResponse(res, 200, true, { file: fileUrl }, "DMR Excel file generated successfully");

//   } catch (error) {
//     console.error("Excel Export Error:", error);
//     return sendResponse(res, 500, false, {}, "Failed to export DMR data to Excel");
//   }
// };

exports.exportDMRToExcel = async (req, res) => {
  console.log("📥 Request to export DMR to Excel received");
  const { project } = req.body;

  if (!project || !mongoose.Types.ObjectId.isValid(project)) {
    console.log("❌ Invalid or missing project ID");
    return sendResponse(res, 400, false, {}, "Invalid or missing project ID");
  }

  try {
    console.log("🔍 Fetching DMR records...");
    const dmrs = await DMR.find({ project })
      .populate("project", "name")
      .populate("category", "name")
      .sort({ createdAt: -1 });

    if (dmrs.length === 0) {
      console.log("⚠ No DMR records found");
      return sendResponse(res, 404, false, {}, "No DMR records found");
    }

    const projectName = dmrs[0].project?.name || "Project";
    const sanitizedProjectName = projectName.replace(/[^a-zA-Z0-9_-]/g, "_");

    // 🔹 Get all unique dates from daily_mandays
    let allDates = new Set();
    dmrs.forEach(dmr => {
      dmr.daily_mandays.forEach(entry => {
        allDates.add(entry.date.toISOString().split("T")[0]);
      });
    });
    allDates = Array.from(allDates).sort();

    // Format dates for headers (e.g., "01-Jan")
    const dateHeaders = allDates.map(date => {
      const d = new Date(date);
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("DMR Report");

    // 🔹 Title row
    worksheet.mergeCells(1, 1, 1, 3 + dateHeaders.length);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = `${projectName} - Daily Manpower Report`;
    titleCell.font = { size: 14, bold: true };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };

    // 🔹 Header row
    const headerRow = ["SR NO.", "CATEGORY", "CUMULATIVE MANDAYS", ...dateHeaders];
    worksheet.addRow(headerRow);

    // Styling header
    worksheet.getRow(2).eachCell(cell => {
      cell.font = { bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    });

    // 🔹 Data rows
    dmrs.forEach((dmr, index) => {
      const rowData = [
        index + 1,
        dmr.category?.name || "N/A",
        dmr.cumulative_mandays,
        ...allDates.map(dateStr => {
          const found = dmr.daily_mandays.find(entry => entry.date.toISOString().split("T")[0] === dateStr);
          return found ? found.value : 0;
        })
      ];

      const row = worksheet.addRow(rowData);
      row.eachCell(cell => {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      });
    });

    // 🔹 Total row
    const totalRowValues = ["", "Total >>>"];
    const cumulativeTotal = dmrs.reduce((sum, dmr) => sum + (dmr.cumulative_mandays || 0), 0);
    totalRowValues.push(cumulativeTotal);

    // Totals for each date
    allDates.forEach(dateStr => {
      const totalForDate = dmrs.reduce((sum, dmr) => {
        const found = dmr.daily_mandays.find(entry => entry.date.toISOString().split("T")[0] === dateStr);
        return sum + (found ? found.value : 0);
      }, 0);
      totalRowValues.push(totalForDate);
    });

    const totalRow = worksheet.addRow(totalRowValues);
    totalRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    });

    // 🔹 Highlight today's date
    const todayFormatted = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    worksheet.getRow(2).eachCell((cell, colNumber) => {
      if (cell.value === todayFormatted) {
        worksheet.getColumn(colNumber).eachCell((c, rowNumber) => {
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF00" } }; // Yellow
        });
      }
    });

    // Column widths
    worksheet.columns.forEach((col, idx) => {
      col.width = idx === 1 ? 10 : idx === 2 ? 30 : 15;
    });

    // Save file
    const xlsxPath = path.join(__dirname, "../../../xlsx");
    if (!fs.existsSync(xlsxPath)) {
      fs.mkdirSync(xlsxPath, { recursive: true });
    }
    const filename = `${sanitizedProjectName}_DMR_Report_${Date.now()}.xlsx`;
    const filePath = path.join(xlsxPath, filename);

    await workbook.xlsx.writeFile(filePath);
    console.log(`✅ File created: ${filePath}`);

    const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const fileUrl = `${protocol}://${req.get("host")}/xlsx/${filename}`;

    return sendResponse(res, 200, true, { file: fileUrl }, "DMR Excel file generated successfully");
  } catch (error) {
    console.error("❌ Excel Export Error:", error);
    return sendResponse(res, 500, false, {}, "Failed to export DMR data to Excel");
  }
};