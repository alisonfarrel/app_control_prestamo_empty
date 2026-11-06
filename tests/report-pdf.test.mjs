import test from 'node:test';
import assert from 'node:assert/strict';
import {makeLoanReportPdf} from '../report-pdf.mjs';
const pdfText=l=>new TextDecoder('latin1').decode(makeLoanReportPdf(l,{date:'2026-11-06'}));
test('loan report respects full and partial participation',()=>{
 const family={name:'Préstamo familiar',initial:10000,sharePercent:100,monthlyPaymentTotal:200,payments:[{date:'2026-01-01',kind:'regular',total:200,interest:20,amount:180}]};
 const s=pdfText(family);
 assert.match(s,/\%PDF-1\.4/);assert.match(s,/\/Count [1-9][0-9]*/);
 assert.match(s,/<5455205041525449434950414349D34E3A203130302025>/); // 'TU PARTICIPACIÓN: 100 %' in WinAnsi hex
 const shared={...family,name:'Préstamo compartido',sharePercent:50};assert.notEqual(s,pdfText(shared));
});
test('PDF is generated with zero payments',()=>{assert.match(pdfText({name:'Familiar',initial:100,sharePercent:100,payments:[]}),/xref/)});
