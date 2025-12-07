// Beautiful HTML email template with modern design
export const createWelcomeTemplate = (username: string, email: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to LordCloud</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">🎉 Welcome to LordCloud!</h1>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Hello, {{username}}! 👋</h2>
                            <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                                Thank you for joining <strong>LordCloud</strong>! We're excited to have you on board.
                            </p>
                            <p style="color: #666666; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;">
                                Your account has been successfully created with the email: <strong>{{email}}</strong>
                            </p>
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{{panelUrl}}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                                            Get Started →
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Features -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                                <tr>
                                    <td style="padding: 15px; background: #f8f9ff; border-radius: 8px; margin-bottom: 10px;">
                                        <strong style="color: #667eea;">⚡ Fast Deployment</strong>
                                        <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Deploy servers in seconds with our powerful panel</p>
                                    </td>
                                </tr>
                                <tr><td style="height: 10px;"></td></tr>
                                <tr>
                                    <td style="padding: 15px; background: #f8f9ff; border-radius: 8px;">
                                        <strong style="color: #667eea;">💎 Free Coins System</strong>
                                        <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Earn coins and upgrade your servers</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: #f8f9ff; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px;">
                                Need help? Contact us at <a href="mailto:support@lordcloud.in" style="color: #667eea; text-decoration: none;">support@lordcloud.in</a>
                            </p>
                            <p style="margin: 0; color: #cccccc; font-size: 12px;">
                                © 2024 LordCloud. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

export const createServerDeployedTemplate = () => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Server Deployed Successfully</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);">
    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">🚀 Server Deployed!</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="color: #333333; margin: 0 0 20px 0;">Hello {{username}}!</h2>
                            <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0;">
                                Great news! Your server <strong>{{serverName}}</strong> has been successfully deployed.
                            </p>
                            <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; color: #065f46; font-weight: bold;">Server Details:</p>
                                <p style="margin: 5px 0; color: #047857;"><strong>Name:</strong> {{serverName}}</p>
                                <p style="margin: 5px 0; color: #047857;"><strong>RAM:</strong> {{ram}} MB</p>
                                <p style="margin: 5px 0; color: #047857;"><strong>Disk:</strong> {{disk}} MB</p>
                                <p style="margin: 5px 0; color: #047857;"><strong>CPU:</strong> {{cpu}}%</p>
                            </div>
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{{serverUrl}}" style="display: inline-block; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                            Manage Server →
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="background: #f8f9ff; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="margin: 0; color: #999999; font-size: 14px;">
                                © 2024 LordCloud. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;
