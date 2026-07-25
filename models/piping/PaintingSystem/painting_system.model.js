const mongoose = require('mongoose');
const { Schema } = mongoose;

const paintingSystemSchema = new Schema({
     project:{
       type: Schema.Types.ObjectId,
      ref: 'bussiness-projects',
      required: true,
    },
    paint_system_no: {
        type: Schema.Types.ObjectId,
        ref: 'piping_painting_requirement'
    },
    voucher_no: {
        type: String,
    },
    surface_preparation: {
        type: String,
    },
    profile_requirement: {
        type: String,
    },
    salt_test: {
        type: String,
    },
    paint_manufacturer: {
        type: Schema.Types.ObjectId,
        ref: 'piping-paint-manufacture',
    },
    prime_paint: {
        type: String,
        default: '',
    },
    primer_app_method: {
        type: String,
        default: '',
    },
    primer_dft_range: {
        type: String,
        default: '',
    },
    mio_paint: {
        type: String,
        default: '',
    },
    mio_app_method: {
        type: String,
        default: '',
    },
    mio_dft_range: {
        type: String,
        default: '',
    },
    final_paint: {
        type: String,
        default: '',
    },
    final_paint_app_method: {
        type: String,
        default: '',
    },
    final_paint_dft_range: {
        type: String,
        default: '',
    },
    total_dft_requirement: {
        type: String,
        default: '',
    },
    project: {
        type: Schema.Types.ObjectId,
        ref: 'bussiness-projects',
    },
    deleted: {
        type: Boolean,
        default: false,
    },
    status: {
        type: Boolean,
        default: true,
    }
}, { timestamps: true });

module.exports = mongoose.model('piping-painting-system', paintingSystemSchema);
