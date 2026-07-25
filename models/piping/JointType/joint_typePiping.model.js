const mongoose = require('mongoose');
const { Schema } = mongoose;

const jointTypePipingSchema = new Schema({
     name:{
         type: String,
         unique: true,
     },
    status: {
        type: Boolean,
        default: true,
    },
    deleted: {
        type: Boolean,
        default: false,
    }
},{timestamps: true});

module.exports = mongoose.model('piping-joint-type',jointTypePipingSchema);