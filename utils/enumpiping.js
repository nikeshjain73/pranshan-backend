const Status = {
  Pending: 1,
  Approved: 2,
  Rejected: 3,
  Completed: 4,
  Delivered: 5,
  Cancelled: 6,
  Partially: 7,
  NotApplicable: 8,
};

const StatusPiping = {
   Pending: 1,
  Completed: 2,
  Rejected: 3,
  Partially: 4,
};

const NDTStatus = {
  Pending: 1,
  Offered: 2,
  Completed: 3,
  Rejected: 4,
  Partially: 5,
  Merged: 6
}
const PWHTStatus = {
  Pending: 1,
  Completed: 2,
  Rejected: 3,
  Partially: 4,
  
}
const LPTStatus = {
  Pending: 1,
  Completed: 2,
  Rejected: 3,
  Partially: 4,
  
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
  paintSystemNo: 'VEPL/PROJECT/PIP/PS/',
  materialOfferNo: 'VEPL/PROJECT/PIP/INWARD/OFFER/',
  imirno: 'VEPL/PROJECT/PIP/IMIR/',
  issueReqNo: 'VEPL/PROJECT/PIP/MIR/',
  issueAcceptNo: 'VEPL/PROJECT/PIP/MIA/',
  issueReturnNo: 'VEPL/PROJECT/PIP/MIR-RETURN/',
  issueReturnAcceptNo: 'VEPL/PROJECT/PIP/MIA-RETURN/',
  stockIssueReqNo: 'VEPL/PROJECT/PIP/STOCK-MIR/',
  stockIssueAcceptNo: 'VEPL/PROJECT/PIP/STOCK-MIA/',
  fitupOffer: 'VEPL/PROJECT/PIP/FIT_UP/OFFER/',
  fitupReport: 'VEPL/PROJECT/PIP/FIT_UP/',
  rootDptOffer: 'VEPL/PROJECT/PIP/ROOT_DPT/OFFER/',
  rootDptReport: 'VEPL/PROJECT/PIP/ROOT_DPT/',
  weldVisual: 'VEPL/PROJECT/PIP/WV/OFFER/',
  weldVisualReport: 'VEPL/PROJECT/PIP/WV/',
  ndtVoucher: 'VEPL/PROJECT/PIP/NDT/',
  PWHTNDTOFFER:'VEPL/PROJECT/PIP/PWHT/OFFER/',
  PWHTNDTREPORT:'VEPL/PROJECT/PIP/PWHT/',
  IMIRNO: 'VEPL/PROJECT/PIP/IMIR/OFFER/',
  UTOFFERNO: 'VEPL/PROJECT/PIP/UT/OFFER/',
  RTOFFERNO: 'VEPL/PROJECT/PIP/RT/OFFER/',
  MPTOFFERNO: 'VEPL/PROJECT/PIP/MPT/OFFER/',
  LPTOFFERNO: 'VEPL/PROJECT/PIP/LPT/OFFER/',
  RTLOTNO: 'VEPL/PROJECT/PIP/RT/LOT-',
  MPTLOTNO: 'VEPL/PROJECT/PIP/MPT/LOT-',
  LPTLOTNO: 'VEPL/PROJECT/PIP/LPT/LOT-',
  UTINSPECTNO: 'VEPL/PROJECT/PIP/UT/OFFER/',
  FTINSPECTNO: 'VEPL/PROJECT/PIP/FT/OFFER/',
  FTINSPECTNOTWO: 'VEPL/PROJECT/PIP/FT/',
  HTINSPECTNO: 'VEPL/PROJECT/PIP/HT/OFFER/',
  HTINSPECTNOTWO: 'VEPL/PROJECT/PIP/HT/',
  PMIINSPECTNO: 'VEPL/PROJECT/PIP/PMI/OFFER/',
  PMIINSPECTNOTWO: 'VEPL/PROJECT/PIP/PMI/',
  PICKLINGTESTOFFERNO: 'VEPL/PROJECT/PIP/PICKLING/OFFER/',
  PICKLINGTESTINSPECTNO: 'VEPL/PROJECT/PIP/PICKLING/',
  RTINSPECTNO: 'VEPL/PROJECT/PIP/RT/',
  MPTINSPECTNO: 'VEPL/PROJECT/PIP/MPT/',
  LPTINSPECTNO: 'VEPL/PROJECT/PIP/LPT/',
  NDTINSPECTNO: 'VEPL/PROJECT/PIP/NDT/',
  FDOFFERNO: 'VEPL/PROJECT/PIP/FD/OFFER/',
  FDINSPECTNO: 'VEPL/PROJECT/PIP/FD/',
  PRESSURETEST: 'VEPL/PROJECT/PIP/PT/',
  INSPECTSUMMARY: 'VEPL/PROJECT/PIP/ISR/',
  DISPATCHLOTNO: 'VEPL/PROJECT/PIP/DNP/',
  STOCKDISPATCHLOTNO: 'VEPL/PROJECT/PIP/STOCK-DNP/',
  SURFACEOFFERNO: 'VEPL/PROJECT/PIP/SP/OFFER/',
  SURFACEINSPECTNO: 'VEPL/PROJECT/PIP/SP/',
  MIOOFFERNO: 'VEPL/PROJECT/PIP/MIO/OFFER/',
  MIOINSPECTNO: 'VEPL/PROJECT/PIP/MIO/',
  FINALCOATOFFERNO: 'VEPL/PROJECT/PIP/FINAL-PAINT/OFFER/',
  FINALCOATINSPECTNO: 'VEPL/PROJECT/PIP/FINAL-PAINT/',
  STOCKSURFACEOFFERNO: 'VEPL/PROJECT/PIP/STOCK-SP/OFFER/',
  STOCKSURFACEINSPECTNO: 'VEPL/PROJECT/PIP/STOCK-SP/',
  STOCKMIOOFFERNO: 'VEPL/PROJECT/PIP/STOCK-MIO/OFFER/',
  STOCKMIOINSPECTNO: 'VEPL/PROJECT/PIP/STOCK-MIO/',
  STOCKFINALCOATOFFERNO: 'VEPL/PROJECT/PIP/STOCK-FINAL-PAINT/OFFER/',
  STOCKFINALCOATINSPECTNO: 'VEPL/PROJECT/PIP/STOCK-FINAL-PAINT/',
  IRNREPORTNO: 'VEPL/PROJECT/PIP/IRN/',
  STOCKIRNREPORTNO: 'VEPL/PROJECT/PIP/STOCK-IRN/',
  PACKINGNO: 'VEPL/PROJECT/PIP/PACKING/',
  STOCKPACKINGNO: 'VEPL/PROJECT/PIP/STOCK-PACKING/',
  FIMIMIRNO: 'VEPL/PROJECT/PIP/FIM/IMIR/',
  FIMOFFERNO: 'VEPL/PROJECT/PIP/FIM/INWARD/OFFER/',
  FIMREPORTNO: 'VEPL/PROJECT/PIP/FIM/',
  MTONO: 'VEPL/PROJECT/PIP/MTO/',
  PRNO: "VEPL/PROJECT/PIP/PR/",
  INQUIRYNO: 'VEPL/PROJECT/PIP/INQ/',
  LHSREPORTNO: 'VEPL/PROJECT/PIP/LHS/',
  SPOOLBREAKUPVOUCHERNO: 'VEPL/PROJECT/PIP/SPOOLBREAKUP/',

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
  Status, StatusPiping, LPTStatus, NDTStatus,PWHTStatus, PaintStatus, StoreTypes, OrderTypes, DrawType, MonthCount, TitleFormat, EarningRates,
  PERMISSION_TYPE
};
