exports.ForceOAuth = {};

var win =  Titanium.UI.createWindow();

exports.ForceOAuth.clientId; //"3MVG9yZ.WNe6byQDx8PTnyUjr2efFnoWts_tIb9K8R1VCwMw9FAyxObWEFqQ8wow7ojcAXwKLpT0YTHsIpgo1"
exports.ForceOAuth.redirectUri = "https://login.salesforce.com/services/oauth2/success";
exports.ForceOAuth.oauthData;
exports.ForceOAuth.authenticated = false;
exports.ForceOAuth.loginUrl = "https://login.salesforce.com";
exports.ForceOAuth.refreshToken = null;
exports.ForceOAuth.accessToken = null;
exports.ForceOAuth.apiVersion = "22.0";
exports.ForceOAuth.instanceUrl = null;
exports.ForceOAuth.id;
exports.ForceOAuth.issuedAt;
exports.ForceOAuth.signature;

exports.ForceOAuth.open = function(clientId, redirectUri, apiVersion) {

	Ti.API.debug("Client Id in ForceOAuth.Open is: " + clientId);
	ForceOAuth.clientId = clientId;
	if (redirectUri) ForceOAuth.redirectUri = redirectUri;
	if (apiVersion) ForceOAuth.apiVersion = apiVersion;
	
	var odataString = Ti.App.Properties.getString("oauthData_preference");
	Titanium.API.info("OAuth Data String: " + odataString);
	if (odataString.length == 0) odataString = null;
	
	if (odataString === null)
		ForceOAuth.accessToken = null;
	else
		ForceOAuth.setOAuthData(JSON.parse(odataString));
		
	if (ForceOAuth.accessToken !== null) {
		Ti.API.info("Calling oauth success event..." + ForceOAuth.instanceUrl);
		setTimeout(function() {
			Ti.App.fireEvent('OAuthSuccess', {"baseUrl":ForceOAuth.instanceUrl});		
		}, 100);
	} else {
		
		var oauthWin = Ti.UI.createWindow({title:'my web view'});
	
	    oauthWin.orientationModes = [
	        Titanium.UI.PORTRAIT,
	        Titanium.UI.LANDSCAPE_LEFT,
	        Titanium.UI.LANDSCAPE_RIGHT
	    ];
	 
	    var webview = Ti.UI.createWebView();
	    var oauthURL = ForceOAuth.loginUrl + "/services/oauth2/authorize?response_type=token&" +
	        "client_id=" + ForceOAuth.clientId + "&redirect_uri=" + ForceOAuth.redirectUri + "&display=touch";
		
	    webview.url = oauthURL;
	 
	    oauthWin.add(webview);
	    win.add(oauthWin)
	    win.open(oauthWin);
		win.zIndex = 999;
		
		webview.addEventListener('load', function(e) 
		{
			if (e.url.indexOf("https://login.salesforce.com/services/oauth2/success") == 0) {
				pullOAuthData(e.url.split("#")[1]);
				win.remove(oauthWin);
				win.close();
				ForceOAuth.authenticated = true;
				Ti.App.fireEvent('OAuthSuccess', {"baseUrl":ForceOAuth.instanceUrl});
			}
		});
	
		function pullOAuthData(dataParams) {
			Ti.API.debug("oauth data params = " + dataParams);
			var kvPairs = dataParams.split("&");
			var oauthString = "{";
			for (var i=0;i<kvPairs.length;i++) {
				var kv = kvPairs[i].split("=");
				oauthString += "\"" + kv[0] + "\":\"" + kv[1] + "\"";
				if (i < kvPairs.length - 1) {
					oauthString += ", ";
				}
				Ti.API.info("key: " + kv[0] + ", value: " + kv[1]);
			}
			oauthString += "}";
			Ti.API.debug("Data 2: " + oauthString);
			ForceOAuth.setOAuthData(JSON.parse(oauthString));
			Ti.App.Properties.setString("oauthData_preference", oauthString);
		}
	}
};

ForceOAuth.setOAuthData = function(oauthdata) {
	Ti.App.Properties.setString("accessToken_preference", oauthdata["access_token"]);
	ForceOAuth.accessToken = oauthdata["access_token"];
	Ti.App.Properties.setString("refreshToken_preference", oauthdata["refresg_token"]);
	ForceOAuth.refreshToken = oauthdata["refresh_token"];
	ForceOAuth.instanceUrl = oauthdata["instance_url"];
	ForceOAuth.id = oauthdata["id"];
	ForceOAuth.issuedAt = oauthdata["issued_at"];
	ForceOAuth.signature = oauthdata["signature"];
}
ForceOAuth.refreshAccessToken = function(callback, error) {
    var url = ForceOAuth.loginUrl + '/services/oauth2/token';
   	var xhr = Titanium.Network.createHTTPClient();
   	xhr.onload = function() {
		Ti.API.debug(xhr.responseData);
		var jsonResponse = JSON.parse(xhr.responseData);
		jsonResponse["refresh_token"] = ForceOAuth.refreshToken;
		ForceOAuth.setOAuthData(jsonResponse);
		callback(xhr.responseData);
	};
	 xhr.onerror = function(e) { 
		Ti.API.info("ERROR " + e.error); 
		alert(e.error); 
	 }; 
	 var turl = "http://www.postbin.org/zu59sx";
	xhr.open("POST", url);
	xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	Ti.API.debug("Grant: " + 'grant_type=refresh_token&client_id=' + ForceOAuth.clientId + '&refresh_token=' + ForceOAuth.refreshToken + "\n\nURL: " + url);
	xhr.send( 'grant_type=refresh_token&client_id=' + ForceOAuth.clientId + '&refresh_token=' + ForceOAuth.refreshToken );
}

exports.DbDotCom = {};
exports.DbDotCom.REST = {};
exports.DbDotCom.REST.Client = {};

exports.DbDotCom.REST.OAuth = ForceOAuth;

//if (DbDotCom.REST.OAuth.authenticated === false) {
//	DbDotCom.REST.OAuth.open("","");
//} else {
	//Here, we should be looking for the refresh token
//}

/*
 * Low level utility function to call the Salesforce endpoint.
 * @param path resource path relative to /services/data
 * @param callback function to which response will be passed
 * @param [error=null] function to which jqXHR will be passed in case of error
 * @param [method="GET"] HTTP method for call
 * @param [payload=null] payload for POST/PATCH etc
 */
DbDotCom.REST.makeRestCall = function(path, callback, error, method, payload, retry) {
	var restUrl = Titanium.Network.decodeURIComponent(DbDotCom.REST.OAuth.instanceUrl) + '/services/data' + path;
	
	var xhr = Titanium.Network.createHTTPClient();
	
	xhr.onload = function() {
		Titanium.API.info("XHR, onload handler...");
		Ti.API.debug(this.responseData);
		var data = JSON.parse(this.responseData);
		callback(data);
	};
	
	xhr.onerror = function(e) { 
		Titanium.API.info("XHR, error handler..." + 
			"\nDbDotCom.REST.OAuth.refreshToken: " +
			"\nretry: " + retry +
			"\n e: " + e.error +
			"\nXHR status: " + this.status);
		if (!DbDotCom.REST.OAuth.refreshToken || retry)  {
			error(e.error);
		} else {
			Titanium.API.info("In the error handler looking for a 401...");
        	if (xhr.status === 401) {
            	DbDotCom.REST.OAuth.refreshAccessToken(function(oauthResponse) {
                	//that.setSessionToken(oauthResponse.access_token, null, oauthResponse.instance_url);
                	Ti.API.debug("Refresh response... " + oauthResponse);
                	DbDotCom.REST.makeRestCall(path, callback, error, method, payload, true);
                }, error);
			} else {
            	error(e);
			}
		}
	}; 
	
	xhr.open(method || "GET", restUrl, true)
	
	Titanium.API.info("Rest url: " + restUrl);
	
	xhr.setRequestHeader("Authorization", "OAuth " + Titanium.Network.decodeURIComponent(DbDotCom.REST.OAuth.accessToken));
	xhr.setRequestHeader("Content-Type", "application/json");
	
	xhr.send(payload);
	
	 /*var xhr = Titanium.Network.createHTTPClient();
	 var restUrl = Titanium.Network.decodeURIComponent(DbDotCom.REST.OAuth.instanceUrl) + '/services/data' + path;
	 Ti.API.debug("Rest Url: " + restUrl);
	 xhr.onload = function() {
		Ti.API.debug(this.responseData);
		var data = JSON.parse(this.responseData);
		callback(data);
	};
	 xhr.onerror = function(e) { 
	 	Error(e.error);
		Ti.API.info("ERROR " + e.error); 
	 }; 
	 xhr.open(method, restUrl, true)
	 Ti.API.debug("Going to hit: " + restUrl);
	 xhr.setRequestHeader("Authorization", "OAuth " + Titanium.Network.decodeURIComponent(DbDotCom.REST.OAuth.accessToken));
	 xhr.setRequestHeader("Content-Type", "application/json");
	 xhr.send();*/
}

/*
 * Copyright (c) 2011, salesforce.com, inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided
 * that the following conditions are met:
 *
 * Redistributions of source code must retain the above copyright notice, this list of conditions and the
 * following disclaimer.
 *
 * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and
 * the following disclaimer in the documentation and/or other materials provided with the distribution.
 *
 * Neither the name of salesforce.com, inc. nor the names of its contributors may be used to endorse or
 * promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

/* JavaScript library to wrap REST API on Visualforce. Leverages Ajax Proxy
 * (see http://bit.ly/sforce_ajax_proxy for details).
 *
 * Note that you must add the REST endpoint hostname for your instance (i.e. 
 * https://na1.salesforce.com/ or similar) as a remote site - in the admin
 * console, go to Your Name | Setup | Security Controls | Remote Site Settings
 */




    /**
     * Set a refresh token in the client.
     * @param refreshToken an OAuth refresh token
     */
    DbDotCom.REST.setRefreshToken = function(refreshToken) {
        DbDotCom.REST.OAuth.refreshToken = refreshToken;
    }

    /**
     * Refresh the access token.
     * @param callback function to call on success
     * @param error function to call on failure
     */
    DbDotCom.REST.refreshAccessToken = function(callback, error) {
    	DbDotCom.REST.OAuth.refreshAccessToken(callback, error);
    }



    /*
     * Lists summary information about each Salesforce.com version currently 
     * available, including the version, label, and a link to each version's
     * root.
     * @param callback function to which response will be passed
     * @param [error=null] function to which jqXHR will be passed in case of error
     */
    exports.DbDotCom.REST.versions = function(callback, error) {
        DbDotCom.REST.makeRestCall('.json', callback, error);
    }

    /*
     * Lists available resources for the client's API version, including 
     * resource name and URI.
     * @param callback function to which response will be passed
     * @param [error=null] function to which jqXHR will be passed in case of error
     */
    exports.DbDotCom.REST.resources = function(callback, error) {
        DbDotCom.REST.makeRestCall('/v' + DbDotCom.REST.OAuth.apiVersion + '/', callback, error);
    }

    /*
     * Lists the available objects and their metadata for your organization's 
     * data.
     * @param callback function to which response will be passed
     * @param [error=null] function to which jqXHR will be passed in case of error
     */
    exports.DbDotCom.REST.describeGlobal = function(callback, error) {
        DbDotCom.REST.makeRestCall('/v' + DbDotCom.REST.OAuth.apiVersion + '/sobjects/', callback, error);
    }

    /*
     * Describes the individual metadata for the specified object.
     * @param objtype object type; e.g. "Account"
     * @param callback function to which response will be passed
     * @param [error=null] function to which jqXHR will be passed in case of error
     */
    exports.DbDotCom.REST.metadata = function(objtype, callback, error) {
        DbDotCom.REST.makeRestCall('/v' + DbDotCom.REST.OAuth.apiVersion + '/sobjects/' + objtype + '/'
        , callback, error);
    }

    /*
     * Completely describes the individual metadata at all levels for the 
     * specified object.
     * @param objtype object type; e.g. "Account"
     * @param callback function to which response will be passed
     * @param [error=null] function to which jqXHR will be passed in case of error
     */
    exports.DbDotCom.REST.describe = function(objtype, callback, error) {
        DbDotCom.REST.makeRestCall('/v' + DbDotCom.REST.OAuth.apiVersion + '/sobjects/' + objtype
        + '/describe/', callback, error);
    }

    /*
     * Creates a new record of the given type.
     * @param objtype object type; e.g. "Account"
     * @param fields an object containing initial field names and values for 
     *               the record, e.g. {:Name "salesforce.com", :TickerSymbol 
     *               "CRM"}
     * @param callback function to which response will be passed
     * @param [error=null] function to which jqXHR will be passed in case of error
     */
    exports.DbDotCom.REST.create = function(objtype, fields, callback, error) {
        DbDotCom.REST.makeRestCall('/v' + DbDotCom.REST.OAuth.apiVersion + '/sobjects/' + objtype + '/'
        , callback, error, "POST", JSON.stringify(fields));
    }

    /*
     * Retrieves field values for a record of the given type.
     * @param objtype object type; e.g. "Account"
     * @param id the record's object ID
     * @param fields comma-separated list of fields for which to return
     *               values; e.g. Name,Industry,TickerSymbol
     * @param callback function to which response will be passed
     * @param [error=null] function to which jqXHR will be passed in case of error
     */
    exports.DbDotCom.REST.retrieve = function(objtype, id, fieldlist, callback, error) {
        DbDotCom.REST.makeRestCall('/v' + DbDotCom.REST.OAuth.apiVersion + '/sobjects/' + objtype + '/' + id
        + '?fields=' + fieldlist, callback, error);
    }

    /*
     * Updates field values on a record of the given type.
     * @param objtype object type; e.g. "Account"
     * @param id the record's object ID
     * @param fields an object containing initial field names and values for 
     *               the record, e.g. {:Name "salesforce.com", :TickerSymbol 
     *               "CRM"}
     * @param callback function to which response will be passed
     * @param [error=null] function to which jqXHR will be passed in case of error
     */
    exports.DbDotCom.REST.update = function(objtype, id, fields, callback, error) {
        DbDotCom.REST.makeRestCall('/v' + DbDotCom.REST.OAuth.apiVersion + '/sobjects/' + objtype + '/' + id
        , callback, error, "PATCH", JSON.stringify(fields));
    }

    /*
     * Deletes a record of the given type. Unfortunately, 'delete' is a 
     * reserved word in JavaScript.
     * @param objtype object type; e.g. "Account"
     * @param id the record's object ID
     * @param callback function to which response will be passed
     * @param [error=null] function to which jqXHR will be passed in case of error
     */
    exports.DbDotCom.REST.del = function(objtype, id, callback, error) {
        DbDotCom.REST.makeRestCall('/v' + DbDotCom.REST.OAuth.apiVersion + '/sobjects/' + objtype + '/' + id
        , callback, error, "DELETE");
    }

    /*
     * Executes the specified SOQL query.
     * @param soql a string containing the query to execute - e.g. "SELECT Id, 
     *             Name from Account ORDER BY Name LIMIT 20"
     * @param callback function to which response will be passed
     * @param [error=null] function to which jqXHR will be passed in case of error
     */
    exports.DbDotCom.REST.query = function(soql, callback, error) {
    	DbDotCom.REST.makeRestCall('/v' + DbDotCom.REST.OAuth.apiVersion + '/query/?q=' + escape(soql)
        , function(jsonData) {
			var records = jsonData.records;
			callback(records);
        }, error, "GET");
    }

    /*
     * Executes the specified SOSL search.
     * @param sosl a string containing the search to execute - e.g. "FIND 
     *             {needle}"
     * @param callback function to which response will be passed
     * @param [error=null] function to which jqXHR will be passed in case of error
     */
    exports.DbDotCom.REST.search = function(sosl, callback, error) {
        DbDotCom.REST.makeRestCall('/v' + DbDotCom.REST.OAuth.apiVersion + '/search?s=' + escape(sosl)
        , callback, error);
    }
    
    
    exports.DbDotCom.REST.recordFeed = function(recordId, callback, error) {
    	DbDotCom.REST.makeRestCall('/v' + DbDotCom.REST.OAuth.apiVersion + '/chatter/feeds/record/' + recordId + '/feed-items', 
    		callback, error);
    }

    exports.DbDotCom.REST.newsFeed = function(recordId, callback, error) {
    	DbDotCom.REST.makeRestCall('/v' + DbDotCom.REST.OAuth.apiVersion + '/chatter/feeds/news/' + recordId + '/feed-items', 
    		callback, error);
    }

    exports.DbDotCom.REST.profileFeed = function(recordId, callback, error) {
    	DbDotCom.REST.makeRestCall('/v' + DbDotCom.REST.OAuth.apiVersion + '/chatter/feeds/user-profile/' + recordId + '/feed-items', 
    		callback, error);
    }
