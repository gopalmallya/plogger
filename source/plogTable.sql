/* @license
plogger
v1.0.0
https://github.com/gopalmallya/plogger
License: MIT
*/
--------------------------------------------------------------------------------
-- plogger table is used to persist events, errors and XHR
-- plogger_config table is used to configure logging parameters
-- insert defaults into plogger_config
--------------------------------------------------------------------------------
declare
    l_cnt pls_integer :=0;
    l_table_name varchar2(30) := 'PLOGGER';
    l_create_table_sql varchar2(32767) := 
    'create table '||
    l_table_name ||
    '(
    app_id     varchar2(255),
    page_id    varchar2(255),
    session_id varchar2(255),
    event_id  varchar2(255),
    event_type varchar2(255),
    event_name varchar2(255),
    event_Time_Stamp varchar2(255),
    event_Target_HTML varchar2(4000),
    event_Target_ID varchar2(255),
    event_Target_Class varchar2(255),
    event_Target_Text varchar2(255),
    Element varchar2(255),
    Current_value varchar2(255),
    xhr_data    clob,
    xhr_url     varchar2(255),
    xhr_ready_state varchar2(255),
    xhr_status varchar2(255),
    xhr_response_text clob,
    error_message varchar2(4000),
    error_url varchar2(255),
    error_stack clob
    )';

begin
    --create table
    select count(1) into l_cnt from all_objects where object_name = l_table_name and object_type='TABLE';
    if l_cnt > 0 then
        execute immediate 'drop table '|| l_table_name;
    end if;
    select count(1) into l_cnt from all_objects where object_name = l_table_name and object_type='TABLE';
    if l_cnt = 0 then
        execute immediate l_create_table_sql;
    end if;
   
exception
 when others then
    dbms_output.put_line(l_table_name ||' creation failed ');
    raise;
end;
/

declare
    l_cnt pls_integer :=0;
    l_table_name varchar2(30) := 'PLOGGER_CONFIG';
    l_create_table_sql varchar2(32767) := 
    'create table '||
    l_table_name ||
    '(	"APP_ID" NUMBER, 
      "CONFIG_NAME" VARCHAR2(255), 
      "CONFIG_VALUE" VARCHAR2(255)
      )';

begin
    --create table
      select count(1) into l_cnt from all_objects where object_name = l_table_name and object_type='TABLE';
      if l_cnt > 0 then
         execute immediate 'drop table '|| l_table_name;
      end if;
      select count(1) into l_cnt from all_objects where object_name = l_table_name and object_type='TABLE';
      if l_cnt = 0 then
         execute immediate l_create_table_sql;
      end if;
      select count(1) into l_cnt from all_objects where object_name = l_table_name and object_type='TABLE';
      if l_cnt > 0 then
         delete from plogger_config;
         insert into plogger_config (app_id,config_name , config_value ) values (107,'page_logging','enabled');
         insert into plogger_config (app_id,config_name , config_value ) values (107,'event_logging','enabled');
         insert into plogger_config (app_id,config_name , config_value ) values (107,'xhr_logging','enabled');
         insert into plogger_config (app_id,config_name , config_value ) values (107,'error_logging','enabled');
         insert into plogger_config (app_id,config_name , config_value ) values (107,'event_filter','click,change,blur,submit');
         insert into plogger_config (app_id,config_name , config_value ) values (107,'page_filter',null);
         insert into plogger_config (app_id,config_name , config_value ) values (107,'username_filter',null);
         insert into plogger_config (app_id,config_name , config_value ) values (107,'mask','disabled');
         insert into plogger_config (app_id,config_name , config_value ) values (107,'mask_page_items',null);
         commit;
      end if;
exception
 when others then
    dbms_output.put_line(l_table_name ||' creation failed ');
    raise;
end;
/


