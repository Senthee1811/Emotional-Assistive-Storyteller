import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import {
  Mic, MicOff, Play, Shield, Award, CheckCircle, RefreshCw,
  Activity, Sparkles, Volume2, Heart, Smile, ArrowRight, History
} from 'lucide-react';
import axios from 'axios';
import confetti from 'canvas-confetti';

const PRACTICE_SENTENCES = [
  'The bright yellow sun rises over the green mountain every single morning.',
  'Pip the little star twinkled softly in the quiet indigo sky.',
  'Maya laughed and danced with the friendly rabbit under the silver oak.',
  'Leo took four calm deep breaths and smiled at the gentle ocean breeze.'
];

export default function StutterAnalyzer({ showToast }) {
  const [selectedPromptIndex, setSelectedPromptIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [audioBlobUrl, setAudioBlobUrl] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const containerRef = useRef(null);
  const assessmentRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current.querySelectorAll('.stutter-anim'),
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: 'power2.out' }
      );
    }
  }, []);

  useEffect(() => {
    if (assessment && assessmentRef.current) {
      gsap.fromTo(
        assessmentRef.current,
        { opacity: 0, scale: 0.95, y: 15 },
        { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'back.out(1.4)' }
      );
    }
  }, [assessment]);

  // Fetch past practice sessions
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get('/api/stutter/history');
        if (res.data && Array.isArray(res.data)) {
          setHistoryList(res.data.slice(0, 5));
        }
      } catch (err) {
        console.warn('History fetch fallback:', err.message);
      }
    };
    fetchHistory();
  }, []);

  // Ensure browser robotic speech synthesis is disabled
  const speakFeedback = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Start real microphone recording
  const startRecording = async () => {
    audioChunksRef.current = [];
    setAssessment(null);
    setAudioBlobUrl(null);
    setRecordingSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioBlobUrl(url);
        stream.getTracks().forEach(track => track.stop());

        // Send to real stutter detection acoustic backend
        await analyzeAudioBlob(audioBlob);
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      showToast('Recording voice... speak naturally at your own comfortable pace! 🎙️', 'info');

      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone permission error:', err.message);
      showToast('Microphone access denied. Please grant microphone permission.', 'error');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRecording(false);
  };

  // Submit audio blob to /api/stutter/analyze (FastAPI Random Forest backend)
  const analyzeAudioBlob = async (audioBlob) => {
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'child_speech.wav');
      formData.append('file', audioBlob, 'child_speech.wav');

      const res = await axios.post('/api/stutter/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const data = res.data;
      const isStutter = data.is_stutter === true || data.classification === 'Stuttering_Disorder';
      const fluencyScore = data.fluency_score ?? (isStutter ? 65 : 95);
      const reps = data.details?.repetitions ?? 0;
      const blks = data.details?.blocks ?? 0;
      const prols = data.details?.prolongations ?? 0;
      const wpm = data.details?.wpm ? `${data.details.wpm} wpm` : '115 wpm';

      let stars = 5;
      if (isStutter) {
        stars = fluencyScore >= 75 ? 4 : fluencyScore >= 50 ? 3 : 2;
      }

      const parsedAssessment = {
        is_stutter: isStutter,
        classification: isStutter ? 'Stuttering_Disorder' : 'Normal',
        disfluency_type: data.disfluency_type || (isStutter ? 'Syllable Repetition' : 'Fluent Flow'),
        fluency_score: fluencyScore,
        disfluency_score: data.disfluency_score ?? (100 - fluencyScore),
        fluency_label: isStutter ? `${data.disfluency_type || 'Disfluency Detected'} 🌿` : 'Smooth & Confident Flow 🌟',
        stars,
        repetitions: reps,
        blocks: blks,
        prolongations: prols,
        pacingRate: `${wpm} (${isStutter ? 'Gentle pace needed' : 'Optimal & Rhythmic'})`,
        feedback_message: isStutter
          ? `We detected ${data.disfluency_type || 'some hesitation'} during reading. Take a deep breath — every practice helps build strong, calm speech confidence!`
          : 'Wonderful reading rhythm! Your airflow and syllable transitions were steady, cheerful, and confident.',
        exercise_tip: data.exercise_suggestion || (isStutter
          ? 'Take a slow, gentle belly breath before starting the next sentence.'
          : 'Keep up the great reading cadence!')
      };

      setAssessment(parsedAssessment);
      if (!isStutter) {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 } });
      }
      showToast(
        isStutter
          ? `Disfluency detected (${data.disfluency_type || 'Practice Mode'}). Here is your speech exercise! 🌿`
          : 'Speech fluency analysis complete: Smooth & confident reading! 🌟',
        isStutter ? 'info' : 'success'
      );
      speakFeedback(parsedAssessment);

      // Refresh history
      const histRes = await axios.get('/api/stutter/history');
      if (histRes.data?.history && Array.isArray(histRes.data.history)) {
        setHistoryList(histRes.data.history.slice(0, 5));
      } else if (histRes.data && Array.isArray(histRes.data)) {
        setHistoryList(histRes.data.slice(0, 5));
      }
    } catch (err) {
      console.warn('Acoustic model inference error:', err.message);
      showToast('Could not analyze audio. Please try recording again.', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div ref={containerRef} style={{ maxWidth: '1050px', margin: '40px auto 80px', padding: '0 20px' }}>
      {/* Title & Introduction */}
      <div className="stutter-anim" style={{ textAlign: 'center', marginBottom: '36px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span className="badge badge-primary" style={{ fontSize: '0.85rem' }}>
            Random Forest Acoustic Disfluency Guidance
          </span>
        </div>
        <h1 className="fun-font" style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
          Speech Fluency & Practice Studio 🎙️
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '680px', margin: '0 auto' }}>
          A supportive, pressure-free space for children to practice reading aloud. We celebrate every syllable and provide calming speech guidance.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '28px', marginBottom: '36px' }}>
        {/* Left: Practice Prompt & Live Mic Recorder */}
        <div className="glass-card stutter-anim" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(236,72,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity color="var(--secondary)" size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem' }}>Practice Reading Prompt</h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Choose a line and read aloud when recording</div>
              </div>
            </div>

            {/* Prompt switcher pills */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {PRACTICE_SENTENCES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedPromptIndex(idx)}
                  className={selectedPromptIndex === idx ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '4px 10px', fontSize: '0.78rem', borderRadius: 'var(--radius-full)' }}
                  aria-label={`Select prompt ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Sentence Display */}
          <div
            style={{
              padding: '24px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,0.03)',
              border: '1.5px dashed var(--border-glass)',
              fontSize: '1.25rem',
              lineHeight: 1.6,
              textAlign: 'center',
              color: '#FFFFFF',
              fontWeight: 500,
              marginBottom: '28px'
            }}
          >
            "{PRACTICE_SENTENCES[selectedPromptIndex]}"
          </div>

          {/* Record Button & Timer */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={analyzing}
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                background: isRecording
                  ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
                  : 'linear-gradient(135deg, #6366F1 0%, #EC4899 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isRecording
                  ? '0 0 35px rgba(239, 68, 68, 0.6)'
                  : '0 0 30px var(--primary-glow)',
                transform: isRecording ? 'scale(1.08)' : 'scale(1)',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              aria-label={isRecording ? 'Stop recording voice' : 'Start microphone recording'}
            >
              {analyzing ? (
                <RefreshCw size={32} className="animate-spin" />
              ) : isRecording ? (
                <MicOff size={34} />
              ) : (
                <Mic size={34} />
              )}
            </button>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: isRecording ? '#EF4444' : 'var(--text-main)' }}>
                {isRecording ? `Recording... (${recordingSeconds}s)` : analyzing ? 'Analyzing syllable cadence...' : 'Tap to start speaking'}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {isRecording ? 'Tap the button again when finished reading' : 'Speak at your natural pace with no rush'}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Fluency Feedback & Calming Exercises */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {assessment ? (
            <div
              ref={assessmentRef}
              className="glass-card"
              style={{
                padding: '28px',
                border: assessment.is_stutter
                  ? '1px solid rgba(245, 158, 11, 0.4)'
                  : '1px solid rgba(16, 185, 129, 0.35)',
                background: assessment.is_stutter
                  ? 'rgba(245, 158, 11, 0.07)'
                  : 'rgba(16, 185, 129, 0.06)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award color={assessment.is_stutter ? '#F59E0B' : '#10B981'} size={24} />
                  <span style={{ fontSize: '1.2rem', fontWeight: 700, color: assessment.is_stutter ? '#FCD34D' : '#6EE7B7' }}>
                    {assessment.fluency_label}
                  </span>
                </div>
                <button
                  onClick={() => speakFeedback(assessment)}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.78rem', borderRadius: 'var(--radius-full)' }}
                  aria-label="Read speech feedback aloud"
                >
                  <Volume2 size={14} />
                  <span>Hear Aloud</span>
                </button>
              </div>

              {/* Status Pill & Star rating */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[...Array(assessment.stars || 5)].map((_, i) => (
                    <span key={i} style={{ fontSize: '1.4rem' }}>⭐</span>
                  ))}
                </div>
                <span className={`badge ${assessment.is_stutter ? 'badge-surprised' : 'badge-happy'}`}>
                  {assessment.is_stutter ? `Disfluency: ${assessment.disfluency_type}` : 'Fluent Reading Flow'}
                </span>
              </div>

              <p style={{ fontSize: '0.95rem', color: '#F1F5F9', lineHeight: 1.55, marginBottom: '20px' }}>
                {assessment.feedback_message}
              </p>

              {/* Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.25)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Repetitions</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: assessment.repetitions > 0 ? '#FCD34D' : '#FFFFFF' }}>
                    {assessment.repetitions}
                  </div>
                </div>
                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.25)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Blocks</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: assessment.blocks > 0 ? '#F87171' : '#FFFFFF' }}>
                    {assessment.blocks}
                  </div>
                </div>
                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.25)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Pacing</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: assessment.is_stutter ? '#FCD34D' : '#6EE7B7' }}>
                    {assessment.pacingRate.split(' ')[0]} wpm
                  </div>
                </div>
              </div>

              {/* Gentle Calming Practice Suggestion */}
              <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F59E0B', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Smile size={15} />
                  <span>{assessment.is_stutter ? 'Recommended Speech Exercise:' : 'Fluency Tip:'}</span>
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                  {assessment.exercise_tip}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card stutter-anim" style={{ padding: '28px', textAlign: 'center' }}>
              <Sparkles size={36} color="var(--primary-light)" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Speech Practice Companion</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '300px', margin: '0 auto' }}>
                Record yourself reading the prompt to receive positive acoustic fluency feedback and relaxation tips.
              </p>
            </div>
          )}

          {/* Past Sessions History */}
          <div className="glass-card stutter-anim" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <History color="var(--text-dim)" size={18} />
              <h3 style={{ fontSize: '1.05rem' }}>Recent Practice Sessions</h3>
            </div>

            {historyList.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {historyList.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-glass)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.85rem'
                    }}
                  >
                    <span>Session #{item.id || idx + 1} - {item.classification || 'Normal'}</span>
                    <span className="badge badge-happy" style={{ fontSize: '0.72rem' }}>
                      Completed
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                No past sessions recorded yet. Start your first practice above!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
