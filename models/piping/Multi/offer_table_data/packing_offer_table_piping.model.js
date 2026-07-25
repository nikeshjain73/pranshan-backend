const mongoose = require('mongoose');
const { Schema } = mongoose;


const PackingOfferSchema = new Schema(
  {
    packing_no: {
      type: Number,
    },
    project_id: {
      type: Schema.Types.ObjectId,
      ref: "bussiness-project"
    },
    items: {
      type: [
        {
          issue_acceptance_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-issue-acceptance",
            required: false,
          },
          fd_inspection_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-fd-inspection",
            required: false,
          },
          pressure_test_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-pressure-test-inspection",
            required: false,
          },
          drawing_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-drawings",
            required: false,
          },
          spool_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-drawing-spool-no-joint-items",
            required: false,
          },
          item_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-items",
            required: false,
          },
          piping_material_Specfication_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-material-specifications",
            required: false,
          },
          irn_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-erp-ins-release-note",
            required: false,
          },
          drawing_no: {
            type: String,
            required: false,
          },
          irn_no: {
            type: String,
            required: false,
          },
          imir_no: [{
            type: String,
            required: false,
          }],
          rn_balance_grid_qty: {
            type: Number,
            default: 0,
          },
          rn_used_grid_qty: {
            type: Number,
            default: 0,
          },
          packaged_qty: {
            type: Number,
            default: 0,
          },
          moved_next_step: {
            type: Number,
            default: 0,
          },
          isManual: {
            type: Boolean,
            default: false,
          },
          remarks: {
            type: String,
          },
        },
      ],
    },
  },
  { timestamps: true }
);


module.exports = mongoose.model('piping-erp-packing-offer', PackingOfferSchema);