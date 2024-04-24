import { auth } from './auth.js';

export const http = {
    get: async function(url) {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${await auth.getToken()}`
            }
        });

        return response;
    },

    post: async function(url, data) {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${await auth.getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        return response;
    },

    delete: async function(url) {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${await auth.getToken()}`
            }
        });

        return response;
    }
};
