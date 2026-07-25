const { sendResponse } = require('../../helper/response');
const EmployeeLeaves = require('../../models/payroll/leave.model');

exports.manageEmployeeLeaves = async (req, res) => {
    const { id, firm_id, year, date, employee, leave_days, remarks } = req.body;

    if (req.user && !req.error) {
        try {
            let voucher_no = '1';
            const lastLeave = await EmployeeLeaves.findOne({}).sort({ voucher_no: -1 }).lean();
            if (lastLeave && lastLeave.voucher_no) {
                voucher_no = `${parseInt(lastLeave.voucher_no) + 1}`;
            }

            if (firm_id && date && employee && leave_days) {
                if (!id) {
                    const getYear = new Date(date).getFullYear();
                    try {
                       await EmployeeLeaves.create({
                            firm_id,
                            year: getYear,
                            voucher_no,
                            date,
                            employee,
                            leave_days,
                            remarks
                        }).then(() => {
                            sendResponse(res, 200, true, {}, 'Employee leave added successfully!');
                        });
                    } catch (err) {
                        if (err.code === 11000) {
                            sendResponse(res, 400, false, {}, 'An employee already has a leave record for this firm and year.');
                        } else {
                            throw err;
                        }
                    }
                } else {
                    const leave = await EmployeeLeaves.findByIdAndUpdate(id, {
                        firm_id,
                        year:getYear,
                        date,
                        employee,
                        leave_days,
                        remarks
                    }, { new: true });
                    sendResponse(res, 200, true, leave, 'Employee leave updated successfully!');
                }
            } else {
                sendResponse(res, 400, false, {}, 'Missing parameter!');
            }
        } catch (err) {
            console.log(err)
            sendResponse(res, 500, false, {}, 'Something went wrong!');
        }
    } else {
        sendResponse(res, 401, false, {}, 'Unauthorized!');
    }
};

exports.getEmployeeLeaves = async (req,res) => {
    if(req.user && !req.error) {
        try {
            const result = await EmployeeLeaves.aggregate([
                {
                    $lookup: {
                        from: 'employees',
                        localField: 'employee',
                        foreignField: '_id',
                        as: 'employeeData'
                    }        
                },
                {
                    $unwind: "$employeeData",
                },
                {
                    $lookup: {
                        from: 'salaries',
                        let: {employeeId : '$employeeData._id'},
                        pipeline: [
                            { $match: { $expr: { $eq: ["$employee", "$$employeeId"] } } },
                            { $sort: { month: -1 } },
                            { $limit: 1 }
                        ],
                        as: 'salaryData'
                    }
                },
                {
                    $unwind: "$salaryData",
                },
                {
                    $lookup: {
                        from: 'departments',
                        localField: 'salaryData.department',
                        foreignField: '_id',
                        as: 'departmentData'
                    }
                },
                {
                    $unwind: "$departmentData",
                },
                {
                    $lookup: {
                        from: 'designations',
                        localField: 'employeeData.designation',
                        foreignField: '_id',
                        as: 'designationData'
                    }        
                },
                {
                    $unwind: "$designationData",
                },
                {
                    $project: {
                        _id: 1,
                        voucher_no: 1,
                        date: 1,
                        employee: "$employeeData._id",
                        employee_name: "$employeeData.full_name",
                        card_no: "$employeeData.card_no",
                        designation: "$designationData.name",
                        leave_days: 1,
                        remarks: 1,
                        year: 1,
                        department: "$departmentData.name",
                    }
                }
            ])
            
            sendResponse(res,200, true, result,'Employee leaves fetched successfully!');
            
        } catch(err) {
            console.log(err.message);
            sendResponse(res,500, false, {},'Something went wrong!');
        }
    } else {
        sendResponse(res,401, false,{},'Unauthorized!');
    }
}

exports.getLeaveReport = async (req, res) => {
    if (req.user && !req.error) {
        try {
            const result = await EmployeeLeaves.aggregate([
                {
                    $lookup: {
                        from: 'employees',
                        localField: 'employee',
                        foreignField: '_id',
                        as: 'employeeData'
                    }
                },
                {
                    $unwind: "$employeeData",
                },
                {
                    $lookup: {
                        from: 'salaries',
                        let: { employeeId: '$employeeData._id' },
                        pipeline: [
                            { $match: { $expr: { $eq: ["$employee", "$$employeeId"] } } },
                            { $sort: { month: -1 } },
                            { $limit: 1 }
                        ],
                        as: 'salaryData'
                    }
                },
                {
                    $unwind: "$salaryData",
                },
                {
                    $lookup: {
                        from: 'departments',
                        localField: 'salaryData.department',
                        foreignField: '_id',
                        as: 'departmentData'
                    }
                },
                {
                    $unwind: "$departmentData",
                },
                {
                    $lookup: {
                        from: 'designations',
                        localField: 'employeeData.designation',
                        foreignField: '_id',
                        as: 'designationData'
                    }
                },
                {
                    $unwind: "$designationData",
                },
                {
                    $lookup: {
                        from: 'monthly-attendances',
                        localField: 'employee',
                        foreignField: 'employee',
                        as: 'monthlyData'
                    }
                },
                {
                    $unwind: "$monthlyData",
                },
                {
                    $lookup: {
                        from: 'years',
                        localField: 'monthlyData.year_id',
                        foreignField: '_id',
                        as: 'yearData'
                    }
                },
                {
                    $unwind: "$yearData", 
                },
                {
                    $group: {
                      _id: {
                        id: "$employeeData._id",
                        year_id: "$employeeData.year_id",
                      },  
                      total_used_leave_days: { $sum: "$monthlyData.use_leave" },  
                      leave_days: { $first: "$leave_days" },
                      monthlyLeaveDetails: {
                        $push: {  
                          month: "$monthlyData.month",  
                          use_leave: "$monthlyData.use_leave",
                          year: {
                            $cond: {
                              if: { $gte: ["$monthlyData.month", 4] }, 
                              then: { $year: "$yearData.start_year" },
                              else: { $add: [{ $year: "$yearData.start_year" }, 1] } 
                            }
                          }
                        }
                      },
                      employeeData: { $first: "$employeeData" },
                      departmentData: { $first: "$departmentData" },
                      designationData: { $first: "$designationData" },
                      start_year: { $first: "$yearData.start_year" }
                    }
                },                  
                {
                    $lookup: {
                        from: 'salaries',
                        let: { employeeId: "$employeeData._id", yearId: "$yearData._id" },
                        pipeline: [{ 
                                $match: { 
                                    $expr: { 
                                        $and: [
                                            { $eq: ["$employee", "$$employeeId"] },
                                            { $eq: ["$month", 12] }, 
                                            // { $eq: ["$year_id", "$$yearId"] } 
                                        ] 
                                    } 
                                } 
                            },
                            { $sort: { month: -1 } },
                            { $limit: 1 }
                        ],
                        as: 'decemberSalaryData'
                    }
                },
                // {
                //     $unwind: "$decemberSalaryData",
                // },
                {
                    // Add fields, setting default if no December salary is found
                    $addFields: {
                        decemberSalaryData: {
                            $ifNull: [{ $arrayElemAt: ["$decemberSalaryData", 0] }, { perday_salary: 0 }]
                        },
                        remaining_leave_days: { $subtract: ["$leave_days", "$total_used_leave_days"] },
                        
                    }
                },
                {
                    $project: {
                        _id: 0,  
                        employee_name: "$employeeData.full_name",
                        joining_date: "$employeeData.joining_date",
                        card_no: "$employeeData.card_no",
                        designation: "$designationData.name",
                        department: "$departmentData.name",
                        total_used_leave_days: 1, 
                        monthlyData: "$monthlyLeaveDetails" ,
                        leave_days: 1,
                        remaining_leave_days: 1,
                        bal_leave_amt: {$multiply : ["$decemberSalaryData.perday_salary", "$remaining_leave_days"]},
                        start_year: 1,
                    }
                }
            ]);

            const formattedResult = result.map(employee => {
                const monthsInYear = Array.from({ length: 12 }, (_, i) => ({
                    month: i + 1,
                    use_leave: 0,
                  //  year: result.start_year, 
                }));

               
                const existingMonthlyData = employee.monthlyData.reduce((acc, curr) => {
                    acc[curr.month] = curr;
                    return acc;
                }, {});

                const completeMonthlyData = monthsInYear.map(monthData => {
                    return existingMonthlyData[monthData.month] || monthData;

                });

                return {
                    ...employee,
                    monthlyData: completeMonthlyData,
                };
            });
            

            sendResponse(res, 200, true, formattedResult, 'Employee leave report fetched successfully!');
        } catch (e) {
            console.log(e.message);
            sendResponse(res, 500, false, {}, 'Something went wrong!');
        }
    } else {
        sendResponse(res, 401, false, {}, 'Unauthorized!');
    }
};

