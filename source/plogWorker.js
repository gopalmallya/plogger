/* @license
plogger
v1.0.0
https://github.com/gopalmallya/plogger
License: MIT

--------------------------------------------------------------------------------------------
-- This is worker thread created by DA plugin plogger during page load
-- Worker thread persists the events, errors and XHR in indexedDB and syncs with remote
-- table plogger 
-- It also redacts data for mask_page_items parameter set in plogger_config
------------------------------------------------------------------------------------
*/
var logArray = [];  
var insertScheduledCount = 0;
var logArrayLength;
var xhrURL;
var config;
var configMaskEnabled = false, configEncryptEnabled = false;
var maskPageItems, encryptPageItems;
var db;
var objectStore;
var dbOpen = false;

//object to send XHR request for inserting into plogger table
var ajaxOptions = {
  method: undefined,
  url: undefined,
  data: {
      "p_request": undefined,
      "p_flow_id": undefined,
      "p_flow_step_id": undefined,
      "p_instance": undefined,
      "p_clob_01": undefined
  },
  dataType: undefined
  };

//listen and process message from main thread
self.addEventListener("message", (event) => {
  
  var eventDataObj ;
  try {
    
    if ( typeof event.data === 'string') {
        eventDataObj = JSON.parse(event.data);
    }
    //log object for event, error and XHR, created by plogger in main thread comes here
    if ( typeof event.data === 'object') {
        eventDataObj = event.data;
    }
  } catch(e) {
      self.postMessage("message_parse_error");
  }
  //create and open indexeddb
  if ( eventDataObj.hasOwnProperty('method') && eventDataObj.method == 'init' ) {
    let req = indexedDB.open("plogger", 1);
    req.onupgradeneeded = function(e) {
      let db = e.target.result;
      if (!db.objectStoreNames.contains('log')) { 
        objectStore = db.createObjectStore("log", { autoIncrement: true });
      }
      db.onerror = function(event) {
        let request = event.target; // the request that caused the error
        console.log("DB Error", request.error);
      };
      self.postMessage("db_upgrade_success");
    };
    req.onsuccess = function(e) {
      db = req.result;
      dbOpen = true;
      self.postMessage('db_open_success');
      
    };
    req.onerror = function(e) {
      self.postMessage("db_open_error");
    };
  }
  //not used
  if ( eventDataObj.method == 'sync' ) {
    sync();
    
  } 

  //called from main thread to pass ords service url and config
  if ( eventDataObj.method == 'POST' ) {
      xhrURL = eventDataObj.url;
      try {
        config = JSON.parse(eventDataObj.config);
      } catch(e) {
        self.postMessage("config_parse_error");
      } 
      ajaxOptions = eventDataObj;
      getConfigParams();
      
  } 
  if ( eventDataObj.hasOwnProperty('type') && eventDataObj.type == 'event' ) {
      //decode event columns from uri encoded to json for readability and redaction
      var elementJSON = decodeURIComponent(eventDataObj.eventLog.element);
      elementJSON = '{"' + elementJSON.replace(/=/g,'":"') + '"}';
      try {
        elementJSON = JSON.parse(elementJSON);
        for(var propName in elementJSON) {
          if(elementJSON.hasOwnProperty(propName)) {
              elementJSON[propName] = mask(eventDataObj.eventLog.eventTargetID, elementJSON[propName]);
          }
        }
        eventDataObj.eventLog.element = JSON.stringify(elementJSON);
      } catch(e) {
        self.postMessage("element_decode_json_error");
      }
      eventDataObj.eventLog.currentValue = mask(eventDataObj.eventLog.eventTargetID,eventDataObj.eventLog.currentValue);    
      //store event in indexeddb
      add(eventDataObj);


  }
  
  if ( eventDataObj.hasOwnProperty('type') &&  eventDataObj.type == 'xhr' ){
    var xhrDataURIJSON = uriEncodedToJSON(eventDataObj.eventLog.xhrData);   
    for(var propName in xhrDataURIJSON) {
      if(xhrDataURIJSON.hasOwnProperty(propName)) {
        xhrDataURIJSON[propName] = mask(propName, xhrDataURIJSON[propName]);
      }
    }
    eventDataObj.eventLog.xhrData = xhrDataURIJSON ;
    add(eventDataObj);
  }

  if ( eventDataObj.hasOwnProperty('type') && eventDataObj.type == 'error' ){
    add(eventDataObj);
  }

  //sync();

});



//insert log into plogger table via XHR
function insert(option) { 
  logArrayLength = logArray.length;
  
  if (typeof(option.statusCode) == "undefined") { // 4
      option.statusCode = {};
  }
  if (typeof(option.beforeSend) == "undefined") { // 1
      option.beforeSend = function () {};
  }
  if (typeof(option.success) == "undefined") { // 4 et sans erreur
      option.success = function () {};
  }
  if (typeof(option.error) == "undefined") { // 4 et avec erreur
      option.error = function () {};
  }
  if (typeof(option.complete) == "undefined") { // 4
      option.complete = function () {};
  }

  var xhr = null;
  xhr = new XMLHttpRequest();

  xhr.onreadystatechange = function() {
      if (xhr.readyState == 1) {
          option.beforeSend();
      }
      if (xhr.readyState == 4) {
          option.complete(xhr, xhr.status);
          if (xhr.status == 200 || xhr.status == 0) {
              self.postMessage("sync_success");
              option.success(xhr.responseText);
              insertScheduledCount = 0;
              logArray.splice(0,logArrayLength);
          } else {
            insertScheduledCount = 0;
            self.postMessage("sync_error");
              option.error(xhr.status);
              if (typeof(option.statusCode[xhr.status]) != "undefined") {
                  option.statusCode[xhr.status]();
              }
          }
      }
  };


  xhr.open('POST', xhrURL, true);
  xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded; charset=UTF-8');
  xhr.setRequestHeader('Accept','text/plain');
  
  let urlEncodedData = "",
      urlEncodedDataPairs = [],
      name;

  // Turn the data object into an array of URL-encoded key/value pairs.
  for( name in option ) {
    urlEncodedDataPairs.push( encodeURIComponent( name ) + '=' + encodeURIComponent( option[name] ) );
  }
  // Combine the pairs into a single string and replace all %-encoded spaces to
  // the '+' character; matches the behavior of browser form submissions.
  urlEncodedData = urlEncodedDataPairs.join( '&' ).replace( /%20/g, '+' );

  xhr.send(urlEncodedData);
}

//set config variables
function getConfigParams() {
  for ( i=0; i < config.length;i++){
    if ( config[i].name == "mask" && config[i].value == "enabled" ) {
      configMaskEnabled = true;
    }
    if ( config[i].name == "mask_page_items" ) {
      maskPageItems = config[i].value;
    }   
 
  }  

}

//redact
function mask(key,value) {
  
  var maskedValue;
  if ( configMaskEnabled && maskPageItems && maskPageItems.indexOf(key.toLowerCase()) !== -1) {
     maskedValue = value.replace(/./g,"*");
  }else {
    maskedValue = value;
  }   
  return maskedValue;
}

function saveLogInLocalArray(eventTimeStamp,log) {
  //save only if not exist, to handle dups
  var found = false;
  for(var i = 0; i < logArray.length; i++) {
      if (logArray[i].eventLog.eventTimeStamp == eventTimeStamp) {
          found = true;
          break;
      }
      
  }
  if ( !found ) {
    logArray.push(log);
  }

}

//read log from indexeddb and store in local array
function readAll() {
  let objectStore = db.transaction("log","readwrite").objectStore("log");

  objectStore.openCursor().onsuccess = function(event) {
    let cursor = event.target.result;

    if (cursor) {
      saveLogInLocalArray(cursor.value.log.eventTimeStamp,cursor.value.log);
      objectStore.delete(cursor.key);
      cursor.continue();
    } else {
      self.postMessage("read_indexeddb_completed");
      if ( typeof xhrURL !== "undefined" && xhrURL.length > 0 && insertScheduledCount === 0 && logArray.length > 0 ) {   
        insertScheduledCount++; 
        let logData = JSON.stringify(logArray);
        ajaxOptions.data.p_clob_01 = logData;
        setTimeout(insert(ajaxOptions.data),100); 
      } 
    }
  };
}

// add log to indexeddb
function add(eventDataObj) {
  let request;
  if ( dbOpen ) { 
      let transaction = db.transaction(["log"], "readwrite");
      let log = transaction.objectStore("log");
      let request = log.add({ log: eventDataObj });
    
      request.onsuccess = function(event) {
        var countRequest = transaction.objectStore("log").count();
        countRequest.onsuccess = function() {
        self.postMessage("indexeddb count:" + countRequest.result);
      };
      request.onerror = function(event) {
        self.postMessage("add_indexeddb_error");
      };
  
      transaction.oncomplete = function() {
        //console.log("Transaction is complete");
        self.postMessage("add_indexeddb_success");

      };
    };

  } else { //if db not open , add to local object array
    saveLogInLocalArray(eventDataObj.eventLog.eventTimeStamp, eventDataObj );  
  }  
}

//this function inserts log into plogger table by calling insert() and schedules sync
function sync(){
  if ( db ) {
    readAll();
  }  
 
}

//XHR data in APEX is form url encoded, this function converts it into JSON 
// for easy reading and redacting any page items configured for redaction
function uriEncodedToJSON(uriEncodedStr) {
  var jsonStr = '{"' + uriEncodedStr + '"}';
  jsonStr = jsonStr.replace(/=/g,'":"')
  jsonStr = jsonStr.replace(/&/g,'","');


  var jsonObj;
  try {
    jsonObj = JSON.parse(jsonStr);
    if ( jsonObj.hasOwnProperty('p_json') ) {
      jsonObj.p_json = decodeURIComponent(JSON.stringify(jsonObj.p_json));
    }
    
  } catch (e) {
    //console.log('error converting form encoded uri to json');
    self.postMessage("uri_json_error");
    return uriEncodedStr;
  }     
  
  return jsonObj;

}



