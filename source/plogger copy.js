/* @license
plogger
v1.0.0
https://github.com/gopalmallya/plogger
License: MIT

--------------------------------------------------------------------------------------------
-- In main thread, when document is ready, intercept events, errors and XHR and 
-- pass them to worker thread. 
-- Worker thread is created by start() by DA attached to page load event.
-- Also get the ords service url from db, which is passed to worker thread.
------------------------------------------------------------------------------------
*/
var plogger = (function($) {
    var l_url;
    var appID = $v('pFlowId');
    var pageID =  $v('pFlowStepId');
    var sessionID =  $v('pInstance');
    var ajaxIdentifier, plugin_prefix, plogWorker;
    var logData; //this is posted to worker for logging
    var config;
    var configPageLoggingEnabled = false , configXhrLoggingEnabled = false , configEventLoggingEnabled = false, configErrorLoggingEnabled = false;
    var configEventFilter, configPageFilter, configUsernameFilter, configEncryptEnabled, configEncryptPageItems;
    var configMaskEnabled, configMaskPageItems, configSyncInterval;
    var submitEvent;
    var db, dbOpen;

    //log errors
    window.onerror = function (msg, url, lineNo, columnNo, error) {
        var errorObj = { 
                        msg: msg,
                        url: url, 
                        stack: JSON.stringify(error,replaceErrors) 
                    } ;   
        logMessage("error","error",errorObj);
        sleep(10);            
        return false;
    }

    function replaceErrors(key, value) {
        if (value instanceof Error) {
            var error = {};
            Object.
            getOwnPropertyNames(value).
            forEach(function (key) {
                error[key] = value[key];
            });
            return error;
        }
        return value;
    }


    //log XHR
    var open = window.XMLHttpRequest.prototype.open,  send = window.XMLHttpRequest.prototype.send;

    function openReplacement(method, url, async, user, password) {  
    this._url = url;
    return open.apply(this, arguments);
    }

    function sendReplacement(data) {  

        logMessage("xhr","xhr_send",this,data); 
        sleep(10);
        if(this.onreadystatechange) {
            this._onreadystatechange = this.onreadystatechange;
        }
        
        
        this.onreadystatechange = onReadyStateChangeReplacement;
        return send.apply(this, arguments);
    }

    function onReadyStateChangeReplacement() {  
    
        logMessage("xhr","xhr_readyState",this);   
        if(this._onreadystatechange) {
            return this._onreadystatechange.apply(this, arguments);
        }
    }

    window.XMLHttpRequest.prototype.open = openReplacement;  
    window.XMLHttpRequest.prototype.send = sendReplacement;

    //log user interactive events
    // save the old addEventListener for later
    const _addEventListener = EventTarget.prototype.addEventListener;
    
    // overwrite the addEventListener prototype with a new function
    EventTarget.prototype.addEventListener = function(type, handler, useCapture){
    
        // create a new handler which has timing instrumented in
        const patchedHandler = (event) => {
            // call the old event listener (return it later)
            try {
            const result = handler(event);
            logMessage('event',type,event);
            sleep(10);
            return result;
            } catch(e) {
                console.log('error running old listener');
            }
        }
    
        // return the old event listener with the instrumented handler
        return _addEventListener.apply(this, [type, patchedHandler, useCapture]);
    }

    function sleep(milliseconds) {
        const date = Date.now();
        let currentDate = null;
        do {
          currentDate = Date.now();
        } while (currentDate - date < milliseconds);
      }

    //log form submit
    $('form').submit(function(event){
        // Stop the form submitting
        event.preventDefault();
        eventLog = {
            eventTimeStamp: event.timeStamp.toString(),
            eventTargetHTML: undefined,
            eventTargetID : undefined,
            eventTargetClass : undefined,
            eventTargetText: undefined,
            element: undefined,
            currentValue: undefined
        };
        logData = {
            appID : appID,
            pageID : pageID,
            sessionID : sessionID,
            _id: new Date().toISOString(),
            type:'event',
            eventName: 'submit',
            eventLog: eventLog

        }; 
        if ( plogWorker ) {
            plogWorker.postMessage(JSON.stringify(logData));
            plogWorker.postMessage(JSON.stringify({"method":"sync"}));
          }
        sleep(100); //this gives time for worker to persist submit event in indexeddb
        event.currentTarget.submit();
        
                       
        
    });  


    //get ords service path, to be used by worker to insert logData
    async function geturl() {
        var getServicePathPromise = apex.server.plugin(ajaxIdentifier,
                                                        {x01:"config"},
                                                        {dataType: "text"}
                                                        );
        try {
            var getServicePathResult = getServicePathPromise.done ( function (d) {
                    let data = JSON.parse(d);
                    if (data.status == "success" ) {
                        console.log('url is ',data.url);
                        let service_path = data.url.replace(/\r?\n|\r/g,''); 
                        l_url = window.location.protocol+'//'+window.location.hostname+':'+window.location.port+service_path+'wwv_flow.ajax';
                        l_username = data.appUser;
                        config = data.config;
                        for ( i=0; i < config.length;i++){
                            if ( config[i].name == "page_logging" && config[i].value == "enabled" ) {
                                configPageLoggingEnabled = true;
                            }
                            if ( config[i].name == "xhr_logging" && config[i].value == "enabled" ) {
                                configXhrLoggingEnabled = true;
                            }
                            if ( config[i].name == "event_logging" && config[i].value == "enabled" ) {
                                configEventLoggingEnabled = true;
                            }
                            if ( config[i].name == "error_logging" && config[i].value == "enabled" ) {
                                configErrorLoggingEnabled = true;
                            }
                            if ( config[i].name == "event_filter" ) {
                                configEventFilter = config[i].value;
                            }
                            if ( config[i].name == "page_filter" ) {
                                configPageFilter = config[i].value;
                            }
                            if ( config[i].name == "username_filter" ) {
                                configUsernameFilter = config[i].value;
                            }
                            if ( config[i].name == "encrypt" ) {
                                configEncryptEnabled = config[i].value;
                            }
                            if ( config[i].name == "encrypt_page_items" ) {
                                configEncryptPageItems = config[i].value;
                            }
                            if ( config[i].name == "mask" ) {
                                configMaskEnabled = config[i].value;
                            }
                            if ( config[i].name == "mask_page_items" ) {
                                configMaskPageItems = config[i].value;
                            }
                            if ( config[i].name == "sync_interval_in_seconds" ) {
                                configSyncInterval = config[i].value;
                                //start the syncher when sync interval in seconds is set to > 0
                                if ( !isNaN(configSyncInterval) && configSyncInterval > 0 ) {
                                    sync();
                                }    
                            }


                        }
                    }
                }
                  
            );
        } catch(e) {
            console.log('url fetch error');
        }     
    
        let result = await getServicePathPromise;
        var ajaxOptions = {
        method: "POST",
        url: l_url,
        config: JSON.stringify(config),
        data: {
            "p_request": "PLUGIN="+ajaxIdentifier,
            "p_flow_id": $v('pFlowId'),
            "p_flow_step_id": $v('pFlowStepId'),
            "p_instance": $v('pInstance'),
        },
        dataType: 'json'
        };

        plogWorker.postMessage(JSON.stringify(ajaxOptions));
    
    }

    //post events, errors, xhr to worker to persist locally and sync with remote  
    function logMessage(eventType, eventName, eventObject, eventData) {

        if ( !configPageLoggingEnabled ) {
            return;
        }
        
        if ( configPageFilter && configPageFilter.indexOf(pageID) == -1 ) {
                return;   
        }

        if ( configUsernameFilter && configUsernameFilter.indexOf(l_username) == -1 ) {
            return;   
        }


        var eventLog;
        if ( configXhrLoggingEnabled && eventType == 'xhr'  ) {
            eventLog = {
                xhrData: eventData,
                xhrURL: eventObject._url,
                xhrReadyState: eventObject.readyState, 
                xhrStatus:eventObject.status, 
                xhrResponseText:eventObject.responseText
            };
            logData = {
                appID : appID,
                pageID : pageID,
                sessionID : sessionID,
                _id: new Date().toISOString(),
                type:eventType,
                eventName: eventName,
                eventLog: eventLog
    
            }; 
    
            if ( plogWorker  ) {    
                plogWorker.postMessage(JSON.stringify(logData));
                //sync 
                if ( configSyncInterval && !isNaN(configSyncInterval) && configSyncInterval == 0 ){
                    plogWorker.postMessage(JSON.stringify({"method":"sync"}));
                }    

            }

        }    
        if ( configEventLoggingEnabled && eventType == 'event' && configEventFilter && configEventFilter.indexOf(eventName) !== -1 )  {
            eventLog = {
                eventTimeStamp: eventObject.timeStamp.toString(),
                eventTargetHTML: $(eventObject.target)[0].outerHTML,
                eventTargetID : eventObject.target.id,
                eventTargetClass : eventObject.target.class,
                eventTargetText: $(eventObject.target)[0].outerText,
                element: $(eventObject.target).serialize(),
                currentValue: $(eventObject.target).val()
            };
            logData = {
                appID : appID,
                pageID : pageID,
                sessionID : sessionID,
                _id: new Date().toISOString(),
                type:eventType,
                eventName: eventName,
                eventLog: eventLog
    
            }; 
    
            if ( plogWorker  ) {    
                plogWorker.postMessage(JSON.stringify(logData));
                //sync 
                if ( configSyncInterval && !isNaN(configSyncInterval) && configSyncInterval == 0 ){
                    plogWorker.postMessage(JSON.stringify({"method":"sync"}));
                }    

            } 

        }    
        if ( configErrorLoggingEnabled && eventType == 'error') {
            eventLog = { 
                errorMsg: eventObject.msg,
                errorURL: eventObject.url, 
                errorStack: eventObject.stack
            } ;  
            logData = {
                appID : appID,
                pageID : pageID,
                sessionID : sessionID,
                _id: new Date().toISOString(),
                type:eventType,
                eventName: eventName,
                eventLog: eventLog
    
            }; 
    
            if ( plogWorker ) {    
                plogWorker.postMessage(JSON.stringify(logData));
                //sync 
                if ( configSyncInterval && !isNaN(configSyncInterval) && configSyncInterval == 0 ){
                    plogWorker.postMessage(JSON.stringify({"method":"sync"}));
                }   

            } 
 
        }    

    
    
    }
            

    //called by Plugin when configured on page load
    function start(daContext, config, initFn) {
        
        ajaxIdentifier =  config.ajaxId;
        plugin_prefix = config.plugin_prefix;
        var xhr_url = geturl();
        plogWorker = new Worker(plugin_prefix+"plogWorker.js");
        plogWorker.addEventListener("message", (event) => {
            console.table('worker response ', JSON.stringify(event.data));
            if ( event.data == 'db_open_success' ) {
                dbOpen = true;
            }

        });
        plogWorker.postMessage(JSON.stringify({"method":"init"}));

        
        
    }

    function sync() {
        plogWorker.postMessage(JSON.stringify({"method":"sync"}));
        if ( configSyncInterval && configSyncInterval > 0 ){
            setTimeout(function(){
                sync();
            },configSyncInterval*1000);
        }    
    }
    function openDB() {
        let req = indexedDB.open("plogger", 1);
        req.onupgradeneeded = function(e) {
          db = e.target.result;
          if (!db.objectStoreNames.contains('log')) { 
            objectStore = db.createObjectStore("log", { autoIncrement: true });
          }
          db.onerror = function(event) {
            let request = event.target; // the request that caused the error
            console.log("DB Error", request.error);
          };
          console.log("main db_upgrade_success");
        };
        req.onsuccess = function(e) {
          db = req.result;
          dbOpen = true;
          console.log('main db_open_success');
        };
        req.onerror = function(e) {
          console.log("dbmain _open_error");
        };
    }

    //not used
    function add(eventDataObj) {
        let request;
        
        if ( dbOpen ) { 
            let transaction = db.transaction(["log"], "readwrite");
            let log = transaction.objectStore("log");
            let request = log.add({ log: eventDataObj });
            transaction.complete;
          
            request.onsuccess = function(event) {
              var countRequest = transaction.objectStore("log").count();
              countRequest.onsuccess = function() {
              console.log("main indexeddb count:" + countRequest.result);
            };
            request.onerror = function(event) {
              console.log("main add_indexeddb_error");
            };
        
            transaction.oncomplete = function() {
              console.log("Transaction is complete");
              console.log("main add_indexeddb_success");
              if ( plogWorker ) {
                plogWorker.postMessage(JSON.stringify({"method":"sync"}));
              }
            };
          };
      
        } 
      }
      
    

    return {
        "start" : function (daContext, config, initFn) {
                        start(daContext, config, initFn);
                    },
    }   
})(apex.jQuery)
