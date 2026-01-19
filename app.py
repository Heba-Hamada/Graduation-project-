import os
import re
import hashlib
from flask import Flask, request, render_template, redirect, url_for, jsonify
# المكتبات المطلوبة للتحليل والذكاء الاصطناعي
import pefile 
from google import genai
from google.genai.errors import APIError

# -------------------------- إعدادات Flask ----------------------------
app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
# مفتاح سري ضروري
app.secret_key = 'S!kr3t_Malw@re_K3y_2026_F!skr3_123' 

# 🔑 إعداد مفتاح Gemini API (Task 4)
# يجب استبدال هذه القيمة بمفتاحكِ الحقيقي للحصول على ردود LLM فعلية
LLM_API_KEY = "AIzaSyBOW8fstr0-am8hf4kRLX_kmN4dq5m9iP4" 

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# ----------------------------------------------------------------------
# 🔑 دوال التحليل الداخلي (Task 3: Strings Extraction Logic)
# ----------------------------------------------------------------------

def extract_strings_from_file(filepath):
    """
    (Task 3) تستخرج السلاسل النصية القابلة للطباعة من ملف ثنائي.
    (يجب تثبيت مكتبة pefile)
    """
    try:
        # قراءة الملف كبايتات
        with open(filepath, 'rb') as f:
            content = f.read()
        
        # البحث عن سلاسل ASCII قابلة للطباعة (6 أحرف أو أكثر)
        strings = re.findall(b'[\x20-\x7E]{6,}', content)
        all_strings = [s.decode('ascii', errors='ignore').strip() for s in strings]
        return sorted(list(set(filter(None, all_strings))))
        
    except Exception as e:
        return [f"ERROR: Failed to extract strings: {e}"]

def analyze_url_for_strings(url):
    """
    (Task 3) تستخرج الخصائص النصية والهندسية من الرابط كمدخلات للـ LLM.
    """
    import urllib.parse
    
    parsed_url = urllib.parse.urlparse(url)
    
    # تحويل خصائص الرابط إلى سلاسل نصية بسيطة جاهزة لـ LLM
    output_strings = [
        f"URL Length: {len(url)}", 
        f"Scheme: {parsed_url.scheme}",
        f"Domain: {parsed_url.netloc}",
        f"Path Segments: {len(parsed_url.path.split('/'))}",
        f"Suspicious Keywords Check: {'True' if any(kw in url.lower() for kw in ['login', 'verify', '@']) else 'False'}"
    ]
        
    return output_strings

# ----------------------------------------------------------------------
# 🔑 دالة تحليل الذكاء الاصطناعي (Task 4: LLM Core Logic)
# ----------------------------------------------------------------------

def get_llm_response(prompt_type, input_data):
    """(Task 4) يرسل البيانات لـ LLM حسب نوع المهمة (تحليل أو محادثة)."""
    if not LLM_API_KEY or LLM_API_KEY == "YOUR_GEMINI_API_KEY":
        # رسالة وهمية في حالة عدم وضع المفتاح الحقيقي
        if prompt_type == 'analysis':
             return {"response": "LLM MOCK: Key missing. Based on the strings, the file is likely Medium Risk."}
        else:
             return {"response": "LLM MOCK: The AI assistant is offline. Please configure the LLM_API_KEY."}

    try:
        client = genai.Client(api_key=LLM_API_KEY)
        
        # هندسة المطالبة (Prompt Engineering)
        if prompt_type == 'analysis':
            prompt_text = (
                "You are an expert cybersecurity analyst. Analyze the following technical data "
                "(strings or URL properties). Provide a concise verdict (High/Medium/Low Risk) "
                "and a short, non-technical explanation.\n\n"
                f"Data to Analyze:\n{input_data}"
            )
        else: # chat
            prompt_text = f"You are a helpful assistant. Answer this user's question concisely:\n\nQuestion: {input_data}"

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt_text
        )
        
        return {"response": response.text}
    except APIError as e:
        return {"error": f"LLM API call failed: {e}"}
    except Exception as e:
        return {"error": f"LLM Connection Error: {e}"}

# ----------------------------------------------------------------------
# 🔑 مسار الواجهة الأمامية (للتوافق مع index.html)
# ----------------------------------------------------------------------

@app.route('/', methods=['GET'])
def index():
    """عرض ملف index.html مباشرة."""
    return render_template('index.html')

# ----------------------------------------------------------------------
# 🔑 مسارات API (Backend Core - Task 2)
# ----------------------------------------------------------------------

# 1. مسار معالجة التحليل (للملف أو الرابط)
@app.route('/api/analyze_input', methods=['POST'])
def api_analyze_input():
    """يستقبل طلب AJAX من startAnalysis() ويتعامل مع الملف أو الرابط."""

    # ------------------ معالجة الملف ------------------
    if 'file' in request.files and request.files['file'].filename != '':
        file = request.files['file']
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        file.save(filepath)
        
        # Task 3: استخلاص Strings
        strings = extract_strings_from_file(filepath)
        
        # Task 4: تحليل LLM (نرسل أول 50 سطر فقط لتجنب طول المطالبة)
        llm_analysis = get_llm_response('analysis', "\n".join(strings[:50]))
        
        # حذف الملف بعد التحليل
        if os.path.exists(filepath):
            os.remove(filepath)
        
        return jsonify({
            'status': 'success',
            'type': 'file',
            'message': f"Analysis complete for {file.filename}.",
            'strings_count': len(strings),
            'llm_result': llm_analysis
        })
        
    # ------------------ معالجة الرابط ------------------
    elif 'url' in request.form and request.form.get('url'):
        url_to_analyze = request.form.get('url')
        
        # Task 3: استخلاص خصائص الرابط (كسلاسل نصية)
        strings = analyze_url_for_strings(url_to_analyze)
        
        # Task 4: تحليل LLM
        llm_analysis = get_llm_response('analysis', "\n".join(strings))
        
        return jsonify({
            'status': 'success',
            'type': 'url',
            'message': f"Analysis complete for {url_to_analyze}.",
            'llm_result': llm_analysis
        })

    else:
        # إذا لم يتم إرسال ملف أو رابط
        return jsonify({'status': 'error', 'message': 'No file or URL provided for analysis.'}), 400

# 2. مسار معالجة استفسارات المحادثة (Chat/Q&A)
@app.route('/api/chat_query', methods=['POST'])
def api_chat_query():
    """يستقبل سؤال المستخدم ويرسل الرد من LLM."""
    
    data = request.get_json()
    user_query = data.get('query')

    if not user_query:
        return jsonify({'status': 'error', 'message': 'No query provided.'}), 400
    
    # Task 4: طلب استفسار من LLM
    llm_chat_response = get_llm_response('chat', user_query)
    
    return jsonify({
        'status': 'success',
        'response': llm_chat_response.get('response', llm_chat_response.get('error'))
    })

# ----------------------------------------------------------------------
if __name__ == '__main__':
    print("Backend Server Starting on http://127.0.0.1:5000/")
    app.run(debug=True)