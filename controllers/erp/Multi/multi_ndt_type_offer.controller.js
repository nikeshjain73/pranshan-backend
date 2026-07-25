const NDTOffer = require('../../../models/erp/Multi/multi_ndt_offer.model');
const NDTMaster = require('../../../models/erp/Multi/multi_ndt_detail.model');
const ndtModel = require("../../../models/erp/NDT/ndt.model");
const { sendResponse } = require("../../../helper/response");
const { TitleFormat, NDTStatus } = require('../../../utils/enum');

exports.getNDTTypeOffer = async (req, res) => {
    const { status, type, project } = req.query;

    if (req.user && !req.error) {
        try {
            const query = { deleted: false };
            if (status) {
                query.status = status;

            }
            if (type) {
                query.ndt_type_id = type;
            }

            let offer = await NDTOffer.find(query, { deleted: 0, __v: 0 })
                .populate({
                    path: 'ndt_master_id',
                    select: 'report_no weld_visual_id',
                    populate: [{
                        path: 'weld_visual_id',
                        select: 'report_no',
                    }]
                }).populate({
                    path: 'ndt_master_ids',
                    select: 'report_no weld_visual_id',
                    populate: [{
                        path: 'weld_visual_id',
                        select: 'report_no',
                    }]
                }).populate({
                    path: "items",
                    select: "grid_item_id",
                    populate: [
                        {
                            path: "grid_item_id",
                            select: "item_name drawing_id item_no item_qty grid_id",
                            populate: [
                                { path: "item_name", select: "name" },
                                { path: "grid_id", select: "grid_no grid_qty" },
                                {
                                    path: "drawing_id",
                                    select: "drawing_no sheet_no rev assembly_no project unit",
                                    populate: {
                                        path: "project",
                                        select: "name party work_order_no",
                                        populate: { path: "party", select: "name" },
                                    },
                                },
                            ],
                        },
                        {
                            path: "ndt_master_id",
                            select: "id report_no",
                        },
                        {
                            path: "joint_type",
                            select: "name joint_type",
                        },
                        {
                            path: "weldor_no",
                            select: "name welderNo",
                        },
                        {
                            path: "wps_no",
                            select: "name wpsNo weldingProcess",
                        },
                    ]
                })
                .populate('ndt_type_id', 'name')
                .populate('offered_by', 'user_name')
                .sort({ createdAt: -1 });
            if (!offer) {
                sendResponse(res, 404, false, {}, 'NDT type Offer not found');
                return;
            } else {
                if (project) {
                    offer = offer.filter(item =>
                        item.items.some(i =>
                            i.grid_item_id?.drawing_id?.project?._id?.toString() === project?.toString()
                        )
                    );
                }
                sendResponse(res, 200, true, offer, 'NDT type Offer found successfully');
                return;
            }

        } catch (error) {
            sendResponse(res, 500, false, {}, 'Something went wrong');
        }
    } else {
        sendResponse(res, 401, false, {}, 'Unauthorized');
        return;
    }
}

exports.manageNDTTypeOffer = async (req, res) => {
    const { id, items, offeredBy, project, type } = req.body;

    if (req.user && !req.error) {
        if (project && items && offeredBy) {
            try {
                let newItems = JSON.parse(items) || [];
                let testElement = await ndtModel.findOne({ name: type });
                let lastOffer = await NDTOffer.findOne(
                    {
                        deleted: false,
                        ndt_type_id: testElement?._id,
                        ndt_offer_no: { $exists: true, $ne: null, $regex: `/${project}/` },
                    },
                    { deleted: 0 },
                    { sort: { updatedAt: -1 } }
                );
                let offerNo = "1";
                if (lastOffer && lastOffer.ndt_offer_no) {
                    const split = lastOffer.ndt_offer_no.split('/');
                    const lastOfferNo = parseInt(split[split.length - 1]);
                    offerNo = lastOfferNo + 1;
                }

                let offerFormat = type + 'OFFERNO';
                const gen_ndt_offer = TitleFormat[offerFormat].replace('/PROJECT/', `/${project}/`) + offerNo;

                if (id) {
                    let updatedOffer = await NDTOffer.findByIdAndUpdate(id, {
                        ndt_offer_no: gen_ndt_offer,
                        items: newItems,
                        offered_by: offeredBy,
                        report_date: Date.now(),
                        status: NDTStatus.Offered, // send to QC for approval
                    }, { new: true });
                    if (!updatedOffer) {
                        sendResponse(res, 404, false, {}, 'NDT Type Offer not found');
                        return;
                    } else {
                        await NDTMaster.findByIdAndUpdate(updatedOffer.ndt_master_id, {
                            [type.toLowerCase() + "_status"]: NDTStatus.Offered,
                        });
                        sendResponse(res, 200, true, {}, 'NDT Type Offer updated successfully');
                        return;
                    }
                }
            } catch (error) {
                sendResponse(res, 500, false, {}, 'Something went wrong');
            }
        } else {
            sendResponse(res, 400, false, {}, 'Missing parameters');
            return;
        }
    } else {
        sendResponse(res, 401, false, {}, 'Unauthorized');
        return;
    }
}