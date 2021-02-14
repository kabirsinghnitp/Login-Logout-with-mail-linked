const mongoose = require('mongoose')
const validator = require('validator')

const User = mongoose.model('User', {
    first_name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
    },
    last_name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
    },
    username: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error('Email must be valid')
            }
        }
    },
    password:  {
        type: String,
        trim: true,
        required: true,
        minlength: 7,
        validate(value) {
            if (value.toLowerCase().includes('password')) {
                throw new Error('Password is weak')
            }
        }
    },
    validation_code: {
        type: String,
        default: 0
    },
    active: {
        type: Boolean,
        default: 0
    }
})


module.exports = User