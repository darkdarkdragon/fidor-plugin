fidor-plugin
===============

Plugin for fidor.de api.

## Installation

    git clone 

## Usage

    var FidorPlugin = require('fidor-plugin');

    module.exports = function(gatewayd) {
      var fidorPlugin = new FidorPlugin({
        gatewayd: gatewayd,
        apiUrl: gatewayd.config.get('FIDOR').apiUrl,
        oauthUrl: gatewayd.config.get('FIDOR').oauthUrl,
        clientId: gatewayd.config.get('FIDOR').clientId,
        clientSecret: gatewayd.config.get('FIDOR').clientSecret,
      });
       
      gatewayd.server.use('/', fidorPlugin.router);
      //gatewayd.processes.add(fidorPlugin.processes.outToAstropay);
    }


## Config

Config example (in gatewayd/config/config.json)


    "FIDOR" : {
      "apiUrl" : "http://aps.test.fidor.de",
      "oauthUrl" : "http://aps.test.fidor.de/oauth",
      "clientId" : "0498f82aa89bd9fd",
      "clientSecret" : "88dece6b158944f936ed088cab572378",
      "gatewayAccountId" : "ripplegateway@fidor.de"
    }
