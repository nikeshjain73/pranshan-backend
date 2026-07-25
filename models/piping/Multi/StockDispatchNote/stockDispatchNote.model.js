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
                item_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping-items',
                    // required: true,
                },
                  data: {
        type: [
            {
                
                source: {
                    type: String,
                    enum: ["stock_issue_acceptance"],
                    default: "stock_issue_acceptance"
                },
                 stock_issue_accptance_id:{                      // this is issue.items._id
                    type: Schema.Types.ObjectId,
                    ref: 'stock-issue-acceptance-pipings',
                     required: true,
                },
                stock_issue_accptance_item_id:{                      // this is issue.items._id
                    type: Schema.Types.ObjectId,
                    ref: 'stock-issue-acceptance-pipings',
                     required: true,
                },
                qty: {
                    type: Number,
                    default: 0
                },
                moved_next_step: {
                    type: Number,
                    default: 0
                },
                 
            },
        ],
    },
                total_qty: {
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
                    ref: 'piping-class-request',
                    required: true,
                },
                 piping_material_specification:{
                      type: Schema.Types.ObjectId,
                    ref: 'piping-material-specifications',
                    default: null,
                     required: true,
                },
                final_coat_shade_id:{
                         type: Schema.Types.ObjectId,
                    ref: 'piping_final_coat_shades',
                    default: null,
                     required: true,
                },
                remarks: {
                    type: String,
                },
                is_added_surface: {
                    type: Boolean,
                    default: false
                },
                is_generate_surface: {
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


module.exports = mongoose.model('piping-painting-stock-dispatch-note', multiDispatcNoteSchema);