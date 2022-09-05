const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

// These functions receives the model and returns the catchAsync function
// generalizing the functionality for all the methods (POST, GET, PATCH)

exports.deleteOne = Model =>
    catchAsync(async (req, res, next) => {
        const doc = await Model.findByIdAndDelete(req.params.id);

        if (!doc) {
            return next(new AppError('No document found with that ID', 404));
        }

        res.status(204).json({
            status: 'success',
            data: null,
        });
    });

// Don't attempt to update passwords with this function
// because it's not using SAVE or CREATE
exports.updateOne = Model =>
    catchAsync(async (req, res, next) => {
        const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
            // returns the newly updated document
            new: true,
            runValidators: true,
            context: 'query',
        });

        if (!doc) {
            next(new AppError('No document found with that ID', 404));
            return;
        }

        res.status(200).json({
            status: 'success',
            data: {
                data: doc,
            },
        });
    });

// We add the next parameter to the function so the wrapper
// catchAsync works
exports.createOne = Model =>
    catchAsync(async (req, res, next) => {
        // Create the Document, calling the create
        // method on the model itself
        const doc = await Model.create(req.body);

        res.status(201).json({
            status: 'success',
            data: {
                data: doc,
            },
        });
    });

exports.getOne = (Model, populateOptions) =>
    catchAsync(async (req, res, next) => {
        // Same as: Model.findOne({_id: req.params.id});
        let query = Model.findById(req.params.id);

        if (populateOptions) {
            query = query.populate(populateOptions);
        }

        const doc = await query;

        // Check if there was no doc
        if (!doc) {
            // Call next with a new AppError instance
            next(new AppError('No document found with that ID', 404));
            // Finish the rest of the execution
            return;
        }

        res.status(200).json({
            status: 'success',
            data: {
                data: doc,
            },
        });
    });

exports.getAll = Model =>
    catchAsync(async (req, res, next) => {
        // Check if there's a tourId param and build the filter object
        // To allow for nested GET reviews on tour (hack)
        let filterObj = {};
        if (req.params.tourId) {
            filterObj = {
                tour: req.params.tourId,
            };
        }
        const features = new APIFeatures(Model.find(filterObj), req.query)
            .filter()
            .sort()
            .limitFields()
            .paginate();

        // await the query property of the features instance
        // which is a Mongoose query object after running the methods
        // The explain() method returns a document with the query plan and, optionally, the execution statistics.
        // const docs = await features.query.explain();
        const docs = await features.query;

        res.status(200).json({
            status: 'success',
            results: docs.length,
            data: {
                data: docs,
            },
        });
    });
