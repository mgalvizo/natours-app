/* eslint-disable */
'use strict';
import axios from 'axios';
import { showAlert } from './alerts';

export const login = async (email, password) => {
    try {
        const res = await axios({
            method: 'POST',
            // Login endpoint
            url: `/api/v1/users/login`,
            // Send the data with the sames names that the endpiont expects
            data: {
                // email: email
                // password: password
                email,
                password,
            },
        });

        if (res.data.status === 'success') {
            showAlert('success', 'Logged in successfully!');
            window.setTimeout(() => {
                // After 1 second redirect to the homepage
                location.assign('/');
            }, 1000);
        }
    } catch (error) {
        // console.log(error);
        showAlert('error', error.response.data.message);
    }
};

export const logout = async () => {
    try {
        const res = await axios({
            method: 'GET',
            url: `/api/v1/users/logout`,
        });

        if (res.data.status === 'success') {
            // Force reload from the server NOT the browser's cache
            location.assign('/');
        }
    } catch (error) {
        showAlert('error', 'Error logging out');
    }
};
