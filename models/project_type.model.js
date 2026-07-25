    const mongoose = require('mongoose');
    const { Schema } = mongoose;

    const ProjectTypeSchema = new Schema({
        projectTypeName: {
            type: String,
            required: true,
        },
        roles: [
            {
                type: Schema.Types.ObjectId,
                ref: 'erp-role',
                required: true,
            }
        ],
        status: {
            type: Boolean,
            default: true,
        },
        deleted: {
            type: Boolean,
            default: false,
        }
    }, { timestamps: true });

    module.exports = mongoose.model('project-type', ProjectTypeSchema);
