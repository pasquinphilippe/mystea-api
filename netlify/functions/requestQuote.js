const axios = require('axios');
require('dotenv').config();

exports.handler = async function(event, context) {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
    };

    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 204,
            headers: headers,
            body: ""
        };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers: headers, body: "Method Not Allowed" };
    }

    const payload = JSON.parse(event.body);

    try {
        const orderData = {
            order: {
                line_items: payload.lineItems.map(item => ({
                    variant_id: item.variantID,
                    quantity: item.quantity
                })),
                customer: {
                    id: payload.customerId
                },
                financial_status: "pending"
            }
        };

        const createOrderResponse = await axios.post(
            `${process.env.SHOPIFY_STORE_URL}/admin/api/2024-01/orders.json`,
            orderData,
            {
                headers: {
                    "Content-Type": "application/json",
                    "X-Shopify-Access-Token": process.env.SHOPIFY_TOKEN
                }
            }
        );

        const createdOrderData = createOrderResponse.data;

        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({
                order: createdOrderData.order,
                invoiceUrl: createdOrderData.order.order_status_url
            })
        };
    } catch (error) {
        console.error("Error creating order:", error.message);
        if (error.response) {
            console.error("Response status:", error.response.status);
            console.error("Response data:", error.response.data);
        }
        return {
            statusCode: error.response ? error.response.status : 500,
            headers: headers,
            body: JSON.stringify({
                error: error.message,
                response: error.response ? error.response.data : null
            })
        };
    }
};
