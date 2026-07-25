const mongoose = require('mongoose');
const { Schema } = mongoose;
const { Status } = require('../../../../../utils/enumpiping');

const stockMioOfferSchema = new Schema({
    project_id: {
        type: Schema.Types.ObjectId,
        ref: 'bussiness-projects',
        required: true,
    },
    mio_no: {
        type: Number,
    },    
    paint_system_id: {
        type: Schema.Types.ObjectId,
        ref: 'piping-painting-system',
        default: null
    },  
    items: {
        type: [{
           
            item_id: {
                type: Schema.Types.ObjectId,
                ref: 'piping-items',
                required: false,
            },
           
            dispatch_id: {
                type: Schema.Types.ObjectId,
                ref: 'piping-painting-stock-dispatch-notes',
                required: false,
            },
            surface_id: {
                type: Schema.Types.ObjectId,
                ref: 'multi-piping-stock-surface-inspections',
                required: false,
            },          
            piping_class: {
                type: Schema.Types.ObjectId,
                ref: 'piping-class-request',
                required: false,
            },
           
            dispatch_no:{
                     type:String,
                    required: false
                },
            qty: {
                type: Number,
                default: 0
            },
            mio_balance_qty: {
                type: Number,
                default: 0
            },
            mio_used_qty: {
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

module.exports = mongoose.model('multi-piping-stock-mio-offer', stockMioOfferSchema);
