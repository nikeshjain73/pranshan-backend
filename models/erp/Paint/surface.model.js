const mongoose = require('mongoose');
const { Schema } = mongoose;
const { Status } = require('../../../utils/enum');

const surfacePrimerSchema = new Schema({
    voucher_no: {
        type: String,
    },
    voucher_no_two: {
        type: String,
    },
    project_id: {
        type: Schema.Types.ObjectId,
        ref: 'bussiness-projects',
        required: true,
    },
    drawing_id: {
        type: Schema.Types.ObjectId,
        ref: 'erp-planner-drawing',
        required: true,
    },
    dispatch_note: {
        type: Schema.Types.ObjectId,
        ref: 'erp-painting-dispatch-note',
        required: true,
    },
    procedure_no: {
        type: Schema.Types.ObjectId,
        ref: 'procedure_and_specification',
        required: true,
    },
    offer_date: {
        type: Date,
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
            start_dew_point:{
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
            finish_dew_point:{
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
    paint_batch_hardner: {
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
    offered_by: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    remarks: {
        type: String,
    },
    // Inspection properties
    salt_test_reading: {
        type: String,
        default: '',
    },
    actual_surface_profile: {
        type: String,
        default: '',
    },
    average_dft_primer: {
        type: String,
        default: '',
    },
    notes: {
        type: String,
        default: '',
    },
    qc_name: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    qc_status: {
        type: Boolean,
        default: false,
    },
    qc_time: {
        type: Date,
    },
    status: {
        type: Number,
        default: Status.Pending, 
    },
    deleted: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

module.exports = mongoose.model('erp-paint-surface', surfacePrimerSchema);
