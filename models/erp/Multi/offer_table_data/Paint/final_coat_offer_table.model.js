const mongoose = require('mongoose');
const { Schema } = mongoose;
const { Status } = require('../../../../../utils/enum');

const finalCoatOfferSchema = new Schema({
    final_coat_no: {
        type: String,
    },
    paint_system_id: {
        type: Schema.Types.ObjectId,
        ref: 'painting-system',
        default: null
    },
    items: {
        type: [{
            drawing_id: {
                type: Schema.Types.ObjectId,
                ref: 'erp-planner-drawing',
                required: false,
            },
            grid_id: {
                type: Schema.Types.ObjectId,
                ref: 'erp-drawing-grid',
                required: false,
            },
            dispatch_id: {
                type: Schema.Types.ObjectId,
                ref: 'multi-erp-painting-dispatch-notes',
                required: false,
            },
            main_id: {
                type: Schema.Types.ObjectId,
                ref: 'multi-erp-mio-inspections',
                required: false,
            },
            item_name:{
                    type:String,
                    required:false
                },
            drawing_no:{
                    type:String,
                    required:false
                },
            grid_no:{
                    type:String,
                    required: false
                },
            dispatch_no:{
                     type:String,
                    required: false
                },
            fc_balance_grid_qty: {
                type: Number,
                default: 0
            },
            fc_used_grid_qty: {
                type: Number,
                default: 0
            },

               unit_assembly_weight: {
                    type: Number,
                    default: 0
                },
            total_assembly_weight: {
                    type: Number,
                    default: 0
                },
            moved_next_step: {
                type: Number,
                default: 0
            },
            remarks: {
                type: String,
            },
        }],
    },
}, { timestamps: true });

module.exports = mongoose.model('multi-erp-final-coat-offer', finalCoatOfferSchema);
