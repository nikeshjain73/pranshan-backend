const mongoose = require('mongoose');
const { Schema } = mongoose;

const lptTestOffer = new Schema({
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
            profile_size: {
                type: String,
                default: '',
            },
            item_status: {
                type: Number,  //1-Pending 2-Approved 3-Rejected
                default: 1,
            },
            observation: {
                type: String,
                default: '',
            },
            remarks: {
                type: String,
                default: '',
            },
            qc_remarks: {
                type: String,
                default: '',
            },
            is_accepted: {
                type: Boolean,
            },
            is_cover: {
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
    acceptance_code: {
        type: String,
        default: '',
    },
    surface_condition: {
        type: String,
        default: '',
    },
    surface_temperature: {
        type: String,
        default: '',
    },
    examination_stage: {
        type: String,
        default: '',
    },
    technique: {
        type: String,
        default: '',
    },
    lighting_intensity: {
        type: String,
        default: '',
    },
    lighting_equipment: {
        type: String,
        default: '',
    },
    extent_examination: {
        type: String,
        default: '',
    },
    penetrant_solvent: {
        type: {
            make: {
                type: String,
                default: '',
            },
            batch_no: {
                type: String,
                default: '',
            },
            validity: {
                type: String,
                default: '',
            },
        }
    },
    cleaner_solvent: {
        type: {
            make: {
                type: String,
                default: '',
            },
            batch_no: {
                type: String,
                default: '',
            },
            validity: {
                type: String,
                default: '',
            },
        }
    },
    developer_solvent: {
        type: {
            make: {
                type: String,
                default: '',
            },
            batch_no: {
                type: String,
                default: '',
            },
            validity: {
                type: String,
                default: '',
            },
        }
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

module.exports = mongoose.model('multi-ndt-lpt-test', lptTestOffer);