const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const employeeSchema = new Schema({

    //personal
    card_no: {
        type: String,
    },
    first_name: {
        type: String,
    },
    middle_name: {
        type: String,
    },
    last_name: {
        type: String,
    },
    full_name: {
        type: String,
    },
    gender: {
        type: String,
    },
    image: {
        type: String,
        default: null
    },
    mobile_number: {
        type: Number
    },
    dob: {
        type: Date,
    },
    email: {
        type: String,
    },
    // document
    adhar_no: {
        type: Number,
        // required: true,
        unique: true,
    },
    pancard_no: {
        type: String,
        // unique: true,
    },
    pan_card_image: {
        type: String
    },
    aadhar_card_image: {
        type: String
    },

    designation: {
        type: Schema.Types.ObjectId,
        ref: 'designation',
    },
    // address
    same_address: {
        type: Boolean
    },
    address: {
        type: String,
    },
    address_two: {
        type: String
    },
    address_three: {
        type: String
    },
    state: {
        type: String
    },
    city: {
        type: String
    },
    pincode: {
        type: Number
    },
    pre_address: {
        type: String
    },
    pre_address_two: {
        type: String
    },
    pre_address_three: {
        type: String
    },
    pre_state: {
        type: String
    },
    pre_city: {
        type: String
    },
    pre_pincode: {
        type: Number
    },
    // comapany imfromation
    joining_date: {
        type: Date
    },
    leaving_date: {
        type: String
    },
    leaving_reason: {
        type: String
    },
    black_list: {
        type: Boolean
    },
    shift: {
        type: Schema.Types.ObjectId,
        ref: 'shift',
    },
    in_time: {
        type: String,
    },
    out_time: {
        type: String,
    },
    shift_two: {
        type: Schema.Types.ObjectId,
        ref: 'shift'
    },
    in_time_two: {
        type: String,
    },
    out_time_two: {
        type: String,
    },
    uan_no: {
        type: String,
    },
    holiday: {
        type: String
    },
    black_list_reason: {
        type: String,
    },
    firm_id: {
        type: Schema.Types.ObjectId,
        ref: 'firm',
    },

    // Emergency
    is_emergency: {
        type: Boolean,
        default: false,
    },
    emergency_contact_number: {
        type: Number,
    },
    emergency_contact_person: {
        type: String
    },
    emergency_person_relation: {
        type: String
    },
    emergency_person_dob: {
        type: String,
    },
    emergency_person_aadhar_number: {
        type: String
    },
    emergency_person_aadhar_photo: {
        type: String
    },
    employee_id: {
        type: String,
        unique: true,
        required: true
    },
    nationality: {
        type: String
    },
    education: {
        type: String,
    },
    emp_type: {
        type: Schema.Types.ObjectId,
        ref: 'payroll-employee-type'
    },
    skills: {
        type: Schema.Types.ObjectId,
        ref: 'payroll-skill'
    },
    esi_number: {
        type: String,
    },
    caste: {
        type: String,
    },
    height: {
        type: String,
    },
    weight: {
        type: String,
    },
    blood_group: {
        type: String,
    },
    passport_number: {
        type: String,
    },
    pf_no: {
        type: String,
    },
    married_status: {
        type: Boolean,
        default: false
    },
    other_document_imgs: {
        type: [{
            image: {
                type: String
            }
        }],
        default: []
    },
    import_id: {
        type: Number,
    },
    esic_ip: {
        type: String,
        default: ''
    },
    deleted: {
        type: Boolean,
        default: false,
    },
    status: {
        type: Boolean,
        default: true,
    },
    pan_card: {
        type: String
    },
    // aadhar_card: {
    //     type: String
    // },
    punch_machine_no: {
        type: Number,
        default: null
    }
}, { timestamps: true });

employeeSchema.index({ status: 1, deleted: 1 });
employeeSchema.index({ firm_id: 1, status: 1, deleted: 1 });

module.exports = mongoose.model('employee', employeeSchema);