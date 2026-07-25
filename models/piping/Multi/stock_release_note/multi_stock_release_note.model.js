const mongoose = require('mongoose');
const { Schema } = mongoose;


const multiStockIRNSchema = new Schema({
    report_no: {
        type: String,
        default: null,
    },
    project_id:{
        type: Schema.Types.ObjectId,
        ref: 'bussiness-projects',

    },
    items: {
        type: [
            {
               
                item_id:{
                    type: Schema.Types.ObjectId,
                    ref:'piping-items',
                    required: true,
                },
              
                is_qty: {
                    type: Number,
                    required: true,
                },
                moved_next_step: {
                    type: Number,
                    default: 0
                },
              
                surface_report: [
                    {
                        type: String,
                        default: null,
                    }
                ],
                mio_report: [
                    {
                        type: String,
                        default: null,
                    }
                ],
                final_coat_report: [
                    {
                        type: String,
                        default: null,
                    }
                ],
                is_added_in_package:{
                    type: Boolean,
                    default: false
                }
            }
        ]
    },
    is_generate: {
        type: Boolean,
        default: false,
    },
    release_date: {
        type: Date,
    },
    batch_id: {
        type: Schema.Types.ObjectId,
        default: null,
    },
    remarks: {
        type: String,
        default: '',
    },
    prepared_by: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        default: null,
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

module.exports = mongoose.model('piping-stock-ins-release-note', multiStockIRNSchema);