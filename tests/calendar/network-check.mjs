import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const {selectNetwork}=await import(`data:text/javascript;base64,${Buffer.from(readFileSync(new URL('../../public/opportunities/data.js',import.meta.url),'utf8')).toString('base64')}`);
const fixture={firms:[{id:'vc',name:'Example Ventures'}],startups:[{id:'a',name:'Café AI',sector:'AI',location:'Boston'},{id:'b',name:'Orbit',sector:'Space',location:'Austin'}],connections:[{firm_id:'vc',startup_id:'a'},{firm_id:'vc',startup_id:'b'}]};
test('network search matches company and investor names, normalized accents, and combined filters',()=>{
 assert.equal(selectNetwork(fixture,{query:'cafe'}).length,1);
 assert.equal(selectNetwork(fixture,{query:'Example Ventures'}).length,2);
 assert.equal(selectNetwork(fixture,{kind:'firms',query:'Orbit'}).length,1);
 assert.equal(selectNetwork(fixture,{sector:'AI',location:'Austin'}).length,0);
 assert.equal(selectNetwork(fixture,{sector:'AI',location:'Boston'}).length,1);
 assert.equal(selectNetwork(fixture,{query:'no match'}).length,0);
});
test('Apps Script network requires an enabled member and publishes only safe rows',()=>{
 const c={console,Date,PropertiesService:{getScriptProperties:()=>({getProperty:key=>key==='SPREADSHEET_ID'?'sheet':'test-secret-with-at-least-32-characters'})},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({text,setMimeType(){return this;}})}};
 vm.createContext(c);vm.runInContext(readFileSync(new URL('../../docs/calendar/Code.gs',import.meta.url),'utf8'),c);
 const tables=vm.runInContext('NETWORK_TABLES',c);
 c.SpreadsheetApp={openById:()=>({getSheetByName:name=>({getDataRange:()=>({getValues:()=>name==='Access'?[['email','enabled'],['member@yale.edu',true]]:[tables[name],...['Published','Draft','Archived'].map(status=>tables[name].map(key=>({id:status,name:'A company',status,notes:'PRIVATE'}[key]||'')))]})})})};
 const call=(email,secret='test-secret-with-at-least-32-characters')=>JSON.parse(c.doPost({postData:{contents:JSON.stringify({secret,action:'network',email})}}).text);
 assert.equal(call('member@yale.edu','wrong').error,'unauthorized');
 assert.equal(call('guest@gmail.com').error,'access_required');
 const result=call('member@yale.edu');assert.equal(result.firms.length,1);assert.equal(result.startups.length,1);assert.equal(result.connections.length,1);assert.ok(!JSON.stringify(result).includes('PRIVATE'));
});
