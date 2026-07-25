const mongoose = require('mongoose');
const { Schema } = mongoose;

const mptTestOffer = new Schema({
    test_inspect_no: {
        type: String,
    },
    ndt_offer_no: {
        type: Schema.Types.ObjectId,
        ref: 'multi-erp-ndt-offer',
        required: true,
    },
    items: {
        type: [{
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
            observation: {
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
}, { timestamps: true });

module.exports = mongoose.model('multi-ndt-mpt-test', mptTestOffer);