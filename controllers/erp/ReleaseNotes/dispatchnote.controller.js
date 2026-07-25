const DispatchNoteModal = require('../../../models/erp/ReleaseNote/dispatchnote.model');
const { sendResponse } = require('../../../helper/response');
const { TitleFormat } = require('../../../utils/enum');
const ejs = require("ejs");
const fs = require("fs");
const puppeteer = require("puppeteer");
const path = require("path");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;

exports.manageDispatchNote = async (req, res) => {
    const { id, drawing_id, dispatch_site, qty, paint_system, prepared_by, remarks, project, grid_no } = req.body;

    if (req.user && !req.error) {
        if (drawing_id && dispatch_site && qty && paint_system && prepared_by) {
            try {
                const lastLotNo = await DispatchNoteModal.findOne({ deleted: false, lot_no: { $regex: `/${project}/` } }, { deleted: 0 }, { sort: { createdAt: -1 } });
                let DispLotNo = "1";
                if (lastLotNo && lastLotNo.lot_no) {
                    const split = lastLotNo.lot_no.split('/');
                    DispLotNo = parseInt(split[split.length - 1]) + 1;
                }
                const gen_lot_no = TitleFormat.DISPATCHLOTNO.replace('/PROJECT/', `/${project}/`) + DispLotNo;

                if (!id) {
                    const newDispatchNoteObj = new DispatchNoteModal({
                        lot_no: gen_lot_no,
                        drawing_id: drawing_id,
                        dispatch_site: dispatch_site,
                        qty: qty,
                        paint_system: paint_system,
                        grid_no: grid_no,
                        prepared_by: prepared_by,
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
                        prepared_by: prepared_by,
                        grid_no: grid_no,
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
    if (req.user && !req.error) {
        try {
            await DispatchNoteModal.find({ deleted: false })
                .populate({
                    path: 'drawing_id',
                    select: 'drawing_no rev sheet_no assembly_no project',
                    populate: {
                        path: 'project',
                        select: 'name'
                    }
                })
                .populate('prepared_by', 'user_name')
                .populate({
                    path: 'paint_system',
                    select: 'paint_system_no voucher_no surface_preparation profile_requirement salt_test paint_manufacturer prime_paint primer_app_method primer_dft_range mio_paint mio_app_method mio_dft_range final_paint final_paint_app_method final_paint_dft_range total_dft_requirement',
                    populate: {
                        path: 'paint_manufacturer',
                        select: 'name'
                    }
                })
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

exports.downloadOneDispatch = async (req, res) => {
    const { lot_no, print_date } = req.body;
    if (req.user && !req.error) {
        try {
            const requestData = await DispatchNoteModal.aggregate([
                { $match: { deleted: false, lot_no: lot_no } },
                {
                    $lookup: {
                        from: "erp-planner-drawings",
                        localField: "drawing_id",
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
                        projectDetails: {
                            $arrayElemAt: [
                                "$drawingDetails.projectDetails",
                                0,
                            ],
                        },
                    },
                },
                {
                    $addFields: {
                        partyDetails: {
                            $arrayElemAt: [
                                "$projectDetails.partyDetails",
                                0,
                            ],
                        },
                    },
                },
                {
                    $lookup: {
                        from: "painting-systems",
                        localField: "paint_system",
                        foreignField: "_id",
                        as: "paintDetails",
                    },
                },
                {
                    $addFields: {
                        paint_no: { $arrayElemAt: ["$paintDetails.paint_system_no", 0] },
                    },
                },
                {
                    $lookup: {
                        from: "store_transaction_items",
                        localField: "drawing_id",
                        foreignField: "drawingId",
                        as: "transItemDetails",
                    },
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "prepared_by",
                        foreignField: "_id",
                        as: "prepareDetails",
                    },
                },
                {
                    $addFields: {
                        prepared_name: { $arrayElemAt: ["$prepareDetails.user_name", 0] },
                    },
                },
                {
                    $project: {
                        transItemDetails: {
                            $map: {
                                input: "$transItemDetails",
                                as: "item",
                                in: {
                                    grid_no: "$$item.grid_no",
                                    assembly_weight: "$$item.assembly_weight",
                                    assembly_surface_area: "$$item.assembly_surface_area"
                                }
                            }
                        },
                        client: "$partyDetails.name",
                        lot_no: 1,
                        project_name: "$projectDetails.name",
                        dispatch_date: 1,
                        wo_no: "$projectDetails.work_order_no",
                        dispatch_site: 1,
                        drawing_no: "$drawingDetails.drawing_no",
                        rev: "$drawingDetails.rev",
                        assembly_no: "$drawingDetails.assembly_no",
                        qty: 1,
                        paint_no: "$paint_no",
                        prepared_name: "$prepared_name",
                        prepared_date: "$createdAt",
                        remarks: 1,
                        prepared_by: 1,
                    }
                }
            ]);

            // sendResponse(res, 200, true, requestData, "PDF downloaded Successfully");

            if (requestData && requestData.length > 0) {
                const template = fs.readFileSync(
                    "templates/dispatchNote.html",
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
                    width: "12in",
                    height: "15in",
                    // format: "A4",
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

                const filename = `dispatch_note_${Date.now()}.pdf`;
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
            } else {
                sendResponse(res, 200, false, {}, "PDF data not found");
            }
        } catch (error) {
            console.log("error", error);
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};