const WpsMaster = require('../../models/store/wps.master.model');
const { sendResponse } = require('../../helper/response');
const XLSX = require('xlsx');
const path = require('path');

exports.getWpsMaster = async (req, res) => {
    if (req.user && !req.error) {
        let status = req.query.status;
        let project = req.query.project;
        let query = { deleted: false };
        if (status) {
            query.status = status;
        }
        if (project) {
            query.project = project;
        }
        try {
            const wpsData = await WpsMaster.find(query, { deleted: 0, __v: 0 })
                .populate('jointType.jointId', 'name')
                .sort({ createdAt: -1 })
                .lean();
            if (wpsData) {
                sendResponse(res, 200, true, wpsData, "WPS master list");
            } else {
                sendResponse(res, 400, false, [], "WPS master not found");
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.manageWpsMaster = async (req, res) => {
    const { jointType, wpsNo, weldingProcess, pdf, status, id, project } = req.body;
    if (req.user) {
        if (wpsNo && weldingProcess && pdf) {

            const duplicate = await WpsMaster.findOne({ wpsNo, weldingProcess, project }).lean();
            if (duplicate && (!id || (id && duplicate._id.toString() !== id))) {
                return sendResponse(res, 400, false, {}, "Duplicate data found");
            }
            const jointData = jointType && JSON.parse(jointType);

            const wpsMaster = new WpsMaster({
                jointType: jointData,
                wpsNo: wpsNo,
                weldingProcess: weldingProcess,
                pdf: pdf,
                project: project,
            });

            if (!id) {
                try {
                    await wpsMaster.save(wpsMaster).then(data => {
                        sendResponse(res, 200, true, {}, "WPS master added successfully")
                    }).catch(error => {
                        sendResponse(res, 400, false, {}, "WPS master already exists");
                    })
                } catch (error) {
                    sendResponse(res, 500, false, {}, "Something went wrong");
                }
            } else {
                await WpsMaster.findByIdAndUpdate(id, {
                    jointType: jointData,
                    wpsNo: wpsNo,
                    weldingProcess: weldingProcess,
                    pdf: pdf,
                    project: project,
                    status: status,
                }).then(data => {
                    if (data) {
                        sendResponse(res, 200, true, {}, "WPS master updated successfully")
                    } else {
                        sendResponse(res, 404, false, {}, "WPS master not found")
                    }
                })
            }
        } else {
            sendResponse(res, 400, false, {}, "Missing parameters");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
}

exports.deleteWpsMaster = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            const wpsMaster = await WpsMaster.findByIdAndUpdate(id, { deleted: true })
            if (wpsMaster) {
                sendResponse(res, 200, true, {}, "Wps master deleted successfully")
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.downloadWpsMaster = async (req, res) => {
    if (req.user && !req.error) {
        try {
            const wpsData = await WpsMaster.find({ deleted: false })
                .populate('jointType.jointId', 'name')
                .lean();

            const excelData = wpsData.map((item, index) => ({
                'Sr.': index + 1,
                'WPS No': item.wpsNo || '',
                'Welding Process': item.weldingProcess || '',
                'PDF File': item.pdf || '',
                'Joint Types': item.jointType.map(joint => joint.jointId?.name || '').join(', '),
            }));

            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(excelData);

            worksheet['!cols'] = [
                { wch: 5 },
                { wch: 25 },
                { wch: 20 },
                { wch: 65 },
                { wch: 50 },
            ];

            XLSX.utils.book_append_sheet(workbook, worksheet, 'WPS Master');

            const fileName = `WpsMaster_${Date.now()}.xlsx`;
            const filePath = path.join(__dirname, '../../xlsx', fileName);
            XLSX.writeFile(workbook, filePath);
            const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
            const fileUrl = `${protocol}://${req.get('host')}/xlsx/${fileName}`;

            sendResponse(res, 200, true, { file: fileUrl }, 'WPS Master file generated successfully');
        } catch (error) {
            console.error('Error generating XLSX file:', error);
            sendResponse(res, 500, false, {}, 'Error generating XLSX file');
        }
    } else {
        sendResponse(res, 401, false, {}, 'Unauthorized');
    }
};