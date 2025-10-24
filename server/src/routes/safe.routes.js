import express from 'express';
import {
  generateKeyPairHandler,
} from '../controllers/safe-sdk.controller.js';

const router = express.Router();

router.post('/generate-keypair', generateKeyPairHandler);



export default router;
