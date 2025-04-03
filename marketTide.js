// https://testapi.webepex.com/ghostboard/dashboard/markettide/update.php
const WebSocket = require('ws');
const axios = require('axios');
const fetch = require('node-fetch');

const API_URL = 'https://phx.unusualwhales.com/api/net-flow-ticks?date=2025-04-03&grouping_minutes=1&market_day_timeframe=1';
const AUTH_TOKEN = 'NVExrWkgfLzvOnmkh0g7RM0EPKqcD7GXwLTmCZGJzCG1QFtE0Kff3UZC1czEuQbR';
const PHP_ENDPOINT = 'https://testapi.webepex.com/ghostboard/dashboard/markettide/update.php';
const WS_URL = 'wss://ws.unusualwhales.com/v2/foo/websocket?token=' + AUTH_TOKEN + '&vsn=2.0.0';

let latestCallPremium = 0;
let latestPutPremium = 0;

// Function to fetch initial data from API
async function fetchInitialData() {
    try {
        const response = await fetch(API_URL, {
            method: 'GET',
            headers: {
                Accept: '*/*',
                Authorization: `Bearer ${AUTH_TOKEN}`,
                Referer: 'https://unusualwhales.com/'
            }
        });

        const data = await response.json();
        const validData = data.data.filter(entry => entry.net_call_premium !== null && entry.net_put_premium !== null);

        if (validData.length === 0) {
            console.log('No valid initial data found.');
            return;
        }

        const latestEntry = validData[validData.length - 1];
        latestCallPremium = parseFloat(latestEntry.net_call_premium);
        latestPutPremium = parseFloat(latestEntry.net_put_premium);

        console.log('Fetched initial values:', { latestCallPremium, latestPutPremium });

        startWebSocket();
    } catch (error) {
        console.error('Error fetching initial data:', error);
    }
}

function startWebSocket() {
    const ws = new WebSocket(WS_URL);

    ws.on('open', () => {
        console.log('Connected to WebSocket');

        ws.send(JSON.stringify(["6", "6", "alert_logs:953c550e-4fea-4e6b-8f00-ee746164d166", "phx_join", {}]));
        ws.send(JSON.stringify(["21", "21", "market_tide_v2", "phx_join", {}]));
    });

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            if (data[2] === "market_tide_v2") {
                const wsData = data[4].data;
                const timestamp = wsData.timestamp;

                if (!wsData.net_call_premium || !wsData.net_put_premium || !wsData.net_volume || !wsData.spy_price) {
                    console.log('Invalid WebSocket data:', wsData);
                    return;
                }

                latestCallPremium += parseFloat(wsData.net_call_premium);
                latestPutPremium += parseFloat(wsData.net_put_premium);

                let formattedData = {
                    date: timestamp.split("T")[0],
                    net_call_premium: latestCallPremium.toFixed(4),
                    net_put_premium: latestPutPremium.toFixed(4),
                    net_volume: wsData.net_volume,
                    spy_price: wsData.spy_price,
                    timestamp
                };

                console.log("Received Data:", formattedData);
                await axios.get(PHP_ENDPOINT, { params: formattedData });
                console.log("Data sent successfully to PHP");
            }
        } catch (error) {
            console.error("Error processing WebSocket message:", error.message);
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket Error:', error.message);
    });

    ws.on('close', () => {
        console.log('WebSocket Disconnected! Reconnecting in 5 seconds...');
        setTimeout(() => {
            process.exit(1);
        }, 5000);
    });
}

fetchInitialData();
