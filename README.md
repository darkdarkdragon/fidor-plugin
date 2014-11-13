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

