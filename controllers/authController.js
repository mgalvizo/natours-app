// Import crypto
const crypto = require('crypto');
// Import promisify from util
const { promisify } = require('util');
// Import JWT
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
// Import Email class
const Email = require('../utils/email');

const signToken = id => {
    // Create token with payload, secret and header options
    // The header will be created automatically
    // {id: id} = {id} in ES6
    const token = jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRATION,
    });

    return token;
};

const createAndSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);
    const cookieOptions = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRATION * 24 * 60 * 60 * 1000
        ), // Now + the value in the variable which is in days
        httpOnly: true, // The cookie cannot be accessed or modified in any way by the browser
    };

    // The cookie will be sent only on encrypted connection (HTTPS),
    // ONLY add the property in production environment
    if (process.env.NODE_ENV === 'production') {
        cookieOptions.secure = true;
    }

    // Create and send the name of the cookie, the cookie data and its options
    res.cookie('jwt', token, cookieOptions);

    // Remove the password only from the output
    // It will still be saved on the DB
    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user,
        },
    });
};

exports.signup = catchAsync(async (req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        photo: req.body.photo,
        role: req.body.role,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        passwordChangedAt: req.body.passwordChangedAt,
    });

    // Email url, build the url with the protocol, host and endpoint
    const url = `${req.protocol}://${req.get('host')}/currentUser`;

    // Send a welcome email
    await new Email(newUser, url).sendWelcomeEmail();

    createAndSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
    // Use destructuring to get the values from the req.body
    const { email, password } = req.body;

    // Check if email and password exist
    if (!email || !password) {
        return next(new AppError('Please input your email and password', 400));
    }

    // Check if user exists and password is correct
    // Find the user by email variable from req.body and the
    // email field in the Schema {email: email} with ES6 {email}
    // Use the +<fieldName> to include a field that in the Schema was defined as selected:false
    const user = await User.findOne({ email }).select('+password');

    // Call the instance method that is available on all user documents
    if (!user || !(await user.correctPassword(password, user.password))) {
        // 401 stands for unauthorized
        return next(new AppError('Incorrect email or password', 401));
    }

    // If everything is OK Send the token to the client
    createAndSendToken(user, 200, res);
});

// Log out the user by sending a new cookie with the same name but no token
// This overrides the cookie that it is in the browser
exports.logout = (req, res) => {
    // Same name cookie
    res.cookie('jwt', 'logged-out', {
        // Expiration of 10 seconds
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
    });

    // Send response back
    res.status(200).json({
        status: 'success',
    });
};

exports.protect = catchAsync(async (req, res, next) => {
    // Get token from the header and check if it exists
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
        // Authenticate users based on tokens sent via cookie
        token = req.cookies.jwt;
    }

    if (!token) {
        return next(new AppError('Please log in to get access', 401));
    }

    // Token verification
    // We wrap jwt.verify with promisify to keep using async
    const asyncVerify = promisify(jwt.verify);
    // We pass the token and secret
    const decoded = await asyncVerify(token, process.env.JWT_SECRET);

    // Check if user still exists with the payload id
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
        return next(
            new AppError(
                'The user of this token no longer exists. Please log in',
                401
            )
        );
    }

    // Check if user changed password after the token was issued
    // the .iat propery is the "issued at" timestamp
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(
            new AppError(
                'User recently changed the password. Please log in',
                401
            )
        );
    }
    // Grant access to protected route
    req.user = currentUser;
    // Sent variable via locals so it can be accessed through any pug template
    res.locals.user = currentUser;
    next();
});

// Middleware only for rendered pages, there won't be errors in this middleware
// For our render pages the token will be sent always via cookie
exports.isLoggedIn = catchAsync(async (req, res, next) => {
    // Get token from the header and check if it exists
    let token;

    if (req.cookies.jwt) {
        // Authenticate users based on tokens sent via cookie
        token = req.cookies.jwt;

        // Check if the user logged out
        if (token === 'logged-out') {
            return next();
        }

        // Token verification
        // We wrap jwt.verify with promisify to keep using async
        const asyncVerify = promisify(jwt.verify);
        // We pass the token and secret
        const decoded = await asyncVerify(token, process.env.JWT_SECRET);

        // Check if user still exists with the payload id
        const currentUser = await User.findById(decoded.id);

        if (!currentUser) {
            return next();
        }

        // Check if user changed password after the token was issued
        // the .iat propery is the "issued at" timestamp
        if (currentUser.changedPasswordAfter(decoded.iat)) {
            return next();
        }
        // There is a logged in user
        // Sent variable via locals so it can be accessed through any pug template
        res.locals.user = currentUser;
        return next();
    }

    // In case there is no cookie the next middleware will be called
    return next();
});

// Create a wrapper so we can pass arguments to middleware functions
exports.restrictTo =
    (...roles) =>
    // Return the middleware function
    (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError(
                    `You don't have permission to perform this action`,
                    403
                )
            );
        }
        next();
    };

exports.forgotPassword = catchAsync(async (req, res, next) => {
    // Get user based on POSTed email
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
        return next(
            new AppError('There is no user with that email address', 404)
        );
    }

    // Generate random reset token
    const resetToken = user.createPasswordResetToken();
    // Set the option so all the required data is not necessary for this save
    await user.save({ validateBeforeSave: false });

    // We need to specify a try-catch in case there is an error to reset the token and expiration
    try {
        // Send the token to user's email
        // Create the URL with the req object
        const resetURL = `${req.protocol}://${req.get(
            'host'
        )}/api/v1/users/resetPassword/${resetToken}`;

        await new Email(user, resetURL).sendPasswordReset();

        res.status(200).json({
            status: 'success',
            message: 'Token sent to email',
        });
    } catch (error) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return next(
            new AppError('There was an error sending the email, Try again', 500)
        );
    }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    // Get user based on the token
    // encrypt the token that is sent in the resetPassword URL and is also sent via email with nodemailer
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token) // the token is a parameter specified in the URL /:token
        .digest('hex');

    // Check if the token expiration date is greater than now meaning is still valid and in the future
    // If the expiration date is not valid, the query won't return a user
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });

    // If the token hasn't expired, and the user exists, set the new password
    if (!user) {
        return next(new AppError('Token is invalid or has expired', 400));
    }

    // Set the password to the one sent in the body
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    // We don't pass options to save() because we want the validations to run again
    await user.save();

    // Update the changedPasswordAt property for the current user
    // Log the user in (send the JWT)
    createAndSendToken(user, 200, res);
});

// This is only for logged in users
exports.updatePassword = catchAsync(async (req, res, next) => {
    // Get the user from the collection by the id, req user is available due
    // to protect middleware above user = req.user
    // Force the password into the output
    const user = await User.findById(req.user.id).select('+password');
    // Check if the POSTed password is correct with the correctPassword instance method
    if (
        !(await user.correctPassword(req.body.passwordCurrent, user.password))
    ) {
        return next(new AppError('Your current password is not correct', 401));
    }

    // Update the password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    // Log the user in, send JWT
    createAndSendToken(user, 201, res);
});
