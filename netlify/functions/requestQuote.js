const axios = require('axios');
require('dotenv').config();

exports.handler = async function(event, context) {
    // Define CORS headers
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
    };

    // Handle preflight CORS request
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 204,
            headers: headers,
            body: ""
        };
    }

    // Only allow POST method for creating orders
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers: headers, body: "Method Not Allowed" };
    }

    const payload = JSON.parse(event.body);

    // Extract relevant data from payload
    const lineItems = payload.lineItems.map(item => ({
        variant_id: item.variantID,
        quantity: item.quantity
    }));
    const customerId = payload.customerId;
    const discountValue = payload.discountValue;

    try {
        // Create the draft order
        const shopifyResponse = await axios.post(
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

        const shopifyData = shopifyResponse.data;

        const invoiceUrl = shopifyData.draft_order.invoice_url; // Correctly extracted invoice URL from the response


       // Delay for 5 seconds before sending the combined response
       await new Promise(resolve => setTimeout(resolve, 2500));

       // Return the combined response
       return {
           statusCode: 200,
           headers: headers,
           body: JSON.stringify({
               draftOrder: shopifyData,
               invoiceUrl: invoiceUrl  // Include the invoice URL in the response
           })
       };
   } catch (error) {
       return {
           statusCode: 500,
           headers: headers,
           body: JSON.stringify({ error: error.message })
       };
   }
};
