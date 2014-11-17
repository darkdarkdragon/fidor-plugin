'use strict';

var util        = require('util');
var url         = require('url');
var querystring = require('querystring');
var uuid        = require('node-uuid');
var superagent  = require('superagent');

function OauthHandler(options) {
  this.gatewayd = options.gatewayd;
  this.config = this.gatewayd.config.get('FIDOR');
  this.dataStore = {};
}

OauthHandler.prototype.ocode = function ocode(request, response) {
  var self = this;
  var u = url.parse(request.url);
  var code = querystring.parse(u.query)['code'];
  
  // if the request does not contain a ?code=adsfasdfasdf 
  // query, it's not valid.
  if (!code) {
    response.writeHead(400, 'Bad Request');
    response.end();
    return;
  }
  
  var cb = function(err, oauth_response) {
    var oauth_data = oauth_response.body;
    var uid = uuid.v4();

    if (err || !oauth_data || !oauth_data.access_token) {
      response.writeHead(400, 'Bad Request');
      response.end();
    }  else {
      self.dataStore[uid] = {
        access_token: oauth_data.access_token,
        expires_at: new Date().getTime() + (oauth_data.expires_in - 10) * 1000
      };


      var get_user_url = self.config.apiUrl + '/users/current?access_token=' + oauth_data.access_token;
      superagent.get(get_user_url).end(function (err, account_res) {
        if (err || !account_res || !account_res.body || !account_res.body.email) {
          response.writeHead(400, 'Bad Request');
          response.end();
        } else {
          var account = account_res.body;
          self.dataStore[uid].id = account.id;
          self.dataStore[uid].email = account.email;
          var redirUrl = '/fidor/#deposit?' + querystring.stringify({token: uid, email: account.email, expires_at: self.dataStore[uid].expires_at});
          response.writeHead(307, {'location' : redirUrl});
          response.end();
        }
      });
    }
  };

  // ... what to send
  var postData = {
    code          : code,
    client_id     : this.config.clientId,
    client_secret : this.config.clientSecret
  };

  superagent.post(this.config.apiUrl + '/oauth/token').send(postData).end(cb);

};

module.exports = OauthHandler;
