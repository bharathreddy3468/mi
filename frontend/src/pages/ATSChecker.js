import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Progress } from '../components/ui/progress';
import { FileCheck, Upload, CheckCircle, XCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ATSChecker = () => {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef(null);
  
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (allowedTypes.includes(file.type)) {
        setResumeFile(file);
        toast.success('Resume uploaded successfully!');
      } else {
        toast.error('Please upload a PDF or DOCX file');
        event.target.value = '';
      }
    }
  };
  
  const handleAnalyze = async () => {
    if (!resumeFile || !jobDescription.trim()) {
      toast.error('Please upload a resume and provide a job description');
      return;
    }
    
    setIsAnalyzing(true);
    setAnalysis(null);
    
    try {
      const formData = new FormData();
      formData.append('resume_file', resumeFile);
      formData.append('job_description', jobDescription);
      
      const response = await axios.post(`${API}/ats/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setAnalysis(response.data);
      toast.success('Analysis complete!');
    } catch (error) {
      console.error('ATS analysis error:', error);
      toast.error('Failed to analyze resume. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getScoreBgColor = (score) => {
    if (score >= 70) return 'from-green-500 to-green-600';
    if (score >= 50) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-green-600 to-teal-700 text-white rounded-t-lg">
            <div className="flex items-center space-x-3">
              <FileCheck className="h-8 w-8" />
              <div>
                <CardTitle className="text-2xl">ATS Resume Checker</CardTitle>
                <CardDescription className="text-green-100">Optimize your resume for Applicant Tracking Systems</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
        
        {/* Input Section */}
        {!analysis && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Resume Upload */}
            <Card className="shadow-xl border-0">
              <CardHeader>
                <CardTitle className="text-xl">Upload Resume</CardTitle>
                <CardDescription>Upload your resume in PDF or DOCX format</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-400 transition-colors cursor-pointer"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {resumeFile ? (
                    <div className="space-y-3">
                      <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                      <p className="font-medium text-gray-900">{resumeFile.name}</p>
                      <Button variant="outline" size="sm" onClick={(e) => {
                        e.stopPropagation();
                        setResumeFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}>
                        Change File
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                      <p className="text-gray-600">Click to upload or drag and drop</p>
                      <p className="text-xs text-gray-500">PDF or DOCX (Max 10MB)</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Job Description */}
            <Card className="shadow-xl border-0">
              <CardHeader>
                <CardTitle className="text-xl">Job Description</CardTitle>
                <CardDescription>Paste the job description you're applying for</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Paste the complete job description here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="min-h-[200px] resize-none"
                />
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Analyze Button */}
        {!analysis && (
          <div className="flex justify-center">
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !resumeFile || !jobDescription.trim()}
              size="lg"
              className="bg-green-600 hover:bg-green-700 px-12 py-6 text-lg"
            >
              {isAnalyzing ? (
                <div className="flex items-center space-x-2">
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Analyzing...</span>
                </div>
              ) : (
                'Analyze Resume'
              )}
            </Button>
          </div>
        )}
        
        {/* Results Section */}
        {analysis && (
          <div className="space-y-6">
            {/* Overall Score */}
            <Card className="shadow-xl border-0">
              <CardContent className="pt-8 pb-8">
                <div className="text-center space-y-4">
                  <div className={`mx-auto h-32 w-32 rounded-full bg-gradient-to-br ${getScoreBgColor(analysis.match_percentage)} flex items-center justify-center shadow-lg`}>
                    <div className="text-white">
                      <div className="text-4xl font-bold">{analysis.match_percentage}%</div>
                      <div className="text-sm">Match</div>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">ATS Match Score</h3>
                  <p className="text-gray-600 max-w-2xl mx-auto">{analysis.overall_assessment}</p>
                </div>
              </CardContent>
            </Card>
            
            {/* Section Scores */}
            {analysis.section_scores && (
              <Card className="shadow-xl border-0">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center space-x-2">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                    <span>Section Analysis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(analysis.section_scores).map(([section, score]) => (
                    <div key={section} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900 capitalize">{section.replace('_', ' ')}</span>
                        <span className={`font-semibold ${getScoreColor(score)}`}>{score}/100</span>
                      </div>
                      <Progress value={score} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            
            {/* Strengths & Gaps */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Strengths */}
              <Card className="shadow-xl border-0">
                <CardHeader className="bg-green-50">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>Strengths</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-2">
                    {analysis.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              
              {/* Gaps */}
              <Card className="shadow-xl border-0">
                <CardHeader className="bg-red-50">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span>Areas for Improvement</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-2">
                    {analysis.gaps.map((gap, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{gap}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
            
            {/* Keyword Analysis */}
            {analysis.keyword_analysis && (
              <Card className="shadow-xl border-0">
                <CardHeader>
                  <CardTitle className="text-xl">Keyword Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analysis.keyword_analysis.matched_keywords && analysis.keyword_analysis.matched_keywords.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-green-700 mb-2">Matched Keywords</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysis.keyword_analysis.matched_keywords.map((keyword, index) => (
                          <span key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {analysis.keyword_analysis.missing_keywords && analysis.keyword_analysis.missing_keywords.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-red-700 mb-2">Missing Keywords</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysis.keyword_analysis.missing_keywords.map((keyword, index) => (
                          <span key={index} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* Recommendations */}
            <Card className="shadow-xl border-0">
              <CardHeader>
                <CardTitle className="text-xl">Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {analysis.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 text-sm font-semibold">{index + 1}</span>
                      </div>
                      <span className="text-gray-700">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            
            {/* Actions */}
            <div className="flex justify-center space-x-4">
              <Button
                onClick={() => {
                  setAnalysis(null);
                  setResumeFile(null);
                  setJobDescription('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                variant="outline"
                size="lg"
                className="px-8"
              >
                Analyze Another Resume
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ATSChecker;
