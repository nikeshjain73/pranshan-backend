const { managePermission } = require("../controllers/permission.controller");

module.exports = (app) => {
  var router = require("express").Router();

  const { userTokenValidator } = require("../helper/index");

  router.use(userTokenValidator);

  const firm = require("../controllers/firm.controller");
  const user = require("../controllers/user.controller");
  const express = require("express");


  const multer = require("multer");
  const path = require("path");
  // Payroll =============================================================================

  const employee = require("../controllers/payroll/employ.controller");
  const designation = require("../controllers/payroll/designation.controller");
  const shift = require("../controllers/payroll/shift.controller");
  const workday = require("../controllers/payroll/workDay.controller");
  const department = require("../controllers/payroll/department.controller");
  const salary = require("../controllers/payroll/salary.controller");
  const bank = require("../controllers/payroll/bank.controller");
  const category = require("../controllers/payroll/category.controller");
  const group = require("../controllers/payroll/group.controller");

  const monthly = require("../controllers/payroll/monthly.attendance.controller");
  const daily = require("../controllers/payroll/daily.attendance.controller");
  const holiday = require("../controllers/payroll/holiday.controller");
  const deduction = require("../controllers/payroll/deduction.controller");
  const partyBill = require("../controllers/payroll/partyBill.controller");
  const earning = require("../controllers/payroll/earning.controller");
  const loan = require("../controllers/payroll/loan.controller");
  const authPerson = require("../controllers/payroll/auth_person.controller");
  const skill = require("../controllers/payroll/skill.controller");
  const employeeType = require("../controllers/payroll/employee_type.controller");
  const employeeLeaves = require("../controllers/payroll/leave.controller");
  const leaveEntry = require("../controllers/payroll/leave_entry.controller");

  const punchMachine = require("../controllers/punch_machine.controller");

  // Store =====================================================================

  const unit = require("../controllers/store/unit.controller");
  const itemCategory = require("../controllers/store/item_category.controller");
  const transport = require("../controllers/store/transport.controller");
  const inventoryLocation = require("../controllers/store/inventory_location.controller");
  const project = require("../controllers/project.controller");
  const party = require("../controllers/store/party.controller");

  const partyGroup = require("../controllers/store/partyGroup.controller");
  const order = require("../controllers/store/order.controller");
  const item = require("../controllers/store/item.controller");
  const stock = require("../controllers/store/item_stock.controller");

  const partyTag = require("../controllers/store/party_tag.controller");

  const orderAdjustment = require("../controllers/store/order_adjustment.controller");
  const transactionItem = require("../controllers/store/transaction_item.controller");
  const purchaseOffer = require("../controllers/store/purchase_offer.controller");
  const unitLocation = require("../controllers/main-store/unitLocation/unitLocation.controller");

  // ERP =======================================================================================
  const materialIssue = require("../controllers/erp/material_controller/issue.controller");
  // Planner ---------------------------------------------------
  const draw = require("../controllers/erp/planner/draw.controller");
  const request = require("../controllers/erp/planner/request.controller");
  const materialRequest = require("../controllers/erp/DrawingIssueMaterial/issue_request.controller");
  const materialAcceptance = require("../controllers/erp/DrawingIssueMaterial/issue_acceptance.controller");
  const fitupInspection = require("../controllers/erp/Execution/fitup_inspection.controller");
  const weldInspectionOffer = require("../controllers/erp/Execution/weld_inspection_offer.controller");
  const TestOffer = require("../controllers/erp/Testing/test_offer.controller");
  const wpsMaster = require("../controllers/store/wps.master.controller");
  // ===========================================================================================
  const jointType = require("../controllers/erp/JointType/jointType.controller");
  const ndt = require("../controllers/erp/NDT/ndt.controller");
  const ndtMaster = require("../controllers/erp/NDT/ndt_master.controller");
  const UtInspection = require("../controllers/erp/Testing/ut_test_inspection.controller");
  const RtInspection = require("../controllers/erp/Testing/rt_test_inspection.controller");
  const MptInspectionReport = require("../controllers/erp/Testing/mpt_ test_inspection.controller");
  const LptInspectionReport = require("../controllers/erp/Testing/lpt_test_inspection.controller");
  const paintingSystem = require("../controllers/erp/PaintingSystem/paintingSystem.controller");
  const contractor = require("../controllers/erp/Contractor/contractor.controller");
  const qualifiedWelder = require("../controllers/erp/QualifiedWelder/qualifiedWelder.controller");
  const ProcedureAndSpecification = require("../controllers/erp/ProcedureAndSpecification/procedure_specification.controller");

  // ===========================================================================================

  const PaintManufacturer = require("../controllers/erp/PaintManufacturer/paintManufacturer.controller");

  // Main store general
  const tag = require("../controllers/main-store/general/tag.controller");
  const master = require("../controllers/main-store/general/master.controller");

  // Main store issue return
  const transaction = require("../controllers/main-store/transaction/transaction.controller");

  // Main store stock
  const msStock = require("../controllers/main-store/stock/stock.controller");
  const createYearStockTransfer = require("../controllers/main-store/stock/yearStockTransfer.controller");
  // Manage permission
  const permission = require("../controllers/permission.controller");

  const finalDimension = require('../controllers/erp/Execution/fd_inspection_offer.controller');
  const InspectSummary = require('../controllers/erp/Execution/inspect_summary.controller');
  const DispachNote = require('../controllers/erp/ReleaseNotes/dispatchnote.controller');

  const surfacePrimer = require('../controllers/erp/Paint/surface.controller');
  const mioCtrl = require('../controllers/erp/Paint/mio.controller');
  const finalPaintCtrl = require('../controllers/erp/Paint/finalCoat.controller');
  const IRNModel = require('../controllers/erp/ReleaseNotes/inspection_release.controller');

  const Packing = require('../controllers/erp/Packing/packing.controller');
  const Invoice = require('../controllers/erp/Billing/invoice.controller');

  const ProjectLocation = require('../controllers/erp/ProjectLocation/project_location.controller');

  //================DMR================================================================================
  const Dmr = require('../controllers/erp/ManResource/manresource.controller');
  const DmrCategory = require('../controllers/erp/ManResource/manresourcecategory.controller');

  //================FIM================================================================================
  const FimPackingList = require('../controllers/erp/FIM/FIM.controller');

  // ================Area Module========================================================================
  const AreaModule = require('../controllers/erp/Area/area.controller');

  //============ Material Procurement MTO =========================================================
  const MaterialMto = require("../controllers/material_procurement/material_mto.controller");

  // ================ PR ====================================================================
  const ProcurementRequest = require('../controllers/material_procurement/procurementrequest.controller');

  // ================================= Inquiry ====================================================================
  const Inquiry = require('../controllers/material_procurement/inquiry.controller')

  // ================================= Order Placement ====================================================================
  const OrderPlacement = require('../controllers/material_procurement/order_placement.controller');

  // ================================ MTO Chart ================================================================================
  const Material_Chart = require('../controllers/material_procurement/material_chart.controller');

  // =============================== Terms and Condition =================================================================
  const Term_Condition = require('../controllers/material_procurement/terms.controller');


  

  //================Multiple drawings=================================================================
  const MultiRequest = require('../controllers/erp/Multi/multi_issue_request.controller');
  const MultiAcceptance = require("../controllers/erp/Multi/multi_issue_acceptance.controller");
  const MultiFitup = require("../controllers/erp/Multi/multi_fitup_inspection.controller");
  const Grids = require('../controllers/erp/planner/draw_grid.controller');
  const GridItem = require('../controllers/erp/planner/drawing_grid_items.controller');

  const MultiWeldVisual = require('../controllers/erp/Multi/multi_weld_visual_inspection.controller');
  const MultiNDT = require("../controllers/erp/Multi/multi_ndt_master.controller");

  const FitupOffTable = require('../controllers/erp/Multi/offer_table_data/fitup_offer_table.controller');
  const WeldVisualOfferTable = require('../controllers/erp/Multi/offer_table_data/weld_offer_table.controller');
  const NDTOfferTable = require("../controllers/erp/Multi/offer_table_data/ndt_offer_table.controller");
  const NDTTypeOfferTable = require("../controllers/erp/Multi/multi_ndt_type_offer.controller");
  const MultiFD = require('../controllers/erp/Multi/multi_fd_inspection.controller');
  const MultiInspectSummary = require('../controllers/erp/Multi/inspect_summary/multi_inspect_summary.controller');
  const MultiDispatchOffer = require('../controllers/erp/Multi/offer_table_data/dispatch_offer_table.controller');
  const MultiSurfaceOffer = require('../controllers/erp/Multi/offer_table_data/Paint/surface_offer_table.controller');
  const MultiSurfaceInspection = require('../controllers/erp/Multi/multi_surface_inspection.controller');
  const MultiMIOOffer = require('../controllers/erp/Multi/offer_table_data/Paint/mio_offer_table.controller');
  const MultiMIOInspection = require('../controllers/erp/Multi/multi_mio_inspection.controller');
  const MultiFCOffer = require('../controllers/erp/Multi/offer_table_data/Paint/final_coat_offer_table.controller');
  const MultiFCInspection = require('../controllers/erp/Multi/multi_final_coat_inspection.controller');
  const MultiDispatch = require('../controllers/erp/Multi/dispatch_note/multi_dispatch_note.controller');
  const MultiFDOfferTable = require("../controllers/erp/Multi/offer_table_data/fd_offer_table.controller");
  const MultiUtInspection = require("../controllers/erp/Multi/Testing/multi_ut_test.controller");
  const MultiRTInspection = require("../controllers/erp/Multi/Testing/multi_rt_test.controller");
  const MultiLPTInspection = require("../controllers/erp/Multi/Testing/multi_lpt_test.controller");
  const MultiMPTInspection = require("../controllers/erp/Multi/Testing/multi_mpt_test.controller");

  const MultiReleaseNote = require("../controllers/erp/Multi/release_note/multi_release_note.controller");

  const IssueOffTable = require("../controllers/erp/Multi/offer_table_data/issue_offer_table.controller");

  const PackingOffTable = require("../controllers/erp/Multi/offer_table_data/packing_offer_table.controller");
  const PackingInspection = require('../controllers/erp/Multi/packing/multi_packing.controller');

  const MultiInvoice = require("../controllers/erp/Multi/Invoice/multi_invoice.controller");
  const usableStock = require("../controllers/store/usable_stock.controller");

  const year = require("../controllers/year.controller");




// ==============================================================================================
  router.post("/login", user.loginUser);
  // REMOVED UNUSED: router.post("/logout", user.logoutUser);
  router.get("/get-year", year.getYear);

  router.post("/forget-password", user.userForgetPassword);
  router.post("/verify-otp", user.userVerifyOtp);
  router.post("/reset-password", user.userResetPassword);

  router.post("/change-password", user.changesPassword);
  router.get("/get-profile", user.getUserProfile);
  router.post("/update-profile", user.updateProfile);
  router.post("/dashboard", user.dashboard);
  // REMOVED UNUSED: router.post("/store-dashboard", user.storeDashboard);

  // Payroll =======================================================
  // REMOVED UNUSED: router.patch("/salary-update", salary.updateSalary);
  router.post("/list-pt-report", salary.listPTreport);
  router.post("/pt-report-download", salary.downloadPTreport);
  // REMOVED UNUSED: router.post("/pt-report-xlsx", salary.xlsxPTreport);
  router.post("/list-n-salary-report", salary.oneNsalary);
  router.post("/n-salary-report-download", salary.downloadOneNsalary);
  router.post("/list-b-salary-report", salary.oneBsalary);
  router.post("/b-salary-report-download", salary.downloadOneBsalary);
  // REMOVED UNUSED: router.post("/b-salary-report-xlsx", salary.xlsxBsalary);
  router.post("/list-pf-report", salary.onePF);
  router.post("/pf-report-download", salary.downloadOnePF);
  // REMOVED UNUSED: router.post("/pf-report-xlsx", salary.xlsxPFreport);
  router.post("/list-yearly-salary-report", salary.oneYearlysalary);
  router.post("/yearly-salary-report-download", salary.downloadOneYearlysalary);
  // REMOVED UNUSED: router.post("/yearly-salary-report-xlsx", salary.xlsxYearlyReport);
  // REMOVED UNUSED: router.post("/list-yearly-month-report", salary.oneYearlymonthsalary);
  router.post("/yearly-month-report-download", salary.downloadOneYearlymonthsalary);
  // REMOVED UNUSED: router.post("/yearly-month-report-xlsx", salary.xlsxYearlymonthReport);
  router.post("/list-esic-report", salary.oneESIC);
  router.post("/esic-report-download", salary.downloadOneESIC);
  // REMOVED UNUSED: router.post("/esic-report-xlsx", salary.xlsxESIC);
  // REMOVED UNUSED: router.get('/get-employee', employee.getEmployee);
  router.get('/get-admin-employee', employee.getAdminEmployee);
  router.post('/manage-employee', employee.manageEmploy);
  router.delete('/delete-employee', employee.deleteEmployee);
  router.post('/employee-report', employee.EmployeeReport);
  router.post('/daily-employee-report', employee.EmployeeDailyReport);
  // REMOVED UNUSED: router.post('/department-report', employee.DepartmentSalaryReport);
  router.get('/get-employee-report', employee.GetEmployeeReport);
  router.post('/download-form-11', employee.downloadForm11);
  router.post('/download-police-station', employee.downloadPoliceForm);
  router.post('/download-gatepass', employee.downloadGatePass);
  // REMOVED UNUSED: router.get('/search-employee', employee.searchEmployee);
  router.get('/get-all-employee', employee.getAllEmployee);
  // REMOVED UNUSED: router.post('/update-employee-excel', employee.updateEmployeeByExcel)

  router.get('/list-employee-all', employee.listEmployeeAll);

  // REMOVED UNUSED: router.post('/get-attendance-register', employee.getAttendanceRegister);
  router.post('/download-xlsx-attendance-regi', employee.downloadXlsxAttendaceRegister);

  router.get("/get-designation", designation.getDesignation);
  router.get("/get-admin-designation", designation.getAdminDesignation);
  router.post("/manage-designation", designation.manageDesignation);
  router.delete("/delete-designation", designation.deleteDesignation);

  router.get("/get-department", department.getDepartment);
  router.get("/get-admin-department", department.getAdminDepartment);
  router.post("/manage-department", department.manageDepartment);
  router.delete("/delete-department", department.deleteDepartment);

  router.get("/get-shift", shift.getShift);
  router.get("/get-admin-shift", shift.getAdminShift);
  router.post("/manage-shift", shift.manageShift);
  router.delete("/delete-shift", shift.deleteShift);

  router.get("/get-firm", firm.getFirm);

  router.get("/get-workday", workday.getWorkDay);
  router.get("/get-admin-workday", workday.getAdminWorkDay);
  router.post("/manage-workday", workday.manageWorkDay);
  router.delete("/delete-workday", workday.deleteWorkDay);
  // REMOVED UNUSED: router.post('/transfer-workday', workday.transferWorkingDayToNextMonth);

  // REMOVED UNUSED: router.get("/get-salary", salary.getSalary);
  router.get("/get-admin-salary", salary.getAdminSalary);

  const salaryStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "uploads"); // folder where files will be stored
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname));
    },
  });
  const salaryUpload = multer({ storage: salaryStorage });

  router.post("/manage-salary", salaryUpload.single("bank_pass_book"), salary.manageSalary);
  router.post("/manage-bank-detail", salaryUpload.single("bank_pass_book"), salary.manageBankDetail);

  router.delete("/delete-salary", salary.deleteSalary);
  router.post("/employee-salary", salary.employeeSalary);
  router.post("/mutiple-employee-salary", salary.MultipleEmployeeSalary);
  // REMOVED UNUSED: router.get("/get-all-salary", salary.getAllSalary);
  // REMOVED UNUSED: router.get("/download-pt-report", salary.ptReportDownload);

  // REMOVED UNUSED: router.post("/get-duplicate-salary", salary.getDuplicateSalary);
  // REMOVED UNUSED: router.post("/delete-duplicate-salary", salary.deleteDuplicateSalary);

  router.get("/get-bank", bank.getBank);
  router.get("/get-admin-bank", bank.getAdminBank);
  router.post("/manage-bank", bank.manageBank);
  router.delete("/delete-bank", bank.deleteBank);


  router.get("/get-category", category.getCategory);
  router.get("/get-admin-category", category.getAdminCategory);
  router.post("/manage-category", category.manageCategory);
  router.delete("/delete-category", category.deleteCategory);


  router.get("/get-group", group.getGroup);
  router.get("/get-admin-group", group.getAdminGroup);
  router.post("/manage-group", group.manageGroup);
  router.delete("/delete-group", group.deleteGroup);

  router.get("/get-monthly-attendance", monthly.getMonthlyAttendance);
  router.get(
    "/get-admin-monthly-attendance",
    monthly.getAdminMonthlyAttendance
  );
  router.post("/manage-monthly-attendance", monthly.manageMonthlyAttendance);
  router.delete("/delete-monthly-attendance", monthly.deleteMonthlyAttendance);

  router.get("/get-bank", bank.getBank);
  router.get("/get-admin-bank", bank.getAdminBank);
  router.post("/manage-bank", bank.manageBank);
  router.delete("/delete-bank", bank.deleteBank);


  router.get("/get-category", category.getCategory);
  router.get("/get-admin-category", category.getAdminCategory);
  router.post("/manage-category", category.manageCategory);
  router.delete("/delete-category", category.deleteCategory);


  router.get("/get-group", group.getGroup);
  router.get("/get-admin-group", group.getAdminGroup);
  router.post("/manage-group", group.manageGroup);
  router.delete("/delete-group", group.deleteGroup);

  router.get("/get-monthly-attendance", monthly.getMonthlyAttendance);
  router.get(
    "/get-admin-monthly-attendance",
    monthly.getAdminMonthlyAttendance
  );
  router.post("/manage-monthly-attendance", monthly.manageMonthlyAttendance);
  router.delete("/delete-monthly-attendance", monthly.deleteMonthlyAttendance);

  router.get("/get-daily-attendance", daily.getDailyAttendance);
  router.get("/get-admin-daily-attendance", daily.getAdminDailyAttendance);
  router.post("/manage-daily-attendance", daily.manageDailyAttendance);
  // REMOVED UNUSED: router.delete("/delete-daily-attendance", daily.deleteDailyAttendance);
  router.post("/daily-attendance-report", daily.dailyAttendanceReport);
  router.post("/download-daily-attendance-sheet", employee.getAttendanceSheet)
  // REMOVED UNUSED: router.post("/import-daily-attendance", employee.importDailyData);
  router.delete("/delete-date-daily-attendance", daily.deleteDailyAttendanceByDate)
  // REMOVED UNUSED: router.post("/list-attendance-ledger", daily.attendanceLedger)
  router.post("/download-attendance-ledger", daily.attendanceLedgerPDFRport)

  // REMOVED UNUSED: router.get("/get-holiday", holiday.getHoliday);
  router.get("/get-admin-holiday", holiday.getAdminHoliday);
  router.post("/manage-holiday", holiday.manageHoliday);
  router.delete("/delete-holiday", holiday.deleteHoliday);

  // REMOVED UNUSED: router.get("/get-deduction", deduction.getDeduction);
  router.get("/get-admin-deduction", deduction.getAdminDeduction);
  router.post("/manage-deduction", deduction.manageDeduction);
  router.delete("/delete-deduction", deduction.deleteDeduction);
  router.post("/generate-deduction-report", deduction.getDeductionReport);
  router.post("/generate-loan-report", deduction.getLoanReceiveReport);


  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "uploads"); // folder where files will be stored
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname));
    },
  });

  const upload = multer({ storage: storage });

  // upload.single("file"),
  router.post("/manage-party-bill", upload.single("file"), partyBill.managePartyBill);
  router.get("/get-party-bill", partyBill.getAllPartyBills);
  router.put("/update-party-bill/:id/:slug?", upload.single("file"), partyBill.updatePartyBill);
  router.get("/get-party-bill-by-id/:id/:slug?", partyBill.getPartyBillById);
  router.get("/get-firm-party-bill", partyBill.getFirmPartyBill);
  // REMOVED UNUSED: router.get("/get-invoice-by-project/:projectId", partyBill.getInvoicesByProject);
  // REMOVED UNUSED: router.get("/get-party-by-project-bank-details", partyBill.getPartyByProjectAndBankDetails);
  // REMOVED UNUSED: router.get("/get-po-by-party/:partyId", partyBill.getPoByParty);
  router.delete('/delete-party-bill/:id/:slug?', partyBill.deletePartyBill);
  router.get("/get-site-location", partyBill.getSiteLocation);
  router.get("/get-all-projects", partyBill.getAllProjects);
  router.get("/get-all-parties", partyBill.getAllParties);
  router.post("/party-bill-export-excel-download", partyBill.exportPartyBillExcelDownload);

  // REMOVED UNUSED: router.get("/get-earning", earning.getEarning);
  router.get("/get-admin-earning", earning.getAdminEarning);
  router.post("/manage-earning", earning.manageEarning);
  router.delete("/delete-earning", earning.deleteEarning);
  router.post("/generate-earning-report", earning.getEarningReport);

  // REMOVED UNUSED: router.get("/get-loan", loan.getLoan);
  router.get("/get-admin-loan", loan.getAdminLoan);
  router.post("/manage-loan", loan.manageLoan);
  router.delete("/delete-loan", loan.deleteLoan);
  router.post("/generate-loan-issue-report", loan.getLoanIssueReport);
  router.post("/generate-loan-status-report", loan.genLoanStatusReport);
  router.get("/get-loan-summary/:employeeId", loan.loanSummary);

  router.get("/get-auth-person", authPerson.getAuhPerson);
  router.get("/get-admin-auth-person", authPerson.getAdminAuhPerson);
  router.post("/manage-auth-person", authPerson.manageAuthPerson);
  router.delete("/delete-auth-person", authPerson.deleteAuthPerson);

  router.get("/get-skill", skill.getSkill);
  router.get("/get-admin-skill", skill.getAdminSkill);
  router.post("/manage-skill", skill.manageSkill);
  router.delete("/delete-skill", skill.deleteSkill);

  router.get("/get-employee-type", employeeType.getEmployeeType);
  router.get("/get-admin-employee-type", employeeType.getAdminEmployeeType);
  router.post("/manage-employee-type", employeeType.manageEmployeeType);
  router.delete("/delete-employee-type", employeeType.deleteEmployeeType);

  // REMOVED UNUSED: router.post('/import-employee', employee.importEmployeeData);
  // REMOVED UNUSED: router.post('/get-monthly-sheet', employee.getMonthlySheet);
  router.post('/import-monthly-data', employee.importMonthlyData);
  router.post('/get-salary-report', employee.generateExcelReport);
  // REMOVED UNUSED: router.post('/import-salary-data', employee.importSalaryData);
  // REMOVED UNUSED: router.post('/create-month-salary', employee.createMonthSalary);

  // REMOVED UNUSED: router.post("/update-leaving-date", employee.updateLeavingDate);


  router.post('/manage-employee-leaves', employeeLeaves.manageEmployeeLeaves);
  // REMOVED UNUSED: router.get('/get-employee-leaves', employeeLeaves.getEmployeeLeaves)
  // REMOVED UNUSED: router.get('/get-employee-leave-report', employeeLeaves.getLeaveReport)

  // REMOVED UNUSED: router.post('/manage-leave-entry', leaveEntry.manageLeaveEntry);
  // REMOVED UNUSED: router.get('/get-leave-entry', leaveEntry.getLeaveEntries);
  // REMOVED UNUSED: router.delete('/delete-leave-entry', leaveEntry.deleteLeaveEntry);
  // REMOVED UNUSED: router.post('/get-leave-entry-report', leaveEntry.downloadLeavePdf);

  // REMOVED UNUSED: router.get('/download-project-report', daily.projectReport);
  // REMOVED UNUSED: router.post('/list-project-report', daily.listProjectreport);
  router.post('/project-report-download', daily.downloadProjectreport);
  // REMOVED UNUSED: router.post('/project-report-xlsx', daily.xlsxProjectreport);

  // Store ================================================================

  // REMOVED UNUSED: router.get("/get-unit", unit.getUnit);
  // REMOVED UNUSED: router.get("/get-admin-unit", unit.getAdminUnit);
  // REMOVED UNUSED: router.post("/manage-unit", unit.manageUnit);
  // REMOVED UNUSED: router.delete("/delete-unit", unit.deleteUnit);
  // REMOVED UNUSED: router.post("/upload-unit", unit.importUnit);
  // REMOVED UNUSED: router.get("/download-unit-format", unit.downloadFormate);

  // REMOVED UNUSED: router.get("/get-thickness", thickness.getThickness);
  // REMOVED UNUSED: router.get("/get-admin-thickness", thickness.getAdminThickness);
  // REMOVED UNUSED: router.post("/manage-thickness", thickness.manageThickness);
  // REMOVED UNUSED: router.delete("/delete-thickness", thickness.deleteThickness);
  // REMOVED UNUSED: router.post("/upload-thickness", thickness.importThickness);
  // REMOVED UNUSED: router.get("/download-thickness-format", thickness.downloadFormate);

  // REMOVED UNUSED: router.get("/get-itemCategory", itemCategory.getCategory);
  // REMOVED UNUSED: router.get("/get-admin-itemCategory", itemCategory.getAdminCategory);
  // REMOVED UNUSED: router.post("/manage-itemCategory", itemCategory.manageItemCategory);
  // REMOVED UNUSED: router.delete("/delete-itemCategory", itemCategory.deleteItemCategory);
  // REMOVED UNUSED: router.post("/upload-itemCategory", itemCategory.uploadItemCategory);
  // REMOVED UNUSED: router.get("/download-itemCategory-format", itemCategory.downloadFormate);

  // Item Master
  // REMOVED UNUSED: router.get("/get-item", item.getItem);
  // REMOVED UNUSED: router.get("/get-admin-item", item.getAdminItem);
  // REMOVED UNUSED: router.post("/manage-item", item.manageItem);
  // REMOVED UNUSED: router.delete("/delete-item", item.deleteItem);
  // REMOVED UNUSED: router.post("/import-item", item.importItem);
  // REMOVED UNUSED: router.get("/download-item-format", item.downloadFile);
  // REMOVED UNUSED: router.post("/import-itemData", item.importItemData);
  // REMOVED UNUSED: router.get("/itemdata-format-download", item.downloadItemData);
  // REMOVED UNUSED: router.get("/download-items", item.downloadItemList);
  // REMOVED UNUSED: router.post("/update-item", item.updateItem);

  // Transport
  // REMOVED UNUSED: router.get("/get-transport", transport.getTransport);
  // REMOVED UNUSED: router.get("/get-admin-transport", transport.getAdminTransport);
  // REMOVED UNUSED: router.post("/manage-transport", transport.manageTransport);
  // REMOVED UNUSED: router.delete("/delete-transport", transport.deleteTransport);
  // REMOVED UNUSED: router.post("/upload-transport", transport.uploadTransport);
  // REMOVED UNUSED: router.get("/download-transport-format", transport.downloadFormate);

  // REMOVED UNUSED: router.get("/get-inventoryLocation", inventoryLocation.getInventoryLocation);
  // REMOVED UNUSED: router.get("/get-admin-inventoryLocation", inventoryLocation.getAdminInventoryLocation);
  // REMOVED UNUSED: router.post("/manage-inventoryLocation", inventoryLocation.manageInventoryLocation);
  router.delete(
    "/delete-inventoryLocation",
    inventoryLocation.deleteInventoryLocation
  );
  router.post(
    "/upload-inventoryLocation",
    inventoryLocation.uploadInventoryLocation
  );
  router.get(
    "/download-inventoryLocation-format",
    inventoryLocation.downloadFormate
  );

  router.get("/get-project", project.getProjects);
   router.get("/get-admin-project", project.getAdminProjects);
  router.post("/manage-project", project.manageProject);
  router.delete("/delete-project", project.deleteProject);

  // REMOVED UNUSED: router.post("/get-party", party.getParty);
  // REMOVED UNUSED: router.post("/get-admin-party", party.getAdminParty);
  // REMOVED UNUSED: router.post("/manage-party", party.manageParty);
  // REMOVED UNUSED: router.delete("/delete-party", party.deleteParty);

  // REMOVED UNUSED: router.get("/get-party-group", partyGroup.getPartyGroup);
  // REMOVED UNUSED: router.get("/get-admin-party-group", partyGroup.getAdminPartyGroup);
  // REMOVED UNUSED: router.post("/manage-party-group", partyGroup.managePartyGroup);
  // REMOVED UNUSED: router.delete("/delete-party-group", partyGroup.deletePartyGroup);

  // REMOVED UNUSED: router.post("/get-order", order.getOrder);
  // REMOVED UNUSED: // router.get('/get-admin-order', order.getAdminPartyGroup);
  // REMOVED UNUSED: router.post("/manage-order", order.manageOrder);
  // REMOVED UNUSED: router.delete("/delete-order", order.deleteOrder);
  // REMOVED UNUSED: router.post("/update-transaction-item", order.updateTransactionItem);

  // REMOVED UNUSED: router.get("/get-stock-list", stock.getStockList);
  // REMOVED UNUSED: router.post("/download-stock-list", stock.downloadStockItem);
  // REMOVED UNUSED: router.post("/stock-list-xlsx", stock.xlsxStockItem);

  // REMOVED UNUSED: router.get("/get-party-tag", partyTag.getPartyTag);
  // REMOVED UNUSED: router.post("/manage-party-tag", partyTag.managePartyTag);
  // REMOVED UNUSED: router.delete("/delete-party-tag", partyTag.deletePartyTag);

  // REMOVED UNUSED: router.post("/get-order-adjustment", orderAdjustment.getOrderAdujustment);
  router.post(
    "/manage-order-adjustment",
    orderAdjustment.manageOrderAdjustment
  );
  router.delete(
    "/delete-order-adjustment",
    orderAdjustment.deleteOrderAdjustment
  );

  // REMOVED UNUSED: router.post("/get-transaction-item", transactionItem.getTransactionItem);
  // REMOVED UNUSED: router.post("/manage-transaction-item", transactionItem.manageTransactionItem);
  // REMOVED UNUSED: router.delete("/delete-transaction-item", transactionItem.deleteTransactionItem);
  // REMOVED UNUSED: router.post("/manage-drawing-item", transactionItem.manageDrawing);
  // REMOVED UNUSED: router.post("/get-drawing-transaction", transactionItem.getDrawingTransaction);
  // REMOVED UNUSED: router.post("/get-item-request", transactionItem.getAllItemByRequest);


  // REMOVED UNUSED: router.post("/manage-purchase-offer", purchaseOffer.managePurchaseOffer);
  // REMOVED UNUSED: router.post("/get-purchase-offer", purchaseOffer.getPurchaseOffer);
  // REMOVED UNUSED: router.put("/update-purchase-offer", purchaseOffer.updatePurchaseOffer);
  // REMOVED UNUSED: router.post("/get-qc-approval", purchaseOffer.getQcQuanity);
  // REMOVED UNUSED: router.post("/send-offer-qc", purchaseOffer.sendToQc);
  // REMOVED UNUSED: router.delete("/delete-purchase-offer", purchaseOffer.deletePurchaseOffer);

  // REMOVED UNUSED: router.get("/get-unit-location", unitLocation.getUnitLocation);
  // REMOVED UNUSED: router.post("/manage-unit-location", unitLocation.manageUnitLocation);
  // REMOVED UNUSED: router.delete("/delete-unit-location/:id", unitLocation.deleteUnitLocation);

  // Erp =========================================================================================
  // REMOVED UNUSED: router.post("/manage-issue", materialIssue.manageIssue);
  // REMOVED UNUSED: router.post("/get-issue", materialIssue.getIssue);
  // REMOVED UNUSED: router.delete("/delete-issue", materialIssue.deleteIssue);

  // REMOVED UNUSED: router.post("/manage-issue-request", materialRequest.manageIssueRequest);
  // REMOVED UNUSED: router.post("/get-issue-request", materialRequest.getIssueRequest);
  // REMOVED UNUSED: router.post("/one-issue-request-download", materialRequest.downloadOneIssueRequest);
  // REMOVED UNUSED: router.post("/xlsx-one-issue-request", materialRequest.xlsxOfferRequestItem);


  // REMOVED UNUSED: router.post("/manage-issue-acceptance", materialAcceptance.manageIssueAcceptance);
  // REMOVED UNUSED: router.post("/get-issue-acceptance", materialAcceptance.getIssueAcceptance);
  // REMOVED UNUSED: router.post("/one-issue-acceptance-download", materialAcceptance.downloadOneIssueAcceptance);
  // REMOVED UNUSED: router.post("/xlsx-one-issue-acceptance", materialAcceptance.xlsxOneIssueAcceptance);

  // REMOVED UNUSED: router.post("/manage-fitup-inspection", fitupInspection.manageFitupInspection);
  // REMOVED UNUSED: router.post("/get-fitup-inspection", fitupInspection.getFitupInspecction);
  // REMOVED UNUSED: router.post("/get-fitup-inspection-approval", fitupInspection.getQcApproval);
  // REMOVED UNUSED: router.post("/one-fitup-inspection-download", fitupInspection.downloadOneFitupInspection);
  // REMOVED UNUSED: router.post("/xlsx-one-fitup-inspection", fitupInspection.xlsxOneFitupInspection);

  // REMOVED UNUSED: router.post("/manage-weld-inspection-offer", weldInspectionOffer.manageWeldInspectionOffer);
  // REMOVED UNUSED: router.post("/get-weld-inspection-offer", weldInspectionOffer.getWeldingInspectionOffer);
  // REMOVED UNUSED: router.post("/get-weld-inspection-approval", weldInspectionOffer.getQcWeldApproval);
  // REMOVED UNUSED: router.get('/get-final-dimension-offer', finalDimension.getFdOfferList);
  // REMOVED UNUSED: router.post('/manage-final-dimension-offer', finalDimension.manageFdOffer);
  // REMOVED UNUSED: router.post('/get-final-dimension-approval', finalDimension.acceptOffer);
  // REMOVED UNUSED: router.post('/one-final-dimension-download', finalDimension.downloadOneFDInspection);
  // REMOVED UNUSED: router.post('/xlsx-one-final-dimension', finalDimension.xlsxOneFDInspection);
  // REMOVED UNUSED: router.post('/download-fitup-inspection-offers', fitupInspection.downloadMultiInspectionOffers);
  // REMOVED UNUSED: router.post('/download-fitup-inspection-list', fitupInspection.downloadMultiInspectionList);
  // REMOVED UNUSED: router.post('/download-weld-visuals', weldInspectionOffer.downMultiWeldVisualOffers);
  // REMOVED UNUSED: router.post('/download-weld-inspection-list', weldInspectionOffer.downMultiWeldVisualInspections);

  // REMOVED UNUSED: router.get('/get-inspect-summary', InspectSummary.getInspectSummary);
  // REMOVED UNUSED: router.post('/manage-inspect-summary', InspectSummary.manageInspectSummary);
  // REMOVED UNUSED: router.post('/one-inspect-summary-download', InspectSummary.downloadOneInspectionSummary);


  // REMOVED UNUSED: router.post("/one-weld-inspection-download", weldInspectionOffer.downloadOneWeldVisule);
  // REMOVED UNUSED: router.post("/xlsx-one-weld-inspection", weldInspectionOffer.xlsxOneWeldVisule);

  // REMOVED UNUSED: router.get("/get-wps-master", wpsMaster.getWpsMaster);
  // REMOVED UNUSED: router.post("/manage-wps-master", wpsMaster.manageWpsMaster);
  // REMOVED UNUSED: router.delete("/delete-wps-master", wpsMaster.deleteWpsMaster);
  // REMOVED UNUSED: router.get('/download-xlsx-wps-master', wpsMaster.downloadWpsMaster);

  // REMOVED UNUSED: router.get("/get-joint-type", jointType.getJointType);
  // REMOVED UNUSED: router.post("/manage-joint-type", jointType.manageJointType);
  // REMOVED UNUSED: router.delete("/delete-joint-type", jointType.deleteJointType);

  // REMOVED UNUSED: router.get("/get-ndt", ndt.getNDT);
  // REMOVED UNUSED: router.post("/manage-ndt", ndt.manageNDT);
  // REMOVED UNUSED: router.delete("/delete-ndt", ndt.deleteNDT);

  // REMOVED UNUSED: router.get("/get-ndt-master", ndtMaster.getNDT);
  // REMOVED UNUSED: router.post("/manage-ndt-master", ndtMaster.manageNDT);
  // REMOVED UNUSED: router.post("/one-ndt-master-download", ndtMaster.downloadOneNDT);
  // REMOVED UNUSED: router.post("/xlsx-one-ndt-master", ndtMaster.xlsxOneNDT);

  // REMOVED UNUSED: router.get("/get-ndt-offer", TestOffer.getTestOffer);
  // REMOVED UNUSED: router.post("/manage-ndt-offer", TestOffer.manageTestOffer);
  // REMOVED UNUSED: router.post("/one-ndt-offer-download", TestOffer.downloadNDTOffer);
  // REMOVED UNUSED: router.post("/xlsx-one-ndt-offer", TestOffer.xlsxOneNDTOffer);

  // REMOVED UNUSED: router.get("/get-ut-report", UtInspection.getUTInspectionReport);
  // REMOVED UNUSED: router.post("/manage-ut-report", UtInspection.manageUTInspectionReport);
  // REMOVED UNUSED: router.post("/one-ut-report-download", UtInspection.downloadUTOfferReport);
  // REMOVED UNUSED: // router.post("/xlsx-one-ut-report", UtInspection.xlsxUTOfferReport);

  // REMOVED UNUSED: router.get("/get-rt-report", RtInspection.getRTInspectionReport);
  // REMOVED UNUSED: router.post("/manage-rt-report", RtInspection.manageRTInspectionReport);
  // REMOVED UNUSED: router.post("/one-rt-report-download", RtInspection.downloadRTOfferReport);
  // REMOVED UNUSED: // router.post("/xlsx-one-rt-report", RtInspection.xlsxRTOfferReport);

  // REMOVED UNUSED: router.get("/get-mpt-report", MptInspectionReport.getMptInspectionReport);
  // REMOVED UNUSED: router.post("/manage-mpt-report", MptInspectionReport.manageMptInspectionReport);
  // REMOVED UNUSED: router.post("/one-mpt-report-download", MptInspectionReport.downloadMPTOfferReport);

  // REMOVED UNUSED: router.get("/get-lpt-report", LptInspectionReport.getLPTInspectionReport);
  // REMOVED UNUSED: router.post("/manage-lpt-report", LptInspectionReport.manageLPTInspectionReport);
  // REMOVED UNUSED: router.post("/one-lpt-report-download", LptInspectionReport.downloadLPTOfferReport);

  // REMOVED UNUSED: router.get("/get-painting-system", paintingSystem.getPaintingSystem);
  // REMOVED UNUSED: router.post("/manage-painting-system", paintingSystem.managePaintingSystem);
  // REMOVED UNUSED: router.delete("/delete-painting-system", paintingSystem.deletePaintingSystem);

  // REMOVED UNUSED: router.get("/get-contractor", contractor.getContractor);
  // REMOVED UNUSED: router.post("/manage-contractor", contractor.manageContractor);
  // REMOVED UNUSED: router.delete("/delete-contractor", contractor.deleteContractor);

  // REMOVED UNUSED: router.get("/get-qualified-welder", qualifiedWelder.getQualifiedWelder);
  router.post(
    "/manage-qualified-welder",
    qualifiedWelder.manageQualifiedWelderList
  );
  router.delete(
    "/delete-qualified-welder",
    qualifiedWelder.deleteQualifiedWelder
  );
  // REMOVED UNUSED: router.get("/download-xlsx-qualified-welder", qualifiedWelder.downloadWelderXlsx)

  router.get(
    "/get-procedure-specification",
    ProcedureAndSpecification.getProcedureAndSpecification
  );
  router.post(
    "/manage-procedure-specification",
    ProcedureAndSpecification.manageProcedureAndSpecification
  );
  router.delete(
    "/delete-procedure-specification",
    ProcedureAndSpecification.deleteProcedureAndSpecification
  );
  // REMOVED UNUSED: router.get("/download-xlsx-procedure-specification", ProcedureAndSpecification.downloadProcedureAndSpecification);

  // REMOVED UNUSED: router.get("/get-paint-manufacturer", PaintManufacturer.getPaintManufacturer);
  router.post(
    "/manage-paint-manufacturer",
    PaintManufacturer.managePaintManufacturer
  );
  router.delete(
    "/delete-paint-manufacturer",
    PaintManufacturer.deletePaintManufacture
  );


  // REMOVED UNUSED: router.get('/get-dispatch-note', DispachNote.getDispatchNotes);
  // REMOVED UNUSED: router.post('/manage-dispatch-note', DispachNote.manageDispatchNote);
  // REMOVED UNUSED: router.post('/dispatch-note-download', DispachNote.downloadOneDispatch);

  // REMOVED UNUSED: router.get('/get-release-notes', IRNModel.getInspectionReleaseNote);
  // REMOVED UNUSED: router.get('/get-dispatch-note', DispachNote.getDispatchNotes);
  // REMOVED UNUSED: router.post('/manage-dispatch-note', DispachNote.manageDispatchNote);

  //Planner----------------------------------------------------------------------------------

  // REMOVED UNUSED: router.get("/get-drawing", draw.getDrawing);
  router.post("/", draw.drawingIssueDownload);
  // REMOVED UNUSED: router.post("/xlsx-drawing-issue", draw.xlsxOfferInspactionItem);
  // REMOVED UNUSED: router.post("/one-drawing-issue-download", draw.oneDrawingDownload);
  // REMOVED UNUSED: router.post("/get-admin-drawing", draw.getAdminDrawing);
  // REMOVED UNUSED: router.post("/manage-drawing", draw.manageDrawing);
  // REMOVED UNUSED: router.delete("/delete-drawing", draw.deleteDrawing);
  router.post("/get-project-drawings", draw.getProjectDrawings);
  // REMOVED UNUSED: router.post("/issue-drawing", draw.issueDrawing);
  // REMOVED UNUSED: router.get("/daily-progress-report", draw.getDPReport);
  // REMOVED UNUSED: router.post("/download-daily-progress-report", draw.downloadExcelDPReport);
  // REMOVED UNUSED: router.post('/import-drawing', draw.importDrawing);
  // REMOVED UNUSED: router.post("/update-drawing", draw.uploadDrawingPdf);
  // REMOVED UNUSED: router.get("/request-item-import-sample", draw.getRequestImportSample);
  // REMOVED UNUSED: router.post("/import-request-item", draw.importRequestItem);
  // REMOVED UNUSED: router.get("/drawing-item-import-sample", draw.getDrawingImportSample);
  // REMOVED UNUSED: router.post("/import-drawing-item", draw.importDrawingItem);
  // REMOVED UNUSED: router.post("/import-grid-items", draw.importGridItem);

  // REMOVED UNUSED: // router.post("/manage-request", request.manageRequest);
  // REMOVED UNUSED: router.post("/get-request", request.getRequest);
  // REMOVED UNUSED: router.post("/send-request-to-admin", request.sendToAdmin);
  // REMOVED UNUSED: router.post("/get-request-to-admin", request.getRequestDataToAdmin);
  // REMOVED UNUSED: router.post("/get-request-status", request.getRequestStatus);
  // REMOVED UNUSED: router.post("/get-request-edit", request.getRequestEdit);
  // REMOVED UNUSED: router.post("/get-store-request", request.getStoreRequest);
  // REMOVED UNUSED: router.post("/get-store-request-item", request.downloadOneRequestItem);
  // REMOVED UNUSED: router.post("/xlsx-purchase-request", request.xlsxOneRequestItem);
  // REMOVED UNUSED: router.post("/get-offer-request-item", request.downloadOfferRequestItem);
  // REMOVED UNUSED: router.post("/xlsx-material-offer", request.xlsxOfferRequestItem);
  // REMOVED UNUSED: router.post("/get-material-inspection-item", request.downloadMaterialInspactionItem);
  // REMOVED UNUSED: router.post("/xlsx-material-inspection", request.xlsxOfferInspactionItem);

  // REMOVED UNUSED: router.get("/get-item-request", request.getRequest);
  // REMOVED UNUSED: router.post("/manage-request", request.manageRequest);
  // REMOVED UNUSED: router.delete("/delete-request", request.deleteRequest);
  // REMOVED UNUSED: // router.post("/download-all", request.downloadAllOffersForRequest);

  //  Paint =================================================================
  // REMOVED UNUSED: router.get('/get-surface-primer', surfacePrimer.getSurfacePrimer);
  // REMOVED UNUSED: router.post('/manage-surface-primer', surfacePrimer.manageSurfacePrimer);
  // REMOVED UNUSED: router.post('/get-surface-approval', surfacePrimer.getSurfaceApproval);
  // REMOVED UNUSED: router.post('/surface-download', surfacePrimer.downloadSurfacePaint);

  // REMOVED UNUSED: router.get('/get-mio-paint', mioCtrl.getMIOTable);
  // REMOVED UNUSED: router.post('/manage-mio-paint', mioCtrl.manageMIOTable);
  // REMOVED UNUSED: router.post('/get-mio-approval', mioCtrl.getMioApproval);
  // REMOVED UNUSED: router.post('/mio-download', mioCtrl.downloadMioPaint);

  // REMOVED UNUSED: router.get('/get-final-paint', finalPaintCtrl.getFinalCoatData);
  // REMOVED UNUSED: router.post('/manage-final-paint', finalPaintCtrl.manageFinalCoat);
  // REMOVED UNUSED: router.post('/get-final-paint-approval', finalPaintCtrl.getFinalCoatApproval);
  // REMOVED UNUSED: router.post('/final-paint-download', finalPaintCtrl.downloadFinalPaint);

  //Main store general tag==================================================================================
  // REMOVED UNUSED: router.post("/manage-tag", tag.manageTag);
  // REMOVED UNUSED: router.delete("/delete-tag", tag.deleteTag);
  // REMOVED UNUSED: router.get("/get-tag", tag.getTag);

  //Main store general master==================================================================================
  // REMOVED UNUSED: router.post("/manage-master", master.manageMaster);
  // REMOVED UNUSED: router.delete("/delete-master", master.deleteMaster);
  // REMOVED UNUSED: router.get("/get-master", master.getMaster);


  // REMOVED UNUSED: router.post("/get-ms-alltransaction", transaction.getAllTransaction);
  // REMOVED UNUSED: router.get("/get-ms-onetransaction", transaction.getOneTransaction);
  // REMOVED UNUSED: router.post("/one-ms-transaction-download", transaction.downloadOneTransaction);
  // REMOVED UNUSED: router.post("/purchase-order-download", transaction.downloadPurchaseOrder);
  // REMOVED UNUSED: router.post("/list-ms-transaction", transaction.transactionList);
  // REMOVED UNUSED: router.post("/xlsx-ms-trans-download", transaction.transactionExcelReport);
  // REMOVED UNUSED: router.post("/pdf-ms-trans-download", transaction.transactionPDFRport);
  // REMOVED UNUSED: router.get("/report-job-status/:jobId", transaction.checkReportStatus);
  // REMOVED UNUSED: router.get("/report-stream/:jobId", transaction.streamReportStatus);
  // REMOVED UNUSED: router.post('/list-one-purchaseissue', transaction.onePurchaseAndIssueList);
  // REMOVED UNUSED: router.post('/one-purchase-download', transaction.downloadOnePurchase);
  // REMOVED UNUSED: router.post('/one-issue-download', transaction.downloadOneIssue);

  //Purchase request

  // REMOVED UNUSED: router.post('/add-one-pr', transaction.addPR);
  // REMOVED UNUSED: router.post('/add-pr-item', transaction.addPRItem);
  // REMOVED UNUSED: router.post('/list-pr', transaction.listPR);
  // REMOVED UNUSED: router.post('/one-pr', transaction.onePR);
  // REMOVED UNUSED: router.put('/delete-pr', transaction.deletePR);
  // REMOVED UNUSED: router.put('/delete-pr-item', transaction.deletePRItem);
  // REMOVED UNUSED: router.put('/update-pr', transaction.updatePR);
  // REMOVED UNUSED: router.put('/update-pr-item', transaction.updatePRItem);
  // REMOVED UNUSED: router.post('/list-pr-no', transaction.listPRNumber);
  // REMOVED UNUSED: router.post('/pr-download-list', transaction.PRDownloadList);
  // REMOVED UNUSED: router.post('/pr-download-pdf', transaction.PRDownloadPDF);

  //Purchase order

  // REMOVED UNUSED: router.post('/list-pr-item-po', transaction.listPRItemForPO);
  // REMOVED UNUSED: router.post('/add-one-po', transaction.addPO);
  // REMOVED UNUSED: router.post('/add-po-item', transaction.addPOItem);
  // REMOVED UNUSED: router.post('/list-po', transaction.listPO);
  // REMOVED UNUSED: router.post('/one-po', transaction.onePO);
  // REMOVED UNUSED: router.put('/delete-po', transaction.deletePO);
  // REMOVED UNUSED: router.put('/delete-po-item', transaction.deletePOItem);
  // REMOVED UNUSED: router.put('/update-po', transaction.updatePO);
  // REMOVED UNUSED: router.put('/update-po-item', transaction.updatePOItem);
  // REMOVED UNUSED: router.post('/list-po-no', transaction.listPONumber);
  // REMOVED UNUSED: router.post('/po-download-list', transaction.PODownloadList);
  // REMOVED UNUSED: router.post('/po-download-pdf', transaction.PODownloadPDF);

  //Purchace

  // REMOVED UNUSED: router.post('/list-po-item-pu', transaction.listPOItemForPU);
  // REMOVED UNUSED: router.post('/add-one-pu', transaction.addPU);
  // REMOVED UNUSED: router.post('/add-pu-item', transaction.addPUItem);
  // REMOVED UNUSED: router.post('/list-pu', transaction.listPU);
  // REMOVED UNUSED: router.post('/one-pu', transaction.onePU);
  // REMOVED UNUSED: router.put('/delete-pu', transaction.deletePU);
  // REMOVED UNUSED: router.put('/delete-pu-item', transaction.deletePUItem);
  // REMOVED UNUSED: router.put('/update-pu', transaction.updatePU);
  // REMOVED UNUSED: router.put('/update-pu-item', transaction.updatePUItem);
  // REMOVED UNUSED: router.post('/list-pu-no', transaction.listPUNumber);
  // REMOVED UNUSED: router.post('/list-pu-bill-no', transaction.listPUBillNumber);
  // REMOVED UNUSED: router.post('/list-pu-challan-no', transaction.listPUChallanNumber);
  // REMOVED UNUSED: router.post('/pu-download-list', transaction.PUDownloadList);
  // REMOVED UNUSED: router.post('/pu-download-pdf', transaction.PUDownloadPDF);

  //Purchase return

  // REMOVED UNUSED: router.post('/list-pu-pur', transaction.listPUForPUR);
  // REMOVED UNUSED: router.post('/add-one-pur', transaction.addPUR);
  // REMOVED UNUSED: router.post('/add-pur-item', transaction.addPURItem);
  // REMOVED UNUSED: router.post('/list-pur', transaction.listPUR);
  // REMOVED UNUSED: router.post('/one-pur', transaction.onePUR);
  // REMOVED UNUSED: router.put('/delete-pur', transaction.deletePUR);
  // REMOVED UNUSED: router.put('/delete-pur-item', transaction.deletePURItem);
  // REMOVED UNUSED: router.put('/update-pur', transaction.updatePUR);
  // REMOVED UNUSED: router.put('/update-pur-item', transaction.updatePURItem);
  // REMOVED UNUSED: router.post('/list-pur-no', transaction.listPURNumber);
  // REMOVED UNUSED: router.post('/pur-download-list', transaction.PURDownloadList);
  // REMOVED UNUSED: router.post('/pur-download-pdf', transaction.PURDownloadPDF);

  //Issue

  // REMOVED UNUSED: router.get('/all-gate-pass', transaction.listAllGatePass);
  // REMOVED UNUSED: router.post('/add-one-iss', transaction.addISS);
  // REMOVED UNUSED: router.post('/add-iss-item', transaction.addISSItem);
  // REMOVED UNUSED: router.post('/list-iss', transaction.listISS);
  // REMOVED UNUSED: router.post('/list-iss-return', transaction.listISSItemReturn);
  // REMOVED UNUSED: router.post('/one-iss', transaction.oneISS);
  // REMOVED UNUSED: router.put('/delete-iss', transaction.deleteISS);
  // REMOVED UNUSED: router.put('/delete-iss-item', transaction.deleteISSItem);
  // REMOVED UNUSED: router.put('/update-iss', transaction.updateISS);
  // REMOVED UNUSED: router.put('/update-iss-item', transaction.updateISSItem);
  // REMOVED UNUSED: router.post('/iss-gate-pass', transaction.listISSGatePass);
  // REMOVED UNUSED: router.post('/list-iss-no', transaction.listISSNumber);
  // REMOVED UNUSED: router.post('/iss-challan-no', transaction.listISSChallanNumber);
  // REMOVED UNUSED: router.post('/iss-download-list', transaction.ISSDownloadList);
  // REMOVED UNUSED: router.post('/iss-download-pdf', transaction.ISSDownloadPDF);
  // REMOVED UNUSED: router.post('/iss-sort-download-pdf', transaction.ISSDownloadWithoutAmtPDF);
  // REMOVED UNUSED: router.post('/iss-long-download-pdf', transaction.ISSDownloadWithAmtPDF);

  //Issue return

  // REMOVED UNUSED: router.post('/list-iss-isr', transaction.listISSForISR);
  // REMOVED UNUSED: router.post('/add-one-isr', transaction.addISR);
  // REMOVED UNUSED: router.post('/add-isr-item', transaction.addISRItem);
  // REMOVED UNUSED: router.post('/list-isr', transaction.listISR);
  // REMOVED UNUSED: router.post('/one-isr', transaction.oneISR);
  // REMOVED UNUSED: router.put('/delete-isr', transaction.deleteISR);
  // REMOVED UNUSED: router.put('/delete-isr-item', transaction.deleteISRItem);
  // REMOVED UNUSED: router.put('/update-isr', transaction.updateISR);
  // REMOVED UNUSED: router.put('/update-isr-item', transaction.updateISRItem);
  // REMOVED UNUSED: router.post('/isr-download-list', transaction.ISRDownloadList);
  // REMOVED UNUSED: router.post('/isr-download-pdf', transaction.ISRDownloadPDF);
  // REMOVED UNUSED: router.post('/isr-sort-download-pdf', transaction.ISRDownloadWithoutAmtPDF);
  // REMOVED UNUSED: router.post('/isr-long-download-pdf', transaction.ISRDownloadWithAmtPDF);

  // Item Summary

  // REMOVED UNUSED: router.post("/item-summary-list", transaction.itemSummaryList);
  // REMOVED UNUSED: router.post("/item-summary-download", transaction.itemSummaryPDFRport);
  // REMOVED UNUSED: router.post('/item-summary-excel-download', transaction.itemSummaryExcelReport);


  //Item Ledger

  // REMOVED UNUSED: router.post("/legder-list", transaction.itemLedgerList);
  // REMOVED UNUSED: router.post("/legder-download", transaction.itemLedgerPDFRport);


  // Main store Stock List
  // REMOVED UNUSED: router.post("/ms-stockitem", msStock.MsitemStockList);
  // REMOVED UNUSED: router.post("/ms-stock", msStock.MSstockList);
  // REMOVED UNUSED: router.post("/ms-stock-download", msStock.downloadMSStock);
  // REMOVED UNUSED: router.post("/ms-stock-xslx", msStock.msStockExcelReport);
  // REMOVED UNUSED: router.post("/reorder-item-excel-download", msStock.downloadItemStoreExcel);
  // REMOVED UNUSED: router.post("/reorder-item-download", msStock.downloadItemStore);
  // REMOVED UNUSED: router.post("/reorder-item-list", msStock.storeReOrderList);
  // REMOVED UNUSED: router.post("/year-stock-transfer", createYearStockTransfer.createYearStockTransfer);

  // Permission management
  // REMOVED UNUSED: router.post("/add-permission", permission.addPermission);
  // REMOVED UNUSED: router.post("/manage-permission", permission.managePermission);
  // REMOVED UNUSED: router.delete("/delete-permission", permission.deletePermission);
  // REMOVED UNUSED: router.get("/get-permission", permission.getPermission);
  // REMOVED UNUSED: router.get("/get-one-permission", permission.getOnePermission);

  // REMOVED UNUSED: router.post("/manage-packings", Packing.managePacking);
  // REMOVED UNUSED: router.get("/get-packings", Packing.getPackings);

  // REMOVED UNUSED: router.post("/manage-invoice", Invoice.manageInvoice);
  // REMOVED UNUSED: router.get("/get-invoices", Invoice.getInvoice);
  // REMOVED UNUSED: router.delete('/delete-invoice', Invoice.deleteInvoice);
  // REMOVED UNUSED: router.post('/get-one-invoice', Invoice.getOneInvoice);
  // REMOVED UNUSED: router.post('/one-invoice-download', Invoice.downloadOneInvoice);
  // REMOVED UNUSED: router.post('/xlsx-one-invoice', Invoice.xlsxOneInvoice);
  // REMOVED UNUSED: router.post('/get-all-invoice', Invoice.getAllInvoice);
  // REMOVED UNUSED: router.post('/all-invoice-download', Invoice.downloadAllInvoice);
  // REMOVED UNUSED: router.post('/xlsx-all-invoice', Invoice.xlsxAllInvoice);

  router.get('/get-project-location', ProjectLocation.getProjectLocation);
  // REMOVED UNUSED: router.post('/manage-project-location', ProjectLocation.manageProjectLocation);
  // REMOVED UNUSED: router.delete('/delete-project-location', ProjectLocation.deleteProjectLocation);

  // REMOVED UNUSED: router.post("/get-pms-dashboard", user.pmsStore);

  // REMOVED UNUSED: router.post("/get-piping-dashboard", user.pipingStore);

  // Mutiple drawing sections
  // REMOVED UNUSED: router.post("/get-multi-issue-request", MultiRequest.getIssueRequest);
  // REMOVED UNUSED: router.post("/manage-multi-issue-request", MultiRequest.manageIssueRequest);
  // REMOVED UNUSED: router.post("/download-multi-issue-request", MultiRequest.downloadOneIssueRequest);

  // REMOVED UNUSED: router.post("/get-multi-issue-acceptance", MultiAcceptance.getIssueAcceptance);
  // REMOVED UNUSED: router.post("/manage-multi-issue-acceptance", MultiAcceptance.manageIssueAcceptance);
  // REMOVED UNUSED: router.post("/download-multi-issue-acceptance", MultiAcceptance.downloadOneIssueAcceptance);
  // REMOVED UNUSED: router.post("/get-material-issue-acceptance-master-data", MultiAcceptance.getIssueAcceptanceMasterData);
  // REMOVED UNUSED: router.post("/excel-issue-acceptance-download", MultiAcceptance.getIssueAcceptanceExcelDownload);
  // REMOVED UNUSED: router.post("/manage-grid", Grids.manageGrid);
  // REMOVED UNUSED: router.post("/get-grid", Grids.getAllGrids);
  // REMOVED UNUSED: router.delete("/delete-grid", Grids.deleteGrid);

  // REMOVED UNUSED: router.post('/get-multi-grid-drawing', Grids.getMultiGridDrawing);

  // REMOVED UNUSED: router.get('/get-issue-offer-table', IssueOffTable.getIssueOfferTable);
  // REMOVED UNUSED: router.post('/manage-issue-offer-table', IssueOffTable.manageIssueOfferTable);
  // REMOVED UNUSED: router.post('/remove-issue-offer-table', IssueOffTable.removeIssueOfferTable);
  // REMOVED UNUSED: router.post('/update-issue-offer-table', IssueOffTable.updatedIssueOfferTable);

  // REMOVED UNUSED: router.post("/manage-grid-items", GridItem.manageDrawingItem);
  // REMOVED UNUSED: router.post("/get-grid-items", GridItem.getDrawingItems);
  // REMOVED UNUSED: router.post("/get-drawing-master-data", GridItem.getDrawingMasterData);
  // REMOVED UNUSED: router.post("/get-drawing-master-data-excel-download", GridItem.getDrawingMasterDataExcelDownload);


  // REMOVED UNUSED: router.delete("/delete-grid-items", GridItem.deleteDrawingItem);
  // REMOVED UNUSED: router.post("/update-grid-balance", GridItem.updateGridBalance);
  // REMOVED UNUSED: router.post("/get-multi-grid-items", GridItem.getMultiGridItems);

  // REMOVED UNUSED: router.post("/manage-multi-fitup", MultiFitup.manageFitupInspection);
  // REMOVED UNUSED: router.get("/get-multi-fitup", MultiFitup.getFitupInspection);
  // REMOVED UNUSED: router.post("/update-issue-grid-balance", MultiFitup.updateFitupGridBalance);
  // REMOVED UNUSED: router.post("/verify-fitup-offer", MultiFitup.verifyQcDetails);
  // REMOVED UNUSED: router.post("/one-multi-fitup", MultiFitup.oneMultiFitup);
  // REMOVED UNUSED: router.post("/one-multi-fitup-download", MultiFitup.downloadOneMultiFitup);
  // REMOVED UNUSED: router.post("/update-multi-fitup-moveqty", MultiFitup.multiFitupMoveToNextItems);

  // REMOVED UNUSED: router.post("/grid-wise-report", draw.GridWiseSingleDrawing);
  // REMOVED UNUSED: router.post("/filtered-drawing-issue-report", draw.filterDrawingReports);

  // REMOVED UNUSED: router.post("/manage-mutli-weld-visual", MultiWeldVisual.manageWeldVisualInspection);
  // REMOVED UNUSED: router.post("/update-fitup-grid-balance", MultiWeldVisual.updateWeldVisualGridBalance);
  // REMOVED UNUSED: router.get("/get-multi-weldvisual", MultiWeldVisual.getWeldVisualInspection);
  // REMOVED UNUSED: router.post('/verify-weldvisual-offer', MultiWeldVisual.verifyWeldQcDetails);
  // REMOVED UNUSED: router.post('/list-multi-wedvisual', MultiWeldVisual.oneMultiWeld);
  // REMOVED UNUSED: router.post('/multi-weldvisual-download', MultiWeldVisual.downloadOneMultiWeld);

  // REMOVED UNUSED: router.post("/update-ndt-grid-balance", MultiNDT.updateNDTGridBalance);
  // REMOVED UNUSED: router.post("/manage-ndt-master-table", MultiNDT.manageNDTInspection);
  // REMOVED UNUSED: router.get("/get-multi-ndt-master", MultiNDT.getNDTInspection);
  // REMOVED UNUSED: router.post("/list-multi-ndt-master", MultiNDT.listOneMultiNDTMaster);
  // REMOVED UNUSED: router.post("/multi-ndt-master-download", MultiNDT.downloadOneMultiNDTMaster);

  // REMOVED UNUSED: router.get('/get-fitup-offer-table', FitupOffTable.getFitupTableOff);
  // REMOVED UNUSED: router.post('/manage-fitup-offer-table', FitupOffTable.manageFitupOfferTable);
  // REMOVED UNUSED: router.post('/remove-fitup-offer-table', FitupOffTable.removeFitupOfferTable);
  // REMOVED UNUSED: router.post('/update-fitup-offer-table', FitupOffTable.updatedFitupOfferTable);

  // REMOVED UNUSED: router.get('/get-weld-offer-table', WeldVisualOfferTable.getWeldVisualTableOffer);
  // REMOVED UNUSED: router.post('/manage-weld-offer-table', WeldVisualOfferTable.manageWeldVisualOfferTable);
  // REMOVED UNUSED: router.post('/remove-weld-offer-table', WeldVisualOfferTable.removeWeldVisualOfferTable);
  // REMOVED UNUSED: router.post('/update-weld-offer-table', WeldVisualOfferTable.updatedWeldVisualOfferTable);

  // REMOVED UNUSED: router.get('/get-ndt-offer-table', NDTOfferTable.getNDTOfferTable);
  // REMOVED UNUSED: router.post('/manage-ndt-offer-table', NDTOfferTable.manageNDTOfferTable);
  // REMOVED UNUSED: router.post('/remove-ndt-offer-table', NDTOfferTable.removeNDTOfferTable);
  // REMOVED UNUSED: router.post('/update-ndt-offer-table', NDTOfferTable.updatedNDTOfferTable);

  // REMOVED UNUSED: router.get('/get-ndt-typewise-offer', NDTTypeOfferTable.getNDTTypeOffer);
  // REMOVED UNUSED: router.post('/manage-ndt-typewise-offer', NDTTypeOfferTable.manageNDTTypeOffer);

  // REMOVED UNUSED: router.post('/generate-ndt-typewise-offer', NDTOfferTable.generateNDTTypewiseOffer);
  // REMOVED UNUSED: router.get('/get-ndt-generated-offer', NDTOfferTable.getNDTTypewiseOffer);
  // REMOVED UNUSED: router.post('/remove-ndt-generated-offer', NDTOfferTable.removeNDTTypewiseOffer);
  // REMOVED UNUSED: router.post('/save-ndt-typewise-offer', NDTOfferTable.saveNDTTypewiseOffer);
  // REMOVED UNUSED: router.post('/list-one-multi-ndt-offer', NDTOfferTable.oneMultiNDTOffer);
  // REMOVED UNUSED: router.post('/download-one-multi-ndt-offer', NDTOfferTable.downloadMultiNDTOffer);

  // REMOVED UNUSED: router.post("/manage-multi-ut-report", MultiUtInspection.manageUTInspectionReport);
  // REMOVED UNUSED: router.post("/manage-multi-mpt-report", MultiMPTInspection.manageMptInspectionReport);
  // REMOVED UNUSED: router.post("/manage-multi-lpt-report", MultiLPTInspection.manageLPTInspectionReport);
  // REMOVED UNUSED: router.post("/manage-multi-rt-report", MultiRTInspection.manageRTInspectionReport);

  // REMOVED UNUSED: router.get('/get-multi-ut-clearance', MultiUtInspection.getUtMultiClearance)
  // REMOVED UNUSED: router.post('/one-multi-ut-inspection', MultiUtInspection.oneMultiUTInspection)
  // REMOVED UNUSED: router.post('/download-multi-ut-inspection', MultiUtInspection.downloadMultiUTInspection)

  // REMOVED UNUSED: router.get('/get-multi-rt-clearance', MultiRTInspection.getRtMultiClearance);
  // REMOVED UNUSED: router.post('/one-multi-rt-inspection', MultiRTInspection.oneMultiRTInspection);
  // REMOVED UNUSED: router.post('/download-multi-rt-inspection', MultiRTInspection.downloadMultiRTInspection);

  // REMOVED UNUSED: router.get('/get-multi-mpt-clearance', MultiMPTInspection.getMptMultiClearance);
  // REMOVED UNUSED: router.post('/one-multi-mpt-inspection', MultiMPTInspection.oneMultiMPTInspection);
  // REMOVED UNUSED: router.post('/download-multi-mpt-inspection', MultiMPTInspection.downloadMultiMPTInspection);

  // REMOVED UNUSED: router.get('/get-multi-lpt-clearance', MultiLPTInspection.getLptMultiClearance);
  // REMOVED UNUSED: router.post('/one-multi-lpt-inspection', MultiLPTInspection.oneMultiLPTInspection);
  // REMOVED UNUSED: router.post('/download-multi-lpt-inspection', MultiLPTInspection.downloadMultiLPTInspection);

  // REMOVED UNUSED: router.get('/get-multi-fd', MultiFD.getFinalDimension)
  // REMOVED UNUSED: router.post('/manage-multi-fd', MultiFD.manageFinalDimension);
  // REMOVED UNUSED: router.post("/update-fd-grid-balance", MultiFD.updateFDGridBalance);

  // REMOVED UNUSED: router.post('/get-fd-offer-table', MultiFDOfferTable.getFdOfferTable);
  // REMOVED UNUSED: router.post('/manage-fd-offer-table', MultiFDOfferTable.manageFDOfferTable);
  // REMOVED UNUSED: router.post('/remove-fd-offer-table', MultiFDOfferTable.removeFDOfferTable);
  // REMOVED UNUSED: router.post('/update-fd-offer-table', MultiFDOfferTable.updateFDOfferTable);
  // REMOVED UNUSED: router.post('/verify-fd-offer', MultiFD.verifyFDQcDetails);
  // REMOVED UNUSED: router.post("/one-multi-fd", MultiFD.oneMultiFD);
  // REMOVED UNUSED: router.post("/one-multi-fd-download", MultiFD.downloadOneMultiFD);

  // Inspection

  // REMOVED UNUSED: router.post('/add-multi-inspect-summary', MultiInspectSummary.addMultiInspectioSummary);
  // REMOVED UNUSED: router.post('/get-multi-inspect-summary', MultiInspectSummary.getMultiInspectList);
  // REMOVED UNUSED: router.post('/generate-multi-inspect', MultiInspectSummary.generateInspect);
  // REMOVED UNUSED: router.post('/list-multi-inspect-generate', MultiInspectSummary.MultiGenerateInspectList);
  // REMOVED UNUSED: router.post('/download-multi-inspect-generate', MultiInspectSummary.downloadGenerateInspect);

  // Dispatch offer & inspection

  // REMOVED UNUSED: router.post('/manage-multi-dispatch-offer', MultiDispatchOffer.manageDispatchOfferTable);
  // REMOVED UNUSED: router.post('/update-multi-dispatch-offer', MultiDispatchOffer.updateDispatchOffer);
  // REMOVED UNUSED: router.post('/delete-multi-dispatch-offer', MultiDispatchOffer.deleteDispatchOffer);
  // REMOVED UNUSED: router.post('/list-multi-dispatch-offer', MultiDispatchOffer.getDispatchOffer);
  // REMOVED UNUSED: router.post('/is-grid-balance-update', MultiDispatchOffer.updateISGridBalance);

  // REMOVED UNUSED: router.post('/manage-multi-dispatch', MultiDispatch.manageMultiDispatchNote);
  // REMOVED UNUSED: router.post('/get-multi-dispatch', MultiDispatch.getMultiDispatchNote);
  // REMOVED UNUSED: router.post('/get-one-multi-dispatch', MultiDispatch.oneDispatchNote);
  // REMOVED UNUSED: router.post('/download-multi-dispatch', MultiDispatch.downloadOneMultiDispatch);

  // Surface offer & inspection

  // REMOVED UNUSED: router.post('/manage-multi-surface-offer', MultiSurfaceOffer.manageSurfaceOfferTable);
  // REMOVED UNUSED: router.post('/update-multi-surface-offer', MultiSurfaceOffer.updateSurfaceOffer);
  // REMOVED UNUSED: router.post('/delete-multi-surface-offer', MultiSurfaceOffer.deleteSurfaceOffer);
  // REMOVED UNUSED: router.post('/list-multi-surface-offer', MultiSurfaceOffer.getSurfaceOffer);
  // REMOVED UNUSED: router.post('/dnp-grid-balance-update', MultiSurfaceOffer.updateDNPGridBalance);

  // REMOVED UNUSED: router.post('/add-multi-surface-offer', MultiSurfaceInspection.generateSurfaceOffer);
  // REMOVED UNUSED: router.post('/get-multi-surface', MultiSurfaceInspection.getMultiSurfaceInspectionOffer);
  // REMOVED UNUSED: router.post('/get-view-multi-surface', MultiSurfaceInspection.getMultiSurfaceInspectionOfferViewPage);
  // REMOVED UNUSED: router.post('/get-multi-surface-status', MultiSurfaceInspection.getMultiSurfaceInspectionOfferStatus);
  // REMOVED UNUSED: router.post('/verify-multi-surface', MultiSurfaceInspection.verifySurfaceQcDetails);
  // REMOVED UNUSED: router.post('/get-one-multi-surface', MultiSurfaceInspection.oneSurface);
  // REMOVED UNUSED: router.post('/download-multi-surface', MultiSurfaceInspection.downloadOneMultiSurface);

  // Mio offer & inspection

  // REMOVED UNUSED: router.post('/manage-multi-mio-offer', MultiMIOOffer.manageMioOfferTable);
  // REMOVED UNUSED: router.post('/update-multi-mio-offer', MultiMIOOffer.updateMioOffer);
  // REMOVED UNUSED: router.post('/delete-multi-mio-offer', MultiMIOOffer.deleteMioOffer);
  // REMOVED UNUSED: router.post('/list-multi-mio-offer', MultiMIOOffer.getMioOffer);
  // REMOVED UNUSED: router.post('/surface-grid-balance-update', MultiMIOOffer.updateSurfaceGridBalance);
  // REMOVED UNUSED: router.post('/dnp-balance-update', MultiMIOOffer.updateDNPGridBalanceMio);

  // REMOVED UNUSED: router.post('/add-multi-mio-offer', MultiMIOInspection.generateMIOOffer);
  // REMOVED UNUSED: router.post('/get-multi-mio-view-page', MultiMIOInspection.getMultiMIOInspectionOfferViewPage);
  // REMOVED UNUSED: router.post('/get-multi-mio', MultiMIOInspection.getMultiMIOInspectionOffer);

  // REMOVED UNUSED: router.post('/get-multi-mio-clearance', MultiMIOInspection.getMultiMIOInspectionClearance);

  // REMOVED UNUSED: router.post('/verify-multi-mio', MultiMIOInspection.verifyMIOQcDetails);
  // REMOVED UNUSED: router.post('/get-one-multi-mio', MultiMIOInspection.oneMIO);
  // REMOVED UNUSED: router.post('/download-multi-mio', MultiMIOInspection.downloadOneMultiMIO);

  // Final Coat offer & inspection

  // REMOVED UNUSED: router.post('/manage-multi-final-coat-offer', MultiFCOffer.manageFinalCoatOfferTable);
  // REMOVED UNUSED: router.post('/update-multi-final-coat-offer', MultiFCOffer.updateFinalCoatOffer);
  // REMOVED UNUSED: router.post('/delete-multi-final-coat-offer', MultiFCOffer.deleteFinalCoatOffer);
  // REMOVED UNUSED: router.post('/list-multi-final_coat-offer', MultiFCOffer.getFinalCoatOffer);
  // REMOVED UNUSED: router.post('/mio-grid-balance-update', MultiFCOffer.updateSurfaceGridBalance);
  // REMOVED UNUSED: router.post('/dnp-grid-balance-update-final-coat', MultiFCOffer.updateDNPGridBalanceFinalCoat);

  // REMOVED UNUSED: router.post('/add-multi-final-coat-offer', MultiFCInspection.generateFCOffer);
  // REMOVED UNUSED: router.post('/get-multi-final-coat', MultiFCInspection.getMultiFCInspectionOffer);
  // REMOVED UNUSED: router.post('/get-multi-final-coat-view-page', MultiFCInspection.getMultiFCInspectionOfferViewPage);

  // REMOVED UNUSED: router.post('/get-multi-final-coat-clearance', MultiFCInspection.getMultiFCInspectionClearance);
  // REMOVED UNUSED: router.post('/get-multi-final-qc-offer', MultiFCInspection.getMultiFCQcOffer);


  // REMOVED UNUSED: router.post('/verify-multi-final_coat', MultiFCInspection.verifyFCQcDetails);
  // REMOVED UNUSED: router.post('/get-one-multi-final_coat', MultiFCInspection.oneFC);
  // REMOVED UNUSED: router.post('/download-multi-final_coat', MultiFCInspection.downloadOneMultiFC);

  // release note
  // REMOVED UNUSED: router.post('/add-multi-release-note', MultiReleaseNote.addMultiReleaseNotesData);
  // REMOVED UNUSED: router.post('/get-multi-release-note', MultiReleaseNote.getMultiReleaseNoteList);
  // REMOVED UNUSED: router.post('/generate-multi-release-note', MultiReleaseNote.generateReleaseNote);
  // REMOVED UNUSED: router.post('/list-multi-release-generate', MultiReleaseNote.MultiGenerateReleaseNoteList);
  // REMOVED UNUSED: router.post('/download-multi-release-generate', MultiReleaseNote.downloadGenerateInspect);

  // Packing Offer Table
  // REMOVED UNUSED: router.post('/manage-multi-packing-offer', PackingOffTable.managePackingOfferTable);
  // REMOVED UNUSED: router.post('/get-multi-packing-offer', PackingOffTable.getPackingOffer);

  // REMOVED UNUSED: router.post('/delete-multi-packing-offer', PackingOffTable.deletePackingOffer);
  // REMOVED UNUSED: router.post('/release-grid-balance-update', PackingOffTable.updateReleaseGridBal);

  // Packing Ins List
  // REMOVED UNUSED: router.post('/get-multi-packing', PackingInspection.getMultiPacking);
  // REMOVED UNUSED: router.post('/manage-multi-packing', PackingInspection.manageMultiPacking);
  // REMOVED UNUSED: router.post('/download-multi-packing', PackingInspection.downloadOneMultiPacking);

  // NEW DPR WITH GRID
  // REMOVED UNUSED: router.get('/get-grid-dpr', draw.dprGridReport);
  // REMOVED UNUSED: router.post('/download-grid-xlsx-dpr', draw.drpXlsxGridReport);

  // DMR
  // REMOVED UNUSED: router.get("/download-dmr-format", Dmr.downloadFile);
  // REMOVED UNUSED: router.post("/dmr/manage-dmr", Dmr.manageDMR);
  // REMOVED UNUSED: router.post("/dmr/get-by-project", Dmr.getDMRByProject);
  // REMOVED UNUSED: router.post("/dmr/export", Dmr.exportDMRToExcel);


  // DMR Categories
  // REMOVED UNUSED: router.post("/dmr-categories/get-dmr-categories", DmrCategory.getCategoriesByProject);
  // REMOVED UNUSED: router.post("/dmr-categories/manage-dmr-category", DmrCategory.manageCategory);
  // REMOVED UNUSED: router.delete("/dmr-categories/delete-dmr-category", DmrCategory.deleteCategory);

  // FIM Packing List
  // REMOVED UNUSED: router.get("/fim/download-fim-format", FimPackingList.getSampleFIMImport);
  // REMOVED UNUSED: router.post("/fim/manage-fim-packing", FimPackingList.manageFimPackingList);
  // REMOVED UNUSED: router.post("/fim/manage-fim-packing-items", FimPackingList.manageFimPackingItems);
  // REMOVED UNUSED: router.post('/fim/import-fim-items', FimPackingList.importFimItemsByName);
  // REMOVED UNUSED: router.delete("/fim/delete-fim-packing-items", FimPackingList.deleteFimPackingItem);
  // REMOVED UNUSED: router.post("/fim/get-fim-packing", FimPackingList.getFimPackingListById);
  // REMOVED UNUSED: router.post('/fim/get-fim-packing-list', FimPackingList.getFimPackingListsByProject);
  // REMOVED UNUSED: router.post('/fim/update-fim-status', FimPackingList.updateFimPackingStatus);
  // REMOVED UNUSED: router.post('/fim/send-fim-to-qc', FimPackingList.sendFimPackingToQC);
  // REMOVED UNUSED: router.post('/fim/download-fim-packing', FimPackingList.downloadFimPackingList);
  // REMOVED UNUSED: router.post('/fim/fim-packing-export', FimPackingList.downloadFimPackingListExcel);
  // REMOVED UNUSED: router.post('/fim/verify-fim-packing', FimPackingList.verifyFimPacking);
  // REMOVED UNUSED: router.post('/fim/get-fim-report', FimPackingList.exportFimPackingListExcel);
  // REMOVED UNUSED: router.post("/fim/download-fim-data", FimPackingList.downloadFimPackingPdf);


  // AREA/UNIT
  // REMOVED UNUSED: router.post("/area-unit/get-area-unit", AreaModule.getAreas);
  // REMOVED UNUSED: router.post("/area-unit/manage-area-unit", AreaModule.manageArea);
  // REMOVED UNUSED: router.delete("/area-unit/delete-area-unit", AreaModule.deleteArea);


  // MATERIAL PROCUREMENT MTO
  // REMOVED UNUSED: router.post('/material/manage-material-mto', MaterialMto.manageMaterialMto);
  // REMOVED UNUSED: router.post('/material/manage-mto-items', MaterialMto.manageMtoItems);
  // REMOVED UNUSED: router.post('/material/generate-mto', MaterialMto.setMtoPendingStatus);
  // REMOVED UNUSED: router.post('/material/get-all-material-mto', MaterialMto.getAllMaterialMto);
  // REMOVED UNUSED: router.post('/material/get-material-mto-by-id', MaterialMto.getMaterialMtoById);
  // REMOVED UNUSED: router.delete('/material/delete-material-mto', MaterialMto.deleteMaterialMto);
  // REMOVED UNUSED: router.delete('/material/delete-mto-items', MaterialMto.deleteMaterialMtoItem);
  // REMOVED UNUSED: router.post('/material/download-mto-pdf', MaterialMto.downloadMaterialMto);
  // REMOVED UNUSED: // router.post('/material/send-to-pr',MaterialMto.updateMtoToPr);
  // REMOVED UNUSED: router.post('/material/send-multiple-to-pr', MaterialMto.updateMultipleMtoToPr);
  // REMOVED UNUSED: router.post('/material/get-mto-items-by-area', MaterialMto.getMaterialMtoByAreaBuilding);



  // REMOVED UNUSED: router.post('/pr/manage-procurement-request', ProcurementRequest.manageProcurementRequest);
  // REMOVED UNUSED: router.post('/pr/get-all-procurement-request', ProcurementRequest.getAllProcurementRequests);
  // REMOVED UNUSED: router.post('/pr/get-procurement-request-by-id', ProcurementRequest.getProcurementRequestById);
  // REMOVED UNUSED: router.delete('/pr/delete-procurement-request', ProcurementRequest.deleteProcurementRequest);
  // REMOVED UNUSED: router.post('/pr/download-pr-pdf', ProcurementRequest.downloadProcurementRequest);
  // REMOVED UNUSED: router.post('/pr/send-inquiry', ProcurementRequest.updateSendInquiryStatus);
  // REMOVED UNUSED: router.post("/pr/send-multiple-inquiry", ProcurementRequest.sendMultiplePRsToInquiry);


  // INQUIRY
  // REMOVED UNUSED: router.post('/inquiry/get-all-inquiry', Inquiry.getAllInquiries);
  // REMOVED UNUSED: router.post('/inquiry/get-inquiry-by-id', Inquiry.getInquiryById);
  // REMOVED UNUSED: router.post('/inquiry/manage-inquiry', Inquiry.manageInquiry);
  // REMOVED UNUSED: router.delete('/inquiry/delete-inquiry', Inquiry.deleteInquiry);
  // REMOVED UNUSED: router.post('/inquiry/download-inquiry-pdf', Inquiry.downloadInquiry);
  // REMOVED UNUSED: router.post('/inquiry/download-inquiry-excel', Inquiry.downloadInquiryExcel);
  // REMOVED UNUSED: router.post('inquiry/sen-to-po', Inquiry.updateSendPOStatus);
  // REMOVED UNUSED: router.post("/inquiry/send-multiple-inquiry", Inquiry.sendMultipleInquiries);


  // PO
  // REMOVED UNUSED: router.post('/order/get-all-order', OrderPlacement.getAllOrderPlacements);
  // REMOVED UNUSED: router.post('/order/get-order-by-id', OrderPlacement.getOrderPlacementById);
  // REMOVED UNUSED: router.post('/order/manage-order', OrderPlacement.manageOrderPlacement);
  // REMOVED UNUSED: router.delete('/order/delete-order', OrderPlacement.deleteOrderPlacement);
  // REMOVED UNUSED: router.post('/order/download-order-pdf', OrderPlacement.downloadOrderPlacement);
  // REMOVED UNUSED: router.post('/order/download-order-excel', OrderPlacement.downloadOrderExcel);
  // REMOVED UNUSED: router.post('/order/send-to-material', OrderPlacement.placeMultipleOrders);


  // Terms and Condition 
  // REMOVED UNUSED: router.post('/terms-condition/get-all-terms-condition', Term_Condition.getTermsList);
  // REMOVED UNUSED: router.post('/terms-condition/manage-terms', Term_Condition.manageTerms);
  // REMOVED UNUSED: router.post('/terms-condition/delete-terms', Term_Condition.deleteTerms);
  // MAteral chart
  // REMOVED UNUSED: router.post('/material-chart', Material_Chart.getItemWiseMaterialData);
  // REMOVED UNUSED: router.post('/material-chart-excel', Material_Chart.downloadItemWiseMaterialExcel);

  // REMOVED UNUSED: router.get("/get-user-firm/:fId", firm.getUserFirm);
  // REMOVED UNUSED: router.get("/get-user-project/:pId", project.getOneProject);
  router.post("/get-project-in-ex", project.getProjectIncomeExpense);
  // REMOVED UNUSED: router.post("/get-current-project-in-ex", project.getProjectCurruentMonth);
  // REMOVED UNUSED: router.post("/get-last_date-project-in-ex", project.getProjectLastDate);

  // Invoice 
  // REMOVED UNUSED: router.post('/get-multi-invoice', MultiInvoice.getInvoice);
  // REMOVED UNUSED: router.post('/manage-multi-invoice', MultiInvoice.manageInvoice);
  // REMOVED UNUSED: // router.post('/download-xlsx-invoice', MultiInvoice.downloadXlsxInvoice);
  // REMOVED UNUSED: router.post('/download-pdf-invoice', MultiInvoice.downloadPdfInvoice)


  // REMOVED UNUSED: router.post('/add-usable-stock', usableStock.addUsable);
  // REMOVED UNUSED: router.post('/list-usable-stock', usableStock.getUsableList);
  // REMOVED UNUSED: router.post('/list-usable-stock-verify', usableStock.getUsableStockverify);
  // REMOVED UNUSED: router.post('/update-usable-stock', usableStock.updateUsableStock);
  // REMOVED UNUSED: router.post('/delete-usable-stock', usableStock.deleteUsableStock);
  // REMOVED UNUSED: router.post('/pdf-usable-stock', usableStock.UsableListPDF);
  // REMOVED UNUSED: router.post('/xlsx-usable-stock', usableStock.UsableListXLSX);

  // REMOVED UNUSED: router.post('/update-gatepass', employee.updateGatePass);
  // REMOVED UNUSED: router.post('/add-punch-machine-no', employee.addGatepassNo);
  // REMOVED UNUSED: router.get("/get-puch-employe-logs", punchMachine.getEmployeesWithPunchLogs);


  //====================================== Piping Module ===============================================

  app.use("/api/user", router);
};
