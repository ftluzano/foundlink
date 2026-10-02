import React from 'react';
import ptc1Image from '../assets/images/ptc 1.png';
import ptc2Image from '../assets/images/ptc2.png';

export const RotatingPlaceBackground: React.FC = () => (
  <div className="auth-campus-scene absolute inset-0 z-0 overflow-hidden bg-slate-950" aria-hidden="true">
    <div className="auth-campus-turntable absolute inset-0">
      <div className="auth-campus-face">
        <img className="auth-campus-photo" src={ptc1Image} alt="" />
      </div>
      <div className="auth-campus-face auth-campus-face--back">
        <img className="auth-campus-photo" src={ptc2Image} alt="" />
      </div>
    </div>
    <div className="auth-campus-shade absolute inset-0" />
    <div className="auth-campus-light absolute inset-0" />
    <div className="auth-campus-shadows absolute inset-0" />
  </div>
);