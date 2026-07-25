// const mongoose = require('mongoose');
// const { Schema } = mongoose;


// const firmSchema = new Schema({
//     name: {
//         type: String,
//         required: true,
//         unique: true
//     },
//     email: {
//         type: String,
//     },
//     password: {
//         type: String,
//     },
//     address: {
//         type: String,
//     },
//     address_two: {
//         type: String,
//     },
//     address_three: {
//         type: String,
//     },
//     state: {
//         type: String,
//     },
//     city: {
//         type: String
//     },
//     pincode: {
//         type: Number,
//     },
//     mobile_number: {
//         type: Number,
//     },
//     ot_type: {
//         type: String,
//     },
//     register_no: {
//         type: String,
//     },
//     image: {
//         type: String,
//         default: null,
//     },
//     gst_no: {
//         type: String,
//     },
//     // db_name: {
//     //     type: String,
//     // },
//     // db_path: {
//     //     type: String,
//     // },
//     // db_password: {
//     //     type: String,
//     // },
//     // bank_name: {
//     //     type: String,
//     // },
//     // bank_acc_no: {
//     //     type: String,
//     // },
//     // bank_ifsc: {
//     //     type: String,
//     // },
//     // bank_code: {
//     //     type: String
//     // },
//     deleted: {
//         type: Boolean,
//         default: false,
//     },
//     status: {
//         type: Boolean,
//         default: true,
//     },
// }, { timestamps: true });

// module.exports = mongoose.model('firm', firmSchema);

const mongoose = require('mongoose');
const { Schema } = mongoose;


const firmSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
    },
    password: {
        type: String,
    },
    address: {
        type: String,
    },
    address_two: {
        type: String,
    },
    address_three: {
        type: String,
    },
    state: {
        type: String,
    },
    city: {
        type: String
    },
    pincode: {
        type: Number,
    },
    mobile_number: {
        type: Number,
    },
    ot_type: {
        type: String,
    },
    register_no: {
        type: String,
    },
    image: {
        type: String,
        default: null,
    },
    gst_no: {
        type: String,
    },

    deleted: {
        type: Boolean,
        default: false,
    },
    status: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('firm', firmSchema);