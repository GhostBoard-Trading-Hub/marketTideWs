// https://testapi.webepex.com/ghostboard/dashboard/markettide/update.php

const WebSocket = require('ws');
const axios = require('axios');

const ws = new WebSocket('wss://ws.unusualwhales.com/v2/foo/websocket?token=NVExrWkgfLzvOnmkh0g7RM0EPKqcD7GXwLTmCZGJzCG1QFtE0Kff3UZC1czEuQbR&vsn=2.0.0');

const sendDataToPHP = async (data) => {
    try {
        await axios.get('', {
            params: data
        });
        console.log("Data sent successfully:", data);
    } catch (error) {
        console.error("Error sending data:", error.message);
    }
};

ws.on('open', () => {
    console.log('Connected to WebSocket');

    ws.send(JSON.stringify([
        "6",
        "6",
        "alert_logs:953c550e-4fea-4e6b-8f00-ee746164d166",
        "phx_join",
        {}
    ]));

    ws.send(JSON.stringify([
        "21",
        "21",
        "market_tide_v2",
        "phx_join",
        {}
    ]));
});

ws.on('message', (message) => {
    try {
        const data = JSON.parse(message);
        if (data[2] === "market_tide_v2") {
            let formattedData = {
                date: data[4].data.timestamp.split("T")[0],
                net_call_premium: data[4].data.net_call_premium,
                net_put_premium: data[4].data.net_put_premium,
                net_volume: data[4].data.net_volume,
                spy_price: data[4].spy_price,  // ✅ Added SPY price
                timestamp: data[4].data.timestamp
            };

            console.log("Received Data:", formattedData);
            sendDataToPHP(formattedData);
        }
    } catch (error) {
        console.error("Error parsing message:", error.message);
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
