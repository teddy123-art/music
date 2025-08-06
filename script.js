// DOM 요소들
const apiKeyInput = document.getElementById('apiKey');
const saveApiKeyBtn = document.getElementById('saveApiKey');
const topicInput = document.getElementById('topicInput');
const generateBtn = document.getElementById('generateBtn');
const outputSection = document.getElementById('outputSection');
const lyricsOutput = document.getElementById('lyricsOutput');
const styleOutput = document.getElementById('styleOutput');
const sunoOutput = document.getElementById('sunoOutput');
const copyAllBtn = document.getElementById('copyAllBtn');
const copyLyricsBtn = document.getElementById('copyLyricsBtn');
const copySunoBtn = document.getElementById('copySunoBtn');
const loadingOverlay = document.getElementById('loadingOverlay');

// 저장된 API 키 불러오기
function loadApiKey() {
    const savedApiKey = localStorage.getItem('musicbank_api_key');
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
    }
}

// API 키 저장
function saveApiKey() {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
        localStorage.setItem('musicbank_api_key', apiKey);
        showNotification('API 키가 저장되었습니다!', 'success');
    } else {
        showNotification('API 키를 입력해주세요.', 'error');
    }
}

// Gemini API를 사용한 가사 생성
async function generateLyrics(topic, apiKey) {
    const prompt = `
다음 주제나 내용을 바탕으로 한국어 노래 가사를 작성해주세요:

주제: ${topic}

다음 형식으로 응답해주세요:

**가사:**
[여기에 2-3절의 가사를 작성해주세요. 각 절은 4-6줄 정도로 구성하고, 후렴구도 포함해주세요.]

**추천 스타일:**
[이 가사에 어울리는 음악 스타일을 추천해주세요. 예: 팝, 발라드, 락, 재즈, R&B, 힙합 등]

**SUNO AI 형식:**
[가사와 스타일을 SUNO AI에서 사용할 수 있는 형식으로 정리해주세요. 가사는 그대로 유지하고, 스타일 정보를 명확하게 포함해주세요.]

가사는 감정적이고 리듬감 있게 작성해주시고, 주제와 잘 어울리는 메타포와 이미지를 사용해주세요.
`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.8,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API 요청 실패: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error('API 응답 형식이 올바르지 않습니다.');
        }
    } catch (error) {
        console.error('API 호출 오류:', error);
        throw error;
    }
}

// 응답 파싱
function parseResponse(response) {
    const sections = {
        lyrics: '',
        style: '',
        suno: ''
    };

    // 가사 섹션 추출
    const lyricsMatch = response.match(/\*\*가사:\*\*([\s\S]*?)(?=\*\*추천 스타일:\*\*|\*\*SUNO AI 형식:\*\*|$)/);
    if (lyricsMatch) {
        sections.lyrics = lyricsMatch[1].trim();
    }

    // 스타일 섹션 추출
    const styleMatch = response.match(/\*\*추천 스타일:\*\*([\s\S]*?)(?=\*\*SUNO AI 형식:\*\*|$)/);
    if (styleMatch) {
        sections.style = styleMatch[1].trim();
    }

    // SUNO AI 형식 섹션 추출
    const sunoMatch = response.match(/\*\*SUNO AI 형식:\*\*([\s\S]*?)$/);
    if (sunoMatch) {
        sections.suno = sunoMatch[1].trim();
    }

    return sections;
}

// 가사 생성 실행
async function handleGenerateLyrics() {
    const topic = topicInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    if (!topic) {
        showNotification('가사 주제를 입력해주세요.', 'error');
        return;
    }

    if (!apiKey) {
        showNotification('API 키를 입력해주세요.', 'error');
        return;
    }

    // 로딩 표시
    loadingOverlay.style.display = 'flex';
    generateBtn.disabled = true;

    try {
        const response = await generateLyrics(topic, apiKey);
        const sections = parseResponse(response);

        // 결과 표시
        lyricsOutput.textContent = sections.lyrics || '가사를 생성할 수 없습니다.';
        styleOutput.textContent = sections.style || '스타일을 추천할 수 없습니다.';
        sunoOutput.textContent = sections.suno || 'SUNO 형식을 생성할 수 없습니다.';

        outputSection.style.display = 'block';
        
        // 결과 섹션으로 스크롤
        outputSection.scrollIntoView({ behavior: 'smooth' });

        showNotification('가사가 성공적으로 생성되었습니다!', 'success');

    } catch (error) {
        console.error('가사 생성 오류:', error);
        
        let errorMessage = '가사 생성 중 오류가 발생했습니다.';
        if (error.message.includes('API')) {
            errorMessage = 'API 키를 확인해주세요.';
        }
        
        showNotification(errorMessage, 'error');
    } finally {
        // 로딩 숨김
        loadingOverlay.style.display = 'none';
        generateBtn.disabled = false;
    }
}

// 복사 기능들
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('클립보드에 복사되었습니다!', 'success');
    }).catch(() => {
        // 폴백: 텍스트 영역 사용
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('클립보드에 복사되었습니다!', 'success');
    });
}

function copyAllContent() {
    const allContent = `🎵 가사\n${lyricsOutput.textContent}\n\n🎨 추천 스타일\n${styleOutput.textContent}\n\n🎤 SUNO AI 형식\n${sunoOutput.textContent}`;
    copyToClipboard(allContent);
}

function copyLyricsOnly() {
    copyToClipboard(lyricsOutput.textContent);
}

function copySunoFormat() {
    copyToClipboard(sunoOutput.textContent);
}

// 알림 표시
function showNotification(message, type = 'info') {
    // 기존 알림 제거
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // 스타일 적용
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        font-weight: 500;
        z-index: 1001;
        animation: slideIn 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;

    // 타입별 색상
    if (type === 'success') {
        notification.style.background = 'linear-gradient(45deg, #00b894, #00a085)';
    } else if (type === 'error') {
        notification.style.background = 'linear-gradient(45deg, #e74c3c, #c0392b)';
    } else {
        notification.style.background = 'linear-gradient(45deg, #74b9ff, #0984e3)';
    }

    document.body.appendChild(notification);

    // 3초 후 자동 제거
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// CSS 애니메이션 추가
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', () => {
    loadApiKey();
    
    saveApiKeyBtn.addEventListener('click', saveApiKey);
    generateBtn.addEventListener('click', handleGenerateLyrics);
    copyAllBtn.addEventListener('click', copyAllContent);
    copyLyricsBtn.addEventListener('click', copyLyricsOnly);
    copySunoBtn.addEventListener('click', copySunoFormat);

    // Enter 키로 가사 생성
    topicInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            handleGenerateLyrics();
        }
    });

    // API 키 입력 필드에서 Enter 키로 저장
    apiKeyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveApiKey();
        }
    });
});

// 페이지 로드 시 초기화
window.addEventListener('load', () => {
    // 로딩 완료 후 부드러운 애니메이션
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
}); 