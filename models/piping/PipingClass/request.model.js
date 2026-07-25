const mongoose = require('mongoose');
const { Schema } = mongoose;

const PipingClassSchema = new Schema({

    project: {
        type: Schema.Types.ObjectId,
        ref: 'bussiness-projects',
    },
    PipingClass: {
        type: String,
    },
    Items:{
        type: [{
            service: {
                type: String,
            },
            PipingMaterialSpecification: {
                type: Schema.Types.ObjectId,
                ref: 'piping-material-specification',
            }
        }],
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

module.exports = mongoose.model('piping-class-request', PipingClassSchema);