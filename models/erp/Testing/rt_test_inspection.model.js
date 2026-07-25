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
    drawing_id: {
        type: Schema.Types.ObjectId,
        ref: "erp-planner-drawing",
        required: true
    },
    items: {
        type:[{
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
            transaction_id: {
                type: Schema.Types.ObjectId,
                ref: 'store_transaction_item',
                required: true,
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
            segment: {
                type: String,
                default: '',
            },
            film_size: {
                type: String,
                default: '',
            },
            observation: {
                type: String,
                default: '',
            },
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
    qc_name: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    qc_status: {
        type: Boolean,
    },
    qc_time: {
        type: Date,
    },
    final_remarks: {
        type: String,
        default: '',
    },
    return_stage: {
        type: {
            stage_name: {
                type: String,
                default: '',
            },
            id:{
                type: Schema.Types.ObjectId,
                ref: 'erp-weld-inspection-offer',
            }
        }
    },
    deleted: {
        type: Boolean,
        default: false,
    }
    
},{ timestamps: true });

module.exports = mongoose.model('erp-rt-test-inspection-report', rtTestOffer);