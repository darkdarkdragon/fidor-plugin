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
          callback({
            status: status,
            response: response
          });
        });
    },
  };

  return new API;

}]);

})();
