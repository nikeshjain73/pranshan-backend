const mongoose = require("mongoose");
const { Schema } = mongoose;

const MaterialMtoSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: "bussiness-projects",
      required: true,
      trim: true,
    },
    poNumber: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    areaBuilding: { type: mongoose.Schema.Types.ObjectId, ref:"Area", required: true, trim: true },

    created: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    updated: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: false },
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    items: [
      {
        entryDate: { type: Date, required: true },
        item: {type: mongoose.Schema.Types.ObjectId, ref: "store-items", required: true, },
        gadClientQty: { type: Number, default: 0 },
        fabDrawingQty: { type: Number, default: 0 },
        contingency: { type: Number, default: 0 },
        materialRequirement: { type: Number, default: 0 },
        usableStockId: { type: mongoose.Schema.Types.ObjectId, ref: "usable-stocks"},
        usableStock: { type: Number, default: 0 },
        orderedQty: { type: Number, default: 0 },
        balanceQty: { type: Number, default: 0 },
        prqty: { type: Number, default: 0 },
        prNo: { type: String, trim: true },
        rev: { type: Number, default: 0 },
        materail_received: { type: Number, default: 0 },
        balance_to_receive: { type: Number, default: 0 },
        // status: { type: Number, enum: [0, 1, 2], default: 0 }, // 0: Pending, 1: Approved, 2: Rejected
        remarks: { type: String, trim: true },

      },
    ],
    status: { type: Number, enum: [0, 1, 3, 4], default: 0 }, // 0: MTO, 1: PR, 2: Generate Inquiry, 3: Order Placement 
  },
  { timestamps: true }
);

module.exports = mongoose.model("material-mto", MaterialMtoSchema);
