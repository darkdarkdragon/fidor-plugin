"use strict";

(function() {

angular.module('deposit', ['api'])
.controller('DepositCtrl', ['$scope', '$location', '$rootScope', 'fidorConfig', 'ApiService',
                                 function ($scope, $location, $rootScope, fidorConfig, $api)
{

  function gotoOAuth() {
    var porta = ':' + fidorConfig.port;
    if (fidorConfig.port == 80) porta = '';
    var oauth_url = fidorConfig.apiUrl + "/oauth/authorize?client_id=" +
                    fidorConfig.clientId + "&redirect_uri=" + fidorConfig.appUrl + porta +
                    "/fidor/code";
    window.location = oauth_url;  
  }

  console.log('----------------------------------');
  var searchObject = $location.search();
  if (searchObject['email']) {
    localStorage['fidoremail'] = searchObject['email'];
  }
  if (searchObject['expires_at']) {
    localStorage['fidorexpiresat'] = searchObject['expires_at'];
  }
  if (localStorage['fidorexpiresat'] && localStorage['fidorexpiresat'] < new Date().getTime()) {
    localStorage.removeItem('fidortoken');
  }
  if (searchObject['token']) {
    localStorage['fidortoken'] = searchObject['token'];
    $location.path('/');
  } else if (!localStorage['fidortoken']) {
    gotoOAuth();
  }

  $scope.errors = [];

  $rootScope.quoteFields = {
    address: null,
    amount: null,
    fidor_address: localStorage['fidoremail'],
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
        if (err && err.status == 401) {
          gotoOAuth();
        }
        if (err && err.response) {
          if (err.response.message) {
            $scope.errors.push(err.response.message);
          } else {
            $scope.errors.push(err.response);
          }
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
