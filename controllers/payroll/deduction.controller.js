const Deduction = require("../../models/payroll/deduction.model");
const Salary = require("../../models/payroll/salary.model");
const { generateReport } = require("../../utils/generateReport");
const { sendResponse } = require("../../helper/response");

exports.getDeduction = async (req, res) => {
  const { month, firm, year } = req.query;
  if (req.user && !req.error) {
    const query = { status: true, deleted: false };
    const isValid = (v) => v && v !== 'null' && v !== 'undefined';
    if (isValid(firm)) query.firm_id = firm;
    if (isValid(year)) query.year_id = year;
    if (isValid(month)) query.month = month;
    try {
      const DeductionData = await Deduction.find(query, { deleted: 0 })
        .populate({
          path: "employee",
          select: "card_no full_name designation salary_id employee_id",
          populate: {
            path: "designation",
            select: "name",
          },
        })
        .populate("firm_id", "name")
        .populate("year_id", "start_year end_year");

      await Promise.all(
        DeductionData.map(async (elem) => {
          let salaryData = null;
          if (elem.employee) {
            if (elem.employee._id) {
              const salary = await Salary.find({ employee: elem.employee._id })
                .populate("bank_name", "name")
                .populate({
                  path: "department",
                  select: "name group",
                  populate: {
                    path: "group",
                    select: "name",
                  },
                })
                .sort({ createdAt: -1 });

              salaryData = salary[0]
                ? {
                    employee: salary[0].employee,
                    department: salary[0].department,
                    bank_name: salary[0].bank_name,
                    bank_branch_name: salary[0].bank_branch_name,
                    bank_account_name: salary[0].bank_account_name,
                    bank_account_no: salary[0].bank_account_no,
                    bank_account_ifsc: salary[0].bank_account_ifsc,
                    bank_code: salary[0].bank_code,
                  }
                : {};
            } else {
              salaryData = {};
            }
          }
          return {
            ...elem.toObject(),
            salary_id: salaryData,
          };
        })
      ).then((data) => {
        if (data) {
          sendResponse(res, 200, true, data, "Deduction list");
        } else {
          sendResponse(res, 400, false, {}, "Deduction not found");
        }
      });
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
      console.log(error);
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.getAdminDeduction = async (req, res) => {
  const { month, firm, year } = req.query;
  if (req.user && !req.error) {
    const query = { status: true, deleted: false };
    const isValid = (v) => v && v !== 'null' && v !== 'undefined';
    if (isValid(firm)) query.firm_id = firm;
    if (isValid(year)) query.year_id = year;
    if (isValid(month)) query.month = month;
    try {
      const deductionData = await Deduction.find(query, { deleted: 0 })
        .populate({
          path: "employee",
          select:
            "card_no full_name designation salary_id employee_id adhar_no",
          populate: {
            path: "designation",
            select: "name",
          },
        })
        .populate("firm_id", "name")
        .populate("year_id", "start_year end_year")
        .sort({ createdAt: -1 })
        .lean();

      const employeeIds = deductionData.map((elem) => elem.employee._id);

      const salaryData = await Salary.find({ employee: { $in: employeeIds } })
        .populate("department", "name")
        .lean();

      const salaryMap = {};
      salaryData.forEach((salary) => {
        salaryMap[salary.employee] = {
          employee: salary.employee,
          department: salary.department,
        };
      });

      const enrichedData = deductionData.map((elem) => ({
        ...elem,
        salary_id: salaryMap[elem.employee._id] || {},
      }));

      sendResponse(res, 200, true, enrichedData, "Deduction list");
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.manageDeduction = async (req, res) => {
  const {
    firm_id,
    year_id,
    employee,
    date,
    other_voucher_no,
    type,
    remark,
    other_remark,
    amount,
    status,
    id,
  } = req.body;

  try {
    if (!req.user) {
      return sendResponse(res, 401, false, {}, "Unauthorized");
    }

    if (!firm_id || !year_id || !employee || !date || !type || !amount) {
      return sendResponse(res, 400, false, {}, "Missing parameters");
    }

    let voucher_no = "1";
    if (!id) {
      const lastDeduction = await Deduction.findOne({ firm_id, year_id })
        .sort({ createdAt: -1 })
        .lean();
      if (lastDeduction && lastDeduction.voucher_no) {
        voucher_no = `${parseInt(lastDeduction.voucher_no) + 1}`;
      }
    }

    const full_date = new Date(date);
    const month = full_date.getMonth() + 1;
    const monthYear = full_date.getFullYear();
    const day = full_date.getDate();

    const deductionData = {
      firm_id,
      year_id,
      employee,
      date,
      e_year: monthYear,
      e_day: day,
      month,
      voucher_no,
      other_voucher_no,
      type,
      remark,
      other_remark,
      amount,
    };

    let result;
    if (!id) {
      const deduction = new Deduction(deductionData);
      result = await deduction.save();
      sendResponse(res, 200, true, result, "Deduction added successfully");
    } else {
      result = await Deduction.findByIdAndUpdate(
        id,
        { ...deductionData, status },
        { new: true }
      );
      if (!result) {
        return sendResponse(res, 404, false, {}, "Deduction not found");
      }
      sendResponse(res, 200, true, result, "Deduction updated successfully");
    }
  } catch (error) {
    console.error("Error in manageDeduction:", error);
    sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

exports.deleteDeduction = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error && id) {
    console.log(id, "delete");
    try {
      await Deduction.findByIdAndUpdate(id, { deleted: true }).then((data) => {
        if (data) {
          sendResponse(res, 200, true, {}, "Deduction deleted successfully");
        }
      });
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.getDeductionReport = async (req, res) => {
  const { type, startDate, endDate, department, full_name, month } = req.body;
  if (req.user && !req.error) {
    try {
      const deductionReport = await generateReport({
        type,
        startDate,
        month: parseInt(month),
        endDate,
        department,
        tableType: "deductions",
        full_name,
      });

      if (deductionReport.length > 0) {
        sendResponse(
          res,
          200,
          true,
          deductionReport,
          "Grouped Deduction Report fetched successfully"
        );
      } else {
        sendResponse(res, 200, true, [], "No deduction report found");
      }
    } catch (error) {
      console.error("Error fetching earnings report:", error);
      sendResponse(res, 500, false, {}, "Error fetching earnings report");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
    return;
  }
};

exports.getLoanReceiveReport = async (req, res) => {
  const { startDate, endDate, department, full_name, month } = req.body;
  if (req.user && !req.error) {
    try {
      const loanReport = await generateReport({
        type: "Loan",
        startDate,
        month: parseInt(month),
        endDate,
        department,
        tableType: "deductions",
        full_name,
      });

      if (loanReport.length > 0) {
        sendResponse(
          res,
          200,
          true,
          loanReport,
          "Loan Deduction Report fetched successfully"
        );
      } else {
        sendResponse(res, 200, true, [], "No earnings report found");
      }
    } catch (error) {
      console.error("Error fetching earnings report:", error);
      sendResponse(res, 500, false, {}, "Error fetching earnings report");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
    return;
  }
};
