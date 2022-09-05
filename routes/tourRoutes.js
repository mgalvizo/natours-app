// Require express
const express = require('express');
// Import tour controllers
const tourController = require('../controllers/tourController');
// Import authController
const authController = require('../controllers/authController');
// Import reviewRouter
const reviewRouter = require('./reviewRoutes');
// Create router for tours
const router = express.Router();
// Param middleware.
// router.param('id', tourController.checkID);

// NESTED ROUTES
// Use the review router for the specific route
// If you have the pattern /tours/5c88fa8cf4afda39709c2951/reviews it will be redirected to use the reviewRouter
router.use('/:tourId/reviews', reviewRouter);

// Aliasing
router
    .route('/top-5-cheap')
    .get(tourController.aliasTopTours, tourController.getAllTours);

// Aggregation pipeline
router.route('/tour-stats').get(tourController.getTourStats);
router
    .route('/monthly-plan/:year')
    .get(
        authController.protect,
        authController.restrictTo('admin', 'lead-guide', 'guide'),
        tourController.getMonthlyPlan
    );

// Geospatial route to get tours that are within a certain radius
// Standard way to specify a URL that contains a lot of options
router
    .route('/tours-within-radius/:distance/center/:latlng/unit/:unit')
    .get(tourController.getToursWithinRadius);

// Geospatial route to get the distances to all the tours from a certain point
router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

// GET and POST
router
    .route('/')
    .get(tourController.getAllTours)
    // Add the middleware to the stack as a chain
    .post(
        authController.protect,
        authController.restrictTo('admin', 'lead-guide'),
        tourController.createTour
    );
// GET, PATCH and DELETE
router
    .route('/:id')
    .get(tourController.getTour)
    .patch(
        authController.protect,
        authController.restrictTo('admin', 'lead-guide'),
        tourController.uploadTourImages,
        tourController.resizeTourImages,
        tourController.updateTour
    )
    .delete(
        authController.protect,
        authController.restrictTo('admin', 'lead-guide'),
        tourController.deleteTour
    );

module.exports = router;
