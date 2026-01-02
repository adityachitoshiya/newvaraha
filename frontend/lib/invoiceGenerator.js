import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateInvoicePDF = (orderData) => {
  console.log('📄 Starting invoice generation...', orderData);
  
  if (!orderData) {
    console.error('❌ Order data is missing');
    throw new Error('Order data is required');
  }

  // Check if jsPDF is available
  if (typeof window === 'undefined') {
    console.error('❌ Running on server side, jsPDF requires browser');
    throw new Error('PDF generation only works in browser');
  }

  try {
    // Ensure discount data exists with fallback
    const discount = orderData.discount || {};
    const originalAmount = discount.originalAmount || (orderData.amount === 1 ? 2499 : orderData.amount);
    const discountAmount = discount.discountAmount || (orderData.amount === 1 ? 2498 : 0);
    
    console.log('💰 Pricing:', { originalAmount, discountAmount, finalAmount: orderData.amount });
    
    const doc = new jsPDF();
    
    // Set colors
    const primaryColor = [122, 59, 35]; // Heritage Brown
    const copperColor = [163, 86, 42]; // Copper
    const goldColor = [224, 122, 36]; // Orange/Gold
  
  // Logo/Header Section
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, 'F');
  
  // Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('VARAHA JEWELS', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Crafting Heritage Since Generations', 105, 28, { align: 'center' });
  
  // Invoice Title
  doc.setTextColor(...primaryColor);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 105, 52, { align: 'center' });
  
  // Invoice Details Box
  const invoiceY = 62;
  doc.setDrawColor(...copperColor);
  doc.setLineWidth(0.5);
  doc.rect(15, invoiceY, 180, 25);
  
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.setFont('helvetica', 'normal');
  
  // Left side - Order details
  const invoiceNumber = orderData.orderId || orderData.id || `ORD-${Date.now()}`;
  doc.text(`Invoice No: ${invoiceNumber}`, 20, invoiceY + 8);
  doc.text(`Payment ID: ${orderData.paymentId || 'N/A'}`, 20, invoiceY + 14);
  doc.text(`Invoice Date: ${new Date(orderData.createdAt || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })}`, 20, invoiceY + 20);
  
  // Right side - Status
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 139, 34);
  doc.text(orderData.status.toUpperCase(), 175, invoiceY + 12, { align: 'right' });
  
  // Customer Details Section
  const customerY = 95;
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', 15, customerY);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);
  doc.text(orderData.customer.name, 15, customerY + 8);
  doc.text(orderData.customer.email, 15, customerY + 14);
  doc.text(orderData.customer.contact, 15, customerY + 20);
  
  if (orderData.customer.address) {
    const addressLines = doc.splitTextToSize(orderData.customer.address, 80);
    doc.text(addressLines, 15, customerY + 26);
  }
  
  // Product Table
  const tableY = customerY + 45;
  
  autoTable(doc, {
    startY: tableY,
    head: [['Item', 'Variant ID', 'Quantity', 'Unit Price', 'Amount']],
    body: [
      [
        orderData.product.productName || 'Varaha Jewels Product',
        orderData.product.variantId,
        orderData.product.quantity.toString(),
        `₹${originalAmount.toLocaleString('en-IN')}`,
        `₹${originalAmount.toLocaleString('en-IN')}`
      ]
    ],
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      textColor: [60, 60, 60],
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 60, halign: 'left' },
      1: { cellWidth: 40, halign: 'center' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' }
    },
    margin: { left: 15, right: 15 }
  });
  
  // Summary Section
  const summaryY = doc.lastAutoTable.finalY + 10;
  const summaryX = 130;
  
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.setFont('helvetica', 'normal');
  
  // Subtotal
  doc.text('Subtotal:', summaryX, summaryY);
  doc.text(`₹${originalAmount.toLocaleString('en-IN')}`, 190, summaryY, { align: 'right' });
  
  // Discount
  if (discount.couponCode) {
    doc.setTextColor(34, 139, 34);
    doc.text(`Discount (${discount.couponCode}):`, summaryX, summaryY + 6);
    doc.text(`-₹${discountAmount.toLocaleString('en-IN')}`, 190, summaryY + 6, { align: 'right' });
  }
  
  // Tax
  doc.setTextColor(80);
  doc.text('Tax (Included):', summaryX, summaryY + 12);
  doc.text('₹0', 190, summaryY + 12, { align: 'right' });
  
  // Shipping
  doc.setTextColor(34, 139, 34);
  doc.text('Shipping:', summaryX, summaryY + 18);
  doc.text('FREE', 190, summaryY + 18, { align: 'right' });
  
  // Total Line
  doc.setDrawColor(...copperColor);
  doc.setLineWidth(0.3);
  doc.line(summaryX, summaryY + 22, 190, summaryY + 22);
  
  // Grand Total
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('TOTAL:', summaryX, summaryY + 30);
  doc.setTextColor(...copperColor);
  doc.setFontSize(14);
  doc.text(`₹${orderData.amount.toLocaleString('en-IN')}`, 190, summaryY + 30, { align: 'right' });
  
  // Payment Status Badge
  doc.setFillColor(34, 139, 34);
  doc.roundedRect(summaryX, summaryY + 35, 60, 8, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT RECEIVED', summaryX + 30, summaryY + 40, { align: 'center' });
  
  // Notes Section
  const notesY = summaryY + 55;
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Notes:', 15, notesY);
  
  doc.setFontSize(8);
  doc.setTextColor(80);
  doc.setFont('helvetica', 'normal');
  doc.text('• All products are BIS hallmarked and come with authenticity certificate', 15, notesY + 6);
  doc.text('• 30-day return policy applicable on all purchases', 15, notesY + 11);
  doc.text('• For any queries, contact us at support@varahajewels.com', 15, notesY + 16);
  
  // Footer
  const footerY = 275;
  doc.setDrawColor(...copperColor);
  doc.setLineWidth(0.3);
  doc.line(15, footerY, 195, footerY);
  
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Thank you for choosing Varaha Jewels!', 105, footerY + 5, { align: 'center' });
  doc.text('www.varahajewels.com | +91-XXXXXXXXXX | support@varahajewels.com', 105, footerY + 10, { align: 'center' });
  
  // Save the PDF
  const orderIdForFile = orderData.orderId || orderData.id || `ORDER-${Date.now()}`;
  const fileName = `Varaha_Invoice_${orderIdForFile}.pdf`;
  console.log('💾 Saving invoice as:', fileName);
  doc.save(fileName);
  
  console.log('✅ Invoice download triggered successfully');
  return fileName;
  
  } catch (error) {
    console.error('❌ PDF Generation Error:', error);
    throw new Error(`Failed to generate PDF: ${error.message}`);
  }
};
