const axios = require('axios');
require('dotenv').config();

exports.handler = async function(event, context) {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
    };

    if (event.httpMethod === "OPTIONS") {
        console.log("Handling OPTIONS request");
        return {
            statusCode: 204,
            headers: headers,
            body: ""
        };
    }

    if (event.httpMethod !== "POST") {
        console.log("Request method not allowed: ", event.httpMethod);
        return { statusCode: 405, headers: headers, body: "Method Not Allowed" };
    }

    const payload = JSON.parse(event.body);
    console.log("Received payload: ", payload);

    // Return 200 immediately to acknowledge receipt of the webhook
    const response = {
        statusCode: 200,
        headers: headers,
        body: "Webhook received"
    };

    // Process the webhook asynchronously
    processWebhook(payload);

    return response;
};

// Asynchronous processing function
async function processWebhook(payload) {
    try {
        const lineItems = payload.lineItems.map(item => ({
            variant_id: item.variantID,
            quantity: item.quantity
        }));
        const customerId = payload.customerId;
        console.log("Parsed line items and customer ID: ", lineItems, customerId);

        // Create the draft order
        console.log("Creating draft order");
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

        const draftOrderId = draftOrderResponse.data.draft_order.id;
        console.log("Draft order created with ID: ", draftOrderId);

        // Function to check for the synced tag and get the updated draft order details
        async function waitForTagSync(draftOrderId, timeout = 30000) {
            const startTime = Date.now();
            while (Date.now() - startTime < timeout) {
                const response = await axios.get(
                    `https://mystea-shop.myshopify.com/admin/api/2023-10/draft_orders/${draftOrderId}.json`,
                    {
                        headers: {
                            "X-Shopify-Access-Token": process.env.SHOPIFY_TOKEN
                        }
                    }
                );
                const currentTags = response.data.draft_order.tags;
                console.log("Current tags on draft order: ", currentTags);
                if (currentTags.includes("synced")) {
                    console.log("Tag 'synced' found, proceeding");
                    return response.data.draft_order; // Return the updated draft order
                }
                // Wait for a bit before trying again
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            throw new Error("Timeout waiting for tag sync");
        }

        // Wait for the tag to be synced and fetch the updated draft order
        const updatedDraftOrder = await waitForTagSync(draftOrderId);
        console.log("Proceeding after tag sync");

        console.log("Draft order details: ", updatedDraftOrder);
        console.log("Invoice URL: ", updatedDraftOrder.invoice_url);

    } catch (error) {
        console.error("Error during process: ", error.message);
    }
}
