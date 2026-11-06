// Self-contained offline loan status report. PDF 1.4, WinAnsi encoding.
import {pending,shareFactor,round,sum,num,nextInstalment} from './finance.mjs';
const PAGE_W=595.28,PAGE_H=841.89,LEFT=45,RIGHT=550;
const euro=n=>new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)||0)+' €';
const date=d=>{if(!d)return 'No indicada';const x=String(d).split('-');return x.length===3?`${x[2]}/${x[1]}/${x[0]}`:String(d)};
const encode=s=>{const specials={'€':128,'‚':130,'ƒ':131,'„':132,'…':133,'†':134,'‡':135,'ˆ':136,'‰':137,'Š':138,'‹':139,'Œ':140,'Ž':142,'‘':145,'’':146,'“':147,'”':148,'•':149,'–':150,'—':151,'˜':152,'™':153,'š':154,'›':155,'œ':156,'ž':158,'Ÿ':159};const out=[];for(const ch of String(s)){const cp=ch.codePointAt(0);out.push(cp<=255?cp:(specials[ch]??63))}return Uint8Array.from(out)};
const hex=s=>Array.from(encode(s),n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();
const ascii=s=>new TextEncoder().encode(s);
const C={navy:[.09,.15,.27],pink:[.87,.24,.52],purple:[.42,.32,.82],muted:[.38,.43,.53],light:[.96,.955,.99],line:[.88,.89,.93],white:[1,1,1],green:[.09,.55,.39]};
function summary(loan,asOf){const rows=[...(loan.payments||[])].filter(p=>String(p.date||'')<=asOf).sort((a,b)=>String(a.date).localeCompare(String(b.date)));const regular=rows.filter(p=>p.kind==='regular'),extra=rows.filter(p=>p.kind!=='regular');const paidCapital=sum(rows.map(p=>num(p.amount)));const balance=Math.max(0,round(num(loan.initial)-paidCapital));const share=shareFactor(loan);return {rows,regular,extra,paidCapital,balance,share,ownBalance:round(balance*share),regularInterest:sum(regular.map(p=>num(p.interest))),regularTotal:sum(regular.map(p=>num(p.total))),extraTotal:sum(extra.map(p=>num(p.amount)))}};
export function makeLoanReportPdf(loan,opts={}){
 if(!loan||!Number.isFinite(num(loan.initial))||num(loan.initial)<=0||!Array.isArray(loan.payments))throw Error('Préstamo no válido');
 const asOf=opts.date||new Date().toISOString().slice(0,10), d=summary(loan,asOf);
 const pages=[];let commands=[],y=0;
 const cmd=s=>commands.push(s);
 const rgb=c=>c.map(x=>x.toFixed(3)).join(' ');
 const rect=(x,top,w,h,color)=>cmd(`${rgb(color)} rg ${x.toFixed(2)} ${(PAGE_H-top-h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
 const line=(x1,top1,x2,top2,color=C.line)=>cmd(`${rgb(color)} RG 0.6 w ${x1.toFixed(2)} ${(PAGE_H-top1).toFixed(2)} m ${x2.toFixed(2)} ${(PAGE_H-top2).toFixed(2)} l S`);
 const text=(x,top,str,size=10,bold=false,color=C.navy)=>cmd(`BT /${bold?'F2':'F1'} ${size} Tf ${rgb(color)} rg 1 0 0 1 ${x.toFixed(2)} ${(PAGE_H-top-size).toFixed(2)} Tm <${hex(str)}> Tj ET`);
 const textRight=(right,top,str,size=10,bold=false,color=C.navy)=>{const approx=Array.from(str).reduce((acc,ch)=>acc+(ch===' '?0.27:ch==='1'?0.42:/[.,:]/.test(ch)?0.26:/[MW]/.test(ch)?0.88:0.53),0)*size;text(right-approx,top,str,size,bold,color)};
 const page=()=>{if(commands.length)pages.push(commands.join('\n'));commands=[];y=48;rect(0,0,PAGE_W,10,C.purple);text(LEFT,24,'MI CAPITAL',11,true,C.purple);textRight(RIGHT,26,'INFORME PRIVADO · PRÉSTAMO',8,true,C.muted);line(LEFT,43,RIGHT,43);};
 const footer=()=>{const pageNo=pages.length+1;line(LEFT,790,RIGHT,790);text(LEFT,799,'Generado localmente · Datos introducidos y confirmados por el usuario.',8,false,C.muted);textRight(RIGHT,799,`Página ${pageNo}`,8,false,C.muted);};
 const ensure=h=>{if(y+h>770){footer();page();}};
 const section=t=>{ensure(44);y+=12;text(LEFT,y,t,12,true,C.purple);y+=27;};
 const row=(label,value)=>{ensure(29);text(LEFT+12,y,label,10,false,C.muted);textRight(RIGHT-12,y,value,11,true,C.navy);line(LEFT+12,y+23,RIGHT-12,y+23);y+=31;};
 page();text(LEFT,61,'Resumen de situación del préstamo',20,true,C.navy);text(LEFT,92,String(loan.name||'Préstamo'),14,true,C.pink);text(LEFT,119,`Fecha de corte: ${date(asOf)}`,9,false,C.muted);y=151;
 rect(LEFT,y,RIGHT-LEFT,82,C.light);text(LEFT+14,y+12,'CAPITAL PENDIENTE TOTAL',9,true,C.muted);text(LEFT+14,y+32,euro(d.balance),23,true,C.navy);text(RIGHT-195,y+12,`TU PARTICIPACIÓN: ${(d.share*100).toLocaleString('es-ES')} %`,9,true,C.purple);text(RIGHT-195,y+35,`Tu parte: ${euro(d.ownBalance)}`,11,true,C.navy);y+=102;
 section('Situación del préstamo');row('Capital inicial total',euro(loan.initial));row('Capital amortizado confirmado',euro(d.paidCapital));row('Saldo pendiente total',euro(d.balance));row('Tu parte del saldo pendiente',euro(d.ownBalance));row('Cuota mensual total configurada',euro(loan.monthlyPaymentTotal||0));row('Tu parte de la cuota',euro((loan.monthlyPaymentTotal||0)*d.share));
 section('Pagos registrados hasta la fecha');row('Cuotas ordinarias confirmadas',String(d.regular.length));row('Total de cuotas ordinarias pagadas',euro(d.regularTotal));row('Intereses incluidos en esas cuotas',euro(d.regularInterest));row('Capital amortizado mediante cuotas',euro(sum(d.regular.map(p=>num(p.amount)))));row('Amortizaciones extraordinarias',`${d.extra.length} · ${euro(d.extraTotal)}`);
 if(d.rows.length){if(y+45+Math.min(d.rows.length,3)*27+100>770){footer();page();}section('Historial de movimientos');const header=()=>{ensure(25);rect(LEFT,y,RIGHT-LEFT,24,C.purple);text(LEFT+9,y+5,'FECHA',9,true,C.white);text(LEFT+100,y+5,'TIPO',9,true,C.white);textRight(RIGHT-140,y+5,'CAPITAL',9,true,C.white);textRight(RIGHT-9,y+5,'INTERESES',9,true,C.white);y+=27;};header();for(const p of d.rows){ensure(30);if(y===48)header();text(LEFT+9,y+3,date(p.date),9);text(LEFT+100,y+3,p.kind==='regular'?'Cuota ordinaria':'Amort. extra',9);textRight(RIGHT-140,y+3,euro(p.amount),9);textRight(RIGHT-9,y+3,p.kind==='regular'?euro(p.interest):'-',9);line(LEFT+8,y+23,RIGHT-8,y+23);y+=27;}}
 ensure(95);y+=8;text(LEFT,y,'Notas del informe',10,true,C.purple);y+=20;
 const notes=[`Porcentaje registrado: ${(d.share*100).toLocaleString('es-ES')} %. Se aplica al capital y a las cuotas.`, 'Solo incluye pagos guardados y fechados hasta la fecha de corte.', 'Las cuotas futuras no se consideran abonadas. No es un certificado bancario.', 'La deuda reflejada es contable según registros manuales; contrasta con el banco.'];
 for(const n of notes){ensure(19);text(LEFT,y,n,8,false,C.muted);y+=17;}
 footer();pages.push(commands.join('\n'));
 // PDF objects; explicit byte offsets for WinAnsi strings (euro, accents) encoded through hex.
 const objects=[];const add=o=>(objects.push(o),objects.length);
 const catalog=add(''),pagesId=add('');const font1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),font2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
 const refs=[];for(const contents of pages){const bytes=ascii(contents);const contentId=add(`<< /Length ${bytes.length} >>\nstream\n${contents}\nendstream`);const pid=add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >> >> /Contents ${contentId} 0 R >>`);refs.push(pid);}
 objects[catalog-1]=`<< /Type /Catalog /Pages ${pagesId} 0 R >>`;objects[pagesId-1]=`<< /Type /Pages /Kids [${refs.map(p=>p+' 0 R').join(' ')}] /Count ${refs.length} >>`;
 const pieces=[ascii('%PDF-1.4\n')],offsets=[0];let size=pieces[0].length;for(let i=0;i<objects.length;i++){offsets.push(size);const x=ascii(`${i+1} 0 obj\n${objects[i]}\nendobj\n`);pieces.push(x);size+=x.length;}
 const pos=size;let xref=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;for(let i=1;i<offsets.length;i++)xref+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;pieces.push(ascii(xref+`trailer\n<< /Root ${catalog} 0 R /Size ${objects.length+1} >>\nstartxref\n${pos}\n%%EOF\n`));const output=new Uint8Array(pieces.reduce((n,p)=>n+p.length,0));let cursor=0;for(const chunk of pieces){output.set(chunk,cursor);cursor+=chunk.length;}return output;
}
