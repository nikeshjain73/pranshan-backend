const mongoose = require('mongoose');
const { Schema } = mongoose;

const lptTestOffer = new Schema({
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

module.exports = mongoose.model('erp-lpt-test-inspection-report', lptTestOffer);