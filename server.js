// server.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const webpush = require('web-push'); // Added for push notifications

const app = express();
const server = http.createServer(app);

// Configure CORS for Express (for HTTP requests)
// IMPORTANT: Replace 'http://127.0.0.1:5500' with your actual frontend URL
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// Configure Socket.IO with CORS (for WebSocket connections)
// IMPORTANT: Replace 'http://127.0.0.1:5500' with your actual frontend URL
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.use(express.json()); // Middleware to parse JSON request bodies

// --- VAPID Keys (Generate these once and keep them secret!) ---
// Run `npx web-push generate-vapid-keys` in your terminal to get these.
// IMPORTANT: Replace these placeholders with your actual generated keys.
const publicVapidKey = 'BLiRj3rWakPpbrEOrO1SsSbbwAFrflDw1p6ccmwi8AU1C9cE51vbrF4h3sOCMv5G6Osm9ysiXbkOCT2Q5bS4_rs';
const privateVapidKey = 'U_xYGvp_sh2I5yHfiwTTFlB-7IO3jRIq_knUcSny1z8';

// IMPORTANT: Replace 'mailto:your-email@example.com' with your actual email.
webpush.setVapidDetails('mailto:prog98952@gmail.com', publicVapidKey, privateVapidKey);

// --- In-memory "Database" for orders, staff, and subscriptions ---
let orders = []; // Stores all placed orders
let staffMembers = [
    { id: 'staff', password: 'password', name: 'Admin Staff', role: 'Manager' }
]; // Example staff credentials
let pushSubscriptions = []; // Stores push notification subscriptions for staff

// --- API Endpoints ---

// Endpoint for customers to place orders
app.post('/api/orders', (req, res) => {
    const newOrder = {
        id: `ORD-${Date.now()}`,
        customer: req.body.customer,
        items: req.body.items,
        status: 'received', // Initial status
        timestamp: new Date().toISOString()
    };

    orders.push(newOrder);
    console.log('New order received:', newOrder);

    // Emit the new order to all connected staff clients via Socket.IO
    io.emit('newOrder', newOrder); // 'newOrder' is the event name

    // Send push notification to all subscribed staff
    const notificationPayload = JSON.stringify({
        title: `New Order: ${newOrder.id}`,
        body: `Customer: ${newOrder.customer.name}, Items: ${newOrder.items.length}`,
        body: `Address: ${newOrder.customer.address}, Phone: ${newOrder.customer.phone}, `,
        url: 'http://127.0.0.1:5500' // IMPORTANT: URL to open when notification is clicked (your frontend URL)
    });

    pushSubscriptions.forEach(sub => {
        webpush.sendNotification(sub, notificationPayload)
            .then(() => console.log('Push notification sent!'))
            .catch(error => console.error('Error sending push notification:', error.stack));
    });

    res.status(201).json({ message: 'Order placed successfully!', orderId: newOrder.id });
});

// Endpoint for staff login (basic example)
app.post('/api/staff/login', (req, res) => {
    const { staffId, password } = req.body;
    const staff = staffMembers.find(s => s.id === staffId && s.password === password);

    if (staff) {
        // Send public VAPID key to the frontend upon successful login
        res.status(200).json({ message: 'Login successful', staff: { id: staff.id, name: staff.name, role: staff.role }, publicVapidKey: publicVapidKey });
    } else {
        res.status(401).json({ message: 'Invalid staff ID or password' });
    }
});

// Endpoint to get all current orders (for staff panel)
app.get('/api/orders', (req, res) => {
    res.status(200).json(orders);
});

// New endpoint to save push subscriptions from the frontend
app.post('/api/subscribe', (req, res) => {
    const subscription = req.body;
    console.log('Received push subscription:', subscription);

    // In a real app, you'd save this to a database associated with the staff member
    // For this example, we'll just add it to our in-memory array, ensuring no duplicates
    const existingSub = pushSubscriptions.find(s => s.endpoint === subscription.endpoint);
    if (!existingSub) {
        pushSubscriptions.push(subscription);
        console.log('New push subscription added.');
    } else {
        console.log('Subscription already exists.');
    }

    res.status(201).json({ message: 'Subscription saved' });
});

// --- Socket.IO Connection Handling ---
io.on('connection', (socket) => {
    console.log('A staff client connected:', socket.id);

    // Optionally, send existing orders to newly connected staff
    socket.emit('existingOrders', orders);

    socket.on('disconnect', () => {
        console.log('A staff client disconnected:', socket.id);
    });

    // Example: Staff can update order status (you'd add more robust logic here)
    socket.on('updateOrderStatus', ({ orderId, newStatus }) => {
        const orderIndex = orders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            orders[orderIndex].status = newStatus;
            console.log(`Order ${orderId} status updated to: ${newStatus}`);
            // Broadcast the update to all connected staff clients
            io.emit('orderUpdated', orders[orderIndex]);
        }
    });
});

// --- Start the Server ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Frontend should be configured to send requests to http://localhost:${PORT}`);
    console.log(`VAPID Public Key: ${publicVapidKey}`);
});
