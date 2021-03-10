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
    var configMaskEnabled, configMaskPageItems;
    var dbOpen = false;

    //log errors
    window.onerror = function (msg, url, lineNo, columnNo, error) {
        var errorObj = { 
                        msg: msg,
                        url: url, 
                        stack: JSON.stringify(error,replaceErrors) 
                    } ;   
        logMessage("error","error",errorObj);            
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


    //xhr logging
    var open = window.XMLHttpRequest.prototype.open,  send = window.XMLHttpRequest.prototype.send;

    function openReplacement(method, url, async, user, password) {  
    this._url = url;
    return open.apply(this, arguments);
    }

    function sendReplacement(data) {  

        logMessage("xhr","xhr_send",this,data); 

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
        const startTime = Date.now();
        // call the old event lister (return it later)
        const result = handler(event)
        const endTime = Date.now();
        // log what you want to (timing, event type, or whatever)
        console.log(`${type} on ${this} took ${(endTime - startTime)/1000}s`);
        logMessage('event',type,event);
       return result;
    }
    
    // return the old event listener with the instrumented handler
    return _addEventListener.apply(this, [type, patchedHandler, useCapture]);
    }


    $('form').submit(function(event){
        // Stop the form submitting
        event.preventDefault();
        logMessage('event','submit',event);  
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
                        //l_url = window.location.protocol+'//'+window.location.hostname+service_path+'wwv_flow.show';
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

        function logMessage(eventType, eventName, eventObject, eventData) {
            if ( eventName == 'submit' ) {
                console.log('submit logmessage');
            }

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

    function buildConfig(options)
    {
        config = {};
    }    



    //upload is called from plugin, config, status, pause, resume can be used anywhere in page
    return {
        "start" : function (daContext, config, initFn) {
                        start(daContext, config, initFn);
                    },
        "config" : function(options) {
                        buildConfig(options);
                    }
    }   
})(apex.jQuery)
