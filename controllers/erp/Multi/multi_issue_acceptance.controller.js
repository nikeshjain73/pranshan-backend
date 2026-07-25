const IssueAcceptance = require("../../../models/erp/Multi/multi_issue_acceptance.model");
const IssueRequest = require("../../../models/erp/Multi/multi_issue_request.model");
const GridItem = require("../../../models/erp/planner/draw_grid_items.model");
const TransactedItem = require("../../../models/store/transaction_item.model");
const { TitleFormat, Status } = require("../../../utils/enum");
const { sendResponse } = require("../../../helper/response");
const purchase_offerModel = require("../../../models/store/purchase_offer.model");
const ejs = require("ejs");
const puppeteer = require("puppeteer");
const path = require("path");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;
const fs = require("fs");
const {
  generatePDF,
  generatePDFWithoutPrintDate,
} = require("../../../utils/pdfUtils");
const ExcelJS = require("exceljs");
const Draw = require("../../../models/erp/planner/draw.model");
const mongoose = require("mongoose");
const User = require("../../../models/users.model");
const ErpRole = require("../../../models/erp/erp_role.model");
const Project = require("../../../models/project.model");
const addEmailJob = require("../../../utils/emailJob");
const sendEmail = require("../../../utils/sendEmail");
const commonStageOfferEmail = require("../../../utils/commonStageOfferEmail");
const commonStageAcceptanceEmail = require("../../../utils/commonStageAcceptanceEmail");

//original code
// exports.manageIssueAcceptance = async (req, res) => {
//   const { issue_req_id, items, issued_by, project, isFd } = req.body;

//   if (!req.user || req.error) {
//     return sendResponse(res, 401, false, {}, "Unauthorized");
//   }

//   if (!issue_req_id || !items || !issued_by || !project) {
//     return sendResponse(res, 400, false, {}, "Missing parameters");
//   }

//   try {
//     let lastaccepted = await IssueAcceptance.findOne({ deleted: false, issue_accept_no: { $regex: `/${project}/` } }, {}, { sort: { createdAt: -1 } });

//     let issue_acc_No = "1";
//     if (lastaccepted && lastaccepted.issue_accept_no) {
//       const split = lastaccepted.issue_accept_no.split("/");
//       const lastacceptedNo = parseInt(split[split.length - 1]);
//       issue_acc_No = lastacceptedNo + 1;
//     }
//     const gen_issue_acc_No = TitleFormat.issueAcceptNo.replace("/PROJECT/", `/${project}/`) + issue_acc_No;
//     const newItems = JSON.parse(items) || [];
//     const issueRequestdetails = await IssueRequest.findById(issue_req_id);
//     const object = new IssueAcceptance({
//       issue_accept_no: gen_issue_acc_No,
//       issue_req_id: issue_req_id,
//       items: newItems,
//       status: Status.Completed,
//       isFd: isFd,
//       issued_by: issued_by,
//     });

//     const result = await object.save();
//     if (result) {
//       try {
//         const acceptedItems = newItems.filter(elem => elem.is_accepted);

//         // NEW STOCK UPDATE CODE
//         const weightMap = {}; // To accumulate weights by transactionId
//         const output = {};    // To store transactionIds by imir_no

//         for (const element of acceptedItems) {
//           const inputImir = element.imir_no;

//           // Fetch the related GridItem
//           const gridItem = await GridItem.findById(element.grid_item_id).lean();
//           if (!gridItem || !gridItem.item_name) continue;

//           // Get the related purchase offer
//           const matchedOffer = await purchase_offerModel.findOne({ imir_no: inputImir });
//           if (!matchedOffer?.items?.length) continue;

//           for (const offerItem of matchedOffer.items) {
//             if (!offerItem.transactionId) continue;

//             const transactedItem = await TransactedItem.findById(offerItem.transactionId).lean();
//             if (!transactedItem) continue;

//             // Match itemName
//             if (String(transactedItem.itemName) === String(gridItem.item_name)) {
//               const tid = offerItem.transactionId.toString();

//               // Accumulate weight per transactionId
//               weightMap[tid] = (weightMap[tid] || 0) + element.item_assembly_weight;

//               // Track the offer for later update
//               if (!output[inputImir]) output[inputImir] = new Set();
//               output[inputImir].add(tid);
//             }
//           }
//         }

//         // Final update: add new weights to existing ones
//         for (const [imir_no, transactionIdSet] of Object.entries(output)) {
//           const offer = await purchase_offerModel.findOne({ imir_no });
//           if (!offer?.items?.length) continue;

//           for (const tid of transactionIdSet) {
//             const item = offer.items.find(i => String(i.transactionId) === tid);
//             if (item) {
//               const existingWeight = item.item_assembly_weight || 0;
//               const additionalWeight = weightMap[tid] || 0;

//               // Update with sum of existing + new
//               item.item_assembly_weight = existingWeight + additionalWeight;
//             }
//           }

//           // Save updated offer
//           await purchase_offerModel.updateOne(
//             { _id: offer._id },
//             { $set: { items: offer.items } }
//           );
//         }

//         // OLD STOCK UPDATE CODE

//         // for (const element of acceptedItems) {
//         //   let inputImir = element.imir_no;
//         //   let matchedOffer = await purchase_offerModel.findOne({ imir_no: inputImir });
//         //   let gridItem = await GridItem.findById(element.grid_item_id);

//         //   if (matchedOffer && matchedOffer.items && matchedOffer.items.length > 0) {
//         //     // Initialize the output for this imir_no if not already done
//         //     if (!output[inputImir]) {
//         //       output[inputImir] = [];
//         //     }

//         //     // Iterate through offered items
//         //     for (const item of matchedOffer.items) {
//         //       // Ensure the item has a transactionId
//         //       if (!item.transactionId) continue;

//         //       const transactedItem = await TransactedItem.findById(item.transactionId);

//         //       // Check if transactedItem exists and compare item names
//         //       if (transactedItem && transactedItem.itemName.toString() === gridItem.item_name.toString()) {
//         //         // Update existing item's assembly weight
//         //         item.item_assembly_weight += element.item_assembly_weight; // Update weight
//         //         output[inputImir].push(item); // Push updated item to output
//         //       }
//         //     }
//         //   }
//         // }

//         // // Convert output object to array format if needed
//         // const finalOutput = Object.entries(output).map(([imir_no, updatedItems]) => ({
//         //   imir_no,
//         //   updatedItems
//         // }));

//         // for (const { imir_no, updatedItems } of finalOutput) {
//         //   const offer = await purchase_offerModel.findOne({ imir_no: imir_no });

//         //   if (offer && offer.items) {
//         //     for (const updatedItem of updatedItems) {
//         //       const matchingOfferItem = offer.items.find(item =>
//         //         item.transactionId.equals(updatedItem.transactionId)
//         //       );

//         //       if (matchingOfferItem) {
//         //         matchingOfferItem.item_assembly_weight = updatedItem.item_assembly_weight;

//         //       }
//         //     }

//         //     // Save updated offer document back to database
//         //     await purchase_offerModel.updateOne(
//         //       { _id: offer._id },
//         //       { $set: { items: offer.items } }
//         //     );
//         //   }
//         // }

//         const allRejectedItems = result.items.filter(item => !item.is_accepted);
//         await Promise.all(
//           allRejectedItems.map(item =>
//             GridItem.findOneAndUpdate(
//               { _id: item.grid_item_id },
//               {
//                 $inc: {
//                   balance_grid: item.iss_used_grid_qty,
//                   used_grid: -item.iss_balance_grid_qty,
//                 },
//               },
//               { new: true }
//             )
//           )
//         );

//         const allRejected = result.items.every(item => !item.is_accepted);
//         issueRequestdetails.status = allRejected ? Status.Rejected : Status.Approved;

//         // issueRequestdetails.status = Status.Completed;
//         await issueRequestdetails.save();

//         return sendResponse(res, 200, true, {}, "Material issue acceptance added successfully!");
//       } catch (error) {
//         console.error("Error processing rejected items or saving issue request:", error);
//         return sendResponse(res, 500, false, {}, "Failed to process material issue acceptance.");
//       }
//     }

//   } catch (err) {
//     return sendResponse(res, 500, false, {}, "Internal server error");
//   }
// };


//rIYA cODE
// exports.manageIssueAcceptance = async (req, res) => {
//   const { issue_req_id, items, issued_by, project, isFd } = req.body;

//   console.log("Request body:", req.body);

//   if (!req.user || req.error) {
//     console.log("Unauthorized access");
//     return sendResponse(res, 401, false, {}, "Unauthorized");
//   }

//   if (!issue_req_id || !items || !issued_by || !project) {
//     console.log("Missing parameters");
//     return sendResponse(res, 400, false, {}, "Missing parameters");
//   }

//   try {
//     console.log("Finding last IssueAcceptance...");
//     let lastaccepted = await IssueAcceptance.findOne(
//       { deleted: false, issue_accept_no: { $regex: `/${project}/` } },
//       {},
//       { sort: { createdAt: -1 } }
//     );

//     let issue_acc_No = "1";
//     if (lastaccepted && lastaccepted.issue_accept_no) {
//       const split = lastaccepted.issue_accept_no.split("/");
//       const lastacceptedNo = parseInt(split[split.length - 1]);
//       issue_acc_No = lastacceptedNo + 1;
//       console.log("Last accepted number:", lastacceptedNo);
//     }

//     const gen_issue_acc_No =
//       TitleFormat.issueAcceptNo.replace("/PROJECT/", `/${project}/`) +
//       issue_acc_No;
//     console.log("Generated Issue Accept No:", gen_issue_acc_No);

//     const newItems = JSON.parse(items) || [];
//     console.log("Parsed items:", newItems);

//     const issueRequestdetails = await IssueRequest.findById(issue_req_id);
//     console.log("Issue Request details found:", issueRequestdetails?._id);

//     const object = new IssueAcceptance({
//       issue_accept_no: gen_issue_acc_No,
//       issue_req_id: issue_req_id,
//       items: newItems,
//       status: Status.Completed,
//       isFd: isFd,
//       issued_by: issued_by,
//     });

//     const result = await object.save();
//     console.log("Issue Acceptance saved:", result?._id);

//     if (result) {
//       try {
//         const acceptedItems = newItems.filter((elem) => elem.is_accepted);
//         console.log("Accepted items:", acceptedItems.length);

//         const weightMap = {}; // Accumulate weights by transactionId
//         const output = {}; // Store transactionIds by imir_no

//         for (const element of acceptedItems) {
//           // Normalize imir_no to array (handle single or multiple IMIRs)
//           const inputImirs = Array.isArray(element.imir_no)
//             ? element.imir_no
//             : element.imir_no
//             ? [element.imir_no]
//             : [];

//           // Fetch GridItem to get item_name for matching
//           const gridItem = await GridItem.findById(element.grid_item_id).lean();
//           if (!gridItem || !gridItem.item_name) continue;

//           // Fetch purchase offers for all IMIRs
//           const offers = await purchase_offerModel.find({
//             imir_no: { $in: inputImirs },
//           });

//           // Collect offers with total balance_qty for sorting
//           const offerBalances = [];

//           for (const offer of offers) {
//             let totalBalanceQty = 0;

//             for (const item of offer.items) {
//               if (!item.transactionId) continue;

//               const transactedItem = await TransactedItem.findById(
//                 item.transactionId
//               ).lean();
//               if (transactedItem?.balance_qty) {
//                 totalBalanceQty += transactedItem.balance_qty;
//               }
//             }

//             offerBalances.push({ offer, totalBalanceQty });
//           }

//           // Sort offers by least balance_qty first
//           offerBalances.sort((a, b) => a.totalBalanceQty - b.totalBalanceQty);

//           // Distribute the item_assembly_weight starting from offers with least balance
//           let remainingWeight = element.item_assembly_weight;

//           for (const { offer } of offerBalances) {
//             if (remainingWeight <= 0) break;

//             for (const offerItem of offer.items) {
//               if (!offerItem.transactionId) continue;

//               const transactedItem = await TransactedItem.findById(
//                 offerItem.transactionId
//               ).lean();
//               if (!transactedItem) continue;

//               if (
//                 String(transactedItem.itemName) === String(gridItem.item_name)
//               ) {
//                 const tid = offerItem.transactionId.toString();

//                 const availableBalance = transactedItem.balance_qty || 0;

//                 // Allocate min of remainingWeight or available balance
//                 const allocWeight = Math.min(remainingWeight, availableBalance);

//                 // Accumulate allocated weight for this transactionId
//                 weightMap[tid] = (weightMap[tid] || 0) + allocWeight;

//                 // Track the offer IMIR and transactionId
//                 if (!output[offer.imir_no]) output[offer.imir_no] = new Set();
//                 output[offer.imir_no].add(tid);

//                 remainingWeight -= allocWeight;

//                 if (remainingWeight <= 0) break;
//               }
//             }
//           }
//         }

//         // After this loop, update the purchase_offerModel items weights as you already do:
//         for (const [imir_no, transactionIdSet] of Object.entries(output)) {
//           const offer = await purchase_offerModel.findOne({ imir_no });
//           if (!offer?.items?.length) continue;

//           for (const tid of transactionIdSet) {
//             const item = offer.items.find(
//               (i) => String(i.transactionId) === tid
//             );
//             if (item) {
//               const existingWeight = item.item_assembly_weight || 0;
//               const additionalWeight = weightMap[tid] || 0;

//               item.item_assembly_weight = existingWeight + additionalWeight;
//             }
//           }

//           await purchase_offerModel.updateOne(
//             { _id: offer._id },
//             { $set: { items: offer.items } }
//           );
//         }

//         for (const [imir_no, transactionIdSet] of Object.entries(output)) {
//           const offer = await purchase_offerModel.findOne({ imir_no });
//           console.log("Updating offer weights for:", imir_no);

//           if (!offer?.items?.length) continue;

//           for (const tid of transactionIdSet) {
//             const item = offer.items.find(
//               (i) => String(i.transactionId) === tid
//             );
//             if (item) {
//               const existingWeight = item.item_assembly_weight || 0;
//               const additionalWeight = weightMap[tid] || 0;

//               item.item_assembly_weight = existingWeight + additionalWeight;
//               console.log(
//                 `Updated item weight for tid=${tid}:`,
//                 item.item_assembly_weight
//               );
//             }
//           }

//           await purchase_offerModel.updateOne(
//             { _id: offer._id },
//             { $set: { items: offer.items } }
//           );
//           console.log("Offer updated:", offer._id);
//         }

//         const allRejectedItems = result.items.filter(
//           (item) => !item.is_accepted
//         );
//         console.log("Rejected items found:", allRejectedItems.length);

//         await Promise.all(
//           allRejectedItems.map((item) =>
//             GridItem.findOneAndUpdate(
//               { _id: item.grid_item_id },
//               {
//                 $inc: {
//                   balance_grid: item.iss_used_grid_qty,
//                   used_grid: -item.iss_balance_grid_qty,
//                 },
//               },
//               { new: true }
//             ).then((updated) => console.log("Updated grid item:", updated?._id))
//           )
//         );

//         const allRejected = result.items.every((item) => !item.is_accepted);
//         issueRequestdetails.status = allRejected
//           ? Status.Rejected
//           : Status.Approved;
//         console.log(
//           "Updated issue request status:",
//           issueRequestdetails.status
//         );

//         await issueRequestdetails.save();
//         console.log("Issue request saved");

//         return sendResponse(
//           res,
//           200,
//           true,
//           {},
//           "Material issue acceptance added successfully!"
//         );
//       } catch (error) {
//         console.error("Error processing items:", error);
//         return sendResponse(
//           res,
//           500,
//           false,
//           {},
//           "Failed to process material issue acceptance."
//         );
//       }
//     }
//   } catch (err) {
//     console.error("Main error block:", err);
//     return sendResponse(res, 500, false, {}, "Internal server error");
//   }
// };



//Nikesh



exports.manageIssueAcceptance = async (req, res) => {
  const { issue_req_id, items, issued_by, project,project_id, isFd } = req.body;
  console.log("Request received:", JSON.stringify(req.body, null, 2));

  if (!req.user || req.error)
    return sendResponse(res, 401, false, {}, "Unauthorized");

  if (!issue_req_id || !items || !issued_by || !project)
    return sendResponse(res, 400, false, {}, "Missing parameters");

  try {
    // 🧾 Get last accepted record for project
    const lastaccepted = await IssueAcceptance.findOne(
      { deleted: false, issue_accept_no: { $regex: `/${project}/` } },
      {},
      { sort: { createdAt: -1 } }
    );

    let issue_acc_No = "1";
    if (lastaccepted?.issue_accept_no) {
      const split = lastaccepted.issue_accept_no.split("/");
      const lastacceptedNo = parseInt(split[split.length - 1]);
      issue_acc_No = (lastacceptedNo + 1).toString();
    }

    const gen_issue_acc_No =
      TitleFormat.issueAcceptNo.replace("/PROJECT/", `/${project}/`) +
      issue_acc_No;

    const newItems = JSON.parse(items) || [];
    const issueRequestdetails = await IssueRequest.findById(issue_req_id);

    const object = new IssueAcceptance({
      issue_accept_no: gen_issue_acc_No,
      issue_req_id,
      items: newItems,
      status: Status.Completed,
      isFd,
      issued_by,
    });

    const result = await object.save();
    console.log("✅ New IssueAcceptance record created:", result._id);

    // -------------------------
    // ✅ Process accepted items
    // -------------------------
    const acceptedItems = (newItems || []).filter((elem) => elem.is_accepted);
    console.log("✅ Accepted Items Count:", acceptedItems.length);

    // Sort accepted items by ascending weight
    acceptedItems.sort(
      (a, b) => (a.item_assembly_weight || 0) - (b.item_assembly_weight || 0)
    );
   
    const weightMap = {}; // transactionId -> total weight
    const output = {}; // imir_no -> Set(transactionIds)

    for (const element of acceptedItems) {
      const imirs = Array.isArray(element.imir_no)
        ? element.imir_no
        : element.imir_no
        ? [element.imir_no]
        : [];

      let remainingWeight = element.item_assembly_weight;

      const gridItem = await GridItem.findById(element.grid_item_id)
        .populate("item_name")
        .lean();
      if (!gridItem) {
        console.log(`❌ GridItem not found: ${element.grid_item_id}`);
        continue;
      }

      const gridItemId =
        typeof gridItem.item_name === "object"
          ? String(gridItem.item_name._id)
          : String(gridItem.item_name);

      const imirEntries = [];

      for (const imir of imirs) {
        const offer = await purchase_offerModel.findOne({ imir_no: imir });
        if (!offer) continue;

        for (const item of offer.items) {
          if (!item.transactionId) continue;

          const trans = await TransactedItem.findById(item.transactionId)
            .populate("itemName")
            .lean();
          if (!trans) continue;

          const transItemId =
            typeof trans.itemName === "object"
              ? String(trans.itemName._id)
              : String(trans.itemName);

          if (transItemId === gridItemId) {
            const currentAssembly = item.item_assembly_weight || 0;
            const acceptedQty = item.acceptedQty || 0;
            const available = Math.max(acceptedQty - currentAssembly, 0);

            if (available > 0) {
              imirEntries.push({
                imir,
                offer,
                offerItem: item,
                transactionId: item.transactionId.toString(),
                available,
              });
            }
          }
        }
      }

      // 🔁 Sort IMIRs by available ASCENDING (use least balance first)
      imirEntries.sort((a, b) => a.available - b.available);

      // ✅ Allocate weights sequentially
      for (const entry of imirEntries) {
        if (remainingWeight <= 0) break;

        const alloc = Math.min(remainingWeight, entry.available);
        entry.offerItem.item_assembly_weight =
          (entry.offerItem.item_assembly_weight || 0) + alloc;

        weightMap[entry.transactionId] =
          (weightMap[entry.transactionId] || 0) + alloc;

        if (!output[entry.imir]) output[entry.imir] = new Set();
        output[entry.imir].add(entry.transactionId);

        remainingWeight -= alloc;

        // 🧮 Update live TransactedItem balance
        await TransactedItem.updateOne(
          { _id: entry.transactionId },
          { $inc: { balance_qty: -alloc } }
        );

        // 🧾 Update offer's item_assembly_weight live
        await purchase_offerModel.updateOne(
          { _id: entry.offer._id, "items.transactionId": entry.transactionId },
          {
            $set: {
              "items.$.item_assembly_weight": entry.offerItem.item_assembly_weight,
            },
          }
        );

      }

      if (remainingWeight > 0) {
        console.warn(
          `⚠️ Still ${remainingWeight} unallocated for grid item ${element.grid_item_id}`
        );
      }
    }

    // ---------------------------------
    // Handle rejected items and statuses
    // ---------------------------------
    const allRejectedItems = result.items.filter((i) => !i.is_accepted);
    await Promise.all(
      allRejectedItems.map((item) =>
        GridItem.findOneAndUpdate(
          { _id: item.grid_item_id },
          {
            $inc: {
              balance_grid: item.iss_used_grid_qty,
              used_grid: -item.iss_balance_grid_qty,
            },
          },
          { new: true }
        )
      )
    );

    const allRejected = result.items.every((i) => !i.is_accepted);
    issueRequestdetails.status = allRejected
      ? Status.Rejected
      : Status.Approved;
    await issueRequestdetails.save();

    /* ---------------- STAGE EMAIL NOTIFICATION ---------------- */
    
    try {
    
      const workflowConfigs = [];
    
      // Multiple flags can be true
     if (result?.isFd === false) {
  workflowConfigs.push({
    roleNames: ["Production Engineer"],
    stageName: "Material Issue Acceptance Piping",
    remarks:
      "Material Issue Acceptance completed and Fit-Up process is ready."
  });
} else if (result?.isFd === true) {
  workflowConfigs.push({
    roleNames: ["Planning Engineer"],
    stageName: "Material Issue Acceptance Piping",
    remarks:
      "Material Issue Acceptance completed and Final Dimension process is ready."
  });
}
    
 
    
      if (workflowConfigs.length > 0) {
    
        const issueUser = await User.findById(
          issued_by
        );
    
        const projectDetails = await Project.findById(
          project_id
        );
    
        const acceptanceDateTime = result?.createdAt
          ? new Date(result.createdAt)
              .toLocaleString("en-IN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true
              })
              .replace("am", "AM")
              .replace("pm", "PM")
          : "-";
    
        for (const config of workflowConfigs) {
    
          const roles = await ErpRole.find({
            deleted: false,
            name: {
              $in: config.roleNames
            }
          });
    
          const roleIds = roles.map(
            r => r._id
          );
    
          const users = await User.find({
            deleted: false,
            status: true,
            structureRole: {
              $in: roleIds
            },
            email: {
              $exists: true,
              $ne: ""
            }
          });
    
          for (const user of users) {
    
            const html =
              commonStageAcceptanceEmail({
    
                userName:
                  user?.user_name || "-",
    
                module: "Structural",
    
                stageName:
                  config.stageName,
    
                reportNo:
                  result?.issue_accept_no || "-",
    
                projectName:
                  project || "-",
    
                workOrderNo:
                  projectDetails?.work_order_no || "-",
    
                accptedBy:
                  issueUser?.user_name || "-",
    
                // fixed variable
                accptanceDateTime:
                  acceptanceDateTime,
    
                qcStatus:
                  result?.status === Status.Completed
                    ? "Accepted"
                    : result?.status === Status.Partially
                    ? "Partially Accepted"
                    : result?.status === Status.Rejected
                    ? "Rejected"
                    : "-",
    
                remarks:
                  `${config.remarks}
                   Completed by ${issueUser?.user_name || "-"}.`,
    
                loginUrl:
                  process.env.ERP_URL
    
              });
    
            addEmailJob({
              to: user.email,
              subject:
                `${config.stageName} - ${result?.issue_accept_no}`,
              html
            });
    
            console.log(
              `Queued -> ${user.email}`
            );
          }
        }
      }
    
    } catch (emailErr) {
    
      console.log(
        "STAGE EMAIL ERROR:",
        emailErr
      );
    
    }

    return sendResponse(
      res,
      200,
      true,
      {},
      "Material issue acceptance added successfully!"
    );
  } catch (err) {
    console.error("🚨 Error in manageIssueAcceptance:", err);
    return sendResponse(res, 500, false, {}, "Internal server error");
  }
};



//last live code
// exports.getIssueAcceptance = async (req, res) => {
//   const { id, project } = req.body;

//   if (!req.user || req.error) {
//     return sendResponse(res, 401, false, {}, "Unauthorized");
//   }

//   try {
//     const query = { deleted: false };
//     if (id) query._id = id;

//     let result = await IssueAcceptance.find(query, { deleted: 0 })
//       .populate("issued_by", "user_name")
//       .populate({
//         path: "items.drawing_id",
//         select: "project master_updation_date drawing_no draw_receive_date unit sheet_no rev assembly_no assembly_quantity drawing_pdf drawing_pdf_name status issued_date issued_person",
//         populate: [
//           { path: "issued_person", select: "name" },
//           {
//             path: "project",
//             select: "name party work_order_no",
//             populate: { path: "party", select: "name" },
//           },
//         ],
//       })
//       .populate({
//         path: "items.grid_item_id",
//         select: "drawingId grid_id item_name grid_no item_no",
//         populate: [
//           { path: "item_name", select: "name" },
//           { path: "grid_id", select: "grid_no grid_qty" },
//         ],
//       })
//       .populate({
//         path: "issue_req_id",
//         select: "issue_req_no items remarks",
//         populate: [
//           {
//             path: "items.grid_item_id",
//             select: "item_name grid_id",
//             populate: {
//               path: 'grid_id',
//               select: "grid_no grid_qty"
//             }
//           },
//           { path: "requested_by", select: "user_name" },
//         ],
//       })
//       .sort({ createdAt: -1 });
    
//       //result = result.map(doc => {
//         //const filteredItems = doc.items.filter(item => item.iss_balance_grid_qty !== 0);
//         //return { ...doc.toObject(), items: filteredItems };
//       // }).filter(doc => doc.items.length > 0); // Remove docs with no valid items

//     if (project) {
//       result = result.filter((reqData) =>
//         reqData.items.some(
//           (item) => item.drawing_id?.project?._id?.toString() === project
//         )
//       );
//     }

//     return sendResponse(res, 200, true, result, "Material acceptance list");
//   } catch (err) {
//     console.error("Error fetching material acceptance list:", err);
//     return sendResponse(res, 500, false, {}, "Internal Server Error");
//   }

// };


exports.getIssueAcceptance = async (req, res) => {
  let { id, project, page, limit } = req.body;
console.log("req.body", req.body);
  // normalize search (handles array, query, body)
  const searchRaw = Array.isArray(req.query.search)
    ? req.query.search[0]
    : req.query.search || req.body.search || "";

  const search = typeof searchRaw === "string" ? searchRaw.trim() : "";

  const hasPagination =
  page !== undefined &&
  page !== null &&
  limit !== undefined &&
  limit !== null &&
  page !== "" &&
  limit !== "";
  let pageNum = null;
let limitNum = null;
let skip = null;

if (hasPagination) {
  pageNum = Number(page);
  limitNum = Number(limit);
  skip = (pageNum - 1) * limitNum;
}
// const pageNum = hasPagination ? Number(page) : null;
// const limitNum = hasPagination ? Number(limit) : null;
// const skip = hasPagination ? (pageNum - 1) * limitNum : null;
  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  try {
    let query = { deleted: false };
    if (id) query._id = id;

    //  Multi-field search
    if (search) {
      // Find matching drawings by assembly_no
      const drawingMatch = await Draw.find({
        assembly_no: { $regex: search, $options: "i" },
        deleted: false
      }).distinct("_id");

      // Find matching users by name
      const userIds = await User.find({
        user_name: { $regex: search, $options: "i" }
      }).distinct("_id");

      const searchConditions = [
        { issue_accept_no: { $regex: search, $options: "i" } }
      ];

      if (drawingMatch.length > 0) {
        searchConditions.push({ "items.drawing_id": { $in: drawingMatch } });
      }

      if (userIds.length > 0) {
        searchConditions.push({ issued_by: { $in: userIds } });
      }

      query.$or = searchConditions;
    }

    //  Filter by project (intersects with search if both applied)
    if (project) {
      const drawingIds = await Draw.find({
        deleted: false,
        project: project,
      }).distinct("_id");

      if (drawingIds.length > 0) {
        query["items.drawing_id"] = query["items.drawing_id"]
          ? { $in: drawingIds.filter(id => query["items.drawing_id"].$in.includes(id)) }
          : { $in: drawingIds };
      } else {
        return sendResponse(res, 200, true, {
          items: [],
          pagination: { total: 0, page: pageNum, limit: limitNum, totalPages: 0 },
        }, "Material acceptance list");
      }
    }

    //  Count total
    const totalCount = await IssueAcceptance.countDocuments(query);

    // Main query with population
    let queryExec = IssueAcceptance.find(query, { deleted: 0 })
      .populate("issued_by", "user_name")
      .populate({
        path: "items.drawing_id",
        select:
          "project master_updation_date drawing_no draw_receive_date unit sheet_no rev assembly_no assembly_quantity drawing_pdf drawing_pdf_name status issued_date issued_person",
        populate: [
          { path: "issued_person", select: "name" },
          {
            path: "project",
            select: "name party work_order_no",
            populate: { path: "party", select: "name" }
          },
        ],
      })
      .populate({
        path: "items.grid_item_id",
        select: "drawingId grid_id item_name grid_no item_no",
        populate: [
          { path: "item_name", select: "name" },
          { path: "grid_id", select: "grid_no grid_qty" },
        ],
      })
      .populate({
        path: "issue_req_id",
        select: "issue_req_no items remarks",
        populate: [
          {
            path: "items.grid_item_id",
            select: "item_name grid_id",
            populate: { path: "grid_id", select: "grid_no grid_qty" },
          },
          { path: "requested_by", select: "user_name" },
        ],
      })
      .sort({ createdAt: -1 });

    //  Apply pagination
    if (hasPagination) {
      queryExec = queryExec.skip(skip).limit(limitNum);
    }

    const result = await queryExec;

    return sendResponse(res, 200, true, {
      items: result,
      total: totalCount,
      // page: hasPagination ? pageNum : 1,
      // limit: hasPagination ? limitNum : totalCount,
      // totalPages: hasPagination ? Math.ceil(totalCount / limitNum) : 1,
      page: hasPagination ? pageNum : null,
  limit: hasPagination ? limitNum : null,
  totalPages: hasPagination
    ? Math.ceil(totalCount / limitNum)
    : null,
    }, "Material acceptance list");

  } catch (err) {
    console.error("Error fetching material acceptance list:", err);
    return sendResponse(res, 500, false, {}, "Internal Server Error");
  }
};

// exports.getIssueAcceptanceMasterData = async (req, res) => {
//   // let { id, project, page, limit } = req.body;
// let { id, project, page, limit, search } = req.body;
//   // normalize search (handles array, query, body)


//   const hasPagination = page !== undefined && limit !== undefined;
//   const regex = search
//   ? new RegExp(search.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), "i")
//   : null;

//   const pageNum = hasPagination ? parseInt(page) || 1 : 1;
//   const limitNum = hasPagination ? parseInt(limit) || 10 : 0;
//   const skip = (pageNum - 1) * limitNum;

//   if (!req.user || req.error) {
//     return sendResponse(res, 401, false, {}, "Unauthorized");
//   }
//   if (!project) {
//     return sendResponse(res, 400, false, {}, "Project is required.");
//   }

//   try {
//     let query = { deleted: false };
//     if (id) query._id = id;

// if (regex) {
//   const userIds = await User.find({
//     user_name: regex,
//   }).distinct("_id");

//   const searchConditions = [
//     { issue_accept_no: regex },
//     { "issue_requests.issue_req_no": regex },
//     { "drawing_no": regex },
//     { "items.assembly_no": regex },
//     { "items.drawing_id.unit": regex },
//     { "items.grid_item_id.item_no": regex },
//     { "items.grid_item_id.section": regex },
//     { "items.grid_item_id.grid_id.grid_no": regex },
//     { "issue_req_id.items.grid_item_id.imir_no": regex },
//   ];

//   // if (drawingMatch.length > 0) {
//   //   searchConditions.push({ "items.drawing_id": { $in: drawingMatch } });
//   // }

//   if (userIds.length > 0) {
//     searchConditions.push({ issued_by: { $in: userIds } });
//     searchConditions.push({ "issue_req_id.requested_by": { $in: userIds } });
//   }

//   query.$or = searchConditions;
// }
    


//     //  Filter by project (intersects with search if both applied)
//     const drawingIds = await Draw.find({
//       deleted: false,
//       project: project,
//     }).distinct("_id");

//     if (drawingIds.length > 0) {
//       query["items.drawing_id"] = query["items.drawing_id"]
//         ? {
//             $in: drawingIds.filter((id) =>
//               query["items.drawing_id"].$in.includes(id)
//             ),
//           }
//         : { $in: drawingIds };
//     } else {
//       return sendResponse(
//         res,
//         200,
//         true,
//         {
//           data: [],
//           pagination: { total: 0, page: pageNum, limit: limitNum, totalPages: 0 },
//         },
//         "Material acceptance list"
//       );
//     }

//     // 📊 Count total before pagination
//     const totalCount = await IssueAcceptance.countDocuments(query);

//     // Main query with populate
//     let queryExec = IssueAcceptance.find(query, { deleted: 0 })
//       .populate("issued_by", "user_name")
//       .populate({
//         path: "items.drawing_id",
//         select: "project drawing_no rev sheet_no assembly_no unit",
//         populate: {
//           path: "project",
//           select: "name party work_order_no",
//           populate: { path: "party", select: "name" },
//         },
//       })
//       .populate({
//         path: "items.grid_item_id",
//         select: "grid_id item_no item_name item_qty item_weight section",
//         populate: [
//           { path: "item_name", select: "name" },
//           { path: "grid_id", select: "grid_no grid_qty" },
//         ],
//       })
//       .populate({
//         path: "issue_req_id",
//         select: "issue_req_no items remarks requested_by createdAt",
//         populate: [
//           { path: "requested_by", select: "user_name" },
//           {
//             path: "items.grid_item_id",
//             select: "imir_no",
//           },
//         ],
//       })
//       .sort({ createdAt: -1 });

//     // Apply pagination
//     if (hasPagination) {
//       queryExec = queryExec.skip(skip).limit(limitNum);
//     }

//     const results = await queryExec.lean();

//     // 📌 Group by issue_accept_no
//     const groupedByAcceptNo = results.reduce((acc, record) => {
//       const acceptNo = record.issue_accept_no || "UNKNOWN";
//       if (!acc[acceptNo]) {
//         acc[acceptNo] = {
//           issue_accept_no: acceptNo,
//           createdAt: record.createdAt,
//           issued_by: record.issued_by,
//           issue_req_id: record.issue_req_id,
//           items: [],
//         };
//       }
//       acc[acceptNo].items.push(...record.items);
//       return acc;
//     }, {});
//     const finalResult = Object.values(groupedByAcceptNo);

//     return sendResponse(
//       res,
//       200,
//       true,
//       {
//         data: finalResult,
//         pagination: {
//           total: totalCount,
//           page: hasPagination ? pageNum : 1,
//           limit: hasPagination ? limitNum : totalCount,
//           totalPages: hasPagination ? Math.ceil(totalCount / limitNum) : 1,
//         },
//       },
//       "Acceptance list fetched successfully"
//     );
//   } catch (err) {
//     console.error("Error fetching acceptance master data:", err);
//     return sendResponse(res, 500, false, {}, "Internal Server Error");
//   }
// };

exports.getIssueAcceptanceMasterData = async (req, res) => {
  let { id, project, page, limit, search } = req.body;

  const hasPagination = page !== undefined && limit !== undefined;
  const pageNum = hasPagination ? parseInt(page) || 1 : 1;
  const limitNum = hasPagination ? parseInt(limit) || 10 : 0;
  const skip = (pageNum - 1) * limitNum;

  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }
  if (!project) {
    return sendResponse(res, 400, false, {}, "Project is required.");
  }
  

  try {
    const regex = search
      ? new RegExp(search.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), "i")
      : null;

    let andConditions = [{ deleted: false }];
    if (id) andConditions.push({ _id: id });

    let issueReqMatches = [];
if (regex) {
  issueReqMatches = await IssueRequest.find(
    { issue_req_no: regex },
    { _id: 1 }
  ).distinct("_id");
}

    // If search is provided
    let drawingMatch = [];
    if (regex) {
      // Match drawings
      drawingMatch = await Draw.find({
        $or: [
          { drawing_no: regex },
          { assembly_no: regex },
          { sheet_no: regex },
          { unit: regex },
          
        ],
        deleted: false,
      }).distinct("_id");

      // Match users
      const userIds = await User.find({ user_name: regex }).distinct("_id");

      // Build search conditions
      const searchConditions = [
        { issue_accept_no: regex },
        { "issue_req_id.issue_req_no": regex },
        { "items.drawing_id.drawing_no": regex },
        { "items.drawing_id.assembly_no": regex },
        { "items.drawing_id.unit": regex },
        { "items.grid_item_id.item_name.name": regex },
        { "items.grid_item_id.grid_id.grid_no": regex },
        { "items.imir_no": regex },
        
      ];

      if (issueReqMatches.length > 0) {
  searchConditions.push({ issue_req_id: { $in: issueReqMatches } });
}


      if (drawingMatch.length > 0) {
        searchConditions.push({ "items.drawing_id": { $in: drawingMatch } });
      }

      if (userIds.length > 0) {
        searchConditions.push({ issued_by: { $in: userIds } });
        searchConditions.push({ "issue_req_id.requested_by": { $in: userIds } });
      }

      andConditions.push({ $or: searchConditions });
    }

    // Filter by project drawings
    const drawingIds = await Draw.find({
      deleted: false,
      project: project,
    }).distinct("_id");

    if (drawingIds.length > 0) {
      andConditions.push({ "items.drawing_id": { $in: drawingIds } });
    } else {
      return sendResponse(
        res,
        200,
        true,
        {
          data: [],
          pagination: { total: 0, page: pageNum, limit: limitNum, totalPages: 0 },
        },
        "Material acceptance list"
      );
    }

    // Final query
    const query = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

    // Count total before pagination
    const totalCount = await IssueAcceptance.countDocuments(query);

    // Main query with populate
    let queryExec = IssueAcceptance.find(query, { deleted: 0 })
      .populate("issued_by", "user_name")
      .populate({
        path: "items.drawing_id",
        select: "project drawing_no rev sheet_no assembly_no unit",
        populate: {
          path: "project",
          select: "name party work_order_no",
          populate: { path: "party", select: "name" },
        },
      })
      .populate({
        path: "items.grid_item_id",
        select: "grid_id item_no item_name item_qty item_weight section",
        populate: [
          { path: "item_name", select: "name" },
          { path: "grid_id", select: "grid_no grid_qty" },
        ],
      })
      .populate({
        path: "issue_req_id",
        select: "issue_req_no items remarks requested_by createdAt",
        populate: [
          { path: "requested_by", select: "user_name" },
          {
            path: "items.grid_item_id",
            select: "imir_no",
          },
        ],
      })
      .sort({ createdAt: -1 });

    // Apply pagination
    if (hasPagination) {
      queryExec = queryExec.skip(skip).limit(limitNum);
    }

    const results = await queryExec.lean();

    // Group by issue_accept_no
    const groupedByAcceptNo = results.reduce((acc, record) => {
      const acceptNo = record.issue_accept_no || "UNKNOWN";
      if (!acc[acceptNo]) {
        acc[acceptNo] = {
          issue_accept_no: acceptNo,
          createdAt: record.createdAt,
          issued_by: record.issued_by,
          issue_req_id: record.issue_req_id,
          items: [],
        };
      }
      acc[acceptNo].items.push(...record.items);
      return acc;
    }, {});

    const finalResult = Object.values(groupedByAcceptNo);

    return sendResponse(
      res,
      200,
      true,
      {
        data: finalResult,
        pagination: {
          total: totalCount,
          page: hasPagination ? pageNum : 1,
          limit: hasPagination ? limitNum : totalCount,
          totalPages: hasPagination ? Math.ceil(totalCount / limitNum) : 1,
        },
      },
      "Acceptance list fetched successfully"
    );
  } catch (err) {
    console.error("Error fetching acceptance master data:", err);
    return sendResponse(res, 500, false, {}, "Internal Server Error");
  }
};


exports.getIssueAcceptanceExcelDownload = async (req, res) => {
  const { id, project, download } = req.body;

  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  try {
    const query = { deleted: false };
    if (id) query._id = id;

    let result = await IssueAcceptance.find(query, { deleted: 0 })
      .populate("issued_by", "user_name")
      .populate({
        path: "items.drawing_id",
        select: "project drawing_no rev sheet_no assembly_no unit",
        populate: [
          {
            path: "project",
            select: " _id name party work_order_no",
            populate: { path: "party", select: "name" },
          },
        ],
      })
      // .populate({
      //   path: "items.grid_item_id",
      //   select: "grid_id item_no item_qty item_weight",
      //   populate: { path: "grid_id", select: "grid_no grid_qty" },
      // })
         .populate({
        path: "items.grid_item_id",
        select: "grid_id item_no item_name item_qty item_weight",
        populate: [
    { path: "item_name", select: "name" },
    { path: "grid_id", select: "grid_no grid_qty" },
  ],
      })
      .populate({
        path: "issue_req_id",
        select: "issue_req_no items remarks requested_by createdAt",
        populate: [{ path: "requested_by", select: "user_name" }],
      })
      .sort({ createdAt: -1 });

    //  Project filter
    if (project) {
      result = result.filter((reqData) =>
        reqData.items.some(
          (item) => item.drawing_id?.project?._id?.toString() === project
        )
      );
    }

    if (!result || result.length === 0) {
      return sendResponse(res, 404, false, [], "No acceptance records found");
    }

    //  If Excel export requested
    if (download === "excel") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Material Issued Master Data");

      // ---------- HEADER SECTION ----------
      worksheet.mergeCells("C1:T1");
      worksheet.getCell("C1").value =
        "VISHAL ENTERPRISE & VRISHAL ENGINEERING PRIVATE LIMITED";
      worksheet.getCell("C1").font = { size: 14, bold: true };
      worksheet.getCell("C1").alignment = { horizontal: "center" };

      worksheet.mergeCells("C2:T2");
      worksheet.getCell("C2").value = "GROUP OF COMPANIES";
      worksheet.getCell("C2").font = { size: 12, bold: true };
      worksheet.getCell("C2").alignment = { horizontal: "center" };

      worksheet.mergeCells("C3:T3");
      worksheet.getCell("C3").value =
        "MATERIAL ISSUED MASTER DATA - STRUCTURAL";
      worksheet.getCell("C3").font = { size: 12, bold: true };
      worksheet.getCell("C3").alignment = { horizontal: "center" };

      worksheet.mergeCells("A5:B5");
      worksheet.getCell("A5").value = "CLIENT";
      worksheet.getCell("C5").value =
        result[0]?.items[0]?.drawing_id?.project?.party?.name || "N/A";

      worksheet.mergeCells("A6:B6");
      worksheet.getCell("A6").value = "PROJECT";
      worksheet.getCell("C6").value =
        result[0]?.items[0]?.drawing_id?.project?.name || "N/A";

      worksheet.mergeCells("S5:T5");
      worksheet.getCell("S5").value = "PO NO.";
      worksheet.getCell("U5").value =
        result[0]?.items[0]?.drawing_id?.project?.work_order_no || "N/A";

      worksheet.mergeCells("S6:T6");
      worksheet.getCell("S6").value = "PDF DOWNLOAD DATE";
      worksheet.getCell("U6").value = new Date().toLocaleDateString();

      // ---------- TOTAL CALCULATION ----------
let total_grid_qty = 0;
let total_item_qty = 0;
let total_item_weight = 0;
let total_total_weight = 0;
let total_issued_weight = 0;

result.forEach(rec => {
  rec.items.forEach(item => {
    const gridQty = item.grid_item_id?.grid_id?.grid_qty || 0;
    const itemQty = item.grid_item_id?.item_qty || 0;
    const itemWeight = item.grid_item_id?.item_weight || 0;
    const issuedWeight = item.multiply_iss_qty || 0;

    total_grid_qty += gridQty;
    total_item_qty += itemQty;
    total_item_weight += itemWeight;
    total_total_weight += (itemQty * itemWeight * gridQty);
    total_issued_weight += issuedWeight;
  });
});

// ---------- ADD TOTAL ROW ----------
const totalRow = worksheet.addRow([
  "TOTAL",        // A
  "", "", "", "", "", "", "", 
  total_grid_qty,         // I
  "", "", 
  total_item_qty,         // L
  total_item_weight,      // M
  total_total_weight,     // N
  total_issued_weight,    // O
  "", "", "", "", "" ,""     // remaining columns
]);

// Increase Row Height
totalRow.height = 30;

// Style Total Row
totalRow.eachCell((cell) => {
  cell.font = { bold: true, size: 14 };  // ⬅ Bigger text
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE699" }, // Light yellow
  };
  cell.border = {
    top: { style: "medium" },
    bottom: { style: "medium" },
    left: { style: "thin" },
    right: { style: "thin" },
  };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
});

// Merge TOTAL Label A–H
worksheet.mergeCells(`A${totalRow.number}:H${totalRow.number}`);
worksheet.getCell(`A${totalRow.number}`).alignment = { 
  horizontal: "center", 
  vertical: "middle" 
};
worksheet.getCell(`A${totalRow.number}`).font = { bold: true, size: 16 }; // Bigger TOTAL text


      // ---------- TABLE HEADER ----------
      const headers = [
        "SR NO",
        "MATERIAL ISSUE REQUEST",
        "REQUEST DATE",
        "DRAWING NO.",
        "REV NO.",
        "ASSEMBLY NO.",
        "UNIT / AREA",
        "GRID NO.",
        "GRID QTY",
        "SECTIONS DETAILS",
        "ITEM NO.",
        "ITEM QTY. (NOS)",
        "ITEM WEIGHT (Kg)",
        "TOTAL WEIGHT (Kg)",
        // "ISSUED QTY",
        "ISSUED WEIGHT (Kg)",
        "IMIR NO.",
        "HEAT NO.",
        "MATERIAL ISSUE ACCEPTANCE REPORT NO.",
        "MATERIAL ISSUED DATE",
        "REQUESTED BY",
        "ACCEPTED BY",
      ];
      worksheet.addRow(headers);

      const headerRow = worksheet.getRow(8);
      headerRow.font = { bold: true };
      headerRow.alignment = { horizontal: "center", vertical: "middle" };
      headerRow.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "F6B26B" },
        };
      });

      // ---------- GROUP DATA BY ISSUE REQUEST ----------
      const groupedData = result.reduce((acc, rec) => {
        // const issueReqNo = rec.issue_req_id?.issue_req_no || "UNKNOWN";
        const issueReqNo = rec.issue_accept_no || "UNKNOWN";

        if (!acc[issueReqNo]) acc[issueReqNo] = [];
        rec.items.forEach((it) => {
          acc[issueReqNo].push({ rec, item: it });
        });
        return acc;
      }, {});

      let sr = 1;
      
      for (const [issueReqNo, rows] of Object.entries(groupedData)) {
        const startRow = worksheet.lastRow.number + 1;

        for (const { rec, item } of rows) {
          worksheet.addRow([
            sr,
            rec.issue_req_id?.issue_req_no || "-",
            rec.issue_req_id?.createdAt
              ? new Date(rec.issue_req_id.createdAt).toLocaleDateString()
              : "-",
            item.drawing_id?.drawing_no || "-",
            item.drawing_id?.rev ?? "-", 
            item.drawing_id?.assembly_no || "-",
            item.drawing_id?.unit || "-",
            item.grid_item_id?.grid_id?.grid_no || "-",
            item.grid_item_id?.grid_id?.grid_qty || "-",
            item.grid_item_id?.item_name?.name || "-",
            item.grid_item_id?.item_no || "-",
            item.grid_item_id?.item_qty || "-",
            item.grid_item_id?.item_weight || "-",
            item.grid_item_id?.item_qty && item.grid_item_id?.item_weight
              ? item.grid_item_id.item_qty * item.grid_item_id.item_weight *   item.grid_item_id?.grid_id?.grid_qty
              : "-",
            // item.issued_qty || "-",
            item.multiply_iss_qty || "-", // already issued weight
            item.imir_no?.join(", ") || "-",
            item.heat_no || "-",
            rec.issue_accept_no || "-",
            rec.createdAt ? new Date(rec.createdAt).toLocaleDateString() : "-",
            rec.issue_req_id?.requested_by?.user_name || "-",
            rec.issued_by?.user_name || "-",
          ]);
        }

        const endRow = worksheet.lastRow.number;

        //  Merge cells for grouped columns
        const mergeCols = ["A", "B", "C", "S", "T"]; 
        mergeCols.forEach((col) => {
          if (endRow > startRow) {
            worksheet.mergeCells(`${col}${startRow}:${col}${endRow}`);
            worksheet.getCell(`${col}${startRow}`).alignment = {
              vertical: "middle",
              horizontal: "center",
            };
          }
        });

        sr++;
      }

      // ---------- FORMATTING ----------
      worksheet.columns.forEach((col) => {
        col.width = 20;
        col.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true,
        };
      });

      worksheet.eachRow((row, rowNum) => {
        if (rowNum >= 8) {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: "thin" },
              bottom: { style: "thin" },
              left: { style: "thin" },
              right: { style: "thin" },
            };
          });
        }
      });




      // ---------- SAVE FILE ----------
      const xlsxPath = path.join(__dirname, "../../../xlsx");
      if (!fs.existsSync(xlsxPath)) fs.mkdirSync(xlsxPath, { recursive: true });

      const filename = `Issue_Acceptance_${Date.now()}.xlsx`;
      const filePath = path.join(xlsxPath, filename);
      await workbook.xlsx.writeFile(filePath);

      const protocol =
        req.secure || req.headers["x-forwarded-proto"] === "https"
          ? "https"
          : "http";
      const fileUrl = `${protocol}://${req.get("host")}/xlsx/${filename}`;

      return sendResponse(
        res,
        200,
        true,
        { file: fileUrl, report_name: "Material Issued Master Data" },
        "Excel file generated successfully"
      );
    }

    return sendResponse(
      res,
      200,
      true,
      result,
      "Acceptance list fetched successfully"
    );
  } catch (err) {
    console.error("Excel Export Error:", err);
    return sendResponse(
      res,
      500,
      false,
      {},
      "Failed to export Acceptance Excel"
    );
  }
};

exports.downloadOneIssueAcceptance = async (req, res) => {
  const { issue_accept_no, print_date } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await getIssueAcceptanceList(issue_accept_no);
      let requestData = data.result;

      let headerInfo = {
        offer_no: requestData[0]?.offer_no,
        client: requestData[0].client,
        project_name: requestData[0]?.project_name,
        contractor_name: requestData[0]?.contractor_name,
        issued_date: requestData[0]?.issued_date,
        request_name: requestData[0]?.request_name,
        request_date: requestData[0]?.request_date,
      };

      if (data.status === 1) {
        const template = fs.readFileSync(
          "templates/multiIssueAcceptance.html",
          "utf-8"
        );

        const renderedHtml = ejs.render(template, {
          headerInfo,
          items: requestData[0].items,
          logoUrl1: process.env.LOGO_URL_1,
          logoUrl2: process.env.LOGO_URL_2,
        });

        const browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
          executablePath: PATH,
        });

        const page = await browser.newPage();

        await page.setContent(renderedHtml, { baseUrl: `${URI}` });

        const pageHeight = await page.evaluate(() => {
          return document.body.scrollHeight;
        });

        const pdfBuffer = await generatePDFWithoutPrintDate(page, {
          print_date: true,
          height: pageHeight,
        });

        await browser.close();

        const pdfsDir = path.join(__dirname, "../../../pdfs");
        if (!fs.existsSync(pdfsDir)) fs.mkdirSync(pdfsDir);

        const filename = `issue_acceptance_${Date.now()}.pdf`;
        const filePath = path.join(pdfsDir, filename);
        fs.writeFileSync(filePath, pdfBuffer);

        const fileUrl = `${URI}/pdfs/${filename}`;

        sendResponse(
          res,
          200,
          true,
          { file: fileUrl },
          "PDF downloaded successfully"
        );
      } else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Issue request not found`);
      } else {
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

const getIssueAcceptanceList = async (issue_accept_no) => {
  try {
    const requestData = await IssueAcceptance.aggregate([
      { $match: { deleted: false, issue_accept_no: issue_accept_no } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "multi-drawing-issue_requests",
          localField: "issue_req_id",
          foreignField: "_id",
          as: "issueRequestDetails",
        },
      },
      { $unwind: "$issueRequestDetails" },
      {
        $addFields: {
          matchingRequest: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$issueRequestDetails.items",
                  as: "requestItem",
                  cond: {
                    $eq: ["$$requestItem.grid_item_id", "$items.grid_item_id"],
                  },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $addFields: {
          "items.requested_length": "$matchingRequest.requested_length",
          "items.requested_width": "$matchingRequest.requested_width",
          "items.requested_qty": "$matchingRequest.requested_qty",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "issued_by",
          foreignField: "_id",
          as: "requestDetails",
          pipeline: [{ $project: { _id: 0, user_name: "$user_name" } }],
        },
      },
      { $unwind: "$requestDetails" },
      {
        $lookup: {
          from: "erp-drawing-grid-items",
          localField: "items.grid_item_id",
          foreignField: "_id",
          as: "materialDetails",
        },
      },
      { $unwind: "$materialDetails" },
      {
        $lookup: {
          from: "erp-drawing-grids",
          localField: "materialDetails.grid_id",
          foreignField: "_id",
          as: "gridDetails",
        },
      },
      { $unwind: "$gridDetails" },
      {
        $lookup: {
          from: "store-items",
          localField: "materialDetails.item_name",
          foreignField: "_id",
          as: "itemDetails",
        },
      },
      { $unwind: "$itemDetails" },
      {
        $lookup: {
          from: "erp-planner-drawings",
          localField: "items.drawing_id",
          foreignField: "_id",
          as: "drawingDetails",
          pipeline: [
            {
              $lookup: {
                from: "contractors",
                localField: "issued_person",
                foreignField: "_id",
                as: "contractorDetails",
              },
            },
            {
              $lookup: {
                from: "bussiness-projects",
                localField: "project",
                foreignField: "_id",
                as: "projectDetails",
                pipeline: [
                  {
                    $lookup: {
                      from: "store-parties",
                      localField: "party",
                      foreignField: "_id",
                      as: "partyDetails",
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      {
        $addFields: {
          drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
        },
      },
      {
        $addFields: {
          "drawingDetails.contractorDetails": {
            $arrayElemAt: ["$drawingDetails.contractorDetails", 0],
          },
          "drawingDetails.projectDetails": {
            $arrayElemAt: ["$drawingDetails.projectDetails", 0],
          },
        },
      },
      {
        $addFields: {
          "drawingDetails.projectDetails.partyDetails": {
            $arrayElemAt: ["$drawingDetails.projectDetails.partyDetails", 0],
          },
        },
      },
      {
        $project: {
          _id: 1,
          offer_no: "$issue_accept_no",
          client: "$drawingDetails.projectDetails.partyDetails.name",
          project_name: "$drawingDetails.projectDetails.name",
          contractor_name: "$drawingDetails.contractorDetails.name",
          issued_date: "$drawingDetails.issued_date",
          request_name: "$requestDetails.user_name",
          createdAt: "$createdAt",
          items: {
            _id: "$items._id",
            grid_no: "$gridDetails.grid_no",
            grid_qty: "$gridDetails.grid_qty",
            drawing_no: "$drawingDetails.drawing_no",
            issued_date: "$drawingDetails.issued_date",
            rev: "$drawingDetails.rev",
            sheet_no: "$drawingDetails.sheet_no",
            assembly_no: "$drawingDetails.assembly_no",
            item_no: "$materialDetails.item_no",
            profile: "$itemDetails.name",
            issued_length: "$items.issued_length",
            issued_width: "$items.issued_width",
            issued_qty: "$items.issued_qty",
            imir_no: "$items.imir_no",
            heat_no: "$items.heat_no",
            remarks: "$items.remarks",
            requested_length: "$items.requested_length",
            requested_width: "$items.requested_width",
            requested_qty: "$items.requested_qty",
            multiply_iss_qty: "$items.multiply_iss_qty",
          },
        },
      },
      {
        $group: {
          _id: {
            _id: "$_id",
            offer_no: "$offer_no",
            project_name: "$project_name",
            client: "$client",
            contractor_name: "$contractor_name",
            // issued_date: "$issued_date",
            request_name: "$request_name",
            createdAt: "$createdAt",
          },
          items: { $push: "$items" },
          issued_date: { $first: "$issued_date" },
        },
      },
      {
        $project: {
          _id: "$_id._id",
          offer_no: "$_id.offer_no",
          client: "$_id.client",
          project_name: "$_id.project_name",
          contractor_name: "$_id.contractor_name",
          issued_date: "$_id.issued_date",
          request_name: "$_id.request_name",
          request_date: "$_id.createdAt",
          issued_date: "$issued_date",
          items: 1,
        },
      },
    ]);

    if (requestData.length > 0) {
      return { status: 1, result: requestData };
    } else {
      return { status: 0, result: [] };
    }
  } catch (error) {
    return { status: 2, result: error };
  }
};
