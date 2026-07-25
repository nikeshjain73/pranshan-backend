const mongoose = require('mongoose');
const { Schema } = mongoose;
const { Status } = require('../../../../../utils/enumpiping');

const StockSurfacePrimerOfferSchema = new Schema({
    project_id: {
        type: Schema.Types.ObjectId,
        ref: 'bussiness-projects',
        required: true,
    },
    surface_no: {
        type: Number,
    },    
    paint_system_id: {
        type: Schema.Types.ObjectId,
        ref: 'piping-painting-system',
        default: null
    },
    items: {
        type: [{
           
            piping_class: {
                type: Schema.Types.ObjectId,
                ref: 'piping-class-request',
                required: false,
            },
            service_id: {
                type: Schema.Types.ObjectId,
                ref: 'piping-class-request',
                required: true,
            },
            piping_material_specification_id: {
                type: Schema.Types.ObjectId,
                ref: 'piping-material-specifications',
                required: true,
            },
            dispatch_id: {
                type: Schema.Types.ObjectId,
                ref: 'piping-painting-stock-dispatch-notes',
                required: true,
            },            
            dispatch_no:{
                    type:String,
                required: false
            },
            item_id: {
                type: Schema.Types.ObjectId,
                ref: 'piping-items',
                required: false,
            },
            item_name:{
                type:String,
                required:false
            },
            qty: {
                type: Number,
                required:true
            },
            surface_balance_qty: {
                type: Number,
                default: 0
            },
            surface_used_qty: {
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

module.exports = mongoose.model('piping-stock-surface-offer', StockSurfacePrimerOfferSchema);
