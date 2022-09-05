/* eslint-disable */
'use strict';
import axios from 'axios';
import { showAlert } from './alerts';

// Type will be either password or data
export const updateSettings = async (data, type) => {
    try {
        const endpoint =
            type === 'password' ? 'updateCurrentPassword' : 'updateCurrentUser';

        const res = await axios({
            method: 'PATCH',
            url: `/api/v1/users/${endpoint}`,
            data,
        });

        if (res.data.status === 'success') {
            showAlert(
                'success',
                `${type[0].toUpperCase()}${type.slice(
                    1
                )} was updated successfully`
            );
        }
    } catch (error) {
        showAlert('error', error.response.data.message);
    }
};
