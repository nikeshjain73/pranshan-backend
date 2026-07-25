const ProcedureAndSpecification = require("../../../models/erp/ProcedureAndSpecification/procedure_specification.model");
const { sendResponse } = require("../../../helper/response");
const XLSX = require('xlsx');
const path = require('path');


exports.getProcedureAndSpecification = async (req, res) => {
    if (req.user && !req.error) {
        try {
            let status = req.query.status;
            let project = req.query.project;
            let query = { deleted: false };
            // if (status) {
            //     query.status = status;
            // }
            if (project) {
                query.project = project;
            }
            let data = await ProcedureAndSpecification.find(query, { deleted: 0, __v: 0 })
                .sort({ createdAt: -1 })
                .lean();
            if (data) {
                sendResponse(res, 200, true, data, "Procedure-and-specification data found successfully");
            } else {
                sendResponse(res, 400, false, data, "Procedure-and-specification data not found");
            }
        } catch (err) {
            console.log('err', err)
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.manageProcedureAndSpecification = async (req, res) => {
    const {
        id,
        client_doc_no,
        vendor_doc_no,
        ducument_no,
        project,
        issue_no, status, pdf } = req.body;
    if (req.user && !req.error) {

        try {
            const lastPaint = await ProcedureAndSpecification.findOne({ deleted: false }, {}, { sort: { 'client_doc_no': -1 } });
            let newDocNo = '1';

            if (lastPaint && lastPaint.voucher_no) {
                const parts = lastPaint.voucher_no.split('/');
                newDocNo = parseInt(parts[parts.length - 1]) + 1;
            }

            const newVoucherNo = 'PRS/' + newDocNo;

            if (id) {
                await ProcedureAndSpecification.findOneAndUpdate({ _id: id }, {
                    client_doc_no: client_doc_no,
                    vendor_doc_no: vendor_doc_no,
                    ducument_no: ducument_no,
                    issue_no: issue_no,
                    project: project,
                    pdf: pdf,
                    status: status
                });
                return sendResponse(res, 200, true, {}, "ProcedureAndSpecification updated successfully");

            } else {
                if (client_doc_no && vendor_doc_no && ducument_no && issue_no) {
                    let data = await ProcedureAndSpecification.create({
                        voucher_no: newVoucherNo,
                        client_doc_no: client_doc_no,
                        vendor_doc_no: vendor_doc_no,
                        ducument_no: ducument_no,
                        issue_no: issue_no,
                        project: project,
                        pdf: pdf,
                        status: status,
                    });
                    return sendResponse(res, 200, true, {}, "ProcedureAndSpecification created successfully");
                } else {
                    return sendResponse(res, 400, false, {}, "Missing parameters");
                }
            }
        } catch (err) {
            console.log('err', err);
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
};


exports.deleteProcedureAndSpecification = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {
            await ProcedureAndSpecification.findByIdAndUpdate(id, { deleted: true }).then((data) => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Procedure & s+ pecification deleted successfully");
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

exports.downloadProcedureAndSpecification = async (req, res) => {
    if (req.user && !req.error) {
        try {

            const procedureData = await ProcedureAndSpecification.find({ deleted: false })
                .sort({ createdAt: -1 })
                .lean();

            const xlsxData = procedureData?.map((elem, index) => ({
                'Sr.': index + 1,
                'Client Doc No.': elem.client_doc_no,
                'Vendor Doc No.': elem.vendor_doc_no,
                'Document No': elem.ducument_no,
                'Issue No': elem.issue_no,
                'PDF': elem.pdf,
            }));

            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(xlsxData);

            worksheet['!cols'] = [
                { wch: 5 }, // sr.
                { wch: 25 }, // Client Doc
                { wch: 20 }, // Vendor
                { wch: 15 }, // Document
                { wch: 15 }, // PDF
                { wch: 65 }, // PDF
            ];

            XLSX.utils.book_append_sheet(workbook, worksheet, 'Procedure');

            const fileName = `Procedure_${Date.now()}.xlsx`;
            const filePath = path.join(__dirname, '../../../xlsx', fileName);
            XLSX.writeFile(workbook, filePath);
            const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
            const fileUrl = `${protocol}://${req.get('host')}/xlsx/${fileName}`;

            sendResponse(res, 200, true, { file: fileUrl }, 'Procedure & Specification Master file generated successfully');
        } catch (error) {
            console.log(error, 'ssss')
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }

}
