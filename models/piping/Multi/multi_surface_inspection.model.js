const mongoose = require('mongoose');
const { Schema } = mongoose;
const { Status, PaintStatus } = require('../../../utils/enumpiping');

const surfacePrimerInspectionSchema = new Schema({
    project_id: {
        type: Schema.Types.ObjectId,
        ref: 'bussiness-projects',
        required: true,
    },
    report_no: {
        type: String,
    },
    vendor_doc_no: {
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
        ref: 'piping-painting-system',
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
    original_status: {
        type: String,
        default: '',
    },
    metal_condition: {
        type: String,
        default: '',
    },
    metal_rust_grade: {
        type: String,
        default: '',
    },
    paint_system_id: {
        type: Schema.Types.ObjectId,
        ref: 'piping-painting-system',
        default: null
    },
    blasting_date: {
        type: Date,
    },
    blasting_method: {
        type: String,
        default: '',
    },

    abrasive_type: {
        type: String,
        default: '',
    },

    dust_level: {
        type: String,
        default: '',
    },
    primer_date: {
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
            average_dft_primer: {
                type: String,
                default: '',
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
            is_accepted: {
                type: Number,
                default: 0
            },            
            isGeneratedMio:{
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
    actual_surface_profile: {
        type: String,
        default: '',
    },
    salt_test_reading: {
        type: String,
        default: '',
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
    isSurface:{
        type: Boolean,
        default: false,
    },
    deleted: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

module.exports = mongoose.model('multi-piping-surface-inspection', surfacePrimerInspectionSchema);
