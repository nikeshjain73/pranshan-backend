const PaintingSystem = require("../../../models/erp/PaintingSystem/painting_system.model");
const { sendResponse } = require("../../../helper/response");
exports.getPaintingSystem = async (req, res) => {
  const { status, project } = req.query;
  if (req.user && !req.error) {
    try {
      let query = { deleted: false };
      if (status) {
        query.status = status;
      }
      if (project) {
        query.project = project;
      }
      let data = await PaintingSystem.find(query, { deleted: 0, __v: 0 })
        .populate('paint_manufacturer', 'name')
        .sort({ createdAt: -1 }).lean()
      if (data) {
        sendResponse(res, 200, true, data, "Painting-System data found successfully");
      } else {
        sendResponse(res, 400, false, data, "Painting-System data not found");
      }
    } catch (err) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};


exports.managePaintingSystem = async (req, res) => {
  const { id, paint_system_no, surface_preparation, profile_requirement, salt_test, paint_manufacturer, prime_paint, primer_app_method, primer_dft_range,
    mio_paint, mio_app_method, mio_dft_range, final_paint, final_paint_app_method, final_paint_dft_range, total_dft_requirement, status, project } = req.body;
  if (req.user && !req.error) {
    if (surface_preparation && profile_requirement && salt_test && paint_manufacturer && total_dft_requirement) {

      const lastPaint = await PaintingSystem.findOne({ deleted: false }, {}, { sort: { 'paint_system_no': -1 } });
      let newSystemNo = '1';

      if (lastPaint && lastPaint.voucher_no) {
        const parts = lastPaint.voucher_no.split('/');
        newSystemNo = parseInt(parts[parts.length - 1]) + 1;
      }

      const newPaintSystemNo = 'PS/' + newSystemNo;

      try {
        if (!id) {
          const newSystem = {
            voucher_no: newPaintSystemNo,
            paint_system_no: paint_system_no,
            surface_preparation, profile_requirement, salt_test, paint_manufacturer, prime_paint, primer_app_method, primer_dft_range,
            mio_paint, mio_app_method, mio_dft_range, final_paint, final_paint_app_method, final_paint_dft_range, total_dft_requirement, project
          };
          await PaintingSystem.create(newSystem).then(data => {
            if (data) {
              sendResponse(res, 200, true, {}, "Painting-System added successfully");
            }
          }).catch(err => {
            sendResponse(res, 400, false, {}, "Painting-System already exists");
          });
        } else {
          const result = await PaintingSystem.findOneAndUpdate({ _id: id }, {
            paint_system_no: paint_system_no,
            project,
            status, surface_preparation, profile_requirement, salt_test, paint_manufacturer, prime_paint, primer_app_method, primer_dft_range, mio_paint, mio_app_method, mio_dft_range, final_paint, final_paint_app_method, final_paint_dft_range, total_dft_requirement
          });

          if (result) {
            sendResponse(res, 200, true, {}, "Painting-System updated successfully");
          } else {
            sendResponse(res, 404, false, {}, "Painting-System not found");
          }
        }
      } catch (err) {
        console.log('err', err);
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } else {
      sendResponse(res, 400, false, {}, 'Missing parameter');
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.deletePaintingSystem = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error && id) {
    try {
      await PaintingSystem.findByIdAndUpdate(id, { deleted: true }).then(
        (data) => {
          if (data) {
            sendResponse(res, 200, true, {}, "PaintingSystem deleted successfully");
          }
        }
      );
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};
