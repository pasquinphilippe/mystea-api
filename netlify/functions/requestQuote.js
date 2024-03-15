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
        // Prepare the order data
        const orderData = {
            order: {
                line_items: payload.lineItems.map(item => ({
                    variant_id: item.variantID,
                    quantity: item.quantity
                })),
                customer: {
                    id: payload.customerId
                },
                financial_status: "pending",
                transactions: [{
                    kind: "authorization",
                    status: "pending",
                    amount: payload.totalPrice
                }],
                // Add more fields as necessary, e.g., billing_address, shipping_address
                discount_codes: [{
                    code: payload.discountCode, // Assuming this is sent in the payload
                    amount: payload.discountValue,
                    type: "fixed_amount" // or "percentage" based on your discount type
                }]
            }
        };

        // Create the order
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

        // Extract the order status URL
        const orderStatusUrl = createdOrderData.order.order_status_url;

        // Return the response with the order status URL
        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({
                order: createdOrderData.order,
                invoiceUrl: orderStatusUrl
            })
        };
    } catch (error) {
        console.error("Error:", error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
