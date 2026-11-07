import express from 'express';
import { getOrderController } from './container/container';

const orderController = getOrderController();

const app = express();
app.use(express.json());

app.post('/orders', orderController.processOrder);

export default app;
