const mongoose = require("mongoose");
const { Status } = require("../../../utils/enum");
const { Schema } = mongoose;

const PurchaseSchema = new Schema(
  {
    firm_id: {
      type: Schema.Types.ObjectId,
      ref: "firm",
    },
    year_id: {
      type: Schema.Types.ObjectId,
      ref: "year",
    },
    trans_date: {
      type: Date,
      required: true,
      default: null,
    },
    payment_date: {
      type: Date,
      default: null,
    },
    payment_days: {
      type: Number,
      default: 0,
    },
    voucher_no: {
      type: String,
      required: true,
    },
    bill_no: {
      type: String,
      default: null,
    },
    isexternal: {
      type: Boolean,
      default: false
    },
    party_id: {
      type: Schema.Types.ObjectId,
      ref: "store-parties",
      default: null,
    },
    customer_id:{
      type: Schema.Types.ObjectId,
      ref: "firms",
      default: null,
    },
    project_id: {
      type: Schema.Types.ObjectId,
      ref: "bussiness-projects",
      // required: true,
    },
    master_id: {
      type: Schema.Types.ObjectId,
      ref: "masters",
      // required: true,
      default: null,
    },
    admin_id: {
      type: Schema.Types.ObjectId,
      // required: true,
      default: null,
    },
    tag_id: {
      type: Schema.Types.ObjectId,
      ref: "tags",
      required: true,
    },
    round_amount: {
      type: Number,
      default: 0.0
    },
    pdf: {
      type: String,
      required: false,
      default: null
    },
    transport_id: {
      type: Schema.Types.ObjectId,
      ref: "store-transports",
      default: null
    },
    transport_date: {
      type: Date,
      default: null,
    },
    lr_no: {
      type: String,
      default: null,
    },
    lr_date: {
      type: Date,
      default: null,
    },
    vehical_no: {
      type: String,
      required: false,
      default: null
    },
    po_no: [
      {
        type: String,
        default: null
      }
    ],
    challan_no: {
      type: String,
      required: false,
      default: null
    },
    gate_pass_no: {
      type: Schema.Types.ObjectId,
      ref: "employees",
      default: null
    },
    receiver_name: {
      type: String,
      default: null
    },
    issue_no: {
      type: String,
      default: null
    },
    site_location: {
      type: String,
      default: null
    },
    store_location: {
      type: String,
      default: null
    },
    department: {
      type: String,
      default: null
    },
    address: {
      type: String,
      default: null,
    },
    driver_name: {
      type: String,
      default: null,
    },
    unit_location: {
      type: Schema.Types.ObjectId,
      ref: "unit-location",
      default: null,
    },
    items_details: [
      {
        from_id: {
          type: Schema.Types.ObjectId,
          ref: "ms_trans_details",
          default: null,
        },
        detail_id: {
          type: Schema.Types.ObjectId,
          ref: "ms_trans_details",
          default: null,
        },
        item_id: {
          type: Schema.Types.ObjectId,
          ref: "store-items",
          default: null,
        },
        category_id: {
          type: Schema.Types.ObjectId,
          ref: "store-item-categories",
          default: null,
        },
        pr_party: {
          type: Schema.Types.ObjectId,
          ref: "store-parties",
          default: null,
        },
        unit: { type: String, },
        item_brand: { type: String, default: "" },
        required_qty: { type: Number, default: 0.0 },
        quantity: { type: Number, default: 0.0 },     // in pr approved qty
        balance_qty: { type: Number, default: 0.0 },     // in pr approved qty
        remarks: { type: String, default: "" },
        m_code: { type: String, },
        rate: { type: Number, default: 0.0 },
        amount: { type: Number, default: 0.0 },
        discount: { type: Number, default: 0.0 },
        discount_amount: { type: Number, default: 0.0 },
        sp_discount: { type: Number, default: 0.0 },
        sp_discount_amount: { type: Number, default: 0.0 },
        taxable_amount: { type: Number, default: 0.0 },
        gst: { type: Number, default: 0.0 },
        gst_amount: { type: Number, default: 0.0 },
        total_amount: { type: Number, default: 0.0 },
        isreturn: { type: Boolean, default: false },                    //false  == non return  true  ==  return
        return_qty: { type: Number, default: 0.0 },
        status: { type: Boolean, default: true },
        deleted: { type: Boolean, default: false },
      },
    ],
    status: {
      type: Number,
      default: Status.Pending,  // 1-Pending  2-Approved
    },
    deleted: {
      type: Boolean,
      default: false,
    },
    receive_date: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ms_trans_details", PurchaseSchema);
