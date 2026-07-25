const { sendResponse } = require("../../helper/response");
const LeaveEntry = require("../../models/payroll/leave_entry.model");
const mongoose = require("mongoose");
const fs = require("fs");
const ejs = require("ejs");
const puppeteer = require("puppeteer");
const path = require("path");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;
exports.manageLeaveEntry = async (req, res) => {
  const {
    id,
    entry_date,
    employee,
    startDate,
    endDate,
    duration,
    reason,
    firm_id,
    approvedBy,
  } = req.body;

  if (req.user && !req.error) {
    if (
      entry_date &&
      employee &&
      firm_id &&
      startDate &&
      endDate &&
      duration &&
      approvedBy
    ) {
      try {
        let newVoucher = "1";
        const lastEntry = await LeaveEntry.findOne({}).sort({ createdAt: -1 });

        if (lastEntry && lastEntry.voucher_no) {
          newVoucher = parseInt(lastEntry.voucher_no) + 1;
        }
        if (!id) {
          const leave_entry = new LeaveEntry({
            voucher_no: newVoucher,
            entry_date,
            employee,
            firm_id,
            startDate,
            endDate,
            e_day: new Date(entry_date).getDate(),
            e_month: new Date(entry_date).getMonth(),
            e_year: new Date(entry_date).getFullYear(),
            duration,
            reason,
            approvedBy,
          });

          await leave_entry.save();
          sendResponse(
            res,
            200,
            true,
            leave_entry,
            "Leave entry created successfully!"
          );
        } else {
          await LeaveEntry.findByIdAndUpdate(id, {
            entry_date,
            employee,
            startDate,
            endDate,
            e_day: new Date(entry_date).getDate(),
            e_month: new Date(entry_date).getMonth(),
            e_year: new Date(entry_date).getFullYear(),
            duration,
            reason,
            approvedBy,
          }).then(() => {
            sendResponse(
              res,
              200,
              true,
              {},
              "Leave entry updated successfully!"
            );
          });
        }
      } catch (err) {
        console.error(err);
        sendResponse(res, 500, false, {}, "Something went wrong!");
        return;
      }
    } else {
      sendResponse(res, 400, false, {}, "Missing parameter!");
      return;
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized!");
  }
};

exports.getLeaveEntries = async (req, res) => {
  if (req.user && !req.error) {
    try {
      const leave_entries = await LeaveEntry.find({ deleted: false });
      sendResponse(
        res,
        200,
        true,
        leave_entries,
        "Leave entries retrieved successfully!"
      );
    } catch (err) {
      console.error(err);
      sendResponse(res, 500, false, {}, "Something went wrong!");
      return;
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized!");
  }
};

exports.deleteLeaveEntry = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      await LeaveEntry.findByIdAndUpdate(id, { deleted: true });
      sendResponse(res, 200, true, {}, "Leave entry deleted successfully!");
    } catch (err) {
      console.error(err);
      sendResponse(res, 500, false, {}, "Something went wrong!");
      return;
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized!");
  }
};

exports.downloadLeavePdf = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      const result = await LeaveEntry.aggregate([
        {
          $match: {
            $expr: {
              $eq: ["$_id", new mongoose.Types.ObjectId(id)],
            },
            deleted: false,
          },
        },
        {
          $lookup: {
            from: "employees",
            localField: "employee",
            foreignField: "_id",
            as: "employeeData",
          },
        },
        {
          $unwind: "$employeeData",
        },
        {
          $lookup: {
            from: "salaries",
            let: { employeeId: "$employeeData._id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$employee", "$$employeeId"],
                  },
                },
              },
              {
                $sort: { month: -1 },
              },
              {
                $limit: 1,
              },
            ],
            as: "salaryData",
          },
        },
        {
            $unwind: "$salaryData" 
        },
        {
            $lookup: {
                from: "departments",
                localField: "salaryData.department",  
                foreignField: "_id",
                as: "departmentData"
            }
        },
        {
          $lookup: {
              from: "designations",
              localField: "employeeData.designation",   
              foreignField: "_id",
              as: "designationData"
          }
        },
        {
          $lookup: {
            from: "firms",
            localField: "firm_id",
            foreignField: "_id",
            as: "firmData",
          },
        },
        {
          $project: {
            firm: { $arrayElemAt: ["$firmData.name", 0] },
            address: { $arrayElemAt: ["$firmData.address", 0] },
            address_two: { $arrayElemAt: ["$firmData.address_two", 0] },
            address_three: { $arrayElemAt: ["$firmData.address_three", 0] },
            city: { $arrayElemAt: ["$firmData.city", 0] },
            state: { $arrayElemAt: ["$firmData.state", 0] },
            pincode: { $arrayElemAt: ["$firmData.pincode", 0] },
            entry_date: 1,
            voucher_no: 1,
            employee_name: "$employeeData.full_name",
            designation: { $arrayElemAt: ["$designationData.name",0] },
            department: { $arrayElemAt: ["$departmentData.name", 0] },
            card_no: "$employeeData.card_no",
            mobile: "$employeeData.mobile_number",
            startDate: 1,
            endDate: 1,
            duration: 1,
            reason: 1,
          },
        },
      ]);
      // sendResponse(res, 200, true, result, 'Leave entry found!');
      // return
      if (result.length > 0) {
        const template = fs.readFileSync(
          "templates/leave_request.html",
          "utf-8"
        );
        const renderedHtml = ejs.render(template, { emp: result[0],
         logoUrl1: process.env.LOGO_URL_1,
         logoUrl2: process.env.LOGO_URL_2
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
        const pdfBuffer = await page.pdf({
          format: "A4",
          margin: {
            top: "0.5in",
            right: "0.5in",
            bottom: "0.5in",
            left: "0.5in",
          },
          printBackground: true,
          preferCSSPageSize: true,
          compress: true,
        });

        await browser.close();

        const pdfsDir = path.join(__dirname, "../../pdfs");
        if (!fs.existsSync(pdfsDir)) {
          fs.mkdirSync(pdfsDir);
        }

        const filename = `leave-request-${Date.now()}.pdf`;
        const filePath = path.join(__dirname, "../../pdfs", filename);
        fs.writeFileSync(filePath, pdfBuffer);

        const fileUrl = `${URI}/pdfs/${filename}`;

        sendResponse(
          res,
          200,
          true,
          { file: fileUrl },
          "PDF downloaded Successfully"
        );
      } else {
        sendResponse(res, 404, false, {}, "Leave entry not found!");
      }
    } catch (err) {
      console.error(err);
      sendResponse(res, 500, false, {}, "Something went wrong!");
      return;
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized!");
    return;
  }
};
