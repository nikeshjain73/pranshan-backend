const mongoose = require('mongoose');
const { Schema } = mongoose;

const DispatcNoteOfferSchema = new Schema({
    project_id: {
        type: Schema.Types.ObjectId,
        ref: 'bussiness-projects',
        required: true,
    },
    dispatch_no: {
        type: Number,
    },
    items: {
        type: [
            {
                main_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'multi-erp-inspect-summaries',
                    // required: true,
                },
                drawing_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping-drawing',
                    // required: true,
                },
                drawing_no: {
                    type: String,
                    // required: true,
                },
                rev: {
                    type: String,
                    // required: true,
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
                source: {
                    type: String,
                    enum: ["issue_acceptance", "fd", "pressure_test"],
                    default: "issue_acceptance"
                },
                issue_id:{                      // this is issue.items._id
                    type: Schema.Types.ObjectId,
                    ref: 'piping-drawing-issue-acceptance',
                },
                fd_id:{                         // this is fd.items._id
                    type: Schema.Types.ObjectId,
                    ref: 'piping-fd-inspection',
                },
                pressure_test_id:{              // this is pressure_test.items._id
                    type: Schema.Types.ObjectId,
                    ref: 'piping-pressure-test',
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
                area:{
                     type: Schema.Types.ObjectId,
                    ref: 'piping-drawing-joint-items',
                },
                piping_class: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping-class-request',
                    // required: true,
                },
                service_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping_painting_requirements',
                    default: null
                },
                // paint_system: {
                //     type: Schema.Types.ObjectId,
                //     ref: 'piping-painting-system',
                //     default: null
                // },
                remarks: {
                    type: String,
                },
            },
        ],
    },
}, { timestamps: true });


module.exports = mongoose.model('multi-piping-dispatch-note-offer', DispatcNoteOfferSchema);