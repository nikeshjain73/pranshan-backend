const mongoose = require("mongoose");
const { Schema } = mongoose;

const fimItemSchema = new mongoose.Schema(
  {
    item_category_id: { type: mongoose.Schema.Types.ObjectId, ref: "piping-item-detail-category", required: true },   // Dropdown
    item_id: { type: mongoose.Schema.Types.ObjectId, ref: "piping-items", required: true },   // Dropdown
    piping_material_specification: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "piping-material-specification",
      required: true
    },
    fim_list_qty: { type: Number, required: true }, // (Kg)
    received_qty: { type: Number, required: true },
    received_nos: { type: Number, default: 0 },
    received_length: { type: Number, default: 0 },
    received_width: { type: Number, default: 0 },
    hsn_sac: { type: String },
    rate: { type: Number },
    gst: { type: Number, required: true, },
    total_amount: { type: Number, required: true, },
    make_manufacture: [{ type: String }],

    heat_rows: [
      {
        heat_lot_no: { type: String, required: false },
        tc_no: { type: String, required: false },
        make_manufacture: { type: String },
        accepted_qty: { type: Number, default: 0 },
        rejected_qty: { type: Number, default: 0 },
        inspected_nos: { type: Number, default: 0 },
        inspected_length: { type: String, default: "--" },
        inspected_width: { type: String, default: "--" },
      }
    ],
    status: { type: Number, enum: [0, 1, 2, 3], default: 0 }, // 0: Pending, 1: Processing, 2: Accepted, 3: Rejected
    remarks: { type: String },
  },
);

const fimPackingListSchema = new mongoose.Schema(
  {
    // ---------- Main FIM (Header / Master Data) ----------
    project: { type: mongoose.Schema.Types.ObjectId, ref: "bussiness-projects", required: true },
    package_list_no: { type: String, required: true },
    package_list_date: { type: Date, default: Date.now },
    rgp_no: { type: String },
    // fim_lot_no: { type: String },
    returnable_type: {
      type: String,
      enum: ["Returnable", "Non-Returnable"],
      required: true
    },
    // eway_bill: { type: String },
    vehicle_number: { type: String },
    supplier: { type: String, required: true },
    receiving_date: { type: Date, default: Date.now },
    received_by: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    items: [fimItemSchema],
    deleted: { type: Boolean, default: false },
    status: { type: Number, enum: [0, 1, 2, 3, 4], default: "0" }, // 0: Pending, 1: Send to QC, 2: Completed, 3: Rejected
    qc_by: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    qc_timestamp: { type: Date },
    send_to_qc: { type: Boolean, default: false },
    qc_notes: { type: String },

  },
  { timestamps: true }
);

// Use module.exports for CommonJS syntax
module.exports = mongoose.model("Piping-Fim-Packing-List", fimPackingListSchema);
