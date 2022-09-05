// Require mongoose
const mongoose = require('mongoose');
// Require slugify
const slugify = require('slugify');
// Require validator
const validator = require('validator');
// Require user
// const User = require('./userModel');

// Schema
const tourSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'A tour must have a name'],
            unique: true,
            trim: true,
            maxLength: [40, 'A tour name must have at most 40 characters'],
            minLength: [10, 'A tour name must have at least 10 characters'],
            validate: {
                validator: function (val) {
                    return validator.isAlpha(val, 'en-US', { ignore: ' ' });
                },
                message: 'A tour name must only contain letters',
            },
        },
        slug: { type: String },
        duration: {
            type: Number,
            required: [true, 'A tour must have a duration'],
        },
        maxGroupSize: {
            type: Number,
            required: [true, 'A tour must have a group size'],
        },
        difficulty: {
            type: String,
            required: [true, 'A tour must have a difficulty'],
            enum: {
                values: ['easy', 'medium', 'difficult'],
                message: 'Available options: easy, medium, difficult',
            },
        },
        ratingsAverage: {
            type: Number,
            default: 4.5,
            min: [1, 'Rating must be at least 1.0'],
            max: [5, 'Rating must be at most 5.0'],
            // The function will be run when a new value is set to this field
            // Rounds the value of the ratingsAverage, example: 4.66666 -> 46.6666 -> 47 -> 4.7
            set: currentValue => Math.round(currentValue * 10) / 10,
        },
        ratingsQuantity: {
            type: Number,
            default: 0,
        },
        price: {
            type: Number,
            required: [true, 'A tour must have a price'],
        },
        priceDiscount: {
            type: Number,
            validate: {
                validator: function (val) {
                    // "this" points to current document on NEW document creation
                    // doesn't work on updates
                    return val < this.price;
                },
                message:
                    'Discount price ({VALUE}) must be below the regular price',
            },
        },
        summary: {
            type: String,
            // Removes whitespace at beginning and end of string
            trim: true,
            required: [true, 'A tour must have a summary'],
        },
        description: {
            type: String,
            trim: true,
        },
        imageCover: {
            type: String,
            required: [true, 'A tour must have a cover image'],
        },
        images: [String],
        createdAt: {
            type: Date,
            default: Date.now(),
            // Excludes field from schema useful for sensitive data like passwords
            select: false,
        },
        startDates: [Date],
        secretTour: { type: Boolean, default: false },
        startLocation: {
            // GeoJSON, to declare at least it needs to have a type {} and a coordinates [] properties.
            type: {
                type: String,
                default: 'Point', // other geometries are polygons or lines
                enum: ['Point'], // only 'Point' will be a valid option
            },
            coordinates: [Number], //longitude first and second the latitude
            address: String,
            description: String,
        },
        // embedded locations in array
        locations: [
            {
                type: {
                    type: 'String',
                    default: 'Point',
                    enum: ['Point'],
                },
                coordinates: [Number],
                address: String,
                description: String,
                day: Number,
            },
        ],
        guides: [
            // expect each array element to be a MongoDb ID, establish reference between data sets
            { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        ],
    },
    {
        // Schema options
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// 1: sort ascending, -1: sort descending
// Single index
tourSchema.index({ slug: 1 });
// Compound indexing works with only price or only average or both of them in the same query.
tourSchema.index({ price: 1, ratingsAverage: -1 });
// Add an index for the geospatial queries (geospatial index)
tourSchema.index({ startLocation: '2dsphere' });

// Virtual properties
// Use a regular function to have access to "this"
tourSchema.virtual('durationWeeks').get(function () {
    return this.duration / 7;
});

// Virtual populate
// Connect tours and reviews like child referencing but with a virtual avoiding using
// an array that could grow indefinitely
tourSchema.virtual('reviews', {
    ref: 'Review',
    // The field in the other model where the reference to the current model is stored
    // The tour field holds the tour id in the review model.
    // The name of the field of the review model.
    foreignField: 'tour',
    // The field where the tour id is stored in the current model.
    // The name of the field in the tour model
    localField: '_id',
});

// Document middleware, runs before save() and create()
// Define the sluf property in the Schema
tourSchema.pre('save', function (next) {
    this.slug = slugify(this.name, { lower: true });
    next();
});

// Document middleware that embeds the user document into the tour guides array on CREATE
// tourSchema.pre('save', async function (next) {
//     // Map an array of query promises
//     const guidesPromises = this.guides.map(async id => await User.findById(id));
//     // Override the array of ids with the documents
//     this.guides = await Promise.all(guidesPromises);
//     next();
// });

// doc is the processed document
// tourSchema.post('save', function (doc, next) {
//     console.log(doc);
//     next();
// });

// Query middleware, runs before find()
// will run for every command that starts with "find"
tourSchema.pre(/^find/, function (next) {
    this.find({ secretTour: { $ne: true } });

    this.start = Date.now();
    next();
});

// Query middleware that populates the guides field with the referenced user when using any find method
// "this" points to the current query
tourSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'guides',
        select: '-__v -passwordChangedAt',
    });
    next();
});

// post has access to all the documents that were returned by the query
// tourSchema.post(/^find/, function (docs, next) {
//     console.log(`Query took ${Date.now() - this.start} milliseconds`);
//     console.log(docs);
//     next();
// });

// Aggregation middleware, adds this stage as the first in all aggregation pipelines
// tourSchema.pre('aggregate', function (next) {
//     // Add a stage to the beginning of the pipeline
//     this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//     console.log(this.pipeline());
//     next();
// });

// Model
const Tour = mongoose.model('Tour', tourSchema);

// Export the Model
module.exports = Tour;
