const WorkDay = require('../../models/payroll/workDay.model');
const Department = require('../../models/payroll/department.model');
const Salary = require('../../models/payroll/salary.model');
const Firm = require('../../models/firm.model');
const Year = require('../../models/year.model');
const mongoose = require('mongoose');
const { sendResponse } = require('../../helper/response');
const salaryModel = require('../../models/payroll/salary.model');
const { Types: { ObjectId }, } = require("mongoose");

require('dotenv').config();

exports.getWorkDay = async (req, res) => {
    const { month, firm, year } = req.query;
    if (req.user && !req.error) {
        const query = { status: true, deleted: false };

        if (firm && firm !== 'null' && firm !== 'undefined') query.firm_id = firm;
        if (year && year !== 'null' && year !== 'undefined') query.year_id = year;
        if (month && month !== 'null' && month !== 'undefined') query.month = month;
        try {
            await WorkDay.find(query, { deleted: 0 })
                .populate({
                    path: 'department',
                    select: 'name group',
                    populate: {
                        path: 'group',
                        select: 'name'
                    }
                })
                .populate('firm_id', 'name')
                .populate('year_id', 'start_year end_year')

                .then(data => {
                    if (data) {
                        sendResponse(res, 200, true, data, "Working Day list")
                    } else {
                        sendResponse(res, 400, false, {}, "Working Day not found")
                    }
                })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.getAdminWorkDay = async (req, res) => {
    const { month, firm, year } = req.query;
    if (req.user && !req.error) {
        const query = { deleted: false };

        if (firm && firm !== 'null' && firm !== 'undefined') query.firm_id = firm;
        if (year && year !== 'null' && year !== 'undefined') query.year_id = year;
        if (month && month !== 'null' && month !== 'undefined') query.month = month;
        try {
            await WorkDay.find(query, { deleted: 0 })
                .populate({
                    path: 'department',
                    select: 'name group',
                    populate: {
                        path: 'group',
                        select: 'name'
                    }
                })
                .populate('firm_id', 'name')
                .populate('year_id', 'start_year end_year')
                .sort({ createdAt: 1 })

                .then(data => {
                    if (data) {
                        sendResponse(res, 200, true, data, "Working Day list")
                    } else {
                        sendResponse(res, 400, false, {}, "Working Day not found")
                    }
                })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.manageWorkDay = async (req, res) => {
    const {
        department,
        working_day,
        ot_hours,
        ot_count,
        pf,
        fpf,
        esi,
        lwf,
        month,
        firm_id,
        year_id,
        status,
        id
    } = req.body;

    if (req.user) {
        if (
            department &&
            working_day &&
            ot_hours &&
            ot_count &&
            month &&
            firm_id &&
            year_id
        ) {
            const departmentData = await Department.findById(department);
            const firmData = await Firm.findById(firm_id);
            const yearData = await Year.findById(year_id);

            const existingWork = await WorkDay.findOne({ department, month, deleted: false });

            if (!id) {
                if (existingWork) {
                    sendResponse(res, 400, false, {}, "Working day entry for this department in the specified month already exists");
                    return;
                }
            }

            if (!departmentData) {
                sendResponse(res, 404, false, {}, "Department not found");
                return;
            }
            if (!firmData) {
                sendResponse(res, 404, false, {}, "Firm not found");
                return;
            }
            if (!yearData) {
                sendResponse(res, 404, false, {}, "Year not found");
                return
            }

            const workDay = new WorkDay({
                department: departmentData?._id,
                working_day: working_day,
                ot_hours: ot_hours,
                ot_count: ot_count,
                pf: pf,
                fpf: fpf,
                esi: esi,
                lwf: lwf,
                month: month,
                firm_id: firm_id,
                year_id: year_id,
            })

            if (!id) {
                try {
                    await workDay.save(workDay).then(data => {
                        sendResponse(res, 200, true, {}, "Working Day added successfully");
                    })
                } catch (error) {
                    sendResponse(res, 500, false, {}, "Something went wrong");
                }
            } else {

                await WorkDay.findByIdAndUpdate(id, {
                    department: departmentData?._id,
                    working_day: working_day,
                    ot_hours: ot_hours,
                    ot_count: ot_count,
                    pf: pf,
                    fpf: fpf,
                    esi: esi,
                    lwf: lwf,
                    month: month,
                    firm_id: firm_id,
                    year_id: year_id,
                    status: status
                }).then(async data => {
                    if (data) {
                        const salary = await salaryModel.find({ department: departmentData?._id, month, deleted: false });
                        if (salary.length > 0) {
                            for (let i = 0; i < salary.length; i++) {
                                let ps = parseFloat((salary[i].total_salary / working_day).toFixed(2));
                                await Salary.findByIdAndUpdate(salary[i]._id, {
                                    work_day_id: data?._id,
                                    working_day: working_day,
                                    working_hour: ot_hours,
                                    perday_salary: ps,
                                    perhour_ot_salary: parseFloat(ps / ot_hours).toFixed(2),
                                });
                            }
                        }
                        sendResponse(res, 200, true, {}, "Working Day updated successfully")
                    } else {
                        sendResponse(res, 404, false, {}, "Working Day not found")
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

exports.deleteWorkDay = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error && id) {
        try {

            const inUse = await Salary.findOne({ work_day_id: id, deleted: false });
            if (inUse) {
                sendResponse(res, 400, false, {}, "Cannot delete workday. It is in use by salary.");
                return;
            }

            await WorkDay.findByIdAndUpdate(id, { deleted: true }).then(data => {
                if (data) {
                    sendResponse(res, 200, true, {}, "Working Day deleted successfully")
                }
            })
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong")
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized")
    }
}

exports.transferWorkingDayToNextMonth = async (req, res) => {
    const { month, password, year_id, financial_year, is_fi_year } = req.body;

    if (req.user && !req.error) {
        if (!month || !password || !year_id) {
            sendResponse(res, 400, false, {}, "Missing parameter");
            return;
        }
        try {
            const inputMonth = parseInt(month);
            const prevMonth = inputMonth === 1 ? 12 : inputMonth - 1;
            const currentDate = new Date();
            
            let nextMonthWorkingDays;
            const inputWorkingDay = await WorkDay.find({ month: inputMonth, year_id: is_fi_year === "true" ? new ObjectId(financial_year) : new ObjectId(year_id), deleted: false });

            if (inputWorkingDay.length === 0 && password === process.env.SALARY_TRANSFER_PASSWORD) {
                const prevWorkingDay = await WorkDay.find({ month: prevMonth, year_id: year_id, deleted: false });
                if (!prevWorkingDay || prevWorkingDay.length === 0) {
                    sendResponse(res, 400, false, {}, "No working days found for previous month");
                    return;
                }
                // nextMonthWorkingDays = prevWorkingDay;
                // nextMonthWorkingDays.forEach(day => {
                //     day._id = new mongoose.Types.ObjectId();
                //     day.month = inputMonth;
                //     day.year_id = is_fi_year === "true" ? new ObjectId(financial_year) : new ObjectId(year_id);
                // });

                const nextMonthWorkingDays = prevWorkingDay.map(day => {
                    const newDay = day.toObject();
                    newDay._id = new mongoose.Types.ObjectId();
                    newDay.month = inputMonth;
                    newDay.year_id = is_fi_year === "true"
                        ? new mongoose.Types.ObjectId(financial_year)
                        : new mongoose.Types.ObjectId(year_id);
                    newDay.createdAt = currentDate;
                    newDay.updatedAt = currentDate;
                    return newDay;
                });

                await WorkDay.insertMany(nextMonthWorkingDays);
                sendResponse(res, 200, true, {}, "Transferred working days to next month successfully");
            } else {
                sendResponse(res, 200, false, {}, "Working days already exists for this month");
            }
        } catch (err) {
            console.log(err.message);
            sendResponse(res, 500, false, {}, "Something went wrong");
            return;
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
        return;
    }
};
