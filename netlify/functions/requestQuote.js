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
        const lineItems = payload.lineItems.map(item => ({
            variant_id: item.variantID,
            quantity: item.quantity
        }));
        const customerId = payload.customerId;
        const discountValue = payload.discountValue;
        const subject = payload.subject;
        const message = payload.message;
        // Create the draft order
        const shopifyResponse = await axios.post(
            `${process.env.SHOPIFY_STORE_URL}/admin/api/2024-01/draft_orders.json`,
            {
                draft_order: {
                    line_items: lineItems,
                    customer: { id: customerId },
                    applied_discount: {
                        description: "Discount Description",
                        value_type: "fixed_amount",
                        value: discountValue,
                        title: "Discount Title",
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

        const draftOrderData = shopifyResponse.data;
        
        // Send the invoice (if necessary)
        await axios.post(
            `${process.env.SHOPIFY_STORE_URL}/admin/api/2024-01/draft_orders/${draftOrderData.draft_order.id}/send_invoice.json`,
            {
                draft_order_invoice: {
                    to: payload.customerEmail,
                    from: "info@mystea.ca",
                    subject: subject,
                    custom_message: message
                }
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "X-Shopify-Access-Token": process.env.SHOPIFY_TOKEN
                }
            }
        );

        // Complete the draft order and mark the payment as pending
        const completeResponse = await axios.put(
            `${process.env.SHOPIFY_STORE_URL}/admin/api/2024-01/draft_orders/${draftOrderData.draft_order.id}/complete.json?payment_pending=true`,
            {},
            {
                headers: {
                    "X-Shopify-Access-Token": process.env.SHOPIFY_TOKEN
                }
            }
        );

        const completedOrderData = completeResponse.data;

        // Return the response with the invoice URL from the completed order
        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({
                completedOrder: completedOrderData,
                invoiceUrl: completedOrderData.draft_order.invoice_url
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
