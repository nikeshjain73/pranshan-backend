const mongoose = require('mongoose');
const { Schema } = mongoose;

const HTTestOfferSchema = new Schema({
    project_id: {
        type: Schema.Types.ObjectId,
        ref: 'bussiness-projects',
        required: true,
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
                pwht_stage: {
                    type: String,
                },
                remarks: {
                    type: String,
                },
            },
        ],
    },
}, { timestamps: true });


module.exports = mongoose.model('multi-piping-ht-test-offer-table', HTTestOfferSchema);