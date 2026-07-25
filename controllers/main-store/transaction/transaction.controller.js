const { default: mongoose } = require("mongoose");

const MSStock = require("../../../models/main-store/transaction/itemstock.model");
const Transaction = require("../../../models/main-store/transaction/transaction.model");
const AdminModal = require("../../../models/admin.model");
const TagMaster = require("../../../models/main-store/general/tag.model");
const ReportJob = require("../../../models/report_job.model");
const ObjectId = mongoose.Types.ObjectId;
const ejs = require("ejs");
const fs = require("fs");
const puppeteer = require("puppeteer");
const path = require("path");
const XLSX = require('xlsx');  // for utility functions
const XLSXStyle = require('xlsx-style');  // for styling
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;
const { sendResponse } = require("../../../helper/response");
const {
  padWithLeadingZeros,
  manageMSitemStock,
  tagNumber,
  tableName,
  manageMSitemStockUpdate,
  amountInWords,
  tagId,
  VoucherGen,
  manageTransactionItemStatus,
  manageMainObjBalanceQty,
  manageTransactionStatus,
  ChallanIssueGen,
} = require("../../../helper/index");
const Tag = require("../../../models/main-store/general/tag.model");
const masterModel = require("../../../models/main-store/general/master.model");
const Employee = require('../../../models/payroll/employ.model');
const { generatePDF, generatePDFA4 } = require("../../../utils/pdfUtils");


exports.getAllTransaction = async (req, res) => {
  // const { search, tag_number, filter, firm_id, year_id } = req.body;
  const { search, tag_number, filter, year_id } = req.body;
  if (req.user && !req.error) {
    try {
      // const { date } = filter;
      const filter1 = JSON.parse(filter)             //react
      const { date } = filter1;

      const date_start = date && date.start ? new Date(date.start) : new Date("1947-08-15");

      let date_end = date ? (date.end ? new Date(date.end) : new Date()) : new Date();
      date_end.setHours(23, 59, 59, 999);
      const timezoneOffset = date_end.getTimezoneOffset() * 60000; // Offset in milliseconds
      date_end = new Date(date_end.getTime() - timezoneOffset);

      const tag = await Tag.findOne({
        tag_number: tag_number,
        deleted: false,
      }).select({ _id: 1 });

      const table_name = await tableName(tag_number);

      const search_by = search ? search.replace(/[^0-9a-zA-Z]/g, "\\$&") : "";
      let matchObj = {
        deleted: false,
        tag_id: new ObjectId(tag._id),
        // firm_id: new ObjectId(firm_id),
        year_id: new ObjectId(year_id),
        trans_date: {
          $gte: new Date(date_start),
          $lte: new Date(date_end),
        },
      }

      if (search_by != "") {
        matchObj = {
          ...matchObj,
          $or: [{ voucher_no: { $regex: `^${search_by}`, $options: "i" } }],
        };
      }

      const transactionData = await Transaction.aggregate([
        {
          $match: matchObj,
        },
        {
          $lookup: {
            from: "ms_trans_details",
            let: { return_id: "$return_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$return_id"] }
                }
              },
              {
                $lookup: {
                  from: "store-parties",
                  let: { party_id: "$party_id" },
                  pipeline: [
                    {
                      $match: {
                        $expr: { $eq: ["$_id", "$$party_id"] }
                      }
                    },
                    {
                      $project: {
                        _id: 1,
                        name: 1
                      }
                    }
                  ],
                  as: "party_details"
                }
              },
              {
                $unwind: {
                  path: "$party_details",
                  preserveNullAndEmptyArrays: true
                }
              },
              {
                $lookup: {
                  from: "firms",
                  let: { customer_id: "$customer_id" },
                  pipeline: [
                    {
                      $match: {
                        $expr: { $eq: ["$_id", "$$customer_id"] }
                      }
                    },
                    {
                      $project: {
                        _id: 1,
                        name: 1
                      }
                    }
                  ],
                  as: "customer_details"
                }
              },
              {
                $unwind: {
                  path: "$customer_details",
                  preserveNullAndEmptyArrays: true
                }
              },
              {
                $lookup: {
                  from: "masters",
                  let: { master_id: "$master_id" },
                  pipeline: [
                    {
                      $match: {
                        $expr: { $eq: ["$_id", "$$master_id"] }
                      }
                    },
                    {
                      $project: {
                        _id: 1,
                        name: 1
                      }
                    }
                  ],
                  as: "master_details"
                }
              },
              {
                $unwind: {
                  path: "$master_details",
                  preserveNullAndEmptyArrays: true
                }
              },
              {
                $lookup: {
                  from: "store-transports",
                  let: { transport_id: "$transport_id" },
                  pipeline: [
                    {
                      $match: {
                        $expr: { $eq: ["$_id", "$$transport_id"] }
                      }
                    },
                    {
                      $project: {
                        _id: 1,
                        name: 1
                      }
                    }
                  ],
                  as: "transport_details"
                }
              },
              {
                $unwind: {
                  path: "$transport_details",
                  preserveNullAndEmptyArrays: true
                }
              },
              {
                $lookup: {
                  from: "bussiness-projects",
                  let: { project_id: "$project_id" },
                  pipeline: [
                    {
                      $match: {
                        $expr: { $eq: ["$_id", "$$project_id"] }
                      }
                    },
                    {
                      $project: {
                        _id: 1,
                        name: 1
                      }
                    }
                  ],
                  as: "project_details"
                }
              },
              {
                $unwind: {
                  path: "$project_details",
                  preserveNullAndEmptyArrays: true
                }
              },
              {
                $project: {
                  _id: 1,
                  bill_no: 1,
                  challan_no: 1,
                  voucher_no: 1,
                  trans_date: 1,
                  party: "$party_details", // Map the name of the party
                  customer: "$customer_details",
                  master: "$master_details",
                  receive_date: 1,
                  project: "$project_details",
                  transport: "$transport_details",
                  transport_date: 1,
                  lr_no: 1,
                  lr_date: 1,
                  vehical_no: 1,
                  po_no: 1,
                  payment_date: 1,
                  payment_days: 1,
                }
              }
            ],
            as: "return_details"
          }
        },
        {
          $unwind: {
            path: "$return_details",
            preserveNullAndEmptyArrays: true
          }
        },

        {
          $lookup: {
            from: "store-transports",
            let: { id: "$transport_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$id"] },
                },
              },
              {
                $project: {
                  _id: 1,
                  name: { $toString: "$name" },
                },
              },
            ],
            as: "transport",
          },
        },
        {
          $lookup: {
            from: "store-parties",
            let: { id: "$party_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$id"] },
                },
              },
              {
                $project: {
                  _id: 1,
                  name: { $toString: "$name" },
                },
              },
            ],
            as: "party",
          },
        },
        {
          $lookup: {
            from: "bussiness-projects",
            let: { id: "$project_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$id"] },
                },
              },
              {
                $project: {
                  _id: 1,
                  name: { $toString: "$name" },
                },
              },
            ],
            as: "project",
          },
        },
        {
          $lookup: {
            from: "masters",
            let: { master_id: "$master_id", machine_code: "$machine_code" },
            pipeline: [
              {
                $facet: {
                  master: [
                    { $match: { $expr: { $eq: ["$_id", "$$master_id"] } } },
                    { $project: { _id: 1, name: { $toString: "$name" } } },
                  ],
                  machine: [
                    { $match: { $expr: { $eq: ["$_id", "$$machine_code"] } } },
                    { $project: { _id: 1, name: { $toString: "$name" } } },
                  ],
                },
              },
            ],
            as: "masterdata",
          },
        },
        {
          $addFields: {
            master: {
              $let: {
                vars: {
                  master: { $arrayElemAt: ["$masterdata.master", 0] },
                },
                in: {
                  $cond: {
                    if: { $gt: [{ $size: "$$master" }, 0] },
                    then: { $arrayElemAt: ["$$master", 0] },
                    else: null,
                  },
                },
              },
            },
            machine: {
              $let: {
                vars: {
                  machine: { $arrayElemAt: ["$masterdata.machine", 0] },
                },
                in: {
                  $cond: {
                    if: { $gt: [{ $size: "$$machine" }, 0] },
                    then: { $arrayElemAt: ["$$machine", 0] },
                    else: null,
                  },
                },
              },
            },
            party: {
              $ifNull: [{ $arrayElemAt: ["$party", 0] }, null],
            },
            customer: {
              $ifNull: [{ $arrayElemAt: ["$customer", 0] }, null],
            },
            project: {
              $ifNull: [{ $arrayElemAt: ["$project", 0] }, null],
            },
            transport_details: {
              $ifNull: [{ $arrayElemAt: ["$transport", 0] }, null],
            },
            items_details_count: {
              $size: {
                $filter: {
                  input: "$items_details",
                  as: "item",
                  cond: { $eq: ["$$item.deleted", false] },
                },
              },
            },
            amount_sum: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: "$items_details",
                      as: "item",
                      cond: { $eq: ["$$item.deleted", false] },
                    },
                  },
                  as: "item",
                  in: "$$item.amount",
                },
              },
            },
            total_amount_sum: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: "$items_details",
                      as: "item",
                      cond: { $eq: ["$$item.deleted", false] },
                    },
                  },
                  as: "item",
                  in: "$$item.total_amount",
                },
              },
            },
            net_amount: {
              $let: {
                vars: {
                  total_amount_sum: {
                    $sum: {
                      $map: {
                        input: {
                          $filter: {
                            input: "$items_details",
                            as: "item",
                            cond: { $eq: ["$$item.deleted", false] }
                          }
                        },
                        as: "item",
                        in: "$$item.total_amount"
                      }
                    }
                  },
                  round_amount: { $ifNull: ["$round_amount", 0] }
                },
                in: {
                  $round: [{ $add: ["$$total_amount_sum", "$$round_amount"] }, 2]
                }
              }
            }
          },
        },
        {
          $sort: { voucher_no: -1 },
        },
        {
          $project: {
            masterdata: 0,
            // firm_id: 0,
            year_id: 0,
            status: 0,
            deleted: 0,
            createdAt: 0,
            updatedAt: 0,
            __v: 0,
            party_id: 0,
            customer_id: 0,
            project_id: 0,
            master_id: 0,
            machine_code: 0,
            items_details: 0,
            transport_id: 0,
            transport: 0,
            // return_details: "$return_details",
          },
        },
      ]);


      // const transactionData = await Transaction.aggregate([
      //   { 
      //     $match: matchObj 
      //   },
      //   {
      //     $lookup: {
      //       from: "ms_trans_details",
      //       localField: "return_id",
      //       foreignField: "_id",
      //       as: "return_details"
      //     }
      //   },
      //   {
      //     $unwind: {
      //       path: "$return_details",
      //       preserveNullAndEmptyArrays: true
      //     }
      //   },
      //   {
      //     $lookup: {
      //       from: "store-transports",
      //       let: { id: "$transport_id" },
      //       pipeline: [
      //         { $match: { $expr: { $eq: ["$_id", "$$id"] } } },
      //         { $project: { _id: 1, name: { $toString: "$name" } } }
      //       ],
      //       as: "transport"
      //     }
      //   },
      //   {
      //     $lookup: {
      //       from: "store-parties",
      //       let: { id: "$party_id" },
      //       pipeline: [
      //         { $match: { $expr: { $eq: ["$_id", "$$id"] } } },
      //         { $project: { _id: 1, name: { $toString: "$name" } } }
      //       ],
      //       as: "party"
      //     }
      //   },
      //   {
      //     $lookup: {
      //       from: "bussiness-projects",
      //       let: { id: "$project_id" },
      //       pipeline: [
      //         { $match: { $expr: { $eq: ["$_id", "$$id"] } } },
      //         { $project: { _id: 1, name: { $toString: "$name" } } }
      //       ],
      //       as: "project"
      //     }
      //   },
      //   {
      //     $lookup: {
      //       from: "masters",
      //       let: { master_id: "$master_id" },
      //       pipeline: [
      //         { $match: { $expr: { $eq: ["$_id", "$$master_id"] } } },
      //         { $project: { _id: 1, name: { $toString: "$name" } } }
      //       ],
      //       as: "master"
      //     }
      //   },
      //   {
      //     $lookup: {
      //       from: "masters",
      //       let: { machine_code: "$machine_code" },
      //       pipeline: [
      //         { $match: { $expr: { $eq: ["$_id", "$$machine_code"] } } },
      //         { $project: { _id: 1, name: { $toString: "$name" } } }
      //       ],
      //       as: "machine"
      //     }
      //   },
      //   {
      //     $addFields: {
      //       master: { $first: "$master" },
      //       machine: { $first: "$machine" },
      //       party: { $first: "$party" },
      //       project: { $first: "$project" },
      //       transport_details: { $first: "$transport" },
      //       items_details_count: {
      //         $size: {
      //           $filter: {
      //             input: "$items_details",
      //             as: "item",
      //             cond: { $eq: ["$$item.deleted", false] }
      //           }
      //         }
      //       },
      //       amount_sum: {
      //         $sum: {
      //           $map: {
      //             input: {
      //               $filter: {
      //                 input: "$items_details",
      //                 as: "item",
      //                 cond: { $eq: ["$$item.deleted", false] }
      //               }
      //             },
      //             as: "item",
      //             in: "$$item.amount"
      //           }
      //         }
      //       },
      //       total_amount_sum: {
      //         $sum: {
      //           $map: {
      //             input: {
      //               $filter: {
      //                 input: "$items_details",
      //                 as: "item",
      //                 cond: { $eq: ["$$item.deleted", false] }
      //               }
      //             },
      //             as: "item",
      //             in: "$$item.total_amount"
      //           }
      //         }
      //       },
      //       net_amount: {
      //         $let: {
      //           vars: {
      //             total_amount_sum: {
      //               $sum: {
      //                 $map: {
      //                   input: {
      //                     $filter: {
      //                       input: "$items_details",
      //                       as: "item",
      //                       cond: { $eq: ["$$item.deleted", false] }
      //                     }
      //                   },
      //                   as: "item",
      //                   in: "$$item.total_amount"
      //                 }
      //               }
      //             },
      //             round_amount: { $ifNull: ["$round_amount", 0] }
      //           },
      //           in: { $round: [{ $add: ["$$total_amount_sum", "$$round_amount"] }, 2] }
      //         }
      //       }
      //     }
      //   },
      //   {
      //     $sort: { voucher_no: -1 }
      //   },
      //   {
      //     $project: {
      //       master: 1,
      //       machine: 1,
      //       party: 1,
      //       project: 1,
      //       transport_details: 1,
      //       items_details_count: 1,
      //       amount_sum: 1,
      //       total_amount_sum: 1,
      //       net_amount: 1,
      //       return_details: 1,
      //       voucher_no: 1
      //     }
      //   }
      // ]);

      if (transactionData.length > 0) {
        sendResponse(res, 200, true, transactionData, `${table_name} list`);
      } else {
        sendResponse(res, 200, true, [], `${table_name} not found`);
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.getOneTransaction = async (req, res) => {
  const { id, tag_number } = req.query;

  if (req.user && !req.error) {
    try {
      const table_name = await tableName(tag_number);
      const transactionData = await Transaction.aggregate([
        {
          $match: { _id: new ObjectId(id) },
        },
        {
          $project: {
            items_details: {
              $filter: {
                input: "$items_details",
                as: "item",
                cond: { $eq: ["$$item.deleted", false] },
              },
            },
          },
        },
        {
          $lookup: {
            from: "store-items",
            let: { items: "$items_details" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: [
                      "$_id",
                      {
                        $map: {
                          input: "$$items",
                          as: "item",
                          in: "$$item.item_id",
                        },
                      },
                    ],
                  },
                },
              },
              {
                $project: {
                  _id: 0,
                  item_id: "$_id",
                  item_name: "$name",
                },
              },
            ],
            as: "items_data",
          },
        },
        {
          $lookup: {
            from: "masters",
            let: { itemDomains: "$items_details.item_domain" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ["$_id", "$$itemDomains"],
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  name: 1,
                },
              },
            ],
            as: "domain_data",
          },
        },
        {
          $addFields: {
            items_details: {
              $map: {
                input: "$items_details",
                as: "item",
                in: {
                  $let: {
                    vars: {
                      itemData: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$items_data",
                              as: "data",
                              cond: {
                                $eq: ["$$data.item_id", "$$item.item_id"],
                              },
                            },
                          },
                          0,
                        ],
                      },
                      domainData: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$domain_data",
                              as: "domain",
                              cond: {
                                $eq: ["$$domain._id", "$$item.item_domain"],
                              },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: {
                      $mergeObjects: [
                        "$$item",
                        { item_name: "$$itemData.item_name" },
                        {
                          domain_name: "$$domainData.name",
                          // domain_id: "$$domainData._id",
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
        {
          $addFields: {
            total_qty: { $sum: "$items_details.quantity" },
            total_rtn_qty: { $sum: "$items_details.return_qty" },
            amt: { $sum: "$items_details.amount" },
            dis_amt: { $sum: "$items_details.discount_amount" },
            sp_dis_amt: { $sum: "$items_details.sp_discount_amount" },
            tax_amt: { $sum: "$items_details.taxable_amount" },
            gst_amt: { $sum: "$items_details.gst_amount" },
            total_amt: { $sum: "$items_details.total_amount" },
          },
        },
        {
          $project: {
            items_data: 0,
            domain_data: 0,
            "items_details.status": 0,
            "items_details.deleted": 0,
          },
        },
      ]);

      if (
        transactionData.length > 0 &&
        transactionData[0].items_details.length > 0
      ) {
        sendResponse(
          res,
          200,
          true,
          transactionData[0],
          `${table_name} item list`
        );
      } else {
        sendResponse(res, 200, true, [], `${table_name} item not found`);
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

const OnePurchaseAndIssue = async (id) => {
  try {
    const requestData = await Transaction.aggregate([
      { $match: { deleted: false, _id: new ObjectId(id) } },
      {
        $addFields: {
          items_details: {
            $filter: {
              input: "$items_details",
              as: "item",
              cond: { $eq: ["$$item.deleted", false] },
            },
          },
        },
      },
      { $unwind: "$items_details" },
      {
        $lookup: {
          from: "store-items",
          localField: "items_details.item_id",
          foreignField: "_id",
          as: "itemDetails",
        },
      },
      {
        $lookup: {
          from: "store-parties",
          localField: "party_id",
          foreignField: "_id",
          as: "partyDetails",
        },
      },
      {
        $lookup: {
          from: "firms",
          localField: "customer_id",
          foreignField: "_id",
          as: "customerDetails",
        },
      },
      {
        $lookup: {
          from: "bussiness-projects",
          localField: "project_id",
          foreignField: "_id",
          as: "projectDetails",
        },
      },
      {
        $lookup: {
          from: "masters",
          localField: "master_id",
          foreignField: "_id",
          as: "masterDetails",
        },
      },
      {
        $lookup: {
          from: "store-transports",
          localField: "transport_id",
          foreignField: "_id",
          as: "transportDetails",
        },
      },
      {
        $lookup: {
          from: "masters",
          localField: "machine_code",
          foreignField: "_id",
          as: "machineDetails",
        },
      },
      {
        $lookup: {
          from: "tags",
          localField: "tag_id",
          foreignField: "_id",
          as: "tagDetails",
        },
      },
      {
        $addFields: {
          party_name: { $arrayElemAt: ["$partyDetails.name", 0] },
          full_address: {
            $trim: {
              input: {
                $reduce: {
                  input: [
                    { $ifNull: [{ $arrayElemAt: ["$partyDetails.address", 0] }, ""] },
                    { $ifNull: [{ $arrayElemAt: ["$partyDetails.address_two", 0] }, ""] },
                    { $ifNull: [{ $arrayElemAt: ["$partyDetails.address_three", 0] }, ""] },
                    { $ifNull: [{ $arrayElemAt: ["$partyDetails.city", 0] }, ""] },
                    { $ifNull: [{ $arrayElemAt: ["$partyDetails.state", 0] }, ""] },
                    { $ifNull: [{ $toString: { $arrayElemAt: ["$partyDetails.pincode", 0] } }, ""] }
                  ],
                  initialValue: "",
                  in: {
                    $cond: {
                      if: { $eq: ["$$value", ""] },
                      then: "$$this",
                      else: {
                        $cond: {
                          if: { $eq: ["$$this", ""] },
                          then: "$$value",
                          else: { $concat: ["$$value", ",", "$$this"] }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          party_gstNumber: { $arrayElemAt: ["$partyDetails.gstNumber", 0] },
          party_logo: { $arrayElemAt: ["$partyDetails.logo", 0] },
          party_phone: { $arrayElemAt: ["$partyDetails.phone", 0] },
          party_email: { $arrayElemAt: ["$partyDetails.email", 0] },
          project_name: { $arrayElemAt: ["$projectDetails.name", 0] },
          master_name: { $arrayElemAt: ["$masterDetails.name", 0] },
          transport_name: { $arrayElemAt: ["$transportDetails.name", 0] },
          machine_name: { $arrayElemAt: ["$machineDetails.name", 0] },
          tag_number: { $arrayElemAt: ["$tagDetails.tag_number", 0] },
          item_name: { $arrayElemAt: ["$itemDetails.name", 0] },
        },
      },
      {
        $project: {
          _id: 1,
          party_name: "$party_name",
          full_address: "$full_address",
          party_gstNumber: "$party_gstNumber",
          party_logo: "$party_logo",
          party_phone: "$party_phone",
          party_email: "$party_email",
          voucher_no: "$voucher_no",
          project_name: "$project_name",
          trans_date: "$trans_date",
          payment_date: "$payment_date",
          payment_days: "$payment_days",
          lr_no: "$lr_no",
          lr_date: "$lr_date",
          bill_no: "$bill_no",
          machine_code: "$machine_name",
          received_by: "$master_name",
          receive_date: "$receive_date",
          tag_number: "$tag_number",
          round_amount: "$round_amount",
          transport_name: "$transport_name",
          transport_date: "$transport_date",
          vehical_no: "$vehical_no",
          po_no: "$po_no",
          challan_no: "$challan_no",
          gate_pass_no: "$gate_pass_no",
          issue_no: "$issue_no",
          site_location: "$site_location",
          address: "$address",
          by_date: "$createdAt",
          items: {
            _id: "$items_details._id",
            unit: "$items_details.unit",
            item_name: "$item_name",
            m_code: "$items_details.m_code",
            quantity: "$items_details.quantity",
            rate: "$items_details.rate",
            amount: "$items_details.amount",
            discount: "$items_details.discount",
            discount_amount: "$items_details.discount_amount",
            sp_discount: "$items_details.sp_discount",
            sp_discount_amount: "$items_details.sp_discount_amount",
            taxable_amount: "$items_details.taxable_amount",
            gst: "$items_details.gst",
            gst_amount: "$items_details.gst_amount",
            total_amount: "$items_details.total_amount",
            remarks: "$items_details.remarks",
          },
        },
      },
      {
        $group: {
          _id: {
            _id: "$_id",
            voucher_no: "$voucher_no",
            party_name: "$party_name",
            full_address: "$full_address",
            party_gstNumber: "$party_gstNumber",
            party_logo: "$party_logo",
            party_phone: "$party_phone",
            party_email: "$party_email",
            project_name: "$project_name",
            trans_date: "$trans_date",
            payment_date: "$payment_date",
            payment_days: "$payment_days",
            lr_no: "$lr_no",
            lr_date: "$lr_date",
            bill_no: "$bill_no",
            machine_code: "$machine_code",
            received_by: "$received_by",
            receive_date: "$receive_date",
            tag_number: "$tag_number",
            round_amount: "$round_amount",
            by_date: "$by_date",
            transport_name: "$transport_name",
            transport_date: "$transport_date",
            vehical_no: "$vehical_no",
            po_no: "$po_no",
            challan_no: "$challan_no",
            gate_pass_no: "$gate_pass_no",
            issue_no: "$issue_no",
            site_location: "$site_location",
            address: "$address",
          },
          items: { $push: "$items" },
          total_qty: { $sum: "$items.quantity" },
          amt: { $sum: "$items.amount" },
          dis_amt: { $sum: "$items.discount_amount" },
          sp_dis_amt: { $sum: "$items.sp_discount_amount" },
          tax_amt: { $sum: "$items.taxable_amount" },
          gst_amt: { $sum: "$items.gst_amount" },
          total_amt: { $sum: "$items.total_amount" },
        },
      },
      {
        $addFields: {
          net_amt: {
            $sum: [
              "$total_amt",
              { $ifNull: ["$_id.round_amount", 0] }
            ]
          }
        }
      },
      {
        $project: {
          _id: "$_id._id",
          voucher_no: "$_id.voucher_no",
          party_name: "$_id.party_name",
          party_full_address: "$_id.full_address",
          party_gstNumber: "$_id.party_gstNumber",
          party_logo: "$_id.party_logo",
          party_phone: "$_id.party_phone",
          party_email: "$_id.party_email",
          project_name: "$_id.project_name",
          trans_date: "$_id.trans_date",
          payment_date: "$_id.payment_date",
          payment_days: "$_id.payment_days",
          lr_no: "$_id.lr_no",
          lr_date: "$_id.lr_date",
          bill_no: "$_id.bill_no",
          machine_code: "$_id.machine_code",
          received_by: "$_id.received_by",
          receive_date: "$_id.receive_date",
          tag_number: "$_id.tag_number",
          round_amount: "$_id.round_amount",
          by_date: "$_id.by_date",
          transport_name: "$_id.transport_name",
          transport_date: "$_id.transport_date",
          vehical_no: "$_id.vehical_no",
          po_no: "$_id.po_no",
          challan_no: "$_id.challan_no",
          gate_pass_no: "$_id.gate_pass_no",
          issue_no: "$_id.issue_no",
          site_location: "$_id.site_location",
          address: "$_id.address",
          items: 1,
          total_qty: 1,
          amt: 1,
          dis_amt: 1,
          sp_dis_amt: 1,
          tax_amt: 1,
          gst_amt: 1,
          total_amt: 1,
          net_amt: 1,
        },
      },
    ]);

    if (requestData.length && requestData.length > 0) {
      return { status: 1, result: requestData };
    } else {
      return { status: 0, result: [] };
    }
  } catch (error) {
    return { status: 2, result: error };
  }
};

exports.onePurchaseAndIssueList = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await OnePurchaseAndIssue(id)
      if (data.status === 1) {
        sendResponse(res, 200, true, data.result[0], `Transaction list`);
      } else if (data.status === 0) {
        sendResponse(res, 200, true, [], `Transaction not found`);
      } else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.downloadOnePurchase = async (req, res) => {
  const { id, print_date } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await OnePurchaseAndIssue(id)
      const requestData = data.result;

      if (data.status === 1) {
        const template = fs.readFileSync(
          "templates/msPurchase.html",
          "utf-8"
        );

        const renderedHtml = ejs.render(template, {
          requestData,
          logoUrl1: process.env.LOGO_URL_1,
          logoUrl2: process.env.LOGO_URL_2,
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
        const pageHeight = await page.evaluate(() => {
          return document.body.scrollHeight;
        });

        const pdfBuffer = await page.pdf({
          // width: "13in",
          // height: "17in",
          // format: "A4",
          height: pageHeight,
          landscape: true,
          margin: {
            top: "0.5in",
            right: "0.5in",
            bottom: "0.7in",
            left: "0.5in",
          },
          printBackground: true,
          preferCSSPageSize: true,
          displayHeaderFooter: true,
          footerTemplate: `
            <div style="font-size: 14px; width: 100%; text-align: right; padding-right: 50px; padding-bottom: 30px;">
              ${print_date ? `<span>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>` : ''}
              ${print_date ? '&nbsp;&nbsp;&nbsp;' : ''}
              Page <span class="pageNumber"></span> of <span class="totalPages"></span>
            </div>
          `,
          headerTemplate: `<div></div>`,
          compress: true,
        });

        await browser.close();

        const pdfsDir = path.join(__dirname, "../../../pdfs");
        if (!fs.existsSync(pdfsDir)) {
          fs.mkdirSync(pdfsDir);
        }

        const filename = `transaction_pu_${Date.now()}.pdf`;
        const filePath = path.join(__dirname, "../../../pdfs", filename);

        fs.writeFileSync(filePath, pdfBuffer);

        const fileUrl = `${URI}/pdfs/${filename}`;

        sendResponse(
          res,
          200,
          true,
          { file: fileUrl },
          "PDF downloaded Successfully"
        );
      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Purchase report not found`)
      }
      else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.downloadOneIssue = async (req, res) => {
  const { id, print_date } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await OnePurchaseAndIssue(id)
      const requestData = data.result;

      if (data.status === 1) {
        const template = fs.readFileSync(
          "templates/msIssue.html",
          "utf-8"
        );

        const renderedHtml = ejs.render(template, {
          requestData,
          logoUrl1: process.env.LOGO_URL_1,
          logoUrl2: process.env.LOGO_URL_2,
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
        const pageHeight = await page.evaluate(() => {
          return document.body.scrollHeight;
        });

        const pdfBuffer = await page.pdf({
          // width: "13in",
          // height: "17in",
          // format: "A4",
          // height: pageHeight,
          landscape: true,
          margin: {
            top: "0.5in",
            right: "0.5in",
            bottom: "0.7in",
            left: "0.5in",
          },
          printBackground: true,
          preferCSSPageSize: true,
          displayHeaderFooter: true,
          footerTemplate: `
            <div style="font-size: 14px; width: 100%; text-align: right; padding-right: 50px; padding-bottom: 30px;">
              ${print_date ? `<span>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>` : ''}
              ${print_date ? '&nbsp;&nbsp;&nbsp;' : ''}
              Page <span class="pageNumber"></span> of <span class="totalPages"></span>
            </div>
          `,
          headerTemplate: `<div></div>`,
          compress: true,
        });

        await browser.close();

        const pdfsDir = path.join(__dirname, "../../../pdfs");
        if (!fs.existsSync(pdfsDir)) {
          fs.mkdirSync(pdfsDir);
        }

        const filename = `transaction_iss_${Date.now()}.pdf`;
        const filePath = path.join(__dirname, "../../../pdfs", filename);

        fs.writeFileSync(filePath, pdfBuffer);

        const fileUrl = `${URI}/pdfs/${filename}`;

        sendResponse(
          res,
          200,
          true,
          { file: fileUrl },
          "PDF downloaded Successfully"
        );
      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Issue report not found`)
      }
      else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};


const OneTransaction = async (id) => {
  try {
    const requestData = await Transaction.aggregate([
      { $match: { deleted: false, _id: new ObjectId(id) } },
      {
        $addFields: {
          items_details: {
            $filter: {
              input: "$items_details",
              as: "item",
              cond: { $eq: ["$$item.deleted", false] },
            },
          },
        },
      },
      { $unwind: "$items_details" },
      {
        $lookup: {
          from: "store-items",
          localField: "items_details.item_id",
          foreignField: "_id",
          as: "itemDetails",
        },
      },
      {
        $lookup: {
          from: "store-parties",
          localField: "party_id",
          foreignField: "_id",
          as: "partyDetails",
        },
      },
      {
        $lookup: {
          from: "firms",
          localField: "customer_id",
          foreignField: "_id",
          as: "customerDetails",
        },
      },
      {
        $lookup: {
          from: "bussiness-projects",
          localField: "project_id",
          foreignField: "_id",
          as: "projectDetails",
        },
      },
      {
        $lookup: {
          from: "masters",
          localField: "master_id",
          foreignField: "_id",
          as: "masterDetails",
        },
      },
      {
        $lookup: {
          from: "store-transports",
          localField: "transport_id",
          foreignField: "_id",
          as: "transportDetails",
        },
      },
      {
        $lookup: {
          from: "masters",
          localField: "machine_code",
          foreignField: "_id",
          as: "machineDetails",
        },
      },
      {
        $lookup: {
          from: "tags",
          localField: "tag_id",
          foreignField: "_id",
          as: "tagDetails",
        },
      },
      {
        $addFields: {
          party_name: { $arrayElemAt: ["$partyDetails.name", 0] },
          full_address: {
            $trim: {
              input: {
                $reduce: {
                  input: [
                    { $ifNull: [{ $arrayElemAt: ["$partyDetails.address", 0] }, ""] },
                    { $ifNull: [{ $arrayElemAt: ["$partyDetails.address_two", 0] }, ""] },
                    { $ifNull: [{ $arrayElemAt: ["$partyDetails.address_three", 0] }, ""] },
                    { $ifNull: [{ $arrayElemAt: ["$partyDetails.city", 0] }, ""] },
                    { $ifNull: [{ $arrayElemAt: ["$partyDetails.state", 0] }, ""] },
                    { $ifNull: [{ $toString: { $arrayElemAt: ["$partyDetails.pincode", 0] } }, ""] }
                  ],
                  initialValue: "",
                  in: {
                    $cond: {
                      if: { $eq: ["$$value", ""] },
                      then: "$$this",
                      else: {
                        $cond: {
                          if: { $eq: ["$$this", ""] },
                          then: "$$value",
                          else: { $concat: ["$$value", ",", "$$this"] }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          party_gstNumber: { $arrayElemAt: ["$partyDetails.gstNumber", 0] },
          party_phone: { $arrayElemAt: ["$partyDetails.phone", 0] },
          party_email: { $arrayElemAt: ["$partyDetails.email", 0] },
          project_name: { $arrayElemAt: ["$projectDetails.name", 0] },
          master_name: { $arrayElemAt: ["$masterDetails.name", 0] },
          transport_name: { $arrayElemAt: ["$transportDetails.name", 0] },
          machine_name: { $arrayElemAt: ["$machineDetails.name", 0] },
          tag_number: { $arrayElemAt: ["$tagDetails.tag_number", 0] },
          item_name: { $arrayElemAt: ["$itemDetails.name", 0] },
        },
      },
      {
        $project: {
          _id: 1,
          party_name: "$party_name",
          full_address: "$full_address",
          party_gstNumber: "$party_gstNumber",
          party_phone: "$party_phone",
          party_email: "$party_email",
          voucher_no: "$voucher_no",
          project_name: "$project_name",
          trans_date: "$trans_date",
          payment_date: "$payment_date",
          payment_days: "$payment_days",
          lr_no: "$lr_no",
          lr_date: "$lr_date",
          bill_no: "$bill_no",
          machine_code: "$machine_name",
          received_by: "$master_name",
          receive_date: "$receive_date",
          tag_number: "$tag_number",
          round_amount: "$round_amount",
          transport_name: "$transport_name",
          transport_date: "$transport_date",
          vehical_no: "$vehical_no",
          po_no: "$po_no",
          challan_no: "$challan_no",
          by_date: "$createdAt",
          by_date: "$createdAt",
          items: {
            _id: "$items_details._id",
            unit: "$items_details.unit",
            item_name: "$item_name",
            m_code: "$items_details.m_code",
            quantity: "$items_details.quantity",
            rate: "$items_details.rate",
            amount: "$items_details.amount",
            discount: "$items_details.discount",
            discount_amount: "$items_details.discount_amount",
            sp_discount: "$items_details.sp_discount",
            sp_discount_amount: "$items_details.sp_discount_amount",
            taxable_amount: "$items_details.taxable_amount",
            gst: "$items_details.gst",
            gst_amount: "$items_details.gst_amount",
            total_amount: "$items_details.total_amount",
            remarks: "$items_details.remarks",
          },
        },
      },
      {
        $group: {
          _id: {
            _id: "$_id",
            voucher_no: "$voucher_no",
            party_name: "$party_name",
            full_address: "$full_address",
            party_gstNumber: "$party_gstNumber",
            party_phone: "$party_phone",
            party_email: "$party_email",
            project_name: "$project_name",
            trans_date: "$trans_date",
            payment_date: "$payment_date",
            payment_days: "$payment_days",
            lr_no: "$lr_no",
            lr_date: "$lr_date",
            bill_no: "$bill_no",
            machine_code: "$machine_code",
            received_by: "$received_by",
            receive_date: "$receive_date",
            tag_number: "$tag_number",
            round_amount: "$round_amount",
            by_date: "$by_date",
            transport_name: "$transport_name",
            transport_date: "$transport_date",
            vehical_no: "$vehical_no",
            po_no: "$po_no",
            challan_no: "$challan_no",
          },
          items: { $push: "$items" },
          total_qty: { $sum: "$items.quantity" },
          amt: { $sum: "$items.amount" },
          dis_amt: { $sum: "$items.discount_amount" },
          sp_dis_amt: { $sum: "$items.sp_discount_amount" },
          tax_amt: { $sum: "$items.taxable_amount" },
          gst_amt: { $sum: "$items.gst_amount" },
          total_amt: { $sum: "$items.total_amount" },
        },
      },
      {
        $addFields: {
          net_amt: {
            $sum: [
              "$total_amt",
              { $ifNull: ["$_id.round_amount", 0] }
            ]
          }
        }
      },
      {
        $project: {
          _id: "$_id._id",
          voucher_no: "$_id.voucher_no",
          party_name: "$_id.party_name",
          party_full_address: "$_id.full_address",
          party_gstNumber: "$_id.party_gstNumber",
          party_phone: "$_id.party_phone",
          party_email: "$_id.party_email",
          project_name: "$_id.project_name",
          trans_date: "$_id.trans_date",
          payment_date: "$_id.payment_date",
          payment_days: "$_id.payment_days",
          lr_no: "$_id.lr_no",
          lr_date: "$_id.lr_date",
          bill_no: "$_id.bill_no",
          machine_code: "$_id.machine_code",
          received_by: "$_id.received_by",
          receive_date: "$_id.receive_date",
          tag_number: "$_id.tag_number",
          round_amount: "$_id.round_amount",
          by_date: "$_id.by_date",
          transport_name: "$_id.transport_name",
          transport_date: "$_id.transport_date",
          vehical_no: "$_id.vehical_no",
          po_no: "$_id.po_no",
          challan_no: "$_id.challan_no",
          items: 1,
          total_qty: 1,
          amt: 1,
          dis_amt: 1,
          sp_dis_amt: 1,
          tax_amt: 1,
          gst_amt: 1,
          total_amt: 1,
          net_amt: 1,
        },
      },
    ]);

    if (requestData.length && requestData.length > 0) {
      return { status: 1, result: requestData };
    } else {
      return { status: 0, result: [] };
    }
  } catch (error) {
    return { status: 2, result: error };
  }
};

exports.downloadOneTransaction = async (req, res) => {
  const { id, print_date } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await OneTransaction(id)
      const requestData = data.result;
      let tag = ""

      if (requestData && requestData.length) {
        if (requestData[0].tag_number == 11) {
          tag = "purchase"
        } else if (requestData[0].tag_number == 12) {
          tag = "purchase_return"
        } else if (requestData[0].tag_number == 13) {
          tag = "issue"
        } else if (requestData[0].tag_number == 14) {
          tag = "issue_return"
        }
      }

      if (data.status === 1) {
        const template = fs.readFileSync(
          "templates/transactionItem.html",
          "utf-8"
        );

        const renderedHtml = ejs.render(template, {
          requestData,
          logoUrl1: process.env.LOGO_URL_1,
          logoUrl2: process.env.LOGO_URL_2,
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
          width: "13in",
          height: "17in",
          margin: {
            top: "0.5in",
            right: "0.5in",
            bottom: "0.7in",
            left: "0.5in",
          },
          printBackground: true,
          preferCSSPageSize: true,
          displayHeaderFooter: true,
          footerTemplate: `
            <div style="font-size: 14px; width: 100%; text-align: right; padding-right: 50px; padding-bottom: 30px;">
              ${print_date ? `<span>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>` : ''}
              ${print_date ? '&nbsp;&nbsp;&nbsp;' : ''}
              Page <span class="pageNumber"></span> of <span class="totalPages"></span>
            </div>
          `,
          headerTemplate: `<div></div>`,
          compress: true,
        });

        await browser.close();

        const pdfsDir = path.join(__dirname, "../../../pdfs");
        if (!fs.existsSync(pdfsDir)) {
          fs.mkdirSync(pdfsDir);
        }

        const filename = `transaction_${tag}_${Date.now()}.pdf`;
        const filePath = path.join(__dirname, "../../../pdfs", filename);

        fs.writeFileSync(filePath, pdfBuffer);

        const fileUrl = `${URI}/pdfs/${filename}`;

        sendResponse(
          res,
          200,
          true,
          { file: fileUrl },
          "PDF downloaded Successfully"
        );
      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `${tag} report not found`)
      }
      else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.downloadPurchaseOrder = async (req, res) => {
  const { id, print_date } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await OneTransaction(id)
      const requestData = data.result;

      if (data.status === 1) {
        const template = fs.readFileSync(
          "templates/purchaseOrder.html",
          "utf-8"
        );

        const renderedHtml = ejs.render(template, {
          requestData,
          logoUrl1: process.env.LOGO_URL_1,
          logoUrl2: process.env.LOGO_URL_2,
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
          // width: "11.3in",
          // height: "13.7in",
          format: "A4",
          margin: {
            top: "0.5in",
            right: "0.5in",
            bottom: "0.7in",
            left: "0.5in",
          },
          printBackground: true,
          preferCSSPageSize: true,
          displayHeaderFooter: true,
          footerTemplate: `
            <div style="font-size: 14px; width: 100%; text-align: right; padding-right: 50px; padding-bottom: 30px;">
              ${print_date ? `<span>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>` : ''}
              ${print_date ? '&nbsp;&nbsp;&nbsp;' : ''}
              Page <span class="pageNumber"></span> of <span class="totalPages"></span>
            </div>
          `,
          headerTemplate: `<div></div>`,
          compress: true,
        });

        await browser.close();

        const pdfsDir = path.join(__dirname, "../../../pdfs");
        if (!fs.existsSync(pdfsDir)) {
          fs.mkdirSync(pdfsDir);
        }

        const filename = `purchase_order_${Date.now()}.pdf`;
        const filePath = path.join(__dirname, "../../../pdfs", filename);

        fs.writeFileSync(filePath, pdfBuffer);

        const fileUrl = `${URI}/pdfs/${filename}`;

        sendResponse(
          res,
          200,
          true,
          { file: fileUrl },
          "PDF downloaded Successfully"
        );
      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Purchase Order not found`)
      }
      else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};


const listTransaction = async (search, tag_number, filter, year_id) => {
  // const listTransaction = async (search, tag_number, filter = {}, firm_id, year_id) => {
  try {
    const filter1 = JSON.parse(filter)             //react
    const { date } = filter1;
    console.log("filter1", filter1);
    const date_start = date?.start ? new Date(date.start) : new Date("1947-08-15");
    const timezoneOffsetStart = date_start.getTimezoneOffset() * 60000;
    const adjustedStart = new Date(date_start.getTime() - timezoneOffsetStart);

    let date_end = date?.end ? new Date(date.end) : new Date();
    date_end.setHours(23, 59, 59, 999);
    const timezoneOffsetEnd = date_end.getTimezoneOffset() * 60000;
    const adjustedEnd = new Date(date_end.getTime() - timezoneOffsetEnd);

    let sdate = null;
    let edate = null;
    if (date?.start && date?.end) {
      sdate = date.start;
      edate = date.end;
    }

    const search_by = search ? search.replace(/[^0-9a-zA-Z]/g, "\\$&") : "";

    const tag = await Tag.findOne({
      tag_number: tag_number,
      deleted: false,
    }).select({ _id: 1 });

    if (!tag) {
      console.log("Tag not found for tag_number:", tag_number);
      return { status: 0, result: [], message: 'Tag not found' };
    }

    let matchObj = {
      deleted: false,
      tag_id: new ObjectId(tag._id),
      // firm_id: new ObjectId(firm_id),
      year_id: new ObjectId(year_id),
      trans_date: {
        $gte: adjustedStart,
        $lte: adjustedEnd,
      },
      //  "items_details": { $elemMatch: { isreturn: false } }
    };

    console.log("matchObj", matchObj);

    if (search_by !== "") {
      matchObj = {
        ...matchObj,
        $or: [{ voucher_no: { $regex: search_by, $options: "i" } }],
      };
    }

    const requestData = await Transaction.aggregate([
      { $match: matchObj },
      { $sort: { voucher_no: -1 } },
      { $unwind: "$items_details" },
      { $match: { "items_details.deleted": { $ne: true } } },
      {
        $lookup: {
          from: "store-items",
          localField: "items_details.item_id",
          foreignField: "_id",
          as: "itemDetails",
          pipeline: [
            {
              $lookup: {
                from: "store-item-units",
                localField: "unit",
                foreignField: "_id",
                as: "unitDetails",
                pipeline: [{ $project: { _id: 0, name: 1 } }],
              },
            },

            {
              $project: {
                _id: 1,
                name: 1,
                "unitDetails.name": 1,
                mcode: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$itemDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "store-transports",
          localField: "transport_id",
          foreignField: "_id",
          as: "transportDetails",
        },
      },

      {
        $lookup: {
          from: "employees",
          localField: "gate_pass_no",
          foreignField: "_id",
          as: "gatePassDetails"
        }
      },


      {
        $lookup: {
          from: "bussiness-projects",
          localField: "project_id",
          foreignField: "_id",
          as: "projectDetails",
        },
      },
      {
        $lookup: {
          from: "store-parties",
          localField: "party_id",
          foreignField: "_id",
          as: "partyDetails1",
        },
      },
      {
        $lookup: {
          from: "masters",
          localField: "master_id",
          foreignField: "_id",
          as: "masterDetails",
        },
      },
      {
        $lookup: {
          from: "masters",
          localField: "machine_code",
          foreignField: "_id",
          as: "machineDetails",
        },
      },
      {
        $lookup: {
          from: "tags",
          localField: "tag_id",
          foreignField: "_id",
          as: "tagDetails",
        },
      },
      {
        $addFields: {
          project_name: { $ifNull: [{ $arrayElemAt: ["$projectDetails.name", 0] }, null] },
          party: { $ifNull: [{ $arrayElemAt: ["$partyDetails1.name", 0] }, null] },
          master_name: { $ifNull: [{ $arrayElemAt: ["$masterDetails.name", 0] }, null] },
          machine_name: { $ifNull: [{ $arrayElemAt: ["$machineDetails.name", 0] }, null] },
          tag_number: { $arrayElemAt: ["$tagDetails.tag_number", 0] },
          transport_name: { $arrayElemAt: ["$transportDetails.name", 0] },
          gate_pass_no: { $arrayElemAt: ["$gatePassDetails.card_no", 0] },

        },
      },
      {
        $project: {
          _id: 1,
          voucher_no: 1,
          party_name: "$party",
          project_name: "$project_name",
          trans_date: 1,
          payment_date: 1,
          payment_days: 1,
          lr_no: 1,
          lr_date: 1,
          bill_no: 1,
          machine_code: "$machine_name",
          received_by: "$master_name",
          tag_number: "$tag_number",
          round_amount: "$round_amount",
          transport_name: "$transport_name",
          transport_date: "$transport_date",
          vehical_no: "$vehical_no",
          po_no: "$po_no",
          challan_no: "$challan_no",
          gate_pass_no: "$gate_pass_no",
          items: {
            _id: "$items_details._id",
            item_name: "$itemDetails.name",
            unit: { $arrayElemAt: ["$itemDetails.unitDetails.name", 0] },
            m_code: "$itemDetails.m_code",
            quantity: "$items_details.quantity",
            rate: "$items_details.rate",
            amount: "$items_details.amount",
            discount: "$items_details.discount",
            discount_amount: "$items_details.discount_amount",
            sp_discount: "$items_details.sp_discount",
            sp_discount_amount: "$items_details.sp_discount_amount",
            taxable_amount: "$items_details.taxable_amount",
            gst: "$items_details.gst",
            gst_amount: "$items_details.gst_amount",
            total_amount: "$items_details.total_amount",
            remarks: "$items_details.remarks",
          },
        },
      },
      {
        $group: {
          _id: {
            _id: "$_id",
            voucher_no: "$voucher_no",
            party_name: "$party_name",
            project_name: "$project_name",
            trans_date: "$trans_date",
            payment_date: "$payment_date",
            payment_days: "$payment_days",
            lr_no: "$lr_no",
            lr_date: "$lr_date",
            bill_no: "$bill_no",
            machine_code: "$machine_code",
            received_by: "$received_by",
            tag_number: "$tag_number",
            round_amount: "$round_amount",
            transport_name: "$transport_name",
            transport_date: "$transport_date",
            vehical_no: "$vehical_no",
            po_no: "$po_no",
            challan_no: "$challan_no",
            gate_pass_no: "$gate_pass_no",
          },
          items: { $push: "$items" },
          total_qty: { $sum: "$items.quantity" },
          amt: { $sum: "$items.amount" },
          dis_amt: { $sum: "$items.discount_amount" },
          sp_dis_amt: { $sum: "$items.sp_discount_amount" },
          tax_amt: { $sum: "$items.taxable_amount" },
          gst_amt: { $sum: "$items.gst_amount" },
          total_amt: { $sum: "$items.total_amount" },
        },
      },
      {
        $addFields: {
          net_amt: {
            $sum: [
              "$total_amt",
              { $ifNull: ["$_id.round_amount", 0] }
            ]
          },
        },
      },
      {
        $project: {
          _id: "$_id._id",
          voucher_no: "$_id.voucher_no",
          party_name: "$_id.party_name",
          project_name: "$_id.project_name",
          trans_date: "$_id.trans_date",
          payment_date: "$_id.payment_date",
          payment_days: "$_id.payment_days",
          lr_no: "$_id.lr_no",
          lr_date: "$_id.lr_date",
          bill_no: "$_id.bill_no",
          machine_code: "$_id.machine_code",
          received_by: "$_id.received_by",
          tag_number: "$_id.tag_number",
          round_amount: "$_id.round_amount",
          transport_name: "$_id.transport_name",
          transport_date: "$_id.transport_date",
          vehical_no: "$_id.vehical_no",
          po_no: "$_id.po_no",
          challan_no: "$_id.challan_no",
          gate_pass_no: "$_id.gate_pass_no",
          items: 1,
          total_qty: 1,
          amt: 1,
          dis_amt: 1,
          sp_dis_amt: 1,
          tax_amt: 1,
          gst_amt: 1,
          total_amt: 1,
          net_amt: 1,
        },
      },
      {
        $group: {
          _id: null,
          total_quantity: { $sum: "$total_qty" },
          amount: { $sum: "$amt" },
          dis_amount: { $sum: "$dis_amt" },
          sp_dis_amount: { $sum: "$sp_dis_amt" },
          tax_amount: { $sum: "$tax_amt" },
          gst_amount: { $sum: "$gst_amt" },
          total_amount: { $sum: "$total_amt" },
          net_amount: { $sum: "$net_amt" },
          round_amt: { $sum: "$round_amount" },
          trans_data: { $push: "$$ROOT" },
        },
      },
      {
        $project: {
          _id: 0,
          total_quantity: 1,
          amount: 1,
          dis_amount: 1,
          sp_dis_amount: 1,
          tax_amount: 1,
          gst_amount: 1,
          total_amount: 1,
          net_amount: 1,
          round_amt: 1,
          trans_data: 1,
          sdate: sdate,
          edate: edate,
          tag_number: { $arrayElemAt: ["$trans_data.tag_number", 0] },
          gate_pass_no: { $arrayElemAt: ["$trans_data.gate_pass_no", 0] },
        },
      },
    ]);

    console.log("request Data", requestData);



    if (requestData.length && requestData.length > 0) {
      return { status: 1, result: requestData };
    } else {
      return { status: 0, result: [] };
    }
  } catch (error) {
    console.log(error);
    return { status: 2, result: error };
  }
};

exports.transactionList = async (req, res) => {
  // const { search, tag_number, filter, firm_id, year_id } = req.body;
  const { search, tag_number, filter, year_id } = req.body;
  if (req.user && !req.error) {
    try {
      // const data = await listTransaction(search, tag_number, filter, firm_id, year_id)
      const data = await listTransaction(search, tag_number, filter, year_id)
      if (data.status === 1) {
        sendResponse(res, 200, true, data.result[0], `Transaction list`);
      } else if (data.status === 0) {
        sendResponse(res, 200, true, [], `Transaction not found`);
      } else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.transactionExcelReport = async (req, res) => {
  const {
    search,
    tag_number,
    filter,
    print_date,
    projectNameVisible,
    transportNameVisible,
    transportDateVisible,
    vehicalNoVisible,
    poNoVisible,
    challanNoVisible,
    receivedByVisible,
    voucherNoVisible,
    discountVisible,
    discountAmountVisible,
    spDiscountVisible,
    spDiscountAmountVisible,
    // firm_id,
    year_id,
    background } = req.body;

  if (req.user && !req.error) {
    try {
      if (background) {
        const job = await ReportJob.create({
          userId: req.user._id,
          type: "XLSX",
          tagNumber: tag_number,
          status: "pending",
          metadata: {
            search, tag_number, filter, print_date, year_id,
            options: {
              projectNameVisible, transportNameVisible, transportDateVisible,
              vehicalNoVisible, poNoVisible, challanNoVisible, receivedByVisible,
              voucherNoVisible, discountVisible, discountAmountVisible,
              spDiscountVisible, spDiscountAmountVisible
            }
          }
        });

        // Start processing without waiting
        processReportInBackground(job._id, search, tag_number, filter, print_date, year_id, "XLSX", {
          projectNameVisible, transportNameVisible, transportDateVisible,
          vehicalNoVisible, poNoVisible, challanNoVisible, receivedByVisible,
          voucherNoVisible, discountVisible, discountAmountVisible,
          spDiscountVisible, spDiscountAmountVisible
        });

        return sendResponse(res, 200, true, { jobId: job._id }, "Background report generation started");
      }

      let tag = ""
      if (tag_number == 11) {
        tag = "Purchase"
      }
      else if (tag_number == 9) {
        tag = "Purchase Request"
      } else if (tag_number == 12) {
        tag = "Purchase_return"
      } else if (tag_number == 13) {
        tag = "Issue"
      } else if (tag_number == 14) {
        tag = "Issue_return"
      } else if (tag_number == 10) {
        tag = "Purchase_order"
      }

      // const data = await listTransaction(search, tag_number, filter, firm_id, year_id)
      const data = await listTransaction(search, tag_number, filter, year_id)
      if (data.status === 1) {
        if (data.result.length && data.result[0].trans_data.length > 0) {
          const wb = XLSX.utils.book_new();
          let ws

          const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: "FFFF00" } } };

          const headerStyle1 = { font: { bold: true } };

          if (tag_number == 11 || tag_number == 12) {
            const ws_data = [[
              { v: `${tag} Report`, s: headerStyle1 },
              "", "", "",
              data.result[0].sdate ? { v: "From Date", s: headerStyle1 } : "",
              data.result[0].sdate ? new Date(data.result[0].sdate).toLocaleDateString() : "",
              "",
              data.result[0].edate ? { v: "To Date", s: headerStyle1 } : "",
              data.result[0].edate ? new Date(data.result[0].edate).toLocaleDateString() : "",
              ...(discountVisible ? [""] : []),
              ...(discountAmountVisible ? [""] : []),
              ...(spDiscountVisible ? [""] : []),
              ...(spDiscountAmountVisible ? [""] : []),
              ...(transportNameVisible ? [""] : []),
              ...(transportDateVisible ? [""] : []),
              ...(vehicalNoVisible ? [""] : []),
              ...(poNoVisible ? [""] : []),
              ...(challanNoVisible ? [""] : []),
              ...(receivedByVisible ? [""] : []),
              ...(voucherNoVisible ? [""] : []),
              ...(projectNameVisible ? [""] : []),
              "", "", "", "",
              print_date ? { v: "Download Date", s: headerStyle1 } : "",
              print_date ? new Date().toLocaleDateString() : "",
            ]];

            const headers = [{ v: "Sr No.", s: headerStyle }];
            if (voucherNoVisible) headers.push({ v: "Voucher No.", s: headerStyle });
            headers.push({ v: "Party Name", s: headerStyle });
            if (projectNameVisible) headers.push({ v: "Project Name", s: headerStyle });
            headers.push({ v: "Date", s: headerStyle });
            headers.push({ v: "Bill No.", s: headerStyle });
            headers.push({ v: "Gate Pass No.", s: headerStyle });
            if (transportNameVisible) headers.push({ v: "Transport Name", s: headerStyle });
            if (transportDateVisible) headers.push({ v: "Transport Date", s: headerStyle });
            if (vehicalNoVisible) headers.push({ v: "Vehical No.", s: headerStyle });
            if (poNoVisible) headers.push({ v: "PO No.", s: headerStyle });
            if (challanNoVisible) headers.push({ v: "Challan No.", s: headerStyle });
            if (receivedByVisible) headers.push({ v: "Received By", s: headerStyle });
            headers.push({ v: "Item Name", s: headerStyle });
            headers.push({ v: "Unit", s: headerStyle });
            headers.push({ v: "Quantity", s: headerStyle });
            headers.push({ v: "Rate", s: headerStyle });
            headers.push({ v: "Amount", s: headerStyle });
            // headers.push({ v: "Total", s: headerStyle });
            if (discountVisible) headers.push({ v: "Discount %", s: headerStyle });
            if (discountAmountVisible) headers.push({ v: "Discount Amount", s: headerStyle });
            if (spDiscountVisible) headers.push({ v: "SP Discount %", s: headerStyle });
            if (spDiscountAmountVisible) headers.push({ v: "SP Discount Amount", s: headerStyle });
            headers.push({ v: "Taxable Amount", s: headerStyle });
            headers.push({ v: "GST %", s: headerStyle });
            headers.push({ v: "GST Amount", s: headerStyle });
            headers.push({ v: "Total Amount", s: headerStyle });
            headers.push({ v: "+/- Amount", s: headerStyle });
            headers.push({ v: "Net Amount", s: headerStyle });
            headers.push({ v: "Remark", s: headerStyle });

            ws_data.push(headers);

            let srNo = 1;

            data.result[0].trans_data.forEach((trans) => {
              let firstRow = true;

              trans.items.forEach((item) => {
                const row = [
                  firstRow ? srNo++ : "",
                  ...(voucherNoVisible ? [firstRow ? trans.voucher_no : ""] : []),
                  firstRow ? trans.party_name : "",
                  ...(projectNameVisible ? [firstRow ? trans.project_name : ""] : []),
                  firstRow ? new Date(trans.trans_date).toLocaleDateString() : "",
                  firstRow ? trans.bill_no : "",
                  firstRow ? trans.gate_pass_no : "",
                  ...(transportNameVisible ? [firstRow ? trans.transport_name : ""] : []),
                  ...(transportDateVisible ? [firstRow ? trans.transport_date : ""] : []),
                  ...(vehicalNoVisible ? [firstRow ? trans.vehical_no : ""] : []),
                  ...(poNoVisible ? [firstRow ? trans.po_no : ""] : []),
                  ...(challanNoVisible ? [firstRow ? trans.challan_no : ""] : []),
                  ...(receivedByVisible ? [firstRow ? trans.received_by : ""] : []),
                  item.item_name,
                  item.unit,
                  item.quantity,
                  item.rate,
                  item.amount,
                  ...(discountVisible ? [item.discount] : []),
                  ...(discountAmountVisible ? [item.discount_amount] : []),
                  ...(spDiscountVisible ? [item.sp_discount] : []),
                  ...(spDiscountAmountVisible ? [item.sp_discount_amount] : []),
                  item.taxable_amount,
                  item.gst,
                  item.gst_amount,
                  item.total_amount,
                  "",
                  "",
                  item.remarks
                ];

                ws_data.push(row);
                firstRow = false;
              });


              ws_data.push([]);
              ws_data.push([
                "",
                ...(voucherNoVisible ? [""] : []),
                "",
                ...(projectNameVisible ? [""] : []),
                "", "",
                ...(transportNameVisible ? [""] : []),
                ...(transportDateVisible ? [""] : []),
                ...(vehicalNoVisible ? [""] : []),
                ...(poNoVisible ? [""] : []),
                ...(challanNoVisible ? [""] : []),
                ...(receivedByVisible ? [""] : []),
                "",
                { v: "Total", s: headerStyle },
                trans.total_qty,
                "",
                trans.amt,
                ...(discountVisible ? [""] : []),
                ...(discountAmountVisible ? [trans.dis_amt] : []),
                ...(spDiscountVisible ? [""] : []),
                ...(spDiscountAmountVisible ? [trans.sp_dis_amt] : []),
                trans.tax_amt,
                "",
                trans.gst_amt,
                trans.total_amt,
                trans.round_amount || 0,
                trans.net_amt,
                ""
              ]);
              ws_data.push([]);
              ws_data.push([]);
            });

            ws_data.push([
              "",
              ...(voucherNoVisible ? [""] : []),
              "",
              ...(projectNameVisible ? [""] : []),
              "", "",
              ...(transportNameVisible ? [""] : []),
              ...(transportDateVisible ? [""] : []),
              ...(vehicalNoVisible ? [""] : []),
              ...(poNoVisible ? [""] : []),
              ...(challanNoVisible ? [""] : []),
              ...(receivedByVisible ? [""] : []),
              "",
              // { v: "Total Bill", s: headerStyle },
              // data.result[0].total_quantity,
              "",
              data.result[0].amount,
              ...(discountVisible ? [""] : []),
              ...(discountAmountVisible ? [data.result[0].dis_amount] : []),
              ...(spDiscountVisible ? [""] : []),
              ...(spDiscountAmountVisible ? [data.result[0].sp_dis_amount] : []),
              data.result[0].tax_amount,
              "",
              data.result[0].gst_amount,
              data.result[0].total_amount,
              data.result[0].round_amt || 0,
              data.result[0].net_amount,
              ""
            ]);

            ws = XLSX.utils.aoa_to_sheet(ws_data);

            const colWidths = [{ wch: 5 }];
            if (voucherNoVisible) colWidths.push({ wch: 10 });
            colWidths.push({ wch: 15 });
            if (projectNameVisible) colWidths.push({ wch: 15 });
            colWidths.push({ wch: 14 });
            colWidths.push({ wch: 14 });
            if (transportNameVisible) colWidths.push({ wch: 18 });
            if (transportDateVisible) colWidths.push({ wch: 16 });
            if (vehicalNoVisible) colWidths.push({ wch: 16 });
            if (poNoVisible) colWidths.push({ wch: 16 });
            if (challanNoVisible) colWidths.push({ wch: 16 });
            if (receivedByVisible) colWidths.push({ wch: 12 });
            colWidths.push({ wch: 22 });
            colWidths.push({ wch: 14 });
            colWidths.push({ wch: 10 });
            colWidths.push({ wch: 10 });
            colWidths.push({ wch: 10 });
            if (discountVisible) colWidths.push({ wch: 9 });
            if (discountAmountVisible) colWidths.push({ wch: 15 });
            if (spDiscountVisible) colWidths.push({ wch: 12 });
            if (spDiscountAmountVisible) colWidths.push({ wch: 18 });
            colWidths.push({ wch: 14 });
            colWidths.push({ wch: 6 });
            colWidths.push({ wch: 13 });
            colWidths.push({ wch: 13 });
            colWidths.push({ wch: 14 });
            colWidths.push({ wch: 14 });
            colWidths.push({ wch: 20 });

            ws['!cols'] = colWidths;
            ws['!merges'] = [
              { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }
            ];
          } else if (tag_number == 13 || tag_number == 14) {
            const ws_data = [[
              { v: `${tag} Report`, s: headerStyle1 },
              "", "", "",
              data.result[0].sdate ? { v: "From Date", s: headerStyle1 } : "",
              data.result[0].sdate ? new Date(data.result[0].sdate).toLocaleDateString() : "",
              "",
              data.result[0].edate ? { v: "To Date", s: headerStyle1 } : "",
              data.result[0].edate ? new Date(data.result[0].edate).toLocaleDateString() : "",
              "",
              print_date ? { v: "Download Date", s: headerStyle1 } : "",
              print_date ? new Date().toLocaleDateString() : "",
            ]];

            ws_data.push(
              [
                { v: "Sr No.", s: headerStyle },
                { v: "Voucher No.", s: headerStyle },
                { v: "Party Name", s: headerStyle },
                { v: "Project Name", s: headerStyle },
                { v: "Date", s: headerStyle },
                { v: "Bill No.", s: headerStyle },
                { v: "Gate Pass No.", s: headerStyle },
                { v: "Received By", s: headerStyle },
                { v: "Item Name", s: headerStyle },
                { v: "Unit", s: headerStyle },
                { v: "Quantity", s: headerStyle },
                { v: "Rate", s: headerStyle },
                { v: "Amount", s: headerStyle },
                { v: "Total", s: headerStyle },
                { v: "Remark", s: headerStyle },
              ],
            );

            let srNo = 1;

            data.result[0].trans_data.forEach((trans) => {
              let firstRow = true;

              trans.items.forEach((item) => {
                const row = [
                  firstRow ? srNo++ : "",
                  firstRow ? trans.voucher_no : "",
                  firstRow ? trans.party_name : "",
                  firstRow ? trans.project_name : "",
                  firstRow ? new Date(trans.trans_date).toLocaleDateString() : "",
                  firstRow ? trans.bill_no : "",
                  firstRow ? trans.gate_pass_no : "",
                  firstRow ? trans.received_by : "",
                  item.item_name,
                  item.unit,
                  item.quantity,
                  item.rate,
                  item.amount,
                  firstRow ? trans.amt : "",
                  item.remarks,
                ];
                ws_data.push(row);
                firstRow = false;
              });

              ws_data.push([]);
            });

            ws_data.push([
              "", "", "", "", "", "", "", "", "", "", "", "",
              { v: "Total Bill", s: headerStyle },
              data.result[0].amount,
              "",
            ]);

            ws = XLSX.utils.aoa_to_sheet(ws_data);
            ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];

            ws["!cols"] = [
              { wch: 6 },  // A: Sr No.
              { wch: 12 }, // B: Voucher No
              { wch: 30 }, // C: Party Name
              { wch: 30 }, // D: Project Name
              { wch: 14 }, // E: Date
              { wch: 18 }, // F: Bill No.
              { wch: 14 }, // G: Gate Pass No.
              { wch: 18 }, // H: Received By
              { wch: 30 }, // I: Item Name
              { wch: 8 },  // J: Unit
              { wch: 12 }, // K: Quantity
              { wch: 10 }, // L: Rate
              { wch: 12 }, // M: Amount
              { wch: 12 }, // N: Total
              { wch: 20 }, // O: Remark
            ];
          } else if (tag_number == 10 || tag_number == 9) {
            const ws_data = [[
              { v: `${tag} Report`, s: headerStyle1 },
              "", "", "",
              data.result[0].sdate ? { v: "From Date", s: headerStyle1 } : "",
              data.result[0].sdate ? new Date(data.result[0].sdate).toLocaleDateString() : "",
              "",
              data.result[0].edate ? { v: "To Date", s: headerStyle1 } : "",
              data.result[0].edate ? new Date(data.result[0].edate).toLocaleDateString() : "",
              "",
              "",
              print_date ? { v: "Download Date", s: headerStyle1 } : "",
              print_date ? new Date().toLocaleDateString() : "",
            ]];

            ws_data.push(
              [
                { v: "Sr No.", s: headerStyle },
                { v: "Voucher No.", s: headerStyle },
                { v: "Party Name", s: headerStyle },
                { v: "Project Name", s: headerStyle },
                { v: "Date", s: headerStyle },
                { v: "Bill No.", s: headerStyle },
                { v: "Gate Pass No.", s: headerStyle },
                { v: "Received By", s: headerStyle },
                { v: "Item Name", s: headerStyle },
                { v: "Unit", s: headerStyle },
                { v: "Quantity", s: headerStyle },
                { v: "Rate", s: headerStyle },
                { v: "GST %", s: headerStyle },
                { v: "Amount", s: headerStyle },
                { v: "Remark", s: headerStyle },
              ],
            );

            let srNo = 1;

            data.result[0].trans_data.forEach((trans, index) => {
              let firstRow = true;

              trans.items.forEach((item, itemIndex) => {
                const row = [
                  firstRow ? srNo++ : "",
                  firstRow ? trans.voucher_no : "",
                  firstRow ? trans.party_name : "",
                  firstRow ? trans.project_name : "",
                  firstRow ? new Date(trans.trans_date).toLocaleDateString() : "",
                  firstRow ? trans.bill_no : "",
                  firstRow ? trans.gate_pass_no : "",
                  firstRow ? trans.received_by : "",
                  item.item_name,
                  item.unit,
                  item.quantity,
                  item.rate,
                  item.gst,
                  item.amount,
                  item.remarks,
                ];
                ws_data.push(row);
                firstRow = false;
              });

              ws_data.push([]);
              ws_data.push([
                "", "", "", "", "", "", "", "",
                { v: "Total", s: headerStyle },
                trans.total_qty,
                "",
                "",
                trans.amt,
                ""
              ]);
              ws_data.push([]);
              ws_data.push([]);
            });

            ws_data.push([
              "", "", "", "", "", "", "", "",
              { v: "Total Bill", s: headerStyle },
              data.result[0].total_quantity,
              "",
              "",
              data.result[0].amount,
              ""
            ]);

            ws = XLSX.utils.aoa_to_sheet(ws_data);
            ws['!merges'] = [
              { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }
            ];

            ws['!cols'] = [
              { wch: 5 },
              { wch: 10 },
              { wch: 15 },
              { wch: 15 },
              { wch: 14 },
              { wch: 14 },
              { wch: 12 },
              { wch: 22 },
              { wch: 14 },
              { wch: 8 },
              { wch: 11 },
              { wch: 15 },
              { wch: 13 },
              { wch: 20 },
            ];

          }

          XLSX.utils.book_append_sheet(wb, ws, `${tag} report`);

          const xlsxPath = path.join(__dirname, '../../../xlsx');

          if (!fs.existsSync(xlsxPath)) {
            fs.mkdirSync(xlsxPath, { recursive: true });
          }

          const filename = `${tag}_report_${Date.now()}.xlsx`;
          const filePath = path.join(xlsxPath, filename);

          await XLSXStyle.writeFile(wb, filePath);


          const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
          const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;

          sendResponse(res, 200, true, { file: fileUrl }, `XLSX file generated successfully`)
        } else {
          sendResponse(res, 200, false, {}, `${tag} report not found`)
        }
      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `${tag} report not found`)
      }
      else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
}


exports.transactionPDFRport = async (req, res) => {
  // const { search, tag_number, filter, print_date, firm_id, year_id } = req.body;
  const { search, tag_number, filter, print_date, year_id, background } = req.body;
  if (req.user && !req.error) {
    try {
      if (background) {
        const job = await ReportJob.create({
          userId: req.user._id,
          type: "PDF",
          tagNumber: tag_number,
          status: "pending",
          metadata: { search, filter, print_date, year_id }
        });

        // Start processing without waiting
        processReportInBackground(job._id, search, tag_number, filter, print_date, year_id, "PDF");

        return sendResponse(res, 200, true, { jobId: job._id }, "Background report generation started");
      }

      let tag = ""
      let size = ""
      if (tag_number == 11) {
        tag = "Purchase"
        size = "20in"
      }
      else if (tag_number == 9) {
        size = "19in"
        tag = "Purchase_request"
      } else if (tag_number == 10) {
        size = "19in"
        tag = "Purchase_order"
      } else if (tag_number == 12) {
        size = "19in"
        tag = "Purchase_return"
      } else if (tag_number == 13) {
        size = "13in"
        tag = "Issue"
      } else if (tag_number == 14) {
        size = "13in"
        tag = "Issue_return"
      } else if (tag_number == 15) {
        size = "13in"
        tag = "Purchase_order"
      }
      // const data = await listTransaction(search, tag_number, filter, firm_id, year_id)
      const data = await listTransaction(search, tag_number, filter, year_id)
      const requestData = data.result[0];

      // sendResponse(res, 200, false, requestData, `${tag} report not found`)

      if (data.status === 1) {
        if (data.result.length && data.result[0].trans_data.length > 0) {
          const template = fs.readFileSync(
            "templates/allTransaction.html",
            "utf-8"
          );
          const renderedHtml = ejs.render(template, {
            requestData,
            logoUrl1: process.env.LOGO_URL_1,
            logoUrl2: process.env.LOGO_URL_2,
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
            width: `${size}`,
            height: "17in",
            margin: {
              top: "0.5in",
              right: "0.5in",
              bottom: "0.7in",
              left: "0.5in",
            },
            printBackground: true,
            preferCSSPageSize: true,
            displayHeaderFooter: true,
            footerTemplate: `
              <div style="font-size: 14px; width: 100%; text-align: right; padding-right: 50px; padding-bottom: 30px;">
                ${print_date ? `<span>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>` : ''}
                ${print_date ? '&nbsp;&nbsp;&nbsp;' : ''}
                Page <span class="pageNumber"></span> of <span class="totalPages"></span>
              </div>
            `,
            headerTemplate: `<div></div>`,
            compress: true,
          });

          await browser.close();

          const pdfsDir = path.join(__dirname, "../../../pdfs");
          if (!fs.existsSync(pdfsDir)) {
            fs.mkdirSync(pdfsDir);
          }

          const filename = `transaction_${tag}_${Date.now()}.pdf`;
          const filePath = path.join(__dirname, "../../../pdfs", filename);

          fs.writeFileSync(filePath, pdfBuffer);

          const fileUrl = `${URI}/pdfs/${filename}`;

          sendResponse(res, 200, true, { file: fileUrl }, "PDF downloaded Successfully"
          );
        } else {
          sendResponse(res, 200, false, {}, `${tag} report not found`)
        }
      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `${tag} report not found`)
      }
      else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong111");
      }
    } catch (error) {
      console.error("PDF Generation Error:", error.stack || error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.checkReportStatus = async (req, res) => {
  const { jobId } = req.params;
  try {
    const job = await ReportJob.findById(jobId);
    if (!job) {
      return sendResponse(res, 404, false, {}, "Job not found");
    }
    sendResponse(res, 200, true, job, "Job status fetched successfully");
  } catch (error) {
    console.error("Check Job Status Error:", error);
    sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

exports.streamReportStatus = async (req, res) => {
  const { jobId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Send initial signal
  sendEvent({ status: "connected" });

  const interval = setInterval(async () => {
    try {
      const job = await ReportJob.findById(jobId);
      if (!job) {
        sendEvent({ status: "error", message: "Job not found" });
        clearInterval(interval);
        res.end();
        return;
      }

      if (job.status === "completed") {
        sendEvent({ status: "completed", fileUrl: job.fileUrl });
        clearInterval(interval);
        res.end();
      } else if (job.status === "failed") {
        sendEvent({ status: "failed", error: job.error });
        clearInterval(interval);
        res.end();
      } else {
        // Still processing or pending
        sendEvent({ status: job.status });
      }
    } catch (error) {
      console.error("SSE Interval Error:", error);
      sendEvent({ status: "error", message: "Internal server error" });
      clearInterval(interval);
      res.end();
    }
  }, 3000); // Check every 3 seconds

  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
};

const processReportInBackground = async (jobId, search, tag_number, filter, print_date, year_id, type, options = {}) => {
  try {
    await ReportJob.findByIdAndUpdate(jobId, { status: "processing" });

    // listTransaction expects filter to be a string normally, but lets ensure consistency
    const filterStr = typeof filter === 'string' ? filter : JSON.stringify(filter);

    const data = await listTransaction(search, tag_number, filterStr, year_id);
    if (data.status !== 1 || !data.result.length || !data.result[data.result.length - 1].trans_data.length) {
      await ReportJob.findByIdAndUpdate(jobId, { status: "failed", error: "Data not found or empty" });
      return;
    }

    const requestData = data.result[0];
    let fileUrl = "";

    if (type === "PDF") {
      let tag = "";
      let size = "";
      if (tag_number == 11) { tag = "Purchase"; size = "20in"; }
      else if (tag_number == 9) { size = "19in"; tag = "Purchase_request"; }
      else if (tag_number == 10) { size = "19in"; tag = "Purchase_order"; }
      else if (tag_number == 12) { size = "19in"; tag = "Purchase_return"; }
      else if (tag_number == 13) { size = "13in"; tag = "Issue"; }
      else if (tag_number == 14) { size = "13in"; tag = "Issue_return"; }
      else if (tag_number == 15) { size = "13in"; tag = "Purchase_order"; }

      const template = fs.readFileSync("templates/allTransaction.html", "utf-8");
      console.log("Rendering PDF with first transaction data:", JSON.stringify(requestData.trans_data[0], null, 2));
      const renderedHtml = ejs.render(template, {
        requestData,
        logoUrl1: process.env.LOGO_URL_1,
        logoUrl2: process.env.LOGO_URL_2,
      });

      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        executablePath: PATH,
      });

      const page = await browser.newPage();
      await page.setContent(renderedHtml, { baseUrl: `${URI}`, timeout: 0 });

      const pdfBuffer = await page.pdf({
        timeout: 0,
        width: `${size}`,
        height: "17in",
        margin: { top: "0.5in", right: "0.5in", bottom: "0.7in", left: "0.5in" },
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: true,
        footerTemplate: `
          <div style="font-size: 14px; width: 100%; text-align: right; padding-right: 50px; padding-bottom: 30px;">
            ${print_date ? `<span>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>` : ''}
            &nbsp;&nbsp;&nbsp;
            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        `,
        headerTemplate: `<div></div>`,
        compress: true,
      });

      await browser.close();

      const pdfsDir = path.join(__dirname, "../../../pdfs");
      if (!fs.existsSync(pdfsDir)) fs.mkdirSync(pdfsDir);

      const filename = `transaction_${tag}_${Date.now()}.pdf`;
      const filePath = path.join(pdfsDir, filename);
      fs.writeFileSync(filePath, pdfBuffer);
      fileUrl = `${URI}/pdfs/${filename}`;

    } else if (type === "XLSX") {
      // We will implement generateExcelFile next
      fileUrl = await generateExcelFile(requestData, tag_number, print_date, options);
    }

    await ReportJob.findByIdAndUpdate(jobId, { status: "completed", fileUrl });
  } catch (error) {
    console.error("Background Report Processing Error:", error);
    await ReportJob.findByIdAndUpdate(jobId, { status: "failed", error: error.message || "Internal Error" });
  }
};

const generateExcelFile = async (requestData, tag_number, print_date, options = {}) => {
  const {
    projectNameVisible,
    transportNameVisible,
    transportDateVisible,
    vehicalNoVisible,
    poNoVisible,
    challanNoVisible,
    receivedByVisible,
    voucherNoVisible,
    discountVisible,
    discountAmountVisible,
    spDiscountVisible,
    spDiscountAmountVisible
  } = options;

  let tag = "";
  if (tag_number == 11) tag = "Purchase";
  else if (tag_number == 9) tag = "Purchase Request";
  else if (tag_number == 12) tag = "Purchase_return";
  else if (tag_number == 13) tag = "Issue";
  else if (tag_number == 14) tag = "Issue_return";
  else if (tag_number == 10) tag = "Purchase_order";

  const wb = XLSX.utils.book_new();
  let ws;
  const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: "FFFF00" } } };
  const headerStyle1 = { font: { bold: true } };

  if (tag_number == 11 || tag_number == 12) {
    const ws_data = [[
      { v: `${tag} Report`, s: headerStyle1 },
      "", "", "",
      requestData.sdate ? { v: "From Date", s: headerStyle1 } : "",
      requestData.sdate ? new Date(requestData.sdate).toLocaleDateString() : "",
      "",
      requestData.edate ? { v: "To Date", s: headerStyle1 } : "",
      requestData.edate ? new Date(requestData.edate).toLocaleDateString() : "",
      ...(discountVisible ? [""] : []),
      ...(discountAmountVisible ? [""] : []),
      ...(spDiscountVisible ? [""] : []),
      ...(spDiscountAmountVisible ? [""] : []),
      ...(transportNameVisible ? [""] : []),
      ...(transportDateVisible ? [""] : []),
      ...(vehicalNoVisible ? [""] : []),
      ...(poNoVisible ? [""] : []),
      ...(challanNoVisible ? [""] : []),
      ...(receivedByVisible ? [""] : []),
      ...(voucherNoVisible ? [""] : []),
      ...(projectNameVisible ? [""] : []),
      "", "", "", "",
      print_date ? { v: "Download Date", s: headerStyle1 } : "",
      print_date ? new Date().toLocaleDateString() : "",
    ]];

    const headers = [{ v: "Sr No.", s: headerStyle }];
    if (voucherNoVisible) headers.push({ v: "Voucher No.", s: headerStyle });
    headers.push({ v: "Party Name", s: headerStyle });
    if (projectNameVisible) headers.push({ v: "Project Name", s: headerStyle });
    headers.push({ v: "Date", s: headerStyle });
    headers.push({ v: "Bill No.", s: headerStyle });
    headers.push({ v: "Gate Pass No.", s: headerStyle });
    if (transportNameVisible) headers.push({ v: "Transport Name", s: headerStyle });
    if (transportDateVisible) headers.push({ v: "Transport Date", s: headerStyle });
    if (vehicalNoVisible) headers.push({ v: "Vehical No.", s: headerStyle });
    if (poNoVisible) headers.push({ v: "PO No.", s: headerStyle });
    if (challanNoVisible) headers.push({ v: "Challan No.", s: headerStyle });
    if (receivedByVisible) headers.push({ v: "Received By", s: headerStyle });
    headers.push({ v: "Item Name", s: headerStyle });
    headers.push({ v: "Unit", s: headerStyle });
    headers.push({ v: "Quantity", s: headerStyle });
    headers.push({ v: "Rate", s: headerStyle });
    headers.push({ v: "Amount", s: headerStyle });
    if (discountVisible) headers.push({ v: "Discount %", s: headerStyle });
    if (discountAmountVisible) headers.push({ v: "Discount Amount", s: headerStyle });
    if (spDiscountVisible) headers.push({ v: "SP Discount %", s: headerStyle });
    if (spDiscountAmountVisible) headers.push({ v: "SP Discount Amount", s: headerStyle });
    headers.push({ v: "Taxable Amount", s: headerStyle });
    headers.push({ v: "GST %", s: headerStyle });
    headers.push({ v: "GST Amount", s: headerStyle });
    headers.push({ v: "Total Amount", s: headerStyle });
    headers.push({ v: "+/- Amount", s: headerStyle });
    headers.push({ v: "Net Amount", s: headerStyle });
    headers.push({ v: "Remark", s: headerStyle });

    ws_data.push(headers);
    let srNo = 1;

    requestData.trans_data.forEach((trans) => {
      let firstRow = true;
      trans.items.forEach((item) => {
        const row = [
          firstRow ? srNo++ : "",
          ...(voucherNoVisible ? [firstRow ? trans.voucher_no : ""] : []),
          firstRow ? trans.party_name : "",
          ...(projectNameVisible ? [firstRow ? trans.project_name : ""] : []),
          firstRow ? new Date(trans.trans_date).toLocaleDateString() : "",
          firstRow ? trans.bill_no : "",
          firstRow ? trans.gate_pass_no : "",
          ...(transportNameVisible ? [firstRow ? trans.transport_name : ""] : []),
          ...(transportDateVisible ? [firstRow ? trans.transport_date : ""] : []),
          ...(vehicalNoVisible ? [firstRow ? trans.vehical_no : ""] : []),
          ...(poNoVisible ? [firstRow ? trans.po_no : ""] : []),
          ...(challanNoVisible ? [firstRow ? trans.challan_no : ""] : []),
          ...(receivedByVisible ? [firstRow ? trans.received_by : ""] : []),
          item.item_name,
          item.unit,
          item.quantity,
          item.rate,
          item.amount,
          ...(discountVisible ? [item.discount] : []),
          ...(discountAmountVisible ? [item.discount_amount] : []),
          ...(spDiscountVisible ? [item.sp_discount] : []),
          ...(spDiscountAmountVisible ? [item.sp_discount_amount] : []),
          item.taxable_amount,
          item.gst,
          item.gst_amount,
          item.total_amount,
          "", "",
          item.remarks
        ];
        ws_data.push(row);
        firstRow = false;
      });

      ws_data.push([]);
      ws_data.push([
        "",
        ...(voucherNoVisible ? [""] : []),
        "",
        ...(projectNameVisible ? [""] : []),
        "", "",
        ...(transportNameVisible ? [""] : []),
        ...(transportDateVisible ? [""] : []),
        ...(vehicalNoVisible ? [""] : []),
        ...(poNoVisible ? [""] : []),
        ...(challanNoVisible ? [""] : []),
        ...(receivedByVisible ? [""] : []),
        "",
        { v: "Total", s: headerStyle },
        trans.total_qty,
        "",
        trans.amt,
        ...(discountVisible ? [""] : []),
        ...(discountAmountVisible ? [trans.dis_amt] : []),
        ...(spDiscountVisible ? [""] : []),
        ...(spDiscountAmountVisible ? [trans.sp_dis_amt] : []),
        trans.tax_amt,
        "",
        trans.gst_amt,
        trans.total_amt,
        trans.round_amount || 0,
        trans.net_amt,
        ""
      ]);
      ws_data.push([]);
      ws_data.push([]);
    });

    ws_data.push([
      "",
      ...(voucherNoVisible ? [""] : []),
      "",
      ...(projectNameVisible ? [""] : []),
      "", "",
      ...(transportNameVisible ? [""] : []),
      ...(transportDateVisible ? [""] : []),
      ...(vehicalNoVisible ? [""] : []),
      ...(poNoVisible ? [""] : []),
      ...(challanNoVisible ? [""] : []),
      ...(receivedByVisible ? [""] : []),
      "",
      "",
      requestData.amount,
      ...(discountVisible ? [""] : []),
      ...(discountAmountVisible ? [requestData.dis_amount] : []),
      ...(spDiscountVisible ? [""] : []),
      ...(spDiscountAmountVisible ? [requestData.sp_dis_amount] : []),
      requestData.tax_amount,
      "",
      requestData.gst_amount,
      requestData.total_amount,
      requestData.round_amt || 0,
      requestData.net_amount,
      ""
    ]);

    ws = XLSX.utils.aoa_to_sheet(ws_data);
    const colWidths = [{ wch: 5 }];
    if (voucherNoVisible) colWidths.push({ wch: 10 });
    colWidths.push({ wch: 15 });
    if (projectNameVisible) colWidths.push({ wch: 15 });
    colWidths.push({ wch: 14 });
    colWidths.push({ wch: 14 });
    if (transportNameVisible) colWidths.push({ wch: 18 });
    if (transportDateVisible) colWidths.push({ wch: 16 });
    if (vehicalNoVisible) colWidths.push({ wch: 16 });
    if (poNoVisible) colWidths.push({ wch: 16 });
    if (challanNoVisible) colWidths.push({ wch: 16 });
    if (receivedByVisible) colWidths.push({ wch: 12 });
    colWidths.push({ wch: 22 });
    colWidths.push({ wch: 14 });
    colWidths.push({ wch: 10 });
    colWidths.push({ wch: 10 });
    colWidths.push({ wch: 10 });
    if (discountVisible) colWidths.push({ wch: 9 });
    if (discountAmountVisible) colWidths.push({ wch: 15 });
    if (spDiscountVisible) colWidths.push({ wch: 12 });
    if (spDiscountAmountVisible) colWidths.push({ wch: 18 });
    colWidths.push({ wch: 14 });
    colWidths.push({ wch: 6 });
    colWidths.push({ wch: 13 });
    colWidths.push({ wch: 13 });
    colWidths.push({ wch: 14 });
    colWidths.push({ wch: 14 });
    colWidths.push({ wch: 20 });
    ws['!cols'] = colWidths;
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];

  } else if (tag_number == 13 || tag_number == 14) {
    const ws_data = [[
      { v: `${tag} Report`, s: headerStyle1 },
      "", "", "",
      requestData.sdate ? { v: "From Date", s: headerStyle1 } : "",
      requestData.sdate ? new Date(requestData.sdate).toLocaleDateString() : "",
      "",
      requestData.edate ? { v: "To Date", s: headerStyle1 } : "",
      requestData.edate ? new Date(requestData.edate).toLocaleDateString() : "",
      "",
      print_date ? { v: "Download Date", s: headerStyle1 } : "",
      print_date ? new Date().toLocaleDateString() : "",
    ]];
    ws_data.push([
      { v: "Sr No.", s: headerStyle },
      { v: "Voucher No.", s: headerStyle },
      { v: "Party Name", s: headerStyle },
      { v: "Project Name", s: headerStyle },
      { v: "Date", s: headerStyle },
      { v: "Bill No.", s: headerStyle },
      { v: "Gate Pass No.", s: headerStyle },
      { v: "Received By", s: headerStyle },
      { v: "Item Name", s: headerStyle },
      { v: "Unit", s: headerStyle },
      { v: "Quantity", s: headerStyle },
      { v: "Rate", s: headerStyle },
      { v: "Amount", s: headerStyle },
      { v: "Total", s: headerStyle },
      { v: "Remark", s: headerStyle },
    ]);
    let srNo = 1;
    requestData.trans_data.forEach((trans) => {
      let firstRow = true;
      trans.items.forEach((item) => {
        const row = [
          firstRow ? srNo++ : "",
          firstRow ? trans.voucher_no : "",
          firstRow ? trans.party_name : "",
          firstRow ? trans.project_name : "",
          firstRow ? new Date(trans.trans_date).toLocaleDateString() : "",
          firstRow ? trans.bill_no : "",
          firstRow ? trans.gate_pass_no : "",
          firstRow ? trans.received_by : "",
          item.item_name,
          item.unit,
          item.quantity,
          item.rate,
          item.amount,
          firstRow ? trans.amt : "",
          item.remarks,
        ];
        ws_data.push(row);
        firstRow = false;
      });
      ws_data.push([]);
    });
    ws_data.push([
      "", "", "", "", "", "", "", "", "", "", "", "",
      { v: "Total Bill", s: headerStyle },
      requestData.amount,
      "",
    ]);
    ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
    ws["!cols"] = [
      { wch: 6 }, { wch: 12 }, { wch: 30 }, { wch: 30 }, { wch: 14 },
      { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 30 }, { wch: 8 },
      { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
    ];
  } else if (tag_number == 10 || tag_number == 9) {
    const ws_data = [[
      { v: `${tag} Report`, s: headerStyle1 },
      "", "", "",
      requestData.sdate ? { v: "From Date", s: headerStyle1 } : "",
      requestData.sdate ? new Date(requestData.sdate).toLocaleDateString() : "",
      "",
      requestData.edate ? { v: "To Date", s: headerStyle1 } : "",
      requestData.edate ? new Date(requestData.edate).toLocaleDateString() : "",
      "", "",
      print_date ? { v: "Download Date", s: headerStyle1 } : "",
      print_date ? new Date().toLocaleDateString() : "",
    ]];
    ws_data.push([
      { v: "Sr No.", s: headerStyle },
      { v: "Voucher No.", s: headerStyle },
      { v: "Party Name", s: headerStyle },
      { v: "Project Name", s: headerStyle },
      { v: "Date", s: headerStyle },
      { v: "Bill No.", s: headerStyle },
      { v: "Gate Pass No.", s: headerStyle },
      { v: "Received By", s: headerStyle },
      { v: "Item Name", s: headerStyle },
      { v: "Unit", s: headerStyle },
      { v: "Quantity", s: headerStyle },
      { v: "Rate", s: headerStyle },
      { v: "GST %", s: headerStyle },
      { v: "Amount", s: headerStyle },
      { v: "Remark", s: headerStyle },
    ]);
    let srNo = 1;
    requestData.trans_data.forEach((trans) => {
      let firstRow = true;
      trans.items.forEach((item) => {
        const row = [
          firstRow ? srNo++ : "",
          firstRow ? trans.voucher_no : "",
          firstRow ? trans.party_name : "",
          firstRow ? trans.project_name : "",
          firstRow ? new Date(trans.trans_date).toLocaleDateString() : "",
          firstRow ? trans.bill_no : "",
          firstRow ? trans.gate_pass_no : "",
          firstRow ? trans.received_by : "",
          item.item_name,
          item.unit,
          item.quantity,
          item.rate,
          item.gst,
          item.amount,
          item.remarks,
        ];
        ws_data.push(row);
        firstRow = false;
      });
      ws_data.push([]);
      ws_data.push([
        "", "", "", "", "", "", "", "",
        { v: "Total", s: headerStyle },
        trans.total_qty,
        "", "",
        trans.amt,
        ""
      ]);
      ws_data.push([]);
      ws_data.push([]);
    });
    ws_data.push([
      "", "", "", "", "", "", "", "",
      { v: "Total Bill", s: headerStyle },
      requestData.total_quantity || 0,
      "", "",
      requestData.amount,
      ""
    ]);
    ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
    ws['!cols'] = [
      { wch: 5 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 14 },
      { wch: 14 }, { wch: 12 }, { wch: 22 }, { wch: 14 }, { wch: 8 },
      { wch: 11 }, { wch: 15 }, { wch: 13 }, { wch: 20 },
    ];
  }

  XLSX.utils.book_append_sheet(wb, ws, `${tag} report`);
  const xlsxPath = path.join(__dirname, '../../../xlsx');
  if (!fs.existsSync(xlsxPath)) fs.mkdirSync(xlsxPath, { recursive: true });

  const filename = `${tag.replace(/\s+/g, '_')}_report_${Date.now()}.xlsx`;
  const filePath = path.join(xlsxPath, filename);
  await XLSXStyle.writeFile(wb, filePath);

  return `${URI}/xlsx/${filename}`;
};




//Purchase Request

exports.addPR = async (req, res) => {
  const {
    // firm_id,
    year_id,
    tag_number,
    trans_date,
    master_id,      //prepared by
    site_location,
    store_location,
    department,
    items_details
  } = req.body;

  if (req.user && !req.error) {
    try {
      if (
        // firm_id &&
        year_id &&
        trans_date &&
        tag_number &&
        items_details.length
      ) {

        const tag_id = await tagId(tag_number);

        const voucher_no = await VoucherGen();

        let addPR = await Transaction.create({
          // firm_id,
          year_id,
          tag_number,
          voucher_no,
          tag_id,
          trans_date,
          master_id,     //prepared by
          site_location,
          store_location,
          department,
          items_details
        });

        if (addPR) {
          sendResponse(res, 200, true, addPR, `PR added successfully`);
        } else {
          sendResponse(res, 400, false, {}, `PR not added`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.addPRItem = async (req, res) => {
  const { id, items_details } = req.body

  if (req.user && !req.error) {
    try {
      // const item = JSON.parse(items_details);
      if (
        id &&
        items_details.length //for postman
        // item.length
      ) {
        let existTransaction = await Transaction.findById(id);

        if (!existTransaction) {
          sendResponse(
            res,
            400,
            false,
            {},
            `No purchase request with this id exist`
          );
        } else {
          const addPRItem = await Transaction.updateOne(
            { _id: id },
            {
              $push: {
                items_details: {
                  $each: items_details, // for postman
                },
                // items_details: {
                // $each: item
                // }
              },
            }
          );

          if (addPRItem.modifiedCount === 1) {
            sendResponse(res, 200, true, {}, `Purchase request item added successfully`);
          } else {
            sendResponse(res, 400, false, {}, `Purchase request item not added`);
          }
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.approvePR = async (req, res) => {
  const { id, admin_email, items_details } = req.body;
  if (req.user && !req.error) {
    try {
      if (id) {
        const admin_id = await AdminModal.findOne({ email: admin_email }, { _id: 1 });
        const bulkUpdates = [
          ...items_details.map((item) => ({
            updateOne: {
              filter: { _id: id, "items_details._id": item._id },
              update: { $set: { "items_details.$.quantity": item.approve_qty, "items_details.$.balance_qty": item.approve_qty } },
            },
          })),
          {
            updateOne: {
              filter: { _id: id },
              update: { $set: { status: 4, admin_id: admin_id } },
            },
          },
        ];
        const approvePR = await Transaction.bulkWrite(bulkUpdates);

        if (approvePR.modifiedCount > 0) {
          const updatedDocument = await Transaction.findOne({ _id: id, deleted: false });
          sendResponse(res, 200, true, updatedDocument, `PR approved successfully`);
        } else {
          sendResponse(res, 400, false, {}, `PR not approved`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.listPR = async (req, res) => {
  console.log("CALLING TO API")
  // const { tag_number, firm_id, year_id, filter, search } = req.body;
  const { tag_number, year_id, filter, search } = req.body;
  if (req.user && !req.error) {
    try {
      if (tag_number) {
        const tag_id = await tagId(tag_number);

        // const { date } = filter;
        const filter1 = JSON.parse(filter)             //react
        const { date } = filter1;

        const date_start = date && date.start ? new Date(date.start) : new Date("1947-08-15");

        let date_end = date ? (date.end ? new Date(date.end) : new Date()) : new Date();
        date_end.setHours(23, 59, 59, 999);
        const timezoneOffset = date_end.getTimezoneOffset() * 60000;
        date_end = new Date(date_end.getTime() - timezoneOffset);

        const search_by = search ? search.replace(/[^0-9a-zA-Z]/g, "\\$&") : "";

        let matchObj = {
          deleted: false,
          tag_id: tag_id,
          // firm_id: new ObjectId(firm_id),
          // year_id: new ObjectId(year_id),
          trans_date: {
            $gte: new Date(date_start),
            $lte: new Date(date_end),
          },
        }

        // firm_id and year_id if provided
        // if (firm_id) matchObj.firm_id = new ObjectId(firm_id);
        if (year_id) matchObj.year_id = new ObjectId(year_id);

        if (search_by != "") {
          matchObj = {
            ...matchObj,
            $or: [
              { voucher_no: { $regex: search_by, $options: "i" } },
              { site_location: { $regex: search_by, $options: "i" } },
              { store_location: { $regex: search_by, $options: "i" } },
              { department: { $regex: search_by, $options: "i" } },
            ],
          };
        }


        const listPR = await Transaction.aggregate([
          { $match: matchObj },
          {
            $lookup: {
              from: "masters",
              localField: "master_id",
              foreignField: "_id",
              as: "masterDetails",
            },
          },
          {
            $lookup: {
              from: "admins",
              localField: "admin_id",
              foreignField: "_id",
              as: "adminDetails",
            },
          },
          {
            $addFields: {
              prepare_by: {
                _id: { $arrayElemAt: ["$masterDetails._id", 0] },
                name: { $arrayElemAt: ["$masterDetails.name", 0] },
              },
              approve_by: {
                _id: { $arrayElemAt: ["$adminDetails._id", 0] },
                name: { $arrayElemAt: ["$adminDetails.name", 0] },
              },
              item_count: {
                $size: {
                  $filter: {
                    input: "$items_details",
                    as: "item",
                    cond: { $eq: ["$$item.deleted", false] },
                  },
                },
              },
            },
          },
          {
            $sort: { voucher_no: -1 },
          },
          {
            $project: {
              masterDetails: 0,
              adminDetails: 0,
              items_details: 0,
              payment_date: 0,
              payment_days: 0,
              bill_no: 0,
              isexternal: 0,
              machine_code: 0,
              party_id: 0,
              master_id: 0,
              project_id: 0,
              admin_id: 0,
              tag_id: 0,
              round_amount: 0,
              pdf: 0,
              transport_id: 0,
              transport_date: 0,
              lr_no: 0,
              lr_date: 0,
              vehical_no: 0,
              po_no: 0,
              challan_no: 0,
              gate_pass_no: 0,
              issue_no: 0,
              address: 0,
              return_id: 0,
              deleted: 0,
              receive_date: 0,
              createdAt: 0,
              updatedAt: 0,
              __v: 0,
            },
          },
        ]);
        // console.log("LIST PR",listPR);
        if (listPR.length > 0) {
          sendResponse(res, 200, true, listPR, `PR list`);
        } else {
          sendResponse(res, 200, true, [], `PR not found`);
        }
      } else {
        return sendResponse(res, 400, false, [], "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.listPRAdmin = async (req, res) => {
  const { tag_number, search } = req.body;
  if (req.user && !req.error) {
    try {
      if (tag_number) {
        const tag_id = await tagId(tag_number);

        const search_by = search ? search.replace(/[^0-9a-zA-Z]/g, "\\$&") : "";

        let matchObj = {
          deleted: false,
          tag_id: tag_id,
          status: 1,
        }

        if (search_by != "") {
          matchObj = {
            ...matchObj,
            $or: [
              { voucher_no: { $regex: search_by, $options: "i" } },
              { site_location: { $regex: search_by, $options: "i" } },
              { store_location: { $regex: search_by, $options: "i" } },
              { department: { $regex: search_by, $options: "i" } },
            ],
          };
        }


        const listPR = await Transaction.aggregate([
          { $match: matchObj },
          {
            $lookup: {
              from: "masters",
              localField: "master_id",
              foreignField: "_id",
              as: "masterDetails",
            },
          },
          {
            $lookup: {
              from: "admins",
              localField: "admin_id",
              foreignField: "_id",
              as: "adminDetails",
            },
          },
          {
            $addFields: {
              prepare_by: {
                _id: { $arrayElemAt: ["$masterDetails._id", 0] },
                name: { $arrayElemAt: ["$masterDetails.name", 0] },
              },
              approve_by: {
                _id: { $arrayElemAt: ["$adminDetails._id", 0] },
                name: { $arrayElemAt: ["$adminDetails.name", 0] },
              },
              item_count: {
                $size: {
                  $filter: {
                    input: "$items_details",
                    as: "item",
                    cond: { $eq: ["$$item.deleted", false] },
                  },
                },
              },
            },
          },
          {
            $sort: { voucher_no: -1 },
          },
          {
            $project: {
              masterDetails: 0,
              adminDetails: 0,
              items_details: 0,
              payment_date: 0,
              payment_days: 0,
              bill_no: 0,
              isexternal: 0,
              machine_code: 0,
              party_id: 0,
              master_id: 0,
              project_id: 0,
              admin_id: 0,
              tag_id: 0,
              round_amount: 0,
              pdf: 0,
              transport_id: 0,
              transport_date: 0,
              lr_no: 0,
              lr_date: 0,
              vehical_no: 0,
              po_no: 0,
              challan_no: 0,
              gate_pass_no: 0,
              issue_no: 0,
              address: 0,
              return_id: 0,
              deleted: 0,
              receive_date: 0,
              createdAt: 0,
              updatedAt: 0,
              __v: 0,
            },
          },
        ]);

        if (listPR.length > 0) {
          sendResponse(res, 200, true, listPR, `PR Admin list`);
        } else {
          sendResponse(res, 200, true, [], `PR Admin list not found`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.onePR = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      if (id) {
        const onePR = await Transaction.aggregate([
          {
            $match: { _id: new ObjectId(id) },
          },
          {
            $project: {
              items_details: {
                $filter: {
                  input: "$items_details",
                  as: "item",
                  cond: { $eq: ["$$item.deleted", false] },
                },
              },
            },
          },
          {
            $lookup: {
              from: "store-items",
              let: { items: "$items_details" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: [
                        "$_id",
                        {
                          $map: {
                            input: "$$items",
                            as: "item",
                            in: "$$item.item_id",
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    item_id: "$_id",
                    item_name: "$name",
                  },
                },
              ],
              as: "items_data",
            },
          },
          {
            $lookup: {
              from: "store-item-categories",
              let: { category: "$items_details.category_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: ["$_id", "$$category"],
                    },
                  },
                },
                {
                  $project: {
                    _id: 1,
                    name: 1,
                  },
                },
              ],
              as: "category_data",
            },
          },
          {
            $lookup: {
              from: "store-parties",
              let: { supplier: "$items_details.pr_party" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: ["$_id", "$$supplier"],
                    },
                  },
                },
                {
                  $project: {
                    _id: 1,
                    name: 1,
                  },
                },
              ],
              as: "supplier_data",
            },
          },
          {
            $addFields: {
              items_details: {
                $map: {
                  input: "$items_details",
                  as: "item",
                  in: {
                    $let: {
                      vars: {
                        itemData: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$items_data",
                                as: "data",
                                cond: {
                                  $eq: ["$$data.item_id", "$$item.item_id"],
                                },
                              },
                            },
                            0,
                          ],
                        },
                        categoryData: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$category_data",
                                as: "category",
                                cond: {
                                  $eq: ["$$category._id", "$$item.category_id"],
                                },
                              },
                            },
                            0,
                          ],
                        },
                        supplierData: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$supplier_data",
                                as: "supplier",
                                cond: {
                                  $eq: ["$$supplier._id", "$$item.pr_party"],
                                },
                              },
                            },
                            0,
                          ],
                        },
                      },
                      in: {
                        $mergeObjects: [
                          "$$item",
                          { item_name: { $ifNull: ["$$itemData.item_name", null] } },
                          { category_name: { $ifNull: ["$$categoryData.name", null] } },
                          { supplier_name: { $ifNull: ["$$supplierData.name", null] } },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
          {
            $project: {
              items_data: 0,
              category_data: 0,
              supplier_data: 0,
              "items_details.from_id": 0,
              "items_details.detail_id": 0,
              "items_details.status": 0,
              "items_details.deleted": 0,
              "items_details.rate": 0,
              "items_details.amount": 0,
              "items_details.discount": 0,
              "items_details.discount_amount": 0,
              "items_details.sp_discount": 0,
              "items_details.sp_discount_amount": 0,
              "items_details.taxable_amount": 0,
              "items_details.gst": 0,
              "items_details.gst_amount": 0,
              "items_details.total_amount": 0,
              "items_details.return_qty": 0,
            },
          },
        ]);


        if (onePR && onePR.length > 0) {
          sendResponse(res, 200, true, onePR[0], `PR found successfully`);
        } else {
          sendResponse(res, 200, true, {}, `PR not found`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.deletePR = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      if (id) {
        const deletePR = await Transaction.findByIdAndUpdate(id, { deleted: true }, { new: true });

        if (deletePR) {
          sendResponse(res, 200, true, {}, `PR deleted successfully`);
        } else {
          sendResponse(res, 400, false, {}, `PR not delete`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.deletePRItem = async (req, res) => {
  const { id, itemId } = req.body;
  if (req.user && !req.error) {
    try {
      if (id) {
        const deletePRItem = await Transaction.updateOne(
          { _id: id, "items_details._id": itemId },
          {
            $set: {
              "items_details.$.deleted": true,
            },
          },
          { new: true }
        )

        if (deletePRItem.modifiedCount > 0) {
          sendResponse(res, 200, true, {}, `PR item deleted successfully`);
        } else {
          sendResponse(res, 400, false, {}, `PR item not delete`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.updatePR = async (req, res) => {
  const {
    id,
    trans_date,
    master_id,      //prepared by
    site_location,
    store_location,
    department
  } = req.body;

  if (req.user && !req.error) {
    try {
      if (id) {
        const updatePR = await Transaction.findByIdAndUpdate(
          id,
          {
            trans_date,
            master_id,      //prepared by
            site_location,
            store_location,
            department
          },
          { new: true }
        );

        if (updatePR) {
          sendResponse(res, 200, true, updatePR, `PR update successfully`);
        } else {
          sendResponse(res, 400, false, {}, `PR not update`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.updatePRItem = async (req, res) => {
  const {
    id,
    item_detail_id,   // item detail object id
    items_details
  } = req.body;

  if (req.user && !req.error) {
    try {
      if (id) {
        const updatePRItem = await Transaction.updateOne(
          { _id: id, "items_details._id": item_detail_id },
          {
            $set: {
              "items_details.$.item_id": items_details.item_id,
              "items_details.$.unit": items_details.unit,
              "items_details.$.category_id": items_details.category_id,
              "items_details.$.item_brand": items_details.item_brand,
              "items_details.$.required_qty": items_details.required_qty,
              "items_details.$.pr_party": items_details.pr_party,
              "items_details.$.remarks": items_details.remarks,
            },
          }
        )

        if (updatePRItem.modifiedCount > 0) {
          sendResponse(res, 200, true, {}, `PR item update successfully`);
        } else {
          sendResponse(res, 400, false, {}, `PR item not update`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.listPRNumber = async (req, res) => {
  // const { tag_number, firm_id, year_id } = req.body;
  const { tag_number, year_id } = req.body;
  if (req.user && !req.error) {
    try {
      // if (tag_number && firm_id && year_id) {
      if (tag_number && year_id) {
        const tag_id = await tagId(tag_number);
        const listPRNO = await Transaction.aggregate([
          {
            $match: {
              deleted: false,
              tag_id: new ObjectId(tag_id),
              // firm_id: new ObjectId(firm_id),
              year_id: new ObjectId(year_id),
              status: 4,
            },
          },
          { $unwind: "$items_details" },
          {
            $match: {
              "items_details.deleted": { $ne: true },
              "items_details.balance_qty": { $gt: 0 },
            },
          },
          {
            $group: {
              _id: "$voucher_no",
              voucher_no: { $first: "$voucher_no" },
            },
          },
          {
            $sort: {
              voucher_no: -1,
            },
          },
          {
            $project: {
              _id: 0,
              voucher_no: 1,
            },
          },
        ]);

        if (listPRNO.length > 0) {
          sendResponse(res, 200, true, listPRNO, `PR number list`);
        } else {
          sendResponse(res, 200, true, [], `PR number not found`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

const PRDownload = async (id) => {
  try {
    const requestData = await Transaction.aggregate([
      { $match: { deleted: false, _id: new ObjectId(id) } },
      { $unwind: "$items_details" },
      {
        $match: {
          "items_details.deleted": { $ne: true },
        },
      },
      {
        $lookup: {
          from: "masters",
          localField: "master_id",
          foreignField: "_id",
          as: "masterDetails",
        },
      },
      {
        $lookup: {
          from: "admins",
          localField: "admin_id",
          foreignField: "_id",
          as: "adminDetails",
        },
      },
      {
        $lookup: {
          from: "store-items",
          localField: "items_details.item_id",
          foreignField: "_id",
          as: "itemDetails",
        },
      },
      {
        $lookup: {
          from: "store-parties",
          localField: "items_details.pr_party",
          foreignField: "_id",
          as: "partyDetails",
        },
      },
      {
        $lookup: {
          from: "masters",
          localField: "items_details.category_id",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      {
        $lookup: {
          from: "ms_item_stocks",
          let: { itemId: "$items_details.item_id" },
          pipeline: [
            { $match: { deleted: false } },
            {
              $group: {
                _id: "$item_id",
                totalIn: { $sum: "$in" },
                totalOut: { $sum: "$out" },
              },
            },
            {
              $addFields: {
                stock_balance: { $subtract: ["$totalIn", "$totalOut"] },
              },
            },
            { $match: { $expr: { $eq: ["$_id", "$$itemId"] } } },
            {
              $project: {
                _id: 0,
                stock_balance: 1,
              },
            },
          ],
          as: "stockDetails",
        },
      },
      {
        $addFields: {
          prepared_by: { $arrayElemAt: ["$masterDetails.name", 0] },
          approve_by: { $arrayElemAt: ["$adminDetails.name", 0] },
          item_name: { $arrayElemAt: ["$itemDetails.name", 0] },
          party_name: { $arrayElemAt: ["$partyDetails.name", 0] },
          category_name: { $arrayElemAt: ["$categoryDetails.name", 0] },
          stock_balance: { $arrayElemAt: ["$stockDetails.stock_balance", 0] },
        },
      },
      {
        $project: {
          _id: 1,
          prepared_by: "$prepared_by",
          approve_by: "$approve_by",
          voucher_no: "$voucher_no",
          site_location: "$site_location",
          store_location: "$store_location",
          department: "$department",
          trans_date: "$trans_date",
          items: {
            _id: "$items_details._id",
            category_name: "$category_name",
            item_name: "$item_name",
            party_name: "$party_name",
            unit: "$items_details.unit",
            required_qty: "$items_details.required_qty",
            quantity: "$items_details.quantity",
            remarks: "$items_details.remarks",
            stock_balance: "$stock_balance",
          },
        },
      },
      {
        $group: {
          _id: {
            _id: "$_id",
            prepared_by: "$prepared_by",
            approve_by: "$approve_by",
            voucher_no: "$voucher_no",
            site_location: "$site_location",
            store_location: "$store_location",
            department: "$department",
            trans_date: "$trans_date",
          },
          items: { $push: "$items" },
        },
      },
      {
        $project: {
          _id: "$_id._id",
          prepared_by: "$_id.prepared_by",
          approve_by: "$_id.approve_by",
          voucher_no: "$_id.voucher_no",
          site_location: "$_id.site_location",
          store_location: "$_id.store_location",
          department: "$_id.department",
          trans_date: "$_id.trans_date",
          items: 1,
        },
      },
    ]);
    if (requestData.length && requestData.length > 0) {
      return { status: 1, result: requestData };
    } else {
      return { status: 0, result: [] };
    }
  } catch (error) {
    return { status: 2, result: error };
  }
};

exports.PRDownloadList = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await PRDownload(id)
      if (data.status === 1) {
        sendResponse(res, 200, true, data.result, `Purchase request found`);
      } else if (data.status === 0) {
        sendResponse(res, 200, true, [], `Purchase request not found`);
      } else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.PRDownloadPDF = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await PRDownload(id)
      const requestData = data.result[0];

      if (data.status === 1) {

        let headerInfo = {
          prepared_by: requestData?.prepared_by,
          approve_by: requestData?.approve_by,
          pr_no: requestData?.voucher_no,
          site_location: requestData?.site_location,
          store_location: requestData?.store_location,
          department: requestData?.department,
          pr_date: requestData?.trans_date,
        }

        const template = fs.readFileSync(
          "templates/onePR.html",
          "utf-8"
        );
        const renderedHtml = ejs.render(template, {
          headerInfo,
          items: requestData?.items,
          logoUrl1: process.env.LOGO_URL_1,
          logoUrl2: process.env.LOGO_URL_2,
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

        const pdfBuffer = await generatePDF(page, { print_date: true });

        await browser.close();

        const pdfsDir = path.join(__dirname, "../../../pdfs");
        if (!fs.existsSync(pdfsDir)) {
          fs.mkdirSync(pdfsDir);
        }

        const filename = `purchase_request_${Date.now()}.pdf`;
        const filePath = path.join(__dirname, "../../../pdfs", filename);

        fs.writeFileSync(filePath, pdfBuffer);

        const fileUrl = `${URI}/pdfs/${filename}`;

        sendResponse(res, 200, true, { file: fileUrl }, "PDF downloaded Successfully"
        );

      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Purchase request report not found`)
      }
      else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong111");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};




//Purchase order

exports.listPRItemForPO = async (req, res) => {
  // const { firm_id, year_id, pr_no, tag_number } = req.body;
  const { year_id, pr_no, tag_number } = req.body;
  if (req.user && !req.error) {
    try {

      let matchObj = {}

      if (pr_no.length > 0) {
        matchObj = {
          voucher_no: { $in: pr_no },
        };
      }

      const tag_id = await tagId(tag_number);

      let PRItemForPO = await Transaction.aggregate([
        { $unwind: "$items_details" },
        {
          $match: {
            deleted: false,
            year_id: new ObjectId(year_id),
            tag_id: tag_id,
            status: 4,
            "items_details.deleted": { $ne: true },
            "items_details.balance_qty": { $gt: 0 },
          }
        },
        { $match: matchObj },
        {
          $lookup: {
            from: "store-items",
            localField: "items_details.item_id",
            foreignField: "_id",
            as: "item_data"
          }
        },
        { $unwind: { path: "$item_data", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "masters",
            localField: "items_details.category_id",
            foreignField: "_id",
            as: "category_data"
          }
        },
        { $unwind: { path: "$category_data", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            from_id: "$_id",
            pr_no: "$voucher_no",
            detail_id: "$items_details._id",
            item_data: {
              _id: "$item_data._id",
              name: "$item_data.name",
              cost_rate: "$item_data.cost_rate"
            },
            category_data: {
              _id: "$category_data._id",
              name: "$category_data.name",
            },
            unit: "$items_details.unit",
            item_brand: "$items_details.item_brand",
            quantity: "$items_details.balance_qty",
          }
        }
      ]);

      if (PRItemForPO && PRItemForPO.length > 0) {
        sendResponse(res, 200, true, PRItemForPO, `PR Item found for PO successfully`);
      } else {
        sendResponse(res, 400, false, {}, `PR Item not found for PO`);
      }

    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.addPO = async (req, res) => {
  let {
    // firm_id,
    year_id,
    tag_number,
    trans_date,
    party_id,
    project_id,
    master_id,      //po create
    items_details
  } = req.body;

  if (req.user && !req.error) {
    try {
      if (
        // firm_id &&
        year_id &&
        trans_date &&
        party_id &&
        project_id &&
        tag_number &&
        items_details.length
      ) {

        const tag_id = await tagId(tag_number);

        const voucher_no = await VoucherGen();

        items_details = items_details.map(item => {
          return {
            ...item,
            balance_qty: item.quantity,
          };
        });

        //    items_details = await Promise.all(
        //   items_details.map(async (item) => {
        //     const storeItem = await StoreItem.findById(item.item_id).select("cost_rate");
        //     return {
        //       ...item,
        //       balance_qty: item.quantity,
        //       cost_rate: storeItem?.cost_rate || 0,
        //     };
        //   })
        // );
        console.log("PO items with cost_rate:", items_details);

        let addPO = await Transaction.create({
          // firm_id,
          year_id,
          tag_number,
          voucher_no,
          tag_id,
          trans_date,
          master_id,     //po create
          party_id,
          project_id,
          items_details
        });

        if (addPO) {
          await manageMainObjBalanceQty(addPO.items_details, true)             // Main obj balance qty manage
          await manageTransactionItemStatus(addPO.items_details)               // Obj item status manage
          sendResponse(res, 200, true, addPO, `PO added successfully`);
        } else {
          sendResponse(res, 400, false, {}, `PO not added`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.addPOItem = async (req, res) => {
  let { id, items_details } = req.body

  if (req.user && !req.error) {
    try {
      // const item = JSON.parse(items_details);
      if (
        id &&
        items_details.length //for postman
        // item.length
      ) {
        let existTransaction = await Transaction.findById(id);

        if (!existTransaction) {
          sendResponse(
            res,
            400,
            false,
            {},
            `No purchase order with this id exist`
          );
        } else {

          items_details = items_details.map(item => {
            // item = item.map(item => {                    // for postman
            return {
              ...item,
              balance_qty: item.quantity,
            };
          });

          const addPOItem = await Transaction.updateOne(
            { _id: id },
            {
              $push: {
                items_details: {
                  $each: items_details, // for postman
                },
                // items_details: {
                // $each: item
                // }
              },
            }
          );

          if (addPOItem.modifiedCount === 1) {
            sendResponse(res, 200, true, {}, `Purchase order item added successfully`);
          } else {
            sendResponse(res, 400, false, {}, `Purchase order item not added`);
          }
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.listPO = async (req, res) => {
  // const { tag_number, firm_id, year_id, filter, search } = req.body;
  const { tag_number, year_id, filter, search } = req.body;
  if (req.user && !req.error) {
    try {
      if (tag_number) {
        const tag_id = await tagId(tag_number);

        // const { date } = filter;
        const filter1 = JSON.parse(filter)             //react
        const { date } = filter1;

        const date_start = date && date.start ? new Date(date.start) : new Date("1947-08-15");

        let date_end = date ? (date.end ? new Date(date.end) : new Date()) : new Date();
        date_end.setHours(23, 59, 59, 999);
        const timezoneOffset = date_end.getTimezoneOffset() * 60000;
        date_end = new Date(date_end.getTime() - timezoneOffset);

        const search_by = search ? search.replace(/[^0-9a-zA-Z]/g, "\\$&") : "";

        let matchObj = {
          deleted: false,
          tag_id: tag_id,
          // firm_id: new ObjectId(firm_id),
          // year_id: new ObjectId(year_id),
          trans_date: {
            $gte: new Date(date_start),
            $lte: new Date(date_end),
          },
        }

        // firm_id and year_id if provided
        // if (firm_id) matchObj.firm_id = new ObjectId(firm_id);
        if (year_id) matchObj.year_id = new ObjectId(year_id);


        let matchObj1 = {};

        if (search_by != "") {
          matchObj1 = {
            $or: [
              { voucher_no: { $regex: search_by, $options: "i" } },
              { "party_data.name": { $regex: search_by, $options: "i" } },
              { "project_data.name": { $regex: search_by, $options: "i" } },
            ],
          };
        }

        const listPO = await Transaction.aggregate([
          { $match: matchObj },
          {
            $lookup: {
              from: "masters",
              localField: "master_id",
              foreignField: "_id",
              as: "masterDetails",
            },
          },
          {
            $lookup: {
              from: "store-parties",
              localField: "party_id",
              foreignField: "_id",
              as: "partyDetails",
            },
          },
          {
            $lookup: {
              from: "bussiness-projects",
              localField: "project_id",
              foreignField: "_id",
              as: "projectDetails",
            },
          },
          {
            $addFields: {
              create_by: {
                _id: { $arrayElemAt: ["$masterDetails._id", 0] },
                name: { $arrayElemAt: ["$masterDetails.name", 0] },
              },
              party_data: {
                _id: { $arrayElemAt: ["$partyDetails._id", 0] },
                name: { $arrayElemAt: ["$partyDetails.name", 0] },
              },
              customer_data: {
                _id: { $arrayElemAt: ["$customerDetails._id", 0] },
                name: { $arrayElemAt: ["$customerDetails.name", 0] },
              },
              project_data: {
                _id: { $arrayElemAt: ["$projectDetails._id", 0] },
                name: { $arrayElemAt: ["$projectDetails.name", 0] },
              },
              item_count: {
                $size: {
                  $filter: {
                    input: "$items_details",
                    as: "item",
                    cond: { $eq: ["$$item.deleted", false] },
                  },
                },
              },
            },
          },
          { $match: matchObj1 },
          {
            $sort: { voucher_no: -1 },
          },
          {
            $project: {
              masterDetails: 0,
              partyDetails: 0,
              projectDetails: 0,
              items_details: 0,
              payment_date: 0,
              payment_days: 0,
              site_location: 0,
              store_location: 0,
              department: 0,
              bill_no: 0,
              isexternal: 0,
              machine_code: 0,
              party_id: 0,
              master_id: 0,
              project_id: 0,
              admin_id: 0,
              tag_id: 0,
              round_amount: 0,
              pdf: 0,
              transport_id: 0,
              transport_date: 0,
              lr_no: 0,
              lr_date: 0,
              vehical_no: 0,
              po_no: 0,
              challan_no: 0,
              gate_pass_no: 0,
              issue_no: 0,
              address: 0,
              return_id: 0,
              deleted: 0,
              receive_date: 0,
              createdAt: 0,
              updatedAt: 0,
              __v: 0,
            },
          },
        ]);

        if (listPO.length > 0) {
          sendResponse(res, 200, true, listPO, `PO list`);
        } else {
          sendResponse(res, 200, true, [], `PO not found`);
        }
      } else {
        return sendResponse(res, 400, false, [], "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.onePO = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      if (id) {
        const onePO = await Transaction.aggregate([
          {
            $match: { _id: new ObjectId(id) },
          },
          {
            $project: {
              items_details: {
                $filter: {
                  input: "$items_details",
                  as: "item",
                  cond: { $eq: ["$$item.deleted", false] },
                },
              },
            },
          },
          {
            $lookup: {
              from: "store-items",
              let: { items: "$items_details" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: [
                        "$_id",
                        {
                          $map: {
                            input: "$$items",
                            as: "item",
                            in: "$$item.item_id",
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    item_id: "$_id",
                    item_name: "$name",
                  },
                },
              ],
              as: "items_data",
            },
          },
          {
            $addFields: {
              items_details: {
                $map: {
                  input: "$items_details",
                  as: "item",
                  in: {
                    $let: {
                      vars: {
                        itemData: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$items_data",
                                as: "data",
                                cond: {
                                  $eq: ["$$data.item_id", "$$item.item_id"],
                                },
                              },
                            },
                            0,
                          ],
                        },

                      },
                      in: {
                        $mergeObjects: [
                          "$$item",
                          { item_name: { $ifNull: ["$$itemData.item_name", null] } },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
          {
            $project: {
              items_data: 0,
              "items_details.status": 0,
              "items_details.deleted": 0,
              "items_details.category_id": 0,
              "items_details.item_brand": 0,
              "items_details.required_qty": 0,
              "items_details.pr_party": 0,
              "items_details.amount": 0,
              "items_details.discount": 0,
              "items_details.discount_amount": 0,
              "items_details.sp_discount": 0,
              "items_details.sp_discount_amount": 0,
              "items_details.taxable_amount": 0,
              "items_details.gst": 0,
              "items_details.gst_amount": 0,
              "items_details.total_amount": 0,
              "items_details.return_qty": 0,
            },
          },
        ]);


        if (onePO && onePO.length > 0) {
          sendResponse(res, 200, true, onePO[0], `PO found successfully`);
        } else {
          sendResponse(res, 200, true, {}, `PO not found`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.deletePO = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      if (id) {
        const deletePO = await Transaction.findByIdAndUpdate(id, { deleted: true }, { new: true });

        if (deletePO) {
          await manageMainObjBalanceQty(deletePO.items_details, false)
          sendResponse(res, 200, true, {}, `PR deleted successfully`);
        } else {
          sendResponse(res, 400, false, {}, `PR not delete`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.deletePOItem = async (req, res) => {
  const { id, itemId } = req.body;
  if (req.user && !req.error) {
    try {
      if (id) {
        const deletePOItem = await Transaction.updateOne(
          { _id: id, "items_details._id": itemId },
          {
            $set: {
              "items_details.$.deleted": true,
            },
          },
          { new: true }
        )

        if (deletePOItem.modifiedCount > 0) {
          const deleteItem = await Transaction.findOne(
            { _id: id, "items_details._id": itemId },
            { "items_details.$": 1 }
          );
          manageMainObjBalanceQty(deleteItem.items_details, false)
          sendResponse(res, 200, true, {}, `PO item deleted successfully`);
        } else {
          sendResponse(res, 400, false, {}, `PO item not delete`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.updatePO = async (req, res) => {
  const {
    id,
    trans_date,
    project_id,
    party_id,
    master_id,
  } = req.body;

  if (req.user && !req.error) {
    try {
      if (id) {
        const updatePO = await Transaction.findByIdAndUpdate(
          id,
          {
            trans_date,
            project_id,
            party_id,
            master_id,
          },
          { new: true }
        );

        if (updatePO) {
          sendResponse(res, 200, true, updatePO, `PO update successfully`);
        } else {
          sendResponse(res, 400, false, {}, `PO not update`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.updatePOItem = async (req, res) => {
  const {
    id,
    item_detail_id,   // item detail object id
    items_details
  } = req.body;

  if (req.user && !req.error) {
    try {
      if (id) {
        const updatePOItem = await Transaction.updateOne(
          { _id: id, "items_details._id": item_detail_id },
          {
            $set: {
              "items_details.$.rate": items_details.rate,
              "items_details.$.remarks": items_details.remarks,
            },
          }
        )

        if (updatePOItem.modifiedCount > 0) {
          sendResponse(res, 200, true, {}, `PO item update successfully`);
        } else {
          sendResponse(res, 400, false, {}, `PO item not update`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.listPONumber = async (req, res) => {
  // const { tag_number, party_id, project_id, firm_id, year_id } = req.body;
  const { tag_number, party_id, project_id, year_id } = req.body;
  if (req.user && !req.error) {
    try {
      // if (tag_number && party_id && project_id && firm_id && year_id) {
      if (tag_number && party_id && project_id && year_id) {
        const tag_id = await tagId(tag_number);
        const listPONO = await Transaction.aggregate([
          {
            $match: {
              deleted: false,
              tag_id: new ObjectId(tag_id),
              party_id: new ObjectId(party_id),
              project_id: new ObjectId(project_id),
              // firm_id: new ObjectId(firm_id),
              year_id: new ObjectId(year_id),
            },
          },
          { $unwind: "$items_details" },
          {
            $match: {
              "items_details.deleted": { $ne: true },
              "items_details.balance_qty": { $gt: 0 },
            },
          },
          {
            $group: {
              _id: "$voucher_no",
              voucher_no: { $first: "$voucher_no" },
            },
          },
          {
            $sort: {
              voucher_no: -1,
            },
          },
          {
            $project: {
              _id: 0,
              voucher_no: 1,
            },
          },
        ]);

        if (listPONO.length > 0) {
          sendResponse(res, 200, true, listPONO, `PO numberlist`);
        } else {
          sendResponse(res, 200, true, [], `PO number not found`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

const PODownload = async (id) => {
  try {
    const requestData = await Transaction.aggregate([
      { $match: { deleted: false, _id: new ObjectId(id) } },
      { $unwind: "$items_details" },
      {
        $match: {
          "items_details.deleted": { $ne: true },
        },
      },
      {
        $lookup: {
          from: "masters",
          localField: "master_id",
          foreignField: "_id",
          as: "masterDetails",
        },
      },
      {
        $lookup: {
          from: "store-parties",
          localField: "party_id",
          foreignField: "_id",
          as: "partyDetails",
        },
      },
      {
        $lookup: {
          from: "bussiness-projects",
          localField: "project_id",
          foreignField: "_id",
          as: "projectDetails",
        },
      },
      {
        $lookup: {
          from: "store-items",
          localField: "items_details.item_id",
          foreignField: "_id",
          as: "itemDetails",
        },
      },
      {
        $addFields: {
          po_by: { $arrayElemAt: ["$masterDetails.name", 0] },
          party_name: { $arrayElemAt: ["$partyDetails.name", 0] },
          project_name: { $arrayElemAt: ["$projectDetails.name", 0] },
          item_name: { $arrayElemAt: ["$itemDetails.name", 0] },
          material_grade: { $arrayElemAt: ["$itemDetails.material_grade", 0] },
          mcode: { $arrayElemAt: ["$itemDetails.mcode", 0] },
        },
      },
      {
        $project: {
          _id: 1,
          trans_date: "$trans_date",
          voucher_no: "$voucher_no",
          po_by: "$po_by",
          party_name: "$party_name",
          project_name: "$project_name",
          items: {
            _id: "$items_details._id",
            item_name: "$item_name",
            unit: "$items_details.unit",
            mcode: "$mcode",
            material_grade: "$material_grade",
            quantity: "$items_details.quantity",
            rate: "$items_details.rate",
            remarks: "$items_details.remarks",
          },
        },
      },
      {
        $group: {
          _id: {
            _id: "$_id",
            trans_date: "$trans_date",
            voucher_no: "$voucher_no",
            po_by: "$po_by",
            party_name: "$party_name",
            project_name: "$project_name",
          },
          items: { $push: "$items" },
        },
      },
      {
        $project: {
          _id: "$_id._id",
          trans_date: "$_id.trans_date",
          voucher_no: "$_id.voucher_no",
          po_by: "$_id.po_by",
          party_name: "$_id.party_name",
          project_name: "$_id.project_name",
          items: 1,
        },
      },
    ]);
    if (requestData.length && requestData.length > 0) {
      return { status: 1, result: requestData };
    } else {
      return { status: 0, result: [] };
    }
  } catch (error) {
    return { status: 2, result: error };
  }
};

exports.PODownloadList = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await PODownload(id)
      if (data.status === 1) {
        sendResponse(res, 200, true, data.result, `Purchase order found`);
      } else if (data.status === 0) {
        sendResponse(res, 200, true, [], `Purchase order not found`);
      } else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.PODownloadPDF = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await PODownload(id)
      const requestData = data.result[0];

      if (data.status === 1) {

        let headerInfo = {
          po_date: requestData?.trans_date,
          po_no: requestData?.voucher_no,
          po_by: requestData?.po_by,
          party_name: requestData?.party_name,
          project_name: requestData?.project_name,
        }

        const template = fs.readFileSync(
          "templates/onePO.html",
          "utf-8"
        );
        const renderedHtml = ejs.render(template, {
          headerInfo,
          items: requestData?.items,
          logoUrl1: process.env.LOGO_URL_1,
          logoUrl2: process.env.LOGO_URL_2,
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

        const pdfBuffer = await generatePDF(page, { print_date: true });

        await browser.close();

        const pdfsDir = path.join(__dirname, "../../../pdfs");
        if (!fs.existsSync(pdfsDir)) {
          fs.mkdirSync(pdfsDir);
        }

        const filename = `purchase_order_${Date.now()}.pdf`;
        const filePath = path.join(__dirname, "../../../pdfs", filename);

        fs.writeFileSync(filePath, pdfBuffer);

        const fileUrl = `${URI}/pdfs/${filename}`;

        sendResponse(res, 200, true, { file: fileUrl }, "PDF downloaded Successfully"
        );

      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Purchase order report not found`)
      }
      else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong111");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};




//Purchase

exports.listPOItemForPU = async (req, res) => {
  // const { firm_id, year_id, party_id, project_id, po_no, tag_number } = req.body;
  const { year_id, party_id, project_id, po_no, tag_number } = req.body;
  if (req.user && !req.error) {
    try {
      // if (party_id && project_id && firm_id && year_id) {
      if (party_id && project_id && year_id) {
        let matchObj = {}

        if (po_no.length > 0) {
          matchObj = {
            voucher_no: { $in: po_no },
          };
        }

        const tag_id = await tagId(tag_number);

        let POItemForPU = await Transaction.aggregate([
          { $unwind: "$items_details" },
          {
            $match: {
              deleted: false,
              // firm_id: new ObjectId(firm_id),
              year_id: new ObjectId(year_id),
              party_id: new ObjectId(party_id),
              project_id: new ObjectId(project_id),
              tag_id: tag_id,
              "items_details.deleted": { $ne: true },
              "items_details.balance_qty": { $gt: 0 },
            }
          },
          { $match: matchObj },
          {
            $lookup: {
              from: "store-items",
              localField: "items_details.item_id",
              foreignField: "_id",
              as: "item_data"
            }
          },
          { $unwind: { path: "$item_data", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "masters",
              localField: "items_details.category_id",
              foreignField: "_id",
              as: "category_data"
            }
          },
          { $unwind: { path: "$category_data", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              from_id: "$_id",
              po_no: "$voucher_no",
              detail_id: "$items_details._id",
              item_data: {
                _id: "$item_data._id",
                name: "$item_data.name",
              },
              // unit: "$items_details.unit",
              quantity: "$items_details.balance_qty",
              rate: "$items_details.rate",
            }
          }
        ]);

        if (POItemForPU && POItemForPU.length > 0) {
          sendResponse(res, 200, true, POItemForPU, `PO Item found for PU successfully`);
        } else {
          sendResponse(res, 200, true, [], `PO Item not found for PU`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.addPU = async (req, res) => {
  let {
    // firm_id,
    year_id,
    trans_date,
    tag_number,
    party_id,
    customer_id,
    bill_no,
    challan_no,
    project_id,
    master_id,      //reciver_name
    receive_date,
    transport_id,
    transport_date,
    vehical_no,
    payment_date,
    payment_days,
    lr_no,
    lr_date,
    po_no,
    pdf,
    driver_name,
    items_details,
    is_auto,
  } = req.body;

  if (req.user && !req.error) {
    try {
      if (
        (bill_no || challan_no) &&
        // firm_id &&
        year_id &&
        trans_date &&
        project_id &&
        party_id &&
        customer_id &&
        transport_id &&
        tag_number &&
        // po_no &&
        pdf &&
        items_details.length
      ) {
        // for checking the  PO number auto and manual issue
        // if (is_auto === true && !po_no) {
        //   return sendResponse(res, 400, false, {}, "Please select PO No.");
        // }

        if (!ObjectId.isValid(year_id)) {
          return sendResponse(res, 400, false, {}, "Invalid year_id format");
        }
        const tag_id = await tagId(tag_number);

        const voucher_no = await VoucherGen();

        items_details = items_details.map(item => {
          return {
            ...item,
            balance_qty: item.quantity,
            year_id: new ObjectId(year_id)
          };
        });

        let addPU = await Transaction.create({
          // firm_id,
          year_id,
          trans_date,
          tag_id,
          voucher_no,
          party_id,
          customer_id,
          bill_no,
          challan_no,
          project_id,
          master_id,      //reciver_name
          receive_date,
          transport_id,
          transport_date,
          vehical_no,
          payment_date,
          payment_days,
          lr_no,
          lr_date,
          po_no,
          pdf,
          driver_name,
          items_details
        });

        if (addPU) {
          for (const o of items_details) {
            await manageMSitemStock(o.item_id, addPU._id, addPU.tag_id, o.quantity, true, addPU.year_id);
          }
          await manageMainObjBalanceQty(addPU.items_details, true)             // Main obj balance qty manage
          await manageTransactionItemStatus(addPU.items_details)               // Obj item status manage
          await manageTransactionStatus(addPU.items_details)

          sendResponse(res, 200, true, addPU, `PU added successfully`);
        } else {
          sendResponse(res, 400, false, {}, `PU not added`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log("pupupu", error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.addPUItem = async (req, res) => {
  let { id, items_details } = req.body

  if (req.user && !req.error) {
    try {
      // const item = JSON.parse(items_details);
      if (
        id &&
        items_details.length //for postman
        // item.length
      ) {
        let existTransaction = await Transaction.findById(id);

        if (!existTransaction) {
          sendResponse(
            res,
            400,
            false,
            {},
            `No purchase with this id exist`
          );
        } else {

          items_details = items_details.map(item => {
            // item = item.map(item => {                    // for postman
            return {
              ...item,
              balance_qty: item.quantity,
            };
          });

          const addPUItem = await Transaction.updateOne(
            { _id: id },
            {
              $push: {
                items_details: {
                  $each: items_details, // for postman
                },
                // items_details: {
                // $each: item
                // }
              },
            }
          );

          if (addPUItem.modifiedCount === 1) {
            for (const o of items_details) {
              await manageMSitemStock(o.item_id, id, existTransaction.tag_id, o.quantity, true);
            }
            sendResponse(res, 200, true, {}, `Purchase item added successfully`);
          } else {
            sendResponse(res, 400, false, {}, `Purchase item not added`);
          }
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.listPU = async (req, res) => {
  // const { tag_number, firm_id, year_id, search, filter } = req.body;
  const { tag_number, year_id, search, filter } = req.body;
  if (req.user && !req.error) {
    try {

      if (tag_number) {
        const tag_id = await tagId(tag_number);

        // const { date } = filter;
        const filter1 = JSON.parse(filter)             //react
        const { date } = filter1;


        const date_start = date && date.start ? new Date(date.start) : new Date("1947-08-15");

        let date_end = date ? (date.end ? new Date(date.end) : new Date()) : new Date();
        date_end.setHours(23, 59, 59, 999);
        const timezoneOffset = date_end.getTimezoneOffset() * 60000;
        date_end = new Date(date_end.getTime() - timezoneOffset);

        const search_by = search ? search.replace(/[^0-9a-zA-Z]/g, "\\$&") : "";

        let matchObj = {
          deleted: false,
          tag_id: tag_id,
          // firm_id: new ObjectId(firm_id),
          // year_id: new ObjectId(year_id),
          trans_date: {
            $gte: new Date(date_start),
            $lte: new Date(date_end),
          },
        }

        // firm_id and year_id if provided
        // if (firm_id) matchObj.firm_id = new ObjectId(firm_id);
        if (year_id) matchObj.year_id = new ObjectId(year_id);

        let matchObj1 = {};

        if (search_by != "") {
          matchObj1 = {
            $or: [
              { voucher_no: { $regex: search_by, $options: "i" } },
              { bill_no: { $regex: search_by, $options: "i" } },
              { challan_no: { $regex: search_by, $options: "i" } },
              { "party_data.name": { $regex: search_by, $options: "i" } },
              { "project_data.name": { $regex: search_by, $options: "i" } },
            ],
          };
        }

        const listPU = await Transaction.aggregate([
          { $match: matchObj },
          {
            $lookup: {
              from: "masters",
              localField: "master_id",
              foreignField: "_id",
              as: "masterDetails",
            },
          },
          {
            $lookup: {
              from: "store-parties",
              localField: "party_id",
              foreignField: "_id",
              as: "partyDetails",
            },
          },
          {
            $lookup: {
              from: "firms",
              localField: "customer_id",
              foreignField: "_id",
              as: "customerDetails",
            },
          },
          {
            $lookup: {
              from: "bussiness-projects",
              localField: "project_id",
              foreignField: "_id",
              as: "projectDetails",
            },
          },
          {
            $lookup: {
              from: "store-transports",
              localField: "transport_id",
              foreignField: "_id",
              as: "transportDetails",
            },
          },
          {
            $addFields: {
              received_by: {
                _id: { $arrayElemAt: ["$masterDetails._id", 0] },
                name: { $arrayElemAt: ["$masterDetails.name", 0] },
              },
              party_data: {
                _id: { $arrayElemAt: ["$partyDetails._id", 0] },
                name: { $arrayElemAt: ["$partyDetails.name", 0] },
              },
              customer_data: {
                _id: { $arrayElemAt: ["$customerDetails._id", 0] },
                name: { $arrayElemAt: ["$customerDetails.name", 0] },
              },
              project_data: {
                _id: { $arrayElemAt: ["$projectDetails._id", 0] },
                name: { $arrayElemAt: ["$projectDetails.name", 0] },
              },
              transport_data: {
                _id: { $arrayElemAt: ["$transportDetails._id", 0] },
                name: { $arrayElemAt: ["$transportDetails.name", 0] },
              },
              item_count: {
                $size: {
                  $filter: {
                    input: "$items_details",
                    as: "item",
                    cond: { $eq: ["$$item.deleted", false] },
                  },
                },
              },
            },
          },
          { $match: matchObj1 },
          {
            $sort: { voucher_no: -1 },
          },
          {
            $project: {
              masterDetails: 0,
              partyDetails: 0,
              customerDetails: 0,
              projectDetails: 0,
              transportDetails: 0,
              items_details: 0,
              site_location: 0,
              store_location: 0,
              department: 0,
              party_id: 0,
              customer_id: 0,
              master_id: 0,
              project_id: 0,
              admin_id: 0,
              tag_id: 0,
              transport_id: 0,
              issue_no: 0,
              address: 0,
              return_id: 0,
              deleted: 0,
              createdAt: 0,
              updatedAt: 0,
              __v: 0,
            },
          },
        ]);


        if (listPU.length > 0) {
          sendResponse(res, 200, true, listPU, `PU list`);
        } else {
          sendResponse(res, 200, true, [], `PU not found`);
        }
      } else {
        return sendResponse(res, 400, false, [], "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.onePU = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      if (id) {
        const onePU = await Transaction.aggregate([
          {
            $match: { _id: new ObjectId(id) },
          },
          {
            $project: {
              items_details: {
                $filter: {
                  input: "$items_details",
                  as: "item",
                  cond: { $eq: ["$$item.deleted", false] },
                },
              },
            },
          },
          {
            $lookup: {
              from: "store-items",
              let: { items: "$items_details" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: [
                        "$_id",
                        {
                          $map: {
                            input: "$$items",
                            as: "item",
                            in: "$$item.item_id",
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    item_id: "$_id",
                    item_name: "$name",
                  },
                },
              ],
              as: "items_data",
            },
          },
          {
            $addFields: {
              items_details: {
                $map: {
                  input: "$items_details",
                  as: "item",
                  in: {
                    $let: {
                      vars: {
                        itemData: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$items_data",
                                as: "data",
                                cond: {
                                  $eq: ["$$data.item_id", "$$item.item_id"],
                                },
                              },
                            },
                            0,
                          ],
                        },

                      },
                      in: {
                        $mergeObjects: [
                          "$$item",
                          { item_name: { $ifNull: ["$$itemData.item_name", null] } },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
          {
            $project: {
              items_data: 0,
              "items_details.status": 0,
              "items_details.deleted": 0,
              "items_details.category_id": 0,
              "items_details.item_brand": 0,
              "items_details.required_qty": 0,
              "items_details.pr_party": 0,
            },
          },
        ]);


        if (onePU && onePU.length > 0) {
          sendResponse(res, 200, true, onePU[0], `PU found successfully`);
        } else {
          sendResponse(res, 200, true, {}, `PU not found`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.deletePU = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      if (id) {
        const deletePU = await Transaction.findByIdAndUpdate(id, { deleted: true }, { new: true });

        if (deletePU) {
          await Promise.all(
            deletePU.items_details.map(
              async (o) =>
                await manageMSitemStockUpdate(o.item_id, id, -o.quantity, true)
            )
          );
          await manageMainObjBalanceQty(deletePU.items_details, false)
          sendResponse(res, 200, true, {}, `PU deleted successfully`);
        } else {
          sendResponse(res, 400, false, {}, `PU not delete`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.deletePUItem = async (req, res) => {
  const { id, itemId } = req.body;
  if (req.user && !req.error) {
    try {
      if (id) {
        const deletePUItem = await Transaction.updateOne(
          { _id: id, "items_details._id": itemId },
          {
            $set: {
              "items_details.$.deleted": true,
            },
          },
          { new: true }
        )

        if (deletePUItem.modifiedCount > 0) {
          const deleteItem = await Transaction.findOne(
            { _id: id, "items_details._id": itemId },
            { "items_details.$": 1 }
          );
          await manageMSitemStockUpdate(deleteItem.items_details[0].item_id, deleteItem._id, -deleteItem.items_details[0].quantity, true);
          manageMainObjBalanceQty(deleteItem.items_details, false)
          sendResponse(res, 200, true, {}, `PU item deleted successfully`);
        } else {
          sendResponse(res, 400, false, {}, `PU item not delete`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.updatePU = async (req, res) => {
  const {
    id,
    trans_date,
    bill_no,
    challan_no,
    master_id,      //reciver_name
    receive_date,
    transport_id,
    transport_date,
    vehical_no,
    payment_date,
    payment_days,
    lr_no,
    lr_date,
    pdf,
    driver_name,
  } = req.body;

  if (req.user && !req.error) {
    try {
      if (id) {
        const updatePU = await Transaction.findByIdAndUpdate(
          id,
          {
            trans_date,
            bill_no,
            challan_no,
            master_id,      //reciver_name
            receive_date,
            transport_id,
            transport_date,
            vehical_no,
            payment_date,
            payment_days,
            lr_no,
            lr_date,
            pdf,
            driver_name,
          },
          { new: true }
        );

        if (updatePU) {
          sendResponse(res, 200, true, updatePU, `PU update successfully`);
        } else {
          sendResponse(res, 400, false, {}, `PU not update`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.updatePUItem = async (req, res) => {
  const {
    id,
    item_detail_id,   // item detail object id
    items_details
  } = req.body;

  if (req.user && !req.error) {
    try {
      if (id) {
        const updatePUItem = await Transaction.updateOne(
          { _id: id, "items_details._id": item_detail_id },
          {
            $set: {
              "items_details.$.rate": items_details.rate,
              "items_details.$.amount": items_details.amount,
              "items_details.$.discount": items_details.discount,
              "items_details.$.discount_amount": items_details.discount_amount,
              "items_details.$.sp_discount": items_details.sp_discount,
              "items_details.$.sp_discount_amount": items_details.sp_discount_amount,
              "items_details.$.taxable_amount": items_details.taxable_amount,
              "items_details.$.gst": items_details.gst,
              "items_details.$.gst_amount": items_details.gst_amount,
              "items_details.$.total_amount": items_details.total_amount,
              "items_details.$.remarks": items_details.remarks,
            },
          }
        )

        if (updatePUItem.modifiedCount > 0) {
          sendResponse(res, 200, true, {}, `PU item update successfully`);
        } else {
          sendResponse(res, 400, false, {}, `PU item not update`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.listPUNumber = async (req, res) => {
  // const { tag_number, firm_id, year_id } = req.body;
  const { tag_number, year_id } = req.body;
  if (req.user && !req.error) {
    try {
      // if (tag_number && firm_id && year_id) {
      if (tag_number && year_id) {
        const tag_id = await tagId(tag_number);
        const listPUNO = await Transaction.aggregate([
          {
            $match: {
              deleted: false,
              // firm_id: new ObjectId(firm_id),
              year_id: new ObjectId(year_id),
              tag_id: new ObjectId(tag_id),
            },
          },
          { $unwind: "$items_details" },
          {
            $match: {
              "items_details.deleted": { $ne: true },
              "items_details.balance_qty": { $gt: 0 },
            },
          },
          {
            $group: {
              _id: "$voucher_no",
              voucher_no: { $first: "$voucher_no" },
            },
          },
          {
            $sort: {
              voucher_no: -1,
            },
          },
          {
            $project: {
              _id: 0,
              voucher_no: 1,
            },
          },
        ]);

        if (listPUNO.length > 0) {
          sendResponse(res, 200, true, listPUNO, `PU numberlist`);
        } else {
          sendResponse(res, 200, true, {}, `PU number not found`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.listPUBillNumber = async (req, res) => {
  // const { party_id, tag_number, firm_id, year_id } = req.body;
  const { party_id, tag_number, year_id } = req.body;
  if (req.user && !req.error) {
    try {
      // if (tag_number && party_id && firm_id && year_id) {
      if (tag_number && party_id && year_id) {
        const tag_id = await tagId(tag_number);

        const listPUBillNO = await Transaction.aggregate([
          {
            $match: {
              deleted: false,
              tag_id: new ObjectId(tag_id),
              party_id: new ObjectId(party_id),
              // firm_id: new ObjectId(firm_id),
              year_id: new ObjectId(year_id)
            }
          },
          { $unwind: "$items_details" },
          {
            $match: {
              "items_details.deleted": { $ne: true },
              "items_details.balance_qty": { $gt: 0 },
            },
          },
          {
            $group: {
              _id: "$_id",
              bill_no: { $first: "$bill_no" },
            },
          },
          {
            $sort: {
              voucher_no: -1,
            },
          },
          {
            $project: {
              _id: 1,
              bill_no: 1,
            },
          },
        ]);


        if (listPUBillNO.length > 0) {
          sendResponse(res, 200, true, listPUBillNO, `PU Bill numberlist`);
        } else {
          sendResponse(res, 200, true, [], `PU Bill number not found`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.listPUChallanNumber = async (req, res) => {
  // const { party_id, tag_number, firm_id, year_id } = req.body;
  const { party_id, tag_number, year_id } = req.body;
  if (req.user && !req.error) {
    try {
      // if (tag_number && party_id && firm_id && year_id) {
      if (tag_number && party_id && year_id) {
        const tag_id = await tagId(tag_number);

        const listPUChallanNO = await Transaction.aggregate([
          {
            $match: {
              deleted: false,
              tag_id: new ObjectId(tag_id),
              party_id: new ObjectId(party_id),
              // firm_id: new ObjectId(firm_id),
              year_id: new ObjectId(year_id)
            }
          },
          { $unwind: "$items_details" },
          {
            $match: {
              "items_details.deleted": { $ne: true },
              "items_details.balance_qty": { $gt: 0 },
            },
          },
          {
            $group: {
              _id: "$challan_no",
              challan_no: { $first: "$challan_no" },
            },
          },
          {
            $sort: {
              voucher_no: -1,
            },
          },
          {
            $project: {
              _id: 0,
              challan_no: 1,
            },
          },
        ]);


        if (listPUChallanNO.length > 0) {
          sendResponse(res, 200, true, listPUChallanNO, `PU Challan numberlist`);
        } else {
          sendResponse(res, 200, true, [], `PU Challan number not found`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

const PUDownload = async (id) => {
  try {
    const requestData = await Transaction.aggregate([
      { $match: { deleted: false, _id: new ObjectId(id) } },
      { $unwind: "$items_details" },
      {
        $match: {
          "items_details.deleted": { $ne: true },
        },
      },
      {
        $lookup: {
          from: "masters",
          localField: "master_id",
          foreignField: "_id",
          as: "masterDetails",
        },
      },
      {
        $lookup: {
          from: "store-parties",
          localField: "party_id",
          foreignField: "_id",
          as: "partyDetails",
        },
      },
      {
        $lookup: {
          from: "bussiness-projects",
          localField: "project_id",
          foreignField: "_id",
          as: "projectDetails",
        },
      },
      {
        $lookup: {
          from: "firms",
          localField: "customer_id",
          foreignField: "_id",
          as: "customerDetails",
        },
      },
      {
        $lookup: {
          from: "store-transports",
          localField: "transport_id",
          foreignField: "_id",
          as: "transportDetails",
        },
      },
      {
        $lookup: {
          from: "store-items",
          localField: "items_details.item_id",
          foreignField: "_id",
          as: "itemDetails",
        },
      },
      {
        $addFields: {
          receive_by: { $arrayElemAt: ["$masterDetails.name", 0] },
          party_name: { $arrayElemAt: ["$partyDetails.name", 0] },
          customer_name: { $arrayElemAt: ["$customerDetails.name", 0] },
          project_name: { $arrayElemAt: ["$projectDetails.name", 0] },
          transport_name: { $arrayElemAt: ["$transportDetails.name", 0] },
          item_name: { $arrayElemAt: ["$itemDetails.name", 0] },
          mcode: { $arrayElemAt: ["$itemDetails.mcode", 0] },
        },
      },
      {
        $project: {
          _id: 1,
          trans_date: "$trans_date",
          voucher_no: "$voucher_no",
          bill_no: "$bill_no",
          receive_by: "$receive_by",
          receive_date: "$receive_date",
          party_name: "$party_name",
          customer_name: "$customer_name",
          project_name: "$project_name",
          transport_name: "$transport_name",
          transport_date: "$transport_date",
          vehical_no: "$vehical_no",
          po_no: "$po_no",
          challan_no: "$challan_no",
          lr_no: "$lr_no",
          lr_date: "$lr_date",
          payment_days: "$payment_days",
          payment_date: "$payment_date",
          driver_name: "$driver_name",
          round_amount: "$round_amount",
          items: {
            _id: "$items_details._id",
            item_name: "$item_name",
            unit: "$items_details.unit",
            mcode: "$mcode",
            quantity: "$items_details.quantity",
            rate: "$items_details.rate",
            amount: "$items_details.amount",
            discount: "$items_details.discount",
            discount_amount: "$items_details.discount_amount",
            sp_discount: "$items_details.sp_discount",
            sp_discount_amount: "$items_details.sp_discount_amount",
            taxable_amount: "$items_details.taxable_amount",
            gst: "$items_details.gst",
            gst_amount: "$items_details.gst_amount",
            total_amount: "$items_details.total_amount",
            remarks: "$items_details.remarks",
          },
        },
      },
      {
        $group: {
          _id: {
            _id: "$_id",
            trans_date: "$trans_date",
            voucher_no: "$voucher_no",
            bill_no: "$bill_no",
            receive_by: "$receive_by",
            receive_date: "$receive_date",
            party_name: "$party_name",
            customer_name: "$customer_name",
            project_name: "$project_name",
            transport_name: "$transport_name",
            transport_date: "$transport_date",
            vehical_no: "$vehical_no",
            po_no: "$po_no",
            challan_no: "$challan_no",
            lr_no: "$lr_no",
            lr_date: "$lr_date",
            payment_days: "$payment_days",
            payment_date: "$payment_date",
            driver_name: "$driver_name",
            round_amount: "$round_amount",
          },
          items: { $push: "$items" },
          total_qty: { $sum: "$items.quantity" },
          amt: { $sum: "$items.amount" },
          dis_amt: { $sum: "$items.discount_amount" },
          sp_dis_amt: { $sum: "$items.sp_discount_amount" },
          tax_amt: { $sum: "$items.taxable_amount" },
          gst_amt: { $sum: "$items.gst_amount" },
          total_amt: { $sum: "$items.total_amount" },
        },
      },
      {
        $addFields: {
          net_amt: {
            $sum: [
              "$total_amt",
              { $ifNull: ["$_id.round_amount", 0] }
            ]
          }
        }
      },
      {
        $project: {
          _id: "$_id._id",
          voucher_no: "$_id.voucher_no",
          bill_no: "$_id.bill_no",
          trans_date: "$_id.trans_date",
          party_name: "$_id.party_name",
          customer_name: "$_id.customer_name",
          project_name: "$_id.project_name",
          challan_no: "$_id.challan_no",
          receive_by: "$_id.receive_by",
          receive_date: "$_id.receive_date",
          po_no: "$_id.po_no",
          transport_name: "$_id.transport_name",
          transport_date: "$_id.transport_date",
          vehical_no: "$_id.vehical_no",
          lr_no: "$_id.lr_no",
          lr_date: "$_id.lr_date",
          driver_name: "$_id.driver_name",
          payment_days: "$_id.payment_days",
          payment_date: "$_id.payment_date",
          round_amount: "$_id.round_amount",
          items: 1,
          total_qty: 1,
          amt: 1,
          dis_amt: 1,
          sp_dis_amt: 1,
          tax_amt: 1,
          gst_amt: 1,
          total_amt: 1,
          net_amt: 1,
        },
      },
    ]);
    if (requestData.length && requestData.length > 0) {
      return { status: 1, result: requestData };
    } else {
      return { status: 0, result: [] };
    }
  } catch (error) {
    return { status: 2, result: error };
  }
};

exports.PUDownloadList = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await PUDownload(id)
      if (data.status === 1) {
        sendResponse(res, 200, true, data.result, `Purchase found`);
      } else if (data.status === 0) {
        sendResponse(res, 200, true, [], `Purchase not found`);
      } else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.PUDownloadPDF = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await PUDownload(id)
      const requestData = data.result[0];

      if (data.status === 1) {

        let headerInfo = {
          total_qty: requestData?.total_qty,
          amt: requestData?.amt,
          dis_amt: requestData?.dis_amt,
          sp_dis_amt: requestData?.sp_dis_amt,
          tax_amt: requestData?.tax_amt,
          gst_amt: requestData?.gst_amt,
          total_amt: requestData?.total_amt,
          net_amt: requestData?.net_amt,
          pu_date: requestData?.trans_date,
          pu_no: requestData?.voucher_no,
          bill_no: requestData?.bill_no,
          receive_by: requestData?.receive_by,
          receive_date: requestData?.receive_date,
          party_name: requestData?.party_name,
          customer_name: requestData?.customer_name,
          project_name: requestData?.project_name,
          transport_name: requestData?.transport_name,
          transport_date: requestData?.transport_date,
          vehical_no: requestData?.vehical_no,
          po_no: requestData?.po_no,
          challan_no: requestData?.challan_no,
          lr_no: requestData?.lr_no,
          lr_date: requestData?.lr_date,
          payment_days: requestData?.payment_days,
          payment_date: requestData?.payment_date,
          driver_name: requestData?.driver_name,
          round_amount: requestData?.round_amount,
        }

        const template = fs.readFileSync(
          "templates/onePU.html",
          "utf-8"
        );
        const renderedHtml = ejs.render(template, {
          headerInfo,
          items: requestData?.items,
          logoUrl1: process.env.LOGO_URL_1,
          logoUrl2: process.env.LOGO_URL_2,
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

        const pdfBuffer = await generatePDF(page, { print_date: true });

        await browser.close();

        const pdfsDir = path.join(__dirname, "../../../pdfs");
        if (!fs.existsSync(pdfsDir)) {
          fs.mkdirSync(pdfsDir);
        }

        const filename = `purchase_${Date.now()}.pdf`;
        const filePath = path.join(__dirname, "../../../pdfs", filename);

        fs.writeFileSync(filePath, pdfBuffer);

        const fileUrl = `${URI}/pdfs/${filename}`;

        sendResponse(res, 200, true, { file: fileUrl }, "PDF downloaded Successfully"
        );

      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Purchase report not found`)
      }
      else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong111");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};




// Purchase return

exports.listPUForPUR = async (req, res) => {
  // const { party_id, tag_number, challan_no, bill_no, firm_id, year_id } = req.body;
  const { party_id, tag_number, challan_no, bill_no, year_id } = req.body;
  if (req.user && !req.error) {
    try {
      // if (tag_number && party_id && firm_id && year_id && challan_no || bill_no) {
      if (tag_number && party_id && year_id && challan_no || bill_no) {
        const tag_id = await tagId(tag_number);

        let matchObj = {
          party_id: new ObjectId(party_id),
          tag_id: new ObjectId(tag_id),
          // firm_id: new ObjectId(firm_id),
          year_id: new ObjectId(year_id)
        }

        if (challan_no) {
          matchObj.challan_no = challan_no
        }

        if (bill_no) {
          matchObj.bill_no = bill_no
        }

        let listPUForPUR = await Transaction.aggregate([
          { $unwind: "$items_details" },
          {
            $match: {
              deleted: false,
              "items_details.deleted": { $ne: true },
              "items_details.balance_qty": { $gt: 0 },
            },
          },
          { $match: matchObj },
          {
            $lookup: {
              from: "store-parties",
              localField: "party_id",
              foreignField: "_id",
              as: "partyDetails",
            },
          },
          {
            $lookup: {
              from: "bussiness-projects",
              localField: "project_id",
              foreignField: "_id",
              as: "projectDetails",
            },
          },
          {
            $lookup: {
              from: "store-items",
              localField: "items_details.item_id",
              foreignField: "_id",
              as: "itemDetails",
            },
          },
          {
            $addFields: {
              party_data: {
                _id: { $arrayElemAt: ["$partyDetails._id", 0] },
                name: { $arrayElemAt: ["$partyDetails.name", 0] },
              },
              customer_data: {
                _id: { $arrayElemAt: ["$customerDetails._id", 0] },
                name: { $arrayElemAt: ["$customerDetails.name", 0] },
              },
              project_data: {
                _id: { $arrayElemAt: ["$projectDetails._id", 0] },
                name: { $arrayElemAt: ["$projectDetails.name", 0] },
              },
              "items_details.item_data": {
                _id: { $arrayElemAt: ["$itemDetails._id", 0] },
                name: { $arrayElemAt: ["$itemDetails.name", 0] },
              },
            },
          },
          {
            $group: {
              _id: "$_id",
              party_data: { $first: "$party_data" },
              customer_data: { $first: "$customer_data" },
              project_data: { $first: "$project_data" },
              bill_no: { $first: "$bill_no" },
              challan_no: { $first: "$challan_no" },
              payment_date: { $first: "$payment_date" },
              payment_days: { $first: "$payment_days" },
              lr_no: { $first: "$lr_no" },
              lr_date: { $first: "$lr_date" },
              po_no: { $first: "$po_no" },
              pdf: { $first: "$pdf" },
              items: { $push: "$items_details" },
            },
          },
          {
            $project: {
              _id: 0,
              party_data: 1,
              customer_data: 1,
              project_data: 1,
              bill_no: 1,
              challan_no: 1,
              payment_date: 1,
              payment_days: 1,
              lr_no: 1,
              lr_date: 1,
              po_no: 1,
              pdf: 1,
              // items: 1,
              items: {
                $map: {
                  input: "$items",
                  as: "item",
                  in: {
                    from_id: "$_id",
                    detail_id: "$$item._id",
                    quantity: "$$item.balance_qty",
                    rate: "$$item.rate",
                    discount: "$$item.discount",
                    sp_discount: "$$item.sp_discount",
                    gst: "$$item.gst",
                    item_data: "$$item.item_data",
                  },
                },
              },
            },
          },
        ]);


        if (listPUForPUR && listPUForPUR.length > 0) {
          sendResponse(res, 200, true, listPUForPUR[0], `PU for PUR successfully`);
        } else {
          sendResponse(res, 200, true, {}, `PU not found for PUR`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.addPUR = async (req, res) => {
  let {
    // firm_id,
    year_id,
    trans_date,
    tag_number,
    party_id,
    bill_no,
    challan_no,
    project_id,
    master_id,      //returner_name
    receive_date,
    transport_id,
    transport_date,
    vehical_no,
    payment_date,
    payment_days,
    lr_no,
    lr_date,
    po_no,
    pdf,
    driver_name,
    items_details
  } = req.body;

  if (req.user && !req.error) {
    try {
      if (
        bill_no || challan_no &&
        // firm_id &&
        year_id &&
        trans_date &&
        project_id &&
        party_id &&
        transport_id &&
        tag_number &&
        po_no &&
        pdf &&
        items_details.length
      ) {

        const tag_id = await tagId(tag_number);

        const voucher_no = await VoucherGen();

        let addPUR = await Transaction.create({
          // firm_id,
          year_id,
          trans_date,
          tag_id,
          voucher_no,
          party_id,
          bill_no,
          challan_no,
          project_id,
          master_id,      //reciver_name
          receive_date,
          transport_id,
          transport_date,
          vehical_no,
          payment_date,
          payment_days,
          lr_no,
          lr_date,
          po_no,
          pdf,
          driver_name,
          items_details
        });

        if (addPUR) {
          for (const o of items_details) {
            await manageMSitemStock(o.item_id, addPUR._id, addPUR.tag_id, o.quantity, false);
          }
          await manageMainObjBalanceQty(addPUR.items_details, true)             // Main obj balance qty manage
          await manageTransactionItemStatus(addPUR.items_details)               // Obj item status manage
          await manageTransactionStatus(addPUR.items_details)                   // Main obj status manage
          sendResponse(res, 200, true, addPUR, `PUR added successfully`);
        } else {
          sendResponse(res, 400, false, {}, `PUR not added`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log("pupupu", error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.addPURItem = async (req, res) => {
  let { id, items_details } = req.body

  if (req.user && !req.error) {
    try {
      // const item = JSON.parse(items_details);
      if (
        id &&
        items_details.length //for postman
        // item.length
      ) {
        let existTransaction = await Transaction.findById(id);

        if (!existTransaction) {
          sendResponse(
            res,
            400,
            false,
            {},
            `No purchase return with this id exist`
          );
        } else {
          const addPURItem = await Transaction.updateOne(
            { _id: id },
            {
              $push: {
                items_details: {
                  $each: items_details, // for postman
                },
                // items_details: {
                // $each: item
                // }
              },
            }
          );

          if (addPURItem.modifiedCount === 1) {
            for (const o of items_details) {
              await manageMSitemStock(o.item_id, id, existTransaction.tag_id, o.quantity, false);
            }
            sendResponse(res, 200, true, {}, `Purchase return item added successfully`);
          } else {
            sendResponse(res, 400, false, {}, `Purchase return item not added`);
          }
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.listPUR = async (req, res) => {
  // const { tag_number, firm_id, year_id, filter, search } = req.body;
  const { tag_number, year_id, filter, search } = req.body;
  if (req.user && !req.error) {
    try {
      if (tag_number) {
        const tag_id = await tagId(tag_number);

        // const { date } = filter;
        const filter1 = JSON.parse(filter)             //react
        const { date } = filter1;

        const date_start = date && date.start ? new Date(date.start) : new Date("1947-08-15");

        let date_end = date ? (date.end ? new Date(date.end) : new Date()) : new Date();
        date_end.setHours(23, 59, 59, 999);
        const timezoneOffset = date_end.getTimezoneOffset() * 60000;
        date_end = new Date(date_end.getTime() - timezoneOffset);

        const search_by = search ? search.replace(/[^0-9a-zA-Z]/g, "\\$&") : "";

        let matchObj = {
          deleted: false,
          tag_id: tag_id,
          // firm_id: new ObjectId(firm_id),
          // year_id: new ObjectId(year_id),
          trans_date: {
            $gte: new Date(date_start),
            $lte: new Date(date_end),
          },
        }

        // firm_id and year_id if provided
        // if (firm_id) matchObj.firm_id = new ObjectId(firm_id);
        if (year_id) matchObj.year_id = new ObjectId(year_id);

        let matchObj1 = {};

        if (search_by != "") {
          matchObj1 = {
            $or: [
              { voucher_no: { $regex: search_by, $options: "i" } },
              { bill_no: { $regex: search_by, $options: "i" } },
              { challan_no: { $regex: search_by, $options: "i" } },
              { "party_data.name": { $regex: search_by, $options: "i" } },
              { "project_data.name": { $regex: search_by, $options: "i" } },
            ],
          };
        }
        const listPUR = await Transaction.aggregate([
          { $match: matchObj },
          {
            $lookup: {
              from: "masters",
              localField: "master_id",
              foreignField: "_id",
              as: "masterDetails",
            },
          },
          {
            $lookup: {
              from: "store-parties",
              localField: "party_id",
              foreignField: "_id",
              as: "partyDetails",
            },
          },
          {
            $lookup: {
              from: "bussiness-projects",
              localField: "project_id",
              foreignField: "_id",
              as: "projectDetails",
            },
          },
          {
            $lookup: {
              from: "store-transports",
              localField: "transport_id",
              foreignField: "_id",
              as: "transportDetails",
            },
          },
          {
            $addFields: {
              return_by: {
                _id: { $arrayElemAt: ["$masterDetails._id", 0] },
                name: { $arrayElemAt: ["$masterDetails.name", 0] },
              },
              party_data: {
                _id: { $arrayElemAt: ["$partyDetails._id", 0] },
                name: { $arrayElemAt: ["$partyDetails.name", 0] },
              },
              customer_data: {
                _id: { $arrayElemAt: ["$customerDetails._id", 0] },
                name: { $arrayElemAt: ["$customerDetails.name", 0] },
              },
              project_data: {
                _id: { $arrayElemAt: ["$projectDetails._id", 0] },
                name: { $arrayElemAt: ["$projectDetails.name", 0] },
              },
              transport_data: {
                _id: { $arrayElemAt: ["$transportDetails._id", 0] },
                name: { $arrayElemAt: ["$transportDetails.name", 0] },
              },
              item_count: {
                $size: {
                  $filter: {
                    input: "$items_details",
                    as: "item",
                    cond: { $eq: ["$$item.deleted", false] },
                  },
                },
              },
            },
          },
          { $match: matchObj1 },
          {
            $sort: { voucher_no: -1 },
          },
          {
            $project: {
              masterDetails: 0,
              partyDetails: 0,
              projectDetails: 0,
              transportDetails: 0,
              items_details: 0,
              site_location: 0,
              store_location: 0,
              department: 0,
              party_id: 0,
              master_id: 0,
              project_id: 0,
              admin_id: 0,
              tag_id: 0,
              transport_id: 0,
              issue_no: 0,
              address: 0,
              return_id: 0,
              deleted: 0,
              createdAt: 0,
              updatedAt: 0,
              __v: 0,
            },
          },
        ]);

        if (listPUR.length > 0) {
          sendResponse(res, 200, true, listPUR, `PUR list`);
        } else {
          sendResponse(res, 200, true, [], `PUR not found`);
        }
      } else {
        return sendResponse(res, 400, false, [], "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.onePUR = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      if (id) {
        const onePUR = await Transaction.aggregate([
          {
            $match: { _id: new ObjectId(id) },
          },
          {
            $project: {
              items_details: {
                $filter: {
                  input: "$items_details",
                  as: "item",
                  cond: { $eq: ["$$item.deleted", false] },
                },
              },
            },
          },
          {
            $lookup: {
              from: "store-items",
              let: { items: "$items_details" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: [
                        "$_id",
                        {
                          $map: {
                            input: "$$items",
                            as: "item",
                            in: "$$item.item_id",
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    item_id: "$_id",
                    item_name: "$name",
                  },
                },
              ],
              as: "items_data",
            },
          },
          {
            $addFields: {
              items_details: {
                $map: {
                  input: "$items_details",
                  as: "item",
                  in: {
                    $let: {
                      vars: {
                        itemData: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$items_data",
                                as: "data",
                                cond: {
                                  $eq: ["$$data.item_id", "$$item.item_id"],
                                },
                              },
                            },
                            0,
                          ],
                        },

                      },
                      in: {
                        $mergeObjects: [
                          "$$item",
                          { item_name: { $ifNull: ["$$itemData.item_name", null] } },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
          {
            $project: {
              items_data: 0,
              "items_details.status": 0,
              "items_details.deleted": 0,
              "items_details.category_id": 0,
              "items_details.item_brand": 0,
              "items_details.required_qty": 0,
              "items_details.pr_party": 0,
            },
          },
        ]);


        if (onePUR && onePUR.length > 0) {
          sendResponse(res, 200, true, onePUR[0], `PUR found successfully`);
        } else {
          sendResponse(res, 200, true, {}, `PUR not found`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.deletePUR = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      if (id) {
        const deletePUR = await Transaction.findByIdAndUpdate(id, { deleted: true }, { new: true });

        if (deletePUR) {
          await Promise.all(
            deletePUR.items_details.map(
              async (o) =>
                await manageMSitemStockUpdate(o.item_id, id, -o.quantity, false)
            )
          );
          await manageMainObjBalanceQty(deletePUR.items_details, false)
          sendResponse(res, 200, true, {}, `PUR deleted successfully`);
        } else {
          sendResponse(res, 400, false, {}, `PUR not delete`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.deletePURItem = async (req, res) => {
  const { id, itemId } = req.body;
  if (req.user && !req.error) {
    try {
      if (id) {
        const deletePURItem = await Transaction.updateOne(
          { _id: id, "items_details._id": itemId },
          {
            $set: {
              "items_details.$.deleted": true,
            },
          },
          { new: true }
        )

        if (deletePURItem.modifiedCount > 0) {
          const deleteItem = await Transaction.findOne(
            { _id: id, "items_details._id": itemId },
            { "items_details.$": 1 }
          );
          await manageMSitemStockUpdate(deleteItem.items_details[0].item_id, deleteItem._id, -deleteItem.items_details[0].quantity, false);
          manageMainObjBalanceQty(deleteItem.items_details, false)
          sendResponse(res, 200, true, {}, `PUR item deleted successfully`);
        } else {
          sendResponse(res, 400, false, {}, `PUR item not delete`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.updatePUR = async (req, res) => {
  const {
    id,
    trans_date,
    receive_date,
    // challan_no,
    master_id,      //returner_name
    transport_id,
    transport_date,
    vehical_no,
    driver_name,
  } = req.body;

  if (req.user && !req.error) {
    try {
      if (id) {
        const updatePUR = await Transaction.findByIdAndUpdate(
          id,
          {
            trans_date,
            // challan_no,
            receive_date,
            master_id,      //returner_name
            transport_id,
            transport_date,
            vehical_no,
            driver_name,
          },
          { new: true }
        );

        if (updatePUR) {
          sendResponse(res, 200, true, updatePUR, `PUR update successfully`);
        } else {
          sendResponse(res, 400, false, {}, `PUR not update`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.updatePURItem = async (req, res) => {
  const {
    id,
    item_detail_id,   // item detail object id
    items_details
  } = req.body;

  if (req.user && !req.error) {
    try {
      if (id) {
        const updatePURItem = await Transaction.updateOne(
          { _id: id, "items_details._id": item_detail_id },
          {
            $set: {
              "items_details.$.rate": items_details.rate,
              "items_details.$.amount": items_details.amount,
              "items_details.$.discount": items_details.discount,
              "items_details.$.discount_amount": items_details.discount_amount,
              "items_details.$.sp_discount": items_details.sp_discount,
              "items_details.$.sp_discount_amount": items_details.sp_discount_amount,
              "items_details.$.taxable_amount": items_details.taxable_amount,
              "items_details.$.gst": items_details.gst,
              "items_details.$.gst_amount": items_details.gst_amount,
              "items_details.$.total_amount": items_details.total_amount,
              "items_details.$.remarks": items_details.remarks,
            },
          }
        )

        if (updatePURItem.modifiedCount > 0) {
          sendResponse(res, 200, true, {}, `PUR item update successfully`);
        } else {
          sendResponse(res, 400, false, {}, `PUR item not update`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.listPURNumber = async (req, res) => {
  // const { tag_number, firm_id, year_id } = req.body;
  const { tag_number, year_id } = req.body;
  if (req.user && !req.error) {
    try {
      // if (tag_number && firm_id && year_id) {
      if (tag_number && year_id) {
        const tag_id = await tagId(tag_number);
        const listPURNO = await Transaction.aggregate([
          {
            $match: {
              deleted: false,
              tag_id: new ObjectId(tag_id),
              // firm_id: new ObjectId(firm_id),
              year_id: new ObjectId(year_id)
            },
          },
          { $unwind: "$items_details" },
          {
            $match: {
              "items_details.deleted": { $ne: true },
              "items_details.balance_qty": { $gt: 0 },
            },
          },
          {
            $group: {
              _id: "$voucher_no",
              voucher_no: { $first: "$voucher_no" },
            },
          },
          {
            $sort: {
              voucher_no: -1,
            },
          },
          {
            $project: {
              _id: 0,
              voucher_no: 1,
            },
          },
        ]);

        if (listPURNO.length > 0) {
          sendResponse(res, 200, true, listPURNO, `PUR numberlist`);
        } else {
          sendResponse(res, 200, true, [], `PUR number not found`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

const PURDownload = async (id) => {
  try {
    const requestData = await Transaction.aggregate([
      { $match: { deleted: false, _id: new ObjectId(id) } },
      { $unwind: "$items_details" },
      {
        $match: {
          "items_details.deleted": { $ne: true },
        },
      },
      {
        $lookup: {
          from: "masters",
          localField: "master_id",
          foreignField: "_id",
          as: "masterDetails",
        },
      },
      {
        $lookup: {
          from: "store-parties",
          localField: "party_id",
          foreignField: "_id",
          as: "partyDetails",
        },
      },
      {
        $lookup: {
          from: "bussiness-projects",
          localField: "project_id",
          foreignField: "_id",
          as: "projectDetails",
        },
      },
      {
        $lookup: {
          from: "store-transports",
          localField: "transport_id",
          foreignField: "_id",
          as: "transportDetails",
        },
      },
      {
        $lookup: {
          from: "store-items",
          localField: "items_details.item_id",
          foreignField: "_id",
          as: "itemDetails",
        },
      },
      {
        $addFields: {
          receive_by: { $arrayElemAt: ["$masterDetails.name", 0] },
          party_name: { $arrayElemAt: ["$partyDetails.name", 0] },
          project_name: { $arrayElemAt: ["$projectDetails.name", 0] },
          transport_name: { $arrayElemAt: ["$transportDetails.name", 0] },
          item_name: { $arrayElemAt: ["$itemDetails.name", 0] },
          mcode: { $arrayElemAt: ["$itemDetails.mcode", 0] },
        },
      },
      {
        $project: {
          _id: 1,
          trans_date: "$trans_date",
          voucher_no: "$voucher_no",
          bill_no: "$bill_no",
          receive_by: "$receive_by",
          receive_date: "$receive_date",
          party_name: "$party_name",
          project_name: "$project_name",
          transport_name: "$transport_name",
          transport_date: "$transport_date",
          vehical_no: "$vehical_no",
          po_no: "$po_no",
          challan_no: "$challan_no",
          lr_no: "$lr_no",
          lr_date: "$lr_date",
          payment_days: "$payment_days",
          payment_date: "$payment_date",
          driver_name: "$driver_name",
          round_amount: "$round_amount",
          items: {
            _id: "$items_details._id",
            item_name: "$item_name",
            unit: "$items_details.unit",
            mcode: "$mcode",
            quantity: "$items_details.quantity",
            rate: "$items_details.rate",
            amount: "$items_details.amount",
            discount: "$items_details.discount",
            discount_amount: "$items_details.discount_amount",
            sp_discount: "$items_details.sp_discount",
            sp_discount_amount: "$items_details.sp_discount_amount",
            taxable_amount: "$items_details.taxable_amount",
            gst: "$items_details.gst",
            gst_amount: "$items_details.gst_amount",
            total_amount: "$items_details.total_amount",
            remarks: "$items_details.remarks",
          },
        },
      },
      {
        $group: {
          _id: {
            _id: "$_id",
            trans_date: "$trans_date",
            voucher_no: "$voucher_no",
            bill_no: "$bill_no",
            receive_by: "$receive_by",
            receive_date: "$receive_date",
            party_name: "$party_name",
            project_name: "$project_name",
            transport_name: "$transport_name",
            transport_date: "$transport_date",
            vehical_no: "$vehical_no",
            po_no: "$po_no",
            challan_no: "$challan_no",
            lr_no: "$lr_no",
            lr_date: "$lr_date",
            payment_days: "$payment_days",
            payment_date: "$payment_date",
            driver_name: "$driver_name",
            round_amount: "$round_amount",
          },
          items: { $push: "$items" },
          total_qty: { $sum: "$items.quantity" },
          amt: { $sum: "$items.amount" },
          dis_amt: { $sum: "$items.discount_amount" },
          sp_dis_amt: { $sum: "$items.sp_discount_amount" },
          tax_amt: { $sum: "$items.taxable_amount" },
          gst_amt: { $sum: "$items.gst_amount" },
          total_amt: { $sum: "$items.total_amount" },
        },
      },
      {
        $addFields: {
          net_amt: {
            $sum: [
              "$total_amt",
              { $ifNull: ["$_id.round_amount", 0] }
            ]
          }
        }
      },
      {
        $project: {
          _id: "$_id._id",
          voucher_no: "$_id.voucher_no",
          bill_no: "$_id.bill_no",
          trans_date: "$_id.trans_date",

          party_name: "$_id.party_name",
          project_name: "$_id.project_name",
          challan_no: "$_id.challan_no",

          receive_by: "$_id.receive_by",
          receive_date: "$_id.receive_date",
          po_no: "$_id.po_no",

          transport_name: "$_id.transport_name",
          transport_date: "$_id.transport_date",
          vehical_no: "$_id.vehical_no",


          lr_no: "$_id.lr_no",
          lr_date: "$_id.lr_date",
          driver_name: "$_id.driver_name",

          payment_days: "$_id.payment_days",
          payment_date: "$_id.payment_date",
          round_amount: "$_id.round_amount",

          items: 1,
          total_qty: 1,
          amt: 1,
          dis_amt: 1,
          sp_dis_amt: 1,
          tax_amt: 1,
          gst_amt: 1,
          total_amt: 1,
          net_amt: 1,
        },
      },
    ]);
    if (requestData.length && requestData.length > 0) {
      return { status: 1, result: requestData };
    } else {
      return { status: 0, result: [] };
    }
  } catch (error) {
    return { status: 2, result: error };
  }
};

exports.PURDownloadList = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await PURDownload(id)
      if (data.status === 1) {
        sendResponse(res, 200, true, data.result, `Purchase return found`);
      } else if (data.status === 0) {
        sendResponse(res, 200, true, [], `Purchase return not found`);
      } else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.PURDownloadPDF = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await PURDownload(id)
      const requestData = data.result[0];

      if (data.status === 1) {

        let headerInfo = {
          total_qty: requestData?.total_qty,
          amt: requestData?.amt,
          dis_amt: requestData?.dis_amt,
          sp_dis_amt: requestData?.sp_dis_amt,
          tax_amt: requestData?.tax_amt,
          gst_amt: requestData?.gst_amt,
          total_amt: requestData?.total_amt,
          net_amt: requestData?.net_amt,
          pu_date: requestData?.trans_date,
          pu_no: requestData?.voucher_no,
          bill_no: requestData?.bill_no,
          receive_by: requestData?.receive_by,
          receive_date: requestData?.receive_date,
          party_name: requestData?.party_name,
          project_name: requestData?.project_name,
          transport_name: requestData?.transport_name,
          transport_date: requestData?.transport_date,
          vehical_no: requestData?.vehical_no,
          po_no: requestData?.po_no,
          challan_no: requestData?.challan_no,
          lr_no: requestData?.lr_no,
          lr_date: requestData?.lr_date,
          payment_days: requestData?.payment_days,
          payment_date: requestData?.payment_date,
          driver_name: requestData?.driver_name,
          round_amount: requestData?.round_amount,
        }

        const template = fs.readFileSync(
          "templates/onePUR.html",
          "utf-8"
        );
        const renderedHtml = ejs.render(template, {
          headerInfo,
          items: requestData?.items,
          logoUrl1: process.env.LOGO_URL_1,
          logoUrl2: process.env.LOGO_URL_2,
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

        const pdfBuffer = await generatePDF(page, { print_date: true });

        await browser.close();

        const pdfsDir = path.join(__dirname, "../../../pdfs");
        if (!fs.existsSync(pdfsDir)) {
          fs.mkdirSync(pdfsDir);
        }

        const filename = `purchase_return_${Date.now()}.pdf`;
        const filePath = path.join(__dirname, "../../../pdfs", filename);

        fs.writeFileSync(filePath, pdfBuffer);

        const fileUrl = `${URI}/pdfs/${filename}`;

        sendResponse(res, 200, true, { file: fileUrl }, "PDF downloaded Successfully"
        );

      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Purchase return report not found`)
      }
      else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong111");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};




// Issue

exports.listAllGatePass = async (req, res) => {
  if (req.user && !req.error) {
    try {
      const listAllGetPass = await Employee.aggregate([
        {
          $match: { deleted: false },
        },
        {
          $sort: {
            card_no: -1,
          },
        },
        {
          $project: {
            _id: 1,
            card_no: 1,
            full_name: 1,
          },
        },
      ]);

      if (listAllGetPass.length > 0) {
        sendResponse(res, 200, true, listAllGetPass, `All get pass numberlist`);
      } else {
        sendResponse(res, 200, true, [], `get pass number not found`);
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.addISS = async (req, res) => {
  let {
    // firm_id,
    year_id,
    trans_date,
    tag_number,
    party_id,
    customer_id,
    project_id,
    bill_no,
    gate_pass_no,
    receive_date,
    receiver_name,
    isexternal,
    transport_id,
    transport_date,
    vehical_no,
    challan_no,
    lr_no,
    lr_date,
    address,
    driver_name,
    items_details,
    unit_location,
  } = req.body;

  if (req.user && !req.error) {
    try {
      if (
        // firm_id &&
        year_id &&
        trans_date &&
        tag_number &&
        bill_no &&
        project_id &&
        items_details.length
      ) {

        const tag_id = await tagId(tag_number);

        const voucher_no = await VoucherGen();

        let challan_no = null
        if (isexternal == "true") {
          challan_no = await ChallanIssueGen(tag_id, customer_id)
        }

        items_details = items_details.map(item => {
          return {
            ...item,
            balance_qty: item.quantity,
          };
        });

        let addISS = await Transaction.create({
          // firm_id,
          year_id,
          trans_date,
          tag_id,
          voucher_no,
          party_id,
          customer_id,
          project_id,
          bill_no,
          receiver_name,
          gate_pass_no,
          isexternal,
          receive_date,
          transport_id,
          transport_date,
          vehical_no,
          challan_no,
          lr_no,
          lr_date,
          address,
          driver_name,
          items_details,
          unit_location,
        });

        if (addISS) {
          for (const o of items_details) {
            await manageMSitemStock(o.item_id, addISS._id, addISS.tag_id, o.quantity, false);
          }
          sendResponse(res, 200, true, addISS, `ISS added successfully`);
        } else {
          sendResponse(res, 400, false, {}, `ISS not added`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log("error", error)
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.addISSItem = async (req, res) => {
  let { id, items_details } = req.body

  if (req.user && !req.error) {
    try {
      // const item = JSON.parse(items_details);
      if (
        id &&
        items_details.length //for postman
        // item.length
      ) {
        let existTransaction = await Transaction.findById(id);

        if (!existTransaction) {
          sendResponse(
            res,
            400,
            false,
            {},
            `No issue with this id exist`
          );
        } else {
          items_details = items_details.map(item => {
            // item = item.map(item => {                    // for postman
            return {
              ...item,
              balance_qty: item.quantity,
            };
          });

          const addISSItem = await Transaction.updateOne(
            { _id: id },
            {
              $push: {
                items_details: {
                  $each: items_details, // for postman
                },
                // items_details: {
                // $each: item
                // }
              },
            }
          );

          if (addISSItem.modifiedCount === 1) {
            for (const o of items_details) {
              await manageMSitemStock(o.item_id, id, existTransaction.tag_id, o.quantity, false);
            }
            sendResponse(res, 200, true, {}, `ISS item added successfully`);
          } else {
            sendResponse(res, 400, false, {}, `ISS item not added`);
          }
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.listISS = async (req, res) => {
  // const { tag_number, firm_id, year_id, search, filter } = req.body;
  const { tag_number, year_id, search, filter, page, limit } = req.body;
  console.log("filter", req.body)
  if (req.user && !req.error) {
    try {
      if (tag_number) {
        const tag_id = await tagId(tag_number);

        // const { date } = filter;
        const filter1 = typeof filter === "string" ? JSON.parse(filter) : filter;             //react
        const { date } = filter1;

        const date_start = date && date.start ? new Date(date.start) : new Date("1947-08-15");
        const timezoneOffsetStart = date_start.getTimezoneOffset() * 60000;
        const adjustedStart = new Date(date_start.getTime() - timezoneOffsetStart);

        const pageNumber = page ? parseInt(page) : null;
        const limitNumber = limit ? parseInt(limit) : null;
        const skip = pageNumber && limitNumber ? (pageNumber - 1) * limitNumber : null;

        let date_end = date ? (date.end ? new Date(date.end) : new Date()) : new Date();
        date_end.setHours(23, 59, 59, 999);
        const timezoneOffsetEnd = date_end.getTimezoneOffset() * 60000;
        const adjustedEnd = new Date(date_end.getTime() - timezoneOffsetEnd);

        const search_by = search ? search.replace(/[^0-9a-zA-Z]/g, "\\$&") : "";

        let matchObj = {
          deleted: false,
          tag_id: tag_id,
          // firm_id: new ObjectId(firm_id),
          year_id: new ObjectId(year_id),
          trans_date: {
            $gte: adjustedStart,
            $lte: adjustedEnd,
          },
        }

        // firm_id and year_id if provided
        // if (firm_id) matchObj.firm_id = new ObjectId(firm_id);
        if (year_id) matchObj.year_id = new ObjectId(year_id);

        let matchObj1 = {};

        if (search_by != "") {
          matchObj1 = {
            $or: [
              { voucher_no: { $regex: search_by, $options: "i" } },
              { bill_no: { $regex: search_by, $options: "i" } },
              { challan_no: { $regex: search_by, $options: "i" } },
              { "party_data.name": { $regex: search_by, $options: "i" } },
              { "customer_data.name": { $regex: search_by, $options: "i" } },
              { "project_data.name": { $regex: search_by, $options: "i" } },
              { "get_pass_data.get_pass_no": { $regex: search_by, $options: "i" } },
            ],
          };
        }
        // const listISS = await Transaction.aggregate([
        let pipeline = [
          { $match: matchObj },
          {
            $sort: { voucher_no: -1 },
          },
          {
            $lookup: {
              from: "store-parties",
              localField: "party_id",
              foreignField: "_id",
              as: "partyDetails",
            },
          },
          {
            $lookup: {
              from: "firms",
              localField: "customer_id",
              foreignField: "_id",
              as: "customerDetails",
            },
          },
          {
            $lookup: {
              from: "bussiness-projects",
              localField: "project_id",
              foreignField: "_id",
              as: "projectDetails",
            },
          },
          {
            $lookup: {
              from: "store-transports",
              localField: "transport_id",
              foreignField: "_id",
              as: "transportDetails",
            },
          },
          {
            $lookup: {
              from: "employees",
              localField: "gate_pass_no",
              foreignField: "_id",
              as: "getPassDetails",
            },
          },
          {
            $lookup: {
              from: "unit-locations",
              localField: "unit_location",
              foreignField: "_id",
              as: "unitLocationDetails",
            }
          },
          {
            $addFields: {
              party_data: {
                _id: { $arrayElemAt: ["$partyDetails._id", 0] },
                name: { $arrayElemAt: ["$partyDetails.name", 0] },
              },
              customer_data: {
                _id: { $arrayElemAt: ["$customerDetails._id", 0] },
                name: { $arrayElemAt: ["$customerDetails.name", 0] },
              },
              project_data: {
                _id: { $arrayElemAt: ["$projectDetails._id", 0] },
                name: { $arrayElemAt: ["$projectDetails.name", 0] },
              },
              get_pass_data: {
                _id: { $arrayElemAt: ["$getPassDetails._id", 0] },
                get_pass_no: { $arrayElemAt: ["$getPassDetails.card_no", 0] },
              },
              transport_data: {
                _id: { $arrayElemAt: ["$transportDetails._id", 0] },
                name: { $arrayElemAt: ["$transportDetails.name", 0] },
              },
              unit_location: {
                _id: { $arrayElemAt: ["$unitLocationDetails._id", 0] },
                name: { $arrayElemAt: ["$unitLocationDetails.name", 0] },
              },
              item_count: {
                $size: {
                  $filter: {
                    input: "$items_details",
                    as: "item",
                    cond: { $eq: ["$$item.deleted", false] },
                  },
                },
              },
            },
          },
          { $match: matchObj1 },

          {
            $project: {
              masterDetails: 0,
              partyDetails: 0,
              customerDetails: 0,
              projectDetails: 0,
              transportDetails: 0,
              getPassDetails: 0,
              items_details: 0,
              site_location: 0,
              store_location: 0,
              department: 0,
              party_id: 0,
              customer_id: 0,
              master_id: 0,
              project_id: 0,
              admin_id: 0,
              tag_id: 0,
              transport_id: 0,
              issue_no: 0,
              return_id: 0,
              payment_date: 0,
              payment_days: 0,
              machine_code: 0,
              pdf: 0,
              po_no: 0,
              return_id: 0,
              deleted: 0,
              createdAt: 0,
              updatedAt: 0,
              unitLocationDetails: 0,
              __v: 0,
            },
          },
        ];

        // Pagination
        if (pageNumber && limitNumber) {
          pipeline.push({
            $facet: {
              data: [
                { $skip: skip },
                { $limit: limitNumber }
              ],
              totalCount: [
                { $count: "count" }
              ]
            }
          });
        } else {
          pipeline.push({
            $facet: {
              data: [{ $match: {} }],
              totalCount: [
                { $count: "count" }
              ]
            }
          });
        }

        const result = await Transaction.aggregate(pipeline)
          .allowDiskUse(true)
          .exec();
        const response = result[0] || { data: [], totalCount: [] };

        const totalItems =
          response.totalCount.length > 0 ? response.totalCount[0].count : 0;

        if (result.length > 0) {
          return sendResponse(
            res,
            200,
            true,
            {
              data: response.data,
              pagination:
                pageNumber && limitNumber
                  ? {
                    totalItems,
                    currentPage: pageNumber,
                    totalPages: Math.ceil(totalItems / limitNumber),
                    limit: limitNumber,
                  }
                  : null,
            },
            "ISS list"
          );
        } else {
          sendResponse(res, 200, true, [], `ISS not found`);
        }
      } else {
        return sendResponse(res, 400, false, [], "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};


exports.listISSItemReturn = async (req, res) => {
  // const { tag_number, firm_id, year_id, search, filter } = req.body;
  const { tag_number, year_id, search, filter } = req.body;
  if (req.user && !req.error) {
    try {
      if (tag_number) {
        const tag_id = await tagId(tag_number);

        // const { date } = filter;
        const filter1 = typeof filter === "string" ? JSON.parse(filter) : filter;             //react
        const { date } = filter1;

        const date_start = date && date.start ? new Date(date.start) : new Date("1947-08-15");

        let date_end = date ? (date.end ? new Date(date.end) : new Date()) : new Date();
        date_end.setHours(23, 59, 59, 999);
        const timezoneOffset = date_end.getTimezoneOffset() * 60000;
        date_end = new Date(date_end.getTime() - timezoneOffset);

        const search_by = search ? search.replace(/[^0-9a-zA-Z]/g, "\\$&") : "";

        let matchObj = {
          deleted: false,
          tag_id: tag_id,
          // firm_id: new ObjectId(firm_id),
          // year_id: new ObjectId(year_id),

          trans_date: {
            $gte: new Date(date_start),
            $lte: new Date(date_end),
          },
          "items_details": { $elemMatch: { isreturn: false } }
          // isReturned: true   
        }

        // firm_id and year_id if provided
        // if (firm_id) matchObj.firm_id = new ObjectId(firm_id);
        if (year_id) matchObj.year_id = new ObjectId(year_id);

        let matchObj1 = {};

        if (search_by != "") {
          matchObj1 = {
            $or: [
              { voucher_no: { $regex: search_by, $options: "i" } },
              { bill_no: { $regex: search_by, $options: "i" } },
              { challan_no: { $regex: search_by, $options: "i" } },
              { "party_data.name": { $regex: search_by, $options: "i" } },
              { "customer_data.name": { $regex: search_by, $options: "i" } },
              { "project_data.name": { $regex: search_by, $options: "i" } },
            ],
          };
        }
        const listISSItemReturn = await Transaction.aggregate([
          { $match: matchObj },
          {
            $sort: { voucher_no: -1 },
          },
          {
            $lookup: {
              from: "store-parties",
              localField: "party_id",
              foreignField: "_id",
              as: "partyDetails",
            },
          },
          {
            $lookup: {
              from: "firms",
              localField: "customer_id",
              foreignField: "_id",
              as: "customerDetails",
            },
          },
          {
            $lookup: {
              from: "bussiness-projects",
              localField: "project_id",
              foreignField: "_id",
              as: "projectDetails",
            },
          },
          {
            $lookup: {
              from: "store-transports",
              localField: "transport_id",
              foreignField: "_id",
              as: "transportDetails",
            },
          },
          {
            $lookup: {
              from: "employees",
              localField: "gate_pass_no",
              foreignField: "_id",
              as: "getPassDetails",
            },
          },
          {
            $lookup: {
              from: "unit-locations",
              localField: "unit_location",
              foreignField: "_id",
              as: "unitLocationDetails",
            }
          },
          {
            $lookup: {
              from: "store-items",
              localField: "items_details.item_id",
              foreignField: "_id",
              as: "itemInfo"
            }
          },
          {
            $addFields: {

              party_data: {
                _id: { $arrayElemAt: ["$partyDetails._id", 0] },
                name: { $arrayElemAt: ["$partyDetails.name", 0] },
              },
              customer_data: {
                _id: { $arrayElemAt: ["$customerDetails._id", 0] },
                name: { $arrayElemAt: ["$customerDetails.name", 0] },
              },
              project_data: {
                _id: { $arrayElemAt: ["$projectDetails._id", 0] },
                name: { $arrayElemAt: ["$projectDetails.name", 0] },
              },
              get_pass_data: {
                _id: { $arrayElemAt: ["$getPassDetails._id", 0] },
                get_pass_no: { $arrayElemAt: ["$getPassDetails.card_no", 0] },
              },
              transport_data: {
                _id: { $arrayElemAt: ["$transportDetails._id", 0] },
                name: { $arrayElemAt: ["$transportDetails.name", 0] },
              },
              unit_location: {
                _id: { $arrayElemAt: ["$unitLocationDetails._id", 0] },
                name: { $arrayElemAt: ["$unitLocationDetails.name", 0] },
              },
              item_count: {
                $size: {
                  $filter: {
                    input: "$items_details",
                    as: "item",
                    cond: { $eq: ["$$item.deleted", false] },
                  },
                },
              },
              items_details: {
                $map: {
                  input: "$items_details",
                  as: "item",
                  in: {
                    $mergeObjects: [
                      "$$item",
                      {
                        item_name: {
                          $let: {
                            vars: {
                              matchedItem: {
                                $arrayElemAt: [
                                  {
                                    $filter: {
                                      input: "$itemInfo",
                                      as: "info",
                                      cond: { $eq: ["$$info._id", "$$item.item_id"] }
                                    }
                                  },
                                  0
                                ]
                              }
                            },
                            in: "$$matchedItem.name"
                          }
                        },
                        mcode: {
                          $let: {
                            vars: {
                              matchedItem: {
                                $arrayElemAt: [
                                  {
                                    $filter: {
                                      input: "$itemInfo",
                                      as: "info",
                                      cond: { $eq: ["$$info._id", "$$item.item_id"] }
                                    }
                                  },
                                  0
                                ]
                              }
                            },
                            in: "$$matchedItem.mcode"
                          }
                        },



                      }
                    ]
                  }
                }
              }
            }
          },

          // },
          // },
          { $match: matchObj1 },
          {
            $project: {
              masterDetails: 0,
              partyDetails: 0,
              customerDetails: 0,
              projectDetails: 0,
              transportDetails: 0,
              getPassDetails: 0,
              // items_details: 0,
              site_location: 0,
              store_location: 0,
              department: 0,
              party_id: 0,
              customer_id: 0,
              master_id: 0,
              project_id: 0,
              admin_id: 0,
              tag_id: 0,
              transport_id: 0,
              issue_no: 0,
              return_id: 0,
              payment_date: 0,
              payment_days: 0,
              machine_code: 0,
              pdf: 0,
              po_no: 0,
              return_id: 0,
              deleted: 0,
              createdAt: 0,
              updatedAt: 0,
              unitLocationDetails: 0,
              __v: 0,
            },
          },
        ]).allowDiskUse(true);

        if (listISSItemReturn.length > 0) {
          // console.log("listISSItemReturn ==>",listISSItemReturn.length);
          sendResponse(res, 200, true, listISSItemReturn, `ISS list Retrn`);
        } else {
          sendResponse(res, 200, true, [], `ISS Retrn not found`);
        }
      } else {
        return sendResponse(res, 400, false, [], "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.oneISS = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      if (id) {
        const oneISS = await Transaction.aggregate([
          {
            $match: { _id: new ObjectId(id) },
          },
          {
            $project: {
              items_details: {
                $filter: {
                  input: "$items_details",
                  as: "item",
                  cond: { $eq: ["$$item.deleted", false] },
                },
              },
            },
          },
          {
            $lookup: {
              from: "store-items",
              let: { items: "$items_details" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: [
                        "$_id",
                        {
                          $map: {
                            input: "$$items",
                            as: "item",
                            in: "$$item.item_id",
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    item_id: "$_id",
                    item_name: "$name",
                  },
                },
              ],
              as: "items_data",
            },
          },
          {
            $addFields: {
              items_details: {
                $map: {
                  input: "$items_details",
                  as: "item",
                  in: {
                    $let: {
                      vars: {
                        itemData: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$items_data",
                                as: "data",
                                cond: {
                                  $eq: ["$$data.item_id", "$$item.item_id"],
                                },
                              },
                            },
                            0,
                          ],
                        },

                      },
                      in: {
                        $mergeObjects: [
                          "$$item",
                          { item_name: { $ifNull: ["$$itemData.item_name", null] } },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
          {
            $project: {
              items_data: 0,
              "items_details.status": 0,
              "items_details.deleted": 0,
              "items_details.category_id": 0,
              "items_details.item_brand": 0,
              "items_details.required_qty": 0,
              "items_details.pr_party": 0,
              "items_details.discount": 0,
              "items_details.discount_amount": 0,
              "items_details.sp_discount": 0,
              "items_details.sp_discount_amount": 0,
              "items_details.return_qty": 0,
              "items_details.balance_qty": 0,
            },
          },
        ]);


        if (oneISS && oneISS.length > 0) {
          sendResponse(res, 200, true, oneISS[0], `ISS found successfully`);
        } else {
          sendResponse(res, 200, true, {}, `ISS not found`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.deleteISS = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      if (id) {
        const deleteISS = await Transaction.findByIdAndUpdate(id, { deleted: true }, { new: true });

        if (deleteISS) {
          await Promise.all(
            deleteISS.items_details.map(
              async (o) =>
                await manageMSitemStockUpdate(o.item_id, id, -o.quantity, false)
            )
          );
          sendResponse(res, 200, true, {}, `ISS deleted successfully`);
        } else {
          sendResponse(res, 400, false, {}, `ISS not delete`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.deleteISSItem = async (req, res) => {
  const { id, itemId } = req.body;
  if (req.user && !req.error) {
    try {
      if (id) {
        const deleteISSItem = await Transaction.updateOne(
          { _id: id, "items_details._id": itemId },
          {
            $set: {
              "items_details.$.deleted": true,
            },
          },
          { new: true }
        )

        if (deleteISSItem.modifiedCount > 0) {
          const deleteItem = await Transaction.findOne(
            { _id: id, "items_details._id": itemId },
            { "items_details.$": 1 }
          );
          await manageMSitemStockUpdate(deleteItem.items_details[0].item_id, deleteItem._id, -deleteItem.items_details[0].quantity, false);
          sendResponse(res, 200, true, {}, `ISS item deleted successfully`);
        } else {
          sendResponse(res, 400, false, {}, `ISS item not delete`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.updateISS = async (req, res) => {
  const {
    id,
    trans_date,
    party_id,
    customer_id,
    project_id,
    bill_no,
    gate_pass_no,
    receiver_name,
    receive_date,
    isexternal,
    transport_id,
    transport_date,
    vehical_no,
    lr_no,
    lr_date,
    address,
    driver_name,
    unit_location,
  } = req.body;

  if (req.user && !req.error) {
    try {
      if (id) {
        const updateISS = await Transaction.findByIdAndUpdate(
          id,
          {
            trans_date,
            party_id,
            customer_id,
            project_id,
            bill_no,
            gate_pass_no,
            receiver_name,
            receive_date,
            isexternal,
            transport_id,
            transport_date,
            vehical_no,
            lr_no,
            lr_date,
            address,
            driver_name,
            unit_location,
          },
          { new: true }
        );

        if (updateISS) {
          sendResponse(res, 200, true, updateISS, `ISS update successfully`);
        } else {
          sendResponse(res, 400, false, {}, `ISS not update`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.updateISSItem = async (req, res) => {
  const {
    id,
    item_detail_id,   // item detail object id
    items_details
  } = req.body;

  if (req.user && !req.error) {
    try {
      if (id) {
        const updateISSItem = await Transaction.updateOne(
          { _id: id, "items_details._id": item_detail_id },
          {
            $set: {
              "items_details.$.isreturn": items_details.isreturn,
              "items_details.$.rate": items_details.rate,
              "items_details.$.amount": items_details.amount,
              "items_details.$.taxable_amount": items_details.taxable_amount,
              "items_details.$.gst": items_details.gst,
              "items_details.$.gst_amount": items_details.gst_amount,
              "items_details.$.total_amount": items_details.total_amount,
              "items_details.$.remarks": items_details.remarks,
            },
          }
        )

        if (updateISSItem.modifiedCount > 0) {
          sendResponse(res, 200, true, {}, `ISS item update successfully`);
        } else {
          sendResponse(res, 400, false, {}, `ISS item not update`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.listISSGatePass = async (req, res) => {
  // const { tag_number, firm_id, year_id } = req.body;
  const { tag_number, year_id } = req.body;
  if (req.user && !req.error) {
    try {
      // if (tag_number && firm_id && year_id) {
      if (tag_number && year_id) {
        const tag_id = await tagId(tag_number);
        const listISSGetPass = await Transaction.aggregate([
          {
            $match: {
              deleted: false,
              tag_id: new ObjectId(tag_id),
              gate_pass_no: { $ne: null },
              // firm_id: new ObjectId(firm_id),
              year_id: new ObjectId(year_id)
            },
          },
          { $unwind: "$items_details" },
          {
            $match: {
              "items_details.deleted": { $ne: true },
              "items_details.balance_qty": { $gt: 0 },
              "items_details.isreturn": { $eq: false },
            },
          },
          {
            $lookup: {
              from: "employees",
              localField: "gate_pass_no",
              foreignField: "_id",
              as: "getPassDetails",
            },
          },
          {
            $addFields: {
              _id: { $arrayElemAt: ["$getPassDetails._id", 0] },
              get_pass_no: { $arrayElemAt: ["$getPassDetails.card_no", 0] },
            },
          },
          {
            $group: {
              _id: "$_id",
              get_pass_no: { $first: "$get_pass_no" },
            },
          },
          {
            $sort: {
              get_pass_no: -1,
            },
          },
          {
            $project: {
              _id: 1,
              get_pass_no: 1,
            },
          },
        ]);
        if (listISSGetPass.length > 0) {
          sendResponse(res, 200, true, listISSGetPass, `All issue get pass number list`);
        } else {
          sendResponse(res, 200, true, [], `issue get pass number not found`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.listISSNumber = async (req, res) => {
  // const { tag_number, gate_pass_id, firm_id, year_id } = req.body;
  const { tag_number, gate_pass_id, year_id } = req.body;
  if (req.user && !req.error) {
    try {
      // if (tag_number && gate_pass_id && firm_id && year_id) {
      if (tag_number && gate_pass_id && year_id) {
        const tag_id = await tagId(tag_number);
        const listISSNO = await Transaction.aggregate([
          {
            $match: {
              deleted: false,
              tag_id: new ObjectId(tag_id),
              gate_pass_no: new ObjectId(gate_pass_id),
              // firm_id: new ObjectId(firm_id),
              year_id: new ObjectId(year_id)
            },
          },
          { $unwind: "$items_details" },
          {
            $match: {
              "items_details.deleted": { $ne: true },
              "items_details.balance_qty": { $gt: 0 },
              "items_details.isreturn": { $eq: false },
            },
          },
          {
            $group: {
              _id: "$voucher_no",
              voucher_no: { $first: "$voucher_no" },
            },
          },
          {
            $sort: {
              voucher_no: -1,
            },
          },
          {
            $project: {
              _id: 0,
              voucher_no: 1,
            },
          },
        ]);

        if (listISSNO.length > 0) {
          sendResponse(res, 200, true, listISSNO, `ISS number list`);
        } else {
          sendResponse(res, 200, true, [], `ISS number not found`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.listISSChallanNumber = async (req, res) => {
  // const { tag_number, firm_id, year_id } = req.body;
  const { tag_number, year_id } = req.body;
  if (req.user && !req.error) {
    try {
      // if (tag_number && firm_id && year_id) {
      if (tag_number && year_id) {
        const tag_id = await tagId(tag_number);
        const listISSChallanNumber = await Transaction.aggregate([
          {
            $match: {
              deleted: false,
              tag_id: new ObjectId(tag_id),
              // firm_id: new ObjectId(firm_id),
              year_id: new ObjectId(year_id),
              challan_no: { $ne: null },
            },
          },
          { $unwind: "$items_details" },
          {
            $match: {
              "items_details.deleted": { $ne: true },
              "items_details.balance_qty": { $gt: 0 },
              "items_details.isreturn": { $eq: false },
            },
          },
          {
            $group: {
              _id: "$_id",
              challan_no: { $first: "$challan_no" },
            },
          },
          {
            $sort: {
              challan_no: -1,
            },
          },
          {
            $project: {
              _id: 0,
              challan_no: 1,
            },
          },
        ]);

        if (listISSChallanNumber.length > 0) {
          sendResponse(res, 200, true, listISSChallanNumber, `ISS challan number list`);
        } else {
          sendResponse(res, 200, true, [], `ISS challan number not found`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

const ISSDownload = async (id) => {
  try {
    const requestData = await Transaction.aggregate([
      { $match: { deleted: false, _id: new ObjectId(id) } },
      { $unwind: "$items_details" },
      {
        $match: {
          "items_details.deleted": { $ne: true },
        },
      },
      {
        $lookup: {
          from: "store-parties",
          localField: "party_id",
          foreignField: "_id",
          as: "partyDetails",
        },
      },
      {
        $lookup: {
          from: "firms",
          localField: "customer_id",
          foreignField: "_id",
          as: "customerDetails",
        },
      },
      {
        $lookup: {
          from: "bussiness-projects",
          localField: "project_id",
          foreignField: "_id",
          as: "projectDetails",
        },
      },
      {
        $lookup: {
          from: "store-transports",
          localField: "transport_id",
          foreignField: "_id",
          as: "transportDetails",
        },
      },
      {
        $lookup: {
          from: "employees",
          localField: "gate_pass_no",
          foreignField: "_id",
          as: "getPassDetails",
        },
      },
      {
        $lookup: {
          from: "unit-locations",
          localField: "unit_location",
          foreignField: "_id",
          as: "unitLocDetails",
        },
      },
      {
        $lookup: {
          from: "store-items",
          localField: "items_details.item_id",
          foreignField: "_id",
          as: "itemDetails",
        },
      },
      {
        $addFields: {
          get_pass: { $arrayElemAt: ["$getPassDetails.card_no", 0] },
          get_pass_name: { $arrayElemAt: ["$getPassDetails.full_name", 0] },
          party_name: { $arrayElemAt: ["$partyDetails.name", 0] },
          customer_name: { $arrayElemAt: ["$customerDetails.name", 0] },
          unit_location: { $arrayElemAt: ["$unitLocDetails.name", 0] },
          project_name: { $arrayElemAt: ["$projectDetails.name", 0] },
          transport_name: { $arrayElemAt: ["$transportDetails.name", 0] },
          item_name: { $arrayElemAt: ["$itemDetails.name", 0] },
          hsn_code: { $arrayElemAt: ["$itemDetails.hsn_code", 0] },
          mcode: { $arrayElemAt: ["$itemDetails.mcode", 0] },
          party_gstNumber: { $arrayElemAt: ["$partyDetails.gstNumber", 0] },
          party_phone: { $arrayElemAt: ["$partyDetails.phone", 0] },
          party_email: { $arrayElemAt: ["$partyDetails.email", 0] },
        },
      },
      {
        $project: {
          _id: 1,
          trans_date: "$trans_date",
          voucher_no: "$voucher_no",
          bill_no: "$bill_no",
          get_pass: "$get_pass",
          get_pass_name: "$get_pass_name",
          receiver_name: "$receiver_name",
          receive_date: "$receive_date",
          party_name: "$party_name",
          customer_name: "$customer_name",
          project_name: "$project_name",
          transport_name: "$transport_name",
          transport_date: "$transport_date",
          vehical_no: "$vehical_no",
          challan_no: "$challan_no",
          lr_no: "$lr_no",
          lr_date: "$lr_date",
          driver_name: "$driver_name",
          address: "$address",
          party_gstNumber: "$party_gstNumber",
          party_phone: "$party_phone",
          party_email: "$party_email",
          unit_location: "$unit_location",
          items: {
            _id: "$items_details._id",
            item_name: "$item_name",
            unit: "$items_details.unit",
            mcode: "$mcode",
            hsn_code: "$hsn_code",
            isreturn: "$items_details.isreturn",
            quantity: "$items_details.quantity",
            rate: "$items_details.rate",
            amount: "$items_details.amount",
            taxable_amount: "$items_details.taxable_amount",
            gst: "$items_details.gst",
            gst_amount: "$items_details.gst_amount",
            total_amount: "$items_details.total_amount",
            remarks: "$items_details.remarks",
          },
        },
      },
      {
        $group: {
          _id: {
            _id: "$_id",
            trans_date: "$trans_date",
            voucher_no: "$voucher_no",
            bill_no: "$bill_no",
            get_pass_name: "$get_pass_name",
            get_pass: "$get_pass",
            receiver_name: "$receiver_name",
            receive_date: "$receive_date",
            party_name: "$party_name",
            customer_name: "$customer_name",
            project_name: "$project_name",
            transport_name: "$transport_name",
            transport_date: "$transport_date",
            vehical_no: "$vehical_no",
            challan_no: "$challan_no",
            lr_no: "$lr_no",
            lr_date: "$lr_date",
            driver_name: "$driver_name",
            address: "$address",
            party_gstNumber: "$party_gstNumber",
            party_phone: "$party_phone",
            party_email: "$party_email",
            unit_location: "$unit_location",
          },
          items: { $push: "$items" },
          total_qty: { $sum: "$items.quantity" },
          amt: { $sum: "$items.amount" },
          tax_amt: { $sum: "$items.taxable_amount" },
          gst_amt: { $sum: "$items.gst_amount" },
          total_amt: { $sum: "$items.total_amount" },
        },
      },
      {
        $project: {
          _id: "$_id._id",
          trans_date: "$_id.trans_date",
          voucher_no: "$_id.voucher_no",
          bill_no: "$_id.bill_no",
          get_pass: "$_id.get_pass",
          get_pass_name: "$_id.get_pass_name",
          receiver_name: "$_id.receiver_name",
          receive_date: "$_id.receive_date",
          party_name: "$_id.party_name",
          customer_name: "$_id.customer_name",
          project_name: "$_id.project_name",
          transport_name: "$_id.transport_name",
          transport_date: "$_id.transport_date",
          vehical_no: "$_id.vehical_no",
          challan_no: "$_id.challan_no",
          lr_no: "$_id.lr_no",
          lr_date: "$_id.lr_date",
          driver_name: "$_id.driver_name",
          address: "$_id.address",
          party_gstNumber: "$_id.party_gstNumber",
          party_phone: "$_id.party_phone",
          party_email: "$_id.party_email",
          unit_location: "$_id.unit_location",
          items: 1,
          total_qty: 1,
          amt: 1,
          tax_amt: 1,
          gst_amt: 1,
          total_amt: 1,
        },
      },
    ]);
    if (requestData.length && requestData.length > 0) {
      return { status: 1, result: requestData };
    } else {
      return { status: 0, result: [] };
    }
  } catch (error) {
    return { status: 2, result: error };
  }
};

exports.ISSDownloadList = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await ISSDownload(id)
      if (data.status === 1) {
        sendResponse(res, 200, true, data.result, `Issue found`);
      } else if (data.status === 0) {
        sendResponse(res, 200, true, [], `Issue not found`);
      } else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.ISSDownloadPDF = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await ISSDownload(id)
      const requestData = data.result[0];

      if (data.status === 1) {

        let headerInfo = {
          trans_date: requestData?.trans_date,
          voucher_no: requestData?.voucher_no,
          bill_no: requestData?.bill_no,
          get_pass: requestData?.get_pass,
          get_pass_name: requestData?.get_pass_name,
          receiver_name: requestData?.receiver_name,
          receive_date: requestData?.receive_date,
          party_name: requestData?.party_name,
          customer_name: requestData?.customer_name,
          project_name: requestData?.project_name,
          transport_name: requestData?.transport_name,
          transport_date: requestData?.transport_date,
          vehical_no: requestData?.vehical_no,
          challan_no: requestData?.challan_no,
          lr_no: requestData?.lr_no,
          lr_date: requestData?.lr_date,
          driver_name: requestData?.driver_name,
          unit_location: requestData?.unit_location,
          address: requestData?.address,
          total_qty: requestData?.total_qty,
          amt: requestData?.amt,
          tax_amt: requestData?.tax_amt,
          gst_amt: requestData?.gst_amt,
          total_amt: requestData?.total_amt,
        }

        const template = fs.readFileSync(
          "templates/oneISS.html",
          "utf-8"
        );
        const renderedHtml = ejs.render(template, {
          headerInfo,
          items: requestData?.items,
          logoUrl1: process.env.LOGO_URL_1,
          logoUrl2: process.env.LOGO_URL_2,
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

        const pdfBuffer = await generatePDF(page, { print_date: true });

        await browser.close();

        const pdfsDir = path.join(__dirname, "../../../pdfs");
        if (!fs.existsSync(pdfsDir)) {
          fs.mkdirSync(pdfsDir);
        }

        const filename = `issue_${Date.now()}.pdf`;
        const filePath = path.join(__dirname, "../../../pdfs", filename);

        fs.writeFileSync(filePath, pdfBuffer);

        const fileUrl = `${URI}/pdfs/${filename}`;

        sendResponse(res, 200, true, { file: fileUrl }, "PDF downloaded Successfully"
        );

      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Issue report not found`)
      }
      else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong111");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.ISSDownloadWithAmtPDF = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await ISSDownload(id)
      const requestData = data.result[0];

      if (data.status === 1) {

        let headerInfo = {
          trans_date: requestData?.trans_date,
          voucher_no: requestData?.voucher_no,
          bill_no: requestData?.bill_no,
          get_pass: requestData?.get_pass,
          receiver_name: requestData?.receiver_name,
          receive_date: requestData?.receive_date,
          party_name: requestData?.party_name,
          customer_name: requestData?.customer_name,
          project_name: requestData?.project_name,
          transport_name: requestData?.transport_name,
          transport_date: requestData?.transport_date,
          vehical_no: requestData?.vehical_no,
          challan_no: requestData?.challan_no,
          lr_no: requestData?.lr_no,
          lr_date: requestData?.lr_date,
          driver_name: requestData?.driver_name,
          unit_location: requestData?.unit_location,
          address: requestData?.address,
          total_qty: requestData?.total_qty,
          amt: requestData?.amt,
          tax_amt: requestData?.tax_amt,
          gst_amt: requestData?.gst_amt,
          total_amt: requestData?.total_amt,
        }

        const template = fs.readFileSync(
          "templates/oneISSWithAmt.html",
          "utf-8"
        );
        const renderedHtml = ejs.render(template, {
          headerInfo,
          items: requestData?.items,
          logoUrl1: process.env.LOGO_URL_1,
          logoUrl2: process.env.LOGO_URL_2,
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

        const pdfBuffer = await generatePDFA4(page, { print_date: true });

        await browser.close();

        const pdfsDir = path.join(__dirname, "../../../pdfs");
        if (!fs.existsSync(pdfsDir)) {
          fs.mkdirSync(pdfsDir);
        }

        const filename = `issue_long_distance${Date.now()}.pdf`;
        const filePath = path.join(__dirname, "../../../pdfs", filename);

        fs.writeFileSync(filePath, pdfBuffer);

        const fileUrl = `${URI}/pdfs/${filename}`;

        sendResponse(res, 200, true, { file: fileUrl }, "PDF downloaded Successfully"
        );

      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Issue report long distance not found`)
      }
      else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong111");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.ISSDownloadWithoutAmtPDF = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await ISSDownload(id)
      const requestData = data.result[0];

      if (data.status === 1) {

        let headerInfo = {
          trans_date: requestData?.trans_date,
          voucher_no: requestData?.voucher_no,
          bill_no: requestData?.bill_no,
          get_pass: requestData?.get_pass,
          receiver_name: requestData?.receiver_name,
          receive_date: requestData?.receive_date,
          party_name: requestData?.party_name,
          customer_name: requestData?.customer_name,
          project_name: requestData?.project_name,
          transport_name: requestData?.transport_name,
          transport_date: requestData?.transport_date,
          vehical_no: requestData?.vehical_no,
          challan_no: requestData?.challan_no,
          lr_no: requestData?.lr_no,
          lr_date: requestData?.lr_date,
          driver_name: requestData?.driver_name,
          unit_location: requestData?.unit_location,
          address: requestData?.address,
          total_qty: requestData?.total_qty,
          amt: requestData?.amt,
          tax_amt: requestData?.tax_amt,
          gst_amt: requestData?.gst_amt,
          total_amt: requestData?.total_amt,
        }

        const template = fs.readFileSync(
          "templates/oneISSWithoutAmt.html",
          "utf-8"
        );
        const renderedHtml = ejs.render(template, {
          headerInfo,
          items: requestData?.items,
          logoUrl1: process.env.LOGO_URL_1,
          logoUrl2: process.env.LOGO_URL_2,
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

        const pdfBuffer = await generatePDFA4(page, { print_date: true });

        await browser.close();

        const pdfsDir = path.join(__dirname, "../../../pdfs");
        if (!fs.existsSync(pdfsDir)) {
          fs.mkdirSync(pdfsDir);
        }

        const filename = `issue_sort_distance_${Date.now()}.pdf`;
        const filePath = path.join(__dirname, "../../../pdfs", filename);

        fs.writeFileSync(filePath, pdfBuffer);

        const fileUrl = `${URI}/pdfs/${filename}`;

        sendResponse(res, 200, true, { file: fileUrl }, "PDF downloaded Successfully"
        );

      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Issue report sort distance not found`)
      }
      else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong111");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};




// Issue return

exports.listISSForISR = async (req, res) => {
  // const { issue_no, challan_no, tag_number, firm_id, year_id } = req.body;
  const { issue_no, challan_no, tag_number, year_id } = req.body;
  if (req.user && !req.error) {
    try {
      // if (tag_number && firm_id && year_id && challan_no || issue_no) {
      if (tag_number && year_id && challan_no || issue_no) {
        const tag_id = await tagId(tag_number);

        let matchObj = {
          deleted: false,
          tag_id: new ObjectId(tag_id),
          // firm_id: new ObjectId(firm_id),
          year_id: new ObjectId(year_id),
        }

        if (challan_no) {
          matchObj.challan_no = challan_no
        }

        if (issue_no) {
          matchObj.voucher_no = issue_no
        }

        let listISSForISR = await Transaction.aggregate([
          { $unwind: "$items_details" },
          {
            $match: {
              deleted: false,
              "items_details.deleted": { $ne: true },
              "items_details.balance_qty": { $gt: 0 },
              "items_details.isreturn": { $eq: false },
            },
          },
          { $match: matchObj },
          {
            $lookup: {
              from: "store-parties",
              localField: "party_id",
              foreignField: "_id",
              as: "partyDetails",
            },
          },
          {
            $lookup: {
              from: "firms",
              localField: "customer_id",
              foreignField: "_id",
              as: "customerDetails",
            },
          },
          {
            $lookup: {
              from: "bussiness-projects",
              localField: "project_id",
              foreignField: "_id",
              as: "projectDetails",
            },
          },
          {
            $lookup: {
              from: "store-items",
              localField: "items_details.item_id",
              foreignField: "_id",
              as: "itemDetails",
            },
          },
          {
            $lookup: {
              from: "employees",
              localField: "gate_pass_no",
              foreignField: "_id",
              as: "getPassDetails",
            },
          },
          {
            $addFields: {
              get_pass_data: {
                _id: { $arrayElemAt: ["$getPassDetails._id", 0] },
                get_pass_no: { $arrayElemAt: ["$getPassDetails.card_no", 0] },
              },
              party_data: {
                _id: { $arrayElemAt: ["$partyDetails._id", 0] },
                name: { $arrayElemAt: ["$partyDetails.name", 0] },
              },
              customer_data: {
                _id: { $arrayElemAt: ["$customerDetails._id", 0] },
                name: { $arrayElemAt: ["$customerDetails.name", 0] },
              },
              project_data: {
                _id: { $arrayElemAt: ["$projectDetails._id", 0] },
                name: { $arrayElemAt: ["$projectDetails.name", 0] },
              },
              "items_details.item_data": {
                _id: { $arrayElemAt: ["$itemDetails._id", 0] },
                name: { $arrayElemAt: ["$itemDetails.name", 0] },
              },
            },
          },
          {
            $group: {
              _id: "$_id",
              party_data: { $first: "$party_data" },
              customer_data: { $first: "$customer_data" },
              get_pass_data: { $first: "$get_pass_data" },
              project_data: { $first: "$project_data" },
              bill_no: { $first: "$bill_no" },
              voucher_no: { $first: "$voucher_no" },
              challan_no: { $first: "$challan_no" },
              isexternal: { $first: "$isexternal" },
              items: { $push: "$items_details" },
            },
          },
          {
            $project: {
              _id: 0,
              party_data: 1,
              customer_data: 1,
              project_data: 1,
              challan_no: 1,
              voucher_no: 1,
              get_pass_data: 1,
              isexternal: 1,
              items: {
                $map: {
                  input: "$items",
                  as: "item",
                  in: {
                    from_id: "$_id",
                    detail_id: "$$item._id",
                    quantity: "$$item.balance_qty",
                    rate: "$$item.rate",
                    gst: "$$item.gst",
                    item_data: "$$item.item_data",
                  },
                },
              },
            },
          },
        ]);
        if (listISSForISR && listISSForISR.length > 0) {
          if (listISSForISR[0].isexternal) {
            delete listISSForISR[0].get_pass_data;
          } else {
            delete listISSForISR[0].challan_no;
          }
          sendResponse(res, 200, true, listISSForISR[0], `ISS for ISR successfully`);
        } else {
          sendResponse(res, 200, true, {}, `ISS not found for ISR`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.addISR = async (req, res) => {
  let {
    // firm_id,
    year_id,
    trans_date,
    tag_number,
    party_id,
    project_id,
    bill_no,
    challan_no,
    gate_pass_no,
    receive_date,
    receiver_name,
    isexternal,
    transport_id,
    transport_date,
    vehical_no,
    lr_no,
    lr_date,
    address,
    driver_name,
    items_details
  } = req.body;

  if (req.user && !req.error) {
    try {
      if (
        // firm_id &&
        year_id &&
        trans_date &&
        tag_number &&
        bill_no &&
        project_id &&
        items_details.length
      ) {

        const tag_id = await tagId(tag_number);

        const voucher_no = await VoucherGen();

        let addISR = await Transaction.create({
          // firm_id,
          year_id,
          trans_date,
          tag_id,
          voucher_no,
          party_id,
          project_id,
          bill_no,
          challan_no,
          receiver_name,
          gate_pass_no,
          isexternal,
          receive_date,
          transport_id,
          transport_date,
          vehical_no,
          lr_no,
          lr_date,
          address,
          challan_no,
          driver_name,
          items_details
        });

        if (addISR) {
          for (const o of items_details) {
            await manageMSitemStock(o.item_id, addISR._id, addISR.tag_id, o.quantity, true);
          }
          await manageMainObjBalanceQty(addISR.items_details, true)             // Main obj balance qty manage
          await manageTransactionItemStatus(addISR.items_details)               // Obj item status manage
          await manageTransactionStatus(addISR.items_details)
          sendResponse(res, 200, true, addISR, `ISR added successfully`);
        } else {
          sendResponse(res, 400, false, {}, `ISR not added`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log("error", error)
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.addISRItem = async (req, res) => {
  let { id, items_details } = req.body

  if (req.user && !req.error) {
    try {
      // const item = JSON.parse(items_details);
      if (
        id &&
        items_details.length //for postman
        // item.length
      ) {
        let existTransaction = await Transaction.findById(id);

        if (!existTransaction) {
          sendResponse(
            res,
            400,
            false,
            {},
            `No issue with this id exist`
          );
        } else {
          const addISRItem = await Transaction.updateOne(
            { _id: id },
            {
              $push: {
                items_details: {
                  $each: items_details, // for postman
                },
                // items_details: {
                // $each: item
                // }
              },
            }
          );

          if (addISRItem.modifiedCount === 1) {
            for (const o of items_details) {
              await manageMSitemStock(o.item_id, id, existTransaction.tag_id, o.quantity, false);
            }
            sendResponse(res, 200, true, {}, `ISR item added successfully`);
          } else {
            sendResponse(res, 400, false, {}, `ISR item not added`);
          }
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.listISR = async (req, res) => {
  // const { tag_number, firm_id, year_id, filter, search } = req.body;
  const { tag_number, year_id, filter, search } = req.body;
  if (req.user && !req.error) {
    try {
      if (tag_number) {
        const tag_id = await tagId(tag_number);

        // const { date } = filter;
        const filter1 = JSON.parse(filter)             //react
        const { date } = filter1;

        const date_start = date && date.start ? new Date(date.start) : new Date("1947-08-15");

        let date_end = date ? (date.end ? new Date(date.end) : new Date()) : new Date();
        date_end.setHours(23, 59, 59, 999);
        const timezoneOffset = date_end.getTimezoneOffset() * 60000;
        date_end = new Date(date_end.getTime() - timezoneOffset);

        const search_by = search ? search.replace(/[^0-9a-zA-Z]/g, "\\$&") : "";

        let matchObj = {
          deleted: false,
          tag_id: tag_id,
          // firm_id: new ObjectId(firm_id),
          // year_id: new ObjectId(year_id),
          trans_date: {
            $gte: new Date(date_start),
            $lte: new Date(date_end),
          },
        }

        // firm_id and year_id if provided
        // if (firm_id) matchObj.firm_id = new ObjectId(firm_id);
        if (year_id) matchObj.year_id = new ObjectId(year_id);

        let matchObj1 = {};

        if (search_by != "") {
          matchObj1 = {
            $or: [
              { voucher_no: { $regex: search_by, $options: "i" } },
              { bill_no: { $regex: search_by, $options: "i" } },
              { challan_no: { $regex: search_by, $options: "i" } },
              { "party_data.name": { $regex: search_by, $options: "i" } },
              { "get_pass_data.get_pass_no": { $regex: search_by, $options: "i" } },
              { "project_data.name": { $regex: search_by, $options: "i" } },
            ],
          };
        }
        const listISR = await Transaction.aggregate([
          { $match: matchObj },
          {
            $lookup: {
              from: "store-parties",
              localField: "party_id",
              foreignField: "_id",
              as: "partyDetails",
            },
          },
          {
            $lookup: {
              from: "bussiness-projects",
              localField: "project_id",
              foreignField: "_id",
              as: "projectDetails",
            },
          },
          {
            $lookup: {
              from: "store-transports",
              localField: "transport_id",
              foreignField: "_id",
              as: "transportDetails",
            },
          },
          {
            $lookup: {
              from: "employees",
              localField: "gate_pass_no",
              foreignField: "_id",
              as: "getPassDetails",
            },
          },
          {
            $addFields: {
              party_data: {
                _id: { $arrayElemAt: ["$partyDetails._id", 0] },
                name: { $arrayElemAt: ["$partyDetails.name", 0] },
              },
              customer_data: {
                _id: { $arrayElemAt: ["$customerDetails._id", 0] },
                name: { $arrayElemAt: ["$customerDetails.name", 0] },
              },
              project_data: {
                _id: { $arrayElemAt: ["$projectDetails._id", 0] },
                name: { $arrayElemAt: ["$projectDetails.name", 0] },
              },
              get_pass_data: {
                _id: { $arrayElemAt: ["$getPassDetails._id", 0] },
                get_pass_no: { $arrayElemAt: ["$getPassDetails.card_no", 0] },
              },
              transport_data: {
                _id: { $arrayElemAt: ["$transportDetails._id", 0] },
                name: { $arrayElemAt: ["$transportDetails.name", 0] },
              },
              item_count: {
                $size: {
                  $filter: {
                    input: "$items_details",
                    as: "item",
                    cond: { $eq: ["$$item.deleted", false] },
                  },
                },
              },
            },
          },
          { $match: matchObj1 },
          {
            $sort: { voucher_no: -1 },
          },
          {
            $project: {
              masterDetails: 0,
              partyDetails: 0,
              projectDetails: 0,
              transportDetails: 0,
              getPassDetails: 0,
              items_details: 0,
              site_location: 0,
              store_location: 0,
              department: 0,
              party_id: 0,
              master_id: 0,
              project_id: 0,
              admin_id: 0,
              tag_id: 0,
              transport_id: 0,
              issue_no: 0,
              return_id: 0,
              payment_date: 0,
              payment_days: 0,
              machine_code: 0,
              pdf: 0,
              po_no: 0,
              return_id: 0,
              deleted: 0,
              createdAt: 0,
              updatedAt: 0,
              __v: 0,
            },
          },
        ]);

        if (listISR.length > 0) {
          sendResponse(res, 200, true, listISR, `ISR list`);
        } else {
          sendResponse(res, 200, true, [], `ISR not found`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, [], "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.oneISR = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      if (id) {
        const oneISR = await Transaction.aggregate([
          {
            $match: { _id: new ObjectId(id) },
          },
          {
            $project: {
              items_details: {
                $filter: {
                  input: "$items_details",
                  as: "item",
                  cond: { $eq: ["$$item.deleted", false] },
                },
              },
            },
          },
          {
            $lookup: {
              from: "store-items",
              let: { items: "$items_details" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: [
                        "$_id",
                        {
                          $map: {
                            input: "$$items",
                            as: "item",
                            in: "$$item.item_id",
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    item_id: "$_id",
                    item_name: "$name",
                  },
                },
              ],
              as: "items_data",
            },
          },
          {
            $addFields: {
              items_details: {
                $map: {
                  input: "$items_details",
                  as: "item",
                  in: {
                    $let: {
                      vars: {
                        itemData: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$items_data",
                                as: "data",
                                cond: {
                                  $eq: ["$$data.item_id", "$$item.item_id"],
                                },
                              },
                            },
                            0,
                          ],
                        },

                      },
                      in: {
                        $mergeObjects: [
                          "$$item",
                          { item_name: { $ifNull: ["$$itemData.item_name", null] } },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
          {
            $project: {
              items_data: 0,
              "items_details.status": 0,
              "items_details.deleted": 0,
              "items_details.category_id": 0,
              "items_details.item_brand": 0,
              "items_details.required_qty": 0,
              "items_details.pr_party": 0,
              "items_details.discount": 0,
              "items_details.discount_amount": 0,
              "items_details.sp_discount": 0,
              "items_details.sp_discount_amount": 0,
              "items_details.return_qty": 0,
              "items_details.balance_qty": 0,
            },
          },
        ]);

        if (oneISR && oneISR.length > 0) {
          sendResponse(res, 200, true, oneISR[0], `ISR found successfully`);
        } else {
          sendResponse(res, 200, true, {}, `ISR not found`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.deleteISR = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      if (id) {
        const deleteISR = await Transaction.findByIdAndUpdate(id, { deleted: true }, { new: true });

        if (deleteISR) {
          await Promise.all(
            deleteISR.items_details.map(
              async (o) =>
                await manageMSitemStockUpdate(o.item_id, id, -o.quantity, true)
            )
          );
          sendResponse(res, 200, true, {}, `ISR deleted successfully`);
        } else {
          sendResponse(res, 400, false, {}, `ISR not delete`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.deleteISRItem = async (req, res) => {
  const { id, itemId } = req.body;
  if (req.user && !req.error) {
    try {
      if (id) {
        const deleteISRItem = await Transaction.updateOne(
          { _id: id, "items_details._id": itemId },
          {
            $set: {
              "items_details.$.deleted": true,
            },
          },
          { new: true }
        )

        if (deleteISRItem.modifiedCount > 0) {
          const deleteItem = await Transaction.findOne(
            { _id: id, "items_details._id": itemId },
            { "items_details.$": 1 }
          );
          await manageMSitemStockUpdate(deleteItem.items_details[0].item_id, deleteItem._id, -deleteItem.items_details[0].quantity, true);
          manageMainObjBalanceQty(deleteItem.items_details, false)
          sendResponse(res, 200, true, {}, `ISR item deleted successfully`);
        } else {
          sendResponse(res, 400, false, {}, `ISR item not delete`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.updateISR = async (req, res) => {
  const {
    id,
    trans_date,
    receiver_name,
    receive_date,
    transport_id,
    transport_date,
    vehical_no,
    lr_no,
    lr_date,
    driver_name,
    address,
  } = req.body;

  if (req.user && !req.error) {
    try {
      if (id) {
        const updateISR = await Transaction.findByIdAndUpdate(
          id,
          {
            trans_date,
            receiver_name,
            receive_date,
            transport_id,
            transport_date,
            vehical_no,
            lr_no,
            lr_date,
            driver_name,
            address,
          },
          { new: true }
        );

        if (updateISR) {
          sendResponse(res, 200, true, updateISR, `ISR update successfully`);
        } else {
          sendResponse(res, 400, false, {}, `ISR not update`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

exports.updateISRItem = async (req, res) => {
  const {
    id,
    item_detail_id,   // item detail object id
    items_details
  } = req.body;

  if (req.user && !req.error) {
    try {
      if (id) {
        const updateISRItem = await Transaction.updateOne(
          { _id: id, "items_details._id": item_detail_id },
          {
            $set: {
              "items_details.$.rate": items_details.rate,
              "items_details.$.amount": items_details.amount,
              "items_details.$.taxable_amount": items_details.taxable_amount,
              "items_details.$.gst": items_details.gst,
              "items_details.$.gst_amount": items_details.gst_amount,
              "items_details.$.total_amount": items_details.total_amount,
              "items_details.$.remarks": items_details.remarks,
            },
          }
        )

        if (updateISRItem.modifiedCount > 0) {
          sendResponse(res, 200, true, {}, `ISR item update successfully`);
        } else {
          sendResponse(res, 400, false, {}, `ISR item not update`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorised");
  }
};

const ISRDownload = async (id) => {
  try {
    const requestData = await Transaction.aggregate([
      { $match: { deleted: false, _id: new ObjectId(id) } },
      { $unwind: "$items_details" },
      {
        $match: {
          "items_details.deleted": { $ne: true },
        },
      },
      {
        $lookup: {
          from: "store-parties",
          localField: "party_id",
          foreignField: "_id",
          as: "partyDetails",
        },
      },
      {
        $lookup: {
          from: "bussiness-projects",
          localField: "project_id",
          foreignField: "_id",
          as: "projectDetails",
        },
      },
      {
        $lookup: {
          from: "store-transports",
          localField: "transport_id",
          foreignField: "_id",
          as: "transportDetails",
        },
      },
      {
        $lookup: {
          from: "employees",
          localField: "gate_pass_no",
          foreignField: "_id",
          as: "getPassDetails",
        },
      },
      {
        $lookup: {
          from: "store-items",
          localField: "items_details.item_id",
          foreignField: "_id",
          as: "itemDetails",
        },
      },
      {
        $addFields: {
          get_pass: { $arrayElemAt: ["$getPassDetails.card_no", 0] },
          party_name: { $arrayElemAt: ["$partyDetails.name", 0] },
          project_name: { $arrayElemAt: ["$projectDetails.name", 0] },
          transport_name: { $arrayElemAt: ["$transportDetails.name", 0] },
          item_name: { $arrayElemAt: ["$itemDetails.name", 0] },
          hsn_code: { $arrayElemAt: ["$itemDetails.hsn_code", 0] },
          mcode: { $arrayElemAt: ["$itemDetails.mcode", 0] },
          party_gstNumber: { $arrayElemAt: ["$partyDetails.gstNumber", 0] },
          party_phone: { $arrayElemAt: ["$partyDetails.phone", 0] },
          party_email: { $arrayElemAt: ["$partyDetails.email", 0] },
        },
      },
      {
        $project: {
          _id: 1,
          trans_date: "$trans_date",
          voucher_no: "$voucher_no",
          bill_no: "$bill_no",
          get_pass: "$get_pass",
          receiver_name: "$receiver_name",
          receive_date: "$receive_date",
          party_name: "$party_name",
          project_name: "$project_name",
          transport_name: "$transport_name",
          transport_date: "$transport_date",
          vehical_no: "$vehical_no",
          challan_no: "$challan_no",
          lr_no: "$lr_no",
          lr_date: "$lr_date",
          driver_name: "$driver_name",
          address: "$address",
          party_gstNumber: "$party_gstNumber",
          party_phone: "$party_phone",
          party_email: "$party_email",
          items: {
            _id: "$items_details._id",
            item_name: "$item_name",
            unit: "$items_details.unit",
            mcode: "$mcode",
            hsn_code: "$hsn_code",
            isreturn: "$items_details.isreturn",
            quantity: "$items_details.quantity",
            rate: "$items_details.rate",
            amount: "$items_details.amount",
            taxable_amount: "$items_details.taxable_amount",
            gst: "$items_details.gst",
            gst_amount: "$items_details.gst_amount",
            total_amount: "$items_details.total_amount",
            remarks: "$items_details.remarks",
          },
        },
      },
      {
        $group: {
          _id: {
            _id: "$_id",
            trans_date: "$trans_date",
            voucher_no: "$voucher_no",
            bill_no: "$bill_no",
            get_pass: "$get_pass",
            receiver_name: "$receiver_name",
            receive_date: "$receive_date",
            party_name: "$party_name",
            project_name: "$project_name",
            transport_name: "$transport_name",
            transport_date: "$transport_date",
            vehical_no: "$vehical_no",
            challan_no: "$challan_no",
            lr_no: "$lr_no",
            lr_date: "$lr_date",
            driver_name: "$driver_name",
            address: "$address",
            party_gstNumber: "$party_gstNumber",
            party_phone: "$party_phone",
            party_email: "$party_email",
          },
          items: { $push: "$items" },
          total_qty: { $sum: "$items.quantity" },
          amt: { $sum: "$items.amount" },
          tax_amt: { $sum: "$items.taxable_amount" },
          gst_amt: { $sum: "$items.gst_amount" },
          total_amt: { $sum: "$items.total_amount" },
        },
      },
      {
        $project: {
          _id: "$_id._id",
          trans_date: "$_id.trans_date",
          voucher_no: "$_id.voucher_no",
          bill_no: "$_id.bill_no",
          get_pass: "$_id.get_pass",
          receiver_name: "$_id.receiver_name",
          receive_date: "$_id.receive_date",
          party_name: "$_id.party_name",
          project_name: "$_id.project_name",
          transport_name: "$_id.transport_name",
          transport_date: "$_id.transport_date",
          vehical_no: "$_id.vehical_no",
          challan_no: "$_id.challan_no",
          lr_no: "$_id.lr_no",
          lr_date: "$_id.lr_date",
          driver_name: "$_id.driver_name",
          address: "$_id.address",
          party_gstNumber: "$_id.party_gstNumber",
          party_phone: "$_id.party_phone",
          party_email: "$_id.party_email",
          items: 1,
          total_qty: 1,
          amt: 1,
          tax_amt: 1,
          gst_amt: 1,
          total_amt: 1,
        },
      },
    ]);
    if (requestData.length && requestData.length > 0) {
      return { status: 1, result: requestData };
    } else {
      return { status: 0, result: [] };
    }
  } catch (error) {
    return { status: 2, result: error };
  }
};

exports.ISRDownloadList = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await ISRDownload(id)
      if (data.status === 1) {
        sendResponse(res, 200, true, data.result, `Issue return found`);
      } else if (data.status === 0) {
        sendResponse(res, 200, true, [], `Issue return not found`);
      } else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.ISRDownloadPDF = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await ISSDownload(id)
      const requestData = data.result[0];

      if (data.status === 1) {

        let headerInfo = {
          trans_date: requestData?.trans_date,
          voucher_no: requestData?.voucher_no,
          bill_no: requestData?.bill_no,
          get_pass: requestData?.get_pass,
          receiver_name: requestData?.receiver_name,
          receive_date: requestData?.receive_date,
          party_name: requestData?.party_name,
          project_name: requestData?.project_name,
          transport_name: requestData?.transport_name,
          transport_date: requestData?.transport_date,
          vehical_no: requestData?.vehical_no,
          challan_no: requestData?.challan_no,
          lr_no: requestData?.lr_no,
          lr_date: requestData?.lr_date,
          driver_name: requestData?.driver_name,
          address: requestData?.address,
          total_qty: requestData?.total_qty,
          amt: requestData?.amt,
          tax_amt: requestData?.tax_amt,
          gst_amt: requestData?.gst_amt,
          total_amt: requestData?.total_amt,
        }

        const template = fs.readFileSync(
          "templates/oneISR.html",
          "utf-8"
        );
        const renderedHtml = ejs.render(template, {
          headerInfo,
          items: requestData?.items,
          logoUrl1: process.env.LOGO_URL_1,
          logoUrl2: process.env.LOGO_URL_2,
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

        const pdfBuffer = await generatePDF(page, { print_date: true });

        await browser.close();

        const pdfsDir = path.join(__dirname, "../../../pdfs");
        if (!fs.existsSync(pdfsDir)) {
          fs.mkdirSync(pdfsDir);
        }

        const filename = `issue_return_${Date.now()}.pdf`;
        const filePath = path.join(__dirname, "../../../pdfs", filename);

        fs.writeFileSync(filePath, pdfBuffer);

        const fileUrl = `${URI}/pdfs/${filename}`;

        sendResponse(res, 200, true, { file: fileUrl }, "PDF downloaded Successfully"
        );

      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Issue returnreport not found`)
      }
      else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong111");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.ISRDownloadWithAmtPDF = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await ISRDownload(id)
      const requestData = data.result[0];

      if (data.status === 1) {

        let headerInfo = {
          trans_date: requestData?.trans_date,
          voucher_no: requestData?.voucher_no,
          bill_no: requestData?.bill_no,
          get_pass: requestData?.get_pass,
          receiver_name: requestData?.receiver_name,
          receive_date: requestData?.receive_date,
          party_name: requestData?.party_name,
          project_name: requestData?.project_name,
          transport_name: requestData?.transport_name,
          transport_date: requestData?.transport_date,
          vehical_no: requestData?.vehical_no,
          challan_no: requestData?.challan_no,
          lr_no: requestData?.lr_no,
          lr_date: requestData?.lr_date,
          driver_name: requestData?.driver_name,
          address: requestData?.address,
          total_qty: requestData?.total_qty,
          amt: requestData?.amt,
          tax_amt: requestData?.tax_amt,
          gst_amt: requestData?.gst_amt,
          total_amt: requestData?.total_amt,
        }

        const template = fs.readFileSync(
          "templates/oneISRWithAmt.html",
          "utf-8"
        );
        const renderedHtml = ejs.render(template, {
          headerInfo,
          items: requestData?.items,
          logoUrl1: process.env.LOGO_URL_1,
          logoUrl2: process.env.LOGO_URL_2,
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

        const pdfBuffer = await generatePDFA4(page, { print_date: true });

        await browser.close();

        const pdfsDir = path.join(__dirname, "../../../pdfs");
        if (!fs.existsSync(pdfsDir)) {
          fs.mkdirSync(pdfsDir);
        }

        const filename = `issue_return_long_distance${Date.now()}.pdf`;
        const filePath = path.join(__dirname, "../../../pdfs", filename);

        fs.writeFileSync(filePath, pdfBuffer);

        const fileUrl = `${URI}/pdfs/${filename}`;

        sendResponse(res, 200, true, { file: fileUrl }, "PDF downloaded Successfully"
        );

      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Issue return report long distance not found`)
      }
      else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong111");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.ISRDownloadWithoutAmtPDF = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await ISRDownload(id)
      const requestData = data.result[0];

      if (data.status === 1) {

        let headerInfo = {
          trans_date: requestData?.trans_date,
          voucher_no: requestData?.voucher_no,
          bill_no: requestData?.bill_no,
          get_pass: requestData?.get_pass,
          receiver_name: requestData?.receiver_name,
          receive_date: requestData?.receive_date,
          party_name: requestData?.party_name,
          project_name: requestData?.project_name,
          transport_name: requestData?.transport_name,
          transport_date: requestData?.transport_date,
          vehical_no: requestData?.vehical_no,
          challan_no: requestData?.challan_no,
          lr_no: requestData?.lr_no,
          lr_date: requestData?.lr_date,
          driver_name: requestData?.driver_name,
          address: requestData?.address,
          total_qty: requestData?.total_qty,
          amt: requestData?.amt,
          tax_amt: requestData?.tax_amt,
          gst_amt: requestData?.gst_amt,
          total_amt: requestData?.total_amt,
        }

        const template = fs.readFileSync(
          "templates/oneISRWithoutAmt.html",
          "utf-8"
        );
        const renderedHtml = ejs.render(template, {
          headerInfo,
          items: requestData?.items,
          logoUrl1: process.env.LOGO_URL_1,
          logoUrl2: process.env.LOGO_URL_2,
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

        const pdfBuffer = await generatePDFA4(page, { print_date: true });

        await browser.close();

        const pdfsDir = path.join(__dirname, "../../../pdfs");
        if (!fs.existsSync(pdfsDir)) {
          fs.mkdirSync(pdfsDir);
        }

        const filename = `issue_return_sort_distance_${Date.now()}.pdf`;
        const filePath = path.join(__dirname, "../../../pdfs", filename);

        fs.writeFileSync(filePath, pdfBuffer);

        const fileUrl = `${URI}/pdfs/${filename}`;

        sendResponse(res, 200, true, { file: fileUrl }, "PDF downloaded Successfully"
        );

      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Issue return report sort distance not found`)
      }
      else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong111");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};



// Item Summary

// const listItemSummary = async (filter, search, tag, firm_id, year_id) => {
const listItemSummary = async (filter, search, tag, year_id) => {
  try {
    // const { date } = filter;
    // let tag_number = tag
    const filter1 = JSON.parse(filter)             //react
    const { date } = filter1;
    let tag_number = JSON.parse(tag)
    const date_start = date && date.start ? new Date(date.start) : new Date("1947-08-15");
    let date_end = date ? (date.end ? new Date(date.end) : new Date()) : new Date();
    date_end.setHours(23, 59, 59, 999);
    const timezoneOffset = date_end.getTimezoneOffset() * 60000; // Offset in milliseconds
    date_end = new Date(date_end.getTime() - timezoneOffset);

    let sdate = null
    let edate = null
    if (date.start && date.end) {
      sdate = date.start
      edate = date.end
    }


    let matchObj = {
      deleted: false,
      // firm_id: new ObjectId(firm_id),
      year_id: new ObjectId(year_id),
      trans_date: {
        $gte: new Date(date_start),
        $lte: new Date(date_end),
      },
    }

    let matchObj1 = {}
    if (search != "") {
      const searchRegex = new RegExp(`^${search}`, 'i');
      matchObj1 = {
        $or: [
          { item_name: searchRegex },
          { category: searchRegex },
          { m_code: searchRegex }
        ]
      };
    }

    let transactionTypes = [
      { tag_number: 11, tag_name: "Purchase" },
      { tag_number: 12, tag_name: "Purchase Return" },
      { tag_number: 13, tag_name: "Issue" },
      { tag_number: 14, tag_name: "Issue Return" },
    ];

    let requestData = await Transaction.aggregate([
      { $match: matchObj },
      { $unwind: "$items_details" },
      {
        $match: {
          "items_details.deleted": { $ne: true },
        },
      },
      {
        $lookup: {
          from: "store-items",
          localField: "items_details.item_id",
          foreignField: "_id",
          as: "itemDetails",
          pipeline: [
            {
              $lookup: {
                from: "store-item-units",
                localField: "unit",
                foreignField: "_id",
                as: "unitDetails",
                pipeline: [{ $project: { _id: 0, name: 1 } }],
              },
            },
            {
              $lookup: {
                from: "store-item-categories",
                localField: "category",
                foreignField: "_id",
                as: "categoryDetails",
                pipeline: [{ $project: { _id: 0, name: 1 } }],
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                unit: { $arrayElemAt: ["$unitDetails.name", 0] },
                category: { $arrayElemAt: ["$categoryDetails.name", 0] },
                mcode: 1,
                material_grade: 1,
                reorder_quantity: 1,
                ItemId: 1,
                hsn_code: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$itemDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "tags",
          localField: "tag_id",
          foreignField: "_id",
          as: "tagDetails",
        },
      },
      {
        $addFields: {
          tag_number: { $arrayElemAt: ["$tagDetails.tag_number", 0] },
          tag_name: { $arrayElemAt: ["$tagDetails.title", 0] },
        },
      },
      {
        $match: {
          tag_number: { $eq: tag_number },
        },
      },
      {
        $group: {
          _id: {
            item_id: "$items_details.item_id",
            itemId: "$itemDetails.ItemId",
            item_name: "$itemDetails.name",
            unit: "$itemDetails.unit",
            category: "$itemDetails.category",
            m_code: "$itemDetails.mcode",
            tag_number: "$tag_number",
            tag_name: "$tag_name",
          },
          item_details: {
            $push: {
              quantity: "$items_details.quantity",
              rate: "$items_details.rate",
              total_amount: "$items_details.total_amount",
            },
          },
          total_qty: { $sum: "$items_details.quantity" },
          total_amt: { $sum: "$items_details.total_amount" },
        },
      },
      {
        $group: {
          _id: {
            item_id: "$_id.item_id",
            itemId: "$_id.itemId",
            item_name: "$_id.item_name",
            unit: "$_id.unit",
            category: "$_id.category",
            m_code: "$_id.m_code",
          },
          details: {
            $push: {
              tag_number: "$_id.tag_number",
              tag_name: "$_id.tag_name",
              item_details: "$item_details",
            },
          },
          total_qty: { $sum: "$total_qty" },
          total_amt: { $sum: "$total_amt" },
        },
      },
      {
        $addFields: {
          details: {
            $map: {
              input: transactionTypes,
              as: "type",
              in: {
                $let: {
                  vars: {
                    existing: {
                      $filter: {
                        input: "$details",
                        as: "detail",
                        cond: { $eq: ["$$detail.tag_number", "$$type.tag_number"] },
                      },
                    },
                  },
                  in: {
                    tag_number: "$$type.tag_number",
                    tag_name: "$$type.tag_name",
                    item_details: {
                      $cond: {
                        if: { $gt: [{ $size: "$$existing" }, 0] },
                        then: { $arrayElemAt: ["$$existing.item_details", 0] },
                        else: [{
                          quantity: null,
                          rate: null,
                          total_amount: null
                        }],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          details: {
            $filter: {
              input: "$details",
              as: "detail",
              cond: { $eq: ["$$detail.tag_number", tag_number] },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          item_id: "$_id.item_id",
          itemId: "$_id.itemId",
          item_name: "$_id.item_name",
          unit: "$_id.unit",
          category: "$_id.category",
          m_code: "$_id.m_code",
          details: 1,
          total_qty: 1,
          total_amt: 1,
          sdate: sdate,
          edate: edate,
        },
      },
      { $match: matchObj1 },
    ]);

    if (requestData.length && requestData.length > 0) {
      return { status: 1, result: requestData };
    } else {
      return { status: 0, result: [] };
    }
  } catch (error) {
    return { status: 2, result: error };
  }
};

exports.itemSummaryList = async (req, res) => {
  // const { filter, search, tag_number, firm_id, year_id } = req.body;
  const { filter, search, tag_number, year_id } = req.body;
  if (req.user && !req.error) {
    try {
      // const data = await listItemSummary(filter, search, tag_number, firm_id, year_id)
      const data = await listItemSummary(filter, search, tag_number, year_id)
      if (data.status === 1) {
        sendResponse(res, 200, true, data.result, `Item summary list`);
      } else if (data.status === 0) {
        sendResponse(res, 200, true, [], `Item summary not found`);
      } else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.itemSummaryPDFRport = async (req, res) => {
  // const { filter, search, tag_number, print_date, firm_id, year_id } = req.body;
  const { filter, search, tag_number, print_date, year_id } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await listItemSummary(filter, search, tag_number, year_id)
      const requestData = data.result;

      if (data.status === 1) {
        if (data.result.length && data.result.length > 0) {
          const template = fs.readFileSync(
            "templates/itemSummary.html",
            "utf-8"
          );
          const renderedHtml = ejs.render(template, {
            requestData,
            logoUrl1: process.env.LOGO_URL_1,
            logoUrl2: process.env.LOGO_URL_2,
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
            size: "A4",
            // width: "13in",
            // height: "17in",
            margin: {
              top: "0.5in",
              right: "0.5in",
              bottom: "0.7in",
              left: "0.5in",
            },
            printBackground: true,
            preferCSSPageSize: true,
            displayHeaderFooter: true,
            footerTemplate: `
              <div style="font-size: 14px; width: 100%; text-align: right; padding-right: 50px; padding-bottom: 30px;">
                ${print_date ? `<span>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>` : ''}
                ${print_date ? '&nbsp;&nbsp;&nbsp;' : ''}
                Page <span class="pageNumber"></span> of <span class="totalPages"></span>
              </div>
            `,
            headerTemplate: `<div></div>`,
            compress: true,
          });

          await browser.close();

          const pdfsDir = path.join(__dirname, "../../../pdfs");
          if (!fs.existsSync(pdfsDir)) {
            fs.mkdirSync(pdfsDir);
          }

          const filename = `item_summary_${Date.now()}.pdf`;
          const filePath = path.join(__dirname, "../../../pdfs", filename);

          fs.writeFileSync(filePath, pdfBuffer);

          const fileUrl = `${URI}/pdfs/${filename}`;

          sendResponse(res, 200, true, { file: fileUrl }, "PDF downloaded Successfully"
          );
        } else {
          sendResponse(res, 200, false, {}, `Item Summary report not found`)
        }
      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Item Summary report not found`)
      }
      else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong111");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};


exports.itemSummaryExcelReport = async (req, res) => {
  const { filter, search, tag_number, print_date, year_id } = req.body;

  if (req.user && !req.error) {
    try {
      const data = await listItemSummary(filter, search, tag_number, year_id);
      const requestData = data.result;

      if (data.status === 1 && requestData.length > 0) {
        const ws_data = [];

        // Header row with title and optional date
        ws_data.push([
          "Item Summary Report",
          "",
          "",
          print_date ? "Download Date" : "",
          print_date ? new Date().toLocaleDateString() : ""
        ]);
        ws_data.push([]); // Empty row
        ws_data.push([
          "SR NO.",
          "ITEM NAME",
          "MATERIAL GRADE",
          "UNIT",
          "QUANTITY",
          "WEIGHT"
        ]);

        requestData.forEach((item, i) => {
          ws_data.push([
            i + 1,
            item.item_name || '',
            item.m_code || '',
            item.unit || '',
            item.total_qty || '',
            item.total_amt || ''




          ]);
        });

        const worksheet = XLSX.utils.aoa_to_sheet(ws_data);

        // Optional: merge cells for header
        worksheet['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }
        ];

        // Optional: set column widths
        worksheet['!cols'] = [
          { wch: 6 },
          { wch: 25 },
          { wch: 20 },
          { wch: 10 },
          { wch: 12 },
          { wch: 12 }
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Item Summary");

        const xlsxPath = path.join(__dirname, "../../../xlsx");
        if (!fs.existsSync(xlsxPath)) {
          fs.mkdirSync(xlsxPath, { recursive: true });
        }

        const filename = `item_summary_${Date.now()}.xlsx`;
        const filePath = path.join(xlsxPath, filename);
        XLSX.writeFile(workbook, filePath);

        const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;

        sendResponse(res, 200, true, { file: fileUrl }, "Excel downloaded successfully");
      } else {
        sendResponse(res, 200, false, {}, "Item Summary report not found");
      }
    } catch (error) {
      console.error("Excel Export Error:", error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};
// Item Ledger

// const listItemLedger = async (filter, search, firm_id, year_id) => {
const listItemLedger = async (filter, search, year_id) => {
  try {
    // const { date } = filter;
    const filter1 = JSON.parse(filter)             //react
    const { date } = filter1;
    const date_start = date && date.start ? new Date(date.start) : new Date("1947-08-15");
    let date_end = date ? (date.end ? new Date(date.end) : new Date()) : new Date();
    date_end.setHours(23, 59, 59, 999);
    const timezoneOffset = date_end.getTimezoneOffset() * 60000; // Offset in milliseconds
    date_end = new Date(date_end.getTime() - timezoneOffset);

    let sdate = null;
    let edate = null;
    if (date.start && date.end) {
      sdate = date.start;
      edate = date.end;
    }

    let matchObj = {
      deleted: false,
      // firm_id: new ObjectId(firm_id),
      year_id: new ObjectId(year_id),
      trans_date: {
        $gte: date_start,
        $lte: date_end,
      },
    };


    let matchObj1 = {}
    if (search != "") {
      const searchRegex = new RegExp(`^${search}`, 'i');
      matchObj1 = {
        $or: [
          { item_name: searchRegex },
          { category: searchRegex },
          { m_code: searchRegex }
        ]
      };
    }

    const transIds = await Transaction.distinct('_id', matchObj)

    const requestData1 = await MSStock.aggregate([
      {
        $facet: {
          requestData: [
            {
              $lookup: {
                from: "ms_trans_details",
                localField: "transaction_id",
                foreignField: "_id",
                as: "transDetails",
              },
            },
            {
              $match: {
                deleted: false,
                // "transDetails.firm_id": new ObjectId(firm_id),///
                // "transDetails.year_id": new ObjectId(year_id),
                transaction_id: { $nin: transIds },
              }
            },
            {
              $group: {
                _id: "$item_id",
                totalIn: { $sum: "$in" },
                totalOut: { $sum: "$out" },
              },
            },
            {
              $project: {
                _id: 0,
                item_id: "$_id",
                totalIn: 1,
                totalOut: 1,
                opening_balance: { $subtract: ["$totalIn", "$totalOut"] },
              },
            }
          ],
          requestData1: [
            {
              $lookup: {
                from: "ms_trans_details",
                localField: "transaction_id",
                foreignField: "_id",
                as: "transDetails",
              },
            },
            {
              $match: {
                deleted: false,
                // "transDetails.firm_id": new ObjectId(firm_id),//
                "transDetails.year_id": new ObjectId(year_id),
                transaction_id: { $in: transIds },
              }
            },
            {
              $group: {
                _id: "$item_id",
                date_totalIn: { $sum: "$in" },
                date_totalOut: { $sum: "$out" },
              },
            },
            {
              $project: {
                _id: 0,
                item_id: "$_id",
                date_totalIn: 1,
                date_totalOut: 1,
                date_balance: { $subtract: ["$date_totalIn", "$date_totalOut"] },
              },
            }
          ]
        }
      },
      {
        $project: {
          items: {
            $map: {
              input: {
                $setUnion: [
                  { $map: { input: "$requestData", as: "r", in: "$$r.item_id" } },
                  { $map: { input: "$requestData1", as: "r1", in: "$$r1.item_id" } }
                ]
              },
              as: "item_id",
              in: {
                $let: {
                  vars: {
                    reqData: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$requestData",
                            cond: { $eq: ["$$this.item_id", "$$item_id"] }
                          }
                        },
                        0
                      ]
                    },
                    reqData1: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$requestData1",
                            cond: { $eq: ["$$this.item_id", "$$item_id"] }
                          }
                        },
                        0
                      ]
                    }
                  },
                  in: {
                    item_id: "$$item_id",
                    opening_balance: { $ifNull: ["$$reqData.opening_balance", 0] },
                    date_totalIn: { $ifNull: ["$$reqData1.date_totalIn", 0] },
                    date_totalOut: { $ifNull: ["$$reqData1.date_totalOut", 0] },
                    balance: {
                      $add: [
                        { $ifNull: ["$$reqData.opening_balance", 0] },
                        { $ifNull: ["$$reqData1.date_balance", 0] }
                      ]
                    },
                  }
                }
              }
            }
          }
        }
      },
      {
        $unwind: "$items"
      },
      {
        $lookup: {
          from: "store-items",
          localField: "items.item_id",
          foreignField: "_id",
          as: "itemDetails",
          pipeline: [
            {
              $lookup: {
                from: "store-item-units",
                localField: "unit",
                foreignField: "_id",
                as: "unitDetails",
                pipeline: [{ $project: { _id: 0, name: 1 } }],
              },
            },
            {
              $lookup: {
                from: "store-item-categories",
                localField: "category",
                foreignField: "_id",
                as: "categoryDetails",
                pipeline: [{ $project: { _id: 0, name: 1 } }],
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                unit: { $arrayElemAt: ["$unitDetails.name", 0] },
                category: { $arrayElemAt: ["$categoryDetails.name", 0] },
                mcode: 1,
                material_grade: 1,
                hsn_code: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$itemDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          item_id: "$items.item_id",
          opening_balance: "$items.opening_balance",
          date_totalIn: "$items.date_totalIn",
          date_totalOut: "$items.date_totalOut",
          balance: "$items.balance",
          item_name: "$itemDetails.name",
          unit: "$itemDetails.unit",
          m_code: "$itemDetails.mcode",
          hsn_code: "$itemDetails.hsn_code",
          category: "$itemDetails.category",
          material_grade: "$itemDetails.material_grade",
          sdate: sdate,
          edate: edate
        }
      },
      {
        $match: matchObj1
      }
    ]);


    let transactionTypes = [
      { tag_number: 11, tag_name: "PU" },
      { tag_number: 12, tag_name: "PR" },
      { tag_number: 13, tag_name: "ISS" },
      { tag_number: 14, tag_name: "ISR" },
    ];

    const requestData = await Transaction.aggregate([
      { $match: matchObj },
      { $unwind: "$items_details" },
      {
        $match: {
          "items_details.deleted": { $ne: true },
        },
      },
      {
        $lookup: {
          from: "tags",
          localField: "tag_id",
          foreignField: "_id",
          as: "tagDetails",
        },
      },
      {
        $lookup: {
          from: "store-parties",
          localField: "party_id",
          foreignField: "_id",
          as: "partyDetails",
        },
      },
      {
        $addFields: {
          tag_number: { $arrayElemAt: ["$tagDetails.tag_number", 0] },
          tag_name: { $arrayElemAt: ["$tagDetails.title", 0] },
          party_name: { $arrayElemAt: ["$partyDetails.name", 0] },
          trans_date: "$trans_date",
          item_id: "$items_details.item_id",
        },
      },
      {
        $match: {
          tag_number: { $in: [11, 12, 13, 14] },
          // tag_number: { $ne: 15 },
        },
      },
      {
        $addFields: {
          "items_details.in": {
            $cond: {
              if: { $or: [{ $eq: ["$tag_number", 11] }, { $eq: ["$tag_number", 14] }] },
              then: "$items_details.quantity",
              else: 0,
            },
          },
          // "items_details.in": {
          //   $cond: {
          //     if: { $eq: ["$tag_number", 11] },
          //     then: "$items_details.quantity",
          //     else: {
          //       $cond: {
          //         if: { $eq: ["$tag_number", 14] },
          //         then: "$items_details.return_qty",
          //         else: 0
          //       }
          //     }
          //   }
          // },
          "items_details.out": {
            $cond: {
              if: { $or: [{ $eq: ["$tag_number", 12] }, { $eq: ["$tag_number", 13] }] },
              then: "$items_details.quantity",
              else: 0,
            },
          },
          // "items_details.out": {
          //   $cond: {
          //     if: { $eq: ["$tag_number", 12] },
          //     then: "$items_details.return_qty",
          //     else: {
          //       $cond: {
          //         if: { $eq: ["$tag_number", 13] },
          //         then: "$items_details.quantity",
          //         else: 0
          //       }
          //     }
          //   },
          // },
          "items_details.op_balance": 0,
        },
      },
      {
        $addFields: {
          "items_details.balance": {
            $subtract: [
              { $add: ["$items_details.op_balance", "$items_details.in"] },
              "$items_details.out",
            ],
          },
        },
      },
      {
        $group: {
          _id: {
            tag_number: "$tag_number",
            tag_name: "$tag_name",
            voucher_no: "$voucher_no",
            party_name: "$party_name",
            bill_no: "$bill_no",
            trans_date: "$trans_date",
            item_id: "$item_id",
          },
          trans_details: {
            $push: {
              voucher_no: "$voucher_no",
              bill_no: "$bill_no",
              party_name: "$party_name",
              item_details: {
                in: "$items_details.in",
                out: "$items_details.out",
                op_balance: "$items_details.op_balance",
                balance: "$items_details.balance",
              },
            },
          },
        },
      },
      {
        $group: {
          _id: {
            item_id: "$_id.item_id",
            trans_date: "$_id.trans_date",
          },
          tag_details: {
            $push: {
              tag_number: "$_id.tag_number",
              tag_name: "$_id.tag_name",
              trans_details: "$trans_details",
            },
          },
        },
      },
      {
        $addFields: {
          tag_details: {
            $map: {
              input: transactionTypes,
              as: "type",
              in: {
                $let: {
                  vars: {
                    existing: {
                      $filter: {
                        input: "$tag_details",
                        as: "detail",
                        cond: { $eq: ["$$detail.tag_number", "$$type.tag_number"] },
                      },
                    },
                  },
                  in: {
                    tag_number: "$$type.tag_number",
                    tag_name: "$$type.tag_name",
                    trans_details: {
                      $cond: {
                        if: { $gt: [{ $size: "$$existing" }, 0] },
                        then: {
                          $reduce: {
                            input: "$$existing",
                            initialValue: [],
                            in: { $concatArrays: ["$$value", "$$this.trans_details"] },
                          },
                        },
                        else: null,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: "$_id.item_id",
          order_details: {
            $push: {
              trans_date: "$_id.trans_date",
              tag_details: "$tag_details",
            },
          },
        },
      },
      {
        $addFields: {
          tag_details: {
            $map: {
              input: "$tag_details",
              as: "tag",
              in: {
                tag_number: "$$tag.tag_number",
                tag_name: "$$tag.tag_name",
                trans_details: {
                  $sortArray: {
                    input: "$$tag.trans_details",
                    sortBy: { voucher_no: 1 },
                  },
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          order_details: {
            $sortArray: {
              input: "$order_details",
              sortBy: { trans_date: 1 },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          item_id: "$_id",
          order_details: 1,
        },
      },
    ]);


    function mergeRequestData(requestData, requestData1) {
      const data1Map = new Map(requestData1.map(item => [item.item_id.toString(), item]));

      const mergedData = [];
      requestData.forEach(item => {
        const itemIdString = item.item_id.toString();
        const matchedItem = data1Map.get(itemIdString);
        if (matchedItem) {
          mergedData.push({
            ...item,
            ...matchedItem
          });
        }
      });

      const sortedMergedData = mergedData.sort((a, b) => {
        const nameA = a?.item_name?.toLowerCase();
        const nameB = b?.item_name?.toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
      });

      return sortedMergedData;
    }

    const mergedResponse = mergeRequestData(requestData, requestData1);

    if (mergedResponse.length && mergedResponse.length > 0) {
      return { status: 1, result: mergedResponse };
    } else {
      return { status: 0, result: [] };
    }
  } catch (error) {
    return { status: 2, result: error };
  }
};

exports.itemLedgerList = async (req, res) => {
  // const { filter, search, firm_id, year_id } = req.body;
  const { filter, search, year_id } = req.body;
  if (req.user && !req.error) {
    try {
      // const data = await listItemLedger(filter, search, firm_id, year_id)
      const data = await listItemLedger(filter, search, year_id)
      if (data.status === 1) {
        sendResponse(res, 200, true, data.result, `Item summary list`);
      } else if (data.status === 0) {
        sendResponse(res, 200, true, [], `Item summary not found`);
      } else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } catch (error) {
      console.error("itemLedgerList error:", error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.itemLedgerPDFRport = async (req, res) => {
  // const { filter, search, print_date, firm_id, year_id } = req.body;
  const { filter, search, print_date, year_id } = req.body;
  // console.log("req.body", req.body);
  if (req.user && !req.error) {
    try {
      // const data = await listItemLedger(filter, search, firm_id, year_id)
      const data = await listItemLedger(filter, search, year_id)
      const requestData = data.result;

      if (data.status === 1) {
        if (data.result.length && data.result.length > 0) {
          const template = fs.readFileSync(
            "templates/itemLedger.html",
            "utf-8"
          );
          const renderedHtml = ejs.render(template, {
            requestData,
            logoUrl1: process.env.LOGO_URL_1,
            logoUrl2: process.env.LOGO_URL_2,
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
            size: "A4",
            margin: {
              top: "0.5in",
              right: "0.5in",
              bottom: "0.7in",
              left: "0.5in",
            },
            printBackground: true,
            preferCSSPageSize: true,
            displayHeaderFooter: true,
            footerTemplate: `
              <div style="font-size: 14px; width: 100%; text-align: right; padding-right: 50px; padding-bottom: 30px;">
                ${print_date ? `<span>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>` : ''}
                ${print_date ? '&nbsp;&nbsp;&nbsp;' : ''}
                Page <span class="pageNumber"></span> of <span class="totalPages"></span>
              </div>
            `,
            headerTemplate: `<div></div>`,
            compress: true,
          });

          await browser.close();

          const pdfsDir = path.join(__dirname, "../../../pdfs");
          if (!fs.existsSync(pdfsDir)) {
            fs.mkdirSync(pdfsDir);
          }

          const filename = `item_ledger_${Date.now()}.pdf`;
          const filePath = path.join(__dirname, "../../../pdfs", filename);

          fs.writeFileSync(filePath, pdfBuffer);

          const fileUrl = `${URI}/pdfs/${filename}`;

          sendResponse(res, 200, true, { file: fileUrl }, "PDF downloaded Successfully"
          );
        } else {
          sendResponse(res, 200, false, {}, `Item Ledger report not found`)
        }
      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Item Ledger report not found`)
      }
      else if (data.status === 2) {
        // console.log(data.result);
        sendResponse(res, 500, false, {}, "Something went wrong111");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};