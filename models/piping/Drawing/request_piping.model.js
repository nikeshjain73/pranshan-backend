const mongoose = require('mongoose');
const { Schema } = mongoose;

const PurchaseRequestPipingSchema = new Schema({

    firm_id: {
        type: Schema.Types.ObjectId,
        ref: "firm",
        default: null
    },
    year_id: {
        type: Schema.Types.ObjectId,
        ref: "year",
        default: null
    },
    orderPlacement: {
      type: Schema.Types.ObjectId,
      ref: "piping-material-order-placement"
    },
    requestNo: {
        type: Number,
    },
    storeLocation: {
        type: Schema.Types.ObjectId,
        ref: "erp-project-location",
    },
    drawing_id: {
        type: Schema.Types.ObjectId,
        ref: "piping-drawing",
        default: null
    },
    drawingIds: [
        {
            type: Schema.Types.ObjectId,
            ref: 'piping-drawing',
        }
    ],
    project: {
        type: Schema.Types.ObjectId,
        ref: 'bussiness-projects',
    },
    department: {
        type: Schema.Types.ObjectId,
        ref: 'department',
        default: null
    },
    approvedBy: {
        type: Schema.Types.ObjectId,
        ref: "admin",
        default: null
    },
    preparedBy: {
        type: Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
    material_po_no: {
        type: String,
    },
    tag: {
        type: Number, // purchase=1, sale=2 
    },
    send_to_admin:{
            type:Boolean,
            default:false,
        },
    requestDate: {
        type: Date,
        required: true,
        default: Date.now(),
    },
    admin_approval_time: {
        type: Date,
        default: Date.now(),
    },
    status: {
        type: Number, // 1-Pending 2-Approved By Admin 3-Rejected By Admin 4-Completed // 5 all received
        default: 1,
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

module.exports = mongoose.model('piping-request', PurchaseRequestPipingSchema);