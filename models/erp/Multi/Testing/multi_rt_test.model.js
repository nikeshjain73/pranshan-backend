const mongoose = require('mongoose');
const { Schema } = mongoose;

const rtTestOffer = new Schema({
    test_inspect_no: { 
        type: String, 
    },
    ndt_offer_no: {
        type: Schema.Types.ObjectId,
        ref: 'erp-ndt-offer',
        required: true,
    },
    items: {
        type:[{
            grid_item_id: {
                type: Schema.Types.ObjectId,
                ref: "erp-drawing-grid-items",
                required: true,
            },
            drawing_id: {
                type: Schema.Types.ObjectId,
                ref: "erp-planner-drawing",
                required: true,
            },
            ndt_master_id: {
                type: Schema.Types.ObjectId,
                ref: 'multi-erp-ndt-master'
            },
            offer_balance_qty: {
                type: Number,
                //required: true,
            },
            offer_used_grid_qty: {
                type: Number,
                required: true,
            },
            joint_type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: 'joint-type',
                }
            ],
            wps_no: {
                type: Schema.Types.ObjectId,
                ref: 'store-wps-master',
            },
            weldor_no: {
                type: Schema.Types.ObjectId,
                ref: 'qualified_welder_list',
                required: true,
            },
            thickness: {
                type: String,
                default: '',
            },
            profile_size: {
                type: String,
                default: '',
            },
            item_status: {
                type: Number,  //1-Pending 2-Approved 3-Rejected
                default: 1,
            },
            remarks: {
                type: String,
                default: '',
            },
            SFD: {
                type: String,
                default: '',
            },
            expo_time: {
                type: String,
                default: '',
            },
            technique: {
                type: String,
                default: '',
            },
            // segment: {
            //     type: String,
            //     default: '',
            // },
            // film_size: {
            //     type: String,
            //     default: '',
            // },
            observation:{
                type:[{
                    segment:{
                        type: String,
                        default: '',
                    },
                    film_size:{
                        type: String,
                        default: '',
                    },
                    observation:{
                        type: String,
                        default: '',
                    },
                    is_accepted_qc:{
                        type: String,
                        default: '',
                    },
                }]
            },
            qc_remarks: {
                type: String,
                default: '',
            },
            is_cover: {
                type: Boolean,
            },
            is_accepted: {
                type: Boolean,
            }
        }],
    },
    test_date: {
        type: Date,
    },
    procedure_no: {
        type: Schema.Types.ObjectId,
        ref: 'procedure_and_specification',
    },
    source: {
        type: String,
        default: '',
    },
    film_type: {
        type: String,
        default: '',
    },
    strength: {
        type: String,
        default: '',
    },
    sensitivity: {
        type: String,
        default: '',
    },
    density: {
        type: String,
        default: '',
    },
    penetrameter: {
        type: String,
        default: '',
    },
    front: {
        type: String,
        default: '',
    },
    back: {
        type: String,
        default: '',
    },
    acceptance_standard: {
        type: String,
        default: '',
    },
    status: {
        type: Number, //1-Pending 2-Offered 3-Completed 4-Rejected 5-Partially
        default: 1,
    },
    qc_name: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    qc_time: {
        type: Date,
    },
    deleted: {
        type: Boolean,
        default: false,
    }
    
},{ timestamps: true });

module.exports = mongoose.model('multi-ndt-rt-test', rtTestOffer);