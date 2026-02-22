const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const speech = require('@google-cloud/speech');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// 1. הגדרות מפתחות מתוך משתני הסביבה (Render)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const speechClient = new speech.SpeechClient({
    credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
});

// 2. נקודת כניסה לשיחה (TwiML עבור Twilio)
app.post('/voice', (req, res) => {
    const twiml = `
        <Response>
            <Say language="he-IL">שלום, תאר את סגנון המוזיקה שתרצה שג'מיני יבנה עבורך, וסיים בסולמית.</Say>
            <Record action="/process-request" maxLength="15" finishOnKey="#" />
        </Response>
    `;
    res.type('text/xml').send(twiml);
});

// 3. עיבוד ההקלטה והמרתה לטקסט
app.post('/process-request', async (req, res) => {
    const audioUrl = req.body.RecordingUrl;

    try {
        // המרה לטקסט (STT)
        const [response] = await speechClient.recognize({
            audio: { uri: audioUrl },
            config: { encoding: 'MULAW', sampleRateHertz: 8000, languageCode: 'he-IL' }
        });
        
        const userPrompt = response.results.map(r => r.alternatives[0].transcript).join('\n');
        console.log("המשתמש ביקש:", userPrompt);

        // שליחה ל-Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(`צור תיאור מוזיקלי מפורט עבור: ${userPrompt}`);
        const aiResponse = result.response.text();

        // החזרת תשובה קולית למשתמש
        const twiml = `
            <Response>
                <Say language="he-IL">הבנתי, הנה מה שג'מיני מציע: ${aiResponse}</Say>
                <Hangup />
            </Response>
        `;
        res.type('text/xml').send(twiml);

    } catch (error) {
        console.error("Error:", error);
        res.type('text/xml').send('<Response><Say language="he-IL">מצטער, חלה שגיאה בעיבוד.</Say></Response>');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
