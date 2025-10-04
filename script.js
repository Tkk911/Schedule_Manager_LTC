const periods=["คาบ 1 (08:30-09:20)","คาบ 2 (09:20-10:10)","คาบ 3 (10:20-11:10)","คาบ 4 (11:10-12:00)","พักกลางวัน","คาบ 5 (12:50-13:40)","คาบ 6 (13:40-14:30)","คาบ 7 (14:30-15:20)"];
const days=["จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์"];
let lessons=[];

// ฐานข้อมูลสำหรับอาจารย์, ชั้นเรียน, รายวิชา, ห้อง
let teachers = JSON.parse(localStorage.getItem('teachers')) || ['ครูสมชาย', 'ครูสมหญิง', 'ครูนิดา'];
let classes = JSON.parse(localStorage.getItem('classes')) || ['ปวช.1/1', 'ปวช.1/2', 'ปวช.2/1'];
let subjects = JSON.parse(localStorage.getItem('subjects')) || ['คณิตศาสตร์', 'วิทยาศาสตร์', 'ภาษาอังกฤษ'];
let rooms = JSON.parse(localStorage.getItem('rooms')) || ['ห้อง 101', 'ห้อง 102', 'ห้อง Lab 1'];

let currentTab="all";
let filterValue="";
let editingId = null; // เก็บ ID ของรายการที่กำลังแก้ไข

// ตัวแปรสำหรับจัดการ Modal แก้ไขข้อมูล
let currentEditType = null;
let currentEditIndex = null;
let originalValue = null;

// ฟังก์ชันบันทึกข้อมูลลง Local Storage
function saveData() {
  localStorage.setItem('teachers', JSON.stringify(teachers));
  localStorage.setItem('classes', JSON.stringify(classes));
  localStorage.setItem('subjects', JSON.stringify(subjects));
  localStorage.setItem('rooms', JSON.stringify(rooms));
}

// ฟังก์ชันโหลดข้อมูลลง dropdown
function loadDropdowns() {
  const teacherSelect = document.getElementById('teacher');
  const classSelect = document.getElementById('classLevel');
  const subjectSelect = document.getElementById('subject');
  const roomSelect = document.getElementById('room');
  
  // โหลดข้อมูลอาจารย์
  teacherSelect.innerHTML = '<option value="">เลือกอาจารย์</option>';
  teachers.forEach(teacher => {
    teacherSelect.innerHTML += `<option value="${teacher}">${teacher}</option>`;
  });
  
  // โหลดข้อมูลชั้นเรียน
  classSelect.innerHTML = '<option value="">เลือกชั้นเรียน</option>';
  classes.forEach(cls => {
    classSelect.innerHTML += `<option value="${cls}">${cls}</option>`;
  });
  
  // โหลดข้อมูลรายวิชา
  subjectSelect.innerHTML = '<option value="">เลือกรายวิชา</option>';
  subjects.forEach(subject => {
    subjectSelect.innerHTML += `<option value="${subject}">${subject}</option>`;
  });
  
  // โหลดข้อมูลห้อง
  roomSelect.innerHTML = '<option value="">เลือกห้อง</option>';
  rooms.forEach(room => {
    roomSelect.innerHTML += `<option value="${room}">${room}</option>`;
  });
  
  // โหลดข้อมูลลงลิสต์แสดงผล
  renderDataLists();
}

// ฟังก์ชันแสดงข้อมูลในลิสต์
function renderDataLists() {
  // อาจารย์
  const teacherList = document.getElementById('teacherList');
  teacherList.innerHTML = '';
  teachers.forEach((teacher, index) => {
    teacherList.innerHTML += `
      <div class="data-item">
        <span>${teacher}</span>
        <div>
          <button class="btn-warning" onclick="editTeacher(${index})">แก้ไข</button>
          <button class="btn-danger" onclick="removeTeacher(${index})">ลบ</button>
        </div>
      </div>
    `;
  });
  
  // ชั้นเรียน
  const classList = document.getElementById('classList');
  classList.innerHTML = '';
  classes.forEach((cls, index) => {
    classList.innerHTML += `
      <div class="data-item">
        <span>${cls}</span>
        <div>
          <button class="btn-warning" onclick="editClass(${index})">แก้ไข</button>
          <button class="btn-danger" onclick="removeClass(${index})">ลบ</button>
        </div>
      </div>
    `;
  });
  
  // รายวิชา
  const subjectList = document.getElementById('subjectList');
  subjectList.innerHTML = '';
  subjects.forEach((subject, index) => {
    subjectList.innerHTML += `
      <div class="data-item">
        <span>${subject}</span>
        <div>
          <button class="btn-warning" onclick="editSubject(${index})">แก้ไข</button>
          <button class="btn-danger" onclick="removeSubject(${index})">ลบ</button>
        </div>
      </div>
    `;
  });
  
  // ห้อง
  const roomList = document.getElementById('roomList');
  roomList.innerHTML = '';
  rooms.forEach((room, index) => {
    roomList.innerHTML += `
      <div class="data-item">
        <span>${room}</span>
        <div>
          <button class="btn-warning" onclick="editRoom(${index})">แก้ไข</button>
          <button class="btn-danger" onclick="removeRoom(${index})">ลบ</button>
        </div>
      </div>
    `;
  });
}

// ฟังก์ชันเพิ่มข้อมูล
document.getElementById('addTeacher').onclick = () => {
  const newTeacher = document.getElementById('newTeacher').value.trim();
  if (newTeacher && !teachers.includes(newTeacher)) {
    teachers.push(newTeacher);
    saveData();
    loadDropdowns();
    document.getElementById('newTeacher').value = '';
    document.getElementById('message').innerHTML = '<div style="color:green;">เพิ่มอาจารย์เรียบร้อยแล้ว</div>';
  }
};

document.getElementById('addClass').onclick = () => {
  const newClass = document.getElementById('newClass').value.trim();
  if (newClass && !classes.includes(newClass)) {
    classes.push(newClass);
    saveData();
    loadDropdowns();
    document.getElementById('newClass').value = '';
    document.getElementById('message').innerHTML = '<div style="color:green;">เพิ่มชั้นเรียนเรียบร้อยแล้ว</div>';
  }
};

document.getElementById('addSubject').onclick = () => {
  const newSubject = document.getElementById('newSubject').value.trim();
  if (newSubject && !subjects.includes(newSubject)) {
    subjects.push(newSubject);
    saveData();
    loadDropdowns();
    document.getElementById('newSubject').value = '';
    document.getElementById('message').innerHTML = '<div style="color:green;">เพิ่มรายวิชาเรียบร้อยแล้ว</div>';
  }
};

document.getElementById('addRoom').onclick = () => {
  const newRoom = document.getElementById('newRoom').value.trim();
  if (newRoom && !rooms.includes(newRoom)) {
    rooms.push(newRoom);
    saveData();
    loadDropdowns();
    document.getElementById('newRoom').value = '';
    document.getElementById('message').innerHTML = '<div style="color:green;">เพิ่มห้องเรียบร้อยแล้ว</div>';
  }
};

// ฟังก์ชันลบข้อมูล
function removeTeacher(index) {
  const teacherName = teachers[index];
  
  // ตรวจสอบว่ามีการใช้อาจารย์นี้ในตารางเรียนหรือไม่
  const isUsed = lessons.some(lesson => lesson.teacher === teacherName);
  
  if (isUsed) {
    if (!confirm(`อาจารย์ "${teacherName}" ถูกใช้ในตารางเรียนแล้ว\nการลบอาจส่งผลต่อตารางเรียน\nต้องการลบต่อหรือไม่?`)) {
      return;
    }
  }
  
  teachers.splice(index, 1);
  saveData();
  loadDropdowns();
  document.getElementById('message').innerHTML = '<div style="color:green;">ลบอาจารย์เรียบร้อยแล้ว</div>';
}

function removeClass(index) {
  const className = classes[index];
  
  // ตรวจสอบว่ามีการใช้ชั้นเรียนนี้ในตารางเรียนหรือไม่
  const isUsed = lessons.some(lesson => lesson.classLevel === className);
  
  if (isUsed) {
    if (!confirm(`ชั้นเรียน "${className}" ถูกใช้ในตารางเรียนแล้ว\nการลบอาจส่งผลต่อตารางเรียน\nต้องการลบต่อหรือไม่?`)) {
      return;
    }
  }
  
  classes.splice(index, 1);
  saveData();
  loadDropdowns();
  document.getElementById('message').innerHTML = '<div style="color:green;">ลบชั้นเรียนเรียบร้อยแล้ว</div>';
}

function removeSubject(index) {
  const subjectName = subjects[index];
  
  // ตรวจสอบว่ามีการใช้รายวิชานี้ในตารางเรียนหรือไม่
  const isUsed = lessons.some(lesson => lesson.subject === subjectName);
  
  if (isUsed) {
    if (!confirm(`รายวิชา "${subjectName}" ถูกใช้ในตารางเรียนแล้ว\nการลบอาจส่งผลต่อตารางเรียน\nต้องการลบต่อหรือไม่?`)) {
      return;
    }
  }
  
  subjects.splice(index, 1);
  saveData();
  loadDropdowns();
  document.getElementById('message').innerHTML = '<div style="color:green;">ลบรายวิชาเรียบร้อยแล้ว</div>';
}

function removeRoom(index) {
  const roomName = rooms[index];
  
  // ตรวจสอบว่ามีการใช้ห้องนี้ในตารางเรียนหรือไม่
  const isUsed = lessons.some(lesson => lesson.room === roomName);
  
  if (isUsed) {
    if (!confirm(`ห้อง "${roomName}" ถูกใช้ในตารางเรียนแล้ว\nการลบอาจส่งผลต่อตารางเรียน\nต้องการลบต่อหรือไม่?`)) {
      return;
    }
  }
  
  rooms.splice(index, 1);
  saveData();
  loadDropdowns();
  document.getElementById('message').innerHTML = '<div style="color:green;">ลบห้องเรียบร้อยแล้ว</div>';
}

// ฟังก์ชันแก้ไขข้อมูล
function editTeacher(index) {
  currentEditType = 'teacher';
  currentEditIndex = index;
  originalValue = teachers[index];
  
  document.getElementById('modalTitle').textContent = 'แก้ไขชื่ออาจารย์';
  document.getElementById('editInput').value = originalValue;
  document.getElementById('editModal').style.display = 'block';
}

function editClass(index) {
  currentEditType = 'class';
  currentEditIndex = index;
  originalValue = classes[index];
  
  document.getElementById('modalTitle').textContent = 'แก้ไขชื่อชั้นเรียน';
  document.getElementById('editInput').value = originalValue;
  document.getElementById('editModal').style.display = 'block';
}

function editSubject(index) {
  currentEditType = 'subject';
  currentEditIndex = index;
  originalValue = subjects[index];
  
  document.getElementById('modalTitle').textContent = 'แก้ไขชื่อรายวิชา';
  document.getElementById('editInput').value = originalValue;
  document.getElementById('editModal').style.display = 'block';
}

function editRoom(index) {
  currentEditType = 'room';
  currentEditIndex = index;
  originalValue = rooms[index];
  
  document.getElementById('modalTitle').textContent = 'แก้ไขชื่อห้อง';
  document.getElementById('editInput').value = originalValue;
  document.getElementById('editModal').style.display = 'block';
}

// ฟังก์ชันบันทึกการแก้ไขจาก Modal
document.getElementById('saveEditBtn').onclick = function() {
  const newValue = document.getElementById('editInput').value.trim();
  
  if (!newValue) {
    alert('กรุณากรอกข้อมูล');
    return;
  }
  
  if (newValue === originalValue) {
    document.getElementById('editModal').style.display = 'none';
    return;
  }
  
  // ตรวจสอบว่าชื่อซ้ำหรือไม่
  let dataArray;
  switch (currentEditType) {
    case 'teacher':
      dataArray = teachers;
      break;
    case 'class':
      dataArray = classes;
      break;
    case 'subject':
      dataArray = subjects;
      break;
    case 'room':
      dataArray = rooms;
      break;
  }
  
  if (dataArray.includes(newValue) && newValue !== originalValue) {
    alert('ชื่อนี้มีอยู่แล้วในระบบ');
    return;
  }
  
  // อัปเดทข้อมูล
  dataArray[currentEditIndex] = newValue;
  
  // อัปเดทข้อมูลในตารางเรียน (ถ้ามี)
  if (currentEditType === 'teacher') {
    lessons.forEach(lesson => {
      if (lesson.teacher === originalValue) {
        lesson.teacher = newValue;
      }
    });
  } else if (currentEditType === 'subject') {
    lessons.forEach(lesson => {
      if (lesson.subject === originalValue) {
        lesson.subject = newValue;
      }
    });
  } else if (currentEditType === 'class') {
    lessons.forEach(lesson => {
      if (lesson.classLevel === originalValue) {
        lesson.classLevel = newValue;
      }
    });
  } else if (currentEditType === 'room') {
    lessons.forEach(lesson => {
      if (lesson.room === originalValue) {
        lesson.room = newValue;
      }
    });
  }
  
  saveData();
  loadDropdowns();
  renderAll();
  
  document.getElementById('editModal').style.display = 'none';
  document.getElementById('message').innerHTML = '<div style="color:green;">แก้ไขข้อมูลเรียบร้อยแล้ว</div>';
};

// ฟังก์ชันยกเลิกการแก้ไข
document.getElementById('cancelEditBtn').onclick = function() {
  document.getElementById('editModal').style.display = 'none';
};

// ปิด Modal เมื่อคลิก X
document.querySelector('.close').onclick = function() {
  document.getElementById('editModal').style.display = 'none';
};

// ปิด Modal เมื่อคลิกนอกพื้นที่
window.onclick = function(event) {
  const modal = document.getElementById('editModal');
  if (event.target === modal) {
    modal.style.display = 'none';
  }
};

function uid(){return Date.now()+Math.random().toString(16).slice(2)}
function renderAll(){renderGrid();renderList();renderSummary();}

function renderGrid(){
  const body=document.getElementById('gridBody'); 
  body.innerHTML='';
  days.forEach((d,di)=>{
    const tr=document.createElement('tr'); 
    tr.innerHTML=`<td>${d}</td>`;
    periods.forEach((p,pi)=>{
      const td=document.createElement('td');
      if(pi===4){
        td.innerHTML='<div class="small">พักกลางวัน</div>';
      }else{
        let filtered = lessons.filter(l=>l.day===di&&l.period===pi);

        if(currentTab==="teacher" && filterValue){ filtered = filtered.filter(l=>l.teacher===filterValue); }
        if(currentTab==="class" && filterValue){ filtered = filtered.filter(l=>l.classLevel===filterValue); }
        if(currentTab==="room" && filterValue){ filtered = filtered.filter(l=>l.room===filterValue); }

        filtered.forEach(it=>{
          td.innerHTML+=`<div class="tag"><strong>${it.subject}</strong><div class="small">ครู:${it.teacher}|${it.classLevel}|ห้อง:${it.room}</div></div>`;
        });
      }
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });
}

function renderList(){
  const tb=document.querySelector('#lessonTable tbody'); tb.innerHTML='';
  lessons.forEach(l=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${l.subject}</td><td>${l.teacher}</td><td>${l.classLevel}</td><td>${l.room}</td><td>${days[l.day]}</td><td>${periods[l.period]}</td>
      <td>
        <button class="btn-warning small edit-btn" data-id="${l.id}" style="margin-right:4px;">แก้ไข</button>
        <button class="btn-danger small" data-id="${l.id}">ลบ</button>
      </td>`;
    tb.appendChild(tr);
  });
  
  // เพิ่ม event สำหรับปุ่มแก้ไข
  tb.querySelectorAll('.edit-btn').forEach(b=>b.onclick=()=>{
    const lesson = lessons.find(x=>x.id===b.dataset.id);
    if(lesson) {
      editLesson(lesson);
    }
  });
  
  // ปุ่มลบ
  tb.querySelectorAll('.btn-danger').forEach(b=>b.onclick=()=>{
    lessons=lessons.filter(x=>x.id!==b.dataset.id);
    renderAll();
    updateFilterOptions();
  });
}

function editLesson(lesson) {
  // เติมข้อมูลลงในฟอร์ม
  document.getElementById('teacher').value = lesson.teacher;
  document.getElementById('subject').value = lesson.subject;
  document.getElementById('classLevel').value = lesson.classLevel;
  document.getElementById('room').value = lesson.room;
  document.getElementById('day').value = lesson.day;
  document.getElementById('period').value = lesson.period;
  document.getElementById('numPeriods').value = 1;
  
  // เปลี่ยนปุ่มบันทึกเป็นอัปเดท
  editingId = lesson.id;
  document.getElementById('submitBtn').textContent = 'อัปเดท';
  document.getElementById('submitBtn').classList.add('btn-warning');
  document.getElementById('submitBtn').classList.remove('btn-primary');
  
  // แสดงข้อความ
  document.getElementById('message').innerHTML = '<div style="color:#f59e0b;">กำลังแก้ไขรายการสอน...</div>';
}

function renderSummary(){
  const div=document.getElementById('teacherSummary'); div.innerHTML='';
  const map={}; lessons.forEach(l=>map[l.teacher]=(map[l.teacher]||0)+1);
  Object.entries(map).forEach(([t,c])=>{
    div.innerHTML+=`<div class="box"><strong>${t}</strong><div class="small">คาบ/สัปดาห์: ${c}</div></div>`;
  });
  if(!Object.keys(map).length) div.innerHTML='<div class="small">ยังไม่มีข้อมูล</div>';
}

function conflict(nl, excludeId = null){
  return lessons.find(l => 
    l.id !== excludeId && // ไม่นับรายการที่กำลังแก้ไข
    l.day === nl.day && 
    l.period === nl.period && 
    (l.teacher === nl.teacher || l.room === nl.room || l.classLevel === nl.classLevel)
  )
}

// ✅ เพิ่มอัตโนมัติพร้อมจำนวนคาบ - ปรับปรุงแล้ว
function autoSchedule(nl, numPeriods){
  let periodsFound = 0;
  const scheduledPeriods = [];
  const availableSlots = [];
  
  // รวบรวมช่องเวลาว่างทั้งหมด
  for(let d=0; d<days.length; d++){
    for(let p=0; p<periods.length; p++){
      if(p===4) continue; // ข้ามพักกลางวัน
      
      const test={...nl,day:d,period:p};
      if(!conflict(test)){
        availableSlots.push({day: d, period: p});
      }
    }
  }
  
  // ตรวจสอบว่ามีช่องว่างพอหรือไม่
  if(availableSlots.length < numPeriods) {
    alert(`ไม่สามารถจัดตารางได้: มีช่องว่างเพียง ${availableSlots.length} คาบ แต่ต้องการ ${numPeriods} คาบ\n\nอาจารย์ ${nl.teacher} มีคาบสอนชนกันในบางเวลา`);
    return false;
  }
  
  // สุ่มเลือกช่องเวลาตามจำนวนที่ต้องการ
  for(let i=0; i<numPeriods && availableSlots.length > 0; i++){
    const randomIndex = Math.floor(Math.random() * availableSlots.length);
    const slot = availableSlots[randomIndex];
    
    const newLesson = {
      ...nl, 
      day: slot.day, 
      period: slot.period, 
      id: uid()
    };
    
    lessons.push(newLesson);
    scheduledPeriods.push({day: slot.day, period: slot.period});
    availableSlots.splice(randomIndex, 1); // ลบช่องที่ใช้แล้ว
    periodsFound++;
  }
  
  if(periodsFound > 0){
    renderAll();
    updateFilterOptions();
    
    // แสดงข้อความสรุป
    let message = `จัดตารางอัตโนมัติสำเร็จ ${periodsFound} คาบ: `;
    scheduledPeriods.forEach(sp => {
      message += `${days[sp.day]} ${periods[sp.period]}, `;
    });
    document.getElementById('message').innerHTML = `<div style="color:green;">${message}</div>`;
    
    return true;
  } else {
    alert("ไม่พบเวลาว่างที่สามารถจัดได้ (ทุกวัน-คาบชนกันหมด)");
    return false;
  }
}

// ✅ ฟังก์ชันบันทึก/อัปเดท
lessonForm.onsubmit=e=>{
  e.preventDefault();
  const numPeriods = parseInt(document.getElementById('numPeriods').value) || 1;
  
  if(editingId) {
    // โหมดแก้ไข - อัปเดทรายการเดิม
    const nl={id:editingId,teacher:teacher.value,subject:subject.value,classLevel:classLevel.value,room:room.value,day:+day.value,period:+period.value};
    if(nl.period===4)return alert('พักกลางวันไม่สามารถใช้สอนได้');
    
    const c=conflict(nl, editingId); 
    if(c)return alert(`ชนกับ ${c.subject} (ครู:${c.teacher} ห้อง:${c.room})`);
    
    // อัปเดทรายการ
    const index = lessons.findIndex(l => l.id === editingId);
    if(index !== -1) {
      lessons[index] = nl;
    }
    
    document.getElementById('message').innerHTML = '<div style="color:green;">อัปเดทรายการสอนเรียบร้อยแล้ว</div>';
    
    // รีเซ็ตโหมดแก้ไข
    editingId = null;
    document.getElementById('submitBtn').textContent = 'บันทึก';
    document.getElementById('submitBtn').classList.remove('btn-warning');
    document.getElementById('submitBtn').classList.add('btn-primary');
  } else {
    // โหมดเพิ่มใหม่
    const nl={id:uid(),teacher:teacher.value,subject:subject.value,classLevel:classLevel.value,room:room.value,day:+day.value,period:+period.value};
    if(nl.period===4)return alert('พักกลางวันไม่สามารถใช้สอนได้');
    
    const c=conflict(nl); 
    if(c)return alert(`ชนกับ ${c.subject} (ครู:${c.teacher} ห้อง:${c.room})`);
    
    lessons.push(nl); 
    document.getElementById('message').innerHTML = '<div style="color:green;">บันทึกรายการสอนเรียบร้อยแล้ว</div>';
  }
  
  e.target.reset(); 
  renderAll(); 
  updateFilterOptions();
};

autoBtn.onclick=()=>{
  const numPeriods = parseInt(document.getElementById('numPeriods').value) || 1;
  const nl={
    id:uid(),
    teacher:document.getElementById('teacher').value,
    subject:document.getElementById('subject').value,
    classLevel:document.getElementById('classLevel').value,
    room:document.getElementById('room').value,
    day:null,
    period:null
  };
  
  if(!nl.teacher||!nl.subject||!nl.classLevel||!nl.room){
    return alert("กรอกข้อมูลให้ครบก่อนใช้เพิ่มอัตโนมัติ");
  }
  
  autoSchedule(nl, numPeriods);
  lessonForm.reset();
  
  // รีเซ็ตโหมดแก้ไขถ้ามี
  if(editingId) {
    editingId = null;
    document.getElementById('submitBtn').textContent = 'บันทึก';
    document.getElementById('submitBtn').classList.remove('btn-warning');
    document.getElementById('submitBtn').classList.add('btn-primary');
  }
};

resetBtn.onclick=()=>{
  lessonForm.reset();
  // รีเซ็ตโหมดแก้ไข
  editingId = null;
  document.getElementById('submitBtn').textContent = 'บันทึก';
  document.getElementById('submitBtn').classList.remove('btn-warning');
  document.getElementById('submitBtn').classList.add('btn-primary');
  document.getElementById('message').innerHTML = '';
};

printBtn.onclick=()=>window.print();

// Export Excel
exportBtn.onclick=()=>{
  const wb=XLSX.utils.book_new();
  const term=document.getElementById('termInput').value;
  const header=["วัน/เวลา","คาบ 1","คาบ 2","คาบ 3","คาบ 4","พักกลางวัน","คาบ 5","คาบ 6","คาบ 7"];
  const sheetData=[];
  sheetData.push(["วิทยาลัยเทคโนโลยีแหลมทอง"]);
  sheetData.push(["ตารางเรียน / ตารางสอน"]);
  sheetData.push(["ภาคเรียน: "+term]);

  let title="ตารางสอน";
  let filterLabel="";
  if(currentTab==="teacher" && filterValue){ title=`ตารางสอนครู_${filterValue}`; filterLabel=`ครู: ${filterValue}`; }
  if(currentTab==="class" && filterValue){ title=`ตารางเรียน_${filterValue}`; filterLabel=`ชั้น: ${filterValue}`; }
  if(currentTab==="room" && filterValue){ title=`ตารางห้อง_${filterValue}`; filterLabel=`ห้อง: ${filterValue}`; }
  if(filterLabel) sheetData.push([filterLabel]);

  sheetData.push([]); 
  sheetData.push(header);

  days.forEach((d,di)=>{
    const row=[d];
    periods.forEach((p,pi)=>{
      if(pi===4){
        row.push("พักกลางวัน");
      }else{
        let filtered = lessons.filter(l=>l.day===di && l.period===pi);
        if(currentTab==="teacher" && filterValue){ filtered=filtered.filter(l=>l.teacher===filterValue); }
        if(currentTab==="class" && filterValue){ filtered=filtered.filter(l=>l.classLevel===filterValue); }
        if(currentTab==="room" && filterValue){ filtered=filtered.filter(l=>l.room===filterValue); }
        const cellLessons=filtered.map(l=>`${l.subject} | ${l.teacher} | ${l.classLevel} | ห้อง:${l.room}`).join("\n");
        row.push(cellLessons);
      }
    });
    sheetData.push(row);
  });

  const ws=XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(wb,ws,"ตารางสอน");
  XLSX.writeFile(wb,`${title}.xlsx`);
};

// Tab Switching
document.querySelectorAll(".tab").forEach(tab=>{
  tab.onclick=()=>{
    document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
    tab.classList.add("active");
    currentTab=tab.dataset.type;
    filterValue="";
    if(currentTab==="all"){
      document.getElementById("filterBox").style.display="none";
    }else{
      document.getElementById("filterBox").style.display="block";
      updateFilterOptions();
    }
    renderGrid();
  }
});

function updateFilterOptions(){
  const sel=document.getElementById("filterSelect");
  sel.innerHTML="";
  let set=new Set();
  if(currentTab==="teacher"){lessons.forEach(l=>set.add(l.teacher));}
  if(currentTab==="class"){lessons.forEach(l=>set.add(l.classLevel));}
  if(currentTab==="room"){lessons.forEach(l=>set.add(l.room));}
  [...set].forEach(v=>{
    const opt=document.createElement("option");
    opt.value=v; opt.textContent=v;
    sel.appendChild(opt);
  });
  sel.onchange=()=>{filterValue=sel.value;renderGrid();};
}

// โหลดข้อมูลเมื่อเริ่มต้น
loadDropdowns();
renderAll();
