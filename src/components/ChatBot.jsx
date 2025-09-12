import React, { useEffect, useMemo, useRef, useState } from 'react'

const ORANGE = 'rgb(255, 175, 43)'
const ORANGE_ALT = 'rgb(255, 157, 0)'
const BLUE = 'rgb(17, 146, 238)'

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

const STORAGE_KEY = 'chat_session_id'
function getSessionId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY)
    if (!id) {
      id = 'user_' + uid()
      localStorage.setItem(STORAGE_KEY, id)
    }
    return id
  } catch {
    return 'user_' + uid()
  }
}

function priceToNumber(val) {
  if (!val || typeof val !== 'string') return NaN
  const cleaned = val.replace(/[^0-9.]/g, '')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : NaN
}

async function postChat({ sessionId, userPrompt }) {
  const endpoint = (import.meta?.env?.VITE_CHAT_API || '/api/chat')
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, userPrompt }),
  })
  if (!res.ok) throw new Error('Bad response')
  const data = await res.json()
  return data
}

export default function ChatBot({
  botName = 'Tapas Ai',
  botAvatar = 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExeGNtbDkxdHFwMWVvN3ZoNjV4cXpieTM0a2U2a2Zld3hoaWIxd2dvOCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/S60CrN9iMxFlyp7uM8/giphy.gif',
  initialOpen = false,
  initialMessages,
  initialGif,
  onSend,
}) {
  const FRONTEND_ONLY = String(import.meta?.env?.VITE_FRONTEND_ONLY || '').toLowerCase() === 'true'
  const [isOpen, setIsOpen] = useState(initialOpen)
  const [isMax, setIsMax] = useState(false)
  const [messages, setMessages] = useState(() => {
    if (Array.isArray(initialMessages) && initialMessages.length) return initialMessages
    return [
      {
        id: uid(),
        sender: 'bot',
        type: 'text',
        text: "Hi! I'm TAPAS, your travel assistant. I can help you book flights and hotels or manage your trips.",
        quickReplies: ['Book Flight', 'Find Hotels', 'Trip planning'],
      },
      { id: uid(), sender: 'bot', type: 'text', text: (initialGif || botAvatar) },
    ]
  })
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const containerRef = useRef(null)
  const sessionIdRef = useRef(null)
  const [resFilter, setResFilter] = useState({ type: 'all', minRating: 0, priceRange: 'all', sort: 'relevance', amenities: [] })


  useEffect(() => {
    sessionIdRef.current = getSessionId()
  }, [])

  function scrollToBottom(smooth = false) {
    const el = containerRef.current
    if (!el) return
    const doScroll = () => {
      try {
        el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
      } catch {
        el.scrollTop = el.scrollHeight
      }
    }
    if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
      requestAnimationFrame(() => {
        doScroll()
        setTimeout(doScroll, 0)
      })
    } else {
      doScroll()
      setTimeout(doScroll, 0)
    }
  }

  const CHAT_STYLE = useMemo(() => `
        .diyachat-root { --color-primary: ${BLUE}; --color-accent: ${ORANGE}; --color-accent-2: ${ORANGE_ALT}; --color-white: #ffffff; --color-light: #eef2f6; --color-secondary: ${ORANGE}; --color-text: #0f172a }

        .diyachat-floating { position: fixed; right: 1rem; bottom: max(1rem, env(safe-area-inset-bottom)); z-index: 1040; max-height: calc(100vh - max(1rem, env(safe-area-inset-bottom)) - 1rem); overflow: auto; overscroll-behavior: contain; }
        .diyachat-embed { position: static; display: flex; justify-content: center; padding: 1rem 0; }
        .diyachat-open-btn { 
          position: fixed; 
          bottom: 1.5rem; 
          right: 1.5rem; 
          background: var(--color-primary); 
          color: #fff; 
          width: 56px; 
          height: 56px; 
          border-radius: 50%; 
          border: none; 
          box-shadow: 0 10px 20px rgba(0,0,0,.2); 
          transition: transform .2s ease, box-shadow .2s ease; 
          z-index: 1001;
        }
        .diyachat-open-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 24px rgba(0,0,0,.24) }

        .diyachat-window { width: 360px; height: 70vh; background: var(--color-light); border: 1px solid var(--color-light); border-radius: 12px; overflow: hidden; box-shadow: 0 16px 48px rgba(0,0,0,.24); transform-origin: bottom right; opacity: 0; transform: translateY(12px) scale(.98); transition: opacity .2s ease, transform .2s ease; display: flex; flex-direction: column; min-height: 0 }
        .diyachat-window.open { opacity: 1; transform: translateY(0) scale(1) }
        .diyachat-window.max { position: fixed; inset: 0; width: 100vw; height: 100vh; max-height: 100vh; border-radius: 0; z-index: 1050 }
.diyachat-window.max .diyachat-header { padding-top: calc(.5rem + env(safe-area-inset-top)) }
.diyachat-window.max .composer { padding-bottom: calc(.75rem + env(safe-area-inset-bottom)) }
@media (max-height: 640px){ .diyachat-header{padding:.4rem .5rem} .composer{padding:.5rem .5rem} .field{padding:.45rem .65rem; padding-right:5.5rem} }

        .diyachat-header { display: flex; justify-content: space-between; align-items: center; padding: .5rem .5rem; background: var(--color-white); color: var(--color-primary) }
        .diyachat-title { font-weight: 700; font-size: .95rem; line-height: 1.1; display: inline-block; background: linear-gradient(90deg, #1192EE 10%, #FF9D00 100%); -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-fill-color: transparent }
        .diyachat-actions { display: flex; gap: .25rem; align-items: center }
        .diyachat-iconbtn { padding: .35rem; border-radius: .5rem; background: transparent; border: none; color: var(--color-primary); transition: background .2s ease; cursor: pointer }
        .diyachat-iconbtn:hover { background: rgba(17,146,238,.08) }

        .diyachat-body { display: flex; flex-direction: column; height: 100%; flex: 1; min-height: 0 }
        .diyachat-scroll { flex: 1; overflow-y: auto; padding: .5rem; background: var(--color-light); min-height: 0; -webkit-overflow-scrolling: touch; overscroll-behavior: contain }
        .hide-scrollbar::-webkit-scrollbar { display: none }
        .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none }

        .msg { display: flex; width: 100%; margin-bottom: .5rem }
        .msg.bot { justify-content: flex-start; align-items: flex-start }
        .msg.user { justify-content: flex-end; align-items: flex-start }
        .avatar { width: 32px; height: 32px; border-radius: 9999px; overflow: hidden; flex-shrink: 0; margin-right: .5rem }

        .bubble { display: block; padding: .5rem .75rem; border-radius: 12px; position: relative; box-shadow: 0 .125rem .25rem rgba(0,0,0,.05); background: var(--color-white); border: 1px solid var(--color-light); word-break: break-word; white-space: pre-line; box-sizing: border-box; }
        /* user messages stay compact and right-aligned */
        .msg.user .bubble { display: inline-block; max-width: 80%; border-radius: 16px; background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
        /* bot messages occupy full width of the chat area */
        .msg.bot .bubble { width: 100%; }
        .bubble .chipbar { margin-top: .5rem; display: flex; gap: .5rem; flex-wrap: wrap }
        .chip { border: 1px solid var(--color-primary); color: var(--color-primary); background: var(--color-white); border-radius: 9999px; padding: .25rem .6rem; font-size: .8rem }
        .chip:hover { background: var(--color-primary); color: #fff }

        .typing { display: inline-flex; gap: 6px; align-items: center }
        .dot { width: 6px; height: 6px; border-radius: 50%; background: #999; opacity: .8; animation: bounce 1s infinite }
        .dot:nth-child(2) { animation-delay: .15s }
        .dot:nth-child(3) { animation-delay: .3s }
        @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); opacity: .5 } 40% { transform: translateY(-4px); opacity: 1 } }

        .result-card { border: 0; box-shadow: 0 2px 10px rgba(0,0,0,.06); overflow: hidden; border-radius: 12px }
        .result-title { color: #0f172a; font-weight: 600; font-size: .9rem }
        .result-price { color: var(--color-primary); font-weight: 700; font-size: .9rem }
        .cta { background: ${ORANGE_ALT}; border: 1px solid ${ORANGE_ALT}; color: #fff; border-radius: 10px; padding: .25rem .6rem; font-size: .8rem }
        .cta:hover { background: ${ORANGE}; border-color: ${ORANGE} }

        /* DIYA-like flight row */
        .flight-row { display:flex; gap:.75rem; align-items:center }
        .flight-airline { width:42px; height:42px; border-radius:10px; overflow:hidden; background:#fff; display:flex; align-items:center; justify-content:center }
        .flight-main { flex:1; min-width:0 }
        .flight-top { display:flex; justify-content:space-between; align-items:center; gap:.5rem }
        .flight-route { display:grid; grid-template-columns:1fr auto 1fr; gap:.5rem; align-items:center; color:#374151 }
        .route-center { text-align:center }
        .route-line { position:relative; height:2px; background:#e5e7eb; width:100px; margin:.25rem auto }
        .route-dot { position:absolute; top:50%; transform:translate(-50%,-50%); width:8px; height:8px; background:var(--color-primary); border-radius:9999px; left:50% }
        .badge-soft { font-size:.75rem; color:#2563eb; background:#eff6ff; border:1px solid #dbeafe; padding:.15rem .45rem; border-radius:9999px }
        .fare-pill { display:flex; justify-content:space-between; align-items:center; border:1px solid #e5e7eb; background:#fff; padding:.4rem .6rem; border-radius:10px; font-size:.85rem }
        .fare-pill.active { border-color: var(--color-primary); box-shadow: 0 0 0 .1rem rgba(17,146,238,.12); color: var(--color-primary) }

        /* New compact card grid */
        .result-toolbar { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; margin-bottom: .5rem; padding: .25rem 0 }
        .filter-chip { padding: .3rem .6rem; border-radius: 9999px; border: 1px solid var(--color-light); background: var(--color-white); color: #0f172a; font-size: .8rem; cursor: pointer }
        .filter-chip.active { border-color: var(--color-primary); color: var(--color-primary); box-shadow: 0 0 0 .1rem rgba(17,146,238,.12) }
        .rating-chip { padding: .3rem .6rem; border-radius: 9999px; border: 1px solid var(--color-light); background: var(--color-white); font-size: .8rem; cursor: pointer }
        .rating-chip.active { border-color: var(--color-primary); color: var(--color-primary) }
        /* Star based rating selector */
        .star-group { display:flex; gap:.25rem; align-items:center; margin-left:.25rem }
        .star-btn { background: transparent; border: none; padding: .15rem; cursor: pointer; display: inline-flex; align-items: center; color: var(--color-primary) }
        .star-btn svg { width: 16px; height: 16px; display:block }
        .star-fill { fill: transparent; transition: fill .12s ease }
        .star-btn.filled .star-fill { fill: #FFC107 }
        .star-btn:hover .star-fill { fill: rgba(255,193,7,.85) }

        /* Price slider styling - dual-thumb visually merged */
        .price-slider { position: relative; width: 100%; height: 28px; min-width: 140px; max-width: 420px; flex: 1; }
        .price-slider-track { position: absolute; left: 0; right: 0; top: 6px; height: 8px; border-radius: 9999px; background: linear-gradient(to right, #e6eef8 0%, #e6eef8 var(--min-percent,0%), #1192EE var(--min-percent,0%), #1192EE var(--max-percent,100%), #e6eef8 var(--max-percent,100%), #e6eef8 100%); pointer-events: none; z-index: 1 }
        .price-slider .range-input { position: absolute; left: 0; right: 0; top: 0; width: 100%; height: 28px; -webkit-appearance: none; background: transparent; pointer-events: auto; z-index: 2 }
        .price-slider .range-input::-webkit-slider-thumb { -webkit-appearance:none; width:14px;height:14px;border-radius:50%;background:#fff;border:3px solid #1192EE;box-shadow:0 6px 18px rgba(17,146,238,.12);cursor:pointer }
        .price-slider .range-input::-moz-range-thumb { width:14px;height:14px;border-radius:50%;background:#fff;border:3px solid #1192EE;box-shadow:0 6px 18px rgba(17,146,238,.12);cursor:pointer }
        .price-slider .range-input:focus { outline:none }

        .result-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: .75rem }
        .trip-card { position: relative; height: 220px; border-radius: 16px; overflow: hidden; background: #000 }
        .trip-img { width: 100%; height: 100%; object-fit: cover; display: block; filter: saturate(1) contrast(1.05) }
        .badge { position: absolute; top: .5rem; padding: .25rem .45rem; border-radius: 9999px; background: rgba(0,0,0,.55); color: #fff; backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px) }
        .badge.rating { left: .5rem; display: inline-flex; align-items: center; gap: .25rem }
        .badge.type { right: 3rem }
        .badge.price { left: .5rem; bottom: .5rem; top: auto; z-index: 8 }
        .loc-btn { position: absolute; top: .5rem; right: .5rem; display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: rgba(255,255,255,.95); border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,.12); border: 1px solid rgba(0,0,0,.06); color: var(--color-primary); text-decoration: none; z-index: 9 }
        .loc-btn:hover { transform: translateY(-2px) }
        .loc-placeholder { position: absolute; top: .5rem; right: .5rem; display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: rgba(255,255,255,.92); border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,.06); border: 1px solid rgba(0,0,0,.04); color: #111827; font-size: 14px; z-index: 9 }
        .loc-placeholder .loc-emoji { display:inline-block; line-height:1; font-size:16px }
        .overlay { position: absolute; inset: auto 0 0 0; padding: .75rem; background: linear-gradient(180deg, rgba(0,0,0,.0) 0%, rgba(0,0,0,.65) 45%, rgba(0,0,0,.85) 100%); color: #fff; transform: translateY(40%); transition: transform .2s ease; z-index: 6 }
        .trip-card:hover .overlay { transform: translateY(0) }
        .overlay-title { font-weight: 700; font-size: .95rem }
        /* Description hidden by default; revealed on hover */
        .overlay-desc { font-size: .8rem; color: #e5e7eb; margin-top: .25rem; max-height: 0; overflow: hidden; opacity: 0; transition: opacity .18s ease, max-height .18s ease }
        .trip-card:hover .overlay-desc { opacity: 1; max-height: 6em }
        /* Remove external view CTA */
        .overlay-cta { display: none }

        /* Hotel amenity tags on card */
        .amenity-tags { display:flex; flex-wrap:wrap; gap:.35rem; margin-top:.35rem }
        .amenity-tag { font-size:.7rem; background: rgba(255,255,255,.9); color:#0f172a; border:1px solid rgba(17,146,238,.15); padding:.12rem .4rem; border-radius:9999px; backdrop-filter: blur(2px) }

        /* Compact Hotel Cards - Yatra.com style */
        .hotel-search-filter-section { 
          margin-bottom: 1.5rem; 
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 2px 8px rgba(0,0,0,.08);
        }
        .hotel-search-container {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
          align-items: center;
        }
        .hotel-search-bar {
          position: relative;
          flex: 1;
        }
        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #6b7280;
          z-index: 1;
        }
        .hotel-search-input {
          width: 100%;
          padding: .75rem 1rem .75rem 3rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 1rem;
          background: #f9fafb;
          transition: all .2s ease;
        }
        .hotel-search-input:focus {
          outline: none;
          border-color: #dc2626;
          background: white;
          box-shadow: 0 0 0 3px rgba(220,38,38,.1);
        }
        .more-filters-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          background: #dc2626;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all .2s ease;
          color: white;
        }
        .more-filters-btn:hover {
          background: #b91c1c;
          transform: translateY(-1px);
        }
        .advanced-filters-panel {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1rem;
          animation: slideDown .3s ease;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .filter-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
        }
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: .5rem;
        }
        .filter-group label {
          font-size: .9rem;
          font-weight: 600;
          color: #374151;
        }
        .price-inputs {
          display: flex;
          align-items: center;
          gap: .5rem;
        }
        .price-input {
          flex: 1;
          padding: .5rem .75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: .9rem;
        }
        .price-input:focus {
          outline: none;
          border-color: #dc2626;
        }
        .filter-select {
          padding: .5rem .75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: .9rem;
          background: white;
          cursor: pointer;
        }
        .filter-select:focus {
          outline: none;
          border-color: #dc2626;
        }
        .quick-suggestions-label {
          font-size: .9rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: .75rem;
        }
        .hotel-filter-chips {
          display: flex;
          flex-wrap: wrap;
          gap: .5rem;
        }
        .hotel-filters-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: .75rem;
        }
        .hotel-filters { 
          display: flex; 
          flex-wrap: wrap; 
          gap: .5rem; 
          flex: 1;
          overflow-x: auto;
          padding-right: 1rem;
        }
        .hotel-filter-chip { 
          display: flex;
          align-items: center;
          gap: .4rem;
          padding: .6rem 1rem; 
          border: 1px solid #d1d5db; 
          background: white; 
          color: #374151; 
          border-radius: 25px; 
          font-size: .85rem; 
          cursor: pointer; 
          transition: all .2s ease;
          white-space: nowrap;
          font-weight: 500;
          box-shadow: 0 1px 3px rgba(0,0,0,.1);
        }
        .hotel-filter-chip:hover { 
          border-color: #dc2626; 
          color: #dc2626; 
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(0,0,0,.15);
        }
        .hotel-filter-chip.active { 
          background: #dc2626; 
          color: white; 
          border-color: #dc2626; 
          box-shadow: 0 2px 6px rgba(220,38,38,.3);
        }
        .filter-icon {
          font-size: 1rem;
          line-height: 1;
        }
        .filter-text {
          font-size: .85rem;
        }
        .filter-actions {
          display: flex;
          align-items: center;
          gap: .5rem;
        }
        .hotel-filter-chip.clear-filters { 
          background: #f3f4f6; 
          color: #6b7280; 
          border-color: #d1d5db; 
          font-weight: 600;
        }
        .hotel-filter-chip.clear-filters:hover { 
          background: #ef4444; 
          color: white; 
          border-color: #ef4444; 
        }
        .filter-icon-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          transition: all .2s ease;
          color: #6b7280;
        }
        .filter-icon-btn:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
          color: #374151;
        }
        .hotel-results-count { 
          font-size: .9rem; 
          color: #6b7280; 
          font-weight: 600;
          text-align: center;
          padding: .5rem 0;
          background: white;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }
        .hotel-cards-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); 
          gap: 1rem; 
        }
        .hotel-cards-grid-4rows { 
          display: grid; 
          grid-template-columns: repeat(3, 1fr); 
          grid-template-rows: repeat(4, auto);
          gap: 1rem; 
          max-height: 1200px; /* Limit height to show exactly 4 rows */
          overflow: hidden;
        }
        .compact-hotel-card { 
          background: white; 
          border-radius: 12px; 
          overflow: hidden; 
          box-shadow: 0 4px 12px rgba(0,0,0,.08); 
          transition: transform .2s ease, box-shadow .2s ease; 
          border: 1px solid #e5e7eb;
        }
        .compact-hotel-card:hover { 
          transform: translateY(-2px); 
          box-shadow: 0 8px 24px rgba(0,0,0,.12); 
        }
        .hotel-card-image { 
          position: relative; 
          height: 180px; 
          overflow: hidden; 
        }
        .hotel-card-image img { 
          width: 100%; 
          height: 100%; 
          object-fit: cover; 
        }
        .hotel-placeholder { 
          width: 100%; 
          height: 100%; 
          background: #f3f4f6; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 2rem; 
          color: #9ca3af; 
        }
        .hotel-rating-badge { 
          position: absolute; 
          top: .75rem; 
          left: .75rem; 
          background: rgba(0,0,0,.7); 
          color: white; 
          padding: .25rem .5rem; 
          border-radius: 12px; 
          font-size: .8rem; 
          font-weight: 600; 
          backdrop-filter: blur(4px); 
        }
        .hotel-card-content { 
          padding: 1rem; 
        }
        .hotel-name { 
          font-size: 1rem; 
          font-weight: 700; 
          color: #111827; 
          margin: 0 0 .5rem 0; 
          line-height: 1.3; 
        }
        .hotel-location-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: .75rem;
        }
        .hotel-location { 
          font-size: .85rem; 
          color: #6b7280; 
          margin: 0; 
          flex: 1;
        }
        .location-btn {
          display: flex;
          align-items: center;
          gap: .25rem;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          color: #374151;
          padding: .25rem .5rem;
          border-radius: 6px;
          font-size: .75rem;
          cursor: pointer;
          transition: all .2s ease;
          white-space: nowrap;
        }
        .location-btn:hover {
          background: #dc2626;
          color: white;
          border-color: #dc2626;
          transform: translateY(-1px);
        }
        .location-btn svg {
          flex-shrink: 0;
        }
        
        /* Rating Section */
        .hotel-ratings {
          display: flex;
          gap: .5rem;
          margin-bottom: .75rem;
          flex-wrap: wrap;
        }
        .rating-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: .4rem .6rem;
          border-radius: 8px;
          font-size: .8rem;
          min-width: 60px;
        }
        .rating-badge.guest-rating {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        }
        .rating-badge.google-rating {
          background: #dbeafe;
          color: #1e40af;
          border: 1px solid #bfdbfe;
        }
        .rating-number {
          font-weight: 700;
          font-size: .9rem;
        }
        .rating-label {
          font-size: .7rem;
          margin-top: .1rem;
        }
        .reviews-count {
          font-size: .75rem;
          color: #6b7280;
          align-self: center;
          margin-left: .5rem;
        }
        
        /* Price and Action Section */
        .hotel-price-action {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: .75rem;
        }
        .price-section {
          display: flex;
          flex-direction: column;
        }
        .hotel-price { 
          font-size: 1.2rem; 
          font-weight: 700; 
          color: #dc2626; 
        }
        .hotel-price-label { 
          font-size: .75rem; 
          color: #6b7280; 
        }
        .hotel-amenities { 
          display: flex; 
          flex-wrap: wrap; 
          gap: .25rem; 
          margin: .5rem 0;
        }
        .amenity-chip { 
          background: #f3f4f6; 
          color: #374151; 
          padding: .25rem .5rem; 
          border-radius: 12px; 
          font-size: .7rem; 
          font-weight: 500;
        }
        .hotel-choose-btn {
          background: #dc2626;
          color: white;
          border: none;
          padding: .5rem 1rem;
          border-radius: 6px;
          font-weight: 600;
          font-size: .85rem;
          cursor: pointer;
          transition: background .2s ease;
        }
        .hotel-choose-btn:hover {
          background: #b91c1c;
        }
        
        /* Additional Info */
        .hotel-additional-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: .5rem;
          font-size: .8rem;
          color: #6b7280;
        }
        .rooms-left {
          font-weight: 500;
        }
        .breakfast-info {
          display: flex;
          align-items: center;
          gap: .25rem;
        }
        .breakfast-icon {
          font-size: .9rem;
        }
        
        /* View Details */
        .hotel-view-details {
          text-align: center;
        }
        .hotel-view-details a {
          color: #dc2626;
          text-decoration: none;
          font-size: .85rem;
          font-weight: 500;
        }
        .hotel-view-details a:hover {
          text-decoration: underline;
        }
        
        /* Pagination Styles */
        .hotel-pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-top: 1.5rem;
          padding: 1rem 0;
        }
        .pagination-btn {
          background: white;
          border: 1px solid #d1d5db;
          color: #374151;
          padding: .5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: .9rem;
          transition: all .2s ease;
        }
        .pagination-btn:hover:not(:disabled) {
          background: #f9fafb;
          border-color: #9ca3af;
        }
        .pagination-btn:disabled {
          opacity: .5;
          cursor: not-allowed;
        }
        .pagination-info {
          font-size: .9rem;
          color: #6b7280;
          font-weight: 500;
        }
        .no-results { 
          text-align: center; 
          color: #6b7280; 
          padding: 2rem; 
          font-size: 1rem; 
        }

        /* DIYA-like hotel list row */
        .hotel-row { display:flex; gap:.75rem; border:1px solid var(--color-light); background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 6px 18px rgba(12,17,26,.06) }
        .hotel-thumb { width:230px; height:150px; background:#e5e7eb; object-fit:cover }
        .hotel-main { flex:1; padding:.65rem .75rem; min-width:0 }
        .hotel-meta { display:flex; gap:.5rem; align-items:center; flex-wrap:wrap; color:#6b7280; font-size:.85rem }
        .hotel-cta { display:flex; align-items:center; gap:.35rem; padding:.65rem; min-width:160px; background:#fff; border-left:1px solid var(--color-light) }

        /* Itinerary styles */
        .itinerary { color: #0f172a }
        .itinerary-header { margin-bottom: .5rem }
        .itinerary-meta { display:flex; gap:.5rem; flex-wrap:wrap; margin-bottom:.75rem }
        .itinerary-days { display:flex; gap:.75rem; overflow-x:auto; padding-bottom:.25rem }
        .itinerary-card { background: var(--color-white); min-width: 300px; border-radius: 12px; padding: .75rem; box-shadow: 0 8px 24px rgba(12,17,26,.06); flex: 0 0 340px }
        .itinerary-card .card-title { font-weight:700; margin-bottom:.5rem }
        .itinerary-card .card-img { width:100%; height:140px; object-fit:cover; border-radius:8px; margin-bottom:.5rem }
        /* DIYA-like vertical timeline */
        .tl { position:relative; padding-left: 18px }
        .tl::before { content:''; position:absolute; left:6px; top:0; bottom:0; width:2px; background:#e5e7eb }
        .tl-item { position:relative; margin-bottom:.65rem }
        .tl-dot { position:absolute; left:-2px; top:.25rem; width:10px; height:10px; border-radius:9999px; background:var(--color-primary); box-shadow:0 0 0 3px rgba(17,146,238,.12) }
        .tl-body { background:#fff; border:1px solid var(--color-light); border-radius:10px; padding:.5rem; box-shadow:0 4px 12px rgba(12,17,26,.04) }
        .tl-time { font-size:.75rem; color:#6b7280; min-width:64px }
        .tl-row { display:flex; gap:.5rem }
        .tl-title { font-weight:600 }
        .chip-soft { font-size:.72rem; color:#2563eb; background:#eff6ff; border:1px solid #dbeafe; padding:.1rem .4rem; border-radius:9999px }

        .footer { border-top: 1px solid var(--color-light); background: var(--color-light) }
        .footer-top { padding: .5rem .75rem; }
        .suggest { font-size: .75rem; color: #6b7280; text-align: left }
        .suggest button { color: var(--color-primary); font-weight: 600; background: transparent; border: none; padding: 0 }

        .composer { padding: .75rem .75rem }
        .rowx { display: flex; align-items: center; gap: .5rem }
        .icon-round { padding: .5rem; border-radius: 9999px; border: 1px solid var(--color-light); background: var(--color-white); color: var(--color-primary); cursor: pointer }
        .icon-round:hover { background: var(--color-light) }
        .input-wrap { position: relative; flex: 1; display: flex; align-items: center }
        .field { width: 100%; padding: .5rem .75rem; padding-right: 6rem; border: 1px solid var(--color-light); border-radius: 12px; outline: none; transition: box-shadow .2s ease, border-color .2s ease; color: #111827; background: var(--color-white) }
        .field::placeholder { color: #6b7280 }
        .field:focus { border-color: var(--color-primary); box-shadow: 0 0 0 .15rem rgba(17,146,238,.15) }
        .btn-mic, .btn-send { position: absolute; top: 50%; transform: translateY(-50%); padding: .4rem; border-radius: 9999px; border: 1px solid var(--color-light); background: var(--color-white); cursor: pointer }
        .btn-mic { right: 3rem; color: var(--color-primary) }
        .btn-send { right: .5rem }
        .btn-send:disabled { color: #9ca3af; cursor: not-allowed }

        /* Inline image and map styles */
        .inline-img { width: 100%; max-width: 260px; border-radius: 10px; display: block; margin-top: .5rem; box-shadow: 0 6px 18px rgba(0,0,0,.06) }
        .inline-map { display: inline-flex; gap:.5rem; align-items:center; padding:.25rem .5rem; margin-top:.35rem; background: var(--color-white); border-radius: 8px; border: 1px solid var(--color-light); color: var(--color-primary); text-decoration: none }

        /* Pagination styles */
        .pagination .page-num { background: transparent; border: none; padding: .25rem .5rem; color: var(--color-primary); cursor: pointer }
        .pagination .page-num.active { font-weight: 700; text-decoration: underline }
        .pagination .pager-btn { background: var(--color-white); border: 1px solid var(--color-light); padding: .25rem .6rem; border-radius: 8px; cursor: pointer }
        .pagination .pager-btn:disabled { opacity: .5; cursor: not-allowed }
        .select-filter { background: var(--color-white); border: 1px solid var(--color-light); padding: .35rem .5rem; border-radius: 8px; font-size: .85rem }

        /* Responsive Design */
        @media (max-width: 576px) { 
          .diyachat-window { width: calc(100vw - 1rem); height: 80vh } 
          .diyachat-window.iphone { width: calc(100vw - 1rem); height: 80vh; border-width: 4px; border-radius: 16px }
          .msg.user .bubble { max-width: 90% }
          .flight-row { flex-direction: column; gap: .5rem }
          .hotel-row { flex-direction: column }
          .hotel-thumb { width: 100%; height: 200px }
          .hotel-cta { min-width: auto; border-left: none; border-top: 1px solid var(--color-light); flex-direction: row; justify-content: space-between; align-items: center }
          .result-toolbar { flex-direction: column; gap: .5rem; align-items: stretch }
          .filter-chip, .rating-chip, .select-filter { font-size: .75rem; padding: .25rem .5rem }
          .price-slider { min-width: 100%; max-width: none }
          .itinerary-days { flex-direction: column; gap: .5rem }
          .itinerary-card { min-width: auto; flex: none }
          .tl-row { flex-direction: column; gap: .25rem }
          .tl-time { min-width: auto; text-align: left }
          .amenity-tags { gap: .25rem }
          .amenity-tag { font-size: .65rem; padding: .1rem .3rem }
          .fare-pill { font-size: .8rem; padding: .3rem .5rem }
          
          /* Hotel cards responsive */
          .hotel-cards-grid { grid-template-columns: 1fr; gap: .75rem; }
          .hotel-cards-grid-4rows { grid-template-columns: 1fr; grid-template-rows: auto; max-height: none; }
          .hotel-search-filter-section { padding: 1rem; }
          .hotel-search-container { flex-direction: column; gap: .75rem; }
          .more-filters-btn { width: 100%; height: 44px; }
          .filter-row { grid-template-columns: 1fr; gap: 1rem; }
          .price-inputs { flex-direction: column; gap: .5rem; }
        .hotel-filter-chips { gap: .25rem; }
        .hotel-filter-chip { font-size: .75rem; padding: .5rem .75rem; }
        .hotel-card-image { height: 160px; }
        .hotel-location-section { flex-direction: column; align-items: flex-start; gap: .5rem; }
        .location-btn { align-self: flex-start; }
        .hotel-ratings { flex-direction: column; align-items: flex-start; gap: .25rem; }
        .hotel-price-action { flex-direction: column; align-items: flex-start; gap: .5rem; }
        
        /* Itinerary Mobile Styles */
        .itinerary-header-content { flex-direction: column; align-items: flex-start; gap: 1rem; }
        .itinerary-stats { align-self: stretch; justify-content: space-between; }
        .itinerary-tabs { flex-direction: column; }
        .tab-btn { border-bottom: none; border-right: 3px solid transparent; }
        .tab-btn.active { border-right-color: #dc2626; border-bottom-color: transparent; }
        .highlights-grid { grid-template-columns: 1fr; }
        .activity-card { flex-direction: column; }
        .activity-image { width: 100%; height: 120px; }
        .explore-grid { grid-template-columns: 1fr; }
        
        /* Flight Mobile Styles */
        .flight-filters-grid { grid-template-columns: 1fr; }
        .route-info { flex-direction: column; gap: 1rem; }
        .flight-path { margin: 0; }
        .flight-card-footer { flex-direction: column; gap: 1rem; align-items: stretch; }
        .flight-details { justify-content: center; }
        .select-flight-btn { width: 100%; }
        
        /* Attractions Mobile Styles */
        .attractions-search-section { flex-direction: column; gap: .75rem; }
        .attractions-grid { grid-template-columns: 1fr; }
        .attraction-footer { flex-direction: column; gap: .75rem; align-items: stretch; }
        .attraction-link-btn { width: 100%; text-align: center; }
        .attractions-pagination { flex-direction: column; gap: .75rem; }
        .pagination-btn { width: 100%; }
        
        /* Itinerary Styles */
        .itinerary-container { 
          background: #fff; 
          border-radius: 12px; 
          overflow: hidden; 
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          margin: .5rem 0;
        }
        .itinerary-header { 
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); 
          color: white; 
          padding: 1.5rem;
        }
        .itinerary-header-content { 
          display: flex; 
          justify-content: space-between; 
          align-items: flex-start; 
          gap: 1rem;
        }
        .itinerary-title-section { flex: 1; }
        .itinerary-title { 
          font-size: 1.5rem; 
          font-weight: 700; 
          margin: 0 0 .5rem 0; 
          line-height: 1.2;
        }
        .itinerary-destination { 
          font-size: 1rem; 
          opacity: 0.9; 
          margin: 0;
        }
        .itinerary-stats { 
          display: flex; 
          align-items: center; 
          gap: 1rem;
        }
        .stat-item { 
          text-align: center; 
          display: flex; 
          flex-direction: column; 
          align-items: center;
        }
        .stat-number { 
          font-size: 1.5rem; 
          font-weight: 700; 
          line-height: 1;
        }
        .stat-label { 
          font-size: .75rem; 
          opacity: 0.8; 
          margin-top: .25rem;
        }
        .download-btn { 
          display: flex; 
          align-items: center; 
          gap: .5rem; 
          background: rgba(255,255,255,0.2); 
          border: 1px solid rgba(255,255,255,0.3); 
          color: white; 
          padding: .5rem 1rem; 
          border-radius: 8px; 
          font-size: .875rem; 
          cursor: pointer; 
          transition: all .2s ease;
        }
        .download-btn:hover { 
          background: rgba(255,255,255,0.3); 
          transform: translateY(-1px);
        }
        
        .itinerary-tabs { 
          display: flex; 
          background: #f8fafc; 
          border-bottom: 1px solid #e2e8f0;
        }
        .tab-btn { 
          flex: 1; 
          padding: 1rem; 
          background: none; 
          border: none; 
          font-size: .875rem; 
          font-weight: 500; 
          color: #64748b; 
          cursor: pointer; 
          transition: all .2s ease; 
          border-bottom: 3px solid transparent;
        }
        .tab-btn.active { 
          color: #dc2626; 
          background: white; 
          border-bottom-color: #dc2626;
        }
        .tab-btn:hover:not(.active) { 
          color: #374151; 
          background: #f1f5f9;
        }
        
        .itinerary-content { padding: 1.5rem; }
        
        /* Overview Section */
        .overview-section { display: flex; flex-direction: column; gap: 1.5rem; }
        .summary-card { 
          background: #f8fafc; 
          padding: 1.5rem; 
          border-radius: 12px; 
          border-left: 4px solid #dc2626;
        }
        .summary-card h3 { 
          margin: 0 0 1rem 0; 
          color: #1e293b; 
          font-size: 1.125rem; 
          font-weight: 600;
        }
        .trip-summary { 
          color: #475569; 
          line-height: 1.6; 
          margin: 0;
        }
        .trip-highlights h3 { 
          margin: 0 0 1rem 0; 
          color: #1e293b; 
          font-size: 1.125rem; 
          font-weight: 600;
        }
        .highlights-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
          gap: 1rem;
        }
        .highlight-item { 
          display: flex; 
          align-items: center; 
          gap: .75rem; 
          padding: 1rem; 
          background: white; 
          border-radius: 8px; 
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .highlight-icon { 
          font-size: 1.5rem; 
          width: 2.5rem; 
          height: 2.5rem; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          background: #fef2f2; 
          border-radius: 8px;
        }
        .highlight-text { 
          display: flex; 
          flex-direction: column;
        }
        .highlight-text strong { 
          color: #1e293b; 
          font-size: 1rem; 
          font-weight: 600;
        }
        .highlight-text span { 
          color: #64748b; 
          font-size: .75rem;
        }
        
        /* Daily Plan Section */
        .daily-plan-section { display: flex; flex-direction: column; gap: 1.5rem; }
        .day-card { 
          background: white; 
          border-radius: 12px; 
          overflow: hidden; 
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
        }
        .day-header { 
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); 
          padding: 1.5rem; 
          border-bottom: 1px solid #e2e8f0;
        }
        .day-number { 
          color: #dc2626; 
          font-size: .875rem; 
          font-weight: 600; 
          margin-bottom: .5rem;
        }
        .day-title { 
          margin: 0; 
          color: #1e293b; 
          font-size: 1.25rem; 
          font-weight: 600;
        }
        .activities-list { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
        .activity-card { 
          display: flex; 
          gap: 1rem; 
          padding: 1rem; 
          background: #f8fafc; 
          border-radius: 8px; 
          transition: all .2s ease;
        }
        .activity-card:hover { 
          background: #f1f5f9; 
          transform: translateY(-1px);
        }
        .activity-image { 
          position: relative; 
          width: 120px; 
          height: 80px; 
          border-radius: 8px; 
          overflow: hidden; 
          flex-shrink: 0;
        }
        .activity-image img { 
          width: 100%; 
          height: 100%; 
          object-fit: cover;
        }
        .activity-placeholder { 
          width: 100%; 
          height: 100%; 
          background: #e2e8f0; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 1.5rem;
        }
        .activity-rating { 
          position: absolute; 
          top: .5rem; 
          right: .5rem; 
          background: rgba(0,0,0,0.7); 
          color: white; 
          padding: .25rem .5rem; 
          border-radius: 4px; 
          font-size: .75rem; 
          font-weight: 500;
        }
        .activity-content { flex: 1; }
        .activity-name { 
          margin: 0 0 .5rem 0; 
          color: #1e293b; 
          font-size: 1rem; 
          font-weight: 600;
        }
        .activity-description { 
          margin: 0; 
          color: #64748b; 
          font-size: .875rem; 
          line-height: 1.5;
        }
        
        /* Explore More Section */
        .explore-more-section h3 { 
          margin: 0 0 1.5rem 0; 
          color: #1e293b; 
          font-size: 1.25rem; 
          font-weight: 600;
        }
        .explore-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); 
          gap: 1rem;
        }
        .explore-card { 
          background: white; 
          border-radius: 12px; 
          overflow: hidden; 
          box-shadow: 0 2px 12px rgba(0,0,0,0.08); 
          transition: all .2s ease;
        }
        .explore-card:hover { 
          transform: translateY(-2px); 
          box-shadow: 0 4px 20px rgba(0,0,0,0.12);
        }
        .explore-image { 
          position: relative; 
          height: 120px; 
          overflow: hidden;
        }
        .explore-image img { 
          width: 100%; 
          height: 100%; 
          object-fit: cover;
        }
        .explore-placeholder { 
          width: 100%; 
          height: 100%; 
          background: #e2e8f0; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 2rem;
        }
        .explore-rating { 
          position: absolute; 
          top: .5rem; 
          right: .5rem; 
          background: rgba(0,0,0,0.7); 
          color: white; 
          padding: .25rem .5rem; 
          border-radius: 4px; 
          font-size: .75rem; 
          font-weight: 500;
        }
        .explore-content { padding: 1rem; }
        .explore-name { 
          margin: 0 0 .5rem 0; 
          color: #1e293b; 
          font-size: 1rem; 
          font-weight: 600;
        }
        .explore-description { 
          margin: 0; 
          color: #64748b; 
          font-size: .875rem; 
          line-height: 1.5;
        }
        
        /* Modern Flight Styles */
        .flight-container { 
          background: #fff; 
          border-radius: 12px; 
          overflow: hidden; 
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          margin: .5rem 0;
        }
        .flight-filters-header { 
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); 
          color: white; 
          padding: 1.5rem;
        }
        .filters-title h3 { 
          margin: 0 0 .5rem 0; 
          font-size: 1.5rem; 
          font-weight: 700;
        }
        .filters-title p { 
          margin: 0; 
          opacity: 0.9; 
          font-size: .9rem;
        }
        .flight-filters-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
          gap: 1rem; 
          margin: 1.5rem 0;
        }
        .filter-group { 
          display: flex; 
          flex-direction: column; 
          gap: .5rem;
        }
        .filter-group label { 
          font-size: .875rem; 
          font-weight: 500; 
          opacity: 0.9;
        }
        .modern-select { 
          padding: .75rem; 
          border: 1px solid rgba(255,255,255,0.3); 
          border-radius: 8px; 
          background: rgba(255,255,255,0.1); 
          color: white; 
          font-size: .875rem;
        }
        .modern-select option { 
          background: #1e40af; 
          color: white;
        }
        .checkbox-group { 
          justify-content: center; 
          align-items: center;
        }
        .checkbox-label { 
          display: flex; 
          align-items: center; 
          gap: .5rem; 
          cursor: pointer;
        }
        .checkbox-label input[type="checkbox"] { 
          display: none;
        }
        .checkmark { 
          width: 20px; 
          height: 20px; 
          border: 2px solid rgba(255,255,255,0.5); 
          border-radius: 4px; 
          position: relative; 
          transition: all .2s ease;
        }
        .checkbox-label input:checked + .checkmark { 
          background: white; 
          border-color: white;
        }
        .checkbox-label input:checked + .checkmark::after { 
          content: '✓'; 
          position: absolute; 
          top: 50%; 
          left: 50%; 
          transform: translate(-50%, -50%); 
          color: #1e40af; 
          font-size: 12px; 
          font-weight: bold;
        }
        .price-range-section { 
          margin-top: 1rem; 
          padding-top: 1rem; 
          border-top: 1px solid rgba(255,255,255,0.2);
        }
        .price-range-section label { 
          display: block; 
          margin-bottom: .5rem; 
          font-size: .875rem; 
          opacity: 0.9;
        }
        .price-slider-container { 
          position: relative; 
          height: 20px;
        }
        .price-range { 
          position: absolute; 
          top: 0; 
          left: 0; 
          width: 100%; 
          height: 20px; 
          background: transparent; 
          outline: none; 
          -webkit-appearance: none;
        }
        .price-range::-webkit-slider-thumb { 
          -webkit-appearance: none; 
          width: 20px; 
          height: 20px; 
          border-radius: 50%; 
          background: white; 
          cursor: pointer; 
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .price-range::-moz-range-thumb { 
          width: 20px; 
          height: 20px; 
          border-radius: 50%; 
          background: white; 
          cursor: pointer; 
          border: none; 
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        
        .results-count { 
          padding: 1rem 1.5rem; 
          background: #f8fafc; 
          border-bottom: 1px solid #e2e8f0; 
          font-size: .875rem; 
          color: #64748b; 
          font-weight: 500;
          display: flex; 
          justify-content: space-between; 
          align-items: center;
        }
        .filters-toggle-btn { background: #111827; color: #fff; border: none; padding: .5rem .75rem; border-radius: 6px; cursor: pointer; font-size: .8rem; }
        .filters-toggle-btn:hover { background: #0b1220; }
        
        .flight-cards-container { 
          padding: 1.5rem; 
          display: flex; 
          flex-direction: column; 
          gap: 1rem;
        }
        .modern-flight-card { 
          background: white; 
          border: 1px solid #e2e8f0; 
          border-radius: 12px; 
          overflow: hidden; 
          transition: all .2s ease; 
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .modern-flight-card:hover { 
          transform: translateY(-2px); 
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .flight-card-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          padding: 1rem 1.5rem; 
          background: #f8fafc; 
          border-bottom: 1px solid #e2e8f0;
        }
        .airline-section { 
          display: flex; 
          align-items: center; 
          gap: 1rem;
        }
        .airline-logo { 
          width: 48px; 
          height: 48px; 
          border-radius: 8px; 
          overflow: hidden; 
          background: white; 
          display: flex; 
          align-items: center; 
          justify-content: center;
        }
        .airline-logo img { 
          width: 100%; 
          height: 100%; 
          object-fit: contain;
        }
        .airline-placeholder { 
          font-size: 1.5rem;
        }
        .airline-info h4 { 
          margin: 0 0 .25rem 0; 
          font-size: 1rem; 
          font-weight: 600; 
          color: #1e293b;
        }
        .flight-class { 
          font-size: .75rem; 
          color: #64748b; 
          background: #e2e8f0; 
          padding: .25rem .5rem; 
          border-radius: 4px;
        }
        .price-section { 
          text-align: right;
        }
        .flight-price { 
          font-size: 1.5rem; 
          font-weight: 700; 
          color: #dc2626; 
          margin-bottom: .25rem;
        }
        .price-per-person { 
          font-size: .75rem; 
          color: #64748b;
        }
        
        .flight-route-section { 
          padding: 1.5rem;
        }
        .route-info { 
          display: flex; 
          align-items: center; 
          justify-content: space-between;
        }
        .airport-info { 
          text-align: center; 
          flex: 1;
        }
        .airport-code { 
          font-size: 1.5rem; 
          font-weight: 700; 
          color: #1e293b; 
          margin-bottom: .25rem;
        }
        .airport-time { 
          font-size: .875rem; 
          color: #64748b;
        }
        .flight-path { 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          gap: .5rem; 
          flex: 2; 
          margin: 0 1rem;
        }
        .flight-duration { 
          font-size: .875rem; 
          color: #64748b; 
          font-weight: 500;
        }
        .flight-line { 
          display: flex; 
          align-items: center; 
          width: 100%; 
          position: relative;
        }
        .flight-dot { 
          width: 8px; 
          height: 8px; 
          border-radius: 50%; 
          background: #3b82f6;
        }
        .flight-line-segment { 
          flex: 1; 
          height: 2px; 
          background: #3b82f6; 
          margin: 0 .5rem;
        }
        .flight-stops { 
          font-size: .75rem; 
          color: #64748b; 
          background: #f1f5f9; 
          padding: .25rem .5rem; 
          border-radius: 4px;
        }
        
        .flight-card-footer { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          padding: 1rem 1.5rem; 
          background: #f8fafc; 
          border-top: 1px solid #e2e8f0;
        }
        .flight-details { 
          display: flex; 
          gap: 1rem; 
          flex-wrap: wrap;
        }
        .detail-item { 
          font-size: .75rem; 
          color: #64748b; 
          background: white; 
          padding: .25rem .5rem; 
          border-radius: 4px; 
          border: 1px solid #e2e8f0;
        }
        .select-flight-btn { 
          background: #dc2626; 
          color: white; 
          border: none; 
          padding: .75rem 1.5rem; 
          border-radius: 8px; 
          font-size: .875rem; 
          font-weight: 600; 
          cursor: pointer; 
          transition: all .2s ease;
        }
        .select-flight-btn:hover { 
          background: #b91c1c; 
          transform: translateY(-1px);
        }
        .select-flight-btn.selected { 
          background: #059669; 
          color: white;
        }
        .select-flight-btn.selected:hover { 
          background: #047857;
        }

        /* Ticket-style fare row */
        .fare-options-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 1rem;
          align-items: center;
          padding: 1rem 1.5rem;
          border-top: 1px solid #e2e8f0;
          background: #ffffff;
        }
        .fare-options-title {
          grid-column: 1 / -1;
          font-size: .875rem;
          color: #64748b;
          font-weight: 600;
          margin-bottom: .25rem;
        }
        .fare-options-group {
          display: grid;
          grid-template-columns: repeat(3, minmax(180px, 1fr));
          gap: .75rem;
        }
        .fare-radio {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: .75rem;
          padding: .75rem 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #f8fafc;
          cursor: pointer;
          transition: all .2s ease;
        }
        .fare-radio.active { border-color: #3b82f6; background: #eff6ff; }
        .fare-radio input { display: none; }
        .fare-name { font-size: .9rem; color: #1f2937; font-weight: 600; }
        .fare-price { font-size: 1rem; font-weight: 700; color: #111827; }
        .book-now-btn {
          justify-self: end;
          background: #ef4444;
          color: #fff;
          border: none;
          padding: .75rem 1.25rem;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: all .2s ease;
        }
        .book-now-btn:hover { background: #dc2626; transform: translateY(-1px); }
        
        .no-flights { 
          text-align: center; 
          padding: 3rem 1.5rem; 
          color: #64748b;
        }
        .no-flights-icon { 
          font-size: 3rem; 
          margin-bottom: 1rem;
        }
        .no-flights h3 { 
          margin: 0 0 .5rem 0; 
          color: #374151;
        }
        .no-flights p { 
          margin: 0;
        }
        
        /* Modern Attractions Styles */
        .attractions-container { 
          background: #fff; 
          border-radius: 12px; 
          overflow: hidden; 
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          margin: .5rem 0;
        }
        .attractions-filters-header { 
          background: linear-gradient(135deg, #059669 0%, #10b981 100%); 
          color: white; 
          padding: 1.5rem;
        }
        .attractions-filters-header .filters-title h3 { 
          margin: 0 0 .5rem 0; 
          font-size: 1.5rem; 
          font-weight: 700;
        }
        .attractions-filters-header .filters-title p { 
          margin: 0; 
          opacity: 0.9; 
          font-size: .9rem;
        }
        
        .attractions-search-section { 
          display: flex; 
          gap: 1rem; 
          margin: 1.5rem 0; 
          align-items: center;
        }
        .search-container { 
          position: relative; 
          flex: 1;
        }
        .search-icon { 
          position: absolute; 
          left: 1rem; 
          top: 50%; 
          transform: translateY(-50%); 
          font-size: 1rem; 
          opacity: 0.7;
        }
        .attractions-search-input { 
          width: 100%; 
          padding: .75rem 1rem .75rem 2.5rem; 
          border: 1px solid rgba(255,255,255,0.3); 
          border-radius: 8px; 
          background: rgba(255,255,255,0.1); 
          color: white; 
          font-size: .875rem;
        }
        .attractions-search-input::placeholder { 
          color: rgba(255,255,255,0.7);
        }
        .more-filters-btn { 
          display: flex; 
          align-items: center; 
          gap: .5rem; 
          padding: .75rem 1rem; 
          background: rgba(255,255,255,0.1); 
          border: 1px solid rgba(255,255,255,0.3); 
          border-radius: 8px; 
          color: white; 
          font-size: .875rem; 
          cursor: pointer; 
          transition: all .2s ease;
        }
        .more-filters-btn:hover { 
          background: rgba(255,255,255,0.2);
        }
        
        .type-filters-section { 
          margin-top: 1rem;
        }
        .filter-label { 
          font-size: .875rem; 
          font-weight: 500; 
          opacity: 0.9; 
          margin-bottom: .75rem;
        }
        .type-filters { 
          display: flex; 
          gap: .75rem; 
          flex-wrap: wrap;
        }
        .type-filter-chip { 
          display: flex; 
          align-items: center; 
          gap: .5rem; 
          padding: .5rem 1rem; 
          background: rgba(255,255,255,0.1); 
          border: 1px solid rgba(255,255,255,0.3); 
          border-radius: 20px; 
          color: white; 
          font-size: .875rem; 
          cursor: pointer; 
          transition: all .2s ease;
        }
        .type-filter-chip:hover { 
          background: rgba(255,255,255,0.2);
        }
        .type-filter-chip.active { 
          background: white; 
          color: #059669; 
          border-color: white;
        }
        .type-icon { 
          font-size: 1rem;
        }
        
        .advanced-filters-panel { 
          margin-top: 1.5rem; 
          padding-top: 1.5rem; 
          border-top: 1px solid rgba(255,255,255,0.2); 
          animation: slideDown 0.3s ease;
        }
        .filter-row { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
          gap: 1rem;
        }
        .filter-group { 
          display: flex; 
          flex-direction: column; 
          gap: .5rem;
        }
        .filter-group label { 
          font-size: .875rem; 
          font-weight: 500; 
          opacity: 0.9;
        }
        .filter-select { 
          padding: .75rem; 
          border: 1px solid rgba(255,255,255,0.3); 
          border-radius: 8px; 
          background: rgba(255,255,255,0.1); 
          color: white; 
          font-size: .875rem;
        }
        .filter-select option { 
          background: #059669; 
          color: white;
        }
        
        .attractions-results-count { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          padding: 1rem 1.5rem; 
          background: #f8fafc; 
          border-bottom: 1px solid #e2e8f0; 
          font-size: .875rem; 
          color: #64748b; 
          font-weight: 500;
        }
        .clear-filters-btn { 
          background: #dc2626; 
          color: white; 
          border: none; 
          padding: .5rem 1rem; 
          border-radius: 6px; 
          font-size: .75rem; 
          cursor: pointer; 
          transition: all .2s ease;
        }
        .clear-filters-btn:hover { 
          background: #b91c1c;
        }
        
        .attractions-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); 
          gap: 1.5rem; 
          padding: 1.5rem;
        }
        .attraction-card { 
          background: white; 
          border: 1px solid #e2e8f0; 
          border-radius: 12px; 
          overflow: hidden; 
          transition: all .2s ease; 
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .attraction-card:hover { 
          transform: translateY(-2px); 
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        
        .attraction-image-container { 
          position: relative; 
          height: 200px; 
          overflow: hidden;
        }
        .attraction-image { 
          width: 100%; 
          height: 100%; 
          object-fit: cover; 
          transition: transform .2s ease;
        }
        .attraction-card:hover .attraction-image { 
          transform: scale(1.05);
        }
        .attraction-placeholder { 
          width: 100%; 
          height: 100%; 
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 3rem; 
          color: #64748b;
        }
        .attraction-type-badge { 
          position: absolute; 
          top: .75rem; 
          left: .75rem; 
          background: rgba(0,0,0,0.7); 
          color: white; 
          padding: .25rem .5rem; 
          border-radius: 6px; 
          font-size: .75rem; 
          font-weight: 500;
        }
        .attraction-rating-badge { 
          position: absolute; 
          top: .75rem; 
          right: .75rem; 
          background: #059669; 
          color: white; 
          padding: .25rem .5rem; 
          border-radius: 6px; 
          font-size: .75rem; 
          font-weight: 600;
        }
        
        .attraction-content { 
          padding: 1rem;
        }
        .attraction-name { 
          margin: 0 0 .5rem 0; 
          font-size: 1rem; 
          font-weight: 600; 
          color: #1e293b; 
          line-height: 1.4;
        }
        .attraction-location { 
          margin: 0 0 .75rem 0; 
          font-size: .875rem; 
          color: #64748b;
        }
        .attraction-description { 
          margin: 0 0 1rem 0; 
          font-size: .875rem; 
          color: #64748b; 
          line-height: 1.5;
        }
        
        .attraction-footer { 
          display: flex; 
          justify-content: space-between; 
          align-items: center;
        }
        .attraction-rating { 
          display: flex; 
          align-items: center; 
          gap: .5rem;
        }
        .rating-stars { 
          color: #fbbf24; 
          font-size: .875rem;
        }
        .rating-number { 
          font-size: .875rem; 
          font-weight: 600; 
          color: #1e293b;
        }
        .attraction-link-btn { 
          background: #059669; 
          color: white; 
          text-decoration: none; 
          padding: .5rem 1rem; 
          border-radius: 6px; 
          font-size: .75rem; 
          font-weight: 500; 
          transition: all .2s ease;
        }
        .attraction-link-btn:hover { 
          background: #047857; 
          transform: translateY(-1px);
        }
        
        .attractions-pagination { 
          display: flex; 
          justify-content: center; 
          align-items: center; 
          gap: 1rem; 
          padding: 1.5rem; 
          background: #f8fafc; 
          border-top: 1px solid #e2e8f0;
        }
        .pagination-btn { 
          background: #059669; 
          color: white; 
          border: none; 
          padding: .75rem 1.5rem; 
          border-radius: 8px; 
          font-size: .875rem; 
          font-weight: 500; 
          cursor: pointer; 
          transition: all .2s ease;
        }
        .pagination-btn:hover:not(:disabled) { 
          background: #047857; 
          transform: translateY(-1px);
        }
        .pagination-btn:disabled { 
          background: #d1d5db; 
          cursor: not-allowed; 
          transform: none;
        }
        .pagination-info { 
          font-size: .875rem; 
          color: #64748b; 
          font-weight: 500;
        }
        
        .no-attractions { 
          text-align: center; 
          padding: 3rem 1.5rem; 
          color: #64748b;
        }
        .no-attractions-icon { 
          font-size: 3rem; 
          margin-bottom: 1rem;
        }
        .no-attractions h3 { 
          margin: 0 0 .5rem 0; 
          color: #374151;
        }
        .no-attractions p { 
          margin: 0;
        }
        }
        
        @media (min-width: 577px) and (max-width: 768px) {
          .diyachat-window { width: 400px; height: 75vh }
          .diyachat-window.iphone { width: 400px; height: 75vh }
          .flight-row { gap: .5rem }
          .hotel-thumb { width: 200px; height: 140px }
          .result-toolbar { flex-wrap: wrap; gap: .4rem }
          .itinerary-days { gap: .6rem }
          .itinerary-card { min-width: 280px; flex: 0 0 300px }
          
          /* Hotel cards tablet */
          .hotel-cards-grid { grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); }
          .hotel-cards-grid-4rows { grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(6, auto); }
        }
        
        @media (min-width: 769px) and (max-width: 1024px) {
          .diyachat-window { width: 420px; height: 70vh }
          .diyachat-window.iphone { width: 420px; height: 70vh }
          .hotel-thumb { width: 220px; height: 150px }
          .result-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) }
          
          /* Hotel cards desktop */
          .hotel-cards-grid { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
          .hotel-cards-grid-4rows { grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(4, auto); }
        }
        
        @media (min-width: 1025px) {
          .diyachat-window { width: 450px; height: 65vh }
          .diyachat-window.iphone { width: 450px; height: 65vh }
          .hotel-thumb { width: 230px; height: 150px }
          .result-grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)) }
          .itinerary-days { gap: .75rem }
          .itinerary-card { min-width: 320px; flex: 0 0 340px }
          
          /* Hotel cards large desktop */
          .hotel-cards-grid { grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }
          .hotel-cards-grid-4rows { grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(4, auto); }
        }
        
        /* Touch-friendly improvements */
        @media (hover: none) and (pointer: coarse) {
          .filter-chip, .rating-chip, .cta, .btn-send, .btn-mic { min-height: 44px; min-width: 44px }
          .star-btn { min-height: 44px; min-width: 44px; padding: .5rem }
          .fare-pill { min-height: 44px }
          .amenity-tag { min-height: 32px; display: flex; align-items: center }
        }
        
        /* High DPI displays */
        @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
          .trip-img, .hotel-thumb, .card-img { image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges }
        }
        
        .fade-in { animation: fadein .25s ease both }
        @keyframes fadein { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
      `, [])

  const EXTRA_STYLE = useMemo(() => `
        /* iPhone-like chrome for floating window */
        .diyachat-window.iphone { position: relative; border: 10px solid #111; border-radius: 32px; box-shadow: 0 18px 60px rgba(0,0,0,.35); background: var(--color-light); aspect-ratio: 390 / 844; width: min(390px, calc(100vw - 1rem)); height: auto; }
        @media (max-width: 420px){ .diyachat-window.iphone{ width: calc(100vw - 1rem); height: auto; border-width: 8px; border-radius: 28px } }
        @media (max-width: 360px){ .msg.user .bubble{max-width:90%} }
        .diyachat-window.iphone::before { content: ''; position: absolute; top: -10px; left: 50%; transform: translateX(-50%); width: 120px; height: 26px; background: #111; border-bottom-left-radius: 14px; border-bottom-right-radius: 14px; }
        .diyachat-window.iphone::after { content: ''; position: absolute; top: -2px; left: 50%; transform: translateX(-50%); width: 44px; height: 6px; background: #1f2937; border-radius: 999px; }
        
        /* Landscape orientation adjustments */
        @media (orientation: landscape) and (max-height: 500px) {
          .diyachat-window { height: 90vh; max-height: 90vh }
          .diyachat-window.iphone { height: 90vh; max-height: 90vh }
          .diyachat-header { padding: .3rem .5rem }
          .composer { padding: .5rem .5rem }
          .field { padding: .4rem .6rem; padding-right: 5rem }
          .itinerary-days { flex-direction: column; max-height: 300px; overflow-y: auto }
          .itinerary-card { min-width: auto; flex: none }
        }
        
        /* Ultra-wide screens */
        @media (min-width: 1440px) {
          .diyachat-window { width: 480px; height: 60vh }
          .diyachat-window.iphone { width: 480px; height: 60vh }
          .result-grid { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)) }
          .hotel-thumb { width: 240px; height: 160px }
        }

        /* full screen immersive backdrop */
        .diyachat-window.max { background: linear-gradient(180deg,#ffffff 0%, rgba(17,146,238,.08) 55%, rgba(255,157,0,.08) 100%); }
        
        
      `, [])

  useEffect(() => {
    scrollToBottom(true)
  }, [messages, typing])

  useEffect(() => {
    if (isOpen) scrollToBottom(false)
  }, [isOpen])

  useEffect(() => {
    if (isOpen) scrollToBottom(false)
  }, [isMax])

  function resetChat() {
    setMessages([
      {
        id: uid(),
        sender: 'bot',
        type: 'text',
        text: "Hi! I'm DIYA, your travel assistant. I can help you book flights and hotels or manage your trips.",
        quickReplies: ['Book Flight', 'Find Hotels', 'Cancel Ticket'],
      },
    ])
  }

  function pushUserMessage(text) {
    const msg = { id: uid(), sender: 'user', type: 'text', text }
    setMessages((m) => [...m, msg])
  }

  function pushBotMessage(payload) {
    const msg = { id: uid(), sender: 'bot', ...payload }
    setMessages((m) => [...m, msg])
  }

  // Normalize helpers for specialized cards
  function normalizeHotel(item) {
    const locObj = item.location || {}
    const lat = locObj?.lat ?? locObj?.latitude ?? item.lat ?? item.latitude ?? null
    const lng = locObj?.lng ?? locObj?.longitude ?? item.lng ?? item.longitude ?? null
    const rawPrice = (typeof item.price === 'string') ? item.price : (item.price || '')
    const usd = priceToNumber(rawPrice || '')
    const inr = Number.isFinite(usd) ? Math.round(usd * ((import.meta?.env?.VITE_USD_TO_INR && Number(import.meta.env.VITE_USD_TO_INR)) ? Number(import.meta.env.VITE_USD_TO_INR) : 83)) : NaN
    return {
      id: item.hotel_id || uid(),
      hotel_id: item.hotel_id || null,
      name: item.name || 'Untitled',
      rating: item.rating || item.stars || '',
      price: Number.isFinite(inr) ? inr : priceToNumber(item.price || ''),
      priceLabel: Number.isFinite(inr) ? `₹ ${inr.toLocaleString('en-IN')}` : (item.price || ''),
      image: Array.isArray(item.imagelinks) && item.imagelinks[0] ? item.imagelinks[0] : (item.image || ''),
      amenities: Array.isArray(item.amenities) ? item.amenities : [],
      locationName: (function () {
        if (locObj && typeof locObj.name === 'string' && locObj.name.trim()) return locObj.name
        if (typeof item.location === 'string' && item.location.trim()) return item.location
        if (locObj && typeof locObj.city === 'string' && locObj.city.trim()) return `${locObj.city}`
        return ''
      })(),
      locationLat: lat !== null ? Number(lat) : null,
      locationLng: lng !== null ? Number(lng) : null,
      link: item.link || item.url || '',
      description: item.description || item.desc || '',
    }
  }

  function normalizeAttraction(item) {
    const locObj = item.location || {}
    const lat = locObj?.lat ?? locObj?.latitude ?? item.lat ?? item.latitude ?? null
    const lng = locObj?.lng ?? locObj?.longitude ?? item.lng ?? item.longitude ?? null
    return {
      id: item.attraction_id || uid(),
      attraction_id: item.attraction_id || null,
      name: item.name || item.title || 'Untitled',
      rating: item.rating || '',
      image: Array.isArray(item.imagelinks) && item.imagelinks[0] ? item.imagelinks[0] : (item.image || ''),
      description: item.description || item.desc || '',
      locationName: (function () {
        if (locObj && typeof locObj.name === 'string' && locObj.name.trim()) return locObj.name
        if (typeof item.location === 'string' && item.location.trim()) return item.location
        if (locObj && typeof locObj.city === 'string' && locObj.city.trim()) return `${locObj.city}`
        return ''
      })(),
      locationLat: lat !== null ? Number(lat) : null,
      locationLng: lng !== null ? Number(lng) : null,
      link: item.link || item.url || '',
    }
  }

  function normalizeFlight(item) {
    const rawPrice = (typeof item.price === 'string') ? item.price : (item.price || '')
    const usd = priceToNumber(rawPrice || '')
    const inr = Number.isFinite(usd) ? Math.round(usd * ((import.meta?.env?.VITE_USD_TO_INR && Number(import.meta.env.VITE_USD_TO_INR)) ? Number(import.meta.env.VITE_USD_TO_INR) : 83)) : (typeof item.price === 'number' ? item.price : NaN)
    const legs = Array.isArray(item.legs) ? item.legs : []
    const stops = Number.isFinite(item.stops) ? Number(item.stops) : (legs.length ? Math.max(0, legs.length - 1) : 0)
    const duration = item.duration || item.totalDuration || ''
    // map fare options if present
    const rawFares = Array.isArray(item.fares) ? item.fares : (Array.isArray(item.fareOptions) ? item.fareOptions : null)
    let fares = []
    if (rawFares) {
      fares = rawFares
        .map((f) => {
          const label = f.label || f.name || f.type || ''
          const pRaw = typeof f.price === 'number' ? String(f.price) : (f.price || '')
          const pUsd = priceToNumber(pRaw)
          const pInr = Number.isFinite(pUsd) ? Math.round(pUsd * ((import.meta?.env?.VITE_USD_TO_INR && Number(import.meta.env.VITE_USD_TO_INR)) ? Number(import.meta.env.VITE_USD_TO_INR) : 83)) : priceToNumber(pRaw)
          return { label, price: pInr, priceLabel: Number.isFinite(pInr) ? `₹ ${pInr.toLocaleString('en-IN')}` : (f.price || '') }
        })
        .filter(Boolean)
    } else {
      // try to synthesize fares from common vendor keys when present
      const candidates = [
        { key: 'saverFare', label: 'Saver Fare' },
        { key: 'flexiPlus', label: 'Flexi Plus' },
        { key: 'super6E', label: 'Super 6E' },
        { key: 'economy', label: 'Economy' },
        { key: 'business', label: 'Business' },
      ]
      fares = candidates
        .map(({ key, label }) => {
          const v = item[key]
          if (v === undefined || v === null) return null
          const p = Number.isFinite(v) ? Number(v) : priceToNumber(String(v))
          if (!Number.isFinite(p)) return null
          return { label, price: p, priceLabel: `₹ ${Math.round(p).toLocaleString('en-IN')}` }
        })
        .filter(Boolean)
    }
    return {
      id: item.flight_id || item.id || uid(),
      flight_id: item.flight_id || item.id || null,
      airline: item.airline || item.carrier || item.name || '',
      logo: item.logo || item.image || '',
      from: item.from || item.source || item.origin || item.departure?.airport || '',
      to: item.to || item.destination || item.arrival?.airport || '',
      departTime: item.departureTime || item.departure?.time || item.departure_time || '',
      arriveTime: item.arrivalTime || item.arrival?.time || item.arrival_time || '',
      duration,
      stops,
      class: item.class || item.cabinClass || item.fareClass || 'Economy',
      price: Number.isFinite(inr) ? inr : priceToNumber(rawPrice || ''),
      priceLabel: Number.isFinite(inr) ? `₹ ${inr.toLocaleString('en-IN')}` : (item.price || ''),
      link: item.link || item.url || '',
      fares,
    }
  }

  // Frontend-only demo responder
  function offlineRespond(text) {
    const t = (text || '').toLowerCase()
    if (t.includes('flight')) {
      const flights = [
        { flight_id: '6E-2766', airline: 'IndiGo', logo: '', from: 'New Delhi (DEL)', to: 'Mumbai (BOM)', departureTime: '04:00', arrivalTime: '06:15', duration: '2h 15m', stops: 0, class: 'Economy', price: 5141, fares: [{ label: 'Saver Fare', price: 5141 }, { label: 'Flexi Plus', price: 5535 }, { label: 'Super 6E', price: 6900 }], link: '#' },
        { flight_id: '6E-449', airline: 'IndiGo', logo: '', from: 'New Delhi (DEL)', to: 'Mumbai (BOM)', departureTime: '05:00', arrivalTime: '07:20', duration: '2h 20m', stops: 0, class: 'Economy', price: 5141, fares: [{ label: 'Saver Fare', price: 5141 }, { label: 'Flexi Plus', price: 5535 }, { label: 'Super 6E', price: 6900 }], link: '#' },
      ].map(normalizeFlight)
      pushBotMessage({ type: 'flights', flights })
      return
    }
    if (t.includes('hotel')) {
      const hotels = [
        { hotel_id: 'H-101', name: 'The Grand', rating: 4.3, price: 5299, amenities: ['Breakfast', 'Free Wi-Fi', 'Pool', 'Parking', 'Air conditioning'], image: '', location: { name: 'Connaught Place', lat: 28.632, lng: 77.219 }, link: '#' },
        { hotel_id: 'H-102', name: 'City Inn', rating: 4.0, price: 3899, amenities: ['Free Wi-Fi', 'Restaurant', 'Room service'], image: '', location: { name: 'Aerocity' }, link: '#' },
      ].map(normalizeHotel)
      pushBotMessage({ type: 'hotels', hotels })
      return
    }
    if (t.includes('itinerary') || t.includes('plan')) {
      const itinerary = {
        overview: { title: 'Bhubaneswar', destination: 'Bhubaneswar', dateRange: 'From 12-09-2025 to 14-09-2025', stats: { durationInDays: 3, placesVisited: 8 }, summary: 'A vibrant hub known for its rich cultural heritage and ancient temples.' },
        dailyPlan: [
          { day: 1, title: 'Arrival and Temples', activities: [{ time: '09:00', name: 'Lingaraj Temple', rating: 4.7, tags: ['Temple', 'Heritage'], description: 'Explore the 11th-century temple complex.' }, { time: '12:30', name: 'Lunch at Local Dhaba', tags: ['Food'] }, { time: '16:00', name: 'Mukteswara Temple', rating: 4.6 }] },
          { day: 2, title: 'Caves and Museum', activities: [{ time: '10:00', name: 'Udayagiri & Khandagiri Caves', rating: 4.5, tags: ['Archaeology'] }, { time: '14:00', name: 'Odisha State Museum', tags: ['Museum'] }] },
          { day: 3, title: 'Market Walk & Departure', activities: [{ time: '10:00', name: 'Ekamra Haat', tags: ['Market', 'Handicrafts'] }, { time: '17:00', name: 'Departure' }] }
        ]
      }
      pushBotMessage({ type: 'itinerary', itinerary })
      return
    }
    // guidance
    pushBotMessage({ type: 'text', text: 'Frontend-only mode is ON. Type: “demo flights”, “demo hotels”, or “demo itinerary”.\nOr paste your own JSON with flight_id / hotel_id / attraction_id objects.' })
  }

  async function sendToBackend(text) {
    setTyping(true)
    try {
      if (FRONTEND_ONLY) {
        offlineRespond(text)
        return
      }
      const data = await postChat({ sessionId: sessionIdRef.current || getSessionId(), userPrompt: text })
      // Helper: try to parse JSON-like strings into objects
      function tryParseJSON(str) {
        if (!str || typeof str !== 'string') return null
        const s = str.trim()
        if (!(s.startsWith('{') || s.startsWith('['))) return null
        try {
          return JSON.parse(s)
        } catch (e) {
          return null
        }
      }

      // If text looks like JSON, parse and render accordingly
      if (data && typeof data.text === 'string' && data.text.trim()) {
        // remove any literal placeholders like [dbData] which we render separately
        const cleaned = data.text.replace(/\[dbData\]/g, '').trim()
        const parsed = tryParseJSON(cleaned)
        if (parsed) {
          // parsed can be array of results or messages
          if (Array.isArray(parsed) && parsed.length && typeof parsed[0] === 'object') {
            const hasFlights = parsed.some(it => typeof it === 'object' && (it.flight_id || (it.type || '').toLowerCase().includes('flight')))
            const hasHotels = parsed.some(it => typeof it === 'object' && (it.hotel_id || (it.type || '').toLowerCase().includes('hotel')))
            const hasAttractions = parsed.some(it => typeof it === 'object' && (it.attraction_id || (it.type || '').toLowerCase().includes('attraction')))
            if (hasFlights) {
              const flights = parsed.map(normalizeFlight)
              pushBotMessage({ type: 'flights', flights })
              return
            }
            if (hasHotels) {
              const hotels = parsed.map(normalizeHotel)
              pushBotMessage({ type: 'hotels', hotels })
              return
            }
            if (hasAttractions) {
              const attractions = parsed.map(normalizeAttraction)
              pushBotMessage({ type: 'attractions', attractions })
              return
            }
            // fallback to generic cards
            const USD_TO_INR = (import.meta?.env?.VITE_USD_TO_INR && Number(import.meta.env.VITE_USD_TO_INR)) ? Number(import.meta.env.VITE_USD_TO_INR) : 83
            const results = parsed.map((item) => {
              const locObj = item.location || {}
              const lat = locObj?.lat ?? locObj?.latitude ?? item.lat ?? item.latitude ?? null
              const lng = locObj?.lng ?? locObj?.longitude ?? item.lng ?? item.longitude ?? null
              const rawPrice = (item.price && typeof item.price === 'string') ? item.price : (item.price || '')
              const numericUSD = priceToNumber(rawPrice || '')
              const numericINR = Number.isFinite(numericUSD) ? Math.round(numericUSD * USD_TO_INR) : NaN
              return ({
                id: item.attraction_id || item.hotel_id || uid(),
                originalId: item.hotel_id || item.attraction_id || null,
                originalType: (item.type || (item.hotel_id ? 'hotel' : (item.attraction_id ? 'attraction' : 'item'))),
                type: item.type || 'item',
                title: item.name || item.title || 'Untitled',
                price: Number.isFinite(numericINR) ? `₹ ${numericINR.toLocaleString('en-IN')}` : (item.price || ''),
                numericPrice: Number.isFinite(numericINR) ? numericINR : priceToNumber(item.price || ''),
                numericPriceUSD: Number.isFinite(numericUSD) ? numericUSD : NaN,
                rating: item.rating || item.stars || '',
                image: Array.isArray(item.imagelinks) && item.imagelinks[0] ? item.imagelinks[0] : (item.image || ''),
                link: item.link || item.url || '',
                description: item.description || item.desc || '',
                location: (function () {
                  if (locObj && typeof locObj.name === 'string' && locObj.name.trim()) return locObj.name
                  if (lat !== null && lng !== null) return `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`
                  if (typeof item.location === 'string' && item.location.trim()) return item.location
                  if (locObj && typeof locObj.address === 'string' && locObj.address.trim()) return locObj.address
                  if (locObj && typeof locObj.city === 'string' && locObj.city.trim()) return `${locObj.city}`
                  return ''
                })(),
                locationLat: lat !== null ? Number(lat) : null,
                locationLng: lng !== null ? Number(lng) : null,
                ctaLabel: item.ctaLabel || 'View',
              })
            })
            pushBotMessage({ type: 'results', results })
          } else if (Array.isArray(parsed) && parsed.length && typeof parsed[0] === 'string') {
            parsed.forEach((t) => pushBotMessage({ type: 'text', text: String(t) }))
          } else if (typeof parsed === 'object') {
            // object might contain dbData, itenaryData or text
            if (Array.isArray(parsed.dbData) && parsed.dbData.length) {
              // reuse dbData handling below by assigning data.dbData
              data.dbData = parsed.dbData
            }
            if (parsed.itenaryData || parsed.itineraryData) {
              const itin = parsed.itenaryData || parsed.itineraryData
              pushBotMessage({ type: 'itinerary', itinerary: itin })
            }
            if (parsed.text) pushBotMessage({ type: 'text', text: String(parsed.text) })
          }
        } else {
          pushBotMessage({ type: 'text', text: cleaned })
        }
      }

      // if backend provided structured itenaryData at top-level
      if (data?.itenaryData || data?.itineraryData) {
        const itin = data.itenaryData || data.itineraryData
        pushBotMessage({ type: 'itinerary', itinerary: itin })
      }

      // if backend provided structured dbData, map to specialized cards
      if (Array.isArray(data?.dbData) && data.dbData.length) {
        const hasFlights = data.dbData.some(it => typeof it === 'object' && (it.flight_id || (it.type || '').toLowerCase().includes('flight')))
        const hasHotels = data.dbData.some(it => typeof it === 'object' && (it.hotel_id || (it.type || '').toLowerCase().includes('hotel')))
        const hasAttractions = data.dbData.some(it => typeof it === 'object' && (it.attraction_id || (it.type || '').toLowerCase().includes('attraction')))
        if (hasFlights) {
          const flights = data.dbData.map(normalizeFlight)
          pushBotMessage({ type: 'flights', flights })
        } else if (hasHotels) {
          const hotels = data.dbData.map(normalizeHotel)
          pushBotMessage({ type: 'hotels', hotels })
        } else if (hasAttractions) {
          const attractions = data.dbData.map(normalizeAttraction)
          pushBotMessage({ type: 'attractions', attractions })
        } else {
          const USD_TO_INR = (import.meta?.env?.VITE_USD_TO_INR && Number(import.meta.env.VITE_USD_TO_INR)) ? Number(import.meta.env.VITE_USD_TO_INR) : 83
          const results = data.dbData.map((item) => {
            const locObj = item.location || {}
            const lat = locObj?.lat ?? locObj?.latitude ?? item.lat ?? item.latitude ?? null
            const lng = locObj?.lng ?? locObj?.longitude ?? item.lng ?? item.longitude ?? null
            const rawPrice = (item.price && typeof item.price === 'string') ? item.price : (item.price || '')
            const numericUSD = priceToNumber(rawPrice || '')
            const numericINR = Number.isFinite(numericUSD) ? Math.round(numericUSD * USD_TO_INR) : NaN
            return ({
              id: item.attraction_id || item.hotel_id || uid(),
              originalId: item.hotel_id || item.attraction_id || null,
              originalType: (item.type || (item.hotel_id ? 'hotel' : (item.attraction_id ? 'attraction' : 'item'))),
              type: item.type || 'item',
              title: item.name || 'Untitled',
              price: Number.isFinite(numericINR) ? `₹ ${numericINR.toLocaleString('en-IN')}` : (item.price || ''),
              numericPrice: Number.isFinite(numericINR) ? numericINR : priceToNumber(item.price || ''),
              numericPriceUSD: Number.isFinite(numericUSD) ? numericUSD : NaN,
              rating: item.rating || '',
              image: Array.isArray(item.imagelinks) && item.imagelinks[0] ? item.imagelinks[0] : '',
              link: item.link || '',
              description: item.description || '',
              location: (function () {
                if (locObj && typeof locObj.name === 'string' && locObj.name.trim()) return locObj.name
                if (lat !== null && lng !== null) return `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`
                if (typeof item.location === 'string' && item.location.trim()) return item.location
                if (locObj && typeof locObj.address === 'string' && locObj.address.trim()) return locObj.address
                if (locObj && typeof locObj.city === 'string' && locObj.city.trim()) return `${locObj.city}`
                return ''
              })(),
              locationLat: lat !== null ? Number(lat) : null,
              locationLng: lng !== null ? Number(lng) : null,
              ctaLabel: 'View',
            })
          })
          pushBotMessage({ type: 'results', results })
        }
      }

      // if backend provided structured attractionsData, map to attractions cards
      if (Array.isArray(data?.attractionsData) && data.attractionsData.length) {
        const attractions = data.attractionsData.map(normalizeAttraction)
        pushBotMessage({ type: 'attractions', attractions })
      }
    } catch (err) {
      pushBotMessage({
        type: 'text',
        text: "I'm having trouble reaching the server right now. Please try again.",
        quickReplies: ['Book Flight', 'Find Hotels', 'Cancel Ticket'],
      })
    } finally {
      setTyping(false)
    }
  }

  function handleSend() {
    const text = input.trim()
    if (!text) return
    setInput('')
    pushUserMessage(text)
    if (onSend) onSend(text)
    sendToBackend(text)
  }

  function handleChipClick(label) {
    pushUserMessage(label)
    sendToBackend(label)
  }

  // simple, safe markdown -> HTML renderer (no external deps)
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  function markdownToHtml(input) {
    if (!input) return ''
    let s = String(input)
    // escape HTML first
    s = escapeHtml(s)

    // code blocks ``` ```
    s = s.replace(/```([\s\S]*?)```/g, (m, code) => {
      return '<pre><code>' + code.replace(/</g, '&lt;') + '</code></pre>'
    })
    // inline code `code`
    s = s.replace(/`([^`]+?)`/g, '<code>$1</code>')

    // headings #, ##, ###
    s = s.replace(/^###\s?(.*)$/gm, '<h3>$1</h3>')
    s = s.replace(/^##\s?(.*)$/gm, '<h2>$1</h2>')
    s = s.replace(/^#\s?(.*)$/gm, '<h1>$1</h1>')

    // bold **text** or __text__
    s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    s = s.replace(/__(.*?)__/g, '<strong>$1</strong>')
    // italics *text* or _text_
    s = s.replace(/\*(.*?)\*/g, '<em>$1</em>')
    s = s.replace(/_(.*?)_/g, '<em>$1</em>')

    // links [text](url)
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')

    // raw URLs -> convert to links (we will later detect images)
    s = s.replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>')

    // embed images: replace image links with <img>
    s = s.replace(/<a href="(https?:\/\/[^\s]+)"[^>]*>\1<\/a>/g, (m, url) => {
      const lower = url.toLowerCase()
      const looksLikeImage = /\.(png|jpe?g|gif|webp|svg)(\?|$)/.test(lower) || /googleusercontent\.com|lh\d*\.googleusercontent|proxy\//.test(lower)
      if (looksLikeImage) {
        return `<img src="${url}" class="inline-img" alt="image" onerror="this.style.display='none'"/>`
      }
      return m
    })

    // detect latitude/longitude patterns and replace with Google Maps link
    s = s.replace(/latitude[:\s]*([-+]?\d{1,3}\.\d+)[,;\s]*longitude[:\s]*([-+]?\d{1,3}\.\d+)/gi, (m, lat, lng) => {
      const q = encodeURIComponent(`${lat},${lng}`)
      return `<a class="inline-map" href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" rel="noreferrer">📍 View on map</a>`
    })

    // also support patterns like (lat: 12.34, lng: 56.78) or lat=.. lng=..
    s = s.replace(/lat(?:itude)?[:=\s]*([-+]?\d{1,3}\.\d+)[,;\s]*lng(?:itude)?[:=\s]*([-+]?\d{1,3}\.\d+)/gi, (m, lat, lng) => {
      return `<a class="inline-map" href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" rel="noreferrer">📍 View on map</a>`
    })

    // unordered lists
    s = s.replace(/(^|\n)([ \t]*[-*+]\s.+)(?=\n|$)/g, (m) => {
      const items = m.trim().split(/\n+/).map((line) => line.replace(/^[ \t]*[-*+]\s/, ''))
      return '\n<ul>' + items.map((it) => '<li>' + it + '</li>').join('') + '</ul>'
    })

    // ordered lists
    s = s.replace(/(^|\n)([ \t]*\d+\.\s.+)(?=\n|$)/g, (m) => {
      const items = m.trim().split(/\n+/).map((line) => line.replace(/^[ \t]*\d+\.\s/, ''))
      return '\n<ol>' + items.map((it) => '<li>' + it + '</li>').join('') + '</ol>'
    })

    // paragraphs (double newline)
    s = s.replace(/\n{2,}/g, '</p><p>')
    s = '<p>' + s + '</p>'
    // single newline -> <br>
    s = s.replace(/\n/g, '<br>')
    return s
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Results pager component: shows up to 4 rows per page and provides pagination controls
  const ItineraryView = ({ itinerary }) => {
    const [tab, setTab] = useState('Overview')
    const tabs = ['Overview', 'Daily Plan', 'Explore More']
    const days = Number(itinerary?.overview?.stats?.durationInDays || (Array.isArray(itinerary?.dailyPlan) ? itinerary.dailyPlan.length : 0))

    return (
      <div className="itinerary-container">
        {/* Header Section */}
        <div className="itinerary-header">
          <div className="itinerary-header-content">
            <div className="itinerary-title-section">
              <h2 className="itinerary-title">{itinerary?.overview?.title || 'Your Custom Itinerary'}</h2>
              <p className="itinerary-destination">📍 {itinerary?.overview?.destination}</p>
            </div>
            <div className="itinerary-stats">
              <div className="stat-item">
                <span className="stat-number">{days}</span>
                <span className="stat-label">Days</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{itinerary?.overview?.stats?.placesVisited || 0}</span>
                <span className="stat-label">Places</span>
              </div>
              <button className="download-btn" onClick={() => { /* hook up client PDF here */ }} title="Download PDF">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7,10 12,15 17,10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download PDF
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="itinerary-tabs">
          {tabs.map(t => (
            <button
              key={t}
              className={`tab-btn ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="itinerary-content">
          {tab === 'Overview' && (
            <div className="overview-section">
              <div className="summary-card">
                <h3>About This Trip</h3>
                <p className="trip-summary">{itinerary?.overview?.summary}</p>
              </div>

              <div className="trip-highlights">
                <h3>Trip Highlights</h3>
                <div className="highlights-grid">
                  <div className="highlight-item">
                    <div className="highlight-icon">🗓️</div>
                    <div className="highlight-text">
                      <strong>{days} Days</strong>
                      <span>Duration</span>
                    </div>
                  </div>
                  <div className="highlight-item">
                    <div className="highlight-icon">📍</div>
                    <div className="highlight-text">
                      <strong>{itinerary?.overview?.stats?.placesVisited || 0}</strong>
                      <span>Places to Visit</span>
                    </div>
                  </div>
                  <div className="highlight-item">
                    <div className="highlight-icon">⭐</div>
                    <div className="highlight-text">
                      <strong>4.9+</strong>
                      <span>Average Rating</span>
                    </div>
                  </div>
                  <div className="highlight-item">
                    <div className="highlight-icon">🎯</div>
                    <div className="highlight-text">
                      <strong>Custom</strong>
                      <span>Tailored Experience</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'Daily Plan' && (
            <div className="daily-plan-section">
              {Array.isArray(itinerary?.dailyPlan) && itinerary.dailyPlan.map((day, dayIndex) => (
                <div key={`day-${day.day}`} className="day-card">
                  <div className="day-header">
                    <div className="day-number">Day {day.day}</div>
                    <h3 className="day-title">{day.title}</h3>
                  </div>

                  <div className="activities-list">
                    {Array.isArray(day.activities) && day.activities.map((activity, actIndex) => (
                      <div key={actIndex} className="activity-card">
                        <div className="activity-image">
                          {activity.imageLinks && activity.imageLinks[0] ? (
                            <img
                              src={activity.imageLinks[0]}
                              alt={activity.name}
                              onError={(e) => { e.currentTarget.style.display = 'none' }}
                            />
                          ) : (
                            <div className="activity-placeholder">🏛️</div>
                          )}
                          {activity.rating && (
                            <div className="activity-rating">
                              ⭐ {activity.rating}
                            </div>
                          )}
                        </div>

                        <div className="activity-content">
                          <h4 className="activity-name">{activity.name}</h4>
                          <p className="activity-description">{activity.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'Explore More' && (
            <div className="explore-more-section">
              <h3>More Experiences to Explore</h3>
              <div className="explore-grid">
                {Array.isArray(itinerary?.exploreMore) && itinerary.exploreMore.map((item, index) => (
                  <div key={index} className="explore-card">
                    <div className="explore-image">
                      {item.imageLinks && item.imageLinks[0] ? (
                        <img
                          src={item.imageLinks[0]}
                          alt={item.name}
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                      ) : (
                        <div className="explore-placeholder">🎯</div>
                      )}
                      {item.rating && (
                        <div className="explore-rating">
                          ⭐ {item.rating}
                        </div>
                      )}
                    </div>
                    <div className="explore-content">
                      <h4 className="explore-name">{item.name}</h4>
                      <p className="explore-description">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
  const FlightList = ({ flights }) => {
    const [airline, setAirline] = useState('all')
    const [departBand, setDepartBand] = useState('any') // any|morning|afternoon|evening|night
    const [cabin, setCabin] = useState('any') // any|Economy|Business
    const [sort, setSort] = useState('price_asc') // price_asc|duration_asc
    const [selectedFareById, setSelectedFareById] = useState({})
    const [nonstopOnly, setNonstopOnly] = useState(false)
    const [showFilters, setShowFilters] = useState(false)

    function extractCode(text) {
      if (!text) return ''
      const m = String(text).match(/\(([A-Z]{3})\)/)
      if (m) return m[1]
      const mm = String(text).match(/\b([A-Z]{3})\b/)
      return mm ? mm[1] : ''
    }

    // Transform input to a unified shape, handling both backend raw and pre-normalized flights
    const transformedFlights = (flights || []).map((flight) => {
      const isBackend = !!(flight.flight_id || flight.departuredatetime || flight.departureairportcode)
      if (isBackend) {
        return {
          id: flight.flight_id || flight.id,
          airline: flight.airline,
          logo: flight.airline_logo || flight.logo,
          price: parseFloat(flight.price) || 0,
          priceCurrency: flight.pricecurrency || 'USD',
          class: flight.travelclass || flight.class || 'Economy',
          departTime: flight.departuredatetime,
          arriveTime: flight.arrivaldatetime,
          departCode: flight.departureairportcode || extractCode(flight.from),
          arriveCode: flight.arrivalairportcode || extractCode(flight.to),
          duration: Number(flight.totalduration) || flight.totalduration,
          stops: Array.isArray(flight.layovers) ? flight.layovers.length : (flight.stops || 0),
          layovers: flight.layovers || []
        }
      }
      // normalized shape
      return {
        id: flight.id || flight.flight_id,
        airline: flight.airline,
        logo: flight.logo,
        price: Number.isFinite(flight.price) ? flight.price : 0,
        priceCurrency: flight.priceCurrency || 'INR',
        class: flight.class || 'Economy',
        departTime: flight.departTime,
        arriveTime: flight.arriveTime,
        departCode: flight.departCode || extractCode(flight.from),
        arriveCode: flight.arriveCode || extractCode(flight.to),
        duration: flight.duration,
        stops: Number(flight.stops || 0),
        layovers: flight.layovers || []
      }
    })

    function hourFrom(t) {
      if (!t) return NaN
      const d = new Date(t)
      if (!isNaN(d.getTime())) return d.getHours()
      return NaN
    }

    const prices = transformedFlights.map(f => Number.isFinite(f.price) ? f.price : NaN).filter(Number.isFinite)
    const min = prices.length ? Math.min(...prices) : 0
    const max = prices.length ? Math.max(...prices) : 0
    const [pMin, setPMin] = useState(min)
    const [pMax, setPMax] = useState(max)
    useEffect(() => { setPMin(min); setPMax(max) }, [min, max, transformedFlights?.length])

    const airlineSet = Array.from(new Set(transformedFlights.map(f => (f.airline || '').trim()).filter(Boolean)))

    const filtered = transformedFlights
      .filter(f => airline === 'all' ? true : (f.airline || '') === airline)
      .filter(f => Number.isFinite(f.price) ? (f.price >= pMin && f.price <= pMax) : true)
      .filter(f => nonstopOnly ? (Number(f.stops || 0) === 0) : true)
      .filter(f => {
        if (departBand === 'any') return true
        const h = hourFrom(f.departTime)
        if (isNaN(h)) return true
        if (departBand === 'morning') return h >= 5 && h < 12
        if (departBand === 'afternoon') return h >= 12 && h < 17
        if (departBand === 'evening') return h >= 17 && h < 21
        if (departBand === 'night') return (h >= 21 || h < 5)
        return true
      })
      .filter(f => cabin === 'any' ? true : ((f.class || '').toLowerCase().includes(cabin.toLowerCase())))
      .sort((a, b) => {
        if (sort === 'price_asc') return (a.price || Infinity) - (b.price || Infinity)
        if (sort === 'duration_asc') {
          const ad = parseFloat(String(a.duration).replace(/[^0-9.]/g, '')) || Infinity
          const bd = parseFloat(String(b.duration).replace(/[^0-9.]/g, '')) || Infinity
          return ad - bd
        }
        return 0
      })

    function formatTime(t) {
      if (!t) return ''
      const d = new Date(t)
      if (!isNaN(d.getTime())) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
      const m = String(t).match(/\b\d{1,2}:\d{2}\b/)
      return m ? m[0] : ''
    }

    function formatDuration(d) {
      if (typeof d === 'number' && Number.isFinite(d)) {
        return Math.floor(d / 60) + 'h ' + (d % 60) + 'm'
      }
      return String(d || '')
    }

    return (
      <div className="flight-container">
        {showFilters && (
          <div className="flight-filters-header">
            <div className="filters-title">
              <h3>✈️ Refine Your Flight Search</h3>
              <p>Find the perfect flight with our advanced filters</p>
            </div>

            <div className="flight-filters-grid">
              <div className="filter-group">
                <label>Airline</label>
                <select className="modern-select" value={airline} onChange={e => setAirline(e.target.value)}>
                  <option value="all">All Airlines</option>
                  {airlineSet.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <div className="filter-group">
                <label>Departure Time</label>
                <select className="modern-select" value={departBand} onChange={e => setDepartBand(e.target.value)}>
                  <option value="any">Any Time</option>
                  <option value="morning">🌅 Morning (5AM-12PM)</option>
                  <option value="afternoon">☀️ Afternoon (12PM-5PM)</option>
                  <option value="evening">🌆 Evening (5PM-9PM)</option>
                  <option value="night">🌙 Night (9PM-5AM)</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Class</label>
                <select className="modern-select" value={cabin} onChange={e => setCabin(e.target.value)}>
                  <option value="any">Any Class</option>
                  <option value="Economy">💺 Economy</option>
                  <option value="Business">🛋️ Business</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Sort By</label>
                <select className="modern-select" value={sort} onChange={e => setSort(e.target.value)}>
                  <option value="price_asc">💰 Lowest Price</option>
                  <option value="duration_asc">⏱️ Shortest Duration</option>
                </select>
              </div>

              <div className="filter-group checkbox-group">
                <label className="checkbox-label">
                  <input type="checkbox" checked={nonstopOnly} onChange={(e) => setNonstopOnly(e.target.checked)} />
                  <span className="checkmark"></span>
                  Non-stop Only
                </label>
              </div>
            </div>

            <div className="price-range-section">
              <label>Price Range: {pMin} - {pMax} {transformedFlights[0]?.priceCurrency || 'USD'}</label>
              <div className="price-slider-container">
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={pMin}
                  onChange={(e) => { const v = Number(e.target.value); setPMin(Math.min(v, pMax)); }}
                  className="price-range"
                />
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={pMax}
                  onChange={(e) => { const v = Number(e.target.value); setPMax(Math.max(v, pMin)); }}
                  className="price-range"
                />
              </div>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="results-count">
          <span>{filtered.length} flights found</span>
          <button className="filters-toggle-btn" onClick={() => setShowFilters(s => !s)}>
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {/* Modern Flight Cards */}
        <div className="flight-cards-container">
          {filtered.map(flight => {
            const departTime = formatTime(flight.departTime)
            const arriveTime = formatTime(flight.arriveTime)
            const duration = formatDuration(flight.duration)

            return (
              <div key={flight.id} className="modern-flight-card">
                <div className="flight-card-header">
                  <div className="airline-section">
                    <div className="airline-logo">
                      {flight.logo ? (
                        <img src={flight.logo} alt={flight.airline} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                      ) : (
                        <div className="airline-placeholder">✈️</div>
                      )}
                    </div>
                    <div className="airline-info">
                      <h4>{flight.airline}</h4>
                      <span className="flight-class">{flight.class}</span>
                    </div>
                  </div>

                  <div className="price-section">
                    <div className="flight-price">
                      {flight.priceCurrency} {Math.round(flight.price)}
                    </div>
                    <div className="price-per-person">per person</div>
                  </div>
                </div>

                <div className="flight-route-section">
                  <div className="route-info">
                    <div className="airport-info">
                      <div className="airport-code">{flight.departCode}</div>
                      <div className="airport-time">{departTime}</div>
                    </div>

                    <div className="flight-path">
                      <div className="flight-duration">{duration}</div>
                      <div className="flight-line">
                        <div className="flight-dot start"></div>
                        <div className="flight-line-segment"></div>
                        <div className="flight-dot end"></div>
                      </div>
                      <div className="flight-stops">
                        {flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
                      </div>
                    </div>

                    <div className="airport-info">
                      <div className="airport-code">{flight.arriveCode}</div>
                      <div className="airport-time">{arriveTime}</div>
                    </div>
                  </div>
                </div>

                <div className="flight-card-footer">
                  <div className="flight-details">
                    <span className="detail-item">🛫 {flight.departCode} → {flight.arriveCode}</span>
                    <span className="detail-item">⏱️ {duration}</span>
                    {flight.stops > 0 && (
                      <span className="detail-item">🔄 {flight.stops} stop{flight.stops > 1 ? 's' : ''}</span>
                    )}
                  </div>

                  <button
                    className={`select-flight-btn ${selectedFareById[flight.id] ? 'selected' : ''}`}
                    onClick={() => setSelectedFareById(prev => ({ ...prev, [flight.id]: !prev[flight.id] }))}
                  >
                    {selectedFareById[flight.id] ? '✓ Selected' : 'Select Flight'}
                  </button>
                </div>
                {(() => {
                  const USD_TO_INR = (import.meta?.env?.VITE_USD_TO_INR && Number(import.meta.env.VITE_USD_TO_INR)) ? Number(import.meta.env.VITE_USD_TO_INR) : 83
                  const baseInr = Math.round((String(flight.priceCurrency || '').toUpperCase() === 'USD') ? (Number(flight.price || 0) * USD_TO_INR) : Number(flight.price || 0))
                  const fareOptions = [
                    { label: 'Saver Fare', price: baseInr },
                    { label: 'Flexi Plus', price: baseInr + 394 },
                    { label: 'Super 6E', price: baseInr + 1759 },
                  ]
                  const selectedIdx = Number.isFinite(selectedFareById[flight.id]) ? selectedFareById[flight.id] : 0
                  return (
                    <div className="fare-options-row">
                      <div className="fare-options-title">Fare Options</div>
                      <div className="fare-options-group">
                        {fareOptions.map((fo, idx) => (
                          <label key={idx} className={`fare-radio ${selectedIdx === idx ? 'active' : ''}`}>
                            <input
                              type="radio"
                              name={`fare-${flight.id}`}
                              checked={selectedIdx === idx}
                              onChange={() => setSelectedFareById(prev => ({ ...prev, [flight.id]: idx }))}
                            />
                            <span className="fare-name">{fo.label}</span>
                            <span className="fare-price">₹ {Math.round(fo.price).toLocaleString('en-IN')}</span>
                          </label>
                        ))}
                      </div>
                      <button
                        className="book-now-btn"
                        onClick={() => {
                          if (flight.link) window.open(flight.link, '_blank', 'noopener,noreferrer')
                        }}
                      >
                        Book Now
                      </button>
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="no-flights">
            <div className="no-flights-icon">✈️</div>
            <h3>No flights found</h3>
            <p>Try adjusting your filters to see more results</p>
          </div>
        )}
      </div>
    )
  }

  // Compact Hotel Card Component - Yatra.com style
  const CompactHotelCard = ({ hotel }) => {
    const rating = parseFloat(hotel.rating || '0')
    const price = Number.isFinite(hotel.price) ? hotel.price : 0
    const reviewsCount = hotel.reviewsCount || Math.floor(Math.random() * 10000) + 1000
    const roomsLeft = hotel.roomsLeft || Math.floor(Math.random() * 30) + 5
    const hasBreakfast = hotel.hasBreakfast || Math.random() > 0.5

    return (
      <div className="compact-hotel-card">
        <div className="hotel-card-image">
          {hotel.image ? (
            <img src={hotel.image} alt={hotel.name} onError={(e) => { e.currentTarget.style.display = 'none' }} />
          ) : (
            <div className="hotel-placeholder">🏨</div>
          )}
        </div>
        <div className="hotel-card-content">
          <h3 className="hotel-name">{hotel.name}</h3>
          {hotel.locationName && (
            <div className="hotel-location-section">
              <p className="hotel-location">📍 {hotel.locationName}</p>
              <button
                className="location-btn"
                onClick={() => {
                  let url
                  if (hotel.locationLat && hotel.locationLng) {
                    // Use exact coordinates if available
                    url = `https://www.google.com/maps?q=${hotel.locationLat},${hotel.locationLng}`
                  } else {
                    // Use location name for search
                    const searchQuery = encodeURIComponent(`${hotel.locationName} ${hotel.name || ''}`.trim())
                    url = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`
                  }
                  window.open(url, '_blank', 'noopener,noreferrer')
                }}
                title="View on Google Maps"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                View on Map
              </button>
            </div>
          )}

          {/* Rating Section */}
          <div className="hotel-ratings">
            <div className="rating-badge guest-rating">
              <span className="rating-number">{rating.toFixed(1)}</span>
              <span className="rating-label">Guest Rating</span>
            </div>
            <div className="rating-badge google-rating">
              <span className="rating-number">{rating.toFixed(1)}</span>
              <span className="rating-label">Google Rating</span>
            </div>
            <div className="reviews-count">
              {reviewsCount.toLocaleString('en-IN')} reviews
            </div>
          </div>

          {/* Price and Action */}
          <div className="hotel-price-action">
            <div className="price-section">
              <div className="hotel-price">{hotel.priceCurrency || '$'} {Math.round(price).toLocaleString('en-IN')}</div>
              <div className="hotel-price-label">per night</div>
            </div>
            <button className="hotel-choose-btn">Choose Room</button>
          </div>

          {/* Amenities */}
          {Array.isArray(hotel.amenities) && hotel.amenities.length > 0 && (
            <div className="hotel-amenities">
              {hotel.amenities.slice(0, 3).map((amenity, i) => (
                <span key={i} className="amenity-chip">{amenity}</span>
              ))}
              {hotel.amenities.length > 3 && (
                <span className="amenity-chip">+{hotel.amenities.length - 3}</span>
              )}
            </div>
          )}

          {/* Additional Info */}
          <div className="hotel-additional-info">
            <div className="rooms-left">{roomsLeft} rooms left</div>
            {hasBreakfast && (
              <div className="breakfast-info">
                <span className="breakfast-icon">☕</span>
                <span>Breakfast</span>
              </div>
            )}
          </div>

          {/* View Details Link */}
          <div className="hotel-view-details">
            <a href={hotel.link || '#'} target="_blank" rel="noreferrer">
              View Details
            </a>
          </div>
        </div>
      </div>
    )
  }

  const AttractionList = ({ attractions }) => {
    const [selectedTypes, setSelectedTypes] = useState([])
    const [selectedRating, setSelectedRating] = useState('all')
    const [selectedLocation, setSelectedLocation] = useState('all')
    const [currentPage, setCurrentPage] = useState(1)
    const [searchQuery, setSearchQuery] = useState('')
    const [sortBy, setSortBy] = useState('rating_desc')
    const [showMoreFilters, setShowMoreFilters] = useState(false)

    // Transform backend data to match component expectations
    const transformedAttractions = (attractions || []).map(attraction => ({
      id: attraction.attraction_id,
      name: attraction.name,
      type: attraction.type,
      description: attraction.description,
      rating: parseFloat(attraction.rating) || 0,
      location: attraction.location?.name || 'Unknown Location',
      image: attraction.imagelinks && attraction.imagelinks[0] ? attraction.imagelinks[0] : null,
      link: attraction.link,
      created_at: attraction.created_at
    }))

    // Get unique types and locations for filters
    const uniqueTypes = Array.from(new Set(transformedAttractions.map(a => a.type).filter(Boolean)))
    const uniqueLocations = Array.from(new Set(transformedAttractions.map(a => a.location).filter(Boolean)))

    // Filter and sort attractions
    const filteredAttractions = transformedAttractions
      .filter(attraction => {
        // Type filter
        if (selectedTypes.length > 0 && !selectedTypes.includes(attraction.type)) {
          return false
        }

        // Rating filter
        if (selectedRating !== 'all') {
          const rating = attraction.rating
          if (selectedRating === '4.5+') {
            if (rating < 4.5) return false
          } else if (selectedRating === '4.0+') {
            if (rating < 4.0) return false
          } else if (selectedRating === '3.5+') {
            if (rating < 3.5) return false
          }
        }

        // Location filter
        if (selectedLocation !== 'all' && attraction.location !== selectedLocation) {
          return false
        }

        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          return (
            attraction.name.toLowerCase().includes(query) ||
            attraction.description.toLowerCase().includes(query) ||
            attraction.location.toLowerCase().includes(query)
          )
        }

        return true
      })
      .sort((a, b) => {
        if (sortBy === 'rating_desc') return b.rating - a.rating
        if (sortBy === 'rating_asc') return a.rating - b.rating
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name)
        if (sortBy === 'name_desc') return b.name.localeCompare(a.name)
        return 0
      })

    // Pagination
    const attractionsPerPage = 12
    const totalPages = Math.ceil(filteredAttractions.length / attractionsPerPage)
    const startIndex = (currentPage - 1) * attractionsPerPage
    const endIndex = startIndex + attractionsPerPage
    const currentAttractions = filteredAttractions.slice(startIndex, endIndex)

    const handleTypeToggle = (type) => {
      setSelectedTypes(prev =>
        prev.includes(type)
          ? prev.filter(t => t !== type)
          : [...prev, type]
      )
      setCurrentPage(1)
    }

    const getTypeIcon = (type) => {
      switch (type) {
        case 'attraction': return '🏛️'
        case 'attraction_product': return '🎯'
        case 'eatery': return '🍽️'
        default: return '📍'
      }
    }

    const getTypeLabel = (type) => {
      switch (type) {
        case 'attraction': return 'Attractions'
        case 'attraction_product': return 'Tours & Activities'
        case 'eatery': return 'Restaurants'
        default: return type
      }
    }

    return (
      <div className="attractions-container">
        {/* Modern Filter Header */}
        <div className="attractions-filters-header">
          <div className="filters-title">
            <h3>🎯 Discover Amazing Attractions</h3>
            <p>Explore the best places to visit, eat, and experience</p>
          </div>

          {/* Search Bar */}
          <div className="attractions-search-section">
            <div className="search-container">
              <div className="search-icon">🔍</div>
              <input
                type="text"
                placeholder="Search attractions, restaurants, or locations..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="attractions-search-input"
              />
            </div>
            <button
              className="more-filters-btn"
              onClick={() => setShowMoreFilters(!showMoreFilters)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              More Filters
            </button>
          </div>

          {/* Type Filters */}
          <div className="type-filters-section">
            <div className="filter-label">Categories:</div>
            <div className="type-filters">
              {uniqueTypes.map(type => (
                <button
                  key={type}
                  className={`type-filter-chip ${selectedTypes.includes(type) ? 'active' : ''}`}
                  onClick={() => handleTypeToggle(type)}
                >
                  <span className="type-icon">{getTypeIcon(type)}</span>
                  <span className="type-text">{getTypeLabel(type)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showMoreFilters && (
            <div className="advanced-filters-panel">
              <div className="filter-row">
                <div className="filter-group">
                  <label>Rating</label>
                  <select
                    className="filter-select"
                    value={selectedRating}
                    onChange={(e) => {
                      setSelectedRating(e.target.value)
                      setCurrentPage(1)
                    }}
                  >
                    <option value="all">All Ratings</option>
                    <option value="4.5+">4.5+ Stars</option>
                    <option value="4.0+">4.0+ Stars</option>
                    <option value="3.5+">3.5+ Stars</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label>Location</label>
                  <select
                    className="filter-select"
                    value={selectedLocation}
                    onChange={(e) => {
                      setSelectedLocation(e.target.value)
                      setCurrentPage(1)
                    }}
                  >
                    <option value="all">All Locations</option>
                    {uniqueLocations.map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Sort By</label>
                  <select
                    className="filter-select"
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value)
                      setCurrentPage(1)
                    }}
                  >
                    <option value="rating_desc">Highest Rated</option>
                    <option value="rating_asc">Lowest Rated</option>
                    <option value="name_asc">Name A-Z</option>
                    <option value="name_desc">Name Z-A</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="attractions-results-count">
          <span>{filteredAttractions.length} attractions found</span>
          {selectedTypes.length > 0 && (
            <button
              className="clear-filters-btn"
              onClick={() => {
                setSelectedTypes([])
                setSelectedRating('all')
                setSelectedLocation('all')
                setSearchQuery('')
                setCurrentPage(1)
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Attractions Grid */}
        <div className="attractions-grid">
          {currentAttractions.map(attraction => (
            <div key={attraction.id} className="attraction-card">
              <div className="attraction-image-container">
                {attraction.image ? (
                  <img
                    src={attraction.image}
                    alt={attraction.name}
                    className="attraction-image"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                ) : (
                  <div className="attraction-placeholder">
                    {getTypeIcon(attraction.type)}
                  </div>
                )}
                <div className="attraction-type-badge">
                  {getTypeIcon(attraction.type)} {getTypeLabel(attraction.type)}
                </div>
                <div className="attraction-rating-badge">
                  ⭐ {attraction.rating.toFixed(1)}
                </div>
              </div>

              <div className="attraction-content">
                <h3 className="attraction-name">{attraction.name}</h3>
                <p className="attraction-location">📍 {attraction.location}</p>
                <p className="attraction-description">
                  {attraction.description.length > 120
                    ? `${attraction.description.substring(0, 120)}...`
                    : attraction.description
                  }
                </p>

                <div className="attraction-footer">
                  <div className="attraction-rating">
                    <span className="rating-stars">
                      {'★'.repeat(Math.floor(attraction.rating))}
                      {'☆'.repeat(5 - Math.floor(attraction.rating))}
                    </span>
                    <span className="rating-number">{attraction.rating.toFixed(1)}</span>
                  </div>

                  {attraction.link && (
                    <a
                      href={attraction.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="attraction-link-btn"
                    >
                      View Details
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="attractions-pagination">
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              ← Previous
            </button>

            <div className="pagination-info">
              Page {currentPage} of {totalPages}
            </div>

            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next →
            </button>
          </div>
        )}

        {/* No Results */}
        {filteredAttractions.length === 0 && (
          <div className="no-attractions">
            <div className="no-attractions-icon">🎯</div>
            <h3>No attractions found</h3>
            <p>Try adjusting your filters to see more results</p>
          </div>
        )}
      </div>
    )
  }

  const HotelList = ({ hotels }) => {
    const [selectedAmenities, setSelectedAmenities] = useState([])
    const [currentPage, setCurrentPage] = useState(1)
    const [searchQuery, setSearchQuery] = useState('')
    const [showMoreFilters, setShowMoreFilters] = useState(false)
    const [advancedFilters, setAdvancedFilters] = useState({
      minPrice: '',
      maxPrice: '',
      starRating: 'All Ratings',
      googleRating: 'All Ratings',
      sortBy: 'Recommended'
    })
    const hotelsPerPage = 12 // 4 rows × 3 columns = 12 hotels per page

    // Transform backend data to match component expectations
    const transformedHotels = (hotels || []).map(hotel => ({
      id: hotel.hotel_id,
      name: hotel.name,
      rating: hotel.rating,
      price: parseFloat(hotel.price) || 0,
      priceCurrency: hotel.pricecurrency || '$',
      image: hotel.imagelinks && hotel.imagelinks[0] ? hotel.imagelinks[0] : null,
      amenities: hotel.amenities || [],
      locationName: 'Bhubaneswar, India', // Default location since not in backend data
      locationLat: hotel.location?.latitude,
      locationLng: hotel.location?.longitude,
      link: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.name + ' Bhubaneswar')}`,
      reviewsCount: Math.floor(Math.random() * 10000) + 1000, // Generate random reviews
      roomsLeft: Math.floor(Math.random() * 30) + 5, // Generate random rooms left
      hasBreakfast: hotel.amenities?.some(amenity =>
        amenity.toLowerCase().includes('breakfast') ||
        amenity.toLowerCase().includes('free breakfast')
      ) || false
    }))

    // Get unique amenities from all hotels for filter options
    const allAmenities = [...new Set(transformedHotels.flatMap(hotel => hotel.amenities))]
    const presetAmenities = [
      { name: 'Pool', icon: '🏊' },
      { name: 'Spa', icon: '🧘' },
      { name: 'Restaurant', icon: '🍽️' },
      { name: 'Bar', icon: '🍸' },
      { name: 'Fitness center', icon: '💪' },
      { name: 'Free breakfast', icon: '🍳' },
      { name: 'Free Wi-Fi', icon: '📶' },
      { name: 'Airport shuttle', icon: '✈️' },
      { name: 'Room service', icon: '🛎️' },
      { name: 'Kid-friendly', icon: '👶' },
      { name: 'Air conditioning', icon: '❄️' },
      { name: 'Free parking', icon: '🅿️' },
      { name: 'Business center', icon: '💼' },
      { name: 'Accessible', icon: '♿' }
    ].filter(amenity => allAmenities.some(hotelAmenity =>
      hotelAmenity.toLowerCase().includes(amenity.name.toLowerCase())
    ))

    const toggleAmenity = (amenityName) => {
      setSelectedAmenities(prev =>
        prev.includes(amenityName)
          ? prev.filter(a => a !== amenityName)
          : [...prev, amenityName]
      )
      setCurrentPage(1) // Reset to first page when filters change
    }

    const filteredHotels = transformedHotels.filter(hotel => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const hotelName = (hotel.name || '').toLowerCase()
        const location = (hotel.locationName || '').toLowerCase()
        if (!hotelName.includes(query) && !location.includes(query)) {
          return false
        }
      }

      // Amenities filter
      if (selectedAmenities.length > 0) {
        const hotelAmenities = Array.isArray(hotel.amenities) ? hotel.amenities.map(a => a.toLowerCase()) : []
        if (!selectedAmenities.every(selected =>
          hotelAmenities.some(amenity => amenity.includes(selected.toLowerCase()))
        )) {
          return false
        }
      }

      // Advanced filters
      const price = Number.isFinite(hotel.price) ? hotel.price : 0
      if (advancedFilters.minPrice && price < Number(advancedFilters.minPrice)) return false
      if (advancedFilters.maxPrice && price > Number(advancedFilters.maxPrice)) return false

      const rating = parseFloat(hotel.rating || '0')
      if (advancedFilters.starRating !== 'All Ratings') {
        const minRating = Number(advancedFilters.starRating.split(' ')[0])
        if (rating < minRating) return false
      }

      return true
    }).sort((a, b) => {
      // Sort logic
      if (advancedFilters.sortBy === 'Price: Low to High') {
        return (a.price || 0) - (b.price || 0)
      } else if (advancedFilters.sortBy === 'Price: High to Low') {
        return (b.price || 0) - (a.price || 0)
      } else if (advancedFilters.sortBy === 'Rating: High to Low') {
        return (parseFloat(b.rating || '0') || 0) - (parseFloat(a.rating || '0') || 0)
      }
      return 0 // Recommended (default)
    })

    const totalPages = Math.ceil(filteredHotels.length / hotelsPerPage)
    const startIndex = (currentPage - 1) * hotelsPerPage
    const endIndex = startIndex + hotelsPerPage
    const currentHotels = filteredHotels.slice(startIndex, endIndex)

    return (
      <div>
        {/* Hotel Search and Filter Section */}
        <div className="hotel-search-filter-section">
          {/* Search Bar */}
          <div className="hotel-search-container">
            <div className="hotel-search-bar">
              <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search hotels..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="hotel-search-input"
              />
            </div>
            <button
              className="more-filters-btn"
              onClick={() => setShowMoreFilters(!showMoreFilters)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
              </svg>
            </button>
          </div>

          {/* Advanced Filters Panel */}
          {showMoreFilters && (
            <div className="advanced-filters-panel">
              <div className="filter-row">
                <div className="filter-group">
                  <label>Price Range</label>
                  <div className="price-inputs">
                    <input
                      type="number"
                      placeholder="Min"
                      value={advancedFilters.minPrice}
                      onChange={(e) => setAdvancedFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                      className="price-input"
                    />
                    <span>to</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={advancedFilters.maxPrice}
                      onChange={(e) => setAdvancedFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                      className="price-input"
                    />
                  </div>
                </div>
                <div className="filter-group">
                  <label>Star Rating</label>
                  <select
                    value={advancedFilters.starRating}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, starRating: e.target.value }))}
                    className="filter-select"
                  >
                    <option value="All Ratings">All Ratings</option>
                    <option value="5 Stars">5 Stars</option>
                    <option value="4 Stars">4 Stars</option>
                    <option value="3 Stars">3 Stars</option>
                    <option value="2 Stars">2 Stars</option>
                    <option value="1 Star">1 Star</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label>Google Rating</label>
                  <select
                    value={advancedFilters.googleRating}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, googleRating: e.target.value }))}
                    className="filter-select"
                  >
                    <option value="All Ratings">All Ratings</option>
                    <option value="4.5+">4.5+</option>
                    <option value="4.0+">4.0+</option>
                    <option value="3.5+">3.5+</option>
                    <option value="3.0+">3.0+</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label>Sort By</label>
                  <select
                    value={advancedFilters.sortBy}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                    className="filter-select"
                  >
                    <option value="Recommended">Recommended</option>
                    <option value="Price: Low to High">Price: Low to High</option>
                    <option value="Price: High to Low">Price: High to Low</option>
                    <option value="Rating: High to Low">Rating: High to Low</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Quick Suggestions / Filter Chips */}
          <div className="hotel-filters">
            <div className="quick-suggestions-label">Quick suggestions</div>
            <div className="hotel-filter-chips">
              {presetAmenities.map(amenity => (
                <button
                  key={amenity.name}
                  className={`hotel-filter-chip ${selectedAmenities.includes(amenity.name) ? 'active' : ''}`}
                  onClick={() => toggleAmenity(amenity.name)}
                >
                  <span className="filter-icon">{amenity.icon}</span>
                  <span className="filter-text">{amenity.name}</span>
                </button>
              ))}
              {selectedAmenities.length > 0 && (
                <button
                  className="hotel-filter-chip clear-filters"
                  onClick={() => setSelectedAmenities([])}
                >
                  ✕ Clear Filters
                </button>
              )}
            </div>
          </div>

          <div className="hotel-results-count">
            Showing {filteredHotels.length} of {hotels?.length || 0} hotels
          </div>
        </div>

        {/* Hotel Cards Grid - 4 rows */}
        <div className="hotel-cards-grid-4rows">
          {currentHotels.map(hotel => (
            <CompactHotelCard key={hotel.id} hotel={hotel} />
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="hotel-pagination">
            <button
              className="pagination-btn prev-btn"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              ← Previous
            </button>
            <div className="pagination-info">
              Page {currentPage} of {totalPages}
            </div>
            <button
              className="pagination-btn next-btn"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next →
            </button>
          </div>
        )}

        {filteredHotels.length === 0 && selectedAmenities.length > 0 && (
          <div className="no-results">
            No hotels match the selected filters
          </div>
        )}
      </div>
    )
  }


  const ResultsPager = ({ results }) => {
    const gridRef = useRef(null)
    const [cols, setCols] = useState(1)
    const [page, setPage] = useState(1)
    const rows = 4

    useEffect(() => {
      function calc() {
        const el = gridRef.current
        if (!el) return
        const gap = 12 // approximation of the grid gap in px
        const minW = 180
        const width = el.clientWidth || 0
        const c = Math.max(1, Math.floor((width + gap) / (minW + gap)))
        setCols(c)
        setPage(1)
      }
      calc()
      let ro
      try {
        ro = new ResizeObserver(calc)
        if (gridRef.current) ro.observe(gridRef.current)
      } catch (err) {
        // ResizeObserver not available
      }
      window.addEventListener('resize', calc)
      return () => {
        try { if (ro && gridRef.current) ro.disconnect() } catch { }
        window.removeEventListener('resize', calc)
      }
    }, [results?.length])

    const pageSize = Math.max(1, rows * cols)

    // determine hotel-specific price slider bounds
    const hasHotel = (results || []).some(r => ((r.originalType || (r.type || '')).toLowerCase().indexOf('hotel') !== -1))
    const hasSpecial = (results || []).some(r => ['attraction', 'attraction_product', 'eatery'].includes(((r.originalType || r.type || '') + '').toLowerCase()))
    const hotelPrices = (results || []).map(r => Number.isFinite(r.numericPrice) ? r.numericPrice : NaN).filter(Number.isFinite)
    const globalMin = hotelPrices.length ? Math.min(...hotelPrices) : 0
    const globalMax = hotelPrices.length ? Math.max(...hotelPrices) : 0

    const [priceMin, setPriceMin] = useState(globalMin)
    const [priceMax, setPriceMax] = useState(globalMax)

    const defaultAmenities = [
      'Breakfast',
      'Free Wi-Fi',
      'Couple friendly',
      'Free parking',
      'Outdoor pool',
      'Air conditioning',
      'Bar',
      'Restaurant',
      'Room service',
      'Airport shuttle',
      'Full-service laundry',
      'Accessible',
      'Business center',
      'Kid-friendly'
    ]

    useEffect(() => {
      // reset slider when results change
      setPriceMin(globalMin)
      setPriceMax(globalMax)
    }, [globalMin, globalMax])

    // helper to detect lat,lng pattern
    const isLatLng = (v) => {
      if (!v || typeof v !== 'string') return false
      return /^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$/.test(v)
    }

    // apply filters & sorting first, then paginate
    const filtered = (results || [])
      .filter((r) => (resFilter.type === 'all' ? true : (r.type || '').toLowerCase().includes(resFilter.type)))
      .filter((r) => (parseFloat(r.rating || '0') >= resFilter.minRating))
      .filter((r) => {
        // if hotel slider is active (hasHotel), apply price bounds
        if (hasHotel && Number.isFinite(r.numericPrice)) {
          return r.numericPrice >= (Number.isFinite(priceMin) ? priceMin : -Infinity) && r.numericPrice <= (Number.isFinite(priceMax) ? priceMax : Infinity)
        }
        // fallback to existing priceRange filter for non-hotel results
        const p = r.numericPrice
        if (resFilter.priceRange === 'all') return true
        if (!Number.isFinite(p)) return false
        if (resFilter.priceRange === 'lt2k') return p < 2000
        if (resFilter.priceRange === '2to5') return p >= 2000 && p <= 5000
        if (resFilter.priceRange === '5to10') return p > 5000 && p <= 10000
        if (resFilter.priceRange === 'gt10') return p > 10000
        return true
      })
      .filter((r) => {
        // amenities filter: if any amenities selected, only show items that include all selected amenities (case-insensitive)
        if (!resFilter.amenities || !resFilter.amenities.length) return true
        const itemAmenities = Array.isArray(r.amenities) ? r.amenities.map(a => (a || '') + '').map(a => a.toLowerCase()) : []
        return resFilter.amenities.every(am => itemAmenities.includes(((am || '') + '').toLowerCase()))
      })
      .sort((a, b) => {
        if (resFilter.sort === 'price_asc') return (a.numericPrice || Infinity) - (b.numericPrice || Infinity)
        if (resFilter.sort === 'price_desc') return (b.numericPrice || 0) - (a.numericPrice || 0)
        if (resFilter.sort === 'rating_desc') return (parseFloat(b.rating || '0') || 0) - (parseFloat(a.rating || '0') || 0)
        return 0
      })

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))

    // reset page when filters, results length or pageSize change
    useEffect(() => {
      setPage(1)
    }, [resFilter.type, resFilter.minRating, resFilter.priceRange, resFilter.sort, pageSize, results?.length])

    useEffect(() => {
      if (page > totalPages) setPage(totalPages)
    }, [totalPages])

    const start = (page - 1) * pageSize
    const pageItems = filtered.slice(start, start + pageSize)

    return (
      <div>
        <div className="result-toolbar">
          <div className="d-flex gap-2 flex-wrap">
            {/* dynamic type filters based on backend results - hidden for hotel-only responses */}
            {!hasHotel && (() => {
              const set = new Set();
              (results || []).forEach((r) => set.add(((r.type || 'item') + '').toLowerCase()));
              const types = ['all', ...Array.from(set)];
              const labels = {
                hotel: '🏨 Hotels',
                flight: '✈️ Flights',
                travel: '🗺️ Travel',
                planning: '🗺️ Planning',
                item: 'Items',
                attraction: '🏝️ Attraction',
                attraction_product: '🎁 Attraction Product',
                eatery: '🍽️ Eatery',
              }
              const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
              return types.map((t) => (
                <button key={t} className={`filter-chip ${resFilter.type === t ? 'active' : ''}`} onClick={() => setResFilter((f) => ({ ...f, type: t }))}>
                  {labels[t] || cap(t)}
                </button>
              ))
            })()}
          </div>
          <div className="d-flex gap-2 ms-auto align-items-center">
            {/* Show price slider and rating only when these are hotel-style results */}
            {(() => {
              // show hotel controls if hotels exist
              if (hasHotel) {
                const span = globalMax > globalMin ? (globalMax - globalMin) : 1
                const pctMin = Math.round(((priceMin - globalMin) / span) * 10000) / 100
                const pctMax = Math.round(((priceMax - globalMin) / span) * 10000) / 100
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <div style={{ fontSize: '.85rem', color: '#374151', minWidth: '80px', marginRight: '.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{globalMin ? `₹ ${globalMin.toLocaleString('en-IN')}` : '₹ 0'} - {globalMax ? `₹ ${globalMax.toLocaleString('en-IN')}` : ''}</div>
                    <div className="price-slider" style={{ minWidth: '140px' }} data-min={globalMin} data-max={globalMax} data-pctmin={pctMin} data-pctmax={pctMax}>
                      <div className="price-slider-track" style={{ ['--min-percent']: `${pctMin}%`, ['--max-percent']: `${pctMax}%` }} />
                      <input className="range-input" type="range" min={globalMin} max={globalMax} value={priceMin} onChange={(e) => { const v = Number(e.target.value); setPriceMin(Math.min(v, priceMax)); }} />
                      <input className="range-input" type="range" min={globalMin} max={globalMax} value={priceMax} onChange={(e) => { const v = Number(e.target.value); setPriceMax(Math.max(v, priceMin)); }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.5rem', marginTop: '.25rem' }}>
                        <div style={{ fontSize: '.85rem', color: '#374151' }}>From ₹ {priceMin.toLocaleString('en-IN')}</div>
                        <button className="filter-chip" onClick={() => { /* apply is immediate */ }}>Go</button>
                        <div style={{ fontSize: '.85rem', color: '#374151' }}>To ₹ {priceMax.toLocaleString('en-IN')}+</div>
                      </div>
                    </div>
                  </div>
                )
              } else if (!hasSpecial) {
                return (
                  <>
                    <select className="select-filter" value={resFilter.priceRange} onChange={(e) => setResFilter(f => ({ ...f, priceRange: e.target.value }))} aria-label="Price range">
                      <option value="all">Any price</option>
                      <option value="lt2k">Under 2,000</option>
                      <option value="2to5">2,000–5,000</option>
                      <option value="5to10">5,000–10,000</option>
                      <option value="gt10">Over 10,000</option>
                    </select>

                    <select className="select-filter" value={resFilter.sort} onChange={(e) => setResFilter(f => ({ ...f, sort: e.target.value }))} aria-label="Sort results">
                      <option value="relevance">Sort: Relevance</option>
                      <option value="price_asc">Price: Low → High</option>
                      <option value="price_desc">Price: High → Low</option>
                      <option value="rating_desc">Rating: High → Low</option>
                    </select>
                  </>
                )
              }

              return null
            })()}

            {(() => {
              // rating selector - always available
              const showAmenities = hasHotel
              return (
                <>
                  <button className={`rating-chip ${resFilter.minRating === 0 ? 'active' : ''}`} onClick={() => setResFilter((f) => ({ ...f, minRating: 0 }))}>All ratings</button>
                  <div className="star-group" role="group" aria-label="Filter by minimum rating">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`star-btn ${resFilter.minRating >= n ? 'filled' : ''}`}
                        onClick={() => setResFilter((f) => ({ ...f, minRating: n }))}
                        aria-pressed={resFilter.minRating >= n}
                        title={`${n} and up`}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                          <path className="star-fill" d="M12 .587l3.668 7.431 8.2 1.193-5.934 5.787 1.401 8.168L12 18.896 4.665 23.166l1.401-8.168L.132 9.211l8.2-1.193z" stroke="currentColor" />
                        </svg>
                      </button>
                    ))}
                  </div>

                  {showAmenities && (
                    <details className="amenities-panel">
                      <summary className={`filter-chip ${resFilter.amenities && resFilter.amenities.length ? 'active' : ''}`}>
                        {resFilter.amenities && resFilter.amenities.length ? `Amenities (${resFilter.amenities.length})` : 'Amenities'}
                      </summary>
                      <div className="amenities-list">
                        {(() => {
                          const aSet = new Set(defaultAmenities.map(a => a));
                          (results || []).forEach(r => (Array.isArray(r.amenities) ? r.amenities : []).forEach(a => aSet.add((a || '') + '')));
                          const amenities = Array.from(aSet);
                          return amenities.map((am) => {
                            const key = (am + '').toLowerCase();
                            const active = (resFilter.amenities || []).map(x => x.toLowerCase()).includes(key)
                            return (<button key={am} className={`amenity-chip ${active ? 'active' : ''}`} onClick={() => setResFilter(f => { const arr = f.amenities ? [...f.amenities] : []; const lk = am; const idx = arr.findIndex(x => x.toLowerCase() === lk.toLowerCase()); if (idx === -1) arr.push(lk); else arr.splice(idx, 1); return { ...f, amenities: arr } })}>{am}</button>)
                          })
                        })()}
                        <div style={{ display: 'flex', gap: '.5rem', marginTop: '.5rem' }}>
                          <button className="filter-chip" onClick={() => setResFilter(f => ({ ...f, amenities: [] }))}>Clear</button>
                        </div>
                      </div>
                    </details>
                  )}
                </>
              )
            })()}
          </div>
        </div>

        <div ref={gridRef} className="result-grid">
          {pageItems?.map((r) => {
            const rating = parseFloat(r.rating || '0')
            const percent = Number.isFinite(rating) && rating > 0 ? Math.max(0, Math.min(100, Math.round((rating / 5) * 100))) : 0
            const type = (r.type || '').toLowerCase()
            const emblem = type.includes('eatery') ? '🍽️' : type.includes('product') ? '🎁' : '🏝️'
            return (
              <div key={r.id} className="trip-card">
                {r.image ? (
                  <img src={r.image} alt={r.title} className="trip-img" onLoad={() => scrollToBottom(true)} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                ) : <div className="trip-img" style={{ background: '#e5e7eb' }} />}
                <div className="badge rating" aria-label={Number.isFinite(rating) && rating > 0 ? `${rating.toFixed(1)} rating` : 'No rating'}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <defs>
                      <linearGradient id={`grad-${r.id}`} x1="0%" x2="100%">
                        <stop offset={`${percent}%`} stopColor="#FFC107" />
                        <stop offset={`${percent}%`} stopColor="transparent" />
                      </linearGradient>
                    </defs>
                    <path d="M12 .587l3.668 7.431 8.2 1.193-5.934 5.787 1.401 8.168L12 18.896 4.665 23.166l1.401-8.168L.132 9.211l8.2-1.193z" fill={`url(#grad-${r.id})`} stroke="currentColor" />
                  </svg>
                  <span>{Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : 'N/A'}</span>
                </div>
                {/* show map pin when coords exist, otherwise show emblem placeholder in same top-right spot */}
                {Number.isFinite(Number(r.locationLat)) && Number.isFinite(Number(r.locationLng)) ? (
                  <a className="loc-btn" href={`https://www.google.com/maps?q=${r.locationLat},${r.locationLng}`} target="_blank" rel="noopener noreferrer" title="Open in Google Maps">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.5" fill="#fff" />
                      <circle cx="12" cy="9" r="2.5" fill="#FFC107" />
                    </svg>
                  </a>
                ) : (
                  <div className="loc-placeholder" title={(typeof r.location === 'string' && r.location && !isLatLng(r.location)) ? r.location : ''}>
                    <span className="loc-emoji">{emblem}</span>
                  </div>
                )}
                {Number.isFinite(r.numericPrice) ? (
                  <div className="badge price" style={{ zIndex: 7 }}>₹ {Math.round(r.numericPrice).toLocaleString('en-IN')}</div>
                ) : null}
                <div className="overlay">
                  <div className="overlay-title">{r.title}</div>
                  {typeof r.location === 'string' && r.location ? <div className="overlay-desc">{r.location}</div> : null}
                  {Array.isArray(r.amenities) && r.amenities.length ? (
                    <div className="amenity-tags">
                      {(() => {
                        const top = r.amenities.slice(0, 3)
                        const rest = r.amenities.length - top.length
                        return (
                          <>
                            {top.map((a, i) => <span key={i} className="amenity-tag">{a}</span>)}
                            {rest > 0 ? <span className="amenity-tag">+{rest} more</span> : null}
                          </>
                        )
                      })()}
                    </div>
                  ) : null}
                  {r.description ? <div className="overlay-desc">{r.description}</div> : null}
                </div>
              </div>
            )
          })}
        </div>

        <div className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: '.5rem', marginTop: '.5rem' }}>
          <button className="pager-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button key={i + 1} className={`page-num ${page === i + 1 ? 'active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
          ))}
          <button className="pager-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{CHAT_STYLE}</style>
      <style>{EXTRA_STYLE}</style>


      <div className="diyachat-root diyachat-floating">
        {!isOpen && (
          <button aria-label="Open chat" className="diyachat-open-btn d-flex align-items-center justify-content-center" onClick={() => setIsOpen(true)}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M2 12c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c-1.66 0-3.226-.403-4.6-1.116L2 22l1.116-5.4A9.963 9.963 0 0 1 2 12Z" fill="currentColor" opacity=".15" />
              <path d="M7 9h10M7 12h10M7 15h7" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}

        <div className={`diyachat-window ${isOpen ? 'open' : 'd-none'} ${isMax ? 'max' : 'iphone'}`}>
          <div className="diyachat-header">
            <div className="d-flex align-items-center gap-2">
              <div className="avatar"><img src={botAvatar} alt="Chatbot Logo" className="w-100 h-100 object-fit-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} /></div>
              <div className="flex-grow-1">
                <div className="diyachat-title">
                  {botName}
                </div>
              </div>
            </div>
            <div className="diyachat-actions">
              <button className="diyachat-iconbtn" title="Clear Chat" aria-label="Clear chat history" onClick={resetChat}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  <line x1="10" x2="10" y1="11" y2="17"></line>
                  <line x1="14" x2="14" y1="11" y2="17"></line>
                </svg>
              </button>
              <button className="diyachat-iconbtn" title={isMax ? 'Restore' : 'Maximize'} aria-label={isMax ? 'Restore chat size' : 'Maximize chat'} onClick={() => setIsMax((v) => !v)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 3h6v6"></path>
                  <path d="m21 3-7 7"></path>
                  <path d="m3 21 7-7"></path>
                  <path d="M9 21H3v-6"></path>
                </svg>
              </button>
              <button className="diyachat-iconbtn" title="Close Chat" aria-label="Close chat" onClick={() => setIsOpen(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18"></path>
                  <path d="m6 6 12 12"></path>
                </svg>
              </button>
            </div>
          </div>

          <div className="diyachat-body">
            <div ref={containerRef} className="diyachat-scroll hide-scrollbar">
              {(() => {
                const visible = messages.filter((m) => {
                  if (m.type === 'text') {
                    const cleaned = (m.text || '').replace(/\[dbData\]/gi, '').trim()
                    return cleaned.length > 0
                  }
                  return true
                })
                return visible.map((m) => (
                  <div key={m.id} className={`msg ${m.sender === 'user' ? 'user' : 'bot'} fade-in`}>
                    {m.sender === 'bot' && (
                      <div className="avatar"><img src={botAvatar} alt="Chatbot Logo" className="w-100 h-100 object-fit-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} /></div>
                    )}
                    {m.type === 'text' && (
                      <div className={`bubble ${m.sender === 'user' ? 'user' : ''}`}>
                        <div dangerouslySetInnerHTML={{ __html: markdownToHtml((m.text || '').replace(/\[dbData\]/gi, '')) }} />
                        {Array.isArray(m.quickReplies) && m.quickReplies.length > 0 && (
                          <div className="chipbar">
                            {m.quickReplies.map((q) => (
                              <button key={q} className="chip" onClick={() => handleChipClick(q)}>{q}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {m.type === 'results' && (
                      <div className="bubble">
                        <ResultsPager results={m.results} />
                      </div>
                    )}

                    {m.type === 'hotels' && (
                      <div className="bubble">
                        <HotelList hotels={m.hotels} />
                      </div>
                    )}

                    {m.type === 'flights' && (
                      <div className="bubble">
                        <FlightList flights={m.flights} />
                      </div>
                    )}

                    {m.type === 'attractions' && (
                      <div className="bubble">
                        <AttractionList attractions={m.attractions} />
                      </div>
                    )}

                    {m.type === 'itinerary' && (
                      <div className="bubble">
                        <ItineraryView itinerary={m.itinerary} />
                      </div>
                    )}
                  </div>
                ))
              })()}

              {typing && (
                <div className="msg bot">
                  <div className="avatar"><img src={botAvatar} alt="Chatbot Logo" className="w-100 h-100 object-fit-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} /></div>
                  <div className="bubble">
                    <span className="typing" aria-label="Bot is typing">
                      <span className="dot"></span>
                      <span className="dot"></span>
                      <span className="dot"></span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="footer">
              <div className="footer-top">
                <div className="suggest"></div>
              </div>
              <div className="composer">
                <div className="rowx">

                  <div className="input-wrap">
                    <input
                      type="text"
                      placeholder="Type your travel question here..."
                      className="field"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      aria-label="Message input"
                    />
                    <button className="btn-mic" title="Voice input" aria-label="Voice input">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                        <line x1="12" x2="12" y1="19" y2="22"></line>
                      </svg>
                    </button>
                    <button className="btn-send" title="Send message" aria-label="Send message" onClick={handleSend} disabled={!input.trim()}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"></path>
                        <path d="m21.854 2.147-10.94 10.939"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
