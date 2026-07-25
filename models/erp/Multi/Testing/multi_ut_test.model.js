const mongoose = require('mongoose');
const { Schema } = mongoose;

const UtTestOfferSchema = new Schema({
    test_inspect_no: { 
        type: String, 
    },
    ndt_offer_no: {
        type: Schema.Types.ObjectId,
        ref: 'multi-erp-ndt-offer',
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
               // required: true,
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
            item_status: {
                type: Number,  //1-Pending 2-Approved 3-Rejected
                default: 1,
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
            },
            is_cover: {
                type: Boolean,
            },
            is_accepted: {
                type: Boolean,
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
},{timestamps: true });

module.exports = mongoose.model('multi-ndt-ut-test', UtTestOfferSchema);