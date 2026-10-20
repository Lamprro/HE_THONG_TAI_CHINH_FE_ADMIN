import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=resolve('dist');
const server=createServer(async(req,res)=>{const file=resolve(root,`.${req.url==='/'?'/index.html':req.url.split('?')[0]}`);if(!file.startsWith(root+'/')&&!file.startsWith(root+'\\'))return res.writeHead(403).end();try{res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'});const page=await browser.newPage({viewport:{width:1440,height:1000}});
const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const source={id:1,code:'VN',name:'Fixture source',provider:'vndirect',active:true,sourceType:'API'};
const job={id:id(1),code:'MARKET_PRICE_BUILD',name:'Fixture price builder',dataSourceId:1,dataSourceCode:'VN',active:true,cronExpression:'0 0 0 * * *',datasetType:'MARKET_PRICE',parameters:{},maxRetries:10,timeoutSeconds:120,createdAt:'2026-10-20T00:00:00Z'};
const queue={id:id(2),action:'RUN_JOB',status:'QUEUED',reason:'Queued fixture',request_json:{jobId:job.id}};
const commands=new Map([[queue.id,queue]]);const writes=[],errors=[];let count=20,promoted=false,newPrompt=null;const notes=[];
const original={id:id(3),task_code:'NEWS_SUMMARY',version:'v1',enabled:true,system_prompt:'Real-shaped fixture instructions',request_schema:{type:'object'},response_schema:{required:['evidence']}};
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/api/**',async route=>{const request=route.request(),url=new URL(request.url()),path=url.pathname,method=request.method();const reply=(body,status=200)=>route.fulfill({status,json:body,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,PUT,PATCH,OPTIONS'}});
  if(method==='OPTIONS')return reply({});
  if(method!=='GET'){
    const body=request.postDataJSON();writes.push({path,method,body});
    if(path==='/api/admin/console/commands') {const command={id:id(count++),...body,status:'SUCCEEDED',result_json:body.action==='FORECAST_PREVIEW'?{eligible:false,issues:['No verified publication history']}:{status:body.action==='RECOVERY_APPROVE'?'APPROVED':'ACTIVATED'},progress_json:body.action==='INGEST_VALIDATE_BUILD'?{stage:'COMPLETE',sourceRunId:id(10)}:null};commands.set(command.id,command);return reply({...command,status:'QUEUED'},202);}
    if(path.endsWith('/cancel')){queue.status='CANCELLED';return reply(queue);}
    if(path.endsWith('/retry')){const child={id:id(count++),status:'FAILED',action:'RUN_JOB',parent_command_id:queue.id,reason:body.reason,error_message:'Source quota 429',result_json:{category:'RATE_LIMIT'}};commands.set(child.id,child);return reply(child,202);}
    if(path.endsWith('/reviews')){notes.push({id:id(40),reason:body.reason,event_type:'ISSUE_REVIEWED'});return reply({validationStatusChanged:false});}
    if(path==='/api/admin/prompts'){newPrompt={...original,id:id(4),version:body.version,system_prompt:body.prompt,enabled:false};return reply(newPrompt);}
    if(path.endsWith('/enabled')){promoted=body.enabled;newPrompt.enabled=promoted;return reply({id:newPrompt.id,enabled:promoted});}
    if(path==='/api/admin/console/schedule')return reply({enabled:body.enabled,job_codes:body.jobCodes,version:1});
    return reply({message:'Unexpected fixture mutation'},400);
  }
  if(path==='/api/admin/console/session')return reply({authenticated:true});if(path==='/api/health')return reply({status:'UP'});
  if(path==='/api/ingestion-jobs')return reply([job]);if(path==='/api/data-sources')return reply([source]);if(path==='/api/securities')return reply([{id:id(5),symbol:'FPT',exchange:'HOSE',active:true}]);
  if(path==='/api/admin/console/summary')return reply({jobs:[{is_active:true,count:1}],commands:[],runs:[],versions:[],validation:[]});
  if(path.startsWith('/api/admin/console/commands/'))return reply(commands.get(path.split('/').at(-1))||{});
  if(path.endsWith('/data/admin_commands'))return reply({rows:[queue],total:1});
  if(path.endsWith('/data/validation_results'))return reply({rows:[{id:id(6),rule_code:'REQUIRED_FIELD',result_status:'FAIL',message:'Missing source field',ingestion_run_id:id(10)}],total:1});
  if(path.includes('/issues/')&&path.endsWith('/reviews'))return reply(notes);
  if(path.endsWith('/configuration'))return reply({configured:false,llmConfigured:false,adminReviewRequired:true});
  if(path==='/api/admin/news-recovery/pending')return reply([{runId:id(7),articleId:id(8),status:'SUCCESS',proposal:{content:'Fixture proposal requiring review'}}]);
  if(path.endsWith('/candidates')||path==='/api/admin/console/news-candidates')return reply([{articleId:id(8),title:'Fixture financial article'}]);
  if(path.endsWith('/results'))return reply([]);
  if(path==='/api/admin/prompts')return reply(newPrompt?[original,newPrompt]:[original]);
  if(path.startsWith('/api/admin/prompts/'))return reply(path.endsWith(id(4))?newPrompt:original);
  if(path==='/api/admin/console/schedule')return reply({enabled:false,job_codes:[],version:0,heartbeat_at:'2026-10-20T00:00:00Z',legacySchedulerEnabled:false});
  if(path.includes('/data/'))return reply({rows:[],total:0});return reply([]);
});
const button=name=>page.getByRole('button',{name,exact:true});
try{
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.getByLabel('Token admin',{exact:true}).fill('isolated-flow-browser-admin-token-at-least-32');await button('Kết nối').click();
  await button('Luồng dữ liệu').click();await page.getByLabel('Nguồn dữ liệu',{exact:true}).selectOption('VN');await page.getByLabel('Mã chứng khoán/chỉ số',{exact:true}).fill('FPT');await page.getByLabel('Từ ngày',{exact:true}).fill('2026-10-01');await page.getByLabel('Đến ngày',{exact:true}).fill('2026-10-16');await page.getByLabel('Lý do xử lý',{exact:true}).fill('Reviewed source range');await button('Kiểm tra phạm vi').click();await button('Xác nhận chạy luồng').click();await page.getByText('Kết quả nghiệp vụ: ACTIVATED',{exact:true}).waitFor();assert.equal(writes[0].body.action,'INGEST_VALIDATE_BUILD');assert.equal(writes[0].body.input.symbol,'FPT');
  await button('Điều tra & xử lý').click();await button('Theo dõi / xử lý').click();await button('Hủy tác vụ đang chờ').click();await page.getByLabel('Lý do xác nhận',{exact:true}).fill('Cancel queued fixture');await button('Xác nhận xử lý tác vụ').click();await button('Kiểm tra và gửi lại').waitFor();await button('Kiểm tra và gửi lại').click();await page.getByLabel('Lý do xác nhận',{exact:true}).fill('Reviewed original result, retry');await button('Xác nhận xử lý tác vụ').click();await page.getByText('Source quota 429',{exact:true}).waitFor();assert.equal(writes.find(w=>w.path.endsWith('/retry')).body.reviewed,true);
  await button('Validation & version').click();await button('Ghi nhận xử lý lỗi').click();await page.getByLabel('Ghi chú xử lý',{exact:true}).fill('Investigating source mapping; FAIL retained');await button('Lưu ghi chú audit').click();await page.getByText('Investigating source mapping; FAIL retained',{exact:true}).waitFor();await button('Close').click();
  await button('Vận hành AI').click();assert.equal(await button('Chuẩn bị chạy dự báo').isDisabled(),true);await page.getByLabel('Chứng khoán dự báo',{exact:true}).selectOption(id(5));await page.getByLabel('Ngày chốt dữ liệu dự báo',{exact:true}).fill('2026-10-16');await page.getByLabel('Lý do thao tác AI',{exact:true}).fill('Preview without model calls');await button('Kiểm tra dữ liệu đầu vào').click();await button('Xác nhận thao tác AI').click();await page.getByText('Kết quả nghiệp vụ: INPUT_NOT_ELIGIBLE',{exact:true}).waitFor();assert.equal(await button('Chuẩn bị chạy dự báo').isDisabled(),true);
  await button('Khôi phục & duyệt').click();await button('Chọn để đọc và duyệt').click();await page.getByLabel('Người duyệt',{exact:true}).fill('Admin fixture');await page.getByLabel('Lý do thao tác AI',{exact:true}).fill('Reviewed recovery proposal');await button('Chuẩn bị duyệt đề xuất').click();await button('Xác nhận thao tác AI').click();await page.getByText('Kết quả nghiệp vụ: APPROVED',{exact:true}).waitFor();assert.equal(writes.some(w=>w.body?.action==='RECOVERY_ANALYZE'),false);
  await button('Prompt & cấu hình').click();await button('Chọn template').click();await button('Lấy nội dung bản gốc để sửa').click();await page.getByLabel('Version prompt mới',{exact:true}).fill('v2');await page.getByLabel('Lý do thay đổi prompt',{exact:true}).fill('Reviewed immutable version');await button('Xem lại version mới').click();await button('Xác nhận thay đổi prompt').click();await button('Chuẩn bị bật version').waitFor();assert.equal(newPrompt.enabled,false);await button('Chuẩn bị bật version').click();await button('Xác nhận thay đổi prompt').click();await button('Chuẩn bị tắt version').waitFor();assert.equal(promoted,true);
  await button('Hệ thống & độ phủ').click();await button('Chỉnh phạm vi lịch').click();await page.getByLabel('Lý do thay đổi lịch',{exact:true}).fill('Keep live scheduler disabled');await button('Xem lại thay đổi lịch').click();await button('Xác nhận cập nhật lịch').click();assert.equal(writes.find(w=>w.path==='/api/admin/console/schedule').body.enabled,false);
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
  console.log('FULL FLOWS UI PASS: typed canonical pipeline, queued cancellation, reviewed retry, immutable issue audit, forecast eligibility gate, recovery approval separated from analysis, immutable prompt version/promotion, disabled scheduler update, mobile and no credential persistence. All APIs intercepted; no real provider, AI or business DB writes.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
