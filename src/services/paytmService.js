import PaytmChecksum from "paytmchecksum";

import env from "../config/env.js";

const getPaytmHost = () => {
  if (env.paytmEnvironment === "production") {
    return "https://securegw.paytm.in";
  }

  return "https://securegw-stage.paytm.in";
};

export const createPaytmTransaction = async ({ orderId, amount, customerId }) => {
  const body = {
    requestType: "Payment",

    mid: env.paytmMid,

    websiteName: env.paytmWebsite,

    orderId,

    txnAmount: {
      value: Number(amount).toFixed(2),
      currency: "INR",
    },

    userInfo: {
      custId: String(customerId),
    },

    callbackUrl: env.paytmCallbackUrl,
  };

  const bodyString = JSON.stringify(body);

  const signature = await PaytmChecksum.generateSignature(bodyString, env.paytmMerchantKey);

  const payload = {
    head: {
      signature,
    },

    body,
  };

  const response = await fetch(`${getPaytmHost()}/theia/api/v1/initiateTransaction?mid=${encodeURIComponent(env.paytmMid)}&orderId=${encodeURIComponent(orderId)}`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.body?.resultInfo?.resultMsg || "Unable to initiate Paytm transaction.");
  }

  if (!data?.body?.txnToken) {
    throw new Error(data?.body?.resultInfo?.resultMsg || "Paytm transaction token was not generated.");
  }

  return {
    txnToken: data.body.txnToken,

    resultInfo: data.body.resultInfo || null,
  };
};

export const getPaytmTransactionStatus = async (orderId) => {
  const body = {
    mid: env.paytmMid,
    orderId,
  };

  const bodyString = JSON.stringify(body);

  const signature = await PaytmChecksum.generateSignature(bodyString, env.paytmMerchantKey);

  const payload = {
    head: {
      signature,
    },

    body,
  };

  const response = await fetch(`${getPaytmHost()}/v3/order/status`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.body?.resultInfo?.resultMsg || "Unable to verify Paytm payment.");
  }

  return data;
};

export const verifyPaytmCallback = async (callbackData) => {
  const checksumHash = callbackData?.CHECKSUMHASH;

  if (!checksumHash) {
    return false;
  }

  const data = {
    ...callbackData,
  };

  delete data.CHECKSUMHASH;

  return PaytmChecksum.verifySignature(data, env.paytmMerchantKey, checksumHash);
};
