"use strict";

var util        = require('util');
var http        = require('http');
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
  var code = querystring.parse(u.query)["code"];
  
  // if the request does not contain a ?code=adsfasdfasdf 
  // query, it's not valid.
  if (!code) {
    response.writeHead(400, "Bad Request");
    response.end();
    return;
  }
  
  var cb = function(err, oauth_response) {
    console.log('______________________________________');
    var oauth_data = oauth_response.body;
    console.log(util.inspect(oauth_data));
    var uid = uuid.v4();

    if (err || !oauth_data || !oauth_data.access_token) {
      console.log('______________________________________ 1 Bad Request');
      response.writeHead(400, "Bad Request");
      response.end();
    }  else {
      self.dataStore[uid] = {
        access_token: oauth_data.access_token,
        expires_at: new Date().getTime() + (oauth_data.expires_in - 10) * 1000
      };


      var get_user_url = self.config.apiUrl + '/users/current?access_token=' + oauth_data.access_token;
      console.log('get_user_url: ' + get_user_url);
      superagent.get(get_user_url).end(function (err, account_res) {
        if (err || !account_res || !account_res.body || !account_res.body.email) {
          console.log('______________________________________ 2 Bad Request');
          response.writeHead(400, "Bad Request");
          response.end();
        } else {
          console.log('______________________________________ 2');
          var account = account_res.body;
          console.log(util.inspect(account));
          self.dataStore[uid].id = account.id;
          self.dataStore[uid].email = account.email;
          var redirUrl = '/fidor/#deposit?' + querystring.stringify({token: uid, email: account.email, expires_at: self.dataStore[uid].expires_at});
          //var redirUrl = '/fidor/#deposit?token=' + uid + '&' + ;
          response.writeHead(307, {"location" : redirUrl});
          response.end();
        }
      });
    }
  }

  var oauth_url = url.parse(this.config.apiUrl);

  // where to send the data ...
  /*
  var postOptions = {
    method: "POST",
    path  : oauth_url.path+"/oauth/token",
    port  : oauth_url.port,
    host  : oauth_url.hostname
  }
  */
  
  // ... what to send
  var postData = {
    code          : code,
    client_id     : this.config.clientId,
    client_secret : this.config.clientSecret
  }
  //postData = querystring.stringify(postData);

  superagent.post(this.config.apiUrl + '/oauth/token').send(postData).end(cb);

  /*
  var token_request = http.request(postOptions, function (res) {
    // collect the data chunks we received and reassemble them
    // on request end ...
    var data = new Buffer(0);
    res.on('data', function(chunk) {
      data = Buffer.concat([data, chunk])
    });

    res.on('end', function() {
      var oauth_response = JSON.parse(data)
      cb(oauth_response.error, oauth_response)
    });
  });

  token_request.on('error', function(e) {
    cb(e, null)
  })

  token_request.write(postData);
  token_request.end()
  */

/*  
  var redirUrl = '/fidor/#deposit?code=' + code;
  response.writeHead(307, {"location" : redirUrl});
  response.end();

  // response.send({
  //   success: true,
  //   plugin: {
  //     name: 'gatewayd-astropay-plugin',
  //     version: '0.1.0',
  //     documentation: 'https://github.com/gatewayd/astropay-plugin'
  //   }
  // });
*/
}

module.exports = OauthHandler;
