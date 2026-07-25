const PackingModel = require('../../../models/erp/Packing/packing.model');
const { sendResponse } = require('../../../helper/response');
const transaction_itemModel = require('../../../models/store/transaction_item.model');
const { TitleFormat } = require('../../../utils/enum');

exports.managePacking = async (req, res) => {
    const { id, drawing_id, consignment_no, release_note_id, destination, vehicle_no, driver_name, gst_no, e_way_bill_no, remarks, packed_by, project } = req.body;

    if (req.user && !req.error) {
        if (drawing_id && consignment_no && release_note_id && destination && vehicle_no && driver_name) {
            try {
                let lastPacking = await PackingModel.findOne({ deleted: false, voucher_no: { $regex: `/${project}/` } }, { deleted: 0 }).sort({ createdAt: -1 });
                let packNo = "1";

                if (lastPacking && lastPacking?.voucher_no) {
                    const split = lastPacking.voucher_no.split('/');
                    const lastPackingNo = parseInt(split[split.length - 1]);
                    packNo = lastPackingNo + 1;
                }

                const gen_voucher_no = TitleFormat.PACKINGNO.replace('/PROJECT/', `/${project}/`) + packNo;
                if (!id) {
                    const object = new PackingModel({
                        voucher_no: gen_voucher_no,
                        drawing_id,
                        release_note_id,
                        consignment_no,
                        destination,
                        vehicle_no,
                        driver_name,
                        gst_no,
                        e_way_bill_no,
                        remarks,
                        packed_by
                    });

                    await object.save();
                    sendResponse(res, 200, true, {}, 'Packing added successfully');
                } else {
                    await PackingModel.findByIdAndUpdate(id, {
                        drawing_id,
                        consignment_no,
                        destination,
                        vehicle_no,
                        release_note_id,
                        driver_name,
                        gst_no,
                        e_way_bill_no,
                        remarks,
                        packed_by
                    }, { new: true }).then(() => {
                        sendResponse(res, 200, true, {}, 'Packing updated successfully');
                    });
                }
            } catch (e) {
                console.error(e);
                sendResponse(res, 500, false, {}, 'Internal server error');
                return;
            }
        } else {
            sendResponse(res, 400, false, {}, 'Missing parameter');
            return;
        }
    } else {
        sendResponse(res, 401, false, {}, 'Unauthorized');
    }
}

exports.getPackings = async (req, res) => {
    if (req.user && !req.error) {
        try {
            const packings = await PackingModel.find({ deleted: false }, { deleted: 0, createdAt: 0, updatedAt: 0, __v: 0 })
                .populate({
                    path: 'drawing_id',
                    select: 'drawing_no rev sheet_no assembly_no project',
                    populate: {
                        path: 'project',
                        select: 'name'
                    }
                })
                .populate('packed_by', 'user_name')
                .populate('release_note_id', 'report_no');

            const updatedPackings = await Promise.all(packings.map(async (element) => {
                let packingObj = element.toObject();

                if (packingObj.drawing_id) {
                    try {
                        const drawingItems = await transaction_itemModel.find({
                            drawingId: packingObj.drawing_id._id,
                            deleted: false
                        }, {
                            deleted: 0,
                            createdAt: 0,
                            updatedAt: 0,
                            status: 0,
                            __v: 0
                        })
                            .populate('itemName', 'name');

                        packingObj.drawing_id.items = drawingItems.length > 0 ? drawingItems : [];
                    } catch (err) {
                        console.error('Error fetching drawing items:', err);
                        packingObj.drawing_id.items = [];
                    }
                } else {
                    packingObj.drawing_id = { items: [] };
                }

                return packingObj;
            }));

            sendResponse(res, 200, true, updatedPackings.length > 0 ? updatedPackings : [], 'Packings retrieved successfully');
        } catch (e) {
            console.error(e);
            sendResponse(res, 500, false, {}, 'Internal server error');
        }
    } else {
        sendResponse(res, 401, false, {}, 'Unauthorized');
    }
};

