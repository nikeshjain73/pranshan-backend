const mongoose = require('mongoose');
const { Schema } = mongoose;

const AdjustMentSchema = new Schema({
    order: {
        type: Schema.Types.ObjectId,
        ref: 'store-orders',
        required: true,
    },
    itemName: {
        type: Schema.Types.ObjectId,
        ref: 'store-items',
        required: true,
    },
    store_type: {
        type : Number,  // 1- Main store 2-Product store
        required: true,
    },
    balance_qty: {
        type: Number,
        required: true,
    },
    receive_qty: {
        type: Number,
    },
    tag: {
        type: Number, // 1-Purchase // 2- Sales
        required: true,
    },

    deleted: {
        type: Boolean,
        default: false,
    }

}, { timestamps: true });

module.exports = mongoose.model('order-adjustment', AdjustMentSchema);