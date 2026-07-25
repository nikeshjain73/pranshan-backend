const mongoose = require('mongoose');
const { Schema } = mongoose;

const UtTestOfferSchema = new Schema({
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
            disc_type: {
                type: String,
                default: '',
            },
            qc_remarks: {
                type: String,
                default: '',
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
    accept_standard: {
        type: String,
        default: '',
    },
    surface_condition: {
        type: String,
        default: '',
    },
    extent_examination: {
        type: String,
        default: '',
    },
    examination_stage: {
        type: String,
        default: '',
    },
    examination_surface: {
        type: String,
        default: '',
    },
    technique: {
        type: String,
        default: '',
    },
    basic_cal_block: {
        type: String,
        default: '',
    },
    equip_model: {
        type: String,
        default: '',
    },
    ref_block_id: {
        type: String,
        default: '',
    },
    equip_no: {
        type: String,
        default: '',
    },
    scanning_senstive_level: {
        type: String,
        default: '',
    },
    couplant: {
        type: String,
        default: '',
    },
    ref_sensitivity_level: {
        type: String,
        default: '',
    },
    search_unit_no: {
        type: String,
        default: '',
    },
    test_range: {
        type: String,
        default: '',
    },
    model: {
        type: String,
        default: '',
    },
    ref_db: {
        type: String,
        default: '',
    },
    wave_mode: {
        type: String,
        default: '',
    },
    trans_corr: {
        type: String,
        default: '',
    },
    frequency: {
        type: String,
        default: '',
    }, 
    refer_angle: {
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
},{timestamps: true });

module.exports = mongoose.model('erp-ut-test-inspection-report', UtTestOfferSchema);