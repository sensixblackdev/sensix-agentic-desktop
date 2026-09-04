import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export function Breadcrumbs({ items = [] }) {
  return (
    <nav className="breadcrumbs-nav" aria-label="Breadcrumb">
      <Home size={12} className="breadcrumb-root-icon" />
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <ChevronRight size={11} className="breadcrumb-separator" />
          <span className={`breadcrumb-item ${idx === items.length - 1 ? 'current' : ''}`}>
            {item}
          </span>
        </React.Fragment>
      ))}
    </nav>
  );
}
