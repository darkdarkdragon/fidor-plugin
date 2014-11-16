'use strict';

var express = require('express');
var OauthHandler       = require(__dirname + '/controllers/oauth.js');
var PaymentsController = require(__dirname + '/controllers/payments.js');

function FidorPlugin(options) {
  var router = new express.Router();

  var oauthHandler = new OauthHandler({
    gatewayd: options.gatewayd
  });
  var paymentsController = new PaymentsController({
    gatewayd: options.gatewayd,
    dataStore: oauthHandler.dataStore
  });

  // router.get('/astropay/info', paymentsController.info.bind(paymentsController));
  // router.get('/astropay/payments/:gateway_transaction_id/status', paymentsController.paymentStatus.bind(paymentsController));
  // router.get('/astropay/payments/quotes/:address/:amount', quotesController.getQuote.bind(quotesController));

  // router.post('/astropay/payments', paymentsController.payment.bind(paymentsController));
  // router.post('/astropay/payments/callback', paymentsController.paymentCallback.bind(paymentsController));

  router.post('/fidor/deposit', paymentsController.deposit.bind(paymentsController));
  router.get('/fidor/code', oauthHandler.ocode.bind(oauthHandler));
  router.get('/code', oauthHandler.ocode.bind(oauthHandler));

  router.use('/fidor', express.static(__dirname + '/public'));
  this.router = router;
  this.processes = {
     fidor_incoming: __dirname + '/processes/fidor_incoming.js'
  };
}

module.exports = FidorPlugin;
