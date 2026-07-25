const mongoose = require('mongoose');
const { Schema } = mongoose;

const mptTestOffer = new Schema({
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
        type: [{
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
            observation: {
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
    acceptance_standard: {
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
    post_cleaning: {
        type: String,
        default: '',
    },
    technique: {
        type: String,
        default: '',
    },
    magnetization: {
        type: String,
        default: '',
    },
    light_equipment: {
        type: String,
        default: '',
    },
    medium: {
        type: String,
        default: '',
    },
    lighting_intensity: {
        type: String,
        default: '',
    },
    yoke_spacing: {
        type: String,
        default: '',
    },
    particle: {
        type: String,
        default: '',
    },
    yoke_sr_no: {
        type: String,
        default: '',
    },
    yoke_make_model: {
        type: String,
        default: '',
    },
    particle_batch_no: {
        type: String,
        default: '',
    },
    contrast: {
        type: String,
        default: '',
    },
    contrast_batch_no: {
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
            id: {
                type: Schema.Types.ObjectId,
                ref: 'erp-weld-inspection-offer',
            }
        }
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

module.exports = mongoose.model('erp-mpt-test-inspection', mptTestOffer);