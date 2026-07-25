const RequestModal = require("../../models/erp/planner/request.model");
const TransactionItem = require("../../models/store/transaction_item.model");
const PurchaseOffer = require("../../models/store/purchase_offer.model");
const ItemStock = require("../../models/store/item_stock.model");
const ejs = require("ejs");
const fs = require("fs");
const XLSX = require('xlsx');  // for utility functions
const XLSXStyle = require('xlsx-style');  // for styling
const puppeteer = require("puppeteer");
const path = require("path");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;

const { sendResponse } = require("../../helper/response");
const { getUsableStockverify, getUsableStockverifyNode } = require("./usable_stock.controller");

  const getStock = async (proId) => {
    try {
      const requestStocks = await ItemStock.aggregate([
        { $match: { deleted: false, requestId: { $ne: null } } },
        {
          $lookup: {
            from: "erp-requests",
            localField: "requestId",
            foreignField: "_id",
            as: "requestData",
          },
        },
        { $unwind: "$requestData" },
        {
          $lookup: {
            from: "bussiness-projects",
            localField: "requestData.project",
            foreignField: "_id",
            as: "projectDetails",
          },
        },
        { $unwind: "$projectDetails" },
        {
          $lookup: {
            from: "store-parties",
            localField: "projectDetails.party",
            foreignField: "_id",
            as: "partyDetails",
          },
        },
        { $unwind: "$partyDetails" },
        {
          $lookup: {
            from: "store_transaction_items",
            let: { requestId: "$requestData._id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$requestId", "$$requestId"] },
                },
              },
              {
                $lookup: {
                  from: "store-items",
                  localField: "itemName",
                  foreignField: "_id",
                  as: "itemDetails",
                },
              },
              { $unwind: "$itemDetails" },
              {
                $lookup: {
                  from: "store-item-units",
                  localField: "itemDetails.unit",
                  foreignField: "_id",
                  as: "unitDetails",
                },
              },
              { $unwind: "$unitDetails" },
              {
                $project: {
                  _id: 0,
                  quantity: 1,
                  itemName: "$itemDetails.name",
                  mcode: "$itemDetails.mcode",
                  material_grade: "$itemDetails.material_grade",
                  hsn_code: "$itemDetails.hsn_code",
                  itemId: "$itemDetails._id",
                  unit: "$unitDetails.name",
                  transactionId: "$_id",
                  main_supplier: 1,
                  preffered_supplier: 1,
                },
              },
            ],
            as: "transactionItems",
          },
        },
        { $unwind: "$transactionItems" },
        {
          $lookup: {
            from: "store-parties",
            localField: "transactionItems.main_supplier",
            foreignField: "_id",
            as: "mainSupplierDetails",
          },
        },
        {
          $unwind: {
            path: "$mainSupplierDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "erp-purchase-offers",
            let: { transactionId: "$transactionItems.transactionId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ["$$transactionId", "$items.transactionId"],
                  },
                  deleted: false,
                },
              },
              {
                $project: {
                  // _id: 0,
                  offer_no: 1,
                  imir_no: 1,
                  qc_date: 1,
                  received_date: 1,
                  invoice_no: 1,
                  createdAt: 1, // Include createdAt field
                  items: {
                    $filter: {
                      input: "$items",
                      as: "item",
                      cond: {
                        $eq: ["$$item.transactionId", "$$transactionId"],
                      },
                    },
                  },
                },
              },
              { $unwind: "$items" },
              {
                $lookup: {
                  from: "store-item-units",
                  localField: "items.offer_uom",
                  foreignField: "_id",
                  as: "uomDetails",
                },
              },
              {
                $lookup: {
                  from: "store-parties",
                  localField: "items.manufacture",
                  foreignField: "_id",
                  as: "manufactureDetails",
                },
              },
              {
                $addFields: {
                  "items.offer_uom": { $arrayElemAt: ["$uomDetails.name", 0] },
                  "items.manufacture": { $arrayElemAt: ["$manufactureDetails.name", 0] },
                  "items.manufacture_id": { $arrayElemAt: ["$manufactureDetails._id", 0] },
                },
              },
              // {
              //   $group: {
              //     _id: "$_id",
              //     offer_no: { $first: "$offer_no" },
              //     imir_no: { $first: "$imir_no" },
              //     invoice_no: { $first: "$invoice_no" },
              //     qc_date: { $first: "$qc_date" },
              //     offer_date: { $first: "$received_date" }, // Rename received_date to offer_date
              //     inspection_date: { $first: "$createdAt" }, // Rename createdAt to inspection_date
              //     items: { $push: "$items" },
              //   },
              // },
              {
                $project: {
                  offer_no: 1,
                  imir_no: 1,
                  invoice_no: 1,
                  qc_date: 1,
                  offer_date: "$received_date",
                  inspection_date: "$createdAt",
                  item: "$items"
                }
              }
            ],
            as: "offerDetails",
          },
        },
        // { $unwind: { path: "$offerDetails", preserveNullAndEmptyArrays: true } },
        // {
        //   $group: {
        //     _id: "$transactionItems.transactionId",
        //     requestId: { $first: "$requestId" },
        //     requestData: { $first: "$requestData" },
        //     transactionItem: { $first: "$transactionItems" },
        //     offerDetails: { $push: "$offerDetails" },
        //     project_name: { $first: "$projectDetails.name" },
        //     project_id: { $first: "$projectDetails._id" },
        //     po_wo_no: { $first: "$projectDetails.work_order_no" },
        //     party_name: { $first: "$partyDetails.name" },
        //     mainSupplierName: { $first: "$mainSupplierDetails.name" },
        //     supplier_id: { $first: "$mainSupplierDetails._id" },
        //     prefferedSuppliers: { $first: "$prefferedSuppliers" },
        //   },
        // },
        // {
        //   $project: {
        //     _id: 0,
        //     requestData: {
        //       _id: "$requestData._id",
        //       requestNo: "$requestData.requestNo",
        //       material_po_no: "$requestData.material_po_no",
        //       project_name: "$project_name",
        //       project_id: "$project_id",
        //       po_wo_no: "$po_wo_no",
        //       party_name: "$party_name",
        //       transactionItem: {
        //         quantity: "$transactionItem.quantity",
        //         itemName: "$transactionItem.itemName",
        //         mcode: "$transactionItem.mcode",
        //         material_grade: "$transactionItem.material_grade",
        //         hsn_code: "$transactionItem.hsn_code",
        //         itemId: "$transactionItem.itemId",
        //         unit: "$transactionItem.unit",
        //         transactionId: "$transactionItem.transactionId",
        //         offerDetails: "$offerDetails",
        //         supplier: "$mainSupplierName",
        //         supplier_id: "$supplier_id",
        //         preffered_suppliers: "$prefferedSuppliers",
        //       },
        //     },
        //   },
        // },
        {
          $project: {
            _id: 0,
            requestData: {
              _id: "$requestData._id",
              requestNo: "$requestData.requestNo",
              material_po_no: "$requestData.material_po_no",
              project_name: "$projectDetails.name",
              project_id: "$projectDetails._id",
              po_wo_no: "$projectDetails.work_order_no",
              party_name: "$partyDetails.name",
              transactionItem: {
                quantity: "$transactionItems.quantity",
                itemName: "$transactionItems.itemName",
                mcode: "$transactionItems.mcode",
                material_grade: "$transactionItems.material_grade",
                hsn_code: "$transactionItems.hsn_code",
                itemId: "$transactionItems.itemId",
                unit: "$transactionItems.unit",
                transactionId: "$transactionItems.transactionId",
                offerDetails: "$offerDetails",
                supplier: "$mainSupplierDetails.name",
                supplier_id: "$mainSupplierDetails._id",
                preffered_suppliers: "$transactionItems.preffered_supplier",
              },
            },
          },
        },
        {
          $sort: {
            "requestData.requestNo": 1,
            "requestData.transactionItem.itemName": 1,
            "requestData.transactionItem.mcode": 1,
          },
        },
      ]);

      const result = [];
      const getIdString = (value) => {
        if (!value) return "";
        if (typeof value === "string") return value;
        if (typeof value === "object" && typeof value.toString === "function") {
          return value.toString();
        }
        return "";
      };
      requestStocks.forEach((elem) => {

        const requestNo = elem.requestData.requestNo;
        const material_po_no = elem.requestData.material_po_no;
        const itemName = elem.requestData.transactionItem.itemName;
        const itemId = elem.requestData.transactionItem.itemId;
        const po_qty = elem.requestData.transactionItem.quantity;
        const mcode = elem.requestData.transactionItem.mcode;
        const material_grade = elem.requestData.transactionItem.material_grade;
        const unit = elem.requestData.transactionItem.unit;
        const project_name = elem.requestData.project_name;
        const project_id = elem.requestData.project_id;
        const po_wo_no = elem.requestData.po_wo_no;
        const party_name = elem.requestData.party_name;
        const mainSupplierName = elem.requestData.transactionItem.supplier;
        const supplier_id = elem.requestData.transactionItem.supplier_id;
        const psName = elem.requestData.transactionItem.preffered_suppliers;

        elem.requestData.transactionItem.offerDetails.forEach(offer => {
          // const offer_no = offer.offer_no;
          // const imir_no = offer.imir_no;
          // const qc_date = offer.qc_date;
          // const offer_date = offer.offer_date;
          // const inspection_date = offer.inspection_date;
          // const invoice_no = offer.invoice_no || "-";

          // offer.items.forEach(item => {
          //   result.push({
          //     requestNo,
          //     material_po_no,
          //     itemId,
          //     name: itemName,
          //     unit,
          //     mcode: mcode,
          //     material_grade,
          //     po_qty,
          //     mcode,
          //     offer_no,
          //     imir_no,
          //     invoice_no,
          //     qc_date,
          //     offer_date,
          //     inspection_date,
          //     transactionId: item.transactionId,
          //     offeredQty: item.offeredQty,
          //     receiving_date: item.receiving_date,
          //     offerNos: item.offerNos,
          //     offerLength: item.offerLength,
          //     offerWidth: item.offerWidth,
          //     offer_topBottom_thickness: item.offer_topbottom_thickness,
          //     offer_width_thickness: item.offer_width_thickness,
          //     offer_normal_thickness: item.offer_normal_thickness,
          //     lot_no: item.lotNo,
          //     remarks: item.remarks,
          //     offer_uom: item.offer_uom,
          //     acceptedQty: item.acceptedQty,
          //     acceptedLength: item.acceptedLength,
          //     acceptedWidth: item.acceptedWidth,
          //     acceptedNos: item.acceptedNos,
          //     accepted_lot_no: item.accepted_lot_no,
          //     accepted_topBottom_thickness: item.accepted_topbottom_thickness,
          //     accepted_width_thickness: item.accepted_width_thickness,
          //     accepted_normal_thickness: item.accepted_normal_thickness,
          //     tcNo: item.tcNo,
          //     rejectedQty: item.rejectedQty,
          //     challan_qty: item.challan_qty,
          //     rejected_length: item.rejected_length || 0,
          //     rejected_width: item.rejected_width || 0,
          //     manufacture: item.manufacture,
          //     manufacture_id: item.manufacture_id,
          //     acceptedRemarks: item.acceptedRemarks,
          //     issued_qty: item.item_assembly_weight,
          //     balance_qty: item?.acceptedQty - (item?.item_assembly_weight || 0),
          //     _id: item._id,
          //     project_name,
          //     project_id,
          //     po_wo_no,
          //     party_name,
          //     mainSupplierName,
          //     supplier_id,
          //     preffered_supplier: psName,
          //   });
          result.push({
            requestNo,
            material_po_no,
            itemId,
            name: itemName,
            unit,
            mcode,
            material_grade,
            po_qty,
            offer_no: offer.offer_no,
            imir_no: offer.imir_no,
            invoice_no: offer.invoice_no || "-",
            qc_date: offer.qc_date,
            offer_date: offer.offer_date,
            inspection_date: offer.inspection_date,
            transactionId: offer.item.transactionId,
            offeredQty: offer.item.offeredQty,
            receiving_date: offer.item.receiving_date,
            offerNos: offer.item.offerNos,
            offerLength: offer.item.offerLength,
            offerWidth: offer.item.offerWidth,
            offer_topBottom_thickness: offer.item.offer_topbottom_thickness,
            offer_width_thickness: offer.item.offer_width_thickness,
            offer_normal_thickness: offer.item.offer_normal_thickness,
            lot_no: offer.item.lotNo,
            remarks: offer.item.remarks,
            offer_uom: offer.item.offer_uom,
            acceptedQty: offer.item.acceptedQty,
            acceptedLength: offer.item.acceptedLength,
            acceptedWidth: offer.item.acceptedWidth,
            acceptedNos: offer.item.acceptedNos,
            accepted_lot_no: offer.item.accepted_lot_no,
            accepted_topBottom_thickness: offer.item.accepted_topbottom_thickness,
            accepted_width_thickness: offer.item.accepted_width_thickness,
            accepted_normal_thickness: offer.item.accepted_normal_thickness,
            tcNo: offer.item.tcNo,
            heat_no_data: offer.item.heat_no_data,
            rejectedQty: offer.item.rejectedQty,
            challan_qty: offer.item.challan_qty,
            rejected_length: offer.item.rejected_length || 0,
            rejected_width: offer.item.rejected_width || 0,
            manufacture: offer.item.manufacture,
            manufacture_id: offer.item.manufacture_id,
            acceptedRemarks: offer.item.acceptedRemarks,
            issued_qty: offer.item.item_assembly_weight,
            balance_qty: offer.item?.acceptedQty - (offer.item?.item_assembly_weight || 0),
            _id: offer.item._id,
            project_name,
            project_id,
            po_wo_no,
            party_name,
            mainSupplierName,
            supplier_id,
            preffered_supplier: psName,
          });
        });
      });

      const fimOffers = await PurchaseOffer.aggregate([
        { $match: { deleted: false, is_fim: true, fim_id: { $ne: null } } },
        {
          $lookup: {
            from: "fimpackinglists",
            localField: "fim_id",
            foreignField: "_id",
            as: "fimData",
          },
        },
        { $unwind: "$fimData" },
        {
          $lookup: {
            from: "bussiness-projects",
            localField: "fimData.project",
            foreignField: "_id",
            as: "projectDetails",
          },
        },
        { $unwind: { path: "$projectDetails", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "store-parties",
            localField: "projectDetails.party",
            foreignField: "_id",
            as: "partyDetails",
          },
        },
        { $unwind: { path: "$partyDetails", preserveNullAndEmptyArrays: true } },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "store_transaction_items",
            localField: "items.transactionId",
            foreignField: "_id",
            as: "transactionItem",
          },
        },
        { $unwind: { path: "$transactionItem", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "store-items",
            localField: "transactionItem.itemName",
            foreignField: "_id",
            as: "itemDetails",
          },
        },
        { $unwind: { path: "$itemDetails", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "store-item-units",
            localField: "itemDetails.unit",
            foreignField: "_id",
            as: "unitDetails",
          },
        },
        { $unwind: { path: "$unitDetails", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "store-parties",
            localField: "items.manufacture",
            foreignField: "_id",
            as: "manufactureDetails",
          },
        },
        { $unwind: { path: "$manufactureDetails", preserveNullAndEmptyArrays: true } },
      ]);

      fimOffers.forEach((doc) => {
        const offerItem = doc.items || {};
        const acceptedQty = offerItem.acceptedQty || 0;
        const issuedQty = offerItem.item_assembly_weight || 0;
        const targetItemId =
          getIdString(doc.itemDetails?._id) || getIdString(doc.transactionItem?.itemName);
        const fimItemDetails = targetItemId
          ? (doc.fimData?.items || []).find(
              (fimItem) => getIdString(fimItem.item_id) === targetItemId
            )
          : undefined;
        const fimManufacture = fimItemDetails?.manufacture;
        const fimReceivedDetails = fimItemDetails || doc.fimData?.items?.[0];
        
        result.push({
          requestNo: doc.fimData?.packing_no || "--",
          material_po_no: doc.fimData?.packing_no || "--",
          itemId: doc.itemDetails?._id || doc.transactionItem?.itemName,
          name: doc.itemDetails?.name || "--",
          unit: doc.unitDetails?.name || "--",
          mcode: doc.itemDetails?.mcode || "--",
          material_grade: doc.itemDetails?.material_grade || "--",
          po_qty: offerItem.offeredQty || 0,
          offer_no: doc.offer_no || "--",
          imir_no: doc.imir_no || "--",
          invoice_no: doc.fimData?.rgp_no || "--",
          qc_date: doc.qc_date,
          offer_date: doc.received_date,
          inspection_date: doc.createdAt,
          transactionId: offerItem.transactionId,
          offeredQty: offerItem.offeredQty || 0,
          receiving_date: doc.fimData?.receiving_date,
          offerNos: fimReceivedDetails?.received_nos || 0,
          offerLength: fimReceivedDetails?.received_length || 0,
          offerWidth: fimReceivedDetails?.received_width || 0,
          offer_topBottom_thickness: offerItem.offer_topbottom_thickness || offerItem.accepted_topbottom_thickness || 0,
          offer_width_thickness: offerItem.offer_width_thickness || offerItem.accepted_width_thickness || 0,
          offer_normal_thickness: offerItem.offer_normal_thickness || offerItem.accepted_normal_thickness || 0,
          lot_no: offerItem.lot_no || "--",
          remarks: offerItem.remarks || "",
          offer_uom: doc.unitDetails?.name || "--",
          acceptedQty,
          acceptedLength: offerItem.acceptedLength || 0,
          acceptedWidth: offerItem.acceptedWidth || 0,
          acceptedNos: offerItem.acceptedNos || 0,
          accepted_lot_no: offerItem.accepted_lot_no || "--",
          accepted_topBottom_thickness: offerItem.accepted_topbottom_thickness || 0,
          accepted_width_thickness: offerItem.accepted_width_thickness || 0,
          accepted_normal_thickness: offerItem.accepted_normal_thickness || 0,
          tcNo: offerItem.tcNo || "--",
          heat_no_data: offerItem.heat_no_data || [],
          rejectedQty: offerItem.rejectedQty || 0,
          challan_qty: offerItem.challan_qty || 0,
          rejected_length: offerItem.rejected_length || 0,
          rejected_width: offerItem.rejected_width || 0,
          manufacture: offerItem.manufacture || fimManufacture || doc.manufactureDetails?.name || "--",
          manufacture_id: offerItem.manufacture_id || doc.manufactureDetails?._id || null,
          acceptedRemarks: offerItem.acceptedRemarks || "",
          issued_qty: issuedQty,
          balance_qty: acceptedQty - issuedQty,
          _id: offerItem._id,
          project_name: doc.projectDetails?.name || "--",
          project_id: doc.projectDetails?._id,
          po_wo_no: doc.projectDetails?.work_order_no || "--",
          party_name: doc.partyDetails?.name || "--",
          mainSupplierName: doc.fimData?.supplier || "--",
          supplier_id: doc.fimData?.supplier || null,
          preffered_supplier: [],
          isFim: true,
        });
      });

      let finalResult = result;
      if (proId) {
        finalResult = result.filter(item => item.project_id && item.project_id.toString() === proId.toString());
      }

      if (finalResult.length && finalResult.length > 0) {
        return { status: 1, result: finalResult };
      }
      return { status: 0, result: [] };
    } catch (error) {
      return { status: 2, result: error };
    }
  };

exports.getStockList = async (req, res) => {
  const proId = req.query.project
  if (req.user && !req.error) {
    try {
      const data = await getStock(proId)
      if (data.status === 1) {
        let requestData = data.result;
        sendResponse(res, 200, true, requestData, `Stock list`);
      } else if (data.status === 0) {
        sendResponse(res, 200, true, [], `Stock list not found`);
      } else if (data.status === 2) {
        console.log("error", data.result);
        sendResponse(res, 500, false, {}, "Something went wrong111");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.downloadStockItem = async (req, res) => {
  const { print_date, project } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await getStock(project)
      let requestData = data.result;

      const usableStock = await getUsableStockverifyNode(project)
      requestData = usableStock.length === 0 ? requestData : requestData.map(resultItem => {
        const matchedStock = usableStock.find(stockItem =>
          stockItem.item_id.toString() === resultItem.itemId.toString() &&
          stockItem.imir_no === resultItem.imir_no
        );

        if (matchedStock) {
          return {
            ...resultItem,
            usableQty: matchedStock.usableQty
          };
        }

        return resultItem;
      });

      if (data.status === 1) {
        const template = fs.readFileSync("templates/stockList.html", "utf-8");
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
          width: "25in",
          height: "15in",
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

        const pdfsDir = path.join(__dirname, "../../pdfs");
        if (!fs.existsSync(pdfsDir)) {
          fs.mkdirSync(pdfsDir);
        }

        const filename = `stock_list_${Date.now()}.pdf`;
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
      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Stock list not found`)
      }
      else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong00");
      }
    } catch (error) {
      console.log("error", error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.xlsxStockItem = async (req, res) => {
  const { print_date, project } = req.body;

  if (req.user && !req.error) {
    try {
      const data = await getStock(project)
      let requestData = data.result;

      let allRows = [];
      let srNo = 0;

      requestData.forEach(item => {
        srNo++;
        allRows.push({
          isMain: true,
          srNo: srNo,
          requestNo: item.requestNo,
          material_po_no: item.material_po_no,
          itemId: item.itemId,
          name: item.name,
          unit: item.unit,
          mcode: item.mcode,
          material_grade: item.material_grade,
          po_qty: item.po_qty,
          offer_no: item.offer_no,
          imir_no: item.imir_no,
          invoice_no: item.invoice_no,
          offer_date: item.offer_date,
          inspection_date: item.inspection_date,
          transactionId: item.transactionId,
          offeredQty: item.offeredQty,
          offerNos: item.offerNos,
          offerLength: item.offerLength,
          offerWidth: item.offerWidth,
          offer_topBottom_thickness: item.offer_topBottom_thickness,
          offer_width_thickness: item.offer_width_thickness,
          offer_normal_thickness: item.offer_normal_thickness,
          lot_no: item.lot_no,
          remarks: item.remarks,
          offer_uom: item.offer_uom,
          acceptedQty: item.acceptedQty,
          accepted_topBottom_thickness: item.accepted_topBottom_thickness,
          accepted_width_thickness: item.accepted_width_thickness,
          accepted_normal_thickness: item.accepted_normal_thickness,
          heat_lot_no: item.heat_no_data?.[0]?.heat_no || item.accepted_lot_no || '--',
          inspected_nos: item.heat_no_data?.[0]?.inspected_nos || item.acceptedNos || '--',
          inspected_length: item.heat_no_data?.[0]?.inspected_length || item.acceptedLength || '--',
          inspected_width: item.heat_no_data?.[0]?.inspected_width || item.acceptedWidth || '--',
          tc_no: item.heat_no_data?.[0]?.tc_no || item.tcNo || '--',
          rejectedQty: item.rejectedQty,
          challan_qty: item.challan_qty,
          rejected_length: item.rejected_length,
          rejected_width: item.rejected_width,
          manufacture: item.manufacture,
          manufacture_id: item.manufacture_id,
          acceptedRemarks: item.acceptedRemarks,
          issued_qty: item.issued_qty,
          balance_qty: item.balance_qty,
          _id: item._id,
          project_name: item.project_name,
          project_id: item.project_id,
          po_wo_no: item.po_wo_no,
          party_name: item.party_name,
          mainSupplierName: item.mainSupplierName,
          supplier_id: item.supplier_id,
          preffered_supplier: item.preffered_supplier,
        });

        if (item.heat_no_data && item.heat_no_data.length > 1) {
          for (let i = 1; i < item.heat_no_data.length; i++) {
            allRows.push({
              isMain: false,
              material_po_no: item.material_po_no,
              manufacture: item.manufacture,
              name: item.name,
              invoice_no: item.invoice_no,
              imir_no: item.imir_no,
              inspection_date: item.inspection_date,
              offer_date: item.offer_date,
              material_grade: item.material_grade,
              mainSupplierName: item.mainSupplierName,
              heat_lot_no: item.heat_no_data[i].heat_no,
              inspected_nos: item.heat_no_data[i].inspected_nos,
              inspected_length: item.heat_no_data[i].inspected_length,
              inspected_width: item.heat_no_data[i].inspected_width,
              tc_no: item.heat_no_data[i].tc_no
            });
          }
        }
      });


      if (data.status === 1) {
        const wb = XLSX.utils.book_new();
        let ws

        const headerStyle = {
          font: { bold: true }, fill: { fgColor: { rgb: "fdc686" } }, alignment: { horizontal: 'center', vertical: 'middle' }
        };

        const headerStyle1 = {
          font: { size: 2, bold: false }, alignment: { horizontal: 'left', vertical: 'middle' },
        };

        const headerStyle2 = {
          font: { size: 16, bold: true }, fill: { fgColor: { rgb: 'fdc686' } }, alignment: { horizontal: 'left', vertical: 'middle' },
        };

        const headerStyle4 = {
          font: { bold: true }, alignment: { horizontal: 'left', vertical: 'middle' },
        };

        const evenRowStyle = {
          fill: { fgColor: { rgb: "D3D3D3" } },
          font: { bold: false, color: { rgb: "000000" } }
        };

        const oddRowStyle = {
          fill: { fgColor: { rgb: "FFFFFF" } },
          font: { bold: false, color: { rgb: "000000" } }
        };

        const ws_data = [
          [
            {
              v: `                                                                                                    
            VISHAL ENTERPRISE & VRISHAL ENGINEERING PRIVATE LIMITED GROUP OF COMPANIES`, s: headerStyle2
            },
          ],
          [
            { v: `STOCK REPORT`, s: headerStyle4 },
            "", "", "", "", "", "", "",
            print_date ? { v: `Download Date : ${new Intl.DateTimeFormat('en-GB').format(new Date())}`, s: headerStyle4 } : "",
            "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""
          ],
          [
            { v: `CLIENT                         : ${requestData[0].party_name}`, s: headerStyle1 },
            "", "", "", "", "", "", "",
            { v: `PROJECT           : ${requestData[0].project_name}`, s: headerStyle1 },
            "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""
          ],
          [
            { v: `PO / WO NO.                 : ${requestData[0].po_wo_no}`, s: headerStyle1 },
          ]
        ];

        const headers = [
          { v: "SR No.", s: headerStyle },
          { v: "MATERIAL PO No.", s: headerStyle },
          { v: "SUPPLIER", s: headerStyle },
          { v: "MANUFACTURER", s: headerStyle },
          { v: "SECTION DETAILS", s: headerStyle },
          { v: "GRADE", s: headerStyle },
          { v: "UNIT", s: headerStyle },
          { v: "PO QTY.", s: headerStyle },
          { v: "IMIR OFF QTY.", s: headerStyle2 },
          { v: "IMIR OFF. DATE", s: headerStyle2 },
          { v: "IMIR OFF. LENGTH(MM)", s: headerStyle2 },
          { v: "IMIR OFF. WIDTH(MM)", s: headerStyle2 },
          { v: "IMIR OFF. NOS", s: headerStyle },
          { v: "INSPECTION QTY(KG)", s: headerStyle2 },
          { v: "INSPECTION HEAT NO.", s: headerStyle },
          { v: "INSPECTION NOS", s: headerStyle2 },
          { v: "INSPECTION LENGTH(MM)", s: headerStyle2 },
          { v: "INSPECTION WIDTH(MM)", s: headerStyle2 },
          { v: "TC NO.", s: headerStyle },
          { v: "INSPECTION DATE", s: headerStyle2 },
          { v: "REJECTED QTY(KG)", s: headerStyle },
          { v: "REJECTED LENGTH(MM)", s: headerStyle2 },
          { v: "REJECTED NOS", s: headerStyle2 }, // NAME CHANGE WIDTH => NOS  
          { v: "IMIR NO.", s: headerStyle },
          { v: "INVOICE NO.", s: headerStyle },
          { v: "ACTUAL QTY(KG)", s: headerStyle2 },
          { v: "ISSUED QTY(KG)", s: headerStyle2 },
          { v: "AVAILABLE QTY(KG)", s: headerStyle2 },
          { v: "REMARKS", s: headerStyle },
        ];

        ws_data.push(headers);

        let currentColorStyle = oddRowStyle;

        allRows.forEach((detail) => {
          if (detail.srNo !== undefined && detail.srNo !== null && detail.srNo !== '') {
            currentColorStyle = detail.srNo % 2 === 0 ? evenRowStyle : oddRowStyle;
          }

          const row = [
            { v: detail.srNo || '', s: currentColorStyle },
            { v: detail.material_po_no || '--', s: currentColorStyle },
            { v: detail.mainSupplierName || '--', s: currentColorStyle },
            { v: detail.manufacture || '--', s: currentColorStyle },
            { v: detail.name || '--', s: currentColorStyle },
            { v: detail.material_grade || '--', s: currentColorStyle },
            { v: detail.unit || '--', s: currentColorStyle },
            { v: detail.po_qty || '0.00', s: currentColorStyle },
            { v: detail.offeredQty || '0.00', s: currentColorStyle },
            { v: detail.offer_date ? new Date(detail.offer_date).toLocaleDateString() : '--', s: currentColorStyle },
            { v: detail.offerLength || '0.00', s: currentColorStyle },
            { v: detail.offerWidth || '0.00', s: currentColorStyle },
            { v: detail.offerNos || '0', s: currentColorStyle },
            { v: detail.acceptedQty || '0.00', s: currentColorStyle },
            { v: detail.heat_lot_no || '--', s: currentColorStyle },
            { v: detail.inspected_nos || '0.00', s: currentColorStyle },
            { v: detail.inspected_length || '--', s: currentColorStyle },
            { v: detail.inspected_width || '--', s: currentColorStyle },
            { v: detail.tc_no || '--', s: currentColorStyle },
            { v: detail.inspection_date ? new Date(detail.inspection_date).toLocaleDateString() : '--', s: currentColorStyle },
            { v: detail.rejectedQty || '0.00', s: currentColorStyle },
            { v: detail.rejected_length || '0.00', s: currentColorStyle },
            { v: detail.rejected_width || '0.00', s: currentColorStyle },
            { v: detail.imir_no || '--', s: currentColorStyle },
            { v: detail.invoice_no || '--', s: currentColorStyle },
            { v: detail.acceptedQty || '0.00', s: currentColorStyle },
            { v: detail.issued_qty || '0.00', s: currentColorStyle },
            { v: detail.balance_qty || '0.00', s: currentColorStyle },
            { v: detail.remarks || '--', s: currentColorStyle },
          ];

          ws_data.push(row);
        });
        ws_data.push([]);
        ws_data.push(
          [
            { v: `REMARKS`, s: headerStyle4 },
            "",
            ""
          ],
          [
            { v: `VE-DOC-04 REV.00`, s: headerStyle1 },
          ]
        );

        const colWidths = ws_data.map((_, colIndex) => ({
          wch: Math.max(
            ...ws_data.slice(4, 4 + allRows.length + 1).map(row => {
              const cell = row[colIndex];
              if (cell && typeof cell === 'object' && 'v' in cell) {
                return cell.v?.toString().length || 0;
              } else if (typeof cell === 'string' || typeof cell === 'number') {
                return cell.toString().length;
              }
              return 0;
            })
          ) + 3
        }));

        ws = XLSX.utils.aoa_to_sheet(ws_data);
        ws['!cols'] = colWidths;

        ws['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 28 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
          { s: { r: 1, c: 8 }, e: { r: 1, c: 28 } },
          { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } },
          { s: { r: 2, c: 8 }, e: { r: 2, c: 28 } },
          { s: { r: 3, c: 0 }, e: { r: 3, c: 28 } },
          { s: { r: ws_data.length - 1, c: 0 }, e: { r: ws_data.length - 1, c: 28 } },
          { s: { r: ws_data.length - 2, c: 0 }, e: { r: ws_data.length - 2, c: 2 } },
          { s: { r: ws_data.length - 2, c: 3 }, e: { r: ws_data.length - 2, c: 28 } },
        ];

        XLSX.utils.book_append_sheet(wb, ws, `Stock Report`);

        const xlsxPath = path.join(__dirname, '../../xlsx');

        if (!fs.existsSync(xlsxPath)) {
          fs.mkdirSync(xlsxPath, { recursive: true });
        }

        const filename = `Stock_Report_${Date.now()}.xlsx`;
        const filePath = path.join(xlsxPath, filename);

        await XLSXStyle.writeFile(wb, filePath);


        const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;

        sendResponse(res, 200, true, { file: fileUrl }, `XLSX file generated successfully`)
        // sendResponse(res, 200, true, requestData, `XLSX file generated successfully`)

      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Stock report not found`)
      }
      else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong111");
      }
    } catch (error) {
      console.log("error", error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
}