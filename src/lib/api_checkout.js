export const checkout = {
  evaluate: async (data) => {
    return apiClient.post('/checkout/evaluate', data);
  },
  verifyOtp: async (transactionId, otp) => {
    return apiClient.post('/checkout/verify-otp', { transaction_id: transactionId, otp });
  }
};
