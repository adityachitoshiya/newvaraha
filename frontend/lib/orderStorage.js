import fs from 'fs';
import path from 'path';

const ORDERS_FILE = path.join(process.cwd(), 'data', 'orders.json');

// Ensure data directory exists
const ensureDataDirectory = () => {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Read all orders
export const getOrders = () => {
  ensureDataDirectory();
  
  if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));
    return [];
  }
  
  try {
    const data = fs.readFileSync(ORDERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading orders:', error);
    return [];
  }
};

// Save a new order
export const saveOrder = (orderData) => {
  ensureDataDirectory();
  
  const orders = getOrders();
  const newOrder = {
    id: orderData.orderId || `ORD-${Date.now()}`,
    paymentId: orderData.paymentId || 'pending',
    razorpayOrderId: orderData.razorpayOrderId || null,
    amount: orderData.amount,
    currency: orderData.currency || 'INR',
    status: orderData.status || 'pending',
    
    // Customer details
    customer: {
      name: orderData.name,
      email: orderData.email,
      contact: orderData.contact,
      address: orderData.address,
    },
    
    // Product details
    product: {
      productId: orderData.productId,
      variantId: orderData.variantId,
      productName: orderData.productName || 'Product',
      quantity: orderData.quantity,
    },
    
    // Discount details
    discount: {
      couponCode: orderData.couponCode || null,
      discountPercent: orderData.discount || 0,
      discountAmount: orderData.discountAmount || 0,
      originalAmount: orderData.originalAmount || orderData.amount,
    },
    
    // Timestamps
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    
    // Additional notes
    notes: orderData.notes || {},
  };
  
  orders.push(newOrder);
  
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
    return newOrder;
  } catch (error) {
    console.error('Error saving order:', error);
    throw new Error('Failed to save order');
  }
};

// Update order status (e.g., after payment confirmation)
export const updateOrderStatus = (orderId, status, paymentId = null) => {
  const orders = getOrders();
  const orderIndex = orders.findIndex(order => order.id === orderId);
  
  if (orderIndex === -1) {
    throw new Error('Order not found');
  }
  
  orders[orderIndex].status = status;
  orders[orderIndex].updatedAt = new Date().toISOString();
  
  if (paymentId) {
    orders[orderIndex].paymentId = paymentId;
  }
  
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
    return orders[orderIndex];
  } catch (error) {
    console.error('Error updating order:', error);
    throw new Error('Failed to update order');
  }
};

// Get order by ID
export const getOrderById = (orderId) => {
  const orders = getOrders();
  return orders.find(order => order.id === orderId);
};

// Get orders by email
export const getOrdersByEmail = (email) => {
  const orders = getOrders();
  return orders.filter(order => order.customer.email === email);
};
