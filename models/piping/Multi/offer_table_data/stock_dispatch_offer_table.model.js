const mongoose = require('mongoose');
const { Schema } = mongoose;

const StockDispatcNoteOfferSchema = new Schema({
    project_id: {
        type: Schema.Types.ObjectId,
        ref: 'bussiness-projects',
        required: true,
    },
    dispatch_no: {
        type: Number,
    },
    item_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping-items',
                    // required: true,
                },
    items: {
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
                },
                stock_issue_accptance_item_id:{                      // this is issue.items._id
                    type: Schema.Types.ObjectId,
                    ref: 'stock-issue-acceptance-pipings',
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
                area_sqm: {
                    type: Number,
                    default: 0
                },
                piping_class: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping-class-request',
                    // required: true,
                },
                service_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'piping-class-request',
                    default: null
                },
                piping_material_specification:{
                      type: Schema.Types.ObjectId,
                    ref: 'piping-material-specifications',
                    default: null
                },
                final_coat_shade_id:{
                         type: Schema.Types.ObjectId,
                    ref: 'piping_final_coat_shades',
                    default: null
                },
                total_qty: {
                    type: Number,
                    default: 0
                },
                  remarks: {
                    type: String,
                },
}, { timestamps: true });


module.exports = mongoose.model('piping-stock-dispatch-note-offer', StockDispatcNoteOfferSchema);