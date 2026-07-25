const mongoose = require('mongoose');
const { Schema } = require('mongoose');

const OfferFitupTableDataPiping = new Schema({
    report_no: {
        type: Number,
        required: true,
    },
    project_id: {
        type: Schema.Types.ObjectId,
        ref: 'business-projects',
    },
    issue_id: {
        type: Schema.Types.ObjectId,
        ref: 'material-drawing-issue-acceptance-piping',
    },
    items: {
        type: [{
               
            drawing_id: {
                type: Schema.Types.ObjectId,
                ref: "piping-drawing",
                required: true
            },
          spool_no_id:{
                type: Schema.Types.ObjectId,
                ref: "piping-drawing-spool-no-joint-items",
                required: true
            },
           joint_spool_item_id:{
     type: Schema.Types.ObjectId,
                ref: "piping-drawing-joint-items",
                required: true,
}, 
joint_type_id:{
     type: Schema.Types.ObjectId,
                ref: "piping-drawing-joint-types",
                required: true,
},
            material_item_id_1: {
                type: Schema.Types.ObjectId,
                ref: "piping-drawing-material-items",
                required: true,
            },
            item_id_1: {
                type: Schema.Types.ObjectId,
                ref: "piping-items",
                required: true,
            },
            material_item_id_2: {
                type: Schema.Types.ObjectId,
                ref: "piping-drawing-material-items",
                required: true,
            },
            item_id_2: {
                type: Schema.Types.ObjectId,
                ref: "piping-items",
                required: true,
            },
            imir_no_1:{
                  type: String,
                  default: null                
            },
            heat_no_1:{
                  type: String,
                  default: null                
            },
            imir_no_2:{
                  type: String,
                  default: null                
            },
            heat_no_2:{
                 type: String,                
                  default: null                
                },
         
            fitOff_used_qty: {
                type: Number,
                required: true,
                default: 0,
            },
            fitOff_balance_qty: {
                type: Number,
                required: true,
                default: 0,
            },
       
            // wps_no: {
            //     type: Schema.Types.ObjectId,
            //     ref: 'wps',
            // },
            moved_next_step: {
                type: Number,
                default: 0,
            },
            remarks: {
                type: String,
            },
            qc_remarks: {
                type: String,
            },
            is_accepted: {
                type: Boolean,
                default: false,
            }
        }]
    }

}, { timestamps: true });

module.exports = mongoose.model('piping-fitup-offer-table', OfferFitupTableDataPiping);