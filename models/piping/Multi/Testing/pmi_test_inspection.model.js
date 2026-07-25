const mongoose = require('mongoose');
const { Schema } = mongoose;

const PMITestInspectionSchema = new Schema({
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
        default: null,
    },
    produre_no: {
        type: Schema.Types.ObjectId,
        ref: 'piping_procedure_and_specifications',
        default: null
    },
    serial_no: {
        type: String,
        default: null,
    },
    make: {
        type: String,
        default: null,
    },
    items: {
        type: [
            {
                main_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping-weld-visual-inspection',
                    default: null
                },
                main_item_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping-weld-visual-inspection',
                    default: null
                },
                drawing_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping-drawing',
                    default: null
                },
                drawing_no: {
                    type: String,
                    default: null
                },
                rev: {
                    type: String,
                    default: null
                },
                spool_no: {
                    type: String,
                    default: null
                },
                spool_no_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping-drawing-spool-no-joint-items',
                    default: null
                },
                joint_no: {
                    type: String,
                    default: null
                },
                joint_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping-drawing-joint-items',
                    default: null
                },
                piping_class: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping-class-request',
                    default: null
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
                weld: {
                    cr: { type: String, default: null },
                    ni: { type: String, default: null },
                    mo: { type: String, default: null },
                },
                p1: {
                    cr: { type: String, default: null },
                    ni: { type: String, default: null },
                    mo: { type: String, default: null },
                },
                p2: {
                    cr: { type: String, default: null },
                    ni: { type: String, default: null },
                    mo: { type: String, default: null },
                },
                remarks: {
                    type: String,
                    default: null
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
        default: null,
    },
    offered_by: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    qc_date: {
        type: Date,
        default: null,
    },
    qc_by: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        default: null,
    },
    status: {
        type: Number,
        default: 1,
    },
}, { timestamps: true });


module.exports = mongoose.model('multi-piping-pmi-test-inspection', PMITestInspectionSchema);