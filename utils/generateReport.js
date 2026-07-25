const Earning = require('../models/payroll/earning.model');
const Deduction = require('../models/payroll/deduction.model');

const generateReport = async ({ type, startDate, endDate, month, department, tableType, full_name }) => {
    const tableCollection = getCollection(tableType);

    const d1 = startDate ? new Date(`${startDate}T00:00:00.000Z`) : null;
    const d2 = endDate ? new Date(`${endDate}T23:59:59.999Z`) : null;

    const matchConditions = { deleted: false };
    if (typeof type === 'string' && type.startsWith('[') && type.endsWith(']')) {
        type = JSON.parse(type.replace(/'/g, '"'));
    }
    if (Array.isArray(type)) {
        matchConditions.type = { $in: type };
    } else if (type) {
        matchConditions.type = type;
    }
    if (d1 && d2) {
        matchConditions.date = { $gte: d1, $lt: d2 };
    }

    if (month) {
        matchConditions.month = month;
    }

    if (typeof department === 'string' && department.startsWith('[') && department.endsWith(']')) {
        department = JSON.parse(department.replace(/'/g, '"'));
    }

    const departmentMatch = department
        ? Array.isArray(department)
            ? { "departmentData.name": { $in: department } }
            : { "departmentData.name": department }
        : {};

    const report = await tableCollection.aggregate([
        {
            $match: matchConditions
        },
        {
            $lookup: {
                from: "employees",
                localField: "employee",
                foreignField: "_id",
                as: "employeeData"
            }
        },
        {
            $unwind: "$employeeData"
        },
        ...(full_name ? [{
            $match: {
                "employeeData.full_name": {
                    $regex: new RegExp(full_name, "i")
                }
            }
        }] : []),
        {
            $lookup: {
                from: "designations",
                localField: "employeeData.designation",
                foreignField: "_id",
                as: "designationData"
            }
        },
        {
            $unwind: "$designationData"
        },
        {
            $lookup: {
                from: "firms",
                localField: "firm_id",
                foreignField: "_id",
                as: "firmData"
            }
        },
        {
            $unwind: "$firmData"
        },
        {
            $lookup: {
                from: "years",
                localField: "year_id",
                foreignField: "_id",
                as: "yearData"
            }
        },
        {
            $unwind: "$yearData"
        },
        {
            $lookup: {
                from: "salaries",
                let: { employeeId: "$employeeData._id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: ["$employee", "$$employeeId"]
                            }
                        }
                    },
                    {
                        $sort: { month: -1 }
                    },
                    {
                        $limit: 1
                    }
                ],
                as: "salaryData"
            }
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
            $unwind: "$departmentData"
        },
        { $match: departmentMatch },
        {
            $sort: { type: 1 } // Sort by type to maintain the order
        },
        {
            $group: {
                _id: {
                    type: "$type",
                    firm_id: "$firmData._id",
                    firm: "$firmData.name",
                    startYear: "$yearData.start_year",
                    endYear: "$yearData.end_year",
                },
                employees: {
                    $push: {
                        voucher_no: "$voucher_no",
                        date: "$date",
                        employee_name: "$employeeData.full_name",
                        employee_id: "$employeeData.employee_id",
                        designation: "$designationData.name",
                        department: "$departmentData.name",
                        card_no: "$employeeData.card_no",
                        amount: "$amount",
                        type: "$type",
                        month: "$month",
                        remarks: "$remark"
                    }
                },
                totalAmountByType: { $sum: "$amount" },
                countByType: { $sum: 1 },
                typeId: { $first: "$_id" },
            }
        },
        {
            $project: {
                _id: 0,
                typeId: 1,
                firm: {
                    id: "$_id.firm_id",
                    firm: "$_id.firm",
                    start_year: "$_id.startYear",
                    end_year: "$_id.endYear",
                },
                type: "$_id.type",
                totalAmountByType: 1,
                countByType: 1,
                [tableType]: {
                    employees: "$employees"
                },
            }
        },
        {
            $sort: { type: 1 } // Ensures the final result is also sorted by type
        }
    ]);

    return report;
};

const getCollection = (collection) => {
    switch (collection) {
        case "earnings":
            return Earning
        case "deductions":
            return Deduction;
        default:
            throw new Error("Invalid collection type");
    }
};

module.exports = { generateReport };
