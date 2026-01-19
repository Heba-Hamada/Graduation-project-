// =======================================================
// ملف: script.js
// الوصف: كود JavaScript الحقيقي للتفاعل مع Backend Flask و Gemini API
// =======================================================

const ANALYZE_URL = '/api/analyze_input';
const CHAT_URL = '/api/chat_query';

// =======================================================
// دالة إرسال طلب التحليل (الملف أو الرابط)
// =======================================================
async function startAnalysis() {
    const statusBox = document.getElementById("statusBox");
    if (statusBox) {
        statusBox.classList.remove("hidden");
        statusBox.textContent = "Uploading and starting analysis... Please wait.";
    }

    const formData = new FormData();
    const fileInput = document.getElementById('fileInput');
    const urlInput = document.getElementById('urlInput');

    let analysisType;

    // 1. التحقق من الإدخال واختيار نوع التحليل (ملف أو رابط)
    if (fileInput && fileInput.files.length > 0) {
        formData.append('file', fileInput.files[0]);
        analysisType = 'File';
    } else if (urlInput && urlInput.value.trim()) {
        formData.append('url', urlInput.value.trim());
        analysisType = 'URL';
    } else {
        alert("Please select a file or enter a URL.");
        if (statusBox) statusBox.classList.add("hidden");
        return;
    }

    try {
        // 2. إرسال الطلب الفعلي إلى Backend (app.py)
        const response = await fetch(ANALYZE_URL, {
            method: 'POST',
            body: formData 
        });

        const data = await response.json();
        
        // 3. عرض النتائج الحقيقية
        if (data.status === 'success') {
            displayAnalysisResult(data, analysisType, statusBox);
        } else {
            if (statusBox) statusBox.textContent = `Analysis Error: ${data.message}`;
            addSystemMessage(`Analysis Failed: ${data.message}`, 'error');
        }
    } catch (error) {
        if (statusBox) statusBox.textContent = `Connection Error: Could not reach the backend server.`;
        addSystemMessage(`Fatal Error: Server connection failed.`, 'error');
    }
}


// =======================================================
// دالة إرسال سؤال الدردشة (معدلة للتفاعل الحقيقي)
// =======================================================
async function sendMessage() {
    const input = document.getElementById("chatInput");
    const userQuery = input.value.trim();
    if (!userQuery) return;

    // 1. إضافة سؤال المستخدم
    addUserMessage(userQuery);
    input.value = ""; 
    
    // إضافة رسالة انتظار
    const loadingMessageId = Date.now();
    addSystemMessage('Typing...', loadingMessageId);
    
    try {
        // 2. إرسال الطلب الفعلي لـ LLM Chat Route
        const response = await fetch(CHAT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: userQuery })
        });

        const data = await response.json();
        
        // إزالة رسالة الانتظار
        removeMessage(loadingMessageId);
        
        // 3. عرض رد الذكاء الاصطناعي الحقيقي
        if (data.status === 'success') {
            addSystemMessage(data.response);
        } else {
            addSystemMessage(`AI Error: ${data.response || data.message}`);
        }
    } catch (error) {
        removeMessage(loadingMessageId);
        addSystemMessage(`Connection Error: Failed to reach the AI server.`);
    }
}


// =======================================================
// دوال المساعدة في العرض والتنسيق
// =======================================================

function addSystemMessage(msg, id = null) {
    const chatMessages = document.getElementById("chatMessages");
    if (!chatMessages) return; 
    const d = document.createElement("div");
    d.className = "system";
    d.textContent = "System: " + msg;
    if (id) d.id = `msg-${id}`;
    chatMessages.appendChild(d);
    chatMessages.scrollTop = chatMessages.scrollHeight; 
}

function addUserMessage(msg) {
    const chatMessages = document.getElementById("chatMessages");
    if (!chatMessages) return;
    const d = document.createElement("div");
    d.className = "user";
    d.textContent = "You: " + msg;
    chatMessages.appendChild(d);
    chatMessages.scrollTop = chatMessages.scrollHeight; 
}

function removeMessage(id) {
    const msg = document.getElementById(`msg-${id}`);
    if (msg) msg.remove();
}

function displayAnalysisResult(data, analysisType, statusBox) {
    // 1. عرض الحكم النهائي في مربع الحالة
    const llmResult = data.llm_result.response || 'Analysis complete.';
    if (statusBox) {
        statusBox.textContent = `Analysis Complete. ${llmResult}`;
    }

    // 2. إرسال تفاصيل النتائج إلى منطقة الدردشة (Analysis Assistant)
    let summary = `Final Report (${analysisType}): \n`;
    if (analysisType === 'File') {
        summary += `\n* Extracted Strings: ${data.strings_count} found. (Analysis based on first 50)\n`;
    }
    summary += `\n* AI Verdict (Gemini): ${llmResult}`;

    addSystemMessage(summary);
}

// =======================================================
// ربط الأحداث والأزرار (يتم تنفيذه عند تحميل الصفحة)
// =======================================================

document.addEventListener('DOMContentLoaded', () => {
    // ربط زر Start Analysis
    const startAnalysisButton = document.querySelector('button'); 
    if (startAnalysisButton) {
        startAnalysisButton.addEventListener('click', startAnalysis);
    }

    // ربط زر الإرسال للمحادثة
    const sendChatButton = document.querySelectorAll('button')[1];
    const chatInput = document.getElementById('chatInput');
    
    if (sendChatButton) {
        sendChatButton.addEventListener('click', sendMessage);
    }
    // تفعيل إرسال الدردشة بزر Enter
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    // إضافة IDs للعناصر التي لم تكن موجودة في الـ HTML الأصلي لزميلتك لتشغيل الـ JS
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.id = 'fileInput';
    
    const urlInput = document.querySelector('input[placeholder="https://example.com"]');
    if (urlInput) urlInput.id = 'urlInput';
    
    // إضافة منطقة لعرض رسالة حالة التحميل/النتيجة أسفل المدخلات
    const analysisContainer = document.querySelector('form') || document.body;
    let statusBox = document.getElementById('statusBox');
    if (!statusBox) {
        statusBox = document.createElement('div');
        statusBox.id = 'statusBox';
        statusBox.style.margin = '10px 0';
        statusBox.style.padding = '10px';
        statusBox.style.backgroundColor = '#eee';
        statusBox.classList.add('hidden'); 
        analysisContainer.insertBefore(statusBox, analysisContainer.firstChild.nextSibling); 
    }
    
    // التأكد من وجود منطقة لعرض رسائل الدردشة
    let chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) {
        chatMessages = document.createElement('div');
        chatMessages.id = 'chatMessages';
        chatMessages.style.border = '1px solid #ccc';
        chatMessages.style.height = '150px';
        chatMessages.style.overflowY = 'scroll';
        const chatSection = document.getElementById('Analysis-Assistant-Section') || document.body;
        chatSection.appendChild(chatMessages);
    }
});