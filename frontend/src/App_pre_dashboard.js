import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Textarea } from "./components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Progress } from "./components/ui/progress";
import { Badge } from "./components/ui/badge";
import { Separator } from "./components/ui/separator";
import { AlertCircle, Camera, Clock, CheckCircle, Award, BookOpen, Brain, Target, Volume2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Processing Overlay Component
const ProcessingOverlay = ({ message, progress }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="w-11/12 max-w-md">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">{message}</p>
              {progress !== undefined && (
                <div className="mt-4">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-gray-500 mt-2">{progress}%</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Landing Page Component
const LandingPage = ({ onStartInterview, onLearnMore }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="max-w-6xl mx-auto text-center space-y-6 md:space-y-8">
        <div className="space-y-3 md:space-y-4">
          <div className="flex items-center justify-center space-x-2 md:space-x-3">
            <Brain className="h-8 w-8 md:h-12 md:w-12 text-blue-600" />
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight">
              PracticePal
            </h1>
          </div>
          <p className="text-base md:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed px-4">
            Experience a real interview with AI — tailored to your role, resume, and job description.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mt-8 md:mt-12 px-4">
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-4 md:pt-6 pb-4 md:pb-6">
              <Target className="h-6 w-6 md:h-8 md:w-8 text-blue-600 mx-auto mb-2 md:mb-3" />
              <h3 className="font-semibold text-sm md:text-base text-gray-900 mb-1 md:mb-2">Dynamic Questions</h3>
              <p className="text-xs md:text-sm text-gray-600">AI generates questions on-the-fly based on your responses</p>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-4 md:pt-6 pb-4 md:pb-6">
              <Camera className="h-6 w-6 md:h-8 md:w-8 text-green-600 mx-auto mb-2 md:mb-3" />
              <h3 className="font-semibold text-sm md:text-base text-gray-900 mb-1 md:mb-2">Realistic Experience</h3>
              <p className="text-xs md:text-sm text-gray-600">Practice with video recording and AI voice interviewer</p>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-4 md:pt-6 pb-4 md:pb-6">
              <Award className="h-6 w-6 md:h-8 md:w-8 text-purple-600 mx-auto mb-2 md:mb-3" />
              <h3 className="font-semibold text-sm md:text-base text-gray-900 mb-1 md:mb-2">AI Feedback</h3>
              <p className="text-xs md:text-sm text-gray-600">Get detailed feedback on your performance and areas to improve</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center mt-8 md:mt-12 px-4">
          <Button 
            size="lg" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 md:px-8 py-3 text-base md:text-lg w-full sm:w-auto"
            onClick={(e) => {
              e.preventDefault();
              onStartInterview();
            }}
          >
            Start Interview
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="border-blue-600 text-blue-600 hover:bg-blue-50 px-6 md:px-8 py-3 text-base md:text-lg w-full sm:w-auto"
            onClick={onLearnMore}
          >
            Learn More
          </Button>
        </div>
      </div>
    </div>
  );
};

// Interview Setup Component
const InterviewSetup = ({ onSetupComplete }) => {
  const [role, setRole] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [jobDescription, setJobDescription] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
      if (allowedTypes.includes(file.type)) {
        setResumeFile(file);
        toast.success("Resume uploaded successfully!");
      } else {
        toast.error("Please upload a PDF or DOCX file");
        event.target.value = '';
      }
    }
  };

  const handleSubmit = async () => {
    if (!role || !jobDescription || !resumeFile || !difficulty) {
      toast.error("Please fill all fields and upload your resume");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('role', role);
      formData.append('difficulty', difficulty);
      formData.append('job_description', jobDescription);
      formData.append('resume_file', resumeFile);

      const response = await axios.post(`${API}/interview/setup`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data) {
        toast.success("Setup complete! Starting your interview...");
        onSetupComplete({
          setupId: response.data.setup_id,
          sessionId: response.data.session_id,
          difficulty: response.data.difficulty
        });
      }
    } catch (error) {
      console.error("Setup error:", error);
      toast.error("Failed to create interview setup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-6 md:py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-xl bg-white/90 backdrop-blur-sm border-0">
          <CardHeader className="text-center pb-6 md:pb-8 px-4 md:px-6">
            <CardTitle className="text-2xl md:text-3xl font-bold text-gray-900">
              Setup Your Interview
            </CardTitle>
            <CardDescription className="text-sm md:text-base text-gray-600 mt-2">
              Provide your details to generate a personalized interview experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6 px-4 md:px-6 pb-6 md:pb-8">
            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm md:text-base font-semibold text-gray-700">
                Target Role / Position
              </Label>
              <Select onValueChange={setRole} value={role}>
                <SelectTrigger className="w-full text-sm md:text-base h-11 md:h-12">
                  <SelectValue placeholder="Select your target role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="software-engineer">Software Engineer</SelectItem>
                  <SelectItem value="ai-engineer">AI Engineer</SelectItem>
                  <SelectItem value="data-scientist">Data Scientist</SelectItem>
                  <SelectItem value="ml-engineer">Machine Learning Engineer</SelectItem>
                  <SelectItem value="product-manager">Product Manager</SelectItem>
                  <SelectItem value="frontend-developer">Frontend Developer</SelectItem>
                  <SelectItem value="backend-developer">Backend Developer</SelectItem>
                  <SelectItem value="fullstack-developer">Full Stack Developer</SelectItem>
                  <SelectItem value="devops-engineer">DevOps Engineer</SelectItem>
                  <SelectItem value="cloud-engineer">Cloud Engineer</SelectItem>
                  <SelectItem value="qa-engineer">QA Engineer</SelectItem>
                  <SelectItem value="security-engineer">Security Engineer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty" className="text-sm md:text-base font-semibold text-gray-700">
                Interview Difficulty
              </Label>
              <Select onValueChange={setDifficulty} value={difficulty}>
                <SelectTrigger className="w-full text-sm md:text-base h-11 md:h-12">
                  <SelectValue placeholder="Select difficulty level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy - Basic questions</SelectItem>
                  <SelectItem value="medium">Medium - Standard interview level</SelectItem>
                  <SelectItem value="hard">Hard - Advanced technical depth</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resume" className="text-sm md:text-base font-semibold text-gray-700">
                Upload Resume
              </Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 md:p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                   onClick={() => fileInputRef.current?.click()}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {resumeFile ? (
                  <div className="space-y-2">
                    <CheckCircle className="h-8 w-8 md:h-10 md:w-10 text-green-600 mx-auto" />
                    <p className="text-sm md:text-base font-medium text-gray-900">{resumeFile.name}</p>
                    <Button variant="outline" size="sm" onClick={(e) => {
                      e.stopPropagation();
                      setResumeFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}>
                      Change File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <BookOpen className="h-8 w-8 md:h-10 md:w-10 text-gray-400 mx-auto" />
                    <p className="text-sm md:text-base text-gray-600">Click to upload or drag and drop</p>
                  </div>
                )}
              </div>
              <p className="text-xs md:text-sm text-gray-500">Upload PDF or DOCX format (Max 10MB)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jd" className="text-sm md:text-base font-semibold text-gray-700">
                Job Description
              </Label>
              <Textarea
                placeholder="Paste the complete job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={6}
                className="resize-none text-sm md:text-base min-h-[120px] md:min-h-[160px]"
              />
              <p className="text-xs md:text-sm text-gray-500">Include responsibilities, requirements, and qualifications</p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading || !role || !difficulty || !jobDescription || !resumeFile}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 md:py-3 text-base md:text-lg font-semibold h-12 md:h-14"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 md:h-5 md:w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm md:text-base">Creating Interview...</span>
                </div>
              ) : (
                "Start Interview"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Dynamic Video Interview Component with TTS
const DynamicVideoInterview = ({ sessionId, setupId, onInterviewComplete }) => {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [currentQuestionRecording, setCurrentQuestionRecording] = useState([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [processingStage, setProcessingStage] = useState(''); // For detailed progress
  const [isProcessing, setIsProcessing] = useState(false);
  
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  // Initialize camera
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((error) => {
        console.error("Camera access denied:", error);
        toast.error("Camera access required for interview");
      });

    return () => {
      cleanupMediaStream();
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    if (isRecording && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (isRecording && timeLeft === 0) {
      handleNextQuestion();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isRecording, timeLeft]);

  const cleanupMediaStream = () => {
    console.log("Cleaning up media stream");
    
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => {
        track.stop();
      });
      videoRef.current.srcObject = null;
    }
    
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    
    setMediaRecorder(null);
    setIsRecording(false);
    
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  const fetchNextQuestion = async () => {
    setIsLoadingQuestion(true);
    setProcessingStage('Generating next question...');
    try {
      const response = await axios.post(`${API}/interview/${sessionId}/next`);
      const questionData = response.data;
      
      setCurrentQuestion(questionData);
      
      // Play TTS audio if available
      if (questionData.question_audio) {
        setProcessingStage('AI preparing to speak...');
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for smoother transition
        await playQuestionAudio(questionData.question_audio);
      }
      
      // Start recording after audio plays
      if (!interviewStarted) {
        setInterviewStarted(true);
      }
      await startRecording();
      setIsProcessing(false);
      setProcessingStage('');
      
    } catch (error) {
      console.error("Failed to fetch next question:", error);
      toast.error("Failed to load next question");
      setIsProcessing(false);
      setProcessingStage('');
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  const playQuestionAudio = async (audioBase64) => {
    return new Promise((resolve, reject) => {
      try {
        setIsPlayingAudio(true);
        const audioBlob = base64ToBlob(audioBase64, 'audio/wav');
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.onended = () => {
            setIsPlayingAudio(false);
            URL.revokeObjectURL(audioUrl);
            resolve();
          };
          audioRef.current.onerror = () => {
            setIsPlayingAudio(false);
            URL.revokeObjectURL(audioUrl);
            reject(new Error("Audio playback failed"));
          };
          audioRef.current.play().catch(err => {
            console.error("Audio play error:", err);
            setIsPlayingAudio(false);
            reject(err);
          });
        } else {
          resolve();
        }
      } catch (error) {
        console.error("Audio playback error:", error);
        setIsPlayingAudio(false);
        resolve(); // Continue even if audio fails
      }
    });
  };

  const base64ToBlob = (base64, mimeType) => {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    
    return new Blob(byteArrays, { type: mimeType });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 }, 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      let mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
      
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setCurrentQuestionRecording(prev => [...prev, event.data]);
        }
      };

      recorder.onstop = () => {
        console.log('Recording stopped');
      };

      recorder.start(1000);
      setMediaRecorder(recorder);
      setIsRecording(true);
      setTimeLeft(120);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
    } catch (error) {
      console.error("Recording error:", error);
      toast.error(`Failed to start recording: ${error.message}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    setIsRecording(false);
  };

  const handleStartInterview = () => {
    fetchNextQuestion();
  };

  const handleNextQuestion = async () => {
    if (!currentQuestion) return;
    
    setIsProcessing(true);
    setProcessingStage('Analyzing your answer...');
    
    stopRecording();
    
    // Submit current answer
    try {
      const blob = new Blob(currentQuestionRecording, { type: 'video/webm' });
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64Audio = reader.result.split(',')[1];
        
        try {
          // Submit answer with progress feedback
          setProcessingStage('Transcribing your response...');
          await axios.post(`${API}/interview/${sessionId}/answer`, {
            question_id: currentQuestion.question_id,
            audio_data: base64Audio
          });
          
          // Check if this was the final question
          if (currentQuestion.is_final) {
            setProcessingStage('Generating comprehensive feedback...');
            await handleInterviewComplete();
          } else {
            // Fetch next question
            setCurrentQuestionRecording([]);
            setProcessingStage('Preparing next question...');
            await fetchNextQuestion();
          }
        } catch (error) {
          console.error("Failed to submit answer:", error);
          toast.error("Failed to submit answer");
          setIsProcessing(false);
        }
      };
      
      reader.readAsDataURL(blob);
      
    } catch (error) {
      console.error("Error processing recording:", error);
      toast.error("Failed to process recording");
      setIsProcessing(false);
    }
  };

  const handleInterviewComplete = async () => {
    cleanupMediaStream();
    
    try {
      const response = await axios.post(`${API}/interview/${sessionId}/end`);
      onInterviewComplete(response.data, setupId);
    } catch (error) {
      console.error("Failed to end interview:", error);
      toast.error("Failed to complete interview");
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-4 md:py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <Card className="shadow-2xl border-0 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 md:px-6 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl md:text-2xl">AI Mock Interview</CardTitle>
                {currentQuestion && (
                  <CardDescription className="text-blue-100 text-sm md:text-base mt-1">
                    Question {currentQuestion.question_index + 1} of {currentQuestion.total_questions}
                  </CardDescription>
                )}
              </div>
              {isRecording && (
                <div className="flex items-center space-x-2 bg-red-500 px-3 md:px-4 py-2 rounded-full">
                  <div className="h-2 w-2 md:h-3 md:w-3 bg-white rounded-full animate-pulse"></div>
                  <span className="text-white font-semibold text-sm md:text-base">Recording</span>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-4 md:p-8 space-y-4 md:space-y-6">
            {/* Video Preview */}
            <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              
              {/* Processing Overlay with Stages */}
              {isProcessing && (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 to-purple-900/90 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-white text-center space-y-4">
                    <div className="relative">
                      <div className="h-16 w-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Brain className="h-8 w-8 text-white animate-pulse" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg md:text-xl font-bold">{processingStage}</p>
                      <p className="text-sm text-white/70">Please wait...</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* TTS Playing Animation - Improved */}
              {isPlayingAudio && !isProcessing && (
                <div className="absolute inset-0 bg-gradient-to-br from-green-900/90 to-teal-900/90 flex items-center justify-center">
                  <div className="text-white text-center space-y-4 px-4">
                    {/* Animated Waveform */}
                    <div className="flex items-end justify-center space-x-1 h-16">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="w-2 bg-white rounded-full animate-pulse"
                          style={{
                            height: `${20 + Math.random() * 40}px`,
                            animationDelay: `${i * 0.1}s`,
                            animationDuration: '0.8s'
                          }}
                        />
                      ))}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-center space-x-2">
                        <Volume2 className="h-6 w-6 animate-pulse" />
                        <p className="text-lg md:text-xl font-bold">AI Interviewer Speaking</p>
                      </div>
                      <p className="text-sm text-white/80">Listen carefully to the question...</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Initial Loading */}
              {isLoadingQuestion && !isProcessing && !isPlayingAudio && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="text-white text-center space-y-3">
                    <div className="h-12 w-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-base md:text-lg font-semibold">Loading question...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Hidden audio element for TTS playback */}
            <audio ref={audioRef} className="hidden" />

            {/* Question Display - With Smooth Transition */}
            {currentQuestion && !isPlayingAudio && !isProcessing && (
              <div className="animate-fadeIn">
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-md">
                  <CardContent className="pt-4 md:pt-6 pb-4 md:pb-6">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 md:h-6 md:w-6 text-blue-600 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <p className="text-xs md:text-sm text-blue-600 font-semibold mb-1">
                          Question {currentQuestion.question_index + 1} of {currentQuestion.total_questions}
                        </p>
                        <p className="text-base md:text-lg text-gray-900 font-medium leading-relaxed">
                          {currentQuestion.question_text}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Timer */}
            {isRecording && (
              <div className="flex items-center justify-center space-x-3 p-3 md:p-4 bg-gray-50 rounded-lg">
                <Clock className="h-5 w-5 md:h-6 md:w-6 text-gray-600" />
                <span className="text-xl md:text-2xl font-bold text-gray-900">{formatTime(timeLeft)}</span>
              </div>
            )}

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {!interviewStarted ? (
                <Button
                  onClick={handleStartInterview}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white px-6 md:px-8 py-3 text-base md:text-lg w-full sm:w-auto shadow-lg hover:shadow-xl transition-all"
                  disabled={isLoadingQuestion || isProcessing}
                >
                  Start Interview
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleNextQuestion}
                    size="lg"
                    disabled={!isRecording || isPlayingAudio || isLoadingQuestion || isProcessing}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 md:px-8 py-3 text-base md:text-lg w-full sm:w-auto shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <div className="flex items-center space-x-2">
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Processing...</span>
                      </div>
                    ) : (
                      <span>{currentQuestion?.is_final ? "End Interview" : "Next Question"}</span>
                    )}
                  </Button>
                  
                  {/* End Interview Button */}
                  <Button
                    onClick={handleInterviewComplete}
                    size="lg"
                    variant="destructive"
                    disabled={!isRecording || isPlayingAudio || isLoadingQuestion || isProcessing}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 md:px-8 py-3 text-base md:text-lg w-full sm:w-auto shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                  >
                    End Interview Now
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Results Component (unchanged)
const InterviewResults = ({ feedbackData, setupId }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadReport = async () => {
    setIsDownloading(true);
    try {
      const response = await axios.get(`${API}/interview/report/${setupId}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `PracticePal_Interview_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("Report downloaded successfully!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download report");
    } finally {
      setIsDownloading(false);
    }
  };

  const feedback = feedbackData?.feedback || feedbackData || {};
  const overallScore = feedback.overall_score || 0;

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score) => {
    if (score >= 80) return "bg-green-50";
    if (score >= 60) return "bg-yellow-50";
    return "bg-red-50";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-6 md:py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-4 md:pb-6 px-4 md:px-6">
            <div className="flex justify-center mb-3 md:mb-4">
              <div className={`rounded-full p-3 md:p-4 ${getScoreBgColor(overallScore)}`}>
                <Award className={`h-10 w-10 md:h-12 md:w-12 ${getScoreColor(overallScore)}`} />
              </div>
            </div>
            <CardTitle className="text-2xl md:text-3xl font-bold text-gray-900">
              Interview Complete!
            </CardTitle>
            <CardDescription className="text-sm md:text-base mt-2">
              Here&apos;s your detailed performance analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-6 md:pb-8">
            <div className="text-center">
              <p className="text-sm md:text-base text-gray-600 mb-2">Overall Score</p>
              <p className={`text-5xl md:text-6xl font-bold ${getScoreColor(overallScore)}`}>
                {overallScore}
              </p>
              <p className="text-sm md:text-base text-gray-500 mt-1">out of 100</p>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Scores */}
        <Card className="shadow-xl border-0">
          <CardHeader className="px-4 md:px-6 py-4 md:py-5">
            <CardTitle className="text-lg md:text-xl">Detailed Assessment</CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-6 md:pb-8 space-y-4 md:space-y-6">
            {[
              { key: 'communication_skills', label: 'Communication Skills' },
              { key: 'technical_depth', label: 'Technical Depth' },
              { key: 'confidence_level', label: 'Confidence Level' },
              { key: 'structure_clarity', label: 'Response Structure' },
              { key: 'content_relevance', label: 'Content Relevance' }
            ].map(({ key, label }) => {
              const categoryData = feedback[key] || {};
              const score = categoryData.score || 0;
              
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm md:text-base font-semibold text-gray-900">{label}</h3>
                    <Badge variant="secondary" className={`${getScoreColor(score)} text-sm md:text-base`}>
                      {score}/100
                    </Badge>
                  </div>
                  <Progress value={score} className="h-2" />
                  <p className="text-xs md:text-sm text-gray-600">
                    {categoryData.feedback || 'No feedback available'}
                  </p>
                  <Separator className="mt-3 md:mt-4" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Suggestions */}
        {feedback.suggestions && feedback.suggestions.length > 0 && (
          <Card className="shadow-xl border-0">
            <CardHeader className="px-4 md:px-6 py-4 md:py-5">
              <CardTitle className="text-lg md:text-xl">Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="px-4 md:px-6 pb-6 md:pb-8">
              <ul className="space-y-2 md:space-y-3">
                {feedback.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start space-x-2 md:space-x-3">
                    <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-xs md:text-sm text-gray-700">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Transcript */}
        {feedback.transcript && (
          <Card className="shadow-xl border-0">
            <CardHeader className="px-4 md:px-6 py-4 md:py-5">
              <CardTitle className="text-lg md:text-xl">Your Responses</CardTitle>
            </CardHeader>
            <CardContent className="px-4 md:px-6 pb-6 md:pb-8">
              <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                <p className="text-xs md:text-sm text-gray-700 whitespace-pre-wrap">
                  {feedback.transcript}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
          <Button
            onClick={downloadReport}
            disabled={isDownloading}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 md:px-8 py-3 text-base md:text-lg w-full sm:w-auto"
          >
            {isDownloading ? (
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Downloading...</span>
              </div>
            ) : (
              "Download Report"
            )}
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="lg"
            className="border-blue-600 text-blue-600 hover:bg-blue-50 px-6 md:px-8 py-3 text-base md:text-lg w-full sm:w-auto"
          >
            Retake Interview
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="lg"
            className="border-gray-600 text-gray-600 hover:bg-gray-50 px-6 md:px-8 py-3 text-base md:text-lg w-full sm:w-auto"
          >
            Home
          </Button>
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [currentScreen, setCurrentScreen] = useState("landing");
  const [interviewData, setInterviewData] = useState(null);
  const [feedbackData, setFeedbackData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const handleStartInterview = () => {
    setCurrentScreen("setup");
  };

  const handleLearnMore = () => {
    toast.info("Learn more about PracticePal's AI-powered interview platform!");
  };

  const handleSetupComplete = (data) => {
    setInterviewData(data);
    setCurrentScreen("interview");
  };

  const handleInterviewComplete = (feedback, setupId) => {
    setFeedbackData(feedback);
    setCurrentScreen("results");
  };

  return (
    <div className="App">
      <Toaster position="top-right" richColors />
      
      {isProcessing && (
        <ProcessingOverlay 
          message="Processing your interview..." 
          progress={processingProgress}
        />
      )}

      {currentScreen === "landing" && (
        <LandingPage 
          onStartInterview={handleStartInterview}
          onLearnMore={handleLearnMore}
        />
      )}

      {currentScreen === "setup" && (
        <InterviewSetup onSetupComplete={handleSetupComplete} />
      )}

      {currentScreen === "interview" && interviewData && (
        <DynamicVideoInterview
          sessionId={interviewData.sessionId}
          setupId={interviewData.setupId}
          onInterviewComplete={handleInterviewComplete}
        />
      )}

      {currentScreen === "results" && feedbackData && (
        <InterviewResults 
          feedbackData={feedbackData}
          setupId={interviewData?.setupId}
        />
      )}
    </div>
  );
}

export default App;
