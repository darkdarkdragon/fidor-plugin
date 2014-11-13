"use strict";

(function() {

angular.module('api', [])
.service('ApiService', ['$http', function($http) {
  function API() {
  }

  API.prototype = {
    deposit: function(config, callback) {
      $http.post('/fidor/deposit', config)
        .success(function(response, status, headers) {
          callback(null, response);
        })
        .error(function(response, status, headers) {
          callback(response);
        });
    },
    /*
    getQuote: function(config, callback) {

      $http.get('/astropay/payments/quotes/'+config.address+'/'+config.amount)
        .success(function(response, status, headers){
          callback(null, response);
        })
        .error(function(response, status, headers){
          callback(response);
        });
    },
    sendPayment: function(config, callback) {
      $http.post('/astropay/payments', config)
        .success(function(response, status, headers){
          callback(null, response);
        })
        .error(function(response, status, headers){
          callback(response);
        });
    },

    webfinger: function(url, callback) {
      $http.get(url)
        .success(function(response, status, headers){
          callback(null, response);
        })
        .error(function(response, status, headers){
          callback(response);
        });
    }
    */

  };

  return new API;

}]);

})();
