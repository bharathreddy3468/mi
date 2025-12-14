import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { MessageSquare, FileCheck, Video, TrendingUp, Award, Target, CheckCircle } from 'lucide-react';

const Dashboard = () => {
  // Dummy data for dashboard
  const careerGoal = "Senior Software Engineer at FAANG";
  const currentLevel = "Mid-level Software Engineer";
  const progressPercentage = 65;
  
  const roadmapSteps = [
    { title: 'Master Data Structures & Algorithms', completed: true, progress: 100 },
    { title: 'Build 3 Full-Stack Projects', completed: true, progress: 100 },
    { title: 'System Design Proficiency', completed: false, progress: 60 },
    { title: 'Leadership & Communication Skills', completed: false, progress: 40 },
    { title: 'Interview at Target Companies', completed: false, progress: 0 },
  ];
  
  const quickActions = [
    {
      title: 'AI Tutor',
      description: 'Get personalized career guidance and interview prep',
      icon: MessageSquare,
      link: '/ai-tutor',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'ATS Checker',
      description: 'Optimize your resume for job applications',
      icon: FileCheck,
      link: '/ats',
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Mock Interview',
      description: 'Practice with AI-powered realistic interviews',
      icon: Video,
      link: '/mock-interview',
      color: 'from-purple-500 to-purple-600'
    },
  ];
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Your Career Journey</h1>
          <p className="text-gray-600">Track your progress and achieve your goals</p>
        </div>
        
        {/* Career Goal Card */}
        <Card className="shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-t-lg">
            <div className="flex items-center space-x-3">
              <Target className="h-8 w-8" />
              <div>
                <CardTitle className="text-2xl">Career Goal</CardTitle>
                <CardDescription className="text-blue-100">{careerGoal}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 pb-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Current: {currentLevel}</span>
                <span className="text-sm font-semibold text-blue-600">{progressPercentage}% Complete</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
              <p className="text-sm text-gray-600">You're making great progress! Keep up the momentum.</p>
            </div>
          </CardContent>
        </Card>
        
        {/* Roadmap */}
        <Card className="shadow-xl border-0">
          <CardHeader>
            <CardTitle className="text-xl flex items-center space-x-2">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              <span>Your Roadmap</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {roadmapSteps.map((step, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {step.completed ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                    )}
                    <span className={`font-medium ${
                      step.completed ? 'text-gray-900' : 'text-gray-700'
                    }`}>{step.title}</span>
                  </div>
                  <span className="text-sm text-gray-500">{step.progress}%</span>
                </div>
                <Progress value={step.progress} className="h-2 ml-8" />
              </div>
            ))}
          </CardContent>
        </Card>
        
        {/* Quick Actions */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link key={index} to={action.link}>
                  <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer">
                    <CardHeader>
                      <div className={`h-12 w-12 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-3`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <CardTitle className="text-lg">{action.title}</CardTitle>
                      <CardDescription>{action.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button className="w-full">Get Started</Button>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
