"use strict";

(function() {

angular.module('deposit', ['api'])
.controller('DepositCtrl', ['$scope', '$location', '$rootScope', 'fidorConfig', 'ApiService',
                                 function ($scope, $location, $rootScope, fidorConfig, $api)
{

  console.log('----------------------------------');
  var searchObject = $location.search();
  if (searchObject['token']) {
    localStorage['fidortoken'] = searchObject['token'];
  } else if (!localStorage['fidortoken']) {
    var porta = ':' + fidorConfig.port;
    if (fidorConfig.port == 80) porta = '';
    var oauth_url = fidorConfig.apiUrl + "/oauth/authorize?client_id=" +
                    fidorConfig.clientId + "&redirect_uri=" + fidorConfig.appUrl + porta +
                    "/fidor/code";
    window.location = oauth_url;  
  }

/*
  var cookie_token = getCookie(request, "oauth_token")
  // if we don't have a token for this user already, redirect 
  // the user to the OAuth server
  if (!cookie_token) {
    var oauth_url = fidor_config.fidor_api_url+"/oauth/authorize?client_id="+
                    fidor_config.client_id+"&redirect_uri="+fidor_config.app_url+":"+
                    fidor_config.app_port+"/code"
    response.writeHead(307, {"location" : oauth_url})
    response.end()
    return
  }
*/

  $scope.errors = [];
  //$rootScope.
  // $rootScope.fidor = {};
  // $rootScope.fidor.source_address = {};

  $rootScope.quoteFields = {
    address: null,
    amount: null,
    fidor_address: null,
    currency: 'EUX'
  };


  $scope.isSubmitting = false;
  $scope.isSent = false;

  $scope.doDeposit = function() {
    if (localStorage['fidortoken']) {
      var conf = {
        code   : localStorage['fidortoken'],
        amount : $rootScope.quoteFields.amount,
        address: $rootScope.quoteFields.address,
        currency: $rootScope.quoteFields.currency,
        fidor_address: $rootScope.quoteFields.fidor_address
      }
      $scope.isSubmitting = true;
      $scope.errors = [];
      $api.deposit(conf, function(err, res) {
        $scope.isSubmitting = false;
        console.log(err);
        console.log(res);
        if (err) {
         $scope.errors.push(err);
        }
        if (res) {
         $scope.errors.push(res);
        }
        var dat = res;
        if (!dat) dat = err;
        if (dat.success == false && dat.error && dat.error.code == 403) {
          $scope.errors = [];
          localStorage.removeItem('fidortoken');
          window.location = '/fidor#/';  
        } else if (dat.success) {
          $scope.errors = ['Deposit process started. Check you Ripple wallet.'];
          $scope.isSent = true;
        }
      });
    }
  }

}]);

})();
