'use client';

import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'positive' | 'negative' | 'neutral';
    period?: string;
  };
  icon: React.ReactNode;
  iconType?: 'primary' | 'success' | 'warning' | 'danger';
  trend?: {
    data: number[];
    color?: string;
  };
  onClick?: () => void;
  loading?: boolean;
  className?: string;
}

export default function StatCard({
  title,
  value,
  change,
  icon,
  iconType = 'primary',
  trend,
  onClick,
  loading = false,
  className = ''
}: StatCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString('sv-SE');
    }
    return val;
  };

  const formatChange = (changeValue: number) => {
    const sign = changeValue >= 0 ? '+' : '';
    return `${sign}${changeValue}%`;
  };

  if (loading) {
    return (
      <div className={`premium-card stat-card ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="loading-skeleton h-4 w-24 mb-2 rounded"></div>
            <div className="loading-skeleton h-8 w-16 mb-2 rounded"></div>
            <div className="loading-skeleton h-3 w-20 rounded"></div>
          </div>
          <div className="loading-skeleton w-12 h-12 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`premium-card stat-card ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="stat-card-content">
        <div className="flex-1 min-w-0">
          <div className="stat-label">{title}</div>
          <div className="stat-value">{formatValue(value)}</div>
          
          {change && (
            <div className={`stat-change ${change.type}`}>
              <svg 
                className={`w-3 h-3 ${change.type === 'negative' ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l10-10M7 7h10v10" />
              </svg>
              <span>{formatChange(change.value)}</span>
              {change.period && <span className="text-gray-500 ml-1">({change.period})</span>}
            </div>
          )}
        </div>

        <div className={`stat-icon ${iconType}`}>
          {icon}
        </div>
      </div>

      {/* Mini trend chart */}
      {trend && trend.data.length > 0 && (
        <div className="mt-4 h-12 flex items-end gap-1">
          {trend.data.map((point, index) => {
            const height = Math.max((point / Math.max(...trend.data)) * 100, 8);
            return (
              <div
                key={index}
                className="flex-1 bg-current opacity-20 rounded-t-sm transition-all hover:opacity-40"
                style={{
                  height: `${height}%`,
                  backgroundColor: trend.color || 'currentColor'
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
