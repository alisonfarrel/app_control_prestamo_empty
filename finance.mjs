export const EUR = n => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(Number(n)||0);
export const PCT = n => new Intl.NumberFormat('es-ES',{style:'percent',maximumFractionDigits:2}).format(n||0);
export const num = x => { const n=Number(String(x??'').replace(',','.')); return Number.isFinite(n)?n:0; };
export const round = n => Math.round((n+Number.EPSILON)*100)/100;
export const sum = xs => xs.reduce((a,b)=>a+b,0);
export function pending(loan){return Math.max(0,round(num(loan.initial)-sum((loan.payments||[]).map(p=>num(p.amount)))));}
export function validateTiers(tiers){let prev=0;for(const t of tiers){if(t.to!==null && (!Number.isFinite(t.to)||t.to<=prev))return false;if(!Number.isFinite(t.rate)||t.rate<0)return false;if(t.to===null && t!==tiers[tiers.length-1])return false;prev=t.to??prev;}return !!tiers.length && tiers[tiers.length-1].to===null;}
export function optimize(capital,banks){const total=Math.max(0,num(capital));const chunks=[];for(const b of banks){if(!validateTiers(b.tiers))continue;let low=0;const cap=b.maxBalance==null?Infinity:Math.max(0,num(b.maxBalance));for(const t of b.tiers){const high=Math.min(t.to==null?Infinity:t.to,cap);if(high>low)chunks.push({bankId:b.id,rate:num(t.rate),capacity:high-low,from:low});low=high;if(low>=cap)break;}}
// Each bank has sequential marginal tiers. For non-increasing tiers (the conventional structure),
// sorting marginal segments globally yields an optimal allocation.
const nonIncreasing=banks.every(b=>(b.tiers||[]).every((t,i,a)=>i===0||t.rate<=a[i-1].rate));
if(!nonIncreasing){return {error:'Los tramos crecientes requieren un optimizador con restricciones. Configura tramos no crecientes.',allocation:[],total:0};}
chunks.sort((a,b)=>b.rate-a.rate||a.from-b.from);let left=total;const allocated=new Map();for(const c of chunks){if(left<=1e-9)break;const take=Math.min(left,c.capacity);allocated.set(c.bankId,(allocated.get(c.bankId)||0)+take);left-=take;}
const allocation=banks.map(b=>{const amount=allocated.get(b.id)||0;return {bankId:b.id,name:b.name,amount,annual:grossInterest(amount,b.tiers)};});return {allocation,total:sum(allocation.map(a=>a.annual)),unallocated:Math.max(0,left),error:null};}
export function grossInterest(amount,tiers){let prev=0, gross=0;for(const t of tiers){const high=t.to??Infinity;const chunk=Math.max(0,Math.min(amount,high)-prev);gross+=chunk*num(t.rate)/100;prev=high;if(amount<=high)break;}return gross;}
// Approximate Spanish resident savings tax on an isolated amount of savings income.
// Not a definitive personal tax assessment; excludes other savings, exemptions and withholding.
export function savingsTax(gross){let remaining=Math.max(0,gross),tax=0;for(const [width,rate] of [[6000,.19],[44000,.21],[150000,.23],[100000,.27],[Infinity,.30]]){const part=Math.min(width,remaining);tax+=part*rate;remaining-=part;if(remaining<=0)break;}return tax;}
export function amortization(principal,annualRate,months,extra=0,mode='term'){
 principal=Math.max(0,num(principal));annualRate=Math.max(0,num(annualRate))/100;months=Math.max(1,Math.floor(num(months)));extra=Math.max(0,Math.min(principal,num(extra)));
 const r=annualRate/12,monthly=r===0?principal/months:principal*r/(1-Math.pow(1+r,-months));
 let balance=principal-extra,interestTotal=0,interest12=0,paid12=0;const payment=mode==='payment'?(r===0?balance/months:balance*r/(1-Math.pow(1+r,-months))):monthly;
 let monthsUsed=0;
 while(balance>0.000001&&monthsUsed<months+2){const interest=balance*r;const pay=Math.min(balance+interest,payment);if(pay<=interest && balance>0)break;balance=Math.max(0,balance+interest-pay);interestTotal+=interest;if(monthsUsed<12){interest12+=interest;paid12+=pay;}monthsUsed++;}
 return {interestTotal,interest12,paid12,monthsUsed,monthlyPayment:payment,extra,finalBalance:balance};
}
export function loanComparison(loan,extra,mode='term'){
 const principal=pending(loan),rate=num(loan.apr),months=remainingMonths(loan);
 if(!principal||months<=0)return null;
 const base=amortization(principal,rate,months,0,mode),early=amortization(principal,rate,months,extra,mode);
 return {base,early,saved12:base.interest12-early.interest12,savedTotal:base.interestTotal-early.interestTotal,extra:early.extra};
}

// A missing sharePercent in v1 backups means the full loan was owned by the user.
export function shareFactor(loan){const p=loan?.sharePercent==null?100:num(loan.sharePercent);return Math.min(1,Math.max(0,p/100));}
export function ownAmount(total,loan){return round(num(total)*shareFactor(loan));}

// A confirmed ordinary instalment is recorded only on user action; regular principal is
// stored in payments and therefore affects pending() without double counting.
export function remainingMonths(loan){return Math.max(0,Math.floor(num(loan.monthsRemaining))- (loan.payments||[]).filter(p=>p.kind==='regular').length);}
export function nextInstalment(loan){
 const principal=pending(loan), rate=Math.max(0,num(loan.apr))/1200;
 const months=remainingMonths(loan);
 if(loan.rateReviewDate&&loan.firstDue){const count=(loan.payments||[]).filter(p=>p.kind==='regular').length;const [y,m,d]=loan.firstDue.split('-').map(Number);const ix=y*12+m-1+count;const yy=Math.floor(ix/12),mm=ix%12+1;const last=new Date(Date.UTC(yy,mm,0)).getUTCDate();const due=`${yy}-${String(mm).padStart(2,'0')}-${String(loan.dueEndOfMonth?last:Math.min(d,last)).padStart(2,'0')}`;if(due>=loan.rateReviewDate)return {error:'Se alcanzó la revisión del tipo: confirma con el banco el TIN y la cuota nuevos, actualiza el préstamo y elimina la fecha de revisión antes de registrar esta cuota.'};}

 if(principal<=0||months<=0)return null;
 const scheduled=round(num(loan.monthlyPaymentTotal));
 if(scheduled<=0)return null;
 const interest=round(principal*rate), total=round(Math.min(scheduled,principal+interest));
 const capital=round(Math.max(0,total-interest));
 if(capital<=0)return {error:'La cuota no cubre los intereses mensuales.'};
 return {total,interest,capital,remaining:round(principal-capital),personalTotal:ownAmount(total,loan),personalInterest:ownAmount(interest,loan),personalCapital:ownAmount(capital,loan)};
}

// An optional projection with a single explicitly assumed post-review nominal rate.
// This models the first change of promotional rate, not future semestral changes in discounts.
export function projectionWithReview(loan,extra=0,mode='term'){
 const principal=pending(loan),months=remainingMonths(loan),initialRate=Math.max(0,num(loan.apr))/1200;
 const used=(loan.payments||[]).filter(p=>p.kind==='regular').length;
 const afterRate=Math.max(0,num(loan.futureApr))/1200;
 const firstDue=loan.firstDue||loan.date;
 const getDue=(offset)=>{if(!firstDue)return '';const [y,m,d]=firstDue.split('-').map(Number);const ix=y*12+m-1+used+offset;const yy=Math.floor(ix/12),mm=ix%12+1;const last=new Date(Date.UTC(yy,mm,0)).getUTCDate();return `${yy}-${String(mm).padStart(2,'0')}-${String(loan.dueEndOfMonth?last:Math.min(d,last)).padStart(2,'0')}`;};
 const payment=(bal,r,n)=>bal<=0?0:r===0?bal/n:bal*r/(1-Math.pow(1+r,-n));
 function project(extraAmount){let bal=Math.max(0,principal-extraAmount),interestTotal=0,interest12=0,paid12=0,monthsUsed=0;
  const initialMonthly=loan.monthlyPaymentTotal>0?num(loan.monthlyPaymentTotal):payment(principal,initialRate,months);
  let scheduled=mode==='payment'&&extraAmount>0?payment(bal,initialRate,months):initialMonthly;
  let wasReviewed=false;
  for(let i=0;i<months+2&&bal>1e-7;i++){
   const reviewed=loan.rateReviewDate&&getDue(i)>=loan.rateReviewDate;
   const r=reviewed?afterRate:initialRate;
   if(reviewed&&!wasReviewed){scheduled=payment(bal,r,Math.max(1,months-i));wasReviewed=true;}
   const interest=bal*r;const pay=Math.min(bal+interest,scheduled);
   if(pay<=interest)break;
   bal=Math.max(0,bal+interest-pay);interestTotal+=interest;if(i<12){interest12+=interest;paid12+=pay;}monthsUsed++;
  }
  return {interestTotal,interest12,paid12,monthsUsed,monthlyPayment:scheduled,extra:extraAmount,finalBalance:bal};
 }
 const capped=Math.min(Math.max(0,num(extra)),principal),base=project(0),early=project(capped);
 return {base,early,saved12:base.interest12-early.interest12,savedTotal:base.interestTotal-early.interestTotal,extra:capped};
}
