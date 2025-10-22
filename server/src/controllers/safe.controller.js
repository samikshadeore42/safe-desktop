import { createSafeTransaction, buildExecTxRequest, executeExecTransaction } from '../services/safe.service.js';
import { verifySignaturesAgainstOwners } from '../services/validation.service.js';

// POST /safe/create
export async function createTxHandler(req, res) {
  try {
    const { to, value, data } = req.body;
    if (!to) return res.status(400).json({ error: 'Missing "to" parameter' });

    const result = await createSafeTransaction({ to, value, data });
    // result: { safeTransactionData, typedData, safeTxHash }
    return res.json(result);
  } catch (err) {
    console.error('createTxHandler err', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}

// POST /safe/submit
export async function submitTxHandler(req, res) {
  try {
    const { safeTxHash, safeTransactionData, signatures, executeWith } = req.body;
    if (!safeTxHash || !safeTransactionData || !Array.isArray(signatures)) {
      return res.status(400).json({ error: 'Missing required fields: safeTxHash | safeTransactionData | signatures[]' });
    }

    // Validate signatures: recovers and ensures they are owners and meet threshold
    const validation = await verifySignaturesAgainstOwners(safeTxHash, signatures);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }
    const { packedSignatures } = validation; // hex bytes

    // Build exec tx request for frontend/MetaMask or server execution
    const execTxRequest = buildExecTxRequest(safeTransactionData, packedSignatures);

    if (executeWith === 'server') {
      // server executes via EXECUTOR_PK in env
      const executorPk = process.env.EXECUTOR_PK;
      if (!executorPk) {
        return res.status(500).json({ error: 'Server execution requested but EXECUTOR_PK not configured in env' });
      }
      const txHash = await executeExecTransaction(execTxRequest, executorPk);
      return res.json({ status: 'executed', txHash });
    }

    // default: return execTxRequest for the client to submit via their wallet (MetaMask)
    return res.json({ status: 'ready', execTxRequest });

  } catch (err) {
    console.error('submitTxHandler err', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}
