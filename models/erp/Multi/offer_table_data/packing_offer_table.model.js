const mongoose = require('mongoose');
const { Schema } = mongoose;


const PackingOfferSchema = new Schema({
    packing_no: {
        type: Number,
    },
    items: {
        type: [
            {
                rn_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'multi-erp-ins-release-note',
                    required: false,
                },
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
                irn_no:{
                     type:String,
                    required: false
                },
                rn_balance_grid_qty: {
                    type: Number,
                    default: 0
                },
                rn_used_grid_qty: {
                    type: Number,
                    default: 0
                },
                moved_next_step: {
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
                remarks: {
                    type: String,
                },
            },
        ],
    },
}, { timestamps: true });


module.exports = mongoose.model('multi-erp-packing-offer', PackingOfferSchema);