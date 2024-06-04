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

    const lineItems = payload.lineItems.map(item => ({
        variant_id: item.variantID,
        quantity: item.quantity
    }));
    const customerId = payload.customerId;
    console.log("Parsed line items and customer ID: ", lineItems, customerId);

    try {
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

<<<<<<< HEAD

        // Return the combined response
=======
        // Return the draft order details and invoice URL
>>>>>>> ce7224b11bc32fbef25599c43180defe8dc4ccac
        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({
<<<<<<< HEAD
                draftOrder: shopifyData,
                invoice: invoiceData,
                invoiceUrl: invoiceUrl  // Include the invoice URL in the response

            })
        };
    } catch (error) {
=======
                draftOrder: updatedDraftOrder,
                invoiceUrl: updatedDraftOrder.invoice_url // Ensure the invoice URL is from the updated draft order
            })
        };
    } catch (error) {
        console.error("Error during process: ", error.message);
>>>>>>> ce7224b11bc32fbef25599c43180defe8dc4ccac
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
