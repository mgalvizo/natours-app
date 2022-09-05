// Import built-in module crypto
const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please input a user name'],
    },
    email: {
        type: String,
        required: [true, 'Please input your email'],
        unique: true,
        lowercase: true,
        validate: {
            validator: function (val) {
                return validator.isEmail(val, { ignore_max_length: true });
            },
            message: 'Please input a valid email',
        },
    },
    photo: {
        type: String,
        default: 'default.jpg',
    },
    role: {
        type: String,
        enum: ['user', 'guide', 'lead-guide', 'admin'],
        default: 'user',
    },
    password: {
        type: String,
        required: [true, 'Please input a password'],
        minLength: [8, 'The password must be at least 8 characters'],
        select: false,
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password'],
        validate: {
            validator: function (pw) {
                // Validate if password and passwordConfirm match
                // Will work only on CREATE and SAVE, NOT on update
                return pw === this.password;
            },
            message: 'Passwords are not the same',
        },
    },
    passwordChangedAt: {
        type: Date,
    },
    passwordResetToken: {
        type: String,
    },
    passwordResetExpires: {
        type: Date,
    },
    active: {
        type: Boolean,
        default: true,
        select: false,
    },
});

// Create middleware to encrypt password
// Will run between receiving the data and saving it into the database
// We have to make this middleware async to use the async version of .hash()
userSchema.pre('save', async function (next) {
    // Only run the function if password is modified
    // If not continue with next()
    if (!this.isModified('password')) {
        return next();
    }
    // Hashing the password with bcryptjs use at least 12 rounds for salt
    // Use the asynchronous version of the function
    this.password = await bcrypt.hash(this.password, 14);
    // Delete the passwordConfirm field in the database
    this.passwordConfirm = undefined;
    next();
});

// Create middleware that updates the passwordChangedAt of the current user
// that is reseting the password
userSchema.pre('save', function (next) {
    // Only run the function if password is modified or the document is new
    // If not continue with next()
    if (!this.isModified('password') || this.isNew) {
        return next();
    }

    // Hacky way of making the passwordChangedAt stay in the past because
    // generating the JWT sometimes happens before setting the passwordChangedAt field.
    // Ensures the token is created after the password is changed.
    this.passwordChangedAt = Date.now() - 1000;

    next();
});

// Create query middleware so inactive accounts aren't displayed on the output
// of all find queries
userSchema.pre(/^find/, function (next) {
    // "this" points to the current query
    this.find({ active: { $ne: false } });
    next();
});

// Create instance method that will compare the input password with the
// database hashed password using bcrypt compare function
userSchema.methods.correctPassword = async function (
    candidatePassword,
    userPassword
) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

// In an instance method the "this" keyword refers to the current document
// Checks if the user changed the password based on the passwordChangedAt field
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const passwordChangedAtTimestamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10
        );
        return JWTTimestamp < passwordChangedAtTimestamp;
    }
    // False means the password wasn't changed
    return false;
};

// Instance method for the current user
userSchema.methods.createPasswordResetToken = function () {
    // Create token and convert it to hex
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Encrypt reset token with sha256 and convert it to hex
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Set the expiration to 10 minutes
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    // console.log({ resetToken }, this.passwordResetToken);

    // Return plain text token that will be sent via email
    return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
