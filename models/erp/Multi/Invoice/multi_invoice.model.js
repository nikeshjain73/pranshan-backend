const { mongoose } = require('mongoose')
const { Schema } = mongoose;

const MultiInvoiceSchema = new Schema({
    projectId: {
        type: Schema.Types.ObjectId,
        ref: 'bussiness-projects'
    },
    ra: {
        type: String,
    },
    invoiceNo: {
        type: String,
    },
    invoiceDate: {
        type: Date,
    },
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'firm'
    },
    isSgst: {
        type: Boolean,
    },
    isCgst: {
        type: Boolean,
    },
    items: [{
        item_no: {
            type: Number,
        },
        description: {
            type: String,
        },
        quantity: {
            type: Number,
        },
        unitRate: {
            type: Number,
        },
        poQty: {
            type: Number,
        },
        poAmount: {
            type: Number,
        },
        uptoPrevious: {
            type: Number,
        },
        thisInvoice: {
            type: Number,
        },
        cummilative: {
            type: Number,
        },
        remarks: {
            type: String,
        }
    }],
    status: {
        type: Number,
        default: 1,
    },
    totalAmount: {
        type: Number,
    },
    cgst: {
        type: Number,
    },
    sgst: {
        type: Number,
    },
    netAmount: {
        type: Number,
    }
}, { timestamps: true });

module.exports = mongoose.model('multi-erp-invoices', MultiInvoiceSchema);