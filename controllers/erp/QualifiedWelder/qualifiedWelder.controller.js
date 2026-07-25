const QualifiedWelder = require("../../../models/erp/QualifiedWelder/qualified_welder.model");
const { sendResponse } = require("../../../helper/response");
const XLSX = require('xlsx');
const path = require('path');

exports.getQualifiedWelder = async (req, res) => {
    if (req.user && !req.error) {
        let status = req.query.status;
        let project = req.query.project;
        let query = { deleted: false }
        if (status) {
            query.status = status
        }
        if (project) {
            query.project = project;
        }
        try {
            const data = await QualifiedWelder.find(query, { deleted: 0, __v: 0 })
                .populate({
                    path: 'wpsNo',
                    select: 'jointType wpsNo weldingProcess',
                    populate: {
                        path: 'jointType.jointId',
                        select: 'name'
                    }
                })
                .populate('jointType.jointId', 'name')
                .sort({ createdAt: -1 }).lean()
            if (data) {
                console.log("data found",data);
                sendResponse(res, 200, true, data, "QalifiedWelder data found successfully");
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

exports.manageQualifiedWelderList = async (req, res) => {
    const {
        id,
        wpsNo,
        welderNo,
        due_date,
        thickness,
        position,
        name,
        pdf,
        jointType,
        project,
        status,
    } = req.body;
    if (req.user && !req.error) {
        try {
            if (wpsNo && welderNo) {
                const jointData = jointType && JSON.parse(jointType);
                if (!id) {
                    await QualifiedWelder.create({
                        wpsNo: wpsNo,
                        welderNo: welderNo,
                        due_date: due_date,
                        thickness: thickness,
                        position: position,
                        name: name,
                        pdf: pdf,
                        jointType: jointData,
                        status: status,
                        project: project,
                    }).then((data) => {
                        if (data) {
                            sendResponse(res, 200, true, {}, "QualifiedWelder added successfully");
                        }
                    }).catch((err) => {
                        sendResponse(res, 400, false, {}, "QualifiedWelder already exists");
                    });
                } else {
                    await QualifiedWelder.findOneAndUpdate({ _id: id }, {
                        wpsNo: wpsNo,
                        welderNo: welderNo,
                        wpsNo: wpsNo,
                        due_date: due_date,
                        thickness: thickness,
                        position: position,
                        name: name,
                        pdf: pdf,
                        status: status,
                        jointType: jointData,
                        is_epxpired: false,
                        project: project
                    }).then((data) => {
                        if (data) {
                            sendResponse(res, 200, true, {}, "QualifiedWelder updated successfully");
                        } else {
                            sendResponse(res, 404, true, {}, "QualifiedWelder not found");
                        }
                    })
                }
            } else {
                return sendResponse(res, 400, false, {}, "Missing parameters");
            }
        } catch (err) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.deleteQualifiedWelder = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            await QualifiedWelder.findByIdAndUpdate(id, { deleted: true }).then(
                (data) => {
                    if (data) {
                        sendResponse(res, 200, true, {}, "QualifiedWelder deleted successfully");
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

exports.expireWelder = async () => {
    try {
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        const result = await QualifiedWelder.updateMany(
            {
                due_date: { $lt: currentDate },
                is_epxpired: false
            },
            {
                $set: { is_epxpired: true }
            }
        );
        console.log(`${result.modifiedCount} welders updated to expired.`);
    } catch (error) {
        console.error("Error updating expired welders: ", error);
    }
}

exports.downloadWelderXlsx = async (req, res) => {
    if (req.user && !req.error) {
        try {
            const welderData = await QualifiedWelder.find({ deleted: false })
                .populate({
                    path: 'wpsNo',
                    select: 'jointType wpsNo weldingProcess',
                    populate: {
                        path: 'jointType.jointId',
                        select: 'name'
                    }
                })
                .populate('jointType', 'name')
                .sort({ createdAt: -1 }).lean()


            const xlsxData = welderData?.map((elem, index) => ({
                'Sr.': index + 1,
                'Welder No': elem.welderNo,
                'Name': elem.name,
                'Position': elem.position,
                'Thickness': elem.thickness,
                'Due Date': elem.due_date,
                'Joint Type': elem.wpsNo.jointType.map((e) => e.jointId.name).toString(),
                'WPS No': elem.wpsNo.wpsNo,
                'Welding Type': elem.wpsNo.weldingProcess,
                'Expire': elem.is_epxpired,
                'WPQ PDF': elem.pdf
            }));

            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(xlsxData);

            worksheet['!cols'] = [
                { wch: 5 }, // sr
                { wch: 15 }, // welder
                { wch: 20 }, // name
                { wch: 20 }, // position
                { wch: 20 }, // thickness
                { wch: 12 }, // due date
                { wch: 25 }, // joint type
                { wch: 15 }, // wps no
                { wch: 15 }, // Welding Process Type
                { wch: 10 }, // is_epxpired
                { wch: 65 }, // pdf
            ];

            XLSX.utils.book_append_sheet(workbook, worksheet, 'Qualified Welder Master');

            const fileName = `Welder_${Date.now()}.xlsx`;
            const filePath = path.join(__dirname, '../../../xlsx', fileName);
            XLSX.writeFile(workbook, filePath);
            const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
            const fileUrl = `${protocol}://${req.get('host')}/xlsx/${fileName}`;

            sendResponse(res, 200, true, { file: fileUrl }, 'Qualified Welder Master file generated successfully');
        } catch (err) {
            sendResponse(res, 500, false, err, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}