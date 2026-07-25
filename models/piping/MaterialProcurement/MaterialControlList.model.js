const mongoose = require("mongoose");
const { Schema } = mongoose;

const materialControlLineNoDrawingSchema = new mongoose.Schema({
  drawings: [
    {
      drawing_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "piping-drawing",
        required: true
      },
      item_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "piping-drawing-material-items",
        required: true
      },
      qty: {
        type: Number,
        default: 0
      }
    }
  ],
  prqty: { type: Number, default: 0 },
  balanceQty: { type: Number, default: 0 },

  iso_drawing_qty: {
    type: Number,
    default: 0
  },
  contingency: {
    type: Number,
    default: 0
  },
  order_qty: {
    type: Number,
    default: 0
  },
  mto_with_contingency: {
    type: Number,
    default: 0
  },
  existing_available_qty: {
    type: Number,
    default: 0
  }
});


const materialControlClientMTOBasisItemSchema = new mongoose.Schema({
  item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "piping-items",
    required: true
  },
  client_mto_qty: { type: Number, default: 0 },
  contingency: { type: Number, default: 0 },
  mto_with_contingency: { type: Number, default: 0 },
  existing_available_qty: { type: Number, default: 0 },
  order_qty: { type: Number, default: 0 },
  prqty: { type: Number, default: 0 },
  balanceQty: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1, 2, 3], default: 0 },
  remarks: { type: String }
});


const materialControlListSchema = new mongoose.Schema(
  {
    // ---------- Main FIM (Header / Master Data) ----------
    project: { type: mongoose.Schema.Types.ObjectId, ref: "bussiness-projects", required: true },
    date: { type: Date, default: Date.now },
    material_control_chart: { 
      type: String, 
      enum: ["Drawing-Basis", "Client-MTO-Basis"], 
      required: true 
    },
    area_unit: { type: mongoose.Schema.Types.ObjectId, ref: "piping-areas", required: true  }, 
    mto_no: { type: String, unique: true },
    lineno_drawingno: [materialControlLineNoDrawingSchema],
    clientmtobasisitems: [materialControlClientMTOBasisItemSchema],
    deleted: { type: Boolean, default: false },
    status: { type: Number, enum: [0,1, 2, 3, 4], default: "0" }, // 0: Pending, 1: Send to QC, 2: Completed, 3: Rejected
    pr_by: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    pr_timestamp: { type: Date },
    send_to_pr: { type: Boolean, default: false },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  },
  { timestamps: true }
);

// Use module.exports for CommonJS syntax
module.exports = mongoose.model("Piping-Material-Controle-List", materialControlListSchema);




 