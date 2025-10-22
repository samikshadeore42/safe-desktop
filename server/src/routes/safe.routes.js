import express from 'express';
import { createTxHandler, submitTxHandler } from '../controllers/safe.controller.js';

const router = express.Router();

router.post('/create', createTxHandler);   // builds typed-data & safeTxHash
router.post('/submit', submitTxHandler);   // validate signatures & return execTxRequest (or execute)

export default router;
