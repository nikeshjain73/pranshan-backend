const mongoose = require('mongoose');
const { Schema } = mongoose;

const multiDispatcNoteSchema = new Schema({
    project: { type: mongoose.Schema.Types.ObjectId, ref: "bussiness-projects", required: true },
    report_no: {
        type: String,
    },
    dispatch_date: {
        type: Date,
        // default: Date.now(),
    },
    dispatch_site: {
        type: String,
    },
    paint_system: {
        type: Schema.Types.ObjectId,
        ref: 'piping-painting-system',
        default: null
    },
    items: {
        type: [
            {
                drawing_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping-drawing',
                    // required: true,
                },
                drawing_no: {
                    type: String,
                    ref: 'piping-drawing',
                    // required: true,
                },
                rev: {
                    type: String,
                },
                spool_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping-drawing-spool-no-joint-items',
                    // required: true,
                },
                material_item_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping-drawing-material-items',
                },
                item_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping-items',
                    // required: true,
                },
                // dispatch_balance_qty: {
                //     type: Number,
                //     default: 0
                // },
                qty: {
                    type: Number,
                    default: 0
                },
                moved_next_step: {
                    type: Number,
                    default: 0
                },
                area_sqm: {
                    type: Number,
                    default: 0
                },
                piping_class: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping-class-request',
                    required: true,
                },
                service_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping_painting_requirements',
                    required: true,
                },
                remarks: {
                    type: String,
                },
                isAddedSurface: {
                    type: Boolean,
                    default: false
                },
                isGenerateSurfaceOffer: {
                    type: Boolean,
                    default: false
                },
            },
        ],
    },
    prepared_by: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });


module.exports = mongoose.model('multi-piping-painting-dispatch-note', multiDispatcNoteSchema);