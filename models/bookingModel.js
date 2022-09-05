const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    // Referencing to the tour model
    tour: {
        type: mongoose.Schema.ObjectId,
        ref: 'Tour',
        required: [true, 'Booking must have a tour'],
    },
    // Referencing to the user model
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Booking must have a user'],
    },
    price: {
        type: Number,
        require: [true, 'Booking must have a price'],
    },
    createdAt: {
        type: Date,
        default: Date.now(),
    },
    paid: {
        // To specify a paid status using the API outside of stripe
        type: Boolean,
        default: true,
    },
});

bookingSchema.pre(/^find/, function (next) {
    this.populate({ path: 'tour', select: 'name duration' }).populate({
        path: 'user',
    });
    next();
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
