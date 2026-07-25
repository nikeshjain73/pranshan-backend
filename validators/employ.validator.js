const { z } = require('zod');

const employeeSchema = z.object({
    card_no: z
        .string()
        .min(1, { message: "Card number must be at least 1 character long" })
        .max(255, { message: "Card number must not be more than 255 characters" }),
    first_name: z
        .string()
        .min(1, { message: "First name must be at least 1 character long" })
        .max(255, { message: "First name must not be more than 255 characters" })
        .optional(),
    middle_name: z
        .string()
        .min(1, { message: "Middle name must be at least 1 character long" })
        .max(255, { message: "Middle name must not be more than 255 characters" })
        .optional(),
    last_name: z
        .string()
        .min(1, { message: "Last name must be at least 1 character long" })
        .max(255, { message: "Last name must not be more than 255 characters" })
        .optional(),
    full_name: z
        .string()
        .min(1, { message: "Full name must be at least 1 character long" })
        .max(255, { message: "Full name must not be more than 255 characters" })
        .optional(),
    gender: z
        .string()
        .min(1, { message: "Gender must be at least 1 character long" })
        .max(255, { message: "Gender must not be more than 255 characters" })
        .optional(),
    image: z
        .string({ required_error: "Image is required" })
        .nullable(),
    mobile_number: z
        .number()
        .int()
        .positive({ message: "Mobile number must be a positive integer" })
        .optional(),
    dob: z
        .date()
        .nullable()
        .optional(),
    adhar_no: z
        .number()
        .int()
        .positive({ message: "Adhar number must be a positive integer" }),
    pancard_no: z
        .string()
        .min(1, { message: "Pancard number must be at least 1 character long" })
        .max(255, { message: "Pancard number must not be more than 255 characters" }),
    designation: z
        .string()
        .min(1, { message: "Designation must be at least 1 character long" })
        .max(255, { message: "Designation must not be more than 255 characters" }),
    address: z
        .string()
        .max(255, { message: "Address must not be more than 255 characters" })
        .optional(),
    address_two: z
        .string()
        .max(255, { message: "Address Two must not be more than 255 characters" })
        .optional(),
    address_three: z
        .string()
        .max(255, { message: "Address Three must not be more than 255 characters" })
        .optional(),
    state: z
        .string()
        .max(255, { message: "State must not be more than 255 characters" })
        .optional(),
    city: z
        .string()
        .max(255, { message: "City must not be more than 255 characters" })
        .optional(),
    pincode: z
        .string()
        .max(255, { message: "Pincode must not be more than 255 characters" })
        .optional(),
    salary: z
        .number()
        .positive({ message: "Salary must be a positive number" })
        .optional(),
    joining_date: z
        .date()
        .nullable()
        .optional(),
    leaving_date: z
        .date()
        .nullable()
        .optional(),
    leaving_reason: z
        .string()
        .max(255, { message: "Leaving reason must not be more than 255 characters" })
        .optional(),
    block_list: z
        .boolean()
        .optional(),
    in_time: z
        .string()
        .max(255, { message: "In time must not be more than 255 characters" })
        .optional(),
    out_time: z
        .string()
        .max(255, { message: "Out time must not be more than 255 characters" })
        .optional(),
    uan_no: z
        .string()
        .min(1, { message: "UAN number must be at least 1 character long" })
        .max(20, { message: "UAN number must not be more than 20 characters" }),
    bank_branch_name: z
        .string()
        .max(255, { message: "Bank branch name must not be more than 255 characters" })
        .optional(),
    bank_account_name: z
        .string()
        .max(255, { message: "Bank account name must not be more than 255 characters" })
        .optional(),
    bank_account_no: z
        .string()
        .max(255, { message: "Bank account number must not be more than 255 characters" })
        .optional(),
    bank_account_ifsc: z
        .string()
        .max(255, { message: "Bank account IRFC must not be more than 255 characters" })
        .optional(),
    bank_code: z
        .string()
        .max(255, { message: "Bank code must not be more than 255 characters" })
        .optional(),
    emergency_contact_number: z
        .number()
        .positive({ message: "Emergency contact number must be a positive integer" })
        .optional(),
    emergency_contact_person: z
        .string()
        .max(255, { message: "Emergency contact person must not be more than 255 characters" })
        .optional(),
    emergency_person_relation: z
        .string()
        .max(255, { message: "Emergency person relation must not be more than 255 characters" })
        .optional(),
});

module.exports = employeeSchema;
