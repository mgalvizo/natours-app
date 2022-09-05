const Review = require('../models/reviewModel');
const factory = require('./handlerFactory');

exports.setTourAndUserIds = (req, res, next) => {
    // Allow nested routes
    // Check if the tour id is in the body, if not get the id from the URL parameters
    if (!req.body.tour) {
        req.body.tour = req.params.tourId;
    }
    // Check if the user is in the body, if not get the user id from the protect middleware
    if (!req.body.user) {
        req.body.user = req.user.id;
    }
    next();
};

exports.getAllReviews = factory.getAll(Review);

exports.getReview = factory.getOne(Review);

exports.createReview = factory.createOne(Review);

exports.updateReview = factory.updateOne(Review);

exports.deleteReview = factory.deleteOne(Review);
