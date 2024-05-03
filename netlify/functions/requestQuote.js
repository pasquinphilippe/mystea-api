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
    const lineItems = payload.lineItems.map(item => ({
        variant_id: item.variantID,
        quantity: item.quantity
    }));
    const customerId = payload.customerId;

    try {
        // Create the draft order
        const draftOrderResponse = await axios.post(
            "https://mystea-shop.myshopify.com/admin/api/2023-10/draft_orders.json",
            {
                draft_order: {
                    line_items: lineItems,
                    customer: { id: customerId },
                    use_customer_default_address: true,
                    tags: "PDV"
                }
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "X-Shopify-Access-Token": process.env.SHOPIFY_TOKEN
                }
            }
        );

        const draftOrderData = draftOrderResponse.data;
        const invoiceUrl = draftOrderData.draft_order.invoice_url; // Extract the invoice URL from draft order creation

        // Log the invoice URL
        console.log("Invoice URL:", invoiceUrl);
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Return the draft order and invoice URL
        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({
                draftOrder: draftOrderData.draft_order,
                invoiceUrl: invoiceUrl
            })
        };
    } catch (error) {
        console.error("Error:", error.message);  // Also log any errors
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
