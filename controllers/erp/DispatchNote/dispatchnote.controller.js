const DispatchNoteModal = require('../../../models/erp/DispatchNote/dispatchnote.model');
const { sendResponse } = require('../../../helper/response');
const { TitleFormat } = require('../../../utils/enum');

exports.manageDispatchNote = async (req, res) => {
    const { id, drawing_id, dispatch_site, qty, paint_system,  prepared_by, remarks,project } = req.body;

    if(req.user &&!req.error){
        if(drawing_id && dispatch_site && qty && paint_system &&  prepared_by){
            try {
                const lastLotNo = await DispatchNoteModal.findOne({ deleted: false }, { deleted: 0 }, { sort: { createdAt: -1 } });
                let DispLotNo = "1";
                if (lastLotNo && lastLotNo.lot_no) {
                    const split = lastLotNo.lot_no.split('/');
                    DispLotNo = parseInt(split[split.length - 1]) + 1;
                }
                const gen_lot_no = TitleFormat.DISPATCHLOTNO.replace('/PROJECT/', `/${project}/`) + DispLotNo;

                if(!id){
                    const newDispatchNoteObj = new DispatchNoteModal({
                        lot_no: gen_lot_no,
                        drawing_id: drawing_id,
                        dispatch_site: dispatch_site,
                        qty: qty,
                        paint_system: paint_system,
                        prepared_by:  prepared_by,
                        remarks: remarks
                    });

                    await newDispatchNoteObj.save().then(result => {
                        sendResponse(res, 200, true, result, 'Dispatch Note added successfully');
                    }).catch(err => {
                        console.log(err.message);
                        sendResponse(res, 500, false, {}, 'Something went wrong');
                    });
                    
                } else {
                    await DispatchNoteModal.findByIdAndUpdate(id, {
                        dispatch_site: dispatch_site,
                        qty: qty,
                        paint_system: paint_system,
                        prepared_by:  prepared_by,
                        remarks: remarks
                    }).then(result => {
                        sendResponse(res, 200, true, result, 'Dispatch Note updated successfully');
                    }).catch(err => {
                        console.log(err.message);
                        sendResponse(res, 500, false, {}, 'Something went wrong ');
                    });
                }
            } catch (err) {
                sendResponse(res, 500, false, {}, 'Something went wrong');
                return;
            }
        } else {
            sendResponse(res, 400, false, {}, 'Missing parameters');
            return;
        }
    } else {
        sendResponse(res, 401, false, {}, 'Unauthorized');
    }
}


exports.getDispatchNotes = async (req, res) => {
    if(req.user &&!req.error){
        try {
            await DispatchNoteModal.find({ deleted: false })
            .populate('drawing_id', 'drawing_no rev sheet_no')
            .populate('prepared_by', 'user_name')
            .populate('paint_system', 'paint_system_no voucher_no')
            .then(dispatchNotes => {
                sendResponse(res, 200, true, dispatchNotes, 'Dispatch Notes fetched successfully');
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