import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import { AlertCircle, Camera, Clock, CheckCircle, Award, BookOpen, Brain, Target } from "lucide-react";
import { toast, Toaster } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Landing Page Component
const LandingPage = ({ onStartInterview, onLearnMore }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="max-w-6xl mx-auto text-center space-y-6 md:space-y-8">
        {/* Logo and Title */}
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

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mt-8 md:mt-12 px-4">
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-4 md:pt-6 pb-4 md:pb-6">
              <Target className="h-6 w-6 md:h-8 md:w-8 text-blue-600 mx-auto mb-2 md:mb-3" />
              <h3 className="font-semibold text-sm md:text-base text-gray-900 mb-1 md:mb-2">Personalized Questions</h3>
              <p className="text-xs md:text-sm text-gray-600">AI generates questions tailored to your resume and target role</p>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-4 md:pt-6 pb-4 md:pb-6">
              <Camera className="h-6 w-6 md:h-8 md:w-8 text-green-600 mx-auto mb-2 md:mb-3" />
              <h3 className="font-semibold text-sm md:text-base text-gray-900 mb-1 md:mb-2">Realistic Experience</h3>
              <p className="text-xs md:text-sm text-gray-600">Practice with video recording just like a real interview</p>
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

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center mt-8 md:mt-12 px-4">
          <Button 
            size="lg" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 md:px-8 py-3 text-base md:text-lg w-full sm:w-auto"
            onClick={(e) => {
              e.preventDefault();
              onStartInterview();
            }}
            data-testid="start-interview-btn"
          >
            Start Interview
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="border-blue-600 text-blue-600 hover:bg-blue-50 px-6 md:px-8 py-3 text-base md:text-lg w-full sm:w-auto"
            onClick={onLearnMore}
            data-testid="learn-more-btn"
          >
            Learn More
          </Button>
        </div>
      </div>
    </div>
  );
};

// Interview Setup Component
const InterviewSetup = ({ onQuestionsGenerated }) => {
  const [role, setRole] = useState("");
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
    if (!role || !jobDescription || !resumeFile) {
      toast.error("Please fill all fields and upload your resume");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('role', role);
      formData.append('job_description', jobDescription);
      formData.append('resume_file', resumeFile);

      const response = await axios.post(`${API}/interview/setup`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data) {
        toast.success("Questions generated successfully!");
        onQuestionsGenerated(response.data);
      }
    } catch (error) {
      console.error("Setup error:", error);
      toast.error("Failed to generate questions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-6 md:py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-xl bg-white/90 backdrop-blur-sm border-0">
          <CardHeader className="text-center pb-6 md:pb-8 px-4 md:px-6">
            <div className="flex items-center justify-center space-x-2 md:space-x-3 mb-3 md:mb-4">
              <BookOpen className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
              <CardTitle className="text-2xl md:text-3xl font-bold text-gray-900">Interview Setup</CardTitle>
            </div>
            <CardDescription className="text-base md:text-lg text-gray-600 px-2">
              Tell us about the role and upload your resume to get personalized questions
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4 md:space-y-6 px-4 md:px-6 pb-6 md:pb-8">
            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm md:text-base font-semibold text-gray-700">
                Select Role/Position
              </Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger data-testid="role-select" className="h-11 md:h-12 text-sm md:text-base">
                  <SelectValue placeholder="Choose your target role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="software-engineer">Software Engineer</SelectItem>
                  <SelectItem value="product-manager">Product Manager</SelectItem>
                  <SelectItem value="data-scientist">Data Scientist</SelectItem>
                  <SelectItem value="ux-designer">UX Designer</SelectItem>
                  <SelectItem value="marketing-manager">Marketing Manager</SelectItem>
                  <SelectItem value="sales-representative">Sales Representative</SelectItem>
                  <SelectItem value="business-analyst">Business Analyst</SelectItem>
                  <SelectItem value="project-manager">Project Manager</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resume" className="text-sm md:text-base font-semibold text-gray-700">
                Upload Resume
              </Label>
              <div className="relative">
                <Input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  className="h-11 md:h-12 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs md:file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  data-testid="resume-upload"
                />
                {resumeFile && (
                  <div className="mt-2 flex items-center space-x-2 text-xs md:text-sm text-green-600">
                    <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="truncate">{resumeFile.name}</span>
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
                data-testid="job-description-textarea"
              />
              <p className="text-xs md:text-sm text-gray-500">Include responsibilities, requirements, and qualifications</p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading || !role || !jobDescription || !resumeFile}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 md:py-3 text-base md:text-lg font-semibold h-12 md:h-14"
              data-testid="generate-questions-btn"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 md:h-5 md:w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm md:text-base">Generating Questions...</span>
                </div>
              ) : (
                "Generate Questions"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Video Interview Component
const VideoInterview = ({ questions, setupId, onInterviewComplete, setIsProcessingInterview, setProcessingProgress }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes per question
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [currentQuestionRecording, setCurrentQuestionRecording] = useState([]);
  const [allQuestionRecordings, setAllQuestionRecordings] = useState([]);
  const [countdown, setCountdown] = useState(0);
  const videoRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    // Request camera access when component mounts
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

    // Cleanup function when component unmounts
    return () => {
      console.log("VideoInterview component unmounting - cleaning up media");
      cleanupMediaStream();
    };
  }, []);

  // Cleanup when leaving the page
  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanupMediaStream();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

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

  const startCountdown = () => {
    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          startRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
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
      
      // Check if the browser supports the preferred format
      let mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = ''; // Use default
        }
      }
      
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('Recording chunk available:', event.data.size, 'bytes');
          setCurrentQuestionRecording(prev => [...prev, event.data]);
        }
      };

      recorder.onstop = () => {
        console.log('Recording stopped for question', currentQuestionIndex + 1);
        // Save current question recording
        setAllQuestionRecordings(prev => [...prev, {
          questionIndex: currentQuestionIndex,
          chunks: currentQuestionRecording
        }]);
        setCurrentQuestionRecording([]); // Reset for next question
      };

      // Start recording with timeslice for better data availability
      recorder.start(1000); // Collect data every second
      setMediaRecorder(recorder);
      setIsRecording(true);
      setCurrentQuestionIndex(0);
      setTimeLeft(120);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      console.log('Recording started successfully');
    } catch (error) {
      console.error("Recording error:", error);
      toast.error(`Failed to start recording: ${error.message}`);
    }
  };

  const stopRecording = () => {
    console.log("Stopping recording and preparing for completion");
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    setIsRecording(false);
  };

  const cleanupMediaStream = () => {
    console.log("Cleaning up media stream and camera access");
    
    // Stop all media tracks
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => {
        console.log(`Stopping ${track.kind} track`);
        track.stop();
      });
      videoRef.current.srcObject = null;
    }
    
    // Stop any active recording
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    
    setMediaRecorder(null);
    setIsRecording(false);
    
    // Clear timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  const handleRetryQuestion = () => {
    console.log("Retrying question recording");
    
    // Stop any active recording
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    
    // Reset all recording state
    setCurrentQuestionRecording([]);
    setIsRecording(false);
    setTimeLeft(120);
    
    // Clear any existing timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    // Start fresh recording after a brief delay
    setTimeout(() => {
      console.log("Starting fresh recording for retry");
      startFreshRecording();
    }, 1000);
  };

  const startFreshRecording = async () => {
    try {
      // Get fresh media stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 }, 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      // Update video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      // Create new MediaRecorder
      let mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
      
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('Fresh recording chunk:', event.data.size, 'bytes');
          setCurrentQuestionRecording(prev => [...prev, event.data]);
        }
      };
      
      recorder.onstop = () => {
        console.log('Fresh recording stopped');
      };
      
      // Start recording
      recorder.start(1000);
      setMediaRecorder(recorder);
      setIsRecording(true);
      setTimeLeft(120);
      
      console.log('Fresh recording started successfully');
      toast.success("Recording restarted - speak your answer now");
      
    } catch (error) {
      console.error("Failed to restart recording:", error);
      toast.error(`Recording failed: ${error.message}`);
    }
  };

  const handleNextQuestion = () => {
    if (mediaRecorder && isRecording) {
      // Stop current question recording
      mediaRecorder.stop();
      
      // Wait a bit for the stop event to process, then start new recording or end interview
      setTimeout(() => {
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setTimeLeft(120);
          startNextQuestionRecording();
        } else {
          // Interview complete
          setIsRecording(false);
          handleInterviewComplete();
        }
      }, 100);
    }
  };

  const startNextQuestionRecording = async () => {
    try {
      if (mediaRecorder && mediaRecorder.state === 'inactive') {
        const stream = videoRef.current.srcObject;
        const recorder = new MediaRecorder(stream, { 
          mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') ? 
                   'video/webm;codecs=vp8,opus' : 'video/webm' 
        });

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            setCurrentQuestionRecording(prev => [...prev, event.data]);
          }
        };

        recorder.onstop = () => {
          setAllQuestionRecordings(prev => [...prev, {
            questionIndex: currentQuestionIndex + 1,
            chunks: currentQuestionRecording
          }]);
          setCurrentQuestionRecording([]);
        };

        recorder.start(1000);
        setMediaRecorder(recorder);
      }
    } catch (error) {
      console.error("Failed to start next question recording:", error);
      toast.error("Recording failed for next question");
    }
  };

  const handleInterviewComplete = async () => {
    try {
      console.log("Starting interview completion process");
      
      // Stop any active recording
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        // Wait for the stop event to process
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Combine all question recordings
      let allChunks = [];
      
      // Add current question recording if it exists
      if (currentQuestionRecording.length > 0) {
        allChunks = [...allChunks, ...currentQuestionRecording];
      }
      
      // Add all previous question recordings
      for (const questionRec of allQuestionRecordings) {
        if (questionRec.chunks && questionRec.chunks.length > 0) {
          allChunks = [...allChunks, ...questionRec.chunks];
        }
      }
      
      console.log(`Processing ${allChunks.length} audio chunks from ${allQuestionRecordings.length + (currentQuestionRecording.length > 0 ? 1 : 0)} questions`);
      
      if (allChunks.length === 0) {
        toast.error("No audio recorded. Please ensure microphone access and try again.");
        return;
      }

      // Create combined recording
      const completeRecording = new Blob(allChunks, { 
        type: 'video/webm' 
      });
      
      console.log('Complete recording size:', completeRecording.size, 'bytes');
      
      if (completeRecording.size === 0) {
        toast.error("Recording is empty. Please try again.");
        return;
      }
      
      // Convert blob to base64 for transmission
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64AudioData = reader.result.split(',')[1];
          
          // Start processing with progress indication
          setIsProcessingInterview(true);
          setProcessingProgress(20);
          
          // Stop camera/microphone tracks immediately
          if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => {
              console.log(`Stopping ${track.kind} track for interview completion`);
              track.stop();
            });
            videoRef.current.srcObject = null;
          }
          
          // Simulate progress steps
          const progressSteps = [
            { progress: 40, message: "Processing audio..." },
            { progress: 60, message: "Transcribing responses..." },
            { progress: 80, message: "Analyzing performance..." },
            { progress: 100, message: "Generating report..." }
          ];
          
          for (let i = 0; i < progressSteps.length; i++) {
            setTimeout(() => {
              setProcessingProgress(progressSteps[i].progress);
              toast.info(progressSteps[i].message);
            }, i * 800);
          }
          
          const response = await axios.post(`${API}/interview/feedback`, {
            setup_id: setupId,
            audio_data: base64AudioData
          });
          
          // Always proceed to results - backend now handles everything gracefully
          if (response.data) {
            setTimeout(() => {
              toast.success("Interview analysis complete!");
              
              // Add recording stats to feedback for display
              response.data.recordingStats = {
                questionsAnswered: allQuestionRecordings.length + (currentQuestionRecording.length > 0 ? 1 : 0),
                totalQuestions: questions.length,
                recordingSize: completeRecording.size
              };
              onInterviewComplete(response.data);
            }, 1000);
          }
        } catch (error) {
          console.error("Feedback error:", error);
          
          // For any network/server errors, still try to proceed with mock feedback
          const mockFeedback = {
            feedback: {
              overall_score: 50,
              communication_skills: { score: 50, feedback: "Unable to analyze due to technical issues." },
              technical_depth: { score: 50, feedback: "Unable to analyze due to technical issues." },
              confidence_level: { score: 50, feedback: "Unable to analyze due to technical issues." },
              structure_clarity: { score: 50, feedback: "Unable to analyze due to technical issues." },
              suggestions: ["Please try again with a stable internet connection."]
            },
            recordingStats: {
              questionsAnswered: allQuestionRecordings.length + (currentQuestionRecording.length > 0 ? 1 : 0),
              totalQuestions: questions.length,
              recordingSize: completeRecording.size
            }
          };
          
          toast.warning("Network error occurred, showing partial results");
          onInterviewComplete(mockFeedback);
        } finally {
          setIsProcessingInterview(false);
          setProcessingProgress(0);
        }
      };
      
      reader.readAsDataURL(completeRecording);
      
    } catch (error) {
      console.error("Interview completion error:", error);
      toast.error("Failed to process interview audio");
    } finally {
      // Always cleanup media stream when interview completes
      console.log("Interview complete - cleaning up camera access");
      cleanupMediaStream();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (currentQuestionIndex === -1) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4">
        <Card className="bg-white shadow-2xl max-w-2xl w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-900 mb-4">
              Ready to Start Your Interview?
            </CardTitle>
            <CardDescription className="text-lg text-gray-600">
              You'll have 2 minutes to answer each question. The interview will begin after a 3-second countdown.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="text-center space-y-6">
            <div className="relative mx-auto w-64 h-48 bg-gray-200 rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full h-full object-cover"
                data-testid="video-preview"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera className="h-12 w-12 text-gray-400" />
              </div>
            </div>

            {countdown > 0 ? (
              <div className="text-center">
                <div className="text-6xl font-bold text-blue-600 mb-4">{countdown}</div>
                <p className="text-lg text-gray-600">Get ready...</p>
              </div>
            ) : (
              <Button
                onClick={startCountdown}
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-lg font-semibold"
                data-testid="start-recording-btn"
              >
                Start Interview
              </Button>
            )}

            <div className="text-sm text-gray-500">
              <p>Total Questions: {questions.length}</p>
              <p>Time per Question: 2 minutes</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header with Progress - Responsive */}
      <div className="bg-white border-b p-3 md:p-4">
        <div className="max-w-6xl mx-auto">
          {/* Mobile Layout */}
          <div className="lg:hidden space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-xs md:text-sm">
                Question {currentQuestionIndex + 1} of {questions.length}
              </Badge>
              <div className="flex items-center space-x-2 text-xs md:text-sm text-gray-600">
                <Clock className="h-3 w-3 md:h-4 md:w-4" />
                <span className={`font-mono ${timeLeft < 30 ? 'text-red-600 font-bold' : ''}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
            <Progress 
              value={(currentQuestionIndex / questions.length) * 100} 
              className="h-2"
            />
          </div>
          
          {/* Desktop Layout */}
          <div className="hidden lg:flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="text-sm">
                Question {currentQuestionIndex + 1} of {questions.length}
              </Badge>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span className={`font-mono ${timeLeft < 30 ? 'text-red-600 font-bold' : ''}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              {/* Recording Status Indicator - Desktop Only */}
              <div className="flex items-center space-x-2">
                {isRecording ? (
                  <div className="flex items-center space-x-2 bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">
                    <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                    <span className="font-medium">Recording</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span>Not Recording</span>
                  </div>
                )}
              </div>
            </div>
            
            <Progress 
              value={(currentQuestionIndex / questions.length) * 100} 
              className="w-32"
            />
          </div>
        </div>
      </div>

      {/* Main Interview Interface - Responsive Layout */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Video Section - Responsive */}
        <div className="w-full lg:w-1/2 p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center bg-gray-900 lg:bg-transparent">
          <div className="relative w-full max-w-sm sm:max-w-md lg:max-w-lg aspect-video bg-gray-800 rounded-lg overflow-hidden shadow-2xl">
            <video
              ref={videoRef}
              autoPlay
              muted
              className="w-full h-full object-cover"
              data-testid="interview-video"
            />
            {isRecording && (
              <div className="absolute top-2 right-2 md:top-4 md:right-4 flex items-center space-x-2 bg-red-600 text-white px-2 py-1 md:px-3 md:py-1 rounded-full text-xs md:text-sm">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full animate-pulse"></div>
                <span>REC</span>
              </div>
            )}
          </div>
          
          {/* Mobile Recording Status */}
          <div className="lg:hidden mt-4 flex justify-center">
            {isRecording ? (
              <div className="flex items-center space-x-2 bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                <span className="font-medium">Recording</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 bg-gray-100 text-gray-600 px-4 py-2 rounded-full text-sm">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span>Not Recording</span>
              </div>
            )}
          </div>
        </div>

        {/* Question Section - Responsive */}
        <div className="w-full lg:w-1/2 p-4 md:p-6 lg:p-8 flex flex-col justify-center bg-slate-50">
          <Card className="shadow-lg">
            <CardHeader className="pb-4 md:pb-6">
              <CardTitle className="text-lg md:text-xl font-semibold text-gray-800 text-center lg:text-left">
                Interview Question
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6">
              <p className="text-base md:text-lg text-gray-700 leading-relaxed" data-testid="current-question">
                {questions[currentQuestionIndex]}
              </p>
              
              <div className="space-y-4">
                <div className="text-xs md:text-sm text-gray-500 text-center">
                  Take your time and provide a detailed response
                </div>
                
                {/* Primary Actions - Responsive */}
                <div className="flex flex-col gap-3 items-stretch md:items-center">
                  <Button
                    onClick={handleNextQuestion}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 md:px-8 py-3 text-sm md:text-base font-semibold w-full md:w-auto md:min-w-[160px]"
                    data-testid="next-question-btn"
                  >
                    {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Interview'}
                  </Button>
                  
                  <Button
                    onClick={handleRetryQuestion}
                    variant="outline"
                    size="lg"
                    className="border-orange-500 text-orange-500 hover:bg-orange-50 px-6 md:px-8 py-3 text-sm md:text-base font-semibold w-full md:w-auto md:min-w-[160px]"
                    data-testid="retry-question-btn"
                  >
                    Retry Recording
                  </Button>
                </div>
                
                {/* Secondary Action */}
                <div className="flex justify-center pt-2">
                  <Button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to end the interview? This will submit your current responses.')) {
                        stopRecording();
                        handleInterviewComplete();
                      }
                    }}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700 text-xs md:text-sm"
                    data-testid="end-interview-btn"
                  >
                    End Interview Early
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Feedback Results Component
const FeedbackResults = ({ feedback, onRetakeInterview }) => {
  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getProgressColor = (score) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-6 md:py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <Card className="shadow-xl bg-white/90 backdrop-blur-sm border-0 mb-6 md:mb-8">
          <CardHeader className="text-center pb-6 md:pb-8 px-4 md:px-6">
            <div className="flex items-center justify-center space-x-2 md:space-x-3 mb-3 md:mb-4">
              <Award className="h-8 w-8 md:h-10 md:w-10 text-yellow-500" />
              <CardTitle className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
                Interview Complete!
              </CardTitle>
            </div>
            <CardDescription className="text-base md:text-lg lg:text-xl text-gray-600 px-2">
              Here's your detailed performance analysis
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Interview Stats & Overall Score */}
        <Card className="shadow-lg mb-8">
          <CardContent className="pt-8">
            <div className="text-center">
              {feedback.recordingStats && (
                <div className="mb-6 text-sm text-gray-600">
                  <p>You answered {feedback.recordingStats.questionsAnswered} of {feedback.recordingStats.totalQuestions} questions</p>
                  {feedback.recordingStats.questionsAnswered < feedback.recordingStats.totalQuestions && (
                    <p className="text-orange-600 mt-1">Interview ended early - score based on answered questions</p>
                  )}
                </div>
              )}
              <div className="text-6xl font-bold text-blue-600 mb-2" data-testid="overall-score">
                {feedback.feedback.overall_score}
              </div>
              <div className="text-lg text-gray-600">Overall Score</div>
              <Progress 
                value={feedback.feedback.overall_score} 
                className="mt-4 h-3"
              />
            </div>
          </CardContent>
        </Card>

        {/* Detailed Scores */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {Object.entries(feedback.feedback)
            .filter(([key]) => key !== 'overall_score' && key !== 'suggestions' && key !== 'transcript')
            .map(([category, data]) => (
              <Card key={category} className="shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 capitalize">
                      {category.replace('_', ' ')}
                    </h3>
                    <span className={`text-2xl font-bold ${getScoreColor(data.score)}`}>
                      {data.score}
                    </span>
                  </div>
                  <Progress 
                    value={data.score} 
                    className="mb-3"
                  />
                  <p className="text-sm text-gray-600">{data.feedback}</p>
                </CardContent>
              </Card>
            ))}
        </div>

        {/* Transcript (always show) */}
        <Card className="shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800">
              Interview Transcript
            </CardTitle>
            <CardDescription>
              AI-generated transcript of your responses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {feedback.feedback.transcript || "No clear responses were detected in the audio recording."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Suggestions */}
        <Card className="shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800">
              Improvement Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {feedback.feedback.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{suggestion}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center px-4">
          <Button
            onClick={() => window.location.reload()}
            size="lg"
            variant="outline"
            className="border-gray-600 text-gray-600 hover:bg-gray-50 px-6 md:px-8 py-3 text-sm md:text-base lg:text-lg w-full sm:w-auto"
            data-testid="home-btn"
          >
            Home
          </Button>
          <Button
            onClick={onRetakeInterview}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 md:px-8 py-3 text-sm md:text-base lg:text-lg w-full sm:w-auto"
            data-testid="retake-interview-btn"
          >
            Retake Interview
          </Button>
          <Button
            onClick={() => {
              const setupId = feedback.setup_id || 'unknown';
              const downloadUrl = `${BACKEND_URL}/api/interview/report/${setupId}`;
              window.open(downloadUrl, '_blank');
              toast.success("Report downloaded successfully!");
            }}
            variant="outline"
            size="lg"
            className="border-blue-600 text-blue-600 hover:bg-blue-50 px-6 md:px-8 py-3 text-sm md:text-base lg:text-lg w-full sm:w-auto"
            data-testid="download-report-btn"
          >
            Download Report
          </Button>
        </div>
      </div>
    </div>
  );
};

// Processing Overlay Component
const ProcessingOverlay = ({ progress }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-sm md:max-w-md shadow-2xl">
        <CardContent className="pt-6 md:pt-8 pb-6 md:pb-8 px-4 md:px-6">
          <div className="text-center space-y-4 md:space-y-6">
            <div className="w-12 h-12 md:w-16 md:h-16 mx-auto">
              <Brain className="w-12 h-12 md:w-16 md:h-16 text-blue-600 animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg md:text-xl font-semibold text-gray-900">
                Analyzing Your Interview
              </h3>
              <p className="text-sm md:text-base text-gray-600 px-2">
                Our AI is processing your responses and generating detailed feedback
              </p>
            </div>
            
            <div className="space-y-2 md:space-y-3">
              <Progress value={progress} className="h-2 md:h-3" />
              <p className="text-xs md:text-sm text-gray-500">{progress}% Complete</p>
            </div>
            
            <div className="flex justify-center space-x-1 md:space-x-2">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-blue-600 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Main App Component
function App() {
  const [currentScreen, setCurrentScreen] = useState('landing');
  const [interviewData, setInterviewData] = useState(null);
  const [feedbackData, setFeedbackData] = useState(null);
  const [isProcessingInterview, setIsProcessingInterview] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  useEffect(() => {
    console.log('Screen state changed to:', currentScreen);
  }, [currentScreen]);

  const handleStartInterview = () => {
    console.log('Start Interview button clicked - about to change state');
    setCurrentScreen('setup');
    console.log('State set to setup');
  };

  const handleLearnMore = () => {
    toast.info("PracticePal helps you prepare for interviews with AI-generated questions and feedback!");
  };

  const handleQuestionsGenerated = (data) => {
    setInterviewData(data);
    setCurrentScreen('interview');
  };

  const handleInterviewComplete = (feedback) => {
    setFeedbackData(feedback);
    setCurrentScreen('results');
  };

  const handleRetakeInterview = () => {
    setInterviewData(null);
    setFeedbackData(null);
    setCurrentScreen('setup');
  };

  const renderScreen = () => {
    console.log('Current screen state:', currentScreen);
    switch (currentScreen) {
      case 'landing':
        return (
          <LandingPage
            onStartInterview={handleStartInterview}
            onLearnMore={handleLearnMore}
          />
        );
      case 'setup':
        return (
          <InterviewSetup
            onQuestionsGenerated={handleQuestionsGenerated}
          />
        );
      case 'interview':
        return (
          <VideoInterview
            questions={interviewData.questions}
            setupId={interviewData.setup_id}
            onInterviewComplete={handleInterviewComplete}
            setIsProcessingInterview={setIsProcessingInterview}
            setProcessingProgress={setProcessingProgress}
          />
        );
      case 'results':
        return (
          <FeedbackResults
            feedback={feedbackData}
            onRetakeInterview={handleRetakeInterview}
          />
        );
      default:
        return (
          <LandingPage
            onStartInterview={handleStartInterview}
            onLearnMore={handleLearnMore}
          />
        );
    }
  };

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={renderScreen()} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
      
      {/* Processing Overlay */}
      {isProcessingInterview && (
        <ProcessingOverlay progress={processingProgress} />
      )}
    </div>
  );
}

export default App;