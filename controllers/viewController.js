const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getOverview = catchAsync(async (req, res, next) => {
    // Get tour data from collection
    const tours = await Tour.find();
    // Build template

    // Render the template using the retrieved tour data
    // No need to specify the file extension in the template name
    res.status(200).render('overview', {
        // Pass data into the template (locals)
        title: 'All tours',
        tours,
    });
});

exports.getTour = catchAsync(async (req, res, next) => {
    // Get the data for the requested tour including reviews and guides
    const tour = await Tour.findOne({ slug: req.params.slug }).populate({
        path: 'reviews',
        fields: 'review rating user',
    });

    // Check if the tour exists
    if (!tour) {
        return next(new AppError('There is no tour with that name', 404));
    }

    // Render the template using the retrieved tour data
    res.status(200).render('tour', {
        title: `${tour.name} Tour`,
        tour,
    });
});

// No catchasync in Jonas' video code ?
// Perhaps because it is not using a query
exports.getLoginForm = catchAsync(async (req, res) => {
    res.status(200).render('login', {
        title: 'Log into your account',
    });
});

// No catchasync in Jonas' video code ?
// Perhaps because it is not using a query
exports.getAccount = catchAsync(async (req, res) => {
    res.status(200).render('account', {
        title: 'Your account',
    });
});

exports.getCurrentUserTours = catchAsync(async (req, res, next) => {
    // Find all bookings
    const bookings = await Booking.find({ user: req.user.id });
    // Get all the tour ids from the bookings
    const tourIDs = bookings.map(element => {
        return element.tour.id;
    });
    // Find the tours with the returned ids
    const tours = await Tour.find({ _id: { $in: tourIDs } });

    res.status(200).render('overview', {
        title: 'My Tours',
        tours,
    });
});

exports.updateUserData = catchAsync(async (req, res, next) => {
    // console.log(req.body)
    const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        {
            // Only add the necessary fields not the whole req.body
            name: req.body.name,
            email: req.body.email,
        },
        {
            new: true,
            runValidators: true,
        }
    );

    res.status(200).render('account', {
        title: 'Your account',
        user: updatedUser,
    });
});

exports.getCurrentUserTours;
