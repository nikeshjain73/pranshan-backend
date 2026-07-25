const mongoose = require('mongoose');
const { Schema } = mongoose;
const { Status } = require('../../../../../utils/enumpiping');

const stockFinalCoatOfferSchema = new Schema({
    project_id: {
        type: Schema.Types.ObjectId,
        ref: 'piping-project',
        required: false,
    },
    final_coat_no: {
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
                required: true,
            },
           
            item_name:{
                type:String,
                required:false
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
            mio_id: {
                type: Schema.Types.ObjectId,
                ref: 'multi-piping-stock-mio-inspections',
                required: true,
            }, 
            piping_class: {
                type: Schema.Types.ObjectId,
                ref: 'piping-class-request',
                required: false,
            },
            qty: {
                type: Number,
                default: 0
            },
            fc_balance_qty: {
                type: Number,
                default: 0
            },
            fc_used_qty: {
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

module.exports = mongoose.model('multi-piping-stock-final-coat-offer', stockFinalCoatOfferSchema);
