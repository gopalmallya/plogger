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
-- create scheduler job to cleanup plogger partition older than retention days
-- configured in plogger_config table
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
    error_stack clob,
     created_date DATE
   )
   PARTITION BY RANGE (created_date)
   INTERVAL (NUMTODSINTERVAL(1,''DAY''))
   (
      PARTITION part_01 values LESS THAN (TO_DATE(''01-MAR-2021'',''DD-MON-YYYY''))
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
      "CONFIG_VALUE" VARCHAR2(255),
      "CONFIG_DESC" VARCHAR2(255)
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
         insert into plogger_config (app_id,config_name , config_value, config_desc ) values (107,'page_logging','enabled','When set to enabled, plogger will log events, error and xhr. When set to disabled, plogger will stop logging. Value is required');
         insert into plogger_config (app_id,config_name , config_value, config_desc ) values (107,'event_logging','enabled','When set to enabled, plogger will log events. When set to disabled, plogger will stop logging events. Value is required');
         insert into plogger_config (app_id,config_name , config_value, config_desc ) values (107,'xhr_logging','enabled','When set to enabled, plogger will log xhr. When set to disabled, plogger will stop logging xhr. Value is required');
         insert into plogger_config (app_id,config_name , config_value, config_desc ) values (107,'error_logging','enabled','When set to enabled, plogger will log errors. When set to disabled, plogger will stop logging error. Value is required');
         insert into plogger_config (app_id,config_name , config_value, config_desc ) values (107,'event_filter','click,change,blur,submit','When set to null, all events will be logged. Set events separated by comma or colon to log filtered events');
         insert into plogger_config (app_id,config_name , config_value, config_desc ) values (107,'page_filter',null,'When set to null, all pages will be logged. Set page numbers separated by comma or colon to log filtered pages.');
         insert into plogger_config (app_id,config_name , config_value, config_desc ) values (107,'username_filter',null,'When set to null, all users will be logged. Set username separated by comma or colon to log filtered users.');
         insert into plogger_config (app_id,config_name , config_value, config_desc ) values (107,'mask','disabled','When set to enabled, plogger will redact page items set in mask_page_items parameter. When set to disabled, plogger will redaction will be skipped. Value is required');
         insert into plogger_config (app_id,config_name , config_value, config_desc ) values (107,'mask_page_items',null,'Set page item names to redact item values with *** in event and xhr logs. When set to null, page item values will not be redacted in event and xhr logs');
         insert into plogger_config (app_id,config_name , config_value, config_desc ) values (107,'retention_days','7','Set number of days you want to retain data in plogger table');
         insert into plogger_config (app_id,config_name , config_value, config_desc ) values (107,'sync_interval_in_seconds','10','When set to 0, event is immediately synced in plogger table. Set number of seconds you want plogger to sync the logs collected on client side to plogger table. This value must be less than minimum seconds you expect a user will spend on the page');

         commit;
      end if;
exception
 when others then
    dbms_output.put_line(l_table_name ||' creation failed ');
    raise;
end;
/

begin
execute immediate 'comment on column  plogger.app_id is ''Application ID'' ';
execute immediate 'comment on column  plogger.page_id is ''Page ID'' ';
execute immediate 'comment on column  plogger.session_id is ''Session ID'' ';
execute immediate 'comment on column  plogger.event_id is ''ISO timestamp when event, error, xhr was captured'' ';
execute immediate 'comment on column  plogger.event_type is ''Contains event for user interaction events, error for browser error and xhr for xml http request made to server'' ';
execute immediate 'comment on column  plogger.event_name is ''Name of event such as click, change. For errors it is error and xhr it is xhr'' ';
execute immediate 'comment on column  plogger.event_Time_Stamp is ''Internal Identifier of event, used to suppress duplicate events by plogger'' ';
execute immediate 'comment on column  plogger.event_Target_HTML is ''HTML of target which originated the event. For error and xhr it will be null.'' ';
execute immediate 'comment on column  plogger.event_Target_ID is ''ID of target which originated the event. For error and xhr it will be null.'' ';
execute immediate 'comment on column  plogger.event_Target_Class is ''Class of target which originated the event. For error and xhr it will be null.'' ';
execute immediate 'comment on column  plogger.event_Target_Text is ''Value of target which originated the event. For error and xhr it will be null.'' ';
execute immediate 'comment on column  plogger.Element is ''Element of target which originated the event. For error and xhr it will be null.'' ';
execute immediate 'comment on column  plogger.Current_value is ''Current Value of target which originated the event. For error and xhr it will be null.'' ';
execute immediate 'comment on column  plogger.xhr_data is ''xhr payload sent to server'' ';
execute immediate 'comment on column  plogger.xhr_url is ''xhr url, used to send the xhr request'' ';
execute immediate 'comment on column  plogger.xhr_ready_state is ''xhr ready states'' ';
execute immediate 'comment on column  plogger.xhr_status is ''xhr status'' ';
execute immediate 'comment on column  plogger.xhr_response_text is ''xhr response text'' ';
execute immediate 'comment on column  plogger.error_message is ''Error message thrown by browser'' ';
execute immediate 'comment on column  plogger.error_url is ''Error URL'' ';
execute immediate 'comment on column  plogger.error_stack is ''Error Stack'' ';
execute immediate 'comment on column  plogger.created_date is ''Date when log was created. The table is interval day partitioned using created_date column as partition key'' ';
end;
/


--script to drop partition older than retention_daya config parameter set in plogger_config table
--please schedule this script using dbms_scheduler to run daily.
create or replace procedure plogger_cleanup
is
   l_days_to_keep pls_integer := 7;
   l_sql varchar2(32767);
   l_cnt pls_integer := 0;
   x_last_partition exception;
   pragma exception_init(x_last_partition, -14758);

   function get_high_value_as_date(
   p_table_name     in varchar2,
   p_partition_name in varchar2
   ) return date as
   v_high_value varchar2(1024);
   v_date        date;
   begin
   select high_value into v_high_value from user_tab_partitions
      where table_name = upper(p_table_name)
      and partition_name = upper(p_partition_name);
   execute immediate 'select ' || v_high_value || ' from dual' into v_date;
   return v_date;
   end;

begin
   --return if plogger table contains only 1 partition
   select count(1)
    into l_cnt
    from user_tab_partitions
      where table_name = 'PLOGGER';

   if l_cnt = 1 then
      return;
   end if;      

  begin
  select to_number(coalesce(config_value,'7'))
   into l_days_to_keep
   from  plogger_config
   where config_name ='retention_days';
  exception
  when no_data_found then
    null;
  end;  

  for rec in (select table_name, partition_name
    from user_tab_partitions
      where table_name = 'PLOGGER'
        ) loop
    begin

      dbms_output.put_line(get_high_value_as_date(rec.table_name, rec.partition_name));
      if  get_high_value_as_date(rec.table_name, rec.partition_name) < sysdate - l_days_to_keep then
         l_sql := 'alter table ' || rec.table_name || ' drop partition ' || rec.partition_name;
         execute immediate l_sql;
         dbms_output.put_line(l_sql);
      end if;    
    exception
      when x_last_partition then
        null;
    end;
  end loop;
end;
/

BEGIN
  DBMS_SCHEDULER.create_job (
    job_name        => 'plogger_cleanup',
    job_type        => 'PLSQL_BLOCK',
    job_action      => 'BEGIN plogger_cleanup; END;',
    start_date      => SYSTIMESTAMP,
    repeat_interval => 'freq=daily; byminute=0; bysecond=0;',
    enabled         => TRUE);
END;
/