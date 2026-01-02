<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Royal Order Confirmation</title>
    <style>
        /* Reset styles */
        body { margin: 0; padding: 0; background-color: #f4f1ea; font-family: 'Helvetica', 'Arial', sans-serif; -webkit-font-smoothing: antialiased; }
        table { border-collapse: collapse; width: 100%; }
        
        /* Container */
        .wrapper { width: 100%; table-layout: fixed; background-color: #f4f1ea; padding-bottom: 50px; padding-top: 50px; }
        .main-content { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; font-family: 'Helvetica', 'Arial', sans-serif; color: #2c2c2c; box-shadow: 0 5px 25px rgba(0,0,0,0.08); border: 1px solid #e0d8c3; }
        
        /* Decorative Frame inside content */
        .inner-border { border: 2px double #c5a059; margin: 15px; display: block; }

        /* Header */
        .header { padding: 60px 40px 40px 40px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #f0e6d2; }
        .logo { font-family: 'Georgia', 'Times New Roman', serif; font-size: 32px; color: #1a1a1a; text-decoration: none; letter-spacing: 4px; text-transform: uppercase; font-weight: normal; border-bottom: 2px solid #c5a059; padding-bottom: 10px; display: inline-block; }
        .tagline { font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin-top: 15px; color: #888; display: block; font-family: 'Helvetica', 'Arial', sans-serif; }
        
        /* Body */
        .content-section { padding: 40px 50px 60px 50px; }
        .welcome-text { font-family: 'Georgia', 'Times New Roman', serif; font-size: 26px; font-weight: normal; margin-bottom: 25px; color: #1a1a1a; text-align: center; letter-spacing: 0.5px; font-style: italic; }
        .body-text { font-size: 16px; line-height: 1.9; color: #555555; margin-bottom: 45px; text-align: center; font-weight: normal; font-family: 'Helvetica', 'Arial', sans-serif; }
        
        /* Order Details Box */
        .order-box { background-color: #faf9f6; padding: 30px; margin-bottom: 40px; border: 1px solid #e8e3d6; }
        .order-header { font-size: 13px; text-transform: uppercase; letter-spacing: 2px; color: #c5a059; margin-bottom: 25px; font-weight: bold; text-align: center; border-bottom: 1px solid #e8e3d6; padding-bottom: 15px; }
        
        /* Order Items */
        .item-row { width: 100%; margin-bottom: 20px; display: block; border-bottom: 1px dashed #e0d8c3; padding-bottom: 20px; }
        .item-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
        .item-name { font-weight: normal; color: #1a1a1a; float: left; font-size: 16px; letter-spacing: 0.5px; font-family: 'Georgia', 'Times New Roman', serif; }
        .item-price { float: right; color: #444; font-weight: normal; font-family: 'Helvetica', 'Arial', sans-serif; font-size: 15px; }
        .clearfix::after { content: ""; clear: both; display: table; }
        
        /* Totals */
        .total-section { border-top: 1px solid #c5a059; margin-top: 25px; padding-top: 25px; }
        .total-row { margin-bottom: 12px; }
        .total-label { float: left; color: #777; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-family: 'Helvetica', 'Arial', sans-serif; }
        .total-value { float: right; font-weight: normal; color: #1a1a1a; font-family: 'Helvetica', 'Arial', sans-serif; }
        .grand-total { font-size: 20px; margin-top: 20px; color: #1a1a1a; }
        .grand-total .total-label { color: #1a1a1a; font-weight: bold; font-family: 'Georgia', 'Times New Roman', serif; }
        .grand-total .total-value { color: #c5a059; font-weight: bold; font-family: 'Helvetica', 'Arial', sans-serif; }

        /* Button */
        .btn-container { text-align: center; margin: 50px 0; }
        .btn { background-color: #1a1a1a; color: #c5a059; padding: 20px 45px; text-decoration: none; border-radius: 0px; font-weight: normal; display: inline-block; font-size: 14px; text-transform: uppercase; letter-spacing: 2.5px; border: 1px solid #c5a059; transition: all 0.3s; font-family: 'Helvetica', 'Arial', sans-serif; }
        .btn:hover { background-color: #c5a059; color: #fff; }
        
        /* Footer */
        .footer { background-color: #f4f1ea; padding: 40px 40px; text-align: center; font-size: 11px; color: #8a8579; text-transform: uppercase; letter-spacing: 1.5px; font-family: 'Helvetica', 'Arial', sans-serif; }
        .footer a { color: #8a8579; text-decoration: none; border-bottom: 1px solid #ccc; padding-bottom: 2px; margin: 0 8px; }
        
        /* Mobile Responsive */
        @media screen and (max-width: 600px) {
            .main-content { width: 100% !important; border: none; }
            .inner-border { margin: 0; border: none; }
            .content-section { padding: 30px 20px !important; }
            .header { padding: 40px 20px !important; }
            .btn { width: 100%; box-sizing: border-box; }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <center>
            <table class="main-content">
                <tr>
                    <td>
                        <!-- Decorative Inner Border Start -->
                        <div class="inner-border">
                            <table style="width: 100%;">
                                <!-- Header / Logo -->
                                <tr>
                                    <td class="header">
                                        <!-- YAHAN LOGO IMAGE KA URL LAGAYEIN | PLACE LOGO IMG TAG HERE -->
                                        <!-- Example: <img src="https://your-website.com/logo.png" alt="Royal Heritage" width="200" style="border:0;"> -->
                                        <a href="#" class="logo">[LOGO IMAGE PLACEHOLDER]</a>
                                        <span class="tagline">Est. 1925 • Jaipur</span>
                                    </td>
                                </tr>

                                <!-- Main Content -->
                                <tr>
                                    <td class="content-section">
                                        <h1 class="welcome-text">Your Treasure Awaits</h1>
                                        <p class="body-text">
                                            Namaste <strong>[Customer Name]</strong>,<br>
                                            We are delighted to confirm your recent acquisition. Your timeless pieces are being prepared with the utmost care and will soon be on their way to you.
                                        </p>

                                        <!-- Order Summary Box -->
                                        <div class="order-box">
                                            <div class="order-header">Order #[Order Number]</div>
                                            
                                            <!-- Items -->
                                            <div class="item-row clearfix">
                                                <span class="item-name">Kundan Polki Necklace Set</span>
                                                <span class="item-price">₹1,25,000</span>
                                            </div>
                                            <div class="item-row clearfix">
                                                <span class="item-name">Antique Gold Bangles (Size 2.4)</span>
                                                <span class="item-price">₹45,000</span>
                                            </div>

                                            <!-- Totals -->
                                            <div class="total-section">
                                                <div class="total-row clearfix">
                                                    <span class="total-label">Subtotal</span>
                                                    <span class="total-value">₹1,70,000</span>
                                                </div>
                                                <div class="total-row clearfix">
                                                    <span class="total-label">Insured Shipping</span>
                                                    <span class="total-value">Complimentary</span>
                                                </div>
                                                <div class="total-row clearfix grand-total">
                                                    <span class="total-label">Grand Total</span>
                                                    <span class="total-value">₹1,70,000</span>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- CTA Button -->
                                        <div class="btn-container">
                                            <a href="#" class="btn">Track Your Shipment</a>
                                        </div>
                                        
                                        <p style="text-align: center; font-size: 14px; color: #777; margin-top: 30px; font-family: 'Helvetica', sans-serif;">
                                            Expected Delivery: <strong>Monday, Oct 28</strong>
                                        </p>
                                        
                                        <div style="text-align: center; margin: 40px 0;">
                                            <span style="font-size: 20px; color: #c5a059;">♦</span>
                                        </div>

                                        <!-- Shipping Address -->
                                        <div style="text-align: center; font-size: 14px; color: #444; line-height: 1.6;">
                                            <strong style="text-transform: uppercase; letter-spacing: 1px; font-size: 12px; color: #c5a059;">Shipping Destination</strong><br>
                                            [Customer Name]<br>
                                            123 Palace Road, Civil Lines<br>
                                            Jaipur, Rajasthan 302006
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </div>
                        <!-- Decorative Inner Border End -->
                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td class="footer">
                        <p>&copy; 2024 Royal Heritage Jewellers. All rights reserved.</p>
                        <p>Johari Bazar, Jaipur • New Delhi • Mumbai</p>
                        <p style="margin-top: 20px;"><a href="#">Unsubscribe</a> | <a href="#">Care Instructions</a> | <a href="#">Concierge</a></p>
                    </td>
                </tr>
            </table>
        </center>
    </div>
</body>
</html>