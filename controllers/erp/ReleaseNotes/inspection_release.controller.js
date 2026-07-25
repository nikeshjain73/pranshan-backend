const IRNModel = require('../../../models/erp/ReleaseNote/inspection_release.model');
const { sendResponse } = require('../../../helper/response');

exports.getInspectionReleaseNote = async (req, res) => {
    if (req.user && !req.error) {
        try {
            await IRNModel.find({ deleted: false })
                .populate({
                    path: 'drawing_id', 
                    select: 'drawing_no rev sheet_no assembly_no project',
                    populate: {
                        path: 'project',
                        select: 'name'
                    }
                })
                .populate('prepared_by', 'user_name')
                .populate('inspection_summary_id', 'report_no')
                .populate('surafce_primer_report_id', 'voucher_no_two')
                .populate('mio_paint_report_id', 'voucher_no_two')
                .populate('final_coat_paint_report_id', 'voucher_no_two')
                .then(result => {
                    return result !== null ? sendResponse(res, 200, true, result, 'Release Notes fetched successfully') : sendResponse(res, 200, false, result, 'Not found');
                }).catch(err => {
                    console.log(err.message);
                    sendResponse(res, 500, false, {}, 'Something went wrong');
                });
        } catch (err) {
            sendResponse(res, 500, false, {}, 'Something went wrong');
            return;
        }
    } else {
        sendResponse(res, 401, false, {}, 'Unauthorized');
    }
}
