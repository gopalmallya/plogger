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
    
    -- read plugin parameters and store in local variables
/*    l_chunkSize                p_dynamic_action.attribute_01%type := p_dynamic_action.attribute_01;
    l_threads                  p_dynamic_action.attribute_02%type := p_dynamic_action.attribute_02;
    l_fileID                      p_dynamic_action.attribute_03%type := p_dynamic_action.attribute_03;
    l_complete_callback_fn        p_dynamic_action.attribute_05%type := p_dynamic_action.attribute_05;
    l_chunk_inserted_callback_fn  p_dynamic_action.attribute_06%type := p_dynamic_action.attribute_06;
    l_error_callback_fn           p_dynamic_action.attribute_07%type := p_dynamic_action.attribute_07;
    l_chunkFormat                 p_dynamic_action.attribute_11%type := p_dynamic_action.attribute_11; 
    l_insertType                  p_dynamic_action.attribute_08%type := p_dynamic_action.attribute_08;
    l_fileType                    p_dynamic_action.attribute_10%type := p_dynamic_action.attribute_10;
    l_skipFirstNRows              p_dynamic_action.attribute_12%type := p_dynamic_action.attribute_12;
    l_stream                      p_dynamic_action.attribute_13%type := p_dynamic_action.attribute_13;
*/
    -- Javascript Initialization Code
    l_init_js_fn               varchar2(32767) := nvl(apex_plugin_util.replace_substitutions(p_dynamic_action.init_javascript_code), 'undefined');
    
begin
    -- standard debugging intro, but only if necessary
    if apex_application.g_debug
    then
        apex_plugin_util.debug_dynamic_action
          ( p_plugin         => p_plugin
          , p_dynamic_action => p_dynamic_action
          );
    end if;
    
    -- check if we need to add our toastr plugin library files
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
    --
    -- csv2Table(this, {
    --     "ajaxId": "SDtjkD9_TUyDJZzOzlRKnFkZWTFWkOqJrwNuJyUzooI",
    --     "pageItems": {},
    -- });
    apex_json.initialize_clob_output;
    apex_json.open_object;

    apex_json.write('ajaxId'             , l_ajaxID);
    apex_json.write('plugin_prefix'             , p_plugin.file_prefix || 'js/');
    
/*    apex_json.open_object('pageItems');
    apex_json.write('chunkSize'      , l_chunkSize);
    apex_json.write('threads'      , l_threads);
    apex_json.write('skipFirstNRows'      , l_skipFirstNRows);
    apex_json.write('fileType'      , l_fileType);
    apex_json.write('fileID'      , l_fileID);
    apex_json.write('chunkFormat'      , l_chunkFormat);
    apex_json.write('insertType'      , l_insertType);
    apex_json.write('stream'      , l_stream);
    if l_complete_callback_fn is not null then
      apex_json.write_raw
            ( p_name  => 'complete_callback_fn'
            , p_value => l_complete_callback_fn
            );
    end if;
      
    if l_chunk_inserted_callback_fn is not null then        
      apex_json.write_raw
            ( p_name  => 'chunk_inserted_callback_fn'
            , p_value => l_chunk_inserted_callback_fn
            );          
    end if;

    if l_error_callback_fn is not null then
      apex_json.write_raw
            ( p_name  => 'error_callback_fn'
            , p_value => l_error_callback_fn
            );
    end if;

    apex_json.close_object;
*/
    apex_json.close_object;

    l_result.javascript_function := 'function(){plogger.start(this, '|| apex_json.get_clob_output || ', '|| l_init_js_fn ||');}';

    apex_json.free_output;

    -- all done, return l_result now containing the javascript function
    return l_result;
end render;

--------------------------------------------------------------------------------
-- the ajax function is invoked from the plogger.js, passing 
-- apex_application.g_clob_01 : events as json string

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
    
/*    -- read plugin parameters and store in local variables
    l_insertType        p_dynamic_action.attribute_08%type := p_dynamic_action.attribute_08;
    l_plsql_statement   p_dynamic_action.attribute_09%type := p_dynamic_action.attribute_09; 
    
*/
    l_json clob;
    l_xml clob;
    l_sql varchar2(32767);
    l_sid number;
    l_message          varchar2(32767);
    l_insertRowCount   pls_integer;
    l_request_type varchar2(255) := apex_application.g_x01;
    l_service_path varchar2(4000);

begin
    -- standard debugging intro, but only if necessary
  if apex_application.g_debug
  then
      apex_plugin_util.debug_dynamic_action
        ( p_plugin         => p_plugin
        , p_dynamic_action => p_dynamic_action
        );
  end if;
    

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
                   error_message, error_url, error_stack

            )
            with x as ( select :l_xml as xml_text from dual)
            select app_id, page_id, session_id, event_id,event_type,event_name,
                   event_Time_Stamp, event_Target_HTML, event_Target_ID, event_Target_Class,
                   event_Target_Text, Element, Current_value, 
                   xhr_data, xhr_url, xhr_ready_state, xhr_status, xhr_response_text,
                   error_message, error_url, error_stack
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
  execute immediate l_sql using l_xml;          
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