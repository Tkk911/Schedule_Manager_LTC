const periods = ["คาบ 1 (08:30-09:20)", "คาบ 2 (09:20-10:10)", "คาบ 3 (10:20-11:10)", "คาบ 4 (11:10-12:00)", "พักกลางวัน", "คาบ 5 (12:50-13:40)", "คาบ 6 (13:40-14:30)", "คาบ 7 (14:30-15:20)"];
const days = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร️"];

// URL ของ Google Apps Script
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyA3Od6AAgDKco721g5_MvfWldRugIb2EPE7HXTmc51WsARPV1hIDF0cz6KKy99heNqaQ/exec';

let lessons = [];
let teachers = [];
let classes = [];
let subjects = [];
let rooms = [];

let currentTab = "all";
let filterValue = "";
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

// ตัวแปรจัดการ loading
let loadingTimeoutId = null;
let currentLoadingOperation = null;

// =============================================
// ฟังก์ชันจัดการ Loading (แก้ไขแล้ว)
// =============================================

// ฟังก์ชันแสดง/ซ่อน loading (เวอร์ชันป้องกันการติดค้าง)
function showLoading(show, operation = 'ทั่วไป') {
  const loadingElement = document.getElementById('loading');
  
  if (loadingElement) {
    // ล้าง timeout เดิม
    if (loadingTimeoutId) {
      clearTimeout(loadingTimeoutId);
      loadingTimeoutId = null;
    }
    
    if (show) {
      currentLoadingOperation = operation;
      loadingElement.style.display = 'flex';
      console.log(`🔄 เริ่มโหลด: ${operation}`);
      
      // ตั้งค่า timeout อัตโนมัติเพื่อป้องกันการติดค้าง
      loadingTimeoutId = setTimeout(() => {
        if (loadingElement.style.display === 'flex') {
          console.warn(`⚠️ โหลดนานเกิน 30 วินาที: ${operation}`);
          document.getElementById('message').innerHTML = 
            `<div style="color:orange;">
              ⚠️ การโหลดใช้เวลานานกว่าปกติ<br>
              <small>กำลังพยายามดำเนินการ: ${operation}</small>
              <br><small>หากติดขัดนานเกินไป กรุณากดปุ่ม "ยกเลิกการโหลด"</small>
            </div>`;
        }
      }, 30000); // 30 seconds timeout
      
    } else {
      loadingElement.style.display = 'none';
      currentLoadingOperation = null;
      console.log(`✅ โหลดเสร็จสิ้น: ${operation}`);
    }
  }
}

// ฟังก์ชันบังคับซ่อน loading
function forceHideLoading() {
  console.log('🚫 บังคับซ่อน loading โดยผู้ใช้');
  
  // ล้าง timeout
  if (loadingTimeoutId) {
    clearTimeout(loadingTimeoutId);
    loadingTimeoutId = null;
  }
  
  // ซ่อน loading
  const loadingElement = document.getElementById('loading');
  if (loadingElement) {
    loadingElement.style.display = 'none';
  }
  
  currentLoadingOperation = null;
  
  document.getElementById('message').innerHTML = 
    `<div style="color:orange;">
      🚫 ยกเลิกการโหลดโดยผู้ใช้<br>
      <small>หากมีปัญหาในการโหลดข้อมูล กรุณารีเฟรชหน้าเว็บหรือลองอีกครั้ง</small>
    </div>`;
}

// ฟังก์ชันตรวจสอบสถานะการโหลด
function checkLoadingStatus() {
  const loadingElement = document.getElementById('loading');
  if (loadingElement && loadingElement.style.display === 'flex') {
    console.log(`📊 กำลังตรวจสอบสถานะการโหลด: ${currentLoadingOperation || 'ไม่ทราบการดำเนินการ'}`);
  }
}

// =============================================
// ฟังก์ชันจัดการ Google Apps Script
// =============================================

// ฟังก์ชันเรียกใช้งาน Google Apps Script แบบ POST สำหรับข้อมูลขนาดใหญ่
async function callGoogleAppsScriptPost(action, data = {}) {
  const operation = `POST ${action}`;
  console.log(`📤 เริ่ม ${operation}`);
  
  try {
    const payload = {
      action: action,
      data: data
    };
    
    // ตั้งค่า timeout สำหรับ fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 seconds
    
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log(`✅ สำเร็จ ${operation}`);
    return result;
    
  } catch (error) {
    console.error(`❌ ล้มเหลว ${operation}:`, error);
    
    if (error.name === 'AbortError') {
      throw new Error('การเชื่อมต่อใช้เวลานานเกินไป (เกิน 25 วินาที)');
    }
    
    // ลองใช้ JSONP เป็น fallback
    console.log('🔄 ลองใช้ JSONP แทน...');
    return await callGoogleAppsScript(action, data);
  }
}

// ฟังก์ชันเรียกใช้งาน Google Apps Script
async function callGoogleAppsScript(action, data = {}) {
  // ตรวจสอบขนาดข้อมูล
  const dataSize = JSON.stringify(data).length;
  
  // ถ้าข้อมูลใหญ่กว่า 10KB ให้ใช้ POST
  if (dataSize > 10000) {
    console.log(`📦 ข้อมูลใหญ่เกิน JSONP (${dataSize} bytes), ใช้ POST แทน`);
    return await callGoogleAppsScriptPost(action, data);
  }
  
  const operation = `JSONP ${action}`;
  console.log(`📤 เริ่ม ${operation}`);
  
  return new Promise((resolve, reject) => {
    const callbackName = 'gas_callback_' + Math.round(100000 * Math.random());
    
    window[callbackName] = function(response) {
      delete window[callbackName];
      if (script.parentNode) {
        document.body.removeChild(script);
      }
      clearTimeout(timeoutId);
      
      console.log(`✅ สำเร็จ ${operation}`);
      
      if (response && response.success === false && response.error && response.error.includes('Data too large')) {
        // ถ้า JSONP ล้มเหลวเพราะข้อมูลใหญ่เกินไป ให้ลองใช้ POST
        console.log('🔄 JSONP ข้อมูลใหญ่เกินไป, ลองใช้ POST...');
        callGoogleAppsScriptPost(action, data).then(resolve).catch(reject);
      } else {
        resolve(response);
      }
    };
    
    const script = document.createElement('script');
    const params = new URLSearchParams();
    params.append('action', action);
    
    // จำกัดขนาดข้อมูลสำหรับ JSONP
    if (dataSize <= 10000) {
      params.append('data', JSON.stringify(data));
    }
    
    params.append('callback', callbackName);
    params.append('rnd', Date.now());
    
    script.src = GAS_URL + '?' + params.toString();
    
    script.onerror = () => {
      delete window[callbackName];
      if (script.parentNode) {
        document.body.removeChild(script);
      }
      clearTimeout(timeoutId);
      
      console.error(`❌ ล้มเหลว ${operation}: JSONP error`);
      
      // ถ้า JSONP ล้มเหลว ให้ลองใช้ POST
      console.log('🔄 ลองใช้ POST แทน...');
      callGoogleAppsScriptPost(action, data).then(resolve).catch(reject);
    };
    
    document.body.appendChild(script);
    
    const timeoutId = setTimeout(() => {
      if (window[callbackName]) {
        delete window[callbackName];
        if (script.parentNode) {
          document.body.removeChild(script);
        }
        console.error(`❌ ล้มเหลว ${operation}: Timeout 20 วินาที`);
        reject(new Error('การเชื่อมต่อใช้เวลานานเกินไป (เกิน 20 วินาที)'));
      }
    }, 20000);
  });
}

// ฟังก์ชันทดสอบการเชื่อมต่อ
async function testSimpleConnection() {
  try {
    showLoading(true, 'ทดสอบการเชื่อมต่อ');
    
    console.log('🔗 กำลังทดสอบการเชื่อมต่อ Google Sheets...');
    
    const result = await callGoogleAppsScript('ping');
    
    if (result && result.success) {
      document.getElementById('message').innerHTML = 
        `<div style="color:green;">
          ✅ การเชื่อมต่อทำงานปกติ!<br>
          <small>${result.message || 'เชื่อมต่อสำเร็จ'}</small>
        </div>`;
      return result;
    } else {
      throw new Error(result?.error || 'Failed to connect');
    }
  } catch (error) {
    console.error('❌ การทดสอบการเชื่อมต่อล้มเหลว:', error);
    
    const errorHtml = `
      <div style="color:red;">
        ❌ การเชื่อมต่อล้มเหลว<br>
        <small>${error.message}</small>
        <br><br>
        <strong>วิธีแก้ไข:</strong><br>
        1. <a href="${GAS_URL}?action=test" target="_blank" style="color:white;text-decoration:underline;">เปิด Google Apps Script โดยตรง</a><br>
        2. อนุญาตการเข้าถึงถ้ายังไม่เคยทำ<br>
        3. รีเฟรชหน้านี้ใหม่<br>
        4. หรือใช้โหมดออฟไลน์ (ข้อมูลจะถูกบันทึกในเบราว์เซอร์)
      </div>
    `;
    
    document.getElementById('message').innerHTML = errorHtml;
    return null;
  } finally {
    showLoading(false, 'ทดสอบการเชื่อมต่อ');
  }
}

// ฟังก์ชันตรวจสอบและซ่อมแซมข้อมูล
function validateAndRepairData() {
  console.log('🔧 กำลังตรวจสอบและซ่อมแซมข้อมูล...');
  
  if (!teachers || !Array.isArray(teachers)) {
    console.warn('⚠️ Teachers array is invalid, resetting...');
    teachers = [];
  } else {
    teachers = teachers.filter(teacher => 
      teacher && typeof teacher === 'string' && teacher.trim() !== ''
    ).map(teacher => teacher.trim());
  }
  
  if (!classes || !Array.isArray(classes)) {
    console.warn('⚠️ Classes array is invalid, resetting...');
    classes = [];
  } else {
    classes = classes.filter(cls => 
      cls && typeof cls === 'string' && cls.trim() !== ''
    ).map(cls => cls.trim());
  }
  
  if (!subjects || !Array.isArray(subjects)) {
    console.warn('⚠️ Subjects array is invalid, resetting...');
    subjects = [];
  } else {
    subjects = subjects.filter(subject => 
      subject && typeof subject === 'string' && subject.trim() !== ''
    ).map(subject => subject.trim());
  }
  
  if (!rooms || !Array.isArray(rooms)) {
    console.warn('⚠️ Rooms array is invalid, resetting...');
    rooms = [];
  } else {
    rooms = rooms.filter(room => 
      room && typeof room === 'string' && room.trim() !== ''
    ).map(room => room.trim());
  }
  
  if (!lessons || !Array.isArray(lessons)) {
    console.warn('⚠️ Lessons array is invalid, resetting...');
    lessons = [];
  } else {
    lessons = lessons.filter(lesson => {
      if (!lesson || typeof lesson !== 'object') return false;
      
      lesson.id = lesson.id || uid();
      lesson.teacher = lesson.teacher || '';
      lesson.subject = lesson.subject || '';
      lesson.classLevel = lesson.classLevel || '';
      lesson.room = lesson.room || '';
      lesson.day = typeof lesson.day === 'number' ? lesson.day : parseInt(lesson.day) || 0;
      lesson.period = typeof lesson.period === 'number' ? lesson.period : parseInt(lesson.period) || 0;
      
      return lesson.teacher && lesson.subject;
    });
  }
  
  console.log('✅ ตรวจสอบและซ่อมแซมข้อมูลสำเร็จ:', {
    teachers: teachers.length,
    classes: classes.length,
    subjects: subjects.length,
    rooms: rooms.length,
    lessons: lessons.length
  });
}

// ฟังก์ชันโหลดจาก Local Storage
function loadFromLocalStorage() {
  console.log('💾 กำลังโหลดข้อมูลจาก Local Storage...');
  
  try {
    teachers = JSON.parse(localStorage.getItem('teachers')) || [];
    classes = JSON.parse(localStorage.getItem('classes')) || [];
    subjects = JSON.parse(localStorage.getItem('subjects')) || [];
    rooms = JSON.parse(localStorage.getItem('rooms')) || [];
    lessons = JSON.parse(localStorage.getItem('lessons')) || [];
    
    validateAndRepairData();
    
    if (teachers.length === 0 && classes.length === 0 && subjects.length === 0 && rooms.length === 0) {
      console.log('📝 ไม่พบข้อมูล, ใช้ข้อมูลตัวอย่าง...');
      teachers = ['ครูสมชาย', 'ครูสมหญิง', 'ครูนิดา'];
      classes = ['ปวช.1/1', 'ปวช.1/2', 'ปวช.2/1'];
      subjects = ['คณิตศาสตร์', 'วิทยาศาสตร์', 'ภาษาอังกฤษ'];
      rooms = ['ห้อง 101', 'ห้อง 102', 'ห้อง Lab 1'];
      lessons = [];
      
      backupToLocalStorage({ teachers, classes, subjects, rooms, lessons });
    }
    
    const totalLessons = lessons.length;
    document.getElementById('message').innerHTML = 
      `<div style="color:orange;">
        📱 ใช้ข้อมูลจาก Local Storage<br>
        <small>ครู: ${teachers.length} ท่าน | วิชา: ${subjects.length} รายการ | ตารางเรียน: ${totalLessons} คาบ</small>
      </div>`;
      
  } catch (error) {
    console.error('❌ ข้อผิดพลาดในการโหลดข้อมูล Local Storage:', error);
    teachers = ['ครูสมชาย', 'ครูสมหญิง', 'ครูนิดา'];
    classes = ['ปวช.1/1', 'ปวช.1/2', 'ปวช.2/1'];
    subjects = ['คณิตศาสตร์', 'วิทยาศาสตร์', 'ภาษาอังกฤษ'];
    rooms = ['ห้อง 101', 'ห้อง 102', 'ห้อง Lab 1'];
    lessons = [];
    
    backupToLocalStorage({ teachers, classes, subjects, rooms, lessons });
    
    document.getElementById('message').innerHTML = 
      `<div style="color:red;">
        ❌ เกิดข้อผิดพลาดในการโหลดข้อมูล Local Storage<br>
        <small>ใช้ข้อมูลตัวอย่างแทน</small>
      </div>`;
  }
}

// ฟังก์ชันโหลดข้อมูลทั้งหมดจาก Google Sheet
async function loadAllData() {
  let loadingShown = false;
  
  try {
    showLoading(true, 'โหลดข้อมูลจาก Google Sheets');
    loadingShown = true;
    
    console.log('📥 เริ่มโหลดข้อมูลจาก Google Sheets...');
    
    const testResult = await testSimpleConnection();
    if (!testResult || !testResult.success) {
      throw new Error('Cannot connect to Google Sheets');
    }
    
    const data = await callGoogleAppsScript('getAllData');
    
    if (data && data.success) {
      teachers = data.teachers || [];
      classes = data.classes || [];
      subjects = data.subjects || [];
      rooms = data.rooms || [];
      lessons = data.lessons || [];
      
      validateAndRepairData();
      backupToLocalStorage({ teachers, classes, subjects, rooms, lessons });
      
      console.log('✅ โหลดข้อมูลจาก Google Sheets สำเร็จ');
      
      // แสดงสถิติข้อมูล
      const statsHtml = showDataStatistics();
      
      document.getElementById('message').innerHTML = 
        `<div style="color:green;">
          ✅ โหลดข้อมูลจาก Google Sheets สำเร็จ<br>
          <small>ครู: ${teachers.length} ท่าน | วิชา: ${subjects.length} รายการ | ตารางเรียน: ${lessons.length} คาบ</small>
        </div>
        ${statsHtml}`;
    } else {
      throw new Error(data?.error || 'Failed to load data from server');
    }
  } catch (error) {
    console.error('❌ ข้อผิดพลาดในการโหลดข้อมูลจาก Google Sheets:', error);
    
    loadFromLocalStorage();
    
    // แสดงสถิติข้อมูลแม้ในโหมดออฟไลน์
    const statsHtml = showDataStatistics();
    
    document.getElementById('message').innerHTML = 
      `<div style="color:orange;">
        📱 ใช้ข้อมูลจาก Local Storage (ออฟไลน์)<br>
        <small>${error.message}</small>
        <br>
        <a href="${GAS_URL}?action=test" target="_blank" style="color:blue;text-decoration:underline;">คลิกที่นี่เพื่อตั้งค่า Google Apps Script</a>
      </div>
      ${statsHtml}`;
  } finally {
    if (loadingShown) {
      showLoading(false, 'โหลดข้อมูลจาก Google Sheets');
    }
  }
}

// ฟังก์ชันบันทึกข้อมูลทั้งหมดไปยัง Google Sheet (เวอร์ชันป้องกันการติดค้าง)
async function saveAllData() {
  let loadingShown = false;
  
  try {
    showLoading(true, 'บันทึกข้อมูลไปยัง Google Sheets');
    loadingShown = true;
    
    const dataToSave = {
      teachers: teachers || [],
      classes: classes || [],
      subjects: subjects || [],
      rooms: rooms || [],
      lessons: lessons || []
    };
    
    const dataSize = JSON.stringify(dataToSave).length;
    console.log('💾 กำลังบันทึกข้อมูลไปยัง Google Sheets...', {
      teachers: dataToSave.teachers.length,
      classes: dataToSave.classes.length,
      subjects: dataToSave.subjects.length,
      rooms: dataToSave.rooms.length,
      lessons: dataToSave.lessons.length,
      totalSize: dataSize + ' bytes'
    });
    
    if (dataToSave.teachers.length === 0 && 
        dataToSave.classes.length === 0 && 
        dataToSave.subjects.length === 0 && 
        dataToSave.rooms.length === 0 && 
        dataToSave.lessons.length === 0) {
      throw new Error('ไม่มีข้อมูลที่จะบันทึก');
    }
    
    // เลือกวิธีบันทึกตามขนาดข้อมูลเพื่อความเร็ว
    let action;
    if (dataSize > 100000) { // ข้อมูลใหญ่มาก
      action = 'saveLargeData';
    } else if (dataSize > 50000) { // ข้อมูลขนาดกลาง
      action = 'saveAllDataFast';
    } else { // ข้อมูลขนาดเล็ก
      action = 'saveAllData';
    }
    
    console.log(`🎯 ใช้ action: ${action} สำหรับข้อมูลขนาด: ${dataSize} bytes`);
    
    // ตั้งค่า timeout สำหรับการบันทึก
    const savePromise = callGoogleAppsScript(action, dataToSave);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('การบันทึกข้อมูลใช้เวลานานเกินไป (เกิน 30 วินาที)')), 30000);
    });
    
    const result = await Promise.race([savePromise, timeoutPromise]);
    
    if (result && result.success) {
      backupToLocalStorage(dataToSave);
      
      const timeMsg = result.executionTime ? ` ใน ${result.executionTime} วินาที` : '';
      console.log('✅ บันทึกข้อมูลลง Google Sheets สำเร็จ' + timeMsg);
      document.getElementById('message').innerHTML = 
        `<div style="color:green;">
          ✅ บันทึกข้อมูลลง Google Sheets สำเร็จ${timeMsg}<br>
          <small>${result.message || 'บันทึกข้อมูลเรียบร้อย'}</small>
          ${result.stats ? `<br><small>ครู: ${result.stats.teachers || 0} | วิชา: ${result.stats.subjects || 0} | ตารางเรียน: ${result.stats.lessons || 0}</small>` : ''}
        </div>`;
      return true;
    } else {
      throw new Error(result?.error || 'Failed to save data to Google Sheets');
    }
  } catch (error) {
    console.error('❌ ข้อผิดพลาดในการบันทึกข้อมูลไปยัง Google Sheets:', error);
    
    // บันทึกลง Local Storage เป็น fallback
    backupToLocalStorage({ 
      teachers: teachers || [], 
      classes: classes || [], 
      subjects: subjects || [], 
      rooms: rooms || [], 
      lessons: lessons || [] 
    });
    
    document.getElementById('message').innerHTML = 
      `<div style="color:orange;">
        📱 บันทึกข้อมูลลง Local Storage (ทำงานในโหมดออฟไลน์)<br>
        <small>${error.message}</small>
        <br><br>
        <strong>สาเหตุที่อาจเกิดขึ้น:</strong><br>
        • ข้อมูลมีขนาดใหญ่เกินไปสำหรับการส่งผ่าน<br>
        • การเชื่อมต่ออินเทอร์เน็ตมีปัญหา<br>
        • Google Apps Script เกินโควต้า<br>
        • การบันทึกใช้เวลานานเกินไป<br>
        <br>
        <strong>คำแนะนำ:</strong><br>
        • ข้อมูลถูกบันทึกในเบราว์เซอร์แล้ว<br>
        • สามารถส่งข้อมูลไป Google Sheets ได้ภายหลัง<br>
        • หรือใช้ปุ่ม "ส่งข้อมูลไป Google Sheets" เมื่อการเชื่อมต่อดีขึ้น
      </div>`;
    return false;
  } finally {
    // รับประกันว่าจะซ่อน loading ไม่ว่ากรณีใดๆ
    if (loadingShown) {
      showLoading(false, 'บันทึกข้อมูลไปยัง Google Sheets');
    }
  }
}

// ฟังก์ชันบันทึกข้อมูลลง Local Storage
function backupToLocalStorage(data) {
  if (data.teachers) localStorage.setItem('teachers', JSON.stringify(data.teachers));
  if (data.classes) localStorage.setItem('classes', JSON.stringify(data.classes));
  if (data.subjects) localStorage.setItem('subjects', JSON.stringify(data.subjects));
  if (data.rooms) localStorage.setItem('rooms', JSON.stringify(data.rooms));
  if (data.lessons) localStorage.setItem('lessons', JSON.stringify(data.lessons));
  
  console.log('💾 สำรองข้อมูลลง Local Storage สำเร็จ');
}

// =============================================
// ฟังก์ชันจัดการ Google Sheets
// =============================================

// ฟังก์ชันส่งข้อมูลไปยัง Google Sheets
async function exportToGoogleSheets() {
  if (preventGuestAction("ส่งข้อมูลไปยัง Google Sheets")) return;
  
  let loadingShown = false;
  
  try {
    showLoading(true, 'ส่งข้อมูลไปยัง Google Sheets');
    loadingShown = true;
    
    const exportData = {
      teachers: teachers,
      classes: classes,
      subjects: subjects,
      rooms: rooms,
      lessons: lessons
    };
    
    console.log('📤 กำลังส่งข้อมูลไปยัง Google Sheets...', {
      teachers: teachers.length,
      classes: classes.length,
      subjects: subjects.length,
      rooms: rooms.length,
      lessons: lessons.length
    });
    
    const result = await callGoogleAppsScript('exportToSheets', exportData);
    
    if (result && result.success) {
      document.getElementById('message').innerHTML = 
        `<div style="color:green;">
          ✅ ส่งข้อมูลไปยัง Google Sheets สำเร็จแล้ว<br>
          ${result.spreadsheetUrl ? `<a href="${result.spreadsheetUrl}" target="_blank" style="color:white;text-decoration:underline;">📊 เปิด Google Sheets</a><br>` : ''}
          <small>${result.message}</small>
        </div>`;
    } else {
      throw new Error(result?.error || 'Failed to export to Google Sheets');
    }
  } catch (error) {
    console.error('❌ ข้อผิดพลาดในการส่งข้อมูลไปยัง Google Sheets:', error);
    document.getElementById('message').innerHTML = 
      `<div style="color:orange;">
        📱 บันทึกข้อมูลลง Local Storage (ทำงานในโหมดออฟไลน์)<br>
        <small>${error.message}</small>
      </div>`;
  } finally {
    if (loadingShown) {
      showLoading(false, 'ส่งข้อมูลไปยัง Google Sheets');
    }
  }
}

// ฟังก์ชันนำเข้าข้อมูลจาก Google Sheets
async function importFromGoogleSheets() {
  if (preventGuestAction("นำเข้าข้อมูลจาก Google Sheets")) return;
  
  let loadingShown = false;
  
  try {
    showLoading(true, 'นำเข้าข้อมูลจาก Google Sheets');
    loadingShown = true;
    
    console.log('📥 กำลังนำเข้าข้อมูลจาก Google Sheets...');
    const result = await callGoogleAppsScript('importFromSheets');
    
    if (result && result.success) {
      teachers = result.teachers || [];
      classes = result.classes || [];
      subjects = result.subjects || [];
      rooms = result.rooms || [];
      lessons = result.lessons || [];
      
      validateAndRepairData();
      backupToLocalStorage({ teachers, classes, subjects, rooms, lessons });
      
      loadDropdowns();
      renderAll();
      
      document.getElementById('message').innerHTML = 
        `<div style="color:green;">
          ✅ นำเข้าข้อมูลจาก Google Sheets สำเร็จแล้ว<br>
          ${result.spreadsheetUrl ? `<a href="${result.spreadsheetUrl}" target="_blank" style="color:white;text-decoration:underline;">📊 เปิด Google Sheets</a><br>` : ''}
          <small>ครู: ${teachers.length} ท่าน | วิชา: ${subjects.length} รายการ | ตารางเรียน: ${lessons.length} คาบ</small>
        </div>`;
    } else {
      throw new Error(result?.error || 'Failed to import from Google Sheets');
    }
  } catch (error) {
    console.error('❌ ข้อผิดพลาดในการนำเข้าข้อมูลจาก Google Sheets:', error);
    document.getElementById('message').innerHTML = 
      `<div style="color:red;">
        ❌ เกิดข้อผิดพลาดในการนำเข้าข้อมูล<br>
        <small>${error.message}</small>
      </div>`;
  } finally {
    if (loadingShown) {
      showLoading(false, 'นำเข้าข้อมูลจาก Google Sheets');
    }
  }
}

// =============================================
// ฟังก์ชันจัดการระบบล็อกอิน
// =============================================

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
    userStatus.style.fontWeight = "bold";
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
  
  const jsonButtons = document.querySelectorAll('#downloadJsonBtn, #importJsonBtn, #exportToSheetsBtn, #importFromSheetsBtn, #exportToSheetsChunkBtn');
  jsonButtons.forEach(button => {
    button.style.display = show ? 'inline-block' : 'none';
  });
  
  document.getElementById('autoBtn').style.display = show ? 'inline-block' : 'none';
  document.getElementById('resetBtn').style.display = show ? 'inline-block' : 'none';
  document.getElementById('testConnectionBtn').style.display = show ? 'inline-block' : 'none';
  document.getElementById('clearDataBtn').style.display = show ? 'inline-block' : 'none';
  document.getElementById('debugBtn').style.display = show ? 'inline-block' : 'none';
}

// ฟังก์ชันล็อกอิน
function loginAsAdmin() {
  const password = document.getElementById('adminPassword').value;
  const messageDiv = document.getElementById('loginMessage');
  
  if (password === ADMIN_PASSWORD) {
    hideLoginModal();
    setUserMode(true);
    messageDiv.innerHTML = '';
    
    loadAllData().then(() => {
      loadDropdowns();
      renderAll();
    });
  } else {
    messageDiv.innerHTML = '<div style="color:red;">❌ รหัสผ่านไม่ถูกต้อง</div>';
  }
}

// ฟังก์ชันเข้าสู่ระบบเป็นผู้เยี่ยมชม
function loginAsGuest() {
  hideLoginModal();
  setUserMode(false);
  
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
    alert(`🚫 คุณอยู่ในโหมดผู้เยี่ยมชม\nไม่สามารถ${actionName}ได้\n\nกรุณาล็อกอินเป็นผู้ดูแลระบบเพื่อใช้งานฟังก์ชันนี้`);
    return true;
  }
  return false;
}

// =============================================
// ฟังก์ชันจัดการข้อมูลพื้นฐาน
// =============================================

// ฟังก์ชันโหลดข้อมูลลง dropdown
function loadDropdowns() {
  const teacherSelect = document.getElementById('teacher');
  const classSelect = document.getElementById('classLevel');
  const subjectSelect = document.getElementById('subject');
  const roomSelect = document.getElementById('room');
  
  // จำกัดจำนวนตัวเลือกใน dropdown เพื่อประสิทธิภาพ
  const dropdownLimit = 500;
  
  teacherSelect.innerHTML = '<option value="">เลือกอาจารย์</option>';
  const teachersToShow = teachers.length > dropdownLimit ? 
    teachers.slice(0, dropdownLimit) : teachers;
  teachersToShow.forEach(teacher => {
    teacherSelect.innerHTML += `<option value="${teacher}">${teacher}</option>`;
  });
  if (teachers.length > dropdownLimit) {
    teacherSelect.innerHTML += `<option value="" disabled>... และอีก ${teachers.length - dropdownLimit} รายการ</option>`;
  }
  
  classSelect.innerHTML = '<option value="">เลือกชั้นเรียน</option>';
  const classesToShow = classes.length > dropdownLimit ? 
    classes.slice(0, dropdownLimit) : classes;
  classesToShow.forEach(cls => {
    classSelect.innerHTML += `<option value="${cls}">${cls}</option>`;
  });
  if (classes.length > dropdownLimit) {
    classSelect.innerHTML += `<option value="" disabled>... และอีก ${classes.length - dropdownLimit} รายการ</option>`;
  }
  
  subjectSelect.innerHTML = '<option value="">เลือกรายวิชา</option>';
  const subjectsToShow = subjects.length > dropdownLimit ? 
    subjects.slice(0, dropdownLimit) : subjects;
  subjectsToShow.forEach(subject => {
    subjectSelect.innerHTML += `<option value="${subject}">${subject}</option>`;
  });
  if (subjects.length > dropdownLimit) {
    subjectSelect.innerHTML += `<option value="" disabled>... และอีก ${subjects.length - dropdownLimit} รายการ</option>`;
  }
  
  roomSelect.innerHTML = '<option value="">เลือกห้อง</option>';
  const roomsToShow = rooms.length > dropdownLimit ? 
    rooms.slice(0, dropdownLimit) : rooms;
  roomsToShow.forEach(room => {
    roomSelect.innerHTML += `<option value="${room}">${room}</option>`;
  });
  if (rooms.length > dropdownLimit) {
    roomSelect.innerHTML += `<option value="" disabled>... และอีก ${rooms.length - dropdownLimit} รายการ</option>`;
  }
  
  renderDataLists();
  loadTeacherSummaryDropdown();
  loadFilterOptions();
}

// ฟังก์ชันโหลด dropdown สำหรับเลือกอาจารย์ในสรุป
function loadTeacherSummaryDropdown() {
  const teacherSummarySelect = document.getElementById('teacherSummarySelect');
  teacherSummarySelect.innerHTML = '<option value="all">แสดงทั้งหมด</option>';
  
  // จำกัดจำนวนตัวเลือกใน dropdown สรุป
  const summaryLimit = 200;
  const teachersToShow = teachers.length > summaryLimit ? 
    teachers.slice(0, summaryLimit) : teachers;
  
  teachersToShow.forEach(teacher => {
    teacherSummarySelect.innerHTML += `<option value="${teacher}">${teacher}</option>`;
  });
  if (teachers.length > summaryLimit) {
    teacherSummarySelect.innerHTML += `<option value="" disabled>... และอีก ${teachers.length - summaryLimit} รายการ</option>`;
  }
}

// ฟังก์ชันโหลดตัวเลือกใน dropdown กรอง
function loadFilterOptions() {
  const filterSubject = document.getElementById('filterSubject');
  filterSubject.innerHTML = '<option value="">ทั้งหมด</option>';
  // จำกัดจำนวนตัวเลือกในฟิลเตอร์
  const filterLimit = 200;
  const subjectsToShow = subjects.length > filterLimit ? 
    subjects.slice(0, filterLimit) : subjects;
  subjectsToShow.forEach(subject => {
    filterSubject.innerHTML += `<option value="${subject}">${subject}</option>`;
  });
  if (subjects.length > filterLimit) {
    filterSubject.innerHTML += `<option value="" disabled>... และอีก ${subjects.length - filterLimit} รายการ</option>`;
  }
  
  const filterTeacher = document.getElementById('filterTeacher');
  filterTeacher.innerHTML = '<option value="">ทั้งหมด</option>';
  const teachersToShow = teachers.length > filterLimit ? 
    teachers.slice(0, filterLimit) : teachers;
  teachersToShow.forEach(teacher => {
    filterTeacher.innerHTML += `<option value="${teacher}">${teacher}</option>`;
  });
  if (teachers.length > filterLimit) {
    filterTeacher.innerHTML += `<option value="" disabled>... และอีก ${teachers.length - filterLimit} รายการ</option>`;
  }
  
  const filterClass = document.getElementById('filterClass');
  filterClass.innerHTML = '<option value="">ทั้งหมด</option>';
  const classesToShow = classes.length > filterLimit ? 
    classes.slice(0, filterLimit) : classes;
  classesToShow.forEach(cls => {
    filterClass.innerHTML += `<option value="${cls}">${cls}</option>`;
  });
  if (classes.length > filterLimit) {
    filterClass.innerHTML += `<option value="" disabled>... และอีก ${classes.length - filterLimit} รายการ</option>`;
  }
  
  const filterRoom = document.getElementById('filterRoom');
  filterRoom.innerHTML = '<option value="">ทั้งหมด</option>';
  const roomsToShow = rooms.length > filterLimit ? 
    rooms.slice(0, filterLimit) : rooms;
  roomsToShow.forEach(room => {
    filterRoom.innerHTML += `<option value="${room}">${room}</option>`;
  });
  if (rooms.length > filterLimit) {
    filterRoom.innerHTML += `<option value="" disabled>... และอีก ${rooms.length - filterLimit} รายการ</option>`;
  }
  
  const classSummarySelect = document.getElementById('classSummarySelect');
  classSummarySelect.innerHTML = '<option value="all">แสดงทั้งหมด</option>';
  const classesSummaryToShow = classes.length > filterLimit ? 
    classes.slice(0, filterLimit) : classes;
  classesSummaryToShow.forEach(cls => {
    classSummarySelect.innerHTML += `<option value="${cls}">${cls}</option>`;
  });
  if (classes.length > filterLimit) {
    classSummarySelect.innerHTML += `<option value="" disabled>... และอีก ${classes.length - filterLimit} รายการ</option>`;
  }
}

// ฟังก์ชันแสดงข้อมูลในลิสต์
function renderDataLists() {
  const listLimit = 50; // จำกัดการแสดงผลในลิสต์
  
  const teacherList = document.getElementById('teacherList');
  if (teacherList) {
    teacherList.innerHTML = '';
    const teachersToShow = teachers.slice(0, listLimit);
    teachersToShow.forEach((teacher, index) => {
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
    if (teachers.length > listLimit) {
      teacherList.innerHTML += `
        <div class="data-item" style="justify-content: center; color: #666; font-style: italic;">
          ... และอีก ${teachers.length - listLimit} รายการ
        </div>
      `;
    }
  }
  
  // ทำแบบเดียวกันสำหรับ classList, subjectList, roomList
  const classList = document.getElementById('classList');
  if (classList) {
    classList.innerHTML = '';
    const classesToShow = classes.slice(0, listLimit);
    classesToShow.forEach((cls, index) => {
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
    if (classes.length > listLimit) {
      classList.innerHTML += `
        <div class="data-item" style="justify-content: center; color: #666; font-style: italic;">
          ... และอีก ${classes.length - listLimit} รายการ
        </div>
      `;
    }
  }
  
  const subjectList = document.getElementById('subjectList');
  if (subjectList) {
    subjectList.innerHTML = '';
    const subjectsToShow = subjects.slice(0, listLimit);
    subjectsToShow.forEach((subject, index) => {
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
    if (subjects.length > listLimit) {
      subjectList.innerHTML += `
        <div class="data-item" style="justify-content: center; color: #666; font-style: italic;">
          ... และอีก ${subjects.length - listLimit} รายการ
        </div>
      `;
    }
  }
  
  const roomList = document.getElementById('roomList');
  if (roomList) {
    roomList.innerHTML = '';
    const roomsToShow = rooms.slice(0, listLimit);
    roomsToShow.forEach((room, index) => {
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
    if (rooms.length > listLimit) {
      roomList.innerHTML += `
        <div class="data-item" style="justify-content: center; color: #666; font-style: italic;">
          ... และอีก ${rooms.length - listLimit} รายการ
        </div>
      `;
    }
  }
}

// =============================================
// ฟังก์ชันเพิ่ม/ลบ/แก้ไข ข้อมูลพื้นฐาน
// =============================================

// ฟังก์ชันเพิ่มข้อมูล
document.getElementById('addTeacher').onclick = async () => {
  if (preventGuestAction("เพิ่มอาจารย์")) return;
  
  const newTeacher = document.getElementById('newTeacher').value.trim();
  if (newTeacher && !teachers.includes(newTeacher)) {
    teachers.push(newTeacher);
    await saveAllData();
    loadDropdowns();
    document.getElementById('newTeacher').value = '';
    document.getElementById('message').innerHTML = '<div style="color:green;">✅ เพิ่มอาจารย์เรียบร้อยแล้ว</div>';
  } else if (!newTeacher) {
    document.getElementById('message').innerHTML = '<div style="color:red;">❌ กรุณากรอกชื่ออาจารย์</div>';
  } else {
    document.getElementById('message').innerHTML = '<div style="color:red;">❌ มีอาจารย์ชื่อนี้อยู่ในระบบแล้ว</div>';
  }
};

document.getElementById('addClass').onclick = async () => {
  if (preventGuestAction("เพิ่มชั้นเรียน")) return;
  
  const newClass = document.getElementById('newClass').value.trim();
  if (newClass && !classes.includes(newClass)) {
    classes.push(newClass);
    await saveAllData();
    loadDropdowns();
    document.getElementById('newClass').value = '';
    document.getElementById('message').innerHTML = '<div style="color:green;">✅ เพิ่มชั้นเรียนเรียบร้อยแล้ว</div>';
  } else if (!newClass) {
    document.getElementById('message').innerHTML = '<div style="color:red;">❌ กรุณากรอกชื่อชั้นเรียน</div>';
  } else {
    document.getElementById('message').innerHTML = '<div style="color:red;">❌ มีชั้นเรียนนี้อยู่ในระบบแล้ว</div>';
  }
};

document.getElementById('addSubject').onclick = async () => {
  if (preventGuestAction("เพิ่มรายวิชา")) return;
  
  const newSubject = document.getElementById('newSubject').value.trim();
  if (newSubject && !subjects.includes(newSubject)) {
    subjects.push(newSubject);
    await saveAllData();
    loadDropdowns();
    document.getElementById('newSubject').value = '';
    document.getElementById('message').innerHTML = '<div style="color:green;">✅ เพิ่มรายวิชาเรียบร้อยแล้ว</div>';
  } else if (!newSubject) {
    document.getElementById('message').innerHTML = '<div style="color:red;">❌ กรุณากรอกชื่อรายวิชา</div>';
  } else {
    document.getElementById('message').innerHTML = '<div style="color:red;">❌ มีรายวิชานี้อยู่ในระบบแล้ว</div>';
  }
};

document.getElementById('addRoom').onclick = async () => {
  if (preventGuestAction("เพิ่มห้อง")) return;
  
  const newRoom = document.getElementById('newRoom').value.trim();
  if (newRoom && !rooms.includes(newRoom)) {
    rooms.push(newRoom);
    await saveAllData();
    loadDropdowns();
    document.getElementById('newRoom').value = '';
    document.getElementById('message').innerHTML = '<div style="color:green;">✅ เพิ่มห้องเรียบร้อยแล้ว</div>';
  } else if (!newRoom) {
    document.getElementById('message').innerHTML = '<div style="color:red;">❌ กรุณากรอกชื่อห้อง</div>';
  } else {
    document.getElementById('message').innerHTML = '<div style="color:red;">❌ มีห้องนี้อยู่ในระบบแล้ว</div>';
  }
};

// ฟังก์ชันลบข้อมูล
async function removeTeacher(index) {
  if (preventGuestAction("ลบอาจารย์")) return;
  
  const teacherName = teachers[index];
  
  const isUsed = lessons.some(lesson => lesson.teacher === teacherName);
  
  if (isUsed) {
    if (!confirm(`⚠️ อาจารย์ "${teacherName}" ถูกใช้ในตารางเรียนแล้ว\nการลบอาจส่งผลต่อตารางเรียน\nต้องการลบต่อหรือไม่?`)) {
      return;
    }
  }
  
  teachers.splice(index, 1);
  await saveAllData();
  loadDropdowns();
  document.getElementById('message').innerHTML = '<div style="color:green;">✅ ลบอาจารย์เรียบร้อยแล้ว</div>';
}

async function removeClass(index) {
  if (preventGuestAction("ลบชั้นเรียน")) return;
  
  const className = classes[index];
  
  const isUsed = lessons.some(lesson => lesson.classLevel === className);
  
  if (isUsed) {
    if (!confirm(`⚠️ ชั้นเรียน "${className}" ถูกใช้ในตารางเรียนแล้ว\nการลบอาจส่งผลต่อตารางเรียน\nต้องการลบต่อหรือไม่?`)) {
      return;
    }
  }
  
  classes.splice(index, 1);
  await saveAllData();
  loadDropdowns();
  document.getElementById('message').innerHTML = '<div style="color:green;">✅ ลบชั้นเรียนเรียบร้อยแล้ว</div>';
}

async function removeSubject(index) {
  if (preventGuestAction("ลบรายวิชา")) return;
  
  const subjectName = subjects[index];
  
  const isUsed = lessons.some(lesson => lesson.subject === subjectName);
  
  if (isUsed) {
    if (!confirm(`⚠️ รายวิชา "${subjectName}" ถูกใช้ในตารางเรียนแล้ว\nการลบอาจส่งผลต่อตารางเรียน\nต้องการลบต่อหรือไม่?`)) {
      return;
    }
  }
  
  subjects.splice(index, 1);
  await saveAllData();
  loadDropdowns();
  document.getElementById('message').innerHTML = '<div style="color:green;">✅ ลบรายวิชาเรียบร้อยแล้ว</div>';
}

async function removeRoom(index) {
  if (preventGuestAction("ลบห้อง")) return;
  
  const roomName = rooms[index];
  
  const isUsed = lessons.some(lesson => lesson.room === roomName);
  
  if (isUsed) {
    if (!confirm(`⚠️ ห้อง "${roomName}" ถูกใช้ในตารางเรียนแล้ว\nการลบอาจส่งผลต่อตารางเรียน\nต้องการลบต่อหรือไม่?`)) {
      return;
    }
  }
  
  rooms.splice(index, 1);
  await saveAllData();
  loadDropdowns();
  document.getElementById('message').innerHTML = '<div style="color:green;">✅ ลบห้องเรียบร้อยแล้ว</div>';
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
  
  // อัพเดทข้อมูลใน lessons ที่เกี่ยวข้อง
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
  
  await saveAllData();
  loadDropdowns();
  renderAll();
  
  document.getElementById('editModal').style.display = 'none';
  document.getElementById('message').innerHTML = '<div style="color:green;">✅ แก้ไขข้อมูลเรียบร้อยแล้ว</div>';
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

// =============================================
// ฟังก์ชันจัดการตารางเรียน
// =============================================

function uid() {
  return Date.now().toString() + Math.random().toString(16).slice(2);
}

function renderAll() {
  renderGrid();
  renderList();
  renderSummary();
  renderClassSummary();
}

function renderGrid() {
  const body = document.getElementById('gridBody');
  body.innerHTML = '';
  days.forEach((d, di) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><strong>${d}</strong></td>`;
    periods.forEach((p, pi) => {
      const td = document.createElement('td');
      if (pi === 4) {
        td.innerHTML = '<div class="small" style="background:#fef3c7; padding:8px; border-radius:4px;">🍱 พักกลางวัน</div>';
      } else {
        let filtered = lessons.filter(l => l.day === di && l.period === pi);

        if (currentTab === "teacher" && filterValue) {
          filtered = filtered.filter(l => l.teacher === filterValue);
        }
        if (currentTab === "class" && filterValue) {
          filtered = filtered.filter(l => l.classLevel === filterValue);
        }
        if (currentTab === "room" && filterValue) {
          filtered = filtered.filter(l => l.room === filterValue);
        }

        filtered.forEach(it => {
          td.innerHTML += `
            <div class="tag">
              <strong>${it.subject}</strong>
              <div class="small">👨‍🏫 ${it.teacher}</div>
              <div class="small">👥 ${it.classLevel} | 🏠 ${it.room}</div>
            </div>`;
        });
      }
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });
}

// ปรับปรุงฟังก์ชัน renderList สำหรับข้อมูลจำนวนมาก
function renderList() {
  const tb = document.querySelector('#lessonTable tbody');
  if (!tb) return;
  
  // ล้างข้อมูลเดิม
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
  
  // จำกัดการแสดงผลเพื่อประสิทธิภาพ
  const displayLimit = 1000;
  const displayAll = filteredLessons.length <= displayLimit;
  const lessonsToDisplay = displayAll ? filteredLessons : filteredLessons.slice(0, displayLimit);
  
  const tableHeader = document.querySelector('#lessonTable').closest('.card').querySelector('h2');
  const originalTitle = 'รายการจัดการเรียนทั้งหมด';
  
  let titleSuffix = '';
  if (Object.values(currentFilters).some(filter => filter !== '')) {
    titleSuffix = ` (${filteredLessons.length} รายการ${!displayAll ? `, แสดง ${displayLimit} รายการแรก` : ''})`;
  } else if (!displayAll) {
    titleSuffix = ` (แสดง ${displayLimit} รายการแรกจากทั้งหมด ${filteredLessons.length} รายการ)`;
  }
  
  tableHeader.textContent = originalTitle + titleSuffix;
  
  // เรียงลำดับข้อมูล
  lessonsToDisplay.sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    return a.period - b.period;
  });
  
  // เรนเดอร์ข้อมูล
  lessonsToDisplay.forEach(l => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${l.subject}</td>
      <td>${l.teacher}</td>
      <td>${l.classLevel}</td>
      <td>${l.room}</td>
      <td>${days[l.day]}</td>
      <td>${periods[l.period]}</td>
      <td>
        <button class="btn-warning small edit-btn" data-id="${l.id}" style="margin-right:4px;">✏️ แก้ไข</button>
        <button class="btn-danger small" data-id="${l.id}">🗑️ ลบ</button>
      </td>`;
    tb.appendChild(tr);
  });
  
  // เพิ่มข้อความเมื่อมีการจำกัดการแสดงผล
  if (!displayAll) {
    const infoRow = document.createElement('tr');
    infoRow.innerHTML = `
      <td colspan="7" style="text-align: center; background: #fff3cd; color: #856404; font-style: italic;">
        ⚠️ แสดง ${displayLimit} รายการแรกจากทั้งหมด ${filteredLessons.length} รายการ 
        <button class="btn-info small" onclick="loadAllLessons()" style="margin-left: 10px;">โหลดทั้งหมด</button>
      </td>
    `;
    tb.appendChild(infoRow);
  }
  
  // เพิ่ม Event listeners
  addTableEventListeners();
}

// ฟังก์ชันโหลดข้อมูลทั้งหมด (เมื่อผู้ใช้ต้องการเห็นทั้งหมด)
async function loadAllLessons() {
  let loadingShown = false;
  
  try {
    showLoading(true, 'โหลดข้อมูลทั้งหมด');
    loadingShown = true;
    
    // โหลดข้อมูลทั้งหมดจากเซิร์ฟเวอร์ใหม่
    await loadAllData();
    
    // ล้างฟิลเตอร์และเรนเดอร์ใหม่
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
    
    document.getElementById('message').innerHTML = 
      '<div style="color:green;">✅ โหลดข้อมูลทั้งหมดเรียบร้อยแล้ว</div>';
      
  } catch (error) {
    console.error('❌ ข้อผิดพลาดในการโหลดข้อมูลทั้งหมด:', error);
    document.getElementById('message').innerHTML = 
      '<div style="color:red;">❌ เกิดข้อผิดพลาดในการโหลดข้อมูลทั้งหมด</div>';
  } finally {
    if (loadingShown) {
      showLoading(false, 'โหลดข้อมูลทั้งหมด');
    }
  }
}

// เพิ่ม Event listeners สำหรับตาราง
function addTableEventListeners() {
  const tb = document.querySelector('#lessonTable tbody');
  if (!tb) return;
  
  tb.querySelectorAll('.edit-btn').forEach(b => b.onclick = () => {
    if (preventGuestAction("แก้ไขรายการสอน")) return;
    const lesson = lessons.find(x => x.id === b.dataset.id);
    if (lesson) {
      editLesson(lesson);
    }
  });
  
  tb.querySelectorAll('.btn-danger').forEach(b => b.onclick = async () => {
    if (preventGuestAction("ลบรายการสอน")) return;
    if (confirm('คุณแน่ใจว่าต้องการลบรายการสอนนี้?')) {
      lessons = lessons.filter(x => x.id !== b.dataset.id);
      await saveAllData();
      renderAll();
      updateFilterOptions();
    }
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

  document.getElementById('message').innerHTML = '<div style="color:#f59e0b;">🔄 กำลังแก้ไขรายการสอน...</div>';
}

function renderSummary() {
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
    div.innerHTML = '<div class="no-data">📊 ยังไม่มีข้อมูลการสอน</div>';
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
    nameDiv.innerHTML = `👨‍🏫 ${teacher}`;

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
    div.innerHTML = '<div class="no-data">👤 ไม่พบข้อมูลการสอนสำหรับอาจารย์ท่านนี้</div>';
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
    div.innerHTML = '<div class="no-data">📊 ยังไม่มีข้อมูลการสอน</div>';
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
    nameDiv.innerHTML = `👥 ${classLevel}`;

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
    div.innerHTML = '<div class="no-data">🏫 ไม่พบข้อมูลการสอนสำหรับชั้นปีนี้</div>';
  } else {
    div.appendChild(container);
  }
}

function conflict(nl, excludeId = null) {
  return lessons.find(l =>
    l.id !== excludeId &&
    l.day === nl.day &&
    l.period === nl.period &&
    (l.teacher === nl.teacher || l.room === nl.room || l.classLevel === nl.classLevel)
  )
}

function autoSchedule(nl, numPeriods) {
  let periodsFound = 0;
  const scheduledPeriods = [];
  const availableSlots = [];

  for (let d = 0; d < days.length; d++) {
    for (let p = 0; p < periods.length; p++) {
      if (p === 4) continue;

      const test = { ...nl, day: d, period: p };
      if (!conflict(test)) {
        availableSlots.push({ day: d, period: p });
      }
    }
  }

  if (availableSlots.length < numPeriods) {
    alert(`❌ ไม่สามารถจัดตารางได้\n\nมีช่องว่างเพียง ${availableSlots.length} คาบ แต่ต้องการ ${numPeriods} คาบ\nอาจารย์ ${nl.teacher} มีคาบสอนชนกันในบางเวลา`);
    return false;
  }

  for (let i = 0; i < numPeriods && availableSlots.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * availableSlots.length);
    const slot = availableSlots[randomIndex];

    const newLesson = {
      ...nl,
      day: slot.day,
      period: slot.period,
      id: uid()
    };

    lessons.push(newLesson);
    scheduledPeriods.push({ day: slot.day, period: slot.period });
    availableSlots.splice(randomIndex, 1);
    periodsFound++;
  }

  if (periodsFound > 0) {
    renderAll();
    updateFilterOptions();

    let message = `✅ จัดตารางอัตโนมัติสำเร็จ ${periodsFound} คาบ:\n`;
    scheduledPeriods.forEach(sp => {
      message += `• ${days[sp.day]} ${periods[sp.period]}\n`;
    });
    
    document.getElementById('message').innerHTML = 
      `<div style="color:green;">${message.replace(/\n/g, '<br>')}</div>`;

    return true;
  } else {
    alert("❌ ไม่พบเวลาว่างที่สามารถจัดได้\nทุกวันและคาบมีการสอนชนกันหมด");
    return false;
  }
}

// =============================================
// Event Listeners และฟังก์ชันเริ่มต้น
// =============================================

// ฟังก์ชันบันทึก/อัปเดท
lessonForm.onsubmit = async e => {
  if (preventGuestAction("บันทึกหรือแก้ไขข้อมูลการสอน")) return;

  e.preventDefault();
  const numPeriods = parseInt(document.getElementById('numPeriods').value) || 1;

  if (editingId) {
    const nl = { 
      id: editingId, 
      teacher: teacher.value, 
      subject: subject.value, 
      classLevel: classLevel.value, 
      room: room.value, 
      day: +day.value, 
      period: +period.value 
    };
    
    if (nl.period === 4) {
      alert('❌ พักกลางวันไม่สามารถใช้สอนได้');
      return;
    }

    const c = conflict(nl, editingId);
    if (c) {
      alert(`❌ การสอนชนกับ:\n\nวิชา: ${c.subject}\nครู: ${c.teacher}\nห้อง: ${c.room}\nวัน: ${days[c.day]}\nคาบ: ${periods[c.period]}`);
      return;
    }

    const index = lessons.findIndex(l => l.id === editingId);
    if (index !== -1) {
      lessons[index] = nl;
    }

    document.getElementById('message').innerHTML = '<div style="color:green;">✅ อัปเดทรายการสอนเรียบร้อยแล้ว</div>';

    editingId = null;
    document.getElementById('submitBtn').textContent = '💾 บันทึก';
    document.getElementById('submitBtn').classList.remove('btn-warning');
    document.getElementById('submitBtn').classList.add('btn-primary');
  } else {
    const nl = { 
      id: uid(), 
      teacher: teacher.value, 
      subject: subject.value, 
      classLevel: classLevel.value, 
      room: room.value, 
      day: +day.value, 
      period: +period.value 
    };
    
    if (nl.period === 4) {
      alert('❌ พักกลางวันไม่สามารถใช้สอนได้');
      return;
    }

    const c = conflict(nl);
    if (c) {
      alert(`❌ การสอนชนกับ:\n\nวิชา: ${c.subject}\nครู: ${c.teacher}\nห้อง: ${c.room}\nวัน: ${days[c.day]}\nคาบ: ${periods[c.period]}`);
      return;
    }

    lessons.push(nl);
    document.getElementById('message').innerHTML = '<div style="color:green;">✅ บันทึกรายการสอนเรียบร้อยแล้ว</div>';
  }

  await saveAllData();
  e.target.reset();
  renderAll();
  updateFilterOptions();
};

autoBtn.onclick = async () => {
  if (preventGuestAction("เพิ่มข้อมูลการสอนอัตโนมัติ")) return;

  const numPeriods = parseInt(document.getElementById('numPeriods').value) || 1;
  const nl = {
    id: uid(),
    teacher: document.getElementById('teacher').value,
    subject: document.getElementById('subject').value,
    classLevel: document.getElementById('classLevel').value,
    room: document.getElementById('room').value,
    day: null,
    period: null
  };

  if (!nl.teacher || !nl.subject || !nl.classLevel || !nl.room) {
    alert("❌ กรุณากรอกข้อมูลให้ครบก่อนใช้เพิ่มอัตโนมัติ");
    return;
  }

  const success = autoSchedule(nl, numPeriods);
  if (success) {
    await saveAllData();
  }
  lessonForm.reset();

  if (editingId) {
    editingId = null;
    document.getElementById('submitBtn').textContent = '💾 บันทึก';
    document.getElementById('submitBtn').classList.remove('btn-warning');
    document.getElementById('submitBtn').classList.add('btn-primary');
  }
};

resetBtn.onclick = () => {
  if (preventGuestAction("รีเซ็ตฟอร์ม")) return;

  lessonForm.reset();
  editingId = null;
  document.getElementById('submitBtn').textContent = '💾 บันทึก';
  document.getElementById('submitBtn').classList.remove('btn-warning');
  document.getElementById('submitBtn').classList.add('btn-primary');
  document.getElementById('message').innerHTML = '';
};

printBtn.onclick = () => {
  document.getElementById('message').innerHTML = '<div style="color:blue;">🖨️ กำลังเตรียมพิมพ์... กรุณารอสักครู่</div>';
  setTimeout(() => {
    window.print();
  }, 500);
};

// Export Excel
exportBtn.onclick = () => {
  const wb = XLSX.utils.book_new();
  const term = document.getElementById('termInput').value;
  const header = ["วัน/เวลา", "คาบ 1", "คาบ 2", "คาบ 3", "คาบ 4", "พักกลางวัน", "คาบ 5", "คาบ 6", "คาบ 7"];
  const sheetData = [];
  sheetData.push(["วิทยาลัยเทคโนโลยีแหลมทอง"]);
  sheetData.push(["ตารางเรียน / ตารางสอน"]);
  sheetData.push(["ภาคเรียน: " + term]);

  let title = "ตารางสอน";
  let filterLabel = "";
  if (currentTab === "teacher" && filterValue) { 
    title = `ตารางสอนครู_${filterValue}`; 
    filterLabel = `ครู: ${filterValue}`; 
  }
  if (currentTab === "class" && filterValue) { 
    title = `ตารางเรียน_${filterValue}`; 
    filterLabel = `ชั้น: ${filterValue}`; 
  }
  if (currentTab === "room" && filterValue) { 
    title = `ตารางห้อง_${filterValue}`; 
    filterLabel = `ห้อง: ${filterValue}`; 
  }
  if (filterLabel) sheetData.push([filterLabel]);

  sheetData.push([]);
  sheetData.push(header);

  days.forEach((d, di) => {
    const row = [d];
    periods.forEach((p, pi) => {
      if (pi === 4) {
        row.push("พักกลางวัน");
      } else {
        let filtered = lessons.filter(l => l.day === di && l.period === pi);
        if (currentTab === "teacher" && filterValue) { filtered = filtered.filter(l => l.teacher === filterValue); }
        if (currentTab === "class" && filterValue) { filtered = filtered.filter(l => l.classLevel === filterValue); }
        if (currentTab === "room" && filterValue) { filtered = filtered.filter(l => l.room === filterValue); }
        const cellLessons = filtered.map(l => `${l.subject} | ${l.teacher} | ${l.classLevel} | ห้อง:${l.room}`).join("\n");
        row.push(cellLessons);
      }
    });
    sheetData.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(wb, ws, "ตารางสอน");
  XLSX.writeFile(wb, `${title}.xlsx`);
  
  document.getElementById('message').innerHTML = '<div style="color:green;">📊 Export Excel สำเร็จแล้ว</div>';
};

// Tab Switching
document.querySelectorAll(".tab").forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    currentTab = tab.dataset.type;
    filterValue = "";
    if (currentTab === "all") {
      document.getElementById("filterBox").style.display = "none";
    } else {
      document.getElementById("filterBox").style.display = "block";
      updateFilterOptions();
    }
    renderGrid();
  }
});

function updateFilterOptions() {
  const sel = document.getElementById("filterSelect");
  sel.innerHTML = "";
  let set = new Set();
  if (currentTab === "teacher") { lessons.forEach(l => set.add(l.teacher)); }
  if (currentTab === "class") { lessons.forEach(l => set.add(l.classLevel)); }
  if (currentTab === "room") { lessons.forEach(l => set.add(l.room)); }
  [...set].forEach(v => {
    const opt = document.createElement("option");
    opt.value = v; opt.textContent = v;
    sel.appendChild(opt);
  });
  sel.onchange = () => { filterValue = sel.value; renderGrid(); };
}

// ฟังก์ชันจัดการการกรอง
function setupFilters() {
  document.getElementById('filterSubject').addEventListener('change', function () {
    currentFilters.subject = this.value;
    renderList();
  });

  document.getElementById('filterTeacher').addEventListener('change', function () {
    currentFilters.teacher = this.value;
    renderList();
  });

  document.getElementById('filterClass').addEventListener('change', function () {
    currentFilters.classLevel = this.value;
    renderList();
  });

  document.getElementById('filterRoom').addEventListener('change', function () {
    currentFilters.room = this.value;
    renderList();
  });

  document.getElementById('filterDay').addEventListener('change', function () {
    currentFilters.day = this.value;
    renderList();
  });

  document.getElementById('filterPeriod').addEventListener('change', function () {
    currentFilters.period = this.value;
    renderList();
  });

  document.getElementById('resetFilterBtn').addEventListener('click', function () {
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

  teacherTab.addEventListener('click', function () {
    document.querySelectorAll('.summary-tab').forEach(tab => tab.classList.remove('active'));
    teacherTab.classList.add('active');

    document.getElementById('teacherSummarySection').style.display = 'block';
    document.getElementById('classSummarySection').style.display = 'none';
  });

  classTab.addEventListener('click', function () {
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

// =============================================
// ฟังก์ชันจัดการ JSON
// =============================================

// ฟังก์ชันทำความสะอาดข้อมูลก่อนนำเข้า
function cleanImportedData(data) {
  if (data.teachers) {
    data.teachers = data.teachers
      .filter(teacher => teacher && teacher.toString().trim() !== '')
      .map(teacher => teacher.toString().trim())
      .filter((teacher, index, self) => self.indexOf(teacher) === index);
  }
  
  if (data.classes) {
    data.classes = data.classes
      .filter(cls => cls && cls.toString().trim() !== '')
      .map(cls => cls.toString().trim())
      .filter((cls, index, self) => self.indexOf(cls) === index);
  }
  
  if (data.subjects) {
    data.subjects = data.subjects
      .filter(subject => subject && subject.toString().trim() !== '')
      .map(subject => subject.toString().trim())
      .filter((subject, index, self) => self.indexOf(subject) === index);
  }
  
  if (data.rooms) {
    data.rooms = data.rooms
      .filter(room => room && room.toString().trim() !== '')
      .map(room => room.toString().trim())
      .filter((room, index, self) => self.indexOf(room) === index);
  }
  
  if (data.lessons) {
    data.lessons = data.lessons
      .filter(lesson => lesson && lesson.id && lesson.teacher && lesson.subject)
      .map(lesson => ({
        id: lesson.id.toString().trim(),
        teacher: lesson.teacher.toString().trim(),
        subject: lesson.subject.toString().trim(),
        classLevel: lesson.classLevel ? lesson.classLevel.toString().trim() : '',
        room: lesson.room ? lesson.room.toString().trim() : '',
        day: typeof lesson.day === 'number' ? lesson.day : parseInt(lesson.day) || 0,
        period: typeof lesson.period === 'number' ? lesson.period : parseInt(lesson.period) || 0
      }))
      .filter((lesson, index, self) => 
        self.findIndex(l => l.id === lesson.id) === index
      );
  }
  
  return data;
}

// ฟังก์ชันนำเข้าข้อมูลจาก JSON
async function importJSON(file) {
  console.log('📁 เริ่มนำเข้าไฟล์ JSON:', file.name);
  
  const reader = new FileReader();
  
  reader.onload = async function(e) {
    let loadingShown = false;
    
    try {
      showLoading(true, 'นำเข้าไฟล์ JSON');
      loadingShown = true;
      console.log('📖 กำลังอ่านไฟล์...');
      
      if (!e.target.result) {
        throw new Error('ไฟล์ว่างเปล่า');
      }
      
      let rawData;
      try {
        rawData = JSON.parse(e.target.result);
        console.log('✅ Parse JSON สำเร็จ', Object.keys(rawData));
      } catch (parseError) {
        console.error('❌ ข้อผิดพลาดในการ parse JSON:', parseError);
        throw new Error('รูปแบบไฟล์ JSON ไม่ถูกต้อง: ' + parseError.message);
      }
      
      const data = cleanImportedData(rawData);
      console.log('🧹 ข้อมูลหลังจากทำความสะอาด:', {
        teachers: data.teachers?.length,
        classes: data.classes?.length,
        subjects: data.subjects?.length,
        rooms: data.rooms?.length,
        lessons: data.lessons?.length
      });
      
      if (!data.teachers || !data.classes || !data.subjects || !data.rooms || !data.lessons) {
        console.error('❌ โครงสร้างไฟล์ไม่ครบ:', {
          teachers: !!data.teachers,
          classes: !!data.classes,
          subjects: !!data.subjects,
          rooms: !!data.rooms,
          lessons: !!data.lessons
        });
        throw new Error('รูปแบบไฟล์ไม่ถูกต้อง - ไฟล์ต้องมีข้อมูลครู, ชั้นเรียน, วิชา, ห้อง, และตารางเรียน');
      }
      
      const stats = {
        teachers: data.teachers.length,
        classes: data.classes.length,
        subjects: data.subjects.length,
        rooms: data.rooms.length,
        lessons: data.lessons.length
      };
      
      console.log('📊 สถิติข้อมูลที่จะนำเข้า:', stats);
      
      if (!confirm(`การนำเข้าข้อมูลจะทับข้อมูลปัจจุบันทั้งหมด\n\nข้อมูลที่จะนำเข้า:\n• ครู: ${stats.teachers} ท่าน\n• ชั้นเรียน: ${stats.classes} ห้อง\n• วิชา: ${stats.subjects} รายการ\n• ห้อง: ${stats.rooms} ห้อง\n• ตารางเรียน: ${stats.lessons} คาบ\n\nต้องการดำเนินการต่อหรือไม่?`)) {
        showLoading(false, 'นำเข้าไฟล์ JSON');
        return;
      }
      
      teachers = data.teachers;
      classes = data.classes;
      subjects = data.subjects;
      rooms = data.rooms;
      lessons = data.lessons;
      
      console.log('✅ อัพเดทข้อมูลในตัวแปรสำเร็จ');
      
      backupToLocalStorage({ teachers, classes, subjects, rooms, lessons });
      console.log('💾 บันทึกลง Local Storage สำเร็จ');
      
      let saveResult = false;
      let saveError = null;
      
      try {
        console.log('🌐 กำลังบันทึกลง Google Sheets...');
        saveResult = await saveAllData();
        console.log('✅ ผลการบันทึก Google Sheets:', saveResult);
      } catch (error) {
        console.error('❌ ข้อผิดพลาดในการบันทึกลง Google Sheets:', error);
        saveError = error;
        saveResult = false;
      }
      
      loadDropdowns();
      renderAll();
      
      if (saveResult) {
        document.getElementById('message').innerHTML = 
          `<div style="color:green;">
            ✅ นำเข้าข้อมูลจาก JSON และบันทึกลง Google Sheet สำเร็จแล้ว!<br>
            <small>ครู: ${stats.teachers} ท่าน | วิชา: ${stats.subjects} รายการ | ตารางเรียน: ${stats.lessons} คาบ</small>
          </div>`;
      } else {
        document.getElementById('message').innerHTML = 
          `<div style="color:orange;">
            ✅ นำเข้าข้อมูลจาก JSON สำเร็จ (บันทึกใน Local Storage)<br>
            <small>${saveError ? saveError.message : 'ไม่สามารถเชื่อมต่อกับ Google Sheets ได้'}</small><br>
            <small>ครู: ${stats.teachers} ท่าน | วิชา: ${stats.subjects} รายการ | ตารางเรียน: ${stats.lessons} คาบ</small>
            <br><br>
            <strong>คำแนะนำ:</strong><br>
            • ข้อมูลถูกบันทึกในเบราว์เซอร์แล้ว<br>
            • สามารถส่งข้อมูลไป Google Sheets ได้ภายหลัง<br>
            • หรือใช้ปุ่ม "ทดสอบการเชื่อมต่อ" เพื่อตรวจสอบการเชื่อมต่อ
          </div>`;
      }
      
    } catch (error) {
      console.error('❌ ข้อผิดพลาดใน importJSON:', error);
      document.getElementById('message').innerHTML = 
        `<div style="color:red;">
          ❌ เกิดข้อผิดพลาดในการนำเข้าไฟล์ JSON<br>
          <small>${error.message}</small><br>
          <small>กรุณาตรวจสอบว่าไฟล์มีรูปแบบที่ถูกต้องและไม่เสียหาย</small>
        </div>`;
    } finally {
      if (loadingShown) {
        showLoading(false, 'นำเข้าไฟล์ JSON');
      }
    }
  };
  
  reader.onerror = function(error) {
    console.error('❌ ข้อผิดพลาดในการอ่านไฟล์:', error);
    showLoading(false, 'นำเข้าไฟล์ JSON');
    document.getElementById('message').innerHTML = 
      `<div style="color:red;">
        ❌ เกิดข้อผิดพลาดในการอ่านไฟล์<br>
        <small>กรุณาตรวจสอบว่าไฟล์ไม่เสียหายและมีสิทธิ์ในการอ่าน</small>
      </div>`;
  };
  
  reader.readAsText(file);
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
    version: '1.0',
    stats: {
      teachers: teachers.length,
      classes: classes.length,
      subjects: subjects.length,
      rooms: rooms.length,
      lessons: lessons.length
    }
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
  
  document.getElementById('message').innerHTML = 
    `<div style="color:green;">
      📥 ดาวน์โหลดไฟล์ JSON สำเร็จแล้ว<br>
      <small>ครู: ${teachers.length} ท่าน | วิชา: ${subjects.length} รายการ | ตารางเรียน: ${lessons.length} คาบ</small>
    </div>`;
}

// ฟังก์ชันล้างข้อมูลทั้งหมด
async function clearAllData() {
  if (!confirm('⚠️ คุณแน่ใจว่าต้องการล้างข้อมูลทั้งหมด?\n\nการดำเนินการนี้ไม่สามารถย้อนกลับได้!')) {
    return;
  }
  
  let loadingShown = false;
  
  try {
    showLoading(true, 'ล้างข้อมูลทั้งหมด');
    loadingShown = true;
    
    teachers = [];
    classes = [];
    subjects = [];
    rooms = [];
    lessons = [];
    
    await saveAllData();
    loadDropdowns();
    renderAll();
    
    document.getElementById('message').innerHTML = 
      '<div style="color:green;">✅ ล้างข้อมูลทั้งหมดเรียบร้อยแล้ว</div>';
      
  } catch (error) {
    console.error('❌ ข้อผิดพลาดในการล้างข้อมูล:', error);
    document.getElementById('message').innerHTML = 
      `<div style="color:red;">❌ เกิดข้อผิดพลาดในการล้างข้อมูล</div>`;
  } finally {
    if (loadingShown) {
      showLoading(false, 'ล้างข้อมูลทั้งหมด');
    }
  }
}

// ฟังก์ชัน Debug ข้อมูล
function debugData() {
  console.log('=== DEBUG DATA ===');
  console.log('Teachers:', teachers);
  console.log('Classes:', classes);
  console.log('Subjects:', subjects);
  console.log('Rooms:', rooms);
  console.log('Lessons:', lessons);
  console.log('Local Storage Teachers:', localStorage.getItem('teachers'));
  console.log('Local Storage Classes:', localStorage.getItem('classes'));
  console.log('Local Storage Subjects:', localStorage.getItem('subjects'));
  console.log('Local Storage Rooms:', localStorage.getItem('rooms'));
  console.log('Local Storage Lessons:', localStorage.getItem('lessons'));
  
  const stats = getStatistics();
  alert(`📊 สถิติข้อมูลปัจจุบัน:\n\n` +
        `• ครู: ${stats.teachers} ท่าน\n` +
        `• ชั้นเรียน: ${stats.classes} ห้อง\n` +
        `• วิชา: ${stats.subjects} รายการ\n` +
        `• ห้อง: ${stats.rooms} ห้อง\n` +
        `• ตารางเรียน: ${stats.lessons} คาบ\n\n` +
        `ดูรายละเอียดใน Console (F12)`);
}

// เพิ่มฟังก์ชันตรวจสอบและแสดงสถิติข้อมูล
function showDataStatistics() {
  const stats = getStatistics();
  
  const statsHtml = `
    <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #d1fae5; margin: 10px 0;">
      <h4 style="margin: 0 0 10px 0; color: #065f46;">📊 สถิติข้อมูลทั้งหมด</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">
        <div style="text-align: center; background: white; padding: 10px; border-radius: 6px;">
          <div style="font-size: 24px; font-weight: bold; color: #10b981;">${stats.teachers}</div>
          <div style="font-size: 12px; color: #4b5563;">ครู</div>
        </div>
        <div style="text-align: center; background: white; padding: 10px; border-radius: 6px;">
          <div style="font-size: 24px; font-weight: bold; color: #10b981;">${stats.classes}</div>
          <div style="font-size: 12px; color: #4b5563;">ชั้นเรียน</div>
        </div>
        <div style="text-align: center; background: white; padding: 10px; border-radius: 6px;">
          <div style="font-size: 24px; font-weight: bold; color: #10b981;">${stats.subjects}</div>
          <div style="font-size: 12px; color: #4b5563;">รายวิชา</div>
        </div>
        <div style="text-align: center; background: white; padding: 10px; border-radius: 6px;">
          <div style="font-size: 24px; font-weight: bold; color: #10b981;">${stats.rooms}</div>
          <div style="font-size: 12px; color: #4b5563;">ห้อง</div>
        </div>
        <div style="text-align: center; background: white; padding: 10px; border-radius: 6px;">
          <div style="font-size: 24px; font-weight: bold; color: #10b981;">${stats.lessons}</div>
          <div style="font-size: 12px; color: #4b5563;">ตารางเรียน</div>
        </div>
      </div>
      ${stats.teachers > 100 || stats.classes > 100 || stats.subjects > 100 || stats.rooms > 100 || stats.lessons > 100 ? 
        `<div style="margin-top: 10px; padding: 8px; background: #fff3cd; border-radius: 4px; color: #856404; font-size: 12px;">
          ⚠️ ระบบกำลังจัดการกับข้อมูลจำนวนมาก การทำงานบางอย่างอาจใช้เวลานานกว่าเดิม
        </div>` : ''
      }
    </div>
  `;
  
  return statsHtml;
}

// ฟังก์ชันสำหรับการจัดการข้อมูลจำนวนมาก
function getStatistics() {
  return {
    teachers: teachers.length,
    classes: classes.length,
    subjects: subjects.length,
    rooms: rooms.length,
    lessons: lessons.length,
    totalPeriods: lessons.reduce((total, lesson) => total + 1, 0)
  };
}

// ฟังก์ชันแสดงสถิติ
function showStatistics() {
  const stats = getStatistics();
  alert(`📊 สถิติข้อมูลตารางเรียน:\n\n• ครู: ${stats.teachers} ท่าน\n• ชั้นเรียน: ${stats.classes} ห้อง\n• วิชา: ${stats.subjects} รายการ\n• ห้อง: ${stats.rooms} ห้อง\n• ตารางเรียน: ${stats.lessons} คาบ\n• รวมทั้งหมด: ${stats.totalPeriods} คาบสอน`);
}

// เพิ่มฟังก์ชันแบ่งข้อมูลเป็นชุดเล็กๆ
async function saveDataInChunks() {
  if (preventGuestAction("ส่งข้อมูลแบบแบ่งชุด")) return;
  
  let loadingShown = false;
  
  try {
    showLoading(true, 'ส่งข้อมูลแบบแบ่งชุด');
    loadingShown = true;
    
    const CHUNK_SIZE = 50; // ลดขนาดชุดข้อมูลเพื่อป้องกันปัญหา
    
    let successCount = 0;
    let errorCount = 0;
    
    // บันทึกครูแบบแบ่งชุด
    if (teachers.length > 0) {
      for (let i = 0; i < teachers.length; i += CHUNK_SIZE) {
        const chunk = teachers.slice(i, i + CHUNK_SIZE);
        try {
          await callGoogleAppsScript('saveAllData', { teachers: chunk });
          successCount++;
          console.log(`✅ บันทึกชุดครู ${i / CHUNK_SIZE + 1} สำเร็จ`);
        } catch (error) {
          errorCount++;
          console.error(`❌ บันทึกชุดครู ${i / CHUNK_SIZE + 1} ล้มเหลว:`, error);
        }
      }
    }
    
    // บันทึกชั้นเรียนแบบแบ่งชุด
    if (classes.length > 0) {
      for (let i = 0; i < classes.length; i += CHUNK_SIZE) {
        const chunk = classes.slice(i, i + CHUNK_SIZE);
        try {
          await callGoogleAppsScript('saveAllData', { classes: chunk });
          successCount++;
          console.log(`✅ บันทึกชุดชั้นเรียน ${i / CHUNK_SIZE + 1} สำเร็จ`);
        } catch (error) {
          errorCount++;
          console.error(`❌ บันทึกชุดชั้นเรียน ${i / CHUNK_SIZE + 1} ล้มเหลว:`, error);
        }
      }
    }
    
    // บันทึกรายวิชาแบบแบ่งชุด
    if (subjects.length > 0) {
      for (let i = 0; i < subjects.length; i += CHUNK_SIZE) {
        const chunk = subjects.slice(i, i + CHUNK_SIZE);
        try {
          await callGoogleAppsScript('saveAllData', { subjects: chunk });
          successCount++;
          console.log(`✅ บันทึกชุดรายวิชา ${i / CHUNK_SIZE + 1} สำเร็จ`);
        } catch (error) {
          errorCount++;
          console.error(`❌ บันทึกชุดรายวิชา ${i / CHUNK_SIZE + 1} ล้มเหลว:`, error);
        }
      }
    }
    
    // บันทึกห้องแบบแบ่งชุด
    if (rooms.length > 0) {
      for (let i = 0; i < rooms.length; i += CHUNK_SIZE) {
        const chunk = rooms.slice(i, i + CHUNK_SIZE);
        try {
          await callGoogleAppsScript('saveAllData', { rooms: chunk });
          successCount++;
          console.log(`✅ บันทึกชุดห้อง ${i / CHUNK_SIZE + 1} สำเร็จ`);
        } catch (error) {
          errorCount++;
          console.error(`❌ บันทึกชุดห้อง ${i / CHUNK_SIZE + 1} ล้มเหลว:`, error);
        }
      }
    }
    
    // บันทึกตารางเรียนแบบแบ่งชุด
    if (lessons.length > 0) {
      for (let i = 0; i < lessons.length; i += CHUNK_SIZE) {
        const chunk = lessons.slice(i, i + CHUNK_SIZE);
        try {
          await callGoogleAppsScript('saveAllData', { lessons: chunk });
          successCount++;
          console.log(`✅ บันทึกชุดตารางเรียน ${i / CHUNK_SIZE + 1} สำเร็จ`);
        } catch (error) {
          errorCount++;
          console.error(`❌ บันทึกชุดตารางเรียน ${i / CHUNK_SIZE + 1} ล้มเหลว:`, error);
        }
      }
    }
    
    if (errorCount === 0) {
      document.getElementById('message').innerHTML = 
        `<div style="color:green;">
          ✅ บันทึกข้อมูลทั้งหมดลง Google Sheets สำเร็จ!<br>
          <small>ส่งข้อมูลทั้งหมด ${successCount} ชุด</small>
        </div>`;
    } else {
      document.getElementById('message').innerHTML = 
        `<div style="color:orange;">
          ⚠️ บันทึกข้อมูลบางส่วนลง Google Sheets<br>
          <small>สำเร็จ: ${successCount} ชุด | ล้มเหลว: ${errorCount} ชุด</small>
          <br><br>
          <strong>คำแนะนำ:</strong><br>
          • ข้อมูลบางส่วนอาจถูกบันทึกแล้ว<br>
          • ลองส่งข้อมูลอีกครั้งหรือแบ่งข้อมูลเป็นชุดเล็กลง
        </div>`;
    }
    
  } catch (error) {
    console.error('❌ ข้อผิดพลาดใน saveDataInChunks:', error);
    document.getElementById('message').innerHTML = 
      `<div style="color:red;">
        ❌ เกิดข้อผิดพลาดในการส่งข้อมูลแบบแบ่งชุด<br>
        <small>${error.message}</small>
      </div>`;
  } finally {
    if (loadingShown) {
      showLoading(false, 'ส่งข้อมูลแบบแบ่งชุด');
    }
  }
}

// Event Listeners สำหรับปุ่ม JSON และ Google Sheets
document.getElementById('downloadJsonBtn').onclick = downloadJSON;

document.getElementById('importJsonBtn').onclick = function () {
  if (preventGuestAction("นำเข้าข้อมูลจากไฟล์ JSON")) return;
  document.getElementById('jsonFileInput').click();
};

document.getElementById('jsonFileInput').onchange = function (e) {
  if (e.target.files.length > 0) {
    importJSON(e.target.files[0]);
    e.target.value = '';
  }
};

document.getElementById('exportToSheetsBtn').onclick = exportToGoogleSheets;
document.getElementById('exportToSheetsChunkBtn').onclick = saveDataInChunks;
document.getElementById('importFromSheetsBtn').onclick = importFromGoogleSheets;
document.getElementById('testConnectionBtn').onclick = testSimpleConnection;
document.getElementById('clearDataBtn').onclick = clearAllData;
document.getElementById('debugBtn').onclick = debugData;

// เมื่อโหลดหน้าเว็บเสร็จ
window.addEventListener('DOMContentLoaded', function () {
  console.log('🚀 กำลังเริ่มต้นระบบจัดการตารางเรียน...');
  showLoginModal();

  document.getElementById('loginBtn').onclick = loginAsAdmin;
  document.getElementById('guestBtn').onclick = loginAsGuest;
  document.getElementById('logoutBtn').onclick = logout;

  document.getElementById('adminPassword').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      loginAsAdmin();
    }
  });

  setupFilters();
  setupSummaryTabs();

  // ตรวจสอบสถานะการโหลดทุก 30 วินาที
  setInterval(checkLoadingStatus, 30000);

  console.log('📥 กำลังโหลดข้อมูลเริ่มต้น...');
  loadAllData().then(() => {
    loadDropdowns();
    renderAll();
    console.log('✅ ระบบพร้อมใช้งานแล้ว!');
  });
});
