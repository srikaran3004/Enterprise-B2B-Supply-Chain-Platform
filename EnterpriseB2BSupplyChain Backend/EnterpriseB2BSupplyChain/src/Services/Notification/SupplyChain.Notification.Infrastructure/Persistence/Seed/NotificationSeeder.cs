using Microsoft.EntityFrameworkCore;
using SupplyChain.Notification.Application.Email;
using SupplyChain.Notification.Domain.Entities;

namespace SupplyChain.Notification.Infrastructure.Persistence.Seed;

/// <summary>
/// Seeds the EmailTemplates table with the canonical set of HUL Supply Chain templates.
///
/// All templates use the shared <see cref="HulEmailLayout"/> wrapper so they share
/// consistent header, footer, palette, and structure. Scriban placeholders ({{ var }})
/// are preserved verbatim and rendered later by EmailDispatchService.
///
/// Templates are upserted on every startup: new ones are inserted, and existing ones
/// have their Subject and HtmlBody refreshed (so brand updates take effect immediately
/// without manual SQL).
/// </summary>
public static class NotificationSeeder
{
    public static async Task SeedAsync(NotificationDbContext context)
    {
        var existingTemplates = await context.EmailTemplates
            .ToDictionaryAsync(t => t.EventType, StringComparer.OrdinalIgnoreCase);

        var templates = BuildTemplates();

        foreach (var template in templates)
        {
            if (existingTemplates.TryGetValue(template.EventType, out var existing))
            {
                // Refresh existing template if subject or body changed.
                if (existing.Subject != template.Subject || existing.HtmlBody != template.HtmlBody)
                    existing.Update(template.Subject, template.HtmlBody);
            }
            else
            {
                await context.EmailTemplates.AddAsync(template);
            }
        }

        await context.SaveChangesAsync();
    }

    // ──────────────────────────────────────────────────────────────────────
    // Template definitions
    // ──────────────────────────────────────────────────────────────────────

    private static List<EmailTemplate> BuildTemplates() => new()
    {
        // 1. Dealer Registered (Admin notification)
        EmailTemplate.Create(
            "DealerRegistered",
            "New Dealer Registration — Action Required",
            HulEmailLayout.Wrap(
                title:     "New Dealer Registration",
                preheader: "A new dealer has registered and requires your approval.",
                bodyHtml:
                    HulEmailLayout.Greeting("Admin") +
                    HulEmailLayout.Paragraph("A new dealer has registered on the HUL Supply Chain Platform and is awaiting your approval.") +
                    HulEmailLayout.InfoBox("Dealer Details", "<strong>Name:</strong> {{ dealer_name }}<br/><strong>Email:</strong> {{ email }}", "info") +
                    HulEmailLayout.Paragraph("Please review the registration details in the Admin Portal and approve or reject the application.") +
                    HulEmailLayout.Signoff()
            )),

        // 2. Dealer Approved
        EmailTemplate.Create(
            "DealerApproved",
            "Welcome to HUL Supply Chain — Your Account is Approved",
            HulEmailLayout.Wrap(
                title:       "Account Approved",
                preheader:   "Your dealer account has been approved. Welcome!",
                accentColor: HulEmailLayout.Success,
                bodyHtml:
                    HulEmailLayout.Greeting("{{ dealer_name }}") +
                    HulEmailLayout.Paragraph("Welcome to the HUL Supply Chain Platform! We're thrilled to have you on board as an authorised dealer.") +
                    HulEmailLayout.InfoBox(
                        "Account Active",
                        "Your account has been approved and you can now sign in to start placing orders, browsing the product catalog, and managing your dealership.",
                        "success") +
                    HulEmailLayout.Paragraph("Visit the dealer portal to begin exploring our wide range of products and place your first order.") +
                    HulEmailLayout.Signoff()
            )),

        // 3. Dealer Rejected
        EmailTemplate.Create(
            "DealerRejected",
            "HUL Supply Chain — Registration Update",
            HulEmailLayout.Wrap(
                title:       "Registration Update",
                preheader:   "Update regarding your dealer registration request.",
                accentColor: HulEmailLayout.Warning,
                bodyHtml:
                    HulEmailLayout.Greeting("{{ dealer_name }}") +
                    HulEmailLayout.Paragraph("Thank you for your interest in becoming a dealer on the HUL Supply Chain Platform.") +
                    HulEmailLayout.Paragraph("After reviewing your application, our team has decided not to proceed with your registration at this time.") +
                    HulEmailLayout.InfoBox("Reason", "{{ reason }}", "warning") +
                    HulEmailLayout.Paragraph("If you would like to discuss this decision or reapply in the future, please contact our support team.") +
                    HulEmailLayout.Signoff()
            )),

        // 4. Order Placed
        EmailTemplate.Create(
            "OrderPlaced",
            "Order Confirmation — {{ order_number }}",
            HulEmailLayout.Wrap(
                title:     "Order Confirmed",
                preheader: "Your order {{ order_number }} has been placed successfully.",
                bodyHtml:
                    HulEmailLayout.Greeting("{{ dealer_name }}") +
                    HulEmailLayout.Paragraph("Thank you for your order! We've received it and our team is preparing it for dispatch.") +
                    HulEmailLayout.InfoBox(
                        "Order Summary",
                        "<strong>Order Number:</strong> {{ order_number }}<br/><strong>Total Amount:</strong> &#8377; {{ total_amount }}",
                        "info") +
                    HulEmailLayout.Paragraph("You can track the status of your order in real time from your dealer portal.") +
                    HulEmailLayout.Signoff()
            )),

        // 5. Admin Approval Required (credit limit exceeded)
        EmailTemplate.Create(
            "AdminApprovalRequired",
            "Order On Hold — Credit Limit Exceeded — {{ order_number }}",
            HulEmailLayout.Wrap(
                title:       "Order Requires Approval",
                preheader:   "Order {{ order_number }} is on hold pending admin review.",
                accentColor: HulEmailLayout.Warning,
                bodyHtml:
                    HulEmailLayout.Greeting("Admin") +
                    HulEmailLayout.Paragraph("An order has been placed that exceeds the dealer's available credit limit and is now on hold pending your review.") +
                    HulEmailLayout.InfoBox(
                        "Order Details",
                        "<strong>Order Number:</strong> {{ order_number }}<br/><strong>Dealer:</strong> {{ dealer_name }}<br/><strong>Amount:</strong> &#8377; {{ total_amount }}",
                        "warning") +
                    HulEmailLayout.Paragraph("Please review the order in the Admin Portal and approve or reject it.") +
                    HulEmailLayout.Signoff()
            )),

        // 6. Agent Assigned (sent to dealer)
        EmailTemplate.Create(
            "AgentAssigned",
            "Your Order is Dispatched — {{ order_number }}",
            HulEmailLayout.Wrap(
                title:       "Order Dispatched",
                preheader:   "Order {{ order_number }} is on its way!",
                accentColor: HulEmailLayout.Success,
                bodyHtml:
                    HulEmailLayout.Greeting("{{ dealer_name }}") +
                    HulEmailLayout.Paragraph("Great news! Your order is on its way. A delivery agent has been assigned and will reach you soon.") +
                    HulEmailLayout.InfoBox(
                        "Delivery Details",
                        "<strong>Order Number:</strong> {{ order_number }}<br/>" +
                        "<strong>Delivery Agent:</strong> {{ agent_name }}<br/>" +
                        "<strong>Agent Phone:</strong> {{ agent_phone }}<br/>" +
                        "<strong>Vehicle:</strong> {{ vehicle_no }}",
                        "success") +
                    HulEmailLayout.Paragraph("You can track your delivery in real time from your dealer portal.") +
                    HulEmailLayout.Signoff()
            )),

        // 7. Agent Assignment (sent to delivery agent)
        EmailTemplate.Create(
            "AgentAssignedToAgent",
            "New Delivery Assignment — Order {{ order_number }}",
            HulEmailLayout.Wrap(
                title:     "New Delivery Assigned",
                preheader: "You have a new delivery assignment for order {{ order_number }}.",
                bodyHtml:
                    HulEmailLayout.Greeting("{{ agent_name }}") +
                    HulEmailLayout.Paragraph("You have been assigned a new delivery. Please log in to the agent portal to view the full details and confirm pickup.") +
                    HulEmailLayout.InfoBox(
                        "Delivery Details",
                        "<strong>Order Number:</strong> {{ order_number }}<br/>" +
                        "<strong>Deliver To:</strong> {{ shipping_address }}<br/>" +
                        "<strong>City:</strong> {{ shipping_city }}<br/>" +
                        "<strong>Pin Code:</strong> {{ shipping_pincode }}",
                        "info") +
                    HulEmailLayout.Paragraph("Once you've confirmed pickup at the warehouse, please update the delivery status in real time as you progress.") +
                    HulEmailLayout.Signoff()
            )),

        // 8. Order Delivered
        EmailTemplate.Create(
            "OrderDelivered",
            "Order Delivered — {{ order_number }}",
            HulEmailLayout.Wrap(
                title:       "Delivered Successfully",
                preheader:   "Your order {{ order_number }} has been delivered.",
                accentColor: HulEmailLayout.Success,
                bodyHtml:
                    HulEmailLayout.Greeting("{{ dealer_name }}") +
                    HulEmailLayout.Paragraph("Your order has been delivered successfully! We hope everything arrived in perfect condition.") +
                    HulEmailLayout.InfoBox(
                        "Order {{ order_number }}",
                        "Your invoice will be generated and sent to you shortly. You can also download it from your dealer portal at any time.",
                        "success") +
                    HulEmailLayout.Paragraph("Thank you for choosing HUL Supply Chain. We look forward to serving you again soon.") +
                    HulEmailLayout.Signoff()
            )),

        // 9. Invoice Generated
        EmailTemplate.Create(
            "InvoiceGenerated",
            "Invoice {{ invoice_number }} — Order {{ order_number }}",
            HulEmailLayout.Wrap(
                title:     "Invoice Ready",
                preheader: "Invoice {{ invoice_number }} is ready for download.",
                bodyHtml:
                    HulEmailLayout.Greeting("{{ dealer_name }}") +
                    HulEmailLayout.Paragraph("Your invoice has been generated and is now available for download.") +
                    HulEmailLayout.InfoBox(
                        "Invoice Details",
                        "<strong>Invoice Number:</strong> {{ invoice_number }}<br/>" +
                        "<strong>Order Number:</strong> {{ order_number }}<br/>" +
                        "<strong>Grand Total:</strong> &#8377; {{ grand_total }}",
                        "info") +
                    HulEmailLayout.Paragraph("You can download the invoice PDF from the Invoices section of your dealer portal.") +
                    HulEmailLayout.Signoff()
            )),

        // 10. SLA At Risk
        EmailTemplate.Create(
            "SLAAtRisk",
            "Delivery Update — Order {{ order_number }}",
            HulEmailLayout.Wrap(
                title:       "Delivery Delay Notice",
                preheader:   "Your order {{ order_number }} may be slightly delayed.",
                accentColor: HulEmailLayout.Warning,
                bodyHtml:
                    HulEmailLayout.Greeting("{{ dealer_name }}") +
                    HulEmailLayout.Paragraph("We wanted to let you know that your order may experience a slight delay in delivery. Our team is working to deliver as soon as possible.") +
                    HulEmailLayout.InfoBox(
                        "Order {{ order_number }}",
                        "We apologise for any inconvenience this may cause. You can continue to track your delivery in real time from your dealer portal.",
                        "warning") +
                    HulEmailLayout.Paragraph("If you have any concerns, please contact our support team.") +
                    HulEmailLayout.Signoff()
            )),

        // 11. Stock Restored
        EmailTemplate.Create(
            "StockRestored",
            "Back in Stock — {{ product_name }}",
            HulEmailLayout.Wrap(
                title:       "Product Back in Stock",
                preheader:   "{{ product_name }} is now available to order.",
                accentColor: HulEmailLayout.Success,
                bodyHtml:
                    HulEmailLayout.Greeting("Dealer") +
                    HulEmailLayout.Paragraph("Good news! A product you were waiting for is back in stock.") +
                    HulEmailLayout.InfoBox(
                        "Product Available",
                        "<strong>Product:</strong> {{ product_name }}<br/>" +
                        "<strong>SKU:</strong> {{ sku }}<br/>" +
                        "<strong>Available Stock:</strong> {{ available_qty }} units",
                        "success") +
                    HulEmailLayout.Paragraph("Place your order soon to secure your stock.") +
                    HulEmailLayout.Signoff()
            )),

        // 12. Return Requested
        EmailTemplate.Create(
            "ReturnRequested",
            "Return Request Received — Order {{ order_number }}",
            HulEmailLayout.Wrap(
                title:     "Return Request Received",
                preheader: "Your return request for order {{ order_number }} has been received.",
                bodyHtml:
                    HulEmailLayout.Greeting("{{ dealer_name }}") +
                    HulEmailLayout.Paragraph("We've received your return request for order <strong>{{ order_number }}</strong>. Our team will review it and get back to you shortly.") +
                    HulEmailLayout.InfoBox("Return Reason", "{{ reason }}", "info") +
                    HulEmailLayout.Paragraph("You'll receive an update via email once the review is complete. Please keep the items in their original condition until then.") +
                    HulEmailLayout.Signoff()
            )),

        // 13. Order Cancelled
        EmailTemplate.Create(
            "OrderCancelled",
            "Order {{ order_number }} Cancellation Update",
            HulEmailLayout.Wrap(
                title:       "Order Cancelled",
                preheader:   "Your order {{ order_number }} has been cancelled.",
                accentColor: HulEmailLayout.Danger,
                bodyHtml:
                    HulEmailLayout.Greeting("{{ dealer_name }}") +
                    HulEmailLayout.Paragraph("Your order <strong>{{ order_number }}</strong> has been cancelled.") +
                    HulEmailLayout.InfoBox("Cancellation Reason", "{{ reason }}", "danger") +
                    HulEmailLayout.Paragraph("Any reserved stock has been released. If you have any questions or wish to place a new order, please contact our support team.") +
                    HulEmailLayout.Signoff()
            )),

        // 14. Vehicle Breakdown
        EmailTemplate.Create(
            "VehicleBreakdown",
            "Delivery Alert — Vehicle Breakdown for Order {{ order_number }}",
            HulEmailLayout.Wrap(
                title:       "Delivery Alert",
                preheader:   "The delivery vehicle for your order has broken down.",
                accentColor: HulEmailLayout.Warning,
                bodyHtml:
                    HulEmailLayout.Greeting("{{ dealer_name }}") +
                    HulEmailLayout.Paragraph("We regret to inform you that the delivery vehicle for your order <strong>{{ order_number }}</strong> has experienced a breakdown.") +
                    HulEmailLayout.InfoBox(
                        "What Happens Next",
                        "Our delivery agent will contact you shortly to arrange an alternative delivery.<br/>" +
                        "<strong>Agent Phone:</strong> {{ agent_phone }}<br/>" +
                        "<strong>Last Known Location:</strong> {{ place }}",
                        "warning") +
                    HulEmailLayout.Paragraph("We sincerely apologise for the inconvenience and are working hard to resolve this as quickly as possible.") +
                    HulEmailLayout.Signoff()
            )),

        // 15. Shipment Status Updated
        EmailTemplate.Create(
            "ShipmentStatusUpdated",
            "Order {{ order_number }} — Delivery Update: {{ status }}",
            HulEmailLayout.Wrap(
                title:     "Delivery Update",
                preheader: "Your order {{ order_number }} has a new delivery update.",
                bodyHtml:
                    HulEmailLayout.Greeting("{{ dealer_name }}") +
                    HulEmailLayout.Paragraph("Your order <strong>{{ order_number }}</strong> has a new delivery update from our delivery agent.") +
                    HulEmailLayout.InfoBox(
                        "{{ status }}",
                        "<strong>Location:</strong> {{ place }}<br/>" +
                        "<strong>Updated At:</strong> {{ updated_at }}",
                        "info") +
                    HulEmailLayout.Paragraph("You can track your order in real time from your dealer portal.") +
                    HulEmailLayout.Signoff()
            )),
    };
}
