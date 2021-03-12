const customersCommands = {
  customers: function (title,product) 
   {
      return this.fillCustomers(title,product);
  },
  fillCustomers: function (title,product)
  {
         return this
            .waitForElementVisible('body')
            .assert.titleContains(title)
            .click('@productClick')
            .pause(100)
            .click('option[value='+'"'+product+'"]')
            .pause(2000)
            .click('@referenceTypeClick')
            .pause(2000)
            .click('@displayTypeClick')
            .pause(3000)
            .click('@customerClick')
            .pause(2000)
            .click('@editCustomerClick')
            .pause(3000)
            .click('@customerProfileClick')
            .pause(2000)
            .setValue('@customerProfileClick','hello')
            .pause(5000)
            .click('@customerApplyChangesClick')
            .pause(2000)
            .click('@customersMenuClick')
            .pause(2000)

            
    }
    
}

module.exports = {
  url: 'https://gopalmallya.com/ords/r/gopalmallya/107/customers?clear=RP,RIR,CIR',
  commands: [customersCommands],
  elements: {
    title:"Customers",  
    productClick: '#P59_PRODUCT',
    referenceTypeClick: 'label[For="P59_REFERENCE_TYPES_2"]',
    displayTypeClick: 'label[For="P59_DISPLAY_AS_1"]',
    addCustomerClick: 'button[id=B15813901299111641782]',
    customerClick: 'span[title="Logistics 36"]',
    editCustomerClick: 'button[id=B16464578105056851579]',
    customerProfileClick: '#P2_CUSTOMER_PROFILE',
    customerApplyChangesClick: 'button[id=B17842222884567251647]',
    customersMenuClick:'#t_MenuNav_0i'
  }
}