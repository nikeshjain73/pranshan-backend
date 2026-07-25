const Status = {
  Pending: 1,
  Approved: 2,
  Rejected: 3,
  Completed: 4,
  Delivered: 5,
  Cancelled: 6,
  Partially: 7,
};

const NDTStatus = {
  Pending: 1,
  Offered: 2,
  Completed: 3,
  Rejected: 4,
  Partially: 5,
  Merged: 6
}

const PaintStatus = {
  Pending: 1,
  Partially: 2,
  Approved: 3,
  Rejected: 4,
}

const StoreTypes = {
  Primary: 1,
  Secondary: 2,
};

const OrderTypes = {
  "Purchase Order": 1,
  "Sale Order": 2,
};

const DrawType = {
  Pending: 0,
  Approved: 1,
  Rejected: 2,
};

const ProjectLocation = {
  "Facility-1": 1,
  "Facility-2": 2,
  "Facility-3": 3,
};

const MonthCount = {
  1: "January",
  2: "February",
  3: "March",
  4: "April",
  5: "May",
  6: "June",
  7: "July",
  8: "August",
  9: "September",
  10: "October",
  11: "November",
  12: "December",
};

const TitleFormat = {
  paintSystemNo: 'VE/PROJECT/STR/PS/',
  materialOfferNo: 'VE/PROJECT/STR/INWARD/OFFER/',
  imirno: 'VE/PROJECT/STR/IMIR/',
  issueReqNo: 'VE/PROJECT/STR/MIR/',
  issueAcceptNo: 'VE/PROJECT/STR/MIA/',
  fitupOffer: 'VE/PROJECT/STR/FIT_UP/OFFER/',
  fitupReport: 'VE/PROJECT/STR/FIT_UP/',
  weldVisual: 'VE/PROJECT/STR/WV/OFFER/',
  weldVisualReport: 'VE/PROJECT/STR/WV/',
  ndtVoucher: 'VE/PROJECT/STR/NDT/',
  IMIRNO: 'VE/PROJECT/STR/IMIR/OFFER/',
  UTOFFERNO: 'VE/PROJECT/STR/UT/OFFER/',
  RTOFFERNO: 'VE/PROJECT/STR/RT/OFFER/',
  MPTOFFERNO: 'VE/PROJECT/STR/MPT/OFFER/',
  LPTOFFERNO: 'VE/PROJECT/STR/LPT/OFFER/',
  UTINSPECTNO: 'VE/PROJECT/STR/UT/',
  RTINSPECTNO: 'VE/PROJECT/STR/RT/',
  MPTINSPECTNO: 'VE/PROJECT/STR/MPT/',
  LPTINSPECTNO: 'VE/PROJECT/STR/LPT/',
  FDOFFERNO: 'VE/PROJECT/STR/FD/OFFER/',
  FDINSPECTNO: 'VE/PROJECT/STR/FD/',
  INSPECTSUMMARY: 'VE/PROJECT/STR/ISR/',
  DISPATCHLOTNO: 'VE/PROJECT/STR/DNP/',
  SURFACEOFFERNO: 'VE/PROJECT/STR/SP/OFFER/',
  SURFACEINSPECTNO: 'VE/PROJECT/STR/SP/',
  MIOOFFERNO: 'VE/PROJECT/STR/MIO/OFFER/',
  MIOINSPECTNO: 'VE/PROJECT/STR/MIO/',
  FINALCOATOFFERNO: 'VE/PROJECT/STR/FINAL-PAINT/OFFER/',
  FINALCOATINSPECTNO: 'VE/PROJECT/STR/FINAL-PAINT/',
  IRNREPORTNO: 'VE/PROJECT/STR/IRN/',
  PACKINGNO: 'VE/PROJECT/STR/PACKING/',
  FIMIMIRNO: 'VE/PROJECT/STR/FIM/IMIR/',
  FIMOFFERNO: 'VE/PROJECT/STR/FIM/INWARD/OFFER/',
  FIMREPORTNO: 'VE/PROJECT/STR/FIM/',
  MTONO: 'VE/PROJECT/STR/MTO/',
  PRNO:"VE/PROJECT/STR/PR/",
  INQUIRYNO: 'VE/PROJECT/STR/INQ/',
}

const PERMISSION_TYPE = {
  PURCHASE_VIEW: "purchase-view",
  PURCHASE_ADD: "purchase-add",
  PURCHASE_UPDATE: "purchase-update",
  PURCHASE_DELETE: "purchase-delete",
  PURCHASE_RETURN_VIEW: "purchase-return-view",
  PURCHASE_RETURN_ADD: "purchase-return-add",
  PURCHASE_RETURN_UPDATE: "purchase-return-update",
  PURCHASE_RETURN_DELETE: "purchase-return-delete",
  ISSUE_VIEW: "issue-view",
  ISSUE_ADD: "issue-add",
  ISSUE_UPDATE: "issue-update",
  ISSUE_DELETE: "issue-delete",
  ISSUE_RETURN_VIEW: "issue-return-view",
  ISSUE_RETURN_ADD: "issue-return-add",
  ISSUE_RETURN_UPDATE: "issue-return-update",
  ISSUE_RETURN_DELETE: "issue-return-delete",
};

const EarningRates = {
  Extra: 500,
};

module.exports = {
  Status, NDTStatus, PaintStatus, StoreTypes, OrderTypes, DrawType, MonthCount, TitleFormat, EarningRates,
  PERMISSION_TYPE
};
