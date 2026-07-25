const mongoose = require('mongoose');
const { Schema } = require('mongoose');

const OfferDptTableDataPiping = new Schema({
    report_no: {
        type: Number,
        required: true,
    },
    project_id:{
       type: Schema.Types.ObjectId,
        ref: 'bussiness-projects',
    },
  
    items: {
        type: [{ 
              fitUp_id: {
        type: Schema.Types.ObjectId,
        ref: 'piping-fitup-inspection',
    },
            fitUp_item_id:{
                 type: Schema.Types.ObjectId,
                 ref: 'piping-fitup-inspection',
            },             
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
            // item_id_1: {
            //     type: Schema.Types.ObjectId,
            //     ref: "piping-items",
         
            // },
            material_item_id_2: {
                type: Schema.Types.ObjectId,
                ref: "piping-drawing-material-items",
                required: true,
            },
            // item_id_2: {
            //     type: Schema.Types.ObjectId,
            //     ref: "piping-items",
               
            // },
            wps_no:{
                type: Schema.Types.ObjectId,
                ref: 'wps',
            },                    
            welder_no: {
                type: Schema.Types.ObjectId,
                ref: 'piping_welder',
            },
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

module.exports = mongoose.model('piping-dpt-offer-table', OfferDptTableDataPiping);