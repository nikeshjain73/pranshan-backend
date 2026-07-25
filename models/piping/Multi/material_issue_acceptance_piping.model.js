const mongoose = require('mongoose');
// const { Status } = require('../../../utils/enum');
const { Status } = require('../../../utils/enumpiping');
const { Schema } = mongoose;

const issueAcceptancePiping = new Schema({
    issue_accept_no: {
        type: String,
    },
    project:{
        type:Schema.Types.ObjectId,
        ref:'bussiness-projects',
        // required:true
    },
    issue_req_id: {
        type: Schema.Types.ObjectId,
        ref: 'material-drawing-issue-request-piping',
        required: true,
    },
     project_id:{
                   type: Schema.Types.ObjectId,
                  ref: "bussiness-projects",
                  required: true,
                },
     isFitUp: {
        type: Boolean, // for true direct send to fitup and false follow all steps
        default: false
    },
    isPainting: {
        type: Boolean, // for true direct send to Painting and false follow all steps
         default: false
    },
    isDispatch: {
        type: Boolean, // for true direct send to dispatch and false follow all steps
         default: false
    },    
    items: {
        type: [{
             
            drawing_id: {
                type: Schema.Types.ObjectId,
                ref: "piping-drawing",
                required: true
            },
            material_item_id: {
                type: Schema.Types.ObjectId,
                ref: "piping-drawing-material-items",
            },
            item_id: {
                type: Schema.Types.ObjectId,
                ref: "piping-items",
                required: true,
            },        
            issued_required_qty: {
                type: Number,
                default: 0,
            },
            issued_extra_qty: {
                type: Number,
                default: 0,
            },
            issued_total_requested_qty: {
                type: Number,
                default: 0,
            }, 
            // issued_qty:{
            //      type: Number,
            //     default: 0,
            // },        
            imir_no: {
                type: [String],
                default: '',
            },
            heat_no: {
                type: [String],
                default: '',
            },
            iss_used_qty: {
                type: Number,
                default: 0,
            },
            iss_balance_qty: {
                type: Number,
                default: 0,
            },
            moved_next_step: {
                type: Number,
                default: 0,
            },
            remarks: {
                type: String,
            },
            is_accepted: {
                type: Boolean,
                default: false,
            },
            is_added_for_dispatch: {
                type: Boolean,
                default: false,
            },
            is_added_fit_up: {
                type: Boolean,
                default: false,
            },
            isAddedpaintingDispatch: {
                type: Boolean, // for true direct send to dispatch and false follow all steps
                default: false
            },
            isGenerateDispatch: {
                type: Boolean, // for true direct send to dispatch and false follow all steps
                default: false
            }
        }],
    },
    is_generate_fit_up: {
                type: Boolean,
                default: false,
            },
    issued_by: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    status: {
        type: Number,
        default: Status.Pending,  // 1-Pending  4-Completed // 3 rejected
    },
        isDispatchgenerated: {
        type: Boolean,
        default: false,
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

module.exports = mongoose.model('material-drawing-issue-acceptance-piping', issueAcceptancePiping);