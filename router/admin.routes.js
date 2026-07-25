module.exports = (app) => {
  var router = require("express").Router();

  const { adminTokenValidator } = require("../helper/index");

  router.use(adminTokenValidator);

  const admin = require("../controllers/admin.controller");
  const firm = require("../controllers/firm.controller");
  const year = require("../controllers/year.controller");
  const user = require("../controllers/user.controller");
  const store = require("../controllers/store.controller");

  // payroll
  const group = require("../controllers/payroll/group.controller");
  const bank = require("../controllers/payroll/bank.controller");
  const department = require("../controllers/payroll/department.controller");
  const shift = require("../controllers/payroll/shift.controller");
  const designation = require("../controllers/payroll/designation.controller");

  const employee = require("../controllers/payroll/employ.controller");
  const salary = require("../controllers/payroll/salary.controller");
  const workday = require("../controllers/payroll/workDay.controller");
  const monthlyAttendance = require("../controllers/payroll/monthly.attendance.controller");
  const dailyAttendance = require("../controllers/payroll/daily.attendance.controller");
  const earning = require("../controllers/payroll/earning.controller");
  const deduction = require("../controllers/payroll/deduction.controller");
  const loan = require("../controllers/payroll/loan.controller");
  const holiday = require("../controllers/payroll/holiday.controller");
  const auth_person = require("../controllers/payroll/auth_person.controller");

  const skill = require("../controllers/payroll/skill.controller");
  const employeeType = require("../controllers/payroll/employee_type.controller");

  // Store
  const role = require("../controllers/user_role.controller");
  const itemCategory = require("../controllers/store/item_category.controller");
  const inventoryLocation = require("../controllers/store/inventory_location.controller");
  const itemStock = require("../controllers/store/item_stock.controller");
  const supplier = require("../controllers/store/supplier.controller");
  const client = require("../controllers/client.controller");
  const project = require("../controllers/project.controller");
  const projectType = require("../controllers/project_type.controller");
  const transport = require("../controllers/store/transport.controller");
  const customer = require("../controllers/store/customer.controller");
  const item = require("../controllers/store/item.controller");

  const party = require("../controllers/store/party.controller");
  const partyTag = require("../controllers/store/party_tag.controller");
  const partyGroup = require("../controllers/store/partyGroup.controller");

  const unit = require("../controllers/store/unit.controller");

  // User Permission
  const userperm = require("../controllers/user_permission.controller");


  // MAin Store =================================================================
  const transaction = require("../controllers/main-store/transaction/transaction.controller");
  const msStock = require("../controllers/main-store/stock/stock.controller");

  // PMS =================================================================
  const erpRoles = require("../controllers/erp/erp_role.controller");
  const products = require("../controllers/product.controller");
  const request = require("../controllers/erp/planner/request.controller");
  const contractor = require("../controllers/erp/Contractor/contractor.controller");
  const pmsStock = require("../controllers/store/item_stock.controller");
  const ProjectLocation = require("../controllers/erp/ProjectLocation/project_location.controller");
 

  // =================================================================================


  router.post("/login", admin.login);
  router.post("/forgot-password", admin.forgotPassword);
  router.post("/verify-otp", admin.verifyOtp);
  // REMOVED UNUSED: router.get("/check-account", admin.checkAccount);
  router.post("/reset-password", admin.resetPassword);

  router.post("/change-password", admin.changePassword);
  router.get("/get-profile", admin.getProfile);
  router.post("/update-profile", admin.updateProfile);
  // REMOVED UNUSED: router.get("/storeDashboard", admin.StoreDashboard);
  // REMOVED UNUSED: router.get('/get-admin-dashboard', admin.getAdminDashboard);
  // REMOVED UNUSED: router.get("/get-att-count", admin.getEmpAttCount);

  // Firm Management
  router.get("/get-firm", firm.getFirm);
  // REMOVED UNUSED: router.get("/get-admin-firm", firm.getAdminFirm);
  router.post("/manage-firm", firm.manageFirm);
  router.delete("/delete-firm", firm.deleteFirm);

  // Group Management
  router.get("/get-group", group.getGroup);
  router.get("/get-admin-group", group.getAdminGroup);
  router.post("/manage-group", group.manageGroup);
  // REMOVED UNUSED: router.delete("/delete-group", group.deleteGroup);

  // Bank Management
  router.get("/get-bank", bank.getBank);
  router.get("/get-admin-bank", bank.getAdminBank);
  router.post("/manage-bank", bank.manageBank);
  router.delete("/delete-bank", bank.deleteBank);

  // Department Management
  router.get("/get-department", department.getDepartment);
  router.get("/get-admin-department", department.getAdminDepartment);
  router.post("/manage-department", department.manageDepartment);
  // REMOVED UNUSED: router.delete("/delete-department", department.deleteDepartment);

  // Shift Management
  router.get("/get-shift", shift.getShift);
  router.get("/get-admin-shift", shift.getAdminShift);
  router.post("/manage-shift", shift.manageShift);
  // REMOVED UNUSED: router.delete("/delete-shift", shift.deleteShift);

  // Designation Management
  router.get("/get-designation", designation.getDesignation);
  router.get("/get-admin-designation", designation.getAdminDesignation);
  router.post("/manage-designation", designation.manageDesignation);
  // REMOVED UNUSED: router.delete("/delete-designation", designation.deleteDesignation);

  // Employment Management
  // REMOVED UNUSED: router.get("/get-employee", employee.getEmployee);
  // REMOVED UNUSED: router.post("/manage-employee", employee.manageEmploy);
  // REMOVED UNUSED: router.delete("/delete-employee", employee.deleteEmployee);
  // REMOVED UNUSED: router.post("/employee-report", employee.EmployeeReport);
  // REMOVED UNUSED: router.get("/get-employee-report", employee.GetEmployeeReport);

  // Salary Management
  router.get("/get-admin-salary", salary.getAdminSalary);
  // REMOVED UNUSED: router.get("/get-salary", salary.getSalary);
  // REMOVED UNUSED: router.post("/manage-salary", salary.manageSalary);
  // REMOVED UNUSED: router.delete("/delete-salary", salary.deleteSalary);
  // REMOVED UNUSED: router.post("/employee-salary", salary.employeeSalary);

  // Wokring Day Management
  router.get("/get-admin-workday", workday.getAdminWorkDay);
  // REMOVED UNUSED: router.get("/get-workday", workday.getWorkDay);
  // REMOVED UNUSED: router.post("/manage-workday", workday.manageWorkDay);
  // REMOVED UNUSED: router.delete("/delete-workday", workday.deleteWorkDay);

  // Monthly Attendance
  // REMOVED UNUSED: router.get("/get-monthly-attendance", monthlyAttendance.getMonthlyAttendance);
  // REMOVED UNUSED: router.post("/manage-monthly-attendance", monthlyAttendance.manageMonthlyAttendance);
  // REMOVED UNUSED: router.delete("/delete-monthly-attendance", monthlyAttendance.deleteMonthlyAttendance);

  // Daily Attendance
  // REMOVED UNUSED: router.get("/get-admin-daily-attendance", dailyAttendance.getAdminDailyAttendance);
  // REMOVED UNUSED: router.get("/get-daily-attendance", dailyAttendance.getDailyAttendance);
  // REMOVED UNUSED: router.post("/manage-daily-attendance", dailyAttendance.manageDailyAttendance);
  // REMOVED UNUSED: router.delete("/delete-daily-attendance", dailyAttendance.deleteDailyAttendance);
  // REMOVED UNUSED: router.post("/daily-attendance-report", dailyAttendance.dailyAttendanceReport);

  // REMOVED UNUSED: router.post("/get-project-attendance", dailyAttendance.getProjectAttenance)

  // Earning Management
  router.get("/get-earning", earning.getEarning);
  router.post("/manage-earning", earning.manageEarning);
  router.delete("/delete-earning", earning.deleteEarning);

  // Deduction Management
  router.get("/get-deduction", deduction.getDeduction);
  router.post("/manage-deduction", deduction.manageDeduction);
  router.delete("/delete-deduction", deduction.deleteDeduction);

  // Loan Management
  router.get("/get-loan", loan.getLoan);
  router.post("/manage-loan", loan.manageLoan);
  router.delete("/delete-loan", loan.deleteLoan);

  // Holiday Management
  router.get("/get-holiday", holiday.getHoliday);
  router.post("/manage-holiday", holiday.manageHoliday);
  router.delete("/delete-holiday", holiday.deleteHoliday);

  // Authorized Person
  router.get("/get-authorized-person", auth_person.getAuhPerson);
  router.get("/get-admin-authorized-person", auth_person.getAdminAuhPerson);
  router.post("/manage-authorized-person", auth_person.manageAuthPerson);
  // REMOVED UNUSED: router.delete("/delete-authorized-person", auth_person.deleteAuthPerson);

  // Year
  router.get("/get-year", year.getYear);
  router.get("/get-admin-year", year.getAdminYear);
  router.post("/manage-year", year.manageYear);
  router.delete("/delete-year", year.deleteYear);

  // user
  router.get("/get-user", user.getUser);
  router.post("/manage-user", user.manageUser);
  router.delete("/delete-user", user.deleteUser);

  // store
  router.get("/get-store", store.getStore);
  router.get("/get-admin-store", store.getAdminStore);
  router.post("/manage-store", store.manageStore);
  router.delete("/delete-store", store.deleteStore);

  //skill
  router.get("/get-skill", skill.getSkill);
  router.get("/get-admin-skill", skill.getAdminSkill);
  router.post("/manage-skill", skill.manageSkill);
  // REMOVED UNUSED: router.delete("/delete-skill", skill.deleteSkill);

  //Employee Type
  router.get("/get-employee-type", employeeType.getEmployeeType);
  router.get("/get-admin-employee-type", employeeType.getAdminEmployeeType);
  router.post("/manage-employee-type", employeeType.manageEmployeeType);
  // REMOVED UNUSED: router.delete("/delete-employee-type", employeeType.deleteEmployeeType);

  // Store ============================================================================================

  // REMOVED UNUSED: // router.get("/get-role", role.getRole);
  // REMOVED UNUSED: // router.get("/get-admin-role", role.getAdminRole);
  // REMOVED UNUSED: // router.post("/manage-role", role.manageRole);
  // REMOVED UNUSED: // router.delete("/delete-role", role.deleteRole);

  // REMOVED UNUSED: router.get("/get-unit", unit.getUnit);
  // REMOVED UNUSED: router.get("/get-admin-unit", unit.getAdminUnit);
  // REMOVED UNUSED: router.post("/manage-unit", unit.manageUnit);
  // REMOVED UNUSED: router.delete("/delete-unit", unit.deleteUnit);

  // Item Category
  // REMOVED UNUSED: router.get("/get-itemCategory", itemCategory.getCategory);
  // REMOVED UNUSED: router.get("/get-admin-itemCategory", itemCategory.getAdminCategory);
  // REMOVED UNUSED: router.post("/manage-itemCategory", itemCategory.manageItemCategory);
  // REMOVED UNUSED: router.delete("/delete-itemCategory", itemCategory.deleteItemCategory);

  // Inventory Location
  // REMOVED UNUSED: router.get("/get-inventoryLocation", inventoryLocation.getInventoryLocation);
  router.get(
    "/get-admin-inventoryLocation",
    inventoryLocation.getAdminInventoryLocation
  );
  router.post(
    "/manage-inventoryLocation",
    inventoryLocation.manageInventoryLocation
  );
  router.delete(
    "/delete-inventoryLocation",
    inventoryLocation.deleteInventoryLocation
  );


  // Supplier
  // REMOVED UNUSED: router.get("/get-supplier", supplier.getSuppliers);
  // REMOVED UNUSED: router.post("/manage-supplier", supplier.manageSupplier);
  // REMOVED UNUSED: router.delete("/delete-supplier", supplier.deleteSupplier);

  // Client
  // REMOVED UNUSED: router.get("/get-client", client.getClients);
  // REMOVED UNUSED: router.get("/get-admin-client", client.getAdminClients);
  // REMOVED UNUSED: router.post("/manage-client", client.manageClient);
  // REMOVED UNUSED: router.delete("/delete-client", client.deleteClient);

  // Project
  // REMOVED UNUSED: router.get("/get-project", project.getProjects);
  // REMOVED UNUSED: router.post("/manage-project", project.manageProject);
  // REMOVED UNUSED: router.delete("/delete-project", project.deleteProject);

  // Transport
  // REMOVED UNUSED: router.get("/get-transport", transport.getTransport);
  // REMOVED UNUSED: router.get("/get-admin-transport", transport.getAdminTransport);
  // REMOVED UNUSED: router.post("/manage-transport", transport.manageTransport);
  // REMOVED UNUSED: router.delete("/delete-transport", transport.deleteTransport);

  // Customer details for Sales Order
  // REMOVED UNUSED: router.get("/get-customer", customer.getCustomers);
  // REMOVED UNUSED: router.post("/manage-customer", customer.manageCustomer);
  // REMOVED UNUSED: router.delete("/delete-customer", customer.deleteCustomer);

  // REMOVED UNUSED: router.get("/get-party", party.getParty);
  // REMOVED UNUSED: router.post("/get-admin-party", party.getAdminParty);
  // REMOVED UNUSED: router.post("/manage-party", party.manageParty);
  // REMOVED UNUSED: router.delete("/delete-party", party.deleteParty);

  // REMOVED UNUSED: router.get("/get-party-tag", partyTag.getPartyTag);
  // REMOVED UNUSED: router.post("/manage-party-tag", partyTag.managePartyTag);
  // REMOVED UNUSED: router.delete("/delete-party-tag", partyTag.deletePartyTag);

  // REMOVED UNUSED: router.get("/get-party-group", partyGroup.getPartyGroup);
  // REMOVED UNUSED: router.get("/get-admin-party-group", partyGroup.getAdminPartyGroup);
  // REMOVED UNUSED: router.post("/manage-party-group", partyGroup.managePartyGroup);
  // REMOVED UNUSED: router.post("/delete-party-group", partyGroup.deletePartyGroup);

  // REMOVED UNUSED: router.get("/get-item", item.getItem);

  // ERP ===============================================================================================
  // REMOVED UNUSED: router.get("/get-erprole", erpRoles.getErpRole);
  // REMOVED UNUSED: router.get("/get-admin-erprole", erpRoles.getAdminErpRole);
  // REMOVED UNUSED: router.post("/manage-erprole", erpRoles.manageErpRole);
  // REMOVED UNUSED: router.delete("/delete-erprole", erpRoles.deleteErpRole);

  // REMOVED UNUSED: router.get("/get-product", products.getProduct);
  // REMOVED UNUSED: router.get("/get-admin-product", products.getAdminProduct);
  // REMOVED UNUSED: router.post("/manage-product", products.manageProduct);
  // REMOVED UNUSED: router.delete("/delete-product", products.deleteProduct);

  // REMOVED UNUSED: router.get("/get-project-type", projectType.getProjectType);
  // REMOVED UNUSED: router.get("/get-admin-project-type", projectType.getAdminProjectType);
  // REMOVED UNUSED: router.post("/manage-project-type", projectType.manageProjectType);
  // REMOVED UNUSED: router.delete("/delete-project-type", projectType.deleteProjectType);

  // REMOVED UNUSED: router.get("/get-project", project.getProjects);
  // REMOVED UNUSED: router.get("/get-admin-project", project.getAdminProjects);
  // REMOVED UNUSED: router.post("/manage-project", project.manageProject);
  // REMOVED UNUSED: router.delete("/delete-project", project.deleteProject);

  router.post("/get-store-request", request.getStoreRequest);
  // REMOVED UNUSED: router.post("/get-request", request.getRequest);
  // REMOVED UNUSED: router.post("/get-request-to-admin", request.getRequestDataToAdmin);
  // REMOVED UNUSED: router.post("/send-request-to-admin", request.sendToAdmin);
  // REMOVED UNUSED: router.post("/verify-request", request.verifyRequestStatus);
  router.post("/get-store-request-item", request.downloadOneRequestItem);


  // REMOVED UNUSED: router.get("/get-contractor", contractor.getContractor);
  // REMOVED UNUSED: router.post("/manage-contractor", contractor.manageContractor);
  // REMOVED UNUSED: router.delete("/delete-contractor", contractor.deleteContractor);

  // REMOVED UNUSED: router.get('/get-project-location', ProjectLocation.getProjectLocation);

  // User permission ===================================================================================
  router.post("/manage-user-permission", userperm.manageUserPermission);
  router.delete("/delete-user-permission", userperm.deleteUserPermission);
  // REMOVED UNUSED: router.get("/get-alluser-permission", userperm.getAllUserPermission);


  // Main Store===================================================================================
  // REMOVED UNUSED: router.post('/list-pr', transaction.listPRAdmin);
  // REMOVED UNUSED: router.post('/one-pr', transaction.onePR);
  // REMOVED UNUSED: router.post('/approve-one-pr', transaction.approvePR);
  // REMOVED UNUSED: router.put('/delete-pr-item', transaction.deletePRItem);

  // REMOVED UNUSED: router.post('/list-pr-admin', transaction.listPR);
  // REMOVED UNUSED: router.post('/list-po', transaction.listPO);
  // REMOVED UNUSED: router.post('/list-pu', transaction.listPU);
  // REMOVED UNUSED: router.post('/list-pur', transaction.listPUR);
  // REMOVED UNUSED: router.post('/list-iss', transaction.listISS);
  // REMOVED UNUSED: router.post('/list-isr', transaction.listISR);

  // REMOVED UNUSED: router.post('/one-pr', transaction.onePR);
  // REMOVED UNUSED: router.post('/one-po', transaction.onePO);
  // REMOVED UNUSED: router.post('/one-pu', transaction.onePU);
  // REMOVED UNUSED: router.post('/one-pur', transaction.onePUR);
  // REMOVED UNUSED: router.post('/one-iss', transaction.oneISS);
  // REMOVED UNUSED: router.post('/one-isr', transaction.oneISR);

  // REMOVED UNUSED: router.post('/pr-download-pdf', transaction.PRDownloadPDF);
  // REMOVED UNUSED: router.post('/po-download-pdf', transaction.PODownloadPDF);
  // REMOVED UNUSED: router.post('/pu-download-pdf', transaction.PUDownloadPDF);
  // REMOVED UNUSED: router.post('/pur-download-pdf', transaction.PURDownloadPDF);
  // REMOVED UNUSED: router.post('/iss-download-pdf', transaction.ISSDownloadPDF);
  // REMOVED UNUSED: router.post('/isr-download-pdf', transaction.ISRDownloadPDF);

  // REMOVED UNUSED: router.post('/iss-sort-download-pdf', transaction.ISSDownloadWithoutAmtPDF);
  // REMOVED UNUSED: router.post('/iss-long-download-pdf', transaction.ISSDownloadWithAmtPDF);
  // REMOVED UNUSED: router.post('/isr-sort-download-pdf', transaction.ISRDownloadWithoutAmtPDF);
  // REMOVED UNUSED: router.post('/isr-long-download-pdf', transaction.ISRDownloadWithAmtPDF);

  // REMOVED UNUSED: router.post("/ms-stock", msStock.MSstockList);


  // PMS Stock =================================================================

  // REMOVED UNUSED: router.get("/get-stock-list", pmsStock.getStockList);
  // REMOVED UNUSED: router.post("/download-stock-list", pmsStock.downloadStockItem);
  // REMOVED UNUSED: router.post("/stock-list-xlsx", pmsStock.xlsxStockItem);

  // PMS Dashboard ========================================================

  // REMOVED UNUSED: router.post("/get-pms-dashboard", user.pmsStore);
  // REMOVED UNUSED: router.post("/get-piping-dashboard", user.pipingStore);

  // REMOVED UNUSED: router.post("/get-project-in-ex", project.getProjectIncomeExpense);
  // REMOVED UNUSED: router.post("/get-current-project-in-ex", project.getProjectCurruentMonth);
  // REMOVED UNUSED: router.post("/get-last_date-project-in-ex", project.getProjectLastDate);

  // REMOVED UNUSED: router.post("/get-request-piping", requestPiping.getRequestPiping);
  // REMOVED UNUSED: router.post("/get-request-data-to-admin-piping", requestPiping.getRequestDataInAdminPiping);
  // router.post("/get-store-request-piping", requestPiping.getStoreRequest);
  // REMOVED UNUSED: router.post("/verify-request-piping", requestPiping.verifyRequestStatus);
  // router.post("/get-store-request-item-piping", requestPiping.downloadOneRequestItem);

  // REMOVED UNUSED: router.get("/get-item-details", itemPiping.getItemDetails);

  app.use("/api/admin", router);
};
