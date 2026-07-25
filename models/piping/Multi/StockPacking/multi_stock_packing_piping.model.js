const mongoose = require("mongoose");
const { Schema } = mongoose;

const MultiStockPackingSchema = new Schema(
  {
    voucher_no: {
      type: String,
    },
    consignment_no: {
      type: String,
      required: true,
    },
    destination: {
      type: String,
      required: true,
    },
    vehicle_no: {
      type: String,
      required: true,
    },
    driver_name: {
      type: String,
      required: true,
    },
    gst_no: {
      type: String,
      default: "",
    },
    e_way_bill_no: {
      type: String,
      default: "",
    },
    packing_date: {
      type: Date,
      default: Date.now(),
    },
    remarks: {
      type: String,
      default: "",
    },
    packed_by: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    is_invoice_generated: {
      type: Boolean,
      default: false,
    },
    project_id: {
      type: Schema.Types.ObjectId,
      ref: "bussiness-projects",
    },
    dispatch_date: {
      type: Date,
      default: null,
    },
    // physical_weight: {
    //     type: Number,
    //     default: 0,
    // },
    items: {
      type: [
        {
          item_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-items",
            required: true,
          },
          source_type: {
      type: String,
      enum: ["RELEASE_NOTE", "STOCK_ISSUE_ACCEPTANCE"],
      // required: true
    },
          items: {
            type: [
              {
                  irn_id:{
                type: Schema.Types.ObjectId,
                ref: "piping-stock-ins-release-notes", 
                required:false
            },
             irn_item_id:{
                type: Schema.Types.ObjectId,
                ref: "piping-stock-ins-release-notes", 
                required:false
            },
                stock_issue_acceptance_id: {
                  type: Schema.Types.ObjectId,
                  ref: "stock-issue-acceptance-pipings",
                  // required: true,
                },
                stock_issue_acceptance_item_id: {
                  type: Schema.Types.ObjectId,
                  ref: "stock-issue-acceptance-pipings",
                  // required: true,
                },
                  irn_no: 
                  {
                    type: String,
                    required: false,
                  },
                
                imir_no: [
                  {
                    type: String,
                    required: false,
                  },
                ],
                packaged_qty: {
                  type: Number,
                  default: 0,
                },
              },
            ],
          },
   merged_imir_no: [
                  {
                    type: String,
                    required: false,
                  },
                ],
    total_packaged_qty: {
      type: Number,
      default: 0,
    },
          rn_balance_grid_qty: {
            type: Number,
            default: 0,
          },
          rn_used_grid_qty: {
            type: Number,
            default: 0,
          },

          moved_next_step: {
            type: Number,
            default: 0,
          },
         
          is_added_spool_break_up: {
            type: Boolean,
            default: false,
          },
          remarks: {
            type: String,
            default: "",
          },
        },
      ],
    },
    is_generated_spool_break_up: {
      type: Boolean,
      default: false,
    },
  
    sum_of_meter: {
      type: Number,
      default: 0,
    },
    sum_of_nos: {
      type: Number,
      default: 0,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "piping-stock-packing-inspection",
  MultiStockPackingSchema,
);
