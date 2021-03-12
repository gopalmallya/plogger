# About this plugin
<p>plogger is Oracle APEX, dynamic action plugin, when configured on page load event, captures user interaction events, errors and xhr in realtime and logs them in plogger table.<p>
<p>APEX developers can use this plugin to understand the "how users are using the page and application" by analyzing captured events and data, fix page errors thrown by browser and tune performance by optimizing server side processing by analyzing xhr </p>
<p>plogger can be configured to capture events, errors and xhr on all pages or selected pages, for selected users, redact sensitive data, cleanup older logs by setting configuration values in plogger_config table</p>

# Demo
<p> plogger plugin is added to customer tracker application, on page Zero, as dynamic action, on page load event., thereby enabling capture of events, errors and xhr on all pages of application. </p>
<p> Explore the <a href="https://gopalmallya.com/ords/r/gopalmallya/plogger_demo">demo application</a>, by clicking drop downs, editing, saving pages in customer tracker application.</p>
<p> Analyze you exploration, in plogger reports, which contains 
    <ul>
    <li>scatter chart to help yo visualize events, errors and xhr generated by your exploration</li>
    <li>Event report contains details about the event such as click, change, blur, focus.</li>
    <li>XHR report contains, xml http requests made by page to server</li>
    <li>Error report contains, any browser error thrown by the page </li>
    </ul>
</p>    


# Getting Started
## Installation
<p>Download and Install the plugin from <a href="https://github.com/gopalmallya/plogger">GitHub</a> 
<ul>
<li>Execute ploggerTable.sql in APEX parsing schema. 
    
> This script will create plogger table with daily interval partition 
>
>  plogger_config table with default configuration values and scheduler job for cleanup older logs </li>
<li> Import dynamic_action_plugin_com_gm_plogger.sql in APEX builder.</li>
</ui>
</p>
<p>On page 0, create dynamic action on page load event and select plogger plugin in true action</p>

## Changing default configuration
<p> Installing plugin, configures plogger to capture and log events, errors and xhr on all pages, for all users, in realtime, with no redaction on any page items and cleanup logs older than 7 days </p>
<p>To override default configuration, update configuration parameters in plogger_config table
</p>
<p> The table below is plogger configuration for application 107.</p> 
<table aria-label="Results" cellpadding="0" cellspacing="0" border="0" class="u-Report u-Report--stretch">
<tbody><tr><th id="APP_ID">APP_ID</th><th id="CONFIG_NAME">CONFIG_NAME</th><th id="CONFIG_VALUE">CONFIG_VALUE</th><th id="CONFIG_DESC">CONFIG_DESC</th></tr>
<tr><td headers="APP_ID">107</td><td headers="CONFIG_NAME">page_logging</td><td headers="CONFIG_VALUE">enabled</td><td headers="CONFIG_DESC">When set to enabled, plogger will log events, error and xhr. When set to disabled, plogger will stop logging. Value is required</td></tr>
<tr><td headers="APP_ID">107</td><td headers="CONFIG_NAME">event_logging</td><td headers="CONFIG_VALUE">enabled</td><td headers="CONFIG_DESC">When set to enabled, plogger will log events. When set to disabled, plogger will stop logging events. Value is required</td></tr>
<tr><td headers="APP_ID">107</td><td headers="CONFIG_NAME">xhr_logging</td><td headers="CONFIG_VALUE">enabled</td><td headers="CONFIG_DESC">When set to enabled, plogger will log xhr. When set to disabled, plogger will stop logging xhr. Value is required</td></tr>
<tr><td headers="APP_ID">107</td><td headers="CONFIG_NAME">error_logging</td><td headers="CONFIG_VALUE">enabled</td><td headers="CONFIG_DESC">When set to enabled, plogger will log errors. When set to disabled, plogger will stop logging error. Value is required</td></tr>
<tr><td headers="APP_ID">107</td><td headers="CONFIG_NAME">event_filter</td><td headers="CONFIG_VALUE">click,change,blur,submit</td><td headers="CONFIG_DESC">When set to null, all events will be logged. Set events separated by comma or colon to log filtered events</td></tr>
<tr><td headers="APP_ID">107</td><td headers="CONFIG_NAME">page_filter</td><td headers="CONFIG_VALUE"> - </td><td headers="CONFIG_DESC">When set to null, all pages will be logged. Set page numbers separated by comma or colon to log filtered pages.</td></tr>
<tr><td headers="APP_ID">107</td><td headers="CONFIG_NAME">username_filter</td><td headers="CONFIG_VALUE"> - </td><td headers="CONFIG_DESC">When set to null, all users will be logged. Set username separated by comma or colon to log filtered users.</td></tr>
<tr><td headers="APP_ID">107</td><td headers="CONFIG_NAME">mask</td><td headers="CONFIG_VALUE">disabled</td><td headers="CONFIG_DESC">When set to enabled, plogger will redact page items set in mask_page_items parameter. When set to disabled, plogger will redaction will be skipped. Value is required</td></tr>
<tr><td headers="APP_ID">107</td><td headers="CONFIG_NAME">mask_page_items</td><td headers="CONFIG_VALUE"> - </td><td headers="CONFIG_DESC">Set page item names to redact item values with *** in event and xhr logs. When set to null, page item values will not be redacted in event and xhr logs</td></tr>
<tr><td headers="APP_ID">107</td><td headers="CONFIG_NAME">retention_days</td><td headers="CONFIG_VALUE">7</td><td headers="CONFIG_DESC">Set number of days you want to retain data in plogger table</td></tr>
<tr><td colspan="4">More than 10 rows available. Increase rows selector to view more rows.</td></tr>
</tbody></table>
<p> for e.g. to disable error logging</p>
<pre><code>update plogger_config set config_value='disabled' where config_name='error_logging'</code></pre>
<p> Analyse captured events, errors and xhr in plogger table</p>
</p>


# Features
<p>
<ul>
<li>For Security and Privacy, this plugin is written in plain javascript using indexedDB to persist logs and PL/SQL to insert into plogger table. The plugin has no dependencies on any external javascript libraries or user analytic librarires for e.g google analytics</li>
<li>Capture and log, events</li>
<li>Capture and log, errors</li>
<li>Capture and log, xml http requests (xhr)</li>
<li>Realtime capturing and logging</li>
<li>On demand, enable or disable capturing and logging</li>
<li>Filter capturing and logging, for pages and users</li>
<li>Data Redaction in logs for sensitive page items</li>
<li>Automatic cleanup of older logs</li>
</ul>
</p>

# How to use collected logs
<p><pre><code>Select * from plogger </code></pre></p>
<p> Table Description </p>
<table aria-label="Results" cellpadding="0" cellspacing="0" border="0" class="u-Report u-Report--stretch">
<tbody><tr><th id="TABLE_NAME">TABLE_NAME</th><th id="COLUMN_NAME">COLUMN_NAME</th><th id="COMMENTS">COMMENTS</th></tr>
<tr><td headers="TABLE_NAME">PLOGGER</td><td headers="COLUMN_NAME">APP_ID</td><td headers="COMMENTS">Application ID</td></tr>
<tr><td headers="TABLE_NAME">PLOGGER</td><td headers="COLUMN_NAME">PAGE_ID</td><td headers="COMMENTS">Page ID</td></tr>
<tr><td headers="TABLE_NAME">PLOGGER</td><td headers="COLUMN_NAME">SESSION_ID</td><td headers="COMMENTS">Session ID</td></tr>
<tr><td headers="TABLE_NAME">PLOGGER</td><td headers="COLUMN_NAME">EVENT_ID</td><td headers="COMMENTS">ISO timestamp when event, error, xhr was captured</td></tr>
<tr><td headers="TABLE_NAME">PLOGGER</td><td headers="COLUMN_NAME">EVENT_TYPE</td><td headers="COMMENTS">Contains event for user interaction events, error for browser error and xhr for xml http request made to server</td></tr>
<tr><td headers="TABLE_NAME">PLOGGER</td><td headers="COLUMN_NAME">EVENT_NAME</td><td headers="COMMENTS">Name of event such as click, change. For errors it is error and xhr it is xhr</td></tr>
<tr><td headers="TABLE_NAME">PLOGGER</td><td headers="COLUMN_NAME">EVENT_TIME_STAMP</td><td headers="COMMENTS">Internal Identifier of event, used to suppress duplicate events by plogger</td></tr>
<tr><td headers="TABLE_NAME">PLOGGER</td><td headers="COLUMN_NAME">EVENT_TARGET_HTML</td><td headers="COMMENTS">HTML of target which originated the event. For error and xhr it will be null.</td></tr>
<tr><td headers="TABLE_NAME">PLOGGER</td><td headers="COLUMN_NAME">EVENT_TARGET_ID</td><td headers="COMMENTS">ID of target which originated the event. For error and xhr it will be null.</td></tr>
<tr><td headers="TABLE_NAME">PLOGGER</td><td headers="COLUMN_NAME">EVENT_TARGET_CLASS</td><td headers="COMMENTS">Class of target which originated the event. For error and xhr it will be null.</td></tr>
<tr><td headers="TABLE_NAME">PLOGGER</td><td headers="COLUMN_NAME">EVENT_TARGET_TEXT</td><td headers="COMMENTS">Value of target which originated the event. For error and xhr it will be null.</td></tr>
<tr><td headers="TABLE_NAME">PLOGGER</td><td headers="COLUMN_NAME">ELEMENT</td><td headers="COMMENTS">Element of target which originated the event. For error and xhr it will be null.</td></tr>
<tr><td headers="TABLE_NAME">PLOGGER</td><td headers="COLUMN_NAME">CURRENT_VALUE</td><td headers="COMMENTS">Current Value of target which originated the event. For error and xhr it will be null.</td></tr>
<tr><td headers="TABLE_NAME">PLOGGER</td><td headers="COLUMN_NAME">XHR_DATA</td><td headers="COMMENTS">xhr payload sent to server</td></tr>
<tr><td headers="TABLE_NAME">PLOGGER</td><td headers="COLUMN_NAME">XHR_URL</td><td headers="COMMENTS">xhr url, used to send the xhr request</td></tr>
<tr><td headers="TABLE_NAME">PLOGGER</td><td headers="COLUMN_NAME">XHR_READY_STATE</td><td headers="COMMENTS">xhr ready states</td></tr>
<tr><td headers="TABLE_NAME">PLOGGER</td><td headers="COLUMN_NAME">XHR_STATUS</td><td headers="COMMENTS">xhr status</td></tr>
<tr><td headers="TABLE_NAME">PLOGGER</td><td headers="COLUMN_NAME">XHR_RESPONSE_TEXT</td><td headers="COMMENTS">xhr response text</td></tr>
<tr><td headers="TABLE_NAME">PLOGGER</td><td headers="COLUMN_NAME">ERROR_MESSAGE</td><td headers="COMMENTS">Error message thrown by browser</td></tr>
<tr><td headers="TABLE_NAME">PLOGGER</td><td headers="COLUMN_NAME">ERROR_URL</td><td headers="COMMENTS">Error URL</td></tr>
<tr><td headers="TABLE_NAME">PLOGGER</td><td headers="COLUMN_NAME">ERROR_STACK</td><td headers="COMMENTS">Error Stack</td></tr>
<tr><td headers="TABLE_NAME">PLOGGER</td><td headers="COLUMN_NAME">CREATED_DATE</td><td headers="COMMENTS">Date when log was created. The table is interval day partitioned using created_date column as partition key</td></tr>
</tbody></table>

# How does plugin capture events, errors and xhr
<p> In page main thread, events, errors and xhr are intercepted by overriding respective interfaces to persist in indexeddb. The interception overhead is minimal as indexeddb persistence is asynchronous and fast.  </p>
<p> Main thread captures and persists events, errors and xhr, using the configuration parameters, on every page load. This enables on demand capturing and logging </p>
<p>Main thread, spawns worker thread to offload data redaction, log formatting and syncing to plogger table, 


# Known Issues
<p>Events which causes page navigation for e.g may not be captured if page gets refreshed before logs are persisted in indexeddb. </p>
<p> When sync interval is set to value other than zero ( not realtime logging), logs may not get inserted into plogger table , when user closes the browser before logs are synced </p>

