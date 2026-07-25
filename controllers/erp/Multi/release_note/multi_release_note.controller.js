const MultiReleaseNote = require('../../../../models/erp/Multi/release_note/multi_release_note.model');
const MultiSurface = require('../../../../models/erp/Multi/multi_surface_inspection.model');
const MultiMio = require('../../../../models/erp/Multi/multi_mio_inspection.model');
const MultiFinalCoat = require('../../../../models/erp/Multi/multi_final_coat_inspection.model');
const MultiDispatchNote = require('../../../../models/erp/Multi/dispatch_note/multi_dispatch_note.model');
const { sendResponse } = require("../../../../helper/response");
const { default: mongoose } = require("mongoose");
const {
  Types: { ObjectId },
} = require("mongoose");
const ejs = require("ejs");
const fs = require("fs");
const puppeteer = require("puppeteer");
const path = require("path");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;
const { generatePDFWithoutPrintDate, generatePDFA4WithoutPrintDate } = require("../../../../utils/pdfUtils");

const { TitleFormat } = require('../../../../utils/enum');
const FDInspection = require('../../../../models/erp/Multi/multi_fd_master.model');
const MioInspection = require('../../../../models/erp/Multi/multi_mio_inspection.model');
const SurfaceInspection = require('../../../../models/erp/Multi/multi_surface_inspection.model');
const DispatchNote = require('../../../../models/erp/Multi/dispatch_note/multi_dispatch_note.model');
const User = require("../../../../models/users.model");
const ErpRole = require("../../../../models/erp/erp_role.model");
const Project = require("../../../../models/project.model");
const addEmailJob = require("../../../../utils/emailJob");
const sendEmail = require("../../../../utils/sendEmail");
const commonStageOfferEmail = require("../../../../utils/commonStageOfferEmail");
const commonStageAcceptanceEmail = require("../../../../utils/commonStageAcceptanceEmail");

exports.addReleaseNote = async (items) => {
  try {
    const filteredItems = items?.itemArray?.filter((item) => item.is_accepted === 2); // accepted items

    console.log("Filtered Items:", filteredItems);
    if (!filteredItems.length) {
      console.log("No accepted items found, skipping release note generation.");
      return { status: 0, result: [] };
    }

    const getInsPaintData = async (model, reportField, reportName) => {
      const data = await model.aggregate([
        { $unwind: "$items" },
        { $match: { deleted: false } },
        {
          $lookup: {
            from: "erp-drawing-grids",
            localField: "items.grid_id",
            foreignField: "_id",
            as: "grid_data",
          }
        },
        {
          $addFields: { grid_id: { $arrayElemAt: ["$grid_data", 0] } },
        },
        {
          $group: {
            _id: { grid_id: "$grid_id._id", drawing_id: "$items.drawing_id" },
            [reportName]: { $addToSet: `$${reportField}` },
          }
        },
        {
          $project: {
            _id: 0,
            drawing_id: "$_id.drawing_id",
            grid_id: "$_id.grid_id",
            [reportName]: 1,
          }
        },
        {
          $match: {
            $or: filteredItems.map((item) => ({
              drawing_id: new mongoose.Types.ObjectId(item.drawing_id),
              grid_id: new mongoose.Types.ObjectId(item.grid_id),
            })),
          },
        },
      ]);
      return data;
    };

    const [surfaceData, mioData, dispatchData, fdData] = await Promise.all([
      getInsPaintData(MultiSurface, "report_no_two", "surface_report"),
      getInsPaintData(MultiMio, "report_no_two", "mio_report"),
      getInsPaintData(MultiDispatchNote, "report_no", "dispatch_report"),
      getInsPaintData(FDInspection, "report_no", "fd_report"),
    ]);

    const finalCoatData = await MultiFinalCoat.aggregate([
      { $unwind: "$items" },
      { $match: { deleted: false, _id: new ObjectId(items?.id) } },
      {
        $lookup: {
          from: "erp-drawing-grids",
          localField: "items.grid_id",
          foreignField: "_id",
          as: "grid_data",
        }
      },
      {
        $addFields: { grid_id: { $arrayElemAt: ["$grid_data", 0] } },
      },
      {
        $group: {
          _id: { grid_id: "$grid_id._id", drawing_id: "$items.drawing_id" },
          final_coat_report: { $addToSet: `$report_no_two` },
          is_grid_qty: { $first: "$items.fc_used_grid_qty" },
        }
      },
      {
        $project: {
          _id: 0,
          grid_id: "$_id.grid_id",
          drawing_id: "$_id.drawing_id",
          is_grid_qty: 1,
          final_coat_report: 1,
        },
      },
      {
        $match: {
          $or: filteredItems.map((item) => ({
            drawing_id: new mongoose.Types.ObjectId(item.drawing_id),
            grid_id: new mongoose.Types.ObjectId(item.grid_id),
          })),
        },
      },
    ])

    const combinedData = [
      ...surfaceData,
      ...mioData,
      ...dispatchData,
      ...fdData,
      ...finalCoatData,
    ]

    function mergeReports(data) {
      return Object.values(
        data.reduce(
          (acc, {
            drawing_id,
            grid_id,
            is_grid_qty = 0,
            dispatch_report = [],
            mio_report = [],
            surface_report = [],
            fd_report = [],
            final_coat_report = [],
          }
          ) => {
            const key = `${drawing_id}_${grid_id}`;
            if (!acc[key]) {
              acc[key] = {
                drawing_id,
                grid_id,
                is_grid_qty,
                dispatch_report: [],
                fd_report: [],
                mio_report: [],
                surface_report: [],
                final_coat_report: [],
              };
            } else {
              acc[key].is_grid_qty += is_grid_qty;
            }


            acc[key].dispatch_report.push(...dispatch_report);
            acc[key].fd_report.push(...fd_report);
            acc[key].mio_report.push(...mio_report);
            acc[key].surface_report.push(...surface_report);
            acc[key].final_coat_report.push(...final_coat_report);

            return acc;
          },
          {}
        )
      )
    }
    let requestData = {
      items: mergeReports(combinedData),
    };
    console.log("Final requestData to save:", JSON.stringify(requestData, null, 2));

    console.log(requestData, 'REQUEST');

    if (requestData.items.length > 0) {
      console.log("Saving release note data:", requestData);

      const addReleaseNote = await MultiReleaseNote.create(requestData);
      console.log("Release note data saved successfully:", addReleaseNote);
      return { status: 1, result: addReleaseNote };
    } else {
      return { status: 0, result: [] };
    }
  } catch (error) {
    console.error("Error saving release note:", error);
    return { status: 2, result: error };
  }
}

exports.addMioReleaseNote = async ({ itemArray, id }) => {
  try {
    const filteredItems = itemArray?.filter(item => item.is_accepted === 2);

    if (!filteredItems.length) {
      return { status: 0, result: [] };
    }

    const getInsPaintData = async (model, reportField, reportName) => {
      return model.aggregate([
        { $unwind: "$items" },
        { $match: { deleted: false } },
        {
          $lookup: {
            from: "erp-drawing-grids",
            localField: "items.grid_id",
            foreignField: "_id",
            as: "grid_data",
          },
        },
        { $addFields: { grid_id: { $arrayElemAt: ["$grid_data", 0] } } },
        {
          $group: {
            _id: {
              grid_id: "$grid_id._id",
              drawing_id: "$items.drawing_id",
            },
            [reportName]: { $addToSet: `$${reportField}` },
          },
        },
        {
          $project: {
            _id: 0,
            drawing_id: "$_id.drawing_id",
            grid_id: "$_id.grid_id",
            [reportName]: 1,
          },
        },
        {
          $match: {
            $or: filteredItems.map(item => ({
              drawing_id: new mongoose.Types.ObjectId(item.drawing_id),
              grid_id: new mongoose.Types.ObjectId(item.grid_id),
            })),
          },
        },
      ]);
    };

    const [surfaceData, dispatchData, fdData] = await Promise.all([
      getInsPaintData(MultiSurface, "report_no_two", "surface_report"),
      // getInsPaintData(MultiMio, "report_no_two", "mio_report"),
      getInsPaintData(MultiDispatchNote, "report_no", "dispatch_report"),
      getInsPaintData(FDInspection, "report_no", "fd_report"),
    ]);

    // ✅ ONLY MIO QTY
    const mioQtyData = await MioInspection.aggregate([
      { $unwind: "$items" },
      { $match: { deleted: false, _id: new ObjectId(id) } },
      {
        $lookup: {
          from: "erp-drawing-grids",
          localField: "items.grid_id",
          foreignField: "_id",
          as: "grid_data",
        },
      },
      { $addFields: { grid_id: { $arrayElemAt: ["$grid_data", 0] } } },
      {
        $group: {
          _id: {
            grid_id: "$grid_id._id",
            drawing_id: "$items.drawing_id",
          },
          mio_report: { $addToSet: "$report_no_two" },
          // 🔥 MIO QTY ONLY
          is_grid_qty: { $first: "$items.mio_used_grid_qty" },
        },
      },
      {
        $project: {
          _id: 0,
          grid_id: "$_id.grid_id",
          drawing_id: "$_id.drawing_id",
          is_grid_qty: 1,
          mio_report: 1,
        },
      },
      {
        $match: {
          $or: filteredItems.map(item => ({
            drawing_id: new mongoose.Types.ObjectId(item.drawing_id),
            grid_id: new mongoose.Types.ObjectId(item.grid_id),
          })),
        },
      },
    ]);

    const combinedData = [
      ...surfaceData,
      ...dispatchData,
      ...fdData,
      ...mioQtyData,
    ];

   function mergeReports(data) {
      return Object.values(
        data.reduce((acc, cur) => {
          const {
            drawing_id,
            grid_id,
            is_grid_qty = 0,
            dispatch_report = [],
            mio_report = [],
            surface_report = [],
            fd_report = [],
          } = cur;

          const key = `${drawing_id}_${grid_id}`;

          if (!acc[key]) {
            acc[key] = {
              drawing_id,
              grid_id,
              is_grid_qty,
              dispatch_report: new Set(),
              fd_report: new Set(),
              mio_report: new Set(),
              surface_report: new Set(),
            };
          } 
          else if (is_grid_qty) {
            acc[key].is_grid_qty = is_grid_qty;
          }

          dispatch_report.forEach(r => acc[key].dispatch_report.add(r));
          fd_report.forEach(r => acc[key].fd_report.add(r));
          mio_report.forEach(r => acc[key].mio_report.add(r));
          surface_report.forEach(r => acc[key].surface_report.add(r));

          return acc;
        }, {})
      ).map(item => ({
        ...item,
        dispatch_report: [...item.dispatch_report],
        fd_report: [...item.fd_report],
        mio_report: [...item.mio_report],
        surface_report: [...item.surface_report],
      }));
    }

    const requestData = { items: mergeReports(combinedData) };

    if (!requestData.items.length) {
      return { status: 0, result: [] };
    }

    const releaseNote = await MultiReleaseNote.create(requestData);
    return { status: 1, result: releaseNote };

  } catch (error) {
    console.error("Error saving MIO release note:", error);
    return { status: 2, result: error };
  }
};
exports.addSurfaceReleaseNote = async ({ itemArray, id }) => {
  try {
    const filteredItems = itemArray?.filter(item => item.is_accepted === 2);

    if (!filteredItems.length) {
      return { status: 0, result: [] };
    }

    const getInsPaintData = async (model, reportField, reportName) => {
      return model.aggregate([
        { $unwind: "$items" },
        { $match: { deleted: false } },
        {
          $lookup: {
            from: "erp-drawing-grids",
            localField: "items.grid_id",
            foreignField: "_id",
            as: "grid_data",
          },
        },
        { $addFields: { grid_id: { $arrayElemAt: ["$grid_data", 0] } } },
        {
          $group: {
            _id: {
              grid_id: "$grid_id._id",
              drawing_id: "$items.drawing_id",
            },
            [reportName]: { $addToSet: `$${reportField}` },
          },
        },
        {
          $project: {
            _id: 0,
            drawing_id: "$_id.drawing_id",
            grid_id: "$_id.grid_id",
            [reportName]: 1,
          },
        },
        {
          $match: {
            $or: filteredItems.map(item => ({
              drawing_id: new mongoose.Types.ObjectId(item.drawing_id),
              grid_id: new mongoose.Types.ObjectId(item.grid_id),
            })),
          },
        },
      ]);
    };

    const [dispatchData, fdData] = await Promise.all([
      // getInsPaintData(MultiSurface, "report_no_two", "surface_report"),
      // getInsPaintData(MultiMio, "report_no_two", "mio_report"),
      getInsPaintData(MultiDispatchNote, "report_no", "dispatch_report"),
      getInsPaintData(FDInspection, "report_no", "fd_report"),
    ]);

    // ✅ ONLY SURFACE QTY
    const surfaceQtyData = await SurfaceInspection.aggregate([
      { $unwind: "$items" },
      { $match: { deleted: false, _id: new ObjectId(id) } },
      {
        $lookup: {
          from: "erp-drawing-grids",
          localField: "items.grid_id",
          foreignField: "_id",
          as: "grid_data",
        },
      },
      { $addFields: { grid_id: { $arrayElemAt: ["$grid_data", 0] } } },
      {
        $group: {
          _id: {
            grid_id: "$grid_id._id",
            drawing_id: "$items.drawing_id",
          },

          // 🔥 SURFACE QTY ONLY
          is_grid_qty: { $first: "$items.surface_used_grid_qty" },

          surface_report: { $addToSet: "$report_no_two" },
        },
      },
      {
        $project: {
          _id: 0,
          grid_id: "$_id.grid_id",
          drawing_id: "$_id.drawing_id",
          is_grid_qty: 1,
          surface_report: 1,
        },
      },
      {
        $match: {
          $or: filteredItems.map(item => ({
            drawing_id: new mongoose.Types.ObjectId(item.drawing_id),
            grid_id: new mongoose.Types.ObjectId(item.grid_id),
          })),
        },
      },
    ]);

    const combinedData = [
      ...dispatchData,
      ...fdData,
      ...surfaceQtyData,
    ];

    // function mergeReports(data) {
    //   return Object.values(
    //     data.reduce((acc, cur) => {
    //       const {
    //         drawing_id,
    //         grid_id,
    //         is_grid_qty = 0,
    //         dispatch_report = [],
    //         mio_report = [],
    //         surface_report = [],
    //         fd_report = [],
    //       } = cur;

    //       const key = `${drawing_id}_${grid_id}`;

    //       if (!acc[key]) {
    //         acc[key] = {
    //           drawing_id,
    //           grid_id,
    //           is_grid_qty,
    //           dispatch_report: [],
    //           fd_report: [],
    //           mio_report: [],
    //           surface_report: [],
    //         };
    //       } else {
    //         acc[key].is_grid_qty += is_grid_qty;
    //       }

    //       acc[key].dispatch_report.push(...dispatch_report);
    //       acc[key].fd_report.push(...fd_report);
    //       acc[key].mio_report.push(...mio_report);
    //       acc[key].surface_report.push(...surface_report);

    //       return acc;
    //     }, {})
    //   );
    // }

    function mergeReports(data) {
      return Object.values(
        data.reduce((acc, cur) => {
          const {
            drawing_id,
            grid_id,
            is_grid_qty = 0,
            dispatch_report = [],
            mio_report = [],
            surface_report = [],
            fd_report = [],
          } = cur;

          const key = `${drawing_id}_${grid_id}`;

          if (!acc[key]) {
            acc[key] = {
              drawing_id,
              grid_id,
              is_grid_qty,
              dispatch_report: new Set(),
              fd_report: new Set(),
              mio_report: new Set(),
              surface_report: new Set(),
            };
          } 
          else if (is_grid_qty) {
            acc[key].is_grid_qty = is_grid_qty;
          }

          dispatch_report.forEach(r => acc[key].dispatch_report.add(r));
          fd_report.forEach(r => acc[key].fd_report.add(r));
          mio_report.forEach(r => acc[key].mio_report.add(r));
          surface_report.forEach(r => acc[key].surface_report.add(r));

          return acc;
        }, {})
      ).map(item => ({
        ...item,
        dispatch_report: [...item.dispatch_report],
        fd_report: [...item.fd_report],
        mio_report: [...item.mio_report],
        surface_report: [...item.surface_report],
      }));
    }

    const requestData = { items: mergeReports(combinedData) };

    if (!requestData.items.length) {
      return { status: 0, result: [] };
    }

    const releaseNote = await MultiReleaseNote.create(requestData);
    return { status: 1, result: releaseNote };

  } catch (error) {
    console.error("Error saving Surface release note:", error);
    return { status: 2, result: error };
  }
};

exports.addDispatchNoteReleaseNote = async ({ itemArray, id, isSurface, isIrn, isMio, isFp }) => {
  try {
    const filteredItems = itemArray?.filter((item) => item.is_accepted === 2);
    console.log("Is surface Inspection:", isSurface);
    console.log("Is Irn Inspection:", isIrn);
    console.log("Is Fp Inspection:", isFp);
    console.log("Is Mio Inspection:", isMio);
    console.log("Filtered Items:", filteredItems);

    if (!filteredItems.length) {
      console.log("No accepted items found, skipping release note generation.");
      return { status: 0, result: [] };
    }

    const getInsPaintData = async (model, reportField, reportName) => {
      const data = await model.aggregate([
        { $unwind: "$items" },
        { $match: { deleted: false } },
        {
          $lookup: {
            from: "erp-drawing-grids",
            localField: "items.grid_id",
            foreignField: "_id",
            as: "grid_data",
          },
        },
        {
          $addFields: { grid_id: { $arrayElemAt: ["$grid_data", 0] } },
        },
        {
          $group: {
            _id: { grid_id: "$grid_id._id", drawing_id: "$items.drawing_id" },
            [reportName]: { $addToSet: `$${reportField}` },
          },
        },
        {
          $project: {
            _id: 0,
            drawing_id: "$_id.drawing_id",
            grid_id: "$_id.grid_id",
            [reportName]: 1,
          },
        },
        {
          $match: {
            $or: filteredItems.map((item) => ({
              drawing_id: new mongoose.Types.ObjectId(item.drawing_id),
              grid_id: new mongoose.Types.ObjectId(item.grid_id),
            })),
          },
        },
      ]);
      return data;
    };

    const [surfaceData, mioData, dispatchData, fdData] = await Promise.all([
      getInsPaintData(MultiSurface, "report_no_two", "surface_report"),
      getInsPaintData(MultiMio, "report_no_two", "mio_report"),
      getInsPaintData(MultiDispatchNote, "report_no", "dispatch_report"),
      getInsPaintData(FDInspection, "report_no", "fd_report"),
    ]);

    let DispatchNoteReleaseNote = [];

    if (
      (isIrn === 'true' || isIrn === true) &&
      (isSurface === 'false' || isSurface === false) &&
      (isMio === 'false' || isMio === false) &&
      (isFp === 'false' || isFp === false)
    ) {
      console.log(" isIrn ::::: true, fetching dispatch Release Note Data");
      DispatchNoteReleaseNote = await DispatchNote.aggregate([
        { $unwind: "$items" },
        { $match: { deleted: false, _id: new ObjectId(id) } },
        {
          $lookup: {
            from: "erp-drawing-grids",
            localField: "items.grid_id",
            foreignField: "_id",
            as: "gridDetails",
          },
        },
        { $addFields: { grid_id: { $arrayElemAt: ["$gridDetails", 0] } } },
        {
          $group: {
            _id: { grid_id: "$grid_id._id", drawing_id: "$items.drawing_id" },
            mio_report: { $addToSet: `$report_no_two` },
            is_grid_qty: { $first: "$items.dispatch_used_grid_qty" },
          },
        },
        {
          $project: {
            _id: 0,
            grid_id: "$_id.grid_id",
            drawing_id: "$_id.drawing_id",
            is_grid_qty: 1,
            mio_report: 1,
          },
        },
        {
          $match: {
            $or: filteredItems.map((item) => ({
              drawing_id: new mongoose.Types.ObjectId(item.drawing_id),
              grid_id: new mongoose.Types.ObjectId(item.grid_id),
            })),
          },
        },
      ]);
    }
    else {
      console.log("Only isIrn is true, fetching Diatpatch Note Data");
    }
    const combinedData = [
      ...surfaceData,
      ...mioData,
      ...dispatchData,
      ...fdData,
      ...DispatchNoteReleaseNote,
    ];

    function mergeReports(data) {
      return Object.values(
        data.reduce((acc, cur) => {
          const {
            drawing_id,
            grid_id,
            is_grid_qty = 0,
            dispatch_report = [],
            mio_report = [],
            surface_report = [],
            fd_report = [],
            final_coat_report = [],
          } = cur;

          const key = `${drawing_id}_${grid_id}`;
          if (!acc[key]) {
            acc[key] = {
              drawing_id,
              grid_id,
              is_grid_qty,
              dispatch_report: [],
              fd_report: [],
              mio_report: [],
              surface_report: [],
              final_coat_report: [],
            };
          } else {
            acc[key].is_grid_qty += is_grid_qty;
          }

          acc[key].dispatch_report.push(...dispatch_report);
          acc[key].fd_report.push(...fd_report);
          acc[key].mio_report.push(...mio_report);
          acc[key].surface_report.push(...surface_report);
          acc[key].final_coat_report.push(...final_coat_report);

          return acc;
        }, {})
      );
    }

    const requestData = { items: mergeReports(combinedData) };
    console.log("Final requestData to save:", JSON.stringify(requestData, null, 2));

    if (requestData.items.length > 0) {
      const addDispatchNoteReleaseNote = await MultiReleaseNote.create(requestData);
      console.log("Release note data saved successfully:", addDispatchNoteReleaseNote);
      return { status: 1, result: addDispatchNoteReleaseNote };
    } else {
      return { status: 0, result: [] };
    }
  } catch (error) {
    console.error("Error saving release note:", error);
    return { status: 2, result: error };
  }
};


exports.addMultiReleaseNotesData = async () => {
  console.log("multi release note");
  const { items, project } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await this.addReleaseNote(items, project);
      let requestData = data.result;

      if (data.status === 1) {
        sendResponse(res, 200, true, requestData, "Release note data added successfully");
      } else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Release note data not added`);
      } else if (data.status === 2) {
        // console.log("errr", data.result);
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
}

exports.addMioMultiReleaseNotesData = async () => {
  console.log("mio release note");
  const { items, project } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await this.addMioReleaseNote(items, project);
      let requestData = data.result;

      if (data.status === 1) {
        sendResponse(res, 200, true, requestData, "Release note data added successfully");
      } else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Release note data not added`);
      } else if (data.status === 2) {
        // console.log("errr", data.result);
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
}

exports.addSurfaceMultiReleaseNotesData = async () => {
  console.log("surface release note");
  const { items, project } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await this.addSurfaceReleaseNote(items, project);
      let requestData = data.result;

      if (data.status === 1) {
        sendResponse(res, 200, true, requestData, "Release note data added successfully");
      } else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Release note data not added`);
      } else if (data.status === 2) {
        // console.log("errr", data.result);
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
}

exports.addDispatchMultiReleaseNotesData = async () => {
  console.log("dispatch release note");
  const { items, project } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await this.addDispatchNoteReleaseNote(items, project);
      let requestData = data.result;

      if (data.status === 1) {
        sendResponse(res, 200, true, requestData, "Release note data added successfully");
      } else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Release note data not added`);
      } else if (data.status === 2) {
        // console.log("errr", data.result);
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
}

// exports.getMultiReleaseNoteList = async (req, res) => {
//     const { project_id } = req.body;
//     if (req.user && !req.error) {
//         let requestData = await MultiReleaseNote.aggregate([
//             { $match: { deleted: false, is_generate: false } },
//             { $unwind: "$items" },
//             {
//                 $lookup: {
//                     from: "erp-planner-drawings",
//                     localField: "items.drawing_id",
//                     foreignField: "_id",
//                     as: "drawingDetails",
//                     pipeline: [
//                         {
//                             $lookup: {
//                                 from: "bussiness-projects",
//                                 localField: "project",
//                                 foreignField: "_id",
//                                 as: "projectDetails",
//                                 pipeline: [
//                                     {
//                                         $lookup: {
//                                             from: "store-parties",
//                                             localField: "party",
//                                             foreignField: "_id",
//                                             as: "clientDetails",
//                                         },
//                                     },
//                                 ],
//                             },
//                         }
//                     ]
//                 }
//             },
//             {
//                 $lookup: {
//                     from: "erp-drawing-grids",
//                     localField: "items.grid_id",
//                     foreignField: "_id",
//                     as: "gridDetails",
//                 }
//             },
//             {
//                 $addFields: {
//                     drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
//                     gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
//                 },
//             },
//             {
//                 $addFields: {
//                     projectDetails: {
//                         $arrayElemAt: ["$drawingDetails.projectDetails", 0],
//                     },
//                 },
//             },
//             {
//                 $addFields: {
//                     clientDetails: {
//                         $arrayElemAt: ["$projectDetails.clientDetails", 0],
//                     },
//                 },
//             },
//             {
//                 $match: { "projectDetails._id": new ObjectId(project_id) },
//             },
//             {
//                 $project: {
//                     _id: 1,
//                     client: "$clientDetails.name",
//                     project_name: "$projectDetails.name",
//                     project_id: "$projectDetails._id",
//                     wo_no: "$projectDetails.work_order_no",
//                     project_po_no: "$projectDetails.work_order_no",
//                     createdAt: 1,
//                     items: {
//                         _id: "$items._id",
//                         drawing_no: "$drawingDetails.drawing_no",
//                         drawing_id: "$drawingDetails._id",
//                         rev: "$drawingDetails.rev",
//                         sheet_no: "$drawingDetails.sheet_no",
//                         assembly_no: "$drawingDetails.assembly_no",
//                         assembly_quantity: "$drawingDetails.assembly_quantity",
//                         grid_no: "$gridDetails.grid_no",
//                         grid_qty: "$gridDetails.grid_qty",
//                         is_grid_qty: "$items.is_grid_qty",
//                         dispatch_report: "$items.dispatch_report",
//                         fd_report: "$items.fd_report",
//                         mio_report: "$items.mio_report",
//                         surface_report: "$items.surface_report",
//                         final_coat_report: "$items.final_coat_report",
//                     }
//                 }
//             },
//             {
//                 $group: {
//                     _id: {
//                         _id: "$_id",
//                         project_name: "$project_name",
//                         project_id: "$project_id",
//                         wo_no: "$wo_no",
//                         project_po_no: "$project_po_no",
//                         client: "$client",
//                         createdAt: "$createdAt",
//                     },
//                     items: { $push: "$items" },
//                 }
//             },
//             {
//                 $project: {
//                     _id: "$_id._id",
//                     client: "$_id.client",
//                     project_name: "$_id.project_name",
//                     project_id: "$_id.project_id",
//                     wo_no: "$_id.wo_no",
//                     project_po_no: "$_id.project_po_no",
//                     createdAt: "$_id.createdAt",
//                     items: 1,
//                 },
//             },
//             {
//                 $sort: { createdAt: -1 }
//             },
//         ]);

//         if (requestData.length && requestData.length > 0) {
//             sendResponse(res, 200, true, requestData, `Release Note list`);
//         } else {
//             sendResponse(res, 200, true, [], `Release Note not found`);
//         }
//     } else {
//         sendResponse(res, 401, false, {}, "Unauthorized");
//     }
// }

exports.getMultiReleaseNoteList = async (req, res) => {
  const { project_id } = req.body;
  const { page, limit, search } = req.query;

  if (req.user && !req.error) {
    try {
      const matchStage = {
        $match: {
          deleted: false,
          is_generate: false,
        },
      };

      // const searchMatchStage = {
      //     $match: {
      //         "projectDetails._id": new ObjectId(project_id),
      //     },
      // };

      const projectMatchStage = {
        $match: {
          "drawingDetails.projectDetails._id": new ObjectId(project_id),
        },
      };

      // Search stage: drawing_no or assembly_no
      const searchStage = search
        ? {
          $match: {
            $or: [
              { "drawingDetails.drawing_no": { $regex: search, $options: "i" } },
              { "drawingDetails.assembly_no": { $regex: search, $options: "i" } },
            ],
          },
        }
        : null;
      // If drawing_no or assembly_no provided, add case-insensitive regex filters



      const pipeline = [
        matchStage,
        { $unwind: "$items" },
        {
          $lookup: {
            from: "erp-planner-drawings",
            localField: "items.drawing_id",
            foreignField: "_id",
            as: "drawingDetails",
            pipeline: [
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
                        as: "clientDetails",
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: "erp-drawing-grids",
            localField: "items.grid_id",
            foreignField: "_id",
            as: "gridDetails",
          },
        },
        {
          $addFields: {
            drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
            gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
          },
        },
        {
          $addFields: {
            projectDetails: {
              $arrayElemAt: ["$drawingDetails.projectDetails", 0],
            },
          },
        },
        {
          $addFields: {
            clientDetails: {
              $arrayElemAt: ["$projectDetails.clientDetails", 0],
            },
          },
        },
        projectMatchStage,
        ...(searchStage ? [searchStage] : []),

        {
          $project: {
            _id: 1,
            client: "$clientDetails.name",
            project_name: "$projectDetails.name",
            project_id: "$projectDetails._id",
            wo_no: "$projectDetails.work_order_no",
            project_po_no: "$projectDetails.work_order_no",
            createdAt: 1,
            items: {
              _id: "$items._id",
              drawing_no: "$drawingDetails.drawing_no",
              drawing_id: "$drawingDetails._id",
              rev: "$drawingDetails.rev",
              sheet_no: "$drawingDetails.sheet_no",
              assembly_no: "$drawingDetails.assembly_no",
              assembly_quantity: "$drawingDetails.assembly_quantity",
              grid_no: "$gridDetails.grid_no",
              grid_qty: "$gridDetails.grid_qty",
              is_grid_qty: "$items.is_grid_qty",
              dispatch_report: "$items.dispatch_report",
              fd_report: "$items.fd_report",
              mio_report: "$items.mio_report",
              surface_report: "$items.surface_report",
              final_coat_report: "$items.final_coat_report",
            },
          },
        },
        {
          $group: {
            _id: {
              _id: "$_id",
              project_name: "$project_name",
              project_id: "$project_id",
              wo_no: "$wo_no",
              project_po_no: "$project_po_no",
              client: "$client",
              createdAt: "$createdAt",
            },
            items: { $push: "$items" },
          },
        },
        {
          $project: {
            _id: "$_id._id",
            client: "$_id.client",
            project_name: "$_id.project_name",
            project_id: "$_id.project_id",
            wo_no: "$_id.wo_no",
            project_po_no: "$_id.project_po_no",
            createdAt: "$_id.createdAt",
            items: 1,
          },
        },
        { $sort: { createdAt: -1 } },
      ];


      // Count total records (before pagination)
      const countPipeline = [...pipeline];
      countPipeline.push({ $count: "total" });

      const totalCountResult = await MultiReleaseNote.aggregate(countPipeline);
      const totalCount = totalCountResult[0]?.total || 0;

      let paginatedPipeline = [...pipeline];

      // Apply pagination if limit is provided and greater than 0
      const limitInt = parseInt(limit);
      const pageInt = parseInt(page);

      if (limitInt && limitInt > 0) {
        const skip = (pageInt - 1) * limitInt;
        paginatedPipeline.push({ $skip: skip }, { $limit: limitInt });
      }

      const requestData = await MultiReleaseNote.aggregate(paginatedPipeline);

      return sendResponse(res, 200, true, {
        data: requestData,
        pagination: {
          total: totalCount,
          page: pageInt,
          limit: limitInt,
          totalPages: limitInt && limitInt > 0 ? Math.ceil(totalCount / limitInt) : 1
        }

      }, "Release Note list");

    } catch (err) {
      console.error("Error in getMultiReleaseNoteList:", err);
      return sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.generateReleaseNote = async (req, res) => {
  const { id, project, user_id } = req.body;
  if (req.user && !req.error) {
    try {
      if (id.length > 0) {
        const lastInspection = await MultiReleaseNote.findOne(
          { deleted: false, report_no: { $regex: new RegExp(`/${project}/`) } },
          {},
          { sort: { createdAt: -1 } }
        );

        let inspectionNo = lastInspection?.report_no
          ? parseInt(lastInspection.report_no.split("/").pop(), 10) + 1
          : 1;

        const gen_report_no =
          TitleFormat.IRNREPORTNO.replace("/PROJECT/", `/${project}/`) +
          inspectionNo;

        const uniqueBatchId = new mongoose.Types.ObjectId();

        const updateInspect = await MultiReleaseNote.updateMany(
          { _id: { $in: id } },
          { $set: { is_generate: true, batch_id: uniqueBatchId, report_no: gen_report_no, release_date: new Date(), prepared_by: user_id } },
          { new: true }
        );
  // ==========================================
// EMAIL NOTIFICATION
// ==========================================

if (updateInspect.modifiedCount > 0) {

  try {

    const projectData =
      await Project.findOne({
        name: project
      }).select(
        "name work_order_no"
      );

    const requestUser =
      await User.findById(
        user_id
      );

    /* ----------------------------------
       Planning Engineer Users
    ----------------------------------- */

    const roles =
      await ErpRole.find({

        deleted: false,

        name: {
          $in: [
            "Planning Engineer"
          ]
        }

      });

    const roleIds =
      roles.map(
        role => role._id
      );

    const users =
      await User.find({

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


    /* ----------------------------------
       Get updated release note
    ----------------------------------- */

    const releaseNoteDoc =
      await MultiReleaseNote.findOne({

        batch_id:
          uniqueBatchId,

        deleted: false

      }).lean();


    const offerDateTime =

      releaseNoteDoc?.release_date

        ? new Date(
            releaseNoteDoc.release_date
          )
            .toLocaleString(
              "en-IN",
              {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true
              }
            )
            .replace("am", "AM")
            .replace("pm", "PM")

        : "-";


    /* ----------------------------------
       Send Email
    ----------------------------------- */

    for (const user of users) {

      try {

        const html =
          commonStageOfferEmail({

            userName:
              user?.user_name || "-",

            module:
              "Structural",

            stageName:
              "Release Note",

            offerNo:
              gen_report_no,

            projectName:
              projectData?.name || "-",

            workOrderNo:
              projectData?.work_order_no || "-",

            createdBy:
              requestUser?.user_name || "-",

            offerDateTime,

            remarks:
              `Release Note has been generated by ${
                requestUser?.user_name || "-"
              } and is ready for Packing List process.`,

            loginUrl:
              process.env.ERP_URL

          });


        addEmailJob({

          to:
            user.email,

          subject:
            `Release Note - ${gen_report_no}`,

          html

        });


        console.log(
          `RELEASE NOTE EMAIL QUEUED -> ${user.email}`
        );

      }
      catch (mailErr) {

        console.log(
          `MAIL ERROR ${user.email}`,
          mailErr.message
        );

      }

    }

  }
  catch (emailErr) {

    console.log(
      "RELEASE NOTE EMAIL ERROR:",
      emailErr
    );

  }

  return sendResponse(
    res,
    200,
    true,
    {},
    "Release Note generated successfully"
  );

}
else if (
  updateInspect.matchedCount == 0
) {

  return sendResponse(
    res,
    400,
    false,
    {},
    "Release Note not found"
  );

}
        if (updateInspect.modifiedCount > 0) {
          sendResponse(res, 200, true, {}, `Release Note generate successfully`);
        } else if (updateInspect.matchedCount == 0) {
          sendResponse(res, 400, false, {}, `Release Note not found`);
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
}

const generateReleaseNoteList = async (project_id, batch_id, page, limit, search) => {
  try {
    const matchObj = { project_id: new ObjectId(project_id) };
    if (batch_id) matchObj.batch_id = new ObjectId(batch_id);

    const pipeline = [
      {
        $match: {
          deleted: false,
          is_generate: true,
          matchObj,
        }
      },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "erp-planner-drawings",
          localField: "items.drawing_id",
          foreignField: "_id",
          as: "drawingDetails",
          pipeline: [
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
                      as: "clientDetails",
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "erp-drawing-grids",
          localField: "items.grid_id",
          foreignField: "_id",
          as: "gridDetails",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "prepared_by",
          foreignField: "_id",
          as: "prepared_by",
          pipeline: [{ $project: { user_name: 1 } }]
        }
      },
      {
        $addFields: {
          drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
          gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
          prepared_by: { $arrayElemAt: ["$prepared_by", 0] },
          projectDetails: { $arrayElemAt: ["$drawingDetails.projectDetails", 0] },
          clientDetails: { $arrayElemAt: ["$drawingDetails.projectDetails.clientDetails", 0] },
        },
      },
      {
        $project: {
          batch_id: 1,
          client: "$clientDetails.name",
          project_name: "$projectDetails.name",
          project_id: "$projectDetails._id",
          wo_no: "$projectDetails.work_order_no",
          project_po_no: "$projectDetails.work_order_no",
          report_no: 1,
          createdAt: 1,
          prepared_by: "$prepared_by",
          release_date: 1,
          items: {
            _id: "$items._id",
            main_id: "$_id",
            drawing_no: "$drawingDetails.drawing_no",
            drawing_id: "$drawingDetails._id",
            rev: "$drawingDetails.rev",
            sheet_no: "$drawingDetails.sheet_no",
            unit_area: "$drawingDetails.unit",
            assembly_no: "$drawingDetails.assembly_no",
            assembly_quantity: "$drawingDetails.assembly_quantity",
            release_date: "$release_date",
            grid_no: "$gridDetails.grid_no",
            grid_id: "$gridDetails._id",
            grid_qty: "$gridDetails.grid_qty",
            is_grid_qty: "$items.is_grid_qty",
            moved_next_step: "$items.moved_next_step",
            dispatch_report: "$items.dispatch_report",
            fd_report: "$items.fd_report",
            mio_paint_report: "$items.mio_report",
            surface_primer_report: "$items.surface_report",
            final_coat_paint_report: "$items.final_coat_report",
          }
        }
      },
      // { $match: matchObj },
    ];

    //  Search Filter
    if (search?.trim()) {
      const regex = new RegExp(search.trim(), "i"); // case-insensitive
      pipeline.push({
        $match: {
          $or: [
            { report_no: regex },
            { "items.assembly_no": regex }
          ]
        }
      });
    }


    //  Group by batch + project + report
    pipeline.push(
      {
        $group: {
          _id: {
            batch_id: "$batch_id",
            project_name: "$project_name",
            project_id: "$project_id",
            wo_no: "$wo_no",
            project_po_no: "$project_po_no",
            client: "$client",
            report_no: "$report_no",
            release_date: "$release_date",
            prepared_by: "$prepared_by",
          },
          items: { $push: "$items" },
        },
      },
      {
        $project: {
          _id: 0,
          batch_id: "$_id.batch_id",
          client: "$_id.client",
          project_name: "$_id.project_name",
          project_id: "$_id.project_id",
          wo_no: "$_id.wo_no",
          project_po_no: "$_id.project_po_no",
          report_no: "$_id.report_no",
          release_date: "$_id.release_date",
          prepared_name: "$_id.prepared_by.user_name",
          prepared_id: "$_id.prepared_by._id",
          items: 1,
        },
      },
      { $sort: { report_no: -1 } }
    );

    //  Count pipeline for total
    const countPipeline = [...pipeline, { $count: "total" }];
    const totalCountResult = await MultiReleaseNote.aggregate(countPipeline);
    const total = totalCountResult[0]?.total || 0;

    //  Apply pagination only if limit is valid
    const limitInt = parseInt(limit);
    const pageInt = parseInt(page);
    if (limitInt && limitInt > 0) {
      pipeline.push({ $skip: (pageInt - 1) * limitInt }, { $limit: limitInt });
    }

    const result = await MultiReleaseNote.aggregate(pipeline);

    return {
      status: 1,
      result,
      pagination: {
        total,
        page: pageInt || 1,
        limit: limitInt || total,
        totalPages: limitInt ? Math.ceil(total / limitInt) : 1
      }
    };

  } catch (error) {
    return { status: 2, result: error };
  }
};

// const generateReleaseNoteList = async (project_id, batch_id, page, limit, search) => {
//     try {
//         const matchObj = { project_id: new ObjectId(project_id) };
//         if (batch_id) matchObj.batch_id = new ObjectId(batch_id);

//         const pipeline = [
//             {
//                 $match: {
//                     deleted: false,
//                     is_generate: true,
//                 }
//             },
//             { $unwind: "$items" },
//             {
//                 $lookup: {
//                     from: "erp-planner-drawings",
//                     localField: "items.drawing_id",
//                     foreignField: "_id",
//                     as: "drawingDetails",
//                     pipeline: [
//                         {
//                             $lookup: {
//                                 from: "bussiness-projects",
//                                 localField: "project",
//                                 foreignField: "_id",
//                                 as: "projectDetails",
//                                 pipeline: [
//                                     {
//                                         $lookup: {
//                                             from: "store-parties",
//                                             localField: "party",
//                                             foreignField: "_id",
//                                             as: "clientDetails",
//                                         },
//                                     },
//                                 ],
//                             },
//                         },
//                     ],
//                 },
//             },
//             {
//                 $lookup: {
//                     from: "erp-drawing-grids",
//                     localField: "items.grid_id",
//                     foreignField: "_id",
//                     as: "gridDetails",
//                 },
//             },
//             {
//                 $lookup: {
//                     from: "users",
//                     localField: "prepared_by",
//                     foreignField: "_id",
//                     as: "prepared_by",
//                     pipeline: [{ $project: { user_name: 1 } }]
//                 }
//             },
//             {
//                 $addFields: {
//                     drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
//                     gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
//                     prepared_by: { $arrayElemAt: ["$prepared_by", 0] },
//                     projectDetails: { $arrayElemAt: ["$drawingDetails.projectDetails", 0] },
//                     clientDetails: { $arrayElemAt: ["$drawingDetails.projectDetails.clientDetails", 0] },
//                 },
//             },
//             {
//                 $project: {
//                     batch_id: 1,
//                     client: "$clientDetails.name",
//                     project_name: "$projectDetails.name",
//                     project_id: "$projectDetails._id",
//                     wo_no: "$projectDetails.work_order_no",
//                     project_po_no: "$projectDetails.work_order_no",
//                     report_no: "$report_no",
//                     createdAt: 1,
//                     prepared_by: "$prepared_by",
//                     release_date: "$release_date",
//                     items: {
//                         _id: "$items._id",
//                         main_id: "$_id",
//                         drawing_no: "$drawingDetails.drawing_no",
//                         drawing_id: "$drawingDetails._id",
//                         rev: "$drawingDetails.rev",
//                         sheet_no: "$drawingDetails.sheet_no",
//                         unit_area: "$drawingDetails.unit",
//                         assembly_no: "$drawingDetails.assembly_no",
//                         assembly_quantity: "$drawingDetails.assembly_quantity",
//                         release_date: "$release_date",
//                         grid_no: "$gridDetails.grid_no",
//                         grid_id: "$gridDetails._id",
//                         grid_qty: "$gridDetails.grid_qty",
//                         is_grid_qty: "$items.is_grid_qty",
//                         moved_next_step: "$items.moved_next_step",
//                         dispatch_report: "$items.dispatch_report",
//                         fd_report: "$items.fd_report",
//                         mio_paint_report: "$items.mio_report",
//                         surface_primer_report: "$items.surface_report",
//                         final_coat_paint_report: "$items.final_coat_report",
//                     }
//                 }
//             },
//             { $match: matchObj }
//         ];

//         //  Search Filter (regex, case-insensitive)
//         const searchFilters = {};

//         // if (report_no?.trim()) {
//         //     searchFilters.report_no = { $regex: report_no.trim(), $options: "i" };
//         // }
//         // if (assembly_no?.trim()) {
//         //     searchFilters["items.assembly_no"] = { $regex: assembly_no.trim(), $options: "i" };
//         // }
//         // if (Object.keys(searchFilters).length > 0) {
//         //     pipeline.push({ $match: searchFilters });
//         // }

//         pipeline.push(
//             {
//                 $group: {
//                     _id: {
//                         batch_id: "$batch_id",
//                         project_name: "$project_name",
//                         project_id: "$project_id",
//                         wo_no: "$wo_no",
//                         project_po_no: "$project_po_no",
//                         client: "$client",
//                         report_no: "$report_no",
//                         release_date: "$release_date",
//                         prepared_by: "$prepared_by",
//                     },
//                     items: { $push: "$items" },
//                 },
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     batch_id: "$_id.batch_id",
//                     client: "$_id.client",
//                     project_name: "$_id.project_name",
//                     project_id: "$_id.project_id",
//                     wo_no: "$_id.wo_no",
//                     project_po_no: "$_id.project_po_no",
//                     report_no: "$_id.report_no",
//                     release_date: "$_id.release_date",
//                     prepared_name: "$_id.prepared_by.user_name",
//                     prepared_id: "$_id.prepared_by._id",
//                     items: 1,
//                 },
//             },
//             { $sort: { report_no: -1 } }
//         );

//         //  Count pipeline for total
//         const countPipeline = [...pipeline, { $count: "total" }];
//         const totalCountResult = await MultiReleaseNote.aggregate(countPipeline);
//         const total = totalCountResult[0]?.total || 0;

//         //  Apply pagination only if limit is valid
//         const limitInt = parseInt(limit);
//         const pageInt = parseInt(page);
//         if (limitInt && limitInt > 0) {
//             pipeline.push({ $skip: (pageInt - 1) * limitInt }, { $limit: limitInt });
//         }

//         const result = await MultiReleaseNote.aggregate(pipeline);

//         return {
//             status: 1,
//             result,
//             pagination: {
//                 total,
//                 page: pageInt || 1,
//                 limit: limitInt || total,
//                 totalPages: limitInt ? Math.ceil(total / limitInt) : 1
//             }
//         };

//     } catch (error) {
//         return { status: 2, result: error };
//     }
// }

exports.MultiGenerateReleaseNoteList = async (req, res) => {
  const { project_id, batch_id } = req.body;
  const { page, limit, search } = req.query;

  if (req.user && !req.error) {
    try {
      const data = await generateReleaseNoteList(project_id, batch_id, page, limit, search);

      if (data.status === 1) {
        sendResponse(res, 200, true, {
          data: data.result,
          pagination: data.pagination
        }, "Release Note list fetched successfully");
      } else if (data.status === 0) {
        sendResponse(res, 200, false, [], "No Release Note found");
      } else {
        sendResponse(res, 500, false, [], "Something went wrong");
      }
    } catch (error) {
      console.log("error", error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
}


exports.downloadGenerateInspect = async (req, res) => {
  const { project_id, batch_id } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await generateReleaseNoteList(project_id, batch_id);
      let requestData = data.result[0];


      if (data.status === 1) {
        let headerInfo = {
          client: requestData?.client,
          project_name: requestData?.project_name,
          wo_no: requestData?.wo_no,
          report_no: requestData?.report_no,
          release_date: requestData?.release_date,
        };
        const template = fs.readFileSync(
          "templates/MultiReleaseNote.html",
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

        const pdfBuffer = await generatePDFA4WithoutPrintDate(page, {
          print_date: true,
        });

        await browser.close();

        const pdfsDir = path.join(__dirname, "../../../../pdfs");
        if (!fs.existsSync(pdfsDir)) {
          fs.mkdirSync(pdfsDir);
        }

        const filename = `release_note_${Date.now()}.pdf`;
        const filePath = path.join(__dirname, "../../../../pdfs", filename);

        fs.writeFileSync(filePath, pdfBuffer);

        const fileUrl = `${URI}/pdfs/${filename}`;

        sendResponse(res, 200, true, { file: fileUrl }, "PDF downloaded Successfully");
      } else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Release Note data not found`);
      } else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong1111");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
}




