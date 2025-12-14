import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Brain, MessageSquare, FileCheck, Video } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();
  
  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: Brain },
    { path: '/ai-tutor', label: 'AI Tutor', icon: MessageSquare },
    { path: '/ats', label: 'ATS Checker', icon: FileCheck },
    { path: '/mock-interview', label: 'Mock Interview', icon: Video },
  ];
  
  return (
    <nav className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <Brain className="h-8 w-8 text-white" />
            <span className="text-white font-bold text-xl">PracticePal</span>
          </div>
          
          <div className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    active
                      ? 'bg-white text-blue-700 shadow-md'
                      : 'text-white hover:bg-blue-500'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
