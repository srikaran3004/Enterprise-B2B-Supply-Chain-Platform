using Microsoft.EntityFrameworkCore;
using SupplyChain.Notification.Application.Email;
using SupplyChain.Notification.Domain.Entities;

namespace SupplyChain.Notification.Infrastructure.Persistence.Seed;

/// <summary>
/// Seeds canonical HUL email templates. Existing templates are upserted on startup.
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
                if (existing.Subject != template.Subject || existing.HtmlBody != template.HtmlBody)
                {
                    existing.Update(template.Subject, template.HtmlBody);
                }
            }
            else
            {
                await context.EmailTemplates.AddAsync(template);
            }
        }

        await context.SaveChangesAsync();
    }

    private static List<EmailTemplate> BuildTemplates() => new()
    {
        EmailTemplate.Create(
            "DealerRegistered",
            "New Dealer Registration - Action Required",
            HulEmailLayout.Wrap(
                title: "New Dealer Registration",
                preheader: "A new dealer has registered and requires your approval.",
                bodyHtml:
                    HulEmailLayout.Greeting("Admin") +
                    HulEmailLayout.Paragraph("A new dealer has registered on the HUL Supply Chain Platform and is awaiting your approval.") +
                    HulEmailLayout.InfoBox("Dealer Details", "<strong>Name:</strong> {{ dealer_name }}<br/><strong>Email:</strong> {{ email }}", "info") +
                    HulEmailLayout.Paragraph("Please review the registration details in the Admin Portal and approve or reject the application.") +
                    HulEmailLayout.Signoff()
            )),

        EmailTemplate.Create(
            "DealerApproved",
            "Welcome to HUL Supply Chain - Your Account is Approved",
            HulEmailLayout.Wrap(
                title: "Account Approved",
                preheader: "Your dealer account has been approved. Welcome!",
                accentColor: HulEmailLayout.Success,
                bodyHtml:
                    HulEmailLayout.Greeting("{{ dealer_name }}") +
                    HulEmailLayout.Paragraph("Welcome to the HUL Supply Chain Platform. We are happy to have you on board as an authorised dealer.") +
                    HulEmailLayout.InfoBox(
                        "Account Active",
                        "Your account has been approved and you can now sign in, place orders, and manage your dealership.",
                        "success") +
                    HulEmailLayout.Button("Go to Dealer Portal", "http://localhost:4200/auth/login", HulEmailLayout.Success) +
                    HulEmailLayout.Signoff()
            )),

        EmailTemplate.Create(
            "DealerRejected",
            "HUL Supply Chain - Registration Update",
            HulEmailLayout.Wrap(
                title: "Registration Update",
                preheader: "Update regarding your dealer registration request.",
                accentColor: HulEmailLayout.Warning,
                bodyHtml:
                    HulEmailLayout.Greeting("{{ dealer_name }}") +
                    HulEmailLayout.Paragraph("Thank you for your interest in becoming a dealer on the HUL Supply Chain Platform.") +
                    HulEmailLayout.Paragraph("After review, we are unable to proceed with your registration at this time.") +
                    HulEmailLayout.InfoBox("Reason", "{{ reason }}", "warning") +
                    HulEmailLayout.Paragraph("If you would like to discuss this decision or reapply later, please contact support.") +
                    HulEmailLayout.Signoff()
            )),

        EmailTemplate.Create(
            "OrderPlaced",
            "Payment Verified & Order Confirmed - {{ order_number }}",
            HulEmailLayout.Wrap(
                title: "Payment Verified & Order Confirmed",
                preheader: "Your order {{ order_number }} has been placed successfully.",
                bodyHtml:
                    HulEmailLayout.Greeting("{{ dealer_name }}") +
                    HulEmailLayout.Paragraph("Thank you for your order. We have received it and our team is preparing it for dispatch.") +
                    HulEmailLayout.InfoBox(
                        "Order Summary",
                        "<strong>Order Number:</strong> {{ order_number }}<br/><strong>Total Amount:</strong> &#8377; {{ total_amount }}",
                        "info") +
                    HulEmailLayout.Button("Track Order", "http://localhost:4200/dealer/orders", HulEmailLayout.Primary) +
                    HulEmailLayout.Signoff()
            )),

        EmailTemplate.Create(
            "AdminApprovalRequired",
            "Order On Hold - Purchase Limit Exceeded - {{ order_number }}",
            HulEmailLayout.Wrap(
                title: "Order Requires Approval",
                preheader: "Order {{ order_number }} is on hold pending admin review.",
                accentColor: HulEmailLayout.Warning,
                bodyHtml:
                    HulEmailLayout.Greeting("Admin") +
                    HulEmailLayout.Paragraph("An order has been placed that exceeds the dealer's available monthly purchase limit and is now on hold.") +
                    HulEmailLayout.InfoBox(
                        "Order Details",
                        "<strong>Order Number:</strong> {{ order_number }}<br/><strong>Dealer:</strong> {{ dealer_name }}<br/><strong>Amount:</strong> &#8377; {{ total_amount }}",
                        "warning") +
                    HulEmailLayout.Paragraph("Please review the order in the Admin Portal and approve or reject it.") +
                    HulEmailLayout.Signoff()
            )),

        EmailTemplate.Create(
            "QuotaExceededReview",
            "Order Under Review - {{ order_number }}",
            HulEmailLayout.Wrap(
                title: "Payment Verified! Order Under Review",
                preheader: "Your order {{ order_number }} is under review as it exceeds your limit.",
                accentColor: HulEmailLayout.Warning,
                bodyHtml:
                    HulEmailLayout.Greeting("{{ dealer_name }}") +
                    HulEmailLayout.Paragraph("Payment Verified! Your order is currently Under Review as it exceeds your Monthly Purchase Limit. Our Admin will update you shortly.") +
                    HulEmailLayout.InfoBox(
                        "Order Details",
                        "<strong>Order Number:</strong> {{ order_number }}<br/><strong>Amount:</strong> &#8377; {{ total_amount }}",
                        "warning") +
                    HulEmailLayout.Button("View Order Status", "http://localhost:4200/dealer/orders", HulEmailLayout.Warning) +
                    HulEmailLayout.Signoff()
            )),

        EmailTemplate.Create(
            "AgentAssigned",
            "Your Order is Dispatched - {{ order_number }}",
            HulEmailLayout.Wrap(
                title: "Order Dispatched",
                preheader: "Order {{ order_number }} is on its way.",
                accentColor: HulEmailLayout.Success,
                bodyHtml:
                    HulEmailLayout.Greeting("{{ dealer_name }}") +
                    HulEmailLayout.Paragraph("Great news. Your order is on its way and a delivery agent has been assigned.") +
                    HulEmailLayout.InfoBox(
                        "Delivery Details",
                        "<strong>Order Number:</strong> {{ order_number }}<br/>" +
                        "<strong>Delivery Agent:</strong> {{ agent_name }}<br/>" +
                        "<strong>Agent Phone:</strong> {{ agent_phone }}<br/>" +
                        "<strong>Vehicle:</strong> {{ vehicle_no }}",
                        "success") +
                    HulEmailLayout.Button("Open Live Tracking", "http://localhost:4200/dealer/orders", HulEmailLayout.Success) +
                    HulEmailLayout.Signoff()
            )),

        EmailTemplate.Create(
            "AgentAssignedToAgent",
            "New Delivery Assignment - Order {{ order_number }}",
            HulEmailLayout.Wrap(
                title: "New Delivery Assigned",
                preheader: "You have a new delivery assignment for order {{ order_number }}.",
                bodyHtml:
                    HulEmailLayout.Greeting("{{ agent_name }}") +
                    HulEmailLayout.Paragraph("You have been assigned a new delivery. Please log in to the agent portal to view full details.") +
                    HulEmailLayout.InfoBox(
                        "Delivery Details",
                        "<strong>Order Number:</strong> {{ order_number }}<br/>" +
                        "<strong>Deliver To:</strong> {{ shipping_address }}<br/>" +
                        "<strong>City:</strong> {{ shipping_city }}<br/>" +
                        "<strong>Pin Code:</strong> {{ shipping_pincode }}",
                        "info") +
                    HulEmailLayout.Signoff()
            )),

        EmailTemplate.Create(
            "OrderDelivered",
            "Order Delivered - {{ order_number }}",
            HulEmailLayout.Wrap(
                title: "Delivered Successfully",
                preheader: "Your order {{ order_number }} has been delivered.",
                accentColor: HulEmailLayout.Success,
                bodyHtml:
                    HulEmailLayout.Greeting("{{ dealer_name }}") +
                    HulEmailLayout.Paragraph("Your order has been delivered successfully. We hope everything arrived in perfect condition.") +
                    HulEmailLayout.InfoBox(
                        "Delivery Completion Details",
                        "<strong>Order Number:</strong> {{ order_number }}<br/>" +
                        "<strong>Delivered By:</strong> {{ agent_name }}<br/>" +
                        "<strong>Agent Phone:</strong> {{ agent_phone }}<br/>" +
                        "<strong>Vehicle:</strong> {{ vehicle_type }} {{ vehicle_registration_no }}<br/>" +
                        "<strong>Delivered At:</strong> {{ updated_at }}",
                        "success") +
                    HulEmailLayout.Paragraph("Your invoice will be generated shortly and will be available in the dealer portal.") +
                    HulEmailLayout.Button("View Invoice & Order", "http://localhost:4200/dealer/orders", HulEmailLayout.Success) +
                    HulEmailLayout.Signoff()
            )),

        EmailTemplate.Create(
            "InvoiceGenerated",
            "Invoice {{ invoice_number }} - Order {{ order_number }}",
            HulEmailLayout.Wrap(
                title: "Invoice Ready",
                preheader: "Invoice {{ invoice_number }} is ready for download.",
                bodyHtml:
                    HulEmailLayout.Greeting("{{ dealer_name }}") +
                    HulEmailLayout.Paragraph("Your invoice has been generated and is ready for download.") +
                    HulEmailLayout.InfoBox(
                        "Invoice Details",
                        "<strong>Invoice Number:</strong> {{ invoice_number }}<br/>" +
                        "<strong>Order Number:</strong> {{ order_number }}<br/>" +
                        "<strong>Grand Total:</strong> &#8377; {{ grand_total }}",
                        "info") +
                    HulEmailLayout.Signoff()
            )),

        EmailTemplate.Create(
            "SLAAtRisk",
            "Delivery Update - Order {{ order_number }}",
            HulEmailLayout.Wrap(
                title: "Delivery Delay Notice",
                preheader: "Your order {{ order_number }} may be slightly delayed.",
                accentColor: HulEmailLayout.Warning,
                bodyHtml:
                    HulEmailLayout.Greeting("{{ dealer_name }}") +
                    HulEmailLayout.Paragraph("Your order may experience a slight delay. Our team is working to deliver it as soon as possible.") +
                    HulEmailLayout.InfoBox(
                        "Order {{ order_number }}",
                        "We apologise for the inconvenience. You can continue tracking delivery status in the dealer portal.",
                        "warning") +
                    HulEmailLayout.Signoff()
            )),

        EmailTemplate.Create(
            "StockRestored",
            "Back in Stock - {{ product_name }}",
            HulEmailLayout.Wrap(
                title: "Product Back in Stock",
                preheader: "{{ product_name }} is now available to order.",
                accentColor: HulEmailLayout.Success,
                bodyHtml:
                    HulEmailLayout.Greeting("Dealer") +
                    HulEmailLayout.Paragraph("Good news. A product you were waiting for is back in stock.") +
                    HulEmailLayout.InfoBox(
                        "Product Available",
                        "<strong>Product:</strong> {{ product_name }}<br/>" +
                        "<strong>SKU:</strong> {{ sku }}<br/>" +
                        "<strong>Available Stock:</strong> {{ available_qty }} units",
                        "success") +
                    HulEmailLayout.Signoff()
            )),

        EmailTemplate.Create(
            "ReturnRequested",
            "Return Request Received - Order {{ order_number }}",
            HulEmailLayout.Wrap(
                title: "Return Request Received",
                preheader: "Your return request for order {{ order_number }} has been received.",
                bodyHtml:
                    HulEmailLayout.Greeting("{{ dealer_name }}") +
                    HulEmailLayout.Paragraph("We have received your return request for order <strong>{{ order_number }}</strong>.") +
                    HulEmailLayout.InfoBox("Return Reason", "{{ reason }}", "info") +
                    HulEmailLayout.InfoBox(
                        "What Happens Next",
                        "1) Admin review in 1-2 business days.<br/>" +
                        "2) Approval or rejection update via email.<br/>" +
                        "3) If approved, refund and pickup instructions are shared.",
                        "info") +
                    HulEmailLayout.Signoff()
            )),

        EmailTemplate.Create(
            "ReturnApproved",
            "Return Approved - Order {{ order_number }}",
            HulEmailLayout.Wrap(
                title: "Return Approved",
                preheader: "Your return request for order {{ order_number }} has been approved.",
                accentColor: HulEmailLayout.Success,
                bodyHtml:
                    HulEmailLayout.Greeting("{{ dealer_name }}") +
                    HulEmailLayout.Paragraph("Your return request for order <strong>{{ order_number }}</strong> has been approved.") +
                    HulEmailLayout.InfoBox(
                        "Refund Details",
                        "<strong>Approved Amount:</strong> &#8377; {{ refund_amount }}<br/>" +
                        "<strong>Mode:</strong> {{ refund_mode }}<br/>" +
                        "<strong>Expected Timeline:</strong> 2-3 working days",
                        "success") +
                    HulEmailLayout.Signoff()
            )),

        EmailTemplate.Create(
            "ReturnRejected",
            "Return Update - Order {{ order_number }}",
            HulEmailLayout.Wrap(
                title: "Return Request Update",
                preheader: "Your return request for order {{ order_number }} was not approved.",
                accentColor: HulEmailLayout.Warning,
                bodyHtml:
                    HulEmailLayout.Greeting("{{ dealer_name }}") +
                    HulEmailLayout.Paragraph("After review, we are unable to approve your return request for order <strong>{{ order_number }}</strong>.") +
                    HulEmailLayout.InfoBox("Reason", "{{ admin_notes }}", "warning") +
                    HulEmailLayout.Paragraph("If you need a manual re-review, contact support with your order number.") +
                    HulEmailLayout.Signoff()
            )),

        EmailTemplate.Create(
            "OrderCancelled",
            "Order {{ order_number }} Cancellation Update",
            HulEmailLayout.Wrap(
                title: "Order Cancelled",
                preheader: "Your order {{ order_number }} has been cancelled.",
                accentColor: HulEmailLayout.Danger,
                bodyHtml:
                    HulEmailLayout.Greeting("{{ dealer_name }}") +
                    HulEmailLayout.Paragraph("Your order <strong>{{ order_number }}</strong> has been cancelled.") +
                    HulEmailLayout.InfoBox("Cancellation Reason", "{{ reason }}", "danger") +
                    HulEmailLayout.Signoff()
            )),

        EmailTemplate.Create(
            "VehicleBreakdown",
            "Delivery Alert - Vehicle Breakdown for Order {{ order_number }}",
            HulEmailLayout.Wrap(
                title: "Delivery Alert",
                preheader: "The delivery vehicle for your order has broken down.",
                accentColor: HulEmailLayout.Warning,
                bodyHtml:
                    HulEmailLayout.Greeting("{{ dealer_name }}") +
                    HulEmailLayout.Paragraph("The delivery vehicle for your order <strong>{{ order_number }}</strong> has experienced a breakdown.") +
                    HulEmailLayout.InfoBox(
                        "Current Delivery Status",
                        "<strong>Status:</strong> {{ status }}<br/>" +
                        "<strong>Last Known Location:</strong> {{ place }}<br/>" +
                        "<strong>Updated At:</strong> {{ updated_at }}<br/>" +
                        "<strong>Issue Notes:</strong> {{ notes }}",
                        "warning") +
                    HulEmailLayout.InfoBox(
                        "Delivery Contact",
                        "<strong>Delivery Agent:</strong> {{ agent_name }}<br/>" +
                        "<strong>Agent Phone:</strong> {{ agent_phone }}<br/>" +
                        "<strong>Vehicle:</strong> {{ vehicle_type }} {{ vehicle_registration_no }}",
                        "warning") +
                    HulEmailLayout.Paragraph("Our delivery team will contact you shortly to arrange an alternate delivery plan.") +
                    HulEmailLayout.Button("Open Live Tracking", "http://localhost:4200/dealer/orders", HulEmailLayout.Warning) +
                    HulEmailLayout.Signoff()
            )),

        EmailTemplate.Create(
            "ShipmentStatusUpdated",
            "Order {{ order_number }} - Delivery Update: {{ status }}",
            HulEmailLayout.Wrap(
                title: "Delivery Update",
                preheader: "Your order {{ order_number }} has a new delivery update.",
                bodyHtml:
                    HulEmailLayout.Greeting("{{ dealer_name }}") +
                    HulEmailLayout.Paragraph("Your order <strong>{{ order_number }}</strong> has a new delivery update from our delivery agent.") +
                    HulEmailLayout.InfoBox(
                        "Latest Status: {{ status }}",
                        "<strong>Updated At:</strong> {{ updated_at }}<br/>" +
                        "<strong>Current Location:</strong> {{ place }}<br/>" +
                        "<strong>Notes:</strong> {{ notes }}",
                        "info") +
                    HulEmailLayout.InfoBox(
                        "Delivery Team",
                        "<strong>Delivery Agent:</strong> {{ agent_name }}<br/>" +
                        "<strong>Agent Phone:</strong> {{ agent_phone }}<br/>" +
                        "<strong>Vehicle:</strong> {{ vehicle_type }} {{ vehicle_registration_no }}",
                        "info") +
                    HulEmailLayout.Button("Track Order Live", "http://localhost:4200/dealer/orders", HulEmailLayout.Primary) +
                    HulEmailLayout.Signoff()
            )),
    };
}
