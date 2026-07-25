const mongoose = require('mongoose');
const { Schema } = mongoose;

const FTTestInspectionSchema = new Schema({
    project_id: {
        type: Schema.Types.ObjectId,
        ref: 'bussiness-projects',
        required: true,
    },
    report_no: {
        type: String,
        required: true,
    },
    report_no_two: {
        type: String,
    },
    produre_no: {
        type: Schema.Types.ObjectId,
        ref: 'piping_procedure_and_specifications',
    },
    model_no: {
        type: String,
    },
    serial_no: {
        type: String,
    },
    make: {
        type: String,
    },
    cal_due_date: {
        type: Date,
    },
    items: {
        type: [
            {
                main_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping-weld-visual-inspection',
                },
                main_item_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping-weld-visual-inspection',
                },
                drawing_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping-drawing',
                },
                drawing_no: {
                    type: String,
                },
                rev: {
                    type: String,
                },
                spool_no: {
                    type: String,
                },
                spool_no_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping-drawing-spool-no-joint-items',
                },
                joint_no: {
                    type: String,
                },
                joint_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping-drawing-joint-items',
                },
                piping_class: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping-class-request',
                },
                service_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping_painting_requirements',
                    default: null
                },
                piping_material_specification_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping-material-specification',
                    default: null
                },
                joint_type_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping-joint-type',
                    default: null
                },
                size_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping-size',
                    default: null
                },
                thickness_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping-thickness',
                    default: null
                },
                observation_12: {
                    type: String,
                },
                observation_6: {
                    type: String,
                },
                remarks: {
                    type: String,
                },
                is_accepted: {
                    type: Boolean,
                    default: false,
                },
            },
        ],
    },
    offer_date: {
        type: Date,
    },
    offered_by: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    qc_date: {
        type: Date,
    },
    qc_by: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    status: {
        type: Number,
        default: 1,
    },
}, { timestamps: true });


module.exports = mongoose.model('multi-piping-ft-test-inspection', FTTestInspectionSchema);