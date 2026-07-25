const mongoose = require("mongoose");
const { Schema } = mongoose;

// const yearStockTransferSchema = new Schema(
//   {
//     demaged_qty:{
//         type:Number,
//         default: 0.0
//     },
//     missing_qty:{
//         type:Number,
//         default: 0.0
//     },
//     total_qty:{
//         type:Number,
//         default: 0.0
//     },
//      year_id: {
//         type: Schema.Types.ObjectId,
//        ref:'years',
//       required: true,
//     },
//     items:{
//         m_code:{
//         type:String,
//       required: true,
//     },
//     item_name:{
//         type:String,
//         required: true
//     },
//     unit:{
//         type:String,
//         required: true
//     },
//     material_grade:{
//           type:String,
//         required: true
//     },
//     totalIn:{
//          type:Number,
//       required: true,
//     },
//     totalOut:{
//          type:Number,
//       required: true,
//     },
//     balance:{
//       type:Number,
//       required: true,
//     },
//     opening_balance:{
//         type:Number,
//       required: true,
//     },
//     },
//     deleted: {
//       type: Boolean,
//       default: false,
//     },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("ms_year_stock_transfer", yearStockTransferSchema);
const yearStockTransferSchema = new Schema({
  year_id: {
    type: Schema.Types.ObjectId,
    ref: 'years',
    required: true,
  },
  items: [{
    item_id:{ 
      type: Schema.Types.ObjectId,
       ref: 'ms-trans-details',
       required: true
  },
    m_code: { type: String, required: true },
    item_name: { type: String, required: true },
    unit: { type: String, required: true },
    material_grade: { type: String, required: true },
    totalIn: { type: Number, required: true },
    totalOut: { type: Number, required: true },
    balance: { type: Number, required: true },
    opening_balance: { type: Number, required: true },
    damage_qty: { type: Number, default: 0 },
    missing_qty: { type: Number, default: 0 },
    total_qty: { type: Number, default: 0 },
  }],
  deleted: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model("ms_year_stock_transfer", yearStockTransferSchema);
