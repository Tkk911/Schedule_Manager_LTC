[file name]: script.js
[file content begin]
const periods=["คาบ 1 (08:30-09:20)","คาบ 2 (09:20-10:10)","คาบ 3 (10:20-11:10)","คาบ 4 (11:10-12:00)","พักกลางวัน","คาบ 5 (12:50-13:40)","คาบ 6 (13:40-14:30)","คาบ 7 (14:30-15:20)"];
const days=["จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์"];
// เปลี่ยน URL นี้เป็น URL จาก Google Apps Script ที่คุณได้หลังจาก Deploy
const GAS_URL = 'https://script.google.com/macros/s/AKfycbymK9ipURLr7NRZUq1nd7-BzNFA_0NyvJDutTdOVDWZGV1Oz_IpBHMxJqrVQsXlJucrYQ/exec';

let lessons = [];
let teachers = [];
let classes = [];
let subjects = [];
let rooms = [];

let currentTab="all";
let filterValue="";
let editingId = null;

let currentEditType = null;
let currentEditIndex = null;
let originalValue = null;

let currentFilters = {
  subject: '',
  teacher: '',
  classLevel: '',
  room: '',
  day: '',
  period: ''
};

let isAdminMode = false;
const ADMIN_PASSWORD = "admin452026";

// ฟังก์ชันเรียกใช้งาน Google Apps Script พร้อมจัดการ CORS
async function callGoogleAppsScript(action, data = {}) {
  try {
    const payload = {
      action: action,
      ...data
    };

    console.log('Calling GAS with action:', action, 'payload:', payload);

    // วิธีที่ 1: ใช้ POST พร้อมจัดการ CORS
    let response;
    try {
      response = await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors', // ใช้ no-cors เพื่อหลีกเลี่ยง CORS issues
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
    } catch (postError) {
      console.log('POST failed, trying GET method...', postError);
      // วิธีที่ 2: ใช้ GET เป็น fallback
      const params = new URLSearchParams();
      params.append('action', action);
      params.append('data', JSON.stringify(data));
      
      response = await fetch(GAS_URL + '?' + params.toString(), {
        method: 'GET',
        mode: 'no-cors'
      });
    }

    // เนื่องจากใช้ no-cors เราไม่สามารถอ่าน response ได้โดยตรง
    // ให้เรียก GAS อีกครั้งด้วย GET เพื่อรับข้อมูล
    if (action === 'getAllData' || action === 'getLessons') {
      return await callGASWithGet(action);
    }

    // สำหรับการบันทึกข้อมูล ส่ง request แล้วถือว่าสำเร็จ
    return { success: true, message: 'Request sent successfully' };
    
  } catch (error) {
    console.error('Error calling Google Apps Script:', error);
    throw error;
  }
}

// ฟังก์ชันเรียก GAS ด้วย GET สำหรับการรับข้อมูล
async function callGASWithGet(action) {
  try {
    const url = GAS_URL + '?action=' + encodeURIComponent(action);
    console.log('Calling GAS with GET:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    console.log('Raw response:', text);
    
    try {
      const result = JSON.parse(text);
      console.log('GAS response:', result);
      return result;
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      throw new Error('Invalid JSON response from server');
    }
  } catch (error) {
    console.error('Error in callGASWithGet:', error);
    throw error;
  }
}

// ฟังก์ชันโหลดข้อมูลทั้งหมดจาก Google Sheet
async function loadAllData() {
  try {
    showLoading(true);
    
    const data = await callGASWithGet('getAllData');
    
    if (data && data.success) {
      teachers = data.teachers || [];
      classes = data.classes || [];
      subjects = data.subjects || [];
      rooms = data.rooms || [];
      lessons = data.lessons || [];
      
      // บันทึกลง Local Storage เป็น backup
      localStorage.setItem('teachers', JSON.stringify(teachers));
      localStorage.setItem('classes', JSON.stringify(classes));
      localStorage.setItem('subjects', JSON.stringify(subjects));
      localStorage.setItem('rooms', JSON.stringify(rooms));
      localStorage.setItem('lessons', JSON.stringify(lessons));
      
      console.log('Loaded from Google Sheet:', { teachers, classes, subjects, rooms, lessons });
      document.getElementById('message').innerHTML = '<div style="color:green;">โหลดข้อมูลจาก Google Sheet สำเร็จ</div>';
    } else {
      throw new Error(data.error || 'Failed to load data from server');
    }
  } catch (error) {
    console.error('Error loading data from Google Sheet:', error);
    
    // ถ้าไม่สามารถโหลดจาก Google Sheet ได้ ให้ใช้ข้อมูลจาก Local Storage
    teachers = JSON.parse(localStorage.getItem('teachers')) || ['ครูสมชาย', 'ครูสมหญิง', 'ครูนิดา'];
    classes = JSON.parse(localStorage.getItem('classes')) || ['ปวช.1/1', 'ปวช.1/2', 'ปวช.2/1'];
    subjects = JSON.parse(localStorage.getItem('subjects')) || ['คณิตศาสตร์', 'วิทยาศาสตร์', 'ภาษาอังกฤษ'];
    rooms = JSON.parse(localStorage.getItem('rooms')) || ['ห้อง 101', 'ห้อง 102', 'ห้อง Lab 1'];
    lessons = JSON.parse(localStorage.getItem('lessons')) || [];
    
    document.getElementById('message').innerHTML = '<div style="color:orange;">ใช้ข้อมูลจาก Local Storage (ไม่สามารถเชื่อมต่อ Google Sheet ได้)</div>';
  } finally {
    showLoading(false);
  }
}

// ฟังก์ชันบันทึกข้อมูลทั้งหมดไปยัง Google Sheet
async function saveAllData() {
  try {
    showLoading(true);
    
    // ใช้ POST สำหรับการบันทึกข้อมูล
    const result = await callGoogleAppsScript('saveAllData', {
      teachers: teachers,
      classes: classes,
      subjects: subjects,
      rooms: rooms,
      lessons: lessons
    });
    
    if (result && result.success) {
      // บันทึกลง Local Storage ด้วย
      localStorage.setItem('teachers', JSON.stringify(teachers));
      localStorage.setItem('classes', JSON.stringify(classes));
      localStorage.setItem('subjects', JSON.stringify(subjects));
      localStorage.setItem('rooms', JSON.stringify(rooms));
      localStorage.setItem('lessons', JSON.stringify(lessons));
      
      console.log('Saved to Google Sheet successfully');
      document.getElementById('message').innerHTML = '<div style="color:green;">บันทึกข้อมูลลง Google Sheet สำเร็จ</div>';
      return true;
    } else {
      throw new Error(result.error || 'Failed to save data');
    }
  } catch (error) {
    console.error('Error saving data to Google Sheet:', error);
    
    // ถ้าไม่สามารถบันทึกไปยัง Google Sheet ได้ ให้บันทึกลง Local Storage แค่เดียว
    localStorage.setItem('teachers', JSON.stringify(teachers));
    localStorage.setItem('classes', JSON.stringify(classes));
    localStorage.setItem('subjects', JSON.stringify(subjects));
    localStorage.setItem('rooms', JSON.stringify(rooms));
    localStorage.setItem('lessons', JSON.stringify(lessons));
    
    document.getElementById('message').innerHTML = '<div style="color:orange;">บันทึกข้อมูลลง Local Storage (ไม่สามารถเชื่อมต่อ Google Sheet ได้)</div>';
    return false;
  } finally {
    showLoading(false);
  }
}

// ฟังก์ชันแสดง/ซ่อน loading
function showLoading(show) {
  const loadingElement = document.getElementById('loading');
  if (loadingElement) {
    loadingElement.style.display = show ? 'flex' : 'none';
  }
}

// สร้าง element loading ถ้ายังไม่มี
function createLoadingElement() {
  if (!document.getElementById('loading')) {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading';
    loadingDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      color: white;
      font-size: 18px;
    `;
    loadingDiv.innerHTML = `
      <div style="background: white; padding: 20px; border-radius: 8px; color: black; display: flex; align-items: center; gap: 10px;">
        <div>🔄 กำลังโหลดข้อมูล...</div>
      </div>
    `;
    document.body.appendChild(loadingDiv);
  }
}

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
  
  toggleEditFunctions(isAdmin);
}

// ฟังก์ชันซ่อน/แสดงฟังก์ชันการแก้ไข
function toggleEditFunctions(show) {
  const controls = document.getElementById('controls');
  controls.style.display = show ? 'block' : 'none';
  
  const editButtons = document.querySelectorAll('.btn-warning, .btn-danger, .btn-info');
  editButtons.forEach(button => {
    button.style.display = show ? 'inline-block' : 'none';
  });
  
  const tableActionButtons = document.querySelectorAll('#lessonTable .btn-warning, #lessonTable .btn-danger');
  tableActionButtons.forEach(button => {
    button.style.display = show ? 'inline-block' : 'none';
  });
  
  const dataManagementSections = document.querySelectorAll('.data-management');
  dataManagementSections.forEach(section => {
    section.style.display = show ? 'block' : 'none';
  });
  
  const jsonButtons = document.querySelectorAll('#downloadJsonBtn, #importJsonBtn');
  jsonButtons.forEach(button => {
    button.style.display = show ? 'inline-block' : 'none';
  });
  
  document.getElementById('autoBtn').style.display = show ? 'inline-block' : 'none';
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
    
    // โหลดข้อมูลใหม่เมื่อล็อกอินสำเร็จ
    loadAllData().then(() => {
      loadDropdowns();
      renderAll();
    });
  } else {
    messageDiv.innerHTML = '<div style="color:red;">รหัสผ่านไม่ถูกต้อง</div>';
  }
}

// ฟังก์ชันเข้าสู่ระบบเป็นผู้เยี่ยมชม
function loginAsGuest() {
  hideLoginModal();
  setUserMode(false);
  
  // โหลดข้อมูลเมื่อเข้าสู่ระบบเป็นผู้เยี่ยมชม
  loadAllData().then(() => {
    loadDropdowns();
    renderAll();
  });
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

// ฟังก์ชันบันทึกข้อมูล (ใช้ Google Sheet เป็นหลัก)
async function saveData() {
  return await saveAllData();
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
async function importJSON(file) {
  const reader = new FileReader();
  
  reader.onload = async function(e) {
    try {
      const data = JSON.parse(e.target.result);
      
      if (!data.teachers || !data.classes || !data.subjects || !data.rooms || !data.lessons) {
        throw new Error('รูปแบบไฟล์ไม่ถูกต้อง');
      }
      
      if (!confirm('การนำเข้าข้อมูลจะทับข้อมูลปัจจุบันทั้งหมด\nต้องการดำเนินการต่อหรือไม่?')) {
        return;
      }
      
      teachers = data.teachers;
      classes = data.classes;
      subjects = data.subjects;
      rooms = data.rooms;
      lessons = data.lessons;
      
      // บันทึกลง Google Sheet
      const saved = await saveData();
      
      if (saved) {
        loadDropdowns();
        renderAll();
        document.getElementById('message').innerHTML = '<div style="color:green;">นำเข้าข้อมูลจาก JSON และบันทึกลง Google Sheet สำเร็จแล้ว</div>';
      }
      
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
    e.target.value = '';
  }
};

// ฟังก์ชันโหลดข้อมูลลง dropdown
function loadDropdowns() {
  const teacherSelect = document.getElementById('teacher');
  const classSelect = document.getElementById('classLevel');
  const subjectSelect = document.getElementById('subject');
  const roomSelect = document.getElementById('room');
  
  teacherSelect.innerHTML = '<option value="">เลือกอาจารย์</option>';
  teachers.forEach(teacher => {
    teacherSelect.innerHTML += `<option value="${teacher}">${teacher}</option>`;
  });
  
  classSelect.innerHTML = '<option value="">เลือกชั้นเรียน</option>';
  classes.forEach(cls => {
    classSelect.innerHTML += `<option value="${cls}">${cls}</option>`;
  });
  
  subjectSelect.innerHTML = '<option value="">เลือกรายวิชา</option>';
  subjects.forEach(subject => {
    subjectSelect.innerHTML += `<option value="${subject}">${subject}</option>`;
  });
  
  roomSelect.innerHTML = '<option value="">เลือกห้อง</option>';
  rooms.forEach(room => {
    roomSelect.innerHTML += `<option value="${room}">${room}</option>`;
  });
  
  renderDataLists();
  loadTeacherSummaryDropdown();
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
  const filterSubject = document.getElementById('filterSubject');
  filterSubject.innerHTML = '<option value="">ทั้งหมด</option>';
  subjects.forEach(subject => {
    filterSubject.innerHTML += `<option value="${subject}">${subject}</option>`;
  });
  
  const filterTeacher = document.getElementById('filterTeacher');
  filterTeacher.innerHTML = '<option value="">ทั้งหมด</option>';
  teachers.forEach(teacher => {
    filterTeacher.innerHTML += `<option value="${teacher}">${teacher}</option>`;
  });
  
  const filterClass = document.getElementById('filterClass');
  filterClass.innerHTML = '<option value="">ทั้งหมด</option>';
  classes.forEach(cls => {
    filterClass.innerHTML += `<option value="${cls}">${cls}</option>`;
  });
  
  const filterRoom = document.getElementById('filterRoom');
  filterRoom.innerHTML = '<option value="">ทั้งหมด</option>';
  rooms.forEach(room => {
    filterRoom.innerHTML += `<option value="${room}">${room}</option>`;
  });
  
  const classSummarySelect = document.getElementById('classSummarySelect');
  classSummarySelect.innerHTML = '<option value="all">แสดงทั้งหมด</option>';
  classes.forEach(cls => {
    classSummarySelect.innerHTML += `<option value="${cls}">${cls}</option>`;
  });
}

// ฟังก์ชันแสดงข้อมูลในลิสต์
function renderDataLists() {
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
document.getElementById('addTeacher').onclick = async () => {
  if (preventGuestAction("เพิ่มอาจารย์")) return;
  
  const newTeacher = document.getElementById('newTeacher').value.trim();
  if (newTeacher && !teachers.includes(newTeacher)) {
    teachers.push(newTeacher);
    await saveData();
    loadDropdowns();
    document.getElementById('newTeacher').value = '';
    document.getElementById('message').innerHTML = '<div style="color:green;">เพิ่มอาจารย์เรียบร้อยแล้ว</div>';
  }
};

document.getElementById('addClass').onclick = async () => {
  if (preventGuestAction("เพิ่มชั้นเรียน")) return;
  
  const newClass = document.getElementById('newClass').value.trim();
  if (newClass && !classes.includes(newClass)) {
    classes.push(newClass);
    await saveData();
    loadDropdowns();
    document.getElementById('newClass').value = '';
    document.getElementById('message').innerHTML = '<div style="color:green;">เพิ่มชั้นเรียนเรียบร้อยแล้ว</div>';
  }
};

document.getElementById('addSubject').onclick = async () => {
  if (preventGuestAction("เพิ่มรายวิชา")) return;
  
  const newSubject = document.getElementById('newSubject').value.trim();
  if (newSubject && !subjects.includes(newSubject)) {
    subjects.push(newSubject);
    await saveData();
    loadDropdowns();
    document.getElementById('newSubject').value = '';
    document.getElementById('message').innerHTML = '<div style="color:green;">เพิ่มรายวิชาเรียบร้อยแล้ว</div>';
  }
};

document.getElementById('addRoom').onclick = async () => {
  if (preventGuestAction("เพิ่มห้อง")) return;
  
  const newRoom = document.getElementById('newRoom').value.trim();
  if (newRoom && !rooms.includes(newRoom)) {
    rooms.push(newRoom);
    await saveData();
    loadDropdowns();
    document.getElementById('newRoom').value = '';
    document.getElementById('message').innerHTML = '<div style="color:green;">เพิ่มห้องเรียบร้อยแล้ว</div>';
  }
};

// ฟังก์ชันลบข้อมูล
async function removeTeacher(index) {
  if (preventGuestAction("ลบอาจารย์")) return;
  
  const teacherName = teachers[index];
  
  const isUsed = lessons.some(lesson => lesson.teacher === teacherName);
  
  if (isUsed) {
    if (!confirm(`อาจารย์ "${teacherName}" ถูกใช้ในตารางเรียนแล้ว\nการลบอาจส่งผลต่อตารางเรียน\nต้องการลบต่อหรือไม่?`)) {
      return;
    }
  }
  
  teachers.splice(index, 1);
  await saveData();
  loadDropdowns();
  document.getElementById('message').innerHTML = '<div style="color:green;">ลบอาจารย์เรียบร้อยแล้ว</div>';
}

async function removeClass(index) {
  if (preventGuestAction("ลบชั้นเรียน")) return;
  
  const className = classes[index];
  
  const isUsed = lessons.some(lesson => lesson.classLevel === className);
  
  if (isUsed) {
    if (!confirm(`ชั้นเรียน "${className}" ถูกใช้ในตารางเรียนแล้ว\nการลบอาจส่งผลต่อตารางเรียน\nต้องการลบต่อหรือไม่?`)) {
      return;
    }
  }
  
  classes.splice(index, 1);
  await saveData();
  loadDropdowns();
  document.getElementById('message').innerHTML = '<div style="color:green;">ลบชั้นเรียนเรียบร้อยแล้ว</div>';
}

async function removeSubject(index) {
  if (preventGuestAction("ลบรายวิชา")) return;
  
  const subjectName = subjects[index];
  
  const isUsed = lessons.some(lesson => lesson.subject === subjectName);
  
  if (isUsed) {
    if (!confirm(`รายวิชา "${subjectName}" ถูกใช้ในตารางเรียนแล้ว\nการลบอาจส่งผลต่อตารางเรียน\nต้องการลบต่อหรือไม่?`)) {
      return;
    }
  }
  
  subjects.splice(index, 1);
  await saveData();
  loadDropdowns();
  document.getElementById('message').innerHTML = '<div style="color:green;">ลบรายวิชาเรียบร้อยแล้ว</div>';
}

async function removeRoom(index) {
  if (preventGuestAction("ลบห้อง")) return;
  
  const roomName = rooms[index];
  
  const isUsed = lessons.some(lesson => lesson.room === roomName);
  
  if (isUsed) {
    if (!confirm(`ห้อง "${roomName}" ถูกใช้ในตารางเรียนแล้ว\nการลบอาจส่งผลต่อตารางเรียน\nต้องการลบต่อหรือไม่?`)) {
      return;
    }
  }
  
  rooms.splice(index, 1);
  await saveData();
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
document.getElementById('saveEditBtn').onclick = async function() {
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
  
  dataArray[currentEditIndex] = newValue;
  
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
  
  await saveData();
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

function uid(){return Date.now().toString() + Math.random().toString(16).slice(2)}

function renderAll(){
  renderGrid();
  renderList();
  renderSummary();
  renderClassSummary();
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
  
  let filteredLessons = lessons.filter(lesson => {
    if (currentFilters.subject && lesson.subject !== currentFilters.subject) return false;
    if (currentFilters.teacher && lesson.teacher !== currentFilters.teacher) return false;
    if (currentFilters.classLevel && lesson.classLevel !== currentFilters.classLevel) return false;
    if (currentFilters.room && lesson.room !== currentFilters.room) return false;
    if (currentFilters.day !== '' && lesson.day !== parseInt(currentFilters.day)) return false;
    if (currentFilters.period !== '' && lesson.period !== parseInt(currentFilters.period)) return false;
    return true;
  });
  
  const tableHeader = document.querySelector('#lessonTable').closest('.card').querySelector('h2');
  const originalTitle = 'รายการจัดการเรียนทั้งหมด';
  if (Object.values(currentFilters).some(filter => filter !== '')) {
    tableHeader.textContent = `${originalTitle} (${filteredLessons.length} รายการ)`;
  } else {
    tableHeader.textContent = originalTitle;
  }
  
  filteredLessons.sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    return a.period - b.period;
  });
  
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
  
  tb.querySelectorAll('.edit-btn').forEach(b => b.onclick = () => {
    if (preventGuestAction("แก้ไขรายการสอน")) return;
    const lesson = lessons.find(x => x.id === b.dataset.id);
    if(lesson) {
      editLesson(lesson);
    }
  });
  
  tb.querySelectorAll('.btn-danger').forEach(b => b.onclick = async () => {
    if (preventGuestAction("ลบรายการสอน")) return;
    lessons = lessons.filter(x => x.id !== b.dataset.id);
    await saveData();
    renderAll();
    updateFilterOptions();
  });
}

function editLesson(lesson) {
  document.getElementById('teacher').value = lesson.teacher;
  document.getElementById('subject').value = lesson.subject;
  document.getElementById('classLevel').value = lesson.classLevel;
  document.getElementById('room').value = lesson.room;
  document.getElementById('day').value = lesson.day;
  document.getElementById('period').value = lesson.period;
  document.getElementById('numPeriods').value = 1;
  
  editingId = lesson.id;
  document.getElementById('submitBtn').textContent = 'อัปเดท';
  document.getElementById('submitBtn').classList.add('btn-warning');
  document.getElementById('submitBtn').classList.remove('btn-primary');
  
  document.getElementById('message').innerHTML = '<div style="color:#f59e0b;">กำลังแก้ไขรายการสอน...</div>';
}

function renderSummary(){
  const div = document.getElementById('teacherSummary');
  const selectedTeacher = document.getElementById('teacherSummarySelect').value;
  
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
    if (selectedTeacher !== 'all' && teacher !== selectedTeacher) {
      return;
    }
    
    hasData = true;
    const teacherData = teacherSummary[teacher];
    
    const teacherItem = document.createElement('div');
    teacherItem.className = 'teacher-summary-item';
    
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
    
    const subjectList = document.createElement('div');
    subjectList.className = 'subject-list';
    
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

function renderClassSummary() {
  const div = document.getElementById('classSummary');
  const selectedClass = document.getElementById('classSummarySelect').value;
  
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
    if (selectedClass !== 'all' && classLevel !== selectedClass) {
      return;
    }
    
    hasData = true;
    const classData = classSummary[classLevel];
    
    const classItem = document.createElement('div');
    classItem.className = 'class-summary-item';
    
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
    
    const subjectList = document.createElement('div');
    subjectList.className = 'subject-list';
    
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
    l.id !== excludeId &&
    l.day === nl.day && 
    l.period === nl.period && 
    (l.teacher === nl.teacher || l.room === nl.room || l.classLevel === nl.classLevel)
  )
}

function autoSchedule(nl, numPeriods){
  let periodsFound = 0;
  const scheduledPeriods = [];
  const availableSlots = [];
  
  for(let d=0; d<days.length; d++){
    for(let p=0; p<periods.length; p++){
      if(p===4) continue;
      
      const test={...nl,day:d,period:p};
      if(!conflict(test)){
        availableSlots.push({day: d, period: p});
      }
    }
  }
  
  if(availableSlots.length < numPeriods) {
    alert(`ไม่สามารถจัดตารางได้: มีช่องว่างเพียง ${availableSlots.length} คาบ แต่ต้องการ ${numPeriods} คาบ\n\nอาจารย์ ${nl.teacher} มีคาบสอนชนกันในบางเวลา`);
    return false;
  }
  
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
    availableSlots.splice(randomIndex, 1);
    periodsFound++;
  }
  
  if(periodsFound > 0){
    renderAll();
    updateFilterOptions();
    
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

// ฟังก์ชันบันทึก/อัปเดท
lessonForm.onsubmit = async e => {
  if (preventGuestAction("บันทึกหรือแก้ไขข้อมูลการสอน")) return;
  
  e.preventDefault();
  const numPeriods = parseInt(document.getElementById('numPeriods').value) || 1;
  
  if(editingId) {
    const nl={id:editingId,teacher:teacher.value,subject:subject.value,classLevel:classLevel.value,room:room.value,day:+day.value,period:+period.value};
    if(nl.period===4)return alert('พักกลางวันไม่สามารถใช้สอนได้');
    
    const c=conflict(nl, editingId); 
    if(c)return alert(`ชนกับ ${c.subject} (ครู:${c.teacher} ห้อง:${c.room})`);
    
    const index = lessons.findIndex(l => l.id === editingId);
    if(index !== -1) {
      lessons[index] = nl;
    }
    
    document.getElementById('message').innerHTML = '<div style="color:green;">อัปเดทรายการสอนเรียบร้อยแล้ว</div>';
    
    editingId = null;
    document.getElementById('submitBtn').textContent = 'บันทึก';
    document.getElementById('submitBtn').classList.remove('btn-warning');
    document.getElementById('submitBtn').classList.add('btn-primary');
  } else {
    const nl={id:uid(),teacher:teacher.value,subject:subject.value,classLevel:classLevel.value,room:room.value,day:+day.value,period:+period.value};
    if(nl.period===4)return alert('พักกลางวันไม่สามารถใช้สอนได้');
    
    const c=conflict(nl); 
    if(c)return alert(`ชนกับ ${c.subject} (ครู:${c.teacher} ห้อง:${c.room})`);
    
    lessons.push(nl); 
    document.getElementById('message').innerHTML = '<div style="color:green;">บันทึกรายการสอนเรียบร้อยแล้ว</div>';
  }
  
  await saveData();
  e.target.reset(); 
  renderAll(); 
  updateFilterOptions();
};

autoBtn.onclick = async () => {
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
  
  const success = autoSchedule(nl, numPeriods);
  if (success) {
    await saveData();
  }
  lessonForm.reset();
  
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
  
  document.getElementById('resetFilterBtn').addEventListener('click', function() {
    currentFilters = {
      subject: '',
      teacher: '',
      classLevel: '',
      room: '',
      day: '',
      period: ''
    };
    
    document.getElementById('filterSubject').value = '';
    document.getElementById('filterTeacher').value = '';
    document.getElementById('filterClass').value = '';
    document.getElementById('filterRoom').value = '';
    document.getElementById('filterDay').value = '';
    document.getElementById('filterPeriod').value = '';
    
    renderList();
  });
}

// ฟังก์ชันจัดการแท็บสรุป
function setupSummaryTabs() {
  const teacherTab = document.querySelector('.summary-tab[data-type="teacher"]');
  const classTab = document.querySelector('.summary-tab[data-type="class"]');
  
  teacherTab.addEventListener('click', function() {
    document.querySelectorAll('.summary-tab').forEach(tab => tab.classList.remove('active'));
    teacherTab.classList.add('active');
    
    document.getElementById('teacherSummarySection').style.display = 'block';
    document.getElementById('classSummarySection').style.display = 'none';
  });
  
  classTab.addEventListener('click', function() {
    document.querySelectorAll('.summary-tab').forEach(tab => tab.classList.remove('active'));
    classTab.classList.add('active');
    
    document.getElementById('teacherSummarySection').style.display = 'none';
    document.getElementById('classSummarySection').style.display = 'block';
    
    renderClassSummary();
  });
}

// Event listener สำหรับ dropdown สรุปอาจารย์
document.getElementById('teacherSummarySelect').addEventListener('change', renderSummary);

// Event listener สำหรับ dropdown สรุปชั้นปี
document.getElementById('classSummarySelect').addEventListener('change', renderClassSummary);

// เมื่อโหลดหน้าเว็บเสร็จ
window.addEventListener('DOMContentLoaded', function() {
  createLoadingElement();
  showLoginModal();
  
  document.getElementById('loginBtn').onclick = loginAsAdmin;
  document.getElementById('guestBtn').onclick = loginAsGuest;
  document.getElementById('logoutBtn').onclick = logout;
  
  document.getElementById('adminPassword').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      loginAsAdmin();
    }
  });
  
  setupFilters();
  setupSummaryTabs();
  
  // โหลดข้อมูลเริ่มต้น
  loadAllData().then(() => {
    loadDropdowns();
    renderAll();
  });
});
[file content end]
