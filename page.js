*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  height: 100%;
  width: 100%;
  background: #09090f;
  color: #e6eaf5;
  font-family: 'DM Sans', sans-serif;
  overscroll-behavior: none;
  -webkit-tap-highlight-color: transparent;
}

body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

#__next, #__next > div {
  height: 100%;
}

/* Scrollbar */
::-webkit-scrollbar { width: 3px; }
::-webkit-scrollbar-thumb { background: #2a2a3d; border-radius: 3px; }
