const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
    {
        review: {
            type: String,
            required: [true, 'Review cannot be empty'],
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
        },
        createdAt: {
            type: Date,
            default: Date.now(),
            select: false,
        },
        tour: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tour',
            required: [true, 'Review must have a tour'],
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Review must have a user'],
        },
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Make each combination of tour and user unique to prevent
// duplicate reviews
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
    // this.populate({
    //     path: 'tour',
    //     select: 'name',
    // }).populate({
    //     path: 'user',
    //     select: 'name photo',
    // });

    this.populate({
        path: 'user',
        select: 'name photo',
    });
    next();
});

// Static method that calculates the ratings average and ratings quantity
// for a tour when a review on that tour is created using the aggregation pipeline
reviewSchema.statics.calcAverageRatings = async function (tourId) {
    // Use the aggregate pipeline to add stages for the function
    const statistics = await this.aggregate([
        // first stage: select the tour to update
        {
            $match: { tour: tourId },
        },
        //second stage, calculate statistics
        {
            $group: {
                _id: '$tour',
                numberOfRatings: { $sum: 1 },
                averageRating: { $avg: '$rating' },
            },
        },
    ]);
    // console.log(statistics);

    if (statistics.length > 0) {
        // Persist the calculation into the DB
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: statistics[0].numberOfRatings,
            ratingsAverage: statistics[0].averageRating,
        });
    } else {
        await Tour.findByIdAndUpdate(tourId, {
            // Go back to the default
            ratingsQuantity: 0,
            ratingsAverage: 4.5,
        });
    }
};

// Use the static method in a post 'save' document middleware
// there is no next for post middleware
reviewSchema.post('save', function () {
    // "this" points to the current review document to make it point to the Review model
    // we use the constructor property.
    this.constructor.calcAverageRatings(this.tour);
});

// findByIdAnd is a shorthand for findOneAnd
// We use query middleware with a regular expression
// reviewSchema.pre(/^findOneAnd/, async function (next) {
//     // "this" points to the current query, we have to execute the query and get the document
//     // so we can use it, we use clone() because the same query is executed twice, first in the
//     // middleware then in the factory handler updateOne in the controller.
//     // Add review property to document so we can access the tourId later
//     this.rev = await this.clone();
//     next();
// });

// After the review is updated or deleted is when we call the calcAverageRatings function
// We don't need a pre middleware since we can access the document in the post query middleware
reviewSchema.post(/^findOneAnd/, async doc => {
    // this.review will be the document and we need the Model to run the function
    if (doc) {
        await doc.constructor.calcAverageRatings(doc.tour);
    }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
