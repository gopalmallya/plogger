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


  self.addEventListener("message", (event) => {
    var eventDataObj ;
    try {
      if ( typeof event.data === 'string') {
          eventDataObj = JSON.parse(event.data);
      }
      if ( typeof event.data === 'object') {
         eventDataObj = event.data;
      }
    } catch(e) {
      console.log('error in parsing postmessage event.data');
    }

    if ( eventDataObj.hasOwnProperty('method') && eventDataObj.method == 'init' ) {
      let req = indexedDB.open("plogger", 1);
      req.onupgradeneeded = function(e) {
        let db = e.target.result;
        objectStore = db.createObjectStore("log", { autoIncrement: true });
        self.postMessage("Successfully upgraded db");
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

    if ( eventDataObj.hasOwnProperty('method') && eventDataObj.method == 'readAll' ) {
        readAll();
    }  

    if ( eventDataObj.hasOwnProperty('method') && eventDataObj.method == 'add' ) {
      add();
    }  

    if ( eventDataObj.method == 'POST' ) {
        xhrURL = eventDataObj.url;
        try {
          config = JSON.parse(eventDataObj.config);
        } catch(e) {
          console.log('error parsing config parameters')
        } 
        ajaxOptions = eventDataObj;
        getConfigParams();
        
    } 
    if ( eventDataObj.hasOwnProperty('type') && eventDataObj.type == 'event' ) {
        //add(JSON.stringify(eventDataObj));
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
          console.log('error converting encode element to json');
        }
        eventDataObj.eventLog.currentValue = mask(eventDataObj.eventLog.eventTargetID,eventDataObj.eventLog.currentValue);
        
        add(eventDataObj);

    }
    
    if ( eventDataObj.hasOwnProperty('type') &&  eventDataObj.type == 'xhr' ){
      //logArray.push(eventDataObj);  
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
      //logArray.push(eventDataObj);       
      add(eventDataObj);
    }
    //scheduleInsert();
    sync();

    
  });



function scheduleInsert(){

  if ( typeof xhrURL !== "undefined" && xhrURL.length > 0 && insertScheduledCount === 0 && logArray.length > 0 ) {   
    insertScheduledCount++; 
    ajaxOptions.data.p_clob_01 = JSON.stringify(logArray);
    setTimeout(insert(ajaxOptions.data),1000); 
  } 
  setTimeout(scheduleInsert,5000);
}

function getConfig(option) {
  var xhr = null;
  xhr = new XMLHttpRequest();

  xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
          if (xhr.status == 200 || xhr.status == 0) {
              console.log('worker xhr success ',xhr.responseText);
          } else {
             console.log('worker xhr failed ',xhr.status);
          }
      }
  };

  xhr.open('POST', xhrURL, true);  
  xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded; charset=UTF-8');
  xhr.setRequestHeader('Accept','text/plain');
  
  option.x01 = 'config';
  let urlEncodedData = "",
      urlEncodedDataPairs = [],
      name;

  console.log(JSON.stringify(option));    
    // Turn the data object into an array of URL-encoded key/value pairs.
  for( name in option ) {
    urlEncodedDataPairs.push( encodeURIComponent( name ) + '=' + encodeURIComponent( option[name] ) );
  }
  // Combine the pairs into a single string and replace all %-encoded spaces to
  // the '+' character; matches the behavior of browser form submissions.
  urlEncodedData = urlEncodedDataPairs.join( '&' ).replace( /%20/g, '+' );
  xhr.send(null);
}

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
              console.log('worker xhr success ',xhr.responseText);
              option.success(xhr.responseText);
              insertScheduledCount = 0;
              logArray.splice(0,logArrayLength);
          } else {
            insertScheduledCount = 0;
            console.log('worker xhr failed ',xhr.status);
              option.error(xhr.status);
              if (typeof(option.statusCode[xhr.status]) != "undefined") {
                  option.statusCode[xhr.status]();
              }
          }
      }
  };

  
    //xhr.open('POST', 'https://gopalmallya.com/ords/wwv_flow.show', true);
    //xhr.open('POST', '/ords/wwv_flow.show', true);
  
    xhr.open('POST', xhrURL, true);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded; charset=UTF-8');
    xhr.setRequestHeader('Accept','text/plain');
    
    let urlEncodedData = "",
        urlEncodedDataPairs = [],
        name;

    console.log(JSON.stringify(option));    
      // Turn the data object into an array of URL-encoded key/value pairs.
    for( name in option ) {
      urlEncodedDataPairs.push( encodeURIComponent( name ) + '=' + encodeURIComponent( option[name] ) );
    }
    // Combine the pairs into a single string and replace all %-encoded spaces to
    // the '+' character; matches the behavior of browser form submissions.
    urlEncodedData = urlEncodedDataPairs.join( '&' ).replace( /%20/g, '+' );

    xhr.send(urlEncodedData);
}

function getConfigParams() {
  for ( i=0; i < config.length;i++){
    if ( config[i].name == "mask" && config[i].value == "enabled" ) {
      configMaskEnabled = true;
    }
    if ( config[i].name == "encrypt" && config[i].value == "enabled" ) {
      configEncryptEnabled = true;
    }    
    if ( config[i].name == "mask_page_items" ) {
      maskPageItems = config[i].value;
    } 
    if ( config[i].name == "encrypt_page_items" ) {
      encryptPageItems = config[i].value;
    } 

  }  

}

function mask(key,value) {
  var maskedValue;
  if ( maskPageItems.indexOf(key.toLowerCase()) !== -1) {
     maskedValue = value.replace(/./g,"*");
  }else {
    maskedValue = value;
  }   
  return maskedValue;
}

function readAll() {
  let objectStore = db.transaction("log","readwrite").objectStore("log");

  objectStore.openCursor().onsuccess = function(event) {
    let cursor = event.target.result;

    if (cursor) {

      //dups
      var found = false;
      for(var i = 0; i < logArray.length; i++) {
          if (logArray[i].eventLog.eventTimeStamp == cursor.value.log.eventTimeStamp) {
              found = true;
              break;
          }
          
      }
      if ( !found ) {
        logArray.push(cursor.value.log);
      }
      objectStore.delete(cursor.key);
      cursor.continue();
    } else {
      self.postMessage("synced with db");
    }
  };
}

function add(eventDataObj) {
  let request;
  if ( dbOpen ) { 
     request = db
    .transaction(["log"], "readwrite")
    .objectStore("log")
    .add({ log: eventDataObj  });
    
    request.onsuccess = function(event) {
      self.postMessage("Successfully added log in db");
    };

    request.onerror = function(event) {
      self.postMessage("something went wrong here");
    };
  } else { //if db not open , add to local object array
      var found = false;
      for(var i = 0; i < logArray.length; i++) {
          if (logArray[i].eventLog.eventTimeStamp == eventDataObj.eventLog.eventTimeStamp) {
              found = true;
              break;
          }
          
      }
      if ( !found ) {
        logArray.push(eventDataObj);
      }

  }  
}

function sync(){
  if ( db ) {
    readAll();
  }  
  if ( typeof xhrURL !== "undefined" && xhrURL.length > 0 && insertScheduledCount === 0 && logArray.length > 0 ) {   
    insertScheduledCount++; 
    let logData = JSON.stringify(logArray);
    //logData = logData.replace(/\r?\n|\r/g,''); 
    //logData = logData.replace(/\\/g, "");
    ajaxOptions.data.p_clob_01 = logData;
    setTimeout(insert(ajaxOptions.data),10000); 
  } 
  setTimeout(sync,10000);
}

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
    console.log('error converting form encoded uri to json');
    return uriEncodedStr;
  }     
  
  return jsonObj;

}

function getTextNodesIn(node, includeWhitespaceNodes) {
  var textNodes = [], whitespace = /^\s*$/;

  function getTextNodes(node) {
      if (node.nodeType == 3) {
          if (includeWhitespaceNodes || !whitespace.test(node.nodeValue)) {
              textNodes.push(node);
          }
      } else {
          for (var i = 0, len = node.childNodes.length; i < len; ++i) {
              getTextNodes(node.childNodes[i]);
          }
      }
  }

  getTextNodes(node);
  return textNodes;
}


function redact_TextNodes() {
  var nodes = getTextNodesIn(document.getElementsByTagName('body')[0]);
  for (idx in nodes) {
    var node = nodes[idx];
    node.nodeValue = node.nodeValue.replace(/[^\s]/g, '█');
  }
}


function redact_inputs() {
  var elements = document.getElementsByTagName('input');

  for (idx in elements) {
    var e = elements[idx];
    if (typeof(e.value) != 'string') {
      continue;
    }
    e.value = e.value.replace(/[^\s]/g, '█');
  }
}


function redact() {
  redact_TextNodes();
  redact_inputs();
}


