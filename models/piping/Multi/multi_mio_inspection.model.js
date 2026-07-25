const mongoose = require('mongoose');
const { Schema } = mongoose;
const { Status, PaintStatus } = require('../../../utils/enumpiping');

const multiMioSchema = new Schema({
    project_id: {
        type: Schema.Types.ObjectId,
        ref: 'bussiness-projects',
        required: true,
    },
    report_no: {
        type: String,
    },
    procedure_no: {
        type: Schema.Types.ObjectId,
        ref: 'piping_procedure_and_specification',
        required: true,
    },
    offer_date: {
        type: Date,
    },
    start_time: {
        type: String,
    },
    end_time: {
        type: String,
    },
    paint_system_id: {
        type: Schema.Types.ObjectId,
        ref: 'piping-painting-systems',
        default: null
    },  
    weather_condition: {
        type: [{
            activity_type: {
                type: String,
                default: '',
            },
            performed_date: {
                type: Date,
            },
            start_surface_temp: {
                type: String,
                default: '',
            },
            start_dew_point: {
                type: String,
                default: '',
            },
            start_relative_humidity: {
                type: String,
                default: '',
            },
            start_ambient_temp: {
                type: String,
                default: '',
            },
            finish_surface_temp: {
                type: String,
                default: '',
            },
            finish_dew_point: {
                type: String,
                default: '',
            },
            finish_relative_humidity: {
                type: String,
                default: '',
            },
            finish_ambient_temp: {
                type: String,
                default: '',
            },
        }]
    },
    mio_date: {
        type: Date,
    },
    time: {
        type: String,
        default: '',
    },
    paint_batch_base: {
        type: String,
        default: '',
    },
    manufacture_date: {
        type: Date,
        default: '',
    },
    shelf_life: {
        type: String,
        default: '',
    },
    paint_batch_hardner: {
        type: String,
        default: '',
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
            item_id: {
                type: Schema.Types.ObjectId,
                ref: 'piping-items',
                required: false,
            },
            spool_id:{
                type: Schema.Types.ObjectId,
                ref: 'piping-drawing-spool-no-joint-items',
                required: false,
                default: null
            },
            dispatch_id: {
                type: Schema.Types.ObjectId,
                ref: 'multi-piping-painting-dispatch-notes',
                required: false,
            },
            main_id: {
                type: Schema.Types.ObjectId,
                ref: 'multi-piping-surface-inspections',
                required: false,
            },          
            piping_class: {
                type: Schema.Types.ObjectId,
                ref: 'piping-class-request',
                required: false,
            },
             average_dft_mio: {
                type: String,
                default: '',
            },
            item_name:{
                    type:String,
                    required:false
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
            is_accepted: {
                type: Number,
                default: 0
            },            
            isGeneratedFinalCoat:{
                type: Boolean,
                default: false,
            },
            remarks: {
                type: String,
            },
        }],
    },
    offered_by: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    offer_notes: {
        type: String,
        default: '',
    },

    // Inspection properties
    report_no_two: {
        type: String,
    },
    qc_notes: {
        type: String,
        default: '',
    },
    qc_name: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    qc_date: {
        type: Date,
    },
    status: {
        type: Number,
        default: PaintStatus.Pending,     //1-Pending 2-Partially 3-Approved 4-Rejected
    },
    isIrn:{
        type: Boolean,
        default: false,
    },
    isMio:{
        type: Boolean,
        default: false,
    },
    isFp:{
        type: Boolean,
        default: false,
    },
    deleted: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

module.exports = mongoose.model('multi-piping-mio-inspection', multiMioSchema);
