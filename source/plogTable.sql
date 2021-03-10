create table plogger
(
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
);

CREATE TABLE  "PLOGGER_CONFIG" 
   (	"APP_ID" NUMBER, 
	"CONFIG_NAME" VARCHAR2(255), 
	"CONFIG_VALUE" VARCHAR2(255)
   )
/
insert into plogger_config (app_id,config_name , config_value ) values (100,'page_logging','enabled');
insert into plogger_config (app_id,config_name , config_value ) values (100,'event_logging','enabled');
insert into plogger_config (app_id,config_name , config_value ) values (100,'xhr_logging','enabled');
insert into plogger_config (app_id,config_name , config_value ) values (100,'error_logging','enabled');
insert into plogger_config (app_id,config_name , config_value ) values (100,'event_filter','click,change,blur');
insert into plogger_config (app_id,config_name , config_value ) values (100,'event_filter','click,change');
insert into plogger_config (app_id,config_name , config_value ) values (100,'page_filter','1');
insert into plogger_config (app_id,config_name , config_value ) values (100,'username_filter',null);
insert into plogger_config (app_id,config_name , config_value ) values (100,'encrypt_function','encrypt');
insert into plogger_config (app_id,config_name , config_value ) values (100,'encrypt','enabled');
insert into plogger_config (app_id,config_name , config_value ) values (100,'encrypt_page_items','P1_NEW');
insert into plogger_config (app_id,config_name , config_value ) values (100,'mask','enabled');
insert into plogger_config (app_id,config_name , config_value ) values (100,'mask_page_items','P1_NEW');


