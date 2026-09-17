# 🌐 R.P. Builders ERP — Online Cloud Deployment Guide
**पूर्ण अनलाइन क्लाउड सेटअप निर्देशिका (Step-by-Step)**

अब तपाईंले आफ्नो कम्प्युटरमा गह्रुँगो setup फाइल बनाउनु पर्दैन। यो गाइड पछ्याएर तपाईंले आफ्नो **R.P. Builders ERP** लाई अनलाइन इन्स्टाल गरी जुनसुकै कम्प्युटर, ल्यापटप, ट्याब्लेट वा मोबाइलबाट खोल्न मिल्ने बनाउन सक्नुहुन्छ।

---

## 🚀 विकल्प १: Render.com मा १-क्लिक Deploy (सबैभन्दा सजिलो र १००% नि:शुल्क)

### चरण १: Render.com मा लगइन गर्नुहोस्
1. [https://render.com](https://render.com) मा जानुहोस्।
2. **"Sign In"** वा **"Get Started"** मा क्लिक गरी **GitHub** मार्फत लगइन गर्नुहोस्।

### चरण २: नयाँ Web Service बनाउनुहोस्
1. Render को ड्यासबोर्डमा **"New +"** बटनमा क्लिक गर्नुहोस् र **"Web Service"** रोज्नुहोस्।
2. **"Build and deploy from a Git repository"** छान्नुहोस्।
3. आफ्नो GitHub रिपोजिटरी **`SidL340/rpbuilders`** कनेक्ट (Connect) गर्नुहोस्।

### चरण ३: सेटिङहरू भर्नुहोस्
- **Name**: `rp-builders-erp` (वा आफ्नो इच्छा अनुसार)
- **Region**: Singapore (नेपालको लागि सबैभन्दा छिटो)
- **Branch**: `main`
- **Root Directory**: *(खाली छोड्नुहोस्)*
- **Runtime**: `Node`
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Instance Type**: `Free`

### चरण ४: Environment Variables (वातावरणीय चलहरू)
तल **"Environment Variables"** सेक्सनमा यी कुञ्जीहरू थप्नुहोस्:
- `NODE_ENV` = `production`
- `JWT_SECRET` = `rp_builders_secret_token_key_2082`

*(यदि तपाईंले तलको Cloud Database प्रयोग गर्नुभएको छ भने `DATABASE_URL` पनि यहाँ राख्नुहोस्)*

### चरण ५: Deploy!
- **"Deploy Web Service"** मा क्लिक गर्नुहोस्।
- केही मिनेटमा Render ले सिस्टम अनलाइन बनाइदिनेछ र तपाईंलाई यस्तो लिंक दिनेछ:
  👉 **`https://rp-builders-erp.onrender.com`**

---

## 🗄️ क्लाउड डाटाबेस (Free Cloud Database) कसरी लिने?

यदि तपाईं डाटा सधैंका लागि सुरक्षित र १००% अनलाइन क्लाउडमा राख्न चाहनुहुन्छ भने:

### TiDB Cloud (सिफारिस गरिएको - Free Forever):
1. [https://tidbcloud.com](https://tidbcloud.com) मा जानुहोस् र Google/GitHub बाट Free Account बनाउनुहोस्।
2. **"Serverless Cluster"** (Free) सिर्जना गर्नुहोस्।
3. **"Connect"** मा क्लिक गरी Connection String (MySQL URL) कपी गर्नुहोस्।
4. त्यो URL लाई Render को Environment Variables मा:
   ```env
   DATABASE_URL=mysql://username:password@gateway.tidbcloud.com:4000/rp_builders_db?ssl={"rejectUnauthorized":true}
   ```
   को रूपमा पेस्ट गर्नुहोस्।
5. हाम्रो सफ्टवेयरले पहिलो पटक चल्दा सम्पूर्ण टेबल र अकाउन्टिङ डाटा स्वतः सिर्जना (auto-initialize) गरिदिन्छ!

---

## 📱 लगइन विवरण (Default Login Credentials)
- **Username**: `admin`
- **Password**: `password`
*(लगइन गरेपछि सेटिङ्सबाट पासवर्ड तुरुन्त फेर्न सक्नुहुन्छ)*
