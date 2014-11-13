"use strict";

var Promise   = require('bluebird');
var CURRENCY  = 'EUX';

var superagent  = require('superagent');
var url         = require('url')
var querystring = require('querystring')
var uuid        = require('node-uuid');

function PaymentsController(options) {
  this.gatewayd = options.gatewayd;
  this.config = this.gatewayd.config.get('FIDOR');
}

PaymentsController.prototype = {

  deposit: function (request, response) {
    console.log('----------- PaymentsController::deposit');
    var _this = this;
    var depositRequest = request.body;
    console.log(depositRequest);

    if (!depositRequest.address || 
        !depositRequest.amount || isNaN(+depositRequest.amount) ||
        !depositRequest.fidor_address || 
        !depositRequest.code || 
        !depositRequest.fidor_address ||
        !depositRequest.currency) {
      response.writeHead(400, "Bad Request");
      response.end();
      return;
    }

    // find out our account id - make request to fidor api
    // decide what to do with external id (put guid for now?)
    // 

    var fidor_transfer_external_uid = uuid.v4();

    var tx_url = this.config.apiUrl +
               "/internal_transfers?access_token=" +
               depositRequest.code;
    var it_cfg = {
      account_id     : 34, // sending account - just hardcode for now
      amount         : depositRequest.amount,
      external_uid   : fidor_transfer_external_uid,
      receiver       : this.config.gatewayAccountId,
      subject        : 'deposit to Ripple Network'
    }

    console.log(it_cfg);
    superagent.post(tx_url)
      .send(it_cfg)
      .end(function(err, res) {
        if (err) {
          console.log('Error:');
          console.log(err);
          response.status(500)
            .send({
              success: false,
              error: err
            });
        } else {
          //console.log(res);
          var data = res.body;
          console.log(data);
          if (data.error) {
            console.log(data.error.message);
            if (data.error.errors) {
              console.log(data.error.errors);
            }
            response.status(500)
              .send({
                success: false,
                error: data.error
              });
          } else {
            var transferState = data.state; 
            /// TODO check transferState. Fidor test api alwayes returning 'success'

            data.depositRequest = depositRequest;
            data.it_cfg = it_cfg;
            _this.createGatewayPayment(data)
              .then(function (bridgePayment) {
                response.status(200)
                  .send({
                    success: true,
                    bridge_payment: bridgePayment
                  });
              })
              .error(function (bridgePayment) {
                delete bridgePayment.invoiceUrl;
                delete bridgePayment.status;
                response.status(500)
                  .send({
                    success: false,
                    bridge_payment: bridgePayment
                  });
              });

          }
        }
    });
  },

  createGatewayPayment: function createGatewayPayment(bridgePayment) {
    var _this = this;
    return new Promise(function (resolve, reject) {
      _this.gatewayd.database.transaction(function (t) {
        _this._createExternalAccount(bridgePayment, t)
          .then(function (externalAccount) {
            return _this._createExternalTransaction(externalAccount, bridgePayment, t)
              .then(function (externalTransaction) {
                bridgePayment.gateway_transaction_id = externalTransaction.dataValues.id;
                return _this._createRippleAddress(externalAccount, bridgePayment, t)
                  .then(function (rippleAddress) {
                    return _this._createRippleTransaction(rippleAddress, bridgePayment, t)
                      .then(function (rippleTransaction) {
                        return _this._createGatewayTransaction(externalTransaction, rippleTransaction, bridgePayment, t)
                          .then(function (gatewayTransaction) {
                            t.commit();
                            resolve(bridgePayment);
                          });
                      });
                  });
              });
          })
          .error(function (bridgePayment) {
            t.rollback();
            reject(bridgePayment);
          });
      });
    });
  },

        // {address: _this.this.config.gatewayAccountId},
        // {type: 'fidorMerchant', user_id: bridgePayment.source_address.required.iduser},
        // {transaction: t}
  _createExternalAccount: function (bridgePayment, t) {
    var _this = this;
    return new Promise(function (resolve, reject) {
      _this.gatewayd.data.models.externalAccounts.findOrCreate(
        {address: _this.config.gatewayAccountId},
        {type: 'fidorMerchant'},
        {name: 'FidorMerchant'},
        {transaction: t}
      )
        .success(function (externalAccount, created) {
          return resolve(externalAccount);
        })
        .error(function (error) {
          delete bridgePayment.invoiceUrl;
          delete bridgePayment.status;
          console.log('Unable to persist externalAccount, ERROR:', error);
          reject(bridgePayment);
        });
    });
  },

  _createExternalTransaction: function (externalAccount, bridgePayment, t) {
    var _this = this;
    console.log('------- _createExternalTransaction ');
    console.log(externalAccount);
    return new Promise(function (resolve, reject) {
      _this.gatewayd.data.models.externalTransactions.create({
        amount: bridgePayment.amount,
        currency: CURRENCY,
        deposit: true,
        external_account_id: externalAccount.dataValues.id,
        status: 'invoice',
        uid: bridgePayment.it_cfg.external_uid
      }, {transaction: t})
        .success(function (externalTransaction) {
          resolve(externalTransaction);
        })
        .error(function (error) {
          delete bridgePayment.invoiceUrl;
          delete bridgePayment.status;
          console.log('Unable to persist externalTransaction, ERROR:', error);
          reject(bridgePayment);
        });
    });
  },

  _createRippleAddress: function (externalAccount, bridgePayment, t) {
    var _this = this;
    return new Promise(function (resolve, reject) {
      var address = bridgePayment.depositRequest.address;
      var tag;
      // if (address.match('\\?dt=')) {
      //   var split = address.split('?dt=');
      //   address = split[0];
      //   tag = split[1];
      // }
      _this.gatewayd.data.models.rippleAddresses.findOrCreate(
        {address: address, tag: tag},
        {managed: false, type: 'independent'},
        {transaction: t})
        .success(function (rippleAddress, created) {
          resolve(rippleAddress);
        })
        .error(function (error) {
          delete bridgePayment.invoiceUrl;
          delete bridgePayment.status;
          delete bridgePayment.gateway_transaction_id;
          console.log('Unable to persist rippleAddress, ERROR:', error);
          reject(bridgePayment);
        });
    });
  },

  _createRippleTransaction: function (rippleAddress, bridgePayment, t) {
    var _this = this;
    return new Promise(function (resolve, reject) {
      _this.gatewayd.data.models.rippleTransactions.create({
        to_address_id: rippleAddress.id,
        from_address_id: _this.gatewayd.config.get('HOT_WALLET').id,
        to_amount: bridgePayment.amount,
        to_currency: CURRENCY,
        to_issuer: bridgePayment.depositRequest.address,
        from_amount: bridgePayment.amount,
        from_currency: CURRENCY,
        from_issuer: bridgePayment.depositRequest.address,
        state: 'invoice'
      }, {transaction: t})
        .success(function (rippleTransaction) {
          resolve(rippleTransaction);
        })
        .error(function (error) {
          delete bridgePayment.invoiceUrl;
          delete bridgePayment.status;
          delete bridgePayment.gateway_transaction_id;
          console.log('Unable to persist rippleTransaction, ERROR: ', error);
          reject(bridgePayment);
        });
    });
  },

//        policy_id: bridgePayment.getInvoice()
  _createGatewayTransaction: function (externalTransaction, rippleTransaction, bridgePayment, t) {
    var _this = this;
    return new Promise(function (resolve, reject) {
      _this.gatewayd.data.models.gatewayTransactions.create({
        external_transaction_id: externalTransaction.id,
        ripple_transaction_id: rippleTransaction.id,
        state: 'invoice',
        policy_id: 1
      }, {transaction: t})
        .success(function (gatewayTransaction) {
          resolve(gatewayTransaction);
        })
        .error(function (error) {
          delete bridgePayment.invoiceUrl;
          delete bridgePayment.status;
          delete bridgePayment.gateway_transaction_id;
          console.log('Unable to persist gatewayTransaction, ERROR:', error);
          reject(bridgePayment);
        });
    });
  }

  // _this.paymentsResponseBuilder.payment(paymentRequest)
  //   .then(function (bridgePayment) {
  //     _this.paymentsService.createGatewayPayment(bridgePayment)
  //       .then(function (bridgePayment) {
  //         response.status(200)
  //           .send({
  //             success: true,
  //             bridge_payment: bridgePayment
  //           });
  //       })
  //       .error(function (bridgePayment) {
  //         delete bridgePayment.invoiceUrl;
  //         delete bridgePayment.status;
  //         response.status(500)
  //           .send({
  //             success: false,
  //             bridge_payment: bridgePayment
  //           });
  //       });
  //   })
  //   .error(function (bridgePayment) {
  //     response.status(500)
  //       .send({
  //         success: false,
  //         bridge_payment: bridgePayment
  //       });
  //   });
}

module.exports = PaymentsController;
