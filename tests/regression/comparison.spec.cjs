const {test, expect} = require('@playwright/test');
const {initializeTestEnvironment} = require('@firebase/rules-unit-testing');
const {initializeApp, deleteApp} = require('firebase-admin/app');
const {getFirestore} = require('firebase-admin/firestore');
const {getAuth} = require('firebase-admin/auth');
const {DateTime} = require('luxon');
const PizZip = require('pizzip');
const fs = require('node:fs');
const manifest = require(process.env.COMPARISON_MANIFEST);
const paths = manifest.apps;
const variant = process.env.COMPARISON_VARIANT || 'pr', isPR = variant === 'pr';
const projectId = manifest.projects[variant];
const authHost = manifest.authHosts[variant];
const firestoreHost = manifest.firestoreHosts[variant];
const [firestoreHostname, firestorePort] = firestoreHost.split(':');
const out = `${manifest.output}/${variant}`;
const tutor = 'tutor@kings.edu.au', student = 'student@kings.edu.au', coach = 'coach@kings.edu.au';
const monday = DateTime.now().setZone('Australia/Sydney').startOf('week');
const future = monday.plus({weeks:1, hours:15});
let env, app, db;
const at = (hour, day=0) => monday.plus({days:day,hours:hour}).toJSDate();
const shift = (extra={}) => ({title:'Comparison Work', start:future.toJSDate(), end:future.plus({hours:3}).toJSDate(), staff:[{value:tutor,label:'Viraj Patel'}], students:[], staffEmails:[tutor], studentEmails:[], emailsList:[tutor], classes:[], subject:null, location:'Library', description:'Synthetic regression comparison', workType:'work', recurring:null, createdByStudent:false, approvalStatus:'approved', workStatus:'notCompleted', confirmationRequired:false, tutorResponses:[], studentResponses:[], minStudents:0, ...extra});
const request = (extra={}) => shift({title:'Comparison Request', students:[{value:student,label:'John Doe'}], studentEmails:[student], emailsList:[tutor,student], createdByStudent:true, isStudentRequest:true, approvalStatus:'pending', preference:'General', createdAt:new Date(), ...extra});
const log = (info, data) => fs.writeFileSync(`${out}/${info.title.replace(/[^\w-]+/g,'-')}.json`, JSON.stringify(data,null,2));
const signIn = async (page,label) => { const hydrated=page.waitForResponse(r=>r.url().endsWith('/api/auth/session')); await page.goto('/login'); await hydrated; await page.getByRole('button',{name:label,exact:true}).click(); await expect(page).toHaveURL(/dashboard/); await expect(page.getByRole('link',{name:'Calendar',exact:true})).toBeVisible({ timeout: 60000 }); await expect.poll(async()=> (await (await page.request.get('/api/auth/session')).json()).user?.firebaseToken?.length || 0).toBeGreaterThan(20); };
const calendar = async page => {await page.goto('/calendar', { waitUntil: 'domcontentloaded', timeout: 60000 }); await expect(page.locator('.rbc-events-container').first()).toBeVisible({ timeout: 60000 }); await page.getByRole('button',{name:'Next',exact:true}).click();};
const modalTimes = async (page,start=future,end=future.plus({hours:1})) => {await page.getByLabel('Event start time').click(); await page.getByLabel('Event start time').fill(start.toFormat("yyyy-MM-dd'T'HH:mm")); await page.getByLabel('Event end time').fill(end.toFormat("yyyy-MM-dd'T'HH:mm"));};
const dbState = async () => {const result={}; for(const name of ['shifts','studentEventRequests','tutorAvailabilities','bookingNotifications']) {const snap=await db.collection(name).get(); result[name]=snap.docs.map(d=>({id:d.id,...d.data()}));} return result;};
const template = async email => {
 const zip=new PizZip(); zip.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
 zip.folder('_rels').file('.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
 zip.folder('word').file('document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>MONDAY {mondayDate} {mondayCommenced} {mondayFinished} {mondayBreak} {mondayTotal} TUESDAY {tuesdayTotal} WEDNESDAY {wednesdayTotal} THURSDAY {thursdayTotal} FRIDAY {fridayTotal} SATURDAY {saturdayTotal} SUNDAY {sundayTotal} TOTAL {totalHours}</w:t></w:r></w:p><w:sectPr/></w:body></w:document>');
 await db.collection('timesheets').doc(email).set({fileData:`data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${zip.generate({type:'base64'})}`});
};
const exportWord = async (page,email,type='tutor',end=monday.plus({days:6}).endOf('day')) => {
 await template(email); const response=await page.request.post('/api/timesheet',{data:{tutorEmail:email,tutorName:email,startDateUTC:monday.toISO(),endDateUTC:end.toISO(),timesheetType:type}});
 const contentType=response.headers()['content-type']||''; if(!response.ok()) return {status:response.status(),error:await response.text()};
 const buffer=await response.body(); fs.writeFileSync(`${out}/${email}-${type}-${end.toISODate()}.${contentType.includes('zip')?'zip':'docx'}`,buffer);
 const archive=new PizZip(buffer), doc=archive.file('word/document.xml'); return {status:response.status(),contentType,documents:doc?[doc.asText().replace(/<[^>]+>/g,'')]:Object.keys(archive.files).filter(n=>n.endsWith('.docx')).map(n=>new PizZip(archive.file(n).asNodeBuffer()).file('word/document.xml').asText().replace(/<[^>]+>/g,''))};
};
test.beforeAll(async()=>{
 fs.mkdirSync(out,{recursive:true}); process.env.FIRESTORE_EMULATOR_HOST=firestoreHost; process.env.FIREBASE_AUTH_EMULATOR_HOST=authHost;
 if(!projectId.startsWith('demo-talloc-compare-')) throw new Error('Unsafe comparison project');
 env=await initializeTestEnvironment({projectId,firestore:{host:firestoreHostname,port:Number(firestorePort),rules:fs.readFileSync(`${paths[variant]}/firebase/firestore.rules`,'utf8')}});
 app=initializeApp({projectId},`comparison-${variant}`); db=getFirestore(app);
 for(const email of [tutor,student,coach,'teacher@kings.edu.au','computing@kings.edu.au','mienna@kings.edu.au','coachTutor@kings.edu.au','tutorAdmin@kings.edu.au']) await getAuth(app).getUser(email.toLowerCase()).catch(()=>getAuth(app).createUser({uid:email.toLowerCase(),email}));
 // Fail setup immediately if client sign-in is being routed to a different emulator project.
 const probe=await getAuth(app).createCustomToken(tutor);
 const authProbe=await fetch(`http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-comparison-key`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:probe,returnSecureToken:true})});
 const claims=JSON.parse(Buffer.from((await authProbe.json()).idToken.split('.')[1],'base64url').toString());
 expect({project:claims.aud,email:claims.email}).toEqual({project:projectId,email:tutor});
});
test.beforeEach(async({page})=>{
 page.setDefaultTimeout(20000);
 await env.clearFirestore();
 for(const [email,name,role,roles] of [[tutor,'Viraj Patel','tutor',[]],[coach,'Max Burykin','coach',[]],[student,'John Doe','student',[]],['teacher@kings.edu.au','Rocco Ianni','teacher',[]],['computing@kings.edu.au','Michael Ienna','teacher',['admin']],['mienna@kings.edu.au','Michael Ienna','teacher',['admin']],['coachTutor@kings.edu.au','Tom Hanley','coach',['tutor']],['tutorAdmin@kings.edu.au','Martin Madrid','tutor',['admin']]]) await db.collection('users').doc(email).set({email,name,defaultRole:role,userRoles:roles,hasSeenWelcome:true,hasSeenCalendarHelp:true,requestNotificationsEnabled:email==='mienna@kings.edu.au'});
 await db.collection('studentTutorEligibility').doc(student).set({eligibleTutorEmails:[tutor],eligibleTutors:[{email:tutor,subjectCodes:['MATH']}]});
 const errors={page:[],console:[],http:[]}; page.on('pageerror',e=>errors.page.push(e.message)); page.on('console',m=>{if(m.type()==='error') errors.console.push(m.text());}); page.on('response',r=>{if(r.status()>=400 && new URL(r.url()).host.startsWith('localhost:')) errors.http.push({url:new URL(r.url()).pathname,status:r.status()});}); page._comparisonErrors=errors;
});
test.afterEach(async({page},info)=>{fs.writeFileSync(`${out}/${info.title.replace(/[^\w-]+/g,'-')}-errors.json`,JSON.stringify(page._comparisonErrors,null,2)); await page.screenshot({timeout:10000,path:`${out}/${info.title.replace(/[^\w-]+/g,'-')}.png`,fullPage:true}).catch(()=>{});});
test.afterAll(async()=>{await env?.cleanup(); if(db)await db.terminate(); if(app)await deleteApp(app);});

for(const label of ['Student','Tutor','Coach','Teacher','Teacher + Admin','Michael (Notifications)','Coach + Tutor','Tutor + Admin']) test(`role-${label}`,async({page},info)=>{
 await db.collection('shifts').doc('work').set(shift()); await signIn(page,label); await expect(page.getByRole('heading',{name:/Dashboard/}).first()).toBeVisible();
 await expect(page.getByRole('heading',{name:'Upcoming Events',exact:true}).last()).toBeVisible(); if(['Tutor','Teacher','Teacher + Admin','Michael (Notifications)','Tutor + Admin'].includes(label)) await expect(page.getByText('Comparison Work',{exact:true}).first()).toBeVisible(); const links=await page.getByRole('link').allTextContents(); const cards=await page.locator('.card').allTextContents();
 await page.reload(); await expect(page.getByRole('link',{name:'Calendar',exact:true})).toBeVisible();
 log(info,{links:links.map(x=>x.trim()),cards:cards.map(x=>x.replace(/\s+/g,' ').trim()),welcomeModals:await page.getByRole('dialog').count(),sessionUser:((await (await page.request.get('/api/auth/session')).json()).user||{}).email});
});

test('hours-matrix-summary-csv-word-dashboard',async({page},info)=>{
 const cases={
 'single-3h':[[9,12]], 'single-3h15':[[9,12.25]], 'single-6h':[[9,15]], 'single-6h15':[[9,15.25]],
 'overlapping-work':[[13,15],[14,16]], 'adjacent-work':[[9,11],[11,13]], 'separate-work':[[8,12],[13,17]],
 'work-with-session':[[9,12],[10,11,'session']], 'adjacent-sessions':[[9,11,'session'],[11,13,'session']],
 'adjacent-work-session':[[9,11],[11,13,'session']], 'standalone-session':[[9,9.5,'session']], 'long-session':[[9,13,'session']],
 'completion-only':[[9,17,'incomplete'],[10,10.5,'session']], 'no-show':[[9,12,'absent']],
 'legacy-confirmation':[[9,12,'unconfirmed']], 'coaching':[[9,13,'coaching']], 'short-coaching':[[9,10.5,'coaching']],
 'work-coaching-separate':[[9,11],[11,13,'coaching']], 'separate-dates':[[9,11,null,0],[9,11,null,1]]
 };
 for(const [name,entries] of Object.entries(cases)) {
 const email=`case-${name}@kings.edu.au`; await db.collection('users').doc(email).set({email,name,defaultRole:'tutor',userRoles:[]});
 for(const [index,[start,end,kind,day=0]] of entries.entries()) await db.collection('shifts').doc(`${name}-${index}`).set(shift({title:name,start:at(start,day),end:at(end,day),staff:[{value:email,label:name}],staffEmails:[email],emailsList:kind==='session'?[email,student]:[email],students:kind==='session'?[{value:student}]:[],studentEmails:kind==='session'?[student]:[],createdByStudent:kind==='session',workType:kind==='coaching'?'coaching':'work',workStatus:kind==='incomplete'?'notCompleted':kind==='absent'?'notAttended':'completed',confirmationRequired:kind==='unconfirmed'}));
 }
 await signIn(page,'Teacher + Admin'); await expect(page.getByText('Completed Hours',{exact:true})).toBeVisible(); await expect(page.locator('.card').filter({has:page.getByText('Completed Hours',{exact:true})}).locator('h3')).not.toHaveText(isPR?'0h 0m':'0.0'); const dashboard=await page.locator('.card').allTextContents();
 await page.goto('/tutorHours', { waitUntil: 'domcontentloaded', timeout: 60000 }); await expect(page.getByRole('row').filter({hasText:'case-single-3h@'})).toBeVisible();
 const rows={}; for(const name of Object.keys(cases)) {const row=page.getByRole('row').filter({hasText:`case-${name}@`}); rows[name]=await row.count()?await row.getByRole('cell').allTextContents():[];}
 const download=page.waitForEvent('download'); await page.getByRole('link',{name:'Export as CSV',exact:true}).click(); const csv=fs.readFileSync(await (await download).path(),'utf8'); fs.writeFileSync(`${out}/hours-matrix.csv`,csv);
 const word={}; for(const name of Object.keys(cases)) word[name]=await exportWord(page,`case-${name}@kings.edu.au`,name.includes('coaching')?'coach':'tutor');
 log(info,{rows,csv,word,dashboard:dashboard.map(x=>x.replace(/\s+/g,' ').trim())});
 if(isPR) {
  const expected = {'single-3h':[3,0],'single-3h15':[2.75,0],'single-6h':[5.5,0],'single-6h15':[5.25,0],'overlapping-work':[3,0],'adjacent-work':[3.5,0],'separate-work':[7,0],'work-with-session':[3,0],'adjacent-sessions':[4,0],'adjacent-work-session':[3.5,0],'standalone-session':[0.5,0],'long-session':[3.5,0],'completion-only':[0.5,0],'no-show':[0,0],'legacy-confirmation':[3,0],'coaching':[0,3.5],'short-coaching':[0,1.5],'work-coaching-separate':[2,2],'separate-dates':[4,0]};
  const display = hours => `${Math.floor(hours)}h ${(hours % 1)*60}m`;
  for(const [name,[work,coaching]] of Object.entries(expected)) {
   const cells=rows[name];
   if(name==='no-show') expect(cells).toEqual([]);
   else {
    expect(cells.slice(2,5),name).toEqual([display(work),display(coaching),display(work+coaching)]);
    // CSV values stay in the first five quoted fields; trailing warnings may contain commas.
    const line=csv.split('\n').find(line=>line.includes(`case-${name}@`));
    const fields=[...line.matchAll(/"((?:[^"]|"")*)"/g)].map(match=>match[1].replace(/""/g,'"'));
    expect(fields.slice(2,5).map(Number),name).toEqual([work,coaching,work+coaching]);
   }
   expect(word[name].status,name).toBe(200);
   const total=Number(word[name].documents[0].match(/TOTAL ([0-9.]+)/)[1]);
   expect(total,name).toBe(name.includes('coaching')?coaching:work);
  }
  expect(dashboard.some(text=>text.includes('Completed Hours61h 0m'))).toBe(true);
 }
});

test('two-real-mondays-export',async({page},info)=>{
 for(const weeks of [0,1]) await db.collection('shifts').doc(`monday-${weeks}`).set(shift({start:monday.plus({weeks,hours:9}).toJSDate(),end:monday.plus({weeks,hours:12}).toJSDate(),workStatus:'completed'}));
 await signIn(page,'Teacher + Admin'); const word=await exportWord(page,tutor,'tutor',monday.plus({weeks:1,days:6}).endOf('day')); log(info,word); if(isPR) expect(word.documents).toHaveLength(2);
});

test('availability-create-edit-delete',async({page},info)=>{
 await signIn(page,'Tutor'); await calendar(page); await page.locator('.rbc-events-container').nth(2).click();
 const types=await page.getByLabel('Work type',{exact:true}).count(); await page.getByLabel('Availability start time').click(); await page.getByLabel('Availability start time').fill(future.toFormat("yyyy-MM-dd'T'HH:mm")); await page.getByLabel('Availability end time').fill(future.plus({hours:3}).toFormat("yyyy-MM-dd'T'HH:mm"));
 await page.locator('#locationType').click(); await page.getByRole('option',{name:'Remote',exact:true}).click(); await page.getByRole('button',{name:'Add Availability',exact:true}).click();
 await expect.poll(async()=> (await db.collection('tutorAvailabilities').get()).size).toBe(1);
 const saved=(await db.collection('tutorAvailabilities').get()).docs[0].data(); await page.locator('.rbc-event').filter({hasText:'Availability'}).first().click(); await page.getByLabel('Availability end time').fill(future.plus({hours:2}).toFormat("yyyy-MM-dd'T'HH:mm")); await page.getByRole('button',{name:'Save Changes',exact:true}).click();
 await expect.poll(async()=> (await db.collection('tutorAvailabilities').get()).docs[0].data().end.toMillis()).toBe(future.plus({hours:2}).toMillis());
 await page.locator('.rbc-event').filter({hasText:'Availability'}).first().click(); let confirmation=null; page.once('dialog',d=>{confirmation=d.message(); return d.accept();}); await page.getByRole('button',{name:'Delete',exact:true}).click(); await expect.poll(async()=> (await db.collection('tutorAvailabilities').get()).size).toBe(0);
 log(info,{typeSelector:types,saved,deleteConfirmation:confirmation});
});

for(const coverage of ['availability','work','work-plus-availability','approved-clash','coaching-clash']) test(`student-book-${coverage}`,async({page},info)=>{
 if(coverage!=='work') await db.collection('tutorAvailabilities').doc('availability').set({title:'Availability',tutor,start:future.toJSDate(),end:future.plus({hours:3}).toJSDate(),workType:['tutoring'],locationType:'onsite'});
 if(coverage==='work'||coverage==='work-plus-availability') await db.collection('shifts').doc('work').set(shift({end:future.plus({hours:coverage==='work'?3:1}).toJSDate()}));
 if(coverage==='work-plus-availability') await db.collection('tutorAvailabilities').doc('availability').update({start:future.plus({hours:1}).toJSDate()});
 if(coverage.includes('clash')) await db.collection('shifts').doc('busy').set(shift(coverage==='coaching-clash'?{workType:'coaching'}:{students:[{value:'other@kings.edu.au'}],studentEmails:['other@kings.edu.au'],emailsList:[tutor,'other@kings.edu.au'],createdByStudent:true}));
 await signIn(page,'Student'); await calendar(page); await page.locator('.rbc-events-container').nth(2).click(); await modalTimes(page,future.plus({minutes:30}),future.plus({minutes:90}));
 if(isPR) await expect(page.getByText('Refreshing availability…',{exact:false})).toHaveCount(0); await page.locator('#tutor').click(); await expect(page.locator('.select__menu')).toBeVisible(); if(!coverage.includes('clash') && coverage==='availability') await expect(page.getByRole('option',{name:/Viraj Patel/})).toBeVisible(); const options=await page.getByRole('option').allTextContents(); const available=options.some(x=>x.includes('Viraj Patel'));
 if(available) {await page.getByRole('option',{name:/Viraj Patel/}).click(); await page.getByText(isPR?'General help':'General',{exact:true}).click(); await page.getByRole('button',{name:'Add Event',exact:true}).click(); await expect.poll(async()=> (await db.collection('studentEventRequests').get()).size).toBe(1);}
 log(info,{available,options,state:await dbState()}); if(isPR) expect(available).toBe(!coverage.includes('clash'));
});

for(const decision of ['Approve','Reject']) test(`teacher-${decision.toLowerCase()}-student-request`,async({page,browser},info)=>{
 await db.collection('studentEventRequests').doc('pending').set(request()); await signIn(page,'Teacher + Admin'); await page.getByRole('button',{name:/Pending Approvals/}).click(); await expect(page.getByText('Comparison Request',{exact:true})).toBeVisible();
 let confirmation=null; page.once('dialog',d=>{confirmation=d.message(); return d.accept();}); await page.getByRole('button',{name:decision,exact:true}).click();
 await expect.poll(async()=>{const snap=await db.collection('studentEventRequests').doc('pending').get(); return snap.exists?snap.data().approvalStatus:'converted';}).not.toBe('pending');
 const studentContext=await browser.newContext(); const child=await studentContext.newPage(); await signIn(child,'Student'); await expect(child.getByText('Approved Requests',{exact:true})).toBeVisible(); if(decision==='Approve') await expect(child.getByText('Comparison Request',{exact:true}).first()).toBeVisible(); if(isPR) await expect(child.getByText(`Your tutoring request was ${decision==='Approve'?'approved':'denied'}.`,{exact:false})).toBeVisible();
 if(isPR && decision==='Approve') await expect(child.locator('.card').filter({has:child.getByText('Approved Requests',{exact:true})}).locator('h3')).toHaveText('1'); await child.screenshot({path:`${out}/${info.title}-student.png`,fullPage:true}); log(info,{confirmation,state:await dbState(),studentDashboard:(await child.locator('body').innerText()).replace(/\s+/g,' ')}); await studentContext.close();
});

for(const role of ['Tutor','Coach']) test(`${role.toLowerCase()}-completes-own-shift`,async({page},info)=>{
 const email=role==='Tutor'?tutor:coach; await db.collection('shifts').doc('assigned').set(shift({title:`Assigned ${role}`,staff:[{value:email,label:role}],staffEmails:[email],emailsList:[email],workType:role==='Tutor'?'work':'coaching'}));
 await signIn(page,role); await calendar(page); await page.getByRole('button',{name:new RegExp(`Assigned ${role}`)}).first().click(); await page.getByRole('button',{name:'Settings & Status',exact:true}).click();
 await page.locator('#workStatus').click(); await page.getByRole('option',{name:'Completed',exact:true}).click(); await page.getByRole('button',{name:'Save Status',exact:true}).click();
 await expect.poll(async()=> (await db.collection('shifts').doc('assigned').get()).data().workStatus).toBe('completed'); log(info,{state:await dbState()});
});

test('teacher-event-create-teams-complete-delete',async({page},info)=>{
 await signIn(page,'Teacher + Admin'); await calendar(page); await page.locator('.rbc-events-container').nth(2).click(); await page.getByLabel('Event title').fill('Teacher created Work'); await modalTimes(page,future,future.plus({hours:3}));
 await page.getByRole('button',{name:'Participants',exact:true}).click(); await page.locator('#staff').click(); await page.getByRole('option',{name:/Viraj Patel/}).click();
 await page.getByRole('button',{name:'General Information',exact:true}).click(); await page.getByRole('button',{name:'Add online Teams meeting',exact:true}).click(); await page.getByRole('button',{name:'Add Event',exact:true}).click();
 await expect.poll(async()=> (await db.collection('shifts').get()).size).toBe(1); const created=(await db.collection('shifts').get()).docs[0].data();
 await page.getByRole('button',{name:/Teacher created Work/}).first().click(); await expect(page.getByRole('link',{name:/Join Now/})).toHaveAttribute('href','https://teams.microsoft.com/l/meetup-join/dev-mock-meeting');
 await page.getByRole('button',{name:'Settings & Status',exact:true}).click(); await page.locator('#workType').click(); const typeOptions=await page.getByRole('option').allTextContents(); await page.getByRole('option',{name:'Work',exact:true}).click();
 await page.locator('#workStatus').click(); await page.getByRole('option',{name:'Completed',exact:true}).click(); await page.getByRole('button',{name:'Save Changes',exact:true}).click();
 await expect.poll(async()=> (await db.collection('shifts').get()).docs[0].data().workStatus).toBe('completed');
 await page.getByRole('button',{name:/Teacher created Work/}).first().click(); await page.getByRole('button',{name:'Delete',exact:true}).click(); let confirmation=null; page.once('dialog',d=>{confirmation=d.message();return d.accept();}); if(isPR) { await page.getByRole('heading',{name:'Delete Event',exact:true}).waitFor(); await page.locator('.modal').filter({has:page.getByRole('heading',{name:'Delete Event',exact:true})}).getByRole('button',{name:'Delete',exact:true}).click(); }
 await expect.poll(async()=> (await db.collection('shifts').get()).size).toBe(0); log(info,{created,typeOptions,confirmation});
});

test('notifications-two-tabs-new-acknowledge-total',async({page,context},info)=>{
 for(let i=0;i<2;i++) await db.collection('studentEventRequests').doc(`old-${i}`).set(request({title:`Old ${i}`,start:future.plus({days:i}).toJSDate(),end:future.plus({days:i,hours:1}).toJSDate(),createdAt:new Date(Date.now()-86400000)}));
 await signIn(page,'Michael (Notifications)'); await expect(page.locator('#pending-approvals h3')).toHaveText('2');
 const second=await context.newPage(); await second.goto('/dashboard'); await expect(second.locator('#pending-approvals h3')).toHaveText('2');
 const focus=async(tab,active)=>tab.evaluate(active=>{Object.defineProperty(document,'hasFocus',{configurable:true,value:()=>active});Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>active?'visible':'hidden'});window.dispatchEvent(new Event(active?'focus':'blur'));document.dispatchEvent(new Event('visibilitychange'));},active);
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('kings-talloc:request-ack:mienna@kings.edu.au'))).not.toBeNull(); await focus(page,false); await focus(second,false);
 for(let i=2;i<5;i++) await db.collection('studentEventRequests').doc(`new-${i}`).set(request({title:`New ${i}`,start:future.plus({days:i}).toJSDate(),end:future.plus({days:i,hours:1}).toJSDate()}));
 await expect(page).toHaveTitle('(3) Kings-Talloc'); await expect(second).toHaveTitle('(3) Kings-Talloc'); const away=[await page.title(),await second.title()];
 await focus(second,true); await expect(page).toHaveTitle('Kings-Talloc'); await expect(second).toHaveTitle('Kings-Talloc'); await expect(second.locator('#pending-approvals h3')).toHaveText('5');
 await second.getByRole('button',{name:/Pending Approvals/}).click(); await second.getByRole('button',{name:'Approve',exact:true}).first().click(); await expect(second.locator('#pending-approvals h3')).toHaveText('4');
 log(info,{away,acknowledged:[await page.title(),await second.title()],remaining:await second.locator('#pending-approvals h3').innerText(),state:await dbState()});
});

test('approved-student-booking-is-read-only',async({page},info)=>{
 await db.collection('shifts').doc('approved').set(request({title:'Approved Student Session',approvalStatus:'approved'})); await signIn(page,'Student'); await calendar(page); await page.getByRole('button',{name:/Approved Student Session/}).first().click();
 const result={delete:await page.getByRole('button',{name:'Delete',exact:true}).count(),save:await page.getByRole('button',{name:/Save (Changes|Status)/}).count(),dialogs:await page.getByRole('dialog').allTextContents()}; log(info,result); expect(result.delete).toBe(0); expect(result.save).toBe(0);
});

test('stale-admin-session-and-private-calendar-key',async({page},info)=>{
 await signIn(page,'Teacher + Admin'); const before=await (await page.request.get('/api/auth/session')).json();
 const tokenResponse=await page.request.post(`http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-comparison-key`,{data:{token:before.user.firebaseToken,returnSecureToken:true}}); expect(tokenResponse.status()).toBe(200); const idToken=(await tokenResponse.json()).idToken;
 await db.collection('users').doc('computing@kings.edu.au').update({defaultRole:'student',userRoles:[],authVersion:'revoked-comparison-version'});
 const privileged=await page.request.get('/api/canvas/whitelist'); const after=await (await page.request.get('/api/auth/session')).json();
 const read=await page.request.get(`http://${firestoreHost}/v1/projects/${projectId}/databases/(default)/documents/users/teacher@kings.edu.au`,{headers:{Authorization:`Bearer ${idToken}`}});
 log(info,{adminApi:privileged.status(),sessionStillAdmin:after.user?.userRoles?.includes('admin')||false,oldFirebaseRead:read.status(),publicCalendarKey:!!(await db.collection('users').doc('computing@kings.edu.au').get()).data()?.calendarFeedToken});
 if(isPR) {expect(privileged.status()).toBe(401); expect(read.status()).toBe(403); expect(after.user).toBeNull();}
});

test('competing-requests-after-one-approval',async({page},info)=>{
 await db.collection('studentEventRequests').doc('first').set(request({title:'First Request'})); await db.collection('studentEventRequests').doc('second').set(request({title:'Competing Request'}));
 await signIn(page,'Teacher + Admin'); await page.getByRole('button',{name:/Pending Approvals/}).click(); await page.getByRole('button',{name:'Approve',exact:true}).first().click(); await expect.poll(async()=> (await db.collection('shifts').get()).size).toBe(1);
 const other=(await db.collection('studentEventRequests').get()).docs[0]; log(info,{otherStatus:other?.data().approvalStatus,state:await dbState()}); if(isPR) expect(other?.data().approvalStatus).toBe('denied');
});

test('failed-approval-keeps-request-and-can-retry',async({page},info)=>{
 test.skip(!isPR,'Production uses a Firestore transaction rather than the new server scheduling endpoint; failure semantics are covered by its transaction tests, not this HTTP fault injection.');
 await db.collection('studentEventRequests').doc('retry').set(request()); await signIn(page,'Teacher + Admin'); await page.getByRole('button',{name:/Pending Approvals/}).click();
 await page.route('**/api/scheduling',route=>route.request().method()==='POST'?route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Simulated scheduling outage'})}):route.continue());
 await page.getByRole('button',{name:'Approve',exact:true}).click(); await expect(page.getByRole('alert').filter({hasText:/Simulated scheduling outage/})).toBeVisible();
 expect((await db.collection('studentEventRequests').doc('retry').get()).data().approvalStatus).toBe('pending'); expect((await db.collection('shifts').get()).size).toBe(0);
 await page.unroute('**/api/scheduling'); await page.getByRole('button',{name:'Approve',exact:true}).click(); await expect.poll(async()=> (await db.collection('shifts').get()).size).toBe(1); log(info,{recovered:true,state:await dbState()});
});

test('mixed-case tutor sees canonical and legacy assignments, their availability and own hours',async({page},info)=>{
 test.skip(!isPR,'Regression fix in the PR.');
 const legacy='coachTutor@kings.edu.au', canonical=legacy.toLowerCase();
 for(const [id,day,email,type] of [['canonical',0,canonical,'work'],['legacy',1,legacy,'coaching']]) await db.collection('shifts').doc(id).set(shift({title:`Case ${id} assignment`,start:future.plus({days:day}).toJSDate(),end:future.plus({days:day,hours:3}).toJSDate(),staff:[{value:email,label:'Tom Hanley'}],staffEmails:[email],emailsList:[email],workType:type}));
 await db.collection('shifts').doc('private').set(shift({title:'Private other tutor assignment'}));
 await db.collection('tutorAvailabilities').doc('own').set({title:'Own mixed-case availability',tutor:canonical,start:future.plus({days:2}).set({hour:9}).toJSDate(),end:future.plus({days:2}).set({hour:12}).toJSDate(),workType:['work'],locationType:'remote'});
 await signIn(page,'Coach + Tutor'); await expect(page.getByText('Case canonical assignment',{exact:true})).toBeVisible(); await expect(page.getByText('Case legacy assignment',{exact:true})).toBeVisible();
 await calendar(page); await expect(page.getByRole('button',{name:/Own mixed-case availability/}).first()).toBeVisible();
 await expect(page.getByRole('button',{name:/Private other tutor assignment/})).toHaveCount(0);
 await page.getByRole('button',{name:/Case canonical assignment/}).first().click(); await page.getByRole('button',{name:'Settings & Status',exact:true}).click(); await page.locator('#workStatus').click(); await page.getByRole('option',{name:'Completed',exact:true}).click(); await page.getByRole('button',{name:'Save Status',exact:true}).click();
 await expect.poll(async()=> (await db.collection('shifts').doc('canonical').get()).data().workStatus).toBe('completed');
 await page.reload(); await page.getByRole('button',{name:'Next',exact:true}).click(); await expect(page.getByRole('button',{name:/Case canonical assignment/}).first()).toBeVisible();
 await page.goto('/tutorHours', { waitUntil: 'domcontentloaded', timeout: 60000 });
 // The assignment is next week; choose that reporting week through the date inputs.
 const dates=page.locator('.react-datepicker__input-container input'); await dates.nth(0).fill(future.startOf('week').toFormat('dd/MM/yyyy')); await dates.nth(0).press('Enter'); await dates.nth(1).fill(future.endOf('week').toFormat('dd/MM/yyyy')); await dates.nth(1).press('Enter');
 await expect(page.getByRole('row').filter({hasText:canonical})).toContainText('3h 0m');
 expect(page._comparisonErrors.page).toEqual([]); expect(page._comparisonErrors.console.filter(message=>/Firestore|permission/i.test(message))).toEqual([]);
 log(info,{state:await dbState(),profileRetained:(await db.collection('users').doc(legacy).get()).exists});
});

test('lowercase student sign-in finds the legacy profile and edits only their mixed-case request',async({page},info)=>{
 test.skip(!isPR,'Regression fix in the PR.');
 const legacy='StuDent@Kings.edu.au'; await db.collection('users').doc(student).delete(); await db.collection('users').doc(legacy).set({email:legacy,name:'John Doe',defaultRole:'student',userRoles:[],hasSeenWelcome:true,hasSeenCalendarHelp:true});
 await db.collection('shifts').doc('support').set(shift());
 await db.collection('studentEventRequests').doc('legacy-pending').set(request({title:'Own legacy request',students:[{value:legacy,label:'John Doe'}],studentEmails:[legacy],emailsList:[tutor,legacy]}));
 await db.collection('studentEventRequests').doc('private').set(request({title:'Other student private request',students:[{value:'other@kings.edu.au'}],studentEmails:['other@kings.edu.au'],emailsList:[tutor,'other@kings.edu.au']}));
 await signIn(page,'Student'); await calendar(page); await expect(page.getByRole('button',{name:/Own legacy request/}).first()).toBeVisible(); await expect(page.getByRole('button',{name:/Other student private request/})).toHaveCount(0);
 await page.getByRole('button',{name:/Own legacy request/}).first().click(); await page.getByLabel('Topics to cover (optional)').fill('Case-safe edit'); await page.getByRole('button',{name:'Save Changes',exact:true}).click();
 await expect.poll(async()=> (await db.collection('studentEventRequests').doc('legacy-pending').get()).data().sessionTopics).toBe('Case-safe edit');
 await page.reload(); await page.getByRole('button',{name:'Next',exact:true}).click(); await expect(page.getByRole('button',{name:/Own legacy request/}).first()).toBeVisible();
 expect((await db.collection('users').doc(student).get()).exists).toBe(false); expect((await db.collection('users').doc(legacy).get()).data()).toMatchObject({hasSeenWelcome:true,hasSeenCalendarHelp:true});
 expect(page._comparisonErrors.console.filter(message=>/Firestore|permission/i.test(message))).toEqual([]); log(info,{state:await dbState(),legacyProfilePreserved:true});
});

test('lost approval response retries the same operation without duplicate decisions',async({page},info)=>{
 test.skip(!isPR,'Server operation idempotency is PR-specific.'); await db.collection('studentEventRequests').doc('lost-response').set(request()); await signIn(page,'Teacher + Admin'); await page.getByRole('button',{name:/Pending Approvals/}).click();
 let attempts=0; const operations=[]; await page.route('**/api/scheduling',async route=>{
  if(route.request().method()!=='POST'||route.request().postDataJSON().action!=='approve')return route.continue();
  operations.push(route.request().postDataJSON().operationId); attempts++;
  if(attempts===1){const response=await route.fetch(); expect(response.status()).toBe(200); return route.abort('failed');}
  return route.continue();
 });
 await page.getByRole('button',{name:'Approve',exact:true}).click(); await expect(page.getByRole('alert').filter({hasText:'Request approved successfully'})).toBeVisible();
 expect(attempts).toBe(2); expect(new Set(operations).size).toBe(1); expect((await db.collection('shifts').get()).size).toBe(1); expect((await db.collection('bookingNotifications').get()).size).toBe(1); log(info,{attempts,sameOperation:true,state:await dbState()});
});

test('availability refresh failure blocks a cached booking and recovery preserves its form',async({page},info)=>{
 test.skip(!isPR,'Server availability workflow is PR-specific.'); await db.collection('shifts').doc('support').set(shift());
 await signIn(page,'Student'); await calendar(page); await page.locator('.rbc-events-container').nth(2).click(); await modalTimes(page,future.plus({minutes:30}),future.plus({minutes:60}));
 await expect(page.getByText('Refreshing availability…',{exact:false})).toHaveCount(0); await page.locator('#tutor').click(); await page.getByRole('option',{name:/Viraj Patel/}).click(); await page.getByText('General help',{exact:true}).click(); await page.getByLabel('Topics to cover (optional)').fill('Preserve these topics');
 await page.route('**/api/availability?**',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Temporary availability outage'})}));
 await page.evaluate(()=>window.dispatchEvent(new Event('talloc:schedule-changed'))); await expect(page.getByText('Unable to refresh availability. Please retry before booking.',{exact:false})).toBeVisible(); await page.getByRole('button',{name:'Add Event',exact:true}).click(); expect((await db.collection('studentEventRequests').get()).size).toBe(0);
 await page.unroute('**/api/availability?**'); await page.getByRole('button',{name:'Retry',exact:true}).click(); await expect(page.getByText('Unable to refresh availability. Please retry before booking.',{exact:false})).toHaveCount(0);
 await expect(page.getByLabel('Topics to cover (optional)')).toHaveValue('Preserve these topics'); await page.locator('#tutor').click(); await page.getByRole('option',{name:/Viraj Patel/}).click(); await page.getByRole('button',{name:'Add Event',exact:true}).click(); await expect.poll(async()=> (await db.collection('studentEventRequests').get()).size).toBe(1); log(info,{recovered:true,retainedTopics:(await db.collection('studentEventRequests').get()).docs[0].data().sessionTopics});
});

test('stale teacher editor cannot erase a tutor completion and succeeds after reopening',async({page,browser},info)=>{
 test.skip(!isPR,'PR concurrency safeguard.'); await db.collection('shifts').doc('work').set(shift()); await signIn(page,'Teacher + Admin'); await calendar(page); await page.getByRole('button',{name:/Comparison Work/}).first().click();
 const tutorContext=await browser.newContext(); const tutorPage=await tutorContext.newPage();
 try {
  await signIn(tutorPage,'Tutor'); await calendar(tutorPage); await tutorPage.getByRole('button',{name:/Comparison Work/}).first().click(); await tutorPage.getByRole('button',{name:'Settings & Status',exact:true}).click(); await tutorPage.locator('#workStatus').click(); await tutorPage.getByRole('option',{name:'Completed',exact:true}).click(); await tutorPage.getByRole('button',{name:'Save Status',exact:true}).click(); await expect.poll(async()=> (await db.collection('shifts').doc('work').get()).data().revision).toBe(1);
  await page.getByRole('button',{name:'General Information',exact:true}).click(); await page.getByLabel('Event title').fill('Teacher correction'); await page.getByRole('button',{name:'Save Changes',exact:true}).click(); await expect(page.getByRole('alert').filter({hasText:'changed in another tab'})).toBeVisible();
  expect((await db.collection('shifts').doc('work').get()).data()).toMatchObject({title:'Comparison Work',workStatus:'completed',revision:1});
  const editor=page.getByRole('dialog').filter({has:page.getByRole('heading',{name:'Edit Event',exact:true})}); await editor.getByRole('button',{name:'Close',exact:true}).click(); await page.getByRole('button',{name:/Comparison Work/}).first().click(); await page.getByLabel('Event title').fill('Teacher correction'); await page.getByRole('button',{name:'Save Changes',exact:true}).click(); await expect.poll(async()=> (await db.collection('shifts').doc('work').get()).data().revision).toBe(2); expect((await db.collection('shifts').doc('work').get()).data().workStatus).toBe('completed');
  log(info,{preventedLostCompletion:true,state:await dbState()});
 } finally {await tutorContext.close();}
});

test('student availability excludes their session with a different ineligible tutor without leaking details',async({page},info)=>{
 test.skip(!isPR,'Student conflict correction.'); const other='other-tutor@kings.edu.au'; await db.collection('users').doc(other).set({email:other,name:'Other Tutor',defaultRole:'tutor',userRoles:[]}); await db.collection('shifts').doc('support').set(shift()); await db.collection('shifts').doc('private-session').set(request({title:'Private appointment details',approvalStatus:'approved',start:future.plus({hours:1}).toJSDate(),end:future.plus({hours:2}).toJSDate(),staff:[{value:other}],staffEmails:[other],emailsList:[other,student]}));
 await signIn(page,'Student'); const response=await page.request.get(`/api/availability?start=${encodeURIComponent(future.toISO())}&end=${encodeURIComponent(future.plus({hours:3}).toISO())}`); expect(response.status()).toBe(200); const result=await response.json();
 expect(result.slots.map(slot=>[+new Date(slot.start),+new Date(slot.end)])).toEqual([[+future,+future.plus({hours:1})],[+future.plus({hours:2}),+future.plus({hours:3})]]); expect(JSON.stringify(result)).not.toContain('Private appointment details'); expect(JSON.stringify(result)).not.toContain(other); log(info,result);
});
