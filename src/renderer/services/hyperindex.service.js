export const HYPERINDEX_URL = "http://localhost:8080/v1/graphql"; // Change if needed

async function gql(query, variables = {}) {
  const res = await fetch(HYPERINDEX_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }) // include variables
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

export async function fetchLatestExecutions(limit) {
  // make sure limit is an integer:
  limit = Number.isInteger(limit) ? limit : 10;
  const q = `
    query LatestExecs($limit: Int!) {
      Safe_ExecutionSuccess(
        order_by: { id: desc }
        limit: $limit
      ) {
        id
        txHash
        payment
      }
    }
  `;
  const data = await gql(q, { limit });
  return data.Safe_ExecutionSuccess ?? [];
}

export async function fetchLatestMultiSigTx(limit) {
  limit = Number.isInteger(limit) ? limit : 10;
  const q = `
    query LatestMultiSigTx($limit: Int!) {
      Safe_SafeMultiSigTransaction(
        order_by: { id: desc }
        limit: $limit
      ) {
        id
        to
        value
        data
        operation
        safeTxGas
        baseGas
        gasPrice
        gasToken
        refundReceiver
        signatures
        additionalInfo
      }
    }
  `;
  const data = await gql(q, { limit });
  return data.Safe_SafeMultiSigTransaction ?? [];
}
