const mongoose = require('mongoose');
const { Schema } = mongoose;
const { Status, PaintStatus } = require('../../../utils/enum');

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
    final_date: {
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
    paint_system_id: {
        type: Schema.Types.ObjectId,
        ref: 'piping-painting-system',
        required:true
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
                // required: true
            },
            mio_id: {
                type: Schema.Types.ObjectId,
                ref: 'multi-piping-stock-mio-inspections',
                required: true,
            }, 
            piping_class: {
                type: Schema.Types.ObjectId,
                ref: 'piping-class-request',
                required: true,
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
            service_id: {
                type: Schema.Types.ObjectId,
                ref: 'piping_painting_requirements',
                // default: true
            },
            // Inspection properties
            average_dft_final_coat: {
                type: String,
                default: '',
            },
            is_accepted: {
                type: Number,
                default: 1              //  1- Blank , 2- Acc, 3- Rej
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
    deleted: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

module.exports = mongoose.model('multi-piping-stock-final-coat-inspection', multiMioSchema);
