// DOM Elements
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const apiKeyInput = document.getElementById('apiKey');
const targetLangSelect = document.getElementById('targetLang');
const chatContainer = document.getElementById('chatContainer');
const micBtn = document.getElementById('micBtn');
const textInput = document.getElementById('textInput');
const sendBtn = document.getElementById('sendBtn');
const statusText = document.getElementById('statusText');

// State
let isRecording = false;
let isProcessing = false;
let recognition = null;
let currentLanguage = targetLangSelect.value;
let synth = window.speechSynthesis;

// Initialize Speech Recognition
function initSpeechRecognition() {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = currentLanguage;

        recognition.onstart = () => {
            isRecording = true;
            updateMicButton();
            statusText.textContent = "Listening...";
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            handleUserSpeech(transcript);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            statusText.textContent = "Error: " + event.error;
            isRecording = false;
            updateMicButton();
        };

        recognition.onend = () => {
            if (isRecording) {
                // If it ended automatically but wasn't processed yet
                isRecording = false;
                updateMicButton();
                if (!isProcessing) {
                    statusText.textContent = "Ready";
                }
            }
        };
    } else {
        alert('Your browser does not support Speech Recognition. Please use Chrome.');
        micBtn.disabled = true;
        statusText.textContent = "Speech Recognition Not Supported";
    }
}

// Event Listeners
settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
});

targetLangSelect.addEventListener('change', (e) => {
    currentLanguage = e.target.value;
    if (recognition) {
        recognition.lang = currentLanguage;
    }
});

// Load saved API key
const savedApiKey = localStorage.getItem('geminiApiKey');
if (savedApiKey) {
    apiKeyInput.value = savedApiKey;
}

apiKeyInput.addEventListener('change', (e) => {
    localStorage.setItem('geminiApiKey', e.target.value);
});

// Mic Button logic (Press/Click to toggle)
micBtn.addEventListener('click', () => {
    if (isProcessing) return;

    // Stop TTS if speaking
    if (synth.speaking) {
        synth.cancel();
    }

    if (!isRecording) {
        try {
            recognition.start();
        } catch (e) {
            console.error("Could not start recognition", e);
        }
    } else {
        recognition.stop();
        isRecording = false;
        updateMicButton();
    }
});

function updateMicButton() {
    micBtn.classList.remove('recording', 'loading');
    
    if (isRecording) {
        micBtn.classList.add('recording');
        micBtn.innerHTML = '<i class="fa-solid fa-stop"></i><div class="ring-1"></div><div class="ring-2"></div>';
    } else if (isProcessing) {
        micBtn.classList.add('loading');
        micBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        sendBtn.disabled = true;
        textInput.disabled = true;
    } else {
        micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i><div class="ring-1"></div><div class="ring-2"></div>';
        sendBtn.disabled = false;
        textInput.disabled = false;
    }
}

// Handle Text Input
sendBtn.addEventListener('click', () => {
    const text = textInput.value.trim();
    if (text) {
        textInput.value = '';
        handleUserSpeech(text);
    }
});

textInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const text = textInput.value.trim();
        if (text) {
            textInput.value = '';
            handleUserSpeech(text);
        }
    }
});

// Handle User Input
async function handleUserSpeech(transcript) {
    if (!transcript.trim()) return;

    // Stop recording state
    isRecording = false;
    isProcessing = true;
    updateMicButton();
    statusText.textContent = "Processing...";

    // Add user message to UI
    appendUserMessage(transcript);

    // Call API
    await fetchAIResponse(transcript);

    isProcessing = false;
    updateMicButton();
    statusText.textContent = "Ready";
}

function appendUserMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message user-message';
    msgDiv.innerHTML = `
        <div class="avatar"><i class="fa-solid fa-user"></i></div>
        <div class="message-content"><p>${text}</p></div>
    `;
    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function appendAIMessage(replyText, correctionText) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message ai-message';
    
    let correctionHTML = '';
    if (correctionText && correctionText.trim() !== "No correction needed.") {
        correctionHTML = `
            <div class="correction">
                <div class="correction-title"><i class="fa-solid fa-circle-check"></i> Grammar Note</div>
                <p>${correctionText}</p>
            </div>
        `;
    }

    msgDiv.innerHTML = `
        <div class="avatar"><i class="fa-solid fa-robot"></i></div>
        <div class="message-content">
            <p>${replyText}</p>
            ${correctionHTML}
        </div>
    `;
    
    // Remove typing indicator if exists
    const typingInd = document.getElementById('typingIndicator');
    if (typingInd) typingInd.remove();

    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function showTypingIndicator() {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message ai-message';
    msgDiv.id = 'typingIndicator';
    msgDiv.innerHTML = `
        <div class="avatar"><i class="fa-solid fa-robot"></i></div>
        <div class="message-content">
            <div class="typing-indicator">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
        </div>
    `;
    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Speak the AI's response
function speakText(text) {
    if (!synth) return;
    
    // Cancel any ongoing speech
    if (synth.speaking) {
        synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find a voice for the current language
    const voices = synth.getVoices();
    const langPrefix = currentLanguage.split('-')[0]; // e.g. "en" from "en-US"
    
    const targetVoice = voices.find(v => v.lang.startsWith(langPrefix));
    if (targetVoice) {
        utterance.voice = targetVoice;
    }
    
    utterance.lang = currentLanguage;
    utterance.rate = 0.9; // Slightly slower for learning
    
    synth.speak(utterance);
}

// Call Gemini API
async function fetchAIResponse(userText) {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        appendAIMessage("Please enter your Gemini API Key in the settings panel above.", null);
        return;
    }

    showTypingIndicator();

    const langName = targetLangSelect.options[targetLangSelect.selectedIndex].text;
    const selectedModel = document.getElementById('modelSelect').value;
    
    const systemPrompt = `You are a friendly and encouraging language coach helping the user practice speaking ${langName}. 
The user's spoken input might contain grammar mistakes. 
Your task is to:
1. Provide a brief grammar correction ONLY if there are mistakes. If the grammar is perfect, output exactly "No correction needed."
2. Provide a conversational reply to continue the chat.

Output MUST be strictly in JSON format like this:
{
  "correction": "...", 
  "reply": "..."
}`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    { role: "user", parts: [{ text: systemPrompt }] },
                    { role: "model", parts: [{ text: "Understood. I will act as the language coach and output only JSON." }] },
                    { role: "user", parts: [{ text: `User said: "${userText}"` }] }
                ],
                generationConfig: {
                    temperature: 0.7,
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || response.statusText;
            
            // If model is not found, try to fetch available models
            if (response.status === 404) {
                let availableModels = "";
                try {
                    const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                    const modelsData = await modelsRes.json();
                    availableModels = modelsData.models
                        ?.filter(m => m.supportedGenerationMethods?.includes("generateContent"))
                        ?.map(m => m.name.split('/').pop())
                        .join(', ');
                } catch (e) {
                    console.error("Failed to fetch models list", e);
                }
                
                if (availableModels) {
                    throw new Error(`API Error: 404 - Model not found. \nAvailable models on your API key: ${availableModels}`);
                }
            }
            
            throw new Error(`API Error: ${response.status} - ${errorMessage}`);
        }

        const data = await response.json();
        
        // Handle safety blocks or empty responses
        if (!data.candidates || !data.candidates[0].content) {
            console.error("API response missing content:", data);
            throw new Error(`The model didn't return a valid response. It might have been blocked by safety filters. Finish reason: ${data.candidates?.[0]?.finishReason}`);
        }

        let resultText = data.candidates[0].content.parts[0].text;
        
        // Clean up markdown json blocks if the model outputs them
        resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // Parse JSON
        const result = JSON.parse(resultText);
        
        appendAIMessage(result.reply, result.correction);
        speakText(result.reply);

    } catch (error) {
        console.error("API Call failed:", error);
        appendAIMessage(`Sorry, there was an error processing your request: ${error.message}`, null);
    }
}

// Load voices when they are ready
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => {
        // Voices loaded
    };
}

// Initialize on load
initSpeechRecognition();
