const mongoose = require('mongoose');
const { Schema } = mongoose;

const itemStockSchema = new Schema({
    requestId: {
        type: Schema.Types.ObjectId,
        ref: 'erp-request',
    },
    fimId:{
        type: Schema.Types.ObjectId,
        ref: 'FimPackingList',
    },
    offerList: [{
        offerId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'erp-purchase-offer',
        },
    }],
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true })

itemStockSchema.index({requestId: 0, fimId: 0}, {unique: false});

module.exports = mongoose.model('store-itemStock', itemStockSchema);