// Import multer
const multer = require('multer');
// Import sharp
const sharp = require('sharp');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

// Create storage to store the file in our file system
// const multerStorage = multer.diskStorage({
//     destination: (req, file, callback) => {
//         // First argument is specified if there is an error if not it has to be null
//         callback(null, 'public/img/users');
//     },
//     filename: (req, file, callback) => {
//         // Specify a custom filename pattern user-id-timestamp.extension
//         // File is what req.file contains
//         // Get the extension of the uploaded file
//         const fileExtension = file.mimetype.split('/')[1];
//         callback(null, `user-${req.user.id}-${Date.now()}.${fileExtension}`);
//     },
// });

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

// Create the middleware for uploading the image file
exports.uploadUserPhoto = upload.single('photo');

// Middleware that resizes the image to make them squared.
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
    // Check if there is no uploaded file
    if (!req.file) {
        return next();
    }

    // Define filename since at this point is undefined
    req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

    // Get the image file from memory and apply the methods on the returned object
    await sharp(req.file.buffer)
        // In resize specify the width and the height
        .resize(500, 500)
        // Convert them always to .jpeg
        .toFormat('jpeg')
        // Specify the quality of the .jpeg file
        .jpeg({ quality: 90 })
        // Write the image into a file in our disk
        .toFile(`public/img/users/${req.file.filename}`);

    next();
});

const filterObj = (obj, ...allowedFields) => {
    const newObj = {};
    // Loop the object by its keys
    Object.keys(obj).forEach(el => {
        // Check if the current element is in the allowedFields array and if it is
        // add it to the newObj literal
        if (allowedFields.includes(el)) {
            // Adds the key to the new object and assigns the value of the argument object
            // adds {"key": "value"}
            newObj[el] = obj[el];
        }
    });
    return newObj;
};

// /me endpoint
// This is a middleware that sets the id in params equal to the current logged in user id
exports.getCurrentUser = (req, res, next) => {
    req.params.id = req.user.id;
    next();
};

// Updates currently authenticated user
exports.updateCurrentUser = catchAsync(async (req, res, next) => {
    // Create error if user POSTs password data
    if (req.body.password || req.body.passwordConfirm) {
        return next(
            new AppError(
                'This route is not for password updates. Please use updateCurrentPassword',
                400
            )
        );
    }
    // Update user document
    // We use findByIdAndUpdate since we are not working with sensitive data like passwords
    // Return the new document in the response and run the validators for the inputted data
    // Filter the fields that are not allowed to be updated
    const filteredBody = filterObj(req.body, 'name', 'email');
    // Save the image file name to the DB into the photo property of the filtered body object
    if (req.file) {
        filteredBody.photo = req.file.filename;
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        filteredBody,
        {
            new: true,
            runValidators: true,
        }
    );

    res.status(200).json({
        status: 'success',
        data: updatedUser,
    });
});

// "Deletes" the current logged in user, this feature is typically called delete my account
// Marks the account as inactive
exports.deleteCurrentUser = catchAsync(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, { active: false });

    res.status(204).json({
        status: 'success',
        data: null,
    });
});

exports.createUser = (req, res) => {
    // 500 stands for internal server error
    res.status(500).json({
        status: 'error',
        message: 'This route is not yet implemented. Please use /signup',
    });
};

exports.getAllUsers = factory.getAll(User);

exports.getUser = factory.getOne(User);

// Don't attempt to update passwords with this function
// because it's not using SAVE or CREATE
exports.updateUser = factory.updateOne(User);

// Only the admin can delete effectively a user from the DB
// meaning not only setting the account to inactive literally
// deleting the user from the DB
exports.deleteUser = factory.deleteOne(User);
