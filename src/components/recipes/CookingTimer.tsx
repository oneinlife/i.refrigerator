'use client';

import { useState, useEffect } from 'react';
import { Timer, Play, Pause, RotateCcw, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface CookingTimerProps {
  initialMinutes?: number;
}

export default function CookingTimer({ initialMinutes = 30 }: CookingTimerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [timeInSeconds, setTimeInSeconds] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [initialTime, setInitialTime] = useState(initialMinutes * 60);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && timeInSeconds > 0) {
      interval = setInterval(() => {
        setTimeInSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeInSeconds]);

  const handleTimerComplete = () => {
    toast.success('⏰ Время вышло! Блюдо готово!', {
      duration: 6000,
      icon: '🍳',
    });
    
    // Try to play notification sound (if supported)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('i.refrigerator', {
        body: 'Время приготовления истекло!',
        icon: '/icon.png',
      });
    }
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeInSeconds(initialTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((initialTime - timeInSeconds) / initialTime) * 100;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm font-medium"
      >
        <Timer className="w-4 h-4" />
        Таймер
      </button>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-white border-2 border-indigo-200 rounded-xl p-6 shadow-lg"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Timer className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">Таймер приготовления</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>

      <div className="space-y-4">
        {/* Timer Display */}
        <div className="relative">
          <div className="text-5xl font-bold text-center text-indigo-600 py-8">
            {formatTime(timeInSeconds)}
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <motion.div
              className="bg-indigo-500 h-2"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Time Setter */}
        {!isRunning && timeInSeconds === initialTime && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Минут:</label>
            <input
              type="number"
              value={Math.floor(timeInSeconds / 60)}
              onChange={(e) => {
                const mins = parseInt(e.target.value) || 0;
                const newTime = mins * 60;
                setTimeInSeconds(newTime);
                setInitialTime(newTime);
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              min="1"
              max="999"
            />
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          <button
            onClick={toggleTimer}
            className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
              isRunning
                ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-5 h-5" />
                Пауза
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Старт
              </>
            )}
          </button>

          <button
            onClick={resetTimer}
            className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        {/* Notification Permission */}
        {'Notification' in window && Notification.permission === 'default' && (
          <button
            onClick={() => Notification.requestPermission()}
            className="w-full text-sm text-center text-gray-600 hover:text-indigo-600 flex items-center justify-center gap-1"
          >
            <Bell className="w-4 h-4" />
            Включить уведомления
          </button>
        )}
      </div>
    </motion.div>
  );
}
