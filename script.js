const periods=["คาบ 1 (08:30-09:20)","คาบ 2 (09:20-10:10)","คาบ 3 (10:20-11:10)","คาบ 4 (11:10-12:00)","พักกลางวัน","คาบ 5 (12:50-13:40)","คาบ 6 (13:40-14:30)","คาบ 7 (14:30-15:20)"];
const days=["จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์"];
let lessons=JSON.parse(localStorage.getItem('lessons')) || [];

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

// เพิ่มตัวแปรสำหรับเก็บค่ากรอง
let currentFilters = {
  subject: '',
  teacher: '',
  classLevel: '',
  room: '',
  day: '',
  period: ''
};

// เพิ่มตัวแปรสำหรับจัดการโหมด
let isAdminMode = false;
const ADMIN_PASSWORD = "admin452026"; // รหัสผ่านสำหรับโหมด Admin

// ฟังก์ชันแสดง/ซ่อนส่วนล็อกอิน
function showLoginModal() {
  document.getElementById('loginModal').style.display = 'block';
  document.getElementById('mainApp').style.display = 'none';
}

function hideLoginModal() {
  document.getElementById('loginModal').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
}

// ฟังก์ชันตั้งค่าโหมดการใช้งาน
function setUserMode(isAdmin) {
  isAdminMode = isAdmin;
  
  // อัปเดทสถานะผู้ใช้
  const userStatus = document.getElementById('userStatus');
  const logoutBtn = document.getElementById('logoutBtn');
  
  if (isAdmin) {
    userStatus.textContent = "โหมด: ผู้ดูแลระบบ";
    userStatus.style.color = "#10b981";
    logoutBtn.style.display = 'inline-block';
  } else {
    userStatus.textContent = "โหมด: ผู้เยี่ยมชม";
    userStatus.style.color = "#4b5563";
    logoutBtn.style.display = 'inline-block';
  }
  
  // ซ่อนหรือแสดงฟังก์ชันการแก้ไขตามโหมด
  toggleEditFunctions(isAdmin);
}

// ฟังก์ชันซ่อน/แสดงฟังก์ชันการแก้ไข
function toggleEditFunctions(show) {
  // ซ่อนหรือแสดงฟอร์มเพิ่ม/แก้ไข
  const controls = document.getElementById('controls');
  controls.style.display = show ? 'block' : 'none';
  
  // ซ่อนหรือแสดงปุ่มจัดการข้อมูลในส่วนสรุป
  const editButtons = document.querySelectorAll('.btn-warning, .btn-danger, .btn-info');
  editButtons.forEach(button => {
    button.style.display = show ? 'inline-block' : 'none';
  });
  
  // ซ่อนหรือแสดงปุ่มจัดการในตารางรายการ
  const tableActionButtons = document.querySelectorAll('#lessonTable .btn-warning, #lessonTable .btn-danger');
  tableActionButtons.forEach(button => {
    button.style.display = show ? 'inline-block' : 'none';
  });
  
  // ซ่อนหรือแสดงส่วนจัดการข้อมูล (เพิ่มครู, ชั้นเรียน, รายวิชา, ห้อง)
  const dataManagementSections = document.querySelectorAll('.data-management');
  dataManagementSections.forEach(section => {
    section.style.display = show ? 'block' : 'none';
  });
  
  // ซ่อนหรือแสดงปุ่มจัดการ JSON
  const jsonButtons = document.querySelectorAll('#downloadJsonBtn, #importJsonBtn');
  jsonButtons.forEach(button => {
    button.style.display = show ? 'inline-block' : 'none';
  });
  
  // ซ่อนหรือแสดงปุ่มเพิ่มอัตโนมัติ
  document.getElementById('autoBtn').style.display = show ? 'inline-block' : 'none';
  
  // ซ่อนหรือแสดงปุ่มรีเซ็ตฟอร์ม
  document.getElementById('resetBtn').style.display = show ? 'inline-block' : 'none';
}

// ฟังก์ชันล็อกอิน
function loginAsAdmin() {
  const password = document.getElementById('adminPassword').value;
  const messageDiv = document.getElementById('loginMessage');
  
  if (password === ADMIN_PASSWORD) {
    hideLoginModal();
    setUserMode(true);
    messageDiv.innerHTML = '';
  } else {
    messageDiv.innerHTML = '<div style="color:red;">รหัสผ่านไม่ถูกต้อง</div>';
  }
}

// ฟังก์ชันเข้าสู่ระบบเป็นผู้เยี่ยมชม
function loginAsGuest() {
  hideLoginModal();
  setUserMode(false);
}

// ฟังก์ชันออกจากระบบ
function logout() {
  showLoginModal();
  document.getElementById('adminPassword').value = '';
  document.getElementById('loginMessage').innerHTML = '';
}

// ป้องกันการดำเนินการในโหมด Guest
function preventGuestAction(actionName) {
  if (!isAdminMode) {
    alert(`คุณอยู่ในโหมดผู้เยี่ยมชม ไม่สามารถ${actionName}ได้`);
    return true;
  }
  return false;
}

// ฟังก์ชันบันทึกข้อมูลลง Local Storage
function saveData() {
  localStorage.setItem('teachers', JSON.stringify(teachers));
  localStorage.setItem('classes', JSON.stringify(classes));
  localStorage.setItem('subjects', JSON.stringify(subjects));
  localStorage.setItem('rooms', JSON.stringify(rooms));
  localStorage.setItem('lessons', JSON.stringify(lessons));
}

// ฟังก์ชันดาวน์โหลดข้อมูลเป็น JSON
function downloadJSON() {
  const data = {
    teachers,
    classes,
    subjects,
    rooms,
    lessons,
    exportDate: new Date().toISOString(),
    version: '1.0'
  };
  
  const dataStr = JSON.stringify(data, null, 2);
  const dataBlob = new Blob([dataStr], {type: 'application/json'});
  
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `timetable_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  document.getElementById('message').innerHTML = '<div style="color:green;">ดาวน์โหลดไฟล์ JSON สำเร็จแล้ว</div>';
}

// ฟังก์ชันนำเข้าข้อมูลจาก JSON
function importJSON(file) {
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      
      // ตรวจสอบโครงสร้างข้อมูล
      if (!data.teachers || !data.classes || !data.subjects || !data.rooms || !data.lessons) {
        throw new Error('รูปแบบไฟล์ไม่ถูกต้อง');
      }
      
      // ยืนยันการนำเข้า (ทับข้อมูลเดิม)
      if (!confirm('การนำเข้าข้อมูลจะทับข้อมูลปัจจุบันทั้งหมด\nต้องการดำเนินการต่อหรือไม่?')) {
        return;
      }
      
      // อัปเดทข้อมูล
      teachers = data.teachers;
      classes = data.classes;
      subjects = data.subjects;
      rooms = data.rooms;
      lessons = data.lessons;
      
      // บันทึกลง Local Storage
      saveData();
      
      // โหลดข้อมูลใหม่
      loadDropdowns();
      renderAll();
      
      document.getElementById('message').innerHTML = '<div style="color:green;">นำเข้าข้อมูลจาก JSON สำเร็จแล้ว</div>';
      
    } catch (error) {
      console.error('Error importing JSON:', error);
      document.getElementById('message').innerHTML = `<div style="color:red;">เกิดข้อผิดพลาดในการนำเข้า: ${error.message}</div>`;
    }
  };
  
  reader.readAsText(file);
}

// Event Listeners สำหรับปุ่ม JSON
document.getElementById('downloadJsonBtn').onclick = downloadJSON;

document.getElementById('importJsonBtn').onclick = function() {
  if (preventGuestAction("นำเข้าข้อมูลจากไฟล์ JSON")) return;
  document.getElementById('jsonFileInput').click();
};

document.getElementById('jsonFileInput').onchange = function(e) {
  if (e.target.files.length > 0) {
    importJSON(e.target.files[0]);
    // รีเซ็ต input file เพื่อให้สามารถเลือกไฟล์เดิมอีกครั้งได้
    e.target.value = '';
  }
};

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
  // โหลดข้อมูลลง dropdown สรุปอาจารย์
  loadTeacherSummaryDropdown();
  
  // โหลดตัวเลือกใน dropdown กรอง
  loadFilterOptions();
}

// ฟังก์ชันโหลด dropdown สำหรับเลือกอาจารย์ในสรุป
function loadTeacherSummaryDropdown() {
  const teacherSummarySelect = document.getElementById('teacherSummarySelect');
  teacherSummarySelect.innerHTML = '<option value="all">แสดงทั้งหมด</option>';
  
  teachers.forEach(teacher => {
    teacherSummarySelect.innerHTML += `<option value="${teacher}">${teacher}</option>`;
  });
}

// ฟังก์ชันโหลดตัวเลือกใน dropdown กรอง
function loadFilterOptions() {
  // กรองตามรายวิชา
  const filterSubject = document.getElementById('filterSubject');
  filterSubject.innerHTML = '<option value="">ทั้งหมด</option>';
  subjects.forEach(subject => {
    filterSubject.innerHTML += `<option value="${subject}">${subject}</option>`;
  });
  
  // กรองตามครู
  const filterTeacher = document.getElementById('filterTeacher');
  filterTeacher.innerHTML = '<option value="">ทั้งหมด</option>';
  teachers.forEach(teacher => {
    filterTeacher.innerHTML += `<option value="${teacher}">${teacher}</option>`;
  });
  
  // กรองตามชั้น
  const filterClass = document.getElementById('filterClass');
  filterClass.innerHTML = '<option value="">ทั้งหมด</option>';
  classes.forEach(cls => {
    filterClass.innerHTML += `<option value="${cls}">${cls}</option>`;
  });
  
  // กรองตามห้อง
  const filterRoom = document.getElementById('filterRoom');
  filterRoom.innerHTML = '<option value="">ทั้งหมด</option>';
  rooms.forEach(room => {
    filterRoom.innerHTML += `<option value="${room}">${room}</option>`;
  });
  
  // โหลดตัวเลือกใน dropdown สรุปชั้นปี
  const classSummarySelect = document.getElementById('classSummarySelect');
  classSummarySelect.innerHTML = '<option value="all">แสดงทั้งหมด</option>';
  classes.forEach(cls => {
    classSummarySelect.innerHTML += `<option value="${cls}">${cls}</option>`;
  });
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
  if (preventGuestAction("เพิ่มอาจารย์")) return;
  
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
  if (preventGuestAction("เพิ่มชั้นเรียน")) return;
  
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
  if (preventGuestAction("เพิ่มรายวิชา")) return;
  
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
  if (preventGuestAction("เพิ่มห้อง")) return;
  
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
  if (preventGuestAction("ลบอาจารย์")) return;
  
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
  if (preventGuestAction("ลบชั้นเรียน")) return;
  
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
  if (preventGuestAction("ลบรายวิชา")) return;
  
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
  if (preventGuestAction("ลบห้อง")) return;
  
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
  if (preventGuestAction("แก้ไขข้อมูลอาจารย์")) return;
  
  currentEditType = 'teacher';
  currentEditIndex = index;
  originalValue = teachers[index];
  
  document.getElementById('modalTitle').textContent = 'แก้ไขชื่ออาจารย์';
  document.getElementById('editInput').value = originalValue;
  document.getElementById('editModal').style.display = 'block';
}

function editClass(index) {
  if (preventGuestAction("แก้ไขข้อมูลชั้นเรียน")) return;
  
  currentEditType = 'class';
  currentEditIndex = index;
  originalValue = classes[index];
  
  document.getElementById('modalTitle').textContent = 'แก้ไขชื่อชั้นเรียน';
  document.getElementById('editInput').value = originalValue;
  document.getElementById('editModal').style.display = 'block';
}

function editSubject(index) {
  if (preventGuestAction("แก้ไขข้อมูลรายวิชา")) return;
  
  currentEditType = 'subject';
  currentEditIndex = index;
  originalValue = subjects[index];
  
  document.getElementById('modalTitle').textContent = 'แก้ไขชื่อรายวิชา';
  document.getElementById('editInput').value = originalValue;
  document.getElementById('editModal').style.display = 'block';
}

function editRoom(index) {
  if (preventGuestAction("แก้ไขข้อมูลห้อง")) return;
  
  currentEditType = 'room';
  currentEditIndex = index;
  originalValue = rooms[index];
  
  document.getElementById('modalTitle').textContent = 'แก้ไขชื่อห้อง';
  document.getElementById('editInput').value = originalValue;
  document.getElementById('editModal').style.display = 'block';
}

// ฟังก์ชันบันทึกการแก้ไขจาก Modal
document.getElementById('saveEditBtn').onclick = function() {
  if (preventGuestAction("บันทึกการแก้ไข")) return;
  
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

function renderAll(){
  renderGrid();
  renderList();
  renderSummary();
  renderClassSummary(); // เพิ่มการเรียกฟังก์ชันสรุปชั้นปี
}

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
  const tb = document.querySelector('#lessonTable tbody'); 
  tb.innerHTML = '';
  
  // กรองข้อมูลตามเงื่อนไข
  let filteredLessons = lessons.filter(lesson => {
    if (currentFilters.subject && lesson.subject !== currentFilters.subject) return false;
    if (currentFilters.teacher && lesson.teacher !== currentFilters.teacher) return false;
    if (currentFilters.classLevel && lesson.classLevel !== currentFilters.classLevel) return false;
    if (currentFilters.room && lesson.room !== currentFilters.room) return false;
    if (currentFilters.day !== '' && lesson.day !== parseInt(currentFilters.day)) return false;
    if (currentFilters.period !== '' && lesson.period !== parseInt(currentFilters.period)) return false;
    return true;
  });
  
  // แสดงจำนวนรายการที่กรองได้
  const tableHeader = document.querySelector('#lessonTable').closest('.card').querySelector('h2');
  const originalTitle = 'รายการจัดการเรียนทั้งหมด';
  if (Object.values(currentFilters).some(filter => filter !== '')) {
    tableHeader.textContent = `${originalTitle} (${filteredLessons.length} รายการ)`;
  } else {
    tableHeader.textContent = originalTitle;
  }
  
  // เรียงลำดับตามวันและคาบ
  filteredLessons.sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    return a.period - b.period;
  });
  
  // แสดงผล
  filteredLessons.forEach(l => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${l.subject}</td>
      <td>${l.teacher}</td>
      <td>${l.classLevel}</td>
      <td>${l.room}</td>
      <td>${days[l.day]}</td>
      <td>${periods[l.period]}</td>
      <td>
        <button class="btn-warning small edit-btn" data-id="${l.id}" style="margin-right:4px;">แก้ไข</button>
        <button class="btn-danger small" data-id="${l.id}">ลบ</button>
      </td>`;
    tb.appendChild(tr);
  });
  
  // เพิ่ม event สำหรับปุ่มแก้ไข
  tb.querySelectorAll('.edit-btn').forEach(b => b.onclick = () => {
    if (preventGuestAction("แก้ไขรายการสอน")) return;
    const lesson = lessons.find(x => x.id === b.dataset.id);
    if(lesson) {
      editLesson(lesson);
    }
  });
  
  // ปุ่มลบ
  tb.querySelectorAll('.btn-danger').forEach(b => b.onclick = () => {
    if (preventGuestAction("ลบรายการสอน")) return;
    lessons = lessons.filter(x => x.id !== b.dataset.id);
    saveData();
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

// ฟังก์ชันสร้างสรุปคาบสอนแบบละเอียด
function renderSummary(){
  const div = document.getElementById('teacherSummary');
  const selectedTeacher = document.getElementById('teacherSummarySelect').value;
  
  // สร้างโครงสร้างข้อมูลสำหรับสรุป
  const teacherSummary = {};
  
  lessons.forEach(lesson => {
    const { teacher, subject } = lesson;
    
    if (!teacherSummary[teacher]) {
      teacherSummary[teacher] = {
        total: 0,
        subjects: {}
      };
    }
    
    teacherSummary[teacher].total++;
    
    if (!teacherSummary[teacher].subjects[subject]) {
      teacherSummary[teacher].subjects[subject] = 0;
    }
    
    teacherSummary[teacher].subjects[subject]++;
  });
  
  // เรียงลำดับอาจารย์ตามชื่อ
  const sortedTeachers = Object.keys(teacherSummary).sort();
  
  div.innerHTML = '';
  
  if (Object.keys(teacherSummary).length === 0) {
    div.innerHTML = '<div class="no-data">ยังไม่มีข้อมูลการสอน</div>';
    return;
  }
  
  const container = document.createElement('div');
  container.className = 'teacher-summary-detail';
  
  let hasData = false;
  
  sortedTeachers.forEach(teacher => {
    // กรองตามอาจารย์ที่เลือก (ถ้าไม่เลือก "แสดงทั้งหมด")
    if (selectedTeacher !== 'all' && teacher !== selectedTeacher) {
      return;
    }
    
    hasData = true;
    const teacherData = teacherSummary[teacher];
    
    const teacherItem = document.createElement('div');
    teacherItem.className = 'teacher-summary-item';
    
    // Header - ชื่ออาจารย์และจำนวนคาบรวม
    const header = document.createElement('div');
    header.className = 'teacher-summary-header';
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'teacher-summary-name';
    nameDiv.textContent = teacher;
    
    const totalDiv = document.createElement('div');
    totalDiv.className = 'teacher-summary-total';
    totalDiv.textContent = `รวม ${teacherData.total} คาบ`;
    
    header.appendChild(nameDiv);
    header.appendChild(totalDiv);
    
    // รายการวิชา
    const subjectList = document.createElement('div');
    subjectList.className = 'subject-list';
    
    // เรียงลำดับวิชาตามจำนวนคาบ (มากไปน้อย)
    const sortedSubjects = Object.entries(teacherData.subjects)
      .sort((a, b) => b[1] - a[1]);
    
    sortedSubjects.forEach(([subject, count]) => {
      const subjectItem = document.createElement('div');
      subjectItem.className = 'subject-item';
      
      const subjectName = document.createElement('div');
      subjectName.className = 'subject-name';
      subjectName.textContent = subject;
      
      const subjectPeriods = document.createElement('div');
      subjectPeriods.className = 'subject-periods';
      subjectPeriods.textContent = `${count} คาบ`;
      
      subjectItem.appendChild(subjectName);
      subjectItem.appendChild(subjectPeriods);
      subjectList.appendChild(subjectItem);
    });
    
    teacherItem.appendChild(header);
    teacherItem.appendChild(subjectList);
    container.appendChild(teacherItem);
  });
  
  if (!hasData && selectedTeacher !== 'all') {
    div.innerHTML = '<div class="no-data">ไม่พบข้อมูลการสอนสำหรับอาจารย์ท่านนี้</div>';
  } else {
    div.appendChild(container);
  }
}

// ฟังก์ชันสร้างสรุปชั้นปี
function renderClassSummary() {
  const div = document.getElementById('classSummary');
  const selectedClass = document.getElementById('classSummarySelect').value;
  
  // สร้างโครงสร้างข้อมูลสำหรับสรุปชั้นปี
  const classSummary = {};
  
  lessons.forEach(lesson => {
    const { classLevel, subject } = lesson;
    
    if (!classSummary[classLevel]) {
      classSummary[classLevel] = {
        total: 0,
        subjects: {}
      };
    }
    
    classSummary[classLevel].total++;
    
    if (!classSummary[classLevel].subjects[subject]) {
      classSummary[classLevel].subjects[subject] = 0;
    }
    
    classSummary[classLevel].subjects[subject]++;
  });
  
  // เรียงลำดับชั้นปี
  const sortedClasses = Object.keys(classSummary).sort();
  
  div.innerHTML = '';
  
  if (Object.keys(classSummary).length === 0) {
    div.innerHTML = '<div class="no-data">ยังไม่มีข้อมูลการสอน</div>';
    return;
  }
  
  const container = document.createElement('div');
  container.className = 'class-summary-detail';
  
  let hasData = false;
  
  sortedClasses.forEach(classLevel => {
    // กรองตามชั้นปีที่เลือก (ถ้าไม่เลือก "แสดงทั้งหมด")
    if (selectedClass !== 'all' && classLevel !== selectedClass) {
      return;
    }
    
    hasData = true;
    const classData = classSummary[classLevel];
    
    const classItem = document.createElement('div');
    classItem.className = 'class-summary-item';
    
    // Header - ชื่อชั้นปีและจำนวนคาบรวม
    const header = document.createElement('div');
    header.className = 'class-summary-header';
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'class-summary-name';
    nameDiv.textContent = classLevel;
    
    const totalDiv = document.createElement('div');
    totalDiv.className = 'class-summary-total';
    totalDiv.textContent = `รวม ${classData.total} คาบ`;
    
    header.appendChild(nameDiv);
    header.appendChild(totalDiv);
    
    // รายการวิชา
    const subjectList = document.createElement('div');
    subjectList.className = 'subject-list';
    
    // เรียงลำดับวิชาตามจำนวนคาบ (มากไปน้อย)
    const sortedSubjects = Object.entries(classData.subjects)
      .sort((a, b) => b[1] - a[1]);
    
    sortedSubjects.forEach(([subject, count]) => {
      const subjectItem = document.createElement('div');
      subjectItem.className = 'subject-item';
      
      const subjectName = document.createElement('div');
      subjectName.className = 'subject-name';
      subjectName.textContent = subject;
      
      const subjectPeriods = document.createElement('div');
      subjectPeriods.className = 'subject-periods';
      subjectPeriods.textContent = `${count} คาบ`;
      
      subjectItem.appendChild(subjectName);
      subjectItem.appendChild(subjectPeriods);
      subjectList.appendChild(subjectItem);
    });
    
    classItem.appendChild(header);
    classItem.appendChild(subjectList);
    container.appendChild(classItem);
  });
  
  if (!hasData && selectedClass !== 'all') {
    div.innerHTML = '<div class="no-data">ไม่พบข้อมูลการสอนสำหรับชั้นปีนี้</div>';
  } else {
    div.appendChild(container);
  }
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
  if (preventGuestAction("บันทึกหรือแก้ไขข้อมูลการสอน")) return;
  
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
  if (preventGuestAction("เพิ่มข้อมูลการสอนอัตโนมัติ")) return;
  
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
  if (preventGuestAction("รีเซ็ตฟอร์ม")) return;
  
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

// ฟังก์ชันจัดการการกรอง
function setupFilters() {
  // ตั้งค่า event listeners สำหรับ dropdown กรองทั้งหมด
  document.getElementById('filterSubject').addEventListener('change', function() {
    currentFilters.subject = this.value;
    renderList();
  });
  
  document.getElementById('filterTeacher').addEventListener('change', function() {
    currentFilters.teacher = this.value;
    renderList();
  });
  
  document.getElementById('filterClass').addEventListener('change', function() {
    currentFilters.classLevel = this.value;
    renderList();
  });
  
  document.getElementById('filterRoom').addEventListener('change', function() {
    currentFilters.room = this.value;
    renderList();
  });
  
  document.getElementById('filterDay').addEventListener('change', function() {
    currentFilters.day = this.value;
    renderList();
  });
  
  document.getElementById('filterPeriod').addEventListener('change', function() {
    currentFilters.period = this.value;
    renderList();
  });
  
  // ปุ่มรีเซ็ตการกรอง
  document.getElementById('resetFilterBtn').addEventListener('click', function() {
    // รีเซ็ตค่ากรองทั้งหมด
    currentFilters = {
      subject: '',
      teacher: '',
      classLevel: '',
      room: '',
      day: '',
      period: ''
    };
    
    // รีเซ็ต dropdown ทั้งหมด
    document.getElementById('filterSubject').value = '';
    document.getElementById('filterTeacher').value = '';
    document.getElementById('filterClass').value = '';
    document.getElementById('filterRoom').value = '';
    document.getElementById('filterDay').value = '';
    document.getElementById('filterPeriod').value = '';
    
    // รีเซ็ตตาราง
    renderList();
  });
}

// ฟังก์ชันจัดการแท็บสรุป
function setupSummaryTabs() {
  const teacherTab = document.querySelector('.summary-tab[data-type="teacher"]');
  const classTab = document.querySelector('.summary-tab[data-type="class"]');
  
  teacherTab.addEventListener('click', function() {
    // เปิดแท็บสรุปอาจารย์
    document.querySelectorAll('.summary-tab').forEach(tab => tab.classList.remove('active'));
    teacherTab.classList.add('active');
    
    document.getElementById('teacherSummarySection').style.display = 'block';
    document.getElementById('classSummarySection').style.display = 'none';
  });
  
  classTab.addEventListener('click', function() {
    // เปิดแท็บสรุปชั้นปี
    document.querySelectorAll('.summary-tab').forEach(tab => tab.classList.remove('active'));
    classTab.classList.add('active');
    
    document.getElementById('teacherSummarySection').style.display = 'none';
    document.getElementById('classSummarySection').style.display = 'block';
    
    // รีเฟรชข้อมูลสรุปชั้นปี
    renderClassSummary();
  });
}

// Event listener สำหรับ dropdown สรุปอาจารย์
document.getElementById('teacherSummarySelect').addEventListener('change', renderSummary);

// Event listener สำหรับ dropdown สรุปชั้นปี
document.getElementById('classSummarySelect').addEventListener('change', renderClassSummary);

// เมื่อโหลดหน้าเว็บเสร็จ
window.addEventListener('DOMContentLoaded', function() {
  // แสดงหน้าล็อกอินเมื่อโหลดหน้าเว็บ
  showLoginModal();
  
  // ตั้งค่า Event Listeners สำหรับระบบล็อกอิน
  document.getElementById('loginBtn').onclick = loginAsAdmin;
  document.getElementById('guestBtn').onclick = loginAsGuest;
  document.getElementById('logoutBtn').onclick = logout;
  
  // อนุญาตให้กด Enter ในช่องรหัสผ่าน
  document.getElementById('adminPassword').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      loginAsAdmin();
    }
  });
  
  // ตั้งค่าการกรอง
  setupFilters();
  
  // ตั้งค่าแท็บสรุป
  setupSummaryTabs();
  
  // โหลดข้อมูลเมื่อเริ่มต้น
  loadDropdowns();
  renderAll();
});
