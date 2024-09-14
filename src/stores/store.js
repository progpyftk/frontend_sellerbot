import { defineStore } from "pinia";
import actioncable from "actioncable";

export const useStore = defineStore("main", {
  state: () => ({
    isProcessingPromotions: false,
    cable: null,
    authToken: "meutoken",
    currentUser: "not logged",
    databaseUpdate: "not updated",
    // backend_url: 'http://api.sellerbot.com.br',
    backend_url: "http://localhost:3000",
  }),
  getters: {},
  actions: {
    createCable() {
      const cable = actioncable.createConsumer(
        process.env.VUE_APP_WEBSOCKET_HOST + "/cable"
      );
      console.log("Setting cable instance:", cable);
      this.cable = cable;
    },
    setProcessingPromotions(isProcessing) {
      console.log(`isProcessingPromotions is set to: ${isProcessing}`);
      this.isProcessingPromotions = isProcessing;
    },
  },
});
