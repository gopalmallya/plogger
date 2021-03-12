module.exports = {
  'Demo test plogger' : function(browser) {
    let customersPage = browser.page.customers();
//**********************************************Stream Yes********************************* */
    // local, chunksize 1kb < filesize 10kb, threads 1, skip 0, stream yes, pause 1000, insertType apex_data_parser
    customersPage
    .navigate()  
    .customers("Customers","7")
  }
};

