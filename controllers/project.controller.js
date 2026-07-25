const Project = require("../models/project.model");
const { Types: { ObjectId } } = require('mongoose');

const { sendResponse } = require("../helper/response");
const dailyAttendance = require("../models/payroll/daily.attendance.model");
const PartyBill = require("../models/payroll/partyBill.model");

exports.getProjects = async (req, res) => {
  if (req.user && !req.error) {
    try {
      await Project.find({ status: true, deleted: false }, { deleted: 0 })
        .sort({ name: 1 })
        .populate("projectManager", "name")
        .populate({
          path: "party",
          select: "name partyGroup address address_two address_three pincode city state",
          populate: {
            path: "partyGroup",
            select: "name",
          },
        })
        .populate("department", "name")
        .populate("location", "name")
        .populate("firm_id", "name gst_no")
        .populate("contractor.conId", "name email mobile status")
        .populate("year_id", "start_year  end_year")
        .sort({ voucher_no: -1 })
        .then((data) => {
          if (data) sendResponse(res, 200, true, data, "Project List");
          else sendResponse(res, 200, true, {}, "Project not found");
        });
    } catch (error) {
      console.log(error, 'Project')
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

// exports.getAdminProjects = async (req, res) => {
//   if (req.user && !req.error) {
//     try {
//       await Project.find({ deleted: false }, { deleted: 0 })
//         .populate("projectManager", "name")
//         .populate({
//           path: "party",
//           select: "name partyGroup",
//           populate: {
//             path: "partyGroup",
//             select: "name",
//           },
//         })
//         .populate("department", "name")
//         .populate("location", "name")
//         .populate("label.labelId", "projectTypeName")
//         .populate("contractor.conId", "name email mobile status")
//         .populate("firm_id", "name gst_no")
//         .populate("year_id", "start_year  end_year")
//         .sort({ voucher_no: -1 })
//         .then((data) => {
//           if (data) sendResponse(res, 200, true, data, "Project List");
//           else sendResponse(res, 200, true, {}, "Project not found");
//         });
//     } catch (error) {
//       console.log(error, 'Project == 2')
//       sendResponse(res, 500, false, {}, "Something went wrong");
//     }
//   } else {
//     sendResponse(res, 400, false, {}, "Unauthorised");
//   }
// };

exports.getAdminProjects = async (req, res) => {
  if (req.user && !req.error) {
    try {
      let data = await Project.find({ deleted: false }, { deleted: 0 })
        .populate("projectManager", "name")
        .populate({
          path: "party",
          select: "name partyGroup",
          populate: { path: "partyGroup", select: "name" }
        })
        .populate("department", "name")
        .populate("location", "name")
        .populate("label.labelId", "projectTypeName")
        .populate("contractor.conId", "name email mobile status")
        .populate("firm_id", "name gst_no")
        .populate("year_id", "start_year end_year")
        .sort({ voucher_no: -1 });

      // Normalize labels
      data = data.map(p => {
        if (typeof p.label === "string") {
          // Wrap string into array for consistent response
          p.label = [{ labelName: p.label }];
        } else if (Array.isArray(p.label)) {
          // Convert empty labelId or string objects to consistent format
          p.label = p.label.map(l => {
            if (l.labelId && typeof l.labelId === "object" && l.labelId.projectTypeName) {
              return { labelId: l.labelId };
            } else if (l.labelId && typeof l.labelId === "string") {
              return { labelName: l.labelId };
            } else {
              return l;
            }
          });
        }
        return p;
      });

      if (data && data.length) sendResponse(res, 200, true, data, "Project List");
      else sendResponse(res, 200, true, [], "Project not found");
    } catch (error) {
      console.log(error, "Project Error");
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.manageProject = async (req, res) => {
  const {
    firm_id,
    year_id,
    name,
    details,
    location,
    label,
    startDate,
    endDate,
    department,
    projectManager,
    party,
    status,
    work_order_no,
    contractor,
    po_date,
    company_logo,
    id,
  } = req.body;
console.log(req.body,'project body');
  if (req.user) {
    if (
      firm_id &&
      year_id &&
      name &&
      location &&
      // department &&
      projectManager &&
      work_order_no &&
      po_date &&
      party
    ) {
      const conData = contractor && JSON.parse(contractor);
      const labelData = label && JSON.parse(label);
      console.log(labelData,'labelData')
      console.log(conData,'conData')
      const depart = department === "" || department === "undefined" ? null : department;

      const lastProject = await Project.findOne({}).sort({ voucher_no: -1 });
      const new_voucher_no = lastProject ? parseInt(lastProject.voucher_no) + 1 : 10001;

      const ProjectObject = new Project({
        firm_id,
        year_id,
        name: name,
        details: details,
        location: location,
        label: labelData,
        startDate: startDate ? startDate : null,
        endDate: endDate ? endDate : null,
        department: depart,
        projectManager: projectManager,
        work_order_no: work_order_no,
        party: party,
        contractor: conData,
        voucher_no: new_voucher_no,
        po_date: po_date,
        company_logo: company_logo,
      });

      if (!id) {
        try {
          await ProjectObject.save(ProjectObject).then((data) => {
            sendResponse(res, 200, true, {}, "Project added successfully");
          });
        } catch (error) {
          sendResponse(res, 500, false, {}, "Something went wrong");
        }
      } else {

        const updateData = {
          firm_id,
          year_id,
          name,
          details,
          location,
          label: labelData,
          startDate: startDate !== "Invalid date" ? startDate : null,
          endDate: endDate !== "Invalid date" ? endDate : null,
          department: depart,
          projectManager,
          party,
          work_order_no,
          status,
          contractor: conData,
          po_date: po_date !== "Invalid date" ? po_date : null,
        };

        // ✅ Only update logo if new one is sent
        if (company_logo && company_logo !== "undefined") {
          updateData.company_logo = company_logo;
        }

        await Project.findByIdAndUpdate(id, updateData).then((data) => {
          if (data) {
            sendResponse(res, 200, true, {}, "Project updated successfully");
          } else {
            sendResponse(res, 200, true, {}, "Project not found");
          }
        });
      }
    } else {
      sendResponse(res, 400, false, {}, "Missing parameters");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.deleteProject = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error && id) {
    try {
      await Project.findByIdAndUpdate(id, { deleted: true }).then((data) => {
        if (data) {
          sendResponse(res, 200, true, {}, "Project deleted successfully");
        }
      });
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.getOneProject = async (req, res) => {
  const { pId } = req.params
  if (!req.user && req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  if (!pId) {
    return sendResponse(res, 400, false, {}, "Missing parameters");
  }

  try {

    await Project.findById(pId, { deleted: 0 })
      .populate({
        path: "party",
        select: "name partyGroup address pincode city state gstNumber",
        populate: {
          path: "partyGroup",
          select: "name",
        },
      })

      .then(data => {
        if (!data) {
          sendResponse(res, 200, true, {}, "Project not found")
        } else {
          sendResponse(res, 200, true, data, "Project found")
        }
      })
  } catch (error) {
    console.log(error)
    sendResponse(res, 500, false, {}, "Something went wrong")
  }
}

// const projectIncomeExpense = async () => {
//   try {
//     const requestData = await Project.aggregate([
//       {
//         $match: { deleted: false },
//       },
//       {
//         $lookup: {
//           from: "erp-requests",
//           let: { projectId: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: { $eq: ["$project", "$$projectId"] },
//                 deleted: false
//               }
//             },
//             {
//               $lookup: {
//                 from: "erp-purchase-offers",
//                 let: { requestId: "$_id" },
//                 pipeline: [
//                   {
//                     $match: {
//                       $expr: { $eq: ["$requestId", "$$requestId"] },
//                       deleted: false
//                     }
//                   },
//                   { $unwind: "$items" },
//                   {
//                     $lookup: {
//                       from: "store_transaction_items",
//                       let: { txnId: "$items.transactionId" },
//                       pipeline: [
//                         {
//                           $match: {
//                             $expr: { $eq: ["$_id", "$$txnId"] },
//                             deleted: false
//                           }
//                         }
//                       ],
//                       as: "items.transactionItemData"
//                     }
//                   },
//                   {
//                     $unwind: {
//                       path: "$items.transactionItemData",
//                       preserveNullAndEmptyArrays: true
//                     }
//                   },
//                   {
//                     $addFields: {
//                       item_cost: {
//                         $multiply: [
//                           { $ifNull: ["$items.offeredQty", 0] },
//                           { $ifNull: ["$items.transactionItemData.unit_rate", 0] }
//                         ]
//                       }
//                     }
//                   },
//                   {
//                     $group: {
//                       _id: "$requestId",
//                       total_expense: { $sum: "$item_cost" },
//                       items: { $push: "$items" }
//                     }
//                   }
//                 ],
//                 as: "purchaseDetails"
//               }
//             }
//           ],
//           as: "requestDetails"
//         }
//       },
//       {
//         $lookup: {
//           from: "ms_trans_details",
//           let: { projectId: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ["$project_id", "$$projectId"] },
//                     { $eq: ["$tag_id", new ObjectId("66ab65d0bf00a1d95bb7fef4")] }
//                   ]
//                 },
//                 deleted: false
//               }
//             },
//             { $unwind: "$items_details" },
//             {
//               $match: {
//                 "items_details.deleted": false
//               }
//             },
//             {
//               $group: {
//                 _id: null,
//                 total_store_expense: {
//                   $sum: { $ifNull: ["$items_details.total_amount", 0] }
//                 }
//               }
//             }
//           ],
//           as: "storeExpense"
//         }
//       },
//       {
//         $lookup: {
//           from: "multi-erp-invoices",
//           let: { project_id: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $eq: ["$projectId", "$$project_id"]
//                 },
//               }
//             },
//             {
//               $group: {
//                 _id: null,
//                 total_income: {
//                   $sum: { $ifNull: ["$netAmount", 0] }
//                 }
//               }
//             }
//           ],
//           as: "storeInvoice"
//         }
//       },
//       {
//         $addFields: {
//           requestDetails: { $arrayElemAt: ["$requestDetails", 0] }
//         }
//       },
//       {
//         $addFields: {
//           purchaseDetails: { $arrayElemAt: ["$requestDetails.purchaseDetails", 0] }
//         }
//       },
//       {
//         $addFields: {
//           total_income: {
//             $ifNull: [{ $arrayElemAt: ["$storeInvoice.total_income", 0] }, 0]
//           },
//           project_material_expense: {
//             $ifNull: ["$purchaseDetails.total_expense", 0],
//           },
//           project_store_expense: {
//             $ifNull: [{ $arrayElemAt: ["$storeExpense.total_store_expense", 0] }, 0]
//           }
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           project_id: "$_id",
//           project_name: "$name",
//           total_income: 1,
//           project_material_expense: 1,
//           project_store_expense: 1,
//         },
//       },
//     ]);

//     const requestData1 = await dailyAttendance.aggregate([
//       {
//         $match: {
//           deleted: false,
//           project: { $exists: true, $ne: null }
//         }
//       },
//       {
//         $lookup: {
//           from: "bussiness-projects",
//           localField: "project",
//           foreignField: "_id",
//           as: "projectDetails"
//         }
//       },
//       {
//         $unwind: {
//           path: "$projectDetails",
//           preserveNullAndEmptyArrays: false
//         }
//       },
//       {
//         $lookup: {
//           from: "salaries",
//           let: { employeeId: "$employee", month: "$month", firm_id: "$firm_id", year_id: "$year_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ["$employee", "$$employeeId"] },
//                     { $eq: ["$month", "$$month"] },
//                     { $eq: ["$firm_id", "$$firm_id"] },
//                     { $eq: ["$year_id", "$$year_id"] }
//                   ]
//                 }
//               }
//             }
//           ],
//           as: "salaryDetails"
//         }
//       },
//       {
//         $unwind: {
//           path: "$salaryDetails",
//           preserveNullAndEmptyArrays: true
//         }
//       },
//       {
//         $lookup: {
//           from: "earnings",
//           let: { employeeId: "$employee", month: "$month", date: "$date", firm_id: "$firm_id", year_id: "$year_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ["$employee", "$$employeeId"] },
//                     { $eq: ["$firm_id", "$$firm_id"] },
//                     { $eq: ["$year_id", "$$year_id"] },
//                     { $eq: ["$month", "$$month"] },
//                     { $eq: ["$date", "$$date"] },
//                     { $eq: ["$deleted", false] }
//                   ]
//                 }
//               }
//             }
//           ],
//           as: "earningsDetails"
//         }
//       },
//       {
//         $unwind: {
//           path: "$earningsDetails",
//           preserveNullAndEmptyArrays: true
//         }
//       },
//       {
//         $group: {
//           _id: {
//             project_id: "$project",
//             project_name: "$projectDetails.name",
//             date: "$date"
//           },
//           total_salary: {
//             $sum: {
//               $round: [
//                 {
//                   $add: [
//                     { $multiply: ["$present_day", "$salaryDetails.perday_salary"] },
//                     { $multiply: ["$ot_hour", "$salaryDetails.perhour_ot_salary"] }
//                   ]
//                 },
//                 2
//               ]
//             }
//           },
//           total_earnings: { $sum: "$earningsDetails.amount" }
//         }
//       },
//       {
//         $group: {
//           _id: {
//             project_id: "$_id.project_id",
//             project_name: "$_id.project_name"
//           },
//           salary_by_date: {
//             $push: {
//               date: "$_id.date",
//               total_salary: { $add: ["$total_salary", "$total_earnings"] }
//             }
//           }
//         }
//       },
//       {
//         $addFields: {
//           total_project_salary: {
//             $sum: {
//               $map: {
//                 input: "$salary_by_date",
//                 as: "s",
//                 in: "$$s.total_salary"
//               }
//             }
//           }
//         }
//       },
//       {
//         $sort: {
//           "_id.project_name": 1
//         }
//       },
//       {
//         $project: {
//           _id: 0,
//           project_id: "$_id.project_id",
//           project_name: "$_id.project_name",
//           project_salary_expense: "$total_project_salary"
//         }
//       }
//     ]);

//     const mergedMap = new Map();
//     const date = new Date();
// date.setDate(date.getDate() - 1);
// const selectedMonth = date.getMonth() + 1;
// const selectedYear = date.getFullYear();

  
//   const partyBillData = await PartyBill.aggregate([
//   {
//     $match: {
//       deleted: false,
//       $expr: {
//         $and: [
//           { $eq: [{ $month: "$invoice_date" }, selectedMonth] },
//           { $eq: [{ $year: "$invoice_date" }, selectedYear] }
//         ]
//       }
//     }
//   },
//   {
//     $group: {
//       _id: "$project_id",
//       total_party_bill_expense: {
//         $sum: { $ifNull: ["$amount_with_gst", 0] }
//       }
//     }
//   }
// ]);

//     requestData.forEach(item => {
//       const key = `${item.project_id}_${item.project_name}`;
//       mergedMap.set(key, { ...item, project_salary_expense: 0,party_bill_expense:0 });
//     });

//     requestData1.forEach(item => {
//       const key = `${item.project_id}_${item.project_name}`;
//       if (mergedMap.has(key)) {
//         mergedMap.set(key, { ...mergedMap.get(key), ...item });
//       } else {
//         mergedMap.set(key, { ...item, some_other_field: 0 });
//       }
//     });


//     const partyBillMap = new Map();
// partyBillData.forEach(item => {
//   partyBillMap.set(String(item._id), item.total_party_bill_expense);
// });
// for (const [key, value] of mergedMap.entries()) {
//   const partyExpense = partyBillMap.get(String(value.project_id)) || 0;

//   mergedMap.set(key, {
//     ...value,
//     party_bill_expense: partyExpense,
//   });
// }
//     const mergedData = Array.from(mergedMap.values());



//     if (mergedData.length && mergedData.length > 0) {
//       return { status: 1, result: mergedData };
//     } else {
//       return { status: 0, result: [] };
//     }
//   } catch (error) {
//     return { status: 2, result: error };
//   }
// };

const projectIncomeExpense = async () => {

  try {

    /*
    ============================================================
    STRUCTURE DATA
    ============================================================
    */

    const structureData = await Project.aggregate([

      {
        $match: {
          deleted: false
        }
      },

      /*
      ============================================================
      STRUCTURE MATERIAL EXPENSE
      ============================================================
      */

      {
        $lookup: {
          from: "erp-requests",
          let: {
            projectId: "$_id"
          },
          pipeline: [

            {
              $match: {
                deleted: false,
                $expr: {
                  $eq: ["$project", "$$projectId"]
                }
              }
            },

            {
              $lookup: {
                from: "erp-purchase-offers",
                let: {
                  requestId: "$_id"
                },
                pipeline: [

                  {
                    $match: {
                      deleted: false,
                      $expr: {
                        $eq: ["$requestId", "$$requestId"]
                      }
                    }
                  },

                  {
                    $unwind: "$items"
                  },

                  {
                    $lookup: {
                      from: "store_transaction_items",
                      let: {
                        txnId: "$items.transactionId"
                      },
                      pipeline: [

                        {
                          $match: {
                            deleted: false,
                            $expr: {
                              $eq: ["$_id", "$$txnId"]
                            }
                          }
                        }

                      ],
                      as: "transactionItem"
                    }
                  },

                  {
                    $unwind: {
                      path: "$transactionItem",
                      preserveNullAndEmptyArrays: true
                    }
                  },

                  {
                    $addFields: {
                      item_cost: {
                        $multiply: [
                          { $ifNull: ["$items.offeredQty", 0] },
                          { $ifNull: ["$transactionItem.unit_rate", 0] }
                        ]
                      }
                    }
                  },

                  {
                    $group: {
                      _id: null,
                      total_material_expense: {
                        $sum: "$item_cost"
                      }
                    }
                  }

                ],
                as: "purchaseData"
              }
            }

          ],
          as: "requestData"
        }
      },

      /*
      ============================================================
      STRUCTURE STORE EXPENSE
      ============================================================
      */

      {
        $lookup: {
          from: "ms_trans_details",
          let: {
            projectId: "$_id"
          },
          pipeline: [

            {
              $match: {
                deleted: false,
                $expr: {
                  $and: [
                    {
                      $eq: ["$project_id", "$$projectId"]
                    },
                    {
                      $eq: [
                        "$tag_id",
                        new ObjectId("66ab65d0bf00a1d95bb7fef4")
                      ]
                    }
                  ]
                }
              }
            },

            {
              $unwind: "$items_details"
            },

            {
              $match: {
                "items_details.deleted": false
              }
            },

            {
              $group: {
                _id: null,
                total_store_expense: {
                  $sum: {
                    $ifNull: ["$items_details.total_amount", 0]
                  }
                }
              }
            }

          ],
          as: "storeData"
        }
      },

      /*
      ============================================================
      STRUCTURE INCOME
      ============================================================
      */

      {
        $lookup: {
          from: "multi-erp-invoices",
          let: {
            projectId: "$_id"
          },
          pipeline: [

            {
              $match: {
                $expr: {
                  $eq: ["$projectId", "$$projectId"]
                }
              }
            },

            {
              $group: {
                _id: null,
                total_income: {
                  $sum: {
                    $ifNull: ["$netAmount", 0]
                  }
                }
              }
            }

          ],
          as: "invoiceData"
        }
      },

      {
        $project: {

          _id: 0,

          project_id: "$_id",

          project_name: "$name",

          structure_total_income: {
            $ifNull: [
              {
                $arrayElemAt: [
                  "$invoiceData.total_income",
                  0
                ]
              },
              0
            ]
          },

          structure_material_expense: {
            $ifNull: [
              {
                $arrayElemAt: [
                  "$requestData.purchaseData.total_material_expense",
                  0
                ]
              },
              0
            ]
          },

          project_store_expense: {
            $ifNull: [
              {
                $arrayElemAt: [
                  "$storeData.total_store_expense",
                  0
                ]
              },
              0
            ]
          }

        }
      }

    ]);

    /*
    ============================================================
    PIPING DATA
    ============================================================
    */

    const pipingData = await Project.aggregate([

      {
        $match: {
          deleted: false
        }
      },

      /*
      ============================================================
      PIPING MATERIAL EXPENSE
      ============================================================
      */

      {
        $lookup: {
          from: "piping-requests",
          let: {
            projectId: "$_id"
          },
          pipeline: [

            {
              $match: {
                deleted: false,
                $expr: {
                  $eq: ["$project", "$$projectId"]
                }
              }
            },

            {
              $lookup: {
                from: "piping-purchase-offers",
                let: {
                  requestId: "$_id"
                },
                pipeline: [

                  {
                    $match: {
                      deleted: false,
                      $expr: {
                        $eq: ["$requestId", "$$requestId"]
                      }
                    }
                  },

                  {
                    $unwind: "$items"
                  },

                  {
                    $addFields: {
                      item_cost: {
                        $multiply: [
                          { $ifNull: ["$items.offeredQty", 0] },
                          { $ifNull: ["$items.unit_rate", 0] }
                        ]
                      }
                    }
                  },

                  {
                    $group: {
                      _id: null,
                      total_material_expense: {
                        $sum: "$item_cost"
                      }
                    }
                  }

                ],
                as: "purchaseData"
              }
            }

          ],
          as: "requestData"
        }
      },

      /*
      ============================================================
      PIPING INCOME
      ============================================================
      */

      {
        $lookup: {
          from: "multi-piping-invoices",
          let: {
            projectId: "$_id"
          },
          pipeline: [

            {
              $match: {
                $expr: {
                  $eq: ["$projectId", "$$projectId"]
                }
              }
            },

            {
              $group: {
                _id: null,
                total_income: {
                  $sum: {
                    $ifNull: ["$netAmount", 0]
                  }
                }
              }
            }

          ],
          as: "invoiceData"
        }
      },

      {
        $project: {

          _id: 0,

          project_id: "$_id",

          project_name: "$name",

          piping_total_income: {
            $ifNull: [
              {
                $arrayElemAt: [
                  "$invoiceData.total_income",
                  0
                ]
              },
              0
            ]
          },

          piping_material_expense: {
            $ifNull: [
              {
                $arrayElemAt: [
                  "$requestData.purchaseData.total_material_expense",
                  0
                ]
              },
              0
            ]
          }

        }
      }

    ]);

    /*
    ============================================================
    SALARY DATA
    ============================================================
    */

    const salaryData = await dailyAttendance.aggregate([

      {
        $match: {
          deleted: false,
          project: { $exists: true, $ne: null }
        }
      },

      {
        $lookup: {
          from: "bussiness-projects",
          localField: "project",
          foreignField: "_id",
          as: "projectDetails"
        }
      },

      {
        $unwind: {
          path: "$projectDetails",
          preserveNullAndEmptyArrays: false
        }
      },

      {
        $lookup: {
          from: "salaries",
          let: {
            employeeId: "$employee",
            month: "$month",
            firm_id: "$firm_id",
            year_id: "$year_id"
          },
          pipeline: [

            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$employee", "$$employeeId"] },
                    { $eq: ["$month", "$$month"] },
                    { $eq: ["$firm_id", "$$firm_id"] },
                    { $eq: ["$year_id", "$$year_id"] }
                  ]
                }
              }
            }

          ],
          as: "salaryDetails"
        }
      },

      {
        $unwind: {
          path: "$salaryDetails",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "earnings",
          let: {
            employeeId: "$employee",
            month: "$month",
            date: "$date",
            firm_id: "$firm_id",
            year_id: "$year_id"
          },
          pipeline: [

            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$employee", "$$employeeId"] },
                    { $eq: ["$firm_id", "$$firm_id"] },
                    { $eq: ["$year_id", "$$year_id"] },
                    { $eq: ["$month", "$$month"] },
                    { $eq: ["$date", "$$date"] },
                    { $eq: ["$deleted", false] }
                  ]
                }
              }
            }

          ],
          as: "earningsDetails"
        }
      },

      {
        $unwind: {
          path: "$earningsDetails",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $group: {

          _id: {
            project_id: "$project",
            project_name: "$projectDetails.name",
            date: "$date"
          },

          total_salary: {
            $sum: {
              $round: [
                {
                  $add: [
                    {
                      $multiply: [
                        "$present_day",
                        "$salaryDetails.perday_salary"
                      ]
                    },
                    {
                      $multiply: [
                        "$ot_hour",
                        "$salaryDetails.perhour_ot_salary"
                      ]
                    }
                  ]
                },
                2
              ]
            }
          },

          total_earnings: {
            $sum: "$earningsDetails.amount"
          }

        }
      },

      {
        $group: {

          _id: {
            project_id: "$_id.project_id",
            project_name: "$_id.project_name"
          },

          salary_by_date: {
            $push: {
              date: "$_id.date",
              total_salary: {
                $add: [
                  "$total_salary",
                  "$total_earnings"
                ]
              }
            }
          }

        }
      },

      {
        $addFields: {
          total_project_salary: {
            $sum: {
              $map: {
                input: "$salary_by_date",
                as: "s",
                in: "$$s.total_salary"
              }
            }
          }
        }
      },

      {
        $project: {
          _id: 0,
          project_id: "$_id.project_id",
          project_name: "$_id.project_name",
          project_salary_expense: "$total_project_salary"
        }
      }

    ]);

    /*
    ============================================================
    PARTY BILL DATA
    ============================================================
    */

    const date = new Date();
    date.setDate(date.getDate() - 1);

    const selectedMonth = date.getMonth() + 1;
    const selectedYear = date.getFullYear();

    const partyBillData = await PartyBill.aggregate([

      {
        $match: {
          deleted: false,
          $expr: {
            $and: [
              {
                $eq: [
                  { $month: "$invoice_date" },
                  selectedMonth
                ]
              },
              {
                $eq: [
                  { $year: "$invoice_date" },
                  selectedYear
                ]
              }
            ]
          }
        }
      },

      {
        $group: {
          _id: "$project_id",
          total_party_bill_expense: {
            $sum: {
              $ifNull: ["$amount_with_gst", 0]
            }
          }
        }
      }

    ]);

    /*
    ============================================================
    FINAL MERGE
    ============================================================
    */

    const mergedMap = new Map();

    const mergeData = (data) => {

      data.forEach(item => {

        const key = String(item.project_id);

        if (!mergedMap.has(key)) {

          mergedMap.set(key, {

            project_id: item.project_id,
            project_name: item.project_name,

            structure_total_income: 0,
            piping_total_income: 0,

            structure_material_expense: 0,
            piping_material_expense: 0,

            project_store_expense: 0,

            project_salary_expense: 0,
            party_bill_expense: 0

          });

        }

        const existing = mergedMap.get(key);

        mergedMap.set(key, {
          ...existing,
          ...item
        });

      });

    };

    mergeData(structureData);
    mergeData(pipingData);
    mergeData(salaryData);

    /*
    ============================================================
    PARTY BILL MERGE
    ============================================================
    */

    const partyBillMap = new Map();

    partyBillData.forEach(item => {
      partyBillMap.set(
        String(item._id),
        item.total_party_bill_expense
      );
    });

    for (const [key, value] of mergedMap.entries()) {

      const partyExpense =
        partyBillMap.get(String(value.project_id)) || 0;

      mergedMap.set(key, {
        ...value,
        party_bill_expense: partyExpense
      });

    }

    const mergedData = Array.from(mergedMap.values());

    if (mergedData.length > 0) {

      return {
        status: 1,
        result: mergedData
      };

    } else {

      return {
        status: 0,
        result: []
      };

    }

  } catch (error) {

    console.log(error);

    return {
      status: 2,
      result: error
    };

  }

};
exports.getProjectIncomeExpense = async (req, res) => {
  if (req.user && !req.error) {
    try {
      const data = await projectIncomeExpense();
      let requestData = data.result;

      if (data.status === 1) {
        sendResponse(res, 200, true, requestData, `Project income expense data list`);
      } else if (data.status === 0) {
        sendResponse(res, 200, true, [], `Project income expense data not found`);
      } else if (data.status === 2) {
        console.log("errrrrr", data.result)
        sendResponse(res, 500, false, {}, "Something went wrong11");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};




// const projectCurruentMonth = async (year_id, month, year) => {
//   try {

//     const selectedMonth = parseInt(month) || new Date().getMonth() + 1;
//     const selectedYear = parseInt(year) || new Date().getFullYear();

//     /*
//     ============================================================
//     STRUCTURE DATA
//     ============================================================
//     */

//     const structureData = await Project.aggregate([
//       {
//         $match: {
//           deleted: false
//         }
//       },

//       /*
//       ============================================================
//       STRUCTURE MATERIAL EXPENSE
//       ============================================================
//       */

//       {
//         $lookup: {
//           from: "erp-requests",
//           let: { projectId: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $eq: ["$project", "$$projectId"]
//                 },
//                 deleted: false
//               }
//             },

//             {
//               $lookup: {
//                 from: "erp-purchase-offers",
//                 let: { requestId: "$_id" },
//                 pipeline: [
//                   {
//                     $match: {
//                       $expr: {
//                         $and: [
//                           { $eq: ["$requestId", "$$requestId"] },
//                           { $eq: [{ $month: "$received_date" }, selectedMonth] },
//                           { $eq: [{ $year: "$received_date" }, selectedYear] }
//                         ]
//                       },
//                       deleted: false
//                     }
//                   },

//                   { $unwind: "$items" },

//                   {
//                     $lookup: {
//                       from: "store_transaction_items",
//                       let: { txnId: "$items.transactionId" },
//                       pipeline: [
//                         {
//                           $match: {
//                             $expr: {
//                               $eq: ["$_id", "$$txnId"]
//                             },
//                             deleted: false
//                           }
//                         }
//                       ],
//                       as: "transactionItem"
//                     }
//                   },

//                   {
//                     $unwind: {
//                       path: "$transactionItem",
//                       preserveNullAndEmptyArrays: true
//                     }
//                   },

//                   {
//                     $addFields: {
//                       item_cost: {
//                         $multiply: [
//                           { $ifNull: ["$items.offeredQty", 0] },
//                           { $ifNull: ["$transactionItem.unit_rate", 0] }
//                         ]
//                       }
//                     }
//                   },

//                   {
//                     $group: {
//                       _id: null,
//                       total_material_expense: {
//                         $sum: "$item_cost"
//                       }
//                     }
//                   }
//                 ],
//                 as: "purchaseData"
//               }
//             }
//           ],
//           as: "requestData"
//         }
//       },

//       /*
//       ============================================================
//       STRUCTURE INCOME
//       ============================================================
//       */

//       {
//         $lookup: {
//           from: "multi-erp-invoices",
//           let: { projectId: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ["$projectId", "$$projectId"] },
//                     { $eq: [{ $month: "$invoiceDate" }, selectedMonth] },
//                     { $eq: [{ $year: "$invoiceDate" }, selectedYear] }
//                   ]
//                 }
//               }
//             },

//             {
//               $group: {
//                 _id: null,
//                 total_income: {
//                   $sum: {
//                     $ifNull: ["$netAmount", 0]
//                   }
//                 }
//               }
//             }
//           ],
//           as: "invoiceData"
//         }
//       },

//       /*
//       ============================================================
//       STRUCTURE STORE EXPENSE
//       ============================================================
//       */

//       {
//         $lookup: {
//           from: "ms_trans_details",
//           let: { projectId: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 deleted: false,
//                 $expr: {
//                   $and: [
//                     { $eq: ["$project_id", "$$projectId"] },
//                     { $eq: [{ $month: "$trans_date" }, selectedMonth] },
//                     { $eq: [{ $year: "$trans_date" }, selectedYear] }
//                   ]
//                 }
//               }
//             },

//             {
//               $unwind: "$items_details"
//             },

//             {
//               $group: {
//                 _id: null,
//                 total_store_expense: {
//                   $sum: {
//                     $ifNull: ["$items_details.total_amount", 0]
//                   }
//                 }
//               }
//             }
//           ],
//           as: "storeData"
//         }
//       },

//       {
//         $project: {
//           _id: 0,
//           project_id: "$_id",
//           project_name: "$name",

//           structure_total_income: {
//             $ifNull: [
//               {
//                 $arrayElemAt: ["$invoiceData.total_income", 0]
//               },
//               0
//             ]
//           },

//           structure_material_expense: {
//             $ifNull: [
//               {
//                 $arrayElemAt: [
//                   "$requestData.purchaseData.total_material_expense",
//                   0
//                 ]
//               },
//               0
//             ]
//           },

//           project_store_expense: {
//             $ifNull: [
//               {
//                 $arrayElemAt: [
//                   "$storeData.total_store_expense",
//                   0
//                 ]
//               },
//               0
//             ]
//           }
//         }
//       }
//     ]);

//     /*
//     ============================================================
//     PIPING DATA
//     ============================================================
//     */

//     const pipingData = await Project.aggregate([
//       {
//         $match: {
//           deleted: false
//         }
//       },

//       /*
//       ============================================================
//       PIPING MATERIAL EXPENSE
//       ============================================================
//       */

//       {
//         $lookup: {
//           from: "piping-requests",
//           let: { projectId: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 deleted: false,
//                 $expr: {
//                   $eq: ["$project", "$$projectId"]
//                 }
//               }
//             },

//             {
//               $lookup: {
//                 from: "piping-purchase-offers",
//                 let: { requestId: "$_id" },
//                 pipeline: [
//                   {
//                     $match: {
//                       deleted: false,
//                       $expr: {
//                         $and: [
//                           { $eq: ["$requestId", "$$requestId"] },
//                           { $eq: [{ $month: "$received_date" }, selectedMonth] },
//                           { $eq: [{ $year: "$received_date" }, selectedYear] }
//                         ]
//                       }
//                     }
//                   },

//                   { $unwind: "$items" },

//                   {
//                     $addFields: {
//                       item_cost: {
//                         $multiply: [
//                           { $ifNull: ["$items.offeredQty", 0] },
//                           { $ifNull: ["$items.unit_rate", 0] }
//                         ]
//                       }
//                     }
//                   },

//                   {
//                     $group: {
//                       _id: null,
//                       total_material_expense: {
//                         $sum: "$item_cost"
//                       }
//                     }
//                   }
//                 ],
//                 as: "purchaseData"
//               }
//             }
//           ],
//           as: "requestData"
//         }
//       },

//       /*
//       ============================================================
//       PIPING INCOME
//       ============================================================
//       */

//       {
//         $lookup: {
//           from: "multi-piping-invoices",
//           let: { projectId: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ["$projectId", "$$projectId"] },
//                     { $eq: [{ $month: "$invoiceDate" }, selectedMonth] },
//                     { $eq: [{ $year: "$invoiceDate" }, selectedYear] }
//                   ]
//                 }
//               }
//             },

//             {
//               $group: {
//                 _id: null,
//                 total_income: {
//                   $sum: {
//                     $ifNull: ["$netAmount", 0]
//                   }
//                 }
//               }
//             }
//           ],
//           as: "invoiceData"
//         }
//       },

//       {
//         $project: {
//           _id: 0,
//           project_id: "$_id",
//           project_name: "$name",

//           piping_total_income: {
//             $ifNull: [
//               {
//                 $arrayElemAt: ["$invoiceData.total_income", 0]
//               },
//               0
//             ]
//           },

//           piping_material_expense: {
//             $ifNull: [
//               {
//                 $arrayElemAt: [
//                   "$requestData.purchaseData.total_material_expense",
//                   0
//                 ]
//               },
//               0
//             ]
//           }
//         }
//       }
//     ]);

//     /*
//     ============================================================
//     SALARY DATA
//     ============================================================
//     */

//     const salaryData = await dailyAttendance.aggregate([
//       {
//         $match: {
//           deleted: false,
//           year_id: new ObjectId(year_id),
//           project: { $exists: true, $ne: null },
//           month: selectedMonth
//         }
//       },

//       {
//         $lookup: {
//           from: "bussiness-projects",
//           localField: "project",
//           foreignField: "_id",
//           as: "projectData"
//         }
//       },

//       {
//         $unwind: "$projectData"
//       },

//       {
//         $lookup: {
//           from: "salaries",
//           let: {
//             employeeId: "$employee",
//             month: "$month"
//           },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ["$employee", "$$employeeId"] },
//                     { $eq: ["$month", "$$month"] }
//                   ]
//                 }
//               }
//             }
//           ],
//           as: "salaryData"
//         }
//       },

//       {
//         $unwind: {
//           path: "$salaryData",
//           preserveNullAndEmptyArrays: true
//         }
//       },

//       {
//         $group: {
//           _id: {
//             project_id: "$project",
//             project_name: "$projectData.name"
//           },

//           project_salary_expense: {
//             $sum: {
//               $add: [
//                 {
//                   $multiply: [
//                     { $ifNull: ["$present_day", 0] },
//                     { $ifNull: ["$salaryData.perday_salary", 0] }
//                   ]
//                 },
//                 {
//                   $multiply: [
//                     { $ifNull: ["$ot_hour", 0] },
//                     { $ifNull: ["$salaryData.perhour_ot_salary", 0] }
//                   ]
//                 }
//               ]
//             }
//           }
//         }
//       },

//       {
//         $project: {
//           _id: 0,
//           project_id: "$_id.project_id",
//           project_name: "$_id.project_name",
//           project_salary_expense: 1
//         }
//       }
//     ]);

//     /*
//     ============================================================
//     PARTY BILL
//     ============================================================
//     */

//     const partyBillData = await PartyBill.aggregate([
//       {
//         $match: {
//           deleted: false,
//           $expr: {
//             $and: [
//               { $eq: [{ $month: "$invoice_date" }, selectedMonth] },
//               { $eq: [{ $year: "$invoice_date" }, selectedYear] }
//             ]
//           }
//         }
//       },

//       {
//         $group: {
//           _id: "$project_id",

//           party_bill_expense: {
//             $sum: {
//               $ifNull: ["$amount_with_gst", 0]
//             }
//           }
//         }
//       }
//     ]);

//     /*
//     ============================================================
//     FINAL MERGE
//     ============================================================
//     */

//     const mergedMap = new Map();

//     const mergeData = (data) => {

//       data.forEach(item => {

//         const key = String(item.project_id);

//         if (!mergedMap.has(key)) {

//           mergedMap.set(key, {
//             project_id: item.project_id,
//             project_name: item.project_name,

//             structure_total_income: 0,
//             piping_total_income: 0,

//             structure_material_expense: 0,
//             piping_material_expense: 0,

//             project_store_expense: 0,
//             project_salary_expense: 0,
//             party_bill_expense: 0
//           });

//         }

//         const existing = mergedMap.get(key);

//         mergedMap.set(key, {
//           ...existing,
//           ...item
//         });

//       });

//     };

//     mergeData(structureData);
//     mergeData(pipingData);
//     mergeData(salaryData);

//     /*
//     ============================================================
//     PARTY BILL MERGE
//     ============================================================
//     */

//     partyBillData.forEach(item => {

//       const key = String(item._id);

//       if (mergedMap.has(key)) {

//         const existing = mergedMap.get(key);

//         existing.party_bill_expense = item.party_bill_expense || 0;

//         mergedMap.set(key, existing);

//       }

//     });

//     const finalData = Array.from(mergedMap.values());

//     return {
//       status: 1,
//       result: finalData
//     };

//   } catch (error) {

//     console.log(error);

//     return {
//       status: 2,
//       result: error.message
//     };

//   }
// };

const projectCurruentMonth = async (year_id, month, year) => {

  try {

    const selectedMonth = parseInt(month) || new Date().getMonth() + 1;
    const selectedYear = parseInt(year) || new Date().getFullYear();

    /*
    ============================================================
    STRUCTURE DATA
    ============================================================
    */

    const structureData = await Project.aggregate([

      {
        $match: {
          deleted: false
        }
      },

      /*
      ============================================================
      STRUCTURE MATERIAL EXPENSE
      ============================================================
      */

      {
        $lookup: {
          from: "erp-requests",
          let: { projectId: "$_id" },
          pipeline: [

            {
              $match: {
                deleted: false,
                $expr: {
                  $eq: ["$project", "$$projectId"]
                }
              }
            },

            {
              $lookup: {
                from: "erp-purchase-offers",
                let: { requestId: "$_id" },
                pipeline: [

                  {
                    $match: {
                      deleted: false,
                      $expr: {
                        $and: [
                          { $eq: ["$requestId", "$$requestId"] },
                          { $eq: [{ $month: "$received_date" }, selectedMonth] },
                          { $eq: [{ $year: "$received_date" }, selectedYear] }
                        ]
                      }
                    }
                  },

                  { $unwind: "$items" },

                  {
                    $lookup: {
                      from: "store_transaction_items",
                      let: { txnId: "$items.transactionId" },
                      pipeline: [
                        {
                          $match: {
                            deleted: false,
                            $expr: {
                              $eq: ["$_id", "$$txnId"]
                            }
                          }
                        }
                      ],
                      as: "transactionItem"
                    }
                  },

                  {
                    $unwind: {
                      path: "$transactionItem",
                      preserveNullAndEmptyArrays: true
                    }
                  },

                  {
                    $addFields: {
                      item_cost: {
                        $multiply: [
                          { $ifNull: ["$items.offeredQty", 0] },
                          { $ifNull: ["$transactionItem.unit_rate", 0] }
                        ]
                      }
                    }
                  },

                  {
                    $group: {
                      _id: null,
                      total_material_expense: {
                        $sum: "$item_cost"
                      }
                    }
                  }

                ],
                as: "purchaseData"
              }
            }

          ],
          as: "requestData"
        }
      },

      /*
      ============================================================
      STRUCTURE INCOME
      ============================================================
      */

      {
        $lookup: {
          from: "multi-erp-invoices",
          let: { projectId: "$_id" },
          pipeline: [

            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$projectId", "$$projectId"] },
                    { $eq: [{ $month: "$invoiceDate" }, selectedMonth] },
                    { $eq: [{ $year: "$invoiceDate" }, selectedYear] }
                  ]
                }
              }
            },

            {
              $group: {
                _id: null,
                structure_total_income: {
                  $sum: {
                    $ifNull: ["$netAmount", 0]
                  }
                }
              }
            }

          ],
          as: "invoiceData"
        }
      },

      /*
      ============================================================
      COMMON STORE EXPENSE
      ============================================================
      */

      {
        $lookup: {
          from: "ms_trans_details",
          let: { projectId: "$_id" },
          pipeline: [

            {
              $match: {
                deleted: false,
                $expr: {
                  $and: [
                    { $eq: ["$project_id", "$$projectId"] },
                    { $eq: [{ $month: "$trans_date" }, selectedMonth] },
                    { $eq: [{ $year: "$trans_date" }, selectedYear] }
                  ]
                }
              }
            },

            {
              $unwind: "$items_details"
            },

            {
              $group: {
                _id: null,
                total_store_expense: {
                  $sum: {
                    $ifNull: ["$items_details.total_amount", 0]
                  }
                }
              }
            }

          ],
          as: "storeData"
        }
      },

      {
        $project: {

          _id: 0,

          project_id: "$_id",
          project_name: "$name",

          structure_total_income: {
            $ifNull: [
              {
                $arrayElemAt: ["$invoiceData.total_income", 0]
              },
              0
            ]
          },

          structure_material_expense: {
            $ifNull: [
              {
                $arrayElemAt: [
                  "$requestData.purchaseData.total_material_expense",
                  0
                ]
              },
              0
            ]
          },

          project_store_expense: {
            $ifNull: [
              {
                $arrayElemAt: [
                  "$storeData.total_store_expense",
                  0
                ]
              },
              0
            ]
          }

        }
      }

    ]);

    /*
    ============================================================
    PIPING DATA
    ============================================================
    */

    const pipingData = await Project.aggregate([

      {
        $match: {
          deleted: false
        }
      },

      /*
      ============================================================
      PIPING MATERIAL EXPENSE
      ============================================================
      */

      {
        $lookup: {
          from: "piping-requests",
          let: { projectId: "$_id" },
          pipeline: [

            {
              $match: {
                deleted: false,
                $expr: {
                  $eq: ["$project", "$$projectId"]
                }
              }
            },

            {
              $lookup: {
                from: "piping-purchase-offers",
                let: { requestId: "$_id" },
                pipeline: [

                  {
                    $match: {
                      deleted: false,
                      $expr: {
                        $and: [
                          { $eq: ["$requestId", "$$requestId"] },
                          { $eq: [{ $month: "$received_date" }, selectedMonth] },
                          { $eq: [{ $year: "$received_date" }, selectedYear] }
                        ]
                      }
                    }
                  },

                  { $unwind: "$items" },

                  {
                    $addFields: {
                      item_cost: {
                        $multiply: [
                          { $ifNull: ["$items.offeredQty", 0] },
                          { $ifNull: ["$items.unit_rate", 0] }
                        ]
                      }
                    }
                  },

                  {
                    $group: {
                      _id: null,
                      total_material_expense: {
                        $sum: "$item_cost"
                      }
                    }
                  }

                ],
                as: "purchaseData"
              }
            }

          ],
          as: "requestData"
        }
      },

      /*
      ============================================================
      PIPING INCOME
      ============================================================
      */

      {
        $lookup: {
          from: "multi-piping-invoices",
          let: { projectId: "$_id" },
          pipeline: [

            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$projectId", "$$projectId"] },
                    { $eq: [{ $month: "$invoiceDate" }, selectedMonth] },
                    { $eq: [{ $year: "$invoiceDate" }, selectedYear] }
                  ]
                }
              }
            },

            {
              $group: {
                _id: null,
                total_income: {
                  $sum: {
                    $ifNull: ["$netAmount", 0]
                  }
                }
              }
            }

          ],
          as: "invoiceData"
        }
      },

      {
        $project: {

          _id: 0,

          project_id: "$_id",
          project_name: "$name",

          piping_total_income: {
            $ifNull: [
              {
                $arrayElemAt: ["$invoiceData.total_income", 0]
              },
              0
            ]
          },

          piping_material_expense: {
            $ifNull: [
              {
                $arrayElemAt: [
                  "$requestData.purchaseData.total_material_expense",
                  0
                ]
              },
              0
            ]
          }

        }
      }

    ]);

    /*
    ============================================================
    COMMON SALARY DATA
    ============================================================
    */

    const salaryData = await dailyAttendance.aggregate([

      {
        $match: {
          deleted: false,
          year_id: new ObjectId(year_id),
          project: { $exists: true, $ne: null },
          month: selectedMonth
        }
      },

      {
        $lookup: {
          from: "bussiness-projects",
          localField: "project",
          foreignField: "_id",
          as: "projectData"
        }
      },

      {
        $unwind: "$projectData"
      },

      {
        $lookup: {
          from: "salaries",
          let: {
            employeeId: "$employee",
            month: "$month"
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$employee", "$$employeeId"] },
                    { $eq: ["$month", "$$month"] }
                  ]
                }
              }
            }
          ],
          as: "salaryData"
        }
      },

      {
        $unwind: {
          path: "$salaryData",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $group: {

          _id: {
            project_id: "$project",
            project_name: "$projectData.name"
          },

          project_salary_expense: {
            $sum: {
              $add: [

                {
                  $multiply: [
                    { $ifNull: ["$present_day", 0] },
                    { $ifNull: ["$salaryData.perday_salary", 0] }
                  ]
                },

                {
                  $multiply: [
                    { $ifNull: ["$ot_hour", 0] },
                    { $ifNull: ["$salaryData.perhour_ot_salary", 0] }
                  ]
                }

              ]
            }
          }

        }
      },

      {
        $project: {

          _id: 0,

          project_id: "$_id.project_id",
          project_name: "$_id.project_name",

          project_salary_expense: 1

        }
      }

    ]);

    /*
    ============================================================
    PARTY BILL DATA
    ============================================================
    */

    const partyBillData = await PartyBill.aggregate([

      {
        $match: {
          deleted: false,
          $expr: {
            $and: [
              { $eq: [{ $month: "$invoice_date" }, selectedMonth] },
              { $eq: [{ $year: "$invoice_date" }, selectedYear] }
            ]
          }
        }
      },

      {
        $group: {

          _id: {
            project_id: "$project_id",
            department: "$department"
          },

          total_expense: {
            $sum: {
              $ifNull: ["$amount_with_gst", 0]
            }
          }

        }
      }

    ]);

    /*
    ============================================================
    FINAL MERGE
    ============================================================
    */

    const mergedMap = new Map();

    const mergeData = (data) => {

      data.forEach(item => {

        const key = String(item.project_id);

        if (!mergedMap.has(key)) {

          mergedMap.set(key, {

            project_id: item.project_id,
            project_name: item.project_name,

            structure_total_income: 0,
            piping_total_income: 0,

            structure_material_expense: 0,
            piping_material_expense: 0,

            project_store_expense: 0,
            project_salary_expense: 0,

            structure_party_bill_expense: 0,
            piping_party_bill_expense: 0

          });

        }

        const existing = mergedMap.get(key);

        mergedMap.set(key, {
          ...existing,
          ...item
        });

      });

    };

    mergeData(structureData);
    mergeData(pipingData);
    mergeData(salaryData);

    /*
    ============================================================
    PARTY BILL MERGE
    ============================================================
    */

    partyBillData.forEach(item => {

      const key = String(item._id.project_id);

      if (mergedMap.has(key)) {

        const existing = mergedMap.get(key);

        if (item._id.department === "STRUCTURE") {

          existing.structure_party_bill_expense = item.total_expense || 0;

        }

        if (item._id.department === "PIPING") {

          existing.piping_party_bill_expense = item.total_expense || 0;

        }

        mergedMap.set(key, existing);

      }

    });

    const finalData = Array.from(mergedMap.values());

    return {
      status: 1,
      result: finalData
    };

  } catch (error) {

    console.log(error);

    return {
      status: 2,
      result: error.message
    };

  }

};

exports.getProjectCurruentMonth = async (req, res) => {
  const { year_id, month,year } = req.body;

  if (req.user && !req.error) {
    try {
      const data = await projectCurruentMonth(year_id, month,year);
      if (data.status === 1) {
        sendResponse(res, 200, true, data.result, "Project income expense data list");
      } else {
        sendResponse(res, 200, true, [], "Project income expense data not found");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};



// const projectLastDate = async (year_id) => {

//   try {

//     function getYesterdayDateFormatted() {
//       const date = new Date();
//       date.setDate(date.getDate() - 1);
//       return date.toISOString().split("T")[0];
//     }

//     const yesterdayDate = getYesterdayDateFormatted();

//     function getYesterdayDay() {
//       const date = new Date();
//       date.setDate(date.getDate() - 1);
//       return date.getDate();
//     }

//     const yesterdayDay = getYesterdayDay();

//     /*
//     ============================================================
//     STRUCTURE DATA
//     ============================================================
//     */

//     const structureData = await Project.aggregate([

//       {
//         $match: {
//           deleted: false
//         }
//       },

//       /*
//       ============================================================
//       STRUCTURE MATERIAL EXPENSE
//       ============================================================
//       */

//       {
//         $lookup: {
//           from: "erp-requests",
//           let: {
//             projectId: "$_id"
//           },
//           pipeline: [

//             {
//               $match: {
//                 deleted: false,
//                 $expr: {
//                   $eq: ["$project", "$$projectId"]
//                 }
//               }
//             },

//             {
//               $lookup: {
//                 from: "erp-purchase-offers",
//                 let: {
//                   requestId: "$_id"
//                 },
//                 pipeline: [

//                   {
//                     $match: {
//                       deleted: false,
//                       $expr: {
//                         $and: [
//                           {
//                             $eq: ["$requestId", "$$requestId"]
//                           },
//                           {
//                             $eq: [
//                               {
//                                 $dateToString: {
//                                   format: "%Y-%m-%d",
//                                   date: "$received_date"
//                                 }
//                               },
//                               yesterdayDate
//                             ]
//                           }
//                         ]
//                       }
//                     }
//                   },

//                   {
//                     $unwind: "$items"
//                   },

//                   {
//                     $lookup: {
//                       from: "store_transaction_items",
//                       let: {
//                         txnId: "$items.transactionId"
//                       },
//                       pipeline: [
//                         {
//                           $match: {
//                             deleted: false,
//                             $expr: {
//                               $eq: ["$_id", "$$txnId"]
//                             }
//                           }
//                         }
//                       ],
//                       as: "transactionItem"
//                     }
//                   },

//                   {
//                     $unwind: {
//                       path: "$transactionItem",
//                       preserveNullAndEmptyArrays: true
//                     }
//                   },

//                   {
//                     $addFields: {
//                       item_cost: {
//                         $multiply: [
//                           { $ifNull: ["$items.offeredQty", 0] },
//                           { $ifNull: ["$transactionItem.unit_rate", 0] }
//                         ]
//                       }
//                     }
//                   },

//                   {
//                     $group: {
//                       _id: null,
//                       total_material_expense: {
//                         $sum: "$item_cost"
//                       }
//                     }
//                   }

//                 ],
//                 as: "purchaseData"
//               }
//             }

//           ],
//           as: "requestData"
//         }
//       },

//       /*
//       ============================================================
//       STRUCTURE STORE EXPENSE
//       ============================================================
//       */

//       {
//         $lookup: {
//           from: "ms_trans_details",
//           let: {
//             projectId: "$_id"
//           },
//           pipeline: [

//             {
//               $match: {
//                 deleted: false,
//                 $expr: {
//                   $and: [
//                     {
//                       $eq: ["$project_id", "$$projectId"]
//                     },
//                     {
//                       $eq: [
//                         {
//                           $dateToString: {
//                             format: "%Y-%m-%d",
//                             date: "$trans_date"
//                           }
//                         },
//                         yesterdayDate
//                       ]
//                     }
//                   ]
//                 }
//               }
//             },

//             {
//               $unwind: "$items_details"
//             },

//             {
//               $match: {
//                 "items_details.deleted": false
//               }
//             },

//             {
//               $group: {
//                 _id: null,
//                 total_store_expense: {
//                   $sum: {
//                     $ifNull: ["$items_details.total_amount", 0]
//                   }
//                 }
//               }
//             }

//           ],
//           as: "storeData"
//         }
//       },

//       /*
//       ============================================================
//       STRUCTURE INCOME
//       ============================================================
//       */

//       {
//         $lookup: {
//           from: "multi-erp-invoices",
//           let: {
//             projectId: "$_id"
//           },
//           pipeline: [

//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     {
//                       $eq: ["$projectId", "$$projectId"]
//                     },
//                     {
//                       $eq: [
//                         {
//                           $dateToString: {
//                             format: "%Y-%m-%d",
//                             date: "$invoiceDate"
//                           }
//                         },
//                         yesterdayDate
//                       ]
//                     }
//                   ]
//                 }
//               }
//             },

//             {
//               $group: {
//                 _id: null,
//                 total_income: {
//                   $sum: {
//                     $ifNull: ["$netAmount", 0]
//                   }
//                 }
//               }
//             }

//           ],
//           as: "invoiceData"
//         }
//       },

//       {
//         $project: {

//           _id: 0,

//           project_id: "$_id",

//           project_name: "$name",

//           structure_total_income: {
//             $ifNull: [
//               {
//                 $arrayElemAt: [
//                   "$invoiceData.total_income",
//                   0
//                 ]
//               },
//               0
//             ]
//           },

//           structure_material_expense: {
//             $ifNull: [
//               {
//                 $arrayElemAt: [
//                   "$requestData.purchaseData.total_material_expense",
//                   0
//                 ]
//               },
//               0
//             ]
//           },

//           project_store_expense: {
//             $ifNull: [
//               {
//                 $arrayElemAt: [
//                   "$storeData.total_store_expense",
//                   0
//                 ]
//               },
//               0
//             ]
//           }

//         }
//       }

//     ]);

//     /*
//     ============================================================
//     PIPING DATA
//     ============================================================
//     */

//     const pipingData = await Project.aggregate([

//       {
//         $match: {
//           deleted: false
//         }
//       },

//       /*
//       ============================================================
//       PIPING MATERIAL EXPENSE
//       ============================================================
//       */

//       {
//         $lookup: {
//           from: "piping-requests",
//           let: {
//             projectId: "$_id"
//           },
//           pipeline: [

//             {
//               $match: {
//                 deleted: false,
//                 $expr: {
//                   $eq: ["$project", "$$projectId"]
//                 }
//               }
//             },

//             {
//               $lookup: {
//                 from: "piping-purchase-offers",
//                 let: {
//                   requestId: "$_id"
//                 },
//                 pipeline: [

//                   {
//                     $match: {
//                       deleted: false,
//                       $expr: {
//                         $and: [
//                           {
//                             $eq: ["$requestId", "$$requestId"]
//                           },
//                           {
//                             $eq: [
//                               {
//                                 $dateToString: {
//                                   format: "%Y-%m-%d",
//                                   date: "$received_date"
//                                 }
//                               },
//                               yesterdayDate
//                             ]
//                           }
//                         ]
//                       }
//                     }
//                   },

//                   {
//                     $unwind: "$items"
//                   },

//                   {
//                     $addFields: {
//                       item_cost: {
//                         $multiply: [
//                           { $ifNull: ["$items.offeredQty", 0] },
//                           { $ifNull: ["$items.unit_rate", 0] }
//                         ]
//                       }
//                     }
//                   },

//                   {
//                     $group: {
//                       _id: null,
//                       total_material_expense: {
//                         $sum: "$item_cost"
//                       }
//                     }
//                   }

//                 ],
//                 as: "purchaseData"
//               }
//             }

//           ],
//           as: "requestData"
//         }
//       },

//       /*
//       ============================================================
//       PIPING INCOME
//       ============================================================
//       */

//       {
//         $lookup: {
//           from: "multi-piping-invoices",
//           let: {
//             projectId: "$_id"
//           },
//           pipeline: [

//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     {
//                       $eq: ["$projectId", "$$projectId"]
//                     },
//                     {
//                       $eq: [
//                         {
//                           $dateToString: {
//                             format: "%Y-%m-%d",
//                             date: "$invoiceDate"
//                           }
//                         },
//                         yesterdayDate
//                       ]
//                     }
//                   ]
//                 }
//               }
//             },

//             {
//               $group: {
//                 _id: null,
//                 total_income: {
//                   $sum: {
//                     $ifNull: ["$netAmount", 0]
//                   }
//                 }
//               }
//             }

//           ],
//           as: "invoiceData"
//         }
//       },

//       {
//         $project: {

//           _id: 0,

//           project_id: "$_id",

//           project_name: "$name",

//           piping_total_income: {
//             $ifNull: [
//               {
//                 $arrayElemAt: [
//                   "$invoiceData.total_income",
//                   0
//                 ]
//               },
//               0
//             ]
//           },

//           piping_material_expense: {
//             $ifNull: [
//               {
//                 $arrayElemAt: [
//                   "$requestData.purchaseData.total_material_expense",
//                   0
//                 ]
//               },
//               0
//             ]
//           }

//         }
//       }

//     ]);

//     /*
//     ============================================================
//     SALARY DATA
//     ============================================================
//     */

//     const salaryData = await dailyAttendance.aggregate([

//       {
//         $match: {
//           deleted: false,
//           project: { $exists: true, $ne: null },
//           year_id: new ObjectId(year_id),

//           $expr: {
//             $and: [
//               {
//                 $eq: ["$month", { $month: "$$NOW" }]
//               },
//               {
//                 $eq: ["$e_day", yesterdayDay]
//               }
//             ]
//           }
//         }
//       },

//       {
//         $lookup: {
//           from: "bussiness-projects",
//           localField: "project",
//           foreignField: "_id",
//           as: "projectData"
//         }
//       },

//       {
//         $unwind: "$projectData"
//       },

//       {
//         $lookup: {
//           from: "salaries",
//           let: {
//             employeeId: "$employee",
//             month: "$month"
//           },
//           pipeline: [

//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     {
//                       $eq: ["$employee", "$$employeeId"]
//                     },
//                     {
//                       $eq: ["$month", "$$month"]
//                     }
//                   ]
//                 }
//               }
//             }

//           ],
//           as: "salaryData"
//         }
//       },

//       {
//         $unwind: {
//           path: "$salaryData",
//           preserveNullAndEmptyArrays: true
//         }
//       },

//       {
//         $group: {

//           _id: {
//             project_id: "$project",
//             project_name: "$projectData.name"
//           },

//           project_salary_expense: {

//             $sum: {

//               $add: [

//                 {
//                   $multiply: [
//                     { $ifNull: ["$present_day", 0] },
//                     { $ifNull: ["$salaryData.perday_salary", 0] }
//                   ]
//                 },

//                 {
//                   $multiply: [
//                     { $ifNull: ["$ot_hour", 0] },
//                     { $ifNull: ["$salaryData.perhour_ot_salary", 0] }
//                   ]
//                 }

//               ]

//             }

//           }

//         }
//       },

//       {
//         $project: {
//           _id: 0,
//           project_id: "$_id.project_id",
//           project_name: "$_id.project_name",
//           project_salary_expense: 1
//         }
//       }

//     ]);

//     /*
//     ============================================================
//     FINAL MERGE
//     ============================================================
//     */

//     const mergedMap = new Map();

//     const mergeData = (data) => {

//       data.forEach(item => {

//         const key = String(item.project_id);

//         if (!mergedMap.has(key)) {

//           mergedMap.set(key, {

//             project_id: item.project_id,
//             project_name: item.project_name,

//             structure_total_income: 0,
//             piping_total_income: 0,

//             structure_material_expense: 0,
//             piping_material_expense: 0,

//             project_store_expense: 0,
//             project_salary_expense: 0

//           });

//         }

//         const existing = mergedMap.get(key);

//         mergedMap.set(key, {
//           ...existing,
//           ...item
//         });

//       });

//     };

//     mergeData(structureData);
//     mergeData(pipingData);
//     mergeData(salaryData);

//     const mergedData = Array.from(mergedMap.values());

//     if (mergedData.length > 0) {

//       return {
//         status: 1,
//         result: mergedData
//       };

//     } else {

//       return {
//         status: 0,
//         result: []
//       };

//     }

//   } catch (error) {

//     console.log(error);

//     return {
//       status: 2,
//       result: error
//     };

//   }

// };

const projectLastDate = async (year_id) => {

  try {

    function getYesterdayDateFormatted() {
      const date = new Date();
      date.setDate(date.getDate() - 1);
      return date.toISOString().split("T")[0];
    }

    const yesterdayDate = getYesterdayDateFormatted();

    function getYesterdayDay() {
      const date = new Date();
      date.setDate(date.getDate() - 1);
      return date.getDate();
    }

    const yesterdayDay = getYesterdayDay();

    /*
    ============================================================
    STRUCTURE DATA
    ============================================================
    */

    const structureData = await Project.aggregate([

      {
        $match: {
          deleted: false
        }
      },

      /*
      ============================================================
      STRUCTURE MATERIAL EXPENSE
      ============================================================
      */

      {
        $lookup: {
          from: "erp-requests",
          let: {
            projectId: "$_id"
          },
          pipeline: [

            {
              $match: {
                deleted: false,
                $expr: {
                  $eq: ["$project", "$$projectId"]
                }
              }
            },

            {
              $lookup: {
                from: "erp-purchase-offers",
                let: {
                  requestId: "$_id"
                },
                pipeline: [

                  {
                    $match: {
                      deleted: false,
                      $expr: {
                        $and: [
                          {
                            $eq: ["$requestId", "$$requestId"]
                          },
                          {
                            $eq: [
                              {
                                $dateToString: {
                                  format: "%Y-%m-%d",
                                  date: "$received_date"
                                }
                              },
                              yesterdayDate
                            ]
                          }
                        ]
                      }
                    }
                  },

                  {
                    $unwind: "$items"
                  },

                  {
                    $lookup: {
                      from: "store_transaction_items",
                      let: {
                        txnId: "$items.transactionId"
                      },
                      pipeline: [
                        {
                          $match: {
                            deleted: false,
                            $expr: {
                              $eq: ["$_id", "$$txnId"]
                            }
                          }
                        }
                      ],
                      as: "transactionItem"
                    }
                  },

                  {
                    $unwind: {
                      path: "$transactionItem",
                      preserveNullAndEmptyArrays: true
                    }
                  },

                  {
                    $addFields: {
                      item_cost: {
                        $multiply: [
                          { $ifNull: ["$items.offeredQty", 0] },
                          { $ifNull: ["$transactionItem.unit_rate", 0] }
                        ]
                      }
                    }
                  },

                  {
                    $group: {
                      _id: null,
                      total_material_expense: {
                        $sum: "$item_cost"
                      }
                    }
                  }

                ],
                as: "purchaseData"
              }
            }

          ],
          as: "requestData"
        }
      },

      /*
      ============================================================
      STRUCTURE STORE EXPENSE
      ============================================================
      */

      {
        $lookup: {
          from: "ms_trans_details",
          let: {
            projectId: "$_id"
          },
          pipeline: [

            {
              $match: {
                deleted: false,
                $expr: {
                  $and: [
                    {
                      $eq: ["$project_id", "$$projectId"]
                    },
                    {
                      $eq: [
                        {
                          $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$trans_date"
                          }
                        },
                        yesterdayDate
                      ]
                    }
                  ]
                }
              }
            },

            {
              $unwind: "$items_details"
            },

            {
              $match: {
                "items_details.deleted": false
              }
            },

            {
              $group: {
                _id: null,
                total_store_expense: {
                  $sum: {
                    $ifNull: ["$items_details.total_amount", 0]
                  }
                }
              }
            }

          ],
          as: "storeData"
        }
      },

      /*
      ============================================================
      STRUCTURE INCOME
      ============================================================
      */

      {
        $lookup: {
          from: "multi-erp-invoices",
          let: {
            projectId: "$_id"
          },
          pipeline: [

            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$projectId", "$$projectId"]
                    },
                    {
                      $eq: [
                        {
                          $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$invoiceDate"
                          }
                        },
                        yesterdayDate
                      ]
                    }
                  ]
                }
              }
            },

            {
              $group: {
                _id: null,
                total_income: {
                  $sum: {
                    $ifNull: ["$netAmount", 0]
                  }
                }
              }
            }

          ],
          as: "invoiceData"
        }
      },

      {
        $project: {

          _id: 0,

          project_id: "$_id",

          project_name: "$name",

          structure_total_income: {
            $ifNull: [
              {
                $arrayElemAt: [
                  "$invoiceData.total_income",
                  0
                ]
              },
              0
            ]
          },

          structure_material_expense: {
            $ifNull: [
              {
                $arrayElemAt: [
                  "$requestData.purchaseData.total_material_expense",
                  0
                ]
              },
              0
            ]
          },

          project_store_expense: {
            $ifNull: [
              {
                $arrayElemAt: [
                  "$storeData.total_store_expense",
                  0
                ]
              },
              0
            ]
          }

        }
      }

    ]);

    /*
    ============================================================
    PIPING DATA
    ============================================================
    */

    const pipingData = await Project.aggregate([

      {
        $match: {
          deleted: false
        }
      },

      /*
      ============================================================
      PIPING MATERIAL EXPENSE
      ============================================================
      */

      {
        $lookup: {
          from: "piping-requests",
          let: {
            projectId: "$_id"
          },
          pipeline: [

            {
              $match: {
                deleted: false,
                $expr: {
                  $eq: ["$project", "$$projectId"]
                }
              }
            },

            {
              $lookup: {
                from: "piping-purchase-offers",
                let: {
                  requestId: "$_id"
                },
                pipeline: [

                  {
                    $match: {
                      deleted: false,
                      $expr: {
                        $and: [
                          {
                            $eq: ["$requestId", "$$requestId"]
                          },
                          {
                            $eq: [
                              {
                                $dateToString: {
                                  format: "%Y-%m-%d",
                                  date: "$received_date"
                                }
                              },
                              yesterdayDate
                            ]
                          }
                        ]
                      }
                    }
                  },

                  {
                    $unwind: "$items"
                  },

                  {
                    $addFields: {
                      item_cost: {
                        $multiply: [
                          { $ifNull: ["$items.offeredQty", 0] },
                          { $ifNull: ["$items.unit_rate", 0] }
                        ]
                      }
                    }
                  },

                  {
                    $group: {
                      _id: null,
                      total_material_expense: {
                        $sum: "$item_cost"
                      }
                    }
                  }

                ],
                as: "purchaseData"
              }
            }

          ],
          as: "requestData"
        }
      },

      /*
      ============================================================
      PIPING INCOME
      ============================================================
      */

      {
        $lookup: {
          from: "multi-piping-invoices",
          let: {
            projectId: "$_id"
          },
          pipeline: [

            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$projectId", "$$projectId"]
                    },
                    {
                      $eq: [
                        {
                          $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$invoiceDate"
                          }
                        },
                        yesterdayDate
                      ]
                    }
                  ]
                }
              }
            },

            {
              $group: {
                _id: null,
                total_income: {
                  $sum: {
                    $ifNull: ["$netAmount", 0]
                  }
                }
              }
            }

          ],
          as: "invoiceData"
        }
      },

      {
        $project: {

          _id: 0,

          project_id: "$_id",

          project_name: "$name",

          piping_total_income: {
            $ifNull: [
              {
                $arrayElemAt: [
                  "$invoiceData.total_income",
                  0
                ]
              },
              0
            ]
          },

          piping_material_expense: {
            $ifNull: [
              {
                $arrayElemAt: [
                  "$requestData.purchaseData.total_material_expense",
                  0
                ]
              },
              0
            ]
          }

        }
      }

    ]);

    /*
    ============================================================
    SALARY DATA
    ============================================================
    */

    const salaryData = await dailyAttendance.aggregate([

      {
        $match: {
          deleted: false,
          project: { $exists: true, $ne: null },
          year_id: new ObjectId(year_id),

          $expr: {
            $and: [
              {
                $eq: ["$month", { $month: "$$NOW" }]
              },
              {
                $eq: ["$e_day", yesterdayDay]
              }
            ]
          }
        }
      },

      {
        $lookup: {
          from: "bussiness-projects",
          localField: "project",
          foreignField: "_id",
          as: "projectData"
        }
      },

      {
        $unwind: "$projectData"
      },

      {
        $lookup: {
          from: "salaries",
          let: {
            employeeId: "$employee",
            month: "$month"
          },
          pipeline: [

            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$employee", "$$employeeId"]
                    },
                    {
                      $eq: ["$month", "$$month"]
                    }
                  ]
                }
              }
            }

          ],
          as: "salaryData"
        }
      },

      {
        $unwind: {
          path: "$salaryData",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $group: {

          _id: {
            project_id: "$project",
            project_name: "$projectData.name"
          },

          project_salary_expense: {

            $sum: {

              $add: [

                {
                  $multiply: [
                    { $ifNull: ["$present_day", 0] },
                    { $ifNull: ["$salaryData.perday_salary", 0] }
                  ]
                },

                {
                  $multiply: [
                    { $ifNull: ["$ot_hour", 0] },
                    { $ifNull: ["$salaryData.perhour_ot_salary", 0] }
                  ]
                }

              ]

            }

          }

        }
      },

      {
        $project: {
          _id: 0,
          project_id: "$_id.project_id",
          project_name: "$_id.project_name",
          project_salary_expense: 1
        }
      }

    ]);

    /*
    ============================================================
    FINAL MERGE
    ============================================================
    */

    const mergedMap = new Map();

    const mergeData = (data) => {

      data.forEach(item => {

        const key = String(item.project_id);

        if (!mergedMap.has(key)) {

          mergedMap.set(key, {

            project_id: item.project_id,
            project_name: item.project_name,

            structure_total_income: 0,
            piping_total_income: 0,

            structure_material_expense: 0,
            piping_material_expense: 0,

            project_store_expense: 0,
            project_salary_expense: 0

          });

        }

        const existing = mergedMap.get(key);

        mergedMap.set(key, {
          ...existing,
          ...item
        });

      });

    };

    mergeData(structureData);
    mergeData(pipingData);
    mergeData(salaryData);

    const mergedData = Array.from(mergedMap.values());

    if (mergedData.length > 0) {

      return {
        status: 1,
        result: mergedData
      };

    } else {

      return {
        status: 0,
        result: []
      };

    }

  } catch (error) {

    console.log(error);

    return {
      status: 2,
      result: error
    };

  }

};
exports.getProjectLastDate = async (req, res) => {
  const { year_id } = req.body
  if (req.user && !req.error) {
    try {
      const data = await projectLastDate(year_id);
      let requestData = data.result;

      if (data.status === 1) {
        sendResponse(res, 200, true, requestData, `Project income expense data list`);
      } else if (data.status === 0) {
        sendResponse(res, 200, true, [], `Project income expense data not found`);
      } else if (data.status === 2) {
        console.log("errrrrr", data.result)
        sendResponse(res, 500, false, {}, "Something went wrong11");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};