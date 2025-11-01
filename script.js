// ระบบจัดการตารางเรียนและตารางสอน - JavaScript หลัก
// Version: 3.4.0 - Added admin-only system info and improved print headers
// Sheet ID: 1fUothdjvvd8A9Gf_uW4WWpsnABxmet2sK0egxHstIJo

// Global variables
let isAdmin = false;
let scheduleData = {};
let teacherData = {};
let subjectData = {};
let roomData = {};
let classData = {};
let googleSheetsUrl = '';
let onlineMode = true;

// Data management functions
class DataManager {
    static saveToLocalStorage() {
        try {
            localStorage.setItem('scheduleData', JSON.stringify(scheduleData));
            localStorage.setItem('teacherData', JSON.stringify(teacherData));
            localStorage.setItem('subjectData', JSON.stringify(subjectData));
            localStorage.setItem('roomData', JSON.stringify(roomData));
            localStorage.setItem('classData', JSON.stringify(classData));
            localStorage.setItem('googleSheetsUrl', googleSheetsUrl);
            localStorage.setItem('onlineMode', onlineMode.toString());
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }

    static loadFromLocalStorage() {
        try {
            const savedSchedule = localStorage.getItem('scheduleData');
            const savedTeachers = localStorage.getItem('teacherData');
            const savedSubjects = localStorage.getItem('subjectData');
            const savedRooms = localStorage.getItem('roomData');
            const savedClasses = localStorage.getItem('classData');
            const savedUrl = localStorage.getItem('googleSheetsUrl');
            const savedOnlineMode = localStorage.getItem('onlineMode');

            if (savedSchedule) scheduleData = JSON.parse(savedSchedule);
            if (savedTeachers) teacherData = JSON.parse(savedTeachers);
            if (savedSubjects) subjectData = JSON.parse(savedSubjects);
            if (savedRooms) roomData = JSON.parse(savedRooms);
            if (savedClasses) classData = JSON.parse(savedClasses);
            if (savedUrl) googleSheetsUrl = savedUrl;
            if (savedOnlineMode) onlineMode = savedOnlineMode === 'true';

            return true;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return false;
        }
    }

    static async saveToGoogleSheets() {
        if (!onlineMode || !googleSheetsUrl) {
            return { success: false, message: 'โหมดออฟไลน์หรือไม่ได้ตั้งค่า URL' };
        }

        try {
            const timestamp = new Date().getTime();
            // ใช้ URL ที่แก้ไขแล้วเพื่อหลีกเลี่ยงปัญหา CORS
            const url = this.fixGoogleScriptUrl(googleSheetsUrl) + `?action=saveAllData&t=${timestamp}`;
            
            console.log('🔄 พยายามบันทึกข้อมูลไปยัง:', url);
            
            const requestData = {
                action: 'saveAllData',
                data: {
                    teachers: Object.values(teacherData),
                    subjects: Object.values(subjectData),
                    rooms: Object.values(roomData),
                    classes: Object.values(classData),
                    schedule: scheduleData
                }
            };

            // ใช้ fetch พร้อมกับ error handling ที่ดีขึ้น
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 วินาที timeout

            const response = await fetch(url, {
                method: 'POST',
                mode: 'no-cors', // ใช้ no-cors เพื่อหลีกเลี่ยงปัญหา CORS
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
                signal: controller.signal
            }).catch(error => {
                if (error.name === 'AbortError') {
                    throw new Error('Request timeout - การเชื่อมต่อใช้เวลานานเกินไป');
                }
                throw error;
            });

            clearTimeout(timeoutId);

            // ในโหมด no-cors เราไม่สามารถอ่าน response ได้ แต่เราสามารถตรวจสอบว่า request สำเร็จหรือไม่
            if (response && response.type === 'opaque') {
                // opaque response หมายความว่าการส่งข้อมูลสำเร็จ (แต่เราไม่สามารถอ่าน response ได้)
                return { success: true, message: 'บันทึกข้อมูลสำเร็จ (no-cors mode)' };
            }

            // ถ้าไม่ใช่ no-cors mode ให้พยายามอ่าน response
            try {
                const result = await response.json();
                return result;
            } catch (parseError) {
                // ถ้าไม่สามารถ parse JSON ได้ แต่ status 200 ก็ถือว่าสำเร็จ
                if (response.ok) {
                    return { success: true, message: 'บันทึกข้อมูลสำเร็จ' };
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }
            
        } catch (error) {
            console.error('❌ Error saving to Google Sheets:', error);
            
            // ให้ข้อมูล error ที่ละเอียดมากขึ้น
            let errorMessage = 'เกิดข้อผิดพลาดในการบันทึก: ';
            
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                errorMessage += 'การเชื่อมต่อล้มเหลว - กรุณาตรวจสอบ URL และการเชื่อมต่ออินเทอร์เน็ต';
            } else if (error.message.includes('timeout')) {
                errorMessage += 'การเชื่อมต่อใช้เวลานานเกินไป - กรุณาลองใหม่อีกครั้ง';
            } else if (error.message.includes('CORS')) {
                errorMessage += 'ปัญหา CORS - กรุณาตรวจสอบการตั้งค่า Google Apps Script';
            } else {
                errorMessage += error.message;
            }
            
            return { success: false, message: errorMessage };
        }
    }

    // ฟังก์ชันใหม่: บันทึกข้อมูลแบบแบ่งชุด
    static async saveToGoogleSheetsInBatches() {
        if (!onlineMode || !googleSheetsUrl) {
            return { success: false, message: 'โหมดออฟไลน์หรือไม่ได้ตั้งค่า URL' };
        }

        try {
            const timestamp = new Date().getTime();
            const baseUrl = this.fixGoogleScriptUrl(googleSheetsUrl);
            
            // แบ่งข้อมูลตารางเรียนเป็นชุดเล็กๆ
            const batchSize = 20; // ลดขนาดชุดเพื่อความปลอดภัย
            const scheduleBatches = this.splitScheduleIntoBatches(scheduleData, batchSize);
            
            let totalSuccess = 0;
            let totalFailures = 0;
            
            // ส่งข้อมูลทีละชุด
            for (let i = 0; i < scheduleBatches.length; i++) {
                try {
                    showProgress('กำลังอัพโหลดข้อมูล...', i + 1, scheduleBatches.length);
                    
                    const batchData = {
                        teachers: Object.values(teacherData),
                        subjects: Object.values(subjectData),
                        rooms: Object.values(roomData),
                        classes: Object.values(classData),
                        schedule: scheduleBatches[i],
                        batchInfo: {
                            current: i + 1,
                            total: scheduleBatches.length,
                            isLast: i === scheduleBatches.length - 1
                        }
                    };
                    
                    const url = baseUrl + `?action=saveAllData&batch=${i + 1}&total=${scheduleBatches.length}&t=${timestamp}`;
                    
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 30000);

                    const response = await fetch(url, {
                        method: 'POST',
                        mode: 'no-cors',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            action: 'saveAllData',
                            data: batchData
                        }),
                        signal: controller.signal
                    }).catch(error => {
                        if (error.name === 'AbortError') {
                            throw new Error('Request timeout');
                        }
                        throw error;
                    });

                    clearTimeout(timeoutId);

                    if (response && (response.ok || response.type === 'opaque')) {
                        totalSuccess++;
                        console.log(`✅ Batch ${i + 1} สำเร็จ`);
                    } else {
                        totalFailures++;
                        console.log(`❌ Batch ${i + 1} ล้มเหลว`);
                    }
                    
                    // รอสักครู่ระหว่างการส่งแต่ละชุด
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (batchError) {
                    console.error(`❌ Error in batch ${i + 1}:`, batchError);
                    totalFailures++;
                    
                    // ถ้ามี error มากกว่า 3 ชุด ให้หยุด
                    if (totalFailures >= 3) {
                        throw new Error(`มีมากกว่า 3 ชุดที่ล้มเหลว: ${batchError.message}`);
                    }
                }
            }
            
            hideProgress();
            
            if (totalFailures === 0) {
                return { success: true, message: `บันทึกข้อมูลทั้งหมด ${totalSuccess} ชุดสำเร็จ` };
            } else {
                return { 
                    success: false, 
                    message: `บันทึกสำเร็จ ${totalSuccess} ชุด, ล้มเหลว ${totalFailures} ชุด` 
                };
            }
        } catch (error) {
            hideProgress();
            console.error('❌ Error saving to Google Sheets in batches:', error);
            return { success: false, message: 'เกิดข้อผิดพลาดในการบันทึกแบบแบ่งชุด: ' + error.message };
        }
    }

    // ฟังก์ชันแก้ไข URL Google Script
    static fixGoogleScriptUrl(url) {
        if (!url) return '';
        
        let fixedUrl = url.trim();
        
        // ตรวจสอบว่าเป็น URL ที่ถูกต้อง
        try {
            new URL(fixedUrl);
        } catch (error) {
            console.error('Invalid URL:', error);
            return url;
        }
        
        // ตรวจสอบว่าเป็น Google Apps Script URL หรือไม่
        if (!fixedUrl.includes('script.google.com')) {
            console.warn('URL ไม่ใช่ Google Apps Script URL');
            return url;
        }
        
        // ตรวจสอบว่าไม่มี /dev ที่ส่วนท้าย
        if (fixedUrl.includes('/dev')) {
            fixedUrl = fixedUrl.replace('/dev', '');
            console.log('เปลี่ยนจาก deployment /dev เป็น production');
        }
        
        // ตรวจสอบว่าไม่มี query parameters ที่อาจทำให้เกิดปัญหา
        const urlObj = new URL(fixedUrl);
        urlObj.search = ''; // ล้าง query parameters ทั้งหมด
        
        return urlObj.toString();
    }

    // ฟังก์ชันแบ่งข้อมูลตารางเรียนเป็นชุดเล็กๆ
    static splitScheduleIntoBatches(scheduleData, batchSize) {
        const batches = [];
        let currentBatch = {};
        let count = 0;
        
        for (const [className, days] of Object.entries(scheduleData)) {
            if (!currentBatch[className]) {
                currentBatch[className] = {};
            }
            
            for (const [day, periods] of Object.entries(days)) {
                if (!currentBatch[className][day]) {
                    currentBatch[className][day] = {};
                }
                
                for (const [period, data] of Object.entries(periods)) {
                    currentBatch[className][day][period] = data;
                    count++;
                    
                    // เมื่อถึงขนาดชุดที่กำหนด ให้เริ่มชุดใหม่
                    if (count >= batchSize) {
                        batches.push(currentBatch);
                        currentBatch = {};
                        count = 0;
                    }
                }
            }
        }
        
        // เพิ่มชุดสุดท้ายถ้ามีข้อมูล
        if (Object.keys(currentBatch).length > 0) {
            batches.push(currentBatch);
        }
        
        console.log(`แบ่งข้อมูลเป็น ${batches.length} ชุด, ขนาดชุดละ ${batchSize} รายการ`);
        return batches;
    }

    static async loadFromGoogleSheets() {
        if (!onlineMode || !googleSheetsUrl) {
            return { success: false, message: 'โหมดออฟไลน์หรือไม่ได้ตั้งค่า URL' };
        }

        try {
            const timestamp = new Date().getTime();
            const url = this.fixGoogleScriptUrl(googleSheetsUrl) + `?action=getAllData&t=${timestamp}`;
            
            console.log('🔄 พยายามโหลดข้อมูลจาก:', url);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal
            }).catch(error => {
                if (error.name === 'AbortError') {
                    throw new Error('Request timeout');
                }
                throw error;
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success && result.data) {
                // แปลงข้อมูลจาก array เป็น object
                if (result.data.teachers) {
                    teacherData = {};
                    result.data.teachers.forEach(teacher => {
                        teacherData[teacher['รหัสครู']] = {
                            code: teacher['รหัสครู'],
                            name: teacher['ชื่อ-สกุล'],
                            position: teacher['ตำแหน่ง']
                        };
                    });
                }
                
                if (result.data.subjects) {
                    subjectData = {};
                    result.data.subjects.forEach(subject => {
                        subjectData[subject['รหัสวิชา']] = {
                            code: subject['รหัสวิชา'],
                            name: subject['ชื่อวิชา'],
                            credit: subject['นก.']
                        };
                    });
                }
                
                if (result.data.rooms) {
                    roomData = {};
                    result.data.rooms.forEach(room => {
                        roomData[room['รหัสห้อง']] = {
                            code: room['รหัสห้อง'],
                            name: room['ชื่อห้อง'],
                            type: room['ประเภท'],
                            capacity: room['ความจุ']
                        };
                    });
                }
                
                if (result.data.classes) {
                    classData = {};
                    result.data.classes.forEach(classItem => {
                        classData[classItem['รหัสระดับชั้น']] = {
                            code: classItem['รหัสระดับชั้น'],
                            name: classItem['ชื่อระดับชั้น'],
                            program: classItem['อาจารย์ที่ปรึกษา'],
                            advisor: classItem['อาจารย์ที่ปรึกษา'],
                            studentCount: classItem['จำนวนนักเรียน']
                        };
                    });
                }
                
                if (result.data.schedule) {
                    scheduleData = result.data.schedule;
                }
                
                DataManager.saveToLocalStorage();
                return { success: true, message: 'โหลดข้อมูลสำเร็จ' };
            } else {
                return { success: false, message: result.message || 'ไม่สามารถโหลดข้อมูลได้' };
            }
        } catch (error) {
            console.error('❌ Error loading from Google Sheets:', error);
            
            let errorMessage = 'เกิดข้อผิดพลาดในการโหลด: ';
            if (error.message.includes('Failed to fetch')) {
                errorMessage += 'การเชื่อมต่อล้มเหลว - กรุณาตรวจสอบ URL และการเชื่อมต่ออินเทอร์เน็ต';
            } else {
                errorMessage += error.message;
            }
            
            return { success: false, message: errorMessage };
        }
    }

    static exportData(type = 'all') {
        try {
            let dataToExport;
            let filename;
            
            switch (type) {
                case 'teachers':
                    dataToExport = teacherData;
                    filename = `teachers_${this.getTimestamp()}.json`;
                    break;
                case 'subjects':
                    dataToExport = subjectData;
                    filename = `subjects_${this.getTimestamp()}.json`;
                    break;
                case 'rooms':
                    dataToExport = roomData;
                    filename = `rooms_${this.getTimestamp()}.json`;
                    break;
                case 'classes':
                    dataToExport = classData;
                    filename = `classes_${this.getTimestamp()}.json`;
                    break;
                case 'schedule':
                    dataToExport = scheduleData;
                    filename = `schedule_${this.getTimestamp()}.json`;
                    break;
                case 'all':
                default:
                    dataToExport = {
                        scheduleData,
                        teacherData,
                        subjectData,
                        roomData,
                        classData,
                        exportDate: new Date().toISOString(),
                        version: '3.4.0'
                    };
                    filename = `schedule_system_backup_${this.getTimestamp()}.json`;
                    break;
            }

            const dataStr = JSON.stringify(dataToExport, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            showNotification(`ส่งออกข้อมูล ${type} เรียบร้อยแล้ว`, 'success');
            return true;
        } catch (error) {
            console.error('Error exporting data:', error);
            showNotification('เกิดข้อผิดพลาดในการส่งออกข้อมูล', 'error');
            return false;
        }
    }

    static importData(file, replace = false) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const importedData = JSON.parse(e.target.result);
                    
                    if (replace) {
                        // แทนที่ข้อมูลทั้งหมด
                        if (importedData.scheduleData) scheduleData = importedData.scheduleData;
                        if (importedData.teacherData) teacherData = importedData.teacherData;
                        if (importedData.subjectData) subjectData = importedData.subjectData;
                        if (importedData.roomData) roomData = importedData.roomData;
                        if (importedData.classData) classData = importedData.classData;
                    } else {
                        // ผสานข้อมูล (ไม่แทนที่ข้อมูลที่มีอยู่)
                        if (importedData.scheduleData) scheduleData = { ...scheduleData, ...importedData.scheduleData };
                        if (importedData.teacherData) teacherData = { ...teacherData, ...importedData.teacherData };
                        if (importedData.subjectData) subjectData = { ...subjectData, ...importedData.subjectData };
                        if (importedData.roomData) roomData = { ...roomData, ...importedData.roomData };
                        if (importedData.classData) classData = { ...classData, ...importedData.classData };
                    }
                    
                    DataManager.saveToLocalStorage();
                    
                    // รีเรนเดอร์ตารางทั้งหมด
                    TeacherManager.renderTeacherTable();
                    SubjectManager.renderSubjectTable();
                    RoomManager.renderRoomTable();
                    ClassManager.renderClassTable();
                    ScheduleRenderer.renderAllViews();
                    
                    resolve(true);
                } catch (error) {
                    reject(new Error('รูปแบบไฟล์ไม่ถูกต้อง'));
                }
            };
            
            reader.onerror = function() {
                reject(new Error('ไม่สามารถอ่านไฟล์ได้'));
            };
            
            reader.readAsText(file);
        });
    }

    static getTimestamp() {
        return new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    }

    static getStats() {
        return {
            teachers: Object.keys(teacherData).length,
            subjects: Object.keys(subjectData).length,
            rooms: Object.keys(roomData).length,
            classes: Object.keys(classData).length,
            scheduleEntries: Object.keys(scheduleData).reduce((acc, className) => {
                return acc + Object.keys(scheduleData[className]).reduce((dayAcc, day) => {
                    return dayAcc + Object.keys(scheduleData[className][day]).length;
                }, 0);
            }, 0)
        };
    }

    static async autoSave() {
        if (onlineMode && googleSheetsUrl) {
            try {
                await this.saveToGoogleSheets();
                console.log('Auto-save to Google Sheets completed');
            } catch (error) {
                console.error('Auto-save failed:', error);
            }
        }
    }
}

// Google Sheets integration
class GoogleSheetsManager {
    static async testConnectionWithRetry(maxRetries = 3) {
        if (!googleSheetsUrl) {
            throw new Error('กรุณาระบุ Google Apps Script URL');
        }

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 ทดสอบการเชื่อมต่อครั้งที่ ${attempt}`);
                
                // เพิ่ม timestamp เพื่อป้องกัน caching
                const timestamp = new Date().getTime();
                const testUrl = DataManager.fixGoogleScriptUrl(googleSheetsUrl) + `?action=test&attempt=${attempt}&t=${timestamp}`;
                
                console.log('URL ที่ใช้ทดสอบ:', testUrl);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);

                const response = await fetch(testUrl, {
                    method: 'GET',
                    signal: controller.signal
                }).catch(error => {
                    if (error.name === 'AbortError') {
                        throw new Error('Request timeout');
                    }
                    throw error;
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const result = await response.json();
                
                if (result.success) {
                    console.log('✅ การเชื่อมต่อสำเร็จครั้งที่', attempt);
                    return result;
                } else {
                    throw new Error(result.message || 'การเชื่อมต่อล้มเหลว');
                }
            } catch (error) {
                console.error(`❌ การเชื่อมต่อล้มเหลวครั้งที่ ${attempt}:`, error);
                
                if (attempt === maxRetries) {
                    // ลองใช้วิธีอื่นๆ ก่อนจะ throw error
                    const fallbackResult = await this.tryAlternativeMethods();
                    if (fallbackResult) {
                        return fallbackResult;
                    }
                    throw new Error('การเชื่อมต่อล้มเหลวหลังจากลอง ' + maxRetries + ' ครั้ง: ' + error.message);
                }
                
                // รอเพิ่มขึ้นตามจำนวนครั้งที่ลอง
                const waitTime = attempt * 2000;
                console.log(`⏳ รอ ${waitTime/1000} วินาทีก่อนลองใหม่...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    static async tryAlternativeMethods() {
        console.log('🔄 ลองใช้วิธีการเชื่อมต่ออื่นๆ...');
        
        // ลองใช้ XMLHttpRequest
        try {
            const result = await this.testWithXMLHttpRequest();
            if (result) return result;
        } catch (error) {
            console.error('XMLHttpRequest failed:', error);
        }
        
        // ลองใช้ no-cors mode
        try {
            const result = await this.testWithNoCors();
            if (result) return result;
        } catch (error) {
            console.error('No-cors test failed:', error);
        }
        
        return null;
    }

    static testWithXMLHttpRequest() {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const timestamp = new Date().getTime();
            const url = DataManager.fixGoogleScriptUrl(googleSheetsUrl) + `?action=test&t=${timestamp}`;
            
            xhr.open('GET', url, true);
            xhr.timeout = 15000;
            
            xhr.onload = function() {
                if (xhr.status === 200) {
                    try {
                        const result = JSON.parse(xhr.responseText);
                        resolve(result);
                    } catch (error) {
                        resolve({
                            success: true,
                            message: 'เชื่อมต่อได้แต่ไม่สามารถ parse JSON ได้',
                            rawResponse: xhr.responseText
                        });
                    }
                } else {
                    reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                }
            };
            
            xhr.onerror = function() {
                reject(new Error('Network error'));
            };
            
            xhr.ontimeout = function() {
                reject(new Error('Request timeout'));
            };
            
            xhr.send();
        });
    }

    static async testWithNoCors() {
        try {
            const timestamp = new Date().getTime();
            const url = DataManager.fixGoogleScriptUrl(googleSheetsUrl) + `?action=test&t=${timestamp}`;
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'no-cors'
            });
            
            // ใน no-cors mode เราไม่สามารถอ่าน response ได้ แต่ถ้าไม่ error ก็ถือว่าสามารถเชื่อมต่อได้
            return {
                success: true,
                message: 'เชื่อมต่อได้ (no-cors mode) - ไม่สามารถตรวจสอบ response ได้',
                method: 'No-CORS'
            };
        } catch (error) {
            throw new Error('No-cors connection failed: ' + error.message);
        }
    }

    static async checkUrlValidity() {
        try {
            // ลองดึงข้อมูลแบบง่ายๆ
            const response = await fetch(googleSheetsUrl, {
                method: 'HEAD',
                mode: 'no-cors'
            });
            
            return {
                valid: true,
                message: 'URL สามารถเข้าถึงได้'
            };
        } catch (error) {
            return {
                valid: false,
                message: 'URL ไม่สามารถเข้าถึงได้: ' + error.message
            };
        }
    }

    static async testConnection() {
        if (!googleSheetsUrl) {
            throw new Error('กรุณาระบุ Google Apps Script URL');
        }

        try {
            // ลองหลายวิธี
            const result = await this.testConnectionWithRetry(2);
            return result;
        } catch (error) {
            // หากวิธีหลักล้มเหลว ให้ลองวิธีอื่น
            console.log('🔄 ลองใช้วิธีการสำรอง...');
            
            try {
                const simpleTest = await this.simpleConnectionTest();
                return simpleTest;
            } catch (fallbackError) {
                throw new Error('การเชื่อมต่อล้มเหลวทั้งหมด: ' + error.message + ' | ' + fallbackError.message);
            }
        }
    }

    static async simpleConnectionTest() {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const timestamp = new Date().getTime();
            const testUrl = DataManager.fixGoogleScriptUrl(googleSheetsUrl) + `?action=test&t=${timestamp}`;
            
            img.onload = function() {
                resolve({
                    success: true,
                    message: 'การเชื่อมต่อพื้นฐานทำงานได้ (ผ่าน Image load)',
                    method: 'Image Load'
                });
            };
            
            img.onerror = function() {
                reject(new Error('ไม่สามารถโหลด resource จาก URL ได้'));
            };
            
            img.src = testUrl;
        });
    }

    static async initializeSheets() {
        if (!googleSheetsUrl) {
            throw new Error('กรุณาระบุ Google Apps Script URL');
        }

        try {
            const timestamp = new Date().getTime();
            const response = await fetch(DataManager.fixGoogleScriptUrl(googleSheetsUrl) + `?action=initialize&t=${timestamp}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            throw new Error('การ initialize ล้มเหลว: ' + error.message);
        }
    }

    static async syncToSheets() {
        if (!googleSheetsUrl) {
            throw new Error('กรุณาระบุ Google Apps Script URL');
        }

        try {
            console.log('🔄 เริ่มต้น sync ข้อมูล...');
            const result = await DataManager.saveToGoogleSheets();
            
            if (result.success) {
                console.log('✅ Sync สำเร็จ:', result.message);
            } else {
                console.error('❌ Sync ล้มเหลว:', result.message);
            }
            
            return result;
        } catch (error) {
            console.error('❌ Error in syncToSheets:', error);
            throw new Error('การ sync ล้มเหลว: ' + error.message);
        }
    }

    // ฟังก์ชันใหม่: sync แบบแบ่งชุด
    static async syncToSheetsBatch() {
        if (!googleSheetsUrl) {
            throw new Error('กรุณาระบุ Google Apps Script URL');
        }

        try {
            console.log('🔄 เริ่มต้น sync ข้อมูลแบบแบ่งชุด...');
            const result = await DataManager.saveToGoogleSheetsInBatches();
            
            if (result.success) {
                console.log('✅ Sync แบบแบ่งชุดสำเร็จ:', result.message);
            } else {
                console.error('❌ Sync แบบแบ่งชุดล้มเหลว:', result.message);
            }
            
            return result;
        } catch (error) {
            console.error('❌ Error in syncToSheetsBatch:', error);
            throw new Error('การ sync แบบแบ่งชุดล้มเหลว: ' + error.message);
        }
    }

    static async loadFromSheets() {
        if (!googleSheetsUrl) {
            throw new Error('กรุณาระบุ Google Apps Script URL');
        }

        try {
            const result = await DataManager.loadFromGoogleSheets();
            if (result.success) {
                // รีเรนเดอร์ตารางทั้งหมด
                TeacherManager.renderTeacherTable();
                SubjectManager.renderSubjectTable();
                RoomManager.renderRoomTable();
                ClassManager.renderClassTable();
                ScheduleRenderer.renderAllViews();
            }
            return result;
        } catch (error) {
            throw new Error('การโหลดข้อมูลล้มเหลว: ' + error.message);
        }
    }
}

// Data Management Classes
class TeacherManager {
    static renderTeacherTable() {
        const teacherTableBody = document.getElementById('teacherTableBody');
        const teacherCountBadge = document.getElementById('teacherCountBadge');
        
        if (!teacherTableBody) return;
        
        teacherTableBody.innerHTML = '';
        teacherCountBadge.textContent = Object.keys(teacherData).length;
        
        Object.values(teacherData).forEach(teacher => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${teacher.code}</td>
                <td>${teacher.name}</td>
                <td>${teacher.position || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-warning edit-teacher" data-id="${teacher.code}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-teacher" data-id="${teacher.code}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            teacherTableBody.appendChild(row);
        });
        
        // Add event listeners
        document.querySelectorAll('.edit-teacher').forEach(btn => {
            btn.addEventListener('click', () => this.editTeacher(btn.dataset.id));
        });
        
        document.querySelectorAll('.delete-teacher').forEach(btn => {
            btn.addEventListener('click', () => this.deleteTeacher(btn.dataset.id));
        });
    }
    
    static addTeacher() {
        document.getElementById('teacherFormTitle').textContent = 'เพิ่มครู';
        document.getElementById('teacherForm').reset();
        document.getElementById('teacherId').value = '';
        
        const modal = new bootstrap.Modal(document.getElementById('teacherFormModal'));
        modal.show();
    }
    
    static editTeacher(teacherId) {
        const teacher = teacherData[teacherId];
        if (!teacher) return;
        
        document.getElementById('teacherFormTitle').textContent = 'แก้ไขข้อมูลครู';
        document.getElementById('teacherId').value = teacher.code;
        document.getElementById('teacherCode').value = teacher.code;
        document.getElementById('teacherName').value = teacher.name;
        document.getElementById('teacherPosition').value = teacher.position || '';
        
        const modal = new bootstrap.Modal(document.getElementById('teacherFormModal'));
        modal.show();
    }
    
    static deleteTeacher(teacherId) {
        if (confirm('คุณแน่ใจว่าต้องการลบครูคนนี้?')) {
            delete teacherData[teacherId];
            DataManager.saveToLocalStorage();
            DataManager.autoSave();
            this.renderTeacherTable();
            ScheduleRenderer.renderAllViews();
            showNotification('ลบข้อมูลครูเรียบร้อยแล้ว', 'success');
        }
    }
    
    static saveTeacher(formData) {
        const teacherId = formData.id || formData.code;
        
        teacherData[teacherId] = {
            code: formData.code,
            name: formData.name,
            position: formData.position
        };
        
        DataManager.saveToLocalStorage();
        DataManager.autoSave();
        this.renderTeacherTable();
        ScheduleRenderer.renderAllViews();
        return true;
    }
}

class SubjectManager {
    static renderSubjectTable() {
        const subjectTableBody = document.getElementById('subjectTableBody');
        const subjectCountBadge = document.getElementById('subjectCountBadge');
        
        if (!subjectTableBody) return;
        
        subjectTableBody.innerHTML = '';
        subjectCountBadge.textContent = Object.keys(subjectData).length;
        
        Object.values(subjectData).forEach(subject => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${subject.code}</td>
                <td>${subject.name}</td>
                <td>${subject.credit || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-warning edit-subject" data-id="${subject.code}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-subject" data-id="${subject.code}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            subjectTableBody.appendChild(row);
        });
        
        // Add event listeners
        document.querySelectorAll('.edit-subject').forEach(btn => {
            btn.addEventListener('click', () => this.editSubject(btn.dataset.id));
        });
        
        document.querySelectorAll('.delete-subject').forEach(btn => {
            btn.addEventListener('click', () => this.deleteSubject(btn.dataset.id));
        });
    }
    
    static addSubject() {
        document.getElementById('subjectFormTitle').textContent = 'เพิ่มรายวิชา';
        document.getElementById('subjectForm').reset();
        document.getElementById('subjectId').value = '';
        
        const modal = new bootstrap.Modal(document.getElementById('subjectFormModal'));
        modal.show();
    }
    
    static editSubject(subjectId) {
        const subject = subjectData[subjectId];
        if (!subject) return;
        
        document.getElementById('subjectFormTitle').textContent = 'แก้ไขข้อมูลรายวิชา';
        document.getElementById('subjectId').value = subject.code;
        document.getElementById('subjectCode').value = subject.code;
        document.getElementById('subjectName').value = subject.name;
        document.getElementById('subjectCredit').value = subject.credit || '';
        
        const modal = new bootstrap.Modal(document.getElementById('subjectFormModal'));
        modal.show();
    }
    
    static deleteSubject(subjectId) {
        if (confirm('คุณแน่ใจว่าต้องการลบรายวิชานี้?')) {
            delete subjectData[subjectId];
            DataManager.saveToLocalStorage();
            DataManager.autoSave();
            this.renderSubjectTable();
            showNotification('ลบข้อมูลรายวิชาเรียบร้อยแล้ว', 'success');
        }
    }
    
    static saveSubject(formData) {
        const subjectId = formData.id || formData.code;
        
        subjectData[subjectId] = {
            code: formData.code,
            name: formData.name,
            credit: formData.credit
        };
        
        DataManager.saveToLocalStorage();
        DataManager.autoSave();
        this.renderSubjectTable();
        return true;
    }
}

class RoomManager {
    static renderRoomTable() {
        const roomTableBody = document.getElementById('roomTableBody');
        const roomCountBadge = document.getElementById('roomCountBadge');
        
        if (!roomTableBody) return;
        
        roomTableBody.innerHTML = '';
        roomCountBadge.textContent = Object.keys(roomData).length;
        
        Object.values(roomData).forEach(room => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${room.code}</td>
                <td>${room.name}</td>
                <td>${room.type || '-'}</td>
                <td>${room.capacity || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-warning edit-room" data-id="${room.code}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-room" data-id="${room.code}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            roomTableBody.appendChild(row);
        });
        
        // Add event listeners
        document.querySelectorAll('.edit-room').forEach(btn => {
            btn.addEventListener('click', () => this.editRoom(btn.dataset.id));
        });
        
        document.querySelectorAll('.delete-room').forEach(btn => {
            btn.addEventListener('click', () => this.deleteRoom(btn.dataset.id));
        });
    }
    
    static addRoom() {
        document.getElementById('roomFormTitle').textContent = 'เพิ่มห้อง';
        document.getElementById('roomForm').reset();
        document.getElementById('roomId').value = '';
        
        const modal = new bootstrap.Modal(document.getElementById('roomFormModal'));
        modal.show();
    }
    
    static editRoom(roomId) {
        const room = roomData[roomId];
        if (!room) return;
        
        document.getElementById('roomFormTitle').textContent = 'แก้ไขข้อมูลห้อง';
        document.getElementById('roomId').value = room.code;
        document.getElementById('roomCode').value = room.code;
        document.getElementById('roomName').value = room.name;
        document.getElementById('roomType').value = room.type || 'ห้องเรียน';
        document.getElementById('roomCapacity').value = room.capacity || '';
        
        const modal = new bootstrap.Modal(document.getElementById('roomFormModal'));
        modal.show();
    }
    
    static deleteRoom(roomId) {
        if (confirm('คุณแน่ใจว่าต้องการลบห้องนี้?')) {
            delete roomData[roomId];
            DataManager.saveToLocalStorage();
            DataManager.autoSave();
            this.renderRoomTable();
            ScheduleRenderer.renderAllViews();
            showNotification('ลบข้อมูลห้องเรียบร้อยแล้ว', 'success');
        }
    }
    
    static saveRoom(formData) {
        const roomId = formData.id || formData.code;
        
        roomData[roomId] = {
            code: formData.code,
            name: formData.name,
            type: formData.type,
            capacity: formData.capacity
        };
        
        DataManager.saveToLocalStorage();
        DataManager.autoSave();
        this.renderRoomTable();
        ScheduleRenderer.renderAllViews();
        return true;
    }
}

class ClassManager {
    static renderClassTable() {
        const classTableBody = document.getElementById('classTableBody');
        const classCountBadge = document.getElementById('classCountBadge');
        
        if (!classTableBody) return;
        
        classTableBody.innerHTML = '';
        classCountBadge.textContent = Object.keys(classData).length;
        
        Object.values(classData).forEach(classItem => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${classItem.code}</td>
                <td>${classItem.name}</td>
                <td>${classItem.program || '-'}</td>
                <td>${classItem.advisor || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-warning edit-class" data-id="${classItem.code}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-class" data-id="${classItem.code}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            classTableBody.appendChild(row);
        });
        
        // Add event listeners
        document.querySelectorAll('.edit-class').forEach(btn => {
            btn.addEventListener('click', () => this.editClass(btn.dataset.id));
        });
        
        document.querySelectorAll('.delete-class').forEach(btn => {
            btn.addEventListener('click', () => this.deleteClass(btn.dataset.id));
        });
    }
    
    static addClass() {
        document.getElementById('classFormTitle').textContent = 'เพิ่มระดับชั้น';
        document.getElementById('classForm').reset();
        document.getElementById('classId').value = '';
        this.loadAdvisorOptions();
        
        const modal = new bootstrap.Modal(document.getElementById('classFormModal'));
        modal.show();
    }
    
    static editClass(classId) {
        const classItem = classData[classId];
        if (!classItem) return;
        
        document.getElementById('classFormTitle').textContent = 'แก้ไขข้อมูลระดับชั้น';
        document.getElementById('classId').value = classItem.code;
        document.getElementById('classCode').value = classItem.code;
        document.getElementById('className').value = classItem.name;
        document.getElementById('classProgram').value = classItem.program || '';
        this.loadAdvisorOptions(classItem.advisor);
        
        const modal = new bootstrap.Modal(document.getElementById('classFormModal'));
        modal.show();
    }
    
    static loadAdvisorOptions(selectedAdvisor = '') {
        const advisorSelect = document.getElementById('classAdvisor');
        if (!advisorSelect) return;
        
        advisorSelect.innerHTML = '<option value="">-- เลือกครูที่ปรึกษา --</option>';
        
        Object.values(teacherData).forEach(teacher => {
            const option = document.createElement('option');
            option.value = teacher.name;
            option.textContent = teacher.name;
            if (teacher.name === selectedAdvisor) {
                option.selected = true;
            }
            advisorSelect.appendChild(option);
        });
    }
    
    static deleteClass(classId) {
        if (confirm('คุณแน่ใจว่าต้องการลบระดับชั้นนี้?')) {
            delete classData[classId];
            DataManager.saveToLocalStorage();
            DataManager.autoSave();
            this.renderClassTable();
            
            // Update class select in schedule view
            const classSelect = document.getElementById('classSelect');
            if (classSelect) {
                const optionToRemove = classSelect.querySelector(`option[value="${classId}"]`);
                if (optionToRemove) {
                    optionToRemove.remove();
                }
            }
            
            showNotification('ลบข้อมูลระดับชั้นเรียบร้อยแล้ว', 'success');
        }
    }
    
    static saveClass(formData) {
        const classId = formData.id || formData.code;
        
        classData[classId] = {
            code: formData.code,
            name: formData.name,
            program: formData.program,
            advisor: formData.advisor
        };
        
        DataManager.saveToLocalStorage();
        DataManager.autoSave();
        this.renderClassTable();
        
        // Update class select in schedule view
        const classSelect = document.getElementById('classSelect');
        if (classSelect) {
            const existingOption = classSelect.querySelector(`option[value="${classId}"]`);
            if (!existingOption) {
                const newOption = document.createElement('option');
                newOption.value = classId;
                newOption.textContent = classData[classId].name;
                classSelect.appendChild(newOption);
            }
        }
        
        return true;
    }
}

// Schedule rendering functions
class ScheduleRenderer {
    static renderAllViews() {
        this.renderClassSchedule();
        this.renderTeacherSchedule();
        this.renderRoomSchedule();
        this.renderTeacherSummary();
        this.renderClassSummary();
        this.renderRoomSummary();
        this.renderSystemInfo();
        this.updateDropdowns();
    }

    static updateDropdowns() {
        // Update class select
        const classSelect = document.getElementById('classSelect');
        if (classSelect) {
            classSelect.innerHTML = '';
            Object.values(classData).forEach(classItem => {
                const option = document.createElement('option');
                option.value = classItem.code;
                option.textContent = classItem.name;
                classSelect.appendChild(option);
            });
        }

        // Update teacher select
        const teacherSelect = document.getElementById('teacherSelect');
        if (teacherSelect) {
            teacherSelect.innerHTML = '';
            Object.values(teacherData).forEach(teacher => {
                const option = document.createElement('option');
                option.value = teacher.name;
                option.textContent = teacher.name;
                teacherSelect.appendChild(option);
            });
        }

        // Update room select
        const roomSelect = document.getElementById('roomSelect');
        if (roomSelect) {
            roomSelect.innerHTML = '';
            Object.values(roomData).forEach(room => {
                const option = document.createElement('option');
                option.value = room.code;
                option.textContent = room.name;
                roomSelect.appendChild(option);
            });
        }
    }

    static renderClassSchedule() {
        const classSelect = document.getElementById('classSelect');
        const selectedClass = classSelect ? classSelect.value : Object.keys(classData)[0];
        const scheduleBody = document.getElementById('schedule-body');
        
        if (!scheduleBody) return;
        
        scheduleBody.innerHTML = '';
        
        const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];
        
        days.forEach(day => {
            const row = document.createElement('tr');
            row.innerHTML = `<td class="day-header">${day}</td>`;
            
            const periods = [1, 2, 3, 4, 5, 6, 7, 8];
            
            periods.forEach(period => {
                const cell = document.createElement('td');
                
                // จัดการคาบพิเศษสำหรับวันศุกร์
                if (day === 'ศุกร์' && period === 7) {
                    cell.classList.add('activity');
                    cell.innerHTML = '<div><strong>กิจกรรม</strong></div>';
                    row.appendChild(cell);
                    return;
                }
                
                // ตรวจสอบว่ามีข้อมูลหรือไม่
                if (scheduleData[selectedClass] && 
                    scheduleData[selectedClass][day] && 
                    scheduleData[selectedClass][day][period]) {
                    
                    const classInfo = scheduleData[selectedClass][day][period];
                    cell.classList.add('subject-cell');
                    
                    // ใช้ฟังก์ชันจัดการการแสดงผลห้อง
                    const roomDisplay = parseRoomDisplay(classInfo.room);
                    
                    cell.innerHTML = `
                        <div><strong>${classInfo.subject}</strong></div>
                        <div class="small">${classInfo.teacher}</div>
                        <div class="small text-muted">${roomDisplay}</div>
                    `;
                    
                    // เพิ่มการคลิกเพื่อแก้ไขในโหมดแอดมิน
                    if (isAdmin) {
                        cell.classList.add('edit-mode');
                        cell.style.cursor = 'pointer';
                        cell.addEventListener('click', () => {
                            ScheduleEditor.editSchedule(selectedClass, day, period, classInfo);
                        });
                    }
                } else {
                    // เซลล์ว่าง - สามารถเพิ่มได้ในโหมดแอดมิน
                    cell.classList.add('empty-cell');
                    cell.innerHTML = '<div class="text-muted">-</div>';
                    
                    if (isAdmin) {
                        cell.style.cursor = 'pointer';
                        cell.addEventListener('click', () => {
                            ScheduleEditor.editSchedule(selectedClass, day, period);
                        });
                    }
                }
                
                row.appendChild(cell);
            });
            
            scheduleBody.appendChild(row);
        });
    }

    static renderTeacherSchedule() {
        const teacherSelect = document.getElementById('teacherSelect');
        const selectedTeacher = teacherSelect ? teacherSelect.value : Object.values(teacherData)[0]?.name;
        const teacherScheduleBody = document.getElementById('teacher-schedule-body');
        
        if (!teacherScheduleBody || !selectedTeacher) return;
        
        teacherScheduleBody.innerHTML = '';
        
        const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];
        
        days.forEach(day => {
            const row = document.createElement('tr');
            row.innerHTML = `<td class="day-header">${day}</td>`;
            
            const periods = [1, 2, 3, 4, 5, 6, 7, 8];
            
            periods.forEach(period => {
                const cell = document.createElement('td');
                
                if (day === 'ศุกร์' && period === 7) {
                    cell.classList.add('activity');
                    cell.innerHTML = '<div><strong>กิจกรรม</strong></div>';
                    row.appendChild(cell);
                    return;
                }
                
                let classInfo = null;
                for (const className in scheduleData) {
                    if (scheduleData[className][day] && 
                        scheduleData[className][day][period] &&
                        scheduleData[className][day][period].teacher === selectedTeacher) {
                        
                        classInfo = scheduleData[className][day][period];
                        classInfo.className = className;
                        break;
                    }
                }
                
                if (classInfo) {
                    cell.classList.add('subject-cell');
                    const roomDisplay = parseRoomDisplay(classInfo.room);
                    
                    cell.innerHTML = `
                        <div><strong>${classInfo.subject}</strong></div>
                        <div class="small">${classInfo.className}</div>
                        <div class="small text-muted">${roomDisplay}</div>
                    `;
                } else {
                    cell.innerHTML = '<div class="text-muted">-</div>';
                }
                
                row.appendChild(cell);
            });
            
            teacherScheduleBody.appendChild(row);
        });
    }

    static renderRoomSchedule() {
        const roomSelect = document.getElementById('roomSelect');
        const selectedRoom = roomSelect ? roomSelect.value : Object.values(roomData)[0]?.code;
        const roomScheduleBody = document.getElementById('room-schedule-body');
        
        if (!roomScheduleBody || !selectedRoom) return;
        
        roomScheduleBody.innerHTML = '';
        
        const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];
        
        days.forEach(day => {
            const row = document.createElement('tr');
            row.innerHTML = `<td class="day-header">${day}</td>`;
            
            const periods = [1, 2, 3, 4, 5, 6, 7, 8];
            
            periods.forEach(period => {
                const cell = document.createElement('td');
                
                if (day === 'ศุกร์' && period === 7) {
                    cell.classList.add('activity');
                    cell.innerHTML = '<div><strong>กิจกรรม</strong></div>';
                    row.appendChild(cell);
                    return;
                }
                
                let classInfo = null;
                for (const className in scheduleData) {
                    if (scheduleData[className][day] && 
                        scheduleData[className][day][period] &&
                        scheduleData[className][day][period].room === selectedRoom) {
                        
                        classInfo = scheduleData[className][day][period];
                        classInfo.className = className;
                        break;
                    }
                }
                
                if (classInfo) {
                    cell.classList.add('subject-cell');
                    cell.innerHTML = `
                        <div><strong>${classInfo.subject}</strong></div>
                        <div class="small">${classInfo.className}</div>
                        <div class="small text-muted">${classInfo.teacher}</div>
                    `;
                } else {
                    cell.innerHTML = '<div class="text-muted">-</div>';
                }
                
                row.appendChild(cell);
            });
            
            roomScheduleBody.appendChild(row);
        });
    }

    static renderTeacherSummary() {
        const teacherSummaryContent = document.getElementById('teacher-summary-content');
        if (!teacherSummaryContent) return;
        
        teacherSummaryContent.innerHTML = '';
        
        // คำนวณชั่วโมงสอนของครูแต่ละท่าน
        const teacherHours = {};
        
        for (const className in scheduleData) {
            for (const day in scheduleData[className]) {
                for (const period in scheduleData[className][day]) {
                    const classInfo = scheduleData[className][day][period];
                    if (classInfo.teacher && classInfo.subject) {
                        if (!teacherHours[classInfo.teacher]) {
                            teacherHours[classInfo.teacher] = {
                                totalHours: 0,
                                subjects: {}
                            };
                        }
                        teacherHours[classInfo.teacher].totalHours++;
                        
                        if (!teacherHours[classInfo.teacher].subjects[classInfo.subject]) {
                            teacherHours[classInfo.teacher].subjects[classInfo.subject] = 0;
                        }
                        teacherHours[classInfo.teacher].subjects[classInfo.subject]++;
                    }
                }
            }
        }
        
        // สร้างการ์ดสำหรับครูแต่ละท่าน
        Object.values(teacherData).forEach(teacher => {
            const hoursData = teacherHours[teacher.name] || { totalHours: 0, subjects: {} };
            const subjects = Object.entries(hoursData.subjects);
            
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4 mb-4';
            
            col.innerHTML = `
                <div class="card teacher-card summary-card h-100">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0">
                            <i class="fas fa-chalkboard-teacher me-2"></i>${teacher.name}
                        </h5>
                        <span class="badge bg-primary">${hoursData.totalHours} คาบ/สัปดาห์</span>
                    </div>
                    <div class="card-body">
                        <p class="card-text"><small class="text-muted">${teacher.position || 'ครู'}</small></p>
                        <h6 class="text-muted">รายวิชาที่สอน:</h6>
                        <ul class="list-group list-group-flush">
                            ${subjects.map(([subject, hours]) => 
                                `<li class="list-group-item d-flex justify-content-between align-items-center py-1">
                                    ${subject}
                                    <span class="badge bg-secondary rounded-pill">${hours} คาบ</span>
                                </li>`
                            ).join('')}
                            ${subjects.length === 0 ? 
                                '<li class="list-group-item text-muted py-1">ไม่มีข้อมูลการสอน</li>' : ''}
                        </ul>
                    </div>
                    <div class="card-footer">
                        <small class="text-muted">สอนทั้งหมด ${hoursData.totalHours} คาบต่อสัปดาห์</small>
                    </div>
                </div>
            `;
            
            teacherSummaryContent.appendChild(col);
        });
        
        // หากไม่มีข้อมูลครู
        if (Object.keys(teacherData).length === 0) {
            teacherSummaryContent.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        ยังไม่มีข้อมูลครูในระบบ
                    </div>
                </div>
            `;
        }
    }

    static renderClassSummary() {
        const classSummaryContent = document.getElementById('class-summary-content');
        if (!classSummaryContent) return;
        
        classSummaryContent.innerHTML = '';
        
        // คำนวณรายวิชาของแต่ละชั้นเรียน
        const classSubjects = {};
        
        for (const className in scheduleData) {
            if (!classSubjects[className]) {
                classSubjects[className] = {};
            }
            
            for (const day in scheduleData[className]) {
                for (const period in scheduleData[className][day]) {
                    const classInfo = scheduleData[className][day][period];
                    if (classInfo.subject) {
                        if (!classSubjects[className][classInfo.subject]) {
                            classSubjects[className][classInfo.subject] = 0;
                        }
                        classSubjects[className][classInfo.subject]++;
                    }
                }
            }
        }
        
        // สร้างการ์ดสำหรับแต่ละชั้นเรียน
        Object.values(classData).forEach(classItem => {
            const subjectsData = classSubjects[classItem.code] || {};
            const subjects = Object.entries(subjectsData);
            const totalHours = Object.values(subjectsData).reduce((sum, hours) => sum + hours, 0);
            
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4 mb-4';
            
            col.innerHTML = `
                <div class="card subject-card summary-card h-100">
                    <div class="card-header">
                        <h5 class="card-title mb-0">
                            <i class="fas fa-graduation-cap me-2"></i>${classItem.name}
                        </h5>
                        <p class="mb-0"><small class="text-muted">${classItem.program || ''}</small></p>
                    </div>
                    <div class="card-body">
                        <p class="card-text"><small class="text-muted">ครูที่ปรึกษา: ${classItem.advisor || 'ยังไม่ได้กำหนด'}</small></p>
                        <h6 class="text-muted">รายวิชาที่เรียน:</h6>
                        <ul class="list-group list-group-flush">
                            ${subjects.map(([subject, hours]) => 
                                `<li class="list-group-item d-flex justify-content-between align-items-center py-1">
                                    ${subject}
                                    <span class="badge bg-secondary rounded-pill">${hours} คาบ</span>
                                </li>`
                            ).join('')}
                            ${subjects.length === 0 ? 
                                '<li class="list-group-item text-muted py-1">ไม่มีข้อมูลตารางเรียน</li>' : ''}
                        </ul>
                    </div>
                    <div class="card-footer">
                        <small class="text-muted">เรียนทั้งหมด ${totalHours} คาบต่อสัปดาห์</small>
                    </div>
                </div>
            `;
            
            classSummaryContent.appendChild(col);
        });
        
        // หากไม่มีข้อมูลชั้นเรียน
        if (Object.keys(classData).length === 0) {
            classSummaryContent.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        ยังไม่มีข้อมูลระดับชั้นในระบบ
                    </div>
                </div>
            `;
        }
    }

    static renderRoomSummary() {
        const roomSummaryContent = document.getElementById('room-summary-content');
        if (!roomSummaryContent) return;
        
        roomSummaryContent.innerHTML = '';
        
        // คำนวณการใช้ห้องแต่ละห้อง
        const roomUsage = {};
        
        for (const className in scheduleData) {
            for (const day in scheduleData[className]) {
                for (const period in scheduleData[className][day]) {
                    const classInfo = scheduleData[className][day][period];
                    if (classInfo.room) {
                        if (!roomUsage[classInfo.room]) {
                            roomUsage[classInfo.room] = {
                                totalHours: 0,
                                classes: {}
                            };
                        }
                        roomUsage[classInfo.room].totalHours++;
                        
                        if (!roomUsage[classInfo.room].classes[className]) {
                            roomUsage[classInfo.room].classes[className] = 0;
                        }
                        roomUsage[classInfo.room].classes[className]++;
                    }
                }
            }
        }
        
        // สร้างการ์ดสำหรับแต่ละห้อง
        Object.values(roomData).forEach(room => {
            const usageData = roomUsage[room.code] || { totalHours: 0, classes: {} };
            const classes = Object.entries(usageData.classes);
            
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4 mb-4';
            
            col.innerHTML = `
                <div class="card room-card summary-card h-100">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0">
                            <i class="fas fa-door-open me-2"></i>${room.name}
                        </h5>
                        <span class="badge bg-primary">${usageData.totalHours} คาบ/สัปดาห์</span>
                    </div>
                    <div class="card-body">
                        <p class="card-text"><small class="text-muted">${room.type} • ความจุ ${room.capacity} คน</small></p>
                        <h6 class="text-muted">ชั้นเรียนที่ใช้:</h6>
                        <ul class="list-group list-group-flush">
                            ${classes.map(([classItem, hours]) => 
                                `<li class="list-group-item d-flex justify-content-between align-items-center py-1">
                                    ${classItem}
                                    <span class="badge bg-secondary rounded-pill">${hours} คาบ</span>
                                </li>`
                            ).join('')}
                            ${classes.length === 0 ? 
                                '<li class="list-group-item text-muted py-1">ไม่มีข้อมูลการใช้งาน</li>' : ''}
                        </ul>
                    </div>
                    <div class="card-footer">
                        <small class="text-muted">ใช้งาน ${Math.round((usageData.totalHours / 35) * 100)}% ของเวลารวม</small>
                    </div>
                </div>
            `;
            
            roomSummaryContent.appendChild(col);
        });
        
        // หากไม่มีข้อมูลห้อง
        if (Object.keys(roomData).length === 0) {
            roomSummaryContent.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        ยังไม่มีข้อมูลห้องในระบบ
                    </div>
                </div>
            `;
        }
    }

    static renderSystemInfo() {
        const stats = DataManager.getStats();
        
        if (document.getElementById('teacherCount')) {
            document.getElementById('teacherCount').textContent = stats.teachers;
        }
        if (document.getElementById('subjectCount')) {
            document.getElementById('subjectCount').textContent = stats.subjects;
        }
        if (document.getElementById('roomCount')) {
            document.getElementById('roomCount').textContent = stats.rooms;
        }
        if (document.getElementById('classCount')) {
            document.getElementById('classCount').textContent = stats.classes;
        }
        
        // Update script URL field
        if (document.getElementById('scriptUrl')) {
            document.getElementById('scriptUrl').value = googleSheetsUrl || '';
        }
        
        // Update online mode status
        if (document.getElementById('onlineMode')) {
            document.getElementById('onlineMode').checked = onlineMode;
        }
        
        // Update connection status
        const connectionStatus = document.getElementById('connectionStatus');
        if (connectionStatus) {
            if (onlineMode && googleSheetsUrl) {
                connectionStatus.innerHTML = '<i class="fas fa-circle text-success me-1"></i>เชื่อมต่อออนไลน์';
            } else if (onlineMode) {
                connectionStatus.innerHTML = '<i class="fas fa-circle text-warning me-1"></i>ออนไลน์ (ยังไม่ได้ตั้งค่า URL)';
            } else {
                connectionStatus.innerHTML = '<i class="fas fa-circle text-secondary me-1"></i>โหมดออฟไลน์';
            }
        }
        
        // Update connection details
        this.updateConnectionDetails();
    }
    
    static updateConnectionDetails() {
        const modeStatus = document.getElementById('modeStatus');
        const urlStatus = document.getElementById('urlStatus');
        const lastUpdate = document.getElementById('lastUpdate');
        
        if (modeStatus) {
            modeStatus.textContent = onlineMode ? 'ออนไลน์' : 'ออฟไลน์';
            modeStatus.className = onlineMode ? 'connection-good' : 'connection-warning';
        }
        
        if (urlStatus) {
            if (googleSheetsUrl) {
                urlStatus.textContent = googleSheetsUrl;
                urlStatus.className = 'url-valid';
            } else {
                urlStatus.textContent = 'ยังไม่ได้ตั้งค่า';
                urlStatus.className = 'url-warning';
            }
        }
        
        if (lastUpdate) {
            lastUpdate.textContent = new Date().toLocaleString('th-TH');
        }
    }
}

// Schedule editing functions
class ScheduleEditor {
    static editSchedule(className, day, period, classInfo = null) {
        // เตรียมข้อมูลสำหรับฟอร์ม
        document.getElementById('scheduleClassName').value = className;
        document.getElementById('scheduleDay').value = day;
        document.getElementById('schedulePeriod').value = period;
        
        // แสดงข้อมูลปัจจุบัน
        document.getElementById('scheduleClassDisplay').textContent = className;
        document.getElementById('scheduleDayDisplay').textContent = day;
        document.getElementById('schedulePeriodDisplay').textContent = period;
        
        // โหลดรายการครู, ห้อง และวิชา
        this.loadTeacherOptions();
        this.loadRoomOptions();
        this.loadSubjectOptions();
        
        // ตั้งค่าค่าปัจจุบัน (ถ้ามี)
        if (classInfo) {
            document.getElementById('scheduleSubject').value = classInfo.subject || '';
            document.getElementById('scheduleTeacher').value = classInfo.teacher || '';
            document.getElementById('scheduleRoom').value = classInfo.room || '';
            document.getElementById('deleteScheduleBtn').classList.remove('d-none');
        } else {
            document.getElementById('scheduleSubject').value = '';
            document.getElementById('scheduleTeacher').value = '';
            document.getElementById('scheduleRoom').value = '';
            document.getElementById('deleteScheduleBtn').classList.add('d-none');
        }
        
        // แสดง modal
        const modal = new bootstrap.Modal(document.getElementById('scheduleFormModal'));
        modal.show();
    }
    
    static loadTeacherOptions() {
        const teacherSelect = document.getElementById('scheduleTeacher');
        if (!teacherSelect) return;
        
        teacherSelect.innerHTML = '<option value="">-- เลือกครู --</option>';
        
        Object.values(teacherData).forEach(teacher => {
            const option = document.createElement('option');
            option.value = teacher.name;
            option.textContent = teacher.name;
            teacherSelect.appendChild(option);
        });
    }
    
    static loadSubjectOptions() {
        const subjectSelect = document.getElementById('scheduleSubject');
        if (!subjectSelect) return;
        
        subjectSelect.innerHTML = '<option value="">-- เลือกวิชา --</option>';
        
        Object.values(subjectData).forEach(subject => {
            const option = document.createElement('option');
            option.value = subject.name;
            option.textContent = `${subject.code} - ${subject.name}`;
            subjectSelect.appendChild(option);
        });
    }
    
    static loadRoomOptions() {
        const roomSelect = document.getElementById('scheduleRoom');
        if (!roomSelect) return;
        
        roomSelect.innerHTML = '<option value="">-- เลือกห้อง --</option>';
        
        Object.values(roomData).forEach(room => {
            const option = document.createElement('option');
            option.value = room.code;
            option.textContent = room.name;
            roomSelect.appendChild(option);
        });
    }
    
    static saveSchedule(formData) {
        const className = formData.className;
        const day = formData.day;
        const period = formData.period;
        const subject = formData.subject;
        const teacher = formData.teacher;
        const room = formData.room;
        
        // ตรวจสอบว่ามีข้อมูลหรือไม่
        if (!subject && !teacher && !room) {
            // ถ้าไม่มีข้อมูลทั้งหมด ให้ลบรายการนี้
            if (scheduleData[className] && scheduleData[className][day] && scheduleData[className][day][period]) {
                delete scheduleData[className][day][period];
                
                // ลบวันและระดับชั้นถ้าว่าง
                if (Object.keys(scheduleData[className][day]).length === 0) {
                    delete scheduleData[className][day];
                }
                if (Object.keys(scheduleData[className]).length === 0) {
                    delete scheduleData[className];
                }
            }
        } else {
            // สร้างหรืออัพเดทข้อมูล
            if (!scheduleData[className]) {
                scheduleData[className] = {};
            }
            if (!scheduleData[className][day]) {
                scheduleData[className][day] = {};
            }
            
            scheduleData[className][day][period] = {
                subject: subject,
                teacher: teacher,
                room: room
            };
        }
        
        // บันทึกข้อมูล
        DataManager.saveToLocalStorage();
        DataManager.autoSave();
        return true;
    }
    
    static deleteSchedule(className, day, period) {
        if (scheduleData[className] && scheduleData[className][day] && scheduleData[className][day][period]) {
            delete scheduleData[className][day][period];
            
            // ลบวันและระดับชั้นถ้าว่าง
            if (Object.keys(scheduleData[className][day]).length === 0) {
                delete scheduleData[className][day];
            }
            if (Object.keys(scheduleData[className]).length === 0) {
                delete scheduleData[className];
            }
            
            DataManager.saveToLocalStorage();
            DataManager.autoSave();
            return true;
        }
        return false;
    }
}

// Print functionality
class PrintManager {
    static printSchedule() {
        const currentView = document.querySelector('.view-content:not(.d-none)');
        
        if (currentView) {
            const printWindow = window.open('', '_blank');
            let title = currentView.querySelector('h3')?.textContent || 'ตารางเรียน';
            let classInfo = '';
            
            // ตรวจสอบว่าเป็นตารางเรียนของชั้นเรียนหรือไม่
            if (currentView.id === 'class-schedule') {
                const classSelect = document.getElementById('classSelect');
                const selectedClass = classSelect ? classSelect.value : Object.keys(classData)[0];
                const classDataItem = classData[selectedClass];
                
                if (classDataItem) {
                    classInfo = `<h4>${classDataItem.name}</h4>`;
                    title = `ตารางเรียน - ${classDataItem.name}`;
                }
            } else if (currentView.id === 'teacher-schedule') {
                const teacherSelect = document.getElementById('teacherSelect');
                const selectedTeacher = teacherSelect ? teacherSelect.value : Object.values(teacherData)[0]?.name;
                
                if (selectedTeacher) {
                    classInfo = `<h4>ครูผู้สอน: ${selectedTeacher}</h4>`;
                    title = `ตารางสอนครู - ${selectedTeacher}`;
                }
            } else if (currentView.id === 'room-schedule') {
                const roomSelect = document.getElementById('roomSelect');
                const selectedRoom = roomSelect ? roomSelect.value : Object.values(roomData)[0]?.code;
                const roomDataItem = roomData[selectedRoom];
                
                if (roomDataItem) {
                    classInfo = `<h4>ห้อง: ${roomDataItem.name}</h4>`;
                    title = `ตารางการใช้ห้อง - ${roomDataItem.name}`;
                }
            }
            
            printWindow.document.write(`
                <html>
                    <head>
                        <title>พิมพ์${title}</title>
                        <meta charset="UTF-8">
                        <style>
                            body { 
                                font-family: 'Sarabun', sans-serif; 
                                margin: 20px;
                                color: #333;
                            }
                            .header {
                                text-align: center;
                                margin-bottom: 20px;
                                border-bottom: 2px solid #333;
                                padding-bottom: 15px;
                            }
                            .school-name {
                                font-size: 24px;
                                font-weight: bold;
                                margin-bottom: 5px;
                            }
                            .schedule-title {
                                font-size: 20px;
                                margin-bottom: 10px;
                                color: #2c3e50;
                            }
                            .class-info {
                                font-size: 18px;
                                margin-bottom: 10px;
                                color: #3498db;
                            }
                            .print-date {
                                font-size: 14px;
                                color: #666;
                            }
                            table { 
                                width: 100%; 
                                border-collapse: collapse; 
                                margin: 20px 0;
                            }
                            th, td { 
                                border: 1px solid #000; 
                                padding: 8px; 
                                text-align: center; 
                                font-size: 12px;
                            }
                            th { 
                                background-color: #f0f0f0; 
                                font-weight: bold;
                            }
                            .break-cell { 
                                background-color: #ffe6e6; 
                                font-weight: bold;
                            }
                            .day-header {
                                background-color: #2c3e50;
                                color: white;
                                font-weight: bold;
                            }
                            .time-header {
                                background-color: #3498db;
                                color: white;
                                font-weight: bold;
                            }
                            .footer {
                                text-align: center;
                                margin-top: 30px;
                                font-size: 12px;
                                color: #666;
                            }
                            @media print {
                                body { margin: 0; }
                                .no-print { display: none; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <div class="school-name">วิทยาลัยเทคโนโลยีแหลมทอง</div>
                            <div class="schedule-title">${title}</div>
                            ${classInfo}
                            <div class="print-date">พิมพ์เมื่อ: ${new Date().toLocaleDateString('th-TH')}</div>
                        </div>
                        ${currentView.querySelector('.table-responsive')?.innerHTML || currentView.innerHTML}
                        <div class="footer">
                            <p>ระบบจัดการตารางเรียนและตารางสอนกลุ่มงานไฟฟ้าและอิเล็กทรอนิกส์</p>
                        </div>
                    </body>
                </html>
            `);
            printWindow.document.close();
            
            // Wait for content to load before printing
            setTimeout(() => {
                printWindow.print();
                // printWindow.close(); // Uncomment to auto-close after printing
            }, 500);
        }
    }
}

// Utility functions
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} notification`;
    notification.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <span>${message}</span>
            <button type="button" class="btn-close" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// ฟังก์ชันแสดงความคืบหน้า
function showProgress(message, current, total) {
    const progressElement = document.getElementById('uploadProgress');
    if (!progressElement) {
        // สร้าง element แสดงความคืบหน้า
        const progressDiv = document.createElement('div');
        progressDiv.id = 'uploadProgress';
        progressDiv.className = 'alert alert-info mt-3';
        progressDiv.style.position = 'fixed';
        progressDiv.style.top = '100px';
        progressDiv.style.right = '20px';
        progressDiv.style.zIndex = '9999';
        progressDiv.style.minWidth = '300px';
        progressDiv.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <span>${message}</span>
                <span>${current}/${total}</span>
            </div>
            <div class="progress mt-2">
                <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" 
                     style="width: ${(current/total)*100}%"></div>
            </div>
        `;
        document.body.appendChild(progressDiv);
    } else {
        // อัพเดทความคืบหน้า
        progressElement.querySelector('span:first-child').textContent = message;
        progressElement.querySelector('span:last-child').textContent = `${current}/${total}`;
        progressElement.querySelector('.progress-bar').style.width = `${(current/total)*100}%`;
    }
}

// ฟังก์ชันซ่อนความคืบหน้า
function hideProgress() {
    const progressElement = document.getElementById('uploadProgress');
    if (progressElement) {
        progressElement.remove();
    }
}

// ฟังก์ชันจัดการการแสดงผลแทปตามสิทธิ์ผู้ใช้
function updateViewVisibility() {
    const systemInfoNavItem = document.querySelector('.nav-link[data-view="system-info"]').parentElement;
    
    if (isAdmin) {
        systemInfoNavItem.style.display = 'block';
    } else {
        systemInfoNavItem.style.display = 'none';
        
        // ถ้าผู้ใช้กำลังดูแทปข้อมูลระบบ ให้เปลี่ยนไปที่แทปตารางเรียน
        const currentView = document.querySelector('.view-content:not(.d-none)');
        if (currentView && currentView.id === 'system-info') {
            showView('class-schedule');
        }
    }
}

function showView(viewId) {
    // ตรวจสอบสิทธิ์การเข้าถึง
    if (viewId === 'system-info' && !isAdmin) {
        showNotification('คุณไม่มีสิทธิ์เข้าถึงหน้านี้', 'error');
        return;
    }
    
    // Hide all views
    document.querySelectorAll('.view-content').forEach(view => {
        view.classList.add('d-none');
    });
    
    // Show selected view
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.remove('d-none');
    }
    
    // Update active nav link
    document.querySelectorAll('.sidebar .nav-link').forEach(item => {
        item.classList.remove('active');
    });
    
    const navLink = document.querySelector(`.sidebar .nav-link[data-view="${viewId}"]`);
    if (navLink) {
        navLink.classList.add('active');
    }
    
    // Render specific content
    switch (viewId) {
        case 'class-schedule':
            ScheduleRenderer.renderClassSchedule();
            break;
        case 'teacher-schedule':
            ScheduleRenderer.renderTeacherSchedule();
            break;
        case 'room-schedule':
            ScheduleRenderer.renderRoomSchedule();
            break;
        case 'teacher-summary':
            ScheduleRenderer.renderTeacherSummary();
            break;
        case 'class-summary':
            ScheduleRenderer.renderClassSummary();
            break;
        case 'room-summary':
            ScheduleRenderer.renderRoomSummary();
            break;
        case 'system-info':
            ScheduleRenderer.renderSystemInfo();
            break;
    }
    
    // อัพเดทโหมดแก้ไขทุกครั้งที่เปลี่ยน view
    updateEditMode();
}

function updateEditMode() {
    const scheduleBody = document.getElementById('schedule-body');
    
    // อัพเดทเมนูผู้ดูแลระบบ
    const adminMenu = document.getElementById('adminMenu');
    const loginBtn = document.getElementById('loginBtn');
    
    if (isAdmin) {
        if (adminMenu) adminMenu.classList.remove('d-none');
        if (loginBtn) loginBtn.innerHTML = '<i class="fas fa-sign-out-alt me-1"></i> ออกจากระบบ';
        
        // เพิ่มข้อความแจ้งเตือนโหมดแก้ไข
        if (!document.getElementById('editModeAlert')) {
            const alert = document.createElement('div');
            alert.id = 'editModeAlert';
            alert.className = 'alert alert-warning alert-dismissible fade show mb-3';
            alert.innerHTML = `
                <i class="fas fa-edit me-2"></i>
                <strong>โหมดแก้ไขเปิดใช้งาน!</strong> คุณสามารถคลิกที่ช่องตารางเรียนเพื่อแก้ไขข้อมูล
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            
            const mainContent = document.querySelector('.col-md-10');
            if (mainContent) {
                mainContent.insertBefore(alert, mainContent.firstChild);
            }
        }
    } else {
        if (adminMenu) adminMenu.classList.add('d-none');
        if (loginBtn) loginBtn.innerHTML = '<i class="fas fa-sign-in-alt me-1"></i> เข้าสู่ระบบ';
        
        // ลบข้อความแจ้งเตือนโหมดแก้ไข
        const editModeAlert = document.getElementById('editModeAlert');
        if (editModeAlert) {
            editModeAlert.remove();
        }
    }
}

// ฟังก์ชันจัดการห้องที่ซับซ้อน (เช่น 223/226)
function parseRoomDisplay(roomCode) {
    if (!roomCode) return '';
    
    if (roomCode.includes('/')) {
        return `<span class="multiple-rooms">${roomCode}</span>`;
    } else if (roomCode.includes('Shop.')) {
        return `<span class="workshop-room">${roomCode}</span>`;
    } else if (['422', '428', '112', '111', '114', '113', '133', '424'].includes(roomCode)) {
        return `<span class="class-room">${roomCode}</span>`;
    } else {
        return `<span class="lab-room">${roomCode}</span>`;
    }
}

function loadSampleData() {
    // Only load sample data if no data exists
    if (Object.keys(scheduleData).length === 0) {
        // ข้อมูลตารางเรียนจริงจาก Excel
        scheduleData = {
            "ปวช.2 ชอ.": {
                "จันทร์": {
                    1: { subject: "งานนิวเมติกส์และไฮดรอลิกส์เบื้องต้น", teacher: "อ.อำพรรณ ทิมจำลอง", room: "225" },
                    2: { subject: "งานนิวเมติกส์และไฮดรอลิกส์เบื้องต้น", teacher: "อ.อำพรรณ ทิมจำลอง", room: "225" },
                    5: { subject: "ไมโครคอนโทรลเลอร์", teacher: "อ.ธีระ กลมเกลา", room: "124" }
                },
                "อังคาร": {
                    1: { subject: "การใช้ภาษาไทยเชิงสร้างสรรค์", teacher: "อ.อุษา กลิ่นสุคนธ์", room: "112" },
                    2: { subject: "ภาษาอังกฤษเพื่องานช่างไฟฟ้าและอิเล็กทรอนิกส์", teacher: "อ.นุชสรา ร่มโพธิ์ตาล", room: "111" },
                    5: { subject: "คณิตศาสตร์ช่างอิเล็กทรอนิกส์", teacher: "อ.สุกรา รื่นเริง", room: "427" }
                },
                "พุธ": {
                    1: { subject: "การพัฒนาอย่างยั่งยืน", teacher: "อ.พัชรีย์ เย็นนภา", room: "114" },
                    2: { subject: "การพัฒนาอย่างยั่งยืน", teacher: "อ.พัชรีย์ เย็นนภา", room: "114" },
                    4: { subject: "เครื่องรับวิทยุ", teacher: "อ.สุกรา รื่นเริง", room: "427" },
                    5: { subject: "เครื่องรับวิทยุ", teacher: "อ.สุกรา รื่นเริง", room: "427" }
                },
                "พฤหัสบดี": {
                    1: { subject: "การเขียนโปรแกรมคอมพิวเตอร์", teacher: "อ.ธีระ กลมเกลา", room: "124" },
                    2: { subject: "การเขียนโปรแกรมคอมพิวเตอร์", teacher: "อ.ธีระ กลมเกลา", room: "124" },
                    5: { subject: "การเขียนโปรแกรมคอมพิวเตอร์", teacher: "อ.ธีระ กลมเกลา", room: "124" },
                    6: { subject: "ไมโครคอนโทรลเลอร์", teacher: "อ.ธีระ กลมเกลา", room: "124" }
                },
                "ศุกร์": {
                    1: { subject: "อินเตอร์เฟซเบื้องต้น", teacher: "อ.ธีระ กลมเกลา", room: "124" },
                    2: { subject: "อินเตอร์เฟซเบื้องต้น", teacher: "อ.ธีระ กลมเกลา", room: "124" },
                    5: { subject: "โฮมรูม", teacher: "อ.สุกรา รื่นเริง", room: "428" },
                    6: { subject: "กิจกรรมองค์การวิชาชีพ 1", teacher: "", room: "" }
                }
            },
            "ปวช.1 ชฟ.": {
                "จันทร์": {
                    1: { subject: "เขียนแบบไฟฟ้า", teacher: "อ.ชลธิชา หมอยาดี", room: "223/226" },
                    2: { subject: "เขียนแบบไฟฟ้า", teacher: "อ.ชลธิชา หมอยาดี", room: "223/226" },
                    5: { subject: "เครื่องวัดไฟฟ้า", teacher: "อ.สุกรา รื่นเริง", room: "223" }
                },
                "อังคาร": {
                    1: { subject: "งานเชื่อมและโลหะแผ่นเบื้องต้น", teacher: "อ.ประสงค์ ชาญสูงเนิน", room: "Shop. ช่างเชื่อม" },
                    2: { subject: "งานเชื่อมและโลหะแผ่นเบื้องต้น", teacher: "อ.ประสงค์ ชาญสูงเนิน", room: "Shop. ช่างเชื่อม" },
                    5: { subject: "การติดตั้งไฟฟ้าในอาคาร", teacher: "อ.อำพรรณ ทิมจำลอง", room: "111" }
                },
                "พุธ": {
                    1: { subject: "ภาษาไทยเพื่ออาชีพ", teacher: "อ.อุษา กลิ่นสุคนธ์", room: "112" },
                    2: { subject: "การฟังและการพูดภาษาอังกฤษ", teacher: "อ.นุชสรา ร่มโพธิ์ตาล", room: "111" },
                    5: { subject: "วิทยาศาสตร์เพื่ออาชีพอุตสาหกรรม", teacher: "อ.พัชรีย์ เย็นนภา", room: "114" }
                },
                "พฤหัสบดี": {
                    1: { subject: "งานเครื่องมือกลเบื้องต้น", teacher: "อ.ณธีพัฒน์ ธนาธิปภิญโญกุล", room: "Shop. ช่างกล" },
                    2: { subject: "งานเครื่องมือกลเบื้องต้น", teacher: "อ.ณธีพัฒน์ ธนาธิปภิญโญกุล", room: "Shop. ช่างกล" },
                    5: { subject: "สุขภาพความปลอดภัยและสิ่งแวดล้อม", teacher: "อ.ประวุฒิ ใจแสน", room: "113" }
                },
                "ศุกร์": {
                    1: { subject: "การติดตั้งไฟฟ้าในอาคาร", teacher: "อ.อำพรรณ ทิมจำลอง", room: "222/227" },
                    2: { subject: "การติดตั้งไฟฟ้าในอาคาร", teacher: "อ.อำพรรณ ทิมจำลอง", room: "222/227" },
                    5: { subject: "โฮมรูม", teacher: "อ.อำพรรณ ทิมจำลอง", room: "223" },
                    6: { subject: "กิจกรรมลูกเสือวิสามัญ 2", teacher: "", room: "" }
                }
            }
        };
    }
    
    if (Object.keys(teacherData).length === 0) {
        teacherData = {
            "T001": { code: "T001", name: "อ.ธีระ กลมเกลา", position: "หัวหน้าสาขาช่างไฟฟ้าและอิเล็กทรอนิกส์" },
            "T002": { code: "T002", name: "อ.ชลธิชา หมอยาดี", position: "ครู" },
            "T003": { code: "T003", name: "อ.อำพรรณ ทิมจำลอง", position: "ครู" },
            "T004": { code: "T004", name: "อ.สุกรา รื่นเริง", position: "รองผู้อำนวยการฝ่ายวิชาการ" },
            "T005": { code: "T005", name: "อ.อุษา กลิ่นสุคนธ์", position: "ครู" },
            "T006": { code: "T006", name: "อ.นุชสรา ร่มโพธิ์ตาล", position: "ครู" },
            "T007": { code: "T007", name: "อ.พัชรีย์ เย็นนภา", position: "ครู" },
            "T008": { code: "T008", name: "อ.ประสงค์ ชาญสูงเนิน", position: "ครู" },
            "T009": { code: "T009", name: "อ.ณธีพัฒน์ ธนาธิปภิญโญกุล", position: "ครู" },
            "T010": { code: "T010", name: "อ.ประวุฒิ ใจแสน", position: "ครู" },
            "T011": { code: "T011", name: "อ.พรสวรรค์ นิ่มทอง", position: "ครู" },
            "T012": { code: "T012", name: "อ.ประภาส พูนเพชร", position: "ครู" }
        };
    }
    
    if (Object.keys(roomData).length === 0) {
        roomData = {
            "422": { code: "422", name: "ห้อง 422", type: "ห้องเรียน", capacity: 40 },
            "427": { code: "427", name: "ห้อง 427", type: "ห้องปฏิบัติการ", capacity: 30 },
            "428": { code: "428", name: "ห้อง 428", type: "ห้องเรียน", capacity: 40 },
            "222": { code: "222", name: "ห้อง 222", type: "ห้องปฏิบัติการ", capacity: 25 },
            "223": { code: "223", name: "ห้อง 223", type: "ห้องปฏิบัติการ", capacity: 25 },
            "224": { code: "224", name: "ห้อง 224", type: "ห้องเรียน", capacity: 40 },
            "225": { code: "225", name: "ห้อง 225", type: "ห้องปฏิบัติการ", capacity: 25 },
            "226": { code: "226", name: "ห้อง 226", type: "ห้องปฏิบัติการ", capacity: 25 },
            "227": { code: "227", name: "ห้อง 227", type: "ห้องปฏิบัติการ", capacity: 25 },
            "124": { code: "124", name: "ห้อง 124", type: "ห้องปฏิบัติการ", capacity: 25 },
            "121": { code: "121", name: "ห้อง 121", type: "ห้องปฏิบัติการ", capacity: 25 },
            "112": { code: "112", name: "ห้อง 112", type: "ห้องเรียน", capacity: 40 },
            "111": { code: "111", name: "ห้อง 111", type: "ห้องเรียน", capacity: 40 },
            "114": { code: "114", name: "ห้อง 114", type: "ห้องเรียน", capacity: 40 },
            "113": { code: "113", name: "ห้อง 113", type: "ห้องเรียน", capacity: 40 },
            "133": { code: "133", name: "ห้อง 133", type: "ห้องเรียน", capacity: 40 },
            "424": { code: "424", name: "ห้อง 424", type: "ห้องเรียน", capacity: 40 }
        };
    }
    
    if (Object.keys(classData).length === 0) {
        classData = {
            "ปวช.2 ชอ.": { 
                code: "ปวช.2 ชอ.", 
                name: "ประกาศนียบัตรวิชาชีพ ชั้นปีที่ 2 สาขาช่างอิเล็กทรอนิกส์",
                program: "กลุ่มวิชาพลังงานไฟฟ้าและอิเล็กทรอนิกส์",
                advisor: "อ.สุกรา รื่นเริง"
            },
            "ปวช.1 ชฟ.": { 
                code: "ปวช.1 ชฟ.", 
                name: "ประกาศนียบัตรวิชาชีพ ชั้นปีที่ 1 สาขาช่างไฟฟ้า",
                program: "กลุ่มวิชาพลังงานไฟฟ้าและอิเล็กทรอนิกส์",
                advisor: "อ.อำพรรณ ทิมจำลอง"
            },
            "ปวช.2 ชฟ.": { 
                code: "ปวช.2 ชฟ.", 
                name: "ประกาศนียบัตรวิชาชีพ ชั้นปีที่ 2 สาขาช่างไฟฟ้า",
                program: "กลุ่มวิชาพลังงานไฟฟ้าและอิเล็กทรอนิกส์",
                advisor: "อ.ชลธิชา หมอยาดี"
            },
            "ปวช.3 ชฟ.": { 
                code: "ปวช.3 ชฟ.", 
                name: "ประกาศนียบัตรวิชาชีพ ชั้นปีที่ 3 สาขาช่างไฟฟ้า",
                program: "สาขาวิชาไฟฟ้ากำลัง",
                advisor: "อ.ธีระ กลมเกลา"
            },
            "ปวส.1-1 ชฟ.": { 
                code: "ปวส.1-1 ชฟ.", 
                name: "ประกาศนียบัตรวิชาชีพชั้นสูง ปีที่ 1 สาขาช่างไฟฟ้า",
                program: "กลุ่มวิชาพลังงานไฟฟ้าและอิเล็กทรอนิกส์",
                advisor: "อ.อำพรรณ ทิมจำลอง"
            },
            "ปวส.1-6 ชฟ.": { 
                code: "ปวส.1-6 ชฟ.", 
                name: "ประกาศนียบัตรวิชาชีพชั้นสูง ปีที่ 1 สาขาช่างไฟฟ้า",
                program: "กลุ่มวิชาพลังงานไฟฟ้าและอิเล็กทรอนิกส์",
                advisor: "อ.อำพรรณ ทิมจำลอง"
            },
            "ปวส.2-1 ชฟ.": { 
                code: "ปวส.2-1 ชฟ.", 
                name: "ประกาศนียบัตรวิชาชีพชั้นสูง ปีที่ 2 สาขาช่างไฟฟ้า",
                program: "กลุ่มวิชาพลังงานไฟฟ้าและอิเล็กทรอนิกส์",
                advisor: "อ.ธีระ กลมเกลา"
            }
        };
    }
    
    DataManager.saveToLocalStorage();
}

// ฟังก์ชันเปิดโหมด Admin โดยตรง (สำหรับการทดสอบ)
function enableAdminMode() {
    isAdmin = true;
    localStorage.setItem('isAdmin', 'true');
    updateEditMode();
    updateViewVisibility();
    ScheduleRenderer.renderAllViews();
    showNotification('เปิดโหมดผู้ดูแลระบบเรียบร้อยแล้ว', 'success');
}

// ฟังก์ชันเพิ่มปุ่มลัดสำหรับเปิดโหมด Admin
function addAdminShortcut() {
    // เพิ่มปุ่มลัดโดยการดับเบิลคลิกที่โลโก้
    const navbarBrand = document.querySelector('.navbar-brand');
    if (navbarBrand) {
        navbarBrand.addEventListener('dblclick', function() {
            if (!isAdmin) {
                enableAdminMode();
            }
        });
    }
    
    // เพิ่มคำสั่งใน console
    console.log('🔧 คำสั่งสำหรับ Developer:');
    console.log('enableAdminMode() - เปิดโหมดผู้ดูแลระบบ');
    console.log('updateEditMode() - อัพเดทโหมดแก้ไข');
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadSampleData();
    ScheduleRenderer.renderAllViews();
    addAdminShortcut();
});

function initializeApp() {
    // Load data from localStorage
    DataManager.loadFromLocalStorage();
    
    // Set default view
    showView('class-schedule');
    
    // Check if user is logged in
    const savedLogin = localStorage.getItem('isAdmin');
    if (savedLogin === 'true') {
        isAdmin = true;
    }
    
    // Update edit mode และการแสดงผลแทป
    updateEditMode();
    updateViewVisibility();
    
    // Render management tables
    TeacherManager.renderTeacherTable();
    SubjectManager.renderSubjectTable();
    RoomManager.renderRoomTable();
    ClassManager.renderClassTable();
    
    // Auto-load from Google Sheets if online mode is enabled
    if (onlineMode && googleSheetsUrl) {
        setTimeout(() => {
            DataManager.loadFromGoogleSheets().then(result => {
                if (result.success) {
                    showNotification('โหลดข้อมูลจาก Google Sheets สำเร็จ', 'success');
                    ScheduleRenderer.renderAllViews();
                    updateEditMode();
                    updateViewVisibility();
                }
            });
        }, 1000);
    }
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const view = this.getAttribute('data-view');
            showView(view);
        });
    });
    
    // Login
    document.getElementById('loginBtn').addEventListener('click', function(e) {
        e.preventDefault();
        if (isAdmin) {
            logout();
        } else {
            const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
            loginModal.show();
        }
    });
    
    // Login form
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (username === 'admin' && password === 'admin') {
            login();
        } else {
            showNotification('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 'error');
        }
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });
    
    // Class selection
    document.getElementById('classSelect').addEventListener('change', function() {
        ScheduleRenderer.renderClassSchedule();
    });
    
    // Teacher selection
    document.getElementById('teacherSelect').addEventListener('change', function() {
        ScheduleRenderer.renderTeacherSchedule();
    });
    
    // Room selection
    document.getElementById('roomSelect').addEventListener('change', function() {
        ScheduleRenderer.renderRoomSchedule();
    });
    
    // Print button
    document.getElementById('printBtn').addEventListener('click', function(e) {
        e.preventDefault();
        PrintManager.printSchedule();
    });
    
    // Online mode toggle
    document.getElementById('onlineMode').addEventListener('change', function() {
        onlineMode = this.checked;
        DataManager.saveToLocalStorage();
        showNotification(`โหมด ${onlineMode ? 'ออนไลน์' : 'ออฟไลน์'}`, 'info');
        ScheduleRenderer.renderSystemInfo();
    });
    
    // Import/Export
    document.getElementById('exportData').addEventListener('click', function(e) {
        e.preventDefault();
        const modal = new bootstrap.Modal(document.getElementById('importExportModal'));
        document.getElementById('importExportTitle').textContent = 'ส่งออกข้อมูล';
        modal.show();
    });
    
    document.getElementById('importData').addEventListener('click', function(e) {
        e.preventDefault();
        const modal = new bootstrap.Modal(document.getElementById('importExportModal'));
        document.getElementById('importExportTitle').textContent = 'นำเข้าข้อมูล';
        modal.show();
    });
    
    // Google Sheets connection
    document.getElementById('connectGoogleSheets').addEventListener('click', function(e) {
        e.preventDefault();
        const modal = new bootstrap.Modal(document.getElementById('googleSheetsModal'));
        document.getElementById('scriptUrlModal').value = googleSheetsUrl;
        modal.show();
    });
    
    // Export buttons
    document.getElementById('exportTeachers').addEventListener('click', () => DataManager.exportData('teachers'));
    document.getElementById('exportSubjects').addEventListener('click', () => DataManager.exportData('subjects'));
    document.getElementById('exportRooms').addEventListener('click', () => DataManager.exportData('rooms'));
    document.getElementById('exportClasses').addEventListener('click', () => DataManager.exportData('classes'));
    document.getElementById('exportSchedule').addEventListener('click', () => DataManager.exportData('schedule'));
    document.getElementById('exportAll').addEventListener('click', () => DataManager.exportData('all'));
    
    // Import button
    document.getElementById('importDataBtn').addEventListener('click', function() {
        const fileInput = document.getElementById('importFile');
        const replaceData = document.getElementById('replaceData').checked;
        
        if (fileInput.files.length > 0) {
            DataManager.importData(fileInput.files[0], replaceData)
                .then(() => {
                    showNotification('นำเข้าข้อมูลสำเร็จ', 'success');
                    ScheduleRenderer.renderAllViews();
                    const modal = bootstrap.Modal.getInstance(document.getElementById('importExportModal'));
                    modal.hide();
                })
                .catch(error => {
                    showNotification(error.message, 'error');
                });
        } else {
            showNotification('กรุณาเลือกไฟล์', 'error');
        }
    });
    
    // Teacher Management
    document.getElementById('addTeacherBtn').addEventListener('click', () => {
        TeacherManager.addTeacher();
    });
    
    document.getElementById('teacherForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = {
            id: document.getElementById('teacherId').value,
            code: document.getElementById('teacherCode').value,
            name: document.getElementById('teacherName').value,
            position: document.getElementById('teacherPosition').value
        };
        
        if (TeacherManager.saveTeacher(formData)) {
            showNotification('บันทึกข้อมูลครูเรียบร้อยแล้ว', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('teacherFormModal'));
            modal.hide();
        }
    });
    
    // Subject Management
    document.getElementById('addSubjectBtn').addEventListener('click', () => {
        SubjectManager.addSubject();
    });
    
    document.getElementById('subjectForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = {
            id: document.getElementById('subjectId').value,
            code: document.getElementById('subjectCode').value,
            name: document.getElementById('subjectName').value,
            credit: document.getElementById('subjectCredit').value
        };
        
        if (SubjectManager.saveSubject(formData)) {
            showNotification('บันทึกข้อมูลรายวิชาเรียบร้อยแล้ว', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('subjectFormModal'));
            modal.hide();
        }
    });
    
    // Room Management
    document.getElementById('addRoomBtn').addEventListener('click', () => {
        RoomManager.addRoom();
    });
    
    document.getElementById('roomForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = {
            id: document.getElementById('roomId').value,
            code: document.getElementById('roomCode').value,
            name: document.getElementById('roomName').value,
            type: document.getElementById('roomType').value,
            capacity: document.getElementById('roomCapacity').value
        };
        
        if (RoomManager.saveRoom(formData)) {
            showNotification('บันทึกข้อมูลห้องเรียบร้อยแล้ว', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('roomFormModal'));
            modal.hide();
        }
    });
    
    // Class Management
    document.getElementById('addClassBtn').addEventListener('click', () => {
        ClassManager.addClass();
    });
    
    document.getElementById('classForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = {
            id: document.getElementById('classId').value,
            code: document.getElementById('classCode').value,
            name: document.getElementById('className').value,
            program: document.getElementById('classProgram').value,
            advisor: document.getElementById('classAdvisor').value
        };
        
        if (ClassManager.saveClass(formData)) {
            showNotification('บันทึกข้อมูลระดับชั้นเรียบร้อยแล้ว', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('classFormModal'));
            modal.hide();
        }
    });
    
    // Schedule form
    document.getElementById('scheduleForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = {
            className: document.getElementById('scheduleClassName').value,
            day: document.getElementById('scheduleDay').value,
            period: document.getElementById('schedulePeriod').value,
            subject: document.getElementById('scheduleSubject').value,
            teacher: document.getElementById('scheduleTeacher').value,
            room: document.getElementById('scheduleRoom').value
        };
        
        if (ScheduleEditor.saveSchedule(formData)) {
            showNotification('บันทึกตารางเรียนเรียบร้อยแล้ว', 'success');
            ScheduleRenderer.renderAllViews();
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('scheduleFormModal'));
            modal.hide();
        } else {
            showNotification('เกิดข้อผิดพลาดในการบันทึก', 'error');
        }
    });
    
    // Delete schedule button
    document.getElementById('deleteScheduleBtn').addEventListener('click', function() {
        const className = document.getElementById('scheduleClassName').value;
        const day = document.getElementById('scheduleDay').value;
        const period = document.getElementById('schedulePeriod').value;
        
        if (ScheduleEditor.deleteSchedule(className, day, period)) {
            showNotification('ลบรายการตารางเรียนเรียบร้อยแล้ว', 'success');
            ScheduleRenderer.renderAllViews();
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('scheduleFormModal'));
            modal.hide();
        } else {
            showNotification('เกิดข้อผิดพลาดในการลบ', 'error');
        }
    });
    
    // Google Sheets buttons
    document.getElementById('saveScriptUrl').addEventListener('click', saveScriptUrl);
    document.getElementById('testConnection').addEventListener('click', testConnectionDetailed);
    document.getElementById('initializeSheets').addEventListener('click', initializeSheets);
    document.getElementById('syncToSheets').addEventListener('click', syncToSheets);
    document.getElementById('syncToSheetsBatch').addEventListener('click', syncToSheetsBatch);
    
    document.getElementById('saveScriptUrlModal').addEventListener('click', saveScriptUrlModal);
    document.getElementById('testConnectionModal').addEventListener('click', testConnectionDetailed);
    document.getElementById('initializeSheetsModal').addEventListener('click', initializeSheetsModal);
    document.getElementById('syncToSheetsModal').addEventListener('click', syncToSheetsModal);
    document.getElementById('syncToSheetsBatchModal').addEventListener('click', syncToSheetsBatchModal);
    document.getElementById('loadFromSheetsModal').addEventListener('click', loadFromSheetsModal);
    
    // Troubleshooting buttons
    document.getElementById('clearCache').addEventListener('click', clearCache);
    document.getElementById('checkPermissions').addEventListener('click', checkPermissions);
    document.getElementById('reloadData').addEventListener('click', reloadData);
}

function login() {
    isAdmin = true;
    localStorage.setItem('isAdmin', 'true');
    updateEditMode();
    updateViewVisibility();
    ScheduleRenderer.renderAllViews();
    showNotification('เข้าสู่ระบบผู้ดูแลสำเร็จ', 'success');
}

function logout() {
    isAdmin = false;
    localStorage.removeItem('isAdmin');
    updateEditMode();
    updateViewVisibility();
    ScheduleRenderer.renderAllViews();
    showNotification('ออกจากระบบสำเร็จ', 'success');
}

function validateAndFixUrl(url) {
    if (!url) return null;
    
    let fixedUrl = url.trim();
    
    // ตรวจสอบว่าเป็น URL ที่ถูกต้อง
    try {
        new URL(fixedUrl);
    } catch (error) {
        showNotification('URL ไม่ถูกต้อง', 'error');
        return null;
    }
    
    // ตรวจสอบว่าเป็น Google Apps Script URL หรือไม่
    if (!fixedUrl.includes('script.google.com')) {
        showNotification('กรุณาใช้ Google Apps Script URL', 'warning');
    }
    
    // ตรวจสอบว่าไม่มี /dev ที่ส่วนท้าย
    if (fixedUrl.includes('/dev')) {
        fixedUrl = fixedUrl.replace('/dev', '');
        showNotification('เปลี่ยนจาก deployment /dev เป็น production', 'info');
    }
    
    return fixedUrl;
}

function saveScriptUrl() {
    let url = document.getElementById('scriptUrl').value.trim();
    
    const fixedUrl = validateAndFixUrl(url);
    if (!fixedUrl) return;
    
    googleSheetsUrl = fixedUrl;
    DataManager.saveToLocalStorage();
    
    // อัพเดท URL ในฟิลด์
    document.getElementById('scriptUrl').value = fixedUrl;
    
    showNotification('บันทึก URL เรียบร้อยแล้ว', 'success');
    ScheduleRenderer.renderSystemInfo();
    
    // ทดสอบการเชื่อมต่ออัตโนมัติหลังจากบันทึก
    setTimeout(() => {
        testConnectionDetailed();
    }, 1000);
}

function saveScriptUrlModal() {
    let url = document.getElementById('scriptUrlModal').value.trim();
    
    const fixedUrl = validateAndFixUrl(url);
    if (!fixedUrl) return;
    
    googleSheetsUrl = fixedUrl;
    DataManager.saveToLocalStorage();
    
    // อัพเดท URL ในฟิลด์
    document.getElementById('scriptUrl').value = fixedUrl;
    document.getElementById('scriptUrlModal').value = fixedUrl;
    
    showNotification('บันทึก URL เรียบร้อยแล้ว', 'success');
    ScheduleRenderer.renderSystemInfo();
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('googleSheetsModal'));
    modal.hide();
    
    // ทดสอบการเชื่อมต่ออัตโนมัติหลังจากบันทึก
    setTimeout(() => {
        testConnectionDetailed();
    }, 1000);
}

// ฟังก์ชันสำหรับทดสอบการเชื่อมต่อแบบละเอียด
async function testConnectionDetailed() {
    const testBtn = document.getElementById('testConnection');
    const originalText = testBtn.innerHTML;
    
    try {
        testBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> กำลังทดสอบ...';
        testBtn.disabled = true;
        
        showNotification('🔄 กำลังทดสอบการเชื่อมต่อแบบละเอียด...', 'info');
        
        // ทดสอบพื้นฐานก่อน
        if (!googleSheetsUrl) {
            throw new Error('กรุณาระบุ Google Apps Script URL ก่อน');
        }
        
        // ตรวจสอบว่า URL ถูกต้อง
        const fixedUrl = DataManager.fixGoogleScriptUrl(googleSheetsUrl);
        console.log('URL หลังแก้ไข:', fixedUrl);
        
        // ทดสอบการเชื่อมต่อ
        const result = await GoogleSheetsManager.testConnection();
        
        if (result.success) {
            showNotification('✅ ' + result.message, 'success');
            
            // แสดงข้อมูลเพิ่มเติม
            console.log('✅ การเชื่อมต่อสำเร็จ:', result);
        } else {
            showNotification('❌ ' + result.message, 'error');
            
            // แสดงคำแนะนำในการแก้ไข
            showDetailedTroubleshooting(result);
        }
    } catch (error) {
        console.error('❌ Connection test failed:', error);
        showNotification('❌ การเชื่อมต่อล้มเหลว: ' + error.message, 'error');
        
        // แสดงคำแนะนำในการแก้ไข
        showDetailedTroubleshooting({ error: error.message });
    } finally {
        testBtn.innerHTML = originalText;
        testBtn.disabled = false;
    }
}

// ฟังก์ชันแสดงคำแนะนำการแก้ไขปัญหาแบบละเอียด
function showDetailedTroubleshooting(result) {
    const troubleshootingTips = `
        <div class="alert alert-warning mt-3 troubleshooting-tips">
            <h6><i class="fas fa-tools me-2"></i>คำแนะนำในการแก้ไขปัญหา "Failed to fetch":</h6>
            <ol class="mb-2">
                <li><strong>ตรวจสอบ Google Apps Script Deployment:</strong>
                    <ul>
                        <li>เปิด Google Apps Script</li>
                        <li>ไปที่ Deploy > Manage deployments</li>
                        <li>เลือกเวอร์ชันล่าสุดและกด "Deploy"</li>
                        <li>เลือก "Web App" เป็นประเภท</li>
                        <li>ตั้งค่า "Execute as" เป็น "Me"</li>
                        <li>ตั้งค่า "Who has access" เป็น "Anyone"</li>
                        <li>คัดลอก URL ใหม่</li>
                    </ul>
                </li>
                <li><strong>ตรวจสอบ CORS Settings:</strong>
                    <ul>
                        <li>ใน Google Apps Script ให้เพิ่ม doGet และ doPost functions</li>
                        <li>ใช้ ContentService.createTextOutput()</li>
                        <li>อย่าใช้ HtmlService สำหรับ API endpoints</li>
                    </ul>
                </li>
                <li><strong>ตรวจสอบ URL:</strong>
                    <ul>
                        <li>URL ต้องขึ้นต้นด้วย https://script.google.com/macros/s/...</li>
                        <li>ต้องไม่มี /dev ต่อท้าย URL</li>
                        <li>ลองเปิด URL ใน browser ใหม่เพื่อทดสอบ</li>
                    </ul>
                </li>
                <li><strong>ปัญหาอื่นๆ ที่อาจเกิด:</strong>
                    <ul>
                        <li>อินเทอร์เน็ตเชื่อมต่อไม่穩定</li>
                        <li>เบราว์เซอร์บล็อกการเชื่อมต่อ</li>
                        <li>Extension ในเบราว์เซอร์ขัดขวาง</li>
                    </ul>
                </li>
            </ol>
            <div class="mt-2">
                <button class="btn btn-sm btn-outline-primary me-2" onclick="openUrlInNewTab('${googleSheetsUrl}')">
                    <i class="fas fa-external-link-alt me-1"></i> เปิด URL ในแท็บใหม่
                </button>
                <button class="btn btn-sm btn-outline-info" onclick="testAlternativeMethods()">
                    <i class="fas fa-vial me-1"></i> ทดสอบวิธีการอื่น
                </button>
            </div>
        </div>
    `;
    
    // เพิ่มคำแนะนำใน system info view
    const systemInfo = document.getElementById('system-info');
    const existingTips = systemInfo.querySelector('.troubleshooting-tips');
    if (existingTips) {
        existingTips.remove();
    }
    
    const tipsElement = document.createElement('div');
    tipsElement.className = 'troubleshooting-tips';
    tipsElement.innerHTML = troubleshootingTips;
    systemInfo.querySelector('.card-body').appendChild(tipsElement);
}

// ฟังก์ชันทดสอบวิธีการอื่น
async function testAlternativeMethods() {
    showNotification('🔄 กำลังทดสอบวิธีการเชื่อมต่ออื่นๆ...', 'info');
    
    try {
        // ทดสอบ no-cors method
        const noCorsResult = await GoogleSheetsManager.testWithNoCors();
        showNotification('✅ No-CORS method: ' + noCorsResult.message, 'success');
        
        // ทดสอบ XMLHttpRequest
        const xhrResult = await GoogleSheetsManager.testWithXMLHttpRequest();
        showNotification('✅ XMLHttpRequest: ' + xhrResult.message, 'success');
        
    } catch (error) {
        showNotification('❌ การทดสอบวิธีการอื่นล้มเหลว: ' + error.message, 'error');
    }
}

function openUrlInNewTab(url) {
    window.open(url, '_blank');
}

async function initializeSheets() {
    try {
        showNotification('กำลังเริ่มต้นระบบ Google Sheets...', 'info');
        const result = await GoogleSheetsManager.initializeSheets();
        
        if (result.success) {
            showNotification('เริ่มต้นระบบสำเร็จ: ' + result.message, 'success');
            
            // โหลดข้อมูลหลังจาก initialize
            setTimeout(() => {
                GoogleSheetsManager.loadFromSheets();
            }, 2000);
        } else {
            showNotification('เริ่มต้นระบบล้มเหลว: ' + result.message, 'error');
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function initializeSheetsModal() {
    try {
        showNotification('กำลังเริ่มต้นระบบ Google Sheets...', 'info');
        const result = await GoogleSheetsManager.initializeSheets();
        
        if (result.success) {
            showNotification('เริ่มต้นระบบสำเร็จ: ' + result.message, 'success');
            
            // โหลดข้อมูลหลังจาก initialize
            setTimeout(() => {
                GoogleSheetsManager.loadFromSheets();
            }, 2000);
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('googleSheetsModal'));
            modal.hide();
        } else {
            showNotification('เริ่มต้นระบบล้มเหลว: ' + result.message, 'error');
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function syncToSheets() {
    try {
        showNotification('กำลังอัพโหลดข้อมูล...', 'info');
        const result = await GoogleSheetsManager.syncToSheets();
        if (result.success) {
            showNotification('อัพโหลดข้อมูลสำเร็จ: ' + result.message, 'success');
        } else {
            showNotification('อัพโหลดข้อมูลล้มเหลว: ' + result.message, 'error');
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function syncToSheetsModal() {
    try {
        showNotification('กำลังอัพโหลดข้อมูล...', 'info');
        const result = await GoogleSheetsManager.syncToSheets();
        if (result.success) {
            showNotification('อัพโหลดข้อมูลสำเร็จ: ' + result.message, 'success');
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('googleSheetsModal'));
            modal.hide();
        } else {
            showNotification('อัพโหลดข้อมูลล้มเหลว: ' + result.message, 'error');
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// ฟังก์ชันใหม่: sync แบบแบ่งชุด
async function syncToSheetsBatch() {
    try {
        showNotification('กำลังอัพโหลดข้อมูลแบบแบ่งชุด...', 'info');
        const result = await GoogleSheetsManager.syncToSheetsBatch();
        if (result.success) {
            showNotification('อัพโหลดข้อมูลแบบแบ่งชุดสำเร็จ: ' + result.message, 'success');
        } else {
            showNotification('อัพโหลดข้อมูลแบบแบ่งชุดล้มเหลว: ' + result.message, 'error');
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function syncToSheetsBatchModal() {
    try {
        showNotification('กำลังอัพโหลดข้อมูลแบบแบ่งชุด...', 'info');
        const result = await GoogleSheetsManager.syncToSheetsBatch();
        if (result.success) {
            showNotification('อัพโหลดข้อมูลแบบแบ่งชุดสำเร็จ: ' + result.message, 'success');
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('googleSheetsModal'));
            modal.hide();
        } else {
            showNotification('อัพโหลดข้อมูลแบบแบ่งชุดล้มเหลว: ' + result.message, 'error');
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function loadFromSheetsModal() {
    try {
        showNotification('กำลังโหลดข้อมูล...', 'info');
        const result = await GoogleSheetsManager.loadFromSheets();
        if (result.success) {
            showNotification('โหลดข้อมูลสำเร็จ: ' + result.message, 'success');
            ScheduleRenderer.renderAllViews();
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('googleSheetsModal'));
            modal.hide();
        } else {
            showNotification('โหลดข้อมูลล้มเหลว: ' + result.message, 'error');
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function clearCache() {
    localStorage.clear();
    showNotification('ล้าง Cache เรียบร้อยแล้ว', 'success');
    setTimeout(() => {
        location.reload();
    }, 1000);
}

async function checkPermissions() {
    try {
        if (!googleSheetsUrl) {
            throw new Error('กรุณาระบุ Google Apps Script URL ก่อน');
        }
        
        const response = await fetch(DataManager.fixGoogleScriptUrl(googleSheetsUrl) + `?action=checkPermissions`);
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ ' + result.message, 'success');
        } else {
            showNotification('❌ ' + result.message, 'error');
        }
    } catch (error) {
        showNotification('❌ การตรวจสอบสิทธิ์ล้มเหลว: ' + error.message, 'error');
    }
}

function reloadData() {
    showNotification('กำลังโหลดข้อมูลใหม่...', 'info');
    ScheduleRenderer.renderAllViews();
    showNotification('โหลดข้อมูลใหม่เรียบร้อยแล้ว', 'success');
}

// Make functions globally available for HTML onclick events
window.saveScriptUrl = saveScriptUrl;
window.testConnectionDetailed = testConnectionDetailed;
window.initializeSheets = initializeSheets;
window.syncToSheets = syncToSheets;
window.syncToSheetsBatch = syncToSheetsBatch;
window.saveScriptUrlModal = saveScriptUrlModal;
window.testConnectionModal = testConnectionDetailed;
window.initializeSheetsModal = initializeSheetsModal;
window.syncToSheetsModal = syncToSheetsModal;
window.syncToSheetsBatchModal = syncToSheetsBatchModal;
window.loadFromSheetsModal = loadFromSheetsModal;
window.enableAdminMode = enableAdminMode;
window.openUrlInNewTab = openUrlInNewTab;
window.testAlternativeMethods = testAlternativeMethods;