// server.js
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const ORDERS_FILE = path.join(__dirname, 'orders.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files if needed

// Initialize orders file if it doesn't exist
async function initializeOrdersFile() {
  try {
    await fs.access(ORDERS_FILE);
  } catch (error) {
    // File doesn't exist, create it with empty array
    await fs.writeFile(ORDERS_FILE, JSON.stringify([], null, 2));
    console.log('Created new orders file');
  }
}

// Read orders from file
async function readOrders() {
  try {
    const data = await fs.readFile(ORDERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading orders file:', error);
    return [];
  }
}

// Write orders to file
async function writeOrders(orders) {
  try {
    await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing to orders file:', error);
    return false;
  }
}

// API Routes

// Get all orders
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await readOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get order by ID
app.get('/api/orders/:id', async (req, res) => {
  try {
    const orders = await readOrders();
    const order = orders.find(o => o.id === req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Create a new order
app.post('/api/orders', async (req, res) => {
  try {
    const { customer, items, specialInstructions, paymentMethod } = req.body;
    
    // Basic validation
    if (!customer || !customer.name || !customer.phone || !customer.address || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const orders = await readOrders();
    
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.price, 0);
    const delivery = 15; // Fixed delivery charge
    const total = subtotal + delivery;
    
    // Create new order
    const newOrder = {
      id: `ORD-${Date.now()}`,
      customer,
      items,
      specialInstructions: specialInstructions || '',
      paymentMethod: paymentMethod || 'COD',
      subtotal,
      delivery,
      total,
      status: 'received',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add to orders array and save
    orders.push(newOrder);
    const success = await writeOrders(orders);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to save order' });
    }
    
    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order status
app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['received', 'preparing', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const orders = await readOrders();
    const orderIndex = orders.findIndex(o => o.id === req.params.id);
    
    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    orders[orderIndex].status = status;
    orders[orderIndex].updatedAt = new Date().toISOString();
    
    const success = await writeOrders(orders);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to update order' });
    }
    
    res.json(orders[orderIndex]);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Staff authentication (simple version for demo)
app.post('/api/staff/login', (req, res) => {
  const { staffId, password } = req.body;
  
  // Simple authentication - in a real app, use proper authentication
  if (staffId === 'staff' && password === 'password') {
    res.json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

// Get order statistics
app.get('/api/stats', async (req, res) => {
  try {
    const orders = await readOrders();
    const totalOrders = orders.length;
    const activeOrders = orders.filter(o => 
      o.status === 'received' || o.status === 'preparing'
    ).length;
    
    res.json({ totalOrders, activeOrders });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Start server
async function startServer() {
  await initializeOrdersFile();
  
  app.listen(PORT, () => {
    console.log(`VyBBe server running on port ${PORT}`);
  });
}

startServer().catch(console.error);