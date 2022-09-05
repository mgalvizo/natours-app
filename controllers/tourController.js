// Import multer
const multer = require('multer');
// Import sharp
const sharp = require('sharp');
// Require the tour model
const Tour = require('../models/tourModel');
// Importing catchAsync
const catchAsync = require('../utils/catchAsync');
// Import factory functions
const factory = require('./handlerFactory');
// Import AppError
const AppError = require('../utils/appError');

// Store the image as a buffer in memory
const multerStorage = multer.memoryStorage();

// Filter for only image files
const multerFilter = (req, file, callback) => {
    if (file.mimetype.startsWith('image')) {
        callback(null, true);
    } else {
        callback(
            new AppError('Not an image file. Please only upload images.'),
            false
        );
    }
};

// Use multer
const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter,
});

exports.uploadTourImages = upload.fields([
    {
        // To upload only 1 image specfying the tour model field
        name: 'imageCover',
        maxCount: 1,
    },
    // To upload the 3 images specfying the tour model field
    { name: 'images', maxCount: 3 },
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
    if (!req.files.imageCover || !req.files.images) {
        return next();
    }

    // Process cover image
    // Make a property on req.body with the field name of the DB so the next() middleware
    // updates the entry in the DB
    req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
    // Get the image file from memory and apply the methods on the returned object
    await sharp(req.files.imageCover[0].buffer)
        // In resize specify the width and the height
        // 3:2 ratio
        .resize(2000, 1333)
        // Convert them always to .jpeg
        .toFormat('jpeg')
        // Specify the quality of the .jpeg file
        .jpeg({ quality: 90 })
        // Write the image into a file in our disk
        .toFile(`public/img/tours/${req.body.imageCover}`);

    // Process the other images
    // Create an images property which will be an array of image names
    req.body.images = [];
    // Loop over the images array and process each element, the final result is an array of promises
    const imagePromises = req.files.images.map(async (file, index) => {
        const filename = `tour-${req.params.id}-${Date.now()}-${
            index + 1
        }.jpeg`;

        // Get the image file from memory and apply the methods on the returned object
        await sharp(file.buffer)
            // In resize specify the width and the height
            // 3:2 ratio
            .resize(2000, 1333)
            // Convert them always to .jpeg
            .toFormat('jpeg')
            // Specify the quality of the .jpeg file
            .jpeg({ quality: 90 })
            // Write the image into a file in our disk
            .toFile(`public/img/tours/${filename}`);

        // Push the filename into the images array

        req.body.images.push(filename);
    });

    await Promise.all(imagePromises);

    next();
});

// Alias middleware
exports.aliasTopTours = (req, res, next) => {
    req.query.limit = 5;
    req.query.sort = '-ratingsAverage,price';
    req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
    next();
};

// Route Handlers
exports.getAllTours = factory.getAll(Tour);

exports.getTour = factory.getOne(Tour, { path: 'reviews' });

exports.createTour = factory.createOne(Tour);

exports.updateTour = factory.updateOne(Tour);

exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
    const stats = await Tour.aggregate([
        // array of stages
        {
            $match: { ratingsAverage: { $gte: 4.5 } },
        },
        {
            $group: {
                _id: { $toUpper: '$difficulty' },
                numTours: { $sum: 1 },
                numRatings: { $sum: 'ratingsQuantity' },
                avgRating: { $avg: '$ratingsAverage' },
                avgPrice: { $avg: '$price' },
                minPrice: { $min: '$price' },
                maxPrice: { $max: '$price' },
            },
        },
        {
            // Use the field names specified in the $group stage since
            // is the data available after that stage
            $sort: { avgPrice: 1 },
        },
    ]);

    res.status(200).json({
        status: 'success',
        stats,
    });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
    const year = Number(req.params.year);

    const plan = await Tour.aggregate([
        {
            $unwind: '$startDates',
        },
        {
            $match: {
                startDates: {
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31`),
                },
            },
        },
        {
            $group: {
                _id: { $month: '$startDates' },
                numTourStarts: { $sum: 1 },
                tours: { $push: '$name' },
            },
        },
        { $addFields: { month: '$_id' } },
        {
            $project: {
                _id: 0,
            },
        },
        { $sort: { numTourStarts: -1 } },
        { $limit: 12 },
    ]);

    res.status(200).json({
        status: 'success',
        plan,
    });
});

// Function that gets the tours that are within the radius of a sphere
// using the distance, center and unit parameters in the request
// /tours-within-radius/:distance/center/:latlng/unit/:unit
exports.getToursWithinRadius = catchAsync(async (req, res, next) => {
    // Use destructuring to get all variables
    const { distance, latlng, unit } = req.params;
    const [latitude, longitude] = latlng.split(',');
    // convert the distance to radians
    const radius = unit === 'mi' ? distance / 3958.8 : distance / 6371;

    if (!latitude || !longitude) {
        return next(
            new AppError(
                'Plase provide the latitude and longitude in the format lat,lng',
                400
            )
        );
    }

    // Geospatial query
    const tours = await Tour.find({
        startLocation: {
            $geoWithin: { $centerSphere: [[longitude, latitude], radius] },
        },
    });

    res.status(200).json({
        status: 'success',
        results: tours.length,
        data: {
            data: tours,
        },
    });
});

// Function that get the distances to all tours from a certain point
// /distances/:latlng/unit/:unit
exports.getDistances = catchAsync(async (req, res, next) => {
    // Use destructuring to get all variables
    const { latlng, unit } = req.params;
    const [latitude, longitude] = latlng.split(',');
    const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

    if (!latitude || !longitude) {
        return next(
            new AppError(
                'Plase provide the latitude and longitude in the format lat,lng',
                400
            )
        );
    }
    // Use the aggregation pipeline to do the calculations
    const distances = await Tour.aggregate([
        // $geoNear has to be always the first stage
        // It requires that one of our fields contains a geospatial index
        // If there's only one specified index $geoNear will consider it automatically (startLocation)
        // If you have multiple geospatial indexes you have to specify the keys parameter with the field
        // you want to use for the calculations.
        {
            $geoNear: {
                // The point from where the distances will be calculated
                near: {
                    type: 'Point',
                    coordinates: [Number(longitude), Number(latitude)],
                },
                // Field where the distances are going to be stored
                distanceField: 'distance',
                // Convert the distance in meters to kilometers
                distanceMultiplier: multiplier,
            },
        },
        {
            $project: {
                // Keep only this fields in the output
                distance: 1,
                name: 1,
            },
        },
    ]);

    res.status(200).json({
        status: 'success',
        data: {
            data: distances,
        },
    });
});
