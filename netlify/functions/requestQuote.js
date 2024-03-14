const axios = require('axios');
require('dotenv').config();

exports.handler = async function(event, context) {
    // Define CORS headers
    const headers = {
        "Access-Control-Allow-Origin": "*", // Allow any origin
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS" // Allowed methods
    };

    // Handle preflight CORS request (OPTIONS method)
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
    console.log(event.body);
    const payload = JSON.parse(event.body);

    // Extract variant IDs, quantities, and customerId from the payload
    const lineItems = payload.lineItems.map(item => {
        return {
            variant_id: item.variantID,
            quantity: item.quantity
        };
    });
    const customerId = payload.customerId;
    const discountValue = payload.discountValue
    
    // Create the draft order in Shopify
    try {
        const shopifyResponse = await axios.post("https://mystea-shop.myshopify.com/admin/api/2023-10/draft_orders.json", 
            { 
                draft_order: { 
                    line_items: lineItems,
                    customer: {
                        id: customerId
                    },
                    applied_discount: {
                        description: "Point de vente",
                        value_type: "fixed_amount",
                        value: discountValue,
                        amount: discountValue,
                        title: "Point de vente",
                    },
                    use_customer_default_address: true
                } 
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "X-Shopify-Access-Token": process.env.SHOPIFY_TOKEN
                }
            }
        );
        const shopifyData = shopifyResponse.data;

        // Return the Shopify response
        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify(shopifyData)
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
