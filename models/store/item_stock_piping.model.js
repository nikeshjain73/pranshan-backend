const mongoose = require('mongoose');
const { Schema } = mongoose;

const itemStockSchema = new Schema({
    requestId: {
        type: Schema.Types.ObjectId,
        ref: 'piping-request',
    },
    fimId:{
        type: Schema.Types.ObjectId,
        ref: 'Piping-Fim-Packing-List',
    },
    offerList: [{
        offerId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'piping-purchase-offer',
        },
    }],
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true })

itemStockSchema.index({requestId: 0, fimId: 0}, {unique: false});

module.exports = mongoose.model('piping-item-Stock', itemStockSchema);