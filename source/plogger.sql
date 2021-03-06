/* @license
plogger
v1.0.0
https://github.com/gopalmallya/plogger
License: MIT
*/
--------------------------------------------------------------------------------
-- this render function sets up a javascript function which will be called
-- when the dynamic action is executed.
-- all relevant configuration settings will be passed to this function as JSON
--------------------------------------------------------------------------------
function render
  ( p_dynamic_action apex_plugin.t_dynamic_action
  , p_plugin         apex_plugin.t_plugin
  )
return apex_plugin.t_dynamic_action_render_result
is
    -- l_result is necessary for the plugin infrastructure
    l_result                   apex_plugin.t_dynamic_action_render_result;
    
    l_ajaxID                  varchar2(4000) := apex_plugin.get_ajax_identifier;
    
    -- Javascript Initialization Code
    l_init_js_fn               varchar2(32767) := nvl(apex_plugin_util.replace_substitutions(p_dynamic_action.init_javascript_code), 'undefined');
    
begin

    if apex_application.g_debug
    then
        apex_plugin_util.debug_dynamic_action
          ( p_plugin         => p_plugin
          , p_dynamic_action => p_dynamic_action
          );
    end if;
    
    apex_javascript.add_library 
      ( p_name           => apex_plugin_util.replace_substitutions('plogger.js')
      , p_directory      => p_plugin.file_prefix || 'js/'
      , p_skip_extension => true
      );    

    apex_javascript.add_library 
      ( p_name           => apex_plugin_util.replace_substitutions('plogWorker.js')
      , p_directory      => p_plugin.file_prefix || 'js/'
      , p_skip_extension => true
      );   


    -- create a JS function call passing all settings as a JSON object
    apex_json.initialize_clob_output;
    apex_json.open_object;
    apex_json.write('ajaxId'             , l_ajaxID);
    apex_json.write('plugin_prefix'             , p_plugin.file_prefix || 'js/');
    apex_json.close_object;

    l_result.javascript_function := 'function(){plogger.start(this, '|| apex_json.get_clob_output || ', '|| l_init_js_fn ||');}';

    apex_json.free_output;

    -- all done, return l_result now containing the javascript function
    return l_result;
end render;

--------------------------------------------------------------------------------
-- the ajax function is invoked from the plogger.js, passing 
-- apex_application.g_clob_01 : events, errors, XHR as json string
-- inserts into plogger table

--------------------------------------------------------------------------------
function ajax
  ( p_dynamic_action apex_plugin.t_dynamic_action
  , p_plugin         apex_plugin.t_plugin
  )
return apex_plugin.t_dynamic_action_ajax_result
is
    -- error handling
    l_apex_error       apex_error.t_error;
    l_result           apex_error.t_error_result;
    -- return type which is necessary for the plugin infrastructure
    l_return           apex_plugin.t_dynamic_action_ajax_result;
    
    l_json clob;
    l_xml clob;
    l_sql varchar2(32767);
    l_sid number;
    l_message          varchar2(32767);
    l_insertRowCount   pls_integer;
    l_request_type varchar2(255) := apex_application.g_x01;
    l_service_path varchar2(4000);
    l_created_date date := sysdate;

begin
  if apex_application.g_debug
  then
      apex_plugin_util.debug_dynamic_action
        ( p_plugin         => p_plugin
        , p_dynamic_action => p_dynamic_action
        );
  end if;
    
  --return ords service url and plogger_config params to main thread
  -- ords service url and config params are passed to worker thread 
  -- worker thread uses url to persist log in plogger table using XHR
  if l_request_type = 'config' then
    apex_json.initialize_output;
    apex_json.open_object;
    select owa_util.GET_OWA_SERVICE_PATH 
      into l_service_path
    from dual ;
    apex_json.open_array('config');
    for config_rec in ( select app_id, lower(config_name) config_name, lower(config_value) config_value 
                        from plogger_config 
                        where app_id = :APP_ID
                      )
    loop
        apex_json.open_object;
        apex_json.write('appID' , config_rec.app_id);
        apex_json.write('name' , config_rec.config_name);
        apex_json.write('value' , config_rec.config_value);
        apex_json.close_object;
    end loop;
    apex_json.close_array;
    apex_json.write('appUser' , :APP_USER);
    apex_json.write('status' , 'success');
    apex_json.write('url' , l_service_path);
    apex_json.close_object;
    
    return l_return;    
  end if;

  l_xml := apex_application.g_clob_01;
  l_sql := '
            insert into plogger (  app_id, page_id, session_id, event_id,event_type,event_name,
                   event_Time_Stamp, event_Target_HTML, event_Target_ID, event_Target_Class,
                   event_Target_Text, Element, Current_value, 
                   xhr_data, xhr_url, xhr_ready_state, xhr_status, xhr_response_text,
                   error_message, error_url, error_stack, created_date

            )
            with x as ( select :l_xml as xml_text from dual)
            select app_id, page_id, session_id, event_id,event_type,event_name,
                   event_Time_Stamp, event_Target_HTML, event_Target_ID, event_Target_Class,
                   event_Target_Text, Element, Current_value, 
                   xhr_data, xhr_url, xhr_ready_state, xhr_status, xhr_response_text,
                   error_message, error_url, error_stack,:l_created_date
                   --xt.event_log.getClobVal()
                   --XMLSERIALIZE(CONTENT xt.event_log as clob INDENT SIZE = 2)
                   --x.xml_text
            from  x, xmltable(
            ''/json/row''
            passing apex_json.to_xmltype(p_source => x.xml_text)
            columns     
                  app_id   varchar2(255) path ''/row/appID'',
                  page_id   varchar2(255) path ''/row/pageID'',
                  session_id   varchar2(255) path ''/row/sessionID'',
                  event_id varchar2(255) path ''/row/_id'',
                  event_type varchar2(255) path ''/row/type'',
                  event_name varchar2(255) path ''/row/eventName'',
                  event_Time_Stamp varchar2(255) path ''/row/eventLog/eventTimeStamp'',
                  event_Target_HTML varchar2(4000) path ''/row/eventLog/eventTargetHTML'',
                  event_Target_ID varchar2(255) path ''/row/eventLog/eventTargetID'',
                  event_Target_Class varchar2(255) path ''/row/eventLog/eventTargetClass'',
                  event_Target_Text varchar2(255) path ''/row/eventLog/eventTargetText'',
                  Element varchar2(255) path ''/row/eventLog/element'',
                  Current_value varchar2(255) path ''/row/eventLog/currentValue'',
                  xhr_data    clob path ''/row/eventLog/xhrData'',
                  xhr_url     varchar2(255) path ''/row/eventLog/xhrURL'',
                  xhr_ready_state varchar2(255) path ''/row/eventLog/xhrReadyState'',
                  xhr_status varchar2(255) path ''/row/eventLog/xhrStatus'',
                  xhr_response_text clob path ''/row/eventLog/xhrResponseText'',
                  error_message varchar2(4000) path ''/row/eventLog/errorMsg'',
                  error_url varchar2(255) path ''/row/eventLog/errorURL'',
                  error_stack clob path ''/row/eventLog/errorStack''
            )xt';
  execute immediate l_sql using l_xml, l_created_date;          
  l_insertRowCount := sql%rowcount;
  l_message := ' inserted '||l_insertRowCount||' log records: ' || ' *sid* '|| l_sid|| ' time: '|| to_char(sysdate, 'hh24:mi:ss');
  htp.p(l_message);
  apex_json.initialize_output;
  apex_json.open_object;
  apex_json.write('status' , 'success');
  apex_json.write('message' , l_message);
  apex_json.close_object;

  return l_return;
exception
    when others then
        rollback;

        l_message := apex_escape.html(sqlerrm);
        
        apex_json.initialize_output;
        apex_json.open_object;
        apex_json.write('status' , 'error');
        apex_json.write('sqlerrm' , l_message);
        apex_json.write('sqlcode' , sqlcode);
        apex_json.write('message', 'Error inserting parsed records into table');
        
        apex_json.close_object;

        return l_return;    
end ajax;