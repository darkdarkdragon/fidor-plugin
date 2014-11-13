"use strict";

var http        = require('http')
var url         = require('url')
var querystring = require('querystring')

function OauthHandler(options) {
  this.gatewayd = options.gatewayd;
  this.config = this.gatewayd.config.get('FIDOR');
}

OauthHandler.prototype.ocode = function ocode(request, response) {
  var u = url.parse(request.url);
  var code = querystring.parse(u.query)["code"];
  
  // if the request does not contain a ?code=adsfasdfasdf 
  // query, it's not valid.
  if (!code) {
    response.writeHead(400, "Bad Request");
    response.end();
    return;
  }
  
  var  cb = function(err, res) {
    if (err || !res) {
      response.writeHead(400, "Bad Request");
      response.end();
    }  else {
      var redirUrl = '/fidor/#deposit?token=' + res;
      response.writeHead(307, {"location" : redirUrl});
      response.end();
    }
  }

  var oauth_url = url.parse(this.config.apiUrl)

  // where to send the data ...
  var postOptions = {
    method: "POST",
    path  : oauth_url.path+"/oauth/token",
    port  : oauth_url.port,
    host  : oauth_url.hostname
  }
  
  // ... what to send
  var postData = {
    code          : code,
    client_id     : this.config.clientId,
    client_secret : this.config.clientSecret
  }
  postData = querystring.stringify(postData)
  
  var token_request = http.request(postOptions, function (res) {
    // collect the data chunks we received and reassemble them
    // on request end ...
    var data = new Buffer(0)
    res.on('data', function(chunk) {
      data = Buffer.concat([data, chunk])
    })

    res.on('end', function() {
      var oauth_response = JSON.parse(data)
      cb(oauth_response.error, oauth_response.access_token)
    })
  })

  token_request.on('error', function(e) {
    cb(e, null)
  })

  token_request.write(postData);
  token_request.end()

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
