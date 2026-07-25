const mongoose = require('mongoose');
const { Schema } = mongoose;
const { Status } = require('../../../../../utils/enumpiping');

const surfacePrimerOfferSchema = new Schema({
    project_id: {
        type: Schema.Types.ObjectId,
        ref: 'bussiness-projects',
        required: true,
    },
    surface_no: {
        type: String,
    },    
    paint_system_id: {
        type: Schema.Types.ObjectId,
        ref: 'piping-painting-system',
        default: null
    },
    items: {
        type: [{
            drawing_id: {
                type: Schema.Types.ObjectId,
                ref: 'piping-drawing',
                required: false,
            },            
            drawing_no:{
                type:String,
                required:false
            },
            rev:{
                type:String,
                required:false
            },
            piping_class: {
                type: Schema.Types.ObjectId,
                ref: 'piping-class-request',
                required: false,
            },
            spool_id: {
                type: Schema.Types.ObjectId,
                ref: 'piping-drawing-spool-no-joint-items',
                required: false,
            },
            main_id: {
                type: Schema.Types.ObjectId,
                ref: 'multi-piping-painting-dispatch-notes',
                required: false,
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
                default: 0
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

module.exports = mongoose.model('multi-piping-surface-offer', surfacePrimerOfferSchema);
