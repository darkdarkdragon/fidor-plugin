var http = require('superagent');
var Promise = require('bluebird');

function RippleNames () {
  this.base_url = 'https://id.ripple.com/v1/authinfo';
}

RippleNames.prototype = {
  lookup: function(rippleAddress) {

    var url = this.base_url + '?username=' + rippleAddress;

    return new Promise(function(resolve, reject){
      http.get(url)
        .end(function(error, response) {
        if(error) {
          return reject(new Error(error));
        }
        resolve(response.body);
      });
    });
  }
};

module.exports = new RippleNames;