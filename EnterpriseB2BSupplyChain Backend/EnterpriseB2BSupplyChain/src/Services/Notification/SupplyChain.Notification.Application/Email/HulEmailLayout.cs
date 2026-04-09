namespace SupplyChain.Notification.Application.Email;

/// <summary>
/// Industry-standard HTML email layout for the HUL Supply Chain Platform.
///
/// All emails sent from the Notification service should be wrapped in <see cref="Wrap"/>
/// so they share a consistent header, footer, branding, and dark/light-friendly styles.
///
/// The HTML uses inline styles only (NO &lt;style&gt; blocks) because Gmail, Outlook
/// and most enterprise email clients strip or ignore embedded stylesheets. The layout
/// is fully responsive (max-width 600px, table-based skeleton).
/// </summary>
public static class HulEmailLayout
{
    // ─── HUL Brand Palette ────────────────────────────────────────────────
    public const string Primary       = "#0369a1";
    public const string PrimaryDark   = "#075985";
    public const string Accent        = "#f59e0b";
    public const string Success       = "#10b981";
    public const string Danger        = "#ef4444";
    public const string Warning       = "#f97316";
    public const string TextPrimary   = "#0f172a";
    public const string TextSecondary = "#475569";
    public const string TextMuted     = "#94a3b8";
    public const string BgPage        = "#f1f5f9";
    public const string BgCard        = "#ffffff";
    public const string Border        = "#e2e8f0";

    /// <summary>
    /// Wraps body HTML in the standard HUL email skeleton (header + footer + outer table).
    /// </summary>
    public static string Wrap(
        string  title,
        string  bodyHtml,
        string? preheader   = null,
        string? accentColor = null)
    {
        var headerColor   = accentColor ?? Primary;
        var preheaderText = preheader   ?? title;

        return $$"""
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "https://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html xmlns="https://www.w3.org/1999/xhtml" lang="en">
            <head>
              <meta charset="utf-8" />
              <meta http-equiv="X-UA-Compatible" content="IE=edge" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <meta name="format-detection" content="telephone=no" />
              <title>{{title}}</title>
            </head>
            <body style="margin:0;padding:0;background-color:{{BgPage}};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:{{TextPrimary}};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

              <div style="display:none;font-size:1px;color:{{BgPage}};line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
                {{preheaderText}}
              </div>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:{{BgPage}};padding:32px 16px;">
                <tr>
                  <td align="center">

                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background-color:{{BgCard}};border-radius:12px;box-shadow:0 4px 24px rgba(15,23,42,0.08);overflow:hidden;">

                      <tr>
                        <td style="background:linear-gradient(135deg,{{headerColor}} 0%,{{PrimaryDark}} 100%);padding:28px 32px;text-align:left;">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td>
                                <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.85);letter-spacing:1.4px;text-transform:uppercase;margin-bottom:6px;">
                                  HUL Supply Chain
                                </div>
                                <div style="font-size:22px;font-weight:700;color:#ffffff;line-height:1.25;">
                                  {{title}}
                                </div>
                              </td>
                              <td align="right" valign="top" style="width:48px;">
                                <div style="width:42px;height:42px;border-radius:10px;background-color:rgba(255,255,255,0.18);text-align:center;line-height:42px;font-size:18px;font-weight:700;color:#ffffff;font-family:Georgia,'Times New Roman',serif;">
                                  H
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:36px 36px 28px 36px;font-size:15px;line-height:1.65;color:{{TextSecondary}};">
                          {{bodyHtml}}
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:0 36px;">
                          <div style="border-top:1px solid {{Border}};"></div>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:24px 36px 32px 36px;text-align:center;">
                          <div style="font-size:13px;color:{{TextMuted}};line-height:1.6;">
                            This is an automated message from the <strong style="color:{{TextSecondary}};">HUL Supply Chain Platform</strong>.<br/>
                            Please do not reply directly to this email.
                          </div>
                          <div style="font-size:12px;color:{{TextMuted}};margin-top:14px;">
                            Need help? Contact <a href="mailto:support@hulsupply.com" style="color:{{Primary}};text-decoration:none;font-weight:600;">support@hulsupply.com</a>
                          </div>
                          <div style="font-size:11px;color:{{TextMuted}};margin-top:18px;letter-spacing:0.3px;">
                            &copy; 2026 Hindustan Unilever Limited &middot; All rights reserved
                          </div>
                        </td>
                      </tr>

                    </table>

                  </td>
                </tr>
              </table>

            </body>
            </html>
            """;
    }

    public static string Greeting(string name)
        => $"""<p style="margin:0 0 20px 0;font-size:16px;color:{TextPrimary};font-weight:600;">Hello, {name},</p>""";

    public static string Paragraph(string text)
        => $"""<p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:{TextSecondary};">{text}</p>""";

    public static string InfoBox(string title, string content, string color = "info")
    {
        var (bg, border, text) = color switch
        {
            "success" => ("#ecfdf5", "#a7f3d0", "#065f46"),
            "warning" => ("#fff7ed", "#fed7aa", "#9a3412"),
            "danger"  => ("#fef2f2", "#fca5a5", "#991b1b"),
            _         => ("#f0f9ff", "#bae6fd", "#0c4a6e"),
        };
        return $$"""
            <div style="margin:20px 0;padding:18px 20px;background-color:{{bg}};border:1px solid {{border}};border-left:4px solid {{border}};border-radius:8px;">
              <div style="font-size:13px;font-weight:700;color:{{text}};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">{{title}}</div>
              <div style="font-size:14px;color:{{text}};line-height:1.55;">{{content}}</div>
            </div>
            """;
    }

    public static string Button(string label, string href, string color = "")
    {
        var btnColor = string.IsNullOrEmpty(color) ? Primary : color;
        return $$"""
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:24px 0;">
              <tr>
                <td align="center" style="border-radius:8px;background-color:{{btnColor}};">
                  <a href="{{href}}" target="_blank" style="display:inline-block;padding:13px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">{{label}}</a>
                </td>
              </tr>
            </table>
            """;
    }

    public static string Signoff()
        => $"""
            <div style="margin-top:28px;font-size:14px;color:{TextSecondary};">
              Regards,<br/>
              <strong style="color:{TextPrimary};">HUL Supply Chain Team</strong>
            </div>
            """;
}
