const SeparatorDefs = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
    <defs>
      {/* Trace gradient (horizontal) */}
      <linearGradient id="trace-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#C8956C" stopOpacity="0" />
        <stop offset="18%" stopColor="#C8956C" stopOpacity="0.85" />
        <stop offset="42%" stopColor="#E8601C" stopOpacity="1" />
        <stop offset="58%" stopColor="#F4863F" stopOpacity="1" />
        <stop offset="82%" stopColor="#C8956C" stopOpacity="0.85" />
        <stop offset="100%" stopColor="#C8956C" stopOpacity="0" />
      </linearGradient>

      {/* Fill gradients (vertical) */}
      <linearGradient id="fill-dark" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0A0A0A" />
        <stop offset="50%" stopColor="#100A05" />
        <stop offset="100%" stopColor="#1F1408" />
      </linearGradient>
      <linearGradient id="fill-dark-back" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0A0A0A" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#2A1810" stopOpacity="0.45" />
      </linearGradient>
      <linearGradient id="fill-creamdark" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FAFAF5" />
        <stop offset="60%" stopColor="#F4ECDD" />
        <stop offset="100%" stopColor="#EDE0C5" />
      </linearGradient>
      <linearGradient id="fill-creamdark-back" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FAFAF5" stopOpacity="0.45" />
        <stop offset="100%" stopColor="#E5D5B5" stopOpacity="0.50" />
      </linearGradient>
      <linearGradient id="fill-creamcream" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FAFAF5" stopOpacity="0.4" />
        <stop offset="60%" stopColor="#F4ECDD" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#EDE2CC" stopOpacity="0.65" />
      </linearGradient>
      <linearGradient id="fill-creamcream-back" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FAFAF5" stopOpacity="0" />
        <stop offset="100%" stopColor="#E8DCC0" stopOpacity="0.3" />
      </linearGradient>

      {/* Mist radial gradients */}
      <radialGradient id="mist-warm" cx="50%" cy="55%" r="55%">
        <stop offset="0%" stopColor="#E8601C" stopOpacity="0.10" />
        <stop offset="35%" stopColor="#F4863F" stopOpacity="0.06" />
        <stop offset="70%" stopColor="#C8956C" stopOpacity="0.025" />
        <stop offset="100%" stopColor="#C8956C" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="mist-soft" cx="50%" cy="55%" r="60%">
        <stop offset="0%" stopColor="#E8601C" stopOpacity="0.07" />
        <stop offset="50%" stopColor="#C8956C" stopOpacity="0.035" />
        <stop offset="100%" stopColor="#C8956C" stopOpacity="0" />
      </radialGradient>

      {/* Glow filter */}
      <filter id="trace-glow" x="-5%" y="-200%" width="110%" height="500%">
        <feGaussianBlur stdDeviation="2.8" />
      </filter>
    </defs>
  </svg>
);

export default SeparatorDefs;
